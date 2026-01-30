
import React, { useState, useMemo, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Vendor, Category } from '../../types';
import { CATEGORIES } from '../../constants';

// 专长映射配置
const SPECIALTY_MAPPING: Record<string, string[]> = {
  'Hotel': ['五星级', '精品民宿', '商务酒店', '度假村', '公寓式酒店', '胶囊酒店'],
  'Transport': ['单程接送', '包车服务', '自驾租赁', '豪华礼宾', '大巴团队', '机场接机'],
  'Ticket': ['主题乐园', '博物馆', '演出票务', '快速通道', '城市通票', '滑雪场'],
  'Guide': ['高级导游', '中英双语', '摄影向导', '户外徒步', '学术讲解', '美食博主'],
  'Catering': ['米其林', '地道特色', '团队用餐', '私人主厨', '酒窖体验', '怀石料理'],
  'Activity': ['极限运动', '手作体验', '直升机观光', '潜水冲浪', '热气球', '和服体验'],
  'Route': ['亲子研学', '蜜月定制', '中老年康养', '摄影之旅', '极限越野', '深度文化'],
};

interface NoteData {
  text: string;
  updatedAt: string;
}

const INITIAL_MOCK_VENDORS: Vendor[] = [
  {
    id: 'v1',
    name: 'Expedia Group',
    logo: 'https://logo.clearbit.com/expedia.com',
    contact: '预订部经理',
    phone: '+86 400-123-4567',
    email: 'b2b-support@expedia.com',
    category: ['Hotel', 'Ticket'],
    specialties: ['五星级', '度假村', '主题乐园', '城市通票'],
    status: 'Active',
    rating: 4.9,
    address: '美国 华盛顿州 贝尔维尤市 东北第四街 1111号'
  },
  {
    id: 'v2',
    name: '富士通运 (Fuji Transport)',
    logo: '', 
    contact: '田中先生',
    phone: '+81 90-1234-5678',
    email: 'tanaka@fujitransport.jp',
    category: ['Transport'],
    specialties: ['包车服务', '单程接送', '中英双语', '机场接机'],
    status: 'Active',
    rating: 4.8,
    address: '日本 山梨县 富士吉田市 新屋 1-1-1'
  },
  {
    id: 'v3',
    name: 'JTB Global Marketing',
    logo: 'https://api.dicebear.com/7.x/initials/svg?seed=JTB',
    contact: '佐藤女士',
    phone: '+81 3-5796-5111',
    email: 'info@jtbglobal.com',
    category: ['Hotel', 'Route', 'Transport'],
    specialties: ['高级导游', '蜜月定制', '商务酒店', '深度文化'],
    status: 'Active',
    rating: 5.0,
    address: '日本 东京 品川区 东品川 2-3-11'
  }
];

const VendorLogo: React.FC<{ vendor: Vendor; size?: string }> = ({ vendor, size = "w-14 h-14" }) => {
  const [generatedLogo, setGeneratedLogo] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const triggerGeneration = async () => {
      if (!vendor.logo && !generatedLogo && !isLoading && !error) {
        setIsLoading(true);
        try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const categoryLabels = vendor.category.map(c => CATEGORIES.find(i => i.id === c)?.label || c).join(', ');
          const prompt = `A professional, minimalist, modern corporate logo for a travel partner named "${vendor.name}". Industry categories: ${categoryLabels}. Clean flat vector design, isolated on white background, high quality.`;
          
          const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: prompt,
            config: {
              numberOfImages: 1,
              aspectRatio: '1:1',
            },
          });

          if (response.generatedImages?.[0]?.image?.imageBytes) {
            setGeneratedLogo(`data:image/png;base64,${response.generatedImages[0].image.imageBytes}`);
          } else {
            setError(true);
          }
        } catch (err) {
          console.error("Imagen Logo Generation Error:", err);
          setError(true);
        } finally {
          setIsLoading(false);
        }
      }
    };
    triggerGeneration();
  }, [vendor.logo, vendor.name]);

  const initials = vendor.name.split(' ').map(word => word[0]).join('').substring(0, 2).toUpperCase();

  return (
    <div className={`${size} rounded-2xl bg-white border border-slate-100 p-2 flex items-center justify-center shrink-0 shadow-sm overflow-hidden`}>
      {vendor.logo ? (
        <img src={vendor.logo} className="w-full h-full object-contain" alt={vendor.name} />
      ) : isLoading ? (
        <div className="w-full h-full flex flex-col items-center justify-center bg-blue-50/50">
          <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : generatedLogo ? (
        <img src={generatedLogo} className="w-full h-full object-contain" alt={vendor.name} />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400 font-black text-xs">{initials}</div>
      )}
    </div>
  );
};

