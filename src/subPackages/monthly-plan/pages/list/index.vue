<template>
  <view class="plan-page">
    <!-- 顶部栏：标题 + 回到今年 -->
    <view class="top-bar">
      <text class="top-bar__title">月度计划</text>
      <text class="top-bar__today" @click="backToThisYear">回到今年</text>
    </view>

    <!-- 全年滚动视图：纵向铺开 1-12 月，滑到顶/底自动加载上/下一年 -->
    <scroll-view
      class="year-scroll"
      scroll-y
      :scroll-into-view="scrollIntoId"
      :scroll-with-animation="false"
      :upper-threshold="40"
      :lower-threshold="120"
      @scrolltoupper="onReachTop"
      @scrolltolower="onReachBottom"
    >
      <view
        v-for="y in years"
        :key="y"
        :id="'year-' + y"
        class="year-block"
      >
        <!-- 年份分隔头 -->
        <view class="year-head" :class="{ 'year-head--this': y === thisYear }">
          <text class="year-head__label">{{ y }}年</text>
          <text v-if="y === thisYear" class="year-head__tag">今年</text>
          <text class="year-head__count">{{ yearCount(y) }} 项计划</text>
        </view>

        <!-- 12 个月 -->
        <view
          v-for="m in 12"
          :key="m"
          class="month-row"
          :class="{
            'month-row--empty': cellPlans(y, m).length === 0,
            'month-row--current': y === thisYear && m === thisMonth
          }"
        >
          <!-- 左侧月份轨道 -->
          <view class="month-row__rail">
            <text class="month-row__num">{{ m }}</text>
            <text class="month-row__unit">月</text>
          </view>

          <!-- 右侧内容 -->
          <view class="month-row__content">
            <template v-if="cellPlans(y, m).length">
              <view
                v-for="item in cellPlans(y, m)"
                :key="item.id"
                class="plan-card"
                :class="{ 'plan-card--repeat': item.repeatType === 'yearly' }"
                @click="openEdit(item)"
              >
                <view class="plan-card__icon">{{ item.repeatType === 'yearly' ? '🔁' : '📌' }}</view>
                <view class="plan-card__body">
                  <view class="plan-card__title-row">
                    <text class="plan-card__title">{{ item.itemTitle || '未命名计划' }}</text>
                    <text
                      class="plan-card__badge"
                      :class="item.repeatType === 'yearly' ? 'badge--repeat' : 'badge--once'"
                    >{{ item.repeatType === 'yearly' ? '每年' : '一次性' }}</text>
                  </view>
                  <text v-if="item.itemDesc" class="plan-card__desc">{{ item.itemDesc }}</text>
                </view>
              </view>
              <!-- 在该月补充计划 -->
              <view class="month-add" @click="openAddFor(y, m)">
                <text class="month-add__text">＋ 在 {{ m }} 月添加</text>
              </view>
            </template>

            <!-- 空月份：轻量占位，点击即可在该月添加 -->
            <view v-else class="month-empty" @click="openAddFor(y, m)">
              <text class="month-empty__text">暂无计划</text>
              <text class="month-empty__add">＋</text>
            </view>
          </view>
        </view>
      </view>

      <view class="scroll-foot">
        <text class="scroll-foot__text">继续上滑查看更早的年份 · 下滑查看更晚的年份</text>
      </view>
    </scroll-view>

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
import { ref, computed, nextTick } from 'vue'
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
const thisYear = now.getFullYear()
const thisMonth = now.getMonth() + 1 // 1-12

// 已加载到滚动视图里的年份窗口（默认含上一年/今年/下一年，便于双向滚动）
const years = ref([thisYear - 1, thisYear, thisYear + 1])
// 滚动定位锚点（scroll-into-view），初始落在今年
const scrollIntoId = ref('year-' + thisYear)
const loadingTop = ref(false)
let positioned = false

const allPlans = ref([]) // 群组下全部 monthlyPlan 原始项

const currentGroup = ref(null)
const currentMember = ref(null)

