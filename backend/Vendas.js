// ============================================================
//  Vendas.gs — PDV e registro de vendas
// ============================================================

function registrarVenda(itens) {
  if (!itens || !itens.length) return { ok: false, erro: 'Nenhum item' };

  var ss = getUserSpreadsheet();
  var s = ss.getSheetByName('SAÍDAS');
  var dt = hoje();
  var hr = agora();
  var dia = diaSemana();

  // Guarda janela de tempo: ignora duplicata somente nos últimos 60s
  var existente = _vendaJaRegistrada(s, dt, hr, itens);
  if (existente) return { ok: true, total: existente, duplicata: true };

  // Monta as linhas e persiste de uma vez (batch write)
  var rows = itens.map(function (item) {
    return [dt, hr, dia, item.nome, item.quantidade, item.valorUnit,
      item.quantidade * item.valorUnit];
  });
  s.getRange(s.getLastRow() + 1, 1, rows.length, 7).setValues(rows);

  // Atualiza estoque para cada item
  var erros = [];
  var avisosEstoque = [];
  itens.forEach(function (item) {
    var res = atualizarEstoque(ss, item.nome, -item.quantidade);
    if (!res.ok) {
      if (res.estoqueInsuficiente) {
        // Erro de estoque insuficiente - tratamento especial
        avisosEstoque.push(item.nome + ' (disponível: ' + res.estoqueAtual + ')');
      } else {
        // Outros erros (produto não encontrado, etc)
        erros.push(item.nome + ': ' + res.erro);
      }
    }
  });

  var total = rows.reduce(function (acc, r) { return acc + r[6]; }, 0);
  return {
    ok: true,
    total: total,
    errosEstoque: erros,
    avisosEstoque: avisosEstoque
  };
}

// BUG CORRIGIDO: o break anterior parava a varredura ao encontrar
// qualquer linha de data diferente, falhando silenciosamente quando
// havia linhas fora de ordem ou a planilha tinha linhas em branco.
// Nova lógica: varre as últimas SCAN_WINDOW linhas sem depender de ordem.
// A verificação de duplicata compara data + hora + primeiro item da venda.
function _vendaJaRegistrada(sheet, dt, hr, itens) {
  var data = sheet.getDataRange().getValues();
  var primeiroItem = itens[0];
  var SCAN_WINDOW = 200; // varredura das últimas 200 linhas
  var inicio = Math.max(2, data.length - SCAN_WINDOW);
  var tz = Session.getScriptTimeZone();

  for (var i = data.length - 1; i >= inicio; i--) {
    var r = data[i];
    if (!r[0]) continue;

    var rDt = formatDate(r[0]);
    if (rDt !== dt) continue; // pula outras datas, mas NÃO para

    var rHr = r[1] instanceof Date
      ? Utilities.formatDate(r[1], tz, 'HH:mm')
      : String(r[1]).substring(0, 5);

    if (rHr === hr &&
      String(r[3]).trim() === String(primeiroItem.nome).trim() &&
      parseFloat(r[4]) === parseFloat(primeiroItem.quantidade)) {
      return parseFloat(r[6]) || 0;
    }
  }
  return null;
}
