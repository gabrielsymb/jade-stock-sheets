// ============================================================
//  Fornecedores.gs — CRUD de fornecedores
// ============================================================

function getFornecedores() {
  try {
    var ss   = getUserSpreadsheet();
    var s    = ss.getSheetByName('FORNECEDORES');
    if (!s) return [];
    var data = s.getDataRange().getValues();
    var result = [];
    // Linha 1 = título, Linha 2 = cabeçalho, dados a partir da linha 3
    for (var i = 2; i < data.length; i++) {
      if (!data[i][0]) continue;
      result.push({
        nome:      String(data[i][0] || ''),
        produto:   String(data[i][1] || ''),
        preco:     parseFloat(data[i][2]) || 0,
        prazo:     String(data[i][3] || ''),
        problemas: String(data[i][4] || 'Não'),
        obs:       String(data[i][5] || ''),
        cnpj:      String(data[i][6] || ''),
        linha:     i + 1
      });
    }
    return result;
  } catch(e) {
    Logger.log('getFornecedores error: ' + e.message);
    return [];
  }
}

function salvarFornecedor(f) {
  try {
    var ss = getUserSpreadsheet();
    var s  = ss.getSheetByName('FORNECEDORES');
    if (!s) return { ok: false, erro: 'Aba não encontrada' };
    if (!f.nome) return { ok: false, erro: 'Nome obrigatório' };

    var linha = [
      f.nome, f.produto || '', parseFloat(f.preco) || 0,
      f.prazo || '', f.problemas || 'Não', f.obs || '', f.cnpj || ''
    ];

    if (f.linha) {
      // Atualiza linha existente
      s.getRange(f.linha, 1, 1, 7).setValues([linha]);
    } else {
      // Novo fornecedor
      s.appendRow(linha);
    }
    return { ok: true };
  } catch(e) {
    return { ok: false, erro: e.message };
  }
}

function deletarFornecedor(linha) {
  try {
    var ss = getUserSpreadsheet();
    var s  = ss.getSheetByName('FORNECEDORES');
    if (!s) return { ok: false, erro: 'Aba não encontrada' };
    s.deleteRow(linha);
    return { ok: true };
  } catch(e) {
    return { ok: false, erro: e.message };
  }
}