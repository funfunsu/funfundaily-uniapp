<template>
  <view v-if="visible" class="poster-overlay" @tap.self="handleClose">
    <view class="poster-shell" @tap.stop>
      <view class="poster-topbar">
        <text class="poster-title">分享课程表</text>
        <view class="poster-close" @click="handleClose"><text class="poster-close__icon">×</text></view>
      </view>

      <!-- 预览区 -->
      <scroll-view scroll-y class="poster-stage">
        <view class="poster-frame">
          <image v-if="resultImg" :src="resultImg" class="poster-preview" mode="widthFix" />
          <view v-else class="poster-loading">
            <view class="poster-loading__spinner"></view>
            <text class="poster-loading__text">{{ renderStage }}</text>
          </view>
        </view>
      </scroll-view>

      <text class="poster-hint">好友长按识别二维码，或点开小程序链接即可收下课程表</text>

      <!-- 操作区：重新设计的分享按钮布局 -->
      <view class="poster-actions">
        <!-- #ifdef MP-WEIXIN -->
        <button class="poster-btn poster-btn--primary" :disabled="!resultImg" @tap="handleShareImageMenu">
          <text class="poster-btn__icon">🖼️</text>
          <text class="poster-btn__text">把课程表图片发给朋友</text>
        </button>
        <view class="poster-actions__row">
          <button class="poster-btn poster-btn--ghost" :disabled="!resultImg" @click="handleSave">
            <text class="poster-btn__text">保存到相册</text>
          </button>
          <button class="poster-btn poster-btn--link" open-type="share" @tap="handleLinkShare">
            <text class="poster-btn__text">转发小程序链接</text>
          </button>
        </view>
        <!-- #endif -->
        <!-- #ifndef MP-WEIXIN -->
        <button class="poster-btn poster-btn--primary" :disabled="!resultImg" @click="handleSave">
          <text class="poster-btn__text">保存并分享</text>
        </button>
        <!-- #endif -->
      </view>

      <!-- 隐藏画布（离屏绘制） -->
      <!-- #ifdef MP-WEIXIN -->
      <canvas
        id="scheduleSharePosterCanvas2d"
        type="2d"
        :style="`position:absolute;left:-9999px;top:-9999px;width:${canvasWidth}px;height:${canvasHeight}px;`"
      ></canvas>
      <!-- #endif -->
      <!-- #ifndef MP-WEIXIN -->
      <!-- #ifndef H5 -->
      <canvas
        canvas-id="scheduleSharePosterCanvas"
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
import DateUtils from '../../utils/util'

const props = defineProps({
  visible: { type: Boolean, default: false },
  // 选中的日程数组（含 date / startTime / endTime / itemTitle / location）
  schedules: { type: Array, default: () => [] },
  // 二维码图片来源（已由 imageHelper 转成各端可用的路径 / dataURL）
  qrSource: { type: String, default: '' },
  // 分享者昵称
  creatorName: { type: String, default: '我' }
})

const emit = defineEmits(['close', 'shared', 'link'])

const instance = getCurrentInstance()
const resultImg = ref('')
const renderStage = ref('正在生成课程表...')
const canvasWidth = ref(600)
const canvasHeight = ref(900)

// ===== 课程表布局常量（逻辑像素） =====
const TIME_COL_W = 70    // 左侧时间轴列宽
const HOUR_H = 84        // 每小时行高
const HEADER_BAND_H = 160 // 顶部标题带
const DAY_HEADER_H = 72  // 星期/日期表头行
const FOOTER_H = 300     // 底部二维码卡
const MIN_BLOCK_H = 46   // 事件块最小高度

const WEEK_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
const PALETTE = ['#2196F3', '#00B8D4', '#3D5AFE', '#1565C0', '#5C6BC0', '#26A69A', '#7E57C2', '#0D47A1']

const isH5 = () => typeof process !== 'undefined' && process.env && process.env.UNI_PLATFORM === 'h5'

