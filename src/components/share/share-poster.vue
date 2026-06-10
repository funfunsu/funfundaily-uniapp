<template>
  <view v-if="visible" class="poster-overlay" @tap.self="handleClose">
    <view class="poster-shell" @tap.stop>
      <view class="poster-topbar">
        <text class="poster-title">{{ resolvedTitle }}</text>
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

      <text class="poster-hint">{{ resolvedHint }}</text>

      <!-- 操作区：三按钮单行，文案精简 -->
      <view class="poster-actions">
        <!-- #ifdef MP-WEIXIN -->
        <button class="poster-btn poster-btn--primary" :disabled="!resultImg" @tap="handleShareImageMenu">
          <text class="poster-btn__text">发图片</text>
        </button>
        <button class="poster-btn poster-btn--ghost" :disabled="!resultImg" @click="handleSave">
          <text class="poster-btn__text">存相册</text>
        </button>
        <button v-if="showLink" class="poster-btn poster-btn--link" open-type="share" @tap="handleLinkShare">
          <text class="poster-btn__text">转链接</text>
        </button>
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
        id="sharePosterCanvas2d"
        type="2d"
        :style="`position:absolute;left:-9999px;top:-9999px;width:${canvasWidth}px;height:${canvasHeight}px;`"
      ></canvas>
      <!-- #endif -->
      <!-- #ifndef MP-WEIXIN -->
      <!-- #ifndef H5 -->
      <canvas
        canvas-id="sharePosterCanvas"
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
import { ref, computed, watch, getCurrentInstance, nextTick } from 'vue'
import { saveImageToAlbum } from '../../utils/album'
import { isH5, makeCanvasApi } from './shareCanvas'
import { renderers } from './shareRenderers'

const props = defineProps({
  visible: { type: Boolean, default: false },
  // 绘制器 key（见 shareRenderers：'taskList' | 'scheduleTimetable'）
  renderer: { type: String, required: true },
  // 待绘制的数据（任务数组 / 日程数组等），由具体 renderer 解释
  payload: { type: Array, default: () => [] },
  // 二维码图片来源（已由 imageHelper 转成各端可用的路径 / dataURL）
  qrSource: { type: String, default: '' },
  // 分享者昵称
  creatorName: { type: String, default: '我' },
  // 标题/提示（不传则用 renderer 的默认值）
  title: { type: String, default: '' },
  hint: { type: String, default: '' },
  // 是否显示「转链接」（open-type=share，依赖所在页面的 onShareAppMessage）
  showLink: { type: Boolean, default: false }
})

const emit = defineEmits(['close', 'shared', 'link'])

const instance = getCurrentInstance()
const resultImg = ref('')
const renderStage = ref('正在生成分享图...')
const canvasWidth = ref(600)
const canvasHeight = ref(900)

const activeRenderer = computed(() => renderers[props.renderer] || null)
const resolvedTitle = computed(() => props.title || activeRenderer.value?.title || '分享')
const resolvedHint = computed(() => props.hint || activeRenderer.value?.hint || '好友长按识别二维码即可收下')

const env = () => ({ payload: props.payload, creatorName: props.creatorName })

watch(
  () => [props.visible, props.payload, props.qrSource, props.renderer],
  () => {
    if (props.visible && props.payload && props.payload.length > 0 && activeRenderer.value) {
      resultImg.value = ''
      renderStage.value = '正在生成分享图...'
      nextTick(() => setTimeout(() => renderPoster(), 60))
    }
  },
  { immediate: true, deep: false }
)

function renderPoster() {
  const r = activeRenderer.value
  if (!r) { renderStage.value = '暂不支持的分享类型'; return }
  const layout = r.buildLayout(env())
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
      r.paint(ctx, api, layout, qrImg, env())
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
    query.select('#sharePosterCanvas2d').fields({ node: true, size: true }).exec((res) => {
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
        r.paint(ctx, api, layout, qrImg, env())
        wx.canvasToTempFilePath({
          canvas,
          x: 0, y: 0, width, height,
          destWidth: width * dpr, destHeight: height * dpr,
          fileType: 'png',
          success: (out) => { resultImg.value = out.tempFilePath },
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
  const ctx = uni.createCanvasContext('sharePosterCanvas', instance && instance.proxy)
  const api = makeCanvasApi(ctx)
  r.paint(ctx, api, layout, props.qrSource || null, env())
  ctx.draw(false, () => {
    setTimeout(() => {
      uni.canvasToTempFilePath({
        canvasId: 'sharePosterCanvas', x: 0, y: 0, width, height,
        success: (out) => { resultImg.value = out.tempFilePath },
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
    a.download = `share-${Date.now()}.png`
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

// 转发链接：按钮 open-type="share" 触发所在页面的 onShareAppMessage，这里仅做埋点/通知
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
  display: flex; flex-direction: row; gap: 16rpx;
  padding: 20rpx 32rpx 28rpx; box-sizing: border-box; width: 100%;
}
.poster-btn {
  flex: 1; height: 88rpx; border-radius: 44rpx; border: none; margin: 0;
  display: flex; align-items: center; justify-content: center;
}
.poster-btn::after { border: none; }
.poster-btn[disabled] { opacity: 0.45; }
.poster-btn--ghost { background: #f1f5f9; }
.poster-btn--ghost .poster-btn__text { color: #475569; font-size: 28rpx; font-weight: 600; }
.poster-btn--link { background: #e8f5e9; }
.poster-btn--link .poster-btn__text { color: #2e7d32; font-size: 28rpx; font-weight: 600; }
.poster-btn--primary { background: #2196f3; }
.poster-btn--primary .poster-btn__text { color: #ffffff; font-size: 28rpx; font-weight: 600; }
</style>
