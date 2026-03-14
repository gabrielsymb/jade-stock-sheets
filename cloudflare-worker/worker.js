/**
 * Cloudflare Worker — Proxy CORS para Jade Stock
 *
 * Este Worker funciona como intermediário entre o frontend PWA e o
 * backend Google Apps Script, resolvendo problemas de CORS.
 *
 * Deploy:
 * 1. Acesse dash.cloudflare.com
 * 2. Workers & Pages → Create Application → Create Worker
 * 3. Cole este código
 * 4. Atualize APPS_SCRIPT_URL com a URL do seu Web App
 * 5. Deploy
 */

// ⚠️ ATENÇÃO: Atualize esta URL antes de fazer deploy
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbypfGWlxmwnO8TbVuXpEJXZoTagckYt2TSHZPL8T4qD3snRfDo8WNzf8nmI3owGbAXl/exec';

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  // Responde a requisições OPTIONS (CORS preflight)
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
      }
    });
  }

  // Apenas POST é permitido
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({
      ok: false,
      erro: 'Método não permitido. Use POST.'
    }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }

  try {
    // Lê o corpo da requisição
    const body = await request.text();

    // Encaminha para o Google Apps Script
    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: body,
      redirect: 'follow' // Importante: Apps Script retorna 302
    });

    // Lê resposta como texto (Apps Script retorna JSON como string)
    const text = await response.text();

    // Retorna com headers CORS
    return new Response(text, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });

  } catch (error) {
    // Tratamento de erros
    return new Response(JSON.stringify({
      ok: false,
      erro: error.message || 'Erro no proxy'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

/**
 * Teste via cURL:
 *
 * curl -X POST https://jade-proxy.seu-usuario.workers.dev \
 *   -H "Content-Type: text/plain" \
 *   -d '{"action":"getProdutos","params":{}}'
 *
 * Resposta esperada:
 * {"ok":true,"data":[]}
 */
