// ============================================================
//  Relatorios.gs — Geração de dados para relatório gerencial
//
//  getRelatorio(dataInicio, dataFim) agrega:
//    1. Vendas brutas no período (aba SAÍDAS)
//    2. Resumo por produto: qtd vendida, receita, custo, margem
//    3. Snapshot do estoque atual (aba PRODUTOS)
//    4. Totais consolidados: receita, custo total, margem líquida
//
//  O PDF em si é gerado no client-side via window.print().
//  O servidor só precisa retornar dados estruturados — rápido e simples.
// ============================================================

function getRelatorio(dataInicio, dataFim) {
  var ss = getUserSpreadsheet();

  // ── 1. Carrega vendas do período ──────────────────────────
  var sSaidas = ss.getSheetByName('SAÍDAS');
  var linhasVendas = sSaidas.getDataRange().getValues().slice(2); // pula título + cabeçalho

  // Converte os filtros de string "dd/MM/yyyy" para objetos Date para comparação
  var dtInicio = _parseDateBR(dataInicio);
  var dtFim    = _parseDateBR(dataFim);
  // Inclui o dia final completo (até 23:59:59)
  dtFim.setHours(23, 59, 59, 999);

  // Filtra linhas válidas dentro do período
  var vendasPeriodo = linhasVendas.filter(function(r) {
    if (!r[0] || !r[6]) return false;
    var dt = r[0] instanceof Date ? r[0] : _parseDateBR(formatDate(r[0]));
    return dt >= dtInicio && dt <= dtFim;
  });

  // ── 2. Agrega por produto ─────────────────────────────────
  // Chave: nome do produto → { qtd, receita }
  var porProduto = {};
  var totalReceita = 0;

  vendasPeriodo.forEach(function(r) {
    var nome   = String(r[3] || '');
    var qtd    = parseFloat(r[4]) || 0;
    var total  = parseFloat(r[6]) || 0;
    totalReceita += total;

    if (!porProduto[nome]) {
      porProduto[nome] = { nome: nome, qtdVendida: 0, receita: 0, custo: 0, margem: 0 };
    }
    porProduto[nome].qtdVendida += qtd;
    porProduto[nome].receita    += total;
  });

  // ── 3. Enriquece com custo unitário dos produtos ──────────
  // Faz a junção com a aba PRODUTOS pelo nome (case-insensitive)
  var produtos = getProdutos();
  var mapCusto = {};
  produtos.forEach(function(p) {
    mapCusto[_normStr(p.nome)] = p.custo || 0;
  });

  var totalCusto = 0;
  var resumoProdutos = Object.keys(porProduto).map(function(nome) {
    var item       = porProduto[nome];
    var custoUn    = mapCusto[_normStr(nome)] || 0;
    item.custo     = custoUn * item.qtdVendida;
    item.margem    = item.receita - item.custo;
    item.margemPct = item.receita > 0
      ? ((item.margem / item.receita) * 100).toFixed(1)
      : '0.0';
    totalCusto += item.custo;
    return item;
  });

  // Ordena por receita decrescente (mais vendidos primeiro)
  resumoProdutos.sort(function(a, b) { return b.receita - a.receita; });

  // ── 4. Snapshot do estoque atual ─────────────────────────
  var estoqueSnapshot = produtos.map(function(p) {
    return {
      nome:       p.nome,
      categoria:  p.categoria,
      estoque:    p.estoque,
      estoqueMin: p.estoqueMin,
      status:     p.status,
      preco:      p.preco
    };
  }).sort(function(a, b) { return a.nome.localeCompare(b.nome); });

  // ── 5. Totais consolidados ────────────────────────────────
  var margemLiquida   = totalReceita - totalCusto;
  var margemPctGlobal = totalReceita > 0
    ? ((margemLiquida / totalReceita) * 100).toFixed(1)
    : '0.0';

  return {
    periodo:        { inicio: dataInicio, fim: dataFim },
    geradoEm:       hoje() + ' às ' + agora(),
    totalVendas:    vendasPeriodo.length,
    totalReceita:   totalReceita,
    totalCusto:     totalCusto,
    margemLiquida:  margemLiquida,
    margemPct:      margemPctGlobal,
    resumoProdutos: resumoProdutos,
    estoque:        estoqueSnapshot
  };
}

// ── Helper: converte "dd/MM/yyyy" para Date ────────────────
function _parseDateBR(str) {
  if (!str) return new Date();
  // Aceita tanto "dd/MM/yyyy" quanto "yyyy-MM-dd" (input date HTML)
  if (str.indexOf('/') !== -1) {
    var partes = str.split('/');
    return new Date(parseInt(partes[2]), parseInt(partes[1]) - 1, parseInt(partes[0]));
  }
  var p = str.split('-');
  return new Date(parseInt(p[0]), parseInt(p[1]) - 1, parseInt(p[2]));
}