function toMinutes(hhmm) {
  if (!hhmm) return null
  const [h, m] = String(hhmm).split(':').map(Number)
  if (isNaN(h)) return null
  return h * 60 + (isNaN(m) ? 0 : m)
}

// 计算课程表布局：列（按日期）、时间窗（起止小时）、尺寸
function buildLayout() {
  const list = props.schedules || []

  const dateSet = [...new Set(list.map(s => s?.date || DateUtils.getDateFromDateTimeStr(s?.startTime || '', '')))]
    .filter(Boolean).sort()
  const columns = dateSet.map(d => {
    const parts = String(d).split('-').map(Number)
    let week = '', label = d
    if (parts.length === 3 && !parts.some(isNaN)) {
      const dt = new Date(parts[0], parts[1] - 1, parts[2])
      week = WEEK_LABELS[dt.getDay()]
      label = `${parts[1]}/${parts[2]}`
    }
    return { date: d, week, label }
  })

  let minStart = Infinity, maxEnd = -Infinity
  list.forEach(s => {
    const sm = toMinutes(DateUtils.getHourAndMinFromDateTimeStr(s?.startTime || '', ''))
    const em = toMinutes(DateUtils.getHourAndMinFromDateTimeStr(s?.endTime || '', ''))
    if (sm != null) { minStart = Math.min(minStart, sm); maxEnd = Math.max(maxEnd, sm + 60) }
    if (em != null) maxEnd = Math.max(maxEnd, em)
  })

  let startHour, endHour
  if (minStart === Infinity) { startHour = 8; endHour = 18 }
  else {
    startHour = Math.max(0, Math.floor(minStart / 60))
    endHour = Math.min(24, Math.ceil(maxEnd / 60))
    if (endHour <= startHour) endHour = Math.min(24, startHour + 1)
    if (endHour - startHour < 4) endHour = Math.min(24, startHour + 4)
  }

  const cols = Math.max(1, columns.length)
  const dayColW = Math.max(96, Math.min(220, Math.round(640 / cols)))
  const width = TIME_COL_W + cols * dayColW
  const gridH = (endHour - startHour) * HOUR_H
  const height = HEADER_BAND_H + DAY_HEADER_H + gridH + FOOTER_H
  return { columns, startHour, endHour, dayColW, width, height, gridH }
}

watch(
  () => [props.visible, props.schedules, props.qrSource],
  () => {
    if (props.visible && props.schedules.length > 0) {
      resultImg.value = ''
      renderStage.value = '正在生成课程表...'
      nextTick(() => setTimeout(() => renderPoster(), 60))
    }
  },
  { immediate: true, deep: false }
)

