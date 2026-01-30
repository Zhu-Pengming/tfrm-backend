# TFRM Travel Resource Platform

> AI 驱动的旅游资源（SKU）智能导入、产品库、定价与报价管理平台。后端位于 `/app`，前端位于 `/web`。

## 当前状态（2026-01-26）
- 后端：FastAPI + SQLAlchemy + PostgreSQL + Redis + Celery，支持 DeepSeek / Gemini / OpenAI 解析与 OCR（EasyOCR / PaddleOCR）。
- 前端：React 19 + Vite 6 + TypeScript + Tailwind，内置登录、智能导入、产品库、报价、供应商页面。
- CORS 默认开放；文件默认保存在 `./uploads`。

## 目录结构
```
tfrm-backend/
├─ app/                   # FastAPI 入口、领域服务、LLM/OCR、存储、定价
├─ web/                   # 前端 SPA（Vite 打包，入口 App.tsx）
├─ alembic/               # 数据库迁移脚本
├─ uploads/               # 本地上传文件目录
├─ requirements.txt       # 后端依赖
├─ FRONTEND_BACKEND_INTEGRATION.md
└─ test_integration_real_server.py
```

## 核心功能
- 智能导入：文本/图片/PDF 通过 LLM 提取结构化 SKU 字段与证据，覆盖酒店/交通/门票/餐饮/活动/行程/导游等品类。
- 产品库：SKU CRUD、标签/城市筛选、价格模式（固定/日历/规则）、批量调价、批量更新/删除。
- 定价规则：`pricing_factors` 按品类/城市/标签/供应商设置倍率或加价。
- 报价管理：组合 SKU 生成报价单，支持 PDF 导出与公开分享链接。
- 供应商管理：供应商 CRUD、备注、AI 生成 Logo。
- 认证与多租户：JWT 登录注册，所有查询使用 `agency_id` 范围过滤（`scoped_query`）。
- 上传与存储：多文件上传接口，默认本地存储，可按需扩展。

## 技术栈
- Backend：FastAPI, SQLAlchemy 2, Alembic, PostgreSQL 14+, Redis 6+, Celery 5, httpx, python-jose, Pillow/pdf2image, EasyOCR/PaddleOCR, ReportLab。
- Frontend：React 19, Vite 6, TypeScript 5, TailwindCSS 3, html2pdf.js；API 客户端位于 `web/services/api.ts`。
- 环境要求：Python 3.9+；Node.js 18+；推荐 virtualenv + npm。

## 后端快速启动
1) 安装依赖  
```
pip install -r requirements.txt
```
2) 配置 `.env`（示例，务必替换成自己的值）：  
```
DATABASE_URL=postgresql://postgres:password@localhost:5432/tfrm
REDIS_URL=redis://localhost:6379/0
SECRET_KEY=please-change-me
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60

LLM_PROVIDER=deepseek        # 可选：deepseek | gemini | openai
GEMINI_API_KEY=your-gemini-key
DEEPSEEK_API_KEY=your-deepseek-key
OPENAI_API_KEY=your-openai-key

STORAGE_PROVIDER=local
STORAGE_PATH=./uploads
```
3) 初始化数据库  
```
alembic upgrade head
```
4) 启动服务（Windows Celery 需 `--pool=solo`）  
```
redis-server
celery -A app.infra.queue worker --loglevel=info --pool=solo
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
5) 访问  
- 健康检查：`http://localhost:8000/`
- Swagger UI：`http://localhost:8000/docs`
- ReDoc：`http://localhost:8000/redoc`

## 前端快速启动（/web）
1) 进入目录并安装依赖  
```
cd web
npm install
```
2) 复制环境文件并修改：  
```
cp .env.example .env
VITE_API_BASE_URL=http://localhost:8000   # 指向后端
VITE_DEEPSEEK_API_KEY=<your-key>          # 若前端需直连 DeepSeek，可为空
VITE_APP_NAME=旅行资源系统
VITE_APP_VERSION=1.0.0
```
3) 运行开发服务  
```
npm run dev -- --host --port 5173
```
4) 访问前端：`http://localhost:5173`  
5) 构建/预览  
```
npm run build
npm run preview
```

## 典型工作流
1) 注册/登录（`/auth/register`, `/auth/login`），前端会把 token 存在 `localStorage: auth_token`。  
2) “智能导入”上传 PDF/图片或粘贴文本，调用 `/imports/extract` 触发 Celery + LLM 解析。  
3) 在导入详情确认并选择 SKU 类型 `/imports/{id}/confirm`，数据入库。  
4) “产品库”查看/编辑 SKU，支持批量调价、价格日历。  
5) “报价单”选择多个 SKU 生成报价，导出 PDF 或 `/quotations/{id}/publish` 生成分享链接。  
6) “供应商”模块维护供应商，可触发 Logo 生成。

## 重要 API 分组
- 认证：`/auth/register`, `/auth/login`, `/auth/me`
- SKU：`/skus`（CRUD、批量操作、价格日历、pull 公共 SKU）
- 智能导入：`/imports`, `/imports/extract`, `/imports/{id}/confirm`
- 报价：`/quotations`, `/quotations/{id}/items`, `/quotations/{id}/publish`, `/quotations/{id}/export/pdf`, `/share/quotations/{id}`
- 供应商：`/vendors` CRUD、`/vendors/{id}/notes`, `/vendors/{id}/generate-logo`
- 上传：`/upload`（multipart 文件上传）

## 测试与工具
- 集成测试：`python test_integration_real_server.py`（需要真实 LLM Key、运行中的 Redis/PostgreSQL/Celery/FastAPI）。  
- 数据迁移：`alembic revision --autogenerate -m "msg"` → `alembic upgrade head`。  
- 日志：`app.main` 中的请求日志中间件会输出到 stdout。  

## 生产部署提示
- API：建议 `gunicorn -k uvicorn.workers.UvicornWorker`，Worker/Celery 由 Supervisor/systemd 管理。  
- 前端：`npm run build` 生成 `web/dist`，可由 Nginx/Caddy 托管，或与后端反向代理同域。  
- 安全：使用强随机 `SECRET_KEY`，LLM/API Key 放入安全的环境变量/密钥管理，关闭不必要的 CORS 源。  

## 常见问题
- Celery 在 Windows 必须 `--pool=solo`；Linux 可用默认 `prefork`。  
- LLM 解析出现 401/429：检查相应 API Key 与额度；DeepSeek 不支持视觉，代码会先用 EasyOCR 抽取图片文本。  
- 上传路径默认 `./uploads`；若改为对象存储需实现并配置对应 `StorageClient`。  

---
最后更新：2026-01-26
