<template>
  <view class="wm-overlay" @tap.self="handleClose">
    <view
      class="wm-shell"
      :class="fullscreen ? 'wm-shell--full' : 'wm-shell--half'"
      @tap.stop
    >
      <!-- ===== 顶栏：标题 + 当前模板 + 关闭按钮 ===== -->
      <view class="wm-topbar">
        <view class="wm-topbar__meta">
          <text class="wm-topbar__title">水印拍照</text>
          <text class="wm-topbar__divider">·</text>
          <text class="wm-topbar__subtitle">{{ currentTemplate.emoji }} {{ currentTemplate.name }}</text>
        </view>
        <view class="wm-topbar__close" @click="handleClose">
          <text class="wm-topbar__close-icon">×</text>
        </view>
      </view>

      <!-- ===== 照片预览舞台 ===== -->
      <view class="wm-stage" @tap.stop>
        <view class="wm-frame">
          <image
            v-if="resultImg"
            :src="resultImg"
            class="wm-preview"
            mode="aspectFit"
          />
          <view v-else class="wm-empty">
            <text class="wm-empty__icon">📷</text>
            <text class="wm-empty__text">等待拍照</text>
          </view>
          <view v-if="isRendering" class="wm-progress">
            <view class="wm-progress__card">
              <view class="wm-progress__pulse"></view>
              <view class="wm-progress__main">
                <text class="wm-progress__stage">{{ renderStage }}</text>
                <view class="wm-progress__track">
                  <view class="wm-progress__bar" :style="{ width: renderProgress + '%' }"></view>
                </view>
              </view>
              <text class="wm-progress__percent">{{ renderProgress }}%</text>
            </view>
          </view>
        </view>
      </view>

      <!-- ===== 自定义水印输入（仅在父组件没传 initialWatermarkName 时显示） ===== -->
      <view class="wm-input" v-if="!props.initialWatermarkName" @tap.stop>
        <input
          v-model="customWatermark"
          placeholder="自定义水印（如植物名称）"
          class="wm-input__field"
          placeholder-class="wm-input__placeholder"
          @tap.stop
        />
      </view>

      <!-- ===== 模板选择 ===== -->
      <view class="wm-templates" @tap.stop>
        <text class="wm-templates__label">水印样式</text>
        <scroll-view scroll-x class="wm-templates__scroll" show-scrollbar="false">
          <view class="wm-templates__row">
            <view
              v-for="t in WATERMARK_TEMPLATES"
              :key="t.id"
              class="wm-template-chip"
              :class="{ 'wm-template-chip--active': currentTemplateId === t.id }"
              @tap.stop="selectTemplate(t.id)"
            >
              <text class="wm-template-chip__emoji">{{ t.emoji }}</text>
              <text class="wm-template-chip__name">{{ t.name }}</text>
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- ===== 操作按钮 ===== -->
      <view class="wm-actions">
        <button class="wm-btn wm-btn--ghost" @click="handleTakePhoto">
          <text class="wm-btn__icon">↻</text>
          <text class="wm-btn__text">重拍</text>
        </button>
        <button class="wm-btn wm-btn--ghost" :disabled="!resultImg || isRendering" @click="handleSave">
          <text class="wm-btn__icon">⤓</text>
          <text class="wm-btn__text">保存</text>
        </button>
        <!-- #ifdef MP-WEIXIN -->
        <button
          class="wm-btn wm-btn--primary"
          :disabled="!resultImg || isRendering"
          @tap="handleShareImageMenu"
        >
          <text class="wm-btn__icon">↗</text>
          <text class="wm-btn__text">分享</text>
        </button>
        <!-- #endif -->
        <!-- #ifndef MP-WEIXIN -->
        <button
          class="wm-btn wm-btn--primary"
          :disabled="!resultImg || isRendering"
          @click="handleShareFallback"
        >
          <text class="wm-btn__icon">↗</text>
          <text class="wm-btn__text">分享</text>
        </button>
        <!-- #endif -->
      </view>

      <!-- ===== 隐藏画布（绘制用，不展示） ===== -->
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
  miniProgramCodeSrc: { type: String, default: '/static/images/minipro_event_qr.png' }
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

// ===== 水印模板系统 =====
// 每套模板负责：
//   1) computeLayout(sw, sh, maxSide) → 决定 canvas 整体尺寸 + 原图放置矩形
//      —— 这步必须保证 photoRect 的宽高比 ≡ 原图宽高比，drawImage 才不会拉伸
//   2) getBackground → canvas 底色（无返回则不填底，直接铺图）
//   3) decorate → 在原图绘制完成后叠加文字 / 边框 / 小程序码
// 新增模板时往 WATERMARK_TEMPLATES 里追加一项即可，UI 选择条会自动出现。
function defaultComputeLayout(sw, sh, maxSide) {
  const scale = Math.min(1, maxSide / Math.max(sw, sh))
  const w = Math.max(1, Math.floor(sw * scale))
  const h = Math.max(1, Math.floor(sh * scale))
  return { canvasW: w, canvasH: h, photoRect: { x: 0, y: 0, w, h } }
}

