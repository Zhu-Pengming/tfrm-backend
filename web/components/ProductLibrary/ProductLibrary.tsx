
import React, { useState, useMemo, useEffect } from 'react';
import LibraryTabs from './LibraryTabs';
import ProductFilters from './ProductFilters';
import ProductCard from './ProductCard';
import ProductEditModal from './ProductEditModal';
import { Category, SKU, CalendarPrice, Product } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

const BACKEND_TO_FRONTEND: Record<string, Category> = {
  // Lowercase variants
  hotel: 'Hotel',
  car: 'Transport',
  ticket: 'Ticket',
  guide: 'Guide',
  restaurant: 'Catering',
  activity: 'Activity',
  itinerary: 'Route',
  transport: 'Transport',
  route: 'Route',
  catering: 'Catering',
  // Uppercase variants (backend returns these)
  HOTEL: 'Hotel',
  CAR: 'Transport',
  TICKET: 'Ticket',
  GUIDE: 'Guide',
  RESTAURANT: 'Catering',
  ACTIVITY: 'Activity',
  ITINERARY: 'Route',
  TRANSPORT: 'Transport',
  ROUTE: 'Route',
  CATERING: 'Catering'
};

const generateCalendar = (baseCost: number, baseSales: number): CalendarPrice[] => {
  return Array.from({ length: 14 }).map((_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i);
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const factor = isWeekend ? 1.25 : 1.0;
    return {
      date: date.toISOString().split('T')[0],
      costPrice: Math.round(baseCost * factor),
      salesPrice: Math.round(baseSales * factor),
      inventory: isWeekend ? (Math.random() > 0.5 ? 2 : 0) : Math.floor(Math.random() * 10) + 5
    };
  });
};

