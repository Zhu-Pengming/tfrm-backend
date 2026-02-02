import api from '../../utils/api'
import storage from '../../utils/storage'

const TYPE_LABELS: any = {
  hotel: '酒店',
  ticket: '门票',
  guide: '导游',
  transport: '用车',
  itinerary: '行程',
  restaurant: '餐厅',
  activity: '活动'
}

const STATUS_LABELS: any = {
  active: '可用',
  inactive: '停用',
  archived: '已归档'
}

const ATTR_LABELS: any = {
  // 酒店相关
  hotel_name: '酒店名称',
  room_type_name: '房型',
  daily_sell_price: '销售价',
  daily_cost_price: '成本价',
  address: '地址',
  
  // 门票相关
  attraction_name: '景点名称',
  ticket_type: '票种',
  
  // 导游相关
  guide_name: '导游姓名',
  language: '语言',
  
  // 用车相关
  vehicle_type: '车型',
  capacity: '载客量',
  
  // 行程相关
  itinerary_name: '行程名称',
  days: '天数',
  nights: '晚数',
  departure_dates: '出发日期',
  highlights: '行程亮点',
  included_services: '包含服务',
  booking_notes: '预订说明',
  
  // 餐厅相关
  restaurant_name: '餐厅名称',
  cuisine_type: '菜系',
  meal_types: '餐型',
  per_person_price: '人均价格',
  
  // 活动相关
  activity_name: '活动名称',
  category: '类别',
  duration_hours: '时长(小时)',
  meeting_point: '集合地点',
  included_items: '包含项目'
}

