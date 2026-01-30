# 前后端集成完整指南

## 📋 目录
1. [已完成的工作](#已完成的工作)
2. [快速开始](#快速开始)
3. [前端 API 使用示例](#前端-api-使用示例)
4. [认证流程](#认证流程)
5. [组件改造示例](#组件改造示例)
6. [完整 API 列表](#完整-api-列表)

---

## ✅ 已完成的工作

### 后端（已完成）
- ✅ 供应商管理 CRUD + Logo 生成
- ✅ SKU 分类统一映射
- ✅ SKU 字段扩展（highlights, inclusions, exclusions, cancellation_policy）
- ✅ 智能导入 AI 后端化
- ✅ 报价单 PDF 导出
- ✅ 价格日历管理
- ✅ 批量操作接口（批量调价、更新、删除）
- ✅ 报价单公开分享页面
- ✅ 完整的认证系统

### 前端（新增）
- ✅ API 客户端层 (`web/services/api.ts`)
- ✅ 认证 Context (`web/contexts/AuthContext.tsx`)
- ✅ 登录/注册页面 (`web/components/Auth/LoginPage.tsx`)
- ✅ 环境配置文件

---

## 🚀 快速开始

### 1. 后端启动

```bash
cd C:\Users\lenovo\CascadeProjects\tfrm-backend

# 安装依赖
pip install -r requirements.txt

# 配置环境变量（复制 .env.example 到 .env 并填写）
cp .env.example .env
# 编辑 .env 文件，填写 GEMINI_API_KEY 等

# 运行数据库迁移
alembic upgrade head

# 启动服务
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

后端将运行在 `http://localhost:8000`

### 2. 前端启动

```bash
cd C:\Users\lenovo\CascadeProjects\tfrm-backend\web

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 默认配置已指向 http://localhost:8000

# 启动开发服务器
npm run dev
```

前端将运行在 `http://localhost:5173`

---

## 📡 前端 API 使用示例

### 基础用法

```typescript
import api from './services/api';

// 所有 API 调用都会自动携带 Token
// 如果 Token 过期（401），会自动跳转登录页
```

### SKU 管理

```typescript
// 获取 SKU 列表
const skus = await api.sku.list({
  owner_type: 'private',
  keyword: '东京',
  limit: 20
});

// 创建 SKU
const newSku = await api.sku.create({
  sku_name: '东京半岛酒店',
  sku_type: 'hotel',
  owner_type: 'private',
  destination_city: '东京',
  description: '五星级酒店',
  highlights: ['皇居景观', '管家服务'],
  inclusions: ['双早', '接送'],
  exclusions: ['个人消费'],
  cancellation_policy: '48小时免费取消',
  attrs: {
    hotel_name: '东京半岛酒店',
    address: '东京千代田区',
    room_type_name: '豪华房',
    bed_type: '大床',
    daily_cost_price: 4500,
    daily_sell_price: 5800
  }
});

// 批量调价（按毛利率）
await api.sku.batchPricing(
  ['sku-id-1', 'sku-id-2'],
  20 // 20% 毛利率
);
```

### 智能导入

```typescript
// 文本导入
const result = await api.import.extract('东京半岛酒店，5800元/晚...');

// 文件导入
const file = event.target.files[0];
const result = await api.import.extract(undefined, file);

// 查看提取结果
console.log(result.extracted_fields);
console.log(result.confidence);
```

### 供应商管理

```typescript
// 获取供应商列表
const vendors = await api.vendor.list('Hotel', 'Active', '东京');

// 创建供应商
const vendor = await api.vendor.create({
  name: 'Expedia Group',
  contact: '张经理',
  phone: '+86 400-123-4567',
  email: 'contact@expedia.com',
  category: ['Hotel', 'Ticket'],
  specialties: ['五星级', '主题乐园'],
  address: '美国华盛顿州'
});

// AI 生成 Logo
const { logo_url } = await api.vendor.generateLogo(vendor.id);
```

### 报价单管理

```typescript
// 创建报价单
const quotation = await api.quotation.create({
  title: '东京5日游',
  customer_name: '张三',
  customer_contact: '13800138000',
  items: [
    { sku_id: 'sku-1', quantity: 2 },
    { sku_id: 'sku-2', quantity: 1 }
  ],
  notes: '备注信息'
});

// 发布报价单
const { url } = await api.quotation.publish(quotation.id);

// 导出 PDF
api.quotation.exportPDF(quotation.id);

// 获取公开分享（无需认证）
const shared = await api.quotation.getShared(quotation.id);
```

---

## 🔐 认证流程

### 1. 在 App 根组件包裹 AuthProvider

```typescript
// index.tsx 或 App.tsx
import { AuthProvider } from './contexts/AuthContext';
import LoginPage from './components/Auth/LoginPage';
import { useAuth } from './contexts/AuthContext';

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return <div>加载中...</div>;
  }
  
  if (!isAuthenticated) {
    return <LoginPage />;
  }
  
  return <YourMainApp />;
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
```

### 2. 在组件中使用认证

```typescript
import { useAuth } from '../contexts/AuthContext';

function MyComponent() {
  const { user, logout } = useAuth();
  
  return (
    <div>
      <p>欢迎，{user?.full_name}</p>
      <button onClick={logout}>退出登录</button>
    </div>
  );
}
```

---

## 🔧 组件改造示例

### 改造前（使用 Mock 数据）

```typescript
// ProductLibrary.tsx - 改造前
const [skuList, setSkuList] = useState<SKU[]>(INITIAL_MOCK_DATA);
```

### 改造后（连接后端）

```typescript
// ProductLibrary.tsx - 改造后
import api from '../../services/api';

const ProductLibrary: React.FC = () => {
  const [skuList, setSkuList] = useState<SKU[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    loadSkus();
  }, []);
  
  const loadSkus = async () => {
    try {
      setIsLoading(true);
      const data = await api.sku.list({
        owner_type: isPrivate ? 'private' : 'public',
        sku_type: activeCategory !== 'All' ? categoryMap[activeCategory] : undefined,
        keyword: searchQuery
      });
      setSkuList(data);
    } catch (error) {
      console.error('Failed to load SKUs:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // 批量调价
  const applyBatchMargin = async () => {
    try {
      await api.sku.batchPricing(
        Array.from(selectedIds),
        batchMargin // 毛利率百分比
      );
      await loadSkus(); // 重新加载
      setIsBatchMode(false);
      setSelectedIds(new Set());
    } catch (error) {
      console.error('Batch pricing failed:', error);
    }
  };
  
  // ...
};
```

### SmartImport 改造

```typescript
// SmartImport.tsx - 改造后
import api from '../../services/api';

const runAIExtraction = async () => {
  setIsProcessing(true);
  setExtractedData(null);
  setErrorDetail(null);
  
  try {
    // 调用后端 AI 提取接口
    const result = await api.import.extract(
      mode === 'text' ? inputText : undefined,
      mode === 'file' ? selectedFile : undefined
    );
    
    if (result.status === 'parsed') {
      // 转换为前端格式
      setExtractedData({
        id: result.id,
        name: result.extracted_fields.sku_name,
        category: backendToFrontendCategory[result.sku_type],
        price: result.extracted_fields.daily_cost_price || result.extracted_fields.cost_price,
        salesPrice: result.extracted_fields.daily_sell_price || result.extracted_fields.sell_price,
        provider: result.extracted_fields.supplier_name,
        location: result.extracted_fields.destination_city,
        description: result.extracted_fields.description,
        highlights: result.extracted_fields.highlights,
        inclusions: result.extracted_fields.inclusions,
        exclusions: result.extracted_fields.exclusions,
        cancellationPolicy: result.extracted_fields.cancellation_policy,
        // ...
      });
    }
  } catch (err: any) {
    setErrorDetail({ 
      title: "提取失败", 
      msg: err.message || "AI 无法处理此文档" 
    });
  } finally {
    setIsProcessing(false);
  }
};
```

### VendorView 改造

```typescript
// VendorView.tsx - 改造后
import api from '../../services/api';

const VendorView: React.FC = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  
  useEffect(() => {
    loadVendors();
  }, [activeCategory, activeStatus, searchQuery]);
  
  const loadVendors = async () => {
    try {
      const data = await api.vendor.list(
        activeCategory !== 'All' ? activeCategory : undefined,
        activeStatus !== 'All' ? activeStatus : undefined,
        searchQuery
      );
      setVendors(data);
    } catch (error) {
      console.error('Failed to load vendors:', error);
    }
  };
  
  const handleGenerateLogo = async (vendorId: string) => {
    try {
      const { logo_url } = await api.vendor.generateLogo(vendorId);
      // 更新本地状态
      setVendors(prev => prev.map(v => 
        v.id === vendorId ? { ...v, logo: logo_url } : v
      ));
    } catch (error) {
      console.error('Logo generation failed:', error);
    }
  };
  
  // ...
};
```

---

## 📚 完整 API 列表

### 认证 API
- `POST /auth/register` - 注册
- `POST /auth/login` - 登录
- `GET /auth/me` - 获取当前用户

### SKU API
- `GET /skus` - 列表查询
- `POST /skus` - 创建
- `GET /skus/{id}` - 获取详情
- `PUT /skus/{id}` - 更新
- `DELETE /skus/{id}` - 删除
- `PUT /skus/{id}/price-calendar` - 更新价格日历
- `POST /skus/batch-pricing` - 批量调价
- `POST /skus/batch-update` - 批量更新
- `POST /skus/batch-delete` - 批量删除

### 智能导入 API
- `POST /imports/extract` - AI 提取（支持文本和文件）
- `GET /imports` - 列表查询
- `GET /imports/{id}` - 获取详情
- `POST /imports/{id}/confirm` - 确认导入

### 供应商 API
- `GET /vendors` - 列表查询
- `POST /vendors` - 创建
- `GET /vendors/{id}` - 获取详情
- `PUT /vendors/{id}` - 更新
- `PUT /vendors/{id}/notes` - 更新备注
- `DELETE /vendors/{id}` - 删除
- `POST /vendors/{id}/generate-logo` - AI 生成 Logo

### 报价单 API
- `GET /quotations` - 列表查询
- `POST /quotations` - 创建
- `GET /quotations/{id}` - 获取详情
- `GET /quotations/{id}/items` - 获取明细
- `PUT /quotations/{id}` - 更新
- `POST /quotations/{id}/publish` - 发布
- `GET /quotations/{id}/export/pdf` - 导出 PDF
- `GET /share/quotations/{id}` - 公开分享（无需认证）

### 文件上传 API
- `POST /upload` - 上传文件

---

## ⚠️ 注意事项

### 1. 分类映射
前端和后端的分类名称不同，需要映射：

```typescript
const frontendToBackend = {
  'Hotel': 'hotel',
  'Transport': 'car',
  'Ticket': 'ticket',
  'Guide': 'guide',
  'Catering': 'restaurant',
  'Activity': 'activity',
  'Route': 'itinerary'
};
```

### 2. Token 管理
- Token 存储在 `localStorage.auth_token`
- 所有 API 请求自动携带 Token
- Token 过期（401）会自动跳转登录

### 3. 错误处理
```typescript
try {
  await api.sku.create(data);
} catch (error: any) {
  // error.message 包含错误信息
  alert(error.message);
}
```

### 4. 环境配置
确保 `.env` 文件配置正确：
```
VITE_API_BASE_URL=http://localhost:8000
```

---

## 🎯 下一步工作

### 必须完成（阻塞功能）
1. ✅ 安装前端依赖：`npm install`
2. ✅ 配置后端 `.env` 文件（特别是 `GEMINI_API_KEY`）
3. ✅ 运行数据库迁移：`alembic upgrade head`
4. ⏳ 改造前端组件连接后端 API
5. ⏳ 测试完整流程

### 可选优化
- 添加加载状态和错误提示
- 添加数据缓存
- 优化批量操作 UI
- 添加图片上传预览

---

## 📞 技术支持

如有问题，请检查：
1. 后端是否正常运行（访问 `http://localhost:8000/docs`）
2. 前端环境变量是否配置
3. 浏览器控制台是否有错误
4. Network 面板查看 API 请求状态

API 文档：`http://localhost:8000/docs`
