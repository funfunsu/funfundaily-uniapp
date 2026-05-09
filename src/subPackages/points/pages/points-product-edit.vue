<template>
  <view class="add-product-page">
    <!-- 表单容器 -->
    <view class="form-container">
      <!-- 商品名称输入 -->
      <view class="input-group">
        <text class="input-label">商品名称</text>
        <input
            class="input-field"
            placeholder="请输入商品名称"
            v-model="formData.name"
        />
      </view>

      <!-- 所需积分输入 -->
      <view class="input-group">
        <text class="input-label">所需积分</text>
        <input
            type="number"
            class="input-field"
            placeholder="请输入所需积分"
            v-model.number="formData.points"
        />
      </view>

      <!-- 商品描述输入 -->
      <view class="input-group">
        <text class="input-label">商品描述</text>
        <textarea
            class="textarea-field"
            placeholder="请输入商品描述"
            v-model="formData.description"
        ></textarea>
      </view>

      <!-- 提交按钮 -->
    </view>
  </view>
  <schedule-bottom-bar :buttons="buttons"
                       :is-tab-bar-page="false"
                       :show-group-member="false"
                       @member-change="handleMemberChange"
                       @buttonClick="handleButtonClick" />
</template>

<script setup>
import { ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import apiTs from '../../../utils/apiTs'; // 假设 apiTs 在 utils 目录下

import ScheduleBottomBar from "../../../components/schedule-bottom-bar.vue";
import {getStoredData, setStoredData, STORAGE_KEYS} from "../../../utils/storageManager";

const parentPage = ref('/subPackages/points/pages/points-product-manage')

// 响应式表单数据
const formData = ref({
  name: '', // 商品名称
  points: null, // 所需积分
  description: '' // 商品描述
});

const currentGroup = ref({});
const products = ref([]);
let index = -1;

// 修改按钮文字和功能
const buttons = ref([
  { code: 'remove', text: '移除' },
  { code: 'save', text: '保存' }
])

// 处理成员切换
function handleMemberChange(e) {
  currentGroup.value = e.currentGroup;
  console.log('当前群组:', currentGroup.value);
}

const handleButtonClick = (buttonCode) => {
  switch (buttonCode) {
    case 'save':
      saveItem()
      break;
    case 'remove':
      deleteItem();
      break;
  }
}

onLoad((query) => {
  let storedData = getStoredData(STORAGE_KEYS.POINT_PRODUCT_LIST);
  products.value =storedData?storedData:[]

  if (query.index) {
    index = parseInt(query.index); // 确保 index 是数字类型
    formData.value = products.value[index]; // 使用解构赋值避免引用问题
    buttons.value = [
      { code: 'remove', text: '移除' },
      { code: 'save', text: '保存' }
    ];
  }
});

const deleteItem = async () => {
  if (index === -1) {
    uni.showToast({
      title: '请先保存商品',
      icon: 'none'
    });
    return;
  }

  uni.showModal({
    title: '确认删除',
    content: '确定要删除这个商品吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          const productId = products.value[index].id;
          await apiTs.pointExchange.removeProduct(productId, currentGroup.value.id);
          uni.showToast({
            title: '商品删除成功',
            icon: 'success'
          });
          setStoredData(STORAGE_KEYS.REFRESH_TAB, parentPage.value);
          await uni.navigateBack();
        } catch (error) {
          console.error('删除商品失败:', error);
          uni.showToast({
            title: '删除商品失败',
            icon: 'none'
          });
        }
      }
    }
  });
}

const saveItem = async () => {
  await submitForm();
}

// 提交表单
const submitForm = async () => {
  if (!formData.value.name || formData.value.points === null || !formData.value.description) {
    await uni.showToast({
      title: '请填写所有必填项',
      icon: 'none'
    });
    return;
  }

  try {
    const request = {
      groupId: currentGroup.value.id,
      name: formData.value.name,
      description: formData.value.description,
      requiredScore: formData.value.points
    };

    if (index === -1) {
      // 新增商品
      await apiTs.pointExchange.createProduct(request);
      uni.showToast({
        title: '商品创建成功',
        icon: 'success'
      });
    } else {
      // 编辑商品
      const productId = products.value[index].id;
      await apiTs.pointExchange.updateProduct(productId, request);
      uni.showToast({
        title: '商品更新成功',
        icon: 'success'
      });
    }

    setStoredData(STORAGE_KEYS.REFRESH_TAB, parentPage.value);
    await uni.navigateBack();
  } catch (error) {
    console.error('保存商品失败:', error);
    uni.showToast({
      title: '保存商品失败',
      icon: 'none'
    });
  }
};

// 重置表单
const resetForm = () => {
  formData.value.name = '';
  formData.value.points = null;
  formData.value.description = '';
};
</script>

<style scoped>
.add-product-page {
  padding: 20rpx;
}

.form-container {
  background-color: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
  margin-top: 40rpx;
}

.input-group {
  margin-bottom: 30rpx;
}

.input-label {
  font-size: 28rpx;
  color: #333;
  margin-bottom: 16rpx;
}

.input-field,
.textarea-field {
  width: 100%;
  padding: 20rpx;
  border: 1rpx solid #e8e8e8;
  border-radius: 12rpx;
  font-size: 28rpx;
  background-color: #fafafa;
}

.textarea-field {
  height: 200rpx;
  resize: none;
}

.submit-button {
  width: 100%;
  padding: 20rpx;
  background-color: #2196f3;
  color: #fff;
  text-align: center;
  border-radius: 12rpx;
  font-size: 32rpx;
}
</style>