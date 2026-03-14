// ============================================================
//  nfemapper.js — Modal de vinculação NF-e → Produtos
// ============================================================

/**
 * Ponto de entrada: inicia o mapeamento inteligente
 */
function nfeMapear(cabecalho, itensNFe) {
  state.nfeCab = cabecalho;
  showToast('Analisando itens com Inteligência...');

  api('mapearItensNFe', { itens: itensNFe })
    .then(function(itensMapeados) {
      state.nfeItens = itensMapeados;
      nfeAbrirModal();
    })
    .catch(function(e) {
      showToast('Erro no mapeamento: ' + e.message, true);
    });
}

/**
 * Monta e exibe o modal de conferência
 */
function nfeAbrirModal() {
  var cab    = state.nfeCab;
  var itens  = state.nfeItens;
  var nomes  = state.produtos.map(function(p) { return p.nome; });

  // Contadores para o cabeçalho do modal
  var auto    = itens.filter(function(i) { return i.status !== 'manual_pendente'; }).length;
  var pending = itens.length - auto;

  var rows = itens.map(function(item, idx) {
    var isAuto = item.status !== 'manual_pendente';

    // Gera as opções do Select
    var opts = '<option value="">— Selecionar produto —</option>' +
      nomes.map(function(n) {
        var sel = item.nomeProduto === n ? ' selected' : '';
        return '<option value="' + escStr(n) + '"' + sel + '>' + n + '</option>';
      }).join('');

    return `
      <div class="mapper-row" id="row-${idx}" style="border-bottom: 1px solid var(--border); padding: 12px 0;">
        <div class="mapper-nfe" style="margin-bottom:8px">
          <small style="color:var(--text-2)">${item.codigoNFe || ''}</small><br>
          <strong style="font-size:14px">${item.nomeNFe}</strong>
          <div style="font-size:11px; color:var(--text-2)">
            Qtd: ${item.quantidade} ${item.unidade} · ${fmt(item.valorUnit)}/un
          </div>
        </div>

        <div style="display:flex; gap:8px; align-items:center">
          <select id="map-${idx}"
            style="flex:1; padding:6px; border-radius:var(--r-sm); border:1px solid var(--border); font-size:13px"
            onchange="nfeOnChange(${idx}, this.value)">
            ${opts}
          </select>

          <button id="btn-novo-${idx}"
            class="btn-sm"
            style="background:var(--panel-3); border:1px solid var(--border); white-space:nowrap; padding: 4px 8px; cursor:pointer"
            onclick="nfeCriarNovo(${idx})"
            title="Cadastrar como novo produto">
            ✨ Novo
          </button>
        </div>

        <div id="map-status-${idx}" style="margin-top:6px; font-size:11px">
          ${isAuto
            ? '<span class="mapper-status-ok" style="color:var(--jade)">✓ Vinculado</span>'
            : '<span class="mapper-status-pending" style="color:var(--amber)">⚠ Vínculo manual necessário</span>'}
        </div>
      </div>`;
  }).join('');

  var html = `
    <p style="font-family:var(--font-brand);font-size:15px;font-weight:700;margin-bottom:4px">Importar NF-e</p>
    <p style="font-size:13px;color:var(--text-2);margin-bottom:16px">${cab.fornecedor || 'Fornecedor não identificado'} · ${cab.emissao || ''}</p>

    <div style="background:var(--panel-2);border-radius:var(--r-md);padding:12px;margin-bottom:16px;display:flex;gap:16px">
      <div style="flex:1;text-align:center">
        <div style="font-family:var(--font-brand);font-size:20px;font-weight:700;color:var(--jade)">${auto}</div>
        <div style="font-size:11px;color:var(--text-2)">Auto</div>
      </div>
      <div style="flex:1;text-align:center">
        <div style="font-family:var(--font-brand);font-size:20px;font-weight:700;color:var(--amber)">${pending}</div>
        <div style="font-size:11px;color:var(--text-2)">Pendentes</div>
      </div>
      <div style="flex:1;text-align:center">
        <div style="font-family:var(--font-brand);font-size:20px;font-weight:700">${itens.length}</div>
        <div style="font-size:11px;color:var(--text-2)">Total</div>
      </div>
    </div>

    <div style="max-height:350px; overflow-y:auto; margin-bottom:16px; padding-right:8px; border-top:1px solid var(--border)">
      ${rows}
    </div>

    <button class="btn btn-primary" style="width:100%; margin-bottom:8px" onclick="nfeConfirmar()">✓ Confirmar e Dar Entrada</button>
    <button class="btn btn-ghost" style="width:100%" onclick="closeModal()">Cancelar</button>
  `;

  showModal(html);
}

