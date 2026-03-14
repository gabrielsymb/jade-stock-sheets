# Guia Completo de Deploy — Jade Stock

**Sistema de Gestão de Estoque e PDV para Pequenos Negócios**

Versão 1.0 | Março 2026

---

## 📋 Sumário

1. Visão Geral da Arquitetura
2. Pré-requisitos
3. Deploy do Backend (Google Apps Script)
4. Deploy do Proxy (Cloudflare Worker)
5. Deploy do Frontend (Hosting Estático)
6. Configuração Final e Testes
7. Troubleshooting
8. Checklist de Deploy

---

## 1. Visão Geral da Arquitetura

O Jade Stock é um sistema multi-tenant completo composto por três camadas:

### Componentes Principais

**Backend (Google Apps Script)**
- Servidor multi-tenant onde cada usuário tem sua própria planilha Google Sheets isolada
- Provisionamento automático de novas planilhas via template
- API REST exposta via `doPost()` e `doGet()`
- Autenticação via Google OAuth 2.0

**Proxy (Cloudflare Worker)**
- Proxy intermediário que roteia requisições do frontend para o backend
- Gerencia CORS e validação de tokens
- Endpoint: `https://jade-proxy.gabrielsebasty.workers.dev`

**Frontend (PWA)**
- Progressive Web App em HTML/CSS/JavaScript vanilla
- Service Worker para funcionamento offline
- Scanner de código de barras integrado (BarcodeDetector API)
- Interface responsiva mobile-first

### Fluxo de Requisições

```
[Frontend PWA]
    ↓ HTTPS POST
[Cloudflare Worker Proxy]
    ↓ Valida token + CORS
[Google Apps Script Backend]
    ↓ Autentica usuário
[Google Sheets Database]
```

### Estrutura de Dados

Cada usuário possui sua própria planilha Google Sheets com as seguintes abas:

- **PRODUTOS** — Cadastro de produtos (código, nome, preço, custo, estoque, EAN)
- **SAÍDAS** — Histórico de vendas
- **ENTRADAS** — Histórico de entradas de estoque
- **CUSTOS** — Custos fixos e variáveis mensais
- **FORNECEDORES** — Cadastro de fornecedores
- **MAPEAMENTOS** — Vínculos entre itens de NF-e e produtos cadastrados

### Registry Central

Existe uma planilha central (`REGISTRY_SHEET_ID`) que armazena:

- Email de cada usuário
- ID da planilha individual do usuário
- Status da licença (ATIVA/BLOQUEADA)
- Data de criação

---

## 2. Pré-requisitos

### Contas Necessárias

**Google Cloud Platform**
- Conta Google ativa
- Acesso ao Google Apps Script
- Permissão para criar/editar planilhas Google Sheets

**Cloudflare**
- Conta Cloudflare (plano gratuito)
- Workers habilitados

**Hosting Estático** (escolha uma):
- GitHub Pages (gratuito)
- Vercel (gratuito)
- Netlify (gratuito)
- Firebase Hosting (gratuito)
- Cloudflare Pages (gratuito)

### Ferramentas de Desenvolvimento

- Editor de código (VS Code recomendado)
- Git (para controle de versão)
- Node.js 16+ (para desenvolvimento local)
- Navegador Chrome/Edge (suporte ao BarcodeDetector)

### Conhecimentos Recomendados

- Google Apps Script básico
- JavaScript ES5/ES6
- HTML/CSS
- Conceitos de API REST
- CORS e autenticação OAuth

---

## 3. Deploy do Backend (Google Apps Script)

### 3.1. Criar Planilha Template

