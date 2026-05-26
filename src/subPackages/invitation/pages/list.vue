<template>
  <view class="page">

    <view v-if="!currentGroup.id" class="empty">
      <view class="empty-illustration">
        <text class="empty-illustration__icon">👥</text>
      </view>
      <text class="empty-title">先选择一个群组</text>
      <text class="empty-hint">在底部群组选择器中切换，查看该群组的邀请函</text>
    </view>

    <view v-else>
      <!-- Tab 切换：默认看「我创建的」，收到的需二次点击 -->
      <view class="seg">
        <view
          class="seg__item"
          :class="{ 'seg__item--active': activeTab === 'sent' }"
          @click="activeTab = 'sent'"
        >
          <text class="seg__label">我创建的</text>
          <text v-if="sentList.length" class="seg__count">{{ sentList.length }}</text>
        </view>
        <view
          class="seg__item"
          :class="{ 'seg__item--active': activeTab === 'received' }"
          @click="activeTab = 'received'"
        >
          <text class="seg__label">我收到的</text>
          <text v-if="receivedList.length" class="seg__count">{{ receivedList.length }}</text>
          <view v-if="hasReceivedUpdates" class="seg__dot" />
        </view>
      </view>

      <!-- 我创建的（发出的邀请） -->
      <view v-show="activeTab === 'sent'">
        <view v-if="sentList.length === 0" class="tab-empty">
          <text class="tab-empty__icon">📨</text>
          <text class="tab-empty__title">还没有创建邀请函</text>
          <text class="tab-empty__hint">点击底部「新建」，几分钟做一张精致的邀请函</text>
        </view>
        <view v-else class="card-list">
          <view
            v-for="item in sentList"
            :key="'s-' + item.id"
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
                    :class="'status--' + eventStatus(item.startTime).tone"
                  >
                    {{ eventStatus(item.startTime).label }}
                  </text>
                </view>
              </view>

              <view class="invitation-item__meta">
                <view class="invitation-item__meta-row">
                  <text class="invitation-item__meta-icon">📅</text>
                  <text class="invitation-item__meta-text">
                    {{ formatEventRange(item.startTime, item.endTime) }}
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
                  class="invitation-action invitation-action--danger"
                  @click="handleDelete(item)"
                >
                  <text class="invitation-action__icon">🗑</text>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 我收到的（收下的邀请） -->
      <view v-show="activeTab === 'received'">
        <view v-if="receivedList.length === 0" class="tab-empty">
          <text class="tab-empty__icon">📭</text>
          <text class="tab-empty__title">还没有收到邀请函</text>
          <text class="tab-empty__hint">收到好友分享并「收下」邀请函后，会出现在这里</text>
        </view>
        <view v-else class="card-list">
          <view
            v-for="item in receivedList"
            :key="'r-' + item.id"
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
                    :class="'status--' + eventStatus(item.startTime).tone"
                  >
                    {{ eventStatus(item.startTime).label }}
                  </text>
                </view>
              </view>

              <view class="invitation-item__meta">
                <view class="invitation-item__meta-row">
                  <text class="invitation-item__meta-icon">📅</text>
                  <text class="invitation-item__meta-text">
                    {{ formatEventRange(item.startTime, item.endTime) }}
                  </text>
                </view>
                <view class="invitation-item__meta-row">
                  <text class="invitation-item__meta-icon">📍</text>
                  <text class="invitation-item__meta-text">
                    {{ item.address || '地址待定' }}
                  </text>
                </view>
              </view>

              <!-- 原邀请函时间/地点变更后的提示 -->
              <view v-if="latestChange(item)" class="invitation-item__changed">
                <text class="invitation-item__changed-icon">🔔</text>
                <text class="invitation-item__changed-text">{{ latestChange(item) }}</text>
              </view>

              <view v-if="item.body" class="invitation-item__excerpt">
                {{ truncate(item.body, 70) }}
              </view>

              <view class="invitation-item__actions">
                <view
                  class="invitation-action invitation-action--ghost"
                  @click="openReceived(item)"
                >
                  <text class="invitation-action__icon">👀</text>
                  <text class="invitation-action__label">查看</text>
                </view>
              </view>
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
        <text class="field__label">开始时间</text>
        <DatePicker
          v-model="form.startTime"
          mode="datetime"
          placeholder="请选择开始时间"
          title="选择开始时间"
          @confirm="onStartConfirm"
        />
      </view>
      <view class="field">
        <text class="field__label">结束时间</text>
        <DatePicker
          v-model="form.endTime"
          mode="datetime"
          placeholder="请选择结束时间"
          title="选择结束时间"
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
      <view class="field">
        <text class="field__label">落款人</text>
        <input
          class="field__input"
          :value="form.signature"
          :placeholder="currentUserNickname || '如：小明 / 小明一家'"
          maxlength="20"
          @input="(e) => (form.signature = e.detail.value)"
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
          eventTime: formatCardTime(form.startTime, form.endTime),
          address: form.address,
          body: form.body,
          recipientName: '某某',
          creatorNickname: form.signature || currentUserNickname,
        }"
        :styleId="form.cardStyle"
      />
    </BottomSheet>

    <!-- 查看收到的邀请函 -->
    <BottomSheet
      :visible="showReceived"
      title="邀请函"
      :show-footer="false"
      @close="closeReceived"
    >
      <view v-if="receivedItem" class="received-view">
        <InvitationCard
          :content="{
            title: receivedItem.title,
            eventTime: formatCardTime(receivedItem.startTime, receivedItem.endTime),
            address: receivedItem.address,
            body: receivedItem.body,
            recipientName: receivedItem.recipientName || '我',
            creatorNickname: receivedItem.signature || '',
          }"
          :styleId="receivedItem.cardStyle"
          :allow-copy-address="true"
        />
        <view v-if="receivedItem.changes && receivedItem.changes.length" class="change-log">
          <text class="change-log__title">变更记录</text>
          <view
            v-for="(c, idx) in receivedItem.changes"
            :key="idx"
            class="change-log__item"
          >
            <text class="change-log__time">{{ formatChangeTime(c.changeTime) }}</text>
            <text class="change-log__summary">{{ c.summary }}</text>
          </view>
        </view>
      </view>
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
          <text class="meta-line">🕘 {{ formatEventRange(activeItem.startTime, activeItem.endTime) }}</text>
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

    <!-- #ifdef MP-WEIXIN -->
    <!-- 离屏画布：生成「信封」分享缩略图 -->
    <canvas
      canvas-id="envelopeCanvas"
      class="envelope-canvas"
      :style="`width:${ENV_W}px;height:${ENV_H}px;`"
    ></canvas>
    <!-- #endif -->
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad, onShareAppMessage } from '@dcloudio/uni-app'
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
const currentUserNickname =
  (getStoredData<{ nickname?: string }>(STORAGE_KEYS.USER_INFO) || {}).nickname || ''

