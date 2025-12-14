<!-- components/ShareCard.vue -->
<template>
  <view class="container">
    <!-- 卡片式内容区域 -->
    <view class="card">
      <!-- 加载指示器 (如果需要) -->
      <!-- <view v-if="isLoadingFields">加载中...</view> -->

      <!-- 动态表单 -->
      <view v-if="!isLoadingFields" class="form-container">
        <view v-for="(field, index) in fields" :key="index" class="form-item">
          <label :for="`field-${index}`" class="form-label">{{ field.label }}</label>

          <!-- 文本输入框 -->
          <input
              v-if="field.type === 'text'"
              :id="`field-${index}`"
              v-model="formData[field.key]"
              class="form-input"
              :type="field.inputType || 'text'"
              :placeholder="field.placeholder || ''"
          />

          <!-- 下拉选择框 -->
          <picker
              v-else-if="field.type === 'select'"
              mode="selector"
              :range="field.options || []"
              :range-key="field.optionLabelKey || 'label'"
              :value="getPickerIndex(field)"
              @change="(e) => handleSelectChange(field, e)"
              class="form-select"
          >
            <view class="form-select-display">
              {{ getSelectedOptionLabel(field) || field.placeholder || '请选择' }}
            </view>
          </picker>

          <!-- 可以在这里添加更多类型的输入 -->
          <!-- <textarea v-else-if="field.type === 'textarea'" ... ></textarea> -->

          <!-- 未知字段类型提示 -->
          <view v-else class="unknown-field">
            [未知字段类型: {{ field.type }}]
          </view>
        </view>
      </view>

      <!-- 操作按钮 -->
      <view class="form-section">
        <button class="submit-button cancel-button" @click="$emit('cancel')">
          取消
        </button>
        <button class="submit-button share-button" open-type="share" @click="handleShareClick">
          分享
        </button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { reactive, watch } from 'vue';

// --- Props 定义 (使用标准 JS 对象) ---
const props = defineProps({
  /**
   * 表单字段配置数组
   * 示例:
   * [
   *   { key: 'title', label: '标题', type: 'text', placeholder: '请输入标题' },
   *   { key: 'category', label: '分类', type: 'select', options: [{ label: '选项1', value: 'opt1' }, { label: '选项2', value: 'opt2' }] }
   * ]
   */
  fields: {
    type: Array,
    required: true,
    default: () => []
  },
  /**
   * 初始表单数据 (可选)
   * 示例:
   * { title: '默认标题', category: 'opt1' }
   */
  initialData: {
    type: Object,
    default: () => ({})
  },
  /**
   * 是否正在加载字段配置 (可选)
   */
  isLoadingFields: {
    type: Boolean,
    default: false
  }
});

// --- Emits 定义 (使用标准 JS 数组) ---
const emit = defineEmits([
  'cancel',           // 点击取消按钮时触发
  'share',            // 点击分享按钮时触发，传递当前表单数据
  'update:data'       // 表单数据发生变化时触发 (可选)
]);

// --- 响应式状态 ---
const formData = reactive({ ...props.initialData });

// --- Watchers ---
// 监听 props.fields 和 props.initialData 的变化，更新 formData
watch(
    [() => props.fields, () => props.initialData],
    ([newFields, newInitialData]) => {
      // 清空旧数据
      Object.keys(formData).forEach(key => delete formData[key]);
      // 赋新值
      Object.assign(formData, newInitialData || {});
    },
    { deep: true, immediate: true }
);

// --- Methods ---
/**
 * 处理选择器(picker)的 change 事件
 */
const handleSelectChange = (field, event) => {
  const selectedIndex = event.detail.value;
  const selectedOption = field.options[selectedIndex];

  // 根据配置决定存入 value 还是整个对象，或者对象的某个属性
  if (selectedOption && typeof selectedOption === 'object' && field.optionValueKey) {
    formData[field.key] = selectedOption[field.optionValueKey];
  } else {
    formData[field.key] = selectedOption; // 简单数组或未指定 valueKey
  }
  // 触发 update:data 事件 (可选)
  emit('update:data', { ...formData });
};

/**
 * 获取选择器(picker)当前选中项的索引
 */
