// ============================================================
//  dashboard.js — Analytics e métricas operacionais
// ============================================================

function renderDashboard() {
  return '<div class="page-header"><h1>Dashboard</h1><p>Resumo operacional</p></div>' +
    loadingHTML('Carregando métricas...');
}

function loadDashboardData() {
  api('getDashboard', {})
    .then(function(d) {
      if (state.page !== 'dashboard') return;
      document.getElementById('content').innerHTML = _renderDashboardContent(d);
    })
    .catch(function(e) { showToast('Erro ao carregar dashboard', true); });
}

function _renderDashboardContent(d) {
  var pct      = Math.min(d.pctMeta * 100, 100).toFixed(0);
  var pctColor = pct >= 100 ? 'var(--jade)' : 'var(--blue)';

  return (
    '<div class="page-header"><h1>Dashboard</h1><p>Resumo operacional</p></div>' +

    // ── Faturamento hoje ──────────────────────────────────
    '<div class="card" style="margin-bottom:12px">' +
      '<div class="card-label">Faturamento Hoje</div>' +
      '<div class="card-value" style="color:var(--jade)">' + fmt(d.totalHoje) + '</div>' +
    '</div>' +

    // ── Mês + Custo ───────────────────────────────────────
    '<div class="grid2">' +
      '<div class="card">' +
        '<div class="card-label">Mês Atual</div>' +
        '<div class="card-value">' + fmt(d.totalMes) + '</div>' +
      '</div>' +
      '<div class="card">' +
        '<div class="card-label">Custo Mensal</div>' +
        '<div class="card-value" style="color:var(--red)">' + fmt(d.custoTotal) + '</div>' +
      '</div>' +
    '</div>' +

    // ── Meta do mês ───────────────────────────────────────
    '<div class="card">' +
      '<div style="display:flex;justify-content:space-between;align-items:center">' +
        '<div class="card-label">Meta do Mês</div>' +
        '<span style="font-family:var(--font-brand);font-size:18px;font-weight:700;color:' + pctColor + '">' + pct + '%</span>' +
      '</div>' +
      '<div class="card-sub">Meta: ' + d.metaMensal + ' un. · Margem média: ' + fmt(d.margemMedia) + '/un</div>' +
      '<div class="progress-bar"><div class="progress-fill" style="width:' + pct + '%"></div></div>' +
    '</div>' +

    // ── Top 5 produtos ────────────────────────────────────
    '<div class="section-title">Top Produtos</div>' +
    '<div class="card" style="padding:0"><div style="padding:0 16px">' +
      (d.top5.length === 0
        ? '<p class="empty">Nenhuma venda registrada</p>'
        : d.top5.map(function(p) {
            return '<div class="list-item">' +
              '<div class="list-name">' + p.nome + '</div>' +
              '<div style="font-family:var(--font-brand);font-weight:700;color:var(--jade)">' + fmt(p.fat) + '</div>' +
            '</div>';
          }).join('')) +
    '</div></div>' +

    // ── Análise por hora ──────────────────────────────────
    '<div class="section-title">Pico de Vendas por Hora</div>' +
    '<div class="card">' + _renderBarChart(d.porHora, 'hora') + '</div>' +

    // ── Análise por dia ───────────────────────────────────
    '<div class="section-title">Vendas por Dia da Semana</div>' +
    '<div class="card">' + _renderBarChart(d.porDia, 'dia') + '</div>' +

    // ── Estoque crítico ───────────────────────────────────
    '<div class="section-title">Estoque Crítico</div>' +
    '<div class="card" style="padding:0"><div style="padding:0 16px">' +
      (d.criticos.length === 0
        ? '<p class="empty">Estoque em dia ✓</p>'
        : d.criticos.slice(0, 4).map(function(p) {
            return '<div class="list-item">' +
              '<div class="list-name">' + p.nome + '</div>' +
              '<span class="badge badge-red">Repor</span>' +
            '</div>';
          }).join('') +
          (d.criticos.length > 4
            ? '<p style="font-size:12px;color:var(--text-2);padding:8px 0">+' + (d.criticos.length - 4) + ' outros</p>'
            : '')) +
    '</div></div>'
  );
}

// ── Mini gráfico de barras CSS ────────────────────────────────
function _renderBarChart(obj, tipo) {
  var entradas = Object.keys(obj)
    .map(function(k) { return { label: k, val: obj[k] }; })
    .filter(function(e) { return e.val > 0; });

  if (entradas.length === 0) {
    return '<p class="empty" style="padding:16px 0">Sem dados suficientes</p>';
  }

  // Ordena por hora (numérico) ou mantém ordem original para dias
  if (tipo === 'hora') {
    entradas.sort(function(a, b) {
      return parseInt(a.label) - parseInt(b.label);
    });
  }

  var maxVal = Math.max.apply(null, entradas.map(function(e) { return e.val; }));

  return entradas.map(function(e) {
    var pct   = maxVal > 0 ? (e.val / maxVal * 100).toFixed(0) : 0;
    var label = tipo === 'dia'
      ? e.label.substring(0, 3).charAt(0).toUpperCase() + e.label.substring(1, 3)  // "Seg", "Ter"...
      : e.label; // "08:00"

    return '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">' +
      '<div style="width:' + (tipo === 'dia' ? '28px' : '34px') + ';font-size:11px;color:var(--text-2);flex-shrink:0">' + label + '</div>' +
      '<div style="flex:1;background:var(--border);border-radius:4px;height:6px">' +
        '<div style="width:' + pct + '%;background:var(--jade);border-radius:4px;height:100%;transition:width .4s ease"></div>' +
      '</div>' +
      '<div style="width:58px;text-align:right;font-size:11px;font-family:var(--font-brand);font-weight:600;color:var(--text);flex-shrink:0">' +
        fmt(e.val) +
      '</div>' +
    '</div>';
  }).join('');
}