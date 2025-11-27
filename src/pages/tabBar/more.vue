<template>
	<view class="discovery-container"> {{ discoverList }}
		<view class="grid">
			<view
				v-for="(item, index) in discoverList" 
				:key="index"
				class="grid-item"
				:class="{ 'grid-item--active': item.status === 'active' }"
				@click="handleCardClick(item)"
			>
				<view class="card">{{ item }}
					<text class="card-title">{{ item.itemTitle }}</text>
					<text v-if="item.status !== 'active'" class="card-note">即将开放</text>
				</view>
			</view>
		</view>
	</view>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import apiTs from '../../utils/apiTs'
import type { ApiResponse } from '../../types/type'
import type { DiscoveryItem } from '../../types/discovery'

const discoverList = ref<DiscoveryItem[]>([])

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

	if (item.itemType === 'path') {
		uni.navigateTo({ url: item.uri })
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
.discovery-container {
	padding: 16rpx;
}

.grid {
	display: flex;
	flex-wrap: wrap;
	gap: 20rpx; /* 行 & 列间距 */
}

/* 每个网格项：2列布局 */
.grid-item {
	flex: 0 0 calc(50% - 10rpx); /* 2列，减去 gap 的一半 */
	box-sizing: border-box;
}

.card {
	background: #ffffff;
	border-radius: 16rpx;
	padding: 32rpx 24rpx;
	text-align: center;
	box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.06);
	transition: transform 0.2s, opacity 0.2s;
	height: 100%;
	display: flex;
	flex-direction: column;
	justify-content: center;
	align-items: center;
}

/* Active 状态：可点击 */
.grid-item--active .card {
	border: 2rpx solid #2196f3;
}

.grid-item--active {
	opacity: 1;
}

.grid-item--active:hover .card,
.grid-item--active:active .card {
	transform: translateY(-4rpx);
}

/* 非 active 状态：灰色 + 禁用效果 */
.grid-item:not(.grid-item--active) {
	opacity: 0.7;
	pointer-events: none; /* 禁止点击 */
}

.card-title {
	font-size: 28rpx;
	font-weight: 600;
	color: #333;
	line-height: 1.4;
}

.grid-item--active .card-title {
	color: #2196f3;
}

.card-note {
	font-size: 20rpx;
	color: #999;
	margin-top: 8rpx;
}

/* 小屏适配：iPhone SE 等窄屏 */
@media (max-width: 320px) {
	.grid-item {
		flex: 0 0 calc(50% - 8rpx);
	}
}
</style>