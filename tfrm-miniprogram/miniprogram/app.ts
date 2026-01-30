// app.ts
App<IAppOption>({
  globalData: {
    token: '',
    agencyId: '',
    basketCount: 0
  },
  onLaunch() {
    const token = wx.getStorageSync('token')
    const agencyId = wx.getStorageSync('agency_id')
    
    if (token && agencyId) {
      this.globalData.token = token
      this.globalData.agencyId = agencyId
    } else {
      wx.reLaunch({ url: '/pages/login/login' })
    }

    // ===== 调试：追踪所有 wx.uploadFile 调用 =====
    const rawUploadFile = wx.uploadFile
    wx.uploadFile = function (options: any) {
      console.log('[TRACE] wx.uploadFile called:', options?.url)
      console.log('[TRACE] Stack:', new Error().stack)
      return rawUploadFile.call(wx, options)
    } as any
  },
})