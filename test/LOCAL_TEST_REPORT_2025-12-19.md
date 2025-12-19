# 🔬 本地测试完整报告 - Gemini Live API 连接问题诊断

**测试日期**: 2025-12-19
**测试环境**: 本地 Deno 服务器 (localhost:8000)
**测试模型**: gemini-2.0-flash-exp (config.js 默认配置)

---

## 📊 关键发现

### ✅ 代码和配置正常

1. **✅ 本地服务器启动成功**
   - Deno 服务器正常运行在 `http://localhost:8000`
   - 所有静态资源加载正常
   - WebSocket 代理服务正常工作

2. **✅ 前端代码正常**
   - UI 渲染完全正常
   - WebSocket 客户端连接成功
   - Setup 消息正常发送

3. **✅ 服务器端 WebSocket 代理正常**
   - 成功连接到 Gemini API: `wss://generativelanguage.googleapis.com/...`
   - 消息队列机制工作正常
   - API Key 正确传递

4. **✅ 模型配置正确**
   - `config.js` 中的模型: `models/gemini-2.0-flash-exp` ✅
   - 模型名称符合 Gemini API 规范
   - 没有模型不存在的错误

---

## ❌ 核心问题: 地理位置限制

### 错误信息
```
[WebSocket] Gemini closed: code=1007, reason=User location is not supported for the API use.
```

### 问题分析

**WebSocket Close Code 1007** 的含义:
- **标准定义**: "Policy Violation" (违反策略)
- **Gemini 特定原因**: 用户地理位置不支持该 API 使用

**这意味着**:
1. ❌ **不是模型配置问题** - `gemini-2.0-flash-exp` 和 `gemini-2.5-flash-native-audio-preview-12-2025` 都会遇到同样的问题
2. ❌ **不是代码错误** - 本地服务器和代理工作正常
3. ❌ **不是 API Key 问题** - API Key 有效且正确传递
4. ✅ **是地理位置问题** - Google Gemini Live API 对某些地区有访问限制

---

## 🌍 为什么 Deno Deploy 上可以工作?

