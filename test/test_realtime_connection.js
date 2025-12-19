/**
 * 完整的实时音视频功能测试脚本
 * 测试 WebSocket 连接和多模态交互
 */

const API_KEY = 'AIzaSyBY47NHfk5X4gJ1c1fLauxHIuhN6IZb-Y4';
const WS_URL = 'ws://localhost:8000/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent';

const MODEL_NAME = 'models/gemini-2.5-flash-native-audio-preview-12-2025';  // Live API 原生音频模型

// 测试结果收集
const testResults = [];

/**
 * 等待函数
 */
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 测试 1: WebSocket 连接和 Setup
 */
async function testWebSocketConnection() {
  console.log('\n' + '='.repeat(80));
  console.log('测试 1: WebSocket 连接和 Setup');
  console.log('='.repeat(80));

  return new Promise((resolve) => {
    const ws = new WebSocket(`${WS_URL}?key=${API_KEY}`);
    let setupSent = false;
    let setupAcknowledged = false;
    let startTime = Date.now();

    const timeout = setTimeout(() => {
      console.log('❌ 测试超时 (30秒)');
      ws.close();
      resolve({
        test: 'WebSocket连接',
        success: false,
        error: 'Timeout after 30 seconds',
        duration: Date.now() - startTime
      });
    }, 30000);

    ws.onopen = () => {
      console.log('✅ WebSocket 连接建立');

      // 发送 setup 消息 (原生音频模型需要 AUDIO 响应模式)
      const setupMessage = {
        setup: {
          model: MODEL_NAME,
          generationConfig: {
            responseModalities: ['AUDIO'],  // 原生音频模型必须使用 AUDIO
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: 'Puck'  // 男声
                }
              }
            }
          },
          systemInstruction: {
            parts: [
              {
                text: 'You are a helpful assistant. Please respond briefly.'
              }
            ]
          }
        }
      };

      console.log('📤 发送 setup 消息...');
      ws.send(JSON.stringify(setupMessage));
      setupSent = true;
    };

    ws.onmessage = async (event) => {
      try {
        let data = event.data;

        // 如果是 Blob,转换为文本
        if (data instanceof Blob) {
          data = await data.text();
        }

        const message = JSON.parse(data);
        console.log('📩 收到消息:', JSON.stringify(message, null, 2));

        if (message.setupComplete) {
          console.log('✅ Setup 完成');
          setupAcknowledged = true;

          clearTimeout(timeout);
          ws.close();

          resolve({
            test: 'WebSocket连接',
            success: true,
            setupSent: setupSent,
            setupAcknowledged: setupAcknowledged,
            duration: Date.now() - startTime
          });
        } else if (message.error) {
          console.error('❌ 收到错误:', message.error);
          clearTimeout(timeout);
          ws.close();

          resolve({
            test: 'WebSocket连接',
            success: false,
            error: message.error,
            duration: Date.now() - startTime
          });
        }
      } catch (error) {
        console.error('❌ 解析消息失败:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('❌ WebSocket 错误:', error);
      clearTimeout(timeout);
      resolve({
        test: 'WebSocket连接',
        success: false,
        error: 'WebSocket error',
        duration: Date.now() - startTime
      });
    };

    ws.onclose = (event) => {
      console.log(`⚠️ WebSocket 关闭: code=${event.code}, reason=${event.reason}`);

      if (!setupAcknowledged && setupSent) {
        clearTimeout(timeout);
        resolve({
          test: 'WebSocket连接',
          success: false,
          error: `Connection closed before setup complete (code ${event.code})`,
          closeCode: event.code,
          closeReason: event.reason,
          duration: Date.now() - startTime
        });
      }
    };
  });
}

/**
 * 测试 2: 文本消息发送和接收
 */
