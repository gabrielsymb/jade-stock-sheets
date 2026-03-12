// ============================================================
//  fornecedores.js — Listagem e cadastro de fornecedores
// ============================================================

function renderFornecedores() {
  if (state.loading) return loadingHTML();
  return '<div class="page-header"><h1>Fornecedores</h1><p>Contatos e condições</p></div>' +
    loadingHTML('Carregando fornecedores...');
}

function loadFornecedoresData() {
  api('getFornecedores', {})
    .then(function(data) {
      if (state.page !== 'fornecedores') return;
      state.fornecedores = Array.isArray(data) ? data : [];
      document.getElementById('content').innerHTML = _renderFornecedoresContent();
    })
    .catch(function(e) { showToast('Erro ao carregar fornecedores', true); });
}

function _renderFornecedoresContent() {
  var lista = state.fornecedores || [];

  return '<div class="page-header"><h1>Fornecedores</h1><p>' + lista.length + ' cadastrados</p></div>' +

  '<button class="btn btn-primary" onclick="fornecedorShowForm(null)" style="margin-bottom:16px">+ Novo Fornecedor</button>' +

  '<div id="form-fornecedor"></div>' +

  (lista.length === 0
    ? '<p class="empty">Nenhum fornecedor cadastrado</p>'
    : '<div class="card" style="padding:0"><div style="padding:0 16px">' +
        lista.map(function(f) {
          return '<div class="list-item" style="padding:14px 0">' +
            '<div style="flex:1">' +
              '<div class="list-name">' + f.nome + '</div>' +
              '<div class="list-sub" style="margin-top:3px">' +
                (f.produto ? f.produto + ' · ' : '') +
                (f.preco ? fmt(f.preco) + '/un' : '') +
                (f.prazo ? ' · ' + f.prazo + 'd' : '') +
              '</div>' +
              (f.obs ? '<div class="list-sub" style="margin-top:2px;font-style:italic">' + f.obs + '</div>' : '') +
              '<div style="margin-top:6px">' +
                (f.problemas === 'Sim'
                  ? '<span class="badge badge-red">⚠ Problemas recorrentes</span>'
                  : '<span class="badge badge-green">✓ Sem problemas</span>') +
              '</div>' +
            '</div>' +
            '<div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end">' +
              '<button class="btn btn-ghost btn-sm" onclick="fornecedorShowForm(' + f.linha + ')">Editar</button>' +
              '<button class="btn btn-ghost-red btn-sm" onclick="fornecedorDeletar(' + f.linha + ')">Remover</button>' +
            '</div>' +
          '</div>';
        }).join('') +
      '</div></div>');
}

function fornecedorShowForm(linha) {
  var f = linha ? (state.fornecedores || []).find(function(x) { return x.linha === linha; }) : null;
  var el = document.getElementById('form-fornecedor');
  if (!el) return;

  el.innerHTML =
    '<div class="card" style="margin-bottom:16px">' +
      '<p style="font-family:var(--font-brand);font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:14px">' +
        (f ? 'Editar Fornecedor' : 'Novo Fornecedor') +
      '</p>' +
      _field('Nome', 'fn-nome', 'text', f ? f.nome : '', 'Ex: Ambev') +
      _field('Produto Principal', 'fn-prod', 'text', f ? f.produto : '', 'Ex: Cerveja Skol') +
      _field('Preço Unitário (R$)', 'fn-preco', 'number', f ? f.preco : '', '0,00') +
      _field('Prazo Entrega (dias)', 'fn-prazo', 'number', f ? f.prazo : '', '0') +
      _field('CNPJ', 'fn-cnpj', 'text', f ? f.cnpj : '', '00.000.000/0000-00') +
      _field('Observações', 'fn-obs', 'text', f ? f.obs : '', 'Condições, contato, etc.') +
      '<div class="form-group"><label>Problemas Recorrentes?</label>' +
        '<select id="fn-prob">' +
          '<option value="Não"' + (!f || f.problemas !== 'Sim' ? ' selected' : '') + '>Não</option>' +
          '<option value="Sim"' + (f && f.problemas === 'Sim' ? ' selected' : '') + '>Sim</option>' +
        '</select>' +
      '</div>' +
      '<button class="btn btn-primary" onclick="fornecedorSalvar(' + (linha || 'null') + ')" style="margin-bottom:8px">Salvar</button>' +
      '<button class="btn btn-ghost" onclick="document.getElementById(\'form-fornecedor\').innerHTML=\'\'">Cancelar</button>' +
    '</div>';

  document.getElementById('content').scrollTop = 0;
}

function fornecedorSalvar(linha) {
  var f = {
    nome:      _val('fn-nome'),
    produto:   _val('fn-prod'),
    preco:     parseFloat(_val('fn-preco')) || 0,
    prazo:     _val('fn-prazo'),
    cnpj:      _val('fn-cnpj'),
    obs:       _val('fn-obs'),
    problemas: _val('fn-prob'),
    linha:     linha || null
  };

  if (!f.nome) { showToast('Informe o nome do fornecedor', true); return; }

  api('salvarFornecedor', { fornecedor: f })
    .then(function(res) {
      if (!res.ok) { showToast('Erro: ' + res.erro, true); return; }
      showToast('Fornecedor salvo!');
      loadFornecedoresData();
    })
    .catch(function(e) { showToast('Erro: ' + e.message, true); });
}

function fornecedorDeletar(linha) {
  if (!confirm('Remover este fornecedor?')) return;
  api('deletarFornecedor', { linha: linha })
    .then(function(res) {
      if (!res.ok) { showToast('Erro: ' + res.erro, true); return; }
      showToast('Fornecedor removido');
      loadFornecedoresData();
    })
    .catch(function(e) { showToast('Erro: ' + e.message, true); });
}