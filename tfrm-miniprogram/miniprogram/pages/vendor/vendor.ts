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
    editingVendorId: '',
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

  handleEditVendor(e: any) {
    const vendorId = e.currentTarget.dataset.vendorId
    console.log('Edit vendor clicked:', vendorId)
    const url = `/pages/vendor-edit/vendor-edit?vendorId=${vendorId}`
    console.log('Navigating to:', url)
    wx.navigateTo({
      url: url,
      success: () => {
        console.log('Navigation success')
      },
      fail: (err) => {
        console.error('Navigation failed:', err)
      }
    })
  },

  handleDeleteVendor(e: any) {
    const vendorId = e.currentTarget.dataset.vendorId
    const vendor = this.data.vendorList.find((v: any) => v.id === vendorId)
    
    console.log('Delete vendor:', vendorId, vendor?.name)
    
    wx.showModal({
      title: '删除供应商',
      content: `确定要删除供应商"${vendor?.name}"吗？此操作无法撤销。`,
      confirmText: '删除',
      confirmColor: '#DC2626',
      success: async (res) => {
        if (res.confirm) {
          try {
            console.log('Deleting vendor:', vendorId)
            await api.deleteVendor(vendorId)
            wx.showToast({
              title: '删除成功',
              icon: 'success'
            })
            this.loadVendors()
          } catch (error) {
            console.error('删除供应商失败', error)
            wx.showToast({
              title: '删除失败',
              icon: 'none'
            })
          }
        }
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

  preventClose() {
    // This handler prevents the modal from closing when clicking inside it
  },

  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  },

  handleNameInput(e: any) {
    const { formData } = this.data
    formData.name = e.detail.value
    this.setData({ formData })
  },

  handleContactInput(e: any) {
    const { formData } = this.data
    formData.contact = e.detail.value
    this.setData({ formData })
  },

  handlePhoneInput(e: any) {
    const { formData } = this.data
    formData.phone = e.detail.value
    this.setData({ formData })
  },

  handleEmailInput(e: any) {
    const { formData } = this.data
    formData.email = e.detail.value
    this.setData({ formData })
  },

  handleAddressInput(e: any) {
    const { formData } = this.data
    formData.address = e.detail.value
    this.setData({ formData })
  },

  toggleCategory(e: any) {
    const category = e.currentTarget.dataset.category
    const { formData } = this.data
    const currentCategories = [...formData.category]
    const index = currentCategories.indexOf(category)
    
    if (index > -1) {
      currentCategories.splice(index, 1)
    } else {
      currentCategories.push(category)
    }
    
    console.log('Category toggled:', category, 'New categories:', currentCategories)
    this.setData({ 
      'formData.category': currentCategories
    })
  },

  async handleSubmitVendor() {
    const { formData, editingVendorId } = this.data
    
    console.log('Form Data:', JSON.stringify(formData))
    
    if (!formData.name || !formData.contact || !formData.phone || !formData.email) {
      wx.showToast({
        title: '请填写必填项',
        icon: 'none'
      })
      return
    }

    if (!this.isValidEmail(formData.email)) {
      wx.showToast({
        title: '邮箱格式不正确',
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
      const payload = {
        name: formData.name,
        contact: formData.contact,
        phone: formData.phone,
        email: formData.email,
        category: formData.category,
        address: formData.address || undefined
      }
      
      console.log('Submitting vendor:', JSON.stringify(payload))
      
      if (editingVendorId) {
        await api.updateVendor(editingVendorId, payload)
        wx.showToast({
          title: '更新成功',
          icon: 'success'
        })
      } else {
        await api.createVendor(payload)
        wx.showToast({
          title: '添加成功',
          icon: 'success'
        })
      }

      this.hideAddModal()
      this.loadVendors()
    } catch (error) {
      console.error('操作失败', error)
      wx.showToast({
        title: '操作失败',
        icon: 'none'
      })
    }
  }
})
