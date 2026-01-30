// 环境配置
interface EnvConfig {
  apiBaseUrl: string
  isDev: boolean
}

// 开发环境配置
const devConfig: EnvConfig = {
  apiBaseUrl: 'http://localhost:8000',
  isDev: true
}

// 生产环境配置 - 请替换为你的实际服务器域名
const prodConfig: EnvConfig = {
  apiBaseUrl: 'https://your-domain.com',  // 替换为你的实际域名
  isDev: false
}

// 手动切换环境：开发时设为 true，上线前改为 false
const USE_DEV_ENV = true

const env: EnvConfig = USE_DEV_ENV ? devConfig : prodConfig

export default env