function polaroidComputeLayout(sw, sh, maxSide) {
  // 关键：先按 maxSide 把原图缩好，photoRect 用原图等比尺寸，
  // 再在 canvas 四周补上拍立得的白边，从而避免对原图做非等比拉伸。
  const scale = Math.min(1, maxSide / Math.max(sw, sh))
  const pw = Math.max(1, Math.floor(sw * scale))
  const ph = Math.max(1, Math.floor(sh * scale))
  const side = Math.max(20, Math.floor(pw * 0.035))
  const top = side
  const bottom = Math.max(120, Math.floor(ph * 0.22))
  return {
    canvasW: pw + side * 2,
    canvasH: top + ph + bottom,
    photoRect: { x: side, y: top, w: pw, h: ph },
  }
}

const WATERMARK_TEMPLATES = [
  {
    id: 'editorial',
    name: '杂志',
    emoji: '📰',
    computeLayout: defaultComputeLayout,
    getBackground: () => null,
    decorate: drawEditorialTemplate,
  },
  {
    id: 'minimal',
    name: '极简',
    emoji: '🌿',
    computeLayout: defaultComputeLayout,
    getBackground: () => null,
    decorate: drawMinimalTemplate,
  },
  {
    id: 'polaroid',
    name: '拍立得',
    emoji: '📷',
    computeLayout: polaroidComputeLayout,
    getBackground: () => '#fbf6ec',
    decorate: drawPolaroidTemplate,
  },
]

const currentTemplateId = ref('editorial')
const currentTemplate = computed(() => {
  return WATERMARK_TEMPLATES.find((t) => t.id === currentTemplateId.value) || WATERMARK_TEMPLATES[0]
})

function selectTemplate(id) {
  if (currentTemplateId.value === id) return
  currentTemplateId.value = id
  if (originalImg.value) {
    isRendering.value = true
    startRenderProgress()
    drawWatermark(PREVIEW_MAX_SIDE)
  }
}

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

// ===== 模板绘制工具 =====

/**
 * 统一 canvas 样式 API：
 * - 现代浏览器 / 微信 canvas-2d 直接走 ctx.fillStyle 等属性
 * - 旧版 uni-app canvas 走 ctx.setFillStyle 等方法
 * 模板里只要调 setFill / setStroke / setFont 等就能跨平台。
 */
function makeCanvasApi(ctx) {
  const legacy = typeof ctx.setFillStyle === 'function' && typeof ctx.fillStyle === 'undefined'
  return {
    legacy,
    setFill(v) { if (legacy) ctx.setFillStyle(v); else ctx.fillStyle = v },
    setStroke(v) { if (legacy) ctx.setStrokeStyle(v); else ctx.strokeStyle = v },
    setLineWidth(v) { if (legacy) ctx.setLineWidth(v); else ctx.lineWidth = v },
    setTextAlign(v) {
      if (legacy && ctx.setTextAlign) ctx.setTextAlign(v)
      else if (!legacy) ctx.textAlign = v
    },
    setTextBaseline(v) {
      if (legacy && ctx.setTextBaseline) ctx.setTextBaseline(v)
      else if (!legacy) ctx.textBaseline = v
    },
    setFont(spec, size) {
      if (legacy) ctx.setFontSize(size)
      else ctx.font = spec
    },
    measureWidth(text) {
      if (ctx.measureText) {
        try { return ctx.measureText(text).width } catch (e) { /* ignore */ }
      }
      return String(text || '').length * 12
    },
  }
}

/**
 * 在 rect 区域内画一个圆角小程序码（minimal / polaroid 模板共用）。
 * 假设传进来的 image 已经过 buildTransparentQR 处理（白底变透明），
 * 因此不再绘制白色底板，让 QR 直接叠在照片 / 模板背景上。
 */
function drawRoundMiniCode(ctx, image, rect) {
  if (!image || !rect) return
  const { x, y, size } = rect
  const radius = Math.max(8, Math.floor(size * 0.18))
  if (ctx.save && ctx.clip) {
    ctx.save()
    drawRoundRectPath(ctx, x, y, size, size, radius)
    ctx.clip()
    try { ctx.drawImage(image, x, y, size, size) } catch (e) { /* ignore */ }
    ctx.restore()
  } else {
    try { ctx.drawImage(image, x, y, size, size) } catch (e) { /* ignore */ }
  }
}

