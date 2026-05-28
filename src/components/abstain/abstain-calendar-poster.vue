<template>
  <view v-if="visible" class="poster-overlay" @tap.self="handleClose">
    <view class="poster-shell" @tap.stop>
      <view class="poster-topbar">
        <text class="poster-title">分享戒断日历</text>
        <view class="poster-close" @click="handleClose"><text class="poster-close__icon">×</text></view>
      </view>

      <scroll-view scroll-y class="poster-stage">
        <view class="poster-frame">
          <image v-if="resultImg" :src="resultImg" class="poster-preview" mode="widthFix" />
          <view v-else class="poster-loading">
            <view class="poster-loading__spinner"></view>
            <text class="poster-loading__text">{{ renderStage }}</text>
          </view>
        </view>
      </scroll-view>

      <text class="poster-hint">好友收到图片后，长按识别二维码即可查看你的坚持日历</text>

      <view class="poster-actions">
        <button class="poster-btn poster-btn--ghost" :disabled="!resultImg" @click="handleSave">
          <text class="poster-btn__text">保存到相册</text>
        </button>
        <!-- #ifdef MP-WEIXIN -->
        <button class="poster-btn poster-btn--primary" :disabled="!resultImg" @tap="handleShareImageMenu">
          <text class="poster-btn__text">分享给朋友</text>
        </button>
        <!-- #endif -->
        <!-- #ifndef MP-WEIXIN -->
        <button class="poster-btn poster-btn--primary" :disabled="!resultImg" @click="handleSave">
          <text class="poster-btn__text">保存并分享</text>
        </button>
        <!-- #endif -->
      </view>

      <!-- #ifdef MP-WEIXIN -->
      <canvas
        id="abstainPosterCanvas2d"
        type="2d"
        :style="`position:absolute;left:-9999px;top:-9999px;width:${canvasWidth}px;height:${canvasHeight}px;`"
      ></canvas>
      <!-- #endif -->
      <!-- #ifndef MP-WEIXIN -->
      <!-- #ifndef H5 -->
      <canvas
        canvas-id="abstainPosterCanvas"
        :style="`position:absolute;left:-9999px;top:-9999px;width:${canvasWidth}px;height:${canvasHeight}px;`"
        :width="canvasWidth"
        :height="canvasHeight"
      ></canvas>
      <!-- #endif -->
      <!-- #endif -->
    </view>
  </view>
</template>

<script setup>
import { ref, watch, getCurrentInstance, nextTick } from 'vue'
import { APP_BRAND } from '../../utils/appBrand'
import { saveImageToAlbum } from '../../utils/album'

const props = defineProps({
  visible: { type: Boolean, default: false },
  title: { type: String, default: '戒断日记' },
  // 连续坚持天数
  streakDays: { type: Number, default: 0 },
  year: { type: Number, default: new Date().getFullYear() },
  month: { type: Number, default: new Date().getMonth() + 1 },
  // 日期 -> 'persist' | 'relapse'
  statusMap: { type: Object, default: () => ({}) },
  qrSource: { type: String, default: '' },
  creatorName: { type: String, default: '我' }
})

const emit = defineEmits(['close', 'shared'])

const instance = getCurrentInstance()
const resultImg = ref('')
const renderStage = ref('正在生成分享图...')
const canvasWidth = ref(600)
const canvasHeight = ref(1180)

const WIDTH = 600
const PAD = 40
const HEADER_H = 240
const WEEK_H = 56
const CELL_H = 84
const GRID_ROWS = 6
const FOOTER_H = 360
const WEEK_LABELS = ['日', '一', '二', '三', '四', '五', '六']

watch(
  () => [props.visible, props.statusMap, props.qrSource, props.year, props.month],
  () => {
    if (props.visible) {
      resultImg.value = ''
      renderStage.value = '正在生成分享图...'
      nextTick(() => setTimeout(() => renderPoster(), 60))
    }
  },
  { immediate: true, deep: true }
)

const isH5 = () => typeof process !== 'undefined' && process.env && process.env.UNI_PLATFORM === 'h5'

function makeCanvasApi(ctx) {
  const legacy = typeof ctx.setFillStyle === 'function' && typeof ctx.fillStyle === 'undefined'
  return {
    legacy,
    setFill(v) { if (legacy) ctx.setFillStyle(v); else ctx.fillStyle = v },
    setFont(spec, size) { if (legacy) ctx.setFontSize(size); else ctx.font = spec },
    setTextAlign(v) { if (legacy && ctx.setTextAlign) ctx.setTextAlign(v); else if (!legacy) ctx.textAlign = v },
    setTextBaseline(v) { if (legacy && ctx.setTextBaseline) ctx.setTextBaseline(v); else if (!legacy) ctx.textBaseline = v }
  }
}

