<template>
  <view
    class="plan-page"
    @touchstart="onTouchStart"
    @touchend="onTouchEnd"
  >
    <!-- 月份导航：上一月 / 当前年月 / 下一月，支持上下滑动 -->
    <view class="month-nav">
      <view class="month-nav__btn" @click="goPrevMonth">
        <text class="month-nav__chevron">︿</text>
        <text class="month-nav__btn-label">上一月</text>
      </view>

      <view class="month-nav__center">
        <text class="month-nav__year">{{ viewYear }}年</text>
        <text class="month-nav__month">{{ viewMonth }}月</text>
        <text v-if="!isCurrentMonth" class="month-nav__today" @click="goCurrentMonth">回到本月</text>
      </view>

      <view class="month-nav__btn" @click="goNextMonth">
        <text class="month-nav__btn-label">下一月</text>
        <text class="month-nav__chevron">﹀</text>
      </view>
    </view>

    <text class="swipe-hint">上下滑动切换月份</text>

    <!-- 当月计划列表 -->
    <view v-if="monthPlans.length > 0" class="plan-list">
      <view
        v-for="item in monthPlans"
        :key="item.id"
        class="plan-card"
        :class="{ 'plan-card--repeat': item.repeatType === 'yearly' }"
        @click="openEdit(item)"
      >
        <view class="plan-card__icon">{{ item.repeatType === 'yearly' ? '🔁' : '📌' }}</view>
        <view class="plan-card__body">
          <view class="plan-card__title-row">
            <text class="plan-card__title">{{ item.itemTitle || '未命名计划' }}</text>
            <text class="plan-card__badge" :class="item.repeatType === 'yearly' ? 'badge--repeat' : 'badge--once'">
              {{ item.repeatType === 'yearly' ? '每年' : '一次性' }}
            </text>
          </view>
          <text class="plan-card__when">{{ formatWhen(item) }}</text>
          <text v-if="item.itemDesc" class="plan-card__desc">{{ item.itemDesc }}</text>
        </view>
      </view>
    </view>

    <!-- 空状态 -->
    <view v-else class="empty-state">
      <text class="empty-state__icon">🗓️</text>
      <text class="empty-state__text">{{ viewYear }}年{{ viewMonth }}月还没有计划</text>
      <text class="empty-state__sub">记录这个月要做的家庭大事，一次性的或每年都要做的都可以</text>
      <button class="empty-state__cta" @click="openAdd">＋ 添加月度计划</button>
    </view>

    <!-- 悬浮添加按钮 -->
    <view class="fab" @click="openAdd">
      <text class="fab__plus">＋</text>
    </view>

    <!-- 添加 / 编辑弹窗 -->
    <BottomSheet
      :visible="showForm"
      :title="editingId ? '编辑月度计划' : '添加月度计划'"
      accent="primary"
      :confirm-text="editingId ? '保存修改' : '确认添加'"
      @close="closeForm"
      @confirm="submitForm"
    >
      <view class="field">
        <text class="field__label">计划名称</text>
        <input
          v-model="form.title"
          class="field__input"
          type="text"
          placeholder="例如：新家装修 / 家庭财务测算（必填）"
        />
      </view>

      <view class="field">
        <text class="field__label">计划类型</text>
        <view class="seg">
          <view
            class="seg__item"
            :class="{ 'seg__item--active': form.repeatType === 'none' }"
            @click="form.repeatType = 'none'"
          >一次性</view>
          <view
            class="seg__item"
            :class="{ 'seg__item--active': form.repeatType === 'yearly' }"
            @click="form.repeatType = 'yearly'"
          >每年</view>
        </view>
      </view>

      <!-- 一次性：选年 + 月 -->
      <view v-if="form.repeatType === 'none'" class="field">
        <text class="field__label">所在月份</text>
        <picker
          mode="date"
          fields="month"
          :value="form.yearMonth"
          :start="pickerStart"
          :end="pickerEnd"
          @change="onYearMonthChange"
        >
          <view class="picker-box">{{ formatYearMonth(form.yearMonth) }}</view>
        </picker>
      </view>

      <!-- 每年：只选月 -->
      <view v-else class="field">
        <text class="field__label">每年的月份</text>
        <picker
          mode="selector"
          :range="monthOptions"
          :value="form.month - 1"
          @change="onMonthChange"
        >
          <view class="picker-box">每年 {{ form.month }} 月</view>
        </picker>
      </view>

      <view class="field">
        <text class="field__label">备注（可选）</text>
        <textarea
          v-model="form.desc"
          class="field__textarea"
          placeholder="补充说明，例如预算、负责人等"
          :maxlength="120"
        />
      </view>

      <view v-if="editingId" class="form-delete" @click="removePlan">
        <text class="form-delete__text">🗑 删除该计划</text>
      </view>
    </BottomSheet>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import apiTs from '../../../../utils/apiTs'
