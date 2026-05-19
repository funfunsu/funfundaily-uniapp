<template>
  <view class="page">

    <view v-if="!currentGroup.id" class="empty">
      <view class="empty-illustration">
        <text class="empty-illustration__icon">👥</text>
      </view>
      <text class="empty-title">先选择一个群组</text>
      <text class="empty-hint">在底部群组选择器中切换，查看该群组的邀请函</text>
    </view>

    <view v-else-if="!loading && list.length === 0" class="empty">
      <view class="empty-illustration">
        <text class="empty-illustration__icon">📨</text>
      </view>
      <text class="empty-title">还没有邀请函</text>
      <text class="empty-hint">点击底部「新建」，几分钟做一张精致的邀请函</text>
    </view>

    <view v-else class="card-list">
      <view
        v-for="item in list"
        :key="item.id"
        class="invitation-item"
      >
        <view
          class="invitation-item__accent"
          :style="{ background: styleFor(item.cardStyle).cardBg }"
        />
        <view class="invitation-item__body">
          <view class="invitation-item__head">
            <view
              class="invitation-item__avatar"
              :style="{
                background: styleFor(item.cardStyle).badgeBg,
                color: styleFor(item.cardStyle).badgeColor,
              }"
            >
              <text class="invitation-item__avatar-icon">
                {{ styleFor(item.cardStyle).icon }}
              </text>
            </view>
            <view class="invitation-item__title-block">
              <text class="invitation-item__title">
                {{ item.title || '未命名邀请函' }}
              </text>
              <text
                class="invitation-item__status"
                :class="'status--' + eventStatus(item.eventTime).tone"
              >
                {{ eventStatus(item.eventTime).label }}
              </text>
            </view>
          </view>

          <view class="invitation-item__meta">
            <view class="invitation-item__meta-row">
              <text class="invitation-item__meta-icon">📅</text>
              <text class="invitation-item__meta-text">
                {{ formatEventTime(item.eventTime) }}
              </text>
            </view>
            <view class="invitation-item__meta-row">
              <text class="invitation-item__meta-icon">📍</text>
              <text class="invitation-item__meta-text">
                {{ item.address || '地址待定' }}
              </text>
            </view>
          </view>

          <view v-if="item.body" class="invitation-item__excerpt">
            {{ truncate(item.body, 70) }}
          </view>

          <view class="invitation-item__actions">
            <view
              v-if="canEdit(item)"
              class="invitation-action invitation-action--ghost"
              @click="openEdit(item)"
            >
              <text class="invitation-action__icon">✏️</text>
              <text class="invitation-action__label">编辑</text>
            </view>
            <view
              class="invitation-action invitation-action--primary"
              @click="openShare(item)"
            >
              <text class="invitation-action__icon">📨</text>
              <text class="invitation-action__label">邀请</text>
            </view>
            <view
              v-if="canEdit(item)"
              class="invitation-action invitation-action--danger"
              @click="handleDelete(item)"
            >
              <text class="invitation-action__icon">🗑</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <schedule-bottom-bar
      :buttons="bottomButtons"
      :is-tab-bar-page="false"
      :show-group-member="false"
      @member-change="handleGroupChange"
      @button-click="handleBottomButtonClick"
    />

    <!-- 创建 / 编辑邀请函 -->
    <BottomSheet
      :visible="showForm"
      :title="form.id ? '编辑邀请函' : '新建邀请函'"
      accent="primary"
      confirm-text="保存"
      :confirm-disabled="saving"
      @close="closeForm"
      @confirm="handleSave"
    >
      <view class="template-section">
        <text class="template-section__title">卡片样式</text>
        <scroll-view scroll-x class="template-row" :show-scrollbar="false">
          <view
            v-for="style in cardStyles"
            :key="style.id"
            class="template-chip"
            :class="{ 'template-chip--active': form.cardStyle === style.id }"
            @click="applyStyle(style.id)"
          >
            <text class="template-chip__icon">{{ style.icon }}</text>
            <text class="template-chip__label">{{ style.label }}</text>
          </view>
        </scroll-view>
      </view>

      <view class="preview-trigger" @click="openPreview">
        <text class="preview-trigger__text">👀 预览邀请函卡片</text>
      </view>

      <view class="field">
        <text class="field__label">活动标题</text>
        <input
          class="field__input"
          :value="form.title"
          placeholder="如：小宝5岁生日派对"
          maxlength="40"
          @input="(e) => (form.title = e.detail.value)"
        />
      </view>
      <view class="field">
        <text class="field__label">活动时间</text>
        <DatePicker
          v-model="form.eventTime"
          mode="datetime"
          placeholder="请选择活动时间"
          title="选择活动时间"
        />
      </view>
      <view class="field">
        <text class="field__label">活动地址</text>
        <input
          class="field__input"
          :value="form.address"
          placeholder="如：上海市浦东新区XX路XX号XX餐厅"
          maxlength="120"
          @input="(e) => (form.address = e.detail.value)"
        />
      </view>
      <view class="field">
        <text class="field__label">邀请正文</text>
        <textarea
          class="field__textarea"
          :value="form.body"
          placeholder="向受邀人介绍活动安排、注意事项等"
          maxlength="500"
          auto-height
          @input="(e) => (form.body = e.detail.value)"
        />
      </view>

    </BottomSheet>

    <!-- 预览效果（与受邀人看到的卡片一致） -->
    <BottomSheet
      :visible="showPreview"
      title="邀请函预览"
      :show-footer="false"
      @close="closePreview"
    >
      <InvitationCard
        :content="{
          title: form.title,
          eventTime: form.eventTime,
          address: form.address,
          body: form.body,
          recipientName: '某某',
        }"
        :styleId="form.cardStyle"
      />
    </BottomSheet>

    <!-- 发起邀请（输入受邀人 → 微信分享） -->
    <BottomSheet
      :visible="showShare"
      title="发起邀请"
      accent="primary"
      :show-footer="false"
      @close="closeShare"
    >
      <view v-if="activeItem" class="share-card">
        <view class="share-card-title">{{ activeItem.title }}</view>
        <view class="share-card-meta">
          <text class="meta-line">🕘 {{ activeItem.eventTime }}</text>
          <text class="meta-line">📍 {{ activeItem.address }}</text>
        </view>
      </view>
      <view class="field">
        <text class="field__label">受邀人称呼</text>
        <input
          class="field__input"
          :value="recipientName"
          placeholder="如：张阿姨一家"
          maxlength="40"
          @input="(e) => (recipientName = e.detail.value)"
        />
      </view>
      <view class="share-actions">
        <button class="ghost-btn" @click="closeShare">取消</button>
        <button
          class="primary-btn block"
          open-type="share"
          :disabled="!recipientName.trim()"
        >
          发送
        </button>
      </view>
    </BottomSheet>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onShareAppMessage } from '@dcloudio/uni-app'
