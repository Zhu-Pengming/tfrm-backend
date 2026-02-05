import React, { useState, useEffect } from 'react';
import { SKU } from '../../types';

interface ProductEditModalProps {
  sku: SKU;
  onSave: (updatedSku: SKU, updatePayload?: any) => void;
  onClose: () => void;
}

interface Vendor {
  id: string;
  name: string;
  contact: string;
  phone: string;
}

const ProductEditModal: React.FC<ProductEditModalProps> = ({ sku, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    name: sku.name,
    description: sku.description,
    location: sku.location,
    provider: sku.provider,
    price: sku.price,
    salesPrice: sku.salesPrice,
    tags: sku.tags?.join(', ') || '',
    highlights: sku.highlights?.join('\n') || '',
    inclusions: sku.inclusions?.join('\n') || '',
    exclusions: sku.exclusions?.join('\n') || '',
    cancellationPolicy: sku.cancellationPolicy || ''
  });

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [showVendorDropdown, setShowVendorDropdown] = useState(false);
  const [showAddVendor, setShowAddVendor] = useState(false);
  const [newVendor, setNewVendor] = useState({ name: '', contact: '', phone: '', email: '' });

  const handlePriceInput = (value: string, field: 'price' | 'salesPrice') => {
    const numValue = value.replace(/[^\d]/g, '');
    const cleanValue = numValue ? parseInt(numValue, 10) : 0;
    
    if (field === 'price') {
      setFormData({ ...formData, price: cleanValue });
      if (cleanValue > 0 && formData.salesPrice === 0) {
        const suggestedSalesPrice = Math.round(cleanValue * 1.3);
        setFormData(prev => ({ ...prev, price: cleanValue, salesPrice: suggestedSalesPrice }));
      }
    } else {
      setFormData({ ...formData, salesPrice: cleanValue });
    }
  };

  useEffect(() => {
    loadVendors();
  }, []);

  const loadVendors = async () => {
    try {
      const { vendorAPI } = await import('../../services/api');
      const data = await vendorAPI.list() as any;
      setVendors(data as Vendor[]);
    } catch (error) {
      console.error('Failed to load vendors:', error);
    }
  };

  const handleAddVendor = async () => {
    try {
      const { vendorAPI } = await import('../../services/api');
      const vendor = await vendorAPI.create({
        name: newVendor.name,
        contact: newVendor.contact,
        phone: newVendor.phone,
        email: newVendor.email,
        category: [],
        specialties: [],
        address: ''
      }) as any;
      const vendorData = vendor as Vendor;
      setVendors([...vendors, vendorData]);
      setFormData({ ...formData, provider: vendorData.name });
      setShowAddVendor(false);
      setNewVendor({ name: '', contact: '', phone: '', email: '' });
    } catch (error) {
      console.error('Failed to add vendor:', error);
      alert('添加供应商失败，请重试');
    }
  };

  const filteredVendors = vendors.filter(v => 
    v.name.toLowerCase().includes(formData.provider.toLowerCase())
  );

  const handleSubmit = (e?: React.FormEvent | React.MouseEvent) => {
    e?.preventDefault();
    
    console.log('=== ProductEditModal handleSubmit called ===');
    console.log('Form data:', formData);
    console.log('SKU:', sku);
    
    const updatedSku: SKU = {
      ...sku,
      name: formData.name,
      description: formData.description,
      location: formData.location,
      provider: formData.provider,
      price: Number(formData.price),
      salesPrice: Number(formData.salesPrice),
      tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
      highlights: formData.highlights.split('\n').filter(Boolean),
      inclusions: formData.inclusions.split('\n').filter(Boolean),
      exclusions: formData.exclusions.split('\n').filter(Boolean),
      cancellationPolicy: formData.cancellationPolicy
    };
    
    const costPrice = Number(formData.price);
    const sellPrice = Number(formData.salesPrice);
    
    const updatePayload: any = {
      sku_name: formData.name,
      description: formData.description,
      tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
      highlights: formData.highlights.split('\n').filter(Boolean),
      inclusions: formData.inclusions.split('\n').filter(Boolean),
      exclusions: formData.exclusions.split('\n').filter(Boolean),
      cancellation_policy: formData.cancellationPolicy,
      supplier_name: formData.provider
    };
    
    const skuType = sku.backendType;
    
    if (!skuType) {
      console.error('SKU backendType is missing:', sku);
      alert('错误：无法确定产品类型，请刷新页面重试');
      return;
    }
    
    console.log('SKU rawAttrs:', sku.rawAttrs);
    const newAttrs: any = { ...(sku.rawAttrs || {}) };
    console.log('newAttrs after spread:', newAttrs);
    
    if (skuType === 'hotel') {
      newAttrs.daily_cost_price = costPrice;
      newAttrs.daily_sell_price = sellPrice;
    } else if (skuType === 'guide') {
      newAttrs.daily_cost_price = costPrice;
      newAttrs.daily_sell_price = sellPrice;
    } else if (skuType === 'restaurant') {
      newAttrs.per_person_price = costPrice;
    } else if (skuType === 'itinerary') {
      newAttrs.adult_price = costPrice;
    } else {
      newAttrs.cost_price = costPrice;
      newAttrs.sell_price = sellPrice;
    }
    
    updatePayload.attrs = newAttrs;
    
    console.log('Update payload:', {
      skuType,
      costPrice,
      sellPrice,
      originalAttrs: sku.rawAttrs,
      updatedAttrs: newAttrs,
      fullPayload: updatePayload
    });
    
    onSave(updatedSku, updatePayload);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xl" onClick={onClose}></div>
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-[2rem] shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-8 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black text-slate-900">编辑产品</h2>
              <p className="text-sm text-slate-500 mt-1">修改产品信息和定价</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8">
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                  产品名称
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                  目的地
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 outline-none"
                />
              </div>
            </div>

            {/* Pricing */}
            <div className="grid grid-cols-3 gap-6">
              <div className="relative">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                  供应商
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.provider}
                    onChange={(e) => {
                      setFormData({ ...formData, provider: e.target.value });
                      setShowVendorDropdown(true);
                    }}
                    onFocus={() => setShowVendorDropdown(true)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 outline-none pr-10"
                    placeholder="输入或选择供应商"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAddVendor(true)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="添加新供应商"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>
                
                {showVendorDropdown && filteredVendors.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                    {filteredVendors.slice(0, 5).map((vendor) => (
                      <button
                        key={vendor.id}
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, provider: vendor.name });
                          setShowVendorDropdown(false);
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-slate-50 transition-colors"
                      >
                        <div className="font-bold text-sm text-slate-900">{vendor.name}</div>
                        <div className="text-xs text-slate-500">{vendor.contact} · {vendor.phone}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                  成本价 (¥)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formData.price || ''}
                  onChange={(e) => handlePriceInput(e.target.value, 'price')}
                  placeholder="输入成本价"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                  销售价 (¥)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formData.salesPrice || ''}
                  onChange={(e) => handlePriceInput(e.target.value, 'salesPrice')}
                  placeholder="输入销售价"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 outline-none"
                  required
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                产品描述
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 outline-none resize-none"
                rows={3}
              />
            </div>

            {/* Tags */}
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                标签 (用逗号分隔)
              </label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 outline-none"
                placeholder="例如: 豪华, 海景, 亲子"
              />
            </div>

            {/* Highlights */}
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                体验亮点 (每行一个)
              </label>
              <textarea
                value={formData.highlights}
                onChange={(e) => setFormData({ ...formData, highlights: e.target.value })}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 outline-none resize-none"
                rows={4}
                placeholder="每行输入一个亮点"
              />
            </div>

            {/* Inclusions & Exclusions */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-black text-emerald-600 uppercase tracking-widest mb-2">
                  费用包含 (每行一个)
                </label>
                <textarea
                  value={formData.inclusions}
                  onChange={(e) => setFormData({ ...formData, inclusions: e.target.value })}
                  className="w-full px-4 py-3 border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-100 outline-none resize-none"
                  rows={4}
                />
              </div>
              <div>
                <label className="block text-xs font-black text-rose-600 uppercase tracking-widest mb-2">
                  费用不含 (每行一个)
                </label>
                <textarea
                  value={formData.exclusions}
                  onChange={(e) => setFormData({ ...formData, exclusions: e.target.value })}
                  className="w-full px-4 py-3 border border-rose-200 rounded-xl focus:ring-2 focus:ring-rose-100 outline-none resize-none"
                  rows={4}
                />
              </div>
            </div>

            {/* Cancellation Policy */}
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                退改政策
              </label>
              <textarea
                value={formData.cancellationPolicy}
                onChange={(e) => setFormData({ ...formData, cancellationPolicy: e.target.value })}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 outline-none resize-none"
                rows={3}
              />
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="p-8 border-t border-slate-100 flex items-center justify-end gap-4">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            取消
          </button>
          <button
            onClick={(e) => {
              console.log('Button clicked!');
              alert('按钮被点击了！');
              handleSubmit(e);
            }}
            className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-100"
          >
            保存修改
          </button>
        </div>
      </div>

      {/* Quick Add Vendor Modal */}
      {showAddVendor && (
        <div className="absolute inset-0 z-10 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-black text-slate-900 mb-4">快速登记供应商</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">供应商名称 *</label>
                <input
                  type="text"
                  value={newVendor.name}
                  onChange={(e) => setNewVendor({ ...newVendor, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none"
                  placeholder="例如: 东京旅游集团"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">联系人 *</label>
                <input
                  type="text"
                  value={newVendor.contact}
                  onChange={(e) => setNewVendor({ ...newVendor, contact: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none"
                  placeholder="例如: 张三"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">电话 *</label>
                <input
                  type="tel"
                  value={newVendor.phone}
                  onChange={(e) => setNewVendor({ ...newVendor, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none"
                  placeholder="例如: 13800138000"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">邮箱 *</label>
                <input
                  type="email"
                  value={newVendor.email}
                  onChange={(e) => setNewVendor({ ...newVendor, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none"
                  placeholder="例如: contact@example.com"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowAddVendor(false)}
                className="flex-1 px-4 py-2 border border-slate-200 rounded-lg font-bold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleAddVendor}
                disabled={!newVendor.name || !newVendor.contact || !newVendor.phone || !newVendor.email}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                添加
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductEditModal;
