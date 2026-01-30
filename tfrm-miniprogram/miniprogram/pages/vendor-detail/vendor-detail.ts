import api from '../../utils/api'

Page({
  data: {
    vendor: null as any,
    vendorId: '',
    notes: ''
  },

  onLoad(options: any) {
    const vendorId = options.vendorId
    if (vendorId) {
      this.setData({ vendorId })
      this.loadVendorDetail(vendorId)
      this.loadNotes(vendorId)
    }
  },

  async loadVendorDetail(vendorId: string) {
    try {
      const vendor = await api.getVendor(vendorId)
      this.setData({ vendor })
    } catch (error) {
      console.error('加载供应商详情失败', error)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }
  },

  loadNotes(vendorId: string) {
    try {
      const notesData = wx.getStorageSync('vendor_notes') || {}
      const notes = notesData[vendorId] || ''
      this.setData({ notes })
    } catch (error) {
      console.error('加载备注失败', error)
    }
  },

  onNotesInput(e: any) {
    this.setData({ notes: e.detail.value })
  },

  handleSaveNotes() {
    const { vendorId, notes } = this.data
    try {
      const notesData = wx.getStorageSync('vendor_notes') || {}
      notesData[vendorId] = notes
      wx.setStorageSync('vendor_notes', notesData)
      wx.showToast({
        title: '备注已保存',
        icon: 'success'
      })
    } catch (error) {
      console.error('保存备注失败', error)
      wx.showToast({
        title: '保存失败',
        icon: 'none'
      })
    }
  },

  handleCopyPhone() {
    const { vendor } = this.data
    if (vendor && vendor.phone) {
      wx.setClipboardData({
        data: vendor.phone,
        success: () => {
          wx.showToast({
            title: '已复制电话',
            icon: 'success'
          })
        }
      })
    }
  },

  handleEdit() {
    wx.showToast({
      title: '编辑功能开发中',
      icon: 'none'
    })
  },

  async handleDelete() {
    const { vendor } = this.data
    if (!vendor) return

    const confirmed = await new Promise<boolean>((resolve) => {
      wx.showModal({
        title: '确认删除',
        content: `确定要删除供应商"${vendor.name}"吗？此操作无法撤销。`,
        confirmText: '删除',
        confirmColor: '#DC2626',
        success: (res) => resolve(res.confirm)
      })
    })

    if (!confirmed) return

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
})
