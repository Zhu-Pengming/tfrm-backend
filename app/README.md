# TFRM 后端 API

<div align="center">

**基于 FastAPI + SQLAlchemy + PostgreSQL 的旅行资源管理后端服务**

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688.svg?style=flat&logo=FastAPI&logoColor=white)](https://fastapi.tiangolo.com)
[![Python](https://img.shields.io/badge/Python-3.9--3.11-3776AB.svg?style=flat&logo=Python&logoColor=white)](https://www.python.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-336791.svg?style=flat&logo=PostgreSQL&logoColor=white)](https://www.postgresql.org)
[![Redis](https://img.shields.io/badge/Redis-6+-DC382D.svg?style=flat&logo=Redis&logoColor=white)](https://redis.io)

</div>

---

## 📖 项目简介

TFRM 后端是旅行资源智能管理平台的核心 API 服务，提供完整的资源管理、智能解析、报价生成等功能。采用领域驱动设计（DDD），清晰的分层架构，易于扩展和维护。

**核心特性**：
- 🏗️ **DDD 架构**：领域层、基础设施层分离
- 🔐 **JWT 认证**：安全的用户认证和授权
- 🏢 **多租户隔离**：基于 agency_id 的数据隔离
- 🤖 **AI 集成**：支持多种 LLM（Kimi/DeepSeek/Gemini/OpenAI）
- ⚡ **异步任务**：Celery 处理耗时操作
- 📊 **审计日志**：完整的操作记录

---

## 🏗️ 项目结构

```
app/
├── domain/                  # 领域服务层
│   ├── auth/               # 认证与授权
│   │   ├── models.py       # 用户模型
│   │   ├── schemas.py      # 数据模式
│   │   ├── service.py      # 认证服务
│   │   └── dependencies.py # 依赖注入
│   ├── imports/            # 智能导入
│   │   ├── models.py       # 导入任务模型
│   │   ├── schemas.py      # 数据模式
│   │   ├── service.py      # 导入服务
│   │   └── tasks.py        # Celery 任务
│   ├── skus/               # SKU 管理
│   │   ├── models.py       # SKU 模型
│   │   ├── schemas.py      # 数据模式
│   │   ├── service.py      # SKU 服务
│   │   └── pricing.py      # 定价逻辑
│   ├── quotations/         # 报价管理
│   │   ├── models.py       # 报价模型
│   │   ├── schemas.py      # 数据模式
│   │   ├── service.py      # 报价服务
│   │   ├── pdf.py          # PDF 生成
│   │   └── share.py        # 分享链接
│   ├── vendors/            # 供应商管理
│   │   ├── models.py       # 供应商模型
│   │   ├── schemas.py      # 数据模式
│   │   └── service.py      # 供应商服务
│   ├── pricing/            # 定价规则
│   │   ├── models.py       # 定价规则模型
│   │   └── service.py      # 定价服务
│   └── products/           # 产品管理
│       ├── models.py       # 产品模型
│       └── service.py      # 产品服务
├── infra/                  # 基础设施层
│   ├── db.py              # 数据库连接
│   ├── queue.py           # Celery 配置
│   ├── storage.py         # 文件存储
│   ├── audit.py           # 审计日志
│   ├── llm.py             # LLM 客户端
│   └── ocr.py             # OCR 引擎
├── main.py                # FastAPI 应用入口
├── config.py              # 配置管理
└── README.md              # 本文档
```

---

## 🚀 快速开始

### 环境要求

- **Python**: 3.9 - 3.11 (推荐 3.11)
- **PostgreSQL**: 14+
- **Redis**: 6+
- **操作系统**: Linux/macOS/Windows

### 安装步骤

#### 1. 创建虚拟环境

```bash
python -m venv venv

# Linux/macOS
source venv/bin/activate

# Windows
venv\Scripts\activate
```

#### 2. 安装依赖

```bash
pip install -r ../requirements.txt
```

#### 3. 配置环境变量

在项目根目录创建 `.env` 文件：

```env
# 数据库配置
DATABASE_URL=postgresql://postgres:password@localhost:5432/tfrm
REDIS_URL=redis://localhost:6379/0

# JWT 配置
SECRET_KEY=your-super-secret-key-change-me-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60

# LLM 配置（选择一个）
LLM_PROVIDER=kimi                    # kimi | deepseek | gemini | openai
KIMI_API_KEY=your-kimi-api-key
KIMI_MODEL=kimi-k2.5

# 存储配置
STORAGE_PROVIDER=local
STORAGE_PATH=./uploads

# 环境配置
APP_ENV=development                  # development | production
CORS_ALLOW_ALL_IN_DEV=true
```

#### 4. 初始化数据库

```bash
# 运行数据库迁移
alembic upgrade head
```

#### 5. 启动服务

```bash
# 1. 启动 Redis
redis-server

# 2. 启动 Celery Worker (Windows 需要 --pool=solo)
celery -A app.infra.queue worker --loglevel=info --pool=solo

# 3. 启动 FastAPI
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

#### 6. 访问 API 文档

- 🏠 健康检查: http://localhost:8000/
- 📚 Swagger UI: http://localhost:8000/docs
- 📖 ReDoc: http://localhost:8000/redoc

---

## 📦 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| **FastAPI** | 0.115 | Web 框架 |
| **SQLAlchemy** | 2.0 | ORM |
| **PostgreSQL** | 14+ | 数据库 |
| **Redis** | 6+ | 缓存/队列 |
| **Celery** | 5.x | 异步任务 |
| **Alembic** | 1.x | 数据库迁移 |
| **Pydantic** | 2.x | 数据验证 |
| **ReportLab** | 4.x | PDF 生成 |
| **httpx** | 0.27 | HTTP 客户端 |

---

## 🎯 核心功能

### 1. 认证与授权 (`/domain/auth`)

#### 功能
- 用户注册和登录
- JWT Token 生成和验证
- 密码加密（bcrypt）
- 多租户隔离（agency_id）

#### API 端点
```
POST   /auth/register     # 用户注册
POST   /auth/login        # 用户登录
GET    /auth/me           # 获取当前用户信息
```

#### 核心代码
```python
# 获取当前用户（依赖注入）
from app.domain.auth.dependencies import get_current_user

@router.get("/protected")
async def protected_route(current_user: User = Depends(get_current_user)):
    return {"user": current_user.username}
```

### 2. 智能导入 (`/domain/imports`)

#### 功能
- 文本/图片/PDF 上传
- AI 自动提取结构化信息
- Celery 异步处理
- 提取证据展示
- 人工确认和修改

#### API 端点
```
GET    /imports              # 查询导入任务列表
POST   /imports/extract      # 创建导入任务
GET    /imports/{id}         # 获取导入任务详情
POST   /imports/{id}/confirm # 确认入库
```

#### 工作流程
```
1. 用户上传资源信息
2. 创建导入任务（状态: pending）
3. Celery 异步调用 LLM 解析
4. 更新任务状态（parsing → completed/failed）
5. 用户确认提取字段
6. 创建 SKU 入库
```

### 3. SKU 管理 (`/domain/skus`)

#### 功能
- SKU CRUD 操作
- 多维度筛选（关键词/城市/类型/标签）
- 三种价格模式：
  - **固定价**：单一价格
  - **日历价**：按日期设置价格
  - **规则价**：基于定价因子动态计算
- 批量操作（调价/更新/删除）

#### API 端点
```
GET    /skus                    # 查询 SKU 列表
POST   /skus                    # 创建 SKU
GET    /skus/{id}               # 获取 SKU 详情
PUT    /skus/{id}               # 更新 SKU
DELETE /skus/{id}               # 删除 SKU
PUT    /skus/{id}/price-calendar # 设置价格日历
POST   /skus/batch-pricing      # 批量调价
POST   /skus/batch-update       # 批量更新
POST   /skus/batch-delete       # 批量删除
```

#### 数据模型
```python
class SKU(Base):
    id: int
    agency_id: int          # 租户隔离
    name: str               # 名称
    sku_type: str          # 类型（hotel/ticket/guide/transport）
    price: Decimal         # 售价
    cost: Decimal          # 成本
    city: str              # 城市
    tags: List[str]        # 标签
    attrs: Dict            # 扩展属性
    pricing_mode: str      # 定价模式
    price_calendar: Dict   # 价格日历
```

### 4. 报价管理 (`/domain/quotations`)

#### 功能
- 创建和编辑报价单
- 添加多个 SKU
- 生成 PDF 报价单
- 生成公开分享链接
- 报价单状态管理

#### API 端点
```
GET    /quotations              # 查询报价单列表
POST   /quotations              # 创建报价单
GET    /quotations/{id}         # 获取报价单详情
PUT    /quotations/{id}         # 更新报价单
DELETE /quotations/{id}         # 删除报价单
POST   /quotations/{id}/items   # 添加报价项
POST   /quotations/{id}/publish # 发布报价
GET    /quotations/{id}/export/pdf # 导出 PDF
GET    /share/quotations/{id}   # 公开访问（无需登录）
```

#### PDF 生成
```python
from app.domain.quotations.pdf import generate_quotation_pdf

pdf_bytes = generate_quotation_pdf(quotation)
```

### 5. 供应商管理 (`/domain/vendors`)

#### 功能
- 供应商 CRUD 操作
- 供应商备注管理
- AI 生成供应商 Logo

#### API 端点
```
GET    /vendors              # 查询供应商列表
POST   /vendors              # 创建供应商
GET    /vendors/{id}         # 获取供应商详情
PUT    /vendors/{id}         # 更新供应商
DELETE /vendors/{id}         # 删除供应商
POST   /vendors/{id}/notes   # 添加备注
POST   /vendors/{id}/generate-logo # AI 生成 Logo
```

### 6. 定价规则 (`/domain/pricing`)

#### 功能
- 按品类/城市/标签/供应商设置定价因子
- 支持倍率（markup）和加价（margin）
- 灵活的规则优先级

#### API 端点
```
GET    /pricing-rules        # 查询定价规则
POST   /pricing-rules        # 创建定价规则
PUT    /pricing-rules/{id}   # 更新定价规则
DELETE /pricing-rules/{id}   # 删除定价规则
```

---

## 🔐 多租户隔离

### 实现机制

所有数据查询自动应用租户过滤：

```python
from app.domain.auth.dependencies import scoped_query

@router.get("/skus")
async def list_skus(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 自动过滤当前用户的 agency_id
    skus = scoped_query(db, SKU, current_user).all()
    return skus
```

### 数据隔离规则

- 每个用户属于一个 `agency_id`
- 所有查询自动添加 `WHERE agency_id = ?`
- 创建数据时自动设置 `agency_id`
- 跨租户访问被严格禁止

---

## 🤖 LLM 集成

### 支持的 LLM 提供商

| 提供商 | 模型 | 特点 |
|--------|------|------|
| **Kimi** | kimi-k2.5 | 长上下文，中文友好 |
| **DeepSeek** | deepseek-chat | 高性价比 |
| **Gemini** | gemini-2.0-flash | 多模态支持 |
| **OpenAI** | gpt-4o | 最强性能 |

### 配置方式

```env
LLM_PROVIDER=kimi
KIMI_API_KEY=your-api-key
KIMI_MODEL=kimi-k2.5
```

### 使用示例

```python
from app.infra.llm import get_llm_client

llm = get_llm_client()
response = await llm.extract_resource_info(text)
```

---

## ⚡ Celery 异步任务

### 任务类型

1. **AI 解析任务** (`extract_resource_task`)
   - 调用 LLM 提取资源信息
   - 更新导入任务状态
   - 存储提取结果

2. **PDF 生成任务** (可选)
   - 生成报价单 PDF
   - 异步发送邮件

### 启动 Worker

```bash
# Linux/macOS
celery -A app.infra.queue worker --loglevel=info

# Windows
celery -A app.infra.queue worker --loglevel=info --pool=solo
```

### 监控任务

```bash
# 启动 Flower (Web UI)
celery -A app.infra.queue flower
```

访问 http://localhost:5555 查看任务状态

---

## 📊 数据库迁移

### 创建迁移

```bash
# 自动生成迁移脚本
alembic revision --autogenerate -m "描述变更内容"
```

### 应用迁移

```bash
# 升级到最新版本
alembic upgrade head

# 升级到指定版本
alembic upgrade <revision_id>
```

### 回滚迁移

```bash
# 回滚一个版本
alembic downgrade -1

# 回滚到指定版本
alembic downgrade <revision_id>
```

### 查看迁移历史

```bash
alembic history
alembic current
```

---

## 🧪 测试

### 运行测试

```bash
# 运行所有测试
pytest

# 运行指定测试文件
pytest tests/test_auth.py

# 运行集成测试
python test_integration_real_server.py
```

### 测试覆盖率

```bash
pytest --cov=app --cov-report=html
```

---

## 🚢 生产部署

### 使用 Gunicorn + Uvicorn

```bash
gunicorn app.main:app \
  -w 4 \
  -k uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000 \
  --access-logfile - \
  --error-logfile -
```

### 使用 systemd

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

### 使用 Docker

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ ./app/
COPY alembic/ ./alembic/
COPY alembic.ini .

EXPOSE 8000

CMD ["gunicorn", "app.main:app", "-w", "4", "-k", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8000"]
```

---

## 🐛 常见问题

### 1. Celery 启动失败

**原因**：Windows 不支持 prefork 模式

**解决**：
```bash
celery -A app.infra.queue worker --loglevel=info --pool=solo
```

### 2. LLM 解析返回 401/429

**原因**：API Key 无效或额度不足

**解决**：
- 检查 `.env` 中的 API Key
- 检查账户余额

### 3. 数据库连接失败

**原因**：PostgreSQL 未启动或配置错误

**解决**：
```bash
# 检查 PostgreSQL 状态
sudo systemctl status postgresql

# 检查连接
psql -U postgres -h localhost -d tfrm
```

### 4. 图片解析失败

**原因**：OCR 依赖未安装

**解决**：
```bash
pip install easyocr
# 或
pip install paddleocr
```

---

## 📚 相关文档

- [项目主 README](../README.md)
- [前端文档](../web/README.md)
- [小程序文档](../tfrm-miniprogram/README.md)
- [FastAPI 官方文档](https://fastapi.tiangolo.com)
- [SQLAlchemy 文档](https://docs.sqlalchemy.org)
- [Celery 文档](https://docs.celeryq.dev)

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
