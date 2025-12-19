#!/usr/bin/env node

/**
 * Gemini 模型测试脚本
 * 测试不同模型在 Live API 中的可用性
 */

const API_KEY = process.argv[2] || process.env.GEMINI_API_KEY;

if (!API_KEY) {
  console.log('❌ 请提供 API Key');
  console.log('用法: node test_models_availability.js YOUR_API_KEY');
  process.exit(1);
}

// 要测试的模型列表
const MODELS_TO_TEST = [
  'gemini-2.5-flash-native-audio-preview-12-2025',
  'gemini-2.0-flash-exp',
  'models/gemini-2.0-flash-exp',
  'gemini-2.0-flash-thinking-exp-1219',
  'gemini-exp-1206',
];

console.log('🔍 测试 Gemini 模型可用性');
console.log('═'.repeat(70));
console.log('');

// 测试 REST API 可用模型
async function testRESTAPI() {
  console.log('📋 步骤 1: 查询 REST API 可用模型');
  console.log('-'.repeat(70));

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`
    );

    if (!response.ok) {
      console.log(`❌ API 请求失败: ${response.status} ${response.statusText}`);
      return [];
    }

    const data = await response.json();
    const models = data.models || [];

    console.log(`✅ 找到 ${models.length} 个可用模型`);
    console.log('');

    // 筛选支持 generateContent 的模型
    const liveModels = models.filter(m =>
      m.supportedGenerationMethods?.includes('generateContent')
    );

    console.log(`📡 支持 generateContent 的模型 (${liveModels.length} 个):`);
    liveModels.forEach(m => {
      const name = m.name.replace('models/', '');
      console.log(`  - ${name}`);
      if (m.displayName) console.log(`    显示名称: ${m.displayName}`);
    });
    console.log('');

    return liveModels.map(m => m.name.replace('models/', ''));
  } catch (error) {
    console.log(`❌ 错误: ${error.message}`);
    return [];
  }
}

// 测试 WebSocket Live API
async function testWebSocketConnection(modelName) {
  console.log(`🔌 测试模型: ${modelName}`);
  console.log('-'.repeat(70));

  return new Promise((resolve) => {
    try {
      const WebSocket = require('ws');
      const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${API_KEY}`;

      const ws = new WebSocket(wsUrl);
      let connected = false;
      let setupSent = false;

      const timeout = setTimeout(() => {
        if (!setupSent) {
          console.log('❌ 连接超时 (5秒)');
          ws.close();
          resolve({ success: false, error: 'timeout' });
        }
      }, 5000);

      ws.on('open', () => {
        connected = true;
        console.log('  ✅ WebSocket 连接成功');

        // 发送 setup 消息
        const setupMessage = {
          setup: {
            model: modelName,
            generationConfig: {
              responseModalities: 'audio'
            }
          }
        };

        ws.send(JSON.stringify(setupMessage));
        setupSent = true;
        console.log('  📤 Setup 消息已发送');
      });

      ws.on('message', (data) => {
        clearTimeout(timeout);
        const message = JSON.parse(data.toString());

        if (message.setupComplete) {
          console.log('  ✅ Setup 完成 - 模型可用!');
          ws.close();
          resolve({ success: true, model: modelName });
        } else if (message.error) {
          console.log(`  ❌ 错误: ${message.error.message || JSON.stringify(message.error)}`);
          ws.close();
          resolve({ success: false, error: message.error });
        } else {
          console.log('  📩 收到消息:', JSON.stringify(message));
        }
      });

      ws.on('error', (error) => {
        clearTimeout(timeout);
        console.log(`  ❌ WebSocket 错误: ${error.message}`);
        resolve({ success: false, error: error.message });
      });

      ws.on('close', (code, reason) => {
        clearTimeout(timeout);
        if (connected && !setupSent) {
          const reasonText = reason?.toString() || '(无原因)';
          console.log(`  ❌ 连接关闭: code=${code}, reason=${reasonText}`);
          resolve({ success: false, error: `close:${code}:${reasonText}` });
        }
      });

    } catch (error) {
      console.log(`  ❌ 异常: ${error.message}`);
      resolve({ success: false, error: error.message });
    }
  });
}

// 主测试流程
async function runTests() {
  // 步骤 1: 查询可用模型
  const availableModels = await testRESTAPI();

  console.log('');
  console.log('═'.repeat(70));
  console.log('📋 步骤 2: 测试 WebSocket Live API 连接');
  console.log('═'.repeat(70));
  console.log('');

  // 步骤 2: 测试每个模型
  const results = [];

  for (const model of MODELS_TO_TEST) {
    const result = await testWebSocketConnection(model);
    results.push({ model, ...result });
    console.log('');

    // 等待一下避免请求过快
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // 汇总结果
  console.log('═'.repeat(70));
  console.log('📊 测试结果汇总');
  console.log('═'.repeat(70));
  console.log('');

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`✅ 可用模型 (${successful.length}):`);
  successful.forEach(r => {
    console.log(`  - ${r.model}`);
  });
  console.log('');

  console.log(`❌ 不可用模型 (${failed.length}):`);
  failed.forEach(r => {
    console.log(`  - ${r.model}`);
    if (r.error) {
      const errorStr = typeof r.error === 'string' ? r.error : JSON.stringify(r.error);
      console.log(`    原因: ${errorStr}`);
    }
  });
  console.log('');

  // 推荐配置
  if (successful.length > 0) {
    console.log('🎯 推荐配置:');
    console.log('');
    console.log('src/static/js/config/config.js:');
    console.log(`  MODEL_NAME: '${successful[0].model}'`);
    console.log('');
    console.log('Deno Deploy 环境变量:');
    console.log(`  GEMINI_MODEL_NAME=${successful[0].model}`);
    console.log('');
  }

  console.log('═'.repeat(70));
  console.log('✅ 测试完成');
  console.log('');

  // 保存结果
  const fs = require('fs');
  fs.writeFileSync(
    'test/model_availability_results.json',
    JSON.stringify({ timestamp: new Date().toISOString(), availableModels, results }, null, 2)
  );
  console.log('📝 结果已保存到: test/model_availability_results.json');
}

// 运行测试
runTests().catch(error => {
  console.error('💥 测试失败:', error);
  process.exit(1);
});
