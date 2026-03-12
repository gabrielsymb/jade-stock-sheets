// ============================================================
//  auth-oauth.js — Autenticação Google OAuth no Frontend
// ============================================================

var GOOGLE_CLIENT_ID = '103980240796-4fvdfiflfoh30aih7631pgk4ppoufrvp.apps.googleusercontent.com';

// Estado global de autenticação
var _usuarioLogado = null;

// ── Inicializar autenticação ───────────────────────────────
function initAuth() {
  // Verifica se já tem token salvo
  var token = sessionStorage.getItem('jade_token');
  var exp   = parseInt(sessionStorage.getItem('jade_token_exp') || '0');
  
  if (token && Date.now() < exp) {
    // Token válido, inicia sessão
    _iniciarSessaoComToken(token);
  } else {
    // Sem token, mostra tela de login
    _mostrarTelaLogin();
  }
}

// ── Mostrar tela de login ──────────────────────────────────
function _mostrarTelaLogin() {
  document.getElementById('app').innerHTML = `
    <div style="
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: var(--bg);
      padding: 24px;
    ">
      <!-- Logo -->
      <svg style="width: 80px; height: 80px; margin-bottom: 32px;" viewBox="0 0 512 512" fill="none">
        <defs>
          <linearGradient id="lg1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#a8ffcb"/>
            <stop offset="100%" stop-color="#065f46"/>
          </linearGradient>
        </defs>
        <polygon points="256,110 336,80 432,200 336,210 256,180 176,210 80,200 176,80" fill="url(#lg1)" opacity=".9"/>
        <polygon points="80,200 176,210 256,180 176,300" fill="#34d399" opacity=".85"/>
        <polygon points="432,200 336,210 256,180 336,300" fill="url(#lg1)" opacity=".9"/>
        <polygon points="176,300 256,180 336,300 256,380" fill="#047857" opacity=".95"/>
        <polygon points="80,200 100,360 256,380 176,300" fill="#047857" opacity=".8"/>
        <polygon points="432,200 412,360 256,380 336,300" fill="url(#lg1)" opacity=".7"/>
        <polygon points="100,360 256,460 412,360 256,380" fill="#065f46" opacity=".9"/>
      </svg>

      <h1 style="
        font-family: 'Syne', sans-serif;
        font-size: 32px;
        font-weight: 800;
        color: var(--jade);
        margin-bottom: 12px;
      ">Jade Stock</h1>

      <p style="
        color: var(--muted);
        font-size: 14px;
        margin-bottom: 32px;
        text-align: center;
        max-width: 320px;
      ">Entre com sua conta Google para acessar o sistema</p>

      <!-- Botão Google -->
      <div id="g_id_onload"
        data-client_id="${GOOGLE_CLIENT_ID}"
        data-callback="onGoogleSignIn"
        data-auto_prompt="false">
      </div>
      <div class="g_id_signin"
        data-type="standard"
        data-size="large"
        data-theme="filled_black"
        data-text="signin_with"
        data-shape="rectangular"
        data-logo_alignment="left">
      </div>

      <p style="
        color: var(--text-3);
        font-size: 12px;
        margin-top: 24px;
        text-align: center;
        max-width: 360px;
      ">Ao continuar, você concorda com o uso de cookies para autenticação. Seus dados são armazenados de forma segura no Google Sheets.</p>
    </div>
  `;

  // Carregar biblioteca do Google
  _carregarGoogleIdentity();
}

// ── Carregar Google Identity Services ─────────────────────
function _carregarGoogleIdentity() {
  if (document.getElementById('google-identity-script')) return;
  
  var script = document.createElement('script');
  script.id = 'google-identity-script';
  script.src = 'https://accounts.google.com/gsi/client';
  script.async = true;
  script.defer = true;
  document.head.appendChild(script);
}

// ── Callback do Google Sign-In ─────────────────────────────
function onGoogleSignIn(response) {
  var token = response.credential;
  
  if (!token) {
    showToast('Erro ao fazer login', 'error');
    return;
  }

  // Salvar token
  var exp = Date.now() + (3600 * 1000); // 1 hora
  sessionStorage.setItem('jade_token', token);
  sessionStorage.setItem('jade_token_exp', exp.toString());

  // Iniciar sessão
  _iniciarSessaoComToken(token);
}

// ── Iniciar sessão com token ───────────────────────────────
function _iniciarSessaoComToken(token) {
  showToast('Autenticando...', 'info');

  api('iniciarSessao', {}, token)
    .then(function(data) {
      _usuarioLogado = data;
      showToast('Bem-vindo, ' + data.nome + '!', 'success');
      
      // Recarregar página para mostrar app
      location.reload();
    })
    .catch(function(err) {
      console.error('Erro ao iniciar sessão:', err);
      showToast('Erro: ' + err.message, 'error');
      _logout();
    });
}

// ── Logout ─────────────────────────────────────────────────
function _logout() {
  sessionStorage.removeItem('jade_token');
  sessionStorage.removeItem('jade_token_exp');
  _usuarioLogado = null;
  location.reload();
}

// ── Expor globalmente ──────────────────────────────────────
window.onGoogleSignIn = onGoogleSignIn;
window.logout = _logout;