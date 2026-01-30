import api from '../../utils/api'
import storage from '../../utils/storage'

const TYPE_LABELS: any = {
  hotel: '酒店',
  ticket: '门票',
  guide: '导游',
  transport: '用车'
}

const STATUS_LABELS: any = {
  active: '可用',
  inactive: '停用',
  archived: '已归档'
}

const ATTR_LABELS: any = {
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
    skuId: '',
    sku: {} as any,
    loading: true,
    typeLabels: TYPE_LABELS,
    statusLabels: STATUS_LABELS,
    attrsList: [] as any[]
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
      
      const attrsList = Object.keys(sku.attrs || {}).map(key => ({
        key,
        label: ATTR_LABELS[key] || key,
        value: sku.attrs[key]
      }))
      
      this.setData({ sku, attrsList, loading: false })
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
      icon: 'success'
    })
  }
})
