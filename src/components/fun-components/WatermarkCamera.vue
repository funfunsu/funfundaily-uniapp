<template>
  <!-- 全屏/半屏遮罩容器 -->
  <view class="wm-overlay" @tap.self="handleClose">
    <view
      class="wm-container"
      :class="fullscreen ? 'wm-container--full' : 'wm-container--half'"
      @tap.stop
    >
      <view class="wm-header">
        <text class="wm-title">水印拍照</text>
        <text class="wm-close" @click="handleClose">×</text>
      </view>

      <view class="wm-body" @tap.stop>
        <image
          v-if="resultImg"
          :src="resultImg"
          class="wm-preview"
          mode="aspectFit"
        />
        <view v-if="isRendering" class="wm-loading">
          <view class="wm-loading-dot"></view>
          <view class="wm-loading-main">
            <text class="wm-loading-text">{{ renderStage }}</text>
            <view class="wm-progress-track">
              <view class="wm-progress-bar" :style="{ width: renderProgress + '%' }"></view>
            </view>
          </view>
        </view>
        <view class="wm-input-row" v-if="!props.initialWatermarkName" @tap.stop>
          <input
            v-model="customWatermark"
            placeholder="自定义水印（如植物名称）"
            @tap.stop
          />
        </view>

        <view class="wm-actions">
          <button class="wm-btn wm-btn--ghost" type="default" @click="handleTakePhoto">重拍</button>
          <button class="wm-btn wm-btn--ghost" type="default" :disabled="!resultImg || isRendering" @click="handleSave">
            保存到相册
          </button>
          <!-- #ifdef MP-WEIXIN -->
          <button
            class="wm-btn wm-btn--primary"
            type="primary"
            :disabled="!resultImg || isRendering"
            @tap="handleShareImageMenu"
          >
            分享照片
          </button>
          <!-- #endif -->
          <!-- #ifndef MP-WEIXIN -->
          <button class="wm-btn wm-btn--primary" type="primary" :disabled="!resultImg || isRendering" @click="handleShareFallback">
            分享照片
          </button>
          <!-- #endif -->
        </view>
      </view>

      <!-- 隐藏画布用于绘制水印 -->
      <!-- #ifdef MP-WEIXIN -->
      <canvas
        v-if="!isH5"
        id="watermarkCanvas2d"
        type="2d"
        :style="`position:absolute;left:-9999px;top:-9999px;width:${canvasWidth}px;height:${canvasHeight}px;`"
      ></canvas>
      <!-- #endif -->

      <!-- #ifndef MP-WEIXIN -->
      <canvas
        v-if="!isH5"
        canvas-id="watermarkCanvas"
        :style="`position:absolute;left:-9999px;top:-9999px;width:${canvasWidth}px;height:${canvasHeight}px;`"
        :width="canvasWidth"
        :height="canvasHeight"
      ></canvas>
      <!-- #endif -->
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted, watch, getCurrentInstance, computed, nextTick } from 'vue'

const props = defineProps({
  // 是否全屏覆盖，false 时为半屏弹层
  fullscreen: { type: Boolean, default: true },
  // 初始水印名称（右上第一行）
  initialWatermarkName: { type: String, default: '' },
  // 初始水印时间文案（右上第二行，如“第55天”）
  initialWatermarkTime: { type: String, default: '' },
  // 兼容旧字段
  initialWatermark: { type: String, default: '' },
  // 小程序码图片地址（建议放在 static 下）
  miniProgramCodeSrc: { type: String, default: '/static/images/miniprogram-code-event.png' }
})

const emit = defineEmits(['photoTaken', 'close', 'shareRequested'])

// 原始照片路径
const originalImg = ref('')
// 带水印的预览图路径
const resultImg = ref('')
const customWatermark = ref(props.initialWatermarkName || props.initialWatermark)
const canvasWidth = ref(1000)
const canvasHeight = ref(1000)
const isRendering = ref(false)
const renderProgress = ref(0)
const renderStage = ref('正在准备...')
let renderTimer = null
const PREVIEW_MAX_SIDE = 1200
const HD_MAX_SIDE = 2800

// 组件实例，用于 H5 等平台正确获取 canvas 上下文
const instance = getCurrentInstance()

// 是否为 H5 平台（构建时常量），用于区分 canvas 实现
const isH5 = computed(() => {
  return typeof process !== 'undefined' && process.env && process.env.UNI_PLATFORM === 'h5'
})

onMounted(() => {
  // 组件弹出时立即触发拍照
  handleTakePhoto()
})

function handleTakePhoto() {
  uni.chooseImage({
    count: 1,
    sourceType: ['camera'],
    success: (res) => {
      if (res.tempFilePaths && res.tempFilePaths.length > 0) {
        originalImg.value = res.tempFilePaths[0]
        // 先展示原图，避免空白等待
        resultImg.value = originalImg.value
        isRendering.value = true
        startRenderProgress()
        drawWatermark(PREVIEW_MAX_SIDE)
      }
    },
    fail: () => {
      // 用户取消拍照时直接关闭
      handleClose()
    }
  })
}

function startRenderProgress() {
  renderStage.value = '正在加载图片...'
  renderProgress.value = 8
  if (renderTimer) {
    clearInterval(renderTimer)
    renderTimer = null
  }
  renderTimer = setInterval(() => {
    if (renderProgress.value < 92) {
      renderProgress.value += 2
    }
  }, 120)
}

function setRenderStage(stage, minProgress) {
  renderStage.value = stage
  if (renderProgress.value < minProgress) {
    renderProgress.value = minProgress
  }
}

function finishRenderProgress() {
  renderStage.value = '水印生成完成'
  renderProgress.value = 100
  if (renderTimer) {
    clearInterval(renderTimer)
    renderTimer = null
  }
  setTimeout(() => {
    isRendering.value = false
    renderProgress.value = 0
  }, 220)
}

