// API 配置
// 生产环境使用空字符串（相对路径），让 Nginx 反向代理处理
// 开发环境使用 http://localhost:8000
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL !== undefined 
  ? import.meta.env.VITE_API_BASE_URL 
  : 'http://localhost:8000';

// 导出为默认配置
export default {
  API_BASE_URL,
};
