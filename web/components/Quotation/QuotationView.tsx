
import React, { useState } from 'react';
import { SKU } from '../../types';

interface QuotationViewProps {
  items: SKU[];
  onRemove: (id: string) => void;
  onBackToLibrary: () => void;
}

const QuotationView: React.FC<QuotationViewProps> = ({ items, onRemove, onBackToLibrary }) => {
  const [showH5Preview, setShowH5Preview] = useState(false);
  const [quotationId, setQuotationId] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const totalPrice = items.reduce((sum, item) => sum + item.price, 0);

  const handleCreateQuotation = async () => {
    if (isCreating) return;
    setIsCreating(true);
    
    try {
      const response = await fetch('http://localhost:8000/quotations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          customer_name: '客户',
          customer_contact: '',
          travel_date: new Date().toISOString().split('T')[0],
          pax_count: 1,
          status: 'draft',
          items: items.map(item => ({
            sku_id: item.id,
            quantity: 1,
            unit_price: item.price,
            notes: ''
          }))
        })
      });

      if (!response.ok) throw new Error('创建报价单失败');
      
      const data = await response.json();
      setQuotationId(data.id);
      return data.id;
    } catch (error) {
      console.error('Failed to create quotation:', error);
      alert('创建报价单失败，请重试');
      return null;
    } finally {
      setIsCreating(false);
    }
  };

  const handleExportPDF = async () => {
    let qid = quotationId;
    if (!qid) {
      qid = await handleCreateQuotation();
      if (!qid) return;
    }

    try {
      const response = await fetch(`http://localhost:8000/quotations/${qid}/export/pdf`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (!response.ok) throw new Error('导出PDF失败');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `quotation-${qid}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to export PDF:', error);
      alert('导出PDF失败，请重试');
    }
  };

  const handleShareH5 = async () => {
    let qid = quotationId;
    if (!qid) {
      qid = await handleCreateQuotation();
      if (!qid) return;
    }

    try {
      const response = await fetch(`http://localhost:8000/quotations/${qid}/share`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (!response.ok) throw new Error('生成分享链接失败');

      const data = await response.json();
      setShareUrl(data.share_url);
      setShowH5Preview(true);
    } catch (error) {
      console.error('Failed to generate share URL:', error);
      alert('生成分享链接失败，请重试');
    }
  };

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto py-20 px-4 text-center">
        <div className="bg-white rounded-3xl p-12 border border-slate-200 shadow-sm">
          <div className="text-6xl mb-6">📝</div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">报价单是空的</h2>
          <p className="text-slate-500 mb-8">您还没有添加任何产品 SKU。请前往产品库挑选合适的资源。</p>
          <button 
            onClick={onBackToLibrary}
            className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
          >
            前往产品库挑选
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">生成报价单</h1>
          <p className="text-slate-500">已选择 {items.length} 个资源，准备生成最终方案</p>
        </div>
        <button 
          onClick={onBackToLibrary}
          className="text-blue-600 font-semibold hover:underline flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          继续添加资源
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* List of Items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <div key={item.id} className="bg-white rounded-2xl p-4 border border-slate-200 flex items-center gap-4 hover:shadow-md transition-shadow">
              <img src={item.image} alt={item.name} className="w-20 h-20 rounded-xl object-cover shrink-0" />
              <div className="flex-grow min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-bold uppercase tracking-wider">{item.category}</span>
                  <span className="text-xs text-slate-400">|</span>
                  <span className="text-xs text-slate-500 truncate">{item.provider}</span>
                </div>
                <h3 className="font-bold text-slate-800 truncate">{item.name}</h3>
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                   <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                   {item.location}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-lg font-bold text-slate-900">¥{item.price}</p>
                <button 
                  onClick={() => onRemove(item.id)}
                  className="text-red-500 text-xs font-semibold mt-2 hover:underline p-1"
                >
                  移除
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Summary Card */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm sticky top-24">
            <h2 className="text-xl font-bold text-slate-900 mb-6">费用概览</h2>
            
            <div className="space-y-4 mb-6">
              <div className="flex justify-between text-slate-600">
                <span>资源总数</span>
                <span>{items.length} 个</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>基础结算价</span>
                <span>¥{totalPrice.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>计调服务费</span>
                <span>¥0</span>
              </div>
              <div className="pt-4 border-t border-slate-100 flex justify-between items-end">
                <span className="font-bold text-slate-900">总计金额</span>
                <span className="text-3xl font-black text-blue-600 tracking-tighter">¥{totalPrice.toLocaleString()}</span>
              </div>
            </div>

            <div className="space-y-3">
              <button 
                onClick={handleExportPDF}
                disabled={isCreating}
                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                {isCreating ? '生成中...' : '导出 PDF 报价单'}
              </button>
              <button 
                onClick={handleShareH5}
                disabled={isCreating}
                className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                {isCreating ? '生成中...' : '预览 H5 方案'}
              </button>
            </div>

            <p className="mt-6 text-[11px] text-slate-400 text-center leading-relaxed">
              * 生成报价单将锁定当前资源价格 24 小时<br/>请尽快与客户确认并完成预订。
            </p>
          </div>
        </div>
      </div>

      {/* H5 Preview Modal */}
      {showH5Preview && (
        <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
          {/* Close Button */}
          <button 
            onClick={() => setShowH5Preview(false)}
            className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all z-10"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>

          {/* Phone Frame */}
          <div className="relative w-full max-w-[375px] h-[750px] bg-white rounded-[3rem] shadow-2xl border-[8px] border-slate-800 overflow-hidden flex flex-col">
            {/* Phone Notch */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-800 rounded-b-2xl z-20"></div>
            
            {/* Scrollable H5 Content */}
            <div className="flex-1 overflow-y-auto bg-slate-50 pb-20 scroll-smooth">
              {/* Header Image */}
              <div className="relative h-60">
                <img 
                  src={items[0]?.image || 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&q=80&w=800'} 
                  className="w-full h-full object-cover" 
                  alt="Cover" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                <div className="absolute bottom-6 left-6 right-6 text-white">
                  <h2 className="text-xl font-bold mb-1">您的专属定制方案</h2>
                  <p className="text-xs opacity-80 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>
                    {items[0]?.location.split(',')[0]} 及周边定制行程
                  </p>
                </div>
              </div>

              {/* Stats Bar */}
              <div className="grid grid-cols-3 gap-px bg-slate-200 border-b border-slate-200">
                <div className="bg-white p-4 text-center">
                  <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">产品总数</p>
                  <p className="font-bold text-blue-600">{items.length}项</p>
                </div>
                <div className="bg-white p-4 text-center">
                  <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">预计花费</p>
                  <p className="font-bold text-blue-600">¥{totalPrice}</p>
                </div>
                <div className="bg-white p-4 text-center">
                  <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">方案有效期</p>
                  <p className="font-bold text-blue-600">24H</p>
                </div>
              </div>

              {/* Itinerary List */}
              <div className="p-4 space-y-6">
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-1.5 h-6 bg-blue-600 rounded-full"></span>
                  <h3 className="text-lg font-bold text-slate-800">行程精选资源</h3>
                </div>

                {items.map((item, idx) => (
                  <div key={item.id} className="relative pl-6 border-l-2 border-slate-200 last:border-0 pb-6">
                    {/* Time Indicator */}
                    <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-blue-600 border-4 border-white shadow-sm"></div>
                    
                    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 group active:scale-[0.98] transition-all">
                      <div className="h-32 relative">
                        <img src={item.image} className="w-full h-full object-cover" alt="" />
                        <span className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 backdrop-blur text-white text-[9px] font-bold rounded uppercase tracking-widest">
                          {item.category}
                        </span>
                      </div>
                      <div className="p-3">
                        <div className="flex justify-between items-start mb-1">
                          <h4 className="font-bold text-slate-800 text-sm line-clamp-1">{item.name}</h4>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-slate-400">
                          <span className="text-amber-500">★ {item.rating}</span>
                          <span>•</span>
                          <span>{item.location}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer Space */}
              <div className="p-8 text-center">
                <p className="text-xs text-slate-400 mb-2 italic">—— 由 智旅云 强力驱动 ——</p>
                <div className="w-12 h-1 w-full flex justify-center gap-1 opacity-20">
                  <span className="w-1 h-1 bg-slate-400 rounded-full"></span>
                  <span className="w-1 h-1 bg-slate-400 rounded-full"></span>
                  <span className="w-1 h-1 bg-slate-400 rounded-full"></span>
                </div>
              </div>
            </div>

            {/* Bottom Action Bar */}
            <div className="p-4 bg-white/80 backdrop-blur border-t border-slate-100 z-10">
              {shareUrl && (
                <div className="mb-3 p-3 bg-blue-50 rounded-lg">
                  <p className="text-xs text-blue-600 font-medium mb-1">分享链接</p>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={shareUrl} 
                      readOnly 
                      className="flex-1 px-2 py-1 text-xs bg-white border border-blue-200 rounded"
                    />
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(shareUrl);
                        alert('链接已复制！');
                      }}
                      className="px-3 py-1 bg-blue-600 text-white text-xs rounded font-medium"
                    >
                      复制
                    </button>
                  </div>
                </div>
              )}
              <div className="flex gap-3">
                <button className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-100">
                  立即确认方案
                </button>
                <button className="px-4 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm">
                  联系计调
                </button>
              </div>
            </div>
          </div>
          
          {/* Instructions */}
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-white/60 text-sm hidden lg:block">
            这是客户在手机端看到的预览效果
          </div>
        </div>
      )}
    </div>
  );
};

export default QuotationView;
