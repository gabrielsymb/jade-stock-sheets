# ✅ Checklist de Deploy — Jade Stock

Use este checklist para garantir que todos os passos foram completados.

---

## 📋 Pré-Deploy

- [ ] Template Sheet criada com todas as abas (PRODUTOS, SAÍDAS, ENTRADAS, CUSTOS, FORNECEDORES)
- [ ] Registry Sheet criada com aba USUARIOS
- [ ] Google Cloud Project configurado
- [ ] OAuth 2.0 Client ID gerado
- [ ] Conta Cloudflare criada
- [ ] Hosting escolhido (GitHub Pages / Vercel / Netlify / Cloudflare Pages)

**IDs Coletados:**
```
Template Sheet ID: ___________________________________________
Registry Sheet ID: ___________________________________________
Google Client ID:  ___________________________________________
```

---

## 🔧 Backend (Google Apps Script)

- [ ] Projeto criado no Google Apps Script
- [ ] Todos os 12 arquivos .js colados:
  - [ ] appsscript.json
  - [ ] Auth.js
  - [ ] Code.js
  - [ ] Custos.js
  - [ ] Dashboard.js
  - [ ] Estoque.js
  - [ ] Fornecedores.js
  - [ ] Nfemapper.js
  - [ ] Produtos.js
  - [ ] Relatorios.js
  - [ ] Utils.js
  - [ ] Vendas.js

- [ ] Constantes atualizadas em `Auth.js`:
  ```javascript
  var REGISTRY_SHEET_ID = 'SEU_ID_AQUI';
  var TEMPLATE_SHEET_ID = 'SEU_ID_AQUI';
  var GOOGLE_CLIENT_ID  = 'SEU_ID_AQUI';
  ```

- [ ] Função `atualizarTemplate()` executada com sucesso
- [ ] Web App deployed:
  - Execute as: **User accessing the web app**
  - Who has access: **Anyone**
- [ ] URL do Web App copiada e guardada

**Web App URL:**
```
___________________________________________
```

- [ ] Teste executado: função `diagnostico()` retornou OK

---

## 🌐 Proxy (Cloudflare Worker)

- [ ] Worker criado no Cloudflare Dashboard
- [ ] Nome do worker: `jade-proxy`
- [ ] Código colado e `APPS_SCRIPT_URL` atualizada
- [ ] Worker deployed
- [ ] URL do Worker copiada

**Worker URL:**
```
___________________________________________
```

- [ ] Teste via cURL bem-sucedido:
  ```bash
  curl -X POST https://jade-proxy.seu-usuario.workers.dev \
    -H "Content-Type: text/plain" \
    -d '{"action":"getProdutos","params":{}}'
  
  # Resposta esperada: {"ok":true,"data":[]}
  ```

---

## 🎨 Frontend (PWA)

### Configuração

- [ ] `API_URL` atualizada em `frontend/js/api.js`:
  ```javascript
  var API_URL = 'https://jade-proxy.seu-usuario.workers.dev';
  ```

- [ ] Todos os arquivos organizados na estrutura correta
- [ ] Ícones incluídos (SVG + PNG 192 + PNG 512 + Apple Touch)
- [ ] `manifest.json` revisado
- [ ] Service Worker (`sw.js`) incluído

### Deploy

Escolha UMA opção:

**GitHub Pages:**
- [ ] Repositório criado
- [ ] Arquivos enviados via git push
- [ ] GitHub Pages ativado (Settings → Pages)
- [ ] Deploy concluído (aguardar 2-3 minutos)

**Vercel:**
- [ ] Vercel CLI instalado (`npm install -g vercel`)
- [ ] Login executado (`vercel login`)
- [ ] Deploy executado (`vercel --prod`)

**Netlify:**
- [ ] Pasta arrastada para app.netlify.com/drop
- [ ] Deploy automático concluído
- [ ] Site renomeado (opcional)

**Cloudflare Pages:**
- [ ] Application criada (Workers & Pages → Pages)
- [ ] Repositório conectado OU upload direto
- [ ] Build config: vazio (arquivos estáticos)
- [ ] Deploy concluído

**URL Final do Frontend:**
```
___________________________________________
```

---

## 🧪 Testes Funcionais

### Login e Provisionamento
- [ ] Acesso a `/app.html` funciona
- [ ] Login com Google solicitado
- [ ] Autorização concedida (escopos: planilhas + email)
- [ ] Provisionamento automático executou
- [ ] Nova linha apareceu na planilha Registry
- [ ] Planilha pessoal foi criada com todas as abas
- [ ] Redirecionamento para PDV funcionou

### PDV
- [ ] Lista de produtos carrega (mesmo vazia)
- [ ] Busca de produtos funciona
- [ ] Scanner de código de barras abre modal (Chrome Android)
- [ ] Entrada manual de código funciona
- [ ] Adicionar produto ao carrinho funciona
- [ ] Alterar quantidade no carrinho funciona
- [ ] Finalizar venda registra corretamente
- [ ] Terminal mostra total correto

