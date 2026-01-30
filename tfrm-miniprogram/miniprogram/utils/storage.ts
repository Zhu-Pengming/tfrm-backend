// 本地存储工具类
class StorageService {
  // 保存报价篮子
  saveQuotationBasket(items: Array<{ sku_id: string; sku_name: string; quantity: number }>) {
    wx.setStorageSync('quotation_basket', items)
  }

  // 获取报价篮子
  getQuotationBasket(): Array<{ sku_id: string; sku_name: string; quantity: number }> {
    return wx.getStorageSync('quotation_basket') || []
  }

  // 添加到报价篮子
  addToBasket(sku: { sku_id: string; sku_name: string; quantity?: number }) {
    const basket = this.getQuotationBasket()
    const existingIndex = basket.findIndex(item => item.sku_id === sku.sku_id)
    
    if (existingIndex >= 0) {
      basket[existingIndex].quantity += (sku.quantity || 1)
    } else {
      basket.push({
        sku_id: sku.sku_id,
        sku_name: sku.sku_name,
        quantity: sku.quantity || 1
      })
    }
    
    this.saveQuotationBasket(basket)
    return basket.length
  }

  // 清空报价篮子
  clearBasket() {
    wx.removeStorageSync('quotation_basket')
  }

  // 获取篮子数量
  getBasketCount(): number {
    const basket = this.getQuotationBasket()
    return basket.reduce((sum, item) => sum + item.quantity, 0)
  }
}

export default new StorageService()