/**
 * 把白底小程序码处理成透明背景：
 * - H5 / 微信 canvas 2d：用 offscreen canvas + getImageData，把接近白色的像素 alpha 设为 0
 * - 其他平台（旧版 uni-app canvas）：直接返回原图，前端肉眼会看到白底，但不会崩
 *
 * 阈值 brightnessSum = R + G + B：JPEG 压缩噪点也通常 > 690，QR 数据点 < 200，
 * 这里取 600，能过滤掉接近白色的所有亮像素，又不会误伤 QR 的黑色 / 边缘。
 */
function buildTransparentQR(image, size) {
  if (!image || !size) return image
  try {
    // H5
    if (typeof document !== 'undefined' && document.createElement) {
      const temp = document.createElement('canvas')
      temp.width = size
      temp.height = size
      const tctx = temp.getContext('2d')
      if (!tctx) return image
      tctx.clearRect(0, 0, size, size)
      tctx.drawImage(image, 0, 0, size, size)
      try {
        const data = tctx.getImageData(0, 0, size, size)
        const buf = data.data
        for (let i = 0; i < buf.length; i += 4) {
          if (buf[i] + buf[i + 1] + buf[i + 2] > 600) {
            buf[i + 3] = 0
          }
        }
        tctx.putImageData(data, 0, 0)
        return temp
      } catch (e) {
        // 跨域图等导致 canvas 被污染，无法读像素，直接返回原图
        return image
      }
    }
    // 微信小程序 canvas 2d
    if (typeof wx !== 'undefined' && wx.createOffscreenCanvas) {
      const off = wx.createOffscreenCanvas({ type: '2d', width: size, height: size })
      if (!off || !off.getContext) return image
      const octx = off.getContext('2d')
      if (!octx) return image
      octx.clearRect(0, 0, size, size)
      octx.drawImage(image, 0, 0, size, size)
      try {
        const data = octx.getImageData(0, 0, size, size)
        const buf = data.data
        for (let i = 0; i < buf.length; i += 4) {
          if (buf[i] + buf[i + 1] + buf[i + 2] > 600) {
            buf[i + 3] = 0
          }
        }
        octx.putImageData(data, 0, 0)
        return off
      } catch (e) {
        return image
      }
    }
  } catch (e) {
    // any failure: fall back to original
  }
  return image
}

/**
 * 杂志模板：照片满铺，顶部琥珀色短线 + 大标题 + 天数胶囊；底部薄玻璃栏放品牌、时间、QR。
 * 视觉灵感来自 Apple Photos / NYT Cooking 这类编辑级图文排版：把照片当主角，文字保持克制。
 */
