// ============================================================
//  Produtos.gs — CRUD de produtos
//
//  SCHEMA v2: coluna L (índice 11) = ean
//
//  Estratégia de migração:
//  Em vez de exigir intervenção manual, _garantirSchemaV2() verifica
//  se o cabeçalho da aba PRODUTOS já tem a coluna EAN.
//  Se não tiver, adiciona automaticamente antes de qualquer leitura
//  ou escrita. Isso garante que:
//    - Usuários existentes são migrados silenciosamente na 1a chamada
//    - O template atualizado garante que novos usuários já nascem corretos
//    - O código nunca quebra independente da versão da planilha do usuário
// ============================================================

function getProdutos() {
  try {
    var ss = getUserSpreadsheet();
    var s = ss.getSheetByName('PRODUTOS');
    if (!s) return [];

    // Garante schema antes de ler — idempotente, ms se já ok
    _garantirSchemaV2(s);

    var data = s.getDataRange().getValues();
    var result = [];
    for (var i = 2; i < data.length; i++) {
      var r = data[i];
      if (!r[0] && !r[1]) continue;
      result.push({
        codigo: String(r[0] || ''),
        nome: String(r[1] || ''),
        categoria: String(r[2] || ''),
        fornecedor: String(r[3] || ''),
        custo: _toNum(r[4]),
        preco: _toNum(r[5]),
        margem: _toNum(r[6]),
        estoque: _toInt(r[7]),
        estoqueMin: _toInt(r[8]),
        status: String(r[9] || 'OK'),
        fator: _toNum(r[10]) || 1,
        ean: String(r[11] || '').trim()  // coluna L — vazio se não preenchido
      });
    }
    return result;
  } catch (e) {
    Logger.log('getProdutos error: ' + e.message);
    return [];
  }
}

// ── Auto-migração defensiva ────────────────────────────────
// Verifica se o cabeçalho da aba PRODUTOS já tem a coluna EAN (L2).
// Se não tiver, adiciona silenciosamente.
// A função é IDEMPOTENTE — pode ser chamada N vezes sem efeito colateral.
function _garantirSchemaV2(sheet) {
  // Linha 2 é o cabeçalho — linha 1 é o título decorativo com emoji
  var cabecalho = sheet.getRange(2, 1, 1, sheet.getMaxColumns()).getValues()[0];
  var totalColunas = cabecalho.filter(function (c) { return c !== ''; }).length;

  // Se já tem 12+ colunas, o schema está atualizado — sai sem fazer nada
  if (totalColunas >= 12) return;

  // Coluna 12 = L — adiciona o cabeçalho EAN silenciosamente
  Logger.log('Migrando schema PRODUTOS para v2: adicionando coluna EAN (L2)');
  sheet.getRange(2, 12).setValue('ean');
}

// ── Busca por EAN — fallback do scanner de código de barras ──
// O client-side já faz a busca local em state.produtos (sem chamada ao servidor).
// Esta função serve como fallback quando o produto não está em cache ainda.
function getProdutoPorEAN(ean) {
  if (!ean) return null;
  var produtos = getProdutos(); // _garantirSchemaV2 é chamado aqui
  var eanBusca = _normEAN(ean);
  for (var i = 0; i < produtos.length; i++) {
    if (produtos[i].ean && _normEAN(produtos[i].ean) === eanBusca) {
      return produtos[i];
    }
  }
  return null;
}

// ── CRUD ───────────────────────────────────────────────────

function addProduto(p) {
  try {
    var ss = getUserSpreadsheet();
    var s = ss.getSheetByName('PRODUTOS');

    // Garante schema antes de escrever também
    _garantirSchemaV2(s);

    var data = s.getDataRange().getValues();
    var existe = false;
    for (var i = 2; i < data.length; i++) {
      if (String(data[i][0]).trim() === String(p.codigo).trim()) { existe = true; break; }
    }
    if (existe) return { ok: false, erro: 'Código já cadastrado' };

    var margem = _toNum(p.preco) - _toNum(p.custo);
    var status = _toInt(p.estoque) <= _toInt(p.estoqueMin) ? 'REPOR' : 'OK';
    s.appendRow([
      String(p.codigo), String(p.nome), String(p.categoria), String(p.fornecedor),
      _toNum(p.custo), _toNum(p.preco), margem,
      _toInt(p.estoque), _toInt(p.estoqueMin), status,
      1,                   // fator_conv — coluna K (índice 10)
      String(p.ean || '')  // ean        — coluna L (índice 11)
    ]);
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: e.message };
  }
}