function drawRoundRectPath(ctx, x, y, w, h, radius) {
  const r = Math.max(0, Math.min(radius, Math.min(w, h) / 2))
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.arcTo(x + w, y, x + w, y + r, r)
  ctx.lineTo(x + w, y + h - r)
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
  ctx.lineTo(x + r, y + h)
  ctx.arcTo(x, y + h, x, y + h - r, r)
  ctx.lineTo(x, y + r)
  ctx.arcTo(x, y, x + r, y, r)
  ctx.closePath()
}

// 生成当月日历网格（含上/下月补位）
function buildDays() {
  const year = props.year
  const month = props.month
  const firstDay = new Date(year, month - 1, 1).getDay()
  const totalDays = new Date(year, month, 0).getDate()
  const days = []
  for (let i = 0; i < firstDay; i++) days.push(null)
  for (let d = 1; d <= totalDays; d++) {
    const key = `${year}-${month < 10 ? '0' + month : month}-${d < 10 ? '0' + d : d}`
    days.push({ day: d, status: props.statusMap[key] || '' })
  }
  while (days.length < GRID_ROWS * 7) days.push(null)
  return days
}

function computeHeight() {
  return HEADER_H + WEEK_H + GRID_ROWS * CELL_H + FOOTER_H
}

function paint(ctx, api, width, height, qrImg) {
  api.setFill('#f5f7fa')
  ctx.fillRect(0, 0, width, height)

  // ===== 头部 =====
  if (ctx.createLinearGradient) {
    const grad = ctx.createLinearGradient(0, 0, width, HEADER_H)
    grad.addColorStop(0, '#10b981')
    grad.addColorStop(1, '#059669')
    api.setFill(grad)
  } else {
    api.setFill('#10b981')
  }
  ctx.fillRect(0, 0, width, HEADER_H)

  api.setFill('rgba(255,255,255,0.92)')
  api.setTextAlign('left')
  api.setTextBaseline('top')
  api.setFont('600 26px sans-serif', 26)
  ctx.fillText(`${APP_BRAND} · 戒断日记`, PAD, 40)

  api.setFill('#ffffff')
  api.setFont('800 44px "PingFang SC", sans-serif', 44)
  ctx.fillText(truncate(api, props.title || '戒断日记', width - PAD * 2), PAD, 80)

  api.setFill('rgba(255,255,255,0.95)')
  api.setFont('700 36px sans-serif', 36)
  ctx.fillText(`已连续坚持 ${props.streakDays} 天`, PAD, 150)

  api.setFill('rgba(255,255,255,0.8)')
  api.setFont('400 24px sans-serif', 24)
  ctx.fillText(`${props.year}年${props.month}月 · 来自 ${props.creatorName}`, PAD, 198)

  // ===== 星期头 =====
  const gridX = PAD
  const gridW = width - PAD * 2
  const cellW = gridW / 7
  let y = HEADER_H
  api.setTextAlign('center')
  api.setTextBaseline('middle')
  api.setFont('600 24px sans-serif', 24)
  api.setFill('#64748b')
  WEEK_LABELS.forEach((w, i) => {
    ctx.fillText(w, gridX + cellW * i + cellW / 2, y + WEEK_H / 2)
  })

  // ===== 日期格子 =====
  y += WEEK_H
  const days = buildDays()
  days.forEach((item, idx) => {
    const col = idx % 7
    const row = Math.floor(idx / 7)
    const cx = gridX + cellW * col + cellW / 2
    const cyTop = y + row * CELL_H
    const cy = cyTop + CELL_H / 2
    if (!item) return
    // 状态底色
    if (item.status === 'persist' || item.status === 'relapse') {
      const r = 30
      api.setFill(item.status === 'persist' ? 'rgba(16,185,129,0.18)' : 'rgba(239,68,68,0.18)')
      ctx.beginPath()
      ctx.arc(cx, cy - 6, r, 0, Math.PI * 2)
      ctx.fill()
    }
    // 日期数字
    api.setFill('#1f2937')
    api.setFont('500 26px sans-serif', 26)
    api.setTextAlign('center')
    api.setTextBaseline('middle')
    ctx.fillText(String(item.day), cx, cy - 6)
    // 状态文字
    if (item.status === 'persist' || item.status === 'relapse') {
      api.setFont('400 18px sans-serif', 18)
      api.setFill(item.status === 'persist' ? '#10b981' : '#ef4444')
      ctx.fillText(item.status === 'persist' ? '坚持' : '破戒', cx, cy + 24)
    }
  })

  // ===== 底部二维码卡片 =====
  const footerY = HEADER_H + WEEK_H + GRID_ROWS * CELL_H + 8
  const fCardX = PAD
  const fCardW = width - PAD * 2
  const fCardH = FOOTER_H - 40
  drawRoundRectPath(ctx, fCardX, footerY, fCardW, fCardH, 20)
  api.setFill('#ffffff')
  ctx.fill()

  const qrSize = 170
  const qrX = fCardX + (fCardW - qrSize) / 2
  const qrY = footerY + 28
  if (qrImg) {
    try { ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize) } catch (e) { /* ignore */ }
  } else {
    api.setFill('#f1f5f9')
    ctx.fillRect(qrX, qrY, qrSize, qrSize)
  }

  api.setFill('#1f2937')
  api.setTextAlign('center')
  api.setTextBaseline('top')
  api.setFont('600 26px sans-serif', 26)
  ctx.fillText('长按识别二维码 · 看TA的坚持', width / 2, qrY + qrSize + 22)
  api.setFill('#94a3b8')
  api.setFont('400 20px sans-serif', 20)
  ctx.fillText(`用微信打开 ${APP_BRAND} 小程序`, width / 2, qrY + qrSize + 56)
}

