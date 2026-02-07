import React, { useState, useEffect } from 'react';
import { NAV_ITEMS } from '../constants';
import { SidebarTab } from '../types';
import { API_BASE_URL } from '../config';

interface SidebarProps {
  activeTab: SidebarTab;
  onTabChange: (tab: SidebarTab) => void;
  currentUser?: any;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange, currentUser }) => {
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [pendingCooperations, setPendingCooperations] = useState(0);

  const agencyLabel = currentUser 
    ? (currentUser.agency_name || currentUser.agency_id || '未设置旅行社')
    : '未登录';

  // 获取未读通知数量
  const fetchUnreadCount = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/notifications/unread-count`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setUnreadNotifications(data.count || 0);
      }
    } catch (error) {
      console.error('Failed to fetch unread notifications:', error);
    }
  };

  // 获取待审核合作数量
  const fetchPendingCooperations = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/cooperations?role=provider&status=pending`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setPendingCooperations(data.length || 0);
      }
    } catch (error) {
      console.error('Failed to fetch pending cooperations:', error);
    }
  };

  // 初始加载和定时轮询
  useEffect(() => {
    if (currentUser) {
      fetchUnreadCount();
      fetchPendingCooperations();

      // 每30秒轮询一次
      const interval = setInterval(() => {
        fetchUnreadCount();
        fetchPendingCooperations();
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [currentUser]);

  const getBadgeCount = (itemId: string) => {
    if (itemId === 'Notifications') return unreadNotifications;
    if (itemId === 'Cooperation') return pendingCooperations;
    return 0;
  };

  return (
    <aside className="w-64 bg-slate-900 text-white flex flex-col fixed h-full z-30">
      <div className="p-6">
        <div className="flex items-center space-x-3 mb-10">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-xl">T</div>
          <span className="text-xl font-bold tracking-tight">智旅SKU</span>
        </div>
        
        <nav className="space-y-2">
          {NAV_ITEMS.map((item) => {
            const badgeCount = getBadgeCount(item.id);
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id as SidebarTab)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 ${
                  activeTab === item.id
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center space-x-3">
                  {item.icon}
                  <span className="font-medium">{item.label}</span>
                </div>
                {badgeCount > 0 && (
                  <span className="ml-auto px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] text-center">
                    {badgeCount > 99 ? '99+' : badgeCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
      
      <div className="mt-auto p-6 border-t border-slate-800">
        <div className="flex items-center space-x-3 text-sm text-slate-400">
          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
            <svg className="w-4 h-4 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.121 17.804A9 9 0 1118.88 17.8M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div className="leading-tight">
            <p className="text-slate-200 font-medium">
              {currentUser?.full_name || currentUser?.username || '用户'}
            </p>
            <p className="text-xs text-slate-400">{agencyLabel}</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;



