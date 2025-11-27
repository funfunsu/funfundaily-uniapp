// config.js
export default {
    // 切换环境：'dev' 或 'prod'
    // env: 'mock',
    env: 'dev',
	mock: true,

    // 不同环境的 API 基础地址
    baseUrl: {
        prod: 'http://localhost:8080' // 替换成你的后端地址
    }
}