// 我发出的 / 我收到的
const sentList = computed(() => list.value.filter((i) => i.direction !== 'received'))
const receivedList = computed(() => list.value.filter((i) => i.direction === 'received'))

// 默认停在「我创建的」，收到的需二次点击切换
const activeTab = ref<'sent' | 'received'>('sent')
// 收到的邀请有变更时，在「我收到的」tab 上点一个红点提示
const hasReceivedUpdates = computed(() =>
  receivedList.value.some((i) => (i.changes?.length ?? 0) > 0)
)

const showForm = ref(false)
const saving = ref(false)
const form = ref<InvitationTemplate>({
  title: '',
  startTime: '',
  endTime: '',
  address: '',
  body: '',
  cardStyle: DEFAULT_STYLE_ID,
  signature: currentUserNickname
})

const cardStyles = CARD_STYLES

const showPreview = ref(false)

const showReceived = ref(false)
const receivedItem = ref<InvitationTemplate | null>(null)

const showShare = ref(false)
const activeItem = ref<InvitationTemplate | null>(null)
const recipientName = ref('')

const bottomButtons = [{ code: 'create', text: '新建' }]

// 信封缩略图画布尺寸（5:4，离屏绘制后导出为分享卡片图）
const ENV_W = 250
const ENV_H = 200

// onLoad 收到 ?autoCreate=1 时记下意图，待 scheduleBottomBar 把群组解析出来后再弹表单。
let pendingAutoCreate = false
onLoad((query: any) => {
  if (query?.autoCreate === '1' || query?.autoCreate === 1) {
    pendingAutoCreate = true
  }
})

const clampName = (name: string) => {
  const s = (name || '').trim()
  return s.length > 8 ? s.slice(0, 8) + '…' : s
}

