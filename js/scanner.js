// ============================================================
//  scanner.js — Scanner de código de barras para PDV
//
//  Estratégia de detecção (em ordem de preferência):
//  1. BarcodeDetector API nativa (Chrome Android 83+, Edge 83+, Samsung Browser)
//     → Sem dependência externa, processa frames da câmera via requestAnimationFrame
//  2. Entrada manual / teclado
//     → Também serve leitores USB/Bluetooth que simulam teclado (digita + Enter)
//
//  A busca do produto acontece inteiramente no client-side em state.produtos
//  (já carregado na memória), tornando o retorno instantâneo sem chamada ao servidor.
// ============================================================

// ── Estado interno do scanner ──────────────────────────────
var _scannerAtivo   = false;
var _streamAtivo    = null;  // MediaStream da câmera — guardado para poder parar
var _rafId          = null;  // requestAnimationFrame ID — para cancelar o loop

/**
 * Abre o modal do scanner.
 * Chamado pelo botão de código de barras no PDV.
 */
function scannerAbrir() {
  var suportado = typeof BarcodeDetector !== 'undefined';
  var temCamera  = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

  var html =
    '<p style="font-family:Syne,sans-serif;font-size:15px;font-weight:700;margin-bottom:4px">' +
      '📷 Scanner de Código de Barras' +
    '</p>' +

    // ── Área da câmera (só aparece se BarcodeDetector estiver disponível) ──
    (suportado && temCamera
      ? '<div id="scanner-wrap" style="position:relative;width:100%;border-radius:12px;overflow:hidden;background:#000;margin-bottom:16px">' +
          '<video id="scanner-video" playsinline muted ' +
            'style="width:100%;display:block;max-height:240px;object-fit:cover"></video>' +
          // Mira central para guiar o usuário
          '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none">' +
            '<div style="width:200px;height:80px;border:2px solid var(--green);border-radius:8px;' +
                        'box-shadow:0 0 0 2000px rgba(0,0,0,.35)">' +
              // Cantos decorativos da mira
              '<div style="position:absolute;top:-2px;left:-2px;width:16px;height:16px;border-top:3px solid var(--green);border-left:3px solid var(--green);border-radius:2px 0 0 0"></div>' +
              '<div style="position:absolute;top:-2px;right:-2px;width:16px;height:16px;border-top:3px solid var(--green);border-right:3px solid var(--green);border-radius:0 2px 0 0"></div>' +
              '<div style="position:absolute;bottom:-2px;left:-2px;width:16px;height:16px;border-bottom:3px solid var(--green);border-left:3px solid var(--green);border-radius:0 0 0 2px"></div>' +
              '<div style="position:absolute;bottom:-2px;right:-2px;width:16px;height:16px;border-bottom:3px solid var(--green);border-right:3px solid var(--green);border-radius:0 0 2px 0"></div>' +
            '</div>' +
          '</div>' +
          '<div id="scanner-status" style="position:absolute;bottom:0;left:0;right:0;' +
            'padding:8px;text-align:center;font-size:12px;background:rgba(0,0,0,.5);color:#fff">' +
            'Iniciando câmera...' +
          '</div>' +
        '</div>'
      : '<div style="background:var(--surface);border-radius:10px;padding:12px;margin-bottom:16px;' +
          'text-align:center;font-size:12px;color:var(--muted)">' +
          (suportado ? '📷 Câmera não disponível neste dispositivo.' : '⚠ Leitor de câmera não suportado neste navegador.') +
          '<br>Use Chrome no Android para escanear, ou digite o código abaixo.' +
        '</div>') +

    // ── Entrada manual (sempre visível como fallback) ──────
    '<div style="margin-bottom:16px">' +
      '<label style="font-size:12px;color:var(--muted);display:block;margin-bottom:6px">' +
        'Código manual / leitor USB' +
      '</label>' +
      '<div style="display:flex;gap:8px">' +
        '<input id="scanner-input" type="text" inputmode="numeric" placeholder="Ex: 7891234567890"' +
          'style="flex:1;font-family:Syne,sans-serif;font-size:16px;letter-spacing:1px"' +
          'onkeydown="if(event.key===\'Enter\')scannerBuscarManual()"' +
          'autocomplete="off">' +
        '<button class="btn btn-primary" onclick="scannerBuscarManual()" ' +
          'style="padding:0 16px;min-width:64px">OK</button>' +
      '</div>' +
    '</div>' +

    '<button class="btn btn-ghost" onclick="scannerFechar()" style="width:100%">Cancelar</button>';

  showModal(html);

  // Inicia a câmera após o modal estar no DOM
  if (suportado && temCamera) {
    setTimeout(scannerIniciarCamera, 100);
  } else {
    // Foca o input manual automaticamente se não tiver câmera
    setTimeout(function() {
      var inp = document.getElementById('scanner-input');
      if (inp) inp.focus();
    }, 200);
  }
}

/**
 * Inicializa a câmera traseira e começa o loop de detecção.
 * BarcodeDetector processa cada frame buscando códigos EAN-13, EAN-8,
 * Code-128 e UPC — os mais comuns em produtos de varejo.
 */
