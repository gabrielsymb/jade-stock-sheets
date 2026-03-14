// ============================================================
//  Code.gs — Entrypoint + Roteador API REST
// ============================================================

var _emailContexto = null;

function doGet() {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('Jade Stock')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doPost(e) {
  try {
    Logger.log('=== DOPOST RECEBIDO ===');
    var body = JSON.parse(e.postData.contents);
    var action = body.action;
    var params = body.params || {};
    var token = body.token || null;

    Logger.log('Action: ' + action);
    Logger.log('Params exist: ' + (params ? 'YES' : 'NO'));

    if (token) {
      _emailContexto = _validarToken(token);
    } else {
      _emailContexto = null;
    }

    var result = _rotear(action, params);
    return _resposta(JSON.stringify({ ok: true, data: result }));

  } catch (err) {
    Logger.log('ERRO DOPOST: ' + err.message);
    return _resposta(JSON.stringify({ ok: false, erro: err.message }));
  }
}

function _rotear(action, params) {
  Logger.log('=== ROTEADOR ===');
  Logger.log('Action: ' + action);
  Logger.log('Params: ' + JSON.stringify(params));

  switch (action) {
    case 'iniciarSessao':
      return _emailContexto
        ? _iniciarSessaoPorEmail(_emailContexto)
        : iniciarSessao();
    case 'getUsuarioAtual': return getUsuarioAtual();
    case 'getProdutos': return getProdutos();
    case 'addProduto': return addProduto(params.produto);
    case 'editarProduto': return editarProduto(params.produto); // ← NOVO!
    case 'getProximoCodigo': return getProximoCodigo();
    // Rota adicionada para busca por código de barras via scanner
    // O client já faz lookup local em state.produtos, mas esta rota
    // serve como fallback seguro quando o produto não está em cache.
    case 'getProdutoPorEAN': return getProdutoPorEAN(params.ean);
    case 'registrarVenda': return registrarVenda(params.itens);
    case 'registrarEntrada': return registrarEntrada(params.entrada);
    case 'parseNFe': return parseNFe(params.xmlString);
    case 'mapearItensNFe': return mapearItensNFe(params.itensNFe);
    case 'confirmarEntradaNFe':
      Logger.log('confirmarEntradaNFe - cabecalho: ' + JSON.stringify(params.cabecalho));
      Logger.log('confirmarEntradaNFe - itensVinculados: ' + JSON.stringify(params.itensVinculados));
      return confirmarEntradaNFe(params.cabecalho, params.itensVinculados);
    case 'salvarMapeamentos': return salvarMapeamentos(params.mapeamentos);
    case 'cadastrarProdutoViaXML':
      Logger.log('cadastrarProdutoViaXML - nome: ' + params.nome);
      Logger.log('cadastrarProdutoViaXML - valorUnit: ' + params.valorUnit);
      Logger.log('cadastrarProdutoViaXML - fornecedor: ' + params.fornecedor);
      Logger.log('cadastrarProdutoViaXML - fator: ' + params.fator);
      return cadastrarProdutoViaXML(params.nome, params.valorUnit, params.fornecedor, params.fator);
    case 'getRelatorio': return getRelatorio(params.dataInicio, params.dataFim);
    case 'getDashboard': return getDashboard();
    case 'getCustos': return getCustos();
    case 'salvarCusto': return salvarCusto(params.linha, params.valor);
    case 'getFornecedores': return getFornecedores();
    case 'salvarFornecedor': return salvarFornecedor(params.fornecedor);
    case 'deletarFornecedor': return deletarFornecedor(params.linha);
    default: throw new Error('Ação desconhecida: ' + action);
  }
}

function _resposta(jsonString) {
  return ContentService
    .createTextOutput(jsonString)
    .setMimeType(ContentService.MimeType.JSON);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function logout() {
  return { ok: true };
}

function diagnostico() {
  try {
    var ss = getUserSpreadsheet();
    Logger.log('Planilha: ' + ss.getName());
    var produtos = getProdutos();
    Logger.log('Produtos: ' + produtos.length);
    Logger.log('OK');
  } catch (e) {
    Logger.log('ERRO: ' + e.message);
  }
}

function testarDoPost() {
  var fakeEvent = {
    postData: { contents: JSON.stringify({ action: 'getProdutos', params: {} }) },
    parameter: {}
  };
  Logger.log(doPost(fakeEvent).getContent());
}
