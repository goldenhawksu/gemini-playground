#!/usr/bin/env node

/**
 * Deno Deploy WebSocket 连接测试工具
 *
 * 用法:
 *   node test/test_deploy_connection.js https://talk.aesc.ai
 */

const DEPLOY_URL = process.argv[2] || 'http://localhost:8000';

console.log('🧪 Deno Deploy 连接测试');
console.log('═'.repeat(60));
console.log(`目标服务器: ${DEPLOY_URL}`);
console.log('');

// 测试 1: 配置 API
async function testConfigAPI() {
  console.log('📋 测试 1: 配置 API 端点');
  console.log('-'.repeat(60));

  try {
    const response = await fetch(`${DEPLOY_URL}/api/config`);

    if (!response.ok) {
      console.log(`❌ HTTP ${response.status}: ${response.statusText}`);
      return false;
    }

    const config = await response.json();
    console.log('✅ 配置 API 响应成功:');
    console.log(JSON.stringify(config, null, 2));
    console.log('');

    // 检查关键字段
    if (!config.hasDefaultApiKey) {
      console.log('⚠️  警告: 服务器未配置默认 API Key');
      console.log('   请在 Deno Deploy 控制台设置 GEMINI_API_KEY 环境变量');
    } else {
      console.log('✅ 服务器已配置默认 API Key');
    }

    console.log('');
    return true;
  } catch (error) {
    console.log(`❌ 请求失败: ${error.message}`);
    console.log('   请检查服务器是否运行');
    console.log('');
    return false;
  }
}

// 测试 2: WebSocket 连接
async function testWebSocketConnection() {
  console.log('🔌 测试 2: WebSocket 连接');
  console.log('-'.repeat(60));

  return new Promise((resolve) => {
    try {
      const wsUrl = DEPLOY_URL.replace('http://', 'ws://').replace('https://', 'wss://');
      const fullWsUrl = `${wsUrl}/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent`;

      console.log(`连接到: ${fullWsUrl}`);
      console.log('');

      const WebSocket = require('ws');
      const ws = new WebSocket(fullWsUrl);

      let connected = false;

      const timeout = setTimeout(() => {
        if (!connected) {
          console.log('❌ 连接超时 (10秒)');
          console.log('   可能的原因:');
          console.log('   - 服务器未运行');
          console.log('   - 防火墙阻止连接');
          console.log('   - WebSocket 路径错误');
          console.log('');
          ws.close();
          resolve(false);
        }
      }, 10000);

      ws.on('open', () => {
        connected = true;
        clearTimeout(timeout);
        console.log('✅ WebSocket 连接成功!');
        console.log('');
        console.log('📤 发送 setup 消息...');

        // 发送 setup 消息
        ws.send(JSON.stringify({
          setup: {
            model: "gemini-2.5-flash-native-audio-preview-12-2025",
            generationConfig: {
              responseModalities: "audio"
            }
          }
        }));

        // 等待响应
        setTimeout(() => {
          console.log('⏱️  等待服务器响应... (5秒)');
        }, 1000);

        setTimeout(() => {
          console.log('');
          console.log('🔍 如果没有收到响应,可能的原因:');
          console.log('   - API Key 未配置');
          console.log('   - API Key 无效');
          console.log('   - Gemini API 连接失败');
          console.log('');
          console.log('💡 查看 Deno Deploy 日志获取详细信息:');
          console.log('   https://dash.deno.com/ -> 你的项目 -> Logs 标签');
          console.log('');
          ws.close();
          resolve(true);
        }, 5000);
      });

      ws.on('message', (data) => {
        console.log('📩 收到服务器消息:');
        try {
          const json = JSON.parse(data.toString());
          console.log(JSON.stringify(json, null, 2));
        } catch {
          console.log(`   (二进制数据, ${data.length} 字节)`);
        }
        console.log('');
      });

      ws.on('error', (error) => {
        clearTimeout(timeout);
        console.log('❌ WebSocket 错误:');
        console.log(`   ${error.message}`);
        console.log('');
        resolve(false);
      });

      ws.on('close', (code, reason) => {
        clearTimeout(timeout);
        if (connected) {
          console.log('⚠️  WebSocket 连接关闭:');
          console.log(`   Code: ${code}`);
          console.log(`   Reason: ${reason || '(无)'}`);
          console.log('');

          if (code === 1008) {
            console.log('💡 代码 1008 通常表示:');
            console.log('   - API Key 缺失或无效');
            console.log('   - 服务器拒绝连接');
          } else if (code === 1006) {
            console.log('💡 代码 1006 通常表示:');
            console.log('   - 连接异常中断');
            console.log('   - 后端代理失败');
            console.log('   - Gemini API 拒绝连接');
          }
          console.log('');
        }
      });

    } catch (error) {
      console.log(`❌ 创建连接失败: ${error.message}`);
      console.log('');
      resolve(false);
    }
  });
}

// 测试 3: API Key 验证
async function testAPIKey(apiKey) {
  console.log('🔑 测试 3: API Key 验证');
  console.log('-'.repeat(60));

  if (!apiKey) {
    console.log('⚠️  跳过: 未提供 API Key');
    console.log('   使用方法: node test_deploy_connection.js <URL> <API_KEY>');
    console.log('');
    return true;
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );

    if (!response.ok) {
      console.log(`❌ API Key 无效 (HTTP ${response.status})`);
      const text = await response.text();
      console.log(`   错误: ${text}`);
      console.log('');
      console.log('💡 获取新的 API Key:');
      console.log('   https://makersuite.google.com/app/apikey');
      console.log('');
      return false;
    }

    const data = await response.json();
    console.log('✅ API Key 有效!');
    console.log(`   可用模型数量: ${data.models?.length || 0}`);

    // 检查是否支持 Live API
    const liveModel = data.models?.find(m =>
      m.name?.includes('flash') && m.supportedGenerationMethods?.includes('generateContent')
    );

    if (liveModel) {
      console.log(`   ✅ 支持 Gemini Live API`);
    } else {
      console.log(`   ⚠️  未找到支持 Live API 的模型`);
    }
    console.log('');
    return true;
  } catch (error) {
    console.log(`❌ 请求失败: ${error.message}`);
    console.log('');
    return false;
  }
}

// 主测试流程
async function runTests() {
  const apiKey = process.argv[3];

  console.log('开始测试...');
  console.log('');

  // 测试 1
  const configOk = await testConfigAPI();

  // 测试 2
  if (configOk) {
    await testWebSocketConnection();
  }

  // 测试 3
  if (apiKey) {
    await testAPIKey(apiKey);
  }

  console.log('═'.repeat(60));
  console.log('✅ 测试完成');
  console.log('');
  console.log('📖 查看完整诊断文档:');
  console.log('   docs/deploy_websocket_diagnosis.md');
  console.log('');
}

// 运行测试
runTests().catch(error => {
  console.error('💥 测试脚本错误:', error);
  process.exit(1);
});
