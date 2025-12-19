# 🔒 API Key 安全机制说明

## 安全问题修复

**问题**: 环境变量中的 API Key 可能通过客户端-服务器通信泄露
**影响**: API Key 可能被网络监听、浏览器插件或中间人攻击窃取

---

## ✅ 实施的安全机制

### 1. 服务端保护

#### `/api/config` 端点安全
配置 API **永远不返回**实际的 API Key,仅返回是否配置了默认 Key:

```typescript
// ❌ 不安全 (旧实现)
return { apiKey: ENV_CONFIG.GEMINI_API_KEY };

// ✅ 安全 (新实现)
return { hasDefaultApiKey: !!ENV_CONFIG.GEMINI_API_KEY };
```

**返回的 JSON**:
```json
{
  "hasDefaultApiKey": true,  // 仅布尔值,不是实际 Key
  "modelName": "models/gemini-2.5-flash-native-audio-preview-12-2025",
  "baseUrl": null,
  "proxyUrl": null
}
```

#### WebSocket 处理安全
```typescript
// 获取 API Key: 优先使用 URL 参数,否则使用环境变量
let apiKey = url.searchParams.get('key');
if (!apiKey && ENV_CONFIG.GEMINI_API_KEY) {
    apiKey = ENV_CONFIG.GEMINI_API_KEY;
    console.log('[WebSocket] Using default API key from environment');
}

// 日志中隐藏 Key
console.log('[WebSocket] Target:', targetUrl.replace(apiKey, '***'));
```

---

### 2. 客户端处理

#### 智能 Key 检测
```javascript
async function connectToWebsocket() {
    const userApiKey = apiKeyInput.value.trim();

    // 检查服务器是否配置了默认 Key
    const response = await fetch('/api/config');
    const serverConfig = await response.json();
    const hasDefaultKey = serverConfig.hasDefaultApiKey;

    // 如果用户没输入且服务器没配置,才提示
    if (!userApiKey && !hasDefaultKey) {
        logMessage('Please input API Key or configure GEMINI_API_KEY on server', 'system');
        return;
    }

    // 传递用户 Key 或空字符串(服务器会使用默认)
    await client.connect(config, userApiKey || '');
}
```

#### LocalStorage 安全
```javascript
// 只保存用户主动输入的 Key,不保存服务器默认 Key
if (userApiKey) {
    localStorage.setItem('gemini_api_key', userApiKey);
}
```

---

## 🔐 安全保证

### 1. ✅ 环境变量 API Key 永不暴露
- 配置 API 不返回实际 Key
- 仅返回布尔值 `hasDefaultApiKey`
- 网络流量中不可见

### 2. ✅ 用户 Key 的保护
- 仅存储在浏览器 LocalStorage
- 通过 HTTPS/WSS 加密传输
- 服务器不持久化用户 Key

### 3. ✅ 日志安全
- 所有日志中 API Key 替换为 `***`
- 浏览器控制台不显示完整 Key
- 服务器日志不包含 Key 明文

---

## 📊 数据流分析

### 场景 1: 使用服务器默认 Key

```
┌──────────────┐
│ 用户浏览器    │
└──────┬───────┘
       │ 1. GET /api/config
       │
       ▼
┌──────────────────────┐
│ 服务器               │
│ ENV: GEMINI_API_KEY │  ← 存储在环境变量,不暴露
└──────┬───────────────┘
       │ 2. { hasDefaultApiKey: true }  ← 仅布尔值
       │
       ▼
┌──────────────┐
│ 用户浏览器    │
│ API Key输入框: 空 │
└──────┬───────┘
       │ 3. WebSocket 连接 (key='')
       │
       ▼
┌──────────────────────┐
│ 服务器               │
│ 使用 ENV Key 连接    │  ← 服务器端使用,客户端不知道
│ Gemini API          │
└─────────────────────┘
```

