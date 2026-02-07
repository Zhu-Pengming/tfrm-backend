import React, { useState } from 'react';
import { SKU } from '../../types';

interface HotelDetailModalProps {
  sku: SKU;
  onClose: () => void;
  onAdd?: (sku: SKU) => void;
}

const HotelDetailModal: React.FC<HotelDetailModalProps> = ({ sku, onClose, onAdd }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'rooms' | 'dining' | 'conference'>('overview');
  
  const hotelAttrs = sku.rawAttrs || {};
  const roomTypes = hotelAttrs.room_types || [];
  const diningOptions = hotelAttrs.dining_options || [];
  const conferenceRooms = hotelAttrs.conference_rooms || [];
  const facilities = hotelAttrs.facilities || [];
  const contactInfo = hotelAttrs.contact_info || {};
  const seasonDefinitions = hotelAttrs.season_definitions || {};

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 flex items-start justify-between">
          <div>
            <h2 className="text-3xl font-black mb-2">{sku.name}</h2>
            <p className="text-blue-100 text-sm">{hotelAttrs.address}</p>
            {hotelAttrs.star_rating && (
              <p className="text-blue-100 text-sm mt-1">⭐ {hotelAttrs.star_rating}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-200 bg-slate-50 px-6 flex gap-4">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-4 px-2 font-bold text-sm border-b-2 transition-colors ${
              activeTab === 'overview'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            概览
          </button>
          {roomTypes.length > 0 && (
            <button
              onClick={() => setActiveTab('rooms')}
              className={`py-4 px-2 font-bold text-sm border-b-2 transition-colors ${
                activeTab === 'rooms'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              房间类型 ({roomTypes.length})
            </button>
          )}
          {diningOptions.length > 0 && (
            <button
              onClick={() => setActiveTab('dining')}
              className={`py-4 px-2 font-bold text-sm border-b-2 transition-colors ${
                activeTab === 'dining'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              餐饮 ({diningOptions.length})
            </button>
          )}
          {conferenceRooms.length > 0 && (
            <button
              onClick={() => setActiveTab('conference')}
              className={`py-4 px-2 font-bold text-sm border-b-2 transition-colors ${
                activeTab === 'conference'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              会议室 ({conferenceRooms.length})
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {hotelAttrs.description && (
                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">酒店介绍</h3>
                  <p className="text-slate-600 leading-relaxed">{hotelAttrs.description}</p>
                </div>
              )}

              {facilities.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-3">设施服务</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {facilities.map((facility, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
                        <span className="text-blue-600">✓</span>
                        <span className="text-slate-700">{facility}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {Object.keys(contactInfo).length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-3">联系信息</h3>
                  <div className="space-y-2">
                    {contactInfo.phone && (
                      <p className="text-slate-600">
                        <span className="font-semibold">电话：</span>{contactInfo.phone}
                      </p>
                    )}
                    {contactInfo.email && (
                      <p className="text-slate-600">
                        <span className="font-semibold">邮箱：</span>{contactInfo.email}
                      </p>
                    )}
                    {contactInfo.website && (
                      <p className="text-slate-600">
                        <span className="font-semibold">网站：</span>
                        <a href={contactInfo.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          {contactInfo.website}
                        </a>
                      </p>
                    )}
                    {contactInfo.wechat && (
                      <p className="text-slate-600">
                        <span className="font-semibold">微信：</span>{contactInfo.wechat}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {Object.keys(seasonDefinitions).length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-3">季节定义</h3>
                  <div className="space-y-2">
                    {seasonDefinitions.peak && (
                      <p className="text-slate-600">
                        <span className="font-semibold text-red-600">旺季：</span>{seasonDefinitions.peak}
                      </p>
                    )}
                    {seasonDefinitions.regular && (
                      <p className="text-slate-600">
                        <span className="font-semibold text-yellow-600">平季：</span>{seasonDefinitions.regular}
                      </p>
                    )}
                    {seasonDefinitions.low && (
                      <p className="text-slate-600">
                        <span className="font-semibold text-blue-600">淡季：</span>{seasonDefinitions.low}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {hotelAttrs.booking_notes && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h3 className="text-sm font-bold text-amber-900 mb-2">预订说明</h3>
                  <p className="text-sm text-amber-800">{hotelAttrs.booking_notes}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'rooms' && (
            <div className="space-y-4">
              {roomTypes.map((room, idx) => (
                <div key={idx} className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="text-lg font-bold text-slate-900">{room.room_type_name}</h4>
                      {room.building && (
                        <p className="text-sm text-slate-500">{room.building}</p>
                      )}
                    </div>
                    {room.include_breakfast && (
                      <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                        含早餐
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {room.pricing.map((price, pidx) => (
                      <div key={pidx} className="bg-slate-50 rounded-lg p-3">
                        <p className="text-xs text-slate-500 font-semibold mb-1">{price.season}</p>
                        <p className="text-xl font-black text-blue-600">¥{price.daily_price}</p>
                        <p className="text-xs text-slate-400">{price.currency}/晚</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'dining' && (
            <div className="space-y-4">
              {diningOptions.map((dining, idx) => (
                <div key={idx} className="border border-slate-200 rounded-lg p-4">
                  <h4 className="text-lg font-bold text-slate-900 mb-3">{dining.meal_type}</h4>
                  <div className="space-y-2">
                    {dining.pricing.map((price, pidx) => (
                      <div key={pidx} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                        <span className="text-slate-700">{price.group_size}</span>
                        <div className="text-right">
                          <p className="font-bold text-blue-600">¥{price.price_per_person}</p>
                          {price.notes && (
                            <p className="text-xs text-slate-500">{price.notes}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'conference' && (
            <div className="space-y-4">
              {conferenceRooms.map((room, idx) => (
                <div key={idx} className="border border-slate-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="text-lg font-bold text-slate-900">{room.room_name}</h4>
                      <div className="flex gap-4 mt-1">
                        {room.area_sqm && (
                          <p className="text-sm text-slate-500">面积: {room.area_sqm}㎡</p>
                        )}
                        {room.capacity && (
                          <p className="text-sm text-slate-500">容纳: {room.capacity}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  {room.function && (
                    <p className="text-sm text-slate-600 mb-3">用途: {room.function}</p>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    {room.pricing.map((price, pidx) => (
                      <div key={pidx} className="bg-slate-50 rounded-lg p-3">
                        <p className="text-xs text-slate-500 font-semibold mb-1">{price.duration}</p>
                        <p className="text-xl font-black text-blue-600">¥{price.price}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 p-6 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            关闭
          </button>
          {onAdd && (
            <button
              onClick={() => onAdd(sku)}
              className="px-6 py-2 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              添加到报价单
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default HotelDetailModal;