1. Acesse [Google Sheets](https://sheets.google.com)
2. Crie nova planilha chamada "Jade Stock Template"
3. Crie as seguintes abas (nesta ordem):

**Aba PRODUTOS**

| Coluna | Nome | Tipo | Descrição |
|--------|------|------|-----------|
| A | codigo | Texto | Código único (ex: P001) |
| B | nome | Texto | Nome do produto |
| C | categoria | Texto | Categoria |
| D | fornecedor | Texto | Nome do fornecedor |
| E | custo | Número | Custo unitário (R$) |
| F | preco | Número | Preço de venda (R$) |
| G | margem | Fórmula | `=F2-E2` |
| H | estoque | Número | Quantidade em estoque |
| I | estoqueMin | Número | Estoque mínimo |
| J | status | Fórmula | `=IF(H2<=I2;"REPOR";"OK")` |
| K | fator_conv | Número | Fator de conversão (padrão: 1) |
| L | ean | Texto | Código de barras EAN-13 |

**Aba SAÍDAS**

| Coluna | Nome | Tipo |
|--------|------|------|
| A | data | Data |
| B | hora | Hora |
| C | diaSemana | Texto |
| D | produto | Texto |
| E | quantidade | Número |
| F | valorUnit | Número |
| G | total | Fórmula `=E*F` |

**Aba ENTRADAS**

| Coluna | Nome | Tipo |
|--------|------|------|
| A | data | Data |
| B | produto | Texto |
| C | quantidade | Número |
| D | valorUnit | Número |
| E | total | Fórmula `=C*D` |

**Aba CUSTOS**

Estrutura:

```
Linha 1: Título "CUSTOS MENSAIS"
Linha 2: Cabeçalhos [Descrição, Valor, Observações]

Linhas 4-10: CUSTOS FIXOS
- Aluguel
- Energia
- Água
- Internet
- Salários
- (outros fixos)
Linha 11: Total Fixos (fórmula =SUM(B4:B10))

Linhas 15-19: CUSTOS VARIÁVEIS
- Frete
- Embalagens
- Marketing
- (outros variáveis)
Linha 20: Total Variáveis (fórmula =SUM(B15:B19))

Linha 22: TOTAL GERAL (fórmula =B11+B20)
```

**Aba FORNECEDORES**

| Coluna | Nome | Tipo |
|--------|------|------|
| A | nome | Texto |
| B | produto | Texto |
| C | preco | Número |
| D | prazo | Número (dias) |
| E | problemas | Texto (Sim/Não) |
| F | obs | Texto |
| G | cnpj | Texto |

4. Copie o ID da planilha template da URL:
   `https://docs.google.com/spreadsheets/d/{TEMPLATE_ID}/edit`

5. Guarde este ID — será usado no código

### 3.2. Criar Planilha Registry

1. Crie nova planilha "Jade Stock Registry"
2. Crie aba chamada "USUARIOS"
3. Cabeçalhos na linha 1:

| A | B | C | D | E |
|---|---|---|---|---|
| email | spreadsheetId | nome | criadoEm | status |

4. Copie o ID do Registry:
   `https://docs.google.com/spreadsheets/d/{REGISTRY_ID}/edit`

### 3.3. Configurar Google Cloud Console

1. Acesse [Google Cloud Console](https://console.cloud.google.com)
2. Crie novo projeto ou use existente
3. Navegue para **APIs & Services** → **Credentials**
4. Clique em **Create Credentials** → **OAuth 2.0 Client ID**
5. Configure:
   - Application type: **Web application**
   - Authorized redirect URIs: `https://script.google.com/macros/d/{SEU_SCRIPT_ID}/usercallback`
6. Copie o **Client ID** gerado

### 3.4. Deploy do Apps Script

1. Acesse [Google Apps Script](https://script.google.com)
2. Crie novo projeto chamado "Jade Stock Backend"
3. Cole os arquivos do backend:

**Arquivos a criar:**
- `appsscript.json`
- `Auth.js` (Cole o código fornecido)
- `Code.js` (Cole o código fornecido)
- `Custos.js`
- `Dashboard.js`
- `Estoque.js`
- `Fornecedores.js`
- `Nfemapper.js`
- `Produtos.js`
- `Relatorios.js`
- `Utils.js`
- `Vendas.js`

4. **IMPORTANTE:** Edite `Auth.js` e altere as constantes:

```javascript
var REGISTRY_SHEET_ID = 'SEU_REGISTRY_ID_AQUI';
var TEMPLATE_SHEET_ID = 'SEU_TEMPLATE_ID_AQUI';
var GOOGLE_CLIENT_ID  = 'SEU_CLIENT_ID_AQUI';
```

5. Salve o projeto (Ctrl+S ou ⌘+S)

6. Execute a função `atualizarTemplate()` uma vez:
   - Selecione a função no dropdown
   - Clique em **Run** (▶)
   - Autorize os escopos solicitados

### 3.5. Deploy como Web App

1. No Apps Script, clique em **Deploy** → **New deployment**
2. Escolha tipo: **Web app**
3. Configurações:
   - Description: "Jade Stock Backend v1.0"
   - Execute as: **User accessing the web app**
   - Who has access: **Anyone**
4. Clique em **Deploy**
5. **COPIE A URL DO WEB APP** (formato: `https://script.google.com/macros/s/{ID}/exec`)

### 3.6. Testar Backend

Execute a função `diagnostico()` no editor:

```javascript
// Deve aparecer no log:
// Planilha: Jade Stock — seu-email@gmail.com
// Produtos: 0
// OK
```

Se aparecer erro, revise os IDs das planilhas.

---

## 4. Deploy do Proxy (Cloudflare Worker)

O proxy é necessário para contornar restrições de CORS do Apps Script.

### 4.1. Criar Worker

1. Acesse [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navegue para **Workers & Pages**
3. Clique em **Create Application**
4. Escolha **Create Worker**
5. Nome: `jade-proxy`
6. Clique em **Deploy**

### 4.2. Código do Worker

No editor do Worker, substitua TODO o código por:

```javascript
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

const APPS_SCRIPT_URL = 'SUA_WEB_APP_URL_AQUI'; // URL copiada no passo 3.5

async function handleRequest(request) {
  // CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
      }
    });
  }

  // Apenas POST permitido
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405,
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
  }

  try {
    const body = await request.text();
    
    // Encaminha para Apps Script
    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: body,
      redirect: 'follow'
    });

    const text = await response.text();

    return new Response(text, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      ok: false,
      erro: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}
```

3. **IMPORTANTE:** Substitua `SUA_WEB_APP_URL_AQUI` pela URL copiada no passo 3.5

4. Clique em **Save and Deploy**

5. Copie a URL do Worker (algo como `https://jade-proxy.seu-usuario.workers.dev`)

### 4.3. Testar Proxy

Execute no terminal ou Postman:

```bash
curl -X POST https://jade-proxy.seu-usuario.workers.dev \
  -H "Content-Type: text/plain" \
  -d '{"action":"getProdutos","params":{}}'
```

Resposta esperada (se tudo estiver certo):
```json
{"ok":true,"data":[]}
```

---

## 5. Deploy do Frontend (Hosting Estático)

### 5.1. Preparar Arquivos

Organize a estrutura do projeto:

```
jade-stock/
├── index.html
├── app.html
├── 404.html
├── style.css
├── manifest.json
├── sw.js
├── icon.svg
├── icon-192.png
├── icon-512.png
├── apple-touch-icon.png
└── js/
    ├── api.js
    ├── app.js
    ├── scanner.js
    ├── pdv.js
    ├── produtos-ui.js
    ├── estoque-ui.js
    ├── nfemapper-ui.js
    ├── custos-ui.js
    ├── fornecedores-ui.js
    ├── dashboard-ui.js
    ├── relatorios-ui.js
    └── manifest.js
```

### 5.2. Configurar API Endpoint

Edite `api.js` e atualize a constante:

```javascript
var API_URL = 'https://jade-proxy.seu-usuario.workers.dev';
```

Substitua pela URL do seu Worker Cloudflare.

### 5.3. Deploy via GitHub Pages (Opção 1)

1. Crie repositório no GitHub chamado `jade-stock`
2. Faça upload de todos os arquivos
3. No repositório, vá em **Settings** → **Pages**
4. Source: **Deploy from a branch**
5. Branch: **main** / folder: **/ (root)**
6. Clique em **Save**
7. Aguarde 2-3 minutos
8. Acesse: `https://seu-usuario.github.io/jade-stock`

### 5.4. Deploy via Vercel (Opção 2)

1. Instale Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. No diretório do projeto:
   ```bash
   vercel login
   vercel --prod
   ```

3. URL final: `https://jade-stock.vercel.app`

### 5.5. Deploy via Netlify (Opção 3)

1. Arraste a pasta do projeto para [app.netlify.com/drop](https://app.netlify.com/drop)
2. Netlify faz deploy automático
3. Renomeie o site em **Site settings**
4. URL final: `https://jade-stock.netlify.app`

### 5.6. Deploy via Cloudflare Pages (Opção 4)

1. No Cloudflare Dashboard, vá em **Workers & Pages**
2. Clique em **Create Application** → **Pages**
3. Conecte repositório GitHub ou faça upload direto
4. Configurações:
   - Build command: (vazio)
   - Build output directory: `/`
5. Clique em **Save and Deploy**
6. URL final: `https://jade-stock.pages.dev`

---

## 6. Configuração Final e Testes

### 6.1. Validar URLs

Certifique-se que:

1. **API_URL** em `api.js` aponta para o Worker Cloudflare
2. **APPS_SCRIPT_URL** no Worker aponta para o Apps Script Web App
3. **REGISTRY_SHEET_ID** e **TEMPLATE_SHEET_ID** em `Auth.js` estão corretos

### 6.2. Primeiro Acesso

1. Acesse a URL do frontend: `https://seu-dominio.com/app.html`
2. O sistema solicitará permissão da conta Google
3. Autorize os escopos:
   - Ver e editar planilhas
   - Ver email do usuário
4. Aguarde o provisionamento (cria planilha automaticamente)
5. Você será redirecionado para o PDV

### 6.3. Verificar Provisionamento

1. Acesse a planilha Registry
2. Deve aparecer uma nova linha com:
   - Seu email
   - ID da planilha criada
   - Status: ATIVA
3. Clique no ID para abrir sua planilha pessoal
4. Verifique se todas as abas foram criadas

### 6.4. Testar Funcionalidades

**PDV**
- [ ] Buscar produto
- [ ] Adicionar ao carrinho
- [ ] Scanner de código de barras (Chrome Android)
- [ ] Finalizar venda

**Produtos**
- [ ] Cadastrar novo produto
- [ ] Listar produtos
- [ ] Buscar por nome/categoria

**Estoque**
- [ ] Registrar entrada manual
- [ ] Upload de NF-e XML
- [ ] Mapeamento inteligente de itens
- [ ] Confirmar entrada

**Dashboard**
- [ ] Ver faturamento do dia
- [ ] Ver meta do mês
- [ ] Produtos mais vendidos
- [ ] Gráficos por hora/dia

**Custos**
- [ ] Editar custos fixos
- [ ] Editar custos variáveis
- [ ] Ver total calculado

**Fornecedores**
- [ ] Cadastrar fornecedor
- [ ] Editar informações
- [ ] Deletar fornecedor

**Relatórios**
- [ ] Gerar relatório por período
- [ ] Ver resumo por produto
- [ ] Ver snapshot de estoque

### 6.5. Testar PWA

**Desktop**
1. No Chrome/Edge, clique no ícone de instalação na barra de endereço
2. Clique em **Instalar**
3. Aplicativo abre em janela standalone

**Mobile (Android)**
1. No Chrome, abra o menu (⋮)
2. Toque em **Instalar app**
3. Adiciona ícone na tela inicial
4. Abre como app nativo

**Offline**
1. Abra o app
2. Desligue WiFi/dados
3. Navegue entre telas (deve funcionar com cache)
4. Vendas serão enfileiradas até reconectar

### 6.6. Testar Multi-Tenancy

1. Faça logout
2. Acesse com outra conta Google
3. Verifique que:
   - Nova planilha é criada
   - Dados são completamente isolados
   - Não há vazamento entre usuários

---

## 7. Troubleshooting

### Erro: "LOGIN_REQUIRED"

**Causa:** Token do Google não foi passado ou expirou

**Solução:**
1. Limpe cache e cookies
2. Faça logout e login novamente
3. Verifique se `GOOGLE_CLIENT_ID` em `Auth.js` está correto

### Erro: "LICENCA_BLOQUEADA"

**Causa:** Usuário foi bloqueado no Registry

**Solução:**
1. Abra planilha Registry
2. Localize a linha do usuário
3. Altere coluna "status" de "BLOQUEADA" para "ATIVA"

### Erro: "CORS policy"

**Causa:** Worker não está retornando headers CORS

**Solução:**
1. Verifique código do Worker
2. Certifique-se que inclui `Access-Control-Allow-Origin: *`
3. Teste endpoint do Worker direto no navegador

### Produtos não aparecem no PDV

**Causa:** Planilha PRODUTOS vazia ou schema desatualizado

**Solução:**
1. Abra sua planilha pessoal
2. Vá na aba PRODUTOS
3. Verifique se existe coluna L (ean)
4. Se não existir, execute `migrarTodosUsuarios()` no Apps Script

### Scanner de código de barras não funciona

**Causa:** BarcodeDetector não suportado

**Solução:**
1. Use Chrome/Edge versão 83+ no Android
2. Ou use entrada manual como fallback
3. Leitores USB funcionam como teclado (digite + Enter)

### NF-e não importa

**Causa:** XML inválido ou estrutura não reconhecida

**Solução:**
1. Verifique se o XML é de NF-e (não NFC-e ou outro)
2. Abra o XML em editor de texto
3. Certifique-se que tem namespace `http://www.portalfiscal.inf.br/nfe`
4. Verifique logs no Apps Script (View → Logs)

### Dashboard não carrega

**Causa:** Erro ao calcular métricas (divisão por zero, dados faltantes)

**Solução:**
1. Verifique aba CUSTOS na planilha
2. Certifique-se que célula B22 tem fórmula `=B11+B20`
3. Adicione pelo menos um custo fixo e um variável

### Relatórios com erro "Invalid Date"

**Causa:** Formato de data inconsistente

**Solução:**
1. Use formato dd/MM/yyyy nos inputs
2. Não use datas futuras ou muito antigas
3. Evite 29 de fevereiro em anos não bissextos

### Service Worker não atualiza

**Causa:** Cache antigo persistindo

**Solução:**
1. Abra DevTools (F12)
2. Vá em **Application** → **Service Workers**
3. Clique em **Unregister**
4. Recarregue a página (Ctrl+Shift+R)
5. Incrementar versão do cache em `sw.js` (ex: `jade-stock-v6`)

---

## 8. Checklist de Deploy

### Pré-Deploy

- [ ] Template Sheet criada com todas as abas
- [ ] Registry Sheet criada
- [ ] Google Cloud Project configurado
- [ ] OAuth Client ID gerado
- [ ] Conta Cloudflare criada
- [ ] Hosting escolhido (GitHub Pages / Vercel / Netlify / etc)

### Backend

- [ ] Todos os arquivos .js colados no Apps Script
- [ ] `REGISTRY_SHEET_ID` atualizado em `Auth.js`
- [ ] `TEMPLATE_SHEET_ID` atualizado em `Auth.js`
- [ ] `GOOGLE_CLIENT_ID` atualizado em `Auth.js`
- [ ] Função `atualizarTemplate()` executada com sucesso
- [ ] Web App deployed com "Execute as: User accessing"
- [ ] URL do Web App copiada

### Proxy

- [ ] Cloudflare Worker criado
- [ ] `APPS_SCRIPT_URL` atualizada no Worker
- [ ] Worker deployed
- [ ] URL do Worker copiada
- [ ] Teste via cURL bem-sucedido

### Frontend

- [ ] `API_URL` atualizada em `api.js`
- [ ] Todos os arquivos HTML/CSS/JS organizados
- [ ] Ícones (SVG + PNG) incluídos
- [ ] `manifest.json` configurado
- [ ] Service Worker (`sw.js`) incluído
- [ ] Deploy realizado no hosting escolhido
- [ ] URL final acessível

### Testes

- [ ] Login com Google funciona
- [ ] Provisionamento automático cria planilha
- [ ] Usuário aparece no Registry
- [ ] PDV lista produtos (mesmo vazio)
- [ ] Cadastro de produto funciona
- [ ] Venda registrada com sucesso
- [ ] Entrada de estoque funciona
- [ ] Upload de NF-e funciona
- [ ] Dashboard carrega métricas
- [ ] Custos editáveis
- [ ] Fornecedores CRUD completo
- [ ] Relatórios geram PDF
- [ ] PWA instalável
- [ ] Funciona offline (cache)
- [ ] Multi-tenancy isolado

### Pós-Deploy

- [ ] Documentação atualizada com URLs reais
- [ ] Credenciais armazenadas em local seguro
- [ ] Backup das planilhas Template e Registry
- [ ] Monitoramento configurado (opcional)
- [ ] Usuários de teste criados e validados

---

## Apêndice A: URLs e Credenciais

Mantenha registro seguro das seguintes informações:

**Google Apps Script**
- Script ID: `_______________________________`
- Web App URL: `_______________________________`

**Google Sheets**
- Registry ID: `_______________________________`
- Template ID: `_______________________________`

**Google OAuth**
- Client ID: `_______________________________`

**Cloudflare**
- Worker URL: `_______________________________`

**Frontend**
- Production URL: `_______________________________`

---

## Apêndice B: Comandos Úteis

### Limpar Cache do Service Worker

```javascript
// No DevTools Console
navigator.serviceWorker.getRegistrations().then(function(registrations) {
  for(let registration of registrations) {
    registration.unregister();
  }
});
```

### Forçar Atualização de Produtos no Client

```javascript
// No DevTools Console
loadProdutos();
```

### Ver Estado Global da Aplicação

```javascript
// No DevTools Console
console.log(state);
```

### Testar API Diretamente

```javascript
// No DevTools Console
api('getProdutos', {}).then(console.log);
```

---

## Apêndice C: Estrutura de Resposta da API

Todas as respostas seguem o padrão:

**Sucesso:**
```json
{
  "ok": true,
  "data": { /* payload */ }
}
```

**Erro:**
```json
{
  "ok": false,
  "erro": "Mensagem do erro"
}
```

### Endpoints Disponíveis

| Action | Params | Retorno |
|--------|--------|---------|
| `iniciarSessao` | `{}` | `{ok, email, nome}` |
| `getUsuarioAtual` | `{}` | `{email, nome}` |
| `getProdutos` | `{}` | `Array<Produto>` |
| `addProduto` | `{produto}` | `{ok}` |
| `getProximoCodigo` | `{}` | `String` |
| `getProdutoPorEAN` | `{ean}` | `Produto \| null` |
| `registrarVenda` | `{itens}` | `{ok, total}` |
| `registrarEntrada` | `{entrada}` | `{ok}` |
| `parseNFe` | `{xmlString}` | `{ok, cabecalho, itens}` |
| `mapearItensNFe` | `{itensNFe}` | `Array<ItemMapeado>` |
| `confirmarEntradaNFe` | `{cabecalho, itensVinculados}` | `{ok, erros}` |
| `salvarMapeamentos` | `{mapeamentos}` | `{ok}` |
| `cadastrarProdutoViaXML` | `{nome, valorTotal, fornecedor, fator}` | `{ok, codigo}` |
| `getRelatorio` | `{dataInicio, dataFim}` | `RelatorioData` |
| `getDashboard` | `{}` | `DashboardData` |
| `getCustos` | `{}` | `CustosData` |
| `salvarCusto` | `{linha, valor}` | `{ok, totalFixos, totalVariaveis, totalGeral}` |
| `getFornecedores` | `{}` | `Array<Fornecedor>` |
| `salvarFornecedor` | `{fornecedor}` | `{ok}` |
| `deletarFornecedor` | `{linha}` | `{ok}` |

---

## Apêndice D: Gestão de Licenças

### Bloquear Usuário

1. Abra planilha Registry
2. Localize linha do usuário
3. Altere coluna E (status) para "BLOQUEADA"
4. Na próxima requisição, usuário receberá erro `LICENCA_BLOQUEADA`

### Reativar Usuário

1. Altere status de "BLOQUEADA" para "ATIVA"
2. Usuário poderá acessar normalmente

### Listar Todos os Usuários (Apps Script)

```javascript
function listarUsuarios() {
  var data = SpreadsheetApp.openById(REGISTRY_SHEET_ID)
    .getSheetByName('USUARIOS').getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    Logger.log(data[i][0] + ' | ' + data[i][3] + ' | ' + (data[i][4] || 'ATIVA'));
  }
}
```

Execute no editor do Apps Script.

---

## Apêndice E: Migração de Schema

Se você atualizou o código e precisa adicionar novas colunas em usuários existentes:

### Migrar Todos os Usuários

Execute no Apps Script:

```javascript
function migrarTodosUsuarios() {
  var registry = SpreadsheetApp.openById(REGISTRY_SHEET_ID);
  var tab      = registry.getSheetByName('USUARIOS');
  var dados    = tab.getDataRange().getValues();
  
  for (var i = 1; i < dados.length; i++) {
    var email = dados[i][0];
    var sid   = dados[i][1];
    
    try {
      var ss    = SpreadsheetApp.openById(sid);
      var sheet = ss.getSheetByName('PRODUTOS');
      _garantirSchemaV2(sheet);
      Logger.log('✓ ' + email);
    } catch(e) {
      Logger.log('✗ ' + email + ': ' + e.message);
    }
  }
}
```

Isso adiciona a coluna EAN (L) em todas as planilhas existentes.

---

**Fim do Guia de Deploy**

Para suporte adicional, consulte a documentação do Google Apps Script em:
https://developers.google.com/apps-script

---

*Desenvolvido com ❤️ para pequenos negócios que precisam de eficiência sem complicação.*
