# Web 前端完整实施包

## 快速实施指南

由于 Web 前端组件较多，这里提供完整的实施代码包。按照以下步骤实施：

---

## 步骤 1: 修复 PublicLibraryBrowser 的 API 导入

**文件**: `web/components/PublicLibrary/PublicLibraryBrowser.tsx`

**修改第 3 行**:
```typescript
// 检查 services/api.ts 的导出方式
// 如果文件末尾是 export default api，使用：
import api from '../../services/api';

// 如果文件末尾是 export { api } 或 export const api，使用：
import { api } from '../../services/api';
```

**快速检查方法**:
```bash
# 在 web 目录下运行
Get-Content services\api.ts -Tail 10
# 查看最后几行的导出语句
```

---

## 步骤 2: 创建合作中心组件

**文件**: `web/components/Cooperation/CooperationCenter.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { Cooperation } from '../../types';

export const CooperationCenter: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'sent' | 'received'>('sent');
  const [sentRequests, setSentRequests] = useState<Cooperation[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<Cooperation[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCooperations();
  }, [activeTab]);

  const loadCooperations = async () => {
    setLoading(true);
    try {
      // 根据当前 tab 加载不同的数据
      const role = activeTab === 'sent' ? 'consumer' : 'provider';
      const response = await fetch(`http://localhost:8000/cooperations?role=${role}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      const data = await response.json();
      
      if (activeTab === 'sent') {
        setSentRequests(data);
      } else {
        setReceivedRequests(data);
      }
    } catch (error) {
      console.error('Failed to load cooperations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    const message = prompt('审核通过，可添加回复信息（可选）：');
    if (message === null) return;

    try {
      await fetch(`http://localhost:8000/cooperations/${id}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ response_message: message })
      });
      alert('已通过合作申请！');
      loadCooperations();
    } catch (error) {
      alert('操作失败');
    }
  };

  const handleReject = async (id: string) => {
    const message = prompt('拒绝原因（可选）：');
    if (message === null) return;

    try {
      await fetch(`http://localhost:8000/cooperations/${id}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ response_message: message })
      });
      alert('已拒绝合作申请');
      loadCooperations();
    } catch (error) {
      alert('操作失败');
    }
  };

  const handleTerminate = async (id: string) => {
    if (!confirm('确认终止此合作关系？')) return;

    try {
      await fetch(`http://localhost:8000/cooperations/${id}/terminate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      alert('已终止合作关系');
      loadCooperations();
    } catch (error) {
      alert('操作失败');
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      expired: 'bg-gray-100 text-gray-800',
      terminated: 'bg-gray-100 text-gray-800'
    };
    const labels = {
      pending: '待审核',
      approved: '已通过',
      rejected: '已拒绝',
      expired: '已超时',
      terminated: '已终止'
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  const renderCooperationList = (cooperations: Cooperation[], isSent: boolean) => {
    if (cooperations.length === 0) {
      return (
        <div className="text-center py-12 text-gray-500">
          暂无{isSent ? '发起的' : '收到的'}合作申请
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {cooperations.map((coop) => (
          <div key={coop.id} className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-semibold text-gray-800">
                    {isSent ? `向 ${coop.toAgencyId} 发起` : `来自 ${coop.fromAgencyId}`}
                  </h3>
                  {getStatusBadge(coop.status)}
                </div>
                <p className="text-sm text-gray-600">
                  申请时间: {new Date(coop.createdAt).toLocaleString('zh-CN')}
                </p>
              </div>
            </div>

            {coop.requestMessage && (
              <div className="mb-3">
                <p className="text-sm text-gray-700">
                  <span className="font-medium">申请说明：</span>
                  {coop.requestMessage}
                </p>
              </div>
            )}

            {coop.responseMessage && (
              <div className="mb-3">
                <p className="text-sm text-gray-700">
                  <span className="font-medium">回复：</span>
                  {coop.responseMessage}
                </p>
              </div>
            )}

            {/* 操作按钮 */}
            <div className="flex gap-2 mt-4">
              {!isSent && coop.status === 'pending' && (
                <>
                  <button
                    onClick={() => handleApprove(coop.id)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                  >
                    通过
                  </button>
                  <button
                    onClick={() => handleReject(coop.id)}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                  >
                    拒绝
                  </button>
                </>
              )}
              {coop.status === 'approved' && (
                <button
                  onClick={() => handleTerminate(coop.id)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
                >
                  终止合作
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">合作中心</h2>

      {/* Tab 切换 */}
      <div className="flex gap-4 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('sent')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'sent'
              ? 'text-purple-600 border-b-2 border-purple-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          我发起的 ({sentRequests.length})
        </button>
        <button
          onClick={() => setActiveTab('received')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'received'
              ? 'text-purple-600 border-b-2 border-purple-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          收到的申请 ({receivedRequests.length})
        </button>
      </div>

      {/* 内容区域 */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      ) : (
        <>
          {activeTab === 'sent' && renderCooperationList(sentRequests, true)}
          {activeTab === 'received' && renderCooperationList(receivedRequests, false)}
        </>
      )}
    </div>
  );
};
```

---

## 步骤 3: 创建通知中心组件

**文件**: `web/components/Notifications/NotificationCenter.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { Notification } from '../../types';

export const NotificationCenter: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState<{
    type: string;
    isRead: string;
  }>({
    type: '',
    isRead: ''
  });

  useEffect(() => {
    loadNotifications();
    loadUnreadCount();
  }, [filter]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter.type) params.append('type', filter.type);
      if (filter.isRead) params.append('is_read', filter.isRead);

      const response = await fetch(`http://localhost:8000/notifications?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      const data = await response.json();
      setNotifications(data);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUnreadCount = async () => {
    try {
      const response = await fetch('http://localhost:8000/notifications/unread-count', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      const data = await response.json();
      setUnreadCount(data.count);
    } catch (error) {
      console.error('Failed to load unread count:', error);
    }
  };

  const handleMarkAsRead = async (notificationIds: string[]) => {
    try {
      await fetch('http://localhost:8000/notifications/mark-read', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ notification_ids: notificationIds })
      });
      loadNotifications();
      loadUnreadCount();
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.isRead).map(n => n.id);
    if (unreadIds.length === 0) {
      alert('没有未读通知');
      return;
    }
    await handleMarkAsRead(unreadIds);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'cooperation_change':
        return '🔄';
      case 'sku_update':
        return '📝';
      case 'system':
        return '📢';
      default:
        return '🔔';
    }
  };

  const getNotificationStyle = (type: string) => {
    switch (type) {
      case 'cooperation_change':
        return 'border-l-4 border-purple-500';
      case 'sku_update':
        return 'border-l-4 border-orange-500';
      case 'system':
        return 'border-l-4 border-green-500';
      default:
        return 'border-l-4 border-gray-500';
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-gray-800">通知中心</h2>
          {unreadCount > 0 && (
            <span className="px-3 py-1 bg-red-500 text-white text-sm font-bold rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        <button
          onClick={handleMarkAllAsRead}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
        >
          全部标记已读
        </button>
      </div>

      {/* 筛选条件 */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              通知类型
            </label>
            <select
              value={filter.type}
              onChange={(e) => setFilter({ ...filter, type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            >
              <option value="">全部类型</option>
              <option value="cooperation_change">合作变更</option>
              <option value="sku_update">SKU 更新</option>
              <option value="system">系统通知</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              阅读状态
            </label>
            <select
              value={filter.isRead}
              onChange={(e) => setFilter({ ...filter, isRead: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            >
              <option value="">全部</option>
              <option value="false">未读</option>
              <option value="true">已读</option>
            </select>
          </div>
        </div>
      </div>

      {/* 通知列表 */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-md">
          <p className="text-gray-500 text-lg">暂无通知</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              className={`bg-white rounded-lg shadow-md p-4 ${getNotificationStyle(notif.type)} ${
                !notif.isRead ? 'bg-blue-50' : ''
              }`}
              onClick={() => !notif.isRead && handleMarkAsRead([notif.id])}
              style={{ cursor: !notif.isRead ? 'pointer' : 'default' }}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{getNotificationIcon(notif.type)}</span>
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-800">
                      {notif.title}
                    </h3>
                    {!notif.isRead && (
                      <span className="ml-2 px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded">
                        未读
                      </span>
                    )}
                  </div>
                  <p className="text-gray-700 mb-2">{notif.content}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(notif.createdAt).toLocaleString('zh-CN')}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
```

---

## 步骤 4: 更新 Sidebar 导航

**文件**: `web/components/Sidebar.tsx`

在现有的 Sidebar 组件中添加新的菜单项。找到菜单项数组，添加以下内容：

```typescript
// 在 Sidebar 组件中添加状态
const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
const [pendingCooperationCount, setPendingCooperationCount] = useState(0);

// 添加 useEffect 加载 badge 数量
useEffect(() => {
  const loadBadgeCounts = async () => {
    try {
      // 加载未读通知数量
      const notifResponse = await fetch('http://localhost:8000/notifications/unread-count', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      const notifData = await notifResponse.json();
      setUnreadNotificationCount(notifData.count);

      // 加载待处理合作申请数量
      const coopResponse = await fetch('http://localhost:8000/cooperations?role=provider&status=pending', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      const coopData = await coopResponse.json();
      setPendingCooperationCount(coopData.length);
    } catch (error) {
      console.error('Failed to load badge counts:', error);
    }
  };

  loadBadgeCounts();
  // 每 30 秒刷新一次
  const interval = setInterval(loadBadgeCounts, 30000);
  return () => clearInterval(interval);
}, []);

// 更新菜单项数组
const menuItems = [
  { id: 'SmartImport', icon: '🤖', label: 'AI 导入' },
  { id: 'ProductLibrary', icon: '📦', label: '私有库' },
  { id: 'PublicLibrary', icon: '🌐', label: '公共库' },
  { 
    id: 'Cooperation', 
    icon: '🤝', 
    label: '合作中心',
    badge: pendingCooperationCount > 0 ? pendingCooperationCount : undefined
  },
  { id: 'Quotation', icon: '📋', label: '报价管理' },
  { id: 'Vendor', icon: '🏢', label: '供应商' },
  { 
    id: 'Notifications', 
    icon: '🔔', 
    label: '通知',
    badge: unreadNotificationCount > 0 ? unreadNotificationCount : undefined
  },
];

// 在渲染菜单项时显示 badge
{menuItems.map((item) => (
  <button
    key={item.id}
    onClick={() => onTabChange(item.id as SidebarTab)}
    className={/* ... existing classes ... */}
  >
    <span className="text-2xl">{item.icon}</span>
    <span className="text-sm font-medium">{item.label}</span>
    {item.badge && (
      <span className="absolute top-2 right-2 px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-full">
        {item.badge}
      </span>
    )}
  </button>
))}
```

---

## 步骤 5: 更新 App.tsx

**文件**: `web/App.tsx`

添加新组件的导入和路由：

```typescript
// 在文件顶部添加导入
import { PublicLibraryBrowser } from './components/PublicLibrary/PublicLibraryBrowser';
import { CooperationCenter } from './components/Cooperation/CooperationCenter';
import { NotificationCenter } from './components/Notifications/NotificationCenter';

// 在 renderContent 函数中添加新的 case
const renderContent = () => {
  switch (activeTab) {
    case 'SmartImport':
      return <SmartImport />;
    case 'ProductLibrary':
      return <ProductLibrary />;
    case 'PublicLibrary':
      return <PublicLibraryBrowser onApplyCooperation={() => {}} />;
    case 'Cooperation':
      return <CooperationCenter />;
    case 'Quotation':
      return <QuotationManager />;
    case 'Vendor':
      return <VendorManager />;
    case 'Notifications':
      return <NotificationCenter />;
    default:
      return <ProductLibrary />;
  }
};
```

---

## 步骤 6: 更新 README

**文件**: `web/README.md`

在"核心功能"部分添加新模块的说明：

```markdown
### 6. 公共库与合作中心 (`/components/PublicLibrary` + `/components/Cooperation`)
- 浏览公共库资源
- 发起合作申请
- 审核合作请求（通过/拒绝）
- 复制公共 SKU 到私有库
- 终止合作关系
- 合作状态管理

### 7. 通知中心 (`/components/Notifications`)
- 查看所有通知
- 筛选通知类型和状态
- 标记已读/未读
- 实时未读数量提示
- 合作变更通知
- SKU 更新提醒
```

---

## 测试清单

完成上述步骤后，按以下清单测试：

- [ ] 公共库浏览正常显示
- [ ] 筛选功能工作正常
- [ ] 发起合作申请成功
- [ ] 收到合作申请显示在"合作中心"
- [ ] 审核通过/拒绝功能正常
- [ ] 复制 SKU 到私有库成功
- [ ] 通知列表正常显示
- [ ] 标记已读功能正常
- [ ] Sidebar 的 badge 显示正确
- [ ] 所有 API 调用成功

---

## 常见问题

### 1. API 导入错误

**问题**: `Module has no exported member 'api'`

**解决**: 
```bash
# 检查 services/api.ts 最后几行
Get-Content services\api.ts -Tail 5

# 根据导出方式调整导入语句
```

### 2. CORS 错误

**问题**: 跨域请求被阻止

**解决**: 确保后端 `.env` 中设置：
```env
CORS_ALLOW_ALL_IN_DEV=true
```

### 3. 401 未授权

**问题**: API 请求返回 401

**解决**: 检查 localStorage 中是否有 `auth_token`

---

## 下一步

完成 Web 前端后，继续实施：

1. **小程序更新** - 参考 PRD 要求更新小程序
2. **性能优化** - 添加缓存、懒加载
3. **用户体验** - 添加加载动画、错误提示优化

---

最后更新：2026-02-06
