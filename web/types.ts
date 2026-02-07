export type Category = 'Hotel' | 'Transport' | 'Ticket' | 'Guide' | 'Catering' | 'Activity' | 'Route';

export interface CalendarPrice {
  date: string;
  costPrice: number;
  salesPrice: number;
  inventory: number | 'unlimited';
}

export interface SKU {
  id: string;
  productId?: string;
  productTitle?: string;
  name: string;
  category: Category;
  backendType?: string;
  price: number;
  salesPrice: number;
  provider: string;
  location: string;
  image: string;
  posterUrl?: string;
  rating: number;
  isPrivate: boolean;
  needsAttention?: {
    destination?: boolean;
    pricing?: boolean;
    cancellation?: boolean;
  };

  // 双库系统字段
  isPublic?: boolean;           // 是否发布到公共库
  publicStatus?: 'none' | 'pending' | 'published' | 'removed';  // 公共库状态
  sourceOrgId?: string;         // 源机构ID（从公共库复制时）
  sourceSkuId?: string;         // 源SKU ID（从公共库复制时）
  
  // 统一标签体系
  tagsInterest?: string[];      // 兴趣标签
  tagsService?: {               // 服务标签
    language?: string[];
    duration?: string;
    location?: string;
    groupSize?: string;
    difficulty?: string;
  };
  
  // 价格字段
  baseCostPrice?: number;       // 供应商成本价
  baseSalePrice?: number;       // 供应商销售价

  // 1. 体验层（GetYourGuide 标准内容）
  description: string;
  highlights: string[];

  // 2. 费用与政策
  inclusions: string[];
  exclusions: string[];
  cancellationPolicy: string;

  // 3. 行业特有参数（模板化 details）
  categoryAttributes: {
    duration?: string;      // 时长 (活动/观光/用车)
    language?: string[];    // 服务语言
    groupSize?: string;     // 团队人数规格
    meetingPoint?: string;  // 集合地点
    bedType?: string;       // 酒店: 床型
    roomArea?: string;      // 酒店: 面积
    breakfast?: string;     // 酒店: 含早情况
    vehicleType?: string;   // 用车: 车型
    capacity?: string;      // 用车: 载客
    [key: string]: any;     // 允许新增字段
  };

  tags: string[];
  priceCalendar?: CalendarPrice[];
  availability?: CalendarPrice[];

  // AI 导入辅助字段
  rawExtracted?: any;     // LLM 抽取的原始字段
  importTaskId?: string;  // 关联的 import 任务 ID
  rawAttrs?: any;         // 后端原始 attrs 数据
}

export interface Product {
  id: string;
  title: string;
  productType?: Category | string;
  destination?: string;
  tags: string[];
  description?: string;
  highlights?: string[];
  media?: { url?: string; path?: string }[];
  posterUrl?: string;
  skus: SKU[];
}
export interface Vendor {
  id: string;
  name: string;
  logo: string;
  contact: string;
  phone: string;
  email: string;
  category: Category[];
  specialties: string[];
  status: 'Active' | 'UnderReview' | 'Suspended';
  rating: number;
  address: string;
  note?: string;
}

// 合作关系
export interface Cooperation {
  id: string;
  fromAgencyId: string;
  toAgencyId: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired' | 'terminated';
  requestMessage?: string;
  responseMessage?: string;
  createdAt: string;
  updatedAt: string;
  expiredAt?: string;
  approvedAt?: string;
  terminatedAt?: string;
  createdBy?: string;
  reviewedBy?: string;
}

// 通知
export interface Notification {
  id: string;
  agencyId: string;
  userId?: string;
  type: 'cooperation_change' | 'sku_update' | 'system';
  title: string;
  content: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

export type SidebarTab = 'SmartImport' | 'ProductLibrary' | 'Quotation' | 'Vendor' | 'PublicLibrary' | 'Cooperation' | 'Notifications';


