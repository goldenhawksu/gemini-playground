#!/usr/bin/env node

/**
 * Playwright 自动化 UI 测试
 *
 * 测试 Gemini Playground 的完整用户界面功能
 *
 * 安装依赖:
 *   npm install -D @playwright/test
 *   npx playwright install chromium
 *
 * 使用方法:
 *   node test/playwright_ui_test.js [URL] [API_KEY]
 *
 * 示例:
 *   node test/playwright_ui_test.js https://talk.aesc.ai YOUR_API_KEY
 *   node test/playwright_ui_test.js http://localhost:8000
 */

const { chromium } = require('playwright');

// 配置
const TARGET_URL = process.argv[2] || 'http://localhost:8000';
const API_KEY = process.argv[3] || '';
const SCREENSHOT_DIR = './test/screenshots';

// 测试结果
const results = {
  timestamp: new Date().toISOString(),
  url: TARGET_URL,
  tests: [],
  passed: 0,
  failed: 0,
  skipped: 0
};

// 工具函数
function log(emoji, message) {
  console.log(`${emoji} ${message}`);
}

function testResult(name, passed, message = '', screenshot = null) {
  const result = {
    name,
    passed,
    message,
    screenshot,
    timestamp: new Date().toISOString()
  };

  results.tests.push(result);
  if (passed) {
    results.passed++;
    log('✅', `${name}: ${message || 'PASSED'}`);
  } else {
    results.failed++;
    log('❌', `${name}: ${message || 'FAILED'}`);
  }

  return passed;
}

