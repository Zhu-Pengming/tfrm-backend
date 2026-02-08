import apiService from '../../utils/api'

interface Notification {
  id: string
  title: string
  content: string
  type: string
  is_read: boolean
  created_at: string
  related_id?: string
}

Page({
  data: {
    notifications: [] as Notification[],
    unreadCount: 0,
    selectedType: '',
    selectedStatus: '',
    typeIndex: 0,
    statusIndex: 0,
    typeOptions: ['全部类型', '合作变更', 'SKU更新', '系统通知'],
    statusOptions: ['全部状态', '未读', '已读'],
    typeIcons: {
      cooperation_change: '🔄',
      sku_update: '📝',
      system: '📢'
    } as Record<string, string>,
    loading: false
  },

  onLoad() {
    this.loadNotifications()
    this.loadUnreadCount()
  },

  onShow() {
    this.loadUnreadCount()
  },

  onPullDownRefresh() {
    Promise.all([
      this.loadNotifications(),
      this.loadUnreadCount()
    ]).then(() => {
      wx.stopPullDownRefresh()
    })
  },

  async loadNotifications() {
    this.setData({ loading: true })
    
    try {
      const params: any = {}
      
      if (this.data.selectedType) {
        const typeMap: Record<string, string> = {
          '合作变更': 'cooperation_change',
          'SKU更新': 'sku_update',
          '系统通知': 'system'
        }
        params.type = typeMap[this.data.selectedType]
      }
      
      if (this.data.selectedStatus) {
        params.is_read = this.data.selectedStatus === '已读'
      }
      
      const response = await apiService.listNotifications(params)
      
      const formattedList = response.map((item: any) => ({
        ...item,
        created_at: this.formatTime(item.created_at)
      }))
      
      this.setData({
        notifications: formattedList,
        loading: false
      })
    } catch (error) {
      console.error('加载通知失败:', error)
      wx.showToast({ title: '加载失败', icon: 'none' })
      this.setData({ loading: false })
    }
  },

  async loadUnreadCount() {
    try {
      const response = await apiService.getUnreadNotificationCount()
      this.setData({ unreadCount: response.count })
      
      // 更新 TabBar 徽章（假设通知在第4个Tab，索引3）
      if (response.count > 0) {
        wx.setTabBarBadge({
          index: 3,
          text: String(response.count)
        })
      } else {
        wx.removeTabBarBadge({ index: 3 })
      }
    } catch (error) {
      console.error('加载未读数量失败:', error)
    }
  },

  async onNotificationTap(e: any) {
    const id = e.currentTarget.dataset.id
    const type = e.currentTarget.dataset.type
    const isRead = e.currentTarget.dataset.isRead
    
    // 如果未读，标记为已读
    if (!isRead) {
      try {
        await apiService.markNotificationsAsRead([id])
        this.loadNotifications()
        this.loadUnreadCount()
      } catch (error) {
        console.error('标记已读失败:', error)
      }
    }
    
    // 根据通知类型跳转到相关页面
    if (type === 'cooperation_change') {
      wx.switchTab({ url: '/pages/cooperation/cooperation' })
    } else if (type === 'sku_update') {
      wx.switchTab({ url: '/pages/skus/skus' })
    }
  },

  async onMarkAllRead() {
    const unreadIds = this.data.notifications
      .filter((n: Notification) => !n.is_read)
      .map((n: Notification) => n.id)
    
    if (unreadIds.length === 0) {
      wx.showToast({ title: '没有未读通知', icon: 'none' })
      return
    }
    
    try {
      wx.showLoading({ title: '处理中...' })
      
      await apiService.markNotificationsAsRead(unreadIds)
      
      wx.hideLoading()
      wx.showToast({ title: '已全部标记为已读', icon: 'success' })
      
      setTimeout(() => {
        this.loadNotifications()
        this.loadUnreadCount()
      }, 1500)
    } catch (error) {
      wx.hideLoading()
      console.error('标记失败:', error)
      wx.showToast({ title: '操作失败', icon: 'none' })
    }
  },

  onTypeChange(e: any) {
    const index = e.detail.value
    const type = this.data.typeOptions[index]
    this.setData({ 
      typeIndex: index,
      selectedType: type === '全部类型' ? '' : type 
    })
    this.loadNotifications()
  },

  onStatusChange(e: any) {
    const index = e.detail.value
    const status = this.data.statusOptions[index]
    this.setData({ 
      statusIndex: index,
      selectedStatus: status === '全部状态' ? '' : status 
    })
    this.loadNotifications()
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
