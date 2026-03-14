# 🚀 Otimização e Boas Práticas — Jade Stock

Dicas para melhorar performance, segurança e experiência do usuário.

---

## ⚡ Performance

### Backend (Google Apps Script)

**Reduzir Chamadas à API**
- ✅ Use `getProdutos()` uma vez no início e mantenha em `state.produtos`
- ✅ Scanner busca localmente antes de chamar o servidor
- ✅ Dashboards calculam métricas client-side quando possível
- ❌ Evite chamadas repetidas em loops

**Otimizar Leitura de Planilhas**
```javascript
// ❌ RUIM: Múltiplas leituras
var val1 = sheet.getRange('A1').getValue();
var val2 = sheet.getRange('A2').getValue();

// ✅ BOM: Uma leitura em bloco
var data = sheet.getRange('A1:A10').getValues();
var val1 = data[0][0];
var val2 = data[1][0];
```

**Batch Operations**
```javascript
// ❌ RUIM: Loop com appendRow
itens.forEach(function(item) {
  sheet.appendRow([item.data, item.nome]);
});

// ✅ BOM: setValues em uma operação
var rows = itens.map(function(item) {
  return [item.data, item.nome];
});
sheet.getRange(lastRow + 1, 1, rows.length, 2).setValues(rows);
```

### Frontend (PWA)

**Lazy Loading de Módulos**
- Dashboard só carrega métricas quando navegar para a tela
- Relatórios só processam ao clicar em "Gerar"

**Debounce em Buscas**
```javascript
// Adicione debounce na busca do PDV
var searchTimeout;
function handleSearch(value) {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(function() {
    state.searchPdv = value;
    render();
  }, 300);
}
```

**Virtual Scrolling para Listas Grandes**
```javascript
// Se tiver >1000 produtos, implemente paginação
var PAGE_SIZE = 50;
var currentPage = 0;

function renderProductsPage() {
  var start = currentPage * PAGE_SIZE;
  var end = start + PAGE_SIZE;
  return filteredProducts.slice(start, end);
}
```

---

## 🔒 Segurança

### Proteção de Dados

**Validação de Entrada**
```javascript
// ✅ Sempre valide no backend
function addProduto(p) {
  if (!p.nome || p.nome.length > 200) {
    return { ok: false, erro: 'Nome inválido' };
  }
  if (typeof p.preco !== 'number' || p.preco < 0) {
    return { ok: false, erro: 'Preço inválido' };
  }
  // ...
}
```

**Sanitização de Strings**
```javascript
// ✅ Evite injeção em fórmulas
function sanitize(str) {
  if (str.charAt(0) === '=' || str.charAt(0) === '+') {
    return "'" + str; // Força texto
  }
  return str;
}
```

**Rate Limiting**
```javascript
// No Cloudflare Worker, adicione rate limit
const rateLimiter = new Map();

function checkRateLimit(ip) {
  const now = Date.now();
  const requests = rateLimiter.get(ip) || [];
  const recent = requests.filter(t => now - t < 60000); // 1 minuto
  
  if (recent.length >= 100) {
    return false; // Bloqueado
  }
  
  recent.push(now);
  rateLimiter.set(ip, recent);
  return true;
}
```

### Auditoria

**Log de Ações Críticas**
```javascript
// Registre ações importantes
function registrarLog(acao, detalhes) {
  var ss = getUserSpreadsheet();
  var log = ss.getSheetByName('LOGS') || ss.insertSheet('LOGS');
  log.appendRow([
    new Date(),
    Session.getActiveUser().getEmail(),
    acao,
    JSON.stringify(detalhes)
  ]);
}

// Use em vendas, entradas, cadastros
function registrarVenda(itens) {
  // ...
  registrarLog('VENDA', { total: total, itens: itens.length });
  return { ok: true };
}
```

---

## 📊 Monitoramento

### Google Apps Script Quotas