const INITIAL_MOCK_DATA: SKU[] = [
  {
    id: 'h1',
    name: 'The Peninsula Tokyo',
    category: 'Hotel',
    price: 4500,
    salesPrice: 5800,
    provider: 'Expedia Group',
    rating: 4.9,
    location: 'Tokyo, Japan',
    image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&q=80&w=800',
    tags: ['Luxury', 'Skyline'],
    isPrivate: true,
    priceCalendar: generateCalendar(4500, 5800),
    description: 'Iconic luxury hotel in Marunouchi with panoramic city views.',
    highlights: ['Panoramic city views', '24/7 concierge', 'Direct subway access'],
    inclusions: ['Daily breakfast for two', 'Evening turndown service'],
    exclusions: ['Personal expenses', 'City tax'],
    cancellationPolicy: 'Free cancellation up to 48 hours before check-in.',
    categoryAttributes: { bedType: 'King/Twin', breakfast: 'Included', roomArea: '54sqm' }
  },
  {
    id: 'h2',
    name: 'Aman Kyoto',
    category: 'Hotel',
    price: 12000,
    salesPrice: 15800,
    provider: 'Aman',
    rating: 5.0,
    location: 'Kyoto, Japan',
    image: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&q=80&w=800',
    tags: ['Forest retreat', 'Onsen'],
    isPrivate: true,
    priceCalendar: generateCalendar(12000, 15800),
    description: 'Modern ryokan-style hideaway designed by Kerry Hill in a private forest.',
    highlights: ['Architecture by Kerry Hill', 'Secluded hot spring experience', 'Seasonal kaiseki'],
    inclusions: ['Breakfast for two', 'Daily tea ritual', 'Private onsen use'],
    exclusions: ['Spa treatments', 'Airport transfer'],
    cancellationPolicy: 'Non-refundable after booking.',
    categoryAttributes: { roomArea: '60sqm', breakfast: 'Kaiseki', bedType: 'King or Twin' }
  },
  {
    id: 'tr1',
    name: 'Tokyo Private Van (Alphard)',
    category: 'Transport',
    price: 2800,
    salesPrice: 3500,
    provider: 'Tokyo Chauffeur',
    rating: 4.8,
    location: 'Tokyo area',
    image: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&q=80&w=800',
    tags: ['Mandarin guide', 'Luxury van'],
    isPrivate: false,
    priceCalendar: generateCalendar(2800, 3500),
    description: 'Professional Mandarin-speaking driver with premium Toyota Alphard.',
    highlights: ['Executive Alphard', 'Professional guide-driver', 'Flexible routes'],
    inclusions: ['10 hours usage', 'Driver service', 'Fuel and tolls'],
    exclusions: ['Parking fees', 'Overtime (JPY 300/hour)'],
    cancellationPolicy: 'Free cancel up to 24 hours before departure.',
    categoryAttributes: { vehicleType: 'Alphard', capacity: '6 pax', language: ['Mandarin', 'Japanese'], duration: '10 hours' }
  },
  {
    id: 'tk1',
    name: 'Tokyo Skytree Priority Ticket',
    category: 'Ticket',
    price: 550,
    salesPrice: 680,
    provider: 'Klook Partner',
    rating: 4.7,
    location: 'Sumida, Tokyo',
    image: 'https://images.unsplash.com/photo-1544085311-11a028465b0c?auto=format&fit=crop&q=80&w=800',
    tags: ['Fast track', 'Official'],
    isPrivate: false,
    priceCalendar: generateCalendar(550, 680),
    description: 'Priority admission to Tokyo Skytree with fixed time entry.',
    highlights: ['Official e-ticket', 'No need to queue', 'Fast-track lane'],
    inclusions: ['Tokyo Skytree admission', 'Fast-track access'],
    exclusions: ['Souvenirs', 'Personal spending'],
    cancellationPolicy: 'Non-refundable once booked.',
    categoryAttributes: { duration: 'Half day' }
  },
  {
    id: 'g1',
    name: 'Kyoto Cultural Scholar Guide',
    category: 'Guide',
    price: 1500,
    salesPrice: 2000,
    provider: 'Local Insights',
    rating: 5.0,
    location: 'Kyoto city',
    image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&q=80&w=800',
    tags: ['History', 'Culture walk'],
    isPrivate: true,
    priceCalendar: generateCalendar(1500, 2000),
    description: 'PhD-level storyteller guiding you through Kyoto\'s hidden alleys and shrines.',
    highlights: ['Historical deep dive', 'Custom itinerary', 'Small-group pacing'],
    inclusions: ['8-hour private guiding', 'Customized route planning'],
    exclusions: ['Guide meals', 'Temple entrance fees'],
    cancellationPolicy: 'Full refund up to 3 days before service.',
    categoryAttributes: { language: ['Mandarin', 'English'], duration: '8 hours' }
  },
  {
    id: 'c1',
    name: 'Kyo-Kaiseki Tasting Dinner',
    category: 'Catering',
    price: 2200,
    salesPrice: 2800,
    provider: 'Gion Atelier',
    rating: 5.0,
    location: 'Gion, Kyoto',
    image: 'https://images.unsplash.com/photo-1580442151529-343f2f5e0e27?auto=format&fit=crop&q=80&w=800',
    tags: ['Kaiseki', 'Michelin inspired'],
    isPrivate: true,
    priceCalendar: generateCalendar(2200, 2800),
    description: 'Seasonal kaiseki by a veteran chef featuring Kyoto vegetables and river fish.',
    highlights: ['Seasonal tasting menu', 'Traditional plating', 'Limited seats'],
    inclusions: ['Set tasting menu', 'Service charge and tax'],
    exclusions: ['Alcoholic beverages', 'Hotel transfer'],
    cancellationPolicy: 'Prepayment required; non-refundable within 7 days.',
    categoryAttributes: { duration: '3 hours' }
  },
  {
    id: 'a1',
    name: 'Hot Air Balloon Over Tokyo Bay',
    category: 'Activity',
    price: 3800,
    salesPrice: 4500,
    provider: 'SkyTour',
    rating: 4.9,
    location: 'Tokyo Bay',
    image: 'https://images.unsplash.com/photo-1464012391851-29a83eb95142?auto=format&fit=crop&q=80&w=800',
    tags: ['Balloon', 'Sunrise'],
    isPrivate: false,
    priceCalendar: generateCalendar(3800, 4500),
    description: 'Sunrise balloon flight with sweeping views of Tokyo Bay and skyline.',
    highlights: ['Sunrise departure', 'Professional pilot', 'Champagne toast'],
    inclusions: ['20-minute flight', 'Safety briefing', 'Insurance'],
    exclusions: ['Hotel pickup'],
    cancellationPolicy: 'Weather dependent; full refund if cancelled by operator.',
    categoryAttributes: { duration: '20 minutes' }
  },
  {
    id: 'r1',
    name: 'Hokkaido Scenic Loop 5D4N',
    category: 'Route',
    price: 15800,
    salesPrice: 19800,
    provider: 'TailorMade Trails',
    rating: 4.8,
    location: 'Hokkaido, Japan',
    image: 'https://images.unsplash.com/photo-1548062005-e50d06391399?auto=format&fit=crop&q=80&w=800',
    tags: ['Road trip', 'Small group'],
    isPrivate: true,
    priceCalendar: generateCalendar(15800, 19800),
    description: 'Five-day small-group circuit covering Sapporo, Otaru canals and Furano fields.',
    highlights: ['Expert driver-guide', 'Boutique stays', 'Flower fields and canals'],
    inclusions: ['4 nights boutique lodging', 'Private vehicle', 'Professional guide'],
    exclusions: ['Flights to Hokkaido', 'Personal meals'],
    cancellationPolicy: 'Free cancellation up to 5 days before departure.',
    categoryAttributes: { duration: '5 days', groupSize: '4-8 pax' }
  }
];
interface ProductLibraryProps {
  onAddToQuotation: (sku: SKU) => void;
  onNavigateToImport: () => void;
  customSkus?: SKU[];
}

