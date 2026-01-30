import React from 'react';
import { NAV_ITEMS } from '../constants';
import { SidebarTab } from '../types';

interface SidebarProps {
  activeTab: SidebarTab;
  onTabChange: (tab: SidebarTab) => void;
  currentUser?: any;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange, currentUser }) => {
  const agencyLabel = currentUser 
    ? (currentUser.agency_name || currentUser.agency_id || '未设置旅行社')
    : '未登录';

  return (
    <aside className="w-64 bg-slate-900 text-white flex flex-col fixed h-full z-30">
      <div className="p-6">
        <div className="flex items-center space-x-3 mb-10">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-xl">T</div>
          <span className="text-xl font-bold tracking-tight">智旅SKU</span>
        </div>
        
        <nav className="space-y-2">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id as SidebarTab)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                activeTab === item.id
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              {item.icon}
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
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