/**
 * Cria o produto na planilha e já vincula na tela
 */
function nfeCriarNovo(idx) {
  var btn = document.getElementById('btn-novo-' + idx);

  // Trava de agonia (Idempotência no Client-side)
  if (btn.getAttribute('data-loading') === 'true') return;

  btn.setAttribute('data-loading', 'true');
  btn.innerHTML = '⌛...';
  btn.style.opacity = '0.5';

  var item = state.nfeItens[idx];
  var fornecedor = state.nfeCab.fornecedor || "Importação XML";

  showToast('Cadastrando ' + item.nomeNFe + '...');

  api('cadastrarProdutoViaXML', {
    nome: item.nomeNFe,
    valorUnit: item.valorUnit,
    fornecedor: fornecedor,
    fatorConv: item.fatorConv || 1
  })
    .then(function(res) {
      btn.setAttribute('data-loading', 'false');

      // Atualiza o estado local
      state.produtos.push({ nome: item.nomeNFe, precoVenda: item.valorUnit * 2 });

      var select = document.getElementById('map-' + idx);
      var option = document.createElement("option");
      option.text = item.nomeNFe;
      option.value = item.nomeNFe;
      option.selected = true;
      select.add(option);

      nfeOnChange(idx, item.nomeNFe);
      showToast('Produto cadastrado: ' + res.codigo);
    })
    .catch(function(e) {
      btn.setAttribute('data-loading', 'false');
      btn.innerHTML = '✨ Novo';
      btn.style.opacity = '1';
      showToast('Erro ao criar produto: ' + e.message, true);
    });
}

/**
 * Gerencia a troca de seleção e visibilidade do botão "Novo"
 */
function nfeOnChange(idx, nomeProduto) {
  state.nfeItens[idx].nomeProduto = nomeProduto;
  var statusEl = document.getElementById('map-status-' + idx);
  var btnNovo = document.getElementById('btn-novo-' + idx);

  if (nomeProduto) {
    statusEl.innerHTML = '<span class="mapper-status-ok" style="color:var(--jade)">✓ Vinculado</span>';
    if(btnNovo) btnNovo.style.display = 'none';
  } else {
    statusEl.innerHTML = '<span class="mapper-status-pending" style="color:var(--amber)">⚠ Sem vínculo</span>';
    if(btnNovo) btnNovo.style.display = 'block';
  }
}

/**
 * Finaliza o processo: salva os vínculos e faz o lançamento no estoque
 */
function nfeConfirmar() {
  var cab   = state.nfeCab;
  var itens = state.nfeItens;

  // Validação: não deixa passar sem vincular tudo
  var semVinculo = itens.filter(function(i) { return !i.nomeProduto; });
  if (semVinculo.length > 0) {
    showToast('Vincule todos os itens (ou use o botão Novo) antes de confirmar.', true);
    return;
  }

  showToast('Salvando vínculos e processando estoque...');

  // Prepara o array de mapeamentos para o "cérebro" do sistema (Aba MAPEAMENTOS)
  var mapeamentos = itens.map(function(i) {
    return { nomeNFe: i.nomeNFe, nomeProduto: i.nomeProduto };
  });

  // Salva os vínculos, depois confirma a entrada (encadeado via Promise)
  api('salvarMapeamentos', { mapeamentos: mapeamentos })
    .then(function() {
      return api('confirmarEntradaNFe', { cabecalho: cab, itens: itens });
    })
    .then(function(res) {
      closeModal();
      if (typeof loadProdutos === 'function') loadProdutos();

      var msg = 'NF-e importada com sucesso!';
      if (res.erros && res.erros.length > 0) {
        msg = 'Importado com ' + res.erros.length + ' avisos.';
      }
      showToast(msg);

      if (typeof navigate === 'function') navigate('estoque');
    })
    .catch(function(e) {
      showToast('Erro: ' + e.message, true);
    });
}