# TFRM 集成测试指南 - 真实服务器 + 真实LLM

## 概述

这个集成测试会：
- ✅ 使用真实的FastAPI服务器
- ✅ 使用真实的LLM（Gemini/DeepSeek）进行AI解析
- ✅ 通过HTTP请求调用API接口
- ✅ 模拟真实部署环境的完整流程

## 前置条件

### 1. 数据库准备

确保PostgreSQL已启动并创建数据库：

```bash
# 检查PostgreSQL是否运行
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -c "SELECT version();"

# 如果数据库不存在，创建它
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -c "CREATE DATABASE tfrm;"
```

### 2. 运行数据库迁移

```bash
# 在项目根目录执行
alembic upgrade head
```

### 3. 配置环境变量

确保 `.env` 文件配置正确：

```env
# 数据库
DATABASE_URL=postgresql://postgres:postgre123@localhost:5432/tfrm

# Redis
REDIS_URL=redis://localhost:6379/0

# LLM配置（选择一个）
LLM_PROVIDER=gemini
GEMINI_API_KEY=your-gemini-api-key

# 或使用DeepSeek
# LLM_PROVIDER=deepseek
# DEEPSEEK_API_KEY=your-deepseek-api-key
```

### 4. 启动Redis（如果使用Celery）

```bash
# Windows: 启动Redis
redis-server

# 或使用WSL
wsl redis-server
```

### 5. 启动Celery Worker（用于异步AI解析）

打开一个新的终端窗口：

```bash
celery -A app.infra.queue worker --loglevel=info --pool=solo
```

## 运行步骤

### 方式1: 使用批处理脚本（推荐）

#### 步骤1: 启动服务器
```bash
start_server.bat
```

#### 步骤2: 运行集成测试
```bash
run_integration_test.bat
```

### 方式2: 手动运行

#### 步骤1: 启动服务器

打开终端1：
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

等待看到：
```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

#### 步骤2: 运行集成测试

打开终端2：
```bash
python test_integration_real_server.py
```

## 测试流程

测试会自动执行以下步骤：

1. **检查服务器** - 验证服务器是否运行
2. **用户认证** - 注册/登录测试用户
3. **碎片输入** - 创建导入任务
4. **AI解析** - 等待真实LLM解析（可能需要10-30秒）
5. **人确认** - 确认AI提取的字段
6. **入库** - 验证SKU保存
7. **可检索** - 测试搜索功能
8. **组合报价** - 创建报价单
9. **对外分享** - 发布报价单

## 预期输出

```
================================================================================
TFRM 完整流程集成测试 - 真实服务器 + 真实LLM
================================================================================

[检查] 检查服务器状态...
  ✓ 服务器运行正常

[认证] 注册用户: test_user
  ✓ 用户注册成功
  ✓ 登录成功，获取token
  ✓ 用户信息: agency_id=xxx

[步骤1] 碎片输入 - 创建导入任务
  ✓ 导入任务已创建
    Task ID: IMPORT-XXXX
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

[额外] 创建第二个SKU（景点门票）
  ✓ 第二个SKU已创建: 清迈夜间动物园门票
    SKU ID: TFRM-TICKET-XXXX

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
  报价项目:
    1. 清迈亲子酒店套餐 x 3 = 1497.0元
    2. 清迈夜间动物园门票 x 2 = 240.0元

[步骤7] 对外分享 - 发布报价单
  ✓ 报价单已发布
    分享链接: /share/quotation/QUOTE-XXXX

================================================================================
✓✓✓ 完整流程集成测试通过！
================================================================================
```

## 故障排查

### 1. 服务器未运行

```
✗ 服务器未运行！

请先启动服务器:
  uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**解决**: 先启动服务器

### 2. 数据库连接失败

```
sqlalchemy.exc.OperationalError: could not connect to server
```

**解决**: 
- 检查PostgreSQL是否运行
- 检查.env中的DATABASE_URL是否正确

### 3. LLM API调用失败

```
✗ 解析失败: LLM API error
```

**解决**:
- 检查.env中的LLM_PROVIDER和API_KEY是否正确
- 检查网络连接
- 查看Celery worker日志

### 4. Celery worker未运行

导入任务会一直停留在 `parsing` 状态

**解决**: 启动Celery worker
```bash
celery -A app.infra.queue worker --loglevel=info --pool=solo
```

### 5. Redis未运行

```
redis.exceptions.ConnectionError
```

**解决**: 启动Redis服务

## 与单元测试的区别

| 特性 | 单元测试 (pytest) | 集成测试 (此脚本) |
|------|------------------|------------------|
| 服务器 | TestClient (模拟) | 真实FastAPI服务器 |
| LLM | Mock (假数据) | 真实LLM API |
| 数据库 | 测试数据库 | 开发/生产数据库 |
| 网络 | 无 | 真实HTTP请求 |
| 速度 | 快 (1-3秒) | 慢 (15-60秒) |
| 用途 | 开发调试 | 部署前验证 |

## 清理测试数据

测试会创建真实数据，如需清理：

```sql
-- 连接数据库
psql -U postgres -d tfrm

-- 删除测试用户的数据
DELETE FROM quotation_items WHERE quotation_id IN (
    SELECT id FROM quotations WHERE agency_id IN (
        SELECT id FROM agencies WHERE name = '测试旅行社'
    )
);

DELETE FROM quotations WHERE agency_id IN (
    SELECT id FROM agencies WHERE name = '测试旅行社'
);

DELETE FROM skus WHERE agency_id IN (
    SELECT id FROM agencies WHERE name = '测试旅行社'
);

DELETE FROM import_tasks WHERE agency_id IN (
    SELECT id FROM agencies WHERE name = '测试旅行社'
);

DELETE FROM users WHERE agency_id IN (
    SELECT id FROM agencies WHERE name = '测试旅行社'
);

DELETE FROM agencies WHERE name = '测试旅行社';
```

## 下一步

测试通过后，你可以：

1. **部署到生产环境** - 使用相同的流程验证生产环境
2. **添加更多测试场景** - 修改 `test_integration_real_server.py`
3. **性能测试** - 测试并发请求和大量数据
4. **前端集成** - 前端可以使用相同的API接口