function failRenderProgress() {
  if (renderTimer) {
    clearInterval(renderTimer)
    renderTimer = null
  }
  isRendering.value = false
  renderProgress.value = 0
}

function renderHdThen(callback, stageText = '正在生成高清图片...') {
  if (!originalImg.value) {
    callback && callback()
    return
  }
  isRendering.value = true
  startRenderProgress()
  setRenderStage(stageText, 18)
  drawWatermark(HD_MAX_SIDE, () => {
    callback && callback()
  })
}

function getMiniCodeRect(width, height, margin) {
  const size = Math.max(120, Math.floor(Math.min(width, height) * 0.18))
  return {
    x: margin,
    y: Math.max(margin, height - margin - size),
    size
  }
}

function resolveMiniCodePath(done) {
  if (!props.miniProgramCodeSrc) {
    done && done('')
    return
  }

  const normalizeStaticPath = (raw) => {
    const value = String(raw || '').trim()
    if (!value) return ''
    if (/^(https?:)?\/\//i.test(value) || value.startsWith('wxfile://') || value.startsWith('data:')) {
      return value
    }
    if (value.startsWith('/')) return value
    if (value.startsWith('static/')) return `/${value}`
    return `/${value.replace(/^\.\//, '')}`
  }

  const src = normalizeStaticPath(props.miniProgramCodeSrc)
  const candidates = src ? [src] : []

  let index = 0
  const tryNext = () => {
    if (index >= candidates.length) {
      done && done('')
      return
    }

    const current = candidates[index]
    index += 1
    let settled = false
    const timer = setTimeout(() => {
      if (settled) return
      settled = true
      tryNext()
    }, 1200)

    uni.getImageInfo({
      src: current,
      success: (codeInfo) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        done && done(codeInfo.path || current)
      },
      fail: () => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        tryNext()
      }
    })
  }

  tryNext()
}

function queryWeixinCanvas2d(done, fail) {
  if (typeof wx === 'undefined' || !wx.createSelectorQuery) {
    fail && fail()
    return
  }
  const query = wx.createSelectorQuery()
  if (instance && instance.proxy && query.in) {
    query.in(instance.proxy)
  }
  query
    .select('#watermarkCanvas2d')
    .fields({ node: true, size: true })
    .exec((res) => {
      const data = res && res[0]
      if (!data || !data.node) {
        fail && fail()
        return
      }
      done && done(data)
    })
}

function loadCanvas2dImage(canvas, src, onSuccess, onFail) {
  const normalizeStaticPath = (raw) => {
    const value = String(raw || '').trim()
    if (!value) return ''
    if (/^(https?:)?\/\//i.test(value) || value.startsWith('wxfile://') || value.startsWith('data:')) {
      return value
    }
    if (value.startsWith('/')) return value
    if (value.startsWith('static/')) return `/${value}`
    return `/${value.replace(/^\.\//, '')}`
  }
  try {
    const img = canvas.createImage()
    img.onload = () => onSuccess && onSuccess(img)
    img.onerror = () => onFail && onFail()
    img.src = normalizeStaticPath(src)
  } catch (e) {
    onFail && onFail()
  }
}

function drawRoundRectPath(ctx, x, y, width, height, radius) {
  const r = Math.max(0, Math.min(radius, Math.min(width, height) / 2))
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + width - r, y)
  ctx.arcTo(x + width, y, x + width, y + r, r)
  ctx.lineTo(x + width, y + height - r)
  ctx.arcTo(x + width, y + height, x + width - r, y + height, r)
  ctx.lineTo(x + r, y + height)
  ctx.arcTo(x, y + height, x, y + height - r, r)
  ctx.lineTo(x, y + r)
  ctx.arcTo(x, y, x + r, y, r)
  ctx.closePath()
}

function getPosterHeadlineLines() {
  const name = String(customWatermark.value || props.initialWatermarkName || '').trim()
  const day = String(props.initialWatermarkTime || '').replace(/\s+/g, '').trim()

  if (name || day) {
    return {
      titleLine: name || '记录此刻',
      dayLine: day
    }
  }

  const legacy = String(props.initialWatermark || '').trim()
  if (!legacy) {
    return { titleLine: '记录此刻', dayLine: '' }
  }
  return { titleLine: legacy, dayLine: '' }
}

function drawVerticalBrandColumn(ctx, brandText, x, startY, endY, step) {
  for (let y = startY; y <= endY; y += step) {
    ctx.fillText(brandText, x, y)
  }
}