// 主测试函数
async function runTests() {
  log('🎭', `Playwright UI 自动化测试`);
  log('📍', `目标 URL: ${TARGET_URL}`);
  log('🔑', API_KEY ? `使用 API Key: ${API_KEY.substring(0, 10)}...` : '使用页面默认 API Key');
  console.log('═'.repeat(70));
  console.log('');

  let browser, page;

  try {
    // 启动浏览器
    log('🚀', '启动浏览器...');
    browser = await chromium.launch({
      headless: false, // 设置为 true 可以无头模式运行
      slowMo: 100 // 减慢操作速度便于观察
    });

    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      permissions: ['microphone', 'camera'], // 预授权权限
      recordVideo: {
        dir: './test/videos/',
        size: { width: 1280, height: 720 }
      }
    });

    page = await context.newPage();

    // 监听控制台消息
    page.on('console', msg => {
      const type = msg.type();
      if (type === 'error' || type === 'warning') {
        console.log(`   [浏览器 ${type}] ${msg.text()}`);
      }
    });

    // 监听页面错误
    page.on('pageerror', error => {
      console.log(`   [页面错误] ${error.message}`);
    });

    // ===== 测试 1: 页面加载 =====
    log('📄', '测试 1: 页面加载');
    console.log('-'.repeat(70));

    try {
      await page.goto(TARGET_URL, { waitUntil: 'networkidle', timeout: 30000 });
      const title = await page.title();
      await page.screenshot({ path: `${SCREENSHOT_DIR}/01-page-loaded.png` });
      testResult('页面加载', true, `标题: ${title}`, '01-page-loaded.png');
    } catch (error) {
      testResult('页面加载', false, error.message);
      throw error;
    }
    console.log('');

    // ===== 测试 2: 检查关键 UI 元素 =====
    log('🔍', '测试 2: 检查关键 UI 元素');
    console.log('-'.repeat(70));

    const elements = [
      { selector: '#api-key', name: 'API Key 输入框' },
      { selector: '#connect-button', name: 'Connect 按钮' },
      { selector: '#mic-button', name: '麦克风按钮' },
      { selector: '#camera-button', name: '摄像头按钮' },
      { selector: '#screen-button', name: '屏幕共享按钮' },
      { selector: '#voice-select', name: '语音选择下拉框' },
      { selector: '#language-select', name: '语言选择下拉框' },
      { selector: '#message-input', name: '消息输入框' },
      { selector: '#send-button', name: '发送按钮' }
    ];

    for (const elem of elements) {
      try {
        const isVisible = await page.isVisible(elem.selector);
        testResult(`UI元素: ${elem.name}`, isVisible, isVisible ? '可见' : '不可见');
      } catch (error) {
        testResult(`UI元素: ${elem.name}`, false, error.message);
      }
    }

    await page.screenshot({ path: `${SCREENSHOT_DIR}/02-ui-elements.png` });
    console.log('');

    // ===== 测试 3: 配置面板 =====
    log('⚙️', '测试 3: 配置面板');
    console.log('-'.repeat(70));

    try {
      // 点击配置按钮
      await page.click('#config-toggle');
      await page.waitForTimeout(500);

      const configVisible = await page.isVisible('#config-container.active');
      testResult('配置面板切换', configVisible, '面板已展开');

      // 检查配置项
      const configElements = [
        { selector: '#system-instruction', name: '系统指令输入框' },
        { selector: '#fps-input', name: 'FPS 输入框' },
        { selector: '#response-type-select', name: '响应类型选择' }
      ];

      for (const elem of configElements) {
        const isVisible = await page.isVisible(elem.selector);
        testResult(`配置项: ${elem.name}`, isVisible, isVisible ? '可见' : '不可见');
      }

      await page.screenshot({ path: `${SCREENSHOT_DIR}/03-config-panel.png` });

      // 关闭配置面板
      await page.click('#config-toggle');
      await page.waitForTimeout(500);
    } catch (error) {
      testResult('配置面板', false, error.message);
    }
    console.log('');

    // ===== 测试 4: 输入 API Key 并连接 =====
    log('🔌', '测试 4: 输入 API Key 并连接');
    console.log('-'.repeat(70));

    if (API_KEY) {
      try {
        // 清空并输入 API Key
        await page.fill('#api-key', '');
        await page.fill('#api-key', API_KEY);
        testResult('输入 API Key', true, 'API Key 已填入');

        // 点击连接按钮
        await page.click('#connect-button');
        log('⏳', '等待 WebSocket 连接建立 (最多 10 秒)...');

        // 等待连接状态变化
        await page.waitForTimeout(3000);

        // 检查按钮状态
        const buttonText = await page.textContent('#connect-button');
        const isConnected = buttonText.includes('Disconnect') || buttonText.includes('Connected');

        await page.screenshot({ path: `${SCREENSHOT_DIR}/04-connected.png` });
        testResult('WebSocket 连接', isConnected, `按钮状态: ${buttonText}`);

      } catch (error) {
        testResult('WebSocket 连接', false, error.message);
      }
    } else {
      testResult('WebSocket 连接', false, '未提供 API Key (跳过)');
      results.tests[results.tests.length - 1].passed = null;
      results.skipped++;
      results.failed--;
      log('⚠️', '提示: 提供 API Key 以测试完整功能');
    }
    console.log('');

    // ===== 测试 5: 语音选择 =====
    log('🎤', '测试 5: 语音选择功能');
    console.log('-'.repeat(70));

    try {
      // 获取可用语音选项
      const voices = await page.$$eval('#voice-select option', options =>
        options.map(opt => opt.value)
      );

      testResult('语音选项数量', voices.length > 0, `找到 ${voices.length} 个语音选项`);

      if (voices.length > 1) {
        // 选择第二个语音
        await page.selectOption('#voice-select', voices[1]);
        const selectedVoice = await page.inputValue('#voice-select');
        testResult('切换语音', selectedVoice === voices[1], `已选择: ${selectedVoice}`);
      }

      await page.screenshot({ path: `${SCREENSHOT_DIR}/05-voice-selection.png` });
    } catch (error) {
      testResult('语音选择', false, error.message);
    }
    console.log('');

    // ===== 测试 6: 文本消息输入 =====
    log('💬', '测试 6: 文本消息输入');
    console.log('-'.repeat(70));

    try {
      const testMessage = 'Hello, this is a test message from Playwright automation!';

      await page.fill('#message-input', testMessage);
      const inputValue = await page.inputValue('#message-input');
      testResult('消息输入', inputValue === testMessage, '消息已输入');

      // 检查发送按钮状态
      const sendButtonEnabled = await page.isEnabled('#send-button');
      testResult('发送按钮可用', sendButtonEnabled, '按钮已启用');

      await page.screenshot({ path: `${SCREENSHOT_DIR}/06-message-input.png` });

      // 如果已连接,尝试发送
      const buttonText = await page.textContent('#connect-button');
      if (buttonText.includes('Disconnect')) {
        log('📤', '发送测试消息...');
        await page.click('#send-button');
        await page.waitForTimeout(2000);

        // 检查日志容器是否有内容
        const logsContent = await page.textContent('#logs-container');
        testResult('消息发送', logsContent.length > 0, '日志已更新');

        await page.screenshot({ path: `${SCREENSHOT_DIR}/07-message-sent.png` });
      }
    } catch (error) {
      testResult('文本消息', false, error.message);
    }
    console.log('');

    // ===== 测试 7: 麦克风按钮交互 =====
    log('🎙️', '测试 7: 麦克风按钮交互');
    console.log('-'.repeat(70));

    try {
      // 注意: 实际的麦克风功能需要用户权限,这里只测试按钮交互
      const micButton = await page.$('#mic-button');
      const isEnabled = await micButton.isEnabled();
      testResult('麦克风按钮状态', isEnabled, isEnabled ? '可点击' : '禁用');

      // 悬停查看 tooltip (如果有)
      await page.hover('#mic-button');
      await page.waitForTimeout(500);
      await page.screenshot({ path: `${SCREENSHOT_DIR}/08-mic-button.png` });
    } catch (error) {
      testResult('麦克风按钮', false, error.message);
    }
    console.log('');

    // ===== 测试 8: 响应式设计 (移动端) =====
    log('📱', '测试 8: 响应式设计 (移动端视图)');
    console.log('-'.repeat(70));

    try {
      // 切换到移动端视口
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(1000);

      // 检查关键元素是否仍然可见
      const mobileElements = ['#connect-button', '#message-input', '#send-button'];
      let allVisible = true;

      for (const selector of mobileElements) {
        const isVisible = await page.isVisible(selector);
        if (!isVisible) allVisible = false;
      }

      testResult('移动端适配', allVisible, '关键元素在移动端可见');
      await page.screenshot({ path: `${SCREENSHOT_DIR}/09-mobile-view.png` });

      // 恢复桌面视口
      await page.setViewportSize({ width: 1280, height: 720 });
    } catch (error) {
      testResult('响应式设计', false, error.message);
    }
    console.log('');

    // ===== 测试 9: LocalStorage 持久化 =====
    log('💾', '测试 9: LocalStorage 持久化');
    console.log('-'.repeat(70));

    try {
      // 检查 LocalStorage 项
      const storageKeys = await page.evaluate(() => {
        return Object.keys(localStorage);
      });

      const expectedKeys = ['gemini_voice', 'gemini_language', 'video_fps'];
      const hasKeys = expectedKeys.some(key => storageKeys.includes(key));

      testResult('LocalStorage', hasKeys, `找到 ${storageKeys.length} 个存储项`);

      // 显示存储的值
      const storageData = await page.evaluate(() => {
        const data = {};
        ['gemini_api_key', 'gemini_voice', 'gemini_language', 'video_fps', 'system_instruction'].forEach(key => {
          const value = localStorage.getItem(key);
          if (value) {
            data[key] = key === 'gemini_api_key' ? value.substring(0, 10) + '...' : value;
          }
        });
        return data;
      });

      log('📦', `LocalStorage 数据: ${JSON.stringify(storageData, null, 2)}`);
    } catch (error) {
      testResult('LocalStorage', false, error.message);
    }
    console.log('');

    // ===== 测试 10: 网络请求 =====
    log('🌐', '测试 10: 网络请求监控');
    console.log('-'.repeat(70));

    try {
      const requests = [];

      // 监听网络请求
      page.on('request', request => {
        if (request.url().includes(TARGET_URL)) {
          requests.push({
            url: request.url(),
            method: request.method(),
            resourceType: request.resourceType()
          });
        }
      });

      // 触发一些网络活动
      await page.reload({ waitUntil: 'networkidle' });

      const jsRequests = requests.filter(r => r.resourceType === 'script');
      const cssRequests = requests.filter(r => r.resourceType === 'stylesheet');

      testResult('JavaScript 加载', jsRequests.length > 0, `加载了 ${jsRequests.length} 个 JS 文件`);
      testResult('CSS 加载', cssRequests.length > 0, `加载了 ${cssRequests.length} 个 CSS 文件`);

      log('📊', `总请求数: ${requests.length}`);
    } catch (error) {
      testResult('网络请求', false, error.message);
    }
    console.log('');

    // 等待用户观察 (如果需要手动交互测试)
    if (process.env.MANUAL_TEST === '1') {
      log('⏸️', '手动测试模式: 浏览器将保持打开 30 秒供您交互...');
      await page.waitForTimeout(30000);
    }

  } catch (error) {
    log('💥', `测试执行错误: ${error.message}`);
    console.error(error.stack);
  } finally {
    // 保存测试结果
    const fs = require('fs');
    const resultsPath = './test/playwright_test_results.json';
    fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
    log('💾', `测试结果已保存: ${resultsPath}`);

    // 关闭浏览器
    if (browser) {
      await browser.close();
      log('🔒', '浏览器已关闭');
    }

    // 输出汇总
    console.log('');
    console.log('═'.repeat(70));
    log('📊', '测试汇总');
    console.log('-'.repeat(70));
    log('✅', `通过: ${results.passed}`);
    log('❌', `失败: ${results.failed}`);
    log('⚠️', `跳过: ${results.skipped}`);
    log('📈', `总计: ${results.tests.length}`);
    log('🎯', `成功率: ${((results.passed / results.tests.length) * 100).toFixed(1)}%`);
    console.log('═'.repeat(70));

    // 退出码
    process.exit(results.failed > 0 ? 1 : 0);
  }
}

// 运行测试
runTests().catch(error => {
  console.error('💥 测试脚本错误:', error);
  process.exit(1);
});