function drawEditorialTemplate(ctx, params) {
  const { width, height, titleLine, dayLine, brand, timeStr, miniCodeImage } = params
  const api = makeCanvasApi(ctx)

  const padX = Math.max(40, Math.floor(width * 0.06))
  const padTop = Math.max(40, Math.floor(height * 0.06))
  const accentColor = '#fbbf24' // amber-400，暖色调与多数照片兼容

  // ===== 顶部渐变托底 =====
  // 让白字在浅色照片上也能稳定可读；只压到顶部 32%，不破坏构图。
  const topShade = Math.max(200, Math.floor(height * 0.32))
  if (ctx.createLinearGradient) {
    const grad = ctx.createLinearGradient(0, 0, 0, topShade)
    grad.addColorStop(0, 'rgba(8, 12, 24, 0.55)')
    grad.addColorStop(0.55, 'rgba(8, 12, 24, 0.18)')
    grad.addColorStop(1, 'rgba(8, 12, 24, 0)')
    api.setFill(grad)
  } else {
    api.setFill('rgba(8, 12, 24, 0.4)')
  }
  ctx.fillRect(0, 0, width, topShade)

  // ===== 标题（粗白，溢出会自动缩字号） =====
  const titleText = String(titleLine || '记录此刻')
  let titleSize = Math.max(46, Math.floor(width / 14))
  const titleFontFamily = '"PingFang SC", "Hiragino Sans", sans-serif'
  api.setFont(`800 ${titleSize}px ${titleFontFamily}`, titleSize)
  const maxTitleW = width - padX * 2
  while (titleSize > 28 && api.measureWidth(titleText) > maxTitleW) {
    titleSize -= 2
    api.setFont(`800 ${titleSize}px ${titleFontFamily}`, titleSize)
  }
  api.setFill('rgba(255, 255, 255, 0.98)')
  api.setTextAlign('left')
  api.setTextBaseline('top')
  ctx.fillText(titleText, padX, padTop)

  // ===== 琥珀短线 + 天数胶囊 =====
  const accentY = padTop + titleSize + Math.max(16, Math.floor(titleSize * 0.22))
  const accentH = Math.max(4, Math.floor(titleSize * 0.07))
  const accentW = Math.max(60, Math.floor(titleSize * 1.1))
  api.setFill(accentColor)
  ctx.fillRect(padX, accentY, accentW, accentH)

  if (dayLine) {
    const dayText = String(dayLine).replace(/\s+/g, '')
    const daySize = Math.max(22, Math.floor(titleSize * 0.42))
    api.setFont(`700 ${daySize}px sans-serif`, daySize)
    const dayTextW = api.measureWidth(dayText)
    const chipPadX = Math.max(14, Math.floor(daySize * 0.7))
    const chipPadY = Math.max(8, Math.floor(daySize * 0.32))
    const chipW = dayTextW + chipPadX * 2
    const chipH = daySize + chipPadY * 2
    const chipX = padX + accentW + Math.max(16, Math.floor(titleSize * 0.2))
    const chipY = accentY + Math.floor((accentH - chipH) / 2)
    drawRoundRectPath(ctx, chipX, chipY, chipW, chipH, chipH / 2)
    api.setFill(accentColor)
    ctx.fill()
    api.setFill('#0f172a')
    api.setTextAlign('left')
    api.setTextBaseline('middle')
    ctx.fillText(dayText, chipX + chipPadX, chipY + chipH / 2)
  }

  // ===== 底部薄玻璃栏 =====
  const footerH = Math.max(120, Math.floor(height * 0.12))
  const footerY = height - footerH
  if (ctx.createLinearGradient) {
    const grad = ctx.createLinearGradient(0, footerY, 0, height)
    grad.addColorStop(0, 'rgba(8, 12, 24, 0)')
    grad.addColorStop(1, 'rgba(8, 12, 24, 0.78)')
    api.setFill(grad)
  } else {
    api.setFill('rgba(8, 12, 24, 0.62)')
  }
  ctx.fillRect(0, footerY, width, footerH)

  // ===== 底部右：QR（带白色背板） =====
  const codeSize = Math.max(90, Math.floor(Math.min(width, height) * 0.11))
  const codeMargin = padX
  const miniCodeRect = {
    x: width - codeMargin - codeSize,
    y: footerY + Math.floor((footerH - codeSize) / 2),
    size: codeSize,
  }
  if (miniCodeImage) {
    const platePad = Math.max(8, Math.floor(codeSize * 0.08))
    const plateRadius = Math.max(12, Math.floor(codeSize * 0.18))
    drawRoundRectPath(
      ctx,
      miniCodeRect.x - platePad,
      miniCodeRect.y - platePad,
      miniCodeRect.size + platePad * 2,
      miniCodeRect.size + platePad * 2,
      plateRadius
    )
    api.setFill('rgba(255, 255, 255, 0.96)')
    ctx.fill()
    drawRoundMiniCode(ctx, miniCodeImage, miniCodeRect)
  }

  // ===== 底部左：品牌（琥珀大写）+ 时间（浅灰），竖排堆叠 =====
  const footerTextSize = Math.max(22, Math.floor(width / 40))
  const brandText = String(brand || 'FUNGROWTH').toUpperCase()
  const brandY = footerY + footerH / 2 - footerTextSize * 0.55
  const dateY = footerY + footerH / 2 + footerTextSize * 0.55

  api.setFont(`700 ${footerTextSize}px sans-serif`, footerTextSize)
  api.setFill(accentColor)
  api.setTextAlign('left')
  api.setTextBaseline('middle')
  ctx.fillText(brandText, padX, brandY)

  const dateTextSize = Math.max(18, Math.floor(footerTextSize * 0.78))
  api.setFont(`500 ${dateTextSize}px sans-serif`, dateTextSize)
  api.setFill('rgba(241, 245, 249, 0.82)')
  ctx.fillText(timeStr, padX, dateY)

  return { miniCodeRect, miniCodeStyle: 'rounded' }
}

/**
 * 极简模板：底部半透明黑色长条 + 标题 + 日期，右上角小天数胶囊，右下角圆角小程序码。
 */
