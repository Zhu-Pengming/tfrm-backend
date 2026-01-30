# TFRM 小程序 - 旅行资源智能管理系统

基于微信小程序的旅行社碎片化资源管理前端，实现从碎片输入到报价分享的完整业务闭环。

## 📋 项目概述

TFRM 小程序是一个 To B 的资源管理工具，帮助旅行社销售人员：
- 快速导入碎片化资源信息（AI 自动解析）
- 管理和检索资源库
- 组合报价并分享给客户

## 🎯 核心功能（6个页面完整闭环）

### 1. 登录页 (`/pages/login/login`)
- 用户注册/登录
- 获取 token 和 agency_id
- 多租户隔离

### 2. 碎片导入页 (`/pages/import/import`)
- 粘贴非结构化资源文本
- 提交 AI 解析任务
- 查看最近导入历史

### 3. 解析确认页 (`/pages/import-detail/import-detail`)
- 实时查看 AI 解析状态（轮询）
- 查看提取的字段和证据
- 修改并确认入库

### 4. 资源库页 (`/pages/skus/skus`)
- 多维度搜索（关键词/城市/类型）
- 查看 SKU 列表
- 加入报价篮

### 5. SKU 详情页 (`/pages/sku-detail/sku-detail`)
- 查看完整 SKU 信息
- 查看 attrs 详细字段
- 加入报价

### 6. 报价管理页 (`/pages/quotation/quotation`)
- 管理报价篮
- 查看报价单列表
- 编辑/发布报价

### 7. 报价编辑页 (`/pages/quotation-edit/quotation-edit`)
- 创建/编辑报价单
- 调整数量和项目
- 保存草稿或发布

### 8. 发布成功页 (`/pages/publish-success/publish-success`)
- 显示分享链接
- 复制链接
- 二维码分享（占位）

## 🏗️ 技术架构

### 技术栈
- **框架**: 微信小程序原生框架
- **语言**: TypeScript
- **样式**: WXSS
- **状态管理**: 本地存储 + 全局 globalData

### 项目结构
```
miniprogram/
├── pages/                    # 页面目录
│   ├── login/               # 登录页
│   ├── import/              # 碎片导入页
│   ├── import-detail/       # 解析确认页
│   ├── skus/                # 资源库列表页
│   ├── sku-detail/          # SKU详情页
│   ├── quotation/           # 报价管理页
│   ├── quotation-edit/      # 报价编辑页
│   └── publish-success/     # 发布成功页
├── utils/                   # 工具类
│   ├── api.ts              # API服务层
│   ├── storage.ts          # 本地存储工具
│   └── util.ts             # 通用工具
├── app.json                # 小程序配置
├── app.ts                  # 小程序入口
└── app.wxss                # 全局样式
```

## 🚀 快速开始

### 前置要求
1. 安装微信开发者工具
2. 后端服务已启动（默认 `http://localhost:8000`）
3. Node.js 环境（可选，用于 TypeScript 编译）

### 安装步骤

1. **克隆项目**
```bash
cd c:\Users\lenovo\WeChatProjects\tfrm-miniprogram
```

2. **配置后端地址**

编辑 `miniprogram/utils/api.ts`，修改 API_BASE_URL：
```typescript
const API_BASE_URL = 'http://localhost:8000'  // 改为你的后端地址
```

3. **打开微信开发者工具**
- 导入项目
- 选择项目目录：`c:\Users\lenovo\WeChatProjects\tfrm-miniprogram`
- AppID：使用测试号或你的小程序 AppID

4. **编译运行**
- 点击"编译"按钮
- 在模拟器中查看效果

## 📱 完整业务流程

### 流程图
```
登录 → 碎片导入 → AI解析 → 人确认 → 入库 → 检索 → 组合报价 → 发布分享
  ↓        ↓         ↓        ↓       ↓      ↓        ↓          ↓
login   import   parsing  confirm   SKU   search  quotation  publish
```

### 详细步骤

#### 步骤 0: 登录
1. 打开小程序，进入登录页
2. 输入用户名和密码
3. 点击"登录"或"立即注册"
4. 登录成功后自动跳转到导入页

#### 步骤 1: 碎片导入
1. 在导入页粘贴资源信息，例如：
   ```
   清迈亲子酒店套餐
   酒店：清迈假日酒店
   房型：家庭房
   价格：499元/晚
   成本：350元/晚
   地址：清迈市中心
   有效期：2024年全年
   标签：亲子、酒店
   ```
2. 点击"开始解析"
3. 自动跳转到解析详情页

#### 步骤 2: AI 解析
1. 页面显示"AI正在解析中..."
2. 后台 Celery 异步调用 LLM（10-30秒）
3. 页面每 3 秒轮询一次状态
4. 解析完成后显示提取的字段

