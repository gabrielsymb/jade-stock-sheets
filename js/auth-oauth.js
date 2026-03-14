cd ~/Documentos/Projetos/jade-stock-deploy/frontend/js/

# Substituir arquivo
cat > auth-oauth.js << 'EOF'
var GOOGLE_CLIENT_ID = '103980240796-4fvdfiflfoh30aih7631pgk4ppoufrvp.apps.googleusercontent.com';
var _usuarioLogado = null;
var _authIniciado = false;

function initAuth() {
  if (_authIniciado) return;
  _authIniciado = true;
  
  var token = sessionStorage.getItem('jade_token');
  var exp = parseInt(sessionStorage.getItem('jade_token_exp') || '0');
  
  if (token && Date.now() < exp) {
    _iniciarSessaoComToken(token);
  } else {
    _mostrarTelaLogin();
  }
}

function _mostrarTelaLogin() {
  document.getElementById('app').innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;background:var(--bg);padding:24px"><h1 style="color:var(--jade);margin-bottom:24px">Jade Stock</h1><p style="color:var(--muted);margin-bottom:32px">Entre com sua conta Google</p><div id="g_id_onload" data-client_id="' + GOOGLE_CLIENT_ID + '" data-callback="onGoogleSignIn" data-auto_prompt="false"></div><div class="g_id_signin" data-type="standard" data-size="large" data-theme="filled_black"></div></div>';
  var s = document.createElement('script');
  s.src = 'https://accounts.google.com/gsi/client';
  s.async = true;
  document.head.appendChild(s);
}

function onGoogleSignIn(response) {
  var token = response.credential;
  if (!token) return;
  sessionStorage.setItem('jade_token', token);
  sessionStorage.setItem('jade_token_exp', (Date.now() + 3600000).toString());
  _authIniciado = false;
  location.reload();
}

function _iniciarSessaoComToken(token) {
  api('iniciarSessao', {}, token)
    .then(function(data) {
      _usuarioLogado = data;
      _mostrarApp();
    })
    .catch(function(err) {
      console.error('Erro auth:', err);
      sessionStorage.clear();
      _authIniciado = false;
      _mostrarTelaLogin();
    });
}

function _mostrarApp() {
  document.getElementById('app').style.display = 'flex';
  if (typeof navigate === 'function') navigate('pdv');
}

window.onGoogleSignIn = onGoogleSignIn;
EOF