// 保存图片到相册：统一处理微信「保存到相册」授权。
//
// 背景：直接调 uni.saveImageToPhotosAlbum，若用户曾拒绝 scope.writePhotosAlbum，
// 会直接 fail（不再弹授权框），表现为「保存失败」。这里补上授权流程：
//   - 已授权(true)/首次(undefined) → 直接保存（首次会自动弹系统授权框）；
//   - 曾拒绝(false)              → 弹窗引导去「设置」页打开权限，开启后再保存。
//
// H5 不支持 saveImageToPhotosAlbum，调用方应自行用 <a download> 兜底，不要走这里。

export function saveImageToAlbum(filePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!filePath) {
      reject(new Error('缺少图片文件'))
      return
    }

    const doSave = () => {
      uni.saveImageToPhotosAlbum({
        filePath,
        success: () => resolve(),
        fail: (err: any) => reject(err)
      })
    }

    uni.getSetting({
      success: (res: any) => {
        const auth = res && res.authSetting ? res.authSetting['scope.writePhotosAlbum'] : undefined
        if (auth === false) {
          // 曾被拒绝：引导去设置页手动打开
          uni.showModal({
            title: '需要相册权限',
            content: '保存图片需要你授权「保存到相册」，去设置里开启后即可保存',
            confirmText: '去设置',
            cancelText: '取消',
            success: (m: any) => {
              if (!m.confirm) {
                reject(new Error('用户取消授权'))
                return
              }
              uni.openSetting({
                success: (s: any) => {
                  if (s && s.authSetting && s.authSetting['scope.writePhotosAlbum']) {
                    doSave()
                  } else {
                    reject(new Error('未开启相册权限'))
                  }
                },
                fail: (e: any) => reject(e)
              })
            },
            fail: (e: any) => reject(e)
          })
        } else {
          // 已授权或首次（首次 saveImageToPhotosAlbum 会自动弹授权框）
          doSave()
        }
      },
      // getSetting 失败也兜底尝试直接保存
      fail: () => doSave()
    })
  })
}
