import apiService from '../../utils/api'

interface SKU {
  id: string
  sku_name: string
  sku_type: string
  destination_city?: string
  destination_country?: string
  agency_id: string
  agency_name?: string
  tags?: string[]
  sell_price?: number
  cost_price?: number
  cooperation_status?: string
}

Page({
  data: {
    skuList: [] as SKU[],
    searchKeyword: '',
    selectedCategory: '',
    selectedCity: '',
    categoryIndex: 0,
    cityIndex: 0,
    categoryOptions: ['全部', '酒店', '用车', '门票', '导游', '餐饮', '活动', '线路'],
    cityOptions: ['全部', '清迈', '曼谷', '普吉', '芭提雅', '苏梅岛', '华欣'],
    typeMap: {
      'hotel': '酒店',
      'car': '用车',
      'ticket': '门票',
      'guide': '导游',
      'restaurant': '餐饮',
      'activity': '活动',
      'itinerary': '线路'
    } as Record<string, string>,
    page: 1,
    pageSize: 20,
    loading: false,
    hasMore: true
  },

  onLoad() {
    this.loadPublicSKUs(true)
  },

  onShow() {
    // 每次显示页面时刷新数据（可能有新的合作状态）
    this.loadPublicSKUs(true)
  },

  async loadPublicSKUs(reset: boolean = false) {
    if (this.data.loading) return
    
    this.setData({ loading: true })
    
    try {
      const params: any = {
        limit: this.data.pageSize,
        offset: reset ? 0 : (this.data.page - 1) * this.data.pageSize
      }
      
      if (this.data.searchKeyword) {
        params.keyword = this.data.searchKeyword
      }
      
      if (this.data.selectedCategory) {
        // 将中文类型转换为英文
        const typeMap: Record<string, string> = {
          '酒店': 'hotel',
          '用车': 'car',
          '门票': 'ticket',
          '导游': 'guide',
          '餐饮': 'restaurant',
          '活动': 'activity',
          '线路': 'itinerary'
        }
        params.sku_type = typeMap[this.data.selectedCategory] || this.data.selectedCategory
      }
      
      if (this.data.selectedCity) {
        params.city = this.data.selectedCity
      }
      
      const response = await apiService.listPublicSkus(params)
      
      this.setData({
        skuList: reset ? response : [...this.data.skuList, ...response],
        page: reset ? 2 : this.data.page + 1,
        hasMore: response.length === this.data.pageSize,
        loading: false
      })
    } catch (error) {
      console.error('加载公共库失败:', error)
      wx.showToast({ title: '加载失败', icon: 'none' })
      this.setData({ loading: false })
    }
  },

  onSearchInput(e: any) {
    this.setData({ searchKeyword: e.detail.value })
  },

  onSearch() {
    this.setData({ page: 1 })
    this.loadPublicSKUs(true)
  },

  onClearSearch() {
    this.setData({ searchKeyword: '', page: 1 })
    this.loadPublicSKUs(true)
  },

  onCategoryChange(e: any) {
    const index = e.detail.value
    const category = this.data.categoryOptions[index]
    this.setData({ 
      categoryIndex: index,
      selectedCategory: category === '全部' ? '' : category,
      page: 1
    })
    this.loadPublicSKUs(true)
  },

  onCityChange(e: any) {
    const index = e.detail.value
    const city = this.data.cityOptions[index]
    this.setData({ 
      cityIndex: index,
      selectedCity: city === '全部' ? '' : city,
      page: 1
    })
    this.loadPublicSKUs(true)
  },

  onSKUTap(e: any) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/sku-detail/sku-detail?id=${id}&source=public`
    })
  },

  onApplyCooperation(e: any) {
    const agencyId = e.currentTarget.dataset.agencyId
    const agencyName = e.currentTarget.dataset.agencyName
    
    wx.showModal({
      title: `申请与 ${agencyName} 合作`,
      editable: true,
      placeholderText: '请输入申请说明（可选）',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '提交中...' })
            
            await apiService.applyCooperation({
              to_agency_id: agencyId,
              request_message: res.content || ''
            })
            
            wx.hideLoading()
            wx.showToast({ title: '申请已发送', icon: 'success' })
            
            // 刷新列表
            setTimeout(() => {
              this.loadPublicSKUs(true)
            }, 1500)
          } catch (error) {
            wx.hideLoading()
            console.error('申请合作失败:', error)
            wx.showToast({ title: '申请失败', icon: 'none' })
          }
        }
      }
    })
  },

  async onCopySKU(e: any) {
    const id = e.currentTarget.dataset.id
    const name = e.currentTarget.dataset.name
    
    wx.showModal({
      title: '确认复制',
      content: `将「${name}」复制到私有库？`,
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '复制中...' })
            
            await apiService.copyPublicSkuToPrivate(id)
            
            wx.hideLoading()
            wx.showToast({ title: '复制成功', icon: 'success' })
            
            // 提示用户可以在私有库查看
            setTimeout(() => {
              wx.showModal({
                title: '提示',
                content: '已复制到私有库，是否立即查看？',
                success: (modalRes) => {
                  if (modalRes.confirm) {
                    wx.switchTab({ url: '/pages/skus/skus' })
                  }
                }
              })
            }, 1500)
          } catch (error) {
            wx.hideLoading()
            console.error('复制失败:', error)
            wx.showToast({ title: '复制失败', icon: 'none' })
          }
        }
      }
    })
  },

  loadMore() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadPublicSKUs(false)
    }
  },

  stopPropagation() {
    // 阻止事件冒泡
  }
})