function drawPosterFrameBrand(ctx, width, height, brandText) {
  const frame = Math.max(18, Math.floor(Math.min(width, height) * 0.038))
  const frameColor = 'rgba(198,234,62,0.88)'
  const cornerColor = 'rgba(0, 122, 255, 0.88)'

  ctx.fillStyle = frameColor
  ctx.fillRect(0, 0, width, frame)
  ctx.fillRect(0, height - frame, width, frame)
  ctx.fillRect(0, 0, frame, height)
  ctx.fillRect(width - frame, 0, frame, height)

  const corner = Math.max(frame * 2.1, Math.floor(Math.min(width, height) * 0.12))
  ctx.beginPath()
  ctx.moveTo(width - corner, 0)
  ctx.lineTo(width, 0)
  ctx.lineTo(width, corner)
  ctx.closePath()
  ctx.fillStyle = cornerColor
  ctx.fill()

  const corner2 = Math.max(frame * 2.1, Math.floor(Math.min(width, height) * 0.12))*2
  ctx.beginPath()
  ctx.moveTo(0, height - corner2)
  ctx.lineTo(0, height)
  ctx.lineTo(corner2, height)
  ctx.closePath()
  ctx.fillStyle = cornerColor
  ctx.fill()

  const textColor = 'rgba(0,160,120,0.56)'
  const fontSize = Math.max(12, Math.floor(frame * 0.52))
  ctx.font = `500 ${fontSize}px sans-serif`
  ctx.fillStyle = textColor
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'

  const tile = Math.max(170, Math.floor(width / 3.2))
  for (let x = frame * 1.05; x < width - frame; x += tile) {
    ctx.fillText(brandText, x, frame / 2)
    ctx.fillText(brandText, x, height - frame / 2)
  }


  // 右侧边框（竖排，从上到下）
  ctx.save()
  ctx.translate(width - frame / 2, frame * 1.8)
  ctx.rotate(Math.PI / 2)
  for (let y = frame; y < height - frame * 3.0; y += Math.max(200, Math.floor(height / 3.6))) {
    ctx.fillText(brandText, y, 1.8  )
  }
  ctx.restore()


  // 左侧边框（竖排，从上到下）
  ctx.save()
  ctx.translate(frame / 2, frame * 1.8)
  ctx.rotate(-Math.PI / 2)
  for (let y = frame; y < height - frame * 3.0; y += Math.max(200, Math.floor(height / 3.6))) {
    ctx.fillText(brandText, y-height, 1.8)
  }
  ctx.restore()

  return { frame, corner }
}

function drawPosterHeadline(ctx, rightX, topY, titleLine, dayLine, width) {
  const titleSize = Math.max(34, Math.floor(width / 14))*0.8
  const daySize = titleSize*0.8
  const drawOutlined = (text, x, y, size, fill, maxWidth) => {
    if (!text) return
    ctx.textAlign = 'right'
    ctx.textBaseline = 'top'
    ctx.lineJoin = 'round'
    ctx.miterLimit = 2
    let finalSize = size
    ctx.font = `900 ${finalSize}px sans-serif`
    if (maxWidth) {
      while (finalSize > 24 && ctx.measureText(text).width > maxWidth) {
        finalSize -= 2
        ctx.font = `900 ${finalSize}px sans-serif`
      }
    }
    ctx.strokeStyle = 'rgba(8,14,24,0.95)'
    ctx.lineWidth = Math.max(6, Math.floor(finalSize * 0.24))
    ctx.strokeText(text, x, y)
    ctx.strokeStyle = 'rgba(0,210,220,0.96)'
    ctx.lineWidth = Math.max(3, Math.floor(finalSize * 0.1))
    ctx.strokeText(text, x, y)
    ctx.fillStyle = fill
    ctx.fillText(text, x, y)
    return finalSize
  }

  const maxWidth = Math.max(140, Math.floor(width * 0.56))
  const hasTitle = !!titleLine
  const usedTitleSize = drawOutlined(titleLine, rightX, topY, titleSize, 'rgba(255,255,255,0.98)', maxWidth) || titleSize
  if (dayLine) {
    const y = hasTitle ? (topY + usedTitleSize + Math.max(8, Math.floor(usedTitleSize * 0.2))) : topY
    const normalizedDay = String(dayLine).replace(/\s+/g, '')
    drawOutlined(normalizedDay, rightX, y, daySize, 'rgba(255,230,26,0.98)', maxWidth)
  }
}

function drawThemePill(ctx, x, y, width, height, text, font, textColor) {
  const radius = Math.max(10, Math.floor(height * 0.45))
  const grad = ctx.createLinearGradient(x, y, x + width, y + height)
  grad.addColorStop(0, 'rgba(0,122,255,0.4)')
  grad.addColorStop(1, 'rgba(0,122,255,0.26)')
  ctx.shadowColor = 'rgba(0,122,255,0.14)'
  ctx.shadowBlur = Math.max(6, Math.floor(height * 0.35))
  ctx.shadowOffsetY = Math.max(2, Math.floor(height * 0.08))
  drawRoundRectPath(ctx, x, y, width, height, radius)
  ctx.fillStyle = grad
  ctx.fill()
  ctx.shadowColor = 'rgba(0,0,0,0)'
  ctx.shadowBlur = 0
  ctx.shadowOffsetY = 0
  drawRoundRectPath(ctx, x, y, width, height, radius)
  ctx.strokeStyle = 'rgba(180,225,255,0.48)'
  ctx.lineWidth = 1
  ctx.stroke()
  ctx.font = font
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  const padX = Math.max(10, Math.floor(height * 0.42))
  ctx.fillStyle = textColor
  ctx.fillText(text, x + padX, y + height / 2)
}

function drawCircularTimeText(ctx, text, centerX, centerY, radius, fontSize, useUniApi = false) {
  const chars = Array.from(String(text || ''))
  if (!chars.length) return

  const arcSpan = Math.max(Math.PI * 0.9, Math.min(Math.PI * 1.35, chars.length * 0.16))
  const start = Math.PI / 2 + arcSpan / 2

  for (let i = 0; i < chars.length; i += 1) {
    const angle = start - (chars.length === 1 ? 0 : (i * arcSpan) / (chars.length - 1))
    const x = centerX + Math.cos(angle) * radius
    const y = centerY + Math.sin(angle) * radius
    if (ctx.save) ctx.save()
    if (ctx.translate) ctx.translate(x, y)
    if (ctx.rotate) ctx.rotate(angle + Math.PI / 2 + Math.PI)

    if (useUniApi) {
      if (ctx.setFontSize) ctx.setFontSize(Math.max(14, Math.floor(fontSize)))
      if (ctx.setTextAlign) ctx.setTextAlign('center')
      if (ctx.setTextBaseline) ctx.setTextBaseline('middle')
      if (ctx.setFillStyle) ctx.setFillStyle('rgba(235,244,255,0.96)')
      ctx.fillText(chars[i], 0, 0)
    } else {
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.font = `500 ${Math.max(14, Math.floor(fontSize))}px sans-serif`
      ctx.fillStyle = 'rgba(235,244,255,0.96)'
      ctx.fillText(chars[i], 0, 0)
    }

    if (ctx.restore) ctx.restore()
  }
}

