<template>
  <view class="manage-page">
    <!-- Hero：标题 + 价值引导 + 一键添加常见奖励，整合为单张卡片，减少顶部割裂 -->
    <view class="hero">
      <view class="hero__top">
        <view class="hero__heading">
          <text class="hero__desc">和孩子约定好的奖励，完成任务攒下积分就能兑现</text>
        </view>
        <view class="hero__link" @click="goExchange">
          <text class="hero__link-text">看兑换页</text>
          <text class="hero__link-arrow">›</text>
        </view>
      </view>

      <view class="hero__presets" v-if="!isLoading && currentGroup.id && availablePresets.length > 0">
        <view class="hero__chips">
          <view
            class="preset-chip"
            v-for="preset in availablePresets"
            :key="preset.name"
            @click="addFromPreset(preset)"
          >
            <text class="preset-chip__emoji">{{ preset.emoji }}</text>
            <text class="preset-chip__name">{{ preset.name }}</text>
            <text class="preset-chip__points">{{ preset.points }}分</text>
            <text class="preset-chip__plus">＋</text>
          </view>
        </view>
      </view>
    </view>

    <view class="section-title" v-if="!isLoading && products.length > 0">
      <text class="section-title__main">商品列表</text>
      <text class="section-title__count">共 {{ products.length }} 件</text>
    </view>

    <!-- 加载中 -->
    <view class="loading" v-if="isLoading"></view>

    <!-- 商品网格 -->
    <view class="products" v-else-if="products.length > 0">
      <view class="product-card" v-for="(item, index) in products" :key="item.id" @click="clickProduct(index, item)">
        <view class="product-card__media">
          <text class="product-card__points">{{ item.points }} 积分</text>
        </view>
        <view class="product-card__body">
          <text class="product-card__name">{{ item.name }}</text>
          <text class="product-card__desc">{{ item.description || ' ' }}</text>
        </view>
      </view>
    </view>

    <!-- 空态：把「没有商品」变成一次价值引导 -->
    <view class="empty" v-else>
      <text class="empty__icon">🎁</text>
      <template v-if="currentGroup.id">
        <text class="empty__text">还没有约定的奖励</text>
        <text class="empty__desc">添加孩子心心念念的奖励——一次出游、一本绘本、30 分钟动画片，让 TA 的每一份努力都有盼头。</text>
        <button class="empty__action" @click="addProduct">添加第一个奖励</button>
      </template>
      <template v-else>
        <text class="empty__text">请先在底部选择小队</text>
      </template>
    </view>
  </view>
  <schedule-bottom-bar :buttons="buttons"
                       :is-tab-bar-page="false"
                       :show-group-member="false"
                       @member-change="handleMemberChange"
                       @buttonClick="handleButtonClick" />
</template>

<script setup>
import {computed, onMounted, ref} from 'vue';
import {getStoredData, removeStoredData, setStoredData, STORAGE_KEYS} from "../../../utils/storageManager";
import apiTs from '../../../utils/apiTs';
import ScheduleBottomBar from "../../../components/schedule-bottom-bar.vue";
import {onShow} from "@dcloudio/uni-app"; // 假设 apiTs 在 utils 目录下

// 加载状态
const isLoading = ref(true);
const currentGroup = ref({});

const currentPage = ref('/subPackages/points/pages/points-product-manage')





// 修改按钮文字和功能
const buttons = ref([
  { code: 'addProduct', text: '添加' }
])


const handleButtonClick = (buttonCode) => {
  switch (buttonCode) {
    case 'addProduct':
      addProduct(); // 调用保存方法
      break;
  }
}


// 处理成员切换
function handleMemberChange(e) {
  currentGroup.value = e.currentGroup;
  console.log( '当前群组:', currentGroup.value);
  fetchProducts()
}

const addProduct = () => {
  uni.navigateTo({
    url: `/subPackages/points/pages/points-product-edit`
  });
}

// 跳到孩子的积分兑换页，让家长直观看到配置后的效果
const goExchange = () => {
  uni.navigateTo({
    url: `/subPackages/points/pages/points-exchange`
  });
}

// 常见奖励模板：让家长第一次配置时不必从零想，点一下即可加入
const PRESET_REWARDS = [
  { emoji: '📺', name: '看30分钟动画片', points: 30, description: '完成约定后，可以看 30 分钟喜欢的动画片' },
  { emoji: '💰', name: '10元零花钱', points: 50, description: '兑换 10 元零花钱，自己决定怎么花' },
  ];

// 过滤掉名称已存在的模板，避免重复添加
const availablePresets = computed(() =>
  PRESET_REWARDS.filter(preset => !products.value.some(item => item.name === preset.name))
);

// 一键从模板创建奖励，创建后刷新列表，家长可再点卡片微调
const addFromPreset = async (preset) => {
  if (!currentGroup.value.id) {
    uni.showToast({ title: '请先选择小队', icon: 'none' });
    return;
  }
  try {
    await apiTs.pointExchange.createProduct({
      groupId: currentGroup.value.id,
      name: preset.name,
      description: preset.description,
      requiredScore: preset.points
    });
    uni.showToast({ title: '已添加', icon: 'success' });
    await fetchProducts();
  } catch (error) {
    console.error('快速添加奖励失败:', error);
    uni.showToast({ title: '添加失败，请重试', icon: 'none' });
  }
}

