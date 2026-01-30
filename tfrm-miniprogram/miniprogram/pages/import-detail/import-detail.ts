import api from '../../utils/api'



const SKU_TYPES = [

  { value: 'hotel', label: '酒店' },

  { value: 'ticket', label: '门票' },

  { value: 'guide', label: '导游' },

  { value: 'transport', label: '用车' }

]



const FIELD_LABELS: any = {

  sku_name: '资源名称',

  destination_city: '目的地城市',

  destination_country: '目的地国家',

  hotel_name: '酒店名称',

  room_type_name: '房型',

  daily_sell_price: '销售价',

  daily_cost_price: '成本价',

  address: '地址',

  attraction_name: '景点名称',

  ticket_type: '票种',

  guide_name: '导游姓名',

  language: '语言',

  vehicle_type: '车型',

  capacity: '载客量'

}



Page({

  data: {

    taskId: '',

    task: {} as any,

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

    const fieldList = Object.keys(fields).map(key => {

      const fieldValue = fields[key]

      let displayValue = ''

      if (fieldValue === null || fieldValue === undefined) {

        displayValue = ''

      } else if (typeof fieldValue === 'object') {

        displayValue = JSON.stringify(fieldValue, null, 2)

      } else {

        displayValue = String(fieldValue)

      }

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

