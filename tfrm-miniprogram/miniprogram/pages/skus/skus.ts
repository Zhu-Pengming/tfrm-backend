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
    viewMode: 'grid' as 'grid' | 'list',
    isBatchMode: false,
    selectedSkus: [] as string[],
    batchMargin: 20,
    editingPriceId: null as string | null
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
    const index = parseInt(e.currentTarget.dataset.index)
    this.setData({ selectedCategoryIndex: index })
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
      
      const enrichedSkus = filteredSkus.map((sku: any) => {
        const attrs = sku.attrs || {}
        const costPrice = attrs.daily_cost_price || attrs.cost_price || attrs.per_person_price || attrs.adult_price || 0
        const salesPrice = attrs.daily_sell_price || attrs.sell_price || attrs.per_person_price || attrs.adult_price || costPrice
        const profitMargin = salesPrice > 0 ? (((salesPrice - costPrice) / salesPrice) * 100).toFixed(1) : 0
        
        const needsAttention = !sku.destination_city && !sku.destination_country || 
                              (costPrice === 0 && salesPrice === 0) || 
                              !sku.cancellation_policy && !sku.cancel_policy
        
        return {
          ...sku,
          costPrice,
          salesPrice,
          profitMargin,
          needsAttention
        }
      })
      
      this.setData({ skuList: enrichedSkus })
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

  toggleBatchMode() {
    this.setData({ 
      isBatchMode: !this.data.isBatchMode,
      selectedSkus: []
    })
  },

  cancelBatchMode() {
    this.setData({ 
      isBatchMode: false,
      selectedSkus: []
    })
  },

  toggleSkuSelection(e: any) {
    const skuId = e.currentTarget.dataset.skuId
    const { selectedSkus } = this.data
    const index = selectedSkus.indexOf(skuId)
    
    if (index > -1) {
      selectedSkus.splice(index, 1)
    } else {
      selectedSkus.push(skuId)
    }
    
    this.setData({ selectedSkus })
  },

  onMarginInput(e: any) {
    this.setData({ batchMargin: parseFloat(e.detail.value) || 0 })
  },

  async applyBatchMargin() {
    const { selectedSkus, batchMargin, skuList } = this.data
    
    if (selectedSkus.length === 0) {
      wx.showToast({
        title: '请先选择SKU',
        icon: 'none'
      })
      return
    }

    wx.showLoading({ title: '调价中...' })

    try {
      for (const skuId of selectedSkus) {
        const sku = skuList.find((s: any) => s.id === skuId)
        if (!sku) continue
        
        const newSalesPrice = Math.round(sku.costPrice / (1 - batchMargin / 100))
        
        await api.updateSku(skuId, {
          attrs: {
            ...sku.attrs,
            daily_sell_price: newSalesPrice,
            sell_price: newSalesPrice
          }
        })
      }
      
      wx.hideLoading()
      wx.showToast({
        title: '调价成功',
        icon: 'success'
      })
      
      this.setData({ 
        isBatchMode: false,
        selectedSkus: []
      })
      this.loadSkus()
    } catch (error) {
      wx.hideLoading()
      console.error('批量调价失败', error)
      wx.showToast({
        title: '调价失败',
        icon: 'error'
      })
    }
  },

  handlePriceEdit(e: any) {
    const skuId = e.currentTarget.dataset.skuId
    this.setData({ editingPriceId: skuId })
  },

  handlePriceBlur() {
    this.setData({ editingPriceId: null })
  },

  async handlePriceConfirm(e: any) {
    const skuId = e.currentTarget.dataset.skuId
    const newPrice = parseFloat(e.detail.value)
    
    if (!newPrice || newPrice <= 0) {
      wx.showToast({
        title: '价格无效',
        icon: 'none'
      })
      return
    }

    try {
      const sku = this.data.skuList.find((s: any) => s.id === skuId)
      if (!sku) return
      
      await api.updateSku(skuId, {
        attrs: {
          ...sku.attrs,
          daily_sell_price: newPrice,
          sell_price: newPrice
        }
      })
      
      wx.showToast({
        title: '价格已更新',
        icon: 'success'
      })
      
      this.setData({ editingPriceId: null })
      this.loadSkus()
    } catch (error) {
      console.error('更新价格失败', error)
      wx.showToast({
        title: '更新失败',
        icon: 'error'
      })
    }
  },

  async handleTogglePrivacy(e: any) {
    const skuId = e.currentTarget.dataset.skuId
    const sku = this.data.skuList.find((s: any) => s.id === skuId)
    if (!sku) return

    const newOwnerType = sku.owner_type === 'private' ? 'public' : 'private'
    const newVisibilityScope = newOwnerType === 'public' ? 'all' : 'private'

    try {
      await api.updateSku(skuId, {
        owner_type: newOwnerType,
        visibility_scope: newVisibilityScope
      })
      
      wx.showToast({
        title: newOwnerType === 'public' ? '已移至公共池' : '已移至私有库',
        icon: 'success'
      })
      
      this.loadSkus()
    } catch (error) {
      console.error('切换隐私状态失败', error)
      wx.showToast({
        title: '操作失败',
        icon: 'error'
      })
    }
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
  },

  async handlePublishToPublic(e: any) {
    const skuId = e.currentTarget.dataset.skuId
    const skuName = e.currentTarget.dataset.skuName
    
    const confirmed = await new Promise<boolean>((resolve) => {
      wx.showModal({
        title: '发布到公共库',
        content: `确定将「${skuName}」发布到公共库？发布后其他机构可以看到此资源并申请合作。`,
        confirmText: '发布',
        success: (res) => resolve(res.confirm)
      })
    })

    if (!confirmed) return

    try {
      wx.showLoading({ title: '发布中...' })
      await api.publishSkuToPublic(skuId)
      wx.hideLoading()
      wx.showToast({
        title: '发布成功',
        icon: 'success'
      })
      this.loadSkus()
    } catch (error) {
      wx.hideLoading()
      console.error('发布失败', error)
      wx.showToast({
        title: '发布失败',
        icon: 'none'
      })
    }
  },

  async handleUnpublish(e: any) {
    const skuId = e.currentTarget.dataset.skuId
    const skuName = e.currentTarget.dataset.skuName
    
    const confirmed = await new Promise<boolean>((resolve) => {
      wx.showModal({
        title: '取消发布',
        content: `确定取消发布「${skuName}」？取消后其他机构将无法看到此资源。`,
        confirmText: '取消发布',
        success: (res) => resolve(res.confirm)
      })
    })

    if (!confirmed) return

    try {
      wx.showLoading({ title: '处理中...' })
      await api.unpublishSku(skuId)
      wx.hideLoading()
      wx.showToast({
        title: '已取消发布',
        icon: 'success'
      })
      this.loadSkus()
    } catch (error) {
      wx.hideLoading()
      console.error('取消发布失败', error)
      wx.showToast({
        title: '操作失败',
        icon: 'none'
      })
    }
  },

  async handleRemoveFromPrivate(e: any) {
    const skuId = e.currentTarget.dataset.skuId
    const skuName = e.currentTarget.dataset.skuName
    
    const confirmed = await new Promise<boolean>((resolve) => {
      wx.showModal({
        title: '移出私有库',
        content: `确定将「${skuName}」移出私有库？移出后此资源将不再显示在私有库中，但仍可在公共库查看。`,
        confirmText: '移出',
        success: (res) => resolve(res.confirm)
      })
    })

    if (!confirmed) return

    try {
      wx.showLoading({ title: '处理中...' })
      await api.removeSkuFromPrivate(skuId)
      wx.hideLoading()
      wx.showToast({
        title: '已移出',
        icon: 'success'
      })
      this.loadSkus()
    } catch (error) {
      wx.hideLoading()
      console.error('移出失败', error)
      wx.showToast({
        title: '操作失败',
        icon: 'none'
      })
    }
  },

  handleMoreActions(e: any) {
    const sku = e.currentTarget.dataset.sku
    const isFromCooperation = sku.is_from_cooperation
    const isPublished = sku.is_published
    
    const itemList: string[] = []
    
    if (!isFromCooperation) {
      if (!isPublished) {
        itemList.push('发布到公共库')
      } else {
        itemList.push('取消发布')
      }
    }
    
    if (isFromCooperation) {
      itemList.push('移出私有库')
    }
    
    itemList.push('编辑')
    itemList.push('删除')
    
    wx.showActionSheet({
      itemList,
      success: (res) => {
        const action = itemList[res.tapIndex]
        
        if (action === '发布到公共库') {
          this.handlePublishToPublic({ currentTarget: { dataset: { skuId: sku.id, skuName: sku.sku_name } } })
        } else if (action === '取消发布') {
          this.handleUnpublish({ currentTarget: { dataset: { skuId: sku.id, skuName: sku.sku_name } } })
        } else if (action === '移出私有库') {
          this.handleRemoveFromPrivate({ currentTarget: { dataset: { skuId: sku.id, skuName: sku.sku_name } } })
        } else if (action === '编辑') {
          this.handleEditSku({ currentTarget: { dataset: { sku } } })
        } else if (action === '删除') {
          this.handleDeleteSku({ currentTarget: { dataset: { skuId: sku.id } } })
        }
      }
    })
  }
})