function truncate(api, text, maxWidth) {
  // 简化：按字符宽度估算（中文约 0.55*size）。海报标题一般不长。
  const str = String(text == null ? '' : text)
  const maxChars = Math.floor(maxWidth / 24)
  return str.length > maxChars ? str.slice(0, maxChars - 1) + '…' : str
}

function renderPoster() {
  const width = WIDTH
  const height = computeHeight()
  canvasWidth.value = width
  canvasHeight.value = height

  // ---- H5 ----
  if (isH5()) {
    const canvas = typeof document !== 'undefined' ? document.createElement('canvas') : null
    if (!canvas) { renderStage.value = '当前环境不支持生成图片'; return }
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    const api = makeCanvasApi(ctx)
    const finish = (qrImg) => {
      paint(ctx, api, width, height, qrImg)
      try { resultImg.value = canvas.toDataURL('image/png') } catch (e) { renderStage.value = '生成失败' }
    }
    if (props.qrSource) {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => finish(img)
      img.onerror = () => finish(null)
      img.src = props.qrSource
    } else { finish(null) }
    return
  }

  // ---- mp-weixin canvas 2d ----
  // #ifdef MP-WEIXIN
  if (typeof wx !== 'undefined' && wx.createSelectorQuery) {
    const query = wx.createSelectorQuery()
    if (instance && instance.proxy && query.in) query.in(instance.proxy)
    query.select('#abstainPosterCanvas2d').fields({ node: true, size: true }).exec((res) => {
      const node = res && res[0] && res[0].node
      if (!node) { renderStage.value = '生成失败(canvas)'; return }
      const canvas = node
      const ctx = canvas.getContext('2d')
      const dpr = ((wx.getWindowInfo ? wx.getWindowInfo() : (wx.getSystemInfoSync ? wx.getSystemInfoSync() : {})).pixelRatio) || 2
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      ctx.scale(dpr, dpr)
      const api = makeCanvasApi(ctx)
      const finish = (qrImg) => {
        paint(ctx, api, width, height, qrImg)
        wx.canvasToTempFilePath({
          canvas,
          x: 0, y: 0, width, height,
          destWidth: width * dpr, destHeight: height * dpr,
          fileType: 'png',
          success: (r) => { resultImg.value = r.tempFilePath },
          fail: () => { renderStage.value = '导出失败，请重试' }
        })
      }
      if (props.qrSource) {
        const img = canvas.createImage()
        img.onload = () => finish(img)
        img.onerror = () => finish(null)
        img.src = props.qrSource
      } else { finish(null) }
    })
    return
  }
  // #endif

  // ---- 其它平台（App）：旧版 uni canvas ----
  // #ifndef H5
  // #ifndef MP-WEIXIN
  const ctx = uni.createCanvasContext('abstainPosterCanvas', instance && instance.proxy)
  const api = makeCanvasApi(ctx)
  paint(ctx, api, width, height, props.qrSource || null)
  ctx.draw(false, () => {
    setTimeout(() => {
      uni.canvasToTempFilePath({
        canvasId: 'abstainPosterCanvas', x: 0, y: 0, width, height,
        success: (r) => { resultImg.value = r.tempFilePath },
        fail: () => { renderStage.value = '导出失败，请重试' }
      }, instance && instance.proxy)
    }, 120)
  })
  // #endif
  // #endif
}

