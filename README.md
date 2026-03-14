# 💎 Jade Stock

> Sistema completo de gestão de estoque e PDV para pequenos negócios

![Version](https://img.shields.io/badge/version-1.0.0-green)
![License](https://img.shields.io/badge/license-MIT-blue)
![Platform](https://img.shields.io/badge/platform-PWA-purple)

---

## 🎯 Visão Geral

Jade Stock é um sistema WMS (Warehouse Management System) multi-tenant completo desenvolvido com:

- **Backend:** Google Apps Script (multi-tenant com planilhas isoladas)
- **Proxy:** Cloudflare Worker (CORS e roteamento)
- **Frontend:** PWA offline-first em HTML/CSS/JavaScript vanilla

### ✨ Principais Recursos

- ✅ PDV (Ponto de Venda) com terminal de checkout
- 📦 Gestão completa de estoque (entradas/saídas)
- 📷 Scanner de código de barras integrado (BarcodeDetector API)
- 📄 Importação de NF-e XML com mapeamento inteligente via IA
- 📊 Dashboard com métricas em tempo real
- 💰 Controle de custos fixos e variáveis
- 🚚 Gestão de fornecedores
- 📈 Relatórios gerenciais personalizados
- 📱 PWA instalável (funciona offline)
- 🔐 Multi-tenant seguro (cada usuário tem sua planilha isolada)

---

## 🚀 Deploy Rápido

### 1. Backend (Google Apps Script)

```javascript
// 1. Crie planilha Template com abas: PRODUTOS, SAÍDAS, ENTRADAS, CUSTOS, FORNECEDORES
// 2. Crie planilha Registry com aba USUARIOS
// 3. Cole os arquivos .js no Google Apps Script
// 4. Atualize as constantes em Auth.js:

var REGISTRY_SHEET_ID = 'SEU_REGISTRY_ID';
var TEMPLATE_SHEET_ID = 'SEU_TEMPLATE_ID';
var GOOGLE_CLIENT_ID  = 'SEU_CLIENT_ID.apps.googleusercontent.com';

// 5. Deploy como Web App (Execute as: User accessing)
```

### 2. Proxy (Cloudflare Worker)

```javascript
// worker.js
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/{ID}/exec';

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    });
  }

  const response = await fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: await request.text(),
    redirect: 'follow'
  });

  const text = await response.text();

  return new Response(text, {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}
```

### 3. Frontend

```bash
# 1. Atualize api.js com URL do Worker:
var API_URL = 'https://jade-proxy.seu-usuario.workers.dev';

# 2. Deploy no hosting de sua escolha:

# GitHub Pages
git init
git add .
git commit -m "Deploy Jade Stock"
git remote add origin https://github.com/seu-usuario/jade-stock.git
git push -u origin main

# Ou Vercel
vercel --prod

# Ou Netlify
netlify deploy --prod

# Ou Cloudflare Pages (arraste a pasta no dashboard)
```

---

## 📂 Estrutura do Projeto

```
jade-stock/
│
├── backend/               # Google Apps Script
│   ├── appsscript.json
│   ├── Auth.js
│   ├── Code.js
│   ├── Custos.js
│   ├── Dashboard.js
│   ├── Estoque.js
│   ├── Fornecedores.js
│   ├── Nfemapper.js
│   ├── Produtos.js
│   ├── Relatorios.js
│   ├── Utils.js
│   └── Vendas.js
│
├── frontend/              # PWA
│   ├── index.html         # Landing page
│   ├── app.html           # App principal
│   ├── 404.html
│   ├── style.css
│   ├── manifest.json
│   ├── sw.js              # Service Worker
│   │
│   ├── assets/
│   │   ├── icon.svg
│   │   ├── icon-192.png
│   │   ├── icon-512.png
│   │   └── apple-touch-icon.png
│   │
│   └── js/
│       ├── api.js         # Camada de comunicação
│       ├── app.js         # Estado global + navegação
│       ├── scanner.js     # Scanner código de barras
│       ├── pdv.js         # Ponto de venda
│       ├── produtos-ui.js
│       ├── estoque-ui.js
│       ├── nfemapper-ui.js
│       ├── custos-ui.js
│       ├── fornecedores-ui.js
│       ├── dashboard-ui.js
│       ├── relatorios-ui.js
│       └── manifest.js
│
└── docs/
    ├── GUIA_DEPLOY.md     # Guia completo (Markdown)
    └── GUIA_DEPLOY.docx   # Guia completo (Word)
```

---

## 🛠️ Tecnologias

### Backend
- **Google Apps Script** — Servidor serverless JavaScript
- **Google Sheets** — Database multi-tenant
- **Google OAuth 2.0** — Autenticação

### Proxy
- **Cloudflare Workers** — Edge computing para CORS

### Frontend
- **HTML5/CSS3** — Interface responsiva
- **JavaScript ES5** — Compatibilidade máxima
- **Service Worker** — Cache e offline
- **BarcodeDetector API** — Scanner nativo de código de barras
- **PWA** — Instalável como app

---

## 📖 Documentação

- **[Guia Completo de Deploy](./GUIA_DEPLOY.md)** — Passo a passo detalhado
- **[Guia Completo de Deploy (Word)](./GUIA_DEPLOY.docx)** — Versão formatada

---

## 🧪 Testes

### Testar Backend
```javascript
// No Apps Script Editor, execute:
function diagnostico() {
  var ss = getUserSpreadsheet();
  Logger.log('Planilha: ' + ss.getName());
  var produtos = getProdutos();
  Logger.log('Produtos: ' + produtos.length);
}
```

### Testar Proxy
```bash
curl -X POST https://jade-proxy.seu-usuario.workers.dev \
  -H "Content-Type: text/plain" \
  -d '{"action":"getProdutos","params":{}}'
```

### Testar Frontend
1. Acesse `https://seu-dominio.com/app.html`
2. Faça login com Google
3. Aguarde provisionamento automático
4. Sistema deve carregar o PDV

---

## 🐛 Troubleshooting

### Erro: "LOGIN_REQUIRED"
- Limpe cache e cookies
- Verifique `GOOGLE_CLIENT_ID` em `Auth.js`

### Erro: "CORS policy"
- Verifique headers no Cloudflare Worker
- Certifique-se que `Access-Control-Allow-Origin: *` está presente

### Produtos não aparecem
- Verifique aba PRODUTOS na sua planilha
- Execute `migrarTodosUsuarios()` se necessário

### Scanner não funciona
- Use Chrome/Edge 83+ no Android
- Ou use entrada manual como fallback

### Dashboard não carrega
- Verifique aba CUSTOS
- Certifique-se que fórmulas estão corretas

---

## 📝 Licença

MIT License — livre para uso pessoal e comercial.

---

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

---

## 📧 Suporte

Para dúvidas ou problemas:

1. Consulte o **[Guia Completo de Deploy](./GUIA_DEPLOY.md)**
2. Verifique a seção **Troubleshooting**
3. Abra uma issue no GitHub

---

## 🎉 Créditos

Desenvolvido com ❤️ para pequenos negócios que precisam de eficiência sem complicação.

**Stack:**
- Google Apps Script
- Cloudflare Workers
- PWA Technologies

**Inspirações:**
- Sistemas ERP modernos
- Design systems minimalistas
- Offline-first architecture

---

*Jade Stock · Sistema de gestão para pequenos negócios · 2025*
