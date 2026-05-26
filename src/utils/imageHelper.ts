// 图片处理助手：把后端返回的 base64 图片转成「canvas 可直接 drawImage 的来源」。
//
// 背景：mp-weixin 的 canvas（2d node 的 createImage / 旧版 drawImage）对 base64 data URL
// 支持不稳定，需要先写成本地临时文件再用文件路径绘制；H5 则可直接用 data URL。
// 因此统一封装为 base64ToImageSource：各端返回各自可用的来源字符串。

/**
 * 把纯 base64（不含 data: 前缀）转成可被 canvas 使用的图片来源。
 * - mp-weixin / App：写入临时文件，返回文件路径（如 wxfile://...）
 * - H5：返回 data URL
 *
 * @param base64 纯 base64 字符串（后端 qrBase64）
 * @param contentType MIME，如 image/png（默认 png）
 */
export function base64ToImageSource(base64: string, contentType = 'image/png'): Promise<string> {
  const ext = contentType.includes('jpeg') || contentType.includes('jpg') ? 'jpg' : 'png'

  // #ifdef H5
  return Promise.resolve(`data:${contentType};base64,${base64}`)
  // #endif

  // #ifndef H5
  return new Promise((resolve, reject) => {
    try {
      const fs = uni.getFileSystemManager()
      // 各端用户数据目录：mp-weixin 用 wx.env.USER_DATA_PATH
      let baseDir = ''
      // #ifdef MP-WEIXIN
      // eslint-disable-next-line no-undef
      baseDir = (typeof wx !== 'undefined' && wx.env && wx.env.USER_DATA_PATH) ? wx.env.USER_DATA_PATH : ''
      // #endif
      if (!baseDir) {
        baseDir = `${uni.env?.USER_DATA_PATH || ''}`
      }
      const filePath = `${baseDir}/share_qr_${Date.now()}.${ext}`
      fs.writeFile({
        filePath,
        data: base64,
        encoding: 'base64',
        success: () => resolve(filePath),
        fail: (err: any) => {
          console.error('写入二维码临时文件失败:', err)
          // 兜底：仍返回 data URL，部分平台可用
          resolve(`data:${contentType};base64,${base64}`)
        }
      })
    } catch (e) {
      console.error('base64ToImageSource 异常:', e)
      reject(e)
    }
  })
  // #endif
}
