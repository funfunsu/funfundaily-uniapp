<template>
  <view v-if="visible" class="bs-mask" @click="onMaskClick">
    <view class="bs-panel" :class="panelClass" @click.stop>
      <view class="bs-grabber"></view>
      <view class="bs-header">
        <text class="bs-title" :class="titleClass">{{ title }}</text>
        <text class="bs-close" @click="handleClose">×</text>
      </view>
      <view class="bs-body" :style="bodyStyle">
        <slot />
      </view>
      <view v-if="hasFooter" class="bs-actions">
        <slot name="footer">
          <button v-if="showDelete" class="bs-btn bs-btn--danger-ghost" @click="handleDelete">{{ deleteText }}</button>
          <button v-else class="bs-btn bs-btn--ghost" @click="handleClose">{{ cancelText }}</button>
          <button class="bs-btn" :class="confirmClass" :disabled="confirmDisabled" @click="handleConfirm">{{ confirmText }}</button>
        </slot>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, useSlots } from 'vue'

interface Props {
  visible: boolean
  title?: string
  /** 标题色调 */
  accent?: 'default' | 'primary' | 'success' | 'danger'
  /** 是否展示底部操作区。可传 false 隐藏，或传 slot footer 自定义 */
  showFooter?: boolean
  /** 取消按钮文案 */
  cancelText?: string
  /** 确认按钮文案 */
  confirmText?: string
  /** 确认按钮禁用 */
  confirmDisabled?: boolean
  /** 点遮罩是否关闭 */
  maskClosable?: boolean
  /** body 高度上限（用于内部滚动），默认 60vh */
  bodyMaxHeight?: string
  /** 是否在 footer 左侧显示删除按钮（替代取消），用于编辑场景 */
  showDelete?: boolean
  /** 删除按钮文案 */
  deleteText?: string
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  accent: 'default',
  showFooter: true,
  cancelText: '取消',
  confirmText: '保存',
  confirmDisabled: false,
  maskClosable: true,
  bodyMaxHeight: '60vh',
  showDelete: false,
  deleteText: '删除',
})

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'confirm'): void
  (e: 'delete'): void
  (e: 'update:visible', value: boolean): void
}>()

const slots = useSlots()

const hasFooter = computed(() => {
  if (!props.showFooter) return false
  return true
})

const panelClass = computed(() => `bs-panel--${props.accent}`)
const titleClass = computed(() => `bs-title--${props.accent}`)
const confirmClass = computed(() => {
  switch (props.accent) {
    case 'success':
      return 'bs-btn--success'
    case 'danger':
      return 'bs-btn--danger'
    default:
      return 'bs-btn--primary'
  }
})

const bodyStyle = computed(() => ({ maxHeight: props.bodyMaxHeight }))

function onMaskClick(): void {
  if (!props.maskClosable) return
  handleClose()
}

function handleClose(): void {
  emit('update:visible', false)
  emit('close')
}

function handleConfirm(): void {
  emit('confirm')
}

function handleDelete(): void {
  emit('delete')
}

// 静默使用 slots，避免编译期 unused-warning。
void slots
</script>

<style scoped>
.bs-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(15, 23, 42, 0.55);
  /* H5 下 uni tabBar 是 z-index 998/999 的页内固定元素，需高于它，否则 tab 页弹层底部
     的「保存」按钮会被 tabBar 盖住；同时低于 date-picker 弹层(9999)以保证其仍在最上层。 */
  z-index: 9990;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.bs-panel {
  width: 100%;
  max-height: 85vh;
  background: #ffffff;
  border-top-left-radius: 32rpx;
  border-top-right-radius: 32rpx;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding-bottom: env(safe-area-inset-bottom);
}

.bs-grabber {
  width: 80rpx;
  height: 8rpx;
  margin: 12rpx auto 0;
  border-radius: 999rpx;
  background: #e2e8f0;
}

.bs-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 28rpx 16rpx;
}

.bs-title {
  color: #0f172a;
  font-size: 32rpx;
  font-weight: 700;
}

.bs-title--success {
  color: #059669;
}

.bs-title--danger {
  color: #dc2626;
}

.bs-title--primary {
  color: #4f46e5;
}

.bs-close {
  width: 56rpx;
  height: 56rpx;
  line-height: 52rpx;
  text-align: center;
  border-radius: 50%;
  background: #f1f5f9;
  color: #64748b;
  font-size: 36rpx;
}

.bs-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding: 8rpx 28rpx 24rpx;
}

.bs-actions {
  display: flex;
  gap: 14rpx;
  padding: 16rpx 28rpx 24rpx;
  border-top: 1rpx solid #f1f5f9;
}