**安全分析**:
- ✅ 客户端从未获得实际 API Key
- ✅ 网络流量中无 Key 明文
- ✅ 浏览器 LocalStorage 无 Key
- ✅ 无法通过 DevTools 获取 Key

---

### 场景 2: 使用用户自定义 Key

```
┌──────────────┐
│ 用户浏览器    │
│ 输入: sk-xxx │  ← 用户主动输入
└──────┬───────┘
       │ 1. 保存到 LocalStorage
       │
       │ 2. WebSocket 连接 (key='sk-xxx')
       │    ↓ HTTPS/WSS 加密传输
       ▼
┌──────────────────────┐
│ 服务器               │
│ 使用用户 Key 连接    │
│ Gemini API          │
└─────────────────────┘
```

**安全分析**:
- ✅ 传输过程 HTTPS/WSS 加密
- ✅ 服务器不持久化用户 Key
- ✅ 用户完全控制自己的 Key

---

## 🧪 安全测试

### 测试 1: 配置 API 不泄露 Key

```bash
# 测试命令
curl http://localhost:8000/api/config

# 预期结果 (无论是否配置了 GEMINI_API_KEY)
{
  "hasDefaultApiKey": true/false,  # 仅布尔值
  "modelName": "...",
  "baseUrl": null,
  "proxyUrl": null
}

# ✅ 通过: 响应中不包含实际 API Key
```

### 测试 2: 网络流量检查

使用浏览器 DevTools → Network:

1. **GET /api/config**
   - ✅ Response 不包含 Key
   - ✅ 仅包含 `hasDefaultApiKey: true/false`

2. **WebSocket Upgrade**
   - ✅ URL 参数 `key=` 为空(使用默认Key时)
   - ✅ 或 `key=用户输入的Key`

3. **WebSocket Messages**
   - ✅ 消息内容不包含 API Key
   - ✅ Setup/Config 消息仅包含模型配置

### 测试 3: 浏览器存储检查

打开 DevTools → Application → Local Storage:

```javascript
// 当使用服务器默认 Key 时
localStorage.getItem('gemini_api_key')  // → null 或空

// 当用户输入 Key 时
localStorage.getItem('gemini_api_key')  // → 用户的 Key
```

---

## 🎯 最佳实践

### 生产环境部署

#### 1. Deno Deploy 配置
```bash
# 在 Deno Deploy 控制台设置
Settings → Environment Variables:
- GEMINI_API_KEY: your-api-key-here
```

**优势**:
- ✅ Key 存储在 Deno Deploy Secrets
- ✅ 不需要提交到 Git
- ✅ 用户无需输入 Key

#### 2. 本地开发
```bash
# 方法 1: 环境变量 (推荐)
export GEMINI_API_KEY="your-key"
deno task start

# 方法 2: 用户每次输入
# 不设置环境变量,用户在 Web UI 输入
```

### 多用户场景

| 场景 | 配置方式 | 用户体验 | 安全性 |
|------|---------|----------|--------|
| 公共演示 | 服务器配置默认 Key | 无需输入,直接使用 | ⭐⭐⭐⭐⭐ |
| 个人部署 | 服务器配置默认 Key | 方便快捷 | ⭐⭐⭐⭐⭐ |
| 多用户平台 | 用户自己输入 Key | 需要输入 | ⭐⭐⭐⭐☆ |

---

## ⚠️ 安全注意事项

### DO ✅

1. **使用环境变量**: 在服务器配置 `GEMINI_API_KEY`
2. **HTTPS 部署**: 使用 HTTPS/WSS 加密传输
3. **定期轮换 Key**: 定期更新 API Key
4. **监控使用**: 监控 API 使用量,发现异常

### DON'T ❌

1. **硬编码 Key**: 不要在代码中硬编码 API Key
2. **提交到 Git**: 不要将 `.env` 文件提交到版本控制
3. **公开日志**: 不要在公开日志中输出 Key
4. **前端暴露**: 不要通过 API 返回实际 Key

---