const getPickerIndex = (field) => {
  const currentValue = formData[field.key];
  if (currentValue === undefined || currentValue === null) return -1;

  // 在 options 中查找匹配项
  const valueKey = field.optionValueKey || 'value';
  return field.options.findIndex(option => {
    if (typeof option === 'object') {
      return option[valueKey] === currentValue;
    } else {
      return option === currentValue; // 简单数组比较
    }
  });
};

/**
 * 获取选择器(picker)当前选中项的显示 Label
 */
const getSelectedOptionLabel = (field) => {
  const currentIndex = getPickerIndex(field);
  if (currentIndex === -1) return '';

  const selectedOption = field.options[currentIndex];
  if (typeof selectedOption === 'object' && field.optionLabelKey) {
    return selectedOption[field.optionLabelKey];
  } else {
    return String(selectedOption); // 转为字符串显示
  }
};

/**
 * 处理分享按钮点击事件
 */
const handleShareClick = () => {
  // 可以在此处添加表单验证逻辑
  // const isValid = validateForm();
  // if (!isValid) {
  //   uni.showToast({ title: '请检查输入', icon: 'none' });
  //   return;
  // }

  // 触发 share 事件，传递当前 formData 的副本
  emit('share', { ...formData });
};

// --- (可选) 表单验证函数 ---
// function validateForm() {
//   for (const field of props.fields) {
//     if (field.required && (!formData[field.key] || formData[field.key].toString().trim() === '')) {
//       uni.showToast({ title: `${field.label} 不能为空`, icon: 'none' });
//       return false;
//     }
//   }
//   return true;
// }
</script>

<style scoped>
/* --- 容器与卡片样式 --- */
.container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  background-color: #f0f2f5;
  padding: 20px;
  box-sizing: border-box;
}

.card {
  width: 100%;
  max-width: 400px;
  background-color: #ffffff;
  border-radius: 12px;
  box-shadow:
      0 6px 16px 0 rgba(0, 0, 0, 0.08),
      0 3px 6px -4px rgba(0, 0, 0, 0.12),
      0 9px 28px 8px rgba(0, 0, 0, 0.05);
  overflow: hidden;
  padding: 30px 25px;
  box-sizing: border-box;
  text-align: left;
}

/* --- 表单容器 --- */
.form-container {
  margin-bottom: 20px;
}

/* --- 表单项 --- */
.form-item {
  margin-bottom: 20px;
}

.form-label {
  display: block;
  margin-bottom: 5px;
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.form-input {
  width: 100%;
  padding: 10px 12px;
  font-size: 16px;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-sizing: border-box;
}

.form-input:focus {
  outline: none;
  border-color: #007aff;
  box-shadow: 0 0 0 2px rgba(0, 122, 255, 0.2);
}

/* --- 选择器样式 --- */
.form-select {
  width: 100%;
}

.form-select-display {
  width: 100%;
  padding: 10px 12px;
  font-size: 16px;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-sizing: border-box;
  background-color: #fff;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e");
  background-position: right 12px center;
  background-repeat: no-repeat;
  background-size: 16px;
  appearance: none;
  cursor: pointer;
}

.form-select-display:active {
  border-color: #007aff;
}

.unknown-field {
  color: #999;
  font-style: italic;
}

/* --- 操作按钮区域 --- */
.form-section {
  display: flex;
  justify-content: space-between;
  gap: 15px;
}

/* --- 按钮基础样式 --- */
.submit-button {
  flex: 1;
  font-size: 16px;
  font-weight: 500;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.645, 0.045, 0.355, 1);
  box-shadow: 0 2px 0 rgba(0, 0, 0, 0.045);
  opacity: 1;
  transform: scale(1);
}

.submit-button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
  opacity: 0.8;
  transform: scale(1);
}

/* --- 取消按钮样式 --- */
.cancel-button {
  color: #333;
  background-color: #f0f0f0;
  border: 1px solid #d9d9d9;
}

.cancel-button:not(:disabled):hover {
  background-color: #e0e0e0;
}

.cancel-button:not(:disabled):active {
  background-color: #d0d0d0;
  transform: translateY(1px) scale(0.98);
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.045);
}

/* --- 分享按钮样式 --- */
.share-button {
  color: #ffffff;
  background-color: #007aff;
}

.share-button:not(:disabled):hover {
  background-color: #3399ff;
}

.share-button:not(:disabled):active {
  background-color: #006ae6;
  transform: translateY(1px) scale(0.98);
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.045);
}
</style>