### Produtos
- [ ] Tela de produtos carrega
- [ ] Botão "Novo Produto" abre formulário
- [ ] Código sequencial é gerado automaticamente
- [ ] Cadastro de produto funciona
- [ ] Produto aparece na lista após salvar
- [ ] Busca por nome/categoria funciona
- [ ] Badge de status (OK/REPOR) aparece

### Estoque
- [ ] Tela de estoque carrega
- [ ] Alerta de estoque crítico aparece (se houver)
- [ ] Entrada manual funciona
- [ ] Upload de XML NF-e abre modal
- [ ] Parsing do XML funciona
- [ ] Mapeamento inteligente sugere produtos
- [ ] Criação de produto via XML funciona
- [ ] Confirmação de entrada atualiza estoque

### Dashboard
- [ ] Métricas carregam corretamente
- [ ] Faturamento hoje aparece
- [ ] Faturamento do mês aparece
- [ ] Custo mensal aparece
- [ ] Barra de meta funciona
- [ ] Top 5 produtos listados
- [ ] Gráfico por hora renderiza
- [ ] Gráfico por dia da semana renderiza
- [ ] Estoque crítico lista produtos (se houver)

### Custos
- [ ] Tela de custos carrega
- [ ] Custos fixos listados
- [ ] Custos variáveis listados
- [ ] Edição inline funciona
- [ ] Totais atualizam automaticamente
- [ ] Salvamento persiste na planilha

### Fornecedores
- [ ] Lista de fornecedores carrega
- [ ] Cadastro de novo fornecedor funciona
- [ ] Edição de fornecedor funciona
- [ ] Deleção de fornecedor funciona (com confirmação)
- [ ] Campo CNPJ aceita formatação

### Relatórios
- [ ] Tela de relatórios carrega
- [ ] Seleção de período funciona
- [ ] Gerar relatório retorna dados
- [ ] Resumo por produto correto
- [ ] Snapshot de estoque correto
- [ ] Botão imprimir/PDF funciona

### PWA
- [ ] Ícone "Instalar app" aparece no navegador
- [ ] Instalação funciona (desktop)
- [ ] Instalação funciona (mobile Android)
- [ ] App abre em janela standalone
- [ ] Ícone aparece na tela inicial/menu
- [ ] Service Worker registrado
- [ ] Funcionamento offline (cache)
- [ ] Navegação entre telas sem internet funciona

### Multi-Tenancy
- [ ] Logout funciona
- [ ] Login com outra conta Google funciona
- [ ] Nova planilha é criada para segundo usuário
- [ ] Dados são completamente isolados
- [ ] Não há vazamento entre usuários
- [ ] Registry mostra ambos os usuários

---

## 🔒 Segurança e Privacidade

- [ ] Planilhas individuais têm permissões corretas (owner + viewer do usuário)
- [ ] Registry não é pública (apenas você tem acesso)
- [ ] Template não é pública
- [ ] OAuth solicita apenas escopos necessários
- [ ] Tokens não são logados ou expostos
- [ ] HTTPS em todas as camadas

---

## 📊 Monitoramento (Opcional)

- [ ] Google Apps Script quotas verificadas
- [ ] Cloudflare Worker analytics ativado
- [ ] Frontend analytics configurado (Google Analytics / Plausible)
- [ ] Alertas de erro configurados
- [ ] Backup automático da planilha Registry ativado

---

## 📝 Documentação

- [ ] README.md atualizado com URLs reais
- [ ] GUIA_DEPLOY.md revisado
- [ ] Credenciais armazenadas em local seguro (senha manager)
- [ ] Planilhas Template e Registry com backup
- [ ] Screenshot do sistema funcionando tirado

---

## 🎉 Pós-Deploy

- [ ] Email de boas-vindas enviado para si mesmo (teste de onboarding)
- [ ] Tutorial de uso criado (opcional)
- [ ] 3-5 usuários de teste convidados
- [ ] Feedback coletado
- [ ] Melhorias documentadas para próxima versão

---

## ✅ Deploy Completo!

Parabéns! 🎊 O Jade Stock está no ar e funcionando.

**Próximos passos recomendados:**

1. Adicione mais produtos de teste
2. Simule vendas reais
3. Teste importação de NF-e de verdade
4. Configure backup automático das planilhas
5. Documente fluxos de trabalho específicos do seu negócio
6. Treine usuários finais
7. Monitore uso nas primeiras semanas

**URLs importantes:**

- Frontend: ___________________________________________
- Apps Script: https://script.google.com/home
- Registry Sheet: ___________________________________________
- Cloudflare Worker: https://dash.cloudflare.com

---

**Desenvolvido com ❤️ para pequenos negócios**

*Jade Stock · Sistema de gestão completo · 2025*