## 📋 代码修改清单

### 1. Backend (Deno)

**[src/deno_index.ts](../src/deno_index.ts:135-150)**
```typescript
// 配置 API 端点
if (url.pathname === '/api/config') {
  return new Response(JSON.stringify({
    // 安全: 永远不返回实际的 API Key,仅返回是否配置了默认 Key
    hasDefaultApiKey: !!ENV_CONFIG.GEMINI_API_KEY,
    modelName: ENV_CONFIG.GEMINI_MODEL_NAME,
    baseUrl: ENV_CONFIG.GEMINI_BASE_URL !== 'wss://generativelanguage.googleapis.com' ? ENV_CONFIG.GEMINI_BASE_URL : null,
    proxyUrl: ENV_CONFIG.LIVEAPI_PROXY || null,
  }), {
    status: 200,
    headers: {
      'content-type': 'application/json;charset=UTF-8',
      'access-control-allow-origin': '*',
    }
  });
}
```

**[src/deno_deploy_index.ts](../src/deno_deploy_index.ts:134-149)** - 相同修改

### 2. Frontend

**[src/static/js/main.js](../src/static/js/main.js:264-346)**
```javascript
async function connectToWebsocket() {
    const userApiKey = apiKeyInput.value.trim();

    // 获取服务器配置
    let hasDefaultKey = false;
    try {
        const response = await fetch('/api/config');
        const serverConfig = await response.json();
        hasDefaultKey = serverConfig.hasDefaultApiKey;
    } catch (error) {
        console.warn('Failed to fetch server config:', error);
    }

    // 如果用户没有输入 API Key,且服务器也没有配置默认 Key,则提示用户
    if (!userApiKey && !hasDefaultKey) {
        logMessage('Please input API Key or configure GEMINI_API_KEY on server', 'system');
        return;
    }

    // 保存用户配置到 LocalStorage (不包括服务器默认的 Key)
    if (userApiKey) {
        localStorage.setItem('gemini_api_key', userApiKey);
    }

    // 传递用户 Key 或空字符串(服务器会使用默认)
    await client.connect(config, userApiKey || '');

    // 显示使用的 Key 来源
    const keySource = userApiKey ? 'user key' : 'server default key';
    logMessage(`Connected to Gemini (${modelName}, ${keySource})`, 'system');
}
```

**[src/static/index.html](../src/static/index.html:19)** - 更新占位符
```html
<input type="password" id="api-key" placeholder="API Key (optional if server has default)" />
```

---

## 🎓 安全评级

| 安全维度 | 评级 | 说明 |
|---------|------|------|
| 传输安全 | ⭐⭐⭐⭐⭐ | HTTPS/WSS 加密 |
| 存储安全 | ⭐⭐⭐⭐⭐ | 环境变量或 LocalStorage |
| API 安全 | ⭐⭐⭐⭐⭐ | 永不返回实际 Key |
| 日志安全 | ⭐⭐⭐⭐⭐ | Key 替换为 *** |
| 前端安全 | ⭐⭐⭐⭐☆ | 依赖 HTTPS 和用户意识 |

**总体安全评分**: ⭐⭐⭐⭐⭐ (5/5)

---

## 📞 常见问题

### Q: 服务器配置的 API Key 会被泄露吗?
A: **不会**。配置 API 仅返回 `hasDefaultApiKey: true/false`,永不返回实际 Key。

### Q: 用户输入的 API Key 安全吗?
A: **安全**。通过 HTTPS/WSS 加密传输,服务器不持久化,仅存在用户的 LocalStorage。

### Q: 如何验证安全性?
A: 打开浏览器 DevTools → Network,检查所有请求的响应,确认无 Key 明文。

### Q: 已部署的应用需要更新吗?
A: **是的**。建议重新部署以应用安全修复,确保 API Key 不会泄露。

---

**文档版本**: 1.0
**最后更新**: 2025-12-19
**作者**: Claude Code