import DateUtils from '../../../../utils/util'
import { ensureCurrentGroup, ensureCurrentMember } from '../../../../utils/currentGroupResolver'
import { STORAGE_KEYS, getStoredData } from '../../../../utils/storageManager'
import BottomSheet from '../../../../components/fun-components/bottom-sheet.vue'

const PLAN_TYPE = 'monthlyPlan'
// 周期性计划的收尾：自基准年起向后 20 年，与「大事记」事件页一致的远期处理
const RECUR_YEARS = 20

const now = new Date()
const viewYear = ref(now.getFullYear())
const viewMonth = ref(now.getMonth() + 1) // 1-12

const allPlans = ref([]) // 群组下全部 monthlyPlan 原始项

const currentGroup = ref(null)
const currentMember = ref(null)

const monthOptions = Array.from({ length: 12 }, (_, i) => `${i + 1}月`)
// 一次性计划允许选择的年月范围（往前 5 年 ~ 往后 30 年）
const pickerStart = `${now.getFullYear() - 5}-01`
const pickerEnd = `${now.getFullYear() + 30}-12`

const isCurrentMonth = computed(
  () => viewYear.value === now.getFullYear() && viewMonth.value === now.getMonth() + 1
)

// ---------- 解析工具：从日期字符串里取年/月，避免各端 new Date 解析差异 ----------
function parseYearMonth(str) {
  if (!str) return null
  const m = String(str).match(/^(\d{4})-(\d{2})/)
  if (!m) return null
  return { year: Number(m[1]), month: Number(m[2]) }
}
function parseYear(str) {
  const ym = parseYearMonth(str)
  return ym ? ym.year : null
}

// 判定某计划是否落在「查看的年月」内
function occursInViewMonth(item) {
  const anchor = parseYearMonth(item.startTime || item.repeatStartDay)
  if (!anchor) return false
  const Y = viewYear.value
  const M = viewMonth.value
  if (item.repeatType === 'yearly') {
    if (anchor.month !== M) return false
    const startY = parseYear(item.repeatStartDay) ?? anchor.year
    const endY = parseYear(item.repeatEndDay) ?? 9999
    return Y >= startY && Y <= endY
  }
  if (item.repeatType === 'monthly') {
    // 每月：落在重复区间内的任意月份都出现（前端兜底，UI 暂不创建）
    const start = parseYearMonth(item.repeatStartDay)
    const end = parseYearMonth(item.repeatEndDay)
    const cur = Y * 12 + M
    const s = start ? start.year * 12 + start.month : -Infinity
    const e = end ? end.year * 12 + end.month : Infinity
    return cur >= s && cur <= e
  }
  // 一次性
  return anchor.year === Y && anchor.month === M
}

const monthPlans = computed(() =>
  allPlans.value
    .filter(occursInViewMonth)
    .sort((a, b) => {
      // 周期性排在一次性之前，其余按标题稳定排序
      const ra = a.repeatType === 'yearly' ? 0 : 1
      const rb = b.repeatType === 'yearly' ? 0 : 1
      if (ra !== rb) return ra - rb
      return String(a.itemTitle || '').localeCompare(String(b.itemTitle || ''))
    })
)

