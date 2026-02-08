import apiService from '../../utils/api'

interface Cooperation {
  id: string
  from_agency_id: string
  from_agency_name?: string
  to_agency_id: string
  to_agency_name?: string
  status: string
  request_message?: string
  response_message?: string
  created_at: string
  updated_at?: string
}

Page({
  data: {
    activeTab: 'sent' as 'sent' | 'received',
    cooperationList: [] as Cooperation[],
    sentCount: 0,
    receivedCount: 0,
    pendingCount: 0,
    loading: false,
    statusMap: {
      pending: '待审核',
      approved: '已通过',
      rejected: '已拒绝',
      expired: '已超时',
      terminated: '已终止'
    } as Record<string, string>
  },

  onLoad() {
    this.loadCooperations()
  },

  onShow() {
    // 每次显示页面时刷新数据
    this.loadCooperations()
  },

  onPullDownRefresh() {
    this.loadCooperations().then(() => {
      wx.stopPullDownRefresh()
    })
  },

  switchTab(e: any) {
    const tab = e.currentTarget.dataset.tab
    this.setData({ activeTab: tab })
    this.loadCooperations()
  },

  async loadCooperations() {
    this.setData({ loading: true })
    
    try {
      const role = this.data.activeTab === 'sent' ? 'consumer' : 'provider'
      const response = await apiService.listCooperations({ role })
      
      const formattedList = response.map((item: any) => ({
        ...item,
        created_at: this.formatTime(item.created_at)
      }))
      
      this.setData({
        cooperationList: formattedList,
        loading: false
      })

      // 更新计数
      if (this.data.activeTab === 'sent') {
        this.setData({ sentCount: response.length })
      } else {
        const pendingCount = response.filter((item: any) => item.status === 'pending').length
        this.setData({ 
          receivedCount: response.length,
          pendingCount 
        })
        
        // 更新 TabBar 徽章
        this.updateTabBarBadge(pendingCount)
      }
    } catch (error) {
      console.error('加载合作列表失败:', error)
      wx.showToast({ title: '加载失败', icon: 'none' })
      this.setData({ loading: false })
    }
  },

  updateTabBarBadge(count: number) {
    // 假设合作中心在第3个Tab位置（索引2）
    if (count > 0) {
      wx.setTabBarBadge({
        index: 2,
        text: String(count)
      })
    } else {
      wx.removeTabBarBadge({ index: 2 })
    }
  },

  onApprove(e: any) {
    const id = e.currentTarget.dataset.id
    
    wx.showModal({
      title: '审核通过',
      editable: true,
      placeholderText: '回复信息（可选）',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '处理中...' })
            
            await apiService.approveCooperation(id, res.content)
            
            wx.hideLoading()
            wx.showToast({ title: '已通过', icon: 'success' })
            
            setTimeout(() => {
              this.loadCooperations()
            }, 1500)
          } catch (error) {
            wx.hideLoading()
            console.error('审核失败:', error)
            wx.showToast({ title: '操作失败', icon: 'none' })
          }
        }
      }
    })
  },

  onReject(e: any) {
    const id = e.currentTarget.dataset.id
    
    wx.showModal({
      title: '拒绝申请',
      editable: true,
      placeholderText: '拒绝原因（可选）',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '处理中...' })
            
            await apiService.rejectCooperation(id, res.content)
            
            wx.hideLoading()
            wx.showToast({ title: '已拒绝', icon: 'success' })
            
            setTimeout(() => {
              this.loadCooperations()
            }, 1500)
          } catch (error) {
            wx.hideLoading()
            console.error('拒绝失败:', error)
            wx.showToast({ title: '操作失败', icon: 'none' })
          }
        }
      }
    })
  },

  onTerminate(e: any) {
    const id = e.currentTarget.dataset.id
    
    wx.showModal({
      title: '终止合作',
      content: '确认终止此合作关系？终止后对方将无法查看您的公共库价格。',
      confirmText: '确认终止',
      confirmColor: '#ff4444',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '处理中...' })
            
            await apiService.terminateCooperation(id)
            
            wx.hideLoading()
            wx.showToast({ title: '已终止', icon: 'success' })
            
            setTimeout(() => {
              this.loadCooperations()
            }, 1500)
          } catch (error) {
            wx.hideLoading()
            console.error('终止失败:', error)
            wx.showToast({ title: '操作失败', icon: 'none' })
          }
        }
      }
    })
  },

  onViewDetail(e: any) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/cooperation-detail/cooperation-detail?id=${id}`
    })
  },

  formatTime(timestamp: string): string {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    
    // 1分钟内
    if (diff < 60000) return '刚刚'
    
    // 1小时内
    if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000)
      return `${minutes}分钟前`
    }
    
    // 24小时内
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000)
      return `${hours}小时前`
    }
    
    // 7天内
    if (diff < 604800000) {
      const days = Math.floor(diff / 86400000)
      return `${days}天前`
    }
    
    // 超过7天显示具体日期
    const month = date.getMonth() + 1
    const day = date.getDate()
    const hour = date.getHours().toString().padStart(2, '0')
    const minute = date.getMinutes().toString().padStart(2, '0')
    
    return `${month}-${day} ${hour}:${minute}`
  }
})
