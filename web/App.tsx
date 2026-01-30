
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ProductLibrary from './components/ProductLibrary/ProductLibrary';
import SmartImport from './components/SmartImport/SmartImport';
import QuotationView from './components/Quotation/QuotationView';
import VendorView from './components/Vendor/VendorView';
import { SidebarTab, SKU } from './types';
import { useAuth } from './contexts/AuthContext';
import LoginPage from './components/Auth/LoginPage';

const App: React.FC = () => {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<SidebarTab>('ProductLibrary');
  const [quotationItems, setQuotationItems] = useState<SKU[]>([]);
  const [customSkus, setCustomSkus] = useState<SKU[]>([]);

  // 从本地存储加载自定义 SKU，便于断网时继续编辑
  useEffect(() => {
    const saved = localStorage.getItem('travel_sku_custom_list');
    if (saved) {
      try {
        setCustomSkus(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load custom SKUs", e);
      }
    }
  }, []);

  const handleSaveSKU = async (sku: SKU) => {
    try {
      const { skuAPI } = await import('./services/api');

      const frontendToBackend: Record<string, string> = {
        'Hotel': 'hotel',
        'Transport': 'car',
        'Ticket': 'ticket',
        'Guide': 'guide',
        'Catering': 'restaurant',
        'Activity': 'activity',
        'Route': 'itinerary'
      };

      const skuType = (sku.backendType as string) || frontendToBackend[sku.category] || sku.category.toLowerCase();

      const cat = sku.categoryAttributes || {};
      const raw = sku.rawExtracted || {};

      const toNumber = (val: any, fallback?: number) => {
        const n = Number(val);
        return Number.isFinite(n) ? n : fallback;
      };

      let attrs: any = {};

      if (skuType === 'hotel') {
        const firstRoom = (raw.room_types || [])[0] || {};
        attrs = {
          hotel_name: raw.hotel_name || sku.name || 'Hotel',
          room_type_name: raw.room_type_name || firstRoom.room_type_name || (cat as any).roomType || 'Standard Room',
          address: raw.address || sku.location || 'Address',
          daily_cost_price: raw.daily_cost_price ?? raw.cost_price ?? firstRoom?.pricing?.[0]?.daily_price ?? toNumber(sku.price),
          daily_sell_price: raw.daily_sell_price ?? raw.sell_price ?? firstRoom?.pricing?.[0]?.daily_price ?? toNumber(sku.salesPrice || sku.price),
          include_breakfast: firstRoom.include_breakfast ?? String((cat as any).breakfast || '').includes('早'),
          bed_type: firstRoom.bed_type || (cat as any).bedType || 'Double Bed',
          room_area: firstRoom.room_area || ((cat as any).roomArea ? parseInt((cat as any).roomArea) : undefined),
          currency: raw.currency || 'CNY'
        };
      } else if (skuType === 'car') {
        attrs = {
          car_type: raw.car_type || (cat as any).vehicleType || 'Standard',
          seats: parseInt(raw.seats || (cat as any).capacity) || 4,
          service_mode: raw.service_mode || 'hourly',
          service_hours: raw.service_hours || 8,
          driver_language: raw.driver_language || (Array.isArray((cat as any).language) ? (cat as any).language : ['Chinese']),
          pickup_location: raw.pickup_location || raw.meeting_point || '',
          dropoff_location: raw.dropoff_location || '',
          cost_price: raw.cost_price ?? toNumber(sku.price),
          sell_price: raw.sell_price ?? toNumber(sku.salesPrice || sku.price)
        };
      } else if (skuType === 'activity') {
        attrs = {
          activity_name: raw.activity_name || sku.name || 'Activity',
          category: raw.category,
          duration_hours: raw.duration_hours ?? toNumber((cat as any).duration?.replace(/[^\\d.]/g, ''), undefined),
          language_service: raw.language_service || (Array.isArray((cat as any).language) ? (cat as any).language : ['Chinese']),
          difficulty_level: raw.difficulty_level,
          meeting_point: raw.meeting_point || (cat as any).meetingPoint,
          start_time_slots: raw.start_time_slots,
          min_pax: raw.min_pax,
          max_pax: raw.max_pax,
          cost_price: raw.cost_price ?? toNumber(sku.price),
          sell_price: raw.sell_price ?? toNumber(sku.salesPrice || sku.price)
        };
      } else if (skuType === 'itinerary') {
        const durationStr = (cat as any).duration || '';
        attrs = {
          itinerary_name: raw.itinerary_name || sku.name || 'Itinerary',
          days: parseInt(raw.days || durationStr.replace(/[^\\d]/g, '')) || 1,
          nights: raw.nights,
          depart_city: raw.depart_city || sku.location.split(/[,，]/)[0]?.trim() || 'City',
          arrive_city: raw.arrive_city || sku.location.split(/[,，]/)[1]?.trim(),
          itinerary_type: raw.itinerary_type,
          departure_dates: raw.departure_dates,
          min_pax: raw.min_pax,
          max_pax: raw.max_pax,
          adult_price: raw.adult_price ?? toNumber(sku.price),
          child_price: raw.child_price ?? toNumber(sku.price) * 0.8,
          single_supplement: raw.single_supplement,
          day_by_day: raw.day_by_day,
          highlight: raw.highlight || (sku.highlights || []).join('\\n')
        };
      } else if (skuType === 'guide') {
        attrs = {
          guide_name: raw.guide_name || sku.name || 'Guide',
          gender: raw.gender,
          languages: raw.languages || (Array.isArray((cat as any).language) ? (cat as any).language : ['Chinese']),
          grade: raw.grade,
          expertise_tags: raw.expertise_tags || sku.tags,
          service_city: raw.service_city || sku.location,
          daily_cost_price: raw.daily_cost_price ?? toNumber(sku.price),
          daily_sell_price: raw.daily_sell_price ?? toNumber(sku.salesPrice || sku.price),
          contact_phone: raw.contact_phone,
          wechat_id: raw.wechat_id
        };
      } else if (skuType === 'restaurant') {
        const mealType = raw.meal_type || (Array.isArray(raw.meal_types) ? raw.meal_types[0] : undefined) || 'set_menu';
        attrs = {
          restaurant_name: raw.restaurant_name || sku.name || 'Restaurant',
          cuisine_type: raw.cuisine_type,
          meal_type: mealType,
          location: raw.location || sku.location,
          per_person_price: raw.per_person_price ?? toNumber(sku.salesPrice || sku.price),
          min_pax: raw.min_pax,
          max_pax: raw.max_pax,
          set_menu_desc: raw.set_menu_desc || sku.description,
          booking_time_slots: raw.booking_time_slots
        };
      } else if (skuType === 'ticket') {
        attrs = {
          attraction_name: raw.attraction_name || sku.name || 'Ticket',
          ticket_type: raw.ticket_type || 'general',
          entry_method: raw.entry_method || 'electronic',
          valid_type: raw.valid_type,
          valid_days: raw.valid_days,
          visit_time_range: raw.visit_time_range,
          need_real_name: raw.need_real_name,
          real_name_fields: raw.real_name_fields,
          cost_price: raw.cost_price ?? toNumber(sku.price),
          sell_price: raw.sell_price ?? toNumber(sku.salesPrice || sku.price)
        };
      } else if (skuType === 'activity') {
        attrs = {
          activity_name: raw.activity_name || sku.name || 'Activity',
          category: raw.category,
          duration_hours: raw.duration_hours ? toNumber(raw.duration_hours) : undefined,
          duration_days: raw.duration_days,
          duration_nights: raw.duration_nights,
          language_service: raw.language_service || (Array.isArray((cat as any).language) ? (cat as any).language : undefined),
          difficulty_level: raw.difficulty_level,
          meeting_point: raw.meeting_point,
          route_stops: raw.route_stops,
          start_time_slots: raw.start_time_slots,
          min_pax: raw.min_pax,
          max_pax: raw.max_pax,
          experience_themes: raw.experience_themes || sku.tags,
          service_guarantees: raw.service_guarantees,
          cost_price: raw.cost_price ?? toNumber(sku.price),
          sell_price: raw.sell_price ?? toNumber(sku.salesPrice || sku.price)
        };
      } else {
        // Generic attrs for other types
        attrs = cat || {};
      }
      
      const payload = {
        sku_name: sku.name,
        sku_type: skuType,
        owner_type: sku.isPrivate ? 'private' : 'public',
        supplier_name: sku.provider,
        destination_country: sku.location.split(/[,，]/)[0]?.trim() || raw.destination_country || '',
        destination_city: sku.location.split(/[,，]/)[1]?.trim() || raw.destination_city || '',
        tags: sku.tags || raw.tags || [],
        description: sku.description || raw.description,
        highlights: sku.highlights || raw.highlights,
        inclusions: sku.inclusions || raw.inclusions,
        exclusions: sku.exclusions || raw.exclusions,
        cancellation_policy: sku.cancellationPolicy || raw.cancellation_policy,
        attrs: attrs
      };
      
      console.log('Creating SKU with payload:', JSON.stringify(payload, null, 2));
      
      const savedSku = await skuAPI.create(payload) as any;
      
      console.log('SKU created successfully:', savedSku);
      
      // Clear customSkus since the SKU is now in the backend
      // The ProductLibrary will fetch it from the backend on next load
      setCustomSkus([]);
      localStorage.removeItem('travel_sku_custom_list');
      
      // 保存后跳转到产品库查看
      setActiveTab('ProductLibrary');
    } catch (error) {
      console.error('Failed to save SKU:', error);
      alert('保存产品失败，请重试');
    }
  };

  const handleAddToQuotation = (sku: SKU) => {
    setQuotationItems((prev) => [...prev, { ...sku, id: `${sku.id}-${Date.now()}` }]);
  };

  const handleRemoveFromQuotation = (id: string) => {
    setQuotationItems((prev) => prev.filter(item => item.id !== id));
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'SmartImport':
        return <SmartImport onSaveSKU={handleSaveSKU} />;
      case 'ProductLibrary':
        return <ProductLibrary onAddToQuotation={handleAddToQuotation} onNavigateToImport={() => setActiveTab('SmartImport')} customSkus={customSkus} />;
      case 'Quotation':
        return (
          <QuotationView 
            items={quotationItems} 
            onRemove={handleRemoveFromQuotation}
            onBackToLibrary={() => setActiveTab('ProductLibrary')}
          />
        );
      case 'Vendor':
        return <VendorView />;
      default:
        return <ProductLibrary onAddToQuotation={handleAddToQuotation} onNavigateToImport={() => setActiveTab('SmartImport')} customSkus={customSkus} />;
    }
  };

  // 未登录时显示登录页，避免继续请求受保护接口
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-600">
        加载中...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} currentUser={user} />
      
      <main className="flex-1 ml-64 min-h-screen transition-all">
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-20 flex items-center justify-between px-8">
          <div className="flex items-center text-sm text-slate-500">
            <span>工作台</span>
            <span className="mx-2">/</span>
            <span className="font-semibold text-slate-900">
              {activeTab === 'ProductLibrary' && '产品库'}
              {activeTab === 'SmartImport' && '智能导入'}
              {activeTab === 'Quotation' && '报价单生成'}
              {activeTab === 'Vendor' && '供应商管理'}
            </span>
          </div>
          
          <div className="flex items-center space-x-6">
            <button 
              onClick={() => setActiveTab('Quotation')}
              className={`relative p-2 rounded-xl transition-all flex items-center gap-2 ${
                activeTab === 'Quotation' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              <span className="hidden md:block text-sm font-medium">待发报价</span>
              {quotationItems.length > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 bg-blue-600 text-white text-[10px] font-bold rounded-full border-2 border-white flex items-center justify-center">
                  {quotationItems.length}
                </span>
              )}
            </button>

            <button className="relative text-slate-400 hover:text-slate-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
              <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <div className="h-6 w-px bg-slate-200"></div>
            <div className="flex items-center space-x-3">
              <span className="text-sm font-medium text-slate-700">
                {isLoading ? '加载中...' : (user as any)?.agency_name || user?.agency_id || '未设置旅行社'}
              </span>
              <img src="https://picsum.photos/seed/user/100/100" className="w-8 h-8 rounded-lg shadow-sm" alt="Agency" />
            </div>
          </div>
        </header>

        <div className="animate-in fade-in duration-500">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default App;