function drawMinimalTemplate(ctx, params) {
  const { width, height, titleLine, dayLine, brand, timeStr, smallFont, baseFont, miniCodeImage } = params
  const api = makeCanvasApi(ctx)
  const useLegacy = api.legacy

  // 顶部右上：天数胶囊
  if (dayLine) {
    const chipFontSize = Math.max(20, Math.floor(baseFont * 0.7))
    api.setFont(`600 ${chipFontSize}px sans-serif`, chipFontSize)
    const chipText = String(dayLine).replace(/\s+/g, '')
    const padX = Math.max(14, Math.floor(chipFontSize * 0.8))
    const padY = Math.max(8, Math.floor(chipFontSize * 0.34))
    const textW = api.measureWidth(chipText)
    const chipW = textW + padX * 2
    const chipH = chipFontSize + padY * 2
    const margin = Math.max(20, Math.floor(width / 36))
    const chipX = width - margin - chipW
    const chipY = margin
    drawRoundRectPath(ctx, chipX, chipY, chipW, chipH, chipH / 2)
    api.setFill('rgba(255, 255, 255, 0.92)')
    ctx.fill()
    api.setFill('#0f172a')
    api.setTextAlign('left')
    api.setTextBaseline('middle')
    ctx.fillText(chipText, chipX + padX, chipY + chipH / 2)
  }

  // 底部长条
  const barH = Math.max(140, Math.floor(height * 0.16))
  const barY = height - barH
  if (ctx.createLinearGradient) {
    const grad = ctx.createLinearGradient(0, barY, 0, height)
    grad.addColorStop(0, 'rgba(8, 12, 24, 0)')
    grad.addColorStop(0.35, 'rgba(8, 12, 24, 0.55)')
    grad.addColorStop(1, 'rgba(8, 12, 24, 0.82)')
    api.setFill(grad)
  } else {
    api.setFill('rgba(8, 12, 24, 0.72)')
  }
  ctx.fillRect(0, barY, width, barH)

  // 标题
  const titleSize = Math.max(34, Math.floor(width / 18))
  const margin = Math.max(28, Math.floor(width / 32))
  const titleY = barY + Math.floor(barH * 0.35)
  api.setFont(`700 ${titleSize}px sans-serif`, titleSize)
  api.setFill('rgba(255,255,255,0.98)')
  api.setTextAlign('left')
  api.setTextBaseline('middle')
  ctx.fillText(String(titleLine || '记录此刻'), margin, titleY)

  // 副信息：时间 + 品牌
  const subSize = Math.max(20, Math.floor(titleSize * 0.5))
  const subY = barY + Math.floor(barH * 0.72)
  api.setFont(`500 ${subSize}px sans-serif`, subSize)
  api.setFill('rgba(218, 226, 240, 0.82)')
  ctx.fillText(`${timeStr}  ·  ${brand}`, margin, subY)

  // 右下角小程序码占位
  const codeSize = Math.max(110, Math.floor(Math.min(width, height) * 0.13))
  const codeMargin = Math.max(20, Math.floor(width / 36))
  const miniCodeRect = {
    x: width - codeMargin - codeSize,
    y: barY + Math.floor((barH - codeSize) / 2),
    size: codeSize,
  }
  if (miniCodeImage) {
    // 极简模板的 QR 落在底部深色栏里，透明 QR 直接叠会黑+黑没对比。
    // 这里画一块带圆角的米白色背板托底，再叠 QR，保证扫码可识别。
    const platePad = Math.max(8, Math.floor(codeSize * 0.08))
    const plateRadius = Math.max(12, Math.floor(codeSize * 0.18))
    drawRoundRectPath(
      ctx,
      miniCodeRect.x - platePad,
      miniCodeRect.y - platePad,
      miniCodeRect.size + platePad * 2,
      miniCodeRect.size + platePad * 2,
      plateRadius
    )
    api.setFill('rgba(255, 255, 255, 0.96)')
    ctx.fill()
    drawRoundMiniCode(ctx, miniCodeImage, miniCodeRect)
  }

  return { miniCodeRect, miniCodeStyle: 'rounded' }
}

/**
 * 拍立得模板：原图缩进上半部分，下方留宽白边写标题和日期。
 */
