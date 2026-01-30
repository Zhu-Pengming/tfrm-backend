import api from '../../utils/api'



Page({

  data: {

    username: '',

    password: '',

    fullName: '',

    agencyName: '',

    loading: false,

    isLogin: true,

    isRegisterMode: false,

    showPassword: false,

    error: ''

  },



  onUsernameInput(e: any) {

    this.setData({ username: e.detail.value })

  },



  onPasswordInput(e: any) {

    this.setData({ password: e.detail.value })

  },



  onAgencyNameInput(e: any) {

    this.setData({ agencyName: e.detail.value })

  },

  onFullNameInput(e: any) {

    this.setData({ fullName: e.detail.value })

  },



  togglePasswordVisibility() {

    this.setData({ showPassword: !this.data.showPassword })

  },



  switchMode() {

    this.setData({ 

      isLogin: !this.data.isLogin,

      isRegisterMode: !this.data.isRegisterMode,

      username: '',

      password: '',

      fullName: '',

      agencyName: '',

      error: ''

    })

  },



  validateInput() {

    const { username, password, agencyName, isRegisterMode } = this.data

    

    if (isRegisterMode && !agencyName) {

      wx.showToast({ title: '请输入机构名称', icon: 'none' })

      return false

    }



    if (!username || !password) {

      wx.showToast({ title: '请输入用户名和密码', icon: 'none' })

      return false

    }



    if (username.length < 3) {

      wx.showToast({ title: '用户名至少3个字符', icon: 'none' })

      return false

    }



    if (password.length < 6) {

      wx.showToast({ title: '密码至少6个字符', icon: 'none' })

      return false

    }



    return true

  },



  async handleLogin() {

    if (!this.validateInput()) return



    const { username, password } = this.data

    this.setData({ loading: true })



    try {

      const loginRes = await api.login(username, password)

      

      api.setToken(loginRes.access_token, '')

      

      const userInfo = await api.getUserInfo()

      

      api.setToken(loginRes.access_token, userInfo.agency_id)

      

      const app = getApp<IAppOption>()

      app.globalData.token = loginRes.access_token

      app.globalData.agencyId = userInfo.agency_id



      wx.showToast({ title: '登录成功', icon: 'success' })

      

      setTimeout(() => {

        wx.switchTab({ url: '/pages/import/import' })

      }, 1000)

    } catch (error) {

      console.error('登录失败', error)

    } finally {

      this.setData({ loading: false })

    }

  },



  async handleRegister() {

    if (!this.validateInput()) return



    const { username, password, agencyName } = this.data

    this.setData({ loading: true })



    try {

      await api.register(username, password, agencyName)

      wx.showToast({ title: '注册成功，正在登录...', icon: 'success' })

      

      setTimeout(async () => {

        try {

          const loginRes = await api.login(username, password)

          

          api.setToken(loginRes.access_token, '')

          

          const userInfo = await api.getUserInfo()

          

          api.setToken(loginRes.access_token, userInfo.agency_id)

          

          const app = getApp<IAppOption>()

          app.globalData.token = loginRes.access_token

          app.globalData.agencyId = userInfo.agency_id



          wx.switchTab({ url: '/pages/import/import' })

        } catch (error) {

          console.error('自动登录失败', error)

          this.setData({ isRegisterMode: false, isLogin: true })

        }

      }, 1500)

    } catch (error) {

      console.error('注册失败', error)

    } finally {

      this.setData({ loading: false })

    }

  },

  

  handleSubmit() {

    if (this.data.isLogin) {

      this.handleLogin()

    } else {

      this.handleRegister()

    }

  }

})