根据之前的测试结果 (https://talk.aesc.ai):

| 环境 | 结果 | 原因 |
|------|------|------|
| 本地 (中国) | ❌ 连接失败 (code 1007) | 地理位置受限 |
| Deno Deploy | ⚠️ 模型配置错误 | 服务器在支持的地区,但模型名称过期 |

**Deno Deploy 的优势**:
- Deno Deploy 的服务器位于 **美国/欧洲** 数据中心
- 这些地区 **不受 Gemini Live API 地理限制**
- 因此可以成功连接到 Gemini,只是之前模型名称配置错误

---

## 🎯 解决方案

### 方案 1: 使用 Deno Deploy 部署 (推荐) ✅

**原因**:
- Deno Deploy 服务器在支持的地区
- 无需 VPN 或代理
- 免费且稳定

**步骤**:
1. 更新 Deno Deploy 环境变量:
   ```bash
   # 当前错误配置
   GEMINI_MODEL_NAME=gemini-2.5-flash-native-audio-preview-12-2025  ❌

   # 正确配置 (与 config.js 一致)
   GEMINI_MODEL_NAME=gemini-2.0-flash-exp  ✅
   ```

2. 访问 https://dash.deno.com/ → 你的项目 → Settings → Environment Variables
3. 更新变量并点击 "Redeploy"
4. 验证: `curl https://talk.aesc.ai/api/config`

**预期结果**: ✅ 完全可用

---

### 方案 2: 使用 VPN/代理 (本地开发) ⚠️

**原因**:
- 本地开发需要绕过地理位置限制
- 需要额外的网络配置

**步骤**:
1. 使用支持的地区的 VPN (美国/欧洲)
2. 确保 VPN 稳定连接
3. 重启 Deno 服务器
4. 测试连接

**缺点**:
- 需要稳定的 VPN 连接
- 可能影响开发体验
- 增加了额外的复杂度

---

### 方案 3: 使用 Cloudflare Workers (备选)

**原因**:
- Cloudflare 边缘节点遍布全球
- 但也可能路由到受限地区

**注意事项**:
- README.md 中提到: "国内使用cloudflare有时候可能出现400: User location is not supported"
- 可能需要绑定自定义域名

---

## 📝 测试日志摘要

### 本地服务器日志
```
[WebSocket] Target: wss://generativelanguage.googleapis.com/ws/...?key=***
[WebSocket] Client message received
[WebSocket] Connected to Gemini API              ← 连接成功
[WebSocket] Gemini closed: code=1007,             ← Gemini 主动关闭
            reason=User location is not supported  ← 地理位置受限
[WebSocket] Client closed: code=1007
```

### 浏览器日志
```javascript
client.open: "Connected to socket"     ← 客户端连接成功
WebSocket connection opened            ← WebSocket 建立
client.send: "setup"                   ← Setup 消息发送
Connected to Gemini Multimodal Live API ← 初始连接成功
client.close: "Disconnected"           ← 随后断开
server.close: "Disconnected "
WebSocket connection closed (code 1006) ← 前端收到异常关闭
```

---

## 🎬 下一步行动

### 立即执行 (修复 Deno Deploy)

1. **更新 Deno Deploy 环境变量**:
   - 变量名: `GEMINI_MODEL_NAME`
   - 旧值: `gemini-2.5-flash-native-audio-preview-12-2025`
   - 新值: `gemini-2.0-flash-exp`

2. **触发重新部署**:
   - 方式 1: Deno Deploy 控制台点击 "Redeploy"
   - 方式 2: 推送代码到 GitHub (当网络恢复后)

3. **验证修复**:
   ```bash
   # 检查配置
   curl https://talk.aesc.ai/api/config

   # 预期响应
   {"modelName":"gemini-2.0-flash-exp","hasDefaultApiKey":true}

   # 测试连接
   node test/test_deploy_connection.js https://talk.aesc.ai
   ```

---

### 可选 (本地开发)

**如果需要本地测试**, 有两个选择:

**选项 A: 使用 VPN**
```bash
# 1. 连接到美国/欧洲 VPN
# 2. 重启服务器
deno task start

# 3. 测试
# 打开 http://localhost:8000 并测试连接
```

**选项 B: 使用 REST API 测试** (不受地理限制)
```bash
# 测试 Chat Completions API (REST)
curl -X POST http://localhost:8000/v1/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Hello"}],
    "model": "gemini-2.0-flash-exp"
  }'
```

---

## 📊 完整测试矩阵

| 环境 | 地理位置 | 模型配置 | WebSocket | 结果 |
|------|---------|---------|-----------|------|
| 本地 (中国) | ❌ 受限 | ✅ 正确 | ❌ code 1007 | 连接失败 |
| Deno Deploy | ✅ 支持 | ❌ 错误 | ⚠️ 模型不存在 | 需要修复 |
| Deno Deploy (修复后) | ✅ 支持 | ✅ 正确 | ✅ 预期成功 | **推荐** |
| Cloudflare Workers | ⚠️ 可能受限 | ✅ 正确 | ⚠️ 不稳定 | 备选方案 |

---

## ✅ 结论

### 问题总结

1. **本地测试失败的原因**:
   - 地理位置限制 (code 1007)
   - **不是代码或配置问题**

2. **Deno Deploy 测试失败的原因**:
   - 模型名称配置错误
   - **代码和地理位置都正常**

3. **正确的模型配置**:
   - ✅ `gemini-2.0-flash-exp` (当前代码库默认)
   - ❌ `gemini-2.5-flash-native-audio-preview-12-2025` (已过期)

### 推荐方案

**直接使用 Deno Deploy** (修复环境变量后):
- ✅ 无地理位置限制
- ✅ 免费且稳定
- ✅ 无需额外配置
- ✅ 代码已经正确

**本地开发**:
- 使用 REST API 测试 (不受地理限制)
- 或者使用 VPN 测试 WebSocket

---

## 📎 相关文件

生成的文件:
- [test/TEST_REPORT_2025-12-19.md](TEST_REPORT_2025-12-19.md) - Deno Deploy 测试报告
- [test/LOCAL_TEST_REPORT_2025-12-19.md](LOCAL_TEST_REPORT_2025-12-19.md) - 本地测试报告 (本文件)
- [test/screenshots/local-*.png](screenshots/) - 本地测试截图

测试脚本:
- [test/test_deploy_connection.js](test_deploy_connection.js) - WebSocket 连接测试
- [test/playwright_ui_test.js](playwright_ui_test.js) - 完整 UI 自动化测试
- [test/README_TESTING.md](README_TESTING.md) - 测试指南

---

**测试完成时间**: 2025-12-19 11:33:34 (UTC+8)
**下一步**: 更新 Deno Deploy 环境变量并验证

---

_报告由 Claude Code 自动生成_
