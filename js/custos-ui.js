// ============================================================
//  custos.js — Custos fixos e variáveis mensais
// ============================================================

function renderCustos() {
  if (state.loading) return loadingHTML();
  return '<div class="page-header"><h1>Custos</h1><p>Fixos e variáveis mensais</p></div>' +
    loadingHTML('Carregando custos...');
}

function loadCustosData() {
  api('getCustos', {})
    .then(function(data) {
      if (state.page !== 'custos') return;
      document.getElementById('content').innerHTML = _renderCustosContent(data);
    })
    .catch(function(e) { showToast('Erro ao carregar custos', true); });
}

function _renderCustosContent(d) {
  return '<div class="page-header"><h1>Custos</h1><p>Toque no valor para editar</p></div>' +

  '<div class="section-title">Custos Fixos</div>' +
  '<div class="card" style="padding:0">' +
    '<div style="padding:0 16px">' +
      d.fixos.map(function(item) { return _renderCustoItem(item); }).join('') +
    '</div>' +
    '<div style="padding:12px 16px;border-top:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">' +
      '<span style="font-size:12px;font-weight:600;color:var(--text-2);text-transform:uppercase;letter-spacing:.5px">Total Fixos</span>' +
      '<span id="total-fixos" style="font-family:var(--font-brand);font-weight:700;color:var(--text)">' + fmt(d.totalFixos) + '</span>' +
    '</div>' +
  '</div>' +

  '<div class="section-title">Custos Variáveis</div>' +
  '<div class="card" style="padding:0">' +
    '<div style="padding:0 16px">' +
      d.variaveis.map(function(item) { return _renderCustoItem(item); }).join('') +
    '</div>' +
    '<div style="padding:12px 16px;border-top:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">' +
      '<span style="font-size:12px;font-weight:600;color:var(--text-2);text-transform:uppercase;letter-spacing:.5px">Total Variáveis</span>' +
      '<span id="total-variaveis" style="font-family:var(--font-brand);font-weight:700;color:var(--text)">' + fmt(d.totalVariaveis) + '</span>' +
    '</div>' +
  '</div>' +

  '<div class="card card-accent">' +
    '<div class="card-label" style="color:var(--jade)">💰 Custo Total Mensal</div>' +
    '<div id="total-geral" class="card-value" style="color:var(--jade)">' + fmt(d.totalGeral) + '</div>' +
    '<div class="card-sub">Fixos + Variáveis — meta de faturamento base</div>' +
  '</div>';
}

function _renderCustoItem(item) {
  return '<div class="list-item" style="padding:14px 0">' +
    '<div style="flex:1">' +
      '<div class="list-name">' + item.descricao + '</div>' +
      (item.obs ? '<div class="list-sub">' + item.obs + '</div>' : '') +
    '</div>' +
    '<div style="display:flex;align-items:center;gap:8px">' +
      '<input type="number" step="0.01" min="0" ' +
        'id="custo-' + item.linha + '" ' +
        'value="' + item.valor.toFixed(2) + '" ' +
        'style="width:100px;text-align:right;padding:8px 10px;font-family:var(--font-brand);font-weight:700;font-size:14px" ' +
        'onblur="custoSalvar(' + item.linha + ')">' +
    '</div>' +
  '</div>';
}

function custoSalvar(linha) {
  var el  = document.getElementById('custo-' + linha);
  if (!el) return;
  var val = parseFloat(el.value) || 0;
  el.style.borderColor = 'var(--amber)';

  api('salvarCusto', { linha: linha, valor: val })
    .then(function(res) {
      if (!res.ok) { showToast('Erro: ' + res.erro, true); el.style.borderColor = 'var(--red)'; return; }
      el.style.borderColor = 'var(--jade)';
      // Atualiza os totais na tela sem recarregar tudo
      var tf = document.getElementById('total-fixos');
      var tv = document.getElementById('total-variaveis');
      var tg = document.getElementById('total-geral');
      if (tf) tf.textContent = fmt(res.totalFixos);
      if (tv) tv.textContent = fmt(res.totalVariaveis);
      if (tg) tg.textContent = fmt(res.totalGeral);
      setTimeout(function() { el.style.borderColor = 'var(--border)'; }, 1500);
      showToast('Custo atualizado');
    })
    .catch(function(e) {
      el.style.borderColor = 'var(--red)';
      showToast('Erro ao salvar: ' + e.message, true);
    });
}