import apiTs from '../../../utils/apiTs'
import { getStoredData, STORAGE_KEYS } from '../../../utils/storageManager'
import BottomSheet from '../../../components/fun-components/bottom-sheet.vue'
import DatePicker from '../../../components/fun-components/date-picker.vue'
import scheduleBottomBar from '../../../components/schedule-bottom-bar.vue'
import InvitationCard from '../components/InvitationCard.vue'
import { CARD_STYLES, DEFAULT_STYLE_ID, resolveCardStyle } from '../utils/cardStyles'
import type {
  InvitationTemplate,
  InvitationShareContent
} from '../types/invitation'

const list = ref<InvitationTemplate[]>([])
const loading = ref(false)
const currentGroup = ref<{ id?: number | string; groupName?: string }>({})
const currentUserId = (getStoredData<{ id?: number }>(STORAGE_KEYS.USER_INFO) || {}).id

const showForm = ref(false)
const saving = ref(false)
const form = ref<InvitationTemplate>({
  title: '',
  eventTime: '',
  address: '',
  body: '',
  cardStyle: DEFAULT_STYLE_ID
})

const cardStyles = CARD_STYLES

const showPreview = ref(false)

const showShare = ref(false)
const activeItem = ref<InvitationTemplate | null>(null)
const recipientName = ref('')

const bottomButtons = [{ code: 'create', text: '新建' }]

