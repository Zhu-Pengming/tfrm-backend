# TFRM Web 前端

<div align="center">

**基于 React + TypeScript + Vite 的旅行资源管理 Web 应用**

[![React](https://img.shields.io/badge/React-19.2-61DAFB.svg?style=flat&logo=React&logoColor=black)](https://reactjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6.svg?style=flat&logo=TypeScript&logoColor=white)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-6.2-646CFF.svg?style=flat&logo=Vite&logoColor=white)](https://vitejs.dev)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-06B6D4.svg?style=flat&logo=TailwindCSS&logoColor=white)](https://tailwindcss.com)

</div>

---

## 📖 项目简介

TFRM Web 前端是旅行资源智能管理平台的 Web 端界面，提供完整的资源管理、智能导入、报价生成等功能。采用现代化的前端技术栈，提供流畅的用户体验。

**核心特性**：
- 🎨 **现代化 UI**：基于 TailwindCSS 的响应式设计
- 🚀 **高性能**：Vite 构建，快速热更新
- 🔐 **安全认证**：JWT Token 认证，多租户隔离
- 📦 **模块化组件**：清晰的组件结构，易于维护
- 🤖 **AI 集成**：智能导入和解析功能

---

## 🏗️ 项目结构

```
web/
├── components/              # React 组件
│   ├── Auth/               # 认证相关组件
│   │   └── Login.tsx       # 登录/注册组件
│   ├── ProductLibrary/     # 产品库组件
│   │   ├── SKUList.tsx     # SKU 列表
│   │   ├── SKUDetail.tsx   # SKU 详情
│   │   ├── SKUForm.tsx     # SKU 表单
│   │   ├── PriceCalendar.tsx # 价格日历
│   │   └── BatchOperations.tsx # 批量操作
│   ├── SmartImport/        # 智能导入组件
│   │   ├── ImportForm.tsx  # 导入表单
│   │   └── ImportHistory.tsx # 导入历史
│   ├── Quotation/          # 报价管理组件
│   │   └── QuotationManager.tsx # 报价管理器
│   ├── Vendor/             # 供应商管理组件
│   │   └── VendorManager.tsx # 供应商管理器
│   └── Sidebar.tsx         # 侧边栏导航
├── services/               # API 服务层
│   └── api.ts             # API 请求封装
├── contexts/              # React Context
│   └── AuthContext.tsx    # 认证上下文
├── types.ts               # TypeScript 类型定义
├── constants.tsx          # 常量配置
├── App.tsx                # 应用主组件
├── main.tsx               # 应用入口
├── index.html             # HTML 模板
├── vite.config.ts         # Vite 配置
├── tailwind.config.js     # TailwindCSS 配置
├── package.json           # 依赖配置
└── README.md              # 本文档
```

---

## 🚀 快速开始

### 环境要求

- **Node.js**: 18+ (推荐 20+)
- **npm**: 9+ 或 **pnpm**: 8+
- **后端服务**: 确保后端 API 已启动

### 安装步骤

#### 1. 安装依赖

```bash
cd web
npm install
```

#### 2. 配置环境变量

复制 `.env.example` 为 `.env`：

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
# 后端 API 地址
VITE_API_BASE_URL=http://localhost:8000

# 应用配置
VITE_APP_NAME=旅行资源系统
VITE_APP_VERSION=1.0.0
```

#### 3. 启动开发服务器

```bash
npm run dev
```

开发服务器将在 http://localhost:5173 启动

#### 4. 访问应用

打开浏览器访问：http://localhost:5173

---

## 📦 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| **React** | 19.2 | UI 框架 |
| **TypeScript** | 5.8 | 类型安全 |
| **Vite** | 6.2 | 构建工具 |
| **TailwindCSS** | 3.4 | CSS 框架 |
| **Google GenAI** | 1.35 | AI 集成 |
| **html2pdf.js** | 0.14 | PDF 导出 |

---

## 🎯 核心功能

### 1. 用户认证 (`/components/Auth`)
- 用户注册和登录
- JWT Token 管理
- 自动刷新和过期处理
- 多租户隔离（agency_id）

### 2. 智能导入 (`/components/SmartImport`)
- 文本/图片/PDF 上传
- AI 自动解析资源信息
- 实时查看解析状态
- 导入历史记录
- 确认和修改提取字段

### 3. 产品库管理 (`/components/ProductLibrary`)
- **SKU 列表**：多维度筛选和搜索
- **SKU 详情**：完整信息展示
- **SKU 编辑**：创建和更新 SKU
- **价格管理**：
  - 固定价格
  - 日历价格（按日期设置）
  - 规则价格（动态计算）
- **批量操作**：批量调价、更新、删除

### 4. 报价管理 (`/components/Quotation`)
- 创建和编辑报价单
- 添加多个 SKU 到报价
- 设置数量和备注
- 生成 PDF 报价单
- 生成公开分享链接
- 报价单状态管理（草稿/已发布）

### 5. 供应商管理 (`/components/Vendor`)
- 供应商 CRUD 操作
- 供应商信息维护
- 备注管理
- AI 生成供应商 Logo

---

## 🔌 API 集成

### API 服务层 (`/services/api.ts`)

所有 API 请求通过统一的服务层处理：

```typescript
// 自动添加认证 Token
// 自动处理错误
// 统一的响应格式
```

### 主要 API 端点

| 功能 | 端点 | 方法 |
|------|------|------|
| 登录 | `/auth/login` | POST |
| 注册 | `/auth/register` | POST |
| SKU 列表 | `/skus` | GET |
| 创建 SKU | `/skus` | POST |
| 智能导入 | `/imports/extract` | POST |
| 创建报价 | `/quotations` | POST |
| 导出 PDF | `/quotations/{id}/export/pdf` | GET |

---

## 🎨 UI 设计

### 配色方案

- **主色调**：紫色渐变 (`#667eea` → `#764ba2`)
- **成功色**：绿色 (`#4caf50`)
- **警告色**：橙色 (`#ff9800`)
- **错误色**：红色 (`#ff4444`)
- **背景色**：浅灰 (`#f5f5f5`)

### 组件样式

- **圆角**：`rounded-lg` (8px) / `rounded-xl` (12px)
- **阴影**：`shadow-md` / `shadow-lg`
- **间距**：`p-4` / `p-6` / `m-4`
- **字体**：`text-sm` / `text-base` / `text-lg`

---

## 🔐 认证流程

### Token 管理

1. 用户登录后获取 JWT Token
2. Token 存储在 `localStorage`
3. 每次 API 请求自动携带 Token
4. Token 过期自动跳转登录页

### 多租户隔离

- 每个用户关联一个 `agency_id`
- 所有数据请求自动过滤当前机构数据
- 后端强制执行租户隔离

---

## 📱 响应式设计

应用支持多种屏幕尺寸：

- **桌面端**：1920px+（完整功能）
- **平板端**：768px - 1920px（自适应布局）
- **移动端**：< 768px（简化布局）

---

## 🛠️ 开发指南

### 添加新组件

1. 在 `components/` 目录下创建组件文件
2. 使用 TypeScript 定义 Props 类型
3. 使用 TailwindCSS 编写样式
4. 在 `App.tsx` 中引入和使用

### 调用新 API

1. 在 `services/api.ts` 中添加 API 方法
2. 定义请求和响应类型
3. 在组件中调用 API 方法

### 状态管理

- **本地状态**：使用 `useState`
- **全局状态**：使用 React Context
- **认证状态**：使用 `AuthContext`

---

## 🏗️ 构建和部署

### 构建生产版本

```bash
npm run build
```

构建产物将生成在 `dist/` 目录

### 预览构建结果

```bash
npm run preview
```

### 部署到生产环境

#### 使用 Nginx

```nginx
server {
    listen 80;
    server_name your-domain.com;

    root /path/to/web/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # API 代理
    location /api/ {
        proxy_pass http://localhost:8000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

#### 使用 Docker

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

---

## 🐛 常见问题

### 1. API 请求跨域错误

**原因**：后端 CORS 配置不正确

**解决**：
- 检查后端 `.env` 中的 `CORS_ALLOW_ALL_IN_DEV` 设置
- 确保后端允许前端域名

### 2. 登录后立即退出

**原因**：Token 存储失败或后端认证失败

**解决**：
- 检查浏览器控制台错误
- 检查 `localStorage` 中是否有 `token`
- 检查后端 `/auth/me` 接口是否正常

### 3. 图片上传失败

**原因**：文件大小超限或格式不支持

**解决**：
- 检查文件大小（建议 < 10MB）
- 支持格式：JPG, PNG, PDF

### 4. 构建失败

**原因**：依赖版本冲突或 Node 版本不兼容

**解决**：
```bash
# 清除缓存
rm -rf node_modules package-lock.json
npm install

# 或使用 pnpm
pnpm install
```

---

## 📚 相关文档

- [项目主 README](../README.md)
- [后端 API 文档](http://localhost:8000/docs)
- [React 官方文档](https://react.dev)
- [Vite 官方文档](https://vitejs.dev)
- [TailwindCSS 文档](https://tailwindcss.com/docs)

---

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/NewFeature`)
3. 提交更改 (`git commit -m 'Add NewFeature'`)
4. 推送到分支 (`git push origin feature/NewFeature`)
5. 开启 Pull Request

---

## 📄 开源协议

本项目采用 [MIT License](../LICENSE) 开源协议。

---

<div align="center">

Made with ❤️ by TFRM Team

最后更新：2026-02-06

</div>
