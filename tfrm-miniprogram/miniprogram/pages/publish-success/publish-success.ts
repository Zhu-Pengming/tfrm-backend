Page({
  data: {
    quotationId: '',
    shareUrl: '',
    fullShareUrl: ''
  },

  onLoad(options: any) {
    const quotationId = options.quotationId || ''
    const shareUrl = decodeURIComponent(options.shareUrl || '')
    
    const env = require('../../config/env').default
    const fullShareUrl = shareUrl.startsWith('http') ? shareUrl : `${env.apiBaseUrl}${shareUrl}`

    this.setData({
      quotationId,
      shareUrl,
      fullShareUrl
    })
  },

  handleCopyUrl() {
    const { fullShareUrl } = this.data
    
    wx.setClipboardData({
      data: fullShareUrl,
      success: () => {
        wx.showToast({
          title: '链接已复制',
          icon: 'success'
        })
      }
    })
  },

  handleViewQuotation() {
    const { quotationId } = this.data
    wx.redirectTo({
      url: `/pages/quotation-edit/quotation-edit?quotationId=${quotationId}&mode=view`
    })
  },

  handleBackToList() {
    wx.switchTab({
      url: '/pages/quotation/quotation'
    })
  }
})