function drawQrCircularBackdrop(ctx, centerX, centerY, size, pad, useUniApi = false) {
  const outerR = size / 2 + pad

  if (useUniApi) {
    if (ctx.beginPath && ctx.arc) {
      ctx.beginPath()
      ctx.arc(centerX, centerY, outerR, 0, Math.PI * 2)
      if (ctx.setFillStyle) ctx.setFillStyle('rgba(198,234,62,0.88)')
      ctx.fill()
      ctx.beginPath()
      ctx.arc(centerX, centerY, outerR, 0, Math.PI * 2)
      if (ctx.setStrokeStyle) ctx.setStrokeStyle('rgba(8,194,214,0.90)')
      if (ctx.setLineWidth) ctx.setLineWidth(Math.max(1, Math.floor(pad * 0.2)))
      ctx.stroke()
    }
    return outerR
  }

  if (ctx.beginPath && ctx.arc) {
    ctx.beginPath()
    ctx.arc(centerX, centerY, outerR, 0, Math.PI * 2)
    // ctx.shadowColor = 'rgba(8,194,214,0.88)'
    // ctx.shadowBlur = Math.max(6, Math.floor(pad * 0.9))
    // ctx.shadowOffsetY = Math.max(1, Math.floor(pad * 0.2))
    ctx.fillStyle = 'rgba(198,234,62,0.88)'
    ctx.fill()
    ctx.shadowColor = 'rgba(0,0,0,0)'
    ctx.shadowBlur = 0
    ctx.shadowOffsetY = 0

    ctx.beginPath()
    ctx.arc(centerX, centerY, outerR, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(198,234,62,0.88)'
    ctx.lineWidth = Math.max(1, Math.floor(pad * 0.2))
    ctx.stroke()
  }

  return outerR
}

function drawWatermarkWeixin2d(maxSide, done) {
  uni.getImageInfo({
    src: originalImg.value,
    success: (info) => {
      setRenderStage('正在绘制底图...', 28)
      const sourceWidth = info.width
      const sourceHeight = info.height
      const MAX_SIDE = maxSide
      const scale = Math.min(1, MAX_SIDE / Math.max(sourceWidth, sourceHeight))
      const width = Math.max(1, Math.floor(sourceWidth * scale))
      const height = Math.max(1, Math.floor(sourceHeight * scale))
      canvasWidth.value = width
      canvasHeight.value = height

      nextTick(() => {
        queryWeixinCanvas2d(
          ({ node: canvas }) => {
            const ctx = canvas.getContext('2d')
            const dpr = (typeof wx !== 'undefined' && wx.getSystemInfoSync ? wx.getSystemInfoSync().pixelRatio : 1) || 1
            canvas.width = Math.max(1, Math.floor(width * dpr))
            canvas.height = Math.max(1, Math.floor(height * dpr))
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
            ctx.clearRect(0, 0, width, height)

            loadCanvas2dImage(
              canvas,
              info.path || originalImg.value,
              (baseImg) => {
                ctx.drawImage(baseImg, 0, 0, width, height)

                const brand = 'fungrowth'
                const timeStr = new Date().toLocaleString()
                const baseFont = Math.max(22, Math.floor(width / 24))
                const smallFont = Math.max(18, Math.floor(baseFont * 0.82))
                const codeGap = Math.max(8, Math.floor(width / 100))

                setRenderStage('正在添加品牌时间水印...', 56)
                const { frame } = drawPosterFrameBrand(ctx, width, height, brand)
                const inset = Math.max(8, Math.floor(frame * 0.42))
                const { titleLine, dayLine } = getPosterHeadlineLines()
                drawPosterHeadline(ctx, width - frame - inset, frame + inset, titleLine, dayLine, width)

                ctx.textAlign = 'left'
                ctx.textBaseline = 'middle'
                ctx.font = `400 ${smallFont}px sans-serif`
                const timeTextHeight = smallFont

                const codeSize = Math.max(120, Math.floor(Math.min(width, height) * 0.18))
                const codeRect = {
                  x: frame + inset,
                  y: Math.max(
                    frame + inset,
                    height - frame - inset - codeSize - codeGap - timeTextHeight
                  ),
                  size: codeSize
                }

                const timeTextX = codeRect.x + codeRect.size / 2
                const timeTextY = Math.min(
                  height - frame - inset - Math.max(4, Math.floor(smallFont * 0.2)),
                  codeRect.y + codeRect.size + codeGap + smallFont * 0.7
                )
                if (!props.miniProgramCodeSrc) {
                  ctx.font = `500 ${smallFont}px sans-serif`
                  ctx.textAlign = 'center'
                  ctx.fillStyle = 'rgba(235,244,255,0.96)'
                  ctx.shadowColor = 'rgba(0,0,0,0.35)'
                  ctx.shadowBlur = Math.max(4, Math.floor(smallFont * 0.32))
                  ctx.shadowOffsetY = 1
                  ctx.fillText(timeStr, timeTextX, timeTextY)
                  ctx.shadowColor = 'rgba(0,0,0,0)'
                  ctx.shadowBlur = 0
                  ctx.shadowOffsetY = 0
                }

                if (customWatermark.value && false) {
                  setRenderStage('正在添加自定义水印...', 72)
                  ctx.font = `500 ${smallFont}px sans-serif`
                  const topPadding = margin
                  const customText = customWatermark.value
                  const customWidth = ctx.measureText(customText).width
                  const maxCustomBoxWidth = width - margin * 2
                  const customBoxWidth = Math.min(customWidth + padding * 2, maxCustomBoxWidth)
                  const customBoxHeight = smallFont + padding * 2
                  const customBoxX = Math.max(margin, width - margin - customBoxWidth)
                  const customRadius = Math.max(8, Math.floor(padding))
                  const customGradient = ctx.createLinearGradient(customBoxX, topPadding, customBoxX, topPadding + customBoxHeight)
                  customGradient.addColorStop(0, 'rgba(34,42,66,0.56)')
                  customGradient.addColorStop(1, 'rgba(20,26,40,0.42)')
                  drawRoundRectPath(ctx, customBoxX, topPadding, customBoxWidth, customBoxHeight, customRadius)
                  ctx.fillStyle = customGradient
                  ctx.fill()
                  drawRoundRectPath(ctx, customBoxX, topPadding, customBoxWidth, customBoxHeight, customRadius)
                  ctx.strokeStyle = 'rgba(255,255,255,0.22)'
                  ctx.lineWidth = 1
                  ctx.stroke()
                  ctx.textBaseline = 'middle'
                  ctx.fillStyle = 'rgba(245,249,255,0.95)'
                  ctx.fillText(customText, customBoxX + padding, topPadding + customBoxHeight / 2)
                }

                const export2d = () => {
                  setRenderStage('正在导出图片...', 88)
                  wx.canvasToTempFilePath({
                    canvas,
                    x: 0,
                    y: 0,
                    width,
                    height,
                    destWidth: width,
                    destHeight: height,
                    fileType: 'jpg',
                    quality: 0.92,
                    success: (res) => {
                      resultImg.value = res.tempFilePath
                      finishRenderProgress()
                      done && done(resultImg.value)
                    },
                    fail: () => {
                      resultImg.value = originalImg.value
                      failRenderProgress()
                      done && done(resultImg.value)
                    }
                  })
                }

                if (props.miniProgramCodeSrc) {
                  setRenderStage('正在添加小程序码...', 80)
                  let finished = false
                  const finishOnce = () => {
                    if (finished) return
                    finished = true
                    export2d()
                  }
                  const watchdog = setTimeout(finishOnce, 1500)
                  resolveMiniCodePath((codePath) => {
                    if (finished) return
                    clearTimeout(watchdog)
                    if (!codePath) {
                      finishOnce()
                      return
                    }
                    loadCanvas2dImage(
                      canvas,
                      codePath,
                      (codeImg) => {
                        const { x, y, size } = codeRect || getMiniCodeRect(width, height, margin)
                        const pad = Math.max(8, Math.floor(size * 0.07))
                        const cx = x + size / 2
                        const cy = y + size / 2
                        const outerR = drawQrCircularBackdrop(ctx, cx, cy, size, pad, false)

                        ctx.save()
                        ctx.beginPath()
                        ctx.arc(cx, cy, size / 2, 0, Math.PI * 2)
                        ctx.clip()
                        ctx.drawImage(codeImg, x, y, size, size)
                        ctx.restore()

                        drawCircularTimeText(
                          ctx,
                          timeStr,
                          cx,
                          cy,
                          outerR + Math.max(14, Math.floor(smallFont * 0.9)),
                          Math.max(14, Math.floor(smallFont * 0.86)),
                          false
                        )
                        finishOnce()
                      },
                      () => {
                        finishOnce()
                      }
                    )
                  })
                } else {
                  export2d()
                }
              },
              () => {
                resultImg.value = originalImg.value
                failRenderProgress()
                done && done(resultImg.value)
              }
            )
          },
          () => {
            resultImg.value = originalImg.value
            failRenderProgress()
            done && done(resultImg.value)
          }
        )
      })
    },
    fail: () => {
      resultImg.value = originalImg.value
      failRenderProgress()
      done && done(resultImg.value)
    }
  })
}

function exportCanvasWithRetry(width, height, onSuccess, onFail) {
  const ctxCandidates = [
    undefined,
    instance && instance.proxy,
    instance && instance.proxy && instance.proxy.$scope,
  ]

  const optionsCandidates = [
    { canvasId: 'watermarkCanvas', x: 0, y: 0, width, height, destWidth: width, destHeight: height },
    { canvasId: 'watermarkCanvas' }
  ]

  let ctxIndex = 0
  let optIndex = 0

  const tryExport = () => {
    if (ctxIndex >= ctxCandidates.length) {
      onFail && onFail()
      return
    }
    if (optIndex >= optionsCandidates.length) {
      ctxIndex += 1
      optIndex = 0
      tryExport()
      return
    }

    const opt = optionsCandidates[optIndex]
    const ctxArg = ctxCandidates[ctxIndex]
    const failNext = () => {
      optIndex += 1
      tryExport()
    }

    if (ctxArg) {
      uni.canvasToTempFilePath({
        ...opt,
        success: onSuccess,
        fail: failNext
      }, ctxArg)
    } else {
      uni.canvasToTempFilePath({
        ...opt,
        success: onSuccess,
        fail: failNext
      })
    }
  }

  tryExport()
}

function createMpCanvasContext() {
  const candidates = [
    undefined,
    instance && instance.proxy,
    instance && instance.proxy && instance.proxy.$scope
  ]

  for (let i = 0; i < candidates.length; i += 1) {
    try {
      const arg = candidates[i]
      const ctx = arg ? uni.createCanvasContext('watermarkCanvas', arg) : uni.createCanvasContext('watermarkCanvas')
      if (ctx) return ctx
    } catch (e) {
      // 尝试下一个候选上下文
    }
  }
  return uni.createCanvasContext('watermarkCanvas')
}

function drawWatermark(maxSide = PREVIEW_MAX_SIDE, done) {
  if (!originalImg.value) return

  if (typeof wx !== 'undefined' && wx.createSelectorQuery && !isH5.value) {
    drawWatermarkWeixin2d(maxSide, done)
    return
  }

  // H5 平台：使用原生 canvas 生成带水印的 dataURL
  if (isH5.value) {
    const canvas = typeof document !== 'undefined' ? document.createElement('canvas') : null
    if (!canvas || !canvas.getContext) {
      resultImg.value = originalImg.value
      isRendering.value = false
      return
    }
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = originalImg.value
    img.onload = () => {
      setRenderStage('正在绘制底图...', 28)
      const sourceWidth = img.naturalWidth || img.width
      const sourceHeight = img.naturalHeight || img.height
      // 限制长边，既防止超大图导致卡顿，也避免导出异常裁切
      const MAX_SIDE = maxSide
      const scale = Math.min(1, MAX_SIDE / Math.max(sourceWidth, sourceHeight))
      const width = Math.max(1, Math.floor(sourceWidth * scale))
      const height = Math.max(1, Math.floor(sourceHeight * scale))
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resultImg.value = originalImg.value
        failRenderProgress()
        done && done(resultImg.value)
        return
      }
      ctx.clearRect(0, 0, width, height)
      ctx.drawImage(img, 0, 0, width, height)

      const brand = 'fungrowth'
      const timeStr = new Date().toLocaleString()
      const baseFont = Math.max(22, Math.floor(width / 24))
      const smallFont = Math.max(18, Math.floor(baseFont * 0.82))
      const margin = Math.max(20, Math.floor(width / 40))

      setRenderStage('正在添加品牌时间水印...', 56)
      const { frame } = drawPosterFrameBrand(ctx, width, height, brand)
      const inset = Math.max(8, Math.floor(frame * 0.42))
      const { titleLine, dayLine } = getPosterHeadlineLines()
      drawPosterHeadline(ctx, width - frame - inset, frame + inset, titleLine, dayLine, width)

      const codeGap = Math.max(8, Math.floor(width / 100))
      const codeSize = Math.max(120, Math.floor(Math.min(width, height) * 0.18))
      const codeRect = {
        x: frame + inset,
        y: Math.max(
          frame + inset,
          height - frame - inset - codeSize - codeGap - smallFont
        ),
        size: codeSize
      }

      const timeTextX = codeRect.x + codeRect.size / 2
      const timeTextY = Math.min(
        height - frame - inset - Math.max(4, Math.floor(smallFont * 0.2)),
        codeRect.y + codeRect.size + codeGap + smallFont * 0.7
      )
      if (!props.miniProgramCodeSrc) {
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.font = `500 ${smallFont}px sans-serif`
        ctx.fillStyle = 'rgba(235,244,255,0.96)'
        ctx.shadowColor = 'rgba(0,0,0,0.35)'
        ctx.shadowBlur = Math.max(4, Math.floor(smallFont * 0.32))
        ctx.shadowOffsetY = 1
        ctx.fillText(timeStr, timeTextX, timeTextY)
        ctx.shadowColor = 'rgba(0,0,0,0)'
        ctx.shadowBlur = 0
        ctx.shadowOffsetY = 0
      }

      // 左上角自定义水印
      if (customWatermark.value && false) {
        setRenderStage('正在添加自定义水印...', 72)
        ctx.font = `500 ${smallFont}px sans-serif`
        const topPadding = margin
        const customText = customWatermark.value
        const customWidth = ctx.measureText(customText).width
        const maxCustomBoxWidth = width - margin * 2
        const customBoxWidth = Math.min(customWidth + padding * 2, maxCustomBoxWidth)
        const customBoxHeight = smallFont + padding * 2
        const customBoxX = Math.max(margin, width - margin - customBoxWidth)
        const customRadius = Math.max(8, Math.floor(padding))
        const customGradient = ctx.createLinearGradient(customBoxX, topPadding, customBoxX, topPadding + customBoxHeight)
        customGradient.addColorStop(0, 'rgba(34,42,66,0.56)')
        customGradient.addColorStop(1, 'rgba(20,26,40,0.42)')
        drawRoundRectPath(ctx, customBoxX, topPadding, customBoxWidth, customBoxHeight, customRadius)
        ctx.fillStyle = customGradient
        ctx.fill()
        drawRoundRectPath(ctx, customBoxX, topPadding, customBoxWidth, customBoxHeight, customRadius)
        ctx.strokeStyle = 'rgba(255,255,255,0.22)'
        ctx.lineWidth = 1
        ctx.stroke()
        ctx.fillStyle = 'rgba(245,249,255,0.95)'
        ctx.fillText(customText, customBoxX + padding, topPadding + padding)
      }

      const exportImage = () => {
        try {
          setRenderStage('正在导出图片...', 88)
          resultImg.value = canvas.toDataURL('image/jpeg', 0.9)
        } catch (e) {
          console.error('H5 canvas 导出失败:', e)
          resultImg.value = originalImg.value
        } finally {
          finishRenderProgress()
          done && done(resultImg.value)
        }
      }

      const drawMiniCodeAndExport = () => {
        if (!props.miniProgramCodeSrc) {
          exportImage()
          return
        }
        setRenderStage('正在添加小程序码...', 80)
        const codeImg = new Image()
        codeImg.crossOrigin = 'anonymous'
        codeImg.src = props.miniProgramCodeSrc
        codeImg.onload = () => {
          const { x, y, size } = codeRect
          const pad = Math.max(8, Math.floor(size * 0.07))
          const cx = x + size / 2
          const cy = y + size / 2
          const outerR = drawQrCircularBackdrop(ctx, cx, cy, size, pad, false)

          ctx.save()
          ctx.beginPath()
          ctx.arc(cx, cy, size / 2, 0, Math.PI * 2)
          ctx.clip()
          ctx.drawImage(codeImg, x, y, size, size)
          ctx.restore()

          drawCircularTimeText(
            ctx,
            timeStr,
            cx,
            cy,
            outerR + Math.max(14, Math.floor(smallFont * 0.9)),
            Math.max(14, Math.floor(smallFont * 0.86)),
            false
          )
          exportImage()
        }
        codeImg.onerror = () => {
          exportImage()
        }
      }

      drawMiniCodeAndExport()
    }
    img.onerror = () => {
      resultImg.value = originalImg.value
      failRenderProgress()
      done && done(resultImg.value)
    }
    return
  }

  // 非 H5 平台仍使用 uni-app canvas 能力
  const ctx = createMpCanvasContext()
  uni.getImageInfo({
    src: originalImg.value,
    success: (info) => {
      setRenderStage('正在绘制底图...', 28)
      const sourceWidth = info.width
      const sourceHeight = info.height
      const MAX_SIDE = maxSide
      const scale = Math.min(1, MAX_SIDE / Math.max(sourceWidth, sourceHeight))
      const width = Math.max(1, Math.floor(sourceWidth * scale))
      const height = Math.max(1, Math.floor(sourceHeight * scale))
      canvasWidth.value = width
      canvasHeight.value = height

      nextTick(() => {
        const baseImgPath = info.path || originalImg.value
        try {
          ctx.drawImage(baseImgPath, 0, 0, width, height)
        } catch (e) {
          console.error('绘制底图失败:', e)
          resultImg.value = originalImg.value
          failRenderProgress()
          done && done(resultImg.value)
          return
        }

        const brand = 'fungrowth'
        const timeStr = new Date().toLocaleString()
        const baseFont = Math.max(22, Math.floor(width / 24))
        const smallFont = Math.max(18, Math.floor(baseFont * 0.82))

        setRenderStage('正在添加品牌时间水印...', 56)
        const margin = Math.max(20, Math.floor(width / 40))
        const { frame } = drawPosterFrameBrand(ctx, width, height, brand)
        const inset = Math.max(8, Math.floor(frame * 0.42))
        const { titleLine, dayLine } = getPosterHeadlineLines()
        drawPosterHeadline(ctx, width - frame - inset, frame + inset, titleLine, dayLine, width)

        const codeGap = Math.max(8, Math.floor(width / 100))
        const codeSize = Math.max(120, Math.floor(Math.min(width, height) * 0.18))
        const codeRect = {
          x: frame + inset,
          y: Math.max(
            frame + inset,
            height - frame - inset - codeSize - codeGap - smallFont
          ),
          size: codeSize
        }

        const timeTextX = codeRect.x + codeRect.size / 2
        const timeTextY = Math.min(
          height - frame - inset - Math.max(4, Math.floor(smallFont * 0.2)),
          codeRect.y + codeRect.size + codeGap + smallFont * 0.7
        )
        if (!props.miniProgramCodeSrc) {
          if (ctx.setTextAlign) ctx.setTextAlign('center')
          ctx.setFontSize(smallFont)
          ctx.setFillStyle('rgba(235,244,255,0.96)')
          ctx.fillText(timeStr, timeTextX, timeTextY)
        }

        // 自定义水印（右上）
        if (customWatermark.value && false) {
          setRenderStage('正在添加自定义水印...', 72)
          const topPadding = margin
          const customText = customWatermark.value
          const customWidth = customText.length * smallFont * 0.6
          const maxCustomBoxWidth = width - margin * 2
          const customBoxWidth = Math.min(customWidth + padding * 2, maxCustomBoxWidth)
          const customBoxHeight = smallFont + padding * 2
          const customBoxX = Math.max(margin, width - margin - customBoxWidth)
          ctx.setFillStyle('rgba(0,0,0,0.45)')
          ctx.fillRect(customBoxX, topPadding, customBoxWidth, customBoxHeight)
          ctx.setFontSize(smallFont)
          ctx.setFillStyle('rgba(255,255,255,0.95)')
          ctx.fillText(customText, customBoxX + padding, topPadding + padding)
        }

        const exportCanvas = () => {
          setRenderStage('正在导出图片...', 88)
          let exported = false
          const doExportOnce = () => {
            if (exported) return
            exported = true
            setTimeout(() => {
              exportCanvasWithRetry(
                width,
                height,
                (res) => {
                  resultImg.value = res.tempFilePath
                  finishRenderProgress()
                  done && done(resultImg.value)
                },
                () => {
                  console.error('canvasToTempFilePath 多次重试后仍失败')
                  resultImg.value = originalImg.value
                  failRenderProgress()
                  done && done(resultImg.value)
                }
              )
            }, 80)
          }

          try {
            ctx.draw(false, () => {
              doExportOnce()
            })
          } catch (e) {
            console.error('ctx.draw 调用失败:', e)
            doExportOnce()
            return
          }

          setTimeout(() => {
            doExportOnce()
          }, 260)
        }

        if (props.miniProgramCodeSrc) {
          setRenderStage('正在添加小程序码...', 80)
          let finished = false
          const finishOnce = () => {
            if (finished) return
            finished = true
            exportCanvas()
          }
          const watchdog = setTimeout(() => {
            finishOnce()
          }, 1500)

          resolveMiniCodePath((codePath) => {
            if (finished) return
            clearTimeout(watchdog)
            if (codePath) {
              try {
                const { x, y, size } = codeRect
                const pad = Math.max(8, Math.floor(size * 0.07))
                const cx = x + size / 2
                const cy = y + size / 2
                const outerR = drawQrCircularBackdrop(ctx, cx, cy, size, pad, true)

                if (ctx.save && ctx.clip && ctx.restore && ctx.arc) {
                  ctx.save()
                  ctx.beginPath()
                  ctx.arc(cx, cy, size / 2, 0, Math.PI * 2)
                  ctx.clip()
                  ctx.drawImage(codePath, x, y, size, size)
                  ctx.restore()
                } else {
                  ctx.drawImage(codePath, x, y, size, size)
                }

                drawCircularTimeText(
                  ctx,
                  timeStr,
                  cx,
                  cy,
                  outerR + Math.max(14, Math.floor(smallFont * 0.9)),
                  Math.max(14, Math.floor(smallFont * 0.86)),
                  true
                )
              } catch (e) {
                console.error('绘制小程序码失败:', e)
              }
            }
            finishOnce()
          })
        } else {
          exportCanvas()
        }
      })
    },
    fail: () => {
      failRenderProgress()
      handleClose()
      done && done(resultImg.value)
    }
  })
}

