import React from 'react';

interface PricingDisplayProps {
  roomTypes?: any[];
  diningOptions?: any[];
  conferenceRooms?: any[];
  seasonDefinitions?: any;
  specialPackages?: any[];
  contactInfo?: any;
}

const PricingDisplay: React.FC<PricingDisplayProps> = ({
  roomTypes = [],
  diningOptions = [],
  conferenceRooms = [],
  seasonDefinitions,
  specialPackages = [],
  contactInfo
}) => {
  return (
    <div className="space-y-6">
      {/* 季节定义 */}
      {seasonDefinitions && (
        <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
          <h3 className="text-sm font-black text-blue-900 mb-3 uppercase tracking-wider">季节定义</h3>
          <div className="grid grid-cols-3 gap-3 text-xs">
            {Object.entries(seasonDefinitions).map(([season, dates]) => (
              <div key={season} className="bg-white p-3 rounded-xl">
                <div className="font-black text-blue-600 mb-1">{season}</div>
                <div className="text-slate-600">{dates as string}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 房型价格表 */}
      {roomTypes.length > 0 && (
        <div className="bg-white p-6 rounded-3xl border border-slate-100">
          <h3 className="text-lg font-black text-slate-900 mb-4 flex items-center gap-2">
            <span className="text-2xl">🏨</span>
            房型价格表
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b-2 border-slate-200">
                  <th className="text-left py-3 px-2 font-black text-slate-700">楼栋</th>
                  <th className="text-left py-3 px-2 font-black text-slate-700">房型</th>
                  <th className="text-center py-3 px-2 font-black text-slate-700">含早</th>
                  <th className="text-right py-3 px-2 font-black text-emerald-600">旺季</th>
                  <th className="text-right py-3 px-2 font-black text-blue-600">平季</th>
                  <th className="text-right py-3 px-2 font-black text-slate-600">淡季</th>
                </tr>
              </thead>
              <tbody>
                {roomTypes.map((room, idx) => (
                  <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-2 font-bold text-slate-600">{room.building || '-'}</td>
                    <td className="py-3 px-2 font-bold text-slate-900">{room.room_type_name}</td>
                    <td className="py-3 px-2 text-center">
                      {room.include_breakfast ? (
                        <span className="text-emerald-600 font-black">✓</span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    {room.pricing && room.pricing.length > 0 ? (
                      <>
                        {['旺季', '平季', '淡季'].map(season => {
                          const price = room.pricing.find((p: any) => 
                            p.season?.includes(season) || 
                            (season === '旺季' && p.season?.includes('peak')) ||
                            (season === '平季' && p.season?.includes('regular')) ||
                            (season === '淡季' && p.season?.includes('low'))
                          );
                          return (
                            <td key={season} className="py-3 px-2 text-right font-black text-slate-900">
                              {price ? `¥${price.daily_price}` : '-'}
                            </td>
                          );
                        })}
                      </>
                    ) : (
                      <td colSpan={3} className="py-3 px-2 text-center text-slate-400">暂无价格</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 餐饮价格表 */}
      {diningOptions.length > 0 && (
        <div className="bg-white p-6 rounded-3xl border border-slate-100">
          <h3 className="text-lg font-black text-slate-900 mb-4 flex items-center gap-2">
            <span className="text-2xl">🍽️</span>
            餐饮价格表
          </h3>
          <div className="space-y-4">
            {diningOptions.map((dining, idx) => (
              <div key={idx} className="border border-slate-100 rounded-2xl p-4">
                <div className="font-black text-slate-900 mb-3 text-sm">{dining.meal_type}</div>
                {dining.pricing && dining.pricing.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {dining.pricing.map((price: any, pIdx: number) => (
                      <div key={pIdx} className="bg-slate-50 p-3 rounded-xl">
                        <div className="text-xs text-slate-600 mb-1">{price.group_size}</div>
                        <div className="text-lg font-black text-emerald-600">¥{price.price_per_person}</div>
                        <div className="text-xs text-slate-500">每人</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-slate-400 text-xs">暂无价格信息</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 特殊套餐 */}
      {specialPackages.length > 0 && (
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-6 rounded-3xl border border-amber-200">
          <h3 className="text-lg font-black text-amber-900 mb-4 flex items-center gap-2">
            <span className="text-2xl">⭐</span>
            特色套餐
          </h3>
          <div className="space-y-3">
            {specialPackages.map((pkg, idx) => (
              <div key={idx} className="bg-white p-4 rounded-2xl border border-amber-100">
                <div className="font-black text-slate-900 mb-2">{pkg.name}</div>
                {pkg.description && (
                  <div className="text-xs text-slate-600 mb-3">{pkg.description}</div>
                )}
                {pkg.pricing && pkg.pricing.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {pkg.pricing.map((price: any, pIdx: number) => (
                      <div key={pIdx} className="bg-amber-50 px-3 py-2 rounded-lg">
                        <span className="text-xs text-slate-600">{price.option}: </span>
                        <span className="text-sm font-black text-amber-700">¥{price.price}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 会议室价格表 */}
      {conferenceRooms.length > 0 && (
        <div className="bg-white p-6 rounded-3xl border border-slate-100">
          <h3 className="text-lg font-black text-slate-900 mb-4 flex items-center gap-2">
            <span className="text-2xl">🎯</span>
            会议室价格表
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {conferenceRooms.map((room, idx) => (
              <div key={idx} className="border border-slate-200 rounded-2xl p-4 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-black text-slate-900 text-sm">{room.room_name}</div>
                    <div className="text-xs text-slate-500 mt-1">
                      {room.area_sqm && `${room.area_sqm}m² · `}
                      {room.function}
                    </div>
                  </div>
                  {room.capacity && (
                    <div className="bg-blue-50 px-2 py-1 rounded-lg text-xs font-bold text-blue-600">
                      {room.capacity}
                    </div>
                  )}
                </div>
                {room.pricing && room.pricing.length > 0 && (
                  <div className="flex gap-2">
                    {room.pricing.map((price: any, pIdx: number) => (
                      <div key={pIdx} className="flex-1 bg-slate-50 p-3 rounded-xl">
                        <div className="text-xs text-slate-600 mb-1">{price.duration}</div>
                        <div className="text-lg font-black text-blue-600">¥{price.price}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 联系方式 */}
      {contactInfo && (
        <div className="bg-slate-900 p-6 rounded-3xl text-white">
          <h3 className="text-sm font-black mb-4 uppercase tracking-wider text-slate-400">联系方式</h3>
          <div className="grid grid-cols-2 gap-4 text-xs">
            {contactInfo.phone && (
              <div>
                <div className="text-slate-400 mb-1">电话</div>
                <div className="font-bold">{contactInfo.phone}</div>
              </div>
            )}
            {contactInfo.fax && (
              <div>
                <div className="text-slate-400 mb-1">传真</div>
                <div className="font-bold">{contactInfo.fax}</div>
              </div>
            )}
            {contactInfo.email && (
              <div>
                <div className="text-slate-400 mb-1">邮箱</div>
                <div className="font-bold">{contactInfo.email}</div>
              </div>
            )}
            {contactInfo.website && (
              <div>
                <div className="text-slate-400 mb-1">网址</div>
                <div className="font-bold">{contactInfo.website}</div>
              </div>
            )}
            {contactInfo.address && (
              <div className="col-span-2">
                <div className="text-slate-400 mb-1">地址</div>
                <div className="font-bold">{contactInfo.address}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PricingDisplay;
