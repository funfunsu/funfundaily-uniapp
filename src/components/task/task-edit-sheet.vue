<template>
  <BottomSheet
    :visible="visible"
    :title="isEdit ? '编辑任务' : '新增任务'"
    accent="primary"
    body-max-height="64vh"
    :show-delete="isEdit"
    :confirm-text="saving ? '保存中…' : (isEdit ? '保存修改' : '保存')"
    :confirm-disabled="saving || loading || !innerSchedule"
    @close="onClose"
    @confirm="onConfirm"
    @delete="onDelete"
  >
    <view v-if="loading" class="tes-loading"><text>加载中...</text></view>
    <task-edit
      v-else-if="innerSchedule"
      ref="formRef"
      :schedule="innerSchedule"
      :goal-list="goalList"
      :cur-date="curDate"
      embedded
    />
  </BottomSheet>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import BottomSheet from '../fun-components/bottom-sheet.vue'
import taskEdit from './task-edit.vue'
import apiTs from '../../utils/apiTs'
import DateUtils from '../../utils/util'
import { getStoredKey, removeStoredDataByKeys, STORAGE_KEYS } from '../../utils/storageManager'

const props = defineProps({
  visible: { type: Boolean, default: false },
  // 有值=编辑该任务（按 id 拉全量）；空=新增
  editId: { type: [String, Number], default: null },
  goalList: { type: Array, default: () => [] },
  curDate: { type: Date, default: () => new Date() },
  groupId: { type: [String, Number], default: '' },
  targetUserId: { type: [String, Number], default: '' }
})

const emit = defineEmits(['close', 'saved', 'deleted'])

const innerSchedule = ref(null)
const loading = ref(false)
const saving = ref(false)
const formRef = ref(null)

const isEdit = computed(() => !!props.editId)

// 新增任务的初始模板（与原 edit.vue 默认一致，其余默认由 task-edit 内部补全）
function freshTemplate() {
  const d = props.curDate || new Date()
  return {
    itemType: 'task',
    startTime: DateUtils.getDayStartTimeStr(d),
    endTime: DateUtils.getDayEndTimeStr(d),
    repeatStartDay: DateUtils.getDateStr(d),
    repeatEndDay: DateUtils.getNextDayStr(d),
    extra: { score: 1, taskType: 'Habit', totalCount: 1 }
  }
}

async function prepare() {
  if (props.editId) {
    loading.value = true
    innerSchedule.value = null
    try {
      innerSchedule.value = await apiTs.schedule.info({ id: props.editId })
    } catch (e) {
      console.error('加载任务详情失败:', e)
      uni.showToast({ title: '加载任务失败', icon: 'none' })
      emit('close')
    } finally {
      loading.value = false
    }
  } else {
    innerSchedule.value = freshTemplate()
  }
}

watch(
  () => [props.visible, props.editId],
  () => {
    if (props.visible) prepare()
    else innerSchedule.value = null
  },
  { immediate: true }
)

function invalidateGoalCacheIfNeeded(schedule) {
  if (schedule?.itemType === 'goal' && props.targetUserId) {
    removeStoredDataByKeys(STORAGE_KEYS.USER_ALL_GOAL, props.targetUserId)
  }
}

async function onConfirm() {
  if (saving.value || loading.value) return
  if (!formRef.value) {
    uni.showToast({ title: '数据加载中，请稍后重试', icon: 'none' })
    return
  }
  const finalSchedule = formRef.value.getFinalSchedule()
  if (!finalSchedule?.itemTitle || !String(finalSchedule.itemTitle).trim()) {
    uni.showToast({ title: '请输入标题', icon: 'none' })
    return
  }
  saving.value = true
  try {
    invalidateGoalCacheIfNeeded(finalSchedule)
    await apiTs.schedule.save({
      targetUserId: props.targetUserId,
      groupId: props.groupId,
      items: [finalSchedule]
    })
    uni.showToast({ title: '已保存', icon: 'success' })
    emit('saved')
  } catch (e) {
    console.error('保存失败:', e)
    uni.showToast({ title: e?.message || '保存失败', icon: 'none' })
  } finally {
    saving.value = false
  }
}

function onDelete() {
  if (!props.editId) return
  uni.showModal({
    title: '确认删除',
    content: '删除后不可恢复，确定删除此任务吗？',
    confirmColor: '#e54d42',
    success: async (res) => {
      if (!res.confirm) return
      try {
        await apiTs.schedule.delete(props.editId)
        invalidateGoalCacheIfNeeded(innerSchedule.value)
        uni.showToast({ title: '已删除', icon: 'success' })
        emit('deleted')
      } catch (e) {
        console.error('删除失败:', e)
        uni.showToast({ title: e?.message || '删除失败', icon: 'none' })
      }
    }
  })
}

function onClose() {
  emit('close')
}
</script>

<style scoped>
.tes-loading {
  text-align: center;
  color: #94a3b8;
  font-size: 26rpx;
  padding: 60rpx 0;
}
</style>
