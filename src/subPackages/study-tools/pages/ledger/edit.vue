<template>
  <view class="page-container">
    <view class="form-container">
      <!-- 金额输入 -->
      <view class="input-group">
        <text class="input-label">金额</text>
        <view class="amount-input-container">
          <text class="currency-symbol">¥</text>
          <input
              type="digit"
              class="amount-input"
              placeholder="0.00"
              v-model="formData.amount"
              @input="onAmountInput"
              :focus="true"
          />
        </view>
      </view>

      <!-- 类型选择 -->
      <view class="input-group">
        <text class="input-label">类型</text>
        <view class="type-selector">
          <view
              class="type-option"
              :class="{ 'selected': formData.transactionType === 'INCOME' }"
              @click="setFlowType('INCOME')"
          >
            <text class="type-text">收入</text>
          </view>
          <view
              class="type-option"
              :class="{ 'selected': formData.transactionType === 'EXPENSE' }"
              @click="setFlowType('EXPENSE')"
          >
            <text class="type-text">支出</text>
          </view>
        </view>
      </view>

      <!-- 摘要输入 -->
      <view class="input-group">
        <text class="input-label">摘要</text>
        <input
            class="summary-input"
            placeholder="请输入摘要 (选填)"
            v-model="formData.summary"
        />
      </view>
    </view>
    <!-- 底部栏 -->
    <schedule-bottom-bar
        :buttons="buttons"
        :is-tab-bar-page="false"
        @member-change="handleMemberChange"
        @buttonClick="handleButtonClick"/>

  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import apiTs from '../../../../utils/apiTs'; // 假设 apiTs 在 utils 目录下
import {getStoredData, setStoredData, STORAGE_KEYS} from "../../../../utils/storageManager";
import ScheduleBottomBar from "../../../../components/schedule-bottom-bar.vue"; // 用于触发刷新

// 响应式数据
const formData = ref({
  amount: '', // 用户输入的金额字符串 (元为单位)
  flowType: 'CASH', // 固定为 CASH
  transactionType: 'INCOME', // 初始化类型
  summary: '', // 摘要
  time: '',
  groupId: '', // 从参数获取
  userId: '' // 从参数获取
});

const parentPage = ref('/subPackages/study-tools/pages/ledger/index')

const currentMember = ref({})
const currentGroup = ref({})

// 修改按钮文字和功能
const buttons = ref([
  { code: 'save', text: '保存' }
])

const handleButtonClick = (buttonCode) => {
  switch (buttonCode) {
    case 'save':
      saveTransaction(); // 调用保存方法
      break;
  }
}

const isSaving = ref(false);

// 从页面参数获取 groupId 和 userId
onLoad((option) => {
  currentMember.value = getStoredData(STORAGE_KEYS.CURRENT_MEMBER);
  // option.flowType 可能是 'INCOME' 或 'EXPENSE'，用于初始化
  const initialType = option.flowType === 'INCOME' ? 'INCOME' : 'EXPENSE'; // 默认为 INCOME
  formData.value.transactionType = initialType;
  formData.value.groupId = option.groupId;
  formData.value.userId = option.userId;
});

// 计算属性：判断表单是否有效
const isFormValid = computed(() => {
  // 金额必须存在且大于 0 (元)
  const amountNum = parseFloat(formData.value.amount);
  return !isNaN(amountNum) && amountNum > 0 && formData.value.groupId && formData.value.userId;
});

// 方法：处理金额输入
const onAmountInput = (e) => {
  let value = e.detail.value;
  // 限制小数点后两位
  if (value.includes('.')) {
    const parts = value.split('.');
    if (parts[1] && parts[1].length > 2) {
      value = parts[0] + '.' + parts[1].substring(0, 2);
    }
  }
  // 过滤非数字字符（保留数字和小数点）
  value = value.replace(/[^\d.]/g, '');
  // 防止多个小数点
  const dotIndex = value.indexOf('.');
  if (dotIndex !== -1) {
    value = value.substring(0, dotIndex + 1) + value.substring(dotIndex + 1).replace(/\./g, '');
  }

  formData.value.amount = value;
};

