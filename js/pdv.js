// ============================================================
//  pdv.js — Ponto de Venda
//  ALTERAÇÃO: botão de scanner integrado na barra de busca
// ============================================================

function renderPDV() {
  if (state.loading) return loadingHTML('Carregando produtos...');

  var search   = state.searchPdv.toLowerCase();
  var filtered = state.produtos.filter(function(p) {
    return p.nome.toLowerCase().indexOf(search) !== -1;
  });

  return _renderCart() + _renderSearchComScanner() + _renderProdGrid(filtered);
}

// ── Carrinho ──────────────────────────────────────────────────

function _renderCart() {
  if (!state.cart.length) return '';

  var total = state.cart.reduce(function(acc, i) {
    return acc + i.quantidade * i.valorUnit;
  }, 0);

  var items = state.cart.map(function(item, idx) {
    return '<div class="cart-item">' +
      '<span class="cart-item-name">' + item.nome + '</span>' +
      '<div class="cart-item-qty">' +
        '<button class="qty-btn" onclick="cartChangeQty(' + idx + ',-1)">−</button>' +
        '<span style="font-weight:600;min-width:20px;text-align:center">' + item.quantidade + '</span>' +
        '<button class="qty-btn" onclick="cartChangeQty(' + idx + ',1)">+</button>' +
      '</div>' +
      '<span class="cart-item-price">' + fmt(item.quantidade * item.valorUnit) + '</span>' +
    '</div>';
  }).join('');

  return '<div class="pdv-cart">' +
    '<div class="pdv-cart-header">' +
      '<span>Carrinho</span>' +
      '<button class="btn btn-ghost-red btn-sm" onclick="cartClear()">Limpar</button>' +
    '</div>' +
    '<div class="pdv-cart-body">' + items + '</div>' +
    '<div class="pdv-total">' +
      '<span class="pdv-total-label">Total</span>' +
      '<span class="pdv-total-val">' + fmt(total) + '</span>' +
    '</div>' +
  '</div>' +
  '<button class="btn btn-primary" onclick="pdvFinalizar()" style="margin-bottom:16px">' +
    '✓ Finalizar Venda' +
  '</button>';
}

function _renderProdGrid(produtos) {
  if (!produtos.length) return '<p class="empty">Nenhum produto encontrado</p>';

  var header = '<div class="page-header">' +
    '<h1>Jade Stock</h1>' +
    '<p>Toque no produto para adicionar</p>' +
  '</div>';

  var grid = '<div class="prod-grid">' +
    produtos.map(function(p) {
      var sem   = p.estoque <= 0;
      var attrs = sem
        ? ' style="opacity:.4;pointer-events:none"'
        : ' onclick="cartAdd(\'' + escStr(p.nome) + '\',' + p.preco + ',' + p.estoque + ')"';
      return '<div class="prod-card"' + attrs + '>' +
        '<div class="prod-name">' + p.nome + '</div>' +
        '<div class="prod-price">' + fmt(p.preco) + '</div>' +
        '<div class="prod-stock">' +
          (sem ? '⚠ Sem estoque' : 'Estoque: ' + p.estoque + ' un.') +
        '</div>' +
      '</div>';
    }).join('') +
  '</div>';

  return header + grid;
}

// ── Barra de busca com botão de scanner ───────────────────────
// O botão de barcode abre o modal do scanner.
// O ícone usa SVG inline para não depender de font-icon externa.

function _renderSearchComScanner() {
  // Wrapper externo é apenas um flex row — NÃO usa a classe search-wrap,
  // que tem CSS próprio para posicionar o ícone de lupa absolutamente.
  // O .search-wrap fica intacto como filho flex:1, cuidando do seu próprio ícone.
  return '<div style="display:flex;gap:8px;align-items:center;margin-bottom:14px">' +

    // Campo de busca — classe search-wrap preservada exatamente como o CSS espera
    '<div class="search-wrap" style="flex:1;margin-bottom:0">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
        '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>' +
      '</svg>' +
      '<input type="text" placeholder="Buscar produto..." ' +
        'value="' + escStr(state.searchPdv || '') + '" ' +
        'oninput="state.searchPdv=this.value;render()">' +
    '</div>' +

    // Botão scanner — irmão do search-wrap, não filho
    '<button ' +
      'onclick="scannerAbrir()" ' +
      'title="Escanear código de barras" ' +
      'style="flex-shrink:0;width:44px;height:44px;border-radius:var(--r-md);' +
             'background:var(--jade);border:none;cursor:pointer;' +
             'display:flex;align-items:center;justify-content:center">' +
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" ' +
           'stroke="#002818" stroke-width="2" stroke-linecap="round">' +
        '<path d="M3 9V5a2 2 0 0 1 2-2h1"/>' +
        '<path d="M3 15v4a2 2 0 0 0 2 2h1"/>' +
        '<path d="M21 9V5a2 2 0 0 0-2-2h-1"/>' +
        '<path d="M21 15v4a2 2 0 0 1-2 2h-1"/>' +
        '<line x1="7"  y1="4" x2="7"  y2="20"/>' +
        '<line x1="11" y1="4" x2="11" y2="20"/>' +
        '<line x1="15" y1="4" x2="15" y2="20"/>' +
        '<line x1="19" y1="4" x2="19" y2="20" stroke-width="1"/>' +
        '<line x1="9"  y1="4" x2="9"  y2="20" stroke-width="1"/>' +
        '<line x1="13" y1="4" x2="13" y2="20" stroke-width="1.5"/>' +
        '<line x1="17" y1="4" x2="17" y2="20" stroke-width="1.5"/>' +
      '</svg>' +
    '</button>' +

  '</div>';
}

// ── Ações do carrinho ─────────────────────────────────────────

function cartAdd(nome, preco, estoque) {
  var idx = state.cart.findIndex(function(i) { return i.nome === nome; });
  if (idx >= 0) {
    if (state.cart[idx].quantidade < estoque) {
      state.cart[idx].quantidade++;
    } else {
      showToast('Estoque insuficiente', true);
    }
  } else {
    state.cart.push({ nome: nome, quantidade: 1, valorUnit: preco });
  }
  render();
}

function cartChangeQty(idx, delta) {
  state.cart[idx].quantidade += delta;
  if (state.cart[idx].quantidade <= 0) state.cart.splice(idx, 1);
  render();
}

function cartClear() { state.cart = []; render(); }

function pdvFinalizar() {
  if (!state.cart.length) { showToast('Carrinho vazio', true); return; }
  var total = state.cart.reduce(function(a, i) { return a + i.quantidade * i.valorUnit; }, 0);
  var itens = state.cart.slice();

  api('registrarVenda', { itens: itens })
    .then(function(res) {
      if (res.duplicata) { showToast('Venda já registrada', false); return; }
      state.cart = [];
      loadProdutos();
      showToast('Venda de ' + fmt(total) + ' registrada!');
    })
    .catch(function(e) {
      showToast('Erro: ' + e.message, true);
    });
}