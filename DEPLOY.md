# 🚀 Deno Deploy 部署快速指南

## ✅ 你的情况

- ✅ 本地版本工作正常（音频对话功能正常）
- ✅ API Key 有效
- ✅ 模型配置正确：`gemini-2.5-flash-native-audio-preview-12-2025`
- ✅ 代码已回滚到稳定版本

---

## 📋 Deno Deploy 配置（3 步完成）

### 第 1 步：Entry Point 配置

在 Deno Deploy 控制台设置：

```
Entry Point: src/deno_deploy_index.ts
```

**⚠️ 关键**：
- ❌ 不是 `src/deno_index.ts`
- ✅ 必须是 `src/deno_deploy_index.ts`

---

### 第 2 步：环境变量配置

访问 https://dash.deno.com/ → 你的项目 → Settings → Environment Variables

添加：

```bash
GEMINI_API_KEY=AIzaSyBY47NHfk5X4gJ1c1fLauxHIuhN6IZb-Y4
GEMINI_MODEL_NAME=gemini-2.5-flash-native-audio-preview-12-2025
```

**💡 提示**：使用与本地 `.env` 文件相同的值！

---

### 第 3 步：部署

#### 方式 A：GitHub 自动部署（推荐）

```bash
git add .
git commit -m "Deploy to Deno Deploy"
git push origin main
```

等待 30-60 秒，Deno Deploy 自动部署。

#### 方式 B：deployctl 命令行

```bash
# 首次使用需要安装和登录
deno install -A --no-check -r -f https://deno.land/x/deploy/deployctl.ts
deployctl login

# 部署
deno task deploy-push
```

---

## 🧪 验证部署

### 1. 检查配置 API

访问：`https://talk.aesc.ai/api/config`

应该返回：
```json
{
  "modelName": "gemini-2.5-flash-native-audio-preview-12-2025",
  "hasDefaultApiKey": true
}
```

### 2. 测试连接

1. 访问 `https://talk.aesc.ai`
2. 点击 **Connect**
3. 应该看到 "✅ Ready to chat"

### 3. 查看 Deno Deploy 日志

在控制台 → Logs 标签，应该看到：

```
[WebSocket] ✅ Connected to Gemini API
[WebSocket] 📨 Sending 1 queued messages
```

**✅ 如果没有错误，说明部署成功！**

---

## 🎯 关键点总结

| 项目 | 本地开发 | Deno Deploy |
|------|----------|-------------|
| 入口文件 | `src/deno_index.ts` | `src/deno_deploy_index.ts` |
| 环境变量 | `.env` 文件 | Deploy 控制台配置 |
| 端口 | 8000 | 自动分配 |

---

## 📞 遇到问题？

### 常见错误 1：模型不支持

**症状**：
```
reason=gemini-2.5-flash-native-audio-preview-12-2025 is not found
```

**解决**：模型可能在 v1beta 已下线，尝试：
```bash
GEMINI_MODEL_NAME=gemini-2.0-flash-exp
```

### 常见错误 2：环境变量未生效

**症状**：
```
Default API Key: (未配置)
```

**解决**：
1. 确认在 Deploy 控制台设置了变量
2. 变量名大小写完全匹配
3. **保存后点击 "Redeploy"**

---

## 📚 详细文档

完整指南：[docs/deno_deploy_complete_guide.md](deno_deploy_complete_guide.md)

---

**祝部署顺利！** 🎉
# Last deploy: 2025年12月19日  7:56:07