// ---------- 月份导航 ----------
function shiftMonth(delta) {
  let y = viewYear.value
  let m = viewMonth.value + delta
  while (m > 12) { m -= 12; y += 1 }
  while (m < 1) { m += 12; y -= 1 }
  viewYear.value = y
  viewMonth.value = m
}
function goPrevMonth() { shiftMonth(-1) }
function goNextMonth() { shiftMonth(1) }
function goCurrentMonth() {
  viewYear.value = now.getFullYear()
  viewMonth.value = now.getMonth() + 1
}

// 上下滑动切换月份：上滑→下一月，下滑→上一月
const touchStartY = ref(0)
const touchStartX = ref(0)
function onTouchStart(e) {
  const t = e.touches?.[0] || e.changedTouches?.[0]
  if (!t) return
  touchStartY.value = t.clientY
  touchStartX.value = t.clientX
}
function onTouchEnd(e) {
  const t = e.changedTouches?.[0]
  if (!t) return
  const dy = t.clientY - touchStartY.value
  const dx = t.clientX - touchStartX.value
  // 仅认定明显的纵向滑动，避免与横向/点击冲突
  if (Math.abs(dy) < 60 || Math.abs(dy) < Math.abs(dx)) return
  if (dy < 0) goNextMonth()
  else goPrevMonth()
}

// ---------- 表单 ----------
const showForm = ref(false)
const editingId = ref(null)
const form = ref({
  title: '',
  repeatType: 'none',
  yearMonth: '', // 'YYYY-MM'，一次性用
  month: viewMonth.value, // 1-12，每年用
  desc: ''
})

function openAdd() {
  editingId.value = null
  form.value = {
    title: '',
    repeatType: 'none',
    yearMonth: `${viewYear.value}-${pad2(viewMonth.value)}`,
    month: viewMonth.value,
    desc: ''
  }
  showForm.value = true
}

function openEdit(item) {
  editingId.value = item.id
  const anchor = parseYearMonth(item.startTime || item.repeatStartDay) || { year: viewYear.value, month: viewMonth.value }
  form.value = {
    title: item.itemTitle || '',
    repeatType: item.repeatType === 'yearly' ? 'yearly' : 'none',
    yearMonth: `${anchor.year}-${pad2(anchor.month)}`,
    month: anchor.month,
    desc: item.itemDesc || ''
  }
  showForm.value = true
}

function closeForm() {
  showForm.value = false
  editingId.value = null
}

function onYearMonthChange(e) {
  form.value.yearMonth = e.detail.value // 'YYYY-MM'
}
function onMonthChange(e) {
  form.value.month = Number(e.detail.value) + 1
}

// ---------- 上下文 ----------
async function ensureContext() {
  if (currentGroup.value?.id && currentMember.value) return true
  const group = await ensureCurrentGroup()
  if (!group?.id) {
    uni.showToast({ title: '请先创建或加入群组', icon: 'none' })
    return false
  }
  currentGroup.value = group
  const member = await ensureCurrentMember(group.id)
  currentMember.value = member || getStoredData(STORAGE_KEYS.CURRENT_MEMBER)
  return true
}

function resolveOwnerUserId() {
  const loginUser = getStoredData(STORAGE_KEYS.USER_INFO)
  if (loginUser?.id !== undefined && loginUser?.id !== null) return loginUser.id
  const member = currentMember.value || getStoredData(STORAGE_KEYS.CURRENT_MEMBER)
  return member?.userId ?? member?.id
}

// ---------- 数据加载 ----------
async function fetchPlans() {
  const ok = await ensureContext()
  if (!ok) return
  try {
    const list = await apiTs.schedule.planList({
      groupId: String(currentGroup.value.id),
      scheduleItemType: PLAN_TYPE
    })
    allPlans.value = Array.isArray(list) ? list : []
  } catch (err) {
    console.error('加载月度计划失败', err)
    uni.showToast({ title: '加载失败，请重试', icon: 'none' })
  }
}