// 方法：设置流水类型
const setFlowType = (type) => {
  if (type === 'INCOME' || type === 'EXPENSE') {
    formData.value.transactionType = type;
  }
};

// 方法：保存交易
const saveTransaction = async () => {
  if (!isFormValid.value || isSaving.value) {
    console.log('Form is invalid or saving in progress.');
    return;
  }

  isSaving.value = true;
  try {
    const amountNum = parseFloat(formData.value.amount);
    // 转换为以分为单位的整数
    const amountInCents = Math.round(amountNum * 100);
    // 根据类型调整金额正负 (分)
    const finalAmountInCents = formData.value.transactionType === 'INCOME' ? amountInCents : -amountInCents;

    const req = {
      flow:{
        amount: finalAmountInCents, // 发送给后端的是分
        description: formData.value.summary || '无摘要',
        flowType: formData.value.flowType, // 'CASH'
        // 'INCOME' or 'EXPENSE'
        transactionType: formData.value.transactionType
      },
      groupId: formData.value.groupId,
      targetUserId: formData.value.userId,
    };

    // 调用 API 保存流水
    const response = await apiTs.flow.save(req); // 假设有一个 create 接口

    console.log('Save response:', response);

    setStoredData(STORAGE_KEYS.REFRESH_TAB,parentPage.value)
    // 保存成功后，返回上一页，父页面 onShow 会自动刷新
    await uni.navigateBack();

  } catch (error) {
    console.error('保存流水失败:', error);
    // 提示用户保存失败
    uni.showToast({
      title: '保存失败: ' + (error.message || '未知错误'),
      icon: 'none'
    });
  } finally {
    isSaving.value = false;
  }
};

// 处理成员切换
async function handleMemberChange(e) {
  currentMember.value = e.currentMember;
  currentGroup.value = e.currentGroup;
}

// 如果需要处理时间选择，可以添加此方法
// const onTimeChange = (e) => {
//   formData.value.time = e.detail.value;
// };
</script>

<style scoped>
.page-container {
  padding: 20rpx;
  padding-top: 40rpx; /* 给状态栏留点空间 */
  min-height: 100vh;
  background-color: #f8f8f8;
  display: flex;
  flex-direction: column;
}

.form-container {
  background: #fff;
  border-radius: 16rpx;
  padding: 32rpx;
  margin-bottom: 40rpx;
  flex: 1; /* 占据剩余空间 */
}

.input-group {
  display: flex;
  flex-direction: column;
  margin-bottom: 40rpx;
}

.input-label {
  font-size: 28rpx;
  color: #666;
  margin-bottom: 16rpx;
  font-weight: 500;
}

.amount-input-container {
  display: flex;
  align-items: center;
  border: 1rpx solid #e8e8e8;
  border-radius: 12rpx;
  padding: 0 24rpx;
  background-color: #fafafa;
}

.currency-symbol {
  font-size: 36rpx;
  color: #333;
  font-weight: 600;
  margin-right: 12rpx;
}

.amount-input {
  flex: 1;
  padding: 24rpx 0;
  font-size: 40rpx;
  color: #333;
  text-align: right;
  background-color: transparent;
}

.summary-input {
  padding: 24rpx;
  border: 1rpx solid #e8e8e8;
  border-radius: 12rpx;
  font-size: 28rpx;
  background-color: #fafafa;
  color: #333;
}

.type-selector {
  display: flex;
  border: 1rpx solid #e8e8e8;
  border-radius: 12rpx;
  overflow: hidden; /* 防止圆角边框重叠 */
  background-color: #fafafa;
}

.type-option {
  flex: 1;
  text-align: center;
  padding: 24rpx;
  transition: all 0.3s ease;
}

.type-option.selected {
  background-color: #2196f3;
}

.type-text {
  font-size: 28rpx;
  color: #666;
  font-weight: 500;
}


.type-option.selected .type-text {
  color: #fff;
}
</style>