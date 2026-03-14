// ============================================================
//  Estoque.gs — Entradas manuais e importação de NF-e XML
// ============================================================

function registrarEntrada(e) {
  if (!e.produto || !e.quantidade || !e.valorUnit)
    return { ok: false, erro: 'Dados incompletos' };

  var ss = getUserSpreadsheet();
  var s = ss.getSheetByName('ENTRADAS');
  var dt = hoje();

  if (_entradaJaRegistrada(s, dt, e.produto, e.quantidade))
    return { ok: true, duplicata: true };

  s.appendRow([dt, e.produto, e.quantidade, e.valorUnit, e.quantidade * e.valorUnit]);
  atualizarEstoque(ss, e.produto, e.quantidade);
  return { ok: true };
}

// BUG CORRIGIDO: o break anterior assumia que a planilha estava
// ordenada por data de forma descendente (última linha = mais recente).
// Qualquer linha fora de ordem interrompia a varredura cedo demais,
// deixando duplicatas passarem.
// Nova lógica: varre as últimas SCAN_WINDOW linhas sem depender de ordem.
function _entradaJaRegistrada(sheet, dt, produto, quantidade) {
  var data = sheet.getDataRange().getValues();
  var SCAN_WINDOW = 100; // verifica as últimas 100 entradas
  var inicio = Math.max(2, data.length - SCAN_WINDOW);

  for (var i = data.length - 1; i >= inicio; i--) {
    var r = data[i];
    if (!r[0]) continue;
    if (formatDate(r[0]) !== dt) continue; // pula outras datas, mas NÃO para
    if (_normStrLocal(r[1]) === _normStrLocal(produto) &&
      parseFloat(r[2]) === parseFloat(quantidade)) {
      return true;
    }
  }
  return false;
}

// Helper local para normalização (espelho de _normStr em Produtos.gs)
function _normStrLocal(s) {
  return String(s || '').toLowerCase().trim().replace(/\s+/g, ' ');
}

// ── NF-e XML ──────────────────────────────────────────────────

function parseNFe(xmlString) {
  Logger.log('=== INÍCIO PARSE NFe ===');
  Logger.log('Tamanho do XML: ' + xmlString.length + ' caracteres');

  try {
    var doc = XmlService.parse(xmlString);
    var root = doc.getRootElement();
    var ns = XmlService.getNamespace('http://www.portalfiscal.inf.br/nfe');

    var infNFe = _findElement(root, 'infNFe', ns);
    var ide = _findElement(infNFe, 'ide', ns);
    var emit = _findElement(infNFe, 'emit', ns);
    var detNodes = infNFe.getChildren('det', ns);

    Logger.log('Total de itens (det): ' + detNodes.length);

    var cabecalho = {
      numero: _getText(ide, 'nNF', ns),
      serie: _getText(ide, 'serie', ns),
      emissao: _getText(ide, 'dhEmi', ns).substring(0, 10),
      fornecedor: _getText(emit, 'xNome', ns),
      cnpj: _getText(emit, 'CNPJ', ns),
    };

    Logger.log('Cabecalho extraído: ' + JSON.stringify(cabecalho));

    var itens = detNodes.map(function (det, idx) {
      var prod = det.getChild('prod', ns);

      // Parsing robusto com fallbacks e validação
      var qComStr = _getText(prod, 'qCom', ns).replace(',', '.');
      var qTribStr = _getText(prod, 'qTrib', ns).replace(',', '.');
      var vProdStr = _getText(prod, 'vProd', ns).replace(',', '.');
      var vUnComStr = _getText(prod, 'vUnCom', ns).replace(',', '.');

      Logger.log('--- ITEM ' + (idx + 1) + ' ---');
      Logger.log('cProd: ' + _getText(prod, 'cProd', ns));
      Logger.log('xProd: ' + _getText(prod, 'xProd', ns));
      Logger.log('qCom (bruto): "' + qComStr + '"');
      Logger.log('qTrib (bruto): "' + qTribStr + '"');
      Logger.log('vProd (bruto): "' + vProdStr + '"');
      Logger.log('vUnCom (bruto): "' + vUnComStr + '"');

      var qCom = parseFloat(qComStr) || 1;
      var qTrib = parseFloat(qTribStr) || qCom; // fallback se qTrib inválido
      var vTotal = parseFloat(vProdStr) || 0;
      var vUnCom = parseFloat(vUnComStr) || 0;

      // Fator de conversão com validação
      var fatorReal = (qCom > 0 && qTrib > 0) ? qTrib / qCom : 1;

      // Valor unitário: prioriza vUnCom, senão calcula
      var valorUnit = vUnCom > 0 ? vUnCom : ((qCom > 0 && vTotal > 0) ? vTotal / qCom : 0);

      // Logging do Apps Script para debug
      Logger.log('XML Item - ' + _getText(prod, 'xProd', ns) +
        ': qCom=' + qCom + ', qTrib=' + qTrib +
        ', vTotal=' + vTotal + ', vUnCom=' + vUnCom +
        ', fator=' + fatorReal + ', valorUnit=' + valorUnit);

      return {
        codigoNFe: _getText(prod, 'cProd', ns),
        nomeNFe: _getText(prod, 'xProd', ns),
        unidade: _getText(prod, 'uCom', ns),
        quantidade: qCom,
        fatorConv: fatorReal,
        valorTotal: vTotal,
        valorUnit: valorUnit
      };
    });

    Logger.log('Total de itens processados: ' + itens.length);
    Logger.log('Itens finais: ' + JSON.stringify(itens));

    return { ok: true, cabecalho: cabecalho, itens: itens };
  } catch (e) {
    Logger.log('ERRO NO PARSE XML: ' + e.message);
    Logger.log('Stack: ' + e.stack);
    return { ok: false, erro: 'XML inválido: ' + e.message };
  }
}

function _salvarFornecedorNFe(ss, cab) {
  var s = ss.getSheetByName('FORNECEDORES');
  var data = s.getDataRange().getValues();
  var cnpjNovo = String(cab.cnpj || '').replace(/\D/g, '');
  for (var i = 2; i < data.length; i++) {
    if (String(data[i][6] || '').replace(/\D/g, '') === cnpjNovo) return;
  }
  s.appendRow([cab.fornecedor, '', '', '', 'Não', 'Importado via NF-e ' + cab.numero, cab.cnpj]);
}

function _findElement(parent, tag, ns) {
  if (!parent) return null;
  var el = parent.getChild(tag, ns);
  if (el) return el;
  var children = parent.getChildren();
  for (var i = 0; i < children.length; i++) {
    var found = _findElement(children[i], tag, ns);
    if (found) return found;
  }
  return null;
}

function _getText(parent, tag, ns) {
  if (!parent) return '';
  var el = parent.getChild(tag, ns);
  return el ? el.getText() : '';
}
