// ============================================================
//  produtos.js — Cadastro e listagem de produtos
// ============================================================

function renderProdutos() {
  if (state.loading) return loadingHTML();

  var search   = state.searchProd.toLowerCase();
  var filtered = state.produtos.filter(function(p) {
    return p.nome.toLowerCase().indexOf(search) !== -1 ||
           p.categoria.toLowerCase().indexOf(search) !== -1;
  });

  return '<div class="page-header">' +
    '<h1>Produtos</h1>' +
    '<p>' + state.produtos.length + ' cadastrados</p>' +
  '</div>' +
  '<button class="btn btn-primary" onclick="produtosShowForm()" style="margin-bottom:16px">' +
    '+ Novo Produto' +
  '</button>' +
  '<div id="form-produto"></div>' +
  '<div class="search-wrap">' +
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
      '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>' +
    '</svg>' +
    '<input type="text" placeholder="Buscar por nome ou categoria..." ' +
      'value="' + state.searchProd + '" ' +
      'oninput="state.searchProd=this.value;render()">' +
  '</div>' +
  _renderProdutosList(filtered);
}

function _renderProdutosList(produtos) {
  if (!produtos.length) return '<p class="empty">Nenhum produto encontrado</p>';

  return '<div class="card" style="padding:0">' +
    produtos.map(function(p) {
      var badge = p.status === 'REPOR'
        ? '<span class="badge badge-red">Repor</span>'
        : '<span class="badge badge-green">OK</span>';
      return '<div class="list-item" style="padding:12px 16px">' +
        '<div>' +
          '<div class="list-name">' + p.nome + '</div>' +
          '<div class="list-sub" style="margin-top:4px">' +
            '<span class="cat-chip">' + p.categoria + '</span>&nbsp;' +
            badge + '&nbsp;Estoque: ' + p.estoque +
          '</div>' +
        '</div>' +
        '<div style="text-align:right">' +
          '<div style="font-family:var(--font-brand);font-size:16px;font-weight:700;color:var(--jade)">' +
            fmt(p.preco) +
          '</div>' +
          '<div style="font-size:11px;color:var(--jade);margin-top:2px">+' + fmt(p.margem) + '/un</div>' +
        '</div>' +
      '</div>';
    }).join('') +
  '</div>';
}

// ── Formulário de cadastro ────────────────────────────────────

function produtosShowForm() {
  api('getProximoCodigo', {})
    .then(function(codigo) {
      var el = document.getElementById('form-produto');
      if (!el) return;
      el.innerHTML = '<div class="card" style="margin-bottom:16px">' +
        '<p style="font-family:var(--font-brand);font-size:13px;font-weight:700;' +
           'text-transform:uppercase;letter-spacing:.5px;margin-bottom:14px">Novo Produto</p>' +
        _field('Código',              'np-cod',    'text',   codigo) +
        _field('Nome',                'np-nome',   'text',   '', 'Ex: Cerveja Skol 350ml') +
        _select('Categoria',          'np-cat',
          ['Cerveja','Refrigerante','Água','Energético','Suco','Destilado','Outro']) +
        _field('Fornecedor',          'np-forn',   'text',   '', 'Nome do fornecedor') +
        _field('Custo (R$)',          'np-custo',  'number', '', '0,00') +
        _field('Preço de Venda (R$)', 'np-preco',  'number', '', '0,00') +
        _field('Estoque Inicial',     'np-estq',   'number', '', '0') +
        _field('Estoque Mínimo',      'np-estmin', 'number', '', '0') +
        '<button class="btn btn-primary" onclick="produtosSalvar()">Salvar Produto</button>' +
      '</div>';
      document.getElementById('content').scrollTop = 0;
    })
    .catch(function(e) { showToast('Erro: ' + e.message, true); });
}

function produtosSalvar() {
  var p = {
    codigo:     _val('np-cod'),
    nome:       _val('np-nome'),
    categoria:  _val('np-cat'),
    fornecedor: _val('np-forn'),
    custo:      parseFloat(_val('np-custo'))  || 0,
    preco:      parseFloat(_val('np-preco'))  || 0,
    estoque:    parseInt(_val('np-estq'))     || 0,
    estoqueMin: parseInt(_val('np-estmin'))   || 0,
  };

  if (!p.nome)  { showToast('Informe o nome do produto', true); return; }
  if (!p.preco) { showToast('Informe o preço de venda', true); return; }

  api('addProduto', { produto: p })
    .then(function(res) {
      if (!res.ok) { showToast(res.erro, true); return; }
      showToast('Produto "' + p.nome + '" salvo!');
      loadProdutos();
    })
    .catch(function(e) { showToast('Erro: ' + e.message, true); });
}

// ── Helpers de formulário ─────────────────────────────────────

function _field(label, id, type, value, placeholder) {
  return '<div class="form-group">' +
    '<label>' + label + '</label>' +
    '<input id="' + id + '" type="' + type + '" ' +
      (value      ? 'value="' + value + '" '           : '') +
      (placeholder? 'placeholder="' + placeholder + '"': '') +
    '>' +
  '</div>';
}

function _select(label, id, options) {
  return '<div class="form-group"><label>' + label + '</label>' +
    '<select id="' + id + '">' +
      options.map(function(o) { return '<option>' + o + '</option>'; }).join('') +
    '</select></div>';
}

function _val(id) {
  var el = document.getElementById(id);
  return el ? el.value.trim() : '';
}