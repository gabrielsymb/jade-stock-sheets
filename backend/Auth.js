// ============================================================
//  Auth.gs — Multi-tenancy + Validação de token externo
// ============================================================

var REGISTRY_SHEET_ID = '1hSiaYMJwvW7UxJSq0T99sX3lTKZ8C93XuKLnQ5uW06o';
var TEMPLATE_SHEET_ID = '1DdXt_M8GM28V4XzQ9A7cQNXsHWU1tXolJryiCh1dKAU';
var REGISTRY_TAB      = 'USUARIOS';
var GOOGLE_CLIENT_ID  = '103980240796-4fvdfiflfoh30aih7631pgk4ppoufrvp.apps.googleusercontent.com';

// ── Função principal — usada por TODOS os módulos ──────────
function getUserSpreadsheet() {
  var email = _getEmailAtual();
  return _getSpreadsheetByEmail(email);
}

// ── _getEmailAtual ─────────────────────────────────────────
function _getEmailAtual() {
  if (typeof _emailContexto !== 'undefined' && _emailContexto) {
    return _emailContexto;
  }
  var email = Session.getActiveUser().getEmail();
  if (!email) throw new Error('LOGIN_REQUIRED');
  return email;
}

// ── iniciarSessao — chamado pelo Apps Script iframe ────────
function iniciarSessao() {
  var email = Session.getActiveUser().getEmail();
  if (!email) throw new Error('LOGIN_REQUIRED');
  return _iniciarSessaoPorEmail(email);
}

// ── _iniciarSessaoPorEmail — chamado pelo roteador ─────────
function _iniciarSessaoPorEmail(email) {
  var registry = SpreadsheetApp.openById(REGISTRY_SHEET_ID);
  var tab      = _getOrCreateRegistryTab(registry);
  var data     = tab.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === email) {
      if (String(data[i][4] || 'ATIVA').toUpperCase() === 'BLOQUEADA')
        throw new Error('LICENCA_BLOQUEADA');
      return { ok: true, email: email, nome: data[i][2] || email.split('@')[0] };
    }
  }
  _provisionNewUser(email, tab);
  return { ok: true, email: email, nome: email.split('@')[0], novo: true };
}

// ── getUsuarioAtual ─────────────────────────────────────────
function getUsuarioAtual() {
  try {
    var email = _getEmailAtual();
    return { email: email, nome: email.split('@')[0] };
  } catch(e) { return { email: '', nome: '' }; }
}

// ── Validação de Google ID Token ───────────────────────────
function _validarToken(idToken) {
  if (!idToken) throw new Error('TOKEN_AUSENTE');
  var url  = 'https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken);
  var resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  var data = JSON.parse(resp.getContentText());
  if (data.error) throw new Error('TOKEN_INVALIDO: ' + (data.error_description || data.error));
  var email = data.email;
  if (!email) throw new Error('TOKEN_SEM_EMAIL');
  if (!data.email_verified || data.email_verified === 'false') throw new Error('EMAIL_NAO_VERIFICADO');
  return email;
}

// ── Helpers internos ───────────────────────────────────────
function _getSpreadsheetByEmail(email) {
  var registry = SpreadsheetApp.openById(REGISTRY_SHEET_ID);
  var tab      = _getOrCreateRegistryTab(registry);
  var data     = tab.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === email) {
      if (String(data[i][4] || 'ATIVA').toUpperCase() === 'BLOQUEADA')
        throw new Error('LICENCA_BLOQUEADA');
      return SpreadsheetApp.openById(data[i][1]);
    }
  }
  return _provisionNewUser(email, tab);
}

function _provisionNewUser(email, registryTab) {
  var template = DriveApp.getFileById(TEMPLATE_SHEET_ID);
  var copia    = template.makeCopy('Jade Stock — ' + email, DriveApp.getRootFolder());
  copia.addViewer(email);
  var sid = copia.getId();
  registryTab.appendRow([
    email, sid, email.split('@')[0],
    Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm'),
    'ATIVA'
  ]);
  return SpreadsheetApp.openById(sid);
}

function _getOrCreateRegistryTab(registry) {
  var tab = registry.getSheetByName(REGISTRY_TAB);
  if (tab) return tab;
  tab = registry.insertSheet(REGISTRY_TAB);
  tab.getRange(1, 1, 1, 5)
    .setValues([['email', 'spreadsheetId', 'nome', 'criadoEm', 'status']])
    .setFontWeight('bold');
  return tab;
}

// ── Gestão de licença ──────────────────────────────────────
function listarUsuarios() {
  var data = SpreadsheetApp.openById(REGISTRY_SHEET_ID)
    .getSheetByName(REGISTRY_TAB).getDataRange().getValues();
  for (var i = 1; i < data.length; i++)
    Logger.log(data[i][0] + ' | ' + data[i][3] + ' | ' + (data[i][4] || 'ATIVA'));
}
function bloquearUsuario(email) { _setStatus(email, 'BLOQUEADA'); }
function reativarUsuario(email)  { _setStatus(email, 'ATIVA'); }
function _setStatus(email, status) {
  var tab  = SpreadsheetApp.openById(REGISTRY_SHEET_ID).getSheetByName(REGISTRY_TAB);
  var data = tab.getDataRange().getValues();
  for (var i = 1; i < data.length; i++)
    if (data[i][0] === email) { tab.getRange(i + 1, 5).setValue(status); return; }
}

// ── Atualização do template (rodar UMA vez após deploy) ────
// Esta função atualiza o arquivo template no Drive para que
// NOVOS usuários já recebam a planilha com a coluna EAN (L2).
// Usuários existentes são migrados automaticamente pelo
// _garantirSchemaV2() em Produtos.gs na primeira chamada.
//
// Como rodar: Editor Apps Script → selecionar esta função → Executar
function atualizarTemplate() {
  try {
    var ss    = SpreadsheetApp.openById(TEMPLATE_SHEET_ID);
    var sheet = ss.getSheetByName('PRODUTOS');
    if (!sheet) {
      Logger.log('ERRO: aba PRODUTOS não encontrada no template');
      return;
    }
    // Reutiliza a mesma lógica idempotente de migração
    _garantirSchemaV2(sheet);
    Logger.log('Template atualizado com sucesso — coluna EAN (L2) garantida.');
  } catch(e) {
    Logger.log('ERRO ao atualizar template: ' + e.message);
  }
}