const roundRect = (
  ctx: any,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) => {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.arc(x + w - r, y + r, r, -Math.PI / 2, 0)
  ctx.lineTo(x + w, y + h - r)
  ctx.arc(x + w - r, y + h - r, r, 0, Math.PI / 2)
  ctx.lineTo(x + r, y + h)
  ctx.arc(x + r, y + h - r, r, Math.PI / 2, Math.PI)
  ctx.lineTo(x, y + r)
  ctx.arc(x + r, y + r, r, Math.PI, Math.PI * 1.5)
  ctx.closePath()
}

// 用离屏 canvas 画一个精美信封，把受邀人名字写在上面，导出临时图片作为分享缩略图。
const drawEnvelope = (name: string): Promise<string> =>
  new Promise((resolve, reject) => {
    const ctx: any = uni.createCanvasContext('envelopeCanvas')

    // 背景：柔和渐变
    const bg = ctx.createLinearGradient(0, 0, 0, ENV_H)
    bg.addColorStop(0, '#efeafe')
    bg.addColorStop(1, '#fdeef4')
    ctx.setFillStyle(bg)
    ctx.fillRect(0, 0, ENV_W, ENV_H)

    const ex = 34
    const ey = 40
    const ew = ENV_W - ex * 2
    const eh = ENV_H - 78
    const cx = ex + ew / 2

    // 信封主体（米色圆角）
    roundRect(ctx, ex, ey, ew, eh, 10)
    const body = ctx.createLinearGradient(0, ey, 0, ey + eh)
    body.addColorStop(0, '#fffdf8')
    body.addColorStop(1, '#fbf3e6')
    ctx.setFillStyle(body)
    ctx.fill()

    // 信封盖（顶部向下三角）
    const apexY = ey + eh * 0.52
    ctx.beginPath()
    ctx.moveTo(ex, ey + 10)
    ctx.lineTo(cx, apexY)
    ctx.lineTo(ex + ew, ey + 10)
    ctx.closePath()
    const flap = ctx.createLinearGradient(0, ey, 0, apexY)
    flap.addColorStop(0, '#fef6e9')
    flap.addColorStop(1, '#f1dfc0')
    ctx.setFillStyle(flap)
    ctx.fill()
    ctx.setStrokeStyle('#d9b779')
    ctx.setLineWidth(1.2)
    ctx.stroke()

    // 蜡封圆章
    ctx.beginPath()
    ctx.arc(cx, apexY, 15, 0, Math.PI * 2)
    const seal = ctx.createLinearGradient(cx - 15, apexY - 15, cx + 15, apexY + 15)
    seal.addColorStop(0, '#e06a8b')
    seal.addColorStop(1, '#c2185b')
    ctx.setFillStyle(seal)
    ctx.fill()
    ctx.setStrokeStyle('#fff0f5')
    ctx.setLineWidth(1.2)
    ctx.stroke()
    ctx.setFillStyle('#ffffff')
    ctx.setFontSize(15)
    ctx.setTextAlign('center')
    ctx.setTextBaseline('middle')
    ctx.fillText('请', cx, apexY + 1)

    // 受邀人「xxx」亲启
    ctx.setFillStyle('#7a5b3a')
    ctx.setFontSize(17)
    ctx.setTextAlign('center')
    ctx.setTextBaseline('middle')
    ctx.fillText(`「${clampName(name)}」亲启`, cx, ey + eh - 24)

    // 落款
    ctx.setFillStyle('rgba(124,58,237,0.55)')
    ctx.setFontSize(10)
    ctx.setTextBaseline('middle')
    ctx.fillText('· 一封寄给你的邀请 ·', cx, ENV_H - 14)

    ctx.draw(false, () => {
      setTimeout(() => {
        uni.canvasToTempFilePath({
          canvasId: 'envelopeCanvas',
          x: 0,
          y: 0,
          width: ENV_W,
          height: ENV_H,
          destWidth: ENV_W * 2,
          destHeight: ENV_H * 2,
          success: (res) => resolve(res.tempFilePath),
          fail: (err) => reject(err)
        })
      }, 60)
    })
  })

const truncate = (s: string, n: number) => (s && s.length > n ? s.slice(0, n) + '…' : s)

const styleFor = (id?: string) => resolveCardStyle(id)

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