// ── NOVO: Edição de produtos ──────────────────────────────
/**
 * Edita um produto existente.
 *
 * Campos editáveis:
 * - nome (pode mudar o nome do produto)
 * - ean (adicionar/editar código de barras)
 * - custo (atualiza custo unitário)
 * - preco (atualiza preço de venda)
 * - estoqueMin (atualiza alerta de estoque mínimo)
 *
 * Campos NÃO editáveis:
 * - estoque (usar Entrada Manual para rastreabilidade)
 * - codigo (imutável)
 * - categoria, fornecedor (adicionar depois se necessário)
 *
 * @param {Object} p - Produto com campos atualizados
 * @param {string} p.nomeOriginal - Nome do produto antes da edição (para encontrar a linha)
 * @param {string} p.nome - Novo nome (pode ser igual ao original)
 * @param {string} p.ean - Código de barras EAN
 * @param {number} p.custo - Custo unitário
 * @param {number} p.preco - Preço de venda
 * @param {number} p.estoqueMin - Estoque mínimo
 */
function editarProduto(p) {
  try {
    if (!p || !p.nomeOriginal) {
      return { ok: false, erro: 'Produto original não especificado' };
    }

    var ss = getUserSpreadsheet();
    var s = ss.getSheetByName('PRODUTOS');
    if (!s) return { ok: false, erro: 'Aba PRODUTOS não encontrada' };

    // Garante schema v2 antes de editar
    _garantirSchemaV2(s);

    var data = s.getDataRange().getValues();
    var nomeOriginalNorm = _normStr(p.nomeOriginal);
    var linhaEncontrada = -1;

    // Encontra a linha do produto pelo nome original (case-insensitive)
    for (var i = 2; i < data.length; i++) {
      if (_normStr(data[i][1]) === nomeOriginalNorm) {
        linhaEncontrada = i + 1; // Linha real na planilha (1-based)
        break;
      }
    }

    if (linhaEncontrada === -1) {
      return { ok: false, erro: 'Produto não encontrado: ' + p.nomeOriginal };
    }

    // Validações
    if (!p.nome || String(p.nome).trim() === '') {
      return { ok: false, erro: 'Nome do produto é obrigatório' };
    }
    if (!p.preco || _toNum(p.preco) <= 0) {
      return { ok: false, erro: 'Preço de venda deve ser maior que zero' };
    }

    // Calcula nova margem
    var novoCusto = _toNum(p.custo);
    var novoPreco = _toNum(p.preco);
    var novaMargem = novoPreco - novoCusto;

    // Lê estoque atual para recalcular status
    var estoqueAtual = _toInt(data[linhaEncontrada - 1][7]);
    var novoEstoqueMin = _toInt(p.estoqueMin);
    var novoStatus = estoqueAtual <= novoEstoqueMin ? 'REPOR' : 'OK';

    // Atualiza campos editáveis (BATCH UPDATE para performance)
    var updates = [
      [String(p.nome)],           // Coluna B (índice 1) - nome
      [String(p.ean || '')],      // Coluna L (índice 11) - ean
      [novoCusto],                // Coluna E (índice 4) - custo
      [novoPreco],                // Coluna F (índice 5) - preco
      [novaMargem],               // Coluna G (índice 6) - margem
      [novoEstoqueMin],           // Coluna I (índice 8) - estoqueMin
      [novoStatus]                // Coluna J (índice 9) - status
    ];

    // Aplica as atualizações
    s.getRange(linhaEncontrada, 2).setValue(updates[0][0]);   // nome
    s.getRange(linhaEncontrada, 12).setValue(updates[1][0]);  // ean
    s.getRange(linhaEncontrada, 5).setValue(updates[2][0]);   // custo
    s.getRange(linhaEncontrada, 6).setValue(updates[3][0]);   // preco
    s.getRange(linhaEncontrada, 7).setValue(updates[4][0]);   // margem
    s.getRange(linhaEncontrada, 9).setValue(updates[5][0]);   // estoqueMin
    s.getRange(linhaEncontrada, 10).setValue(updates[6][0]);  // status

    return { ok: true, produto: p.nome };

  } catch (e) {
    Logger.log('editarProduto error: ' + e.message);
    return { ok: false, erro: e.message };
  }
}