const monthOptions = Array.from({ length: 12 }, (_, i) => `${i + 1}月`)
// 一次性计划允许选择的年月范围（往前 5 年 ~ 往后 30 年）
const pickerStart = `${thisYear - 5}-01`
const pickerEnd = `${thisYear + 30}-12`

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

// 判定某计划是否落在指定的「年-月」内
function occursInYearMonth(item, Y, M) {
  const anchor = parseYearMonth(item.startTime || item.repeatStartDay)
  if (!anchor) return false
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

function sortPlans(a, b) {
  // 周期性排在一次性之前，其余按标题稳定排序
  const ra = a.repeatType === 'yearly' ? 0 : 1
  const rb = b.repeatType === 'yearly' ? 0 : 1
  if (ra !== rb) return ra - rb
  return String(a.itemTitle || '').localeCompare(String(b.itemTitle || ''))
}

// 一次性构建「年-月 -> 计划列表」映射，避免模板里重复过滤
const plansByCell = computed(() => {
  const map = {}
  for (const y of years.value) {
    for (let m = 1; m <= 12; m++) map[`${y}-${m}`] = []
  }
  for (const item of allPlans.value) {
    for (const y of years.value) {
      for (let m = 1; m <= 12; m++) {
        if (occursInYearMonth(item, y, m)) map[`${y}-${m}`].push(item)
      }
    }
  }
  for (const k in map) map[k].sort(sortPlans)
  return map
})
function cellPlans(y, m) {
  return plansByCell.value[`${y}-${m}`] || []
}
function yearCount(y) {
  let c = 0
  for (let m = 1; m <= 12; m++) c += cellPlans(y, m).length
  return c
}

// ---------- 滚动：双向加载年份 ----------
function onReachBottom() {
  const last = years.value[years.value.length - 1]
  years.value = [...years.value, last + 1]
}
function onReachTop() {
  if (loadingTop.value) return
  loadingTop.value = true
  const oldFirst = years.value[0]
  years.value = [oldFirst - 1, ...years.value]
  // 顶部插入新年份会把已有内容顶下去，需把视图滚回原来的首年块以维持视觉位置
  nextTick(() => {
    scrollIntoId.value = ''
    nextTick(() => {
      scrollIntoId.value = 'year-' + oldFirst
      setTimeout(() => { loadingTop.value = false }, 300)
    })
  })
}

function scrollToYear(y) {
  if (!years.value.includes(y)) {
    years.value = [y - 1, y, y + 1]
  }
  scrollIntoId.value = ''
  nextTick(() => { scrollIntoId.value = 'year-' + y })
}
function backToThisYear() {
  scrollToYear(thisYear)
}

// ---------- 表单 ----------
const showForm = ref(false)
const editingId = ref(null)
const form = ref({
  title: '',
  repeatType: 'none',
  yearMonth: '', // 'YYYY-MM'，一次性用
  month: thisMonth, // 1-12，每年用
  desc: ''
})

function openAdd() {
  openAddFor(thisYear, thisMonth)
}
function openAddFor(y, m) {
  editingId.value = null
  form.value = {
    title: '',
    repeatType: 'none',
    yearMonth: `${y}-${pad2(m)}`,
    month: m,
    desc: ''
  }
  showForm.value = true
}

function openEdit(item) {
  editingId.value = item.id
  const anchor = parseYearMonth(item.startTime || item.repeatStartDay) || { year: thisYear, month: thisMonth }
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
    // 数据加载后高度变化，首次回到今年以保证起始位置正确
    if (!positioned) {
      positioned = true
      nextTick(() => scrollToYear(thisYear))
    }
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
    // 每年：以「今年」为基准锚月，向后 RECUR_YEARS 年收尾
    anchorDate = new Date(thisYear, form.value.month - 1, 1)
    repeatEndDate = new Date(thisYear + RECUR_YEARS, form.value.month - 1, 1)
  } else {
    const ym = parseYearMonth(form.value.yearMonth) || { year: thisYear, month: thisMonth }
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

onShow(() => {
  fetchPlans()
})
</script>

<style scoped>
.plan-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  box-sizing: border-box;
  background: #f6f7fb;
}

/* 顶部栏 */
.top-bar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 28rpx;
  background: #ffffff;
  box-shadow: 0 4rpx 16rpx rgba(15, 23, 42, 0.05);
  z-index: 5;
}
.top-bar__title {
  font-size: 34rpx;
  font-weight: 700;
  color: #0f172a;
}
.top-bar__today {
  font-size: 24rpx;
  color: #007AFF;
  background: #eaf3ff;
  padding: 8rpx 22rpx;
  border-radius: 999rpx;
}