// 当用户修改自定义水印时，重新生成预览，让用户看到最新的水印效果
watch(customWatermark, () => {
  // 只有已选照片时才重绘
  if (originalImg.value) {
    isRendering.value = true
    startRenderProgress()
    drawWatermark(PREVIEW_MAX_SIDE)
  }
})

function handleConfirm() {
  if (resultImg.value) {
    emit('photoTaken', resultImg.value)
  }
  handleClose()
}

function handlePrepareShare() {
  if (!resultImg.value) return
  const title = customWatermark.value || props.initialWatermarkName || props.initialWatermark || '水印照片'
  emit('shareRequested', { imageUrl: resultImg.value, title })
}

function handleShareImageMenu() {
  if (!resultImg.value) return
  // #ifdef MP-WEIXIN
  renderHdThen(() => {
    if (typeof wx !== 'undefined' && wx.showShareImageMenu) {
      wx.showShareImageMenu({
        path: resultImg.value,
        success: () => {
          emit('photoTaken', resultImg.value)
          uni.showToast({ title: '已打开分享面板', icon: 'none' })
          handleClose()
        },
        fail: () => {
          uni.showToast({ title: '分享失败，请重试', icon: 'none' })
        }
      })
      return
    }
    // 不支持时回退
    uni.showToast({ title: '当前微信版本不支持直接分享图片，请先保存', icon: 'none' })
  }, '正在生成高清分享图...')
  // #endif
}

