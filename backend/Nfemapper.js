// ============================================================
//  NFeMapper.gs — O Coração da Importação (WMS)
// ============================================================

var SCORE_MINIMO = 0.55;

function mapearItensNFe(itensNFe) {
  var ss = getUserSpreadsheet();
  var produtos = getProdutos();
  var nomesP = produtos.map(function (p) { return p.nome; });
  var mapSalvo = _getMapeamentosSalvos(ss);

  return itensNFe.map(function (item) {
    var nomeNfe = item.nomeNFe;
    if (mapSalvo[nomeNfe]) {
      return _merge(item, mapSalvo[nomeNfe], 'auto_salvo');
    }
    var nomeNfeLimpo = normalizarNome(nomeNfe);
    var match = melhorMatch(nomeNfeLimpo, nomesP.map(normalizarNome));
    if (match.idx >= 0 && match.score >= SCORE_MINIMO) {
      return _merge(item, nomesP[match.idx], 'auto', match.score);
    }
    return _merge(item, null, 'manual_pendente', 0);
  });
}

/**
 * FINALIZAÇÃO UNIFICADA: Grava na aba Entradas E atualiza Custos/Margem/Estoque no WMS.
 */
function confirmarEntradaNFe(cabecalho, itensVinculados) {
  Logger.log('=== INÍCIO CONFIRMAR ENTRADA NFe ===');
  Logger.log('Cabecalho: ' + JSON.stringify(cabecalho));
  Logger.log('Itens vinculados: ' + JSON.stringify(itensVinculados));
  Logger.log('*** VERSÃO CORRIGIDA - SEM DIVISÃO POR FATOR ***');

  var ss = getUserSpreadsheet();
  var abaProdutos = ss.getSheetByName('PRODUTOS');
  var abaEntradas = ss.getSheetByName('ENTRADAS');
  var dados = abaProdutos.getDataRange().getValues();
  var erros = [];
  var dt = hoje();

  Logger.log('Total de produtos na planilha: ' + (dados.length - 2));

  itensVinculados.forEach(function (item, idx) {
    Logger.log('--- Processando item ' + (idx + 1) + ' ---');
    Logger.log('Item: ' + JSON.stringify(item));

    if (!item.nomeProduto) {
      erros.push(item.nomeNFe + ' (sem vínculo)');
      Logger.log('ERRO: Item sem vínculo - ' + item.nomeNFe);
      return;
    }

    var nomeAlvo = _normStr(item.nomeProduto);
    Logger.log('Procurando produto: "' + nomeAlvo + '"');

    var achou = false;
    for (var i = 2; i < dados.length; i++) {
      var nomePlanilha = _normStr(dados[i][1]);
      Logger.log('Linha ' + i + ': "' + nomePlanilha + '" == "' + nomeAlvo + '" ? ' + (nomePlanilha === nomeAlvo));

      if (nomePlanilha === nomeAlvo) {
        achou = true;
        Logger.log('PRODUTO ENCONTRADO na linha ' + i);
        Logger.log('Dados da linha: ' + JSON.stringify(dados[i]));

        // Validação robusta para evitar #NUM! no Sheets
        var fator = _toNum(dados[i][10]) || 1;
        if (fator <= 0) fator = 1; // Garante fator positivo

        var qtdXML = _toNum(item.quantidade);
        var valorUnitXML = _toNum(item.valorUnit);

        Logger.log('Valores brutos - qtdXML: ' + item.quantidade + ' -> ' + qtdXML);
        Logger.log('Valores brutos - valorUnitXML: ' + item.valorUnit + ' -> ' + valorUnitXML);
        Logger.log('Fator da planilha: ' + dados[i][10] + ' -> ' + fator);

        // Se valores inválidos, usa zeros e registra erro
        if (qtdXML <= 0) {
          erros.push(item.nomeNFe + ' (quantidade inválida: ' + item.quantidade + ')');
          qtdXML = 0;
          Logger.log('ERRO: Quantidade inválida - zerando');
        }
        if (valorUnitXML <= 0) {
          erros.push(item.nomeNFe + ' (valor unitário inválido: ' + item.valorUnit + ')');
          valorUnitXML = 0;
          Logger.log('ERRO: Valor unitário inválido - zerando');
        }

        var qtdEntradaFisica = qtdXML * fator;
        // CORREÇÃO: valorUnitXML já é por unidade física, não divide pelo fator
        var novoCustoUn = valorUnitXML;

        Logger.log('Processando item: ' + item.nomeProduto +
          ' | qtdXML=' + qtdXML +
          ' | valorUnitXML=' + valorUnitXML +
          ' | fator=' + fator +
          ' | qtdEntradaFisica=' + qtdEntradaFisica +
          ' | novoCustoUn=' + novoCustoUn + ' (SEM DIVISÃO)');

        // 1. Grava no Histórico de ENTRADAS (Permite atualização no mesmo dia)
        // REMOVE duplicação apenas se for exatamente a mesma entrada
        if (!_entradaExatamenteIgual(abaEntradas, dt, item.nomeProduto, qtdEntradaFisica, novoCustoUn)) {
          Logger.log('GRAVANDO ENTRADA: ' + [dt, item.nomeProduto, qtdEntradaFisica, novoCustoUn, qtdEntradaFisica * novoCustoUn]);
          abaEntradas.appendRow([dt, item.nomeProduto, qtdEntradaFisica, novoCustoUn, qtdEntradaFisica * novoCustoUn]);

          // 2. Atualiza a aba PRODUTOS
          var estoqueAtual = _toNum(dados[i][7]);
          Logger.log('Estoque atual: ' + dados[i][7] + ' -> ' + estoqueAtual);

          var novoEstoque = estoqueAtual + qtdEntradaFisica;
          Logger.log('Novo estoque: ' + estoqueAtual + ' + ' + qtdEntradaFisica + ' = ' + novoEstoque);

          abaProdutos.getRange(i + 1, 8).setValue(novoEstoque); // Estoque

          if (novoCustoUn > 0) {
            Logger.log('Atualizando custo: ' + novoCustoUn);
            abaProdutos.getRange(i + 1, 5).setValue(novoCustoUn); // Custo Unitário

            var precoVenda = _toNum(dados[i][5]);
            Logger.log('Preço venda atual: ' + dados[i][5] + ' -> ' + precoVenda);

            // CORREÇÃO: Não define preço automaticamente - só calcula margem se usuário já definiu
            if (precoVenda > 0) {
              var novaMargem = precoVenda - novoCustoUn;
              Logger.log('Atualizando margem: ' + precoVenda + ' - ' + novoCustoUn + ' = ' + novaMargem);
              abaProdutos.getRange(i + 1, 7).setValue(novaMargem); // Recalcula Margem
            } else {
              Logger.log('Preço de venda não definido pelo usuário, não calculando margem');
              // Deixa a margem em branco para usuário definir depois
              abaProdutos.getRange(i + 1, 7).setValue('');
            }
          } else {
            Logger.log('Custo zerado, não atualizando');
          }
        } else {
          Logger.log('ENTRADA DUPLICADA - ignorando');
        }
        break;
      }
    }
    if (!achou) {
      erros.push("Produto não localizado: " + item.nomeProduto);
      Logger.log('ERRO: Produto não encontrado - ' + item.nomeProduto);
    }
  });

  // Salva fornecedor se vier na nota
  if (cabecalho && cabecalho.fornecedor) {
    _salvarFornecedorNFe(ss, cabecalho);
  }

  return { ok: true, erros: erros };
}

