<template>
  <view v-if="visible" class="aes-overlay" @tap.self="handleClose">
    <view class="aes-shell" @tap.stop>
      <view class="aes-header">
        <text class="aes-title">{{ isEdit ? '修改戒断事件' : '新建戒断事件' }}</text>
        <view class="aes-close" @click="handleClose"><text class="aes-close__icon">×</text></view>
      </view>

      <scroll-view scroll-y class="aes-body">
        <view class="field">
          <text class="field__label">戒断目标（事件名称）</text>
          <input
            v-model="form.itemTitle"
            class="field__input"
            placeholder="如：戒烟、戒糖、戒手游"
            placeholder-class="aes-ph"
            :maxlength="32"
          />
        </view>

        <view class="field">
          <text class="field__label">戒断结束日期</text>
          <picker mode="date" :value="form.endDate" :start="minDate" @change="onEndDateChange">
            <view class="field__input aes-picker">
              <text :class="{ 'aes-picker--ph': !form.endDate }">{{ form.endDate || '选择目标坚持到的日期' }}</text>
            </view>
          </picker>
          <text class="aes-hint">开始时间默认为创建时间{{ isEdit ? '（不可改）' : '' }}</text>
        </view>

        <view class="field">
          <text class="field__label">补充描述（选填）</text>
          <textarea
            v-model="form.itemDesc"
            class="field__input field__textarea"
            placeholder="记录戒断的理由、目标，给自己一点动力"
            placeholder-class="aes-ph"
            :maxlength="200"
          />
        </view>
      </scroll-view>

      <view class="aes-actions">
        <button class="aes-btn aes-btn--ghost" @click="handleClose"><text class="aes-btn__text">取消</text></button>
        <button class="aes-btn aes-btn--primary" :disabled="saving" @click="handleSave">
          <text class="aes-btn__text">{{ saving ? '保存中' : '保存' }}</text>
        </button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { toDateKey } from '../../utils/abstainUtil'

const props = defineProps({
  visible: { type: Boolean, default: false },
  // 编辑时传入的戒断事件（scheduleItem DTO）；新建为 null
  event: { type: Object, default: null },
  saving: { type: Boolean, default: false }
})

const emit = defineEmits(['close', 'save'])

const isEdit = computed(() => !!(props.event && props.event.id))
const minDate = toDateKey(new Date())

const form = ref({ itemTitle: '', endDate: '', itemDesc: '' })

watch(
  () => [props.visible, props.event],
  () => {
    if (!props.visible) return
    if (props.event && props.event.id) {
      form.value = {
        itemTitle: props.event.itemTitle || '',
        endDate: toDateKey(props.event.endTime) || '',
        itemDesc: props.event.itemDesc || ''
      }
    } else {
      form.value = { itemTitle: '', endDate: '', itemDesc: '' }
    }
  },
  { immediate: true }
)

const onEndDateChange = (e) => { form.value.endDate = e.detail.value }

function handleSave() {
  const title = (form.value.itemTitle || '').trim()
  if (!title) {
    uni.showToast({ title: '请填写事件名称', icon: 'none' })
    return
  }
  if (!form.value.endDate) {
    uni.showToast({ title: '请选择戒断结束日期', icon: 'none' })
    return
  }
  emit('save', {
    id: isEdit.value ? props.event.id : null,
    itemTitle: title,
    itemDesc: (form.value.itemDesc || '').trim(),
    endDate: form.value.endDate
  })
}

function handleClose() { emit('close') }
</script>

<style scoped>
.aes-overlay {
  position: fixed; left: 0; top: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.55); z-index: 9999;
  display: flex; align-items: flex-end; justify-content: center;
}
.aes-shell {
  width: 100%; max-width: 760rpx; background: #fff;
  border-top-left-radius: 28rpx; border-top-right-radius: 28rpx;
  display: flex; flex-direction: column; max-height: 86vh;
  padding: 28rpx 32rpx env(safe-area-inset-bottom);
}
.aes-header { display: flex; align-items: center; justify-content: space-between; padding-bottom: 16rpx; }
.aes-title { font-size: 34rpx; font-weight: 700; color: #1f2937; }
.aes-close { width: 60rpx; height: 60rpx; border-radius: 50%; background: #f1f5f9; display: flex; align-items: center; justify-content: center; }
.aes-close__icon { font-size: 40rpx; color: #64748b; line-height: 1; }
.aes-body { max-height: 60vh; }
.aes-ph { color: #b8c2cf; }
.aes-picker { display: flex; align-items: center; }
.aes-picker--ph { color: #b8c2cf; }
.aes-hint { font-size: 22rpx; color: #94a3b8; margin-top: 8rpx; display: block; }
.aes-actions { display: flex; gap: 20rpx; padding-top: 24rpx; }
.aes-btn { flex: 1; height: 88rpx; border-radius: 44rpx; border: none; display: flex; align-items: center; justify-content: center; }
.aes-btn::after { border: none; }
.aes-btn[disabled] { opacity: 0.45; }
.aes-btn--ghost { background: #f1f5f9; }
.aes-btn--ghost .aes-btn__text { color: #475569; font-size: 28rpx; font-weight: 600; }
.aes-btn--primary { background: #2196f3; }
.aes-btn--primary .aes-btn__text { color: #fff; font-size: 28rpx; font-weight: 600; }
</style>
