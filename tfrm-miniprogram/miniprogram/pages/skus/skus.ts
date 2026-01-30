import api from '../../utils/api'
import storage from '../../utils/storage'

const CATEGORIES = [
  { value: '', label: '全部类型', icon: '🏛️' },
  { value: 'hotel', label: '酒店', icon: '🏨' },
  { value: 'car', label: '用车', icon: '🚗' },
  { value: 'ticket', label: '门票', icon: '🎫' },
  { value: 'guide', label: '导游', icon: '🧑‍✈️' },
  { value: 'restaurant', label: '餐饮', icon: '🍽️' },
  { value: 'activity', label: '活动', icon: '⛷️' },
  { value: 'itinerary', label: '路线', icon: '🗺️' }
]

const TYPE_LABELS: any = {
  hotel: '酒店',
  car: '用车',
  ticket: '门票',
  guide: '导游',
  restaurant: '餐饮',
  activity: '活动',
  itinerary: '路线'
}

Page({
  data: {
    keyword: '',
    categories: CATEGORIES,
    selectedCategoryIndex: 0,
    typeLabels: TYPE_LABELS,
    skuList: [] as any[],
    loading: false,
    basketCount: 0,
    isPrivate: true,
    viewMode: 'grid' as 'grid' | 'list'
  },

  onShow() {
    this.loadSkus()
    this.updateBasketCount()
  },

  updateBasketCount() {
    const count = storage.getBasketCount()
    this.setData({ basketCount: count })
    
    const app = getApp<IAppOption>()
    app.globalData.basketCount = count
  },

  onKeywordInput(e: any) {
    this.setData({ keyword: e.detail.value })
  },

  onCategoryChange(e: any) {
    this.setData({ selectedCategoryIndex: e.detail.value })
    this.loadSkus()
  },

  toggleLibrary() {
    this.setData({ isPrivate: !this.data.isPrivate })
    this.loadSkus()
  },

  switchViewMode(e: any) {
    const mode = e.currentTarget.dataset.mode
    this.setData({ viewMode: mode })
  },

  handleSearch() {
    this.loadSkus()
  },

  async loadSkus() {
    const { keyword, selectedCategoryIndex, categories, isPrivate } = this.data
    
    const params: any = {
      limit: 100,
      offset: 0
    }
    
    if (keyword) {
      params.keyword = keyword
    }
    
    if (selectedCategoryIndex > 0) {
      params.sku_type = categories[selectedCategoryIndex].value
    }

    this.setData({ loading: true })

    try {
      const skus = await api.listSkus(params)
      const filteredSkus = skus.filter((sku: any) => {
        const skuIsPrivate = sku.owner_type === 'private'
        return skuIsPrivate === isPrivate
      })
      this.setData({ skuList: filteredSkus })
    } catch (error) {
      console.error('加载SKU列表失败', error)
    } finally {
      this.setData({ loading: false })
    }
  },

  handleViewDetail(e: any) {
    const skuId = e.currentTarget.dataset.skuId
    wx.navigateTo({
      url: `/pages/sku-detail/sku-detail?skuId=${skuId}`
    })
  },

  handleAddToBasket(e: any) {
    const sku = e.currentTarget.dataset.sku
    
    const count = storage.addToBasket({
      sku_id: sku.id,
      sku_name: sku.sku_name,
      quantity: 1
    })
    
    this.updateBasketCount()
    
    wx.showToast({
      title: `已加入报价篮 (${count})`,
      icon: 'success'
    })
  },

  handleViewBasket() {
    wx.switchTab({ url: '/pages/quotation/quotation' })
  },

  handleEditSku(e: any) {
    const sku = e.currentTarget.dataset.sku
    wx.navigateTo({
      url: `/pages/sku-detail/sku-detail?skuId=${sku.id}&mode=edit`
    })
  },

  async handleDeleteSku(e: any) {
    const skuId = e.currentTarget.dataset.skuId
    
    const confirmed = await new Promise<boolean>((resolve) => {
      wx.showModal({
        title: '确认删除',
        content: '确定要删除这个资源吗？删除后无法恢复。',
        confirmText: '删除',
        confirmColor: '#DC2626',
        success: (res) => resolve(res.confirm)
      })
    })

    if (!confirmed) return

    try {
      await api.deleteSku(skuId)
      wx.showToast({
        title: '删除成功',
        icon: 'success'
      })
      this.loadSkus()
    } catch (error) {
      console.error('删除SKU失败', error)
      wx.showToast({
        title: '删除失败',
        icon: 'error'
      })
    }
  }
})
