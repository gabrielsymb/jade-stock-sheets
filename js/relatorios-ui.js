// ============================================================
//  relatorios.js — Relatório gerencial com exportação PDF
//
//  Fluxo: usuário escolhe período → clica Gerar → servidor
//  retorna dados → client renderiza preview → botão Imprimir
//  abre dialog nativo do navegador → usuário salva como PDF.
//
//  No Android Chrome, "Imprimir" → "Salvar como PDF" → compartilhar.
//  No iOS Safari, "Compartilhar" → "Imprimir" → pinch-to-zoom salva PDF.
// ============================================================

function renderRelatorios() {
  // Calcula datas padrão: início do mês atual até hoje
  var hoje     = new Date();
  var inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  var fmtDate  = function(d) {
    // Formata para o valor do input type="date" (yyyy-MM-dd)
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  };

  return (
    '<div class="page-header"><h1>Relatórios</h1><p>Análise gerencial por período</p></div>' +

    '<div class="card">' +
      '<p style="font-family:Syne,sans-serif;font-size:13px;font-weight:700;' +
         'text-transform:uppercase;letter-spacing:.5px;margin-bottom:14px">Período</p>' +

      '<div class="grid2" style="margin-bottom:14px">' +
        '<div class="form-group" style="margin-bottom:0">' +
          '<label>De</label>' +
          '<input type="date" id="rel-inicio" value="' + fmtDate(inicioMes) + '">' +
        '</div>' +
        '<div class="form-group" style="margin-bottom:0">' +
          '<label>Até</label>' +
          '<input type="date" id="rel-fim" value="' + fmtDate(hoje) + '">' +
        '</div>' +
      '</div>' +

      // Atalhos de período rápido
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">' +
        _btnPeriodo('Hoje',        0,  0) +
        _btnPeriodo('7 dias',      6,  0) +
        _btnPeriodo('Este mês',   -1,  0) +
        _btnPeriodo('Mês passado',-2, -1) +
      '</div>' +

      '<button class="btn btn-primary" onclick="relGerarRelatorio()" id="btn-gerar">' +
        '📊 Gerar Relatório' +
      '</button>' +
    '</div>' +

    // Área onde o preview do relatório será injetado
    '<div id="rel-preview"></div>'
  );
}

// Gera botão de atalho de período
function _btnPeriodo(label, diasAtras, diasFim) {
  return '<button class="btn-sm btn-sm-blue" ' +
    'onclick="relDefinirPeriodo(' + diasAtras + ',' + diasFim + ')">' +
    label +
  '</button>';
}

// Define as datas dos inputs a partir de atalhos rápidos.
// diasAtras < 0 indica "início do mês N atrás" (ex: -1 = início deste mês).
function relDefinirPeriodo(diasAtras, diasFim) {
  var hoje = new Date();
  var inicio, fim;

  var fmtDate = function(d) {
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  };

  if (diasAtras === -1) {
    // Este mês
    inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    fim    = hoje;
  } else if (diasAtras === -2) {
    // Mês passado
    inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
    fim    = new Date(hoje.getFullYear(), hoje.getMonth(), 0); // último dia do mês passado
  } else {
    // N dias atrás
    inicio = new Date(hoje);
    inicio.setDate(hoje.getDate() - diasAtras);
    fim = hoje;
  }

  var elInicio = document.getElementById('rel-inicio');
  var elFim    = document.getElementById('rel-fim');
  if (elInicio) elInicio.value = fmtDate(inicio);
  if (elFim)    elFim.value    = fmtDate(fim);
}

// Dispara a geração do relatório — chama o servidor com o período selecionado
function relGerarRelatorio() {
  var inicio = document.getElementById('rel-inicio');
  var fim    = document.getElementById('rel-fim');
  if (!inicio || !fim || !inicio.value || !fim.value) {
    showToast('Selecione o período', true); return;
  }
  if (inicio.value > fim.value) {
    showToast('A data inicial deve ser anterior à final', true); return;
  }

  // Converte yyyy-MM-dd para dd/MM/yyyy que o servidor espera
  var fmtBR = function(s) {
    var p = s.split('-');
    return p[2] + '/' + p[1] + '/' + p[0];
  };

  var preview  = document.getElementById('rel-preview');
  var btnGerar = document.getElementById('btn-gerar');
  if (preview)  preview.innerHTML = loadingHTML('Calculando relatório...');
  if (btnGerar) { btnGerar.disabled = true; btnGerar.textContent = '⌛ Gerando...'; }

  api('getRelatorio', { inicio: fmtBR(inicio.value), fim: fmtBR(fim.value) })
    .then(function(dados) {
      if (btnGerar) { btnGerar.disabled = false; btnGerar.innerHTML = '📊 Gerar Relatório'; }
      window._relDados = dados;
      if (preview)  preview.innerHTML = _renderPreview(dados);
    })
    .catch(function(e) {
      if (btnGerar) { btnGerar.disabled = false; btnGerar.innerHTML = '📊 Gerar Relatório'; }
      showToast('Erro ao gerar relatório: ' + e.message, true);
    });
}

