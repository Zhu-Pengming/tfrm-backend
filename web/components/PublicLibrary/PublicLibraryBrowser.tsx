import React, { useState, useEffect } from 'react';
import { SKU, Category } from '../../types';

interface PublicLibraryBrowserProps {
  onApplyCooperation: (agencyId: string, skuId: string) => void;
}

export const PublicLibraryBrowser: React.FC<PublicLibraryBrowserProps> = ({ onApplyCooperation }) => {
  const [publicSkus, setPublicSkus] = useState<SKU[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSku, setSelectedSku] = useState<SKU | null>(null);
  const [filters, setFilters] = useState({
    city: '',
    category: '' as Category | '',
    tags: '',
    keyword: ''
  });

  const categories: Category[] = ['Hotel', 'Transport', 'Route', 'Guide', 'Catering', 'Ticket', 'Activity'];
  
  const categoryLabels: Record<Category, string> = {
    Hotel: '酒店',
    Transport: '用车',
    Ticket: '门票',
    Guide: '导游',
    Catering: '餐饮',
    Activity: '活动',
    Route: '线路'
  };

  useEffect(() => {
    loadPublicSkus();
  }, [filters]);

  const loadPublicSkus = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.city) params.append('city', filters.city);
      if (filters.category) params.append('category', filters.category);
      if (filters.tags) params.append('tags', filters.tags);
      if (filters.keyword) params.append('keyword', filters.keyword);

      const response = await fetch(`http://localhost:8000/public-skus?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      const data = await response.json();

      const BACKEND_TO_FRONTEND: Record<string, Category> = {
        hotel: 'Hotel',
        transport: 'Transport',
        route: 'Route',
        guide: 'Guide',
        dining: 'Catering',
        restaurant: 'Catering',
        ticket: 'Ticket',
        activity: 'Activity'
      };

      const mapped: SKU[] = (data || []).map((sku: any) => {
        const category = sku.category
          ? BACKEND_TO_FRONTEND[sku.category] || BACKEND_TO_FRONTEND[String(sku.category).toLowerCase()] || 'Activity'
          : sku.sku_type
          ? BACKEND_TO_FRONTEND[String(sku.sku_type).toLowerCase()] || 'Activity'
          : 'Activity';

        const media = sku.media || sku.attrs?.media || [];
        const image =
          media.find((m: any) => m.url || m.path)?.url ||
          media.find((m: any) => m.path)?.path ||
          'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&q=80&w=800';

        const attrs = sku.attrs || {};
        const highlightsFallback = sku.highlights || attrs.experience_themes || attrs.service_guarantees || [];
        const inclusionsFallback = sku.inclusions || attrs.include_items || [];
        const exclusionsFallback = sku.exclusions || attrs.exclude_items || [];
        const cancellationFallback = sku.cancellation_policy || sku.cancel_policy || attrs.cancel_policy || '供应商未提供';

        return {
          id: sku.id,
          name: sku.sku_name || sku.name,
          category,
          backendType: sku.sku_type,
          price: Number(sku.base_cost_price) || 0,
          salesPrice: Number(sku.base_sale_price) || Number(sku.base_cost_price) || 0,
          baseSalePrice: sku.base_sale_price ? Number(sku.base_sale_price) : undefined,
          baseCostPrice: sku.base_cost_price ? Number(sku.base_cost_price) : undefined,
          provider: sku.supplier_name || '未知',
          location: `${sku.destination_city || ''}${sku.destination_country ? ', ' + sku.destination_country : ''}`.trim() || '未指定地点',
          image,
          rating: 4.5,
          isPrivate: false,
          isPublic: true,
          publicStatus: sku.public_status || 'published',
          sourceOrgId: sku.source_org_id,
          sourceSkuId: sku.source_sku_id,
          tags: sku.tags || sku.tags_interest || [],
          tagsInterest: sku.tags_interest,
          tagsService: sku.tags_service,
          description: sku.description || attrs.description || '',
          highlights: highlightsFallback,
          inclusions: inclusionsFallback,
          exclusions: exclusionsFallback,
          cancellationPolicy: cancellationFallback,
          categoryAttributes: sku.attributes || attrs || {},
          rawAttrs: attrs
        } as SKU;
      });

      setPublicSkus(mapped);
    } catch (error) {
      console.error('Failed to load public SKUs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyCooperation = async (sku: SKU) => {
    if (!sku.sourceOrgId) {
      alert('无法获取供应商信息');
      return;
    }
    
    const message = prompt('请输入合作申请说明（可选）');
    if (message === null) return; // 取消

    try {
      const response = await fetch('http://localhost:8000/cooperations', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to_agency_id: sku.sourceOrgId,
          request_message: message || `申请合作使用 SKU: ${sku.name}`
        })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || '申请失败');
      }
      alert('合作申请已发送');
    } catch (error: any) {
      alert(error.message || '申请失败，请重试');
    }
  };

  const handleCopyToPrivate = async (skuId: string) => {
    if (!confirm('确认将此 SKU 复制到私有库？复制后会从公共库下架。')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:8000/public-skus/${skuId}/copy`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || '复制失败');
      }
      alert('已复制到私有库');
      loadPublicSkus();
    } catch (error: any) {
      alert(error.message || '复制失败，请确认已建立合作关系');
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">公共库浏览</h2>
        <p className="text-gray-600 mb-4">
          浏览其他机构发布的资源，申请合作后可复制到私有库使用
        </p>

        {/* 筛选条件 */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                城市
              </label>
              <input
                type="text"
                value={filters.city}
                onChange={(e) => setFilters({ ...filters, city: e.target.value })}
                placeholder="如：清迈"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                品类
              </label>
              <select
                value={filters.category}
                onChange={(e) => setFilters({ ...filters, category: e.target.value as Category | '' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              >
                <option value="">全部品类</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{categoryLabels[cat]}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                兴趣标签
              </label>
              <input
                type="text"
                value={filters.tags}
                onChange={(e) => setFilters({ ...filters, tags: e.target.value })}
                placeholder="如：美食,亲子"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                关键词
              </label>
              <input
                type="text"
                value={filters.keyword}
                onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
                placeholder="搜索名称"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* SKU 列表 */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      ) : publicSkus.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-md">
          <p className="text-gray-500 text-lg">暂无公共库资源</p>
          <p className="text-gray-400 text-sm mt-2">调整筛选条件或稍后再试</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {publicSkus.map((sku) => (
              <div
                key={sku.id}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow cursor-pointer"
                onClick={() => setSelectedSku(sku)}
              >
                {sku.image && (
                  <img
                    src={sku.image}
                    alt={sku.name}
                    className="w-full h-48 object-cover"
                  />
                )}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-800 flex-1">
                      {sku.name}
                    </h3>
                    <span className="ml-2 px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded">
                      {categoryLabels[sku.category as Category] || sku.category}
                    </span>
                  </div>

                  <div className="text-sm text-gray-600 mb-2">
                    <p>📍 {sku.location || '未指定地点'}</p>
                    <p>🏢 供应商: {sku.provider || '未知'}</p>
                  </div>

                  {sku.tagsInterest && sku.tagsInterest.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {sku.tagsInterest.slice(0, 3).map((tag, idx) => (
                        <span key={idx} className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mb-3">
                    <p className="text-sm text-gray-500">销售价</p>
                    <p className="text-2xl font-bold text-purple-600">
                      ¥{sku.baseSalePrice || sku.salesPrice || 0}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleApplyCooperation(sku); }}
                      className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                    >
                      申请合作
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleCopyToPrivate(sku.id); }}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                    >
                      复制到私有库
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {selectedSku && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-2 h-full">
                  <div className="h-64 md:h-full bg-slate-50">
                    <img
                      src={selectedSku.image}
                      alt={selectedSku.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex flex-col h-full overflow-y-auto p-6 space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-1">Public SKU</p>
                        <h3 className="text-2xl font-black text-slate-900">{selectedSku.name}</h3>
                        <p className="text-sm text-slate-500 mt-1">
                          {selectedSku.location || '未指定地点'} · {selectedSku.provider || '未知供应商'}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-bold inline-block">
                          {categoryLabels[selectedSku.category as Category] || selectedSku.category}
                        </div>
                        <p className="mt-3 text-3xl font-black text-purple-600">¥{selectedSku.baseSalePrice || selectedSku.salesPrice || 0}</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-bold text-slate-500 mb-1">亮点</p>
                      {selectedSku.highlights && selectedSku.highlights.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {selectedSku.highlights.slice(0, 8).map((h, idx) => (
                            <span key={idx} className="px-2 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs">{h}</span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-400">暂无亮点</p>
                      )}
                    </div>

                    <div>
                      <p className="text-xs font-bold text-slate-500 mb-1">描述</p>
                      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                        {selectedSku.description || '暂无描述'}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/40">
                        <p className="text-xs font-bold text-emerald-600 mb-1">费用包含</p>
                        {selectedSku.inclusions && selectedSku.inclusions.length > 0 ? (
                          <ul className="text-sm text-slate-700 list-disc list-inside space-y-1">
                            {selectedSku.inclusions.slice(0, 8).map((i, idx) => <li key={idx}>{i}</li>)}
                          </ul>
                        ) : (
                          <p className="text-sm text-slate-400">暂无信息</p>
                        )}
                      </div>
                      <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/40">
                        <p className="text-xs font-bold text-amber-600 mb-1">费用不含</p>
                        {selectedSku.exclusions && selectedSku.exclusions.length > 0 ? (
                          <ul className="text-sm text-slate-700 list-disc list-inside space-y-1">
                            {selectedSku.exclusions.slice(0, 8).map((i, idx) => <li key={idx}>{i}</li>)}
                          </ul>
                        ) : (
                          <p className="text-sm text-slate-400">暂无信息</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-bold text-slate-500 mb-1">取消政策</p>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">
                        {selectedSku.cancellationPolicy || '供应商未提供'}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {selectedSku.tags?.slice(0, 8).map((tag, idx) => (
                        <span key={idx} className="px-2 py-1 text-xs bg-slate-100 rounded-lg text-slate-700">#{tag}</span>
                      ))}
                      {(!selectedSku.tags || selectedSku.tags.length === 0) && (
                        <span className="text-sm text-slate-400">暂无标签</span>
                      )}
                    </div>

                    <div className="pt-2 flex gap-3">
                      <button
                        onClick={() => { setSelectedSku(null); handleApplyCooperation(selectedSku); }}
                        className="px-4 py-2 rounded-xl bg-purple-600 text-white font-semibold hover:bg-purple-700 transition-colors"
                      >
                        申请合作
                      </button>
                      <button
                        onClick={() => { setSelectedSku(null); handleCopyToPrivate(selectedSku.id); }}
                        className="px-4 py-2 rounded-xl bg-green-600 text-white font-semibold hover:bg-green-700 transition-colors"
                      >
                        复制到私有库
                      </button>
                      <button
                        onClick={() => setSelectedSku(null)}
                        className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-colors ml-auto"
                      >
                        关闭
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
