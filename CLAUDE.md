# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

这是一个 Gemini 2.5 多模态对话的 Web 应用,提供 WebSocket 实时通信和 OpenAI 格式的 API 代理功能。项目支持双平台部署:
- **Deno** (推荐): 用于本地开发和 Deno Deploy 部署
- **Cloudflare Workers**: 用于全球无服务器部署

**重要历史信息:**
- 项目基于 7月2日 的稳定 WebSocket 实现 (立即连接模式)
- 最近的修复包括: API 版本配置、模型名称、WebSocket 消息队列
- 当前使用的 Gemini 模型: `gemini-2.0-flash-exp` (支持 bidiGenerateContent)
- git 状态显示最近的提交集中在修复 WebSocket 和 Deno Deploy 部署问题

## 核心架构

### 多入口架构设计
项目有三个入口文件,针对不同运行环境:

1. **Deno 本地开发** ([src/deno_index.ts](src/deno_index.ts))
   - 入口点: `deno task start` → `deno run --allow-net --allow-read --allow-env src/deno_index.ts`
   - 使用 Deno 原生 API (Deno.serve, Deno.readFile, Deno.upgradeWebSocket)
   - 静态文件从文件系统直接读取 (`src/static/`)
   - 支持环境变量 `GEMINI_API_KEY` 作为默认 API Key

2. **Deno Deploy 部署** ([src/deno_deploy_index.ts](src/deno_deploy_index.ts))
   - 入口点: `deno task deploy-push` → `deployctl deploy --entrypoint=src/deno_deploy_index.ts`
   - 与 deno_index.ts 基本相同,但优化了 Deno Deploy 环境
   - 专为 Deno Deploy 无服务器平台设计

3. **Cloudflare Workers 环境** ([src/index.js](src/index.js))
   - 入口点: `wrangler dev` 或 `wrangler deploy`
   - 使用 Cloudflare Workers API (WebSocketPair, env.__STATIC_CONTENT)
   - 静态文件通过 Workers Assets 提供 (配置在 [wrangler.toml](wrangler.toml))
   - 需要调用 `proxy.accept()` 处理 WebSocket

### 请求处理流程

所有入口实现相同的路由逻辑:

```
                    ┌─────────────────────┐
                    │  HTTP/WS Request    │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │  检查 Upgrade 头    │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
      ┌───────▼───────┐ ┌─────▼──────┐ ┌──────▼──────┐
      │  WebSocket    │ │  API 代理  │ │  静态文件   │
      │  (实时多模态) │ │  (OpenAI)  │ │  (前端UI)   │
      └───────┬───────┘ └─────┬──────┘ └──────┬──────┘
              │               │                │
              ▼               ▼                ▼
    Gemini WebSocket    worker.mjs      HTML/JS/CSS
    generativelanguage   API 转换        (单页应用)
    .googleapis.com
```

### 关键路由模式

1. **WebSocket 连接** (`request.headers.get("Upgrade") === "websocket"`)
   - 建立客户端到 Gemini WebSocket 的双向代理
   - 目标: `wss://generativelanguage.googleapis.com/...`
   - 实现消息队列机制处理连接建立前的消息

2. **API 代理路由** (通过 [src/api_proxy/worker.mjs](src/api_proxy/worker.mjs))
   - `/v1/chat/completions` - Chat 对话
   - `/v1/embeddings` - 文本嵌入
   - `/v1/models` - 模型列表
   - 将 OpenAI 格式请求转换为 Gemini API 格式

3. **静态文件服务**
   - `/` 或 `/index.html` → 主页面
   - 其他路径 → 从 `src/static/` 提供资源

### 前端架构 (src/static/js/)

采用模块化设计,分为多个功能层:

```
main.js (协调层)
    ├── core/
    │   ├── websocket-client.js     # WebSocket 客户端封装
    │   └── worklet-registry.js     # Audio Worklet 注册
    ├── audio/
    │   ├── audio-streamer.js       # 音频播放流
    │   ├── audio-recorder.js       # 麦克风录音
    │   └── worklets/               # Web Audio Worklets
    ├── video/
    │   ├── video-manager.js        # 摄像头管理
    │   └── screen-recorder.js      # 屏幕共享录制
    ├── tools/
    │   ├── tool-manager.js         # Function Calling 管理
    │   ├── google-search.js        # Google 搜索工具
    │   └── weather-tool.js         # 天气查询工具
    ├── config/
    │   └── config.js               # 应用配置常量
    └── utils/
        ├── logger.js               # 日志工具
        ├── error-boundary.js       # 错误边界
        └── utils.js                # 通用工具函数
```

**关键设计点:**
- 所有模块使用 ES6 `import/export` 语法
- 配置集中在 `config/config.js` (API endpoints, voices, system instructions)
- LocalStorage 持久化用户设置 (API key, voice, language, FPS)

## 常用开发命令

