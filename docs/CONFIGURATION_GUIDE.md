# 📖 环境变量和自定义配置使用指南

## 快速开始

### 1. 设置环境变量 (可选)

#### Windows (PowerShell)
```powershell
$env:GEMINI_MODEL_NAME="models/gemini-2.5-flash-native-audio-preview-12-2025"
$env:GEMINI_API_KEY="your-api-key-here"
deno task start
```

#### Linux/Mac
```bash
export GEMINI_MODEL_NAME="models/gemini-2.5-flash-native-audio-preview-12-2025"
export GEMINI_API_KEY="your-api-key-here"
deno task start
```

#### Deno Deploy
1. 访问 https://dash.deno.com/
2. 选择项目 → Settings → Environment Variables
3. 添加变量:
   - `GEMINI_MODEL_NAME`: `models/gemini-2.5-flash-native-audio-preview-12-2025`
   - `GEMINI_API_KEY`: 您的 API Key

### 2. 使用 Web 界面覆盖配置

1. 打开浏览器访问 http://localhost:8000 (本地) 或 https://talk.aesc.ai (Deno Deploy)
2. 点击右上角设置图标 ⚙️
3. 在 "Model Name" 输入框中输入自定义模型名称
   - 留空: 使用服务器默认配置
   - 输入值: 覆盖默认配置
4. 点击 "Confirm" 保存设置
5. 输入 API Key 并点击 "Connect"

---

## 支持的环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `GEMINI_MODEL_NAME` | 默认模型名称 | `models/gemini-2.5-flash-native-audio-preview-12-2025` |
| `GEMINI_BASE_URL` | API Base URL | `wss://generativelanguage.googleapis.com` |
| `GEMINI_API_KEY` | API 密钥 | (无) |
| `LIVEAPI_PROXY` | 代理服务器 (仅记录) | (无) |
| `PORT` | 服务器端口 | `8000` |

---

## 配置优先级

```
用户 Web 输入 > 服务器环境变量 > 代码默认值
```

### 示例

| 场景 | 环境变量 | Web 输入 | 最终使用 |
|------|----------|----------|----------|
| 场景 1 | (未设置) | (空白) | 代码默认值 |
| 场景 2 | `gemini-2.0-flash-exp` | (空白) | `gemini-2.0-flash-exp` |
| 场景 3 | `gemini-2.0-flash-exp` | `gemini-2.5-flash-...` | `gemini-2.5-flash-...` |

---

## 常见问题

### Q: 如何查看当前使用的模型?
A: 连接成功后,日志区域会显示 "Connected to Gemini (模型名称)"

### Q: 代理配置如何使用?
A: 目前 `LIVEAPI_PROXY` 仅用于记录,Deno 原生 WebSocket 不支持 SOCKS5 代理。
**推荐解决方案**: 使用 Deno Deploy 部署或本地使用 VPN。

### Q: 如何测试不同的模型?
A:
1. 方法 1: 在 Web 界面的 "Model Name" 输入框中输入模型名称
2. 方法 2: 设置环境变量 `GEMINI_MODEL_NAME` 并重启服务器

### Q: API Key 存储在哪里?
A: API Key 仅存储在浏览器的 LocalStorage 中,不会发送到服务器(除了连接 Gemini API 时)。

---

## 移动设备使用

Web 界面已针对移动设备优化:
- 响应式布局
- 触摸友好的按钮
- 配置面板自动折叠

在移动端打开配置面板:
1. 点击右上角设置图标 ⚙️
2. 配置选项会展开
3. 设置完成后点击 "Confirm"

---

## 安全提示

1. ✅ **不要**在代码中硬编码 API Key
2. ✅ 使用环境变量或 Deno Deploy Secrets
3. ✅ 定期轮换 API Key
4. ✅ 不要将 API Key 提交到 Git

---

## 技术支持

如有问题,请参考:
- [完整优化报告](OPTIMIZATION_REPORT_2025-12-19.md)
- [项目文档](../CLAUDE.md)
- [测试报告](../test/FINAL_REPORT.md)

---

_最后更新: 2025-12-19_