function drawPolaroidTemplate(ctx, params) {
  const { width, height, photoRect, titleLine, dayLine, brand, timeStr, miniCodeImage } = params
  const api = makeCanvasApi(ctx)

  // 给原图区描一根极细的米色边线，更像实体相纸
  api.setStroke('rgba(0,0,0,0.06)')
  api.setLineWidth(1)
  ctx.strokeRect(photoRect.x, photoRect.y, photoRect.w, photoRect.h)

  const bandTop = photoRect.y + photoRect.h
  const bandHeight = height - bandTop
  const padX = Math.max(28, Math.floor(width * 0.05))

  // 布局：QR 放最左、和白边垂直居中；标题在 QR 右侧顶部；副信息在标题下；天数靠右
  // 这样 QR 和天数分别落在白边的左右两端，再也不会重叠。
  const codeSize = Math.max(80, Math.min(Math.floor(bandHeight * 0.72), Math.floor(width * 0.13)))
  const miniCodeRect = {
    x: padX,
    y: bandTop + Math.floor((bandHeight - codeSize) / 2),
    size: codeSize,
  }

  const textLeftX = miniCodeRect.x + miniCodeRect.size + Math.max(20, Math.floor(width * 0.025))

  // 天数（先算尺寸，方便预留右侧宽度）
  const daySize = dayLine ? Math.max(28, Math.floor(width / 22)) : 0
  api.setFont(`700 ${daySize}px sans-serif`, daySize)
  const dayText = String(dayLine || '').replace(/\s+/g, '')
  const dayTextWidth = dayLine ? api.measureWidth(dayText) : 0
  const dayReserve = dayLine ? dayTextWidth + Math.max(16, Math.floor(width * 0.02)) : 0
  const textMaxWidth = width - padX - textLeftX - dayReserve

  // 标题（粗体大字，必要时自动缩字号防止顶到天数）
  let titleSize = Math.max(34, Math.floor(width / 20))
  api.setFont(`800 ${titleSize}px "PingFang SC", "Hiragino Sans", sans-serif`, titleSize)
  const titleText = String(titleLine || '记录此刻')
  while (titleSize > 22 && api.measureWidth(titleText) > textMaxWidth) {
    titleSize -= 2
    api.setFont(`800 ${titleSize}px "PingFang SC", "Hiragino Sans", sans-serif`, titleSize)
  }
  api.setFill('#1f2937')
  api.setTextAlign('left')
  api.setTextBaseline('top')
  const titleY = bandTop + Math.max(18, Math.floor(bandHeight * 0.18))
  ctx.fillText(titleText, textLeftX, titleY)

  // 副信息：时间 · 品牌
  const subSize = Math.max(18, Math.floor(titleSize * 0.45))
  api.setFont(`500 ${subSize}px sans-serif`, subSize)
  api.setFill('#94a3b8')
  api.setTextAlign('left')
  api.setTextBaseline('top')
  const subY = titleY + titleSize + Math.max(10, Math.floor(titleSize * 0.18))
  ctx.fillText(`${timeStr}  ·  ${brand}`, textLeftX, subY)

  // 天数：右侧大字，垂直居中对齐 QR / 整个白边
  if (dayLine) {
    api.setFont(`700 ${daySize}px sans-serif`, daySize)
    api.setFill('#c98a1a')
    api.setTextAlign('right')
    api.setTextBaseline('middle')
    ctx.fillText(dayText, width - padX, bandTop + bandHeight / 2)
  }

  if (miniCodeImage) {
    drawRoundMiniCode(ctx, miniCodeImage, miniCodeRect)
  }

  return { miniCodeRect, miniCodeStyle: 'rounded' }
}

