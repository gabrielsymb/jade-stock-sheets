// ============================================================
//  Utils.gs — Helpers compartilhados entre todos os módulos
// ============================================================

var TZ = Session.getScriptTimeZone();

function hoje() {
  return Utilities.formatDate(new Date(), TZ, 'dd/MM/yyyy');
}

function agora() {
  return Utilities.formatDate(new Date(), TZ, 'HH:mm');
}

function diaSemana() {
  var dias = ['domingo','segunda-feira','terça-feira','quarta-feira',
              'quinta-feira','sexta-feira','sábado'];
  return dias[new Date().getDay()];
}

function formatDate(dateObj) {
  if (!dateObj) return '';
  if (typeof dateObj === 'string') return dateObj;
  return Utilities.formatDate(dateObj, TZ, 'dd/MM/yyyy');
}

// Similaridade simples entre dois strings (0 a 1)
// Usado pelo NFeMapper para casamento automático
/**
 * Calcula a similaridade entre duas strings usando o coeficiente de Sørensen-Dice.
 * Muito mais preciso para nomes de produtos que variam a ordem das palavras.
 */
function similaridade(a, b) {
  a = normalizarNome(a);
  b = normalizarNome(b);
  
  if (a === b) return 1.0;
  if (a.length < 2 || b.length < 2) return 0.0;

  let bigramsA = new Map();
  for (let i = 0; i < a.length - 1; i++) {
    let bigram = a.substring(i, i + 2);
    bigramsA.set(bigram, (bigramsA.get(bigram) || 0) + 1);
  }

  let intersection = 0;
  for (let i = 0; i < b.length - 1; i++) {
    let bigram = b.substring(i, i + 2);
    if (bigramsA.has(bigram) && bigramsA.get(bigram) > 0) {
      intersection++;
      bigramsA.set(bigram, bigramsA.get(bigram) - 1);
    }
  }

  return (2.0 * intersection) / (a.length + b.length - 2);
}

// Retorna o índice da melhor correspondência num array de nomes
function melhorMatch(nomeNfe, nomeProdutos) {
  var melhor = -1, melhorScore = 0;
  nomeProdutos.forEach(function(nome, idx) {
    var score = similaridade(nomeNfe, nome);
    if (score > melhorScore) { melhorScore = score; melhor = idx; }
  });
  return { idx: melhor, score: melhorScore };
}
function normalizarNome(texto) {
  if (!texto) return '';
  return texto.toString()
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove acentos
    .replace(/[^a-z0-9\s]/g, '')                     // Remove símbolos
    .replace(/\s+/g, ' ')                            // Remove espaços duplos
    .trim();
}