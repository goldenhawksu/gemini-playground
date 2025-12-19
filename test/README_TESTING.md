# Gemini Playground 测试指南

## 📋 测试方案概览

项目包含多种测试方式,覆盖从后端 API 到前端 UI 的完整功能。

---

## 🔧 方案 1: Node.js WebSocket 测试 (推荐用于快速验证)

**适用场景**: 验证 WebSocket 连接、API Key 配置、服务器响应

### 前置条件
```bash
npm install ws  # 如果未安装
```

### 运行测试

#### 测试本地服务器
```bash
# 1. 启动本地 Deno 服务器 (另一个终端)
deno task start

# 2. 运行连接测试
node test/test_deploy_connection.js http://localhost:8000
```

#### 测试 Deno Deploy 部署
```bash
node test/test_deploy_connection.js https://talk.aesc.ai YOUR_API_KEY
```

### 测试内容
- ✅ 配置 API 端点响应
- ✅ WebSocket 连接建立
- ✅ API Key 验证
- ✅ Gemini API 可用性检查

---

## 🎭 方案 2: Playwright UI 自动化测试

**适用场景**: 完整的浏览器端功能测试,包括 UI 交互、响应式设计、LocalStorage

### 安装 Playwright
```bash
npm install -D playwright
npx playwright install chromium
```

### 运行测试

#### 无头模式 (自动化 CI)
```bash
# 测试本地服务器
node test/playwright_ui_test.js http://localhost:8000 YOUR_API_KEY
```

#### 手动交互模式 (观察浏览器行为)
```bash
# 设置环境变量以保持浏览器打开
MANUAL_TEST=1 node test/playwright_ui_test.js https://talk.aesc.ai YOUR_API_KEY
```

### 测试内容
- ✅ 页面加载和标题
- ✅ 关键 UI 元素可见性 (9个核心组件)
- ✅ 配置面板切换
- ✅ API Key 输入和 WebSocket 连接
- ✅ 语音选择功能
- ✅ 文本消息输入和发送
- ✅ 麦克风按钮交互
- ✅ 响应式设计 (桌面/移动端)
- ✅ LocalStorage 持久化
- ✅ 网络请求监控

### 输出
- 📸 截图保存在 `test/screenshots/`
- 🎥 视频录制保存在 `test/videos/`
- 📊 测试结果保存在 `test/playwright_test_results.json`

---

## 🌐 方案 3: Claude MCP Playwright 工具测试

**适用场景**: 在 Claude Code 环境中直接测试,无需安装依赖

### 使用方法

在 Claude Code 中运行:

```
使用 MCP Playwright 工具测试 http://localhost:8000
```

或使用 Playwright MCP 工具的 API:
- `mcp__Playwright__browser_navigate`: 导航到页面
- `mcp__Playwright__browser_snapshot`: 获取页面快照
- `mcp__Playwright__browser_click`: 点击元素
- `mcp__Playwright__browser_type`: 输入文本
- `mcp__Playwright__browser_take_screenshot`: 截图

### 示例测试流程
1. 导航到应用 URL
2. 获取页面快照查看元素
3. 输入 API Key
4. 点击 Connect 按钮
5. 截图验证连接状态

---

## 🚀 快速开始 (推荐流程)

### Step 1: 启动本地服务器
```bash
deno task start
# 访问 http://localhost:8000
```

### Step 2: 快速连接测试
```bash
node test/test_deploy_connection.js http://localhost:8000
```

### Step 3: 完整 UI 测试 (可选)
```bash
# 安装 Playwright (首次)
npm install -D playwright
npx playwright install chromium

# 运行测试
node test/playwright_ui_test.js http://localhost:8000 YOUR_API_KEY
```

---

## 📊 部署后验证清单

部署到 Deno Deploy 或 Cloudflare Workers 后,按以下顺序验证:

### ✅ 1. 配置 API 检查
```bash
curl https://your-domain.com/api/config
```
预期响应:
```json
{
  "modelName": "gemini-2.0-flash-exp",
  "hasDefaultApiKey": true
}
```

### ✅ 2. 静态资源检查
访问 `https://your-domain.com/`
- 页面能正常加载
- CSS 和 JS 文件加载成功 (检查 Network 面板)

### ✅ 3. WebSocket 连接测试
```bash
node test/test_deploy_connection.js https://your-domain.com YOUR_API_KEY
```

### ✅ 4. 手动功能测试
1. 打开浏览器访问部署的 URL
2. 输入 API Key (或使用默认)
3. 点击 "Connect"
4. 观察连接状态变为 "Connected" 或 "Ready to chat"
5. 尝试发送文本消息
6. (可选) 启用麦克风进行语音对话

---

## 🐛 常见问题排查

### WebSocket 连接失败 (Code 1006)
- **检查**: Deno Deploy 日志 (https://dash.deno.com/)
- **原因**: Gemini API 拒绝连接、API Key 无效
- **解决**: 验证 GEMINI_API_KEY 环境变量

### 静态文件 404
- **Deno**: 确认文件在 `src/static/` 目录
- **Cloudflare**: 检查 `wrangler.toml` 的 `assets.directory` 配置

### API Key 无效
```bash
# 验证 API Key
curl "https://generativelanguage.googleapis.com/v1beta/models?key=YOUR_API_KEY"
```

---

## 📖 相关文档

- [DEPLOY.md](../DEPLOY.md): Deno Deploy 快速部署指南
- [CLAUDE.md](../CLAUDE.md): 项目架构和开发指南
- [README.md](../README.md): 项目介绍和使用方法

---

## 💡 高级用法

### 批量测试多个环境
```bash
#!/bin/bash
# test_all_envs.sh

ENVS=(
  "http://localhost:8000"
  "https://staging.your-domain.com"
  "https://prod.your-domain.com"
)

for ENV in "${ENVS[@]}"; do
  echo "Testing $ENV..."
  node test/test_deploy_connection.js "$ENV" "$API_KEY"
  echo "---"
done
```

### CI/CD 集成
```yaml
# .github/workflows/test.yml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: denoland/setup-deno@v1
      - name: Start server
        run: deno task start &
      - name: Run tests
        run: node test/test_deploy_connection.js http://localhost:8000
```

---

**祝测试顺利!** 🎉
