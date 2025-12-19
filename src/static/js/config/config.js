// 从服务器配置 API 获取默认值 (在运行时填充)
let serverConfig = null;

export const CONFIG = {
    API: {
        VERSION: 'v1beta',
        // 默认模型 - 可以通过服务器环境变量 GEMINI_MODEL_NAME 覆盖
        MODEL_NAME: 'models/gemini-2.5-flash-native-audio-preview-12-2025',
        // 可选的自定义 Base URL - 用于测试或使用代理
        BASE_URL: null,  // 例如: 'wss://custom-proxy.example.com'
    },
    // You can change the system instruction to your liking
    SYSTEM_INSTRUCTION: {
        TEXT: 'You are my helpful assistant. You can see and hear me, and respond with voice and text. If you are asked about things you do not know, you can use the google search tool to find the answer.',
    },
    // Default audio settings
    AUDIO: {
        SAMPLE_RATE: 16000,
        OUTPUT_SAMPLE_RATE: 24000,      // If you want to have fun, set this to around 14000 (u certainly will)
        BUFFER_SIZE: 2048,
        CHANNELS: 1
    },
    // 代理配置 (可选)
    PROXY: {
        ENABLED: false,
        URL: null  // 例如: 'https://socks.spdt.work:63129'
    },
    // If you are working in the RoArm branch
    // ROARM: {
    //     IP_ADDRESS: '192.168.1.4'
    // }
  };

/**
 * 从服务器获取配置并合并到 CONFIG 中
 * @returns {Promise<Object>} 服务器配置
 */
export async function loadServerConfig() {
    try {
        const response = await fetch('/api/config');
        serverConfig = await response.json();

        // 合并服务器配置到 CONFIG
        if (serverConfig.modelName) {
            CONFIG.API.MODEL_NAME = serverConfig.modelName;
        }
        if (serverConfig.baseUrl) {
            CONFIG.API.BASE_URL = serverConfig.baseUrl;
        }
        if (serverConfig.proxyUrl) {
            CONFIG.PROXY.ENABLED = true;
            CONFIG.PROXY.URL = serverConfig.proxyUrl;
        }

        console.log('[Config] Server config loaded:', serverConfig);
        return serverConfig;
    } catch (error) {
        console.warn('[Config] Failed to load server config:', error);
        return null;
    }
}

/**
 * 获取当前有效的 API 模型名称
 * 优先级: 用户输入 > 服务器配置 > 默认值
 * @param {string} userInput - 用户输入的模型名称
 * @returns {string} 最终使用的模型名称
 */
export function getModelName(userInput) {
    return userInput || CONFIG.API.MODEL_NAME;
}

/**
 * 获取当前有效的 Base URL
 * @param {string} userInput - 用户输入的 Base URL
 * @returns {string|null} Base URL 或 null
 */
export function getBaseUrl(userInput) {
    return userInput || CONFIG.API.BASE_URL;
}

  export default CONFIG; 