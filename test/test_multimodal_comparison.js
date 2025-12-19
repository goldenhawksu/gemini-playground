/**
 * Gemini 多模态能力对比测试
 * 对比 gemini-live-2.5-flash-preview 和 gemini-3-flash-preview
 * 测试维度: 图像理解、视频理解、音频理解、多模态推理
 */

const API_KEY = 'AIzaSyBY47NHfk5X4gJ1c1fLauxHIuhN6IZb-Y4';
const BASE_URL = 'https://generativelanguage.googleapis.com';

// 要对比的两个模型
const MODELS = {
  'gemini-live-2.5-flash-preview': 'Gemini 2.5 Flash Live',
  'gemini-3-flash-preview': 'Gemini 3 Flash'
};

// 测试结果存储
const comparisonResults = [];

/**
 * 发送 HTTP 请求到 Gemini API
 */
async function callGeminiAPI(model, payload) {
  const url = `${BASE_URL}/v1beta/models/${model}:generateContent?key=${API_KEY}`;

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
 * 提取响应文本
 */
function extractResponseText(result) {
  if (result.ok && result.data.candidates) {
    return result.data.candidates[0]?.content?.parts?.[0]?.text || '';
  }
  return null;
}

/**
 * 测试 1: 简单图像识别
 */
async function testSimpleImageRecognition(model) {
  console.log(`\n[${MODELS[model]}] 测试 1: 简单图像识别 (红色方块)`);

  // 一个简单的红色方块 PNG 图像
  const redSquare = "iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mP8z8BQz0AEYBxVSF+FABJADveWkH6oAAAAAElFTkSuQmCC";

  try {
    const result = await callGeminiAPI(model, {
      contents: [{
        parts: [
          { text: "请详细描述这张图片,包括颜色、形状、大小。" },
          { inlineData: { mimeType: "image/png", data: redSquare } }
        ]
      }]
    });

    const text = extractResponseText(result);
    if (text) {
      console.log(`✅ 成功`);
      console.log(`回复: ${text.substring(0, 200)}...`);
      return { success: true, response: text, responseLength: text.length };
    } else {
      console.log(`❌ 失败: ${JSON.stringify(result.data)}`);
      return { success: false, error: result.data };
    }
  } catch (error) {
    console.log(`❌ 异常: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * 测试 2: 复杂图像理解
 */
async function testComplexImageUnderstanding(model) {
  console.log(`\n[${MODELS[model]}] 测试 2: 复杂图像理解 (渐变色)`);

  // 创建一个带渐变的测试图像 (从红到蓝的渐变)
  const gradientImage = "iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAIAAAD/gAIDAAAA0klEQVR42u3SMQ0AAAjAMNL+Oa9hD2YQSFx599U3AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEDPBg5yAAEnvutxAAAAAElFTkSuQmCC";

  try {
    const result = await callGeminiAPI(model, {
      contents: [{
        parts: [
          { text: "这张图片有什么特点?请描述图片的视觉特征、颜色变化和整体印象。" },
          { inlineData: { mimeType: "image/png", data: gradientImage } }
        ]
      }]
    });

    const text = extractResponseText(result);
    if (text) {
      console.log(`✅ 成功`);
      console.log(`回复: ${text.substring(0, 200)}...`);
      return { success: true, response: text, responseLength: text.length };
    } else {
      console.log(`❌ 失败`);
      return { success: false, error: result.data };
    }
  } catch (error) {
    console.log(`❌ 异常: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * 测试 3: 图像中的文字识别 (OCR)
 */
async function testOCR(model) {
  console.log(`\n[${MODELS[model]}] 测试 3: OCR 文字识别`);

  // 一个包含 "HELLO" 文字的简单图片 (Base64)
  const textImage = "iVBORw0KGgoAAAANSUhEUgAAAMgAAAAyCAYAAAAZUZThAAAACXBIWXMAAAsTAAALEwEAmpwYAAAF8WlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4gPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgOS4xLWMwMDEgNzkuMTQ2Mjg5OSwgMjAyMy8wNi8yNS0yMDowMTo1NSAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczpkYz0iaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8iIHhtbG5zOnBob3Rvc2hvcD0iaHR0cDovL25zLmFkb2JlLmNvbS9waG90b3Nob3AvMS4wLyIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0RXZ0PSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VFdmVudCMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIDI1LjEgKFdpbmRvd3MpIiB4bXA6Q3JlYXRlRGF0ZT0iMjAyNS0xMi0xOFQyMTo1MDozMiswODowMCIgeG1wOk1vZGlmeURhdGU9IjIwMjUtMTItMThUMjE6NTA6NTUrMDg6MDAiIHhtcDpNZXRhZGF0YURhdGU9IjIwMjUtMTItMThUMjE6NTA6NTUrMDg6MDAiIGRjOmZvcm1hdD0iaW1hZ2UvcG5nIiBwaG90b3Nob3A6Q29sb3JNb2RlPSIzIiB4bXBNTTpJbnN0YW5jZUlEPSJ4bXAuaWlkOjZjYTI4YTVmLWZkZjUtNGM0Yi1hOWQzLTg4ZDk2ZmJmNzE2YiIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDo2Y2EyOGE1Zi1mZGY1LTRjNGItYTlkMy04OGQ5NmZiZjcxNmIiIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0ieG1wLmRpZDo2Y2EyOGE1Zi1mZGY1LTRjNGItYTlkMy04OGQ5NmZiZjcxNmIiPiA8eG1wTU06SGlzdG9yeT4gPHJkZjpTZXE+IDxyZGY6bGkgc3RFdnQ6YWN0aW9uPSJjcmVhdGVkIiBzdEV2dDppbnN0YW5jZUlEPSJ4bXAuaWlkOjZjYTI4YTVmLWZkZjUtNGM0Yi1hOWQzLTg4ZDk2ZmJmNzE2YiIgc3RFdnQ6d2hlbj0iMjAyNS0xMi0xOFQyMTo1MDozMiswODowMCIgc3RFdnQ6c29mdHdhcmVBZ2VudD0iQWRvYmUgUGhvdG9zaG9wIDI1LjEgKFdpbmRvd3MpIi8+IDwvcmRmOlNlcT4gPC94bXBNTTpIaXN0b3J5PiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/Ps7xqXkAAAIZSURBVHic7doxTsNAEAXQf0FCQkIqKG25AAdAoqTgElyCjkNwAS5BQU1LDQUVEhISEhL/FJuZsRN77V3P7Dx1llZ27PzkVWytN4BhGIZhGIZhGIZhGIZhGIZhGIZh/qf1ugdoGnVd13V90zRd13VqmqZ7v++6rqm1Vq21Usp7795775RS3nvvvXfOOeecUso551oopZRSCiFordF/jb0PIYQQAkKIIYQY4/1+7/ueqg8hxBBCCCGEEGKMMcYYY4wxxhhjjDHGqL4xxgfGGGOMUY0xPjDGGGN8MsYYn9QY4xNjjFGNMT4xxvjEGGOMMaoxxifGGJ8YY4xqjPGJMcYYY4xRjTE+McYYY4xRjTE+McYYY4xRjTE+McYYY4xRjTE+McYYY4xRjTE+McYYY4xRjTE+McYYY4xRjTE+McYYY4xRjTE+McYYY4xRjTE+McYYY4xRjTE+McYYY4xRjTE+McYYY4xRjTE+McYYY4xRjTE+McYYY4xRjTE+McYYY4xRjTE+McYYY4xRjTE+McYYY4xRjTE+McYYY4xRjTE+McYYY4xRjTE+McYYY4xRjTE+McYYY4xRjTE+McYYY4xRjTE+McYYY4xRjTE+McYYY4xRjTE+McYYY4xRjTE+McYYY4xRjTE+McYYY4xRjTE+McYYY4xRjTE+McYYY4xRjTE+McYYY4xRjTE+McYYY4xRjTE+McYYY4xRjTE+/QLAP4jE0LfzjwAAAABJRU5ErkJggg==";

  try {
    const result = await callGeminiAPI(model, {
      contents: [{
        parts: [
          { text: "请识别这张图片中的所有文字。" },
          { inlineData: { mimeType: "image/png", data: textImage } }
        ]
      }]
    });

    const text = extractResponseText(result);
    if (text) {
      console.log(`✅ 成功`);
      console.log(`回复: ${text}`);
      const containsHello = text.toUpperCase().includes('HELLO');
      return {
        success: true,
        response: text,
        ocrAccuracy: containsHello ? 'high' : 'low',
        containsTarget: containsHello
      };
    } else {
      console.log(`❌ 失败`);
      return { success: false, error: result.data };
    }
  } catch (error) {
    console.log(`❌ 异常: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * 测试 4: 图像推理和理解
 */
async function testImageReasoning(model) {
  console.log(`\n[${MODELS[model]}] 测试 4: 图像推理能力`);

  const redSquare = "iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mP8z8BQz0AEYBxVSF+FABJADveWkH6oAAAAAElFTkSuQmCC";

  try {
    const result = await callGeminiAPI(model, {
      contents: [{
        parts: [
          { text: "如果我要设计一个与这张图片配色相同的网站,应该使用什么颜色的文字才能保证可读性?" },
          { inlineData: { mimeType: "image/png", data: redSquare } }
        ]
      }]
    });

    const text = extractResponseText(result);
    if (text) {
      console.log(`✅ 成功`);
      console.log(`回复: ${text.substring(0, 200)}...`);
      return { success: true, response: text, responseLength: text.length };
    } else {
      console.log(`❌ 失败`);
      return { success: false, error: result.data };
    }
  } catch (error) {
    console.log(`❌ 异常: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * 测试 5: 多图对比
 */
async function testMultiImageComparison(model) {
  console.log(`\n[${MODELS[model]}] 测试 5: 多图对比分析`);

  const redSquare = "iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mP8z8BQz0AEYBxVSF+FABJADveWkH6oAAAAAElFTkSuQmCC";
  const blueSquare = "iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mNk+M9Qz0AEYBxVSF+FAAhKBPWxxhKnAAAAAElFTkSuQmCC";

  try {
    const result = await callGeminiAPI(model, {
      contents: [{
        parts: [
          { text: "请对比这两张图片的异同点:" },
          { inlineData: { mimeType: "image/png", data: redSquare } },
          { text: "和" },
          { inlineData: { mimeType: "image/png", data: blueSquare } }
        ]
      }]
    });

    const text = extractResponseText(result);
    if (text) {
      console.log(`✅ 成功`);
      console.log(`回复: ${text.substring(0, 200)}...`);
      return { success: true, response: text, responseLength: text.length };
    } else {
      console.log(`❌ 失败`);
      return { success: false, error: result.data };
    }
  } catch (error) {
    console.log(`❌ 异常: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * 测试 6: 视觉问答 (VQA)
 */
async function testVisualQA(model) {
  console.log(`\n[${MODELS[model]}] 测试 6: 视觉问答`);

  const redSquare = "iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mP8z8BQz0AEYBxVSF+FABJADveWkH6oAAAAAElFTkSuQmCC";

  const questions = [
    "这个图形的面积大约是多少像素?",
    "如果把这个颜色用 RGB 值表示,大约是多少?",
    "这个图形给人什么样的情绪感觉?"
  ];

  const answers = [];

  for (const question of questions) {
    try {
      const result = await callGeminiAPI(model, {
        contents: [{
          parts: [
            { text: question },
            { inlineData: { mimeType: "image/png", data: redSquare } }
          ]
        }]
      });

      const text = extractResponseText(result);
      console.log(`  Q: ${question}`);
      if (text) {
        console.log(`  A: ${text.substring(0, 100)}...`);
        answers.push({ question, answer: text, success: true });
      } else {
        console.log(`  A: (失败)`);
        answers.push({ question, answer: null, success: false });
      }

      // 避免限流
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.log(`  A: (异常) ${error.message}`);
      answers.push({ question, answer: null, success: false, error: error.message });
    }
  }

  const successCount = answers.filter(a => a.success).length;
  console.log(`✅ 成功回答 ${successCount}/${questions.length} 个问题`);

  return {
    success: successCount > 0,
    totalQuestions: questions.length,
    successfulAnswers: successCount,
    answers: answers
  };
}

/**
 * 对比两个模型
 */
async function compareModels() {
  console.log('='.repeat(80));
  console.log('Gemini 多模态能力对比测试');
  console.log('='.repeat(80));
  console.log(`模型 A: ${MODELS['gemini-live-2.5-flash-preview']}`);
  console.log(`模型 B: ${MODELS['gemini-3-flash-preview']}`);
  console.log('='.repeat(80));

  const tests = [
    { name: '简单图像识别', fn: testSimpleImageRecognition },
    { name: '复杂图像理解', fn: testComplexImageUnderstanding },
    { name: 'OCR文字识别', fn: testOCR },
    { name: '图像推理能力', fn: testImageReasoning },
    { name: '多图对比分析', fn: testMultiImageComparison },
    { name: '视觉问答', fn: testVisualQA }
  ];

  for (const test of tests) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`测试项目: ${test.name}`);
    console.log('='.repeat(80));

    const results = {};

    // 测试模型 A
    results['gemini-live-2.5-flash-preview'] = await test.fn('gemini-live-2.5-flash-preview');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 测试模型 B
    results['gemini-3-flash-preview'] = await test.fn('gemini-3-flash-preview');
    await new Promise(resolve => setTimeout(resolve, 2000));

    comparisonResults.push({
      testName: test.name,
      results: results
    });
  }
}

/**
 * 生成对比报告
 */
function generateComparisonReport() {
  console.log(`\n\n${'='.repeat(80)}`);
  console.log('多模态能力对比报告');
  console.log('='.repeat(80));

  // 汇总表格
  console.log('\n测试结果对比:');
  console.log('-'.repeat(80));
  console.log('测试项目'.padEnd(25) + 'Gemini 2.5 Flash Live'.padEnd(25) + 'Gemini 3 Flash');
  console.log('-'.repeat(80));

  comparisonResults.forEach(test => {
    const model1Result = test.results['gemini-live-2.5-flash-preview'];
    const model2Result = test.results['gemini-3-flash-preview'];

    const status1 = model1Result.success ? '✅' : '❌';
    const status2 = model2Result.success ? '✅' : '❌';

    console.log(
      test.testName.padEnd(25) +
      status1.padEnd(25) +
      status2
    );
  });

  console.log('-'.repeat(80));

  // 详细分析
  console.log('\n详细分析:');
  comparisonResults.forEach(test => {
    console.log(`\n${test.testName}:`);

    const model1Result = test.results['gemini-live-2.5-flash-preview'];
    const model2Result = test.results['gemini-3-flash-preview'];

    if (model1Result.responseLength && model2Result.responseLength) {
      console.log(`  响应长度: ${MODELS['gemini-live-2.5-flash-preview']} (${model1Result.responseLength} 字符) vs ${MODELS['gemini-3-flash-preview']} (${model2Result.responseLength} 字符)`);
    }

    if (test.testName === 'OCR文字识别') {
      console.log(`  OCR准确度: ${MODELS['gemini-live-2.5-flash-preview']} (${model1Result.ocrAccuracy || 'N/A'}) vs ${MODELS['gemini-3-flash-preview']} (${model2Result.ocrAccuracy || 'N/A'})`);
    }

    if (test.testName === '视觉问答') {
      console.log(`  问答成功率: ${MODELS['gemini-live-2.5-flash-preview']} (${model1Result.successfulAnswers}/${model1Result.totalQuestions}) vs ${MODELS['gemini-3-flash-preview']} (${model2Result.successfulAnswers}/${model2Result.totalQuestions})`);
    }
  });

  // 总结
  const model1Wins = comparisonResults.filter(t =>
    t.results['gemini-live-2.5-flash-preview'].success &&
    !t.results['gemini-3-flash-preview'].success
  ).length;

  const model2Wins = comparisonResults.filter(t =>
    !t.results['gemini-live-2.5-flash-preview'].success &&
    t.results['gemini-3-flash-preview'].success
  ).length;

  const ties = comparisonResults.filter(t =>
    t.results['gemini-live-2.5-flash-preview'].success ===
    t.results['gemini-3-flash-preview'].success
  ).length;

  console.log('\n总结:');
  console.log(`  ${MODELS['gemini-live-2.5-flash-preview']} 独占优势: ${model1Wins} 项`);
  console.log(`  ${MODELS['gemini-3-flash-preview']} 独占优势: ${model2Wins} 项`);
  console.log(`  平局: ${ties} 项`);

  console.log('\n' + '='.repeat(80));
}

/**
 * 主函数
 */
async function main() {
  await compareModels();
  generateComparisonReport();

  // 保存详细结果
  const fs = require('fs');
  const reportPath = 'test/multimodal_comparison_results.json';
  fs.writeFileSync(reportPath, JSON.stringify(comparisonResults, null, 2), 'utf-8');
  console.log(`\n详细对比结果已保存到: ${reportPath}`);
}

// 执行测试
main().catch(error => {
  console.error('测试执行失败:', error);
  process.exit(1);
});