const truncate = (s: string, n: number) => (s && s.length > n ? s.slice(0, n) + '…' : s)
const canEdit = (item: InvitationTemplate) =>
  !!currentUserId && (item.createdBy === undefined || item.createdBy === currentUserId)

const styleFor = (id?: string) => resolveCardStyle(id)

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

const formatEventTime = (raw?: string) => {
  if (!raw) return '时间待定'
  const [dateStr, timeStr] = raw.split(' ')
  const [y, m, d] = (dateStr || '').split('-').map(Number)
  if (!y || !m || !d) return raw
  const dt = new Date(y, m - 1, d)
  const weekday = WEEKDAYS[dt.getDay()] || ''
  const hhmm = (timeStr || '').slice(0, 5)
  return `${m}月${d}日 ${weekday}${hhmm ? ' · ' + hhmm : ''}`
}

const eventStatus = (raw?: string): { label: string; tone: string } => {
  if (!raw) return { label: '时间待定', tone: 'pending' }
  const safe = raw.replace(/-/g, '/')
  const eventDate = new Date(safe)
  if (isNaN(eventDate.getTime())) return { label: '时间待定', tone: 'pending' }

  const now = new Date()
  const diffMs = eventDate.getTime() - now.getTime()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfEvent = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate())
  const diffDay = Math.round((startOfEvent.getTime() - startOfToday.getTime()) / (24 * 3600 * 1000))

  if (diffMs < 0) return { label: '已结束', tone: 'past' }
  if (diffDay === 0) return { label: '就在今天', tone: 'today' }
  if (diffDay === 1) return { label: '就在明天', tone: 'soon' }
  if (diffDay <= 7) return { label: `还有 ${diffDay} 天`, tone: 'soon' }
  return { label: `还有 ${diffDay} 天`, tone: 'upcoming' }
}

const fetchList = async () => {
  if (!currentGroup.value.id) {
    list.value = []
    return
  }
  loading.value = true
  try {
    const resp = await apiTs.invitation.list(currentGroup.value.id as number)
    list.value = (resp as InvitationTemplate[]) || []
  } catch (err) {
    console.error('加载邀请函列表失败:', err)
    list.value = []
  } finally {
    loading.value = false
  }
}

const handleGroupChange = (e: any) => {
  currentGroup.value = e.currentGroup || {}
  fetchList()
}

const handleBottomButtonClick = (code: string) => {
  if (code === 'create') openCreate()
}

const openCreate = () => {
  if (!currentGroup.value.id) {
    uni.showToast({ title: '请先选择群组', icon: 'none' })
    return
  }
  form.value = {
    title: '',
    eventTime: '',
    address: '',
    body: '',
    cardStyle: DEFAULT_STYLE_ID
  }
  showForm.value = true
}

const openEdit = (item: InvitationTemplate) => {
  form.value = {
    id: item.id,
    title: item.title || '',
    eventTime: item.eventTime || '',
    address: item.address || '',
    body: item.body || '',
    cardStyle: item.cardStyle || DEFAULT_STYLE_ID
  }
  showForm.value = true
}

const closeForm = () => {
  showForm.value = false
}

const applyStyle = (styleId: string) => {
  form.value.cardStyle = styleId
}

const openPreview = () => {
  showPreview.value = true
}

const closePreview = () => {
  showPreview.value = false
}

const handleSave = async () => {
  if (saving.value) return
  if (!currentGroup.value.id) return uni.showToast({ title: '请先选择群组', icon: 'none' })
  if (!form.value.title.trim()) return uni.showToast({ title: '请填写活动标题', icon: 'none' })
  if (!form.value.eventTime) return uni.showToast({ title: '请选择活动时间', icon: 'none' })
  if (!form.value.address.trim()) return uni.showToast({ title: '请填写活动地址', icon: 'none' })
  if (!form.value.body.trim()) return uni.showToast({ title: '请填写邀请正文', icon: 'none' })

  try {
    saving.value = true
    await apiTs.invitation.save({
      id: form.value.id,
      groupId: currentGroup.value.id,
      title: form.value.title.trim(),
      eventTime: form.value.eventTime,
      address: form.value.address.trim(),
      body: form.value.body.trim(),
      cardStyle: form.value.cardStyle || DEFAULT_STYLE_ID
    })
    showForm.value = false
    await fetchList()
  } catch (err) {
    console.error('保存邀请函失败:', err)
  } finally {
    saving.value = false
  }
}

