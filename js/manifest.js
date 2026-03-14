// ============================================================
//  manifest.js — PWA meta tags e safe area para iOS
//
//  NOTA: O manifest.json estático (na raiz do projeto) é
//  referenciado via <link rel="manifest"> no Index.html.
//  Este arquivo injeta apenas as meta tags de PWA que precisam
//  estar no <head> dinamicamente.
// ============================================================
(function() {
  // ── iOS standalone meta tags ──────────────────────────────
  [
    { name: 'apple-mobile-web-app-capable',          content: 'yes' },
    { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
    { name: 'apple-mobile-web-app-title',            content: 'Jade Stock' },
    { name: 'mobile-web-app-capable',                content: 'yes' },
    { name: 'theme-color',                           content: '#34d399' },
  ].forEach(function(m) {
    var el = document.createElement('meta');
    el.name = m.name; el.content = m.content;
    document.head.appendChild(el);
  });

  // ── Safe area para iOS standalone ────────────────────────
  var style = document.createElement('style');
  style.textContent = [
    '@media (display-mode: standalone) {',
    '  body { padding-top: env(safe-area-inset-top); }',
    '  #nav { padding-bottom: env(safe-area-inset-bottom); }',
    '}'
  ].join('\n');
  document.head.appendChild(style);
})();