**Limites Importantes:**
- Script runtime: 6 min/execução
- Triggers: 90 min/dia (free), 6 horas/dia (Workspace)
- URL Fetch calls: 20,000/dia
- Simultaneous executions: 30

**Monitorar Uso:**
```javascript
function verificarQuotas() {
  var quotas = {
    scriptRuntime: 'OK', // Implementar tracking
    urlFetch: UrlFetchApp.getRequest().length,
    execucoes: ScriptApp.getProjectTriggers().length
  };
  Logger.log(JSON.stringify(quotas));
}
```

### Cloudflare Analytics

1. Acesse Cloudflare Dashboard → Workers
2. Selecione seu worker
3. Veja métricas:
   - Requests/segundo
   - Errors
   - CPU time
   - Bandwidth

### Frontend Analytics

**Google Analytics 4 (Opcional)**
```html
<!-- Adicione no <head> do index.html e app.html -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

**Track Eventos Customizados**
```javascript
function trackEvent(category, action, label) {
  if (typeof gtag !== 'undefined') {
    gtag('event', action, {
      'event_category': category,
      'event_label': label
    });
  }
}

// Exemplos de uso
trackEvent('PDV', 'venda_finalizada', total);
trackEvent('Estoque', 'nfe_importada', nomeArquivo);
trackEvent('Produtos', 'produto_cadastrado', categoria);
```

---

## 🎨 UX/UI Melhorias

### Loading States

**Skeleton Screens**
```javascript
function loadingHTML(msg) {
  return '<div class="loading-overlay">' +
    '<div class="skeleton-grid">' +
      '<div class="skeleton-card"></div>'.repeat(3) +
    '</div>' +
    '<p>' + (msg || 'Carregando...') + '</p>' +
  '</div>';
}
```

**Progress Indicators**
```javascript
function showProgress(current, total, message) {
  var percent = (current / total * 100).toFixed(0);
  document.getElementById('progress-bar').style.width = percent + '%';
  document.getElementById('progress-text').textContent = message;
}
```

### Feedback Tátil

**Haptic Feedback (Mobile)**
```javascript
function vibrate(pattern) {
  if (navigator.vibrate) {
    navigator.vibrate(pattern || 50);
  }
}

// Use em ações importantes
function finalizarVenda() {
  // ...
  vibrate([50, 100, 50]); // Padrão de sucesso
  showToast('Venda registrada!');
}
```

### Acessibilidade

**Navegação por Teclado**
```html
<!-- Adicione shortcuts -->
<button onclick="finalizarVenda()" accesskey="f">
  Finalizar [F]
</button>

<script>
document.addEventListener('keydown', function(e) {
  if (e.key === 'f' && e.target.tagName !== 'INPUT') {
    finalizarVenda();
  }
});
</script>
```

**ARIA Labels**
```html
<button aria-label="Escanear código de barras" onclick="scannerAbrir()">
  <svg>...</svg>
</button>
```

---

## 📱 Mobile Optimization

### Touch Targets

```css
/* Botões mínimos de 44x44px */
.btn {
  min-height: 44px;
  min-width: 44px;
  padding: 12px 20px;
}

/* Aumente áreas de toque em listas */
.list-item {
  padding: 16px 12px; /* Pelo menos 48px de altura */
  cursor: pointer;
}
```

### Prevent Zoom on Input Focus

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
```

```css
/* Fonte mínima de 16px previne zoom no iOS */
input, select, textarea {
  font-size: 16px;
}
```

### Safe Area (iOS Notch)

```css
/* Já implementado em manifest.js, mas reforçando: */
@media (display-mode: standalone) {
  body {
    padding-top: env(safe-area-inset-top);
    padding-bottom: env(safe-area-inset-bottom);
  }
}
```

---

## 🔧 Manutenção

### Backup Automático