### Deno 本地开发 (推荐)
```bash
# 启动开发服务器
deno task start
# 等价于: deno run --allow-net --allow-read --allow-env src/deno_index.ts

# 访问: http://localhost:8000

# 部署到 Deno Deploy
deno task deploy-push
# 等价于: deployctl deploy --project=gemini-playground --entrypoint=src/deno_index.ts
```

### Cloudflare Workers 开发
```bash
# 安装依赖
npm install

# 本地开发 (使用 Miniflare 模拟 Workers 环境)
npm run dev
# 或者: npm start

# 部署到 Cloudflare
npm run deploy
```

### 测试
```bash
# 运行测试 (Vitest + Cloudflare Workers pool)
npm test
```

## 开发注意事项

### 1. 双环境兼容性
修改代码时需同时考虑 Deno 和 Cloudflare Workers 环境:

**文件系统访问:**
- Deno: `Deno.readFile()` 从文件系统读取
- Workers: `env.__STATIC_CONTENT.get()` 从 Assets 读取
- 静态文件只能通过 HTTP 路由提供

**WebSocket 实现:**
- Deno: `Deno.upgradeWebSocket()` 返回 `{ socket, response }`
- Workers: `new WebSocketPair()` 返回 `[client, proxy]`
- Workers 需要调用 `proxy.accept()` 并返回 Response 时附带 `webSocket: client`

**环境变量:**
- Deno: `Deno.env.get('GEMINI_API_KEY')`
- Workers: `env.GEMINI_API_KEY` (通过 wrangler.toml 配置)