function cadastrarProdutoViaXML(nome, valorUnit, fornecedor, fator) {
  Logger.log('=== CADASTRAR PRODUTO VIA XML ===');
  Logger.log('Nome: ' + nome);
  Logger.log('Valor Unit: ' + valorUnit);
  Logger.log('Fornecedor: ' + fornecedor);
  Logger.log('Fator: ' + fator);

  var ss = getUserSpreadsheet();
  var aba = ss.getSheetByName('PRODUTOS');
  var data = aba.getDataRange().getValues();

  // Checa se já existe produto com esse nome (evita duplicata)
  for (var i = 2; i < data.length; i++) {
    if (String(data[i][1]).trim() === String(nome).trim()) {
      Logger.log('PRODUTO JÁ EXISTE: ' + nome + ' (linha ' + i + ')');
      return { ok: true, codigo: data[i][0], jaExistia: true };
    }
  }

  var fatorFinal = parseFloat(fator) || 1;
  var custoUnidadeFisica = parseFloat(valorUnit) || 0; // já é custo por unidade física
  var precoVendaSugerido = custoUnidadeFisica * 2;

  Logger.log('Fator final: ' + fatorFinal);
  Logger.log('Custo unidade física: ' + custoUnidadeFisica);
  Logger.log('Preço venda sugerido: ' + precoVendaSugerido);

  // Usa getProximoCodigo() que faz Math.max — nunca duplica
  var novoCodigo = getProximoCodigo();
  Logger.log('Novo código: ' + novoCodigo);

  var novaLinha = [
    novoCodigo, nome, 'Categoria Pendente', fornecedor,
    custoUnidadeFisica, precoVendaSugerido, (precoVendaSugerido - custoUnidadeFisica),
    0, 5, 'OK', fatorFinal
  ];

  Logger.log('Nova linha a ser inserida: ' + JSON.stringify(novaLinha));

  aba.appendRow(novaLinha);
  salvarMapeamentos([{ nomeNFe: nome, nomeProduto: nome }]);

  Logger.log('PRODUTO CADASTRADO COM SUCESSO');
  return { ok: true, codigo: novoCodigo };
}