/* 全年滚动视图 */
.year-scroll {
  flex: 1;
  height: 0; /* 配合 flex:1 让 scroll-y 拿到确定高度 */
  padding: 0 20rpx;
  box-sizing: border-box;
}

/* 年份分隔头 */
.year-block {
  padding-top: 8rpx;
}
.year-head {
  position: sticky;
  top: 0;
  z-index: 2;
  display: flex;
  align-items: baseline;
  gap: 14rpx;
  padding: 20rpx 8rpx 12rpx;
  background: #f6f7fb;
}
.year-head__label {
  font-size: 40rpx;
  font-weight: 800;
  color: #0f172a;
}
.year-head--this .year-head__label {
  color: #007AFF;
}
.year-head__tag {
  font-size: 20rpx;
  color: #007AFF;
  background: #e6f1ff;
  padding: 3rpx 14rpx;
  border-radius: 999rpx;
}
.year-head__count {
  margin-left: auto;
  font-size: 22rpx;
  color: #94a3b8;
}

/* 月份行 */
.month-row {
  display: flex;
  gap: 16rpx;
  padding: 10rpx 0;
}
.month-row__rail {
  flex-shrink: 0;
  width: 84rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding-top: 6rpx;
}
.month-row__num {
  font-size: 40rpx;
  font-weight: 700;
  color: #334155;
  line-height: 1;
}
.month-row__unit {
  font-size: 20rpx;
  color: #94a3b8;
  margin-top: 2rpx;
}
.month-row--current .month-row__num {
  color: #007AFF;
}
.month-row--empty .month-row__num {
  color: #c4cbd6;
}
.month-row__content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

/* 计划卡片 */
.plan-card {
  display: flex;
  align-items: flex-start;
  gap: 18rpx;
  background: #ffffff;
  border-radius: 20rpx;
  padding: 22rpx 22rpx;
  box-shadow: 0 6rpx 16rpx rgba(15, 23, 42, 0.06);
  border: 1rpx solid #eef0f4;
}
.plan-card:active {
  transform: scale(0.99);
}
.plan-card--repeat {
  border-color: rgba(0, 122, 255, 0.25);
}
.plan-card__icon {
  font-size: 40rpx;
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #eef2ff;
  border-radius: 16rpx;
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
.plan-card__desc {
  display: block;
  font-size: 24rpx;
  color: #94a3b8;
  margin-top: 8rpx;
  line-height: 1.4;
}

/* 在某月补充计划 */
.month-add {
  align-self: flex-start;
  padding: 6rpx 4rpx;
}
.month-add__text {
  font-size: 22rpx;
  color: #007AFF;
}
.month-add:active {
  opacity: 0.6;
}

/* 空月份占位 */
.month-empty {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(255, 255, 255, 0.5);
  border: 1rpx dashed #dfe3ea;
  border-radius: 16rpx;
  padding: 18rpx 22rpx;
}
.month-empty__text {
  font-size: 24rpx;
  color: #b6bdc9;
}
.month-empty__add {
  font-size: 32rpx;
  color: #c4cbd6;
  line-height: 1;
}
.month-empty:active {
  background: #f1f5f9;
}

/* 滚动底部提示 */
.scroll-foot {
  text-align: center;
  padding: 36rpx 0 200rpx;
}
.scroll-foot__text {
  font-size: 22rpx;
  color: #c4cbd6;
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
