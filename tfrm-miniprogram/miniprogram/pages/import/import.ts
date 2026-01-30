import api from '../../utils/api'

Page({
  data: {
    inputText: '',
    loading: false,
    taskList: [] as any[],
    selectedFiles: [] as any[],
    uploadedFileUrl: '',
    mode: 'text' as 'text' | 'file',
    statusText: {
      created: '已创建',
      parsing: '解析中',
      parsed: '已解析',
      confirmed: '已确认',
      failed: '失败'
    }
  },

  onShow() {
    this.loadTaskList()
  },

  onInputChange(e: any) {
    this.setData({ inputText: e.detail.value })
  },

  switchMode(e: any) {
    const mode = e.currentTarget.dataset.mode
    this.setData({ mode, inputText: '', selectedFiles: [], uploadedFileUrl: '' })
  },

  handleChooseImage() {
    if (this.data.loading) {
      wx.showToast({ title: '操作中，请稍候', icon: 'none' })
      return
    }
    
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const filePath = res.tempFilePaths[0]
        this.setData({ 
          selectedFiles: [{ name: '已选择图片', path: filePath }]
        })
        wx.showToast({ title: '图片已选择，点击提交开始解析', icon: 'success' })
      },
      fail: (err) => {
        console.error('选择图片失败', err)
        wx.showToast({ title: '选择失败', icon: 'none' })
      }
    })
  },

  handleChooseFile() {
    if (this.data.loading) {
      wx.showToast({ title: '操作中，请稍候', icon: 'none' })
      return
    }
    
    wx.chooseMessageFile({
      count: 1,
      type: 'all',
      success: (res) => {
        const filePath = res.tempFiles[0].path
        const fileName = res.tempFiles[0].name
        this.setData({ 
          selectedFiles: [{ name: fileName, path: filePath }]
        })
        wx.showToast({ title: '文件已选择，点击提交开始解析', icon: 'success' })
      },
      fail: (err) => {
        console.error('选择文件失败', err)
        wx.showToast({ title: '选择失败', icon: 'none' })
      }
    })
  },

  async handleStartParse() {
    const { inputText, mode, selectedFiles } = this.data

    if (mode === 'text' && !inputText.trim()) {
      wx.showToast({ title: '请输入资源信息', icon: 'none' })
      return
    }

    if (mode === 'file' && (!selectedFiles || selectedFiles.length === 0)) {
      wx.showToast({ title: '请先选择文件', icon: 'none' })
      return
    }

    this.setData({ loading: true })

    try {
      let result
      
      if (mode === 'text') {
        result = await api.extractWithAI(inputText, null)
      } else {
        const filePath = selectedFiles[0].path
        result = await api.extractWithAI('', filePath)
      }
      
      wx.showToast({ title: '提交成功，AI解析中...', icon: 'success' })
      
      this.setData({ inputText: '', selectedFiles: [] })
      
      setTimeout(() => {
        wx.navigateTo({
          url: `/pages/import-detail/import-detail?taskId=${result.id}`
        })
      }, 1000)
    } catch (error) {
      console.error('创建导入任务失败', error)
      wx.showToast({ title: '提交失败，请重试', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },

  async loadTaskList() {
    try {
      const tasks = await api.listImports(10, 0)
      this.setData({ taskList: tasks })
    } catch (error) {
      console.error('加载任务列表失败', error)
    }
  },

  handleViewTask(e: any) {
    const taskId = e.currentTarget.dataset.taskId
    wx.navigateTo({
      url: `/pages/import-detail/import-detail?taskId=${taskId}`
    })
  },

  handleSelectChat() {
    wx.chooseMessageFile({
      count: 10,
      type: 'all',
      success: (res) => {
        const files = res.tempFiles
        const selectedFiles = files.map((file: any) => ({
          name: file.name,
          path: file.path,
          size: file.size,
          type: file.type
        }))
        
        this.setData({ selectedFiles })
        
        files.forEach((file: any) => {
          if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
            this.readTextFile(file.path)
          }
        })
        
        wx.showToast({
          title: `已选择${files.length}个文件`,
          icon: 'success'
        })
      },
      fail: (err) => {
        console.error('选择文件失败', err)
        wx.showToast({
          title: '选择文件失败',
          icon: 'none'
        })
      }
    })
  },

  readTextFile(filePath: string) {
    const fs = wx.getFileSystemManager()
    fs.readFile({
      filePath,
      encoding: 'utf8',
      success: (res) => {
        const content = res.data as string
        const currentText = this.data.inputText
        const newText = currentText ? `${currentText}\n\n${content}` : content
        
        if (newText.length > 5000) {
          wx.showToast({
            title: '内容超出5000字限制',
            icon: 'none'
          })
          this.setData({ inputText: newText.substring(0, 5000) })
        } else {
          this.setData({ inputText: newText })
        }
      },
      fail: (err) => {
        console.error('读取文件失败', err)
      }
    })
  },

  handleRemoveFile(e: any) {
    const index = e.currentTarget.dataset.index
    const selectedFiles = this.data.selectedFiles.filter((_: any, i: number) => i !== index)
    this.setData({ selectedFiles, uploadedFileUrl: '' })
  },

  handleRefresh() {
    this.loadTaskList()
  }
})
