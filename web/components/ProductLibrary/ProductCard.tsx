
import React, { useState, useEffect, useRef } from 'react';
import { SKU, CalendarPrice } from '../../types';

interface ProductCardProps {
  sku: SKU;
  relatedSkus?: SKU[];
  onAdd?: (sku: SKU) => void;
  isSelectable?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
  onUpdatePrice?: (id: string, newSalesPrice: number) => void;
  onDelete?: (id: string) => void;
  onTogglePrivacy?: (id: string) => void;
  onEdit?: (sku: SKU) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ 
  sku, relatedSkus, onAdd, isSelectable, isSelected, onSelect, onDelete, onTogglePrivacy, onEdit
}) => {
  const [added, setAdded] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const packageOptions = relatedSkus && relatedSkus.length > 0 ? relatedSkus : [sku];
  const [activeSku, setActiveSku] = useState<SKU>(packageOptions[0]);
  useEffect(() => {
    setActiveSku(packageOptions[0]);
  }, [sku.id, relatedSkus]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);
  const currentSku = activeSku || sku;
  const attentionLabels: string[] = [];
  if (currentSku.needsAttention?.destination) attentionLabels.push('目的地待补');
  if (currentSku.needsAttention?.pricing) attentionLabels.push('价格待补');
  if (currentSku.needsAttention?.cancellation) attentionLabels.push('退改待补');
  const posterUrl = currentSku.posterUrl;

  const handleCardClick = () => {
    if (isSelectable) {
      onSelect?.();
    } else {
      setShowModal(true);
    }
  };

  const handleAddClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onAdd) {
      onAdd(currentSku);
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    }
  };

  const margin = currentSku.salesPrice 
    ? (((currentSku.salesPrice - currentSku.price) / currentSku.salesPrice) * 100).toFixed(1)
    : '0.0';

  return (
    <>
      <div 
        onClick={handleCardClick}
        className={`bg-white rounded-2xl border transition-all group flex flex-col h-full cursor-pointer relative ${
          isSelected 
            ? 'border-blue-500 ring-2 ring-blue-50 shadow-lg' 
            : 'border-slate-200 hover:shadow-xl hover:-translate-y-1'
        }`}
      >
        <div className="relative h-44 overflow-hidden rounded-t-2xl">
          <img src={currentSku.image} alt={currentSku.productTitle || currentSku.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
          <div className="absolute top-2 left-2 right-2 flex items-center justify-between gap-2">
            <span className="px-2 py-0.5 bg-black/60 backdrop-blur-md text-white text-[9px] font-black rounded uppercase tracking-wider">{currentSku.category}</span>
            <div className="flex items-center gap-2">
              {posterUrl && (
                <a
                  onClick={(e) => e.stopPropagation()}
                  href={posterUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2 py-1 bg-white/80 text-slate-800 text-[10px] font-black rounded-lg border border-slate-200 hover:bg-white"
                >
                  查看海报
                </a>
              )}
              <div className="relative" ref={menuRef}>
              <button 
                onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                className="p-1.5 bg-black/60 backdrop-blur-md text-white rounded-lg hover:bg-black/80 transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>
              {showMenu && (
                <div className="absolute top-full right-0 mt-1 bg-white rounded-xl shadow-xl border border-slate-200 py-1 min-w-[160px] z-10">
                  <button
                    onClick={(e) => { e.stopPropagation(); onEdit?.(sku); setShowMenu(false); }}
                    className="w-full px-4 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    编辑产品
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onTogglePrivacy?.(currentSku.id); setShowMenu(false); }}
                    className="w-full px-4 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                    {currentSku.isPrivate ? '转为公共库' : '转为私有库'}
                  </button>
                  <div className="border-t border-slate-100 my-1"></div>
                  <button
                    onClick={(e) => { e.stopPropagation(); if (confirm('确认要删除这个产品吗？')) onDelete?.(currentSku.id); setShowMenu(false); }}
                    className="w-full px-4 py-2 text-left text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    删除产品
                  </button>
                </div>
              )}
              </div>
            </div>
          </div>
          <div className="absolute bottom-2 right-2">
            <div className="bg-blue-600 px-2 py-1 rounded-lg shadow-lg border border-blue-500">
              <p className="text-sm font-black text-white leading-none">楼{currentSku.salesPrice}</p>
            </div>
          </div>
        </div>
        
        <div className="p-4 flex flex-col flex-grow">
          <h3 className="font-black text-slate-800 text-sm line-clamp-1 mb-1">{currentSku.productTitle || currentSku.name}</h3>
          <p className="text-[10px] text-slate-400 font-bold mb-3">{currentSku.location}</p>
          <div className="mt-auto pt-3 border-t border-slate-50 flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-black uppercase">毛利 {margin}%</span>
            <button onClick={handleAddClick} className={`p-1.5 rounded-lg transition-all ${added ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400 hover:bg-blue-600 hover:text-white'}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={added ? "M5 13l4 4L19 7" : "M12 4v16m8-8H4"} /></svg>
              </button>
            </div>
          </div>
          {attentionLabels.length > 0 && (
            <div className="absolute bottom-2 right-2 flex flex-wrap gap-1">
              {attentionLabels.map((label, idx) => (
                <span key={idx} className="px-2 py-1 bg-amber-500/90 text-white text-[10px] font-black rounded-lg shadow">
                  {label}
                </span>
              ))}
            </div>
          )}
        </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xl" onClick={() => setShowModal(false)}></div>
          <div className="relative w-full max-w-6xl max-h-[95vh] bg-white rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
            {/* 顶栏预览图 */}
            <div className="relative h-64 shrink-0">
              <img src={currentSku.image} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-white via-white/10 to-transparent"></div>
              <button onClick={() => setShowModal(false)} className="absolute top-8 right-8 p-3 bg-white/20 hover:bg-white/40 text-white rounded-full backdrop-blur-xl transition-all border border-white/20">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3"/></svg>
              </button>
              <div className="absolute bottom-8 left-12">
                 <h2 className="text-4xl font-black text-slate-900 tracking-tight mb-2">{currentSku.productTitle || currentSku.name}</h2>
                 <div className="flex items-center gap-3">
                   <span className="bg-blue-600 text-white px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest">{currentSku.category}</span>
                   <p className="text-slate-500 font-bold uppercase text-[11px] tracking-widest">{currentSku.location}</p>
                 </div>
              </div>
            </div>

                        <div className="flex-1 overflow-y-auto p-12 no-scrollbar bg-white">
               {attentionLabels.length > 0 && (
                 <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-700 text-sm font-bold flex gap-2 flex-wrap items-center">
                   <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M5.07 19h13.86A2 2 0 0020.86 16.3L13.99 4.7a2 2 0 00-3.48 0L3.14 16.3A2 2 0 005.07 19z"/></svg>
                   <span>关键信息待补充：</span>
                   {attentionLabels.map((l, i) => (
                     <span key={i} className="px-2 py-1 bg-white rounded-lg border border-amber-200 text-xs">{l}</span>
                   ))}
                 </div>
               )}
               {packageOptions.length > 1 && (
                 <div className="mb-6">
                   <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">套餐选择</h4>
                   <div className="flex flex-wrap gap-2">
                     {packageOptions.map(pkg => (
                       <button
                         key={pkg.id}
                         onClick={(e) => { e.stopPropagation(); setActiveSku(pkg); }}
                         className={`px-3 py-2 text-xs font-bold rounded-xl border ${pkg.id === currentSku.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-100 text-slate-700 border-slate-200 hover:border-blue-400'}`}
                       >
                        {pkg.name} · ￥{pkg.salesPrice}
                       </button>
                     ))}
                   </div>
                 </div>
               )}
               <div className="grid grid-cols-12 gap-12">
                  {/* 宸︿晶涓讳綋鍐呭 */}
                  <div className="col-span-8 space-y-12">
                     <section>
                        <p className="text-lg text-slate-600 font-medium leading-relaxed italic border-l-4 border-blue-100 pl-6">
                          {currentSku.description}
                        </p>
                     </section>

                     <section>
                        <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-3">
                           <div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div>
                           体验亮点 (Highlights)
                        </h4>
                        <div className="grid grid-cols-1 gap-4">
                           {currentSku.highlights.map((h, i) => (
                             <div key={i} className="flex gap-4 p-5 bg-slate-50 rounded-2xl items-center font-black text-slate-800 border border-slate-100/50">
                                <svg className="w-5 h-5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                {h}
                             </div>
                           ))}
                        </div>
                     </section>

                     <div className="grid grid-cols-2 gap-8">
                        <section className="bg-emerald-50/30 p-8 rounded-[2rem] border border-emerald-100">
                           <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-6">费用包含 (Inclusions)</h4>
                             <ul className="space-y-4 text-xs font-bold text-slate-700">
                                {currentSku.inclusions?.map((item, i) => (
                                  <li key={i} className="flex gap-3">
                                    <span className="text-emerald-500">?</span>
                                    {item}
                                  </li>
                                ))}
                             </ul>
                          </section>
                          <section className="bg-rose-50/30 p-8 rounded-[2rem] border border-rose-100">
                             <h4 className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-6">不含 (Exclusions)</h4>
                             <ul className="space-y-4 text-xs font-bold text-slate-700">
                                {currentSku.exclusions?.map((item, i) => (
                                  <li key={i} className="flex gap-3">
                                    <span className="text-rose-400">–</span>
                                    {item}
                                  </li>
                                ))}
                             </ul>
                          </section>
                     </div>
                  </div>

                  {/* 鍙充晶杈规爮锛氭妧鏈弬鏁?(GetYourGuide 椋庢牸) */}
                  <div className="col-span-4 space-y-6">
                     <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">服务参数 (Specs)</h4>
                        <div className="space-y-6">
                           {currentSku.categoryAttributes.duration && (
                             <div className="flex items-center gap-4">
                               <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-slate-400">
                                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                               </div>
                               <div><p className="text-[8px] text-slate-400 font-black uppercase">时长</p><p className="text-xs font-black text-slate-800">{currentSku.categoryAttributes.duration}</p></div>
                             </div>
                           )}
                           {currentSku.categoryAttributes.language && (
                             <div className="flex items-center gap-4">
                               <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-slate-400">
                                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 5h12M9 3v2m1.048 9.5a18.022 18.022 0 01-3.827-5.802M8.15 8a18.1 18.1 0 011.985 5.613l2.454-2.454a18.054 18.054 0 01-4.44-4.008zM12 18l4 4 4-4m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                               </div>
                               <div><p className="text-[8px] text-slate-400 font-black uppercase">语言</p><p className="text-xs font-black text-slate-800">{Array.isArray(currentSku.categoryAttributes.language) ? currentSku.categoryAttributes.language.join(' / ') : currentSku.categoryAttributes.language}</p></div>
                             </div>
                           )}
                           {currentSku.categoryAttributes.bedType && (
                             <div className="flex items-center gap-4">
                               <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-slate-400">馃彣</div>
                               <div><p className="text-[8px] text-slate-400 font-black uppercase">床型 / 面积</p><p className="text-xs font-black text-slate-800">{currentSku.categoryAttributes.bedType} ({currentSku.categoryAttributes.roomArea || '-'})</p></div>
                             </div>
                           )}
                           {currentSku.categoryAttributes.vehicleType && (
                             <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-slate-400">🚗</div>
                                <div>
                                  <p className="text-[8px] text-slate-400 font-black uppercase">车型 / 座位</p>
                                  <p className="text-xs font-black text-slate-800">
                                    {currentSku.categoryAttributes.vehicleType} ({currentSku.categoryAttributes.capacity}人)
                                  </p>
                                </div>
                              </div>
                            )}
                         </div>
                      </div>

                      <div className="p-8 bg-slate-900 rounded-[2.5rem] text-white">
                         <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-4">退款规则</h4>
                         <p className="text-[11px] font-bold leading-relaxed text-slate-300 italic">
                           {currentSku.cancellationPolicy}
                         </p>
                     </div>
                  </div>
               </div>
            </div>

            <div className="p-10 border-t border-slate-100 bg-white flex items-center justify-between">
                 <div className="flex gap-10">
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase mb-1">成本价</p>
                      <p className="text-2xl font-black text-slate-900">￥{currentSku.price}</p>
                    </div>
                    <div className="w-px h-10 bg-slate-100"></div>
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase mb-1">销售价</p>
                      <p className="text-2xl font-black text-blue-600">￥{currentSku.salesPrice}</p>
                    </div>
                 </div>
                 <div className="flex gap-4">
                    <div className="text-right">
                      <p className="text-[9px] font-black text-slate-400 uppercase mb-1">供应商</p>
                      <p className="text-xs font-black text-slate-700">{currentSku.provider}</p>
                    </div>
                  <button onClick={handleAddClick} className={`px-12 py-5 rounded-2xl font-black text-lg transition-all shadow-2xl ${added ? 'bg-emerald-500 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                    {added ? '✓ 已加入待报价' : '确认加入报价单'}
                  </button>
               </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ProductCard;












