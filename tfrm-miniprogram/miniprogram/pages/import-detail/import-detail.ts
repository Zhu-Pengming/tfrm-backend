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

  supplier_name: '供应商',

  // 餐厅相关

  restaurant_name: '餐厅名称',

  cuisine_type: '菜系',

  meal_types: '餐型',

  per_person_price: '人均价格',

  // 活动相关

  activity_name: '活动名称',

  category: '类别',

  duration_hours: '时长',

  meeting_point: '集合地点',

  included_items: '包含项目'

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

    confidencePercent: '0'

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

        if (task.parsed_result && task.parsed_result.sku_type) {

          const skuType = task.parsed_result.sku_type

          const typeIndex = SKU_TYPES.findIndex(t => t.value === skuType)

          if (typeIndex >= 0) {

            this.setData({ selectedTypeIndex: typeIndex })

          }

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

  }

})