function getProximoCodigo() {
  try {
    var produtos = getProdutos();
    if (!produtos.length) return 'P001';
    var nums = produtos.map(function (p) {
      return parseInt(String(p.codigo).replace(/\D/g, '')) || 0;
    });
    var next = Math.max.apply(null, nums) + 1;
    return 'P' + String(next).padStart(3, '0');
  } catch (e) { return 'P001'; }
}

// Comparação case-insensitive + trim + proteção contra estoque negativo
function atualizarEstoque(ss, nomeProduto, delta) {
  try {
    var s = ss.getSheetByName('PRODUTOS');
    var data = s.getDataRange().getValues();
    var nomeAlvo = _normStr(nomeProduto);

    for (var i = 2; i < data.length; i++) {
      if (_normStr(data[i][1]) === nomeAlvo) {
        var estoqueAtual = _toInt(data[i][7]);
        var estoqueMin = _toInt(data[i][8]);
        var novo = estoqueAtual + delta;

        // Validação de estoque negativo com logging
        if (novo < 0) {
          Logger.log('ESTOQUE NEGATIVO BLOQUEADO: ' + nomeProduto + ' | Estoque: ' + estoqueAtual + ' | Tentativa: ' + delta);
          novo = 0; // Força zero para não permitir negativo

          // Retorna aviso específico sobre estoque insuficiente
          return {
            ok: false,
            erro: 'Estoque insuficiente para ' + nomeProduto + '. Disponível: ' + estoqueAtual + ', Solicitado: ' + Math.abs(delta),
            estoqueInsuficiente: true,
            estoqueAtual: estoqueAtual
          };
        }

        var status = novo <= estoqueMin ? 'REPOR' : 'OK';
        s.getRange(i + 1, 8).setValue(novo);
        s.getRange(i + 1, 10).setValue(status);

        Logger.log('ESTOQUE ATUALIZADO: ' + nomeProduto + ' | ' + estoqueAtual + ' → ' + novo + ' (Δ' + delta + ')');

        return { ok: true, novoEstoque: novo };
      }
    }
    return { ok: false, erro: 'Produto não encontrado: ' + nomeProduto };
  } catch (e) {
    Logger.log('ERRO EM atualizarEstoque: ' + e.message);
    return { ok: false, erro: e.message };
  }
}

// ── Migração em lote (utilitário administrativo) ───────────
// Roda pelo editor do Apps Script: Executar → migrarTodosUsuarios
// Percorre TODOS os usuários do registry e garante o schema v2
// em cada planilha. Útil quando a base de usuários crescer.
// SEGURO para rodar múltiplas vezes — _garantirSchemaV2 é idempotente.
function migrarTodosUsuarios() {
  var registry = SpreadsheetApp.openById(REGISTRY_SHEET_ID);
  var tab = registry.getSheetByName(REGISTRY_TAB);
  var dados = tab.getDataRange().getValues();
  var migrados = 0, erros = 0;

  for (var i = 1; i < dados.length; i++) {
    var email = dados[i][0];
    var sid = dados[i][1];
    if (!email || !sid) continue;

    try {
      var ss = SpreadsheetApp.openById(sid);
      var sheet = ss.getSheetByName('PRODUTOS');
      if (!sheet) {
        Logger.log('SKIP ' + email + ': aba PRODUTOS não encontrada');
        continue;
      }
      _garantirSchemaV2(sheet);
      migrados++;
      Logger.log('OK   ' + email);
    } catch (e) {
      erros++;
      Logger.log('ERRO ' + email + ': ' + e.message);
    }
  }

  Logger.log('─────────────────────────────────────');
  Logger.log('Migração concluída: ' + migrados + ' OK, ' + erros + ' com erro');
}

// ── Helpers internos ───────────────────────────────────────

function _toNum(v) {
  var n = parseFloat(String(v).replace(',', '.'));
  return isNaN(n) ? 0 : n;
}

function _toInt(v) {
  var n = parseInt(String(v));
  return isNaN(n) ? 0 : n;
}

function _normStr(s) {
  return String(s || '').toLowerCase().trim().replace(/\s+/g, ' ');
}

// EAN não remove zeros à esquerda — EAN-13 brasileiro começa com 789
function _normEAN(s) {
  return String(s || '').replace(/\s+/g, '').trim();
}
