# TFRM 旅行资源智能管理平台

<div align="center">

**AI 驱动的旅游资源碎片化管理系统**

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115.0-009688.svg?style=flat&logo=FastAPI&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19.2-61DAFB.svg?style=flat&logo=React&logoColor=black)](https://reactjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6.svg?style=flat&logo=TypeScript&logoColor=white)](https://www.typescriptlang.org)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

[功能特性](#-核心功能) • [快速开始](#-快速开始) • [架构说明](#-系统架构) • [部署指南](#-生产部署)

</div>

---

## 📖 项目简介

TFRM（Travel Fragment Resource Management）是一个面向旅行社的智能资源管理平台，通过 AI 技术解决碎片化资源信息的导入、管理和报价难题。

**核心价值**：
- 🤖 **AI 智能解析**：自动从文本/图片/PDF 中提取结构化资源信息
- 📦 **统一资源库**：集中管理酒店、门票、交通、导游等多品类资源
- 💰 **灵活定价**：支持固定价、日历价、动态定价规则
- 📋 **快速报价**：组合资源生成报价单，支持 PDF 导出和在线分享
- 🏢 **多租户隔离**：每个旅行社独立数据空间

**适用场景**：
- 旅行社销售人员快速录入供应商资源
- 产品经理管理和维护资源库
- 销售团队组合资源生成客户报价

---

## 🏗️ 系统架构

本项目采用前后端分离架构，包含三个主要模块：

```
tfrm-backend/
├── app/                      # 后端 API 服务 (FastAPI)
│   ├── domain/              # 领域服务层
│   │   ├── auth/           # 认证与授权
│   │   ├── imports/        # 智能导入
│   │   ├── skus/           # SKU 管理
│   │   ├── quotations/     # 报价管理
│   │   ├── vendors/        # 供应商管理
│   │   ├── pricing/        # 定价规则
│   │   └── products/       # 产品管理
│   ├── infra/              # 基础设施层
│   │   ├── db.py          # 数据库连接
│   │   ├── queue.py       # Celery 任务队列
│   │   ├── storage.py     # 文件存储
│   │   └── audit.py       # 审计日志
│   ├── main.py            # FastAPI 应用入口
│   └── config.py          # 配置管理
│
├── web/                      # Web 前端 (React + Vite)
│   ├── components/          # React 组件
│   │   ├── Auth/           # 登录注册
│   │   ├── ProductLibrary/ # 产品库
│   │   └── Quotation/      # 报价管理
│   ├── services/           # API 服务层
│   ├── contexts/           # React Context
│   └── App.tsx             # 应用入口
│
├── tfrm-miniprogram/         # 微信小程序
│   └── miniprogram/
│       ├── pages/          # 小程序页面
│       │   ├── login/      # 登录
│       │   ├── import/     # 碎片导入
│       │   ├── skus/       # 资源库
│       │   └── quotation/  # 报价管理
│       └── utils/          # 工具类
│
├── alembic/                  # 数据库迁移
├── requirements.txt          # Python 依赖
└── README.md                # 本文档
```

### 技术栈

| 模块 | 技术栈 |
|------|--------|
| **后端** | FastAPI 0.115 + SQLAlchemy 2.0 + PostgreSQL 14+ + Redis 6+ + Celery 5 |
| **前端** | React 19 + Vite 6 + TypeScript 5.8 + TailwindCSS 3 |
| **小程序** | 微信小程序原生框架 + TypeScript |
| **AI/OCR** | Kimi/DeepSeek/Gemini/OpenAI + EasyOCR/PaddleOCR |
| **其他** | Alembic (迁移) + ReportLab (PDF) + httpx (HTTP客户端) |

---

## ✨ 核心功能

### 1. 智能导入 (`/app/domain/imports`)
- 📝 支持文本、图片、PDF 多种格式输入
- 🤖 LLM 自动提取结构化字段（名称、价格、成本、地址、标签等）
- 🔍 提供提取证据，支持人工确认和修改
- 📦 覆盖酒店、交通、门票、餐饮、活动、行程、导游等品类
- ⚡ Celery 异步处理，支持批量导入

### 2. 产品库管理 (`/app/domain/skus`)
- 📋 SKU CRUD 操作
- 🏷️ 标签、城市、类型多维度筛选
- 💵 三种价格模式：
  - **固定价**：单一价格
  - **日历价**：按日期设置不同价格
  - **规则价**：基于定价因子动态计算
- 📊 批量调价、批量更新、批量删除
- 🔄 支持从公共 SKU 库拉取

### 3. 定价规则 (`/app/domain/pricing`)
- 📐 按品类/城市/标签/供应商设置定价因子
- 💹 支持倍率（markup）和加价（margin）两种模式
- 🎯 灵活的规则优先级和组合

### 4. 报价管理 (`/app/domain/quotations`)
- 🛒 组合多个 SKU 生成报价单
- 📄 PDF 导出（带公司 Logo 和客户信息）
- 🔗 生成公开分享链接（无需登录访问）
- 💼 支持草稿、已发布状态管理

### 5. 供应商管理 (`/app/domain/vendors`)
- 🏢 供应商 CRUD 操作
- 📝 供应商备注管理
- 🎨 AI 自动生成供应商 Logo

### 6. 认证与多租户 (`/app/domain/auth`)
- 🔐 JWT Token 认证
- 👥 基于 `agency_id` 的多租户数据隔离
- 🛡️ 所有查询自动应用租户过滤（`scoped_query`）

---

## 🚀 快速开始

### 环境要求

- **Python**: 3.9 - 3.11 (推荐 3.11)
- **Node.js**: 18+
- **PostgreSQL**: 14+
- **Redis**: 6+
- **微信开发者工具**: 最新稳定版（仅小程序开发需要）

### 1️⃣ 后端启动 (`/app`)

#### 安装依赖

```bash
# 创建虚拟环境（推荐）
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 安装依赖
pip install -r requirements.txt
```

#### 配置环境变量

创建 `.env` 文件：

```bash
# 数据库配置
DATABASE_URL=postgresql://postgres:password@localhost:5432/tfrm
REDIS_URL=redis://localhost:6379/0

# JWT 配置
SECRET_KEY=your-super-secret-key-change-me-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60

# LLM 配置（选择一个）
LLM_PROVIDER=kimi                    # 可选: kimi | deepseek | gemini | openai
KIMI_API_KEY=your-kimi-api-key
KIMI_MODEL=kimi-k2.5

# 存储配置
STORAGE_PROVIDER=local
STORAGE_PATH=./uploads

# 环境配置
APP_ENV=development                  # development | production
CORS_ALLOW_ALL_IN_DEV=true
```

#### 初始化数据库

```bash
# 运行迁移
alembic upgrade head
```

#### 启动服务

```bash
# 1. 启动 Redis
redis-server

# 2. 启动 Celery Worker (Windows 需要 --pool=solo)
celery -A app.infra.queue worker --loglevel=info --pool=solo

# 3. 启动 FastAPI
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

#### 访问后端

- 🏠 健康检查: http://localhost:8000/
- 📚 API 文档: http://localhost:8000/docs
- 📖 ReDoc: http://localhost:8000/redoc

---

### 2️⃣ Web 前端启动 (`/web`)

#### 安装依赖

```bash
cd web
npm install
```

#### 配置环境变量

复制 `.env.example` 为 `.env`：

```bash
VITE_API_BASE_URL=http://localhost:8000
VITE_APP_NAME=旅行资源系统
VITE_APP_VERSION=1.0.0
```

#### 启动开发服务

```bash
npm run dev -- --host --port 5173
```

#### 访问前端

🌐 http://localhost:5173

#### 构建生产版本

```bash
npm run build        # 构建到 dist/
npm run preview      # 预览构建结果
```

---

### 3️⃣ 微信小程序启动 (`/tfrm-miniprogram`)

#### 配置后端地址

编辑 `miniprogram/utils/api.ts`：

```typescript
const API_BASE_URL = 'http://localhost:8000'  # 修改为你的后端地址
```

#### 打开微信开发者工具

1. 导入项目
2. 选择项目目录: `tfrm-miniprogram`
3. AppID: 使用测试号或你的小程序 AppID
4. 点击"编译"运行

#### 小程序功能流程

```
登录 → 碎片导入 → AI解析 → 确认入库 → 资源检索 → 组合报价 → 发布分享
```

详细使用说明请参考 [`tfrm-miniprogram/README.md`](tfrm-miniprogram/README.md)

---

## 📱 使用流程

### 典型业务场景

1. **注册/登录**
   - Web: 访问 `/auth/login`
   - 小程序: 登录页面
   - 获取 JWT Token 和 `agency_id`

2. **智能导入资源**
   - 上传 PDF/图片或粘贴文本
   - 调用 `/imports/extract` 触发 AI 解析
   - Celery 异步处理（10-30秒）

3. **确认入库**
   - 查看 AI 提取的字段和证据
   - 修改不准确的信息
   - 选择 SKU 类型
   - 调用 `/imports/{id}/confirm` 入库

4. **管理产品库**
   - 查看/编辑 SKU
   - 设置价格（固定/日历/规则）
   - 批量调价、批量操作

5. **生成报价**
   - 选择多个 SKU
   - 创建报价单
   - 导出 PDF 或生成分享链接
   - 发送给客户

6. **供应商管理**
   - 维护供应商信息
   - 添加备注
   - AI 生成 Logo

---

## 🔌 API 接口

### 认证相关
- `POST /auth/register` - 用户注册
- `POST /auth/login` - 用户登录
- `GET /auth/me` - 获取当前用户信息

### SKU 管理
- `GET /skus` - 查询 SKU 列表（支持筛选）
- `POST /skus` - 创建 SKU
- `GET /skus/{id}` - 获取 SKU 详情
- `PUT /skus/{id}` - 更新 SKU
- `DELETE /skus/{id}` - 删除 SKU
- `POST /skus/batch-pricing` - 批量调价
- `POST /skus/batch-update` - 批量更新
- `POST /skus/batch-delete` - 批量删除
- `PUT /skus/{id}/price-calendar` - 设置价格日历

### 智能导入
- `GET /imports` - 查询导入任务列表
- `POST /imports/extract` - 创建导入任务（触发 AI 解析）
- `GET /imports/{id}` - 获取导入任务详情
- `POST /imports/{id}/confirm` - 确认入库

### 报价管理
- `GET /quotations` - 查询报价单列表
- `POST /quotations` - 创建报价单
- `GET /quotations/{id}` - 获取报价单详情
- `PUT /quotations/{id}` - 更新报价单
- `DELETE /quotations/{id}` - 删除报价单
- `POST /quotations/{id}/items` - 添加报价项
- `POST /quotations/{id}/publish` - 发布报价（生成分享链接）
- `GET /quotations/{id}/export/pdf` - 导出 PDF
- `GET /share/quotations/{id}` - 公开访问报价（无需登录）

### 供应商管理
- `GET /vendors` - 查询供应商列表
- `POST /vendors` - 创建供应商
- `GET /vendors/{id}` - 获取供应商详情
- `PUT /vendors/{id}` - 更新供应商
- `DELETE /vendors/{id}` - 删除供应商
- `POST /vendors/{id}/notes` - 添加备注
- `POST /vendors/{id}/generate-logo` - AI 生成 Logo

### 文件上传
- `POST /upload` - 多文件上传（multipart/form-data）

完整 API 文档请访问: http://localhost:8000/docs

---

## 🧪 测试

### 运行集成测试

```bash
# 需要先启动 PostgreSQL、Redis、Celery、FastAPI
python test_integration_real_server.py
```

### 数据库迁移

```bash
# 自动生成迁移脚本
alembic revision --autogenerate -m "描述变更内容"

# 应用迁移
alembic upgrade head

# 回滚迁移
alembic downgrade -1
```

---

## 🚢 生产部署

### 后端部署

#### 使用 Gunicorn + Uvicorn

```bash
# 安装 gunicorn
pip install gunicorn

# 启动服务（4 个 worker）
gunicorn app.main:app \
  -w 4 \
  -k uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000 \
  --access-logfile - \
  --error-logfile -
```

#### 使用 Supervisor 管理 Celery

创建 `/etc/supervisor/conf.d/tfrm-celery.conf`：

```ini
[program:tfrm-celery]
command=/path/to/venv/bin/celery -A app.infra.queue worker --loglevel=info
directory=/path/to/tfrm-backend
user=www-data
autostart=true
autorestart=true
stderr_logfile=/var/log/tfrm-celery.err.log
stdout_logfile=/var/log/tfrm-celery.out.log
```

#### 使用 systemd 管理服务

创建 `/etc/systemd/system/tfrm-api.service`：

```ini
[Unit]
Description=TFRM FastAPI Service
After=network.target postgresql.service redis.service

[Service]
Type=notify
User=www-data
WorkingDirectory=/path/to/tfrm-backend
Environment="PATH=/path/to/venv/bin"
ExecStart=/path/to/venv/bin/gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
Restart=always

[Install]
WantedBy=multi-user.target
```

启动服务：

```bash
sudo systemctl daemon-reload
sudo systemctl enable tfrm-api
sudo systemctl start tfrm-api
```

### 前端部署

#### 构建静态文件

```bash
cd web
npm run build
# 生成 dist/ 目录
```

#### Nginx 配置示例

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端静态文件
    location / {
        root /path/to/tfrm-backend/web/dist;
        try_files $uri $uri/ /index.html;
    }

    # 后端 API 代理
    location /api/ {
        proxy_pass http://localhost:8000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 上传文件访问
    location /uploads/ {
        alias /path/to/tfrm-backend/uploads/;
    }
}
```

### 小程序部署

1. 在微信公众平台注册小程序
2. 获取 AppID
3. 修改 `API_BASE_URL` 为生产环境地址（需要 HTTPS）
4. 在微信开发者工具中上传代码
5. 在公众平台提交审核
6. 审核通过后发布

### 安全建议

- ✅ 使用强随机 `SECRET_KEY`（至少 32 字符）
- ✅ LLM API Key 使用环境变量或密钥管理服务
- ✅ 生产环境关闭 CORS `*` 通配符
- ✅ 启用 HTTPS（Let's Encrypt）
- ✅ 配置防火墙规则
- ✅ 定期备份数据库
- ✅ 使用对象存储（OSS/S3）替代本地文件存储
- ✅ 配置日志轮转和监控告警

---

## ❓ 常见问题

### 后端相关

**Q: Celery 启动失败？**  
A: Windows 必须使用 `--pool=solo`，Linux 可用默认 `prefork`。

**Q: LLM 解析返回 401/429？**  
A: 检查 API Key 是否正确，账户是否有足够额度。

**Q: 图片解析失败？**  
A: 确保安装了 OCR 依赖（EasyOCR 或 PaddleOCR），部分 LLM（如 DeepSeek）不支持视觉，会先用 OCR 提取文本。

**Q: 数据库连接失败？**  
A: 检查 PostgreSQL 是否启动，`DATABASE_URL` 配置是否正确。

### 前端相关

**Q: API 请求跨域错误？**  
A: 检查后端 CORS 配置，开发环境应允许前端域名。

**Q: 登录后立即退出？**  
A: 检查 Token 是否正确存储在 `localStorage`，后端 `/auth/me` 接口是否正常。

### 小程序相关

**Q: 小程序无法连接后端？**  
A: 
- 开发环境：在微信开发者工具中勾选"不校验合法域名"
- 生产环境：在公众平台配置服务器域名（需要 HTTPS）

**Q: AI 解析一直显示"解析中"？**  
A: 检查 Celery Worker 是否启动，LLM API Key 是否配置正确。

---

## 📚 相关文档

- [前后端集成说明](FRONTEND_BACKEND_INTEGRATION.md)
- [小程序详细文档](tfrm-miniprogram/README.md)
- [FastAPI 官方文档](https://fastapi.tiangolo.com)
- [React 官方文档](https://react.dev)
- [微信小程序开发文档](https://developers.weixin.qq.com/miniprogram/dev/framework/)

---

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

---

## 📄 开源协议

本项目采用 [MIT License](LICENSE) 开源协议。

---

## 👥 团队

TFRM Team

---

## 📞 联系方式

如有问题或建议，欢迎通过以下方式联系：

- 📧 Email: your-email@example.com
- 💬 Issues: [GitHub Issues](https://github.com/your-username/tfrm-backend/issues)

---

<div align="center">

**⭐ 如果这个项目对你有帮助，请给一个 Star！⭐**

Made with ❤️ by TFRM Team

最后更新：2026-01-29

</div>