function handleSave() {
  if (!resultImg.value) return
  // #ifdef H5
  if (typeof document !== 'undefined') {
    const a = document.createElement('a')
    a.href = resultImg.value
    a.download = `abstain-${Date.now()}.png`
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    uni.showToast({ title: '已开始下载', icon: 'none' })
  }
  return
  // #endif
  // #ifndef H5
  saveImageToAlbum(resultImg.value)
    .then(() => uni.showToast({ title: '已保存到相册', icon: 'success' }))
    .catch((err) => {
      const canceled = err && /取消/.test(err.message || '')
      uni.showToast({ title: canceled ? '已取消保存' : '保存失败，请在设置中开启相册权限', icon: 'none' })
    })
  // #endif
}

function handleShareImageMenu() {
  if (!resultImg.value) return
  // #ifdef MP-WEIXIN
  if (typeof wx !== 'undefined' && wx.showShareImageMenu) {
    wx.showShareImageMenu({
      path: resultImg.value,
      success: () => { emit('shared') },
      fail: () => uni.showToast({ title: '已取消分享', icon: 'none' })
    })
  } else {
    uni.showToast({ title: '当前微信版本不支持，请先保存图片', icon: 'none' })
  }
  // #endif
}

function handleClose() { emit('close') }
</script>

<style scoped>
.poster-overlay {
  position: fixed; left: 0; top: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.65); z-index: 9999;
  display: flex; align-items: flex-end; justify-content: center;
}
.poster-shell {
  width: 100%; max-width: 760rpx; background: #ffffff;
  border-top-left-radius: 28rpx; border-top-right-radius: 28rpx;
  display: flex; flex-direction: column; max-height: 90vh;
  padding-bottom: env(safe-area-inset-bottom);
}
.poster-topbar { display: flex; align-items: center; justify-content: space-between; padding: 28rpx 32rpx 12rpx; box-sizing: border-box; width: 100%; }
.poster-title { font-size: 32rpx; font-weight: 700; color: #1f2937; }
.poster-close { width: 60rpx; height: 60rpx; border-radius: 50%; background: #f1f5f9; display: flex; align-items: center; justify-content: center; }
.poster-close__icon { font-size: 40rpx; color: #64748b; line-height: 1; }
.poster-stage { flex: 1; min-height: 0; padding: 12rpx 32rpx; box-sizing: border-box; width: 100%; }
.poster-frame { width: 100%; border-radius: 20rpx; overflow: hidden; background: #f5f7fa; min-height: 400rpx; display: flex; align-items: center; justify-content: center; }
.poster-preview { width: 100%; display: block; }
.poster-loading { display: flex; flex-direction: column; align-items: center; gap: 18rpx; padding: 80rpx 0; }
.poster-loading__spinner { width: 56rpx; height: 56rpx; border-radius: 50%; border: 6rpx solid #e2e8f0; border-top-color: #10b981; animation: posterSpin 0.9s linear infinite; }
@keyframes posterSpin { to { transform: rotate(360deg); } }
.poster-loading__text { font-size: 26rpx; color: #94a3b8; }
.poster-hint { display: block; text-align: center; font-size: 24rpx; color: #94a3b8; padding: 8rpx 32rpx 0; box-sizing: border-box; width: 100%; }
.poster-actions { display: flex; gap: 20rpx; padding: 24rpx 32rpx 28rpx; box-sizing: border-box; width: 100%; }
.poster-btn { flex: 1; height: 88rpx; border-radius: 44rpx; border: none; margin: 0; display: flex; align-items: center; justify-content: center; }
.poster-btn::after { border: none; }
.poster-btn[disabled] { opacity: 0.45; }
.poster-btn--ghost { background: #f1f5f9; }
.poster-btn--ghost .poster-btn__text { color: #475569; font-size: 28rpx; font-weight: 600; }
.poster-btn--primary { background: #10b981; }
.poster-btn--primary .poster-btn__text { color: #ffffff; font-size: 28rpx; font-weight: 600; }
</style>