.bs-btn {
  flex: 1;
  height: 80rpx;
  line-height: 1;
  margin: 0;
  padding: 0;
  border: none;
  border-radius: 999rpx;
  font-size: 26rpx;
  font-weight: 600;
  background: #f1f5f9;
  color: #475569;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.bs-btn::after {
  border: none;
}

.bs-btn:active {
  opacity: 0.85;
}

.bs-btn[disabled] {
  background: #f1f5f9 !important;
  color: #cbd5e1 !important;
}

.bs-btn--ghost {
  background: #f1f5f9;
  color: #475569;
}

.bs-btn--primary {
  background: linear-gradient(135deg, #4f46e5, #6366f1);
  color: #ffffff;
}

.bs-btn--success {
  background: linear-gradient(135deg, #059669, #10b981);
  color: #ffffff;
}

.bs-btn--danger {
  background: linear-gradient(135deg, #dc2626, #ef4444);
  color: #ffffff;
}

.bs-btn--danger-ghost {
  background: #fef2f2;
  color: #dc2626;
}

/* ===== Field primitives (apply to slot content via :deep) =====
 * 任何放在 sheet body 内的 .field / .field-row / .field__* 都自动套用统一样式，
 * 这样多个页面调用 BottomSheet 时不必各自再声明一遍。
 * 注意：这些规则在 H5 通过 :deep 生效，但 mp-weixin 各组件 wxss 隔离、slot 内容归属
 * 父组件作用域，:deep 不会穿透。故下面用第二个非 scoped <style> 块再声明一份全局规则。
 */
.bs-body :deep(.field) {
  display: flex;
  flex-direction: column;
  margin-bottom: 16rpx;
}

.bs-body :deep(.field-row) {
  display: flex;
  gap: 14rpx;
  margin-bottom: 16rpx;
}

.bs-body :deep(.field-row > .field) {
  flex: 1;
  margin-bottom: 0;
}

.bs-body :deep(.field__label) {
  display: block;
  margin-bottom: 8rpx;
  color: #475569;
  font-size: 22rpx;
}

.bs-body :deep(.field__input),
.bs-body :deep(.field__picker) {
  width: 100%;
  min-height: 80rpx;
  padding: 16rpx 20rpx;
  box-sizing: border-box;
  /* 用 1px（物理像素）+ 略深的边框色，避免 1rpx 在高 DPR 下被取整成 0、且浅灰描边在浅底上看不见 */
  border: 1px solid #cbd5e1;
  border-radius: 14rpx;
  background: #ffffff;
  color: #0f172a;
  font-size: 26rpx;
}

.bs-body :deep(.field__input:focus),
.bs-body :deep(.field__textarea:focus) {
  border-color: #6366f1;
}

.bs-body :deep(.field__picker) {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.bs-body :deep(.field__picker-arrow) {
  color: #94a3b8;
  font-size: 22rpx;
}

.bs-body :deep(.field__textarea) {
  width: 100%;
  min-height: 140rpx;
  padding: 16rpx 20rpx;
  box-sizing: border-box;
  border: 1px solid #cbd5e1;
  border-radius: 14rpx;
  background: #ffffff;
  color: #0f172a;
  font-size: 26rpx;
}
</style>

<!-- 非 scoped 全局规则：保证 mp-weixin 下 slot 内的 .field__input / .field__textarea
     等也能拿到样式（scoped + :deep 不会穿透到父组件作用域的 slot 节点）。 -->
<style>
.field {
  display: flex;
  flex-direction: column;
  margin-bottom: 16rpx;
}

.field-row {
  display: flex;
  gap: 14rpx;
  margin-bottom: 16rpx;
}

.field-row > .field {
  flex: 1;
  margin-bottom: 0;
}

.field__label {
  display: block;
  margin-bottom: 8rpx;
  color: #475569;
  font-size: 22rpx;
}

.field__input,
.field__picker {
  width: 100%;
  min-height: 80rpx;
  padding: 16rpx 20rpx;
  box-sizing: border-box;
  /* 用 1px（物理像素）+ 略深的边框色，避免 1rpx 在高 DPR 下被取整成 0、且浅灰描边在浅底上看不见 */
  border: 1px solid #cbd5e1;
  border-radius: 14rpx;
  background: #ffffff;
  color: #0f172a;
  font-size: 26rpx;
}

.field__input:focus,
.field__textarea:focus {
  border-color: #6366f1;
}

.field__picker {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.field__picker-arrow {
  color: #94a3b8;
  font-size: 22rpx;
}

.field__textarea {
  width: 100%;
  min-height: 140rpx;
  padding: 16rpx 20rpx;
  box-sizing: border-box;
  border: 1px solid #cbd5e1;
  border-radius: 14rpx;
  background: #ffffff;
  color: #0f172a;
  font-size: 26rpx;
}
</style>
