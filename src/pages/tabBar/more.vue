<template>
	<view class="discovery">
		<!-- 分组面板 -->
		<view v-if="groups.length" class="discovery__body">
			<view
				v-for="group in groups"
				:key="group.category"
				class="panel"
			>
				<view class="panel__head">
					<view class="panel__dot" :style="{ background: group.theme.color }"></view>
					<text class="panel__title">{{ group.category }}</text>
					<text class="panel__count">{{ group.items.length }}</text>
				</view>

				<view class="grid">
					<view
						v-for="(item, index) in group.items"
						:key="item.id || `${group.category}-${index}`"
						class="tile"
						:class="{ 'tile--disabled': item.status !== 'active' }"
						:hover-class="item.status === 'active' ? 'tile--hover' : 'none'"
						:hover-stay-time="80"
						@click="handleCardClick(item)"
					>
						<view
							class="tile__icon"
							:style="{ background: group.theme.soft, color: group.theme.color }"
						>
							<text class="tile__icon-text">{{ resolveIcon(item) }}</text>
						</view>
						<text class="tile__title">{{ item.itemTitle }}</text>
						<text v-if="item.status !== 'active'" class="tile__tag">即将开放</text>
					</view>
				</view>
			</view>
		</view>

		<!-- 空状态 -->
		<view v-else class="empty">
			<text class="empty__icon">🧭</text>
			<text class="empty__text">暂无可用功能</text>
		</view>
	</view>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import apiTs from '../../utils/apiTs'
import type { DiscoveryItem } from '../../types/discovery'
import { performNavigate } from '../../utils/router'

const discoverList = ref<DiscoveryItem[]>([])

/** 分类主题：仅控制展示色彩，业务条目与分类归属均来自后端。 */
const CATEGORY_THEME: Record<string, { color: string; soft: string }> = {
	积分中心: { color: '#f59e0b', soft: 'rgba(245, 158, 11, 0.12)' },
	家庭财务: { color: '#10b981', soft: 'rgba(16, 185, 129, 0.12)' },
	学习成长: { color: '#3b82f6', soft: 'rgba(59, 130, 246, 0.12)' },
	生活工具: { color: '#8b5cf6', soft: 'rgba(139, 92, 246, 0.12)' },
}
const DEFAULT_THEME = { color: '#6b7280', soft: 'rgba(107, 114, 128, 0.12)' }
/** 分类展示顺序；未列出的分类按首次出现顺序追加在后面。 */
const CATEGORY_ORDER = ['积分中心', '家庭财务', '学习成长', '生活工具']
/** 无分类条目的兜底分组名。 */
const FALLBACK_CATEGORY = '更多功能'

interface DiscoveryGroup {
	category: string
	theme: { color: string; soft: string }
	items: DiscoveryItem[]
}

/** 按 category 把后端条目分组，并按既定顺序排列分组。 */
const groups = computed<DiscoveryGroup[]>(() => {
	const bucket = new Map<string, DiscoveryItem[]>()
	for (const item of discoverList.value) {
		const key = item.category?.trim() || FALLBACK_CATEGORY
		if (!bucket.has(key)) {
			bucket.set(key, [])
		}
		bucket.get(key)!.push(item)
	}

	const ordered: string[] = []
	for (const category of CATEGORY_ORDER) {
		if (bucket.has(category)) {
			ordered.push(category)
		}
	}
	for (const category of bucket.keys()) {
		if (!ordered.includes(category)) {
			ordered.push(category)
		}
	}

	return ordered.map((category) => ({
		category,
		theme: CATEGORY_THEME[category] || DEFAULT_THEME,
		items: bucket.get(category)!,
	}))
})

/** 优先用条目自带 icon，缺省时回退到标题首字。 */
const resolveIcon = (item: DiscoveryItem): string =>
	item.icon?.trim() || item.itemTitle?.trim().charAt(0) || '•'

const fetchDiscoveryList = async () => {
	try {
		const resp: DiscoveryItem[] = await apiTs.discovery.list()
		discoverList.value = resp || []
	} catch (error) {
		console.error('获取发现列表失败:', error)
		discoverList.value = []
	}
}

const handleCardClick = (item: DiscoveryItem) => {
	if (item.status !== 'active') return // 禁用点击

	if (item.itemType === 'path' || item.itemType === 'tab') {
		// performNavigate 内部对 /tabBar/ 用 switchTab、其它页用 navigateTo（压栈，可返回更多页）
		performNavigate(item.uri)
	} else if (item.itemType === 'link') {
		// TODO: 处理外部链接
		uni.showToast({ title: '功能暂未开放', icon: 'none' })
	}
}

onMounted(() => {
	fetchDiscoveryList()
})
</script>

<style scoped>
.discovery {
	min-height: 100vh;
	background: #f5f6f8;
	padding: 20rpx 20rpx 48rpx;
	box-sizing: border-box;
}

.discovery__body {
	display: flex;
	flex-direction: column;
	gap: 20rpx;
}

/* 分类面板 */
.panel {
	background: #ffffff;
	border-radius: 24rpx;
	padding: 24rpx 12rpx 16rpx;
	box-shadow: 0 6rpx 20rpx rgba(17, 24, 39, 0.04);
}

.panel__head {
	display: flex;
	align-items: center;
	padding: 0 12rpx;
	margin-bottom: 12rpx;
}

.panel__dot {
	width: 14rpx;
	height: 14rpx;
	border-radius: 50%;
	margin-right: 12rpx;
}

.panel__title {
	font-size: 28rpx;
	font-weight: 700;
	color: #1f2937;
}

.panel__count {
	margin-left: 10rpx;
	font-size: 22rpx;
	color: #b8bdc6;
}

/* 4 列网格：列距用 tile 内边距撑出，保证 4 等分对齐 */
.grid {
	display: flex;
	flex-wrap: wrap;
}

.tile {
	position: relative;
	width: 25%;
	box-sizing: border-box;
	padding: 14rpx 8rpx;
	display: flex;
	flex-direction: column;
	align-items: center;
	transition: opacity 0.15s ease;
}

.tile--hover {
	opacity: 0.6;
}

.tile__icon {
	width: 84rpx;
	height: 84rpx;
	border-radius: 24rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	margin-bottom: 12rpx;
}

.tile__icon-text {
	font-size: 44rpx;
	line-height: 1;
}

.tile__title {
	width: 100%;
	font-size: 24rpx;
	color: #374151;
	text-align: center;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.tile__tag {
	margin-top: 4rpx;
	font-size: 18rpx;
	color: #b8bdc6;
	line-height: 1.4;
}

/* 禁用态 */
.tile--disabled {
	opacity: 0.45;
}

/* 空状态 */
.empty {
	display: flex;
	flex-direction: column;
	align-items: center;
	padding-top: 200rpx;
}

.empty__icon {
	font-size: 80rpx;
	margin-bottom: 24rpx;
}

.empty__text {
	font-size: 26rpx;
	color: #9ca3af;
}
</style>