#### 步骤 3: 人确认
1. 查看 AI 提取的字段
2. 点击"查看依据"可查看提取证据
3. 修改不准确的字段
4. 选择资源类型（酒店/门票/导游/用车）
5. 点击"确认入库"
6. 成功后显示 SKU ID

#### 步骤 4: 资源库检索
1. 切换到"资源库" Tab
2. 使用搜索框搜索关键词
3. 使用筛选器按城市/类型过滤
4. 点击 SKU 卡片查看详情
5. 点击"加入报价"添加到报价篮

#### 步骤 5: 组合报价
1. 切换到"报价" Tab
2. 在报价篮中调整数量
3. 点击"创建报价单"
4. 填写报价单标题和客户信息
5. 调整项目数量
6. 点击"保存草稿"

#### 步骤 6: 发布分享
1. 在报价列表中找到草稿
2. 点击"发布"按钮
3. 确认发布
4. 跳转到发布成功页
5. 复制分享链接发送给客户

## 🔧 配置说明

### API 配置
文件：`miniprogram/utils/api.ts`

```typescript
const API_BASE_URL = 'http://localhost:8000'  // 后端地址
```

### TabBar 配置
文件：`miniprogram/app.json`

```json
"tabBar": {
  "list": [
    {
      "pagePath": "pages/import/import",
      "text": "导入"
    },
    {
      "pagePath": "pages/skus/skus",
      "text": "资源库"
    },
    {
      "pagePath": "pages/quotation/quotation",
      "text": "报价"
    }
  ]
}
```

**注意**: TabBar 图标需要自行准备，放在 `miniprogram/assets/icons/` 目录下。

## 📦 数据流

### 本地存储
- `token`: JWT 认证令牌
- `agency_id`: 机构 ID（多租户隔离）
- `quotation_basket`: 报价篮数据

### API 调用流程
```
小程序 → API Service → 后端 FastAPI
         ↓
    自动添加 token
    自动处理错误
    401 自动跳转登录
```

## 🎨 UI 设计

### 配色方案
- 主色：`#667eea` → `#764ba2`（渐变）
- 成功：`#4caf50`
- 警告：`#ff9800`
- 错误：`#ff4444`
- 背景：`#f5f5f5`

### 组件样式
- 圆角：`12rpx` / `16rpx`
- 按钮高度：`88rpx`
- 卡片间距：`20rpx` / `30rpx`
- 字体大小：`24rpx` - `40rpx`

## 🔐 安全说明

### Token 管理
- Token 存储在本地 Storage
- 每次 API 请求自动携带
- 401 错误自动清除 token 并跳转登录

### 多租户隔离
- 所有数据请求自动带 agency_id
- 后端通过 scoped_query 强制过滤

## 🐛 常见问题

### 1. 登录后立即跳回登录页
**原因**: 后端未启动或 API 地址错误  
**解决**: 检查 `api.ts` 中的 `API_BASE_URL` 配置

### 2. AI 解析一直显示"解析中"
**原因**: Celery Worker 未启动或 LLM API Key 无效  
**解决**: 
- 启动 Celery Worker: `celery -A app.infra.queue worker --loglevel=info --pool=solo`
- 检查后端 `.env` 中的 LLM API Key

### 3. 报价篮数据丢失
**原因**: 小程序缓存被清除  
**解决**: 报价篮使用本地存储，清除缓存会丢失数据

### 4. TabBar 图标不显示
**原因**: 图标文件未准备  
**解决**: 在 `miniprogram/assets/icons/` 目录下放置图标文件，或临时注释掉 `app.json` 中的 `iconPath`

## 📝 开发建议

### 添加新页面
1. 在 `pages/` 目录下创建新文件夹
2. 创建 4 个文件：`.wxml`, `.ts`, `.wxss`, `.json`
3. 在 `app.json` 的 `pages` 数组中注册

### 调用新 API
1. 在 `utils/api.ts` 中添加方法
2. 使用 `this.request<T>()` 统一处理
3. 自动处理 token 和错误

### 本地存储
1. 使用 `utils/storage.ts` 中的方法
2. 避免直接使用 `wx.setStorageSync`

## 🚀 部署上线

### 小程序发布流程
1. 在微信公众平台注册小程序
2. 获取 AppID
3. 在开发者工具中配置 AppID
4. 修改 `API_BASE_URL` 为生产环境地址
5. 点击"上传"按钮
6. 在公众平台提交审核
7. 审核通过后发布

### 后端部署
参考后端项目的 README.md

## 📄 License

MIT License

## 👥 贡献者

TFRM Team

## 📞 联系方式

如有问题，请联系项目维护者。