async function testTextMessage() {
  console.log('\n' + '='.repeat(80));
  console.log('测试 2: 文本消息发送和接收');
  console.log('='.repeat(80));

  return new Promise((resolve) => {
    const ws = new WebSocket(`${WS_URL}?key=${API_KEY}`);
    let setupComplete = false;
    let messageReceived = false;
    let startTime = Date.now();

    const timeout = setTimeout(() => {
      console.log('❌ 测试超时 (30秒)');
      ws.close();
      resolve({
        test: '文本消息',
        success: false,
        error: 'Timeout',
        duration: Date.now() - startTime
      });
    }, 30000);

    ws.onopen = () => {
      console.log('✅ WebSocket 连接建立');

      const setupMessage = {
        setup: {
          model: MODEL_NAME,
          generationConfig: {
            responseModalities: ['AUDIO'],  // 原生音频模型必须使用 AUDIO
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: 'Puck'  // 男声
                }
              }
            }
          },
          systemInstruction: {
            parts: [{ text: 'You are a helpful assistant. Respond with exactly: "Hello! I am ready."' }]
          }
        }
      };

      ws.send(JSON.stringify(setupMessage));
    };

    ws.onmessage = async (event) => {
      try {
        let data = event.data;
        if (data instanceof Blob) {
          data = await data.text();
        }

        const message = JSON.parse(data);

        if (message.setupComplete) {
          console.log('✅ Setup 完成');
          setupComplete = true;

          // 发送文本消息
          const textMessage = {
            clientContent: {
              turns: [
                {
                  role: 'user',
                  parts: [{ text: 'Hello, please respond!' }]
                }
              ],
              turnComplete: true
            }
          };

          console.log('📤 发送文本消息: "Hello, please respond!"');
          ws.send(JSON.stringify(textMessage));

        } else if (message.serverContent) {
          console.log('📩 收到 AI 回复');

          if (message.serverContent.modelTurn) {
            const parts = message.serverContent.modelTurn.parts;
            const textParts = parts.filter(p => p.text);
            const audioParts = parts.filter(p => p.inlineData && p.inlineData.mimeType.startsWith('audio/'));

            // 检查是否有文本或音频响应
            if (textParts.length > 0) {
              const responseText = textParts.map(p => p.text).join('');
              console.log(`✅ AI 文本回复: "${responseText.substring(0, 100)}..."`);
              messageReceived = true;
            }

            if (audioParts.length > 0) {
              console.log(`✅ AI 音频回复: 收到 ${audioParts.length} 个音频片段`);
              messageReceived = true;
            }

            // 如果收到任何响应,标记成功
            if (messageReceived) {
              clearTimeout(timeout);
              ws.close();

              resolve({
                test: '文本消息',
                success: true,
                responseText: textParts.length > 0 ? textParts.map(p => p.text).join('') : undefined,
                audioChunks: audioParts.length,
                duration: Date.now() - startTime
              });
            }
          }

          if (message.serverContent.turnComplete) {
            console.log('✅ AI 回复完成');
          }

        } else if (message.error) {
          console.error('❌ 收到错误:', message.error);
          clearTimeout(timeout);
          ws.close();

          resolve({
            test: '文本消息',
            success: false,
            error: message.error,
            duration: Date.now() - startTime
          });
        }
      } catch (error) {
        console.error('❌ 解析消息失败:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('❌ WebSocket 错误:', error);
      clearTimeout(timeout);
      resolve({
        test: '文本消息',
        success: false,
        error: 'WebSocket error',
        duration: Date.now() - startTime
      });
    };

    ws.onclose = (event) => {
      console.log(`⚠️ WebSocket 关闭: code=${event.code}`);

      if (!messageReceived && setupComplete) {
        clearTimeout(timeout);
        resolve({
          test: '文本消息',
          success: false,
          error: `Connection closed before receiving response (code ${event.code})`,
          duration: Date.now() - startTime
        });
      }
    };
  });
}

/**
 * 生成测试报告
 */
function generateReport(results) {
  console.log('\n\n' + '='.repeat(80));
  console.log('测试报告');
  console.log('='.repeat(80));
  console.log(`测试时间: ${new Date().toLocaleString('zh-CN')}`);
  console.log(`总测试数: ${results.length}`);
  console.log('='.repeat(80));

  console.log('\n测试结果:');
  console.log('-'.repeat(80));

  results.forEach((result, index) => {
    const status = result.success ? '✅ 通过' : '❌ 失败';
    const duration = result.duration ? `${(result.duration / 1000).toFixed(2)}s` : 'N/A';

    console.log(`\n${index + 1}. ${result.test} - ${status} (${duration})`);

    if (result.success) {
      if (result.setupSent) console.log(`   - Setup 消息已发送: ✅`);
      if (result.setupAcknowledged) console.log(`   - Setup 已确认: ✅`);
      if (result.responseText) console.log(`   - 收到回复: "${result.responseText.substring(0, 80)}..."`);
    } else {
      console.log(`   - 错误: ${result.error}`);
      if (result.closeCode) console.log(`   - 关闭代码: ${result.closeCode}`);
      if (result.closeReason) console.log(`   - 关闭原因: ${result.closeReason}`);
    }
  });

  console.log('\n' + '-'.repeat(80));

  const passedCount = results.filter(r => r.success).length;
  const failedCount = results.filter(r => !r.success).length;

  console.log(`\n总结:`);
  console.log(`  通过: ${passedCount}/${results.length}`);
  console.log(`  失败: ${failedCount}/${results.length}`);
  console.log(`  成功率: ${((passedCount / results.length) * 100).toFixed(1)}%`);

  console.log('\n' + '='.repeat(80));

  return {
    total: results.length,
    passed: passedCount,
    failed: failedCount,
    successRate: (passedCount / results.length) * 100
  };
}

/**
 * 主函数
 */
async function main() {
  console.log('🧪 Gemini 实时音视频功能完整测试');
  console.log('='.repeat(80));
  console.log(`模型: ${MODEL_NAME}`);
  console.log(`WebSocket URL: ${WS_URL}`);
  console.log(`API Key: ${API_KEY.substring(0, 10)}...${API_KEY.substring(API_KEY.length - 4)}`);
  console.log('='.repeat(80));

  try {
    // 测试 1: WebSocket 连接
    const result1 = await testWebSocketConnection();
    testResults.push(result1);
    await wait(2000);  // 等待 2 秒

    // 测试 2: 文本消息
    const result2 = await testTextMessage();
    testResults.push(result2);
    await wait(2000);

    // 生成报告
    const summary = generateReport(testResults);

    // 保存结果
    const fs = require('fs');
    const outputPath = 'test/realtime_test_results.json';
    fs.writeFileSync(outputPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      summary: summary,
      results: testResults
    }, null, 2), 'utf-8');

    console.log(`\n📁 详细结果已保存到: ${outputPath}`);

    // 返回退出码
    process.exit(summary.failed > 0 ? 1 : 0);

  } catch (error) {
    console.error('\n❌ 测试执行失败:', error);
    process.exit(1);
  }
}

// 执行测试
main();
