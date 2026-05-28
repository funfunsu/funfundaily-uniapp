<template>
  <BottomSheet
    :visible="visible"
    :title="isEdit ? '编辑日程' : '新增日程'"
    accent="primary"
    body-max-height="64vh"
    :show-delete="isEdit"
    :confirm-text="saving ? '保存中…' : (isEdit ? '保存修改' : '保存')"
    :confirm-disabled="saving || loading || !innerSchedule"
    @close="onClose"
    @confirm="onConfirm"
    @delete="onDelete"
  >
    <view v-if="loading" class="ses-loading"><text>加载中...</text></view>
    <schedule-edit
      v-else-if="innerSchedule"
      ref="formRef"
      :schedule="innerSchedule"
      :cur-date="curDateComputed"
      :start-time="startTimeStr"
      embedded
    />
  </BottomSheet>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import BottomSheet from '../fun-components/bottom-sheet.vue'
import scheduleEdit from './schedule-edit.vue'
import apiTs from '../../utils/apiTs'
import DateUtils from '../../utils/util'
import { getStoredData, STORAGE_KEYS } from '../../utils/storageManager'

const props = defineProps({
  visible: { type: Boolean, default: false },
  // 有值=编辑该日程（按 id 拉全量）；空=新增
  editId: { type: [String, Number], default: null },
  // 新增定位：点格子带入 date(YYYY-MM-DD) + hour(如 '8:00')
  date: { type: String, default: '' },
  hour: { type: String, default: '' },
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

// 新增时的起始日期/时间（点格子带入），否则回退到 curDate / 08:00
const curDateComputed = computed(() => {
  if (props.date) {
    return new Date(DateUtils.getDateTime(props.date, props.hour || '8:00'))
  }
  return props.curDate || new Date()
})
const startTimeStr = computed(() => {
  if (props.hour) {
    const [h, m = '0'] = String(props.hour).split(':')
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  }
  return '08:00'
})

// 新增日程初始模板（其余默认由 schedule-edit 内部补全）
function freshTemplate() {
  const base = curDateComputed.value
  return {
    itemType: 'schedule',
    repeatStartDay: DateUtils.getDateStr(base),
    extra: { score: 0, taskType: 'Habit', totalCount: 1 }
  }
}

async function prepare() {
  if (props.editId) {
    loading.value = true
    innerSchedule.value = null
    try {
      innerSchedule.value = await apiTs.schedule.info({ id: props.editId })
    } catch (e) {
      console.error('加载日程详情失败:', e)
      uni.showToast({ title: '加载日程失败', icon: 'none' })
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

// 解析保存所需的 群组/成员：优先取页面传入，否则回退本地存储
function resolveGroupId() {
  if (props.groupId) return props.groupId
  return getStoredData(STORAGE_KEYS.CURRENT_GROUP)?.id
}
function resolveTargetUserId() {
  if (props.targetUserId) return props.targetUserId
  const member = getStoredData(STORAGE_KEYS.CURRENT_MEMBER)
  return member?.userId ?? member?.id
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
  const groupId = resolveGroupId()
  const targetUserId = resolveTargetUserId()
  if (!groupId || !targetUserId) {
    uni.showToast({ title: '请先选择群组与成员', icon: 'none' })
    return
  }
  saving.value = true
  try {
    await apiTs.schedule.save({
      targetUserId,
      groupId,
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
    content: '删除后不可恢复，确定删除此日程吗？',
    confirmColor: '#e54d42',
    success: async (res) => {
      if (!res.confirm) return
      try {
        await apiTs.schedule.delete(props.editId)
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
.ses-loading {
  text-align: center;
  color: #94a3b8;
  font-size: 26rpx;
  padding: 60rpx 0;
}
</style>