// 假设这里有一个API用于获取商品数据
const fetchProducts = async () => {
  if (!currentGroup.value.id) {
    isLoading.value = false;
    products.value = [];
    return;
  }
  try {
    isLoading.value = true;
    // request 拦截器已拆出 data，res 直接就是商品数组
    const res = await apiTs.pointExchange.listProducts({ groupId: currentGroup.value.id });
    if (Array.isArray(res)) {
      products.value = res.map(item => ({
        id: item.id,
        name: item.name,
        description: item.description,
        points: item.requiredScore, // 映射 requiredScore 为 points
        status: item.status
      }));
      setStoredData(STORAGE_KEYS.POINT_PRODUCT_LIST, products.value);
    } else {
      products.value = [];
    }
  } catch (error) {
    console.error('获取商品数据失败:', error);
    products.value = [];
    uni.showToast({
      title: '获取商品列表失败',
      icon: 'none'
    });
  } finally {
    isLoading.value = false;
  }
};

// 商品列表数据
const products = ref([]);

onMounted(async () => {
  await fetchProducts();
});

// 跳转到商品详情页
const clickProduct = (index,item) => {
  uni.navigateTo({
    url: `/subPackages/points/pages/points-product-edit?index=${index}`
  });
};


onShow(() => {
  const refreshUri = getStoredData(STORAGE_KEYS.REFRESH_TAB)
  if (!refreshUri) {
    return
  }
  if (refreshUri === currentPage.value) {
    fetchProducts()
    removeStoredData(STORAGE_KEYS.REFRESH_TAB)
  }
});

</script>

<style scoped>
/* 主题 tokens 定义见 App.vue */
.manage-page {
  padding: 24rpx;
  padding-bottom: 160rpx;
  background-color: var(--color-bg-page);
  min-height: 100vh;
}

/* Hero：单张卡片承载标题 / 引导 / 快速添加，避免顶部多卡片堆叠 */
.hero {
  background-color: var(--color-bg-card);
  border-radius: var(--radius-block);
  box-shadow: var(--shadow-card);
  padding: 28rpx 28rpx 24rpx;
  margin-bottom: 24rpx;
}

.hero__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.hero__heading {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  min-width: 0;
}

.hero__title {
  font-size: 34rpx;
  font-weight: 600;
  color: var(--color-text-primary);
}

.hero__group {
  font-size: 22rpx;
  color: var(--color-text-secondary);
}

.hero__link {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  padding: 6rpx 0 6rpx 16rpx;
}

.hero__link-text {
  font-size: 24rpx;
  font-weight: 500;
  color: var(--color-primary);
}

.hero__link-arrow {
  font-size: 28rpx;
  color: var(--color-primary);
  margin-left: 4rpx;
  line-height: 1;
}

.hero__desc {
  display: block;
  margin-top: 12rpx;
  font-size: 24rpx;
  line-height: 1.6;
  color: var(--color-text-secondary);
}

/* 快速添加区：以分割线与上方引导区分，仍属同一张卡片 */
.hero__presets {
  margin-top: 22rpx;
  padding-top: 22rpx;
  border-top: 1rpx solid var(--color-border-divider);
}

.hero__presets-label {
  display: block;
  font-size: 22rpx;
  color: var(--color-text-secondary);
  margin-bottom: 16rpx;
}

.hero__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.preset-chip {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  background: var(--gradient-soft-strip);
  border: 1rpx solid var(--color-border-soft);
  border-radius: var(--radius-pill);
  padding: 14rpx 20rpx;
}

.preset-chip:active {
  opacity: 0.7;
}

.preset-chip__emoji {
  font-size: 28rpx;
  line-height: 1;
}

.preset-chip__name {
  font-size: 24rpx;
  color: var(--color-text-primary);
}

.preset-chip__points {
  font-size: 22rpx;
  font-weight: 600;
  color: var(--color-primary);
}

.preset-chip__plus {
  font-size: 26rpx;
  color: var(--color-primary);
  line-height: 1;
  margin-left: 2rpx;
}

/* 分区标题 */
.section-title {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin: 8rpx 4rpx 16rpx;
}

.section-title__main {
  font-size: 32rpx;
  font-weight: 600;
  color: var(--color-text-primary);
}

.section-title__count {
  font-size: 22rpx;
  color: var(--color-text-secondary);
}

.loading {
  padding: 100rpx 0;
  text-align: center;
}

/* 商品网格 */
.products {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
}

.product-card {
  width: calc(50% - 10rpx);
  background-color: var(--color-bg-card);
  border-radius: var(--radius-card);
  overflow: hidden;
  box-shadow: var(--shadow-card);
  display: flex;
  flex-direction: column;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.product-card:active {
  transform: scale(0.98);
  box-shadow: 0 1rpx 8rpx rgba(0, 0, 0, 0.04);
}

.product-card__media {
  position: relative;
  height: 180rpx;
  background: var(--gradient-soft-media);
  display: flex;
  align-items: center;
  justify-content: center;
}

.product-card__points {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--color-primary);
  background-color: var(--color-bg-card);
  border-radius: var(--radius-pill);
  padding: 8rpx 20rpx;
  box-shadow: var(--shadow-pill);
}

.product-card__body {
  padding: 20rpx;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  flex: 1;
}

.product-card__name {
  font-size: 28rpx;
  color: var(--color-text-primary);
  font-weight: 600;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.product-card__desc {
  font-size: 22rpx;
  color: var(--color-text-secondary);
  line-height: 1.4;
  min-height: 56rpx;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 空态 */
.empty {
  text-align: center;
  padding: 120rpx 40rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
}

.empty__icon {
  font-size: 80rpx;
}

.empty__text {
  font-size: 28rpx;
  font-weight: 600;
  color: var(--color-text-primary);
}

.empty__desc {
  font-size: 24rpx;
  line-height: 1.7;
  color: var(--color-text-secondary);
  max-width: 480rpx;
}

.empty__action {
  margin-top: 8rpx;
  background-color: var(--color-primary);
  color: var(--color-text-on-primary);
  border: none;
  border-radius: var(--radius-pill);
  font-size: 26rpx;
  padding: 14rpx 48rpx;
}
</style>