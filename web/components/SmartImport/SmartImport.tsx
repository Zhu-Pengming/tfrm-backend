
import React, { useState, useRef } from 'react';
import { SKU, Category } from '../../types';
import PricingDisplay from './PricingDisplay';

type ImportMode = 'text' | 'file' | 'camera';

interface SmartImportProps {
  onSaveSKU?: (sku: SKU) => void;
}

const backendToFrontendCategory: Record<string, Category> = {
  hotel: 'Hotel',
  car: 'Transport',
  ticket: 'Ticket',
  guide: 'Guide',
  restaurant: 'Catering',
  activity: 'Activity',
  itinerary: 'Route'
};

const SmartImport: React.FC<SmartImportProps> = ({ onSaveSKU }) => {
  const [mode, setMode] = useState<ImportMode>('file');
  const [isProcessing, setIsProcessing] = useState(false);
  const [inputText, setInputText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<any | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [errorDetail, setErrorDetail] = useState<{title: string, msg: string} | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);


  const startCamera = async () => {
    setShowCamera(true);
    setErrorDetail(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      setErrorDetail({ title: "访问失败", msg: "无法启动摄像头。" });
      setShowCamera(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      context?.drawImage(videoRef.current, 0, 0);
      const dataUrl = canvasRef.current.toDataURL('image/jpeg');
      setFilePreview(dataUrl);
      const stream = videoRef.current.srcObject as MediaStream;
      if (stream) stream.getTracks().forEach(track => track.stop());
      setShowCamera(false);
      const byteString = atob(dataUrl.split(',')[1]);
      const ia = new Uint8Array(byteString.length);
      for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
      setSelectedFile(new File([ia], "capture.jpg", { type: "image/jpeg" }));
      setMode('file');
    }
  };

  const processFile = (file: File) => {
    setErrorDetail(null);
    setSelectedFile(file);
    setIsSaved(false);
    setExtractedData(null);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => setFilePreview(reader.result as string);
      reader.readAsDataURL(file);
    } else if (file.type === 'application/pdf') {
      setFilePreview('PDF_FILE');
    } else {
      // docx / other office files
      setFilePreview('DOC_FILE');
    }
  };

  const runAIExtraction = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    setExtractedData(null);
    setErrorDetail(null);

    const toArray = (val: any) => Array.isArray(val) ? val : (val ? [val] : []);
    const normalizeTags = (tags: any) => {
      if (Array.isArray(tags)) return tags;
      if (typeof tags === 'string') return tags.split(/[;,]/).map(t => t.trim()).filter(Boolean);
      return [];
    };
    const num = (v: any) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : undefined;
    };

    const derivePrice = (type: string, ef: any) => {
      if (type === 'hotel') {
        const room = (ef.room_types || [])[0];
        const base = room?.pricing?.[0]?.daily_price ?? ef.daily_cost_price ?? ef.cost_price;
        const sell = room?.pricing?.[0]?.daily_price ?? ef.daily_sell_price ?? ef.sell_price ?? base;
        return { price: num(base) ?? 0, salesPrice: num(sell) ?? num(base) ?? 0 };
      }
      if (type === 'car') {
        return { price: num(ef.cost_price) ?? 0, salesPrice: num(ef.sell_price) ?? num(ef.cost_price) ?? 0 };
      }
      if (type === 'restaurant') {
        return { price: num(ef.per_person_price) ?? 0, salesPrice: num(ef.per_person_price) ?? 0 };
      }
      if (type === 'ticket') {
        return { price: num(ef.cost_price) ?? 0, salesPrice: num(ef.sell_price) ?? num(ef.cost_price) ?? 0 };
      }
      if (type === 'guide') {
        return { price: num(ef.daily_cost_price) ?? 0, salesPrice: num(ef.daily_sell_price) ?? num(ef.daily_cost_price) ?? 0 };
      }
      if (type === 'itinerary') {
        return { price: num(ef.adult_price) ?? 0, salesPrice: num(ef.adult_price) ?? 0 };
      }
      // activity & default
      return { price: num(ef.cost_price) ?? num(ef.daily_cost_price) ?? 0, salesPrice: num(ef.sell_price) ?? num(ef.cost_price) ?? 0 };
    };

    const formatPrice = (priceValue: any): string | undefined => {
      if (!priceValue) return undefined;
      
      // If it's already a number or string, use it directly
      if (typeof priceValue === 'number') return `¥${priceValue}`;
      if (typeof priceValue === 'string' && !isNaN(Number(priceValue))) return `¥${priceValue}`;
      
      // If it's an array, extract the first price value
      if (Array.isArray(priceValue) && priceValue.length > 0) {
        const firstItem = priceValue[0];
        if (typeof firstItem === 'number') return `¥${firstItem}`;
        if (typeof firstItem === 'object' && firstItem !== null) {
          // Try common price field names
          const price = firstItem.price || firstItem.daily_price || firstItem.adult_price || firstItem.cost_price;
          if (price !== undefined) return `¥${price}`;
        }
      }
      
      // If it's an object, try to extract price
      if (typeof priceValue === 'object' && priceValue !== null && !Array.isArray(priceValue)) {
        const price = priceValue.price || priceValue.daily_price || priceValue.adult_price || priceValue.cost_price;
        if (price !== undefined) return `¥${price}`;
      }
      
      return undefined;
    };

    const buildCategoryAttributes = (type: string, ef: any) => {
      if (type === 'hotel') {
        const room = (ef.room_types || [])[0] || {};
        return {
          bedType: room.bed_type,
          roomArea: room.room_area,
          breakfast: room.include_breakfast ? 'Breakfast included' : room.include_breakfast === false ? 'No breakfast' : undefined
        };
      }
      if (type === 'car') {
        return {
          vehicleType: ef.car_type,
          capacity: ef.seats,
          duration: ef.service_hours ? `${ef.service_hours}h` : undefined,
          language: ef.driver_language
        };
      }
      if (type === 'activity') {
        return {
          duration: ef.duration_hours ? `${ef.duration_hours}h` : (ef.days ? `${ef.days}天${ef.nights ? ef.nights + '晚' : ''}` : undefined),
          language: ef.language_service,
          meetingPoint: ef.meeting_point,
          depart_city: ef.depart_city,
          arrive_city: ef.arrive_city,
          groupSize: ef.min_pax && ef.max_pax ? `${ef.min_pax}-${ef.max_pax}人` : undefined,
          adult_price: formatPrice(ef.adult_price),
          child_price: formatPrice(ef.child_price)
        };
      }
      if (type === 'guide') {
        return {
          duration: ef.service_hours ? `${ef.service_hours}h` : undefined,
          language: ef.languages
        };
      }
      if (type === 'restaurant') {
        return {
          duration: ef.booking_time_slots && ef.booking_time_slots.length ? ef.booking_time_slots.join(' / ') : undefined
        };
      }
      if (type === 'itinerary') {
        return {
          duration: ef.days ? `${ef.days}天${ef.nights ? ef.nights + '晚' : ''}` : undefined,
          depart_city: ef.depart_city,
          arrive_city: ef.arrive_city,
          groupSize: ef.min_pax && ef.max_pax ? `${ef.min_pax}-${ef.max_pax}人` : undefined,
          itinerary_type: ef.itinerary_type,
          adult_price: formatPrice(ef.adult_price),
          child_price: formatPrice(ef.child_price)
        };
      }
      if (type === 'ticket') {
        return { duration: ef.valid_days ? `${ef.valid_days} days valid` : undefined };
      }
      return {};
    };

    try {
      const { importAPI } = await import('../../services/api');

      const result = await importAPI.extract(
        mode === 'text' ? inputText : undefined,
        mode === 'file' && selectedFile ? selectedFile : undefined
      ) as any;

      if (!result) throw new Error('No backend response');
      if (result.status === 'failed') throw new Error(result?.error_message || 'Extraction failed');
      if (result.status !== 'parsed') throw new Error(`Status error: ${result.status}`);

      const backendType = (result.sku_type || 'activity') as string;
      const category = backendToFrontendCategory[backendType] || 'Activity';
      const extracted = result.extracted_fields || {};
      const { price, salesPrice } = derivePrice(backendType, extracted);
      const categoryAttributes = buildCategoryAttributes(backendType, extracted);

      const location = [extracted.destination_country, extracted.destination_city].filter(Boolean).join(' ');
      const highlights = toArray(extracted.highlights);
      const inclusions = toArray(extracted.inclusions);
      const exclusions = toArray(extracted.exclusions);

      // Determine card background image
      let cardImage = 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&q=80&w=800';
      if (result.uploaded_file_url) {
        // Use the uploaded file URL from backend
        // If it's a relative path, prepend the current origin
        cardImage = result.uploaded_file_url.startsWith('http') 
          ? result.uploaded_file_url 
          : `${window.location.origin}${result.uploaded_file_url}`;
      } else if (selectedFile?.type?.startsWith('image/') && filePreview) {
        // Fallback to local preview for images
        cardImage = filePreview;
      }

      setExtractedData({
        id: `ai-${Date.now()}`,
        name: extracted.sku_name || extracted.hotel_name || extracted.activity_name || extracted.restaurant_name || extracted.itinerary_name || 'Unnamed SKU',
        category,
        backendType,
        price,
        salesPrice: salesPrice ?? price,
        provider: extracted.supplier_name || extracted.hotel_name || '',
        location: location || 'Destination not set',
        description: extracted.description || extracted.set_menu_desc || '',
        highlights: highlights.length ? highlights : toArray(extracted.facilities).slice(0, 3),
        inclusions,
        exclusions,
        cancellationPolicy: extracted.cancellation_policy || extracted.booking_notes || 'See supplier notes',
        categoryAttributes,
        image: cardImage,
        rating: 5.0,
        isPrivate: true,
        tags: normalizeTags(extracted.tags),
        rawExtracted: extracted,
        importTaskId: result.id
      });
    } catch (err: any) {
      console.error('AI Error:', err);
      setErrorDetail({ 
        title: '提取失败', 
        msg: err.message || '无法提取文档信息，请检查网络或稍后重试。'
      });
    } finally {
      setIsProcessing(false);
    }
  };  return (
    <div className="max-w-6xl mx-auto py-12 px-6">
      <div className="bg-white rounded-[3rem] p-10 shadow-2xl border border-slate-100 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-50 rounded-full opacity-50 blur-3xl pointer-events-none"></div>
        <div className="relative z-10">
          <header className="mb-10 text-center">
            <h2 className="text-3xl font-black text-slate-900 mb-2 tracking-tight flex items-center justify-center gap-3">
              <span className="px-2 py-0.5 bg-blue-600 text-white text-[10px] rounded uppercase font-black">Architecture Pro</span>
              GetYourGuide 架构提取
            </h2>
            <p className="text-slate-500 font-medium tracking-tight italic">—— 核心、体验、交付、行业参数分层建模 ——</p>
          </header>

          <div className="flex justify-center mb-8">
            <div className="bg-slate-100 p-1.5 rounded-2xl flex gap-1 border border-slate-200 shadow-inner">
              <button onClick={() => setMode('file')} className={`px-8 py-2.5 rounded-xl text-sm font-black transition-all ${mode==='file' && !showCamera ? 'bg-white shadow-lg text-blue-600' : 'text-slate-500'}`}>文档识别</button>
              <button onClick={() => setMode('text')} className={`px-8 py-2.5 rounded-xl text-sm font-black transition-all ${mode==='text' ? 'bg-white shadow-lg text-blue-600' : 'text-slate-500'}`}>文本解析</button>
              <button onClick={startCamera} className={`px-8 py-2.5 rounded-xl text-sm font-black transition-all ${showCamera ? 'bg-white shadow-lg text-blue-600' : 'text-slate-500'}`}>拍照提取</button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div className="space-y-6">
              <div className={`h-[520px] relative rounded-[2.5rem] border-4 border-dashed overflow-hidden bg-slate-50 group transition-all ${errorDetail ? 'border-rose-200' : 'border-slate-100 hover:border-blue-200'}`}>
                {showCamera ? (
                  <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                ) : filePreview ? (
                  <div className="w-full h-full relative flex items-center justify-center p-4">
                    {filePreview === 'PDF_FILE' ? <div className="text-center font-black text-slate-400">PDF 就绪</div> : <img src={filePreview} className="max-h-full max-w-full rounded-2xl object-contain shadow-lg" alt="" />}
                    <button onClick={() => {setFilePreview(null); setSelectedFile(null); setExtractedData(null);}} className="absolute top-6 right-6 p-2 bg-black/50 text-white rounded-full"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2.5"/></svg></button>
                  </div>
                ) : mode === 'text' ? (
                  <textarea className="w-full h-full p-8 bg-transparent outline-none font-bold text-slate-700 resize-none leading-relaxed text-lg" placeholder="粘贴内容..." value={inputText} onChange={e => setInputText(e.target.value)} />
                ) : (
                  <div onClick={() => fileInputRef.current?.click()} className="h-full flex flex-col items-center justify-center cursor-pointer text-slate-400 font-black uppercase text-xs tracking-widest">
                    <svg className="w-12 h-12 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeWidth="2"/></svg>
                    点击或拖放报价单
                  </div>
                )}
                {isProcessing && (
                  <div className="absolute inset-0 bg-white/80 backdrop-blur-md flex flex-col items-center justify-center z-20">
                    <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                    <p className="text-sm font-black text-blue-600 animate-pulse tracking-widest uppercase">架构解耦与深度重组中</p>
                  </div>
                )}
                <input type="file" ref={fileInputRef} hidden accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={e => e.target.files?.[0] && processFile(e.target.files[0])} />
              </div>
              <button onClick={showCamera ? capturePhoto : runAIExtraction} disabled={isProcessing} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-lg shadow-xl hover:bg-black transition-all">
                {isProcessing ? '分层提取中...' : '开始结构化建模'}
              </button>
            </div>

            <div className="h-[620px] rounded-[2.5rem] border border-slate-100 bg-slate-50/30 overflow-hidden flex flex-col shadow-inner">
               <div className="p-6 bg-white border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">分层结构预览</div>
               <div className="flex-1 overflow-y-auto p-8 no-scrollbar">
                  {extractedData ? (
                    <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                       <div className="bg-white p-6 rounded-3xl border border-slate-100">
                          <h3 className="text-xl font-black text-slate-900 mb-2">{extractedData.name}</h3>
                          <div className="flex items-center gap-3">
                             <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[9px] font-black uppercase tracking-widest">{extractedData.category}</span>
                             <span className="text-[10px] text-slate-400 font-bold">{extractedData.location}</span>
                          </div>
                       </div>

                       <div className="bg-white p-6 rounded-3xl border border-slate-100">
                          <p className="text-[9px] text-slate-400 font-black mb-4 uppercase tracking-widest">亮点提取 (Highlights)</p>
                          <ul className="space-y-2">
                             {(extractedData.highlights || []).map((h: string, i: number) => <li key={i} className="text-xs font-black text-slate-700 flex gap-2"><span className="text-blue-500">•</span>{h}</li>)}
                          </ul>
                       </div>

                       {/* 行业参数层预览 */}
                       <div className="bg-slate-900 p-6 rounded-3xl text-white">
                          <p className="text-[9px] text-slate-500 font-black mb-4 uppercase tracking-widest">行业专属参数 (Category Specs)</p>
                          <div className="grid grid-cols-2 gap-4">
                             {Object.entries(extractedData.categoryAttributes).map(([k, v]) => v && (
                               <div key={k} className="flex flex-col">
                                  <span className="text-[8px] text-slate-500 font-black uppercase mb-1">{k}</span>
                                  <span className="text-[11px] font-black truncate">{Array.isArray(v) ? v.join('/') : String(v)}</span>
                               </div>
                             ))}
                          </div>
                       </div>

                       <div className="grid grid-cols-2 gap-4">
                          <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100">
                             <p className="text-[8px] text-emerald-600 font-black uppercase mb-2">包含内容</p>
                             <ul className="text-[10px] text-emerald-800 font-bold space-y-1">
                                {(extractedData.inclusions || []).map((v: string, i: number) => <li key={i}>✓ {v}</li>)}
                             </ul>
                          </div>
                          <div className="bg-amber-50 p-5 rounded-2xl border border-amber-100">
                             <p className="text-[8px] text-amber-600 font-black uppercase mb-2">退改政策</p>
                             <p className="text-[10px] text-amber-800 font-bold line-clamp-3">{extractedData.cancellationPolicy}</p>
                          </div>
                       </div>

                       {/* 详细价格表 */}
                       {extractedData.rawExtracted && (
                         <PricingDisplay
                           roomTypes={extractedData.rawExtracted.room_types}
                           diningOptions={extractedData.rawExtracted.dining_options}
                           conferenceRooms={extractedData.rawExtracted.conference_rooms}
                           seasonDefinitions={extractedData.rawExtracted.season_definitions}
                           specialPackages={extractedData.rawExtracted.special_packages}
                           contactInfo={extractedData.rawExtracted.contact_info}
                         />
                       )}

                       {/* 完整提取数据 */}
                       {extractedData.rawExtracted && (
                         <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200">
                           <p className="text-[9px] text-slate-400 font-black mb-4 uppercase tracking-widest">完整提取数据 (Raw Extracted)</p>
                           <pre className="text-[10px] text-slate-700 overflow-auto max-h-96 bg-white p-4 rounded-xl border border-slate-200">
                             {JSON.stringify(extractedData.rawExtracted, null, 2)}
                           </pre>
                         </div>
                       )}
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center opacity-10 font-black text-slate-400 italic">等待分层建模...</div>
                  )}
               </div>
               <div className="p-8 bg-white border-t border-slate-100">
                  <button onClick={() => extractedData && onSaveSKU && onSaveSKU(extractedData)} disabled={!extractedData} className={`w-full py-5 rounded-2xl font-black text-lg transition-all ${extractedData ? 'bg-blue-600 text-white shadow-xl hover:bg-blue-700' : 'bg-slate-100 text-slate-300'}`}>确认并同步资源库</button>
               </div>
            </div>
          </div>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes laser { 0% { top: 0; opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { top: 100%; opacity: 0; } } 
        .animate-laser { animation: laser 4.5s ease-in-out infinite; position: absolute; width: 100%; height: 3px; background: linear-gradient(to right, transparent, #3b82f6, transparent); box-shadow: 0 0 20px #3b82f6; }
      `}} />
    </div>
  );
};

export default SmartImport;