function handleShareFallback() {
  if (!resultImg.value) return
  uni.showToast({ title: '当前平台请先保存图片再分享', icon: 'none' })
}

function handleSave() {
  if (!resultImg.value) return
  const doSave = () => {
    // H5 平台：触发浏览器下载，用户再保存到相册
    if (typeof process !== 'undefined' && process.env && process.env.UNI_PLATFORM === 'h5') {
      if (typeof document !== 'undefined') {
        const a = document.createElement('a')
        a.href = resultImg.value
        a.download = `watermark-photo-${Date.now()}.jpg`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        uni.showToast({ title: '已开始下载，可保存到相册', icon: 'none' })
      }
      return
    }

    uni.saveImageToPhotosAlbum({
      filePath: resultImg.value,
      success: () => {
        uni.showToast({ title: '已保存到相册', icon: 'success' })
      },
      fail: () => {
        uni.showToast({ title: '保存失败，请检查权限', icon: 'none' })
      }
    })
  }

  renderHdThen(doSave, '正在生成高清导出图...')
}

function handleClose() {
  if (renderTimer) {
    clearInterval(renderTimer)
    renderTimer = null
  }
  emit('close')
}
</script>

<style scoped>
.wm-overlay {
  position: fixed;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}

.wm-container {
  background: #fff;
  border-radius: 16rpx;
  width: 90%;
  display: flex;
  flex-direction: column;
}