// ---------- 保存 ----------
async function submitForm() {
  if (!form.value.title.trim()) {
    uni.showToast({ title: '请输入计划名称', icon: 'none' })
    return
  }
  const ok = await ensureContext()
  if (!ok) return

  let anchorDate
  let repeatEndDate
  if (form.value.repeatType === 'yearly') {
    // 每年：以「当前查看年」为基准锚月，向后 RECUR_YEARS 年收尾
    const baseYear = now.getFullYear()
    anchorDate = new Date(baseYear, form.value.month - 1, 1)
    repeatEndDate = new Date(baseYear + RECUR_YEARS, form.value.month - 1, 1)
  } else {
    const ym = parseYearMonth(form.value.yearMonth) || { year: viewYear.value, month: viewMonth.value }
    anchorDate = new Date(ym.year, ym.month - 1, 1)
    // 一次性：收尾设为当月最后一天
    repeatEndDate = DateUtils.getLastDayOfMonth(anchorDate)
  }

  const item = {
    itemTitle: form.value.title.trim(),
    itemDesc: form.value.desc?.trim() || '',
    itemType: PLAN_TYPE,
    repeatType: form.value.repeatType,
    repeatKeys: [],
    startTime: DateUtils.getDayStartTimeStr(anchorDate),
    endTime: DateUtils.getDayEndTimeStr(repeatEndDate),
    repeatStartDay: DateUtils.getDateStr(anchorDate),
    repeatEndDay: DateUtils.getDateStr(repeatEndDate),
    parentId: 0
  }
  if (editingId.value) item.id = editingId.value

  try {
    await apiTs.schedule.save({
      groupId: currentGroup.value.id,
      targetUserId: resolveOwnerUserId(),
      items: [item]
    })
    uni.showToast({ title: editingId.value ? '已保存' : '已添加', icon: 'success' })
    closeForm()
    await fetchPlans()
  } catch (err) {
    console.error('保存月度计划失败', err)
    uni.showToast({ title: '保存失败，请重试', icon: 'none' })
  }
}

async function removePlan() {
  if (!editingId.value) return
  const confirmed = await new Promise((resolve) =>
    uni.showModal({
      title: '删除计划',
      content: `确定删除「${form.value.title || '该计划'}」吗？`,
      confirmText: '删除',
      confirmColor: '#e54d42',
      success: (r) => resolve(r.confirm),
      fail: () => resolve(false)
    })
  )
  if (!confirmed) return
  try {
    await apiTs.schedule.delete(editingId.value)
    uni.showToast({ title: '已删除', icon: 'success' })
    closeForm()
    await fetchPlans()
  } catch (err) {
    console.error('删除月度计划失败', err)
    uni.showToast({ title: '删除失败，请重试', icon: 'none' })
  }
}

// ---------- 展示格式化 ----------
function pad2(n) {
  return n < 10 ? `0${n}` : `${n}`
}
function formatYearMonth(ym) {
  const parsed = parseYearMonth(ym)
  if (!parsed) return '请选择月份'
  return `${parsed.year}年${parsed.month}月`
}
function formatWhen(item) {
  const anchor = parseYearMonth(item.startTime || item.repeatStartDay)
  if (!anchor) return ''
  if (item.repeatType === 'yearly') return `每年 ${anchor.month} 月`
  return `${anchor.year}年${anchor.month}月`
}

onShow(() => {
  fetchPlans()
})
</script>

<style scoped>
.plan-page {
  min-height: 100vh;
  box-sizing: border-box;
  padding: 20rpx 20rpx 200rpx;
  background: #f6f7fb;
}