const ProductLibrary: React.FC<ProductLibraryProps> = ({ onAddToQuotation, onNavigateToImport, customSkus = [] }) => {
  const [skuList, setSkuList] = useState<SKU[]>([]);
  const [productList, setProductList] = useState<Product[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  // Remove isPrivate toggle - ProductLibrary only shows private SKUs
  // Use Sidebar "公共库" menu to browse other agencies' public SKUs
  const [activeCategory, setActiveCategory] = useState<Category | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchMargin, setBatchMargin] = useState<number>(20);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingSku, setEditingSku] = useState<SKU | null>(null);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  // Load SKUs from backend
  useEffect(() => {
    const loadSkus = async () => {
      try {
        const { productAPI, skuAPI } = await import('../../services/api');
        
        // Fetch both products and standalone SKUs
        const [productsData, skusData] = await Promise.all([
          productAPI.list(),
          skuAPI.list()
        ]);
        
        const convertedProducts: Product[] = [];
        
        // Convert products with their SKUs
        if (Array.isArray(productsData)) {
          convertedProducts.push(...productsData.map((product: any) => {
            const posterUrl = (product.media || []).find((m: any) => m.url || m.path)?.url || (product.media || []).find((m: any) => m.path)?.path;
            const destination = `${product.destination_city || ''}${product.destination_country ? ', ' + product.destination_country : ''}`.trim();

            const normalizeAttrs = (skuType: string, attrs: any) => {
              const a = attrs || {};
              const duration = a.duration_hours || a.duration_days || a.duration || a.days;
              switch (skuType) {
                case 'car':
                  return { vehicleType: a.car_type, capacity: a.seats, duration };
                case 'hotel':
                  return { bedType: a.bed_type, roomArea: a.room_area, duration };
                case 'guide':
                  return { language: a.languages, duration };
                case 'itinerary':
                  return { duration: a.days ? `${a.days}天` : duration, language: a.languages };
                case 'activity':
                  return {
                    duration,
                    language: a.language_service,
                    vehicleType: a.vehicle_type,
                    capacity: a.max_pax || a.min_pax
                  };
                default:
                  return { duration, language: a.language_service || a.languages };
              }
            };

            const skus: SKU[] = (product.skus || []).map((sku: any) => {
              const attrs = sku.attrs || {};
              const baseCost = attrs.daily_cost_price ?? attrs.cost_price ?? attrs.per_person_price ?? attrs.adult_price ?? 0;
              const baseSell = attrs.daily_sell_price ?? attrs.sell_price ?? attrs.per_person_price ?? attrs.adult_price ?? baseCost;
              
              // Map category from backend format to frontend format
              let category: Category = 'Activity';
              
              // First try sku.category field (new unified field)
              if (sku.category) {
                category = BACKEND_TO_FRONTEND[sku.category] || BACKEND_TO_FRONTEND[sku.category.toLowerCase()] || (sku.category as Category);
              } 
              // Fallback to sku_type mapping
              else if (sku.sku_type) {
                category = BACKEND_TO_FRONTEND[sku.sku_type] || BACKEND_TO_FRONTEND[sku.sku_type.toLowerCase()] || 'Activity';
              }
              
              console.log(`SKU ${sku.id}: sku_type="${sku.sku_type}", category="${sku.category}" => mapped to "${category}"`);

              const finalDestination = `${sku.destination_city || product.destination_city || ''}${(sku.destination_country || product.destination_country) ? ', ' + (sku.destination_country || product.destination_country) : ''}`.trim();
              const needsAttention = {
                destination: !finalDestination,
                pricing: baseSell === 0 && baseCost === 0,
                cancellation: !sku.cancellation_policy,
              };

              const normalizedAttrs = normalizeAttrs(sku.sku_type, attrs);
              const highlightFallback = sku.highlights || product.highlights || attrs.experience_themes || attrs.service_guarantees || [];
              const inclusionsFallback = sku.inclusions || attrs.include_items || [];
              const exclusionsFallback = sku.exclusions || attrs.exclude_items || [];

              return {
                id: sku.id,
                productId: product.id,
                productTitle: product.title,
                name: sku.sku_name,
                category,
                backendType: sku.sku_type,
                price: Number(baseCost) || 0,
                salesPrice: Number(baseSell) || Number(baseCost) || 0,
                provider: sku.supplier_name || 'Unknown',
                rating: 4.5,
                location: finalDestination || '待补充目的地',
                image: posterUrl || 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&q=80&w=800',
                posterUrl: posterUrl,
                tags: sku.tags || product.tags || [],
                isPrivate: sku.owner_type === 'private',
                priceCalendar: [],
                description: sku.description || product.description || '',
                highlights: highlightFallback,
                inclusions: inclusionsFallback,
                exclusions: exclusionsFallback,
                cancellationPolicy: sku.cancellation_policy || sku.cancel_policy || 'See supplier notes',
                categoryAttributes: normalizedAttrs,
                needsAttention,
                rawAttrs: attrs,
                rawExtracted: sku.raw_extracted
              } as SKU;
            });

            return {
              id: product.id,
              title: product.title,
              productType: product.product_type || '',
              destination: destination || undefined,
              tags: product.tags || [],
              description: product.description || '',
              highlights: product.highlights || [],
              media: product.media,
              posterUrl,
              skus
            } as Product;
          }));
        }
        
        // Convert standalone SKUs (not associated with products) into virtual products
        if (Array.isArray(skusData)) {
          const standaloneSKUs = skusData.filter((sku: any) => !sku.product_id);
          
          standaloneSKUs.forEach((sku: any) => {
            const attrs = sku.attrs || {};
            const baseCost = attrs.daily_cost_price ?? attrs.cost_price ?? attrs.per_person_price ?? attrs.adult_price ?? 0;
            const baseSell = attrs.daily_sell_price ?? attrs.sell_price ?? attrs.per_person_price ?? attrs.adult_price ?? baseCost;
            
            // Map category from backend format to frontend format
            let category: Category = 'Activity';
            
            if (sku.category) {
              category = BACKEND_TO_FRONTEND[sku.category] || BACKEND_TO_FRONTEND[sku.category.toLowerCase()] || (sku.category as Category);
            } else if (sku.sku_type) {
              category = BACKEND_TO_FRONTEND[sku.sku_type] || BACKEND_TO_FRONTEND[sku.sku_type.toLowerCase()] || 'Activity';
            }
            
            console.log(`Standalone SKU ${sku.id}: sku_type="${sku.sku_type}", category="${sku.category}" => mapped to "${category}"`);
            
            const finalDestination = `${sku.destination_city || ''}${sku.destination_country ? ', ' + sku.destination_country : ''}`.trim();
            const needsAttention = {
              destination: !finalDestination,
              pricing: baseSell === 0 && baseCost === 0,
              cancellation: !sku.cancellation_policy,
            };
            
            const normalizeAttrs = (skuType: string, attrs: any) => {
              const a = attrs || {};
              const duration = a.duration_hours || a.duration_days || a.duration || a.days;
              switch (skuType) {
                case 'car':
                  return { vehicleType: a.car_type, capacity: a.seats, duration };
                case 'hotel':
                  return { bedType: a.bed_type, roomArea: a.room_area, duration };
                case 'guide':
                  return { language: a.languages, duration };
                case 'itinerary':
                  return { duration: a.days ? `${a.days}天` : duration, language: a.languages };
                case 'activity':
                  return {
                    duration,
                    language: a.language_service,
                    vehicleType: a.vehicle_type,
                    capacity: a.max_pax || a.min_pax
                  };
                default:
                  return { duration, language: a.language_service || a.languages };
              }
            };
            
            const normalizedAttrs = normalizeAttrs(sku.sku_type, attrs);
            const highlightFallback = sku.highlights || attrs.experience_themes || attrs.service_guarantees || [];
            const inclusionsFallback = sku.inclusions || attrs.include_items || [];
            const exclusionsFallback = sku.exclusions || attrs.exclude_items || [];
            
            const skuObj: SKU = {
              id: sku.id,
              productId: undefined,
              productTitle: undefined,
              name: sku.sku_name,
              category,
              backendType: sku.sku_type,
              price: Number(baseCost) || 0,
              salesPrice: Number(baseSell) || Number(baseCost) || 0,
              provider: sku.supplier_name || 'Unknown',
              rating: 4.5,
              location: finalDestination || '待补充目的地',
              image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&q=80&w=800',
              posterUrl: undefined,
              tags: sku.tags || [],
              isPrivate: sku.owner_type === 'private',
              priceCalendar: [],
              description: sku.description || '',
              highlights: highlightFallback,
              inclusions: inclusionsFallback,
              exclusions: exclusionsFallback,
              cancellationPolicy: sku.cancellation_policy || sku.cancel_policy || 'See supplier notes',
              categoryAttributes: normalizedAttrs,
              needsAttention,
              rawAttrs: attrs,
              rawExtracted: sku.raw_extracted
            };
            
            // Create a virtual product for this standalone SKU
            convertedProducts.push({
              id: `virtual-${sku.id}`,
              title: sku.sku_name,
              productType: category,
              destination: finalDestination || undefined,
              tags: sku.tags || [],
              description: sku.description || '',
              highlights: highlightFallback,
              media: [],
              posterUrl: undefined,
              skus: [skuObj]
            } as Product);
          });
        }

        setProductList(convertedProducts);
        setSkuList(convertedProducts.flatMap(p => p.skus));
      } catch (error) {
        console.error('Failed to load SKUs:', error);
        // Keep mock data as fallback
      } finally {
        setLoading(false);
      }
    };

    if (authLoading) return;
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    loadSkus();
  }, [customSkus, isAuthenticated, authLoading]);

  const allSkus = useMemo(() => {
    return [...customSkus, ...skuList];
  }, [skuList, customSkus]);

  const productMap = useMemo(() => {
    const map = new Map<string, SKU[]>();
    productList.forEach(p => map.set(p.id, p.skus));
    return map;
  }, [productList]);

  const filteredData = useMemo(() => {
    console.log('Filtering with category:', activeCategory);
    const filtered = allSkus.filter(item => {
      // Only show private SKUs in ProductLibrary
      const matchesLibrary = item.isPrivate !== false; // Show private or undefined
      const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
      const matchesSearch = !searchQuery || 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.location.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (activeCategory !== 'All') {
        console.log(`SKU ${item.name}: category=${item.category}, matches=${matchesCategory}`);
      }
      
      return matchesLibrary && matchesCategory && matchesSearch;
    });
    console.log(`Filtered ${filtered.length} items from ${allSkus.length} total`);
    return filtered;
  }, [allSkus, activeCategory, searchQuery]);

  const updateIndividualPrice = async (id: string, newSalesPrice: number) => {
    try {
      const sku = allSkus.find(s => s.id === id);
      if (!sku) return;
      
      const { skuAPI } = await import('../../services/api');
      await skuAPI.update(id, {
        ...sku,
        sales_price: newSalesPrice
      });
      
      const updateFn = (list: SKU[]) => list.map(s => s.id === id ? {
        ...s, 
        salesPrice: newSalesPrice,
        priceCalendar: s.priceCalendar?.map(cp => ({
          ...cp,
          salesPrice: Math.round(newSalesPrice * (cp.costPrice / s.price)) 
        }))
      } : s);

      setSkuList(prev => updateFn(prev));
      setEditingId(null);
    } catch (error) {
      console.error('Failed to update price:', error);
      alert('更新价格失败，请重试');
    }
  };

  const applyBatchMargin = async () => {
    try {
      const { skuAPI } = await import('../../services/api');
      // 明确传递 margin_percentage 参数
      await skuAPI.batchPricing(Array.from(selectedIds), batchMargin, undefined, undefined);
      
      const factor = 1 - batchMargin / 100;
      const updateFn = (list: SKU[]) => list.map(sku => selectedIds.has(sku.id) ? {
        ...sku, 
        salesPrice: Math.round(sku.price / factor),
        priceCalendar: sku.priceCalendar?.map(cp => ({ ...cp, salesPrice: Math.round(cp.costPrice / factor) }))
      } : sku);

      setSkuList(prev => updateFn(prev));
      setIsBatchMode(false);
      setSelectedIds(new Set());
      alert(`成功调价 ${selectedIds.size} 个商品`);
    } catch (error) {
      console.error('Failed to batch update pricing:', error);
      alert('批量调价失败，请重试');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { skuAPI } = await import('../../services/api');
      await skuAPI.delete(id);
      setSkuList(prev => prev.filter(sku => sku.id !== id));
      alert('商品已删除');
    } catch (error) {
      console.error('Failed to delete SKU:', error);
      alert('删除失败，请重试');
    }
  };

  const handleTogglePrivacy = async (id: string) => {
    try {
      const sku = allSkus.find(s => s.id === id);
      if (!sku) return;
      
      // 如果当前是私有的，发布到公共库
      if (!sku.isPublic) {
        const response = await fetch(`http://localhost:8000/skus/${id}/publish`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          }
        });
        
        if (!response.ok) throw new Error('发布失败');
        
        // 更新本地状态
        setSkuList(prev => prev.map(s => 
          s.id === id ? { ...s, isPublic: true, publicStatus: 'published' } : s
        ));
        alert('已发布到公共库！');
        
        // 刷新列表以确保数据同步
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        // 如果已经是公共的，从公共库下架（设置为私有）
        const { skuAPI } = await import('../../services/api');
        await skuAPI.update(id, {
          is_public: false,
          public_status: 'none'
        });
        
        setSkuList(prev => prev.map(s => 
          s.id === id ? { ...s, isPublic: false, publicStatus: 'none' } : s
        ));
        alert('已从公共库下架');
      }
    } catch (error) {
      console.error('Failed to toggle privacy:', error);
      alert('操作失败，请重试');
    }
  };

  const handleEdit = (sku: SKU) => {
    setEditingSku(sku);
  };

  const handleSaveEdit = async (updatedSku: SKU, updatePayload?: any) => {
    console.log('=== handleSaveEdit called ===');
    console.log('updatedSku:', updatedSku);
    console.log('updatePayload:', updatePayload);
    
    try {
      const { skuAPI } = await import('../../services/api');
      const payload = updatePayload || updatedSku;
      
      console.log('Sending to API:', {
        skuId: updatedSku.id,
        payload: payload
      });
      
      const response = await skuAPI.update(updatedSku.id, payload);
      console.log('API response:', response);
      
      setEditingSku(null);
      alert('商品已更新');
      
      // 刷新页面以显示最新数据
      window.location.reload();
    } catch (error) {
      console.error('Failed to update SKU:', error);
      alert('更新失败，请重试');
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto py-6 px-8 pb-32">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">我的私有库</h1>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Management Workspace</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 p-1 rounded-xl mr-4">
             <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400'}`}>
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
             </button>
             <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400'}`}>
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
             </button>
          </div>

          <div className="relative">
            <input type="text" placeholder="搜索 SKU..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 outline-none w-64 text-sm font-medium" />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeWidth="2" strokeLinecap="round"/></svg>
          </div>
          
          <button onClick={() => setIsBatchMode(!isBatchMode)} className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${isBatchMode ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
            {isBatchMode ? '完成调价' : '批量调价'}
          </button>
        </div>
      </div>

      <div className="mb-6">
        <ProductFilters activeCategory={activeCategory} onCategoryChange={setActiveCategory} />
      </div>

      {isBatchMode && (
        <div className="mb-6 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-700">已选择</span>
                <span className="px-3 py-1 bg-amber-500 text-white rounded-full text-sm font-black">
                  {selectedIds.size}
                </span>
                <span className="text-sm font-bold text-slate-700">个商品</span>
              </div>
              <div className="h-6 w-px bg-amber-300"></div>
              <div className="flex items-center gap-3">
                <label className="text-sm font-bold text-slate-700">目标毛利率</label>
                <input
                  type="number"
                  value={batchMargin}
                  onChange={(e) => setBatchMargin(parseFloat(e.target.value) || 0)}
                  className="w-24 px-3 py-2 border-2 border-amber-300 rounded-xl text-center font-black text-slate-900 focus:ring-2 focus:ring-amber-400 outline-none"
                  placeholder="20"
                />
                <span className="text-sm font-bold text-slate-700">%</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={applyBatchMargin}
                disabled={selectedIds.size === 0}
                className="px-6 py-2.5 bg-amber-500 text-white rounded-xl font-bold hover:bg-amber-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-amber-200"
              >
                应用调价
              </button>
              <button
                onClick={() => {
                  setIsBatchMode(false);
                  setSelectedIds(new Set());
                }}
                className="px-6 py-2.5 bg-white text-slate-600 border-2 border-slate-200 rounded-xl font-bold hover:bg-slate-50 transition-all"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {filteredData.length > 0 ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            {filteredData.map(sku => (
              <ProductCard 
                key={sku.id} sku={sku} relatedSkus={sku.productId ? productMap.get(sku.productId) : undefined} 
                onAdd={(selected) => onAddToQuotation(selected || sku)}
                isSelectable={isBatchMode} isSelected={selectedIds.has(sku.id)}
                onSelect={() => {
                  const newSelected = new Set(selectedIds);
                  newSelected.has(sku.id) ? newSelected.delete(sku.id) : newSelected.add(sku.id);
                  setSelectedIds(newSelected);
                }}
                onUpdatePrice={updateIndividualPrice}
                onDelete={handleDelete}
                onTogglePrivacy={handleTogglePrivacy}
                onEdit={handleEdit}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                  <th className="px-6 py-4 w-12 text-center">
                    {isBatchMode && (
                      <input type="checkbox" onChange={(e) => setSelectedIds(e.target.checked ? new Set(filteredData.map(s => s.id)) : new Set())} checked={selectedIds.size === filteredData.length && filteredData.length > 0} className="rounded border-slate-300" />
                    )}
                  </th>
                  <th className="px-6 py-4">产品信息</th>
                  <th className="px-6 py-4 text-right">成本价</th>
                  <th className="px-6 py-4 text-right">销售价（点击可编辑）</th>
                  <th className="px-6 py-4 text-center">毛利率</th>
                  <th className="px-6 py-4 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredData.map(sku => (
                  <tr key={sku.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-6 py-4 text-center">
                      {isBatchMode && (
                        <input type="checkbox" checked={selectedIds.has(sku.id)} onChange={() => {
                           const next = new Set(selectedIds);
                           next.has(sku.id) ? next.delete(sku.id) : next.add(sku.id);
                           setSelectedIds(next);
                        }} className="rounded border-slate-300" />
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img src={sku.image} className="w-10 h-10 rounded-lg object-cover" alt="" />
                        <div>
                          <p className="font-bold text-slate-900 text-sm">{sku.name}</p>
                          <p className="text-[10px] text-slate-400 font-medium">{sku.location}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="text-sm font-black text-slate-400">楼{sku.price}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {editingId === sku.id ? (
                        <input 
                          autoFocus
                          type="number"
                          defaultValue={sku.salesPrice}
                          onBlur={(e) => updateIndividualPrice(sku.id, parseFloat(e.target.value))}
                          onKeyDown={(e) => { if (e.key === 'Enter') updateIndividualPrice(sku.id, parseFloat((e.target as HTMLInputElement).value)) }}
                          className="w-24 text-right px-2 py-1 border-2 border-blue-500 rounded-lg text-sm font-black outline-none"
                        />
                      ) : (
                        <div 
                          onClick={() => setEditingId(sku.id)}
                          className="inline-flex items-center gap-2 cursor-pointer hover:bg-blue-50 px-2 py-1 rounded-lg transition-colors group/price"
                        >
                          <p className="text-sm font-black text-blue-600">楼{sku.salesPrice}</p>
                          <svg className="w-3 h-3 text-blue-200 group-hover/price:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`text-xs font-black ${((sku.salesPrice - sku.price) / sku.salesPrice * 100) < 10 ? 'text-amber-500' : 'text-emerald-500'}`}>
                        {((sku.salesPrice - sku.price) / sku.salesPrice * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => onAddToQuotation(sku)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-white rounded-lg transition-all border border-transparent hover:border-blue-100">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        <div className="flex flex-col items-center justify-center py-24 px-6 bg-white rounded-[3rem] border border-slate-100 shadow-sm text-center">
          <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6">
            <svg className="w-10 h-10 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">资源库空空如也</h3>
          <p className="text-slate-500 mb-8">没有找到匹配的产品。请调整筛选条件，或通过智能导入添加新的 SKU。</p>
          <button onClick={onNavigateToImport} className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100">
            前往智能导入
          </button>
        </div>
      )}

      {editingSku && (
        <ProductEditModal
          sku={editingSku}
          onSave={handleSaveEdit}
          onClose={() => setEditingSku(null)}
        />
      )}
    </div>
  );
};

export default ProductLibrary;





