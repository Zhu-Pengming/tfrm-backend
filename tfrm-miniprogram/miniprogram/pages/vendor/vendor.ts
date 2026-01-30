import api from '../../utils/api'

const CATEGORIES = [
  { value: '', label: '全部类型', icon: '🏛️' },
  { value: 'Hotel', label: '酒店', icon: '🏨' },
  { value: 'Transport', label: '用车', icon: '🚗' },
  { value: 'Ticket', label: '门票', icon: '🎫' },
  { value: 'Guide', label: '导游', icon: '🧑‍✈️' },
  { value: 'Catering', label: '餐饮', icon: '🍽️' },
  { value: 'Activity', label: '活动', icon: '⛷️' },
  { value: 'Route', label: '路线', icon: '🗺️' }
]

Page({
  data: {
    keyword: '',
    categories: CATEGORIES,
    selectedCategoryIndex: 0,
    vendorList: [] as any[],
    loading: false,
    showAddModal: false,
    formData: {
      name: '',
      contact: '',
      phone: '',
      email: '',
      category: [] as string[],
      address: ''
    }
  },

  onShow() {
    this.loadVendors()
  },

  onKeywordInput(e: any) {
    this.setData({ keyword: e.detail.value })
  },

  onCategoryChange(e: any) {
    const index = parseInt(e.currentTarget.dataset.index)
    this.setData({ selectedCategoryIndex: index })
    this.loadVendors()
  },

  handleSearch() {
    this.loadVendors()
  },

  async loadVendors() {
    const { keyword, selectedCategoryIndex, categories } = this.data
    
    const params: any = {
      limit: 100,
      offset: 0
    }
    
    if (keyword) {
      params.keyword = keyword
    }
    
    if (selectedCategoryIndex > 0) {
      params.category = categories[selectedCategoryIndex].value
    }

    this.setData({ loading: true })

    try {
      const vendors = await api.listVendors(params)
      this.setData({ vendorList: vendors })
    } catch (error) {
      console.error('加载供应商列表失败', error)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    } finally {
      this.setData({ loading: false })
    }
  },

  handleViewDetail(e: any) {
    const vendorId = e.currentTarget.dataset.vendorId
    wx.navigateTo({
      url: `/pages/vendor-detail/vendor-detail?vendorId=${vendorId}`
    })
  },

  handleCopyPhone(e: any) {
    const phone = e.currentTarget.dataset.phone
    wx.setClipboardData({
      data: phone,
      success: () => {
        wx.showToast({
          title: '已复制电话',
          icon: 'success'
        })
      }
    })
  },

  showAddVendorModal() {
    this.setData({ 
      showAddModal: true,
      formData: {
        name: '',
        contact: '',
        phone: '',
        email: '',
        category: [],
        address: ''
      }
    })
  },

  hideAddModal() {
    this.setData({ showAddModal: false })
  },

  onFormInput(e: any) {
    const field = e.currentTarget.dataset.field
    this.setData({
      [`formData.${field}`]: e.detail.value
    })
  },

  toggleCategory(e: any) {
    const category = e.currentTarget.dataset.category
    const { formData } = this.data
    const index = formData.category.indexOf(category)
    
    if (index > -1) {
      formData.category.splice(index, 1)
    } else {
      formData.category.push(category)
    }
    
    this.setData({ formData })
  },

  async handleSubmitVendor() {
    const { formData } = this.data
    
    if (!formData.name || !formData.contact || !formData.phone || !formData.email) {
      wx.showToast({
        title: '请填写必填项',
        icon: 'none'
      })
      return
    }

    if (formData.category.length === 0) {
      wx.showToast({
        title: '请选择服务类别',
        icon: 'none'
      })
      return
    }

    try {
      await api.createVendor({
        name: formData.name,
        contact: formData.contact,
        phone: formData.phone,
        email: formData.email,
        category: formData.category,
        address: formData.address || undefined
      })

      wx.showToast({
        title: '添加成功',
        icon: 'success'
      })

      this.hideAddModal()
      this.loadVendors()
    } catch (error) {
      console.error('添加供应商失败', error)
      wx.showToast({
        title: '添加失败',
        icon: 'none'
      })
    }
  }
})
