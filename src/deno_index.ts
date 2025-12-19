// 环境配置
const ENV_CONFIG = {
  GEMINI_API_KEY: Deno.env.get('GEMINI_API_KEY') || '',
  PORT: parseInt(Deno.env.get('PORT') || '8000'),
};

const getContentType = (path: string): string => {
  const ext = path.split('.').pop()?.toLowerCase() || '';
  const types: Record<string, string> = {
    'js': 'application/javascript',
    'css': 'text/css',
    'html': 'text/html',
    'json': 'application/json',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif'
  };
  return types[ext] || 'text/plain';
};

async function handleWebSocket(req: Request): Promise<Response> {
  const { socket: clientWs, response } = Deno.upgradeWebSocket(req);

  const url = new URL(req.url);

  // 获取 API Key: 优先使用 URL 参数，否则使用环境变量
  let apiKey = url.searchParams.get('key');
  if (!apiKey && ENV_CONFIG.GEMINI_API_KEY) {
    apiKey = ENV_CONFIG.GEMINI_API_KEY;
    console.log('[WebSocket] Using default API key from environment');
  }

  if (!apiKey) {
    console.error('[WebSocket] No API key provided');
    clientWs.close(1008, 'API key required');
    return response;
  }

  // 构建目标 URL (移除原有的 key 参数，使用我们的)
  const targetPath = url.pathname + url.search.replace(/[?&]key=[^&]*/, '');
  const separator = targetPath.includes('?') ? '&' : '?';
  const targetUrl = `wss://generativelanguage.googleapis.com${targetPath}${separator}key=${apiKey}`;

  console.log('[WebSocket] Target:', targetUrl.replace(apiKey, '***'));

  // 立即创建 WebSocket 连接（7月2日的简单实现）
  const pendingMessages: (string | Blob)[] = [];
  const targetWs = new WebSocket(targetUrl);

  targetWs.onopen = () => {
    console.log('[WebSocket] Connected to Gemini API');
    // 发送所有待处理的消息
    pendingMessages.forEach(msg => targetWs.send(msg));
    pendingMessages.length = 0;
  };

  clientWs.onmessage = (event) => {
    console.log('[WebSocket] Client message received');
    if (targetWs.readyState === WebSocket.OPEN) {
      targetWs.send(event.data);
    } else {
      // 如果连接还未建立，缓存消息
      pendingMessages.push(event.data);
    }
  };

  targetWs.onmessage = (event) => {
    console.log('[WebSocket] Gemini message received');
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(event.data);
    }
  };

  clientWs.onclose = (event) => {
    console.log(`[WebSocket] Client closed: code=${event.code}`);
    if (targetWs.readyState === WebSocket.OPEN) {
      targetWs.close(1000, event.reason);
    }
  };

  targetWs.onclose = (event) => {
    console.log(`[WebSocket] Gemini closed: code=${event.code}, reason=${event.reason || 'none'}`);
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.close(event.code, event.reason || 'Gemini closed');
    }
  };

  targetWs.onerror = (error) => {
    console.error('[WebSocket] Gemini error:', error);
  };

  return response;
}

async function handleAPIRequest(req: Request): Promise<Response> {
  try {
    const worker = await import('./api_proxy/worker.mjs');
    return await worker.default.fetch(req);
  } catch (error) {
    console.error('API request error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const errorStatus = (error as { status?: number }).status || 500;
    return new Response(errorMessage, {
      status: errorStatus,
      headers: {
        'content-type': 'text/plain;charset=UTF-8',
      }
    });
  }
}

async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);
  console.log('Request URL:', req.url);

  // WebSocket 处理
  if (req.headers.get("Upgrade")?.toLowerCase() === "websocket") {
    return handleWebSocket(req);
  }

  // 配置 API 端点
  if (url.pathname === '/api/config') {
    return new Response(JSON.stringify({
      hasDefaultApiKey: !!ENV_CONFIG.GEMINI_API_KEY,
    }), {
      status: 200,
      headers: {
        'content-type': 'application/json;charset=UTF-8',
        'access-control-allow-origin': '*',
      }
    });
  }

  if (url.pathname.endsWith("/chat/completions") ||
      url.pathname.endsWith("/embeddings") ||
      url.pathname.endsWith("/models")) {
    return handleAPIRequest(req);
  }

  // 静态文件处理
  try {
    let filePath = url.pathname;
    if (filePath === '/' || filePath === '/index.html') {
      filePath = '/index.html';
    }

    const fullPath = `${Deno.cwd()}/src/static${filePath}`;

    const file = await Deno.readFile(fullPath);
    const contentType = getContentType(filePath);

    return new Response(file, {
      headers: {
        'content-type': `${contentType};charset=UTF-8`,
      },
    });
  } catch (e) {
    console.error('Error details:', e);
    return new Response('Not Found', {
      status: 404,
      headers: {
        'content-type': 'text/plain;charset=UTF-8',
      }
    });
  }
}

Deno.serve(handleRequest);