**Node.js 兼容性:**
- Workers 已启用 `nodejs_compat` flag ([wrangler.toml:5](wrangler.toml#L5))
- `worker.mjs` 可以使用 `node:buffer` 等 Node.js 模块

### 2. API Key 安全性
- **默认策略**: API Key 仅存储在客户端 LocalStorage (`gemini_api_key`)
- **传递方式**: 通过 HTTP Header `Authorization: Bearer <API_KEY>` 传递
- **环境变量支持**: Deno 可配置 `GEMINI_API_KEY` 环境变量作为默认值
- **重要**: 服务端不存储或缓存任何 API Key

### 3. WebSocket 消息队列机制
两个入口都实现了相同的消息队列机制,确保在 Gemini WebSocket 连接建立前的消息不会丢失:

```typescript
// 在目标 WebSocket 建立前缓存客户端消息
const pendingMessages: (string | Blob)[] = [];

targetWs.onopen = () => {
  // 连接建立后发送所有缓存的消息
  pendingMessages.forEach(msg => targetWs.send(msg));
  pendingMessages.length = 0;
};

clientWs.onmessage = (event) => {
  if (targetWs.readyState === WebSocket.OPEN) {
    targetWs.send(event.data);
  } else {
    pendingMessages.push(event.data); // 缓存消息
  }
};
```

**关键点:**
- 客户端 WebSocket 立即建立 (不等待 Gemini 连接)
- 目标 WebSocket 连接是异步的
- 在连接建立前的所有消息都会被缓存并在连接后立即发送

### 4. CORS 配置
所有 API 响应自动添加 CORS 头 ([src/api_proxy/worker.mjs](src/api_proxy/worker.mjs#L55-L58)):
```javascript
"Access-Control-Allow-Origin": "*"
"Access-Control-Allow-Methods": "*"
"Access-Control-Allow-Headers": "*"
```

### 5. 前端模块系统
- HTML 使用 `<script type="module">` 加载 [main.js](src/static/js/main.js)
- 所有 import 路径必须包含完整扩展名 (`.js`)
- 配置修改在 [config/config.js](src/static/js/config/config.js) 中集中管理
- 支持 LocalStorage 持久化: `gemini_api_key`, `gemini_voice`, `gemini_language`, `video_fps`, `system_instruction`

## 调试指南

### 服务端调试
**Deno 环境:**
- `console.log()` 直接输出到终端
- 查看 WebSocket 连接日志: `[WebSocket] Client/Gemini message received`
- 环境变量检查: `console.log(Deno.env.get('GEMINI_API_KEY'))`

**Cloudflare Workers 环境:**
- 实时日志: `wrangler tail` (本地) 或 Cloudflare Dashboard → Workers → Logs
- 查看 WebSocket readyState 变化
- 检查 `env.__STATIC_CONTENT` 是否正确加载资源

### 前端调试
- **Logger 工具**: 打开浏览器控制台查看详细日志 ([utils/logger.js](src/static/js/utils/logger.js))
- **WebSocket 消息**: Network 面板 → WS 标签 → 查看实时消息流
- **LocalStorage**: Application 面板 → Local Storage → 查看持久化配置
- **Audio Worklets**: 检查 `audioWorklet.addModule()` 是否成功加载
- **摄像头/麦克风权限**: 控制台会显示 `getUserMedia` 权限请求结果

### 常见问题排查

**1. 400: User location not supported (Cloudflare)**
```
原因: 部分地区 Cloudflare 路由到香港节点被 Gemini 拒绝
解决方案:
  - 切换到 Deno Deploy 部署
  - 或绑定自定义域名 (Cloudflare Dashboard → Workers → Settings → Triggers)
```

**2. WebSocket 连接失败**
```
检查项:
  - API Key 是否有效 (访问 https://aistudio.google.com 验证)
  - WebSocket URL 格式: wss://{domain}/ws/google.ai.generativelanguage...
  - 浏览器控制台是否显示 CORS 错误
  - 服务端日志是否显示 "Connected to Gemini API"
```

**3. 静态文件 404**
```
Deno 环境:
  - 确认文件存在于 src/static/ 目录
  - 检查文件路径大小写是否正确
  - 查看 getContentType() 是否支持该文件扩展名

Workers 环境:
  - 检查 wrangler.toml 的 assets.directory 配置
  - 确认文件已包含在部署包中
  - 使用 wrangler dev 本地测试静态资源
```

**4. Audio Worklet 加载失败**
```
检查项:
  - 确认 worklets/ 目录下的 .js 文件可访问
  - 检查 CORS 头是否正确设置
  - AudioContext 必须在用户交互后创建 (Chrome 安全策略)
```

**5. 麦克风/摄像头无法启用**
```
常见原因:
  - HTTPS 要求: 必须使用 https:// 或 localhost
  - 权限被拒绝: 检查浏览器地址栏的权限图标
  - 设备占用: 其他应用可能正在使用设备
```

## 扩展开发

### 添加新的 Function Calling Tool
Function Calling 工具允许 Gemini 调用外部函数获取实时数据。

**步骤:**
1. 在 [src/static/js/tools/](src/static/js/tools/) 创建新工具文件 (如 `my-tool.js`)
2. 定义工具的 schema (符合 Gemini Function Calling 规范)
3. 实现 handler 函数处理工具调用
4. 在 [tool-manager.js](src/static/js/tools/tool-manager.js) 中注册工具

**参考实现:**
- [google-search.js](src/static/js/tools/google-search.js): Google 搜索集成
- [weather-tool.js](src/static/js/tools/weather-tool.js): 天气查询示例

**工具结构模板:**
```javascript
export const myToolDeclaration = {
  name: "my_tool_name",
  description: "详细描述工具的功能",
  parameters: {
    type: "object",
    properties: {
      param1: { type: "string", description: "参数说明" }
    },
    required: ["param1"]
  }
};

export async function handleMyTool(functionCall) {
  const { param1 } = functionCall.args;
  // 实现工具逻辑
  return { result: "..." };
}
```

### 修改 API 转换逻辑
OpenAI 到 Gemini 的 API 格式转换在 [src/api_proxy/worker.mjs](src/api_proxy/worker.mjs) 实现。

**关键转换点:**
- `handleCompletions()`: Chat completions 转换 (支持 streaming 和 non-streaming)
- `handleEmbeddings()`: Embeddings 转换
- `handleModels()`: 模型列表映射

**修改指南:**
1. 理解 OpenAI API 和 Gemini API 的差异 (参考 [openai-gemini](https://github.com/PublicAffairs/openai-gemini) 项目)
2. 注意处理 streaming 和 non-streaming 两种模式
3. 确保 CORS 头正确设置 (`fixCors()`)
4. 测试各种 content 类型: text, image_url, file 等

### 调整前端配置
集中式配置管理在 [src/static/js/config/config.js](src/static/js/config/config.js)。

**可配置项:**
- `API.VERSION`: Gemini API 版本 (当前: `v1beta`)
- `API.MODEL_NAME`: 使用的模型 (当前: `gemini-2.0-flash-exp`)
- `SYSTEM_INSTRUCTION.TEXT`: 默认系统指令
- `AUDIO.SAMPLE_RATE`: 音频采样率 (16000 Hz)
- `AUDIO.OUTPUT_SAMPLE_RATE`: 输出采样率 (24000 Hz)

**注意事项:**
- 配置修改后刷新页面即生效 (无需重启服务)
- 用户自定义的系统指令会覆盖默认值 (存储在 LocalStorage)
- 修改音频采样率可能影响音质和性能

### 添加新的音视频功能
**音频系统** (基于 Web Audio API):
- [audio-recorder.js](src/static/js/audio/audio-recorder.js): 麦克风录音
- [audio-streamer.js](src/static/js/audio/audio-streamer.js): 音频播放流
- [worklets/](src/static/js/audio/worklets/): Audio Worklet 处理器

**视频系统**:
- [video-manager.js](src/static/js/video/video-manager.js): 摄像头管理 (支持帧率控制)
- [screen-recorder.js](src/static/js/video/screen-recorder.js): 屏幕共享录制

**扩展示例:**
- 添加音频效果器: 在 worklets/ 创建新的 AudioWorkletProcessor
- 实现视频滤镜: 使用 Canvas API 处理视频帧
- 支持多摄像头切换: 扩展 VideoManager 类