// 解析 "yyyy-MM-dd HH:mm" → 各部件
const parseParts = (raw?: string) => {
  if (!raw) return null
  const [dateStr, timeStr] = raw.split(' ')
  const [y, m, d] = (dateStr || '').split('-').map(Number)
  if (!y || !m || !d) return null
  const hhmm = (timeStr || '').slice(0, 5)
  const dt = new Date(y, m - 1, d)
  return { y, m, d, hhmm, weekday: WEEKDAYS[dt.getDay()] || '' }
}

// 列表里展示的起止时间：同一天只显示一次日期
const formatEventRange = (start?: string, end?: string) => {
  const s = parseParts(start)
  if (!s) return '时间待定'
  const head = `${s.m}月${s.d}日 ${s.weekday}${s.hhmm ? ' · ' + s.hhmm : ''}`
  const e = parseParts(end)
  if (!e) return head
  if (e.y === s.y && e.m === s.m && e.d === s.d) {
    return e.hhmm ? `${head} ~ ${e.hhmm}` : head
  }
  return `${head} ~ ${e.m}月${e.d}日${e.hhmm ? ' ' + e.hhmm : ''}`
}

// 卡片正文里的「时间：」展示字符串
const formatCardTime = (start?: string, end?: string) => formatEventRange(start, end)

const formatChangeTime = (raw?: string) => {
  if (!raw) return ''
  const safe = raw.replace('T', ' ').slice(0, 16)
  return safe
}

// 收到记录最近一条变更摘要
const latestChange = (item: InvitationTemplate): string => {
  const changes = item.changes
  if (!changes || !changes.length) return ''
  return changes[changes.length - 1].summary || '活动信息已更新'
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
  // 受邀人从「我也要制作邀请函」跳转过来时，群组解析完毕即自动弹出创建表单。
  if (pendingAutoCreate && currentGroup.value.id) {
    pendingAutoCreate = false
    openCreate()
  }
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
    startTime: '',
    endTime: '',
    address: '',
    body: '',
    cardStyle: DEFAULT_STYLE_ID,
    signature: currentUserNickname
  }
  showForm.value = true
}

const openEdit = (item: InvitationTemplate) => {
  form.value = {
    id: item.id,
    title: item.title || '',
    startTime: item.startTime || '',
    endTime: item.endTime || '',
    address: item.address || '',
    body: item.body || '',
    cardStyle: item.cardStyle || DEFAULT_STYLE_ID,
    signature: item.signature || currentUserNickname
  }
  showForm.value = true
}

