// ============================================================
//  Dashboard.gs — Analytics e métricas operacionais
// ============================================================

function getDashboard() {
  var ss       = getUserSpreadsheet();
  var produtos = getProdutos();

  var sVendas = ss.getSheetByName('SAÍDAS');
  var vendas  = sVendas.getDataRange().getValues().slice(2)
                  .filter(function(r) { return r[0] && r[6]; });

  var hojeStr  = hoje();
  var mesAtual = hojeStr.substring(3);
  var totalHoje = 0, totalMes = 0;
  var tz = Session.getScriptTimeZone();

  vendas.forEach(function(r) {
    var dt    = formatDate(r[0]);
    var valor = parseFloat(r[6]) || 0;
    if (dt === hojeStr)               totalHoje += valor;
    if (dt.substring(3) === mesAtual) totalMes  += valor;
  });

  var sCustos   = ss.getSheetByName('CUSTOS');
  var custoTotal = parseFloat(sCustos.getRange('B22').getValue()) || 0;

  var margens     = produtos.map(function(p) { return p.margem || 0; });
  var margemMedia = margens.length
    ? margens.reduce(function(a,b){ return a+b; }, 0) / margens.length : 0;
  var metaMensal  = margemMedia > 0 ? Math.ceil(custoTotal / margemMedia) : 0;

  var fatProd = {};
  vendas.forEach(function(r) {
    var nome = r[3], val = parseFloat(r[6]) || 0;
    fatProd[nome] = (fatProd[nome] || 0) + val;
  });
  var top5 = Object.keys(fatProd)
    .map(function(k) { return { nome: k, fat: fatProd[k] }; })
    .sort(function(a,b) { return b.fat - a.fat; })
    .slice(0, 5);

  var porHora = {}, porDia = {};
  vendas.forEach(function(r) {
    var hr = r[1] instanceof Date
      ? Utilities.formatDate(r[1], tz, 'HH') + ':00'
      : String(r[1]).substring(0,2) + ':00';
    var dia   = String(r[2] || '');
    var valor = parseFloat(r[6]) || 0;
    porHora[hr]  = (porHora[hr]  || 0) + valor;
    porDia[dia]   = (porDia[dia]  || 0) + valor;
  });

  var criticos = produtos.filter(function(p) { return p.status === 'REPOR'; });

  return {
    totalHoje:     totalHoje,
    totalMes:      totalMes,
    custoTotal:    custoTotal,
    metaMensal:    metaMensal,
    margemMedia:   margemMedia,
    pctMeta:       custoTotal > 0 ? totalMes / custoTotal : 0,
    top5:          top5,
    porHora:       porHora,
    porDia:        porDia,
    criticos:      criticos,
    totalProdutos: produtos.length,
  };
}