function scannerIniciarCamera() {
  _scannerAtivo = true;

  navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: { ideal: 'environment' }, // câmera traseira
      width:  { ideal: 1280 },
      height: { ideal: 720 }
    }
  })
  .then(function(stream) {
    _streamAtivo = stream;
    var video = document.getElementById('scanner-video');
    if (!video) { _pararStream(); return; }

    video.srcObject = stream;
    video.play();

    var detector = new BarcodeDetector({
      formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e']
    });

    var statusEl = document.getElementById('scanner-status');
    if (statusEl) statusEl.textContent = 'Aponte para o código de barras';

    // Loop de detecção: roda a cada frame enquanto o scanner estiver ativo
    function loop() {
      if (!_scannerAtivo) return;
      if (!video.videoWidth) { _rafId = requestAnimationFrame(loop); return; }

      detector.detect(video)
        .then(function(barcodes) {
          if (!_scannerAtivo) return;
          if (barcodes.length > 0) {
            // Código detectado — para tudo e processa
            _scannerAtivo = false;
            var codigo = barcodes[0].rawValue;
            _pararStream();
            _feedback(statusEl, codigo);
            setTimeout(function() {
              closeModal();
              pdvAdicionarPorEAN(codigo);
            }, 400);
          } else {
            _rafId = requestAnimationFrame(loop);
          }
        })
        .catch(function() {
          // detect() pode falhar em frames escuros ou fora de foco — ignora e tenta no próximo
          _rafId = requestAnimationFrame(loop);
        });
    }

    video.addEventListener('loadeddata', function() { loop(); });
  })
  .catch(function(err) {
    var statusEl = document.getElementById('scanner-status');
    var msg = err.name === 'NotAllowedError'
      ? 'Permissão de câmera negada. Use o campo manual abaixo.'
      : 'Câmera indisponível: ' + err.message;
    if (statusEl) statusEl.textContent = msg;
    // Foca o input manual como fallback
    var inp = document.getElementById('scanner-input');
    if (inp) { inp.focus(); }
  });
}

/**
 * Para a câmera e cancela o loop de animação.
 * Importante: sem isso, a câmera continua gravando mesmo após fechar o modal.
 */
function _pararStream() {
  _scannerAtivo = false;
  if (_rafId) { cancelAnimationFrame(_rafId); _rafId = null; }
  if (_streamAtivo) {
    _streamAtivo.getTracks().forEach(function(t) { t.stop(); });
    _streamAtivo = null;
  }
}

/** Feedback visual verde quando o código é detectado */
function _feedback(statusEl, codigo) {
  if (statusEl) {
    statusEl.style.background = 'rgba(52,211,153,.8)';
    statusEl.style.color = '#022c1c';
    statusEl.textContent = '✓ ' + codigo;
  }
}

/** Fecha o modal e garante que a câmera seja parada */
function scannerFechar() {
  _pararStream();
  closeModal();
}

/**
 * Busca manual pelo código digitado/colado no input.
 * Também é o handler de leitores USB (que simulam teclado + Enter).
 */
function scannerBuscarManual() {
  var inp = document.getElementById('scanner-input');
  var codigo = inp ? inp.value.trim() : '';
  if (!codigo) { showToast('Digite o código de barras', true); return; }
  closeModal();
  pdvAdicionarPorEAN(codigo);
}

/**
 * Recebe um EAN (string) e adiciona o produto ao carrinho.
 * A busca é local em state.produtos — sem chamada ao servidor, instantâneo.
 * Fallback ao servidor apenas se o produto não estiver no cache local.
 */
function pdvAdicionarPorEAN(ean) {
  if (!ean) return;

  // Busca local primeiro (O(n) mas n é pequeno — geralmente < 500 produtos)
  var eanNorm = ean.replace(/\s+/g, '').trim();
  var produto = null;

  for (var i = 0; i < state.produtos.length; i++) {
    var p = state.produtos[i];
    if (p.ean && p.ean.replace(/\s+/g, '').trim() === eanNorm) {
      produto = p;
      break;
    }
  }

  if (produto) {
    // Encontrado no cache local — adiciona direto ao carrinho
    if (produto.estoque <= 0) {
      showToast('⚠ ' + produto.nome + ' sem estoque', true);
      return;
    }
    cartAdd(produto.nome, produto.preco, produto.estoque);
    showToast('✓ ' + produto.nome + ' adicionado');
    return;
  }

  // Não encontrado localmente — consulta o servidor como fallback
  // (cobre o caso de produto cadastrado depois do último loadProdutos)
  showToast('Buscando código ' + ean + '...');
  api('getProdutoPorEAN', { ean: ean })
    .then(function(p) {
      if (!p) {
        showToast('Código ' + ean + ' não cadastrado. Associe na tela de Produtos.', true);
        return;
      }
      // Atualiza cache local com o produto encontrado
      state.produtos.push(p);
      if (p.estoque <= 0) {
        showToast('⚠ ' + p.nome + ' sem estoque', true);
        return;
      }
      cartAdd(p.nome, p.preco, p.estoque);
      showToast('✓ ' + p.nome + ' adicionado');
    })
    .catch(function(e) {
      showToast('Erro ao buscar código: ' + e.message, true);
    });
}