// ===== 跨平台 canvas 样式 API（兼容旧版 uni canvas 的 setXxx 写法）=====
function makeCanvasApi(ctx) {
  const legacy = typeof ctx.setFillStyle === 'function' && typeof ctx.fillStyle === 'undefined'
  return {
    legacy,
    setFill(v) { if (legacy) ctx.setFillStyle(v); else ctx.fillStyle = v },
    setStroke(v) { if (legacy) ctx.setStrokeStyle(v); else ctx.strokeStyle = v },
    setLineWidth(v) { if (legacy) ctx.setLineWidth(v); else ctx.lineWidth = v },
    setTextAlign(v) { if (legacy && ctx.setTextAlign) ctx.setTextAlign(v); else if (!legacy) ctx.textAlign = v },
    setTextBaseline(v) { if (legacy && ctx.setTextBaseline) ctx.setTextBaseline(v); else if (!legacy) ctx.textBaseline = v },
    setFont(spec, size) { if (legacy) ctx.setFontSize(size); else ctx.font = spec },
    measureWidth(text) {
      if (ctx.measureText) { try { return ctx.measureText(text).width } catch (e) { /* ignore */ } }
      return String(text || '').length * 12
    }
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

function truncate(api, text, maxWidth) {
  const str = String(text == null ? '' : text)
  if (api.measureWidth(str) <= maxWidth) return str
  let result = str
  while (result.length > 1 && api.measureWidth(result + '…') > maxWidth) {
    result = result.slice(0, -1)
  }
  return result + '…'
}

// 绘制课程表网格（ctx 为 2d/H5/legacy 任一；qrImg 为 Image 对象或路径字符串）
function paint(ctx, api, layout, qrImg) {
  const { columns, startHour, endHour, dayColW, width, height, gridH } = layout
  const cols = columns.length
  const list = props.schedules || []

  // 背景
  api.setFill('#f5f7fa')
  ctx.fillRect(0, 0, width, height)

  // ===== 顶部标题带 =====
  if (ctx.createLinearGradient) {
    const grad = ctx.createLinearGradient(0, 0, width, HEADER_BAND_H)
    grad.addColorStop(0, '#4f8cff')
    grad.addColorStop(1, '#2196f3')
    api.setFill(grad)
  } else {
    api.setFill('#2196f3')
  }
  ctx.fillRect(0, 0, width, HEADER_BAND_H)

  api.setFill('rgba(255,255,255,0.92)')
  api.setTextAlign('left')
  api.setTextBaseline('top')
  api.setFont('600 26px sans-serif', 26)
  ctx.fillText(`${APP_BRAND} · 课程表`, 28, 34)

  api.setFill('#ffffff')
  api.setFont('800 40px "PingFang SC", sans-serif', 40)
  ctx.fillText(truncate(api, `来自 ${props.creatorName} 的分享`, width - 56), 28, 74)

  api.setFill('rgba(255,255,255,0.85)')
  api.setFont('400 24px sans-serif', 24)
  ctx.fillText(`共 ${list.length} 个日程，一起安排起来吧`, 28, 126)

  // ===== 星期/日期表头行 =====
  const dhY = HEADER_BAND_H
  // 左上角格
  api.setFill('#e8f1ff')
  ctx.fillRect(0, dhY, TIME_COL_W, DAY_HEADER_H)
  api.setFill('#90a4c4')
  api.setTextAlign('center')
  api.setTextBaseline('middle')
  api.setFont('600 20px sans-serif', 20)
  ctx.fillText('时间', TIME_COL_W / 2, dhY + DAY_HEADER_H / 2)

  columns.forEach((c, i) => {
    const x = TIME_COL_W + i * dayColW
    api.setFill(i % 2 === 0 ? '#f3f8ff' : '#e8f1ff')
    ctx.fillRect(x, dhY, dayColW, DAY_HEADER_H)
    api.setFill('#1f3a5f')
    api.setTextAlign('center')
    api.setTextBaseline('top')
    api.setFont('700 26px sans-serif', 26)
    ctx.fillText(c.week || '', x + dayColW / 2, dhY + 12)
    api.setFill('#7a90b0')
    api.setFont('400 20px sans-serif', 20)
    ctx.fillText(c.label || '', x + dayColW / 2, dhY + 44)
  })

  // ===== 网格主体 =====
  const gy0 = HEADER_BAND_H + DAY_HEADER_H
  api.setFill('#ffffff')
  ctx.fillRect(0, gy0, width, gridH)

  // 横向小时线 + 时间标签
  api.setStroke('#eef2f7')
  api.setLineWidth(1)
  for (let h = startHour; h <= endHour; h++) {
    const y = gy0 + (h - startHour) * HOUR_H
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke()
    if (h < endHour) {
      api.setFill('#9aa7b8')
      api.setTextAlign('center')
      api.setTextBaseline('top')
      api.setFont('400 20px sans-serif', 20)
      ctx.fillText(`${h}:00`, TIME_COL_W / 2, y + 6)
    }
  }
  // 纵向分隔线
  ctx.beginPath(); ctx.moveTo(0, gy0); ctx.lineTo(0, gy0 + gridH); ctx.stroke()
  for (let i = 0; i <= cols; i++) {
    const x = TIME_COL_W + i * dayColW
    ctx.beginPath(); ctx.moveTo(x, gy0); ctx.lineTo(x, gy0 + gridH); ctx.stroke()
  }

  // ===== 事件块 =====
  const dateIndex = {}
  columns.forEach((c, i) => { dateIndex[c.date] = i })
  list.forEach((s, idx) => {
    const key = s?.date != null ? s.date : DateUtils.getDateFromDateTimeStr(s?.startTime || '', '')
    const di = dateIndex[key]
    if (di == null) return

    let sm = toMinutes(DateUtils.getHourAndMinFromDateTimeStr(s?.startTime || '', ''))
    let em = toMinutes(DateUtils.getHourAndMinFromDateTimeStr(s?.endTime || '', ''))
    if (sm == null) sm = startHour * 60
    if (em == null || em <= sm) em = sm + 60

    const top = gy0 + (sm - startHour * 60) / 60 * HOUR_H
    const blockH = Math.max(MIN_BLOCK_H, (em - sm) / 60 * HOUR_H)
    const x = TIME_COL_W + di * dayColW + 5
    const w = dayColW - 10

    drawRoundRectPath(ctx, x, top + 3, w, blockH - 6, 12)
    api.setFill(PALETTE[idx % PALETTE.length])
    ctx.fill()

    api.setFill('#ffffff')
    api.setTextAlign('left')
    api.setTextBaseline('top')
    const tx = x + 12
    let ty = top + 12
    api.setFont('700 22px sans-serif', 22)
    ctx.fillText(truncate(api, s?.itemTitle || '日程', w - 20), tx, ty)

    if (blockH >= 72) {
      const start = DateUtils.getHourAndMinFromDateTimeStr(s?.startTime || '', '')
      const end = DateUtils.getHourAndMinFromDateTimeStr(s?.endTime || '', '')
      const timeText = start ? (end ? `${start}-${end}` : start) : ''
      if (timeText) {
        ty += 30
        api.setFill('rgba(255,255,255,0.92)')
        api.setFont('400 19px sans-serif', 19)
        ctx.fillText(truncate(api, timeText, w - 20), tx, ty)
      }
      if (blockH >= 108 && s?.location) {
        ty += 24
        api.setFill('rgba(255,255,255,0.85)')
        ctx.fillText(truncate(api, `📍 ${s.location}`, w - 20), tx, ty)
      }
    }
  })

  // ===== 底部二维码卡片 =====
  const footerY = gy0 + gridH + 24
  const fX = 24
  const fW = width - 48
  const fH = FOOTER_H - 48
  drawRoundRectPath(ctx, fX, footerY, fW, fH, 20)
  api.setFill('#ffffff')
  ctx.fill()

  const qrSize = 170
  const qrX = fX + (fW - qrSize) / 2
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
  ctx.fillText('长按识别二维码 · 收下课程表', width / 2, qrY + qrSize + 22)
  api.setFill('#94a3b8')
  api.setFont('400 20px sans-serif', 20)
  ctx.fillText(`用微信打开 ${APP_BRAND} 小程序`, width / 2, qrY + qrSize + 56)
}

function renderPoster() {
  const layout = buildLayout()
  const { width, height } = layout
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
      paint(ctx, api, layout, qrImg)
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
    query.select('#scheduleSharePosterCanvas2d').fields({ node: true, size: true }).exec((res) => {
      const node = res && res[0] && res[0].node
      if (!node) { renderStage.value = '生成失败(canvas)'; return }
      const canvas = node
      const ctx = canvas.getContext('2d')
      // pixelRatio 改用 getWindowInfo（getSystemInfoSync 已废弃），旧基础库回退
      const dpr = ((wx.getWindowInfo ? wx.getWindowInfo() : (wx.getSystemInfoSync ? wx.getSystemInfoSync() : {})).pixelRatio) || 2
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      ctx.scale(dpr, dpr)
      const api = makeCanvasApi(ctx)
      const finish = (qrImg) => {
        paint(ctx, api, layout, qrImg)
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
  const ctx = uni.createCanvasContext('scheduleSharePosterCanvas', instance && instance.proxy)
  const api = makeCanvasApi(ctx)
  paint(ctx, api, layout, props.qrSource || null)
  ctx.draw(false, () => {
    setTimeout(() => {
      uni.canvasToTempFilePath({
        canvasId: 'scheduleSharePosterCanvas', x: 0, y: 0, width, height,
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
    a.download = `schedule-share-${Date.now()}.png`
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
      success: () => { emit('shared'); },
      fail: () => uni.showToast({ title: '已取消分享', icon: 'none' })
    })
  } else {
    uni.showToast({ title: '当前微信版本不支持，请先保存图片', icon: 'none' })
  }
  // #endif
}

// 转发小程序链接：按钮 open-type="share" 会触发页面的 onShareAppMessage，这里仅做提示/埋点
function handleLinkShare() {
  emit('link')
}

function handleClose() {
  emit('close')
}
</script>

<style scoped>
.poster-overlay {
  position: fixed; left: 0; top: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.65); z-index: 9999;
  display: flex; align-items: flex-end; justify-content: center;
}
.poster-shell {
  width: 100%; max-width: 760rpx;
  background: #ffffff;
  border-top-left-radius: 28rpx; border-top-right-radius: 28rpx;
  display: flex; flex-direction: column;
  max-height: 90vh;
  padding-bottom: env(safe-area-inset-bottom);
}
.poster-topbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 28rpx 32rpx 12rpx;
  box-sizing: border-box; width: 100%;
}
.poster-title { font-size: 32rpx; font-weight: 700; color: #1f2937; }
.poster-close {
  width: 60rpx; height: 60rpx; border-radius: 50%;
  background: #f1f5f9; display: flex; align-items: center; justify-content: center;
}
.poster-close__icon { font-size: 40rpx; color: #64748b; line-height: 1; }
.poster-stage {
  flex: 1; min-height: 0; padding: 12rpx 32rpx;
  box-sizing: border-box; width: 100%;
}
.poster-frame {
  width: 100%; border-radius: 20rpx; overflow: hidden;
  background: #f5f7fa; min-height: 400rpx;
  display: flex; align-items: center; justify-content: center;
}
.poster-preview { width: 100%; display: block; }
.poster-loading { display: flex; flex-direction: column; align-items: center; gap: 18rpx; padding: 80rpx 0; }
.poster-loading__spinner {
  width: 56rpx; height: 56rpx; border-radius: 50%;
  border: 6rpx solid #e2e8f0; border-top-color: #2196f3;
  animation: posterSpin 0.9s linear infinite;
}
@keyframes posterSpin { to { transform: rotate(360deg); } }
.poster-loading__text { font-size: 26rpx; color: #94a3b8; }
.poster-hint { display: block; text-align: center; font-size: 24rpx; color: #94a3b8; padding: 8rpx 32rpx 0; box-sizing: border-box; width: 100%; }

.poster-actions {
  display: flex; flex-direction: column; gap: 16rpx;
  padding: 20rpx 32rpx 28rpx; box-sizing: border-box; width: 100%;
}
.poster-actions__row { display: flex; gap: 20rpx; }
.poster-btn {
  flex: 1; height: 88rpx; border-radius: 44rpx; border: none; margin: 0;
  display: flex; align-items: center; justify-content: center; gap: 8rpx;
}
.poster-btn::after { border: none; }
.poster-btn[disabled] { opacity: 0.45; }
.poster-btn__icon { font-size: 30rpx; }
.poster-btn--ghost { background: #f1f5f9; }
.poster-btn--ghost .poster-btn__text { color: #475569; font-size: 28rpx; font-weight: 600; }
.poster-btn--link { background: #e8f5e9; }
.poster-btn--link .poster-btn__text { color: #2e7d32; font-size: 28rpx; font-weight: 600; }
.poster-btn--primary { background: #2196f3; }
.poster-btn--primary .poster-btn__text { color: #ffffff; font-size: 28rpx; font-weight: 600; }
</style>