Page({
  data: {
    skuId: '',
    sku: {} as any,
    loading: true,
    typeLabels: TYPE_LABELS,
    statusLabels: STATUS_LABELS,
    attrsList: [] as any[],
    costPrice: 0,
    salesPrice: 0,
    profitMargin: '0.0',
    needsAttention: false
  },

  onLoad(options: any) {
    const skuId = options.skuId
    if (skuId) {
      this.setData({ skuId })
      this.loadSkuDetail()
    }
  },

  async loadSkuDetail() {
    try {
      const sku = await api.getSkuDetail(this.data.skuId)
      
      // 格式化attrs中的值，处理数组和对象
      const formatValue = (value: any): string => {
        if (value === null || value === undefined) {
          return ''
        }
        if (Array.isArray(value)) {
          // 如果是数组，检查是否是对象数组
          if (value.length > 0 && typeof value[0] === 'object') {
            // 对象数组，尝试提取关键信息
            return value.map(item => {
              if (item.date && item.price) {
                return `${item.date}: ¥${item.price}`
              }
              return JSON.stringify(item)
            }).join('\n')
          }
          // 简单数组，用逗号分隔
          return value.join('、')
        }
        if (typeof value === 'object') {
          // 对象类型，尝试格式化
          return JSON.stringify(value, null, 2)
        }
        return String(value)
      }
      
      // 智能判断实际的资源类型（基于attrs中存在的字段）
      const detectActualType = (attrs: any): string => {
        const keys = Object.keys(attrs || {})
        
        // 计算每种类型的匹配分数
        const scores: Record<string, number> = {
          itinerary: 0,
          hotel: 0,
          ticket: 0,
          guide: 0,
          transport: 0,
          restaurant: 0,
          activity: 0
        }
        
        // 行程类型特征字段（权重更高）
        if (keys.includes('itinerary_name')) scores.itinerary += 10
        if (keys.includes('days')) scores.itinerary += 8
        if (keys.includes('nights')) scores.itinerary += 8
        if (keys.includes('departure_dates')) scores.itinerary += 10
        if (keys.includes('highlights')) scores.itinerary += 5
        if (keys.includes('included_services')) scores.itinerary += 5
        
        // 酒店类型特征字段
        if (keys.includes('hotel_name')) scores.hotel += 10
        if (keys.includes('room_type_name')) scores.hotel += 8
        if (keys.includes('address')) scores.hotel += 3
        
        // 其他类型
        if (keys.includes('attraction_name')) scores.ticket += 10
        if (keys.includes('guide_name')) scores.guide += 10
        if (keys.includes('vehicle_type')) scores.transport += 10
        if (keys.includes('restaurant_name')) scores.restaurant += 10
        if (keys.includes('activity_name')) scores.activity += 10
        
        // 找出得分最高的类型
        let maxScore = 0
        let detectedType = sku.sku_type
        
        for (const [type, score] of Object.entries(scores)) {
          if (score > maxScore) {
            maxScore = score
            detectedType = type
          }
        }
        
        // 如果得分太低，使用原始类型
        return maxScore >= 8 ? detectedType : sku.sku_type
      }
      
      // 根据实际类型获取相关字段
      const getRelevantFields = (type: string): string[] => {
        const fieldMap: Record<string, string[]> = {
          'hotel': ['hotel_name', 'room_type_name', 'address', 'daily_cost_price', 'daily_sell_price'],
          'itinerary': ['itinerary_name', 'days', 'nights', 'departure_dates', 'highlights', 'included_services', 'booking_notes', 'supplier_name'],
          'ticket': ['attraction_name', 'ticket_type'],
          'guide': ['guide_name', 'language'],
          'transport': ['vehicle_type', 'capacity'],
          'restaurant': ['restaurant_name', 'cuisine_type', 'meal_types', 'per_person_price'],
          'activity': ['activity_name', 'category', 'duration_hours', 'meeting_point', 'included_items']
        }
        return fieldMap[type] || []
      }
      
      const actualType = detectActualType(sku.attrs)
      const relevantFields = getRelevantFields(actualType)
      
      const attrsList = Object.keys(sku.attrs || {})
        .filter(key => {
          // 如果有定义相关字段，只显示相关字段
          if (relevantFields.length > 0) {
            return relevantFields.includes(key)
          }
          // 否则显示所有字段
          return true
        })
        .map(key => ({
          key,
          label: ATTR_LABELS[key] || key,
          value: formatValue(sku.attrs[key])
        }))
      
      const attrs = sku.attrs || {}
      const costPrice = attrs.daily_cost_price || attrs.cost_price || attrs.per_person_price || attrs.adult_price || 0
      const salesPrice = attrs.daily_sell_price || attrs.sell_price || attrs.per_person_price || attrs.adult_price || costPrice
      const profitMargin = salesPrice > 0 ? (((salesPrice - costPrice) / salesPrice) * 100).toFixed(1) : '0.0'
      
      const needsAttention = !sku.destination_city && !sku.destination_country || 
                            (costPrice === 0 && salesPrice === 0) || 
                            !sku.cancellation_policy && !sku.cancel_policy
      
      // 处理tags字段，确保是数组
      if (sku.tags && typeof sku.tags === 'string') {
        try {
          sku.tags = JSON.parse(sku.tags)
        } catch (e) {
          sku.tags = [sku.tags]
        }
      }
      
      // 处理highlights字段
      if (sku.highlights && typeof sku.highlights === 'string') {
        try {
          sku.highlights = JSON.parse(sku.highlights)
        } catch (e) {
          sku.highlights = [sku.highlights]
        }
      }
      
      // 处理inclusions字段
      if (sku.inclusions && typeof sku.inclusions === 'string') {
        try {
          sku.inclusions = JSON.parse(sku.inclusions)
        } catch (e) {
          sku.inclusions = [sku.inclusions]
        }
      }
      
      // 处理exclusions字段
      if (sku.exclusions && typeof sku.exclusions === 'string') {
        try {
          sku.exclusions = JSON.parse(sku.exclusions)
        } catch (e) {
          sku.exclusions = [sku.exclusions]
        }
      }
      
      this.setData({ 
        sku, 
        attrsList, 
        costPrice,
        salesPrice,
        profitMargin,
        needsAttention,
        loading: false 
      })
    } catch (error) {
      console.error('加载SKU详情失败', error)
      this.setData({ loading: false })
    }
  },

  handleAddToBasket() {
    const { sku } = this.data
    
    const count = storage.addToBasket({
      sku_id: sku.id,
      sku_name: sku.sku_name,
      quantity: 1
    })
    
    wx.showToast({
      title: `已加入报价篮 (${count})`,
      icon: 'success',
      duration: 1500
    })
    
    setTimeout(() => {
      wx.switchTab({
        url: '/pages/quotation/quotation'
      })
    }, 1500)
  },

  handleEditPrice(e: any) {
    const field = e.currentTarget.dataset.field
    const currentValue = field === 'cost' ? this.data.costPrice : this.data.salesPrice
    const title = field === 'cost' ? '编辑成本价' : '编辑销售价'
    
    wx.showModal({
      title,
      editable: true,
      placeholderText: `当前价格：${currentValue}`,
      success: async (res) => {
        if (res.confirm && res.content) {
          const newPrice = parseFloat(res.content)
          if (isNaN(newPrice) || newPrice < 0) {
            wx.showToast({ title: '请输入有效价格', icon: 'none' })
            return
          }
          
          try {
            const attrs = this.data.sku.attrs || {}
            if (field === 'cost') {
              attrs.daily_cost_price = newPrice
              attrs.cost_price = newPrice
            } else {
              attrs.daily_sell_price = newPrice
              attrs.sell_price = newPrice
            }
            
            await api.updateSku(this.data.skuId, { attrs })
            wx.showToast({ title: '价格已更新', icon: 'success' })
            this.loadSkuDetail()
          } catch (error) {
            console.error('更新价格失败', error)
            wx.showToast({ title: '更新失败', icon: 'error' })
          }
        }
      }
    })
  },

  handleEditField(e: any) {
    const { field, label, value } = e.currentTarget.dataset
    
    wx.showModal({
      title: `编辑${label}`,
      editable: true,
      placeholderText: value || '请输入内容',
      success: async (res) => {
        if (res.confirm && res.content) {
          try {
            const attrs = this.data.sku.attrs || {}
            attrs[field] = res.content
            
            await api.updateSku(this.data.skuId, { attrs })
            wx.showToast({ title: '更新成功', icon: 'success' })
            this.loadSkuDetail()
          } catch (error) {
            console.error('更新字段失败', error)
            wx.showToast({ title: '更新失败', icon: 'error' })
          }
        }
      }
    })
  },

  async handleTogglePrivacy() {
    const { sku } = this.data
    const newOwnerType = sku.owner_type === 'private' ? 'public' : 'private'
    const newVisibilityScope = newOwnerType === 'public' ? 'all' : 'private'
    const actionText = newOwnerType === 'public' ? '公开' : '私有'
    
    try {
      await api.updateSku(this.data.skuId, {
        owner_type: newOwnerType,
        visibility_scope: newVisibilityScope
      })
      
      wx.showToast({
        title: `已转为${actionText}`,
        icon: 'success'
      })
      
      this.loadSkuDetail()
    } catch (error) {
      console.error('切换隐私状态失败', error)
      wx.showToast({ title: '操作失败', icon: 'error' })
    }
  },

  async handleDelete() {
    const confirmed = await new Promise<boolean>((resolve) => {
      wx.showModal({
        title: '确认删除',
        content: '确定要删除这个产品吗？删除后无法恢复。',
        confirmText: '删除',
        confirmColor: '#DC2626',
        success: (res) => resolve(res.confirm)
      })
    })

    if (!confirmed) return

    try {
      await api.deleteSku(this.data.skuId)
      wx.showToast({
        title: '删除成功',
        icon: 'success'
      })
      
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    } catch (error) {
      console.error('删除SKU失败', error)
      wx.showToast({ title: '删除失败', icon: 'error' })
    }
  }
})
