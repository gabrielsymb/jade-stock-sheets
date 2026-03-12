// ============================================================
//  app.js — Estado global, navegação e utilitários UI
// ============================================================

var state = {
  page:'pdv', user:null, produtos:[], cart:[], searchPdv:'',
  searchProd:'', loading:true, nfeItens:[], nfeCab:null,
  custos:null, fornecedores:[]
};

// ── CRÍTICO: função ausente em todo o projeto ──────────────
// Retorna o email cacheado do usuário logado.
// O servidor ignora este parâmetro (usa Session internamente),
// mas ele precisa existir para não lançar ReferenceError no client.
function userEmail() {
  return (state.user && state.user.email) ? state.user.email : '';
}

window.onload = function() {
  api('iniciarSessao', {})
    .then(function(res) {
      if (!res || !res.ok) { mostrarErroAcesso('Acesso negado.'); return; }
      state.user = { email: res.email, nome: res.nome };
      loadProdutos();
    })
    .catch(function(e) {
      mostrarErroAcesso(
        e.message === 'LICENCA_BLOQUEADA'
          ? 'Seu acesso está suspenso. Entre em contato com o suporte.'
          : 'Erro ao iniciar: ' + e.message
      );
    });
};

function mostrarErroAcesso(msg) {
  var nav  = document.getElementById('nav');
  var rail = document.getElementById('rail');
  var hdr  = document.getElementById('header');
  if (nav)  nav.style.display  = 'none';
  if (rail) rail.style.display = 'none';
  if (hdr)  hdr.style.display  = 'none';
  document.getElementById('content').innerHTML =
    '<div class="loading-overlay">' +
    '<p style="color:var(--red);text-align:center;padding:32px">' + msg + '</p>' +
    '</div>';
}

function loadProdutos() {
  state.loading = true; render();
  api('getProdutos', {})
    .then(function(data) {
      state.produtos = Array.isArray(data) ? data : [];
      state.loading  = false; render();
    })
    .catch(function(e) {
      state.loading = false; state.produtos = []; render();
      showToast('Erro ao carregar: ' + e.message, true);
    });
}

// ── Navegação ──────────────────────────────────────────────
// NOTA: loadDashboardData / loadCustosData / loadFornecedoresData
// são definidas nos respectivos arquivos UI (DashboardUI, CustosUI,
// FornecedoresUI) e sobrescrevem qualquer versão anterior.
// Mantemos apenas a chamada aqui, sem redefinir as funções.

function navigate(page) {
  state.page = page;

  // Bottom nav (mobile)
  document.querySelectorAll('.nav-btn').forEach(function(b) { b.classList.remove('active'); });
  var btn = document.getElementById('btn-' + page);
  if (btn) btn.classList.add('active');

  // Side rail (desktop) — sincroniza com mesma página
  document.querySelectorAll('.rail-btn').forEach(function(b) { b.classList.remove('active'); });
  var rbtn = document.getElementById('rail-' + page);
  if (rbtn) rbtn.classList.add('active');

  // Header title
  var titles = {
    pdv: 'PDV', estoque: 'ESTOQUE', dashboard: 'DASHBOARD',
    produtos: 'PRODUTOS', custos: 'CUSTOS',
    fornecedores: 'FORNECEDORES', relatorios: 'RELATÓRIOS'
  };
  var htitle = document.getElementById('header-title');
  if (htitle) htitle.textContent = 'JADE // ' + (titles[page] || page.toUpperCase());

  // Terminal — só no PDV
  var term = document.getElementById('terminal');
  if (term) term.style.display = (page === 'pdv') ? 'flex' : 'none';

  // Op code com nome do usuário
  var op = document.getElementById('op-code');
  if (op && state.user) {
    var nome = state.user.nome || state.user.email || 'USUÁRIO';
    op.textContent = 'OP_' + nome.split(' ')[0].toUpperCase();
  }

  render();
  var c = document.getElementById('content');
  if (c) c.scrollTop = 0;
  if (page === 'dashboard')    loadDashboardData();
  if (page === 'custos')       loadCustosData();
  if (page === 'fornecedores') loadFornecedoresData();
}

function render() {
  var el = document.getElementById('content');
  if (!el) return;
  try {
    switch(state.page) {
      case 'pdv':          el.innerHTML = renderPDV();          break;
      case 'produtos':     el.innerHTML = renderProdutos();     break;
      case 'estoque':      el.innerHTML = renderEstoque();      break;
      case 'custos':       el.innerHTML = renderCustos();       break;
      case 'fornecedores': el.innerHTML = renderFornecedores(); break;
      case 'dashboard':    el.innerHTML = renderDashboard();    break;
      case 'relatorios':   el.innerHTML = renderRelatorios();   break;
      default:             el.innerHTML = renderPDV();
    }
  } catch(e) {
    el.innerHTML = '<div class="loading-overlay"><p style="color:var(--red)">Erro: ' + e.message + '</p></div>';
  }
}

// ── Utilitários de formatação ──────────────────────────────
function fmt(n) {
  return 'R$ ' + parseFloat(n || 0).toFixed(2)
    .replace('.', ',')
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function escStr(s) {
  return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

function showToast(msg, err) {
  var el = document.getElementById('toast'); if (!el) return;
  el.textContent = msg;
  el.className = err ? 'error' : '';
  el.style.display = 'block';
  clearTimeout(el._t);
  el._t = setTimeout(function() { el.style.display = 'none'; }, 3000);
}

function showModal(html) {
  var o = document.getElementById('modal-overlay'); if (!o) return;
  o.innerHTML = '<div class="modal-sheet"><div class="modal-handle"></div>' + html + '</div>';
  o.style.display = 'flex';
}

function closeModal() {
  var o = document.getElementById('modal-overlay');
  if (o) o.style.display = 'none';
}

function loadingHTML(msg) {
  return '<div class="loading-overlay"><div class="spinner"></div><p>' + (msg || 'Carregando...') + '</p></div>';
}

function _val(id) {
  var el = document.getElementById(id);
  return el ? el.value.trim() : '';
}

function _field(label, id, type, value, placeholder) {
  return '<div class="form-group"><label>' + label + '</label>' +
    '<input id="' + id + '" type="' + (type || 'text') + '" ' +
    'value="' + escStr(value || '') + '" ' +
    'placeholder="' + escStr(placeholder || '') + '"></div>';
}

function _select(label, id, options) {
  return '<div class="form-group"><label>' + label + '</label><select id="' + id + '">' +
    options.map(function(o) { return '<option>' + o + '</option>'; }).join('') +
    '</select></div>';
}