// Renderiza o preview inline do relatório (visível dentro do app)
function _renderPreview(d) {
  var temVendas = d.totalVendas > 0;

  return (
    // ── Cabeçalho do relatório ────────────────────────────
    '<div class="card" style="background:linear-gradient(135deg,var(--md-sys-color-primary-container),var(--md-sys-color-secondary-container));margin-top:8px">' +
      '<div style="font-family:Syne,sans-serif;font-size:18px;font-weight:800;margin-bottom:2px">Jade Stock</div>' +
      '<div style="font-size:13px;color:var(--md-sys-color-on-surface-variant)">Relatório Gerencial</div>' +
      '<div style="font-size:12px;color:var(--md-sys-color-on-surface-variant);margin-top:6px">' +
        '📅 ' + d.periodo.inicio + ' → ' + d.periodo.fim +
        ' &nbsp;·&nbsp; Gerado em ' + d.geradoEm +
      '</div>' +
    '</div>' +

    // ── KPIs principais ───────────────────────────────────
    (!temVendas
      ? '<div class="card"><p class="empty">Nenhuma venda encontrada neste período.</p></div>'
      : '') +

    '<div class="grid2">' +
      '<div class="card">' +
        '<div class="card-label">Receita Bruta</div>' +
        '<div class="card-value" style="color:var(--md-sys-color-primary)">' + fmt(d.totalReceita) + '</div>' +
        '<div class="card-sub">' + d.totalVendas + ' vendas</div>' +
      '</div>' +
      '<div class="card">' +
        '<div class="card-label">Custo Total</div>' +
        '<div class="card-value" style="color:var(--md-sys-color-error)">' + fmt(d.totalCusto) + '</div>' +
        '<div class="card-sub">CMV do período</div>' +
      '</div>' +
    '</div>' +

    '<div class="grid2">' +
      '<div class="card">' +
        '<div class="card-label">Margem Líquida</div>' +
        '<div class="card-value" style="color:var(--md-sys-color-primary)">' + fmt(d.margemLiquida) + '</div>' +
        '<div class="card-sub">Receita − Custo</div>' +
      '</div>' +
      '<div class="card">' +
        '<div class="card-label">Margem %</div>' +
        '<div class="card-value" style="color:' + (parseFloat(d.margemPct) >= 20 ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-error)') + '">' +
          d.margemPct + '%' +
        '</div>' +
        '<div class="card-sub">Sobre receita bruta</div>' +
      '</div>' +
    '</div>' +

    // ── Resumo por produto ────────────────────────────────
    '<div class="section-title">Resumo por Produto</div>' +
    '<div class="card" style="padding:0">' +
      '<div style="padding:0 16px">' +
        (d.resumoProdutos.length === 0
          ? '<p class="empty" style="padding:16px 0">Nenhum produto vendido no período</p>'
          : d.resumoProdutos.map(function(p) {
              return '<div class="list-item" style="padding:12px 0;flex-direction:column;align-items:flex-start;gap:4px">' +
                '<div style="display:flex;justify-content:space-between;width:100%;align-items:center">' +
                  '<div class="list-item-name">' + p.nome + '</div>' +
                  '<div style="font-family:Syne,sans-serif;font-weight:700;font-size:14px;color:var(--md-sys-color-primary)">' +
                    fmt(p.receita) +
                  '</div>' +
                '</div>' +
                '<div style="display:flex;gap:12px;font-size:11px;color:var(--md-sys-color-on-surface-variant)">' +
                  '<span>' + p.qtdVendida.toFixed(0) + ' un. vendidas</span>' +
                  '<span>Custo: ' + fmt(p.custo) + '</span>' +
                  '<span>Margem: <strong style="color:var(--md-sys-color-primary)">' + p.margemPct + '%</strong></span>' +
                '</div>' +
              '</div>';
            }).join('')) +
      '</div>' +
    '</div>' +

    // ── Estoque atual ─────────────────────────────────────
    '<div class="section-title">Estoque Atual</div>' +
    '<div class="card" style="padding:0">' +
      '<div style="padding:0 16px">' +
        d.estoque.map(function(p) {
          var badge = p.status === 'REPOR'
            ? '<span class="badge badge-red">Repor</span>'
            : '<span class="badge badge-green">OK</span>';
          return '<div class="list-item" style="padding:10px 0">' +
            '<div style="flex:1">' +
              '<div class="list-item-name">' + p.nome + '</div>' +
              '<div class="list-item-sub">' + p.categoria + ' · Mín: ' + p.estoqueMin + '</div>' +
            '</div>' +
            '<div style="display:flex;align-items:center;gap:8px">' +
              '<span style="font-family:Syne,sans-serif;font-weight:700">' + p.estoque + ' un.</span>' +
              badge +
            '</div>' +
          '</div>';
        }).join('') +
      '</div>' +
    '</div>' +

    // ── Botão de impressão / PDF ───────────────────────────
    '<div style="position:sticky;bottom:80px;z-index:10;padding:8px 0">' +
      '<button class="btn btn-success" onclick="relImprimir()" ' +
        'style="box-shadow:0 4px 20px rgba(0,0,0,.3)">' +
        '🖨 Imprimir / Salvar PDF' +
      '</button>' +
    '</div>'
  );
}

