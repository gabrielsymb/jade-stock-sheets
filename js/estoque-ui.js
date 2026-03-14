// ============================================================
//  estoque.js — Entradas manuais e importação de NF-e XML
// ============================================================

function renderEstoque() {
  if (state.loading) return loadingHTML();

  var criticos = state.produtos.filter(function(p) { return p.status === 'REPOR'; });

  return '<div class="page-header">' +
    '<h1>Estoque</h1><p>Entradas manuais e NF-e</p>' +
  '</div>' +
  _renderAlertaCriticos(criticos) +
  _renderUploadNFe() +
  _renderFormEntrada();
}

// ── Alerta de estoque crítico ─────────────────────────────────

function _renderAlertaCriticos(criticos) {
  if (!criticos.length) return '';
  return '<div class="card card-warn" style="margin-bottom:16px">' +
    '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">' +
      '<span>⚠</span>' +
      '<span style="font-family:var(--font-brand);font-size:13px;font-weight:700;' +
             'text-transform:uppercase;color:var(--red)">Estoque Crítico</span>' +
    '</div>' +
    criticos.map(function(p) {
      return '<div class="list-item">' +
        '<div>' +
          '<div class="list-name">' + p.nome + '</div>' +
          '<div class="list-sub">Atual: ' + p.estoque + ' · Mín: ' + p.estoqueMin + '</div>' +
        '</div>' +
        '<button class="btn btn-ghost btn-sm" ' +
          'onclick="estoquePreencherProduto(\'' + escStr(p.nome) + '\')">+ Repor</button>' +
      '</div>';
    }).join('') +
  '</div>';
}

// ── Upload NF-e ───────────────────────────────────────────────

function _renderUploadNFe() {
  return '<div class="upload-zone" id="upload-zone" ' +
    'onclick="document.getElementById(\'nfe-input\').click()" ' +
    'ondragover="event.preventDefault();this.classList.add(\'drag\')" ' +
    'ondragleave="this.classList.remove(\'drag\')" ' +
    'ondrop="estoqueHandleDrop(event)">' +
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">' +
      '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>' +
      '<polyline points="14 2 14 8 20 8"/>' +
      '<line x1="12" y1="18" x2="12" y2="12"/>' +
      '<polyline points="9 15 12 12 15 15"/>' +
    '</svg>' +
    '<p>Importar <strong>NF-e XML</strong></p>' +
    '<p style="font-size:12px;margin-top:4px">Toque para selecionar ou arraste o arquivo</p>' +
  '</div>' +
  '<input type="file" id="nfe-input" accept=".xml" style="display:none" ' +
    'onchange="estoqueHandleFile(this.files[0])">';
}

// ── Formulário de entrada manual ──────────────────────────────

function _renderFormEntrada() {
  var opts = state.produtos.map(function(p) {
    return '<option value="' + escStr(p.nome) + '">' + p.nome + '</option>';
  }).join('');

  return '<div class="card">' +
    '<p style="font-family:var(--font-brand);font-size:13px;font-weight:700;' +
       'text-transform:uppercase;letter-spacing:.5px;margin-bottom:14px">Entrada Manual</p>' +
    '<div class="form-group"><label>Produto</label>' +
      '<select id="ent-prod">' + opts + '</select>' +
    '</div>' +
    '<div class="form-group"><label>Quantidade</label>' +
      '<input id="ent-qtd" type="number" placeholder="0" min="1" ' +
        'oninput="estoquePreview()">' +
    '</div>' +
    '<div class="form-group"><label>Valor Unitário (R$)</label>' +
      '<input id="ent-val" type="number" step="0.01" placeholder="0,00" ' +
        'oninput="estoquePreview()">' +
    '</div>' +
    '<div id="ent-preview" style="background:var(--panel-2);border-radius:var(--r-md);' +
       'padding:12px;margin-bottom:14px;display:none">' +
      '<span style="font-size:12px;color:var(--text-2)">Total da entrada: </span>' +
      '<span id="ent-total" style="font-family:var(--font-brand);font-weight:700;color:var(--jade)"></span>' +
    '</div>' +
    '<button class="btn btn-primary" onclick="estoqueSalvarEntrada()">Registrar Entrada</button>' +
  '</div>';
}

// ── Ações ─────────────────────────────────────────────────────

function estoquePreview() {
  var qtd  = parseFloat(_val('ent-qtd')) || 0;
  var val  = parseFloat(_val('ent-val')) || 0;
  var prev = document.getElementById('ent-preview');
  var tot  = document.getElementById('ent-total');
  if (qtd > 0 && val > 0 && prev && tot) {
    prev.style.display = 'block';
    tot.textContent    = fmt(qtd * val);
  }
}

function estoquePreencherProduto(nome) {
  navigate('estoque');
  setTimeout(function() {
    var sel = document.getElementById('ent-prod');
    if (!sel) return;
    for (var i = 0; i < sel.options.length; i++) {
      if (sel.options[i].value === nome) { sel.selectedIndex = i; break; }
    }
    var qtdEl = document.getElementById('ent-qtd');
    if (qtdEl) qtdEl.focus();
  }, 150);
}

function estoqueSalvarEntrada() {
  var e = {
    produto:    _val('ent-prod'),
    quantidade: parseInt(_val('ent-qtd'))   || 0,
    valorUnit:  parseFloat(_val('ent-val')) || 0,
  };
  if (!e.produto)        { showToast('Selecione o produto', true);       return; }
  if (e.quantidade <= 0) { showToast('Informe a quantidade', true);      return; }
  if (e.valorUnit  <= 0) { showToast('Informe o valor unitário', true);  return; }

  api('registrarEntrada', { entrada: e })
    .then(function(res) {
      showToast(res.duplicata
        ? 'Entrada já registrada'
        : 'Entrada de ' + e.quantidade + 'x ' + e.produto + ' registrada!');
      loadProdutos();
    })
    .catch(function(err) { showToast('Erro: ' + err.message, true); });
}

// ── Handlers de arquivo XML ───────────────────────────────────

function estoqueHandleFile(file) {
  if (!file) return;
  if (!file.name.endsWith('.xml')) { showToast('Selecione um arquivo .xml', true); return; }
  var reader = new FileReader();
  reader.onload = function(e) { estoqueProcessarXML(e.target.result); };
  reader.readAsText(file, 'UTF-8');
}

function estoqueHandleDrop(event) {
  event.preventDefault();
  document.getElementById('upload-zone').classList.remove('drag');
  var file = event.dataTransfer.files[0];
  estoqueHandleFile(file);
}

function estoqueProcessarXML(xmlString) {
  showToast('Processando NF-e...');
  api('parseNFe', { xmlString: xmlString })
    .then(function(res) {
      if (!res.ok) { showToast(res.erro, true); return; }
      // Passa para o mapper
      nfeMapear(res.cabecalho, res.itens);
    })
    .catch(function(e) { showToast('Erro ao ler XML: ' + e.message, true); });
}