function drawWatermarkWeixin2d(maxSide, done) {
  uni.getImageInfo({
    src: originalImg.value,
    success: (info) => {
      setRenderStage('正在绘制底图...', 28)
      const template = currentTemplate.value
      const layout = template.computeLayout(info.width, info.height, maxSide)
      const width = layout.canvasW
      const height = layout.canvasH
      const photoRect = layout.photoRect
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
                const bgFill = template.getBackground()

                if (bgFill) {
                  ctx.fillStyle = bgFill
                  ctx.fillRect(0, 0, width, height)
                }
                ctx.drawImage(baseImg, photoRect.x, photoRect.y, photoRect.w, photoRect.h)

                const brand = 'fungrowth'
                const timeStr = new Date().toLocaleString()
                const baseFont = Math.max(22, Math.floor(width / 24))
                const smallFont = Math.max(18, Math.floor(baseFont * 0.82))
                const { titleLine, dayLine } = getPosterHeadlineLines()

                const decorate = (miniCodeImage) => {
                  setRenderStage('正在添加品牌时间水印...', 56)
                  template.decorate(ctx, {
                    width,
                    height,
                    photoRect,
                    titleLine,
                    dayLine,
                    brand,
                    timeStr,
                    baseFont,
                    smallFont,
                    miniCodeImage,
                  })
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
                  const watchdog = setTimeout(() => {
                    decorate(null)
                    finishOnce()
                  }, 1500)
                  resolveMiniCodePath((codePath) => {
                    if (finished) return
                    clearTimeout(watchdog)
                    if (!codePath) {
                      decorate(null)
                      finishOnce()
                      return
                    }
                    loadCanvas2dImage(
                      canvas,
                      codePath,
                      (codeImg) => {
                        const transparentQr = buildTransparentQR(codeImg, 400)
                        decorate(transparentQr)
                        finishOnce()
                      },
                      () => {
                        decorate(null)
                        finishOnce()
                      }
                    )
                  })
                } else {
                  decorate(null)
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
      // 模板自己算 canvas 尺寸和 photoRect，拍立得这种"图 + 白边"模板可以保留原图比例
      const template = currentTemplate.value
      const layout = template.computeLayout(sourceWidth, sourceHeight, maxSide)
      const width = layout.canvasW
      const height = layout.canvasH
      const photoRect = layout.photoRect
      canvas.width = width
      canvas.height = height
      canvasWidth.value = width
      canvasHeight.value = height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resultImg.value = originalImg.value
        failRenderProgress()
        done && done(resultImg.value)
        return
      }
      ctx.clearRect(0, 0, width, height)

      const bgFill = template.getBackground()
      if (bgFill) {
        ctx.fillStyle = bgFill
        ctx.fillRect(0, 0, width, height)
      }
      ctx.drawImage(img, photoRect.x, photoRect.y, photoRect.w, photoRect.h)

      const brand = 'fungrowth'
      const timeStr = new Date().toLocaleString()
      const baseFont = Math.max(22, Math.floor(width / 24))
      const smallFont = Math.max(18, Math.floor(baseFont * 0.82))
      const { titleLine, dayLine } = getPosterHeadlineLines()

      const decorate = (miniCodeImage) => {
        setRenderStage('正在添加品牌时间水印...', 56)
        template.decorate(ctx, {
          width,
          height,
          photoRect,
          titleLine,
          dayLine,
          brand,
          timeStr,
          baseFont,
          smallFont,
          miniCodeImage,
        })
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

      if (props.miniProgramCodeSrc) {
        setRenderStage('正在添加小程序码...', 80)
        const codeImg = new Image()
        codeImg.crossOrigin = 'anonymous'
        codeImg.src = props.miniProgramCodeSrc
        codeImg.onload = () => {
          const transparentQr = buildTransparentQR(codeImg, 400)
          decorate(transparentQr)
          exportImage()
        }
        codeImg.onerror = () => {
          decorate(null)
          exportImage()
        }
      } else {
        decorate(null)
        exportImage()
      }
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
      const template = currentTemplate.value
      const layout = template.computeLayout(info.width, info.height, maxSide)
      const width = layout.canvasW
      const height = layout.canvasH
      const photoRect = layout.photoRect
      canvasWidth.value = width
      canvasHeight.value = height

      nextTick(() => {
        const baseImgPath = info.path || originalImg.value
        const bgFill = template.getBackground()
        try {
          if (bgFill) {
            ctx.setFillStyle(bgFill)
            ctx.fillRect(0, 0, width, height)
          }
          ctx.drawImage(baseImgPath, photoRect.x, photoRect.y, photoRect.w, photoRect.h)
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
        const { titleLine, dayLine } = getPosterHeadlineLines()

        const decorate = (miniCodeImage) => {
          setRenderStage('正在添加品牌时间水印...', 56)
          template.decorate(ctx, {
            width,
            height,
            photoRect,
            titleLine,
            dayLine,
            brand,
            timeStr,
            baseFont,
            smallFont,
            miniCodeImage,
          })
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
            decorate(null)
            finishOnce()
          }, 1500)

          resolveMiniCodePath((codePath) => {
            if (finished) return
            clearTimeout(watchdog)
            // 旧版 uni-app canvas 的 drawImage 直接接受路径字符串，
            // 这里把 codePath 当作图像传给模板，模板内 drawImage(codePath,...) 也能工作。
            decorate(codePath || null)
            finishOnce()
          })
        } else {
          decorate(null)
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
/* ===== Dark photo-studio aesthetic =====
 * 整体走"暗色摄影 app"调性：照片是主角，控件让位；
 * 配色统一在 slate-900 系暗底 + 琥珀色 (#fbbf24) accent，与三套水印模板的色彩家族一致。
 */

.wm-overlay {
  position: fixed;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  z-index: 9999;
  display: flex;
  justify-content: center;
  align-items: flex-end;
}

.wm-shell {
  width: 100%;
  max-width: 760rpx;
  background: linear-gradient(180deg, #0b1120 0%, #1e293b 100%);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
}

.wm-shell--full {
  height: 100%;
}

.wm-shell--half {
  height: 75%;
  border-top-left-radius: 32rpx;
  border-top-right-radius: 32rpx;
}

/* ===== Top bar ===== */
.wm-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 28rpx 12rpx;
}

.wm-topbar__meta {
  flex: 1;
  display: flex;
  align-items: baseline;
  gap: 10rpx;
  min-width: 0;
}

.wm-topbar__title {
  font-size: 30rpx;
  font-weight: 700;
  color: #f8fafc;
  letter-spacing: 0.5rpx;
}

.wm-topbar__divider {
  color: rgba(248, 250, 252, 0.3);
  font-size: 22rpx;
}

.wm-topbar__subtitle {
  font-size: 22rpx;
  color: #fbbf24;
  font-weight: 500;
}

.wm-topbar__close {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
  border: 1rpx solid rgba(255, 255, 255, 0.06);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.wm-topbar__close:active {
  background: rgba(255, 255, 255, 0.14);
}

.wm-topbar__close-icon {
  font-size: 40rpx;
  color: rgba(255, 255, 255, 0.85);
  line-height: 1;
}

/* ===== Photo preview stage ===== */
.wm-stage {
  flex: 1;
  min-height: 0;
  padding: 8rpx 32rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.wm-frame {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 24rpx;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow:
    0 30rpx 60rpx rgba(0, 0, 0, 0.45),
    inset 0 0 0 1rpx rgba(255, 255, 255, 0.05);
}

.wm-preview {
  width: 100%;
  height: 100%;
}

.wm-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14rpx;
  color: rgba(255, 255, 255, 0.4);
}

.wm-empty__icon {
  font-size: 80rpx;
  opacity: 0.5;
}

.wm-empty__text {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.5);
}

/* ===== Progress overlay ===== */
.wm-progress {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 32rpx;
}

.wm-progress__card {
  display: flex;
  align-items: center;
  gap: 16rpx;
  width: 100%;
  max-width: 480rpx;
  padding: 22rpx 26rpx;
  background: rgba(15, 23, 42, 0.94);
  border: 1rpx solid rgba(251, 191, 36, 0.18);
  border-radius: 20rpx;
  box-shadow: 0 10rpx 30rpx rgba(0, 0, 0, 0.5);
}

.wm-progress__pulse {
  width: 20rpx;
  height: 20rpx;
  border-radius: 50%;
  background: #fbbf24;
  flex-shrink: 0;
  animation: wmPulse 1.1s infinite ease-in-out;
  box-shadow: 0 0 16rpx rgba(251, 191, 36, 0.5);
}

.wm-progress__main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  min-width: 0;
}

.wm-progress__stage {
  font-size: 22rpx;
  color: #f1f5f9;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.wm-progress__track {
  width: 100%;
  height: 6rpx;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 999rpx;
  overflow: hidden;
}

.wm-progress__bar {
  height: 100%;
  background: linear-gradient(90deg, #fbbf24, #f59e0b);
  border-radius: 999rpx;
  transition: width 0.18s ease;
}

.wm-progress__percent {
  font-size: 22rpx;
  color: #fbbf24;
  font-weight: 600;
  font-feature-settings: 'tnum';
  flex-shrink: 0;
}

@keyframes wmPulse {
  0% { transform: scale(0.85); opacity: 0.7; }
  50% { transform: scale(1.25); opacity: 1; }
  100% { transform: scale(0.85); opacity: 0.7; }
}

/* ===== Custom watermark input ===== */
.wm-input {
  padding: 12rpx 32rpx 0;
}

.wm-input__field {
  width: 100%;
  height: 76rpx;
  padding: 0 24rpx;
  border-radius: 16rpx;
  background: rgba(255, 255, 255, 0.06);
  color: #f8fafc;
  font-size: 26rpx;
  box-sizing: border-box;
  border: 1rpx solid rgba(255, 255, 255, 0.08);
}

.wm-input__placeholder {
  color: rgba(248, 250, 252, 0.35);
}

/* ===== Template chips ===== */
.wm-templates {
  padding: 18rpx 32rpx 6rpx;
}

.wm-templates__label {
  display: block;
  font-size: 22rpx;
  color: rgba(248, 250, 252, 0.45);
  margin: 0 4rpx 12rpx;
  font-weight: 500;
  letter-spacing: 1rpx;
}

.wm-templates__scroll {
  width: 100%;
  white-space: nowrap;
}

.wm-templates__row {
  display: inline-flex;
  gap: 12rpx;
  padding: 2rpx 4rpx 8rpx;
}

.wm-template-chip {
  display: inline-flex;
  align-items: center;
  gap: 10rpx;
  padding: 16rpx 26rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.06);
  border: 1rpx solid rgba(255, 255, 255, 0.08);
  color: rgba(248, 250, 252, 0.7);
  font-size: 24rpx;
  font-weight: 500;
  flex-shrink: 0;
  transition: all 0.2s;
}

.wm-template-chip__emoji {
  font-size: 28rpx;
}

.wm-template-chip__name {
  font-size: 24rpx;
}

.wm-template-chip--active {
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.24) 0%, rgba(245, 158, 11, 0.18) 100%);
  border-color: rgba(251, 191, 36, 0.55);
  color: #fbbf24;
  font-weight: 700;
}

/* ===== Action buttons ===== */
.wm-actions {
  padding: 22rpx 32rpx 28rpx;
  display: flex;
  gap: 14rpx;
}

.wm-btn {
  flex: 1;
  height: 96rpx;
  border-radius: 22rpx;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  border: none;
  margin: 0;
  padding: 0;
  line-height: 1;
  color: #f8fafc;
  transition: opacity 0.2s, transform 0.1s;
}

.wm-btn::after {
  border: none;
}

.wm-btn:active {
  transform: scale(0.97);
}

.wm-btn[disabled] {
  opacity: 0.35;
}

.wm-btn--ghost {
  background: rgba(255, 255, 255, 0.06);
  border: 1rpx solid rgba(255, 255, 255, 0.1);
  color: rgba(248, 250, 252, 0.92);
}

.wm-btn--primary {
  background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
  color: #1f2937;
  box-shadow: 0 10rpx 28rpx rgba(251, 191, 36, 0.28);
}

.wm-btn__icon {
  font-size: 30rpx;
  line-height: 1;
  font-weight: 700;
}

.wm-btn__text {
  font-size: 26rpx;
  font-weight: 600;
}
</style>
