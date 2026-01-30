import api from '../../utils/api'
import storage from '../../utils/storage'

const STATUS_LABELS: any = {
  draft: '草稿',
  published: '已发布',
  archived: '已归档'
}

Page({
  data: {
    basketItems: [] as any[],
    quotationList: [] as any[],
    loading: false,
    statusLabels: STATUS_LABELS
  },

  onShow() {
    this.loadBasket()
    this.loadQuotations()
  },

  loadBasket() {
    const basketItems = storage.getQuotationBasket()
    this.setData({ basketItems })
  },

  handleIncreaseQty(e: any) {
    const index = e.currentTarget.dataset.index
    const basketItems = this.data.basketItems
    basketItems[index].quantity += 1
    storage.saveQuotationBasket(basketItems)
    this.setData({ basketItems })
  },

  handleDecreaseQty(e: any) {
    const index = e.currentTarget.dataset.index
    const basketItems = this.data.basketItems
    if (basketItems[index].quantity > 1) {
      basketItems[index].quantity -= 1
      storage.saveQuotationBasket(basketItems)
      this.setData({ basketItems })
    }
  },

  handleRemoveItem(e: any) {
    const index = e.currentTarget.dataset.index
    const basketItems = this.data.basketItems
    basketItems.splice(index, 1)
    storage.saveQuotationBasket(basketItems)
    this.setData({ basketItems })
  },

  handleClearBasket() {
    wx.showModal({
      title: '确认清空',
      content: '确定要清空报价篮吗？',
      success: (res) => {
        if (res.confirm) {
          storage.clearBasket()
          this.setData({ basketItems: [] })
        }
      }
    })
  },

  handleCreateQuotation() {
    const { basketItems } = this.data
    
    if (basketItems.length === 0) {
      wx.showToast({ title: '报价篮为空', icon: 'none' })
      return
    }

    wx.navigateTo({
      url: '/pages/quotation-edit/quotation-edit?mode=create'
    })
  },

  async loadQuotations() {
    this.setData({ loading: true })

    try {
      const quotations = await api.listQuotations(20, 0)
      this.setData({ quotationList: quotations })
    } catch (error) {
      console.error('加载报价单列表失败', error)
    } finally {
      this.setData({ loading: false })
    }
  },

  handleViewQuotation(e: any) {
    const quotationId = e.currentTarget.dataset.quotationId
    wx.navigateTo({
      url: `/pages/quotation-edit/quotation-edit?quotationId=${quotationId}&mode=view`
    })
  },

  handleEditQuotation(e: any) {
    const quotationId = e.currentTarget.dataset.quotationId
    wx.navigateTo({
      url: `/pages/quotation-edit/quotation-edit?quotationId=${quotationId}&mode=edit`
    })
  },

  async handlePublishQuotation(e: any) {
    const quotationId = e.currentTarget.dataset.quotationId
    
    wx.showModal({
      title: '确认发布',
      content: '发布后将生成分享链接，确定要发布吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            const result = await api.publishQuotation(quotationId)
            wx.showToast({ title: '发布成功', icon: 'success' })
            
            setTimeout(() => {
              wx.navigateTo({
                url: `/pages/publish-success/publish-success?quotationId=${quotationId}&shareUrl=${encodeURIComponent(result.url)}`
              })
            }, 1000)
          } catch (error) {
            console.error('发布失败', error)
          }
        }
      }
    })
  },

  handleShareQuotation(e: any) {
    const quotationId = e.currentTarget.dataset.quotationId
    const shareUrl = `/share/quotation/${quotationId}`
    
    wx.navigateTo({
      url: `/pages/publish-success/publish-success?quotationId=${quotationId}&shareUrl=${encodeURIComponent(shareUrl)}`
    })
  }
})
