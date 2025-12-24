<template>
  <view class="product-grid">
    <!-- 列表头部 -->
    <view class="header">
      <text class="title">管理可兑换商品</text>
      <text class="subtitle">让生活更有趣味</text>
    </view>

    <!-- 加载中状态 -->
    <view class="loading" v-if="isLoading">
    </view>

    <!-- 商品网格 -->
    <view class="products" v-else-if="products.length > 0">
      <view class="product-card" v-for="(item, index) in products" :key="item.id" @click="clickProduct(index,item)">
        <!-- 商品图片占位 -->
        <view class="product-img">
          <view class="points-tag">
            <text class="points-text">{{ item.points }}</text>
            <text class="points-unit">积分</text>
          </view>
        </view>

        <!-- 商品信息 -->
        <view class="product-info">
          <text class="product-name" :title="item.name">{{ item.name }}</text>
          <text class="product-desc" :title="item.description">{{ item.description }}</text>
        </view>
      </view>
    </view>

    <!-- 数据加载失败或无数据时显示 -->
    <view class="no-data" v-else>
      <text class="no-data-text">暂无可兑换商品</text>
      <button class="refresh-btn" @click="addProduct">添加一个</button>
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
  try {
    isLoading.value = true;
    const req = {
      scene:'point',
      sceneVar:'products',
      groupId: currentGroup.value.id,
    }
    const  data = await apiTs.universal_records.getForGroup(req)
    products.value = data?JSON.parse(data):[];
    setStoredData(STORAGE_KEYS.POINT_PRODUCT_LIST,products.value)
  } catch (error) {
    console.error('获取商品数据失败:', error);
    products.value = [];
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
.product-grid {
  padding: 24rpx;
  background-color: #F5F7FA;
  min-height: 100vh;
}

/* 头部样式 */
.header {
  margin-bottom: 24rpx;
}

.title {
  font-size: 36rpx;
  font-weight: 600;
  color: #1D2129;
  display: block;
  margin-bottom: 8rpx;
}

.subtitle {
  font-size: 24rpx;
  color: #86909C;
  display: block;
}

/* 加载状态 */
.loading {
  padding: 100rpx 0;
  text-align: center;
}

/* 商品网格布局 */
.products {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
}

/* 商品卡片样式 */
.product-card {
  width: calc(50% - 10rpx); /* 改为两列布局，更适合移动端展示 */
  background-color: #FFFFFF;
  border-radius: 16rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.06);
  transition: all 0.3s ease;
}

.product-card:active {
  transform: scale(0.98);
  box-shadow: 0 1rpx 8rpx rgba(0, 0, 0, 0.04);
}

/* 商品图片区域 */
.product-img {
  position: relative;
  width: 100%;
  height: 220rpx;
  overflow: hidden;
}

.img {
  width: 100%;
  height: 100%;
}

/* 积分标签 */
.points-tag {
  position: absolute;
  top: 12rpx;
  right: 12rpx;
  background-color: rgba(255, 80, 0, 0.9);
  border-radius: 20rpx;
  padding: 4rpx 12rpx;
  display: flex;
  align-items: center;
}

.points-text {
  font-size: 20rpx;
  color: #FFFFFF;
  font-weight: 600;
  margin-right: 4rpx;
}

.points-unit {
  font-size: 16rpx;
  color: #FFFFFF;
}

/* 商品信息区域 */
.product-info {
  padding: 16rpx;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.product-name {
  font-size: 28rpx;
  color: #1D2129;
  font-weight: 500;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.product-desc {
  font-size: 22rpx;
  color: #86909C;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  flex: 1;
}

/* 兑换按钮 */
.exchange-btn {
  background-color: #FF5000;
  color: #FFFFFF;
  border: none;
  border-radius: 8rpx;
  font-size: 24rpx;
  padding: 8rpx 0;
  margin-top: 8rpx;
}

/* 无数据样式 */
.no-data {
  text-align: center;
  padding: 100rpx 40rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24rpx;
}

.no-data-img {
  width: 200rpx;
  height: auto;
  opacity: 0.6;
}

.no-data-text {
  font-size: 28rpx;
  color: #86909C;
}

.refresh-btn {
  background-color: #FFFFFF;
  color: #FF5000;
  border: 1px solid #FF5000;
  border-radius: 8rpx;
  font-size: 24rpx;
  padding: 8rpx 32rpx;
}
</style>