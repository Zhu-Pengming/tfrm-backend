import api from '../../utils/api'
import storage from '../../utils/storage'

Page({
  data: {
    mode: 'create',
    quotationId: '',
    quotation: {} as any,
    formData: {
      title: '',
      customer_name: '',
      customer_contact: ''
    },
    items: [] as any[],
    totalAmount: 0,
    loading: false,
    saving: false
  },

  onLoad(options: any) {
    const mode = options.mode || 'create'
    const quotationId = options.quotationId

    this.setData({ mode, quotationId })

    if (mode === 'create') {
      this.loadFromBasket()
    } else if (quotationId) {
      this.loadQuotation(quotationId)
    }
  },

  loadFromBasket() {
    const basketItems = storage.getQuotationBasket()
    this.setData({ items: basketItems })
    this.calculateTotal()
  },

  async loadQuotation(quotationId: string) {
    this.setData({ loading: true })

    try {
      const quotation = await api.getQuotation(quotationId)
      
      this.setData({
        quotation,
        formData: {
          title: quotation.title,
          customer_name: quotation.customer_name || '',
          customer_contact: quotation.customer_contact || ''
        },
        items: quotation.items.map((item: any) => ({
          sku_id: item.sku_id,
          sku_name: item.snapshot?.item_name || 'Unknown',
          quantity: item.quantity,
          unit_price: item.unit_price,
          subtotal: item.subtotal
        })),
        totalAmount: quotation.total_amount
      })
    } catch (error) {
      console.error('加载报价单失败', error)
    } finally {
      this.setData({ loading: false })
    }
  },

  onTitleInput(e: any) {
    this.setData({
      'formData.title': e.detail.value
    })
  },

  onCustomerNameInput(e: any) {
    this.setData({
      'formData.customer_name': e.detail.value
    })
  },

  onCustomerContactInput(e: any) {
    this.setData({
      'formData.customer_contact': e.detail.value
    })
  },

  handleIncreaseQty(e: any) {
    const index = e.currentTarget.dataset.index
    const items = this.data.items
    items[index].quantity += 1
    this.setData({ items })
    this.calculateTotal()
  },

  handleDecreaseQty(e: any) {
    const index = e.currentTarget.dataset.index
    const items = this.data.items
    if (items[index].quantity > 1) {
      items[index].quantity -= 1
      this.setData({ items })
      this.calculateTotal()
    }
  },

  handleRemoveItem(e: any) {
    const index = e.currentTarget.dataset.index
    const items = this.data.items
    items.splice(index, 1)
    this.setData({ items })
    this.calculateTotal()
  },

  calculateTotal() {
    const items = this.data.items
    const total = items.reduce((sum, item) => {
      return sum + (item.unit_price || 0) * item.quantity
    }, 0)
    this.setData({ totalAmount: total })
  },

  async handleSave() {
    const { formData, items, mode, quotationId } = this.data

    if (!formData.title) {
      wx.showToast({ title: '请输入报价单标题', icon: 'none' })
      return
    }

    if (items.length === 0) {
      wx.showToast({ title: '请添加报价项目', icon: 'none' })
      return
    }

    this.setData({ saving: true })

    try {
      const requestData = {
        title: formData.title,
        items: items.map(item => ({
          sku_id: item.sku_id,
          quantity: item.quantity
        })),
        customer_name: formData.customer_name,
        customer_contact: formData.customer_contact
      }

      if (mode === 'create') {
        const result = await api.createQuotation(requestData)
        storage.clearBasket()
        
        wx.showToast({ title: '创建成功', icon: 'success' })
        
        setTimeout(() => {
          wx.redirectTo({
            url: `/pages/quotation-edit/quotation-edit?quotationId=${result.id}&mode=view`
          })
        }, 1000)
      } else if (mode === 'edit') {
        await api.updateQuotation(quotationId, requestData)
        
        wx.showToast({ title: '保存成功', icon: 'success' })
        
        setTimeout(() => {
          this.setData({ mode: 'view' })
          this.loadQuotation(quotationId)
        }, 1000)
      }
    } catch (error) {
      console.error('保存失败', error)
    } finally {
      this.setData({ saving: false })
    }
  },

  handleSwitchToEdit() {
    this.setData({ mode: 'edit' })
  },

  async handlePublish() {
    const { quotationId } = this.data
    
    wx.showModal({
      title: '确认发布',
      content: '发布后将生成分享链接，确定要发布吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            const result = await api.publishQuotation(quotationId)
            wx.showToast({ title: '发布成功', icon: 'success' })
            
            setTimeout(() => {
              wx.redirectTo({
                url: `/pages/publish-success/publish-success?quotationId=${quotationId}&shareUrl=${encodeURIComponent(result.url)}`
              })
            }, 1000)
          } catch (error) {
            console.error('发布失败', error)
          }
        }
      }
    })
  }
})
