import api from '../../utils/api'



const SKU_TYPES = [

  { value: 'hotel', label: '酒店' },

  { value: 'ticket', label: '门票' },

  { value: 'guide', label: '导游' },

  { value: 'transport', label: '用车' },

  { value: 'itinerary', label: '行程' },

  { value: 'restaurant', label: '餐厅' },

  { value: 'activity', label: '活动' }

]



const FIELD_LABELS: any = {
  sku_name: '资源名称',
  destination_city: '目的地城市',
  destination_country: '目的地国家',
  
  // 酒店相关
  hotel_name: '酒店名称',
  room_type_name: '房型',
  room_types: '房型列表',
  daily_sell_price: '销售价',
  daily_cost_price: '成本价',
  address: '地址',
  dining_options: '餐饮选项',
  conference_rooms: '会议室',
  season_definitions: '季节定义',
  special_packages: '特殊套餐',
  facilities: '设施',
  
  // 门票相关
  attraction_name: '景点名称',
  ticket_type: '票种',
  
  // 导游相关
  guide_name: '导游姓名',
  language: '语言',
  languages: '语言',
  
  // 用车相关
  vehicle_type: '车型',
  car_type: '车型',
  capacity: '载客量',
  seats: '座位数',
  service_hours: '服务时长',
  driver_language: '司机语言',
  
  // 行程相关
  itinerary_name: '行程名称',
  days: '天数',
  nights: '晚数',
  departure_dates: '出发日期',
  highlights: '行程亮点',
  included_services: '包含服务',
  booking_notes: '预订说明',
  supplier_name: '供应商',
  day_by_day: '逐日行程',
  highlight: '行程亮点',
  single_supplement: '单房差',
  
  // 餐厅相关
  restaurant_name: '餐厅名称',
  cuisine_type: '菜系',
  meal_types: '餐型',
  meal_type: '餐型',
  per_person_price: '人均价格',
  booking_time_slots: '预订时段',
  
  // 活动相关
  activity_name: '活动名称',
  category: '类别',
  duration_hours: '时长',
  duration_days: '天数',
  duration_nights: '晚数',
  meeting_point: '集合地点',
  included_items: '包含项目',
  experience_themes: '体验主题',
  service_guarantees: '服务保障',
  route_stops: '路线站点',
  language_service: '服务语言',
  min_pax: '最少人数',
  max_pax: '最多人数',
  
  // 通用字段
  inclusions: '包含项目',
  exclusions: '不包含项目',
  cancellation_policy: '取消政策',
  contact_info: '联系方式',
  description: '描述',
  tags: '标签',
  cost_price: '成本价',
  sell_price: '销售价',
  adult_price: '成人价格',
  child_price: '儿童价格'
}