**Apps Script Trigger**
```javascript
function criarBackupDiario() {
  ScriptApp.newTrigger('backupRegistry')
    .timeBased()
    .everyDays(1)
    .atHour(3) // 3 AM
    .create();
}

function backupRegistry() {
  var registry = SpreadsheetApp.openById(REGISTRY_SHEET_ID);
  var folder = DriveApp.getFolderById('PASTA_BACKUP_ID');
  var hoje = Utilities.formatDate(new Date(), 'GMT-3', 'yyyy-MM-dd');
  registry.makeCopy('Registry_Backup_' + hoje, folder);
}
```

### Limpeza de Dados Antigos

```javascript
function limparLogsAntigos() {
  var ss = getUserSpreadsheet();
  var log = ss.getSheetByName('LOGS');
  if (!log) return;
  
  var data = log.getDataRange().getValues();
  var cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90); // 90 dias
  
  var keepRows = data.filter(function(row, idx) {
    return idx === 0 || new Date(row[0]) > cutoff;
  });
  
  log.clearContents();
  log.getRange(1, 1, keepRows.length, keepRows[0].length)
    .setValues(keepRows);
}
```

### Atualização de Schema

```javascript
// Versione suas mudanças
var SCHEMA_VERSION = 2;

function verificarSchema(sheet) {
  var props = PropertiesService.getDocumentProperties();
  var currentVersion = parseInt(props.getProperty('SCHEMA_VERSION') || '1');
  
  if (currentVersion < SCHEMA_VERSION) {
    migrarSchema(sheet, currentVersion, SCHEMA_VERSION);
    props.setProperty('SCHEMA_VERSION', SCHEMA_VERSION);
  }
}

function migrarSchema(sheet, fromVer, toVer) {
  if (fromVer === 1 && toVer >= 2) {
    // Adiciona coluna EAN
    _garantirSchemaV2(sheet);
  }
  // Futuras migrações aqui
}
```

---

## 🎯 Métricas de Sucesso

### KPIs do Sistema

**Performance**
- Tempo de resposta médio < 2s
- Service Worker cache hit rate > 80%
- Uptime > 99%

**Adoção**
- Usuários ativos diários
- Transações por usuário/dia
- Taxa de retenção (7 dias, 30 dias)

**Qualidade**
- Taxa de erro < 1%
- Duplicatas prevenidas
- Tempo médio de importação de NF-e

### Dashboards Recomendados

**Google Sheets (Registry)**
```
=QUERY(USUARIOS!A:E, "SELECT COUNT(A), MAX(D) WHERE E='ATIVA'")
```

**Cloudflare Analytics**
- Requests by country
- Error rate over time
- P50, P95, P99 latency

**Custom Dashboard (Frontend)**
```javascript
// Adicione métricas internas
var metrics = {
  vendasHoje: 0,
  tempoMedioCheckout: 0,
  produtosMaisVendidos: []
};

// Envie para backend periodicamente
setInterval(function() {
  api('salvarMetricas', { metrics: metrics });
}, 300000); // 5 minutos
```

---

## 🔄 CI/CD (Opcional)

### GitHub Actions para Frontend

```yaml
# .github/workflows/deploy.yml
name: Deploy Frontend

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./frontend
```

### Versionamento Semântico

```
1.0.0 — Deploy inicial
1.1.0 — Nova funcionalidade (ex: scanner de QR code)
1.0.1 — Bugfix (ex: correção de duplicatas)
2.0.0 — Breaking change (ex: novo schema de dados)
```

---

## 📚 Recursos Adicionais

**Documentação Oficial:**
- [Google Apps Script](https://developers.google.com/apps-script)
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- [PWA](https://web.dev/progressive-web-apps/)
- [Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)

**Ferramentas Úteis:**
- [Lighthouse](https://developers.google.com/web/tools/lighthouse) — Auditoria PWA
- [BundlePhobia](https://bundlephobia.com/) — Análise de pacotes npm
- [Can I Use](https://caniuse.com/) — Compatibilidade de navegadores

---

**Desenvolvido com ❤️ para pequenos negócios**

*Jade Stock · Sempre melhorando · 2025*
