/// <reference path="./types/index.d.ts" />

interface IAppOption {
  globalData: {
    userInfo?: WechatMiniprogram.UserInfo,
    token: string,
    agencyId: string,
    basketCount: number
  }
  userInfoReadyCallback?: WechatMiniprogram.GetUserInfoSuccessCallback,
}