// Abre uma nova janela com o relatório formatado para impressão.
// O usuário usa Ctrl+P (desktop) ou o menu de impressão do browser
// (mobile) para salvar como PDF ou imprimir.
// A janela é auto-suficiente: não depende de nenhum recurso externo.
function relImprimir() {
  var dados = window._relDados;
  if (!dados) { showToast('Gere o relatório antes de imprimir', true); return; }
  var html = _buildPrintHTML(dados);
  var win  = window.open('', '_blank');
  if (!win) {
    // Popup bloqueado — fallback: mostra toast orientando o usuário
    showToast('Permita popups para este site e tente novamente', true);
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
  // Aguarda recursos carregarem antes de abrir o diálogo de impressão
  win.onload = function() { win.print(); };
}

// Constrói o HTML completo da página de impressão.
// CSS @media print garante que a formatação seja adequada para papel/PDF.
function _buildPrintHTML(d) {
  var linhasProd = d.resumoProdutos.map(function(p) {
    return '<tr>' +
      '<td>' + p.nome + '</td>' +
      '<td class="num">' + p.qtdVendida.toFixed(0) + '</td>' +
      '<td class="num">' + fmt(p.receita) + '</td>' +
      '<td class="num">' + fmt(p.custo) + '</td>' +
      '<td class="num">' + fmt(p.margem) + '</td>' +
      '<td class="num">' + p.margemPct + '%</td>' +
    '</tr>';
  }).join('');

  var linhasEstoque = d.estoque.map(function(p) {
    var alerta = p.status === 'REPOR' ? ' style="color:#dc2626;font-weight:700"' : '';
    return '<tr>' +
      '<td>' + p.nome + '</td>' +
      '<td>' + p.categoria + '</td>' +
      '<td class="num"' + alerta + '>' + p.estoque + '</td>' +
      '<td class="num">' + p.estoqueMin + '</td>' +
      '<td class="num">' + (p.status === 'REPOR' ? '⚠ Repor' : '✓ OK') + '</td>' +
    '</tr>';
  }).join('');

  return '<!DOCTYPE html><html lang="pt-BR"><head>' +
  '<meta charset="UTF-8">' +
  '<title>Relatório Jade Stock — ' + d.periodo.inicio + ' a ' + d.periodo.fim + '</title>' +
  '<link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:opsz,wght@9..40,400;9..40,600&display=swap" rel="stylesheet">' +
  '<style>' +
    '*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }' +
    'body { font-family: "DM Sans", sans-serif; font-size: 13px; color: #1a1a1a; background: #fff; padding: 32px; }' +
    'h1 { font-family: "Syne", sans-serif; font-size: 22px; font-weight: 800; color: #064e3b; }' +
    'h2 { font-family: "Syne", sans-serif; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #6b7280; margin: 24px 0 8px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }' +
    '.header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #064e3b; }' +
    '.header-meta { text-align: right; font-size: 12px; color: #6b7280; line-height: 1.6; }' +
    '.kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 8px; }' +
    '.kpi { background: #f9fafb; border-radius: 8px; padding: 12px; border: 1px solid #e5e7eb; }' +
    '.kpi-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: .8px; color: #6b7280; margin-bottom: 4px; }' +
    '.kpi-value { font-family: "Syne", sans-serif; font-size: 18px; font-weight: 700; color: #064e3b; }' +
    '.kpi-value.red { color: #dc2626; }' +
    'table { width: 100%; border-collapse: collapse; font-size: 12px; }' +
    'thead tr { background: #f3f4f6; }' +
    'th { font-weight: 700; padding: 8px 10px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: .5px; color: #374151; }' +
    'td { padding: 7px 10px; border-bottom: 1px solid #f3f4f6; color: #1f2937; }' +
    'tr:last-child td { border-bottom: none; }' +
    'tr:nth-child(even) td { background: #fafafa; }' +
    '.num { text-align: right; font-family: "Syne", sans-serif; font-size: 12px; font-weight: 600; }' +
    '.footer { margin-top: 40px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; text-align: center; }' +
    '@media print {' +
      'body { padding: 16px; font-size: 11px; }' +
      '.kpi-value { font-size: 15px; }' +
      'h2 { margin-top: 16px; }' +
      '@page { margin: 1cm; size: A4 portrait; }' +
      'table { page-break-inside: auto; }' +
      'tr { page-break-inside: avoid; }' +
      'h2 { page-break-after: avoid; }' +
    '}' +
  '</style></head><body>' +

  // Cabeçalho
  '<div class="header">' +
    '<div>' +
      '<h1>Jade Stock</h1>' +
      '<div style="font-size:13px;color:#6b7280;margin-top:2px">Relatório Gerencial de Vendas</div>' +
    '</div>' +
    '<div class="header-meta">' +
      '<div><strong>Período:</strong> ' + d.periodo.inicio + ' a ' + d.periodo.fim + '</div>' +
      '<div><strong>Gerado em:</strong> ' + d.geradoEm + '</div>' +
      '<div><strong>Total de vendas:</strong> ' + d.totalVendas + '</div>' +
    '</div>' +
  '</div>' +

  // KPIs
  '<div class="kpis">' +
    '<div class="kpi"><div class="kpi-label">Receita Bruta</div><div class="kpi-value">' + fmt(d.totalReceita) + '</div></div>' +
    '<div class="kpi"><div class="kpi-label">Custo (CMV)</div><div class="kpi-value red">' + fmt(d.totalCusto) + '</div></div>' +
    '<div class="kpi"><div class="kpi-label">Margem Líquida</div><div class="kpi-value">' + fmt(d.margemLiquida) + '</div></div>' +
    '<div class="kpi"><div class="kpi-label">Margem %</div><div class="kpi-value">' + d.margemPct + '%</div></div>' +
  '</div>' +

  // Tabela de produtos
  '<h2>Desempenho por Produto</h2>' +
  '<table>' +
    '<thead><tr>' +
      '<th>Produto</th><th class="num">Qtd</th><th class="num">Receita</th>' +
      '<th class="num">Custo</th><th class="num">Margem R$</th><th class="num">Margem %</th>' +
    '</tr></thead>' +
    '<tbody>' + (linhasProd || '<tr><td colspan="6" style="text-align:center;color:#9ca3af;padding:16px">Nenhuma venda no período</td></tr>') + '</tbody>' +
  '</table>' +

  // Tabela de estoque
  '<h2>Estoque no Momento da Geração</h2>' +
  '<table>' +
    '<thead><tr>' +
      '<th>Produto</th><th>Categoria</th><th class="num">Atual</th>' +
      '<th class="num">Mínimo</th><th class="num">Status</th>' +
    '</tr></thead>' +
    '<tbody>' + linhasEstoque + '</tbody>' +
  '</table>' +

  '<div class="footer">Jade Stock · Relatório gerado automaticamente · ' + d.geradoEm + '</div>' +
  '</body></html>';
}
