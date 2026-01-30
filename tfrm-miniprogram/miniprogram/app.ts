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
  },
})