function salvarMapeamentos(mapeamentos) {
  var ss = getUserSpreadsheet();
  var s = _getOrCreateMapeamentosTab(ss);
  var data = s.getDataRange().getValues();

  mapeamentos.forEach(function (m) {
    if (!m.nomeNFe || !m.nomeProduto) return;
    var atualizado = false;
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === m.nomeNFe) {
        s.getRange(i + 1, 2).setValue(m.nomeProduto);
        s.getRange(i + 1, 3).setValue(hoje());
        atualizado = true;
        break;
      }
    }
    if (!atualizado) s.appendRow([m.nomeNFe, m.nomeProduto, hoje()]);
  });
  return { ok: true };
}

function _getMapeamentosSalvos(ss) {
  var s = ss.getSheetByName('MAPEAMENTOS');
  if (!s) return {};
  var data = s.getDataRange().getValues();
  var map = {};
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] && data[i][1]) map[data[i][0]] = data[i][1];
  }
  return map;
}

function _getOrCreateMapeamentosTab(ss) {
  var s = ss.getSheetByName('MAPEAMENTOS');
  if (s) return s;
  s = ss.insertSheet('MAPEAMENTOS');
  s.getRange(1, 1, 1, 3).setValues([['Nome NF-e', 'Produto Vinculado', 'Atualizado em']]).setFontWeight('bold');
  return s;
}

function _entradaExatamenteIgual(sheet, dt, produto, quantidade, valorUnit) {
  var data = sheet.getDataRange().getValues();
  var SCAN_WINDOW = 50; // verifica as últimas 50 entradas
  var inicio = Math.max(2, data.length - SCAN_WINDOW);

  for (var i = data.length - 1; i >= inicio; i--) {
    var r = data[i];
    if (!r[0]) continue;
    if (formatDate(r[0]) !== dt) continue;
    if (_normStr(r[1]) === _normStr(produto) &&
      Math.abs(parseFloat(r[2]) - parseFloat(quantidade)) < 0.001 &&
      Math.abs(parseFloat(r[3]) - parseFloat(valorUnit)) < 0.001) {
      return true; // Entrada exatamente igual já existe
    }
  }
  return false;
}

function _normStr(s) {
  return String(s || '').toLowerCase().trim().replace(/\s+/g, ' ');
}

function _toNum(v) {
  var n = parseFloat(String(v).replace(',', '.'));
  return isNaN(n) ? 0 : n;
}

function _merge(item, nomeProduto, status, score) {
  return {
    codigoNFe: item.codigoNFe,
    nomeNFe: item.nomeNFe,
    unidade: item.unidade,
    quantidade: item.quantidade,
    fatorConv: item.fatorConv || 1,
    valorUnit: item.valorUnit,
    valorTotal: item.valorTotal,
    nomeProduto: nomeProduto,
    status: status,
    scoreMatch: score || 0
  };
}
