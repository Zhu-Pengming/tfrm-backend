# TFRM 小程序快速启动指南

## ✅ 已完成的工作

小程序已经完成开发，包含完整的 6 个核心页面：

1. ✅ **登录页** - 用户认证和授权
2. ✅ **碎片导入页** - 粘贴资源信息并提交解析
3. ✅ **解析确认页** - AI 解析结果展示和确认入库
4. ✅ **资源库页** - SKU 列表、搜索和筛选
5. ✅ **SKU 详情页** - 查看完整资源信息
6. ✅ **报价管理页** - 报价篮和报价单列表
7. ✅ **报价编辑页** - 创建和编辑报价单
8. ✅ **发布成功页** - 分享链接和二维码

## 🚀 立即启动（3 步）

### 步骤 1: 确保后端服务运行

在后端项目目录打开 3 个终端：

**终端 1 - Redis:**
```bash
redis-server
```

**终端 2 - Celery Worker:**
```bash
cd c:\Users\lenovo\CascadeProjects\tfrm-backend
celery -A app.infra.queue worker --loglevel=info --pool=solo
```

**终端 3 - FastAPI:**
```bash
cd c:\Users\lenovo\CascadeProjects\tfrm-backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

验证后端运行：访问 http://localhost:8000 应该看到 API 响应。

### 步骤 2: 打开微信开发者工具

1. 启动微信开发者工具
2. 选择"导入项目"
3. 项目目录：`c:\Users\lenovo\WeChatProjects\tfrm-miniprogram`
4. AppID：使用测试号（或你的小程序 AppID）
5. 点击"导入"

### 步骤 3: 编译运行

1. 点击工具栏的"编译"按钮
2. 在模拟器中查看小程序
3. 开始测试完整流程

## 📱 测试完整流程

### 1. 注册/登录
- 输入用户名：`test_user`
- 输入密码：`password123`
- 点击"立即注册"（首次使用）
- 然后点击"登录"

### 2. 导入资源
切换到"导入" Tab，粘贴测试数据：
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
点击"开始解析"

### 3. 确认解析结果
- 等待 AI 解析（10-30秒）
- 查看提取的字段
- 点击"查看依据"查看证据
- 选择资源类型：酒店
- 点击"确认入库"

### 4. 查看资源库
- 切换到"资源库" Tab
- 搜索"清迈"
- 点击 SKU 卡片查看详情
- 点击"加入报价"

### 5. 创建报价单
- 切换到"报价" Tab
- 在报价篮中调整数量
- 点击"创建报价单"
- 填写标题：`清迈4天3晚亲子游套餐`
- 填写客户信息
- 点击"保存草稿"

### 6. 发布报价
- 在报价列表中找到刚创建的报价单
- 点击"发布"
- 确认发布
- 复制分享链接

## 🔧 配置说明

### 修改后端地址（如需要）

编辑文件：`miniprogram/utils/api.ts`

```typescript
const API_BASE_URL = 'http://localhost:8000'  // 改为你的后端地址
```

### TabBar 图标（可选）

当前 TabBar 使用纯文字显示。如需添加图标：

1. 准备 6 个图标文件（81x81 px）
2. 放在 `miniprogram/assets/icons/` 目录
3. 在 `app.json` 中取消注释 `iconPath` 配置

详见：`miniprogram/assets/icons/README.md`

## ⚠️ 常见问题

### 问题 1: 编译报错 "找不到模块"
**解决**: 确保所有 `.ts` 文件都已创建，检查 `app.json` 中的页面路径

### 问题 2: 登录后立即跳回登录页
**解决**: 
- 检查后端是否运行（访问 http://localhost:8000）
- 检查 `utils/api.ts` 中的 `API_BASE_URL` 配置

### 问题 3: AI 解析一直显示"解析中"
**解决**: 
- 确保 Celery Worker 已启动
- 检查后端 `.env` 文件中的 LLM API Key 配置
- 查看 Celery Worker 终端的日志

### 问题 4: 网络请求失败
**解决**: 
- 在微信开发者工具中，点击"详情" → "本地设置"
- 勾选"不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书"

## 📊 项目结构

```
tfrm-miniprogram/
├── miniprogram/
│   ├── pages/              # 8个页面
│   │   ├── login/         # 登录
│   │   ├── import/        # 导入
│   │   ├── import-detail/ # 解析确认
│   │   ├── skus/          # 资源库
│   │   ├── sku-detail/    # SKU详情
│   │   ├── quotation/     # 报价管理
│   │   ├── quotation-edit/# 报价编辑
│   │   └── publish-success/# 发布成功
│   ├── utils/
│   │   ├── api.ts         # API服务（核心）
│   │   └── storage.ts     # 本地存储
│   ├── app.json           # 小程序配置
│   ├── app.ts             # 入口文件
│   └── app.wxss           # 全局样式
├── README.md              # 完整文档
└── QUICKSTART.md          # 本文件
```

## 🎯 核心文件说明

### `utils/api.ts`
- 统一管理所有后端 API 调用
- 自动添加 token 认证
- 自动处理错误和 401 跳转

### `utils/storage.ts`
- 管理报价篮数据
- 本地存储工具类

### `app.ts`
- 小程序启动时检查登录状态
- 管理全局数据（token, agencyId, basketCount）

## 📝 下一步

1. **测试完整流程** - 按照上面的测试步骤走一遍
2. **自定义样式** - 根据需要调整颜色和布局
3. **添加图标** - 为 TabBar 添加图标
4. **准备上线** - 修改 API 地址为生产环境

## 💡 提示

- 开发时保持后端服务运行
- 使用微信开发者工具的调试功能查看网络请求
- 查看 Console 日志排查问题
- 参考 `README.md` 获取更详细的文档

## 🎉 开始使用

现在就打开微信开发者工具，导入项目，开始测试吧！