const handleDelete = (item: InvitationTemplate) => {
  if (!item.id) return
  uni.showModal({
    title: '删除邀请函',
    content: '确认删除这张邀请函吗？',
    success: async (res) => {
      if (!res.confirm) return
      try {
        await apiTs.invitation.delete(item.id as number)
        await fetchList()
        uni.showToast({ title: '已删除', icon: 'success' })
      } catch (err) {
        console.error('删除邀请函失败:', err)
      }
    }
  })
}

const openShare = (item: InvitationTemplate) => {
  activeItem.value = item
  recipientName.value = ''
  showShare.value = true
}

const closeShare = () => {
  showShare.value = false
}

// #ifdef MP-WEIXIN
onShareAppMessage(() => {
  const item = activeItem.value
  const name = recipientName.value.trim()
  if (!item || !name) {
    return { title: '邀请函', path: '/pages/tabBar/more' }
  }

  const payload: InvitationShareContent = {
    title: item.title,
    eventTime: item.eventTime,
    address: item.address,
    body: item.body,
    recipientName: name,
    cardStyle: item.cardStyle || DEFAULT_STYLE_ID
  }

  return new Promise(async (resolve) => {
    try {
      const resp: any = await apiTs.share.create({
        sceneCode: 'invitation',
        content: JSON.stringify(payload),
        expireHours: 720
      })
      const token = resp?.token
      if (!token) {
        uni.showToast({ title: '生成分享链接失败', icon: 'none' })
        resolve({ title: '邀请函', path: '/pages/tabBar/more' })
        return
      }
      showShare.value = false
      resolve({
        title: `邀请你参加${item.title}`,
        path: `/subPackages/invitation/pages/preview?token=${token}`
      })
    } catch (err) {
      console.error('生成分享 token 失败:', err)
      resolve({ title: '邀请函', path: '/pages/tabBar/more' })
    }
  })
})
// #endif
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: linear-gradient(180deg, #f5f3ff 0%, #f0f2f5 200rpx);
  padding: 24rpx 24rpx 200rpx;
  box-sizing: border-box;
}