.wm-container--full {
  height: 90%;
}

.wm-container--half {
  height: 60%;
}

.wm-header {
  padding: 20rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #eee;
}

.wm-title {
  font-size: 32rpx;
  font-weight: 600;
}

.wm-close {
  font-size: 40rpx;
}

.wm-body {
  padding: 20rpx;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.wm-preview {
  width: 100%;
  border-radius: 8rpx;
  background: #f5f5f5;
  flex: 1;
  min-height: 0;
}

.wm-loading {
  position: absolute;
  left: 50%;
  top: 45%;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 16rpx 24rpx;
  border-radius: 999rpx;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  font-size: 24rpx;
}

.wm-loading-main {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  min-width: 240rpx;
}

.wm-loading-dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  background: #fff;
  animation: wmPulse 1s infinite ease-in-out;
}

.wm-loading-text {
  font-size: 24rpx;
}

.wm-progress-track {
  width: 100%;
  height: 8rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.24);
  overflow: hidden;
}

.wm-progress-bar {
  height: 100%;
  border-radius: 999rpx;
  background: linear-gradient(90deg, #60a5fa 0%, #34d399 100%);
  transition: width 0.16s ease;
}

@keyframes wmPulse {
  0% { transform: scale(0.8); opacity: 0.6; }
  50% { transform: scale(1.2); opacity: 1; }
  100% { transform: scale(0.8); opacity: 0.6; }
}

.wm-input-row {
  margin-top: auto;
  padding-top: 12rpx;
  width: 100%;
  overflow: hidden;
}

input {
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  border: 1px solid #ccc;
  border-radius: 8rpx;
  height: 72rpx;
  line-height: 72rpx;
  padding: 0 20rpx;
}

.wm-actions {
  margin-top: 12rpx;
  padding-top: 12rpx;
  display: flex;
  gap: 12rpx;
}

.wm-btn {
  flex: 1;
  height: 72rpx;
  line-height: 72rpx;
  font-size: 26rpx;
  border-radius: 40rpx;
  padding: 0;
}

.wm-btn--ghost {
  background: #f5f5f5;
  color: #333;
  border: 1px solid #e6e6e6;
}

.wm-btn--primary {
  background: #111;
  color: #fff;
  border: 1px solid #111;
}

.wm-btn[disabled] {
  opacity: 0.5;
}
</style>