// 选完开始时间后，若结束时间为空，自动 +2 小时作为默认结束时间，减少操作。
const onStartConfirm = (val: string) => {
  if (!val || form.value.endTime) return
  const p = parseParts(val)
  if (!p) return
  const [hh, mm] = p.hhmm.split(':').map(Number)
  const dt = new Date(p.y, p.m - 1, p.d, hh || 0, mm || 0)
  dt.setHours(dt.getHours() + 2)
  const pad = (n: number) => String(n).padStart(2, '0')
  form.value.endTime = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())} ${pad(dt.getHours())}:${pad(dt.getMinutes())}`
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

const openReceived = (item: InvitationTemplate) => {
  receivedItem.value = item
  showReceived.value = true
}

const closeReceived = () => {
  showReceived.value = false
}

const handleSave = async () => {
  if (saving.value) return
  if (!currentGroup.value.id) return uni.showToast({ title: '请先选择群组', icon: 'none' })
  if (!form.value.title.trim()) return uni.showToast({ title: '请填写活动标题', icon: 'none' })
  if (!form.value.startTime) return uni.showToast({ title: '请选择开始时间', icon: 'none' })
  if (!form.value.endTime) return uni.showToast({ title: '请选择结束时间', icon: 'none' })
  if (form.value.endTime < form.value.startTime) {
    return uni.showToast({ title: '结束时间不能早于开始时间', icon: 'none' })
  }
  if (!form.value.address.trim()) return uni.showToast({ title: '请填写活动地址', icon: 'none' })
  if (!form.value.body.trim()) return uni.showToast({ title: '请填写邀请正文', icon: 'none' })

  try {
    saving.value = true
    await apiTs.invitation.save({
      id: form.value.id,
      groupId: currentGroup.value.id,
      title: form.value.title.trim(),
      startTime: form.value.startTime,
      endTime: form.value.endTime,
      address: form.value.address.trim(),
      body: form.value.body.trim(),
      cardStyle: form.value.cardStyle || DEFAULT_STYLE_ID,
      signature: (form.value.signature || '').trim()
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
    invitationId: item.id,
    title: item.title,
    startTime: item.startTime,
    endTime: item.endTime,
    address: item.address,
    body: item.body,
    recipientName: name,
    cardStyle: item.cardStyle || DEFAULT_STYLE_ID,
    signature: item.signature || currentUserNickname
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
      let imageUrl = ''
      try {
        imageUrl = await drawEnvelope(name)
      } catch (drawErr) {
        console.error('生成信封缩略图失败:', drawErr)
      }
      showShare.value = false
      resolve({
        title: `${item.title}`,
        path: `/subPackages/invitation/pages/preview?token=${token}`,
        imageUrl
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

.seg {
  display: flex;
  background: #eef2ff;
  border-radius: 999rpx;
  padding: 6rpx;
  margin-bottom: 28rpx;
}

.seg__item {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  height: 64rpx;
  border-radius: 999rpx;
}

.seg__item--active {
  background: #ffffff;
  box-shadow: 0 4rpx 12rpx rgba(79, 70, 229, 0.12);
}

.seg__label {
  font-size: 26rpx;
  color: #64748b;
}

.seg__item--active .seg__label {
  color: #4338ca;
  font-weight: 600;
}

.seg__count {
  font-size: 20rpx;
  line-height: 1.6;
  color: #94a3b8;
  background: #f1f5f9;
  border-radius: 999rpx;
  padding: 0 10rpx;
}

.seg__item--active .seg__count {
  color: #4338ca;
  background: #eef2ff;
}

.seg__dot {
  position: absolute;
  top: 8rpx;
  right: 28rpx;
  width: 14rpx;
  height: 14rpx;
  border-radius: 50%;
  background: #ef4444;
}

.tab-empty {
  text-align: center;
  padding: 120rpx 40rpx;
}

.tab-empty__icon {
  display: block;
  font-size: 72rpx;
  margin-bottom: 20rpx;
}

.tab-empty__title {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: #1d2129;
  margin-bottom: 10rpx;
}

.tab-empty__hint {
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

.invitation-item__changed {
  display: flex;
  align-items: flex-start;
  gap: 8rpx;
  padding: 12rpx 16rpx;
  margin-bottom: 16rpx;
  background: #fff7ed;
  border-radius: 12rpx;
}

.invitation-item__changed-icon {
  font-size: 22rpx;
}

.invitation-item__changed-text {
  flex: 1;
  font-size: 22rpx;
  color: #b45309;
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

.received-view {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.change-log {
  background: #f8fafc;
  border-radius: 14rpx;
  padding: 20rpx;
}

.change-log__title {
  display: block;
  font-size: 24rpx;
  font-weight: 600;
  color: #475569;
  margin-bottom: 12rpx;
}

.change-log__item {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  padding: 10rpx 0;
  border-top: 1rpx solid #eef2f7;
}

.change-log__time {
  font-size: 22rpx;
  color: #94a3b8;
}

.change-log__summary {
  font-size: 24rpx;
  color: #334155;
  line-height: 1.5;
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

/* 离屏画布：仅用于生成分享缩略图，移出可视区域 */
.envelope-canvas {
  position: fixed;
  left: -9999px;
  top: -9999px;
}

/* mp-weixin 下 BottomSheet 的 slot 内容由本页渲染，只匹配本页 wxss，
   所以输入框/文本域的边框样式必须在这里声明，不能依赖 BottomSheet 自身的 :deep。 */
.field {
  display: flex;
  flex-direction: column;
  margin-bottom: 16rpx;
}

.field__label {
  display: block;
  margin-bottom: 8rpx;
  color: #475569;
  font-size: 22rpx;
}

.field__input {
  width: 100%;
  min-height: 80rpx;
  padding: 16rpx 20rpx;
  box-sizing: border-box;
  border: 1rpx solid #e2e8f0;
  border-radius: 14rpx;
  background: #f8fafc;
  color: #0f172a;
  font-size: 26rpx;
}

.field__textarea {
  width: 100%;
  min-height: 140rpx;
  padding: 16rpx 20rpx;
  box-sizing: border-box;
  border: 1rpx solid #e2e8f0;
  border-radius: 14rpx;
  background: #f8fafc;
  color: #0f172a;
  font-size: 26rpx;
}
</style>
