import api from '../../utils/api'

const CATEGORIES = [
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
    vendorId: '',
    vendor: null as any,
    categories: CATEGORIES,
    loading: false,
    name: '',
    contact: '',
    phone: '',
    email: '',
    category: [] as string[],
    address: ''
  },

  onLoad(options: any) {
    const vendorId = options.vendorId
    if (vendorId) {
      this.setData({ vendorId })
      this.loadVendorDetail(vendorId)
    }
  },

  async loadVendorDetail(vendorId: string) {
    this.setData({ loading: true })
    try {
      console.log('Loading vendor:', vendorId)
      const vendor = await api.getVendor(vendorId)
      console.log('Loaded vendor data:', JSON.stringify(vendor))
      
      const updateData = {
        vendor,
        name: vendor.name || '',
        contact: vendor.contact || '',
        phone: vendor.phone || '',
        email: vendor.email || '',
        category: vendor.category || [],
        address: vendor.address || '',
        loading: false
      }
      console.log('Setting data:', JSON.stringify(updateData))
      this.setData(updateData)
    } catch (error) {
      console.error('加载供应商详情失败:', error)
      this.setData({ loading: false })
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }
  },

  handleNameInput(e: any) {
    this.setData({ name: e.detail.value })
  },

  handleContactInput(e: any) {
    this.setData({ contact: e.detail.value })
  },

  handlePhoneInput(e: any) {
    this.setData({ phone: e.detail.value })
  },

  handleEmailInput(e: any) {
    this.setData({ email: e.detail.value })
  },

  handleAddressInput(e: any) {
    this.setData({ address: e.detail.value })
  },

  toggleCategory(e: any) {
    const category = e.currentTarget.dataset.category
    const { category: currentCategories } = this.data
    const newCategories = [...currentCategories]
    const index = newCategories.indexOf(category)
    
    if (index > -1) {
      newCategories.splice(index, 1)
    } else {
      newCategories.push(category)
    }
    
    this.setData({ category: newCategories })
  },

  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  },

  async handleSubmit() {
    const { name, contact, phone, email, category, address, vendorId } = this.data
    
    if (!name || !contact || !phone || !email) {
      wx.showToast({
        title: '请填写必填项',
        icon: 'none'
      })
      return
    }

    if (!this.isValidEmail(email)) {
      wx.showToast({
        title: '邮箱格式不正确',
        icon: 'none'
      })
      return
    }

    if (category.length === 0) {
      wx.showToast({
        title: '请选择服务类别',
        icon: 'none'
      })
      return
    }

    try {
      const payload = {
        name,
        contact,
        phone,
        email,
        category,
        address: address || undefined
      }
      
      console.log('Updating vendor:', vendorId, JSON.stringify(payload))
      await api.updateVendor(vendorId, payload)

      wx.showToast({
        title: '更新成功',
        icon: 'success'
      })

      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    } catch (error) {
      console.error('更新供应商失败', error)
      wx.showToast({
        title: '更新失败',
        icon: 'none'
      })
    }
  },

  async handleDelete() {
    const { vendor } = this.data
    if (!vendor) return

    wx.showModal({
      title: '删除供应商',
      content: `确定要删除供应商"${vendor.name}"吗？此操作无法撤销。`,
      confirmText: '删除',
      confirmColor: '#DC2626',
      success: async (res) => {
        if (res.confirm) {
          try {
            await api.deleteVendor(vendor.id)
            wx.showToast({
              title: '删除成功',
              icon: 'success'
            })
            setTimeout(() => {
              wx.navigateBack()
            }, 1500)
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
  }
})
