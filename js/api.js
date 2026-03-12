// ============================================================
//  api.js — Camada de comunicação com o backend
//  Substitui google.script.run em toda a aplicação
// ============================================================

var API_URL = 'https://jade-proxy.gabrielsebasty.workers.dev';

// Recupera o token Google salvo no sessionStorage
function _getToken() {
  var token = sessionStorage.getItem('jade_token');
  var exp   = parseInt(sessionStorage.getItem('jade_token_exp') || '0');
  if (!token || Date.now() > exp) return null;
  return token;
}

// Chamada central — substitui google.script.run
// Uso: api('getProdutos').then(fn).catch(fn)
//      api('addProduto', { produto: p }).then(fn)
function api(action, params) {
  var token = _getToken();
  var body  = { action: action, params: params || {} };
  if (token) body.token = token;

  return fetch(API_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'text/plain' },
    body:    JSON.stringify(body),
    redirect: 'follow'
  })
  .then(function(r) {
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.text();
  })
  .then(function(text) {
    var r = JSON.parse(text);
    if (!r.ok) throw new Error(r.erro || 'Erro desconhecido');
    return r.data;
  });
}