.primary-btn {
  font-size: 26rpx;
  color: #ffffff;
  background: linear-gradient(135deg, #4f46e5, #6366f1);
  border: none;
  border-radius: 999rpx;
  padding: 0 28rpx;
  height: 64rpx;
  line-height: 64rpx;
  margin: 0;
}

.primary-btn[disabled] {
  background: #cbd5e1;
  color: #ffffff;
}

.primary-btn.block {
  flex: 1;
  height: 80rpx;
  line-height: 80rpx;
  border-radius: 14rpx;
}

.ghost-btn {
  flex: 1;
  font-size: 26rpx;
  color: #475569;
  background: #f1f5f9;
  border: none;
  border-radius: 14rpx;
  height: 80rpx;
  line-height: 80rpx;
  margin: 0;
}

.empty {
  margin-top: 200rpx;
  text-align: center;
  padding: 0 60rpx;
}

.empty-illustration {
  width: 180rpx;
  height: 180rpx;
  margin: 0 auto 28rpx;
  background: linear-gradient(135deg, #ede9fe, #fce7f3);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 24rpx rgba(124, 58, 237, 0.15);
}

.empty-illustration__icon {
  font-size: 80rpx;
}

.empty-title {
  display: block;
  font-size: 32rpx;
  font-weight: 600;
  color: #1d2129;
  margin-bottom: 12rpx;
}

.empty-hint {
  display: block;
  font-size: 24rpx;
  color: #94a3b8;
  line-height: 1.6;
}

.card-list {
  display: flex;
  flex-direction: column;
  gap: 28rpx;
}

.invitation-item {
  background-color: #ffffff;
  border-radius: 22rpx;
  overflow: hidden;
  box-shadow: 0 6rpx 24rpx rgba(15, 23, 42, 0.06);
}

.invitation-item__accent {
  height: 8rpx;
}

.invitation-item__body {
  padding: 28rpx 28rpx 20rpx;
}

.invitation-item__head {
  display: flex;
  align-items: flex-start;
  gap: 20rpx;
  margin-bottom: 20rpx;
}

.invitation-item__avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 18rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.invitation-item__avatar-icon {
  font-size: 40rpx;
}

.invitation-item__title-block {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10rpx;
  min-width: 0;
}

.invitation-item__title {
  font-size: 32rpx;
  font-weight: 600;
  color: #0f172a;
  line-height: 1.35;
}

.invitation-item__status {
  align-self: flex-start;
  font-size: 22rpx;
  padding: 4rpx 14rpx;
  border-radius: 999rpx;
  background: #f1f5f9;
  color: #475569;
}

.invitation-item__status.status--today {
  background: #fef3c7;
  color: #92400e;
}

.invitation-item__status.status--soon {
  background: #dbeafe;
  color: #1d4ed8;
}

.invitation-item__status.status--upcoming {
  background: #ede9fe;
  color: #5b21b6;
}

.invitation-item__status.status--past {
  background: #f1f5f9;
  color: #94a3b8;
}

.invitation-item__status.status--pending {
  background: #f8fafc;
  color: #94a3b8;
}

.invitation-item__meta {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
  margin-bottom: 16rpx;
}

.invitation-item__meta-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.invitation-item__meta-icon {
  font-size: 24rpx;
  width: 32rpx;
}

.invitation-item__meta-text {
  font-size: 26rpx;
  color: #475569;
  flex: 1;
  line-height: 1.5;
}

.invitation-item__excerpt {
  font-size: 24rpx;
  color: #64748b;
  line-height: 1.65;
  padding: 14rpx 18rpx;
  background: #f8fafc;
  border-left: 4rpx solid #e2e8f0;
  border-radius: 4rpx 12rpx 12rpx 4rpx;
  margin-bottom: 22rpx;
}

.invitation-item__actions {
  display: flex;
  justify-content: flex-end;
  gap: 12rpx;
  border-top: 1rpx solid #f1f5f9;
  padding-top: 18rpx;
}

.invitation-action {
  display: inline-flex;
  align-items: center;
  gap: 6rpx;
  padding: 10rpx 22rpx;
  border-radius: 999rpx;
  font-size: 24rpx;
}

.invitation-action__icon {
  font-size: 22rpx;
}

.invitation-action__label {
  font-size: 24rpx;
}

.invitation-action--ghost {
  background: #f1f5f9;
  color: #475569;
}

.invitation-action--primary {
  background: linear-gradient(135deg, #4f46e5, #6366f1);
  color: #ffffff;
  box-shadow: 0 4rpx 12rpx rgba(79, 70, 229, 0.25);
}

.invitation-action--danger {
  background: #fef2f2;
  color: #dc2626;
  padding: 10rpx 16rpx;
}

.template-section {
  margin-bottom: 24rpx;
}

.template-section__title {
  display: block;
  font-size: 22rpx;
  color: #475569;
  margin-bottom: 12rpx;
}

.template-row {
  white-space: nowrap;
}

.template-chip {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  padding: 12rpx 20rpx;
  margin-right: 12rpx;
  background: #f8fafc;
  border: 2rpx solid #e2e8f0;
  border-radius: 999rpx;
}

.template-chip--active {
  background: #eef2ff;
  border-color: #6366f1;
}

.template-chip__icon {
  font-size: 26rpx;
}

.template-chip__label {
  font-size: 24rpx;
  color: #1d2129;
}

.preview-trigger {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  box-sizing: border-box;
  margin: 0 0 24rpx;
  padding: 18rpx 0;
  background: #eef2ff;
  border: 2rpx dashed #6366f1;
  border-radius: 14rpx;
}

.preview-trigger__text {
  font-size: 26rpx;
  font-weight: 500;
  color: #4338ca;
}

.share-card {
  background: #f8fafc;
  border-radius: 14rpx;
  padding: 20rpx;
  margin-bottom: 16rpx;
}

.share-card-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #1d2129;
  margin-bottom: 8rpx;
}

.share-card-meta {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.share-actions {
  display: flex;
  gap: 14rpx;
  margin-top: 24rpx;
}
</style>