const VendorView: React.FC = () => {
  const [vendors, setVendors] = useState<Vendor[]>(INITIAL_MOCK_VENDORS);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<Category | 'All'>('All');
  const [activeStatus, setActiveStatus] = useState<Vendor['status'] | 'All'>('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  
  // 备注系统状态
  const [vendorNotes, setVendorNotes] = useState<Record<string, NoteData>>({});
  const [activeDetailVendor, setActiveDetailVendor] = useState<Vendor | null>(null);
  const [editingNote, setEditingNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  const itemsPerPage = 8;

  // 初始化加载本地备注
  useEffect(() => {
    const saved = localStorage.getItem('travel_sku_vendor_notes_v2');
    if (saved) { 
      try { setVendorNotes(JSON.parse(saved)); } catch (e) { console.error("Failed to load notes", e); } 
    }
  }, []);

  // 从后端加载供应商列表
  useEffect(() => {
    const loadVendors = async () => {
      try {
        const { vendorAPI } = await import('../../services/api');
        const data = await vendorAPI.list() as Vendor[];
        setVendors(data);
      } catch (error) {
        console.error('Failed to load vendors:', error);
      }
    };
    loadVendors();
  }, []);

  const handleCopyPhone = (e: React.MouseEvent, phone: string, vendorId: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(phone).then(() => {
      setCopyStatus(vendorId);
      setTimeout(() => setCopyStatus(null), 2000);
    });
  };

  const handleOpenDetail = (vendor: Vendor) => {
    setActiveDetailVendor(vendor);
    setEditingNote(vendorNotes[vendor.id]?.text || '');
    setSaveSuccess(false);
  };

  const handleSaveNote = () => {
    if (!activeDetailVendor) return;
    setIsSaving(true);
    const now = new Date().toLocaleString('zh-CN', { hour12: false });
    const updatedNotes = { ...vendorNotes, [activeDetailVendor.id]: { text: editingNote, updatedAt: now } };
    
    // 如果为空则清理
    if (!editingNote.trim()) {
      delete updatedNotes[activeDetailVendor.id];
    }
    
    setVendorNotes(updatedNotes);
    localStorage.setItem('travel_sku_vendor_notes_v2', JSON.stringify(updatedNotes));
    
    setTimeout(() => { 
      setIsSaving(false); 
      setSaveSuccess(true); 
      setTimeout(() => setSaveSuccess(false), 1500); 
    }, 400);
  };

  const handleDeleteVendor = async () => {
    if (!activeDetailVendor) return;
    
    if (!confirm(`确定要删除供应商 "${activeDetailVendor.name}" 吗？此操作无法撤销。`)) {
      return;
    }

    try {
      const { vendorAPI } = await import('../../services/api');
      await vendorAPI.delete(activeDetailVendor.id);
      
      setVendors(vendors.filter(v => v.id !== activeDetailVendor.id));
      setActiveDetailVendor(null);
      alert('供应商已删除');
    } catch (error) {
      console.error('Failed to delete vendor:', error);
      alert('删除供应商失败，请重试');
    }
  };

  const filteredVendors = useMemo(() => {
    return vendors.filter(v => {
      const query = searchQuery.toLowerCase();
      const matchesSearch = v.name.toLowerCase().includes(query) || 
                           v.contact.toLowerCase().includes(query) ||
                           v.address.toLowerCase().includes(query) ||
                           (vendorNotes[v.id]?.text || '').toLowerCase().includes(query);
      const matchesCategory = activeCategory === 'All' || v.category.includes(activeCategory as Category);
      const matchesStatus = activeStatus === 'All' || v.status === activeStatus;
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [vendors, searchQuery, activeCategory, activeStatus, vendorNotes]);

  const paginatedVendors = filteredVendors.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="max-w-[1600px] mx-auto py-8 px-8 pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">供应商合作伙伴</h1>
          <p className="text-slate-500 font-medium">建立深度连接，维护业务备忘</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative">
            <input
              type="text"
              placeholder="搜索供应商、联系人、备注..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="pl-12 pr-4 py-3 w-64 md:w-96 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-100 outline-none transition-all shadow-sm font-medium"
            />
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeWidth="2" strokeLinecap="round"/></svg>
          </div>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
            登记供应商
          </button>
        </div>
      </header>

      {/* 筛选器组 */}
      <div className="bg-white rounded-[2rem] border border-slate-200 p-2 shadow-sm mb-8 flex flex-col md:flex-row items-center gap-1 overflow-x-auto no-scrollbar">
        <div className="flex-1 flex p-1">
          <button 
            onClick={() => { setActiveCategory('All'); }} 
            className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap ${activeCategory === 'All' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            全部
          </button>
          <div className="w-px h-6 bg-slate-100 mx-2 my-auto shrink-0" />
          {CATEGORIES.map(cat => (
            <button 
              key={cat.id} 
              onClick={() => { setActiveCategory(cat.id as Category); }} 
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${activeCategory === cat.id ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}
            >
              <span>{cat.icon}</span>
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* 供应商列表 */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-left table-fixed">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <th className="px-8 py-5 w-[45%]">供应商 / 核心联系人</th>
              <th className="px-8 py-5 w-[35%]">内部备注 (Notes)</th>
              <th className="px-8 py-5 w-[10%] text-center">状态</th>
              <th className="px-8 py-5 w-[10%] text-right pr-12">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedVendors.map((vendor) => (
              <tr 
                key={vendor.id} 
                onClick={() => handleOpenDetail(vendor)}
                className="hover:bg-blue-50/20 transition-colors group cursor-pointer"
              >
                <td className="px-8 py-6">
                  <div className="flex items-center gap-4">
                    <VendorLogo vendor={vendor} />
                    <div className="min-w-0">
                      <p className="font-black text-slate-900 text-sm truncate mb-0.5">{vendor.name}</p>
                      
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[11px] font-bold text-slate-500">{vendor.contact}</span>
                        <span className="text-slate-200">|</span>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-mono text-slate-400">{vendor.phone}</span>
                          <button 
                            onClick={(e) => handleCopyPhone(e, vendor.phone, vendor.id)}
                            className="p-1 rounded bg-slate-50 hover:bg-blue-100 text-slate-400 hover:text-blue-600 transition-all border border-slate-100"
                            title="复制电话"
                          >
                            {copyStatus === vendor.id ? (
                              <svg className="w-3 h-3 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeWidth="3"/></svg>
                            ) : (
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {vendor.category.slice(0, 3).map(c => (
                          <span key={c} className="px-1.5 py-0.5 bg-slate-50 text-slate-400 rounded text-[8px] font-black border border-slate-100 uppercase tracking-tighter">
                            {CATEGORIES.find(item => item.id === c)?.label || c}
                          </span>
                        ))}
                        {vendor.category.length > 3 && <span className="text-[8px] text-slate-300 font-bold">+{vendor.category.length - 3}</span>}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <div className={`p-3 rounded-2xl border transition-all h-12 flex items-center ${vendorNotes[vendor.id] ? 'bg-amber-50/50 border-amber-100' : 'bg-slate-50 border-slate-50'}`}>
                    {vendorNotes[vendor.id] ? (
                      <p className="text-[11px] text-amber-800 font-medium line-clamp-1 italic">
                        "{vendorNotes[vendor.id].text}"
                      </p>
                    ) : (
                      <p className="text-[11px] text-slate-300 font-bold italic tracking-tight">暂无合作备忘录...</p>
                    )}
                  </div>
                </td>
                <td className="px-8 py-6 text-center">
                  <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black border uppercase ${
                    vendor.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}>
                    {vendor.status === 'Active' ? '合作中' : '暂停'}
                  </span>
                </td>
                <td className="px-8 py-6 text-right pr-12">
                   <button 
                    className="p-2.5 bg-white text-slate-400 border border-slate-100 rounded-xl group-hover:bg-slate-900 group-hover:text-white transition-all shadow-sm"
                   >
                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" strokeWidth="2.5"/></svg>
                   </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 供应商详情侧边栏 */}
      {activeDetailVendor && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setActiveDetailVendor(null)}></div>
          <div className="relative w-[600px] h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-500 overflow-hidden">
            
            {/* 头部信息 */}
            <div className="p-10 border-b border-slate-100 bg-white sticky top-0 z-10">
               <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                      activeDetailVendor.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                    }`}>
                      {activeDetailVendor.status === 'Active' ? 'ACTIVE PARTNER' : 'SUSPENDED'}
                    </span>
                    <span className="flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-600 rounded-lg text-[10px] font-black">
                      ★ {activeDetailVendor.rating}
                    </span>
                  </div>
                  <button onClick={() => setActiveDetailVendor(null)} className="p-3 bg-slate-100 text-slate-400 hover:text-slate-900 hover:bg-slate-200 rounded-full transition-all">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2.5"/></svg>
                  </button>
               </div>

               <div className="flex items-start gap-6">
                  <VendorLogo vendor={activeDetailVendor} size="w-24 h-24" />
                  <div>
                    <h3 className="text-3xl font-black text-slate-900 mb-2">{activeDetailVendor.name}</h3>
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-slate-600 flex items-center gap-2">
                        <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" strokeWidth="2"/></svg>
                        {activeDetailVendor.contact}
                      </p>
                      <p className="text-sm font-medium text-slate-400 flex items-center gap-2">
                        <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" strokeWidth="2"/></svg>
                        {activeDetailVendor.email}
                      </p>
                    </div>
                  </div>
               </div>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar p-10 space-y-12 bg-slate-50/30">
              
              {/* 核心联系 */}
              <section>
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                  联系与地址
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                    <p className="text-[9px] text-slate-400 font-black uppercase mb-1">直连电话</p>
                    <p className="text-lg font-black text-slate-900 font-mono">{activeDetailVendor.phone}</p>
                  </div>
                  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                    <p className="text-[9px] text-slate-400 font-black uppercase mb-1">地址详情</p>
                    <p className="text-xs font-bold text-slate-700 leading-relaxed">{activeDetailVendor.address}</p>
                  </div>
                </div>
              </section>

              {/* 业务范畴 */}
              <section>
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                  业务覆盖与专长
                </h4>
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-8">
                  <div>
                    <p className="text-[9px] text-slate-400 font-black uppercase mb-4">主营类目</p>
                    <div className="flex flex-wrap gap-2">
                      {activeDetailVendor.category.map(c => {
                        const cat = CATEGORIES.find(i => i.id === c);
                        return (
                          <div key={c} className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-xl border border-blue-100">
                            {cat?.icon}
                            <span className="text-xs font-black">{cat?.label || c}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-[9px] text-slate-400 font-black uppercase mb-4">核心专长 (Specialties)</p>
                    <div className="flex flex-wrap gap-2">
                      {activeDetailVendor.specialties.map(s => (
                        <span key={s} className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold border border-slate-200">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              {/* 合作备注 (历史记录) */}
              <section>
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                  合作历史与内部备忘
                </h4>
                <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm flex flex-col">
                  <textarea
                    value={editingNote}
                    onChange={(e) => setEditingNote(e.target.value)}
                    placeholder="在此记录：合作底线、优势资源、对接习惯、返佣政策、历史投诉等..."
                    className="w-full bg-transparent outline-none font-medium text-slate-700 resize-none leading-relaxed text-lg h-40"
                  />
                  {vendorNotes[activeDetailVendor.id] && (
                    <div className="mt-6 pt-6 border-t border-slate-50 flex items-center justify-between">
                      <span className="text-[9px] text-slate-400 font-black uppercase">最后同步时间</span>
                      <span className="text-[10px] font-mono text-slate-400 font-bold">{vendorNotes[activeDetailVendor.id].updatedAt}</span>
                    </div>
                  )}
                </div>
              </section>
            </div>

            {/* 底部操作 */}
            <div className="p-10 bg-white border-t border-slate-100 sticky bottom-0 z-10 space-y-3">
               <button 
                onClick={handleSaveNote}
                disabled={isSaving}
                className={`w-full py-5 rounded-2xl font-black text-lg transition-all shadow-2xl flex items-center justify-center gap-3 ${
                  saveSuccess ? 'bg-emerald-500 text-white shadow-emerald-100' : 'bg-slate-900 text-white hover:bg-black'
                }`}
               >
                 {isSaving ? (
                   <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                 ) : saveSuccess ? (
                   <>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeWidth="3"/></svg>
                    修改已保存
                   </>
                 ) : '保存备注信息'}
               </button>
               <button
                onClick={handleDeleteVendor}
                className="w-full py-4 rounded-2xl font-black text-lg transition-all bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 flex items-center justify-center gap-2"
               >
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                 </svg>
                 删除供应商
               </button>
            </div>
          </div>
        </div>
      )}

      {/* 添加供应商模态框 */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md" onClick={() => setIsAddModalOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} key={`modal-${isAddModalOpen}`}>
            <AddVendorModal 
              key={`add-vendor-${isAddModalOpen}`}
              onClose={() => setIsAddModalOpen(false)}
              onVendorAdded={(newVendor) => {
                setVendors([...vendors, newVendor]);
                setIsAddModalOpen(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

const AddVendorModal: React.FC<{ 
  onClose: () => void; 
  onVendorAdded: (vendor: Vendor) => void;
}> = ({ onClose, onVendorAdded }) => {
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    phone: '',
    email: '',
    category: [] as Category[],
    specialties: [] as string[],
    address: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCategoryToggle = (category: Category) => {
    setFormData(prev => ({
      ...prev,
      category: prev.category.includes(category)
        ? prev.category.filter(c => c !== category)
        : [...prev.category, category]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (!formData.name || !formData.contact || !formData.phone || !formData.email || formData.category.length === 0) {
        setError('请填写所有必填项');
        setIsLoading(false);
        return;
      }

      const { vendorAPI } = await import('../../services/api');
      const newVendor = await vendorAPI.create({
        name: formData.name,
        contact: formData.contact,
        phone: formData.phone,
        email: formData.email,
        category: formData.category,
        specialties: formData.specialties,
        address: formData.address || null,
        logo: null,
      }) as Vendor;

      onVendorAdded(newVendor);
      alert('供应商已成功添加');
    } catch (err) {
      console.error('Failed to add vendor:', err);
      setError('添加供应商失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
      <div className="sticky top-0 bg-white border-b border-slate-200 p-8 flex items-center justify-between">
        <h2 className="text-2xl font-black text-slate-900">登记新供应商</h2>
        <button 
          onClick={onClose}
          className="p-2 hover:bg-slate-100 rounded-full transition-all"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M6 18L18 6M6 6l12 12" strokeWidth="2.5"/>
          </svg>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-10 space-y-8">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">供应商名称 *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 font-medium"
              placeholder="输入供应商名称"
              autoComplete="off"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">联系人 *</label>
            <input
              type="text"
              value={formData.contact}
              onChange={(e) => setFormData({...formData, contact: e.target.value})}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 font-medium"
              placeholder="输入联系人名称"
              autoComplete="off"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">电话 *</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 font-medium"
              placeholder="输入电话号码"
              autoComplete="off"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">邮箱 *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 font-medium"
              placeholder="输入邮箱地址"
              autoComplete="off"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-4">服务类别 *</label>
          <div className="grid grid-cols-4 gap-3">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleCategoryToggle(cat.id as Category)}
                className={`p-3 rounded-xl border-2 transition-all text-left font-medium flex items-center gap-2 ${
                  formData.category.includes(cat.id as Category)
                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                <span>{cat.icon}</span>
                <span className="text-sm">{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">地址</label>
          <input
            type="text"
            value={formData.address}
            onChange={(e) => setFormData({...formData, address: e.target.value})}
            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 font-medium"
            placeholder="输入供应商地址（可选）"
          />
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-6 py-3 border border-slate-200 rounded-xl font-bold text-slate-700 hover:bg-slate-50 transition-all"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                添加中...
              </>
            ) : (
              '添加供应商'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default VendorView;
