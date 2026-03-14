// ============================================================
//  Custos.gs — Leitura e edição dos custos mensais
// ============================================================

function getCustos() {
  var ss = getUserSpreadsheet();
  var s  = ss.getSheetByName('CUSTOS');
  if (!s) return { fixos: [], variaveis: [], totalFixos: 0, totalVariaveis: 0, totalGeral: 0 };

  var data = s.getDataRange().getValues();

  // Fixos: linhas 4–10 da planilha → índices 3–9
  var fixos = [];
  for (var i = 3; i <= 9; i++) {
    if (!data[i] || !data[i][0]) continue;
    var desc = String(data[i][0]);
    if (desc.indexOf('TOTAL') !== -1 || desc.indexOf('📌') !== -1) continue;
    fixos.push({
      descricao: desc,
      valor:     parseFloat(data[i][1]) || 0,
      obs:       String(data[i][2] || ''),
      linha:     i + 1   // linha real na planilha (1-based)
    });
  }

  // Variáveis: linhas 15–19 → índices 14–18
  var variaveis = [];
  for (var j = 14; j <= 18; j++) {
    if (!data[j] || !data[j][0]) continue;
    var descV = String(data[j][0]);
    if (descV.indexOf('TOTAL') !== -1 || descV.indexOf('📌') !== -1) continue;
    variaveis.push({
      descricao: descV,
      valor:     parseFloat(data[j][1]) || 0,
      obs:       String(data[j][2] || ''),
      linha:     j + 1
    });
  }

  // Totais calculados pelas fórmulas da planilha
  var totalFixos    = parseFloat(s.getRange('B11').getValue()) || 0;
  var totalVariaveis = parseFloat(s.getRange('B20').getValue()) || 0;
  var totalGeral    = parseFloat(s.getRange('B22').getValue()) || 0;

  return {
    fixos:          fixos,
    variaveis:      variaveis,
    totalFixos:     totalFixos,
    totalVariaveis: totalVariaveis,
    totalGeral:     totalGeral
  };
}

// Salva o valor de uma linha específica (coluna B)
function salvarCusto(linha, valor) {
  try {
    var ss = getUserSpreadsheet();
    var s  = ss.getSheetByName('CUSTOS');
    if (!s) return { ok: false, erro: 'Aba CUSTOS não encontrada' };
    var v = parseFloat(String(valor).replace(',', '.'));
    if (isNaN(v) || v < 0) return { ok: false, erro: 'Valor inválido' };
    s.getRange(linha, 2).setValue(v);
    // Retorna os totais atualizados para o frontend atualizar na hora
    var totalFixos     = parseFloat(s.getRange('B11').getValue()) || 0;
    var totalVariaveis = parseFloat(s.getRange('B20').getValue()) || 0;
    var totalGeral     = parseFloat(s.getRange('B22').getValue()) || 0;
    return { ok: true, totalFixos: totalFixos, totalVariaveis: totalVariaveis, totalGeral: totalGeral };
  } catch(e) {
    return { ok: false, erro: e.message };
  }
}