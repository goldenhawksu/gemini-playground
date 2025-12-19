/**
 * Gemini 模型功能可用性测试脚本
 * 测试多个 Gemini 模型的基本对话、多模态和工具调用能力
 */

const API_KEY = 'AIzaSyBY47NHfk5X4gJ1c1fLauxHIuhN6IZb-Y4';
const BASE_URL = 'https://generativelanguage.googleapis.com';

// 要测试的模型列表
const MODELS_TO_TEST = [
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-3-flash-preview',
  'gemini-3-pro-preview'
];

// 测试结果存储
const testResults = [];

/**
 * 发送 HTTP 请求到 Gemini API
 */
async function callGeminiAPI(model, endpoint, payload) {
  const url = `${BASE_URL}/v1beta/models/${model}:${endpoint}?key=${API_KEY}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();

  return {
    status: response.status,
    ok: response.ok,
    data: data
  };
}

/**
 * 测试 1: 基本文本对话能力
 */
async function testBasicChat(model) {
  console.log(`\n[${model}] 测试基本对话功能...`);

  try {
    const result = await callGeminiAPI(model, 'generateContent', {
      contents: [{
        parts: [{
          text: "请用一句话介绍你自己。"
        }]
      }]
    });

    if (result.ok && result.data.candidates) {
      const text = result.data.candidates[0]?.content?.parts?.[0]?.text;
      console.log(`✅ 基本对话成功`);
      console.log(`   回复: ${text?.substring(0, 100)}...`);
      return { success: true, response: text };
    } else {
      console.log(`❌ 基本对话失败: ${JSON.stringify(result.data)}`);
      return { success: false, error: result.data };
    }
  } catch (error) {
    console.log(`❌ 基本对话异常: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * 测试 2: 流式响应能力
 */
async function testStreamingChat(model) {
  console.log(`\n[${model}] 测试流式响应功能...`);

  try {
    const url = `${BASE_URL}/v1beta/models/${model}:streamGenerateContent?key=${API_KEY}&alt=sse`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: "说一个笑话"
          }]
        }]
      })
    });

    if (response.ok) {
      const text = await response.text();
      const hasStreamData = text.includes('data:');

      if (hasStreamData) {
        console.log(`✅ 流式响应成功`);
        return { success: true, hasStreaming: true };
      } else {
        console.log(`⚠️ 返回成功但无流式数据`);
        return { success: true, hasStreaming: false };
      }
    } else {
      const data = await response.json();
      console.log(`❌ 流式响应失败: ${JSON.stringify(data)}`);
      return { success: false, error: data };
    }
  } catch (error) {
    console.log(`❌ 流式响应异常: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * 测试 3: 多模态能力 (图像理解)
 */
async function testMultimodal(model) {
  console.log(`\n[${model}] 测试多模态功能 (图像理解)...`);

  // 一个简单的红色方块 PNG 图像 (Base64)
  const testImage = "iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mP8z8BQz0AEYBxVSF+FABJADveWkH6oAAAAAElFTkSuQmCC";

  try {
    const result = await callGeminiAPI(model, 'generateContent', {
      contents: [{
        parts: [
          {
            text: "这张图片是什么颜色?"
          },
          {
            inlineData: {
              mimeType: "image/png",
              data: testImage
            }
          }
        ]
      }]
    });

    if (result.ok && result.data.candidates) {
      const text = result.data.candidates[0]?.content?.parts?.[0]?.text;
      console.log(`✅ 多模态成功`);
      console.log(`   回复: ${text?.substring(0, 100)}...`);
      return { success: true, response: text };
    } else {
      console.log(`❌ 多模态失败: ${JSON.stringify(result.data)}`);
      return { success: false, error: result.data };
    }
  } catch (error) {
    console.log(`❌ 多模态异常: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * 测试 4: Function Calling 能力
 */
async function testFunctionCalling(model) {
  console.log(`\n[${model}] 测试 Function Calling 功能...`);

  try {
    const result = await callGeminiAPI(model, 'generateContent', {
      contents: [{
        parts: [{
          text: "北京今天的天气怎么样?"
        }]
      }],
      tools: [{
        functionDeclarations: [{
          name: "get_weather",
          description: "获取指定城市的天气信息",
          parameters: {
            type: "object",
            properties: {
              city: {
                type: "string",
                description: "城市名称"
              }
            },
            required: ["city"]
          }
        }]
      }]
    });

    if (result.ok && result.data.candidates) {
      const functionCall = result.data.candidates[0]?.content?.parts?.[0]?.functionCall;

      if (functionCall) {
        console.log(`✅ Function Calling 成功`);
        console.log(`   调用函数: ${functionCall.name}`);
        console.log(`   参数: ${JSON.stringify(functionCall.args)}`);
        return { success: true, functionCall: functionCall };
      } else {
        const text = result.data.candidates[0]?.content?.parts?.[0]?.text;
        console.log(`⚠️ 未触发 Function Calling (可能直接回答)`);
        console.log(`   回复: ${text?.substring(0, 100)}...`);
        return { success: true, noFunctionCall: true, response: text };
      }
    } else {
      console.log(`❌ Function Calling 失败: ${JSON.stringify(result.data)}`);
      return { success: false, error: result.data };
    }
  } catch (error) {
    console.log(`❌ Function Calling 异常: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * 测试单个模型的所有功能
 */
async function testModel(modelName) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`开始测试模型: ${modelName}`);
  console.log('='.repeat(60));

  const result = {
    model: modelName,
    timestamp: new Date().toISOString(),
    tests: {}
  };

  // 执行所有测试
  result.tests.basicChat = await testBasicChat(modelName);
  await new Promise(resolve => setTimeout(resolve, 1000)); // 等待 1 秒避免限流

  result.tests.streaming = await testStreamingChat(modelName);
  await new Promise(resolve => setTimeout(resolve, 1000));

  result.tests.multimodal = await testMultimodal(modelName);
  await new Promise(resolve => setTimeout(resolve, 1000));

  result.tests.functionCalling = await testFunctionCalling(modelName);
  await new Promise(resolve => setTimeout(resolve, 1000));

  // 计算成功率
  const tests = Object.values(result.tests);
  const successCount = tests.filter(t => t.success).length;
  result.successRate = `${successCount}/${tests.length}`;
  result.allPassed = successCount === tests.length;

  console.log(`\n[${modelName}] 测试完成 - 成功率: ${result.successRate}`);

  return result;
}

/**
 * 生成测试报告
 */
function generateReport(results) {
  console.log(`\n\n${'='.repeat(80)}`);
  console.log('测试报告汇总');
  console.log('='.repeat(80));
  console.log(`测试时间: ${new Date().toLocaleString('zh-CN')}`);
  console.log(`API KEY: ${API_KEY.substring(0, 10)}...${API_KEY.substring(API_KEY.length - 4)}`);
  console.log('='.repeat(80));

  // 汇总表格
  console.log('\n模型功能支持情况:');
  console.log('-'.repeat(80));
  console.log('模型名称'.padEnd(30) + '基本对话'.padEnd(10) + '流式响应'.padEnd(10) + '多模态'.padEnd(10) + 'Function'.padEnd(10) + '成功率');
  console.log('-'.repeat(80));

  results.forEach(result => {
    const basic = result.tests.basicChat.success ? '✅' : '❌';
    const stream = result.tests.streaming.success ? '✅' : '❌';
    const multi = result.tests.multimodal.success ? '✅' : '❌';
    const func = result.tests.functionCalling.success ? '✅' : '❌';

    console.log(
      result.model.padEnd(30) +
      basic.padEnd(10) +
      stream.padEnd(10) +
      multi.padEnd(10) +
      func.padEnd(10) +
      result.successRate
    );
  });

  console.log('-'.repeat(80));

  // 推荐模型
  const fullySupported = results.filter(r => r.allPassed);
  console.log('\n推荐使用的模型:');
  if (fullySupported.length > 0) {
    fullySupported.forEach(r => {
      console.log(`  ✅ ${r.model} - 所有功能完全支持`);
    });
  } else {
    console.log('  ⚠️ 没有模型通过所有测试');
  }

  // 详细错误信息
  const failedTests = results.filter(r => !r.allPassed);
  if (failedTests.length > 0) {
    console.log('\n⚠️ 存在问题的模型详情:');
    failedTests.forEach(result => {
      console.log(`\n  ${result.model}:`);
      Object.entries(result.tests).forEach(([testName, testResult]) => {
        if (!testResult.success) {
          console.log(`    ❌ ${testName}: ${JSON.stringify(testResult.error).substring(0, 100)}`);
        }
      });
    });
  }

  console.log('\n' + '='.repeat(80));
}

/**
 * 主函数
 */
async function main() {
  console.log('Gemini 模型功能可用性测试');
  console.log('='.repeat(80));
  console.log(`待测试模型: ${MODELS_TO_TEST.join(', ')}`);
  console.log('='.repeat(80));

  // 逐个测试每个模型
  for (const model of MODELS_TO_TEST) {
    const result = await testModel(model);
    testResults.push(result);

    // 在测试之间等待 2 秒
    if (model !== MODELS_TO_TEST[MODELS_TO_TEST.length - 1]) {
      console.log('\n等待 2 秒后继续下一个模型...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // 生成报告
  generateReport(testResults);

  // 保存详细结果到文件
  const fs = require('fs');
  const reportPath = 'test/model_test_results.json';
  fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2), 'utf-8');
  console.log(`\n详细测试结果已保存到: ${reportPath}`);
}

// 执行测试
main().catch(error => {
  console.error('测试执行失败:', error);
  process.exit(1);
});
