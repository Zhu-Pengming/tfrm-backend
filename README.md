# TFRM Backend - 旅行社碎片化资源智能管理系统

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115.0-009688.svg)](https://fastapi.tiangolo.com)
[![Python](https://img.shields.io/badge/Python-3.9+-blue.svg)](https://www.python.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-336791.svg)](https://www.postgresql.org)

> 基于AI的旅行社碎片化资源智能管理系统，实现从碎片输入到报价分享的完整数据流水线

## 📋 目录

- [核心特性](#核心特性)
- [技术架构](#技术架构)
- [快速开始](#快速开始)
- [完整工作流](#完整工作流)
- [测试指南](#测试指南)
- [部署指南](#部署指南)
- [API文档](#api文档)

---

## 🎯 核心特性

### 数据流水线
```
碎片输入 → AI解析 → 人确认 → 入库 → 检索 → 组合报价 → 分享
```

---

## 🏗️ 技术架构

### 项目结构

```
tfrm-backend/
├── app/
│   ├── main.py                 # FastAPI应用入口
│   ├── config.py               # 配置管理
│   ├── domain/                 # 业务领域模块（DDD）
│   │   ├── auth/              # 认证授权 + 多租户
│   │   ├── skus/              # SKU管理（通用+attrs）
│   │   ├── imports/           # AI导入（异步+evidence）
│   │   ├── quotations/        # 报价引擎（快照+转换器）
│   │   └── pricing/           # Factor加价规则
│   └── infra/                 # 基础设施层
│       ├── db.py              # 数据库 + scoped_query
│       ├── llm_client.py      # LLM统一接口
│       ├── queue.py           # Celery任务队列
│       ├── storage.py         # 文件存储
│       └── audit.py           # 审计日志
├── alembic/                   # 数据库迁移
├── test_integration_real_server.py  # 集成测试脚本
├── requirements.txt
└── README.md
```


## 🚀 快速开始

### 前置要求

- Python 3.9+
- PostgreSQL 14+
- Redis 6+
- LLM API Key（Gemini/DeepSeek/OpenAI任选其一）

### 1. 克隆项目

```bash
cd c:\Users\lenovo\CascadeProjects\tfrm-backend
```

### 2. 安装依赖

```bash
pip install -r requirements.txt
```

### 3. 配置环境变量

创建 `.env` 文件：

```env
# 数据库配置
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/tfrm

# Redis配置
REDIS_URL=redis://localhost:6379/0

# JWT配置
SECRET_KEY=your-super-secret-key-change-this-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# LLM配置（选择一个）
LLM_PROVIDER=gemini
GEMINI_API_KEY=your-gemini-api-key

# 或使用DeepSeek
# LLM_PROVIDER=deepseek
# DEEPSEEK_API_KEY=your-deepseek-api-key

# 或使用OpenAI
# LLM_PROVIDER=openai
# OPENAI_API_KEY=your-openai-api-key

# 存储配置
STORAGE_PROVIDER=local
STORAGE_PATH=./uploads
```

### 4. 初始化数据库

```bash
# 创建数据库
psql -U postgres -c "CREATE DATABASE tfrm;"

# 运行迁移
alembic upgrade head
```

### 5. 启动服务

#### 方式1: 分别启动（开发环境）

**终端1 - 启动Redis:**
```bash
redis-server
```

**终端2 - 启动Celery Worker:**
```bash
celery -A app.infra.queue worker --loglevel=info --pool=solo
```

**终端3 - 启动FastAPI:**
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

#### 方式2: 使用PowerShell脚本（推荐）

创建 `start_all.ps1`:
```powershell
# 启动Redis
Start-Process redis-server

# 启动Celery Worker
Start-Process powershell -ArgumentList "-Command celery -A app.infra.queue worker --loglevel=info --pool=solo"

# 启动FastAPI
Start-Process powershell -ArgumentList "-Command uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
```

运行：
```bash
.\start_all.ps1
```

### 6. 验证安装

访问 http://localhost:8000 应该看到：
```json
{
  "message": "TFRM API is running",
  "version": "1.0.0",
  "docs": "/docs"
}
```

访问 http://localhost:8000/docs 查看交互式API文档

---

## 🔄 完整工作流

### 工作流概览

```
┌─────────────┐
│ 1. 碎片输入 │ 用户粘贴酒店/门票/导游等碎片信息
└──────┬──────┘
       ↓
┌─────────────┐
│ 2. AI解析   │ 真实LLM异步解析，提取结构化字段
└──────┬──────┘
       ↓
┌─────────────┐
│ 3. 人确认   │ 用户查看AI提取结果，确认或修改
└──────┬──────┘
       ↓
┌─────────────┐
│ 4. 入库     │ 生成SKU，保存到数据库
└──────┬──────┘
       ↓
┌─────────────┐
│ 5. 可检索   │ 多维度搜索（关键词/城市/标签）
└──────┬──────┘
       ↓
┌─────────────┐
│ 6. 组合报价 │ 选择多个SKU，生成报价单（含快照）
└──────┬──────┘
       ↓
┌─────────────┐
│ 7. 对外分享 │ 发布报价单，生成分享链接
└─────────────┘
```

### 详细流程说明

#### 步骤1: 碎片输入

用户粘贴非结构化文本：
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

**API调用:**
```bash
POST /imports
{
  "input_text": "清迈亲子酒店套餐...",
  "input_files": []
}
```

**返回:**
```json
{
  "id": "IMPORT-20240117-XXXX",
  "status": "created",
  "created_at": "2024-01-17T10:00:00Z"
}
```

#### 步骤2: AI解析成草稿

Celery异步任务调用真实LLM（Gemini/DeepSeek）：

**状态流转:**
```
created → parsing → parsed
```

**API查询:**
```bash
GET /imports/{task_id}
```

**返回（解析完成后）:**
```json
{
  "id": "IMPORT-20240117-XXXX",
  "status": "parsed",
  "extracted_fields": {
    "sku_name": "清迈亲子酒店套餐",
    "destination_city": "清迈",
    "hotel_name": "清迈假日酒店",
    "room_type_name": "家庭房",
    "daily_sell_price": 499.0,
    "daily_cost_price": 350.0,
    "address": "清迈市中心"
  },
  "evidence": {
    "hotel_name": "从文本'酒店：清迈假日酒店'提取",
    "daily_sell_price": "从文本'价格：499元/晚'提取"
  },
  "confidence": 0.95
}
```

#### 步骤3: 人确认

用户查看AI提取结果，确认或修改：

**API调用:**
```bash
POST /imports/{task_id}/confirm
{
  "sku_type": "hotel",
  "extracted_fields": {
    "sku_name": "清迈亲子酒店套餐",
    "destination_city": "清迈",
    ...
  }
}
```

**返回:**
```json
{
  "message": "Import confirmed",
  "sku_id": "TFRM-HOTEL-20240117-XXXX"
}
```

#### 步骤4: 入库

SKU保存到数据库，包含：
- 通用字段：id, sku_type, owner_type, agency_id, city, tags, status
- 品类字段：存储在 `attrs` (JSONB)

**数据结构:**
```json
{
  "id": "TFRM-HOTEL-20240117-XXXX",
  "sku_name": "清迈亲子酒店套餐",
  "sku_type": "hotel",
  "owner_type": "private",
  "agency_id": "AGENCY-001",
  "destination_city": "清迈",
  "tags": ["亲子", "酒店"],
  "status": "active",
  "attrs": {
    "hotel_name": "清迈假日酒店",
    "room_type_name": "家庭房",
    "daily_sell_price": 499.0,
    "daily_cost_price": 350.0
  }
}
```

#### 步骤5: 可检索

多种搜索方式：

```bash
# 关键词搜索
GET /skus?keyword=清迈

# 城市搜索
GET /skus?city=清迈

# 标签搜索
GET /skus?tags=亲子

# 类型搜索
GET /skus?sku_type=hotel

# 组合搜索
GET /skus?city=清迈&tags=亲子&sku_type=hotel
```

#### 步骤6: 组合成报价

选择多个SKU，生成报价单：

**API调用:**
```bash
POST /quotations
{
  "title": "清迈4天3晚亲子游套餐",
  "items": [
    {"sku_id": "TFRM-HOTEL-XXXX", "quantity": 3},
    {"sku_id": "TFRM-TICKET-YYYY", "quantity": 2}
  ],
  "customer_name": "张先生",
  "customer_contact": "13800138000"
}
```

**返回（含快照）:**
```json
{
  "id": "QUOTE-20240117-XXXX",
  "title": "清迈4天3晚亲子游套餐",
  "total_amount": 1737.0,
  "status": "draft",
  "items": [
    {
      "sku_id": "TFRM-HOTEL-XXXX",
      "quantity": 3,
      "unit_price": 499.0,
      "subtotal": 1497.0,
      "snapshot": {
        "item_name": "清迈亲子酒店套餐",
        "item_type": "hotel",
        "unit_price": 499.0
      }
    }
  ]
}
```

#### 步骤7: 对外分享

发布报价单，生成分享链接：

**API调用:**
```bash
POST /quotations/{quotation_id}/publish
```

**返回:**
```json
{
  "message": "Quotation published",
  "url": "/share/quotation/QUOTE-20240117-XXXX"
}
```

---

## 🧪 测试指南

### 测试类型

| 测试类型 | 文件 | 用途 |
|---------|------|------|
| 集成测试 | `test_integration_real_server.py` | 真实服务器 + 真实LLM |

### 运行集成测试

集成测试会模拟完整的7步工作流，使用真实的LLM进行AI解析。

#### 前置条件

1. **启动PostgreSQL**
```bash
# 确保数据库运行
psql -U postgres -c "SELECT version();"
```

2. **运行数据库迁移**
```bash
alembic upgrade head
```

3. **启动Redis**
```bash
redis-server
```

4. **启动Celery Worker**
```bash
celery -A app.infra.queue worker --loglevel=info --pool=solo
```

5. **启动FastAPI服务器**
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

#### 运行测试

在新终端中运行：
```bash
python test_integration_real_server.py
```

#### 测试输出示例

```
================================================================================
TFRM 完整流程集成测试 - 真实服务器 + 真实LLM
================================================================================

[检查] 检查服务器状态...
  ✓ 服务器运行正常

[认证] 注册用户: test_user
  ✓ 用户注册成功
  ✓ 登录成功，获取token
  ✓ 用户信息: agency_id=AGENCY-001

[步骤1] 碎片输入 - 创建导入任务
  ✓ 导入任务已创建
    Task ID: IMPORT-20240117-XXXX
    状态: created

[步骤2] AI解析成草稿 - 等待真实LLM解析...
  ⏳ 最多等待 60 秒...
  ⏳ 状态: parsing, 继续等待...
  ✓ AI解析完成 (耗时: 15秒)
  提取的字段:
    - sku_name: 清迈亲子酒店套餐
    - destination_city: 清迈
    - hotel_name: 清迈假日酒店
    - daily_sell_price: 499.0
    - daily_cost_price: 350.0
  置信度: 0.95
  证据数量: 8 个字段

[步骤3] 人确认 - 确认AI提取的信息
  ✓ 导入已确认
    SKU ID: TFRM-HOTEL-XXXX

[步骤4] 入库 - 验证SKU已保存
  ✓ SKU已成功入库
    名称: 清迈亲子酒店套餐
    类型: hotel
    状态: active

[步骤5] 可检索 - 测试搜索功能
  ✓ 关键词搜索 '清迈': 找到 2 个SKU
  ✓ 城市搜索 '清迈': 找到 2 个SKU
  ✓ 标签搜索 '亲子': 找到 2 个SKU

[步骤6] 组合成报价 - 创建报价单
  ✓ 报价单已创建
    报价单ID: QUOTE-XXXX
    标题: 清迈4天3晚亲子游套餐
    客户: 张先生
    总价: 1737.0元
    状态: draft

[步骤7] 对外分享 - 发布报价单
  ✓ 报价单已发布
    分享链接: /share/quotation/QUOTE-XXXX

================================================================================
✓✓✓ 完整流程集成测试通过！
================================================================================
```

### 测试命令总结

```bash
# 推荐方式：使用批处理脚本
# 1. 启动服务器（终端1）
.\start_server.bat

# 2. 启动Celery Worker（终端2）
celery -A app.infra.queue worker --loglevel=info --pool=solo

# 3. 运行集成测试（终端3）
python test_integration_real_server.py

# ===== 或手动启动所有服务 =====
# 终端1: Redis
redis-server

# 终端2: Celery Worker
celery -A app.infra.queue worker --loglevel=info --pool=solo

# 终端3: FastAPI服务器
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 终端4: 运行集成测试
python test_integration_real_server.py
```

---

## 🚢 部署指南

### 环境准备

#### 1. 安装PostgreSQL

**Windows:**
```bash
# 下载安装包
https://www.postgresql.org/download/windows/

# 创建数据库
psql -U postgres
CREATE DATABASE tfrm;
CREATE USER tfrm_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE tfrm TO tfrm_user;
```

**Linux:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo -u postgres psql
CREATE DATABASE tfrm;
CREATE USER tfrm_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE tfrm TO tfrm_user;
```

#### 2. 安装Redis

**Windows:**
```bash
# 下载 Redis for Windows
https://github.com/microsoftarchive/redis/releases

# 或使用WSL
wsl --install
wsl
sudo apt install redis-server
redis-server
```

**Linux:**
```bash
sudo apt install redis-server
sudo systemctl start redis
sudo systemctl enable redis
```

#### 3. 安装Python依赖

```bash
pip install -r requirements.txt
```

### 开发环境部署

#### 1. 配置环境变量

创建 `.env` 文件：
```env
DATABASE_URL=postgresql://tfrm_user:your_password@localhost:5432/tfrm
REDIS_URL=redis://localhost:6379/0
SECRET_KEY=your-super-secret-key-change-this
LLM_PROVIDER=gemini
GEMINI_API_KEY=your-gemini-api-key
STORAGE_PROVIDER=local
STORAGE_PATH=./uploads
```

#### 2. 初始化数据库

```bash
alembic upgrade head
```

#### 3. 启动服务

```bash
# 终端1: Redis
redis-server

# 终端2: Celery Worker
celery -A app.infra.queue worker --loglevel=info --pool=solo

# 终端3: FastAPI
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 生产环境部署

#### 1. 使用Gunicorn + Uvicorn Workers

```bash
# 安装Gunicorn
pip install gunicorn

# 启动（4个worker进程）
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

#### 2. 使用Supervisor管理进程

创建 `/etc/supervisor/conf.d/tfrm.conf`:
```ini
[program:tfrm-api]
command=/path/to/venv/bin/gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
directory=/path/to/tfrm-backend
user=www-data
autostart=true
autorestart=true
stderr_logfile=/var/log/tfrm/api.err.log
stdout_logfile=/var/log/tfrm/api.out.log

[program:tfrm-celery]
command=/path/to/venv/bin/celery -A app.infra.queue worker --loglevel=info
directory=/path/to/tfrm-backend
user=www-data
autostart=true
autorestart=true
stderr_logfile=/var/log/tfrm/celery.err.log
stdout_logfile=/var/log/tfrm/celery.out.log
```

启动：
```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start tfrm-api
sudo supervisorctl start tfrm-celery
```

#### 3. 使用Nginx反向代理

创建 `/etc/nginx/sites-available/tfrm`:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /uploads/ {
        alias /path/to/tfrm-backend/uploads/;
    }
}
```

启用配置：
```bash
sudo ln -s /etc/nginx/sites-available/tfrm /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### 4. 配置SSL证书（Let's Encrypt）

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

#### 5. 环境变量（生产）

创建 `/etc/environment` 或使用 `.env`:
```env
DATABASE_URL=postgresql://tfrm_user:secure_password@db-server:5432/tfrm
REDIS_URL=redis://redis-server:6379/0
SECRET_KEY=super-secure-random-key-min-32-chars
LLM_PROVIDER=gemini
GEMINI_API_KEY=production-api-key
STORAGE_PROVIDER=s3
S3_BUCKET=tfrm-uploads
S3_REGION=us-east-1
```

### Docker部署（可选）

创建 `Dockerfile`:
```dockerfile
FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["gunicorn", "app.main:app", "-w", "4", "-k", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8000"]
```

创建 `docker-compose.yml`:
```yaml
version: '3.8'

services:
  db:
    image: postgres:14
    environment:
      POSTGRES_DB: tfrm
      POSTGRES_USER: tfrm_user
      POSTGRES_PASSWORD: your_password
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:6
    
  api:
    build: .
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: postgresql://tfrm_user:your_password@db:5432/tfrm
      REDIS_URL: redis://redis:6379/0
    depends_on:
      - db
      - redis

  celery:
    build: .
    command: celery -A app.infra.queue worker --loglevel=info
    environment:
      DATABASE_URL: postgresql://tfrm_user:your_password@db:5432/tfrm
      REDIS_URL: redis://redis:6379/0
    depends_on:
      - db
      - redis

volumes:
  postgres_data:
```

启动：
```bash
docker-compose up -d
```

### 故障排查

#### 1. Celery无法启动（Windows）
```bash
# Windows需要使用solo pool
celery -A app.infra.queue worker --pool=solo --loglevel=info
```

#### 2. 数据库连接失败
```bash
# 检查PostgreSQL是否运行
psql -U postgres -c "SELECT version();"

# 检查.env中的DATABASE_URL
```

#### 3. LLM API调用失败
```bash
# 检查API Key是否正确
# 检查网络连接
# 查看Celery worker日志
```

#### 4. Redis连接失败
```bash
# 检查Redis是否运行
redis-cli ping

# 应返回 PONG
```

---

## 📚 API文档

### 交互式文档

启动服务后访问：
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### 核心API端点

#### 认证模块

| 方法 | 端点 | 描述 |
|------|------|------|
| POST | `/auth/register` | 注册用户 |
| POST | `/auth/login` | 用户登录 |
| GET | `/auth/me` | 获取当前用户信息 |

#### SKU管理

| 方法 | 端点 | 描述 |
|------|------|------|
| POST | `/skus` | 创建SKU |
| GET | `/skus/{sku_id}` | 获取SKU详情 |
| PUT | `/skus/{sku_id}` | 更新SKU |
| DELETE | `/skus/{sku_id}` | 删除SKU |
| GET | `/skus` | 搜索SKU（支持多种过滤） |
| POST | `/skus/pull/{public_sku_id}` | 拉取公共库SKU |

#### AI导入

| 方法 | 端点 | 描述 |
|------|------|------|
| POST | `/imports` | 创建导入任务 |
| GET | `/imports/{task_id}` | 获取导入任务状态 |
| GET | `/imports` | 列出导入任务 |
| POST | `/imports/{task_id}/confirm` | 确认导入 |

#### 报价管理

| 方法 | 端点 | 描述 |
|------|------|------|
| POST | `/quotations` | 创建报价单 |
| GET | `/quotations/{quotation_id}` | 获取报价单 |
| PUT | `/quotations/{quotation_id}` | 更新报价单 |
| GET | `/quotations/{quotation_id}/items` | 获取报价项目 |
| POST | `/quotations/{quotation_id}/publish` | 发布报价单 |
| GET | `/quotations` | 列出报价单 |

---

## 🎓 开发注意事项

### 避免的坑

| 坑 | 解决方案 |
|---|---|
| ❌ AI同步接口导致超时 | ✅ Celery异步任务队列 |
| ❌ 无快照导致历史报价混乱 | ✅ QuotationItem.snapshot字段 |
| ❌ 租户隔离靠自觉 | ✅ scoped_query强制过滤 |
| ❌ 品类字段硬表结构 | ✅ JSONB + Pydantic校验 |
| ❌ 前端做加价计算 | ✅ 后端Factor统一计算 |
| ❌ 没有evidence | ✅ AI返回提取依据 |

### 数据模型设计

#### SKU通用字段 + attrs (JSONB)

```python
# 通用字段（所有SKU类型）
id: str
sku_name: str
sku_type: str  # hotel, ticket, guide, transport
owner_type: str  # private, public
agency_id: str
destination_city: str
destination_country: str
tags: List[str]
status: str  # active, inactive, archived

# 品类特定字段（存储在attrs JSONB）
attrs: Dict  # 每个sku_type有对应的Pydantic校验器
```

#### 报价快照机制

```python
# QuotationItem包含snapshot
{
  "sku_id": "TFRM-HOTEL-XXXX",
  "quantity": 3,
  "unit_price": 499.0,
  "snapshot": {
    "item_name": "清迈亲子酒店套餐",
    "item_type": "hotel",
    "unit_price": 499.0,
    "attrs": {...}  # 完整的SKU attrs快照
  }
}
```

### 多租户隔离

所有查询自动过滤 `agency_id`：

```python
# 使用scoped_query
def scoped_query(db: Session, model, agency_id: str):
    return db.query(model).filter(model.agency_id == agency_id)

# 所有服务层查询都使用scoped_query
skus = scoped_query(db, SKU, agency_id).filter(...)
```

---

## 📝 许可证

MIT License

---

## 🤝 贡献

欢迎提交Issue和Pull Request！

---

## 📧 联系方式

如有问题，请联系项目维护者。

---

**最后更新**: 2024-01-17