Page({

  data: {
    taskId: '',
    task: { status: 'loading' } as any,
    loading: true,
    confirming: false,
    skuTypes: SKU_TYPES,
    selectedTypeIndex: 0,
    fieldList: [] as any[],
    showEvidenceModal: false,
    currentEvidence: '',
    skuId: '',
    pollingTimer: null as any,
    confidencePercent: '0',
    typeAutoDetected: false,
    typeConfidence: 0,
    typeConfidencePercent: '0',
    
    // 新增：结构化数据
    structuredData: null as any,
    showStructuredPreview: false,
    showPricingDetails: false,
    showRawData: false
  },



  onLoad(options: any) {

    const taskId = options.taskId

    if (taskId) {

      this.setData({ taskId })

      this.loadTaskDetail()

    }

  },



  onUnload() {

    if (this.data.pollingTimer) {

      clearInterval(this.data.pollingTimer)

    }

  },



  async loadTaskDetail() {

    try {

      const task = await api.getImportTask(this.data.taskId)

      const confidencePercent = task.confidence ? (task.confidence * 100).toFixed(0) : '0'

      this.setData({ task, loading: false, confidencePercent })



      if (task.status === 'parsing') {

        this.startPolling()

      } else if (task.status === 'parsed') {

        this.processExtractedFields(task.extracted_fields, task.evidence)

        

        // Auto-select SKU type based on AI extraction

        console.log('=== SKU Type Auto-Selection Debug ===')
        console.log('task.parsed_result:', task.parsed_result)
        console.log('task.parsed_result.sku_type:', task.parsed_result?.sku_type)
        
        let detectedSkuType = null
        
        // Try to get sku_type from parsed_result first
        if (task.parsed_result && task.parsed_result.sku_type) {
          detectedSkuType = task.parsed_result.sku_type
        }
        
        if (detectedSkuType) {
          const typeIndex = SKU_TYPES.findIndex(t => t.value === detectedSkuType)
          console.log('Detected SKU type:', detectedSkuType)
          console.log('Type index:', typeIndex)
          
          // Get confidence for sku_type - handle both object and numeric formats
          let typeConfidence = 0.9 // Default to 0.9 if not found
          if (task.confidence) {
            if (typeof task.confidence === 'object' && 'sku_type' in task.confidence) {
              const confValue = (task.confidence as any).sku_type
              if (typeof confValue === 'number' && confValue > 0) {
                typeConfidence = confValue
              }
            } else if (typeof task.confidence === 'number' && task.confidence > 0) {
              typeConfidence = task.confidence
            }
          }
          
          if (typeIndex >= 0) {
            const confidencePercent = Math.round(typeConfidence * 100)
            this.setData({ 
              selectedTypeIndex: typeIndex,
              typeAutoDetected: true,
              typeConfidence: typeConfidence,
              typeConfidencePercent: confidencePercent.toString()
            })
            console.log('Auto-selected type index:', typeIndex, '(', SKU_TYPES[typeIndex].label, ') with confidence:', typeConfidence)
          } else {
            console.warn('SKU type not found in SKU_TYPES:', detectedSkuType)
          }
        } else {
          console.warn('No sku_type found in parsed_result, defaulting to index 0 (hotel)')
        }

      }

    } catch (error) {

      console.error('加载任务详情失败', error)

      this.setData({ loading: false })

    }

  },



  startPolling() {

    const timer = setInterval(async () => {

      try {

        const task = await api.getImportTask(this.data.taskId)

        const confidencePercent = task.confidence ? (task.confidence * 100).toFixed(0) : '0'

        this.setData({ task, confidencePercent })



        if (task.status === 'parsed') {

          clearInterval(this.data.pollingTimer)

          this.processExtractedFields(task.extracted_fields, task.evidence)

        } else if (task.status === 'failed') {

          clearInterval(this.data.pollingTimer)

        }

      } catch (error) {

        console.error('轮询失败', error)

      }

    }, 3000)



    this.setData({ pollingTimer: timer })

  },



  // 价格智能推导函数（对标 Web 端）
  derivePrice(type: string, extractedFields: any): { costPrice: number, salesPrice: number } {
    const num = (v: any) => {
      const n = Number(v)
      return Number.isFinite(n) ? n : undefined
    }

    if (type === 'hotel') {
      const room = (extractedFields.room_types || [])[0]
      const base = room?.pricing?.[0]?.daily_price ?? 
                   extractedFields.daily_cost_price ?? 
                   extractedFields.cost_price
      const sell = room?.pricing?.[0]?.daily_price ?? 
                   extractedFields.daily_sell_price ?? 
                   extractedFields.sell_price ?? base
      return { 
        costPrice: num(base) ?? 0, 
        salesPrice: num(sell) ?? num(base) ?? 0 
      }
    }
    
    if (type === 'car') {
      return { 
        costPrice: num(extractedFields.cost_price) ?? 0, 
        salesPrice: num(extractedFields.sell_price) ?? num(extractedFields.cost_price) ?? 0 
      }
    }
    
    if (type === 'restaurant') {
      return { 
        costPrice: num(extractedFields.per_person_price) ?? 0, 
        salesPrice: num(extractedFields.per_person_price) ?? 0 
      }
    }
    
    if (type === 'ticket') {
      return { 
        costPrice: num(extractedFields.cost_price) ?? 0, 
        salesPrice: num(extractedFields.sell_price) ?? num(extractedFields.cost_price) ?? 0 
      }
    }
    
    if (type === 'guide') {
      return { 
        costPrice: num(extractedFields.daily_cost_price) ?? 0, 
        salesPrice: num(extractedFields.daily_sell_price) ?? num(extractedFields.daily_cost_price) ?? 0 
      }
    }
    
    if (type === 'itinerary') {
      return { 
        costPrice: num(extractedFields.adult_price) ?? 0, 
        salesPrice: num(extractedFields.adult_price) ?? 0 
      }
    }
    
    // activity & default
    return { 
      costPrice: num(extractedFields.cost_price) ?? num(extractedFields.daily_cost_price) ?? 0, 
      salesPrice: num(extractedFields.sell_price) ?? num(extractedFields.cost_price) ?? 0 
    }
  },

  // 类别属性构建函数（对标 Web 端）
  buildCategoryAttributes(type: string, ef: any): any {
    const formatPrice = (priceValue: any): string | undefined => {
      if (!priceValue) return undefined
      if (typeof priceValue === 'number') return `¥${priceValue}`
      if (typeof priceValue === 'string' && !isNaN(Number(priceValue))) return `¥${priceValue}`
      if (Array.isArray(priceValue) && priceValue.length > 0) {
        const firstItem = priceValue[0]
        if (typeof firstItem === 'number') return `¥${firstItem}`
        if (typeof firstItem === 'object' && firstItem !== null) {
          const price = firstItem.price || firstItem.daily_price || firstItem.adult_price || firstItem.cost_price
          if (price !== undefined) return `¥${price}`
        }
      }
      if (typeof priceValue === 'object' && priceValue !== null && !Array.isArray(priceValue)) {
        const price = priceValue.price || priceValue.daily_price || priceValue.adult_price || priceValue.cost_price
        if (price !== undefined) return `¥${price}`
      }
      return undefined
    }

    if (type === 'hotel') {
      const room = (ef.room_types || [])[0] || {}
      return {
        bedType: room.bed_type,
        roomArea: room.room_area,
        breakfast: room.include_breakfast ? '含早' : room.include_breakfast === false ? '不含早' : undefined
      }
    }
    
    if (type === 'car') {
      return {
        vehicleType: ef.car_type,
        capacity: ef.seats,
        duration: ef.service_hours ? `${ef.service_hours}小时` : undefined,
        language: ef.driver_language
      }
    }
    
    if (type === 'activity') {
      const languageService = ef.language_service 
        ? (Array.isArray(ef.language_service) ? ef.language_service : [ef.language_service])
        : undefined
      
      return {
        duration: ef.duration_hours ? `${ef.duration_hours}小时` : 
                  (ef.days ? `${ef.days}天${ef.nights ? ef.nights + '晚' : ''}` : undefined),
        language: languageService,
        meetingPoint: ef.meeting_point,
        departCity: ef.depart_city,
        arriveCity: ef.arrive_city,
        groupSize: ef.min_pax && ef.max_pax ? `${ef.min_pax}-${ef.max_pax}人` : undefined,
        adultPrice: formatPrice(ef.adult_price),
        childPrice: formatPrice(ef.child_price)
      }
    }
    
    if (type === 'guide') {
      return {
        duration: ef.service_hours ? `${ef.service_hours}小时` : undefined,
        language: ef.languages
      }
    }
    
    if (type === 'restaurant') {
      return {
        duration: ef.booking_time_slots && ef.booking_time_slots.length ? 
                  ef.booking_time_slots.join(' / ') : undefined
      }
    }
    
    if (type === 'itinerary') {
      return {
        duration: ef.days ? `${ef.days}天${ef.nights ? ef.nights + '晚' : ''}` : undefined,
        departCity: ef.depart_city,
        arriveCity: ef.arrive_city,
        groupSize: ef.min_pax && ef.max_pax ? `${ef.min_pax}-${ef.max_pax}人` : undefined,
        itineraryType: ef.itinerary_type,
        adultPrice: formatPrice(ef.adult_price),
        childPrice: formatPrice(ef.child_price)
      }
    }
    
    if (type === 'ticket') {
      return { 
        duration: ef.valid_days ? `${ef.valid_days}天有效` : undefined 
      }
    }
    
    return {}
  },

  processExtractedFields(fields: any, evidence: any) {
    // 格式化字段值的函数
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
        // 简单数组，用顿号分隔
        return value.join('、')
      }
      if (typeof value === 'object') {
        // 对象类型，格式化显示
        return JSON.stringify(value, null, 2)
      }
      return String(value)
    }

    const fieldList = Object.keys(fields).map(key => {

      const fieldValue = fields[key]

      const displayValue = formatValue(fieldValue)

      return {

        key,

        label: FIELD_LABELS[key] || key,

        value: displayValue,

        hasEvidence: evidence && evidence[key],

        lowConfidence: false

      }

    })

    this.setData({ fieldList })
    
    // 构建结构化预览数据
    this.buildStructuredData(fields)
  },
  
  buildStructuredData(extractedFields: any) {
    const skuType = this.data.task.sku_type || SKU_TYPES[this.data.selectedTypeIndex].value
    
    // 获取价格信息
    const priceInfo = this.derivePrice(skuType, extractedFields)
    
    // 获取类别属性
    const categoryAttributes = this.buildCategoryAttributes(skuType, extractedFields)
    
    // 处理数组字段
    const toArray = (val: any) => Array.isArray(val) ? val : (val ? [val] : [])
    
    // 构建结构化数据
    const structuredData = {
      name: extractedFields.sku_name || 
            extractedFields.hotel_name || 
            extractedFields.activity_name || 
            extractedFields.restaurant_name || 
            extractedFields.itinerary_name || 
            '未命名资源',
      type: skuType,
      typeLabel: SKU_TYPES.find(t => t.value === skuType)?.label || skuType,
      location: [extractedFields.destination_country, extractedFields.destination_city]
        .filter(Boolean).join(' ') || '目的地未设置',
      
      // 价格信息
      costPrice: priceInfo.costPrice,
      salesPrice: priceInfo.salesPrice,
      profitMargin: priceInfo.salesPrice > 0 
        ? (((priceInfo.salesPrice - priceInfo.costPrice) / priceInfo.salesPrice) * 100).toFixed(1)
        : '0',
      
      // 核心信息
      description: extractedFields.description || extractedFields.set_menu_desc || '',
      highlights: toArray(extractedFields.highlights).length 
        ? toArray(extractedFields.highlights) 
        : toArray(extractedFields.facilities).slice(0, 3),
      inclusions: toArray(extractedFields.inclusions),
      exclusions: toArray(extractedFields.exclusions),
      cancellationPolicy: extractedFields.cancellation_policy || 
                         extractedFields.booking_notes || 
                         '请查看供应商说明',
      
      // 类别属性
      categoryAttributes,
      
      // 详细价格数据
      pricingDetails: {
        roomTypes: extractedFields.room_types || [],
        diningOptions: extractedFields.dining_options || [],
        conferenceRooms: extractedFields.conference_rooms || [],
        seasonDefinitions: extractedFields.season_definitions,
        specialPackages: extractedFields.special_packages || [],
        contactInfo: extractedFields.contact_info
      },
      
      // 原始数据
      rawExtracted: extractedFields
    }
    
    this.setData({ 
      structuredData,
      showStructuredPreview: true
    })
  },

  onSkuTypeChange(e: any) {

    this.setData({ selectedTypeIndex: e.detail.value })

  },



  onFieldChange(e: any) {

    const field = e.currentTarget.dataset.field

    const value = e.detail.value

    const fieldList = this.data.fieldList.map(item => {

      if (item.key === field) {

        return { ...item, value }

      }

      return item

    })

    this.setData({ fieldList })

  },



  handleShowEvidence(e: any) {

    const field = e.currentTarget.dataset.field

    const evidence = this.data.task.evidence[field] || '无依据信息'

    this.setData({

      showEvidenceModal: true,

      currentEvidence: evidence

    })

  },



  handleCloseEvidence() {

    this.setData({ showEvidenceModal: false })

  },



  stopPropagation() {},



  async handleConfirm() {

    const { taskId, selectedTypeIndex, fieldList } = this.data

    const skuType = SKU_TYPES[selectedTypeIndex].value



    const extractedFields: any = {}

    fieldList.forEach(item => {

      if (item.value) {

        extractedFields[item.key] = item.value

      }

    })



    this.setData({ confirming: true })



    try {

      const result = await api.confirmImport(taskId, skuType, extractedFields)

      

      this.setData({ 

        skuId: result.sku_id,

        confirming: false

      })



      await this.loadTaskDetail()

      

      wx.showToast({ title: '入库成功', icon: 'success' })

    } catch (error) {

      console.error('确认入库失败', error)

      this.setData({ confirming: false })

    }

  },



  handleViewSku() {

    wx.navigateTo({

      url: `/pages/sku-detail/sku-detail?skuId=${this.data.skuId}`

    })

  },



  handleBackToList() {

    wx.switchTab({ url: '/pages/skus/skus' })

  },



  handleBack() {
    wx.navigateBack()
  },
  
  toggleStructuredPreview() {
    this.setData({ showStructuredPreview: !this.data.showStructuredPreview })
  },
  
  togglePricingDetails() {
    this.setData({ showPricingDetails: !this.data.showPricingDetails })
  },
  
  toggleRawData() {
    this.setData({ showRawData: !this.data.showRawData })
  }
})

