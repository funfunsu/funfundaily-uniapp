<template>
  <view class="manage-page">
    <!-- 头部 -->
    <view class="page-header">
      <text class="page-header__title">管理可兑换商品</text>
      <text class="page-header__subtitle">{{ currentGroup.groupName || '让积分更有意义' }}</text>
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

    <!-- 空态 -->
    <view class="empty" v-else>
      <text class="empty__icon">🎁</text>
      <text class="empty__text">{{ currentGroup.id ? '暂无可兑换商品' : '请先选择群组' }}</text>
      <button v-if="currentGroup.id" class="empty__action" @click="addProduct">添加第一个</button>
    </view>
  </view>
  <schedule-bottom-bar :buttons="buttons"
                       :is-tab-bar-page="false"
                       :show-group-member="false"
                       @member-change="handleMemberChange"
                       @buttonClick="handleButtonClick" />
</template>

<script setup>
import {onMounted, ref} from 'vue';
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

/* 头部条：浅蓝 strip */
.page-header {
  background: var(--gradient-soft-strip);
  border: 1rpx solid var(--color-border-soft);
  border-radius: var(--radius-block);
  padding: 28rpx 32rpx;
  margin-bottom: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.page-header__title {
  font-size: 34rpx;
  font-weight: 600;
  color: var(--color-text-primary);
}

.page-header__subtitle {
  font-size: 22rpx;
  color: var(--color-text-secondary);
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
  font-size: 26rpx;
  color: var(--color-text-secondary);
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