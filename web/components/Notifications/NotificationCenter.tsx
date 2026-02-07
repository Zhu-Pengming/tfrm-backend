import React, { useState, useEffect } from 'react';
import { Notification } from '../../types';
import { API_BASE_URL } from '../../config';

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

      const response = await fetch(`${API_BASE_URL}/notifications?${params.toString()}`, {
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
      const response = await fetch(`${API_BASE_URL}/notifications/unread-count`, {
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