/* 月份导航 */
.month-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #ffffff;
  border-radius: 24rpx;
  padding: 24rpx 28rpx;
  box-shadow: 0 8rpx 20rpx rgba(15, 23, 42, 0.06);
}
.month-nav__btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
  padding: 8rpx 12rpx;
  min-width: 96rpx;
}
.month-nav__btn:active {
  opacity: 0.6;
}
.month-nav__chevron {
  font-size: 32rpx;
  color: #007AFF;
  line-height: 1;
}
.month-nav__btn-label {
  font-size: 22rpx;
  color: #94a3b8;
}
.month-nav__center {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.month-nav__year {
  font-size: 26rpx;
  color: #64748b;
}
.month-nav__month {
  font-size: 56rpx;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.1;
}
.month-nav__today {
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #007AFF;
  background: #eaf3ff;
  padding: 4rpx 18rpx;
  border-radius: 999rpx;
}

.swipe-hint {
  display: block;
  text-align: center;
  font-size: 22rpx;
  color: #b6bdc9;
  margin: 16rpx 0 4rpx;
}

/* 列表 */
.plan-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  margin-top: 8rpx;
}
.plan-card {
  display: flex;
  align-items: flex-start;
  gap: 18rpx;
  background: #ffffff;
  border-radius: 20rpx;
  padding: 26rpx 24rpx;
  box-shadow: 0 8rpx 20rpx rgba(15, 23, 42, 0.06);
  border: 1rpx solid #eef0f4;
}
.plan-card:active {
  transform: scale(0.99);
}
.plan-card--repeat {
  border-color: rgba(0, 122, 255, 0.25);
}
.plan-card__icon {
  font-size: 44rpx;
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #eef2ff;
  border-radius: 18rpx;
  flex-shrink: 0;
}
.plan-card__body {
  flex: 1;
  min-width: 0;
}
.plan-card__title-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.plan-card__title {
  font-size: 30rpx;
  font-weight: 600;
  color: #111827;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 0 1 auto;
  max-width: 70%;
}
.plan-card__badge {
  flex-shrink: 0;
  font-size: 20rpx;
  font-weight: 600;
  padding: 4rpx 14rpx;
  border-radius: 999rpx;
}
.badge--once {
  color: #b45309;
  background: #fef3c7;
}
.badge--repeat {
  color: #007AFF;
  background: #e6f1ff;
}
.plan-card__when {
  display: block;
  font-size: 24rpx;
  color: #6b7280;
  margin-top: 8rpx;
}
.plan-card__desc {
  display: block;
  font-size: 24rpx;
  color: #94a3b8;
  margin-top: 8rpx;
  line-height: 1.4;
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 96rpx 48rpx;
  background: #ffffff;
  border-radius: 24rpx;
  margin-top: 24rpx;
  box-shadow: 0 8rpx 20rpx rgba(15, 23, 42, 0.04);
}
.empty-state__icon {
  font-size: 96rpx;
  display: block;
  margin-bottom: 20rpx;
}
.empty-state__text {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: #1d2129;
  margin-bottom: 12rpx;
}
.empty-state__sub {
  display: block;
  font-size: 24rpx;
  color: #94a3b8;
  line-height: 1.6;
  margin-bottom: 36rpx;
}
.empty-state__cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 84rpx;
  padding: 0 48rpx;
  background: linear-gradient(135deg, #007AFF 0%, #0056b3 100%);
  color: #ffffff;
  font-size: 28rpx;
  font-weight: 600;
  border: none;
  border-radius: 999rpx;
  line-height: 1;
}
.empty-state__cta::after {
  border: none;
}

/* 悬浮添加按钮 */
.fab {
  position: fixed;
  right: 40rpx;
  bottom: 80rpx;
  width: 104rpx;
  height: 104rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #007AFF 0%, #0056b3 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 12rpx 28rpx rgba(0, 122, 255, 0.4);
  z-index: 20;
}
.fab:active {
  transform: scale(0.94);
}
.fab__plus {
  color: #ffffff;
  font-size: 60rpx;
  line-height: 1;
}

/* 表单内分段选择 / 选择器 */
.seg {
  display: flex;
  background: #f1f5f9;
  border-radius: 16rpx;
  padding: 6rpx;
  gap: 6rpx;
}
.seg__item {
  flex: 1;
  text-align: center;
  font-size: 28rpx;
  color: #64748b;
  padding: 16rpx 0;
  border-radius: 12rpx;
}
.seg__item--active {
  background: #ffffff;
  color: #007AFF;
  font-weight: 600;
  box-shadow: 0 4rpx 10rpx rgba(15, 23, 42, 0.08);
}
.picker-box {
  height: 80rpx;
  line-height: 80rpx;
  padding: 0 24rpx;
  background: #f6f7fb;
  border-radius: 12rpx;
  font-size: 28rpx;
  color: #0f172a;
}

/* 表单内删除 */
.form-delete {
  text-align: center;
  margin-top: 24rpx;
  padding: 16rpx 0 4rpx;
}
.form-delete__text {
  font-size: 26rpx;
  color: #e54d42;
}
.form-delete:active .form-delete__text {
  opacity: 0.6;
}
</style>
