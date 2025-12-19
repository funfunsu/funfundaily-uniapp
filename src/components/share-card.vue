<!-- components/ShareCard.vue -->
<template>
  <!-- Overlay/Mask - 覆盖整个屏幕 -->
  <view class="modal-overlay">
    <!-- Centered Container - 内容容器 -->
    <view class="container">
      <!-- Card - 模态框主体 -->
      <view class="card">
        <!-- Loading Indicator (Optional) -->
        <!-- <view v-if="isLoadingFields">加载中...</view> -->

        <!-- Dynamic Form -->
        <view v-if="!isLoadingFields" class="form-container">

          <!-- 修改了 .form-item 的结构 -->
          <view v-for="(field, index) in fields" :key="index" class="form-item">

            <label :for="`field-${index}`" class="form-label">{{ field.label }}</label>

            <!-- 新增的容器，用于包裹 input/picker 并占据剩余空间 -->
            <view class="form-control">
              <!-- Text Input -->
              <input
                  v-if="field.type === 'text'"
                  :id="`field-${index}`"
                  v-model="formData[field.key]"
                  class="form-input"
                  :type="field.inputType || 'text'"
                  :placeholder="field.placeholder || ''"
              />

              <!-- Picker (Select) -->
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
            </view>
          </view>
        </view>

        <!-- Action Buttons -->
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
  </view>
</template>

<script setup>
import { reactive, watch } from 'vue';

// --- Props Definition ---
const props = defineProps({
  /**
   * Form field configuration array
   * Example:
   * [
   *   { key: 'title', label: 'Title', type: 'text', placeholder: 'Enter title' },
   *   { key: 'category', label: 'Category', type: 'select', options: [{ label: 'Option 1', value: 'opt1' }, { label: 'Option 2', value: 'opt2' }] }
   * ]
   */
  fields: {
    type: Array,
    required: true,
    default: () => []
  },
  /**
   * Initial form data (optional)
   * Example:
   * { title: 'Default Title', category: 'opt1' }
   */
  initialData: {
    type: Object,
    default: () => ({})
  },
  /**
   * Whether field configuration is loading (optional)
   */
  isLoadingFields: {
    type: Boolean,
    default: false
  }
});

// --- Emits Definition ---
const emit = defineEmits([
  'cancel',           // Triggered when Cancel button is clicked
  'share',            // Triggered when Share button is clicked, passing current form data
  'update:data'       // Optional: Triggered when form data changes
]);

// --- Reactive State ---
const formData = reactive({ ...props.initialData });

// --- Watchers ---
// Watch props.fields and props.initialData for changes, update formData accordingly
watch(
    [() => props.fields, () => props.initialData],
    ([newFields, newInitialData]) => {
      // Clear old data
      Object.keys(formData).forEach(key => delete formData[key]);
      // Assign new values
      Object.assign(formData, newInitialData || {});
    },
    { deep: true, immediate: true }
);

// --- Methods ---
/**
 * Handle picker (select) change event
 */
const handleSelectChange = (field, event) => {
  const selectedIndex = event.detail.value;
  const selectedOption = field.options[selectedIndex];

  // Store value based on configuration
  if (selectedOption && typeof selectedOption === 'object' && field.optionValueKey) {
    formData[field.key] = selectedOption[field.optionValueKey];
  } else {
    formData[field.key] = selectedOption; // Simple array or no valueKey specified
  }
  // Emit update:data event (optional)
  emit('update:data', { ...formData });
};

/**
 * Get the current selected index for the picker
 */
const getPickerIndex = (field) => {
  const currentValue = formData[field.key];
  if (currentValue === undefined || currentValue === null) return -1;

  // Find matching item in options
  const valueKey = field.optionValueKey || 'value';
  return field.options.findIndex(option => {
    if (typeof option === 'object') {
      return option[valueKey] === currentValue;
    } else {
      return option === currentValue; // Simple array comparison
    }
  });
};

/**
 * Get the display label for the currently selected picker option
 */
const getSelectedOptionLabel = (field) => {
  const currentIndex = getPickerIndex(field);
  if (currentIndex === -1) return '';

  const selectedOption = field.options[currentIndex];
  if (typeof selectedOption === 'object' && field.optionLabelKey) {
    return selectedOption[field.optionLabelKey];
  } else {
    return String(selectedOption); // Convert to string for display
  }
};

/**
 * Handle Share button click event
 */
const handleShareClick = () => {
  // Optional: Add form validation logic here
  // const isValid = validateForm();
  // if (!isValid) {
  //   uni.showToast({ title: 'Please check your input', icon: 'none' });
  //   return;
  // }

  // Emit share event, passing a copy of current formData
  emit('share', { ...formData });
};

// --- (Optional) Form Validation Function ---
// function validateForm() {
//   for (const field of props.fields) {
//     if (field.required && (!formData[field.key] || formData[field.key].toString().trim() === '')) {
//       uni.showToast({ title: `${field.label} cannot be empty`, icon: 'none' });
//       return false;
//     }
//   }
//   return true;
// }
</script>

<style scoped>
/* --- Modal Overlay / Mask --- */
.modal-overlay {
  position: fixed; /* Use fixed to cover the entire viewport */
  top: 0;
  left: 0;
  width: 100vw; /* Full viewport width */
  height: 100vh; /* Full viewport height */
  background-color: rgba(0, 0, 0, 0.5); /* Semi-transparent black mask */
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000; /* High z-index to overlay other content */
  backdrop-filter: blur(2px); /* Optional: Adds a subtle blur effect to the background */
}

/* --- Centered Container --- */
.container {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  /* Removed width: 100%; as fixed positioning handles width differently */
  /* Removed padding and background-color from here */
  box-sizing: border-box;
}
.card {
  width: 90vw; /* Responsive: Width relative to viewport */
  /* max-height: 190vh; */ /* 190vh 似乎超过视口高度了，可能是笔误？改成 90vh 更合理 */
  max-height: 90vh; /* Prevents card from being taller than viewport */
  background-color: #ffffff;
  border-radius: 16px;
  box-shadow:
      0 10px 25px -5px rgba(0, 0, 0, 0.1),
      0 10px 10px -5px rgba(0, 0, 0, 0.04);
  padding: 30px 25px;
  box-sizing: border-box;
  text-align: left;
  overflow-y: auto; /* Allows scrolling if content exceeds max-height */
}


/* --- Form Container --- */
.form-container {
  margin-bottom: 25px;
}

/* --- MODIFIED: Form Item (Horizontal Layout using Flexbox) --- */
.form-item {
  display: flex; /* 启用 Flexbox */
  flex-direction: row; /* 子元素水平排列 */
  align-items: center; /* 垂直居中对齐 */
  margin-bottom: 18px;
}

.form-label {
  /* flex: 0 0 auto; */ /* 不放大，不缩小，宽度由内容或 max-width 决定 */
  flex-shrink: 0; /* 防止标签被压缩 */
  max-width: 30%; /* 标签最大宽度，可根据需要调整 */
  min-width: 80px; /* 标签最小宽度，保证短标签也有一定宽度 */
  margin-right: 15px; /* 与输入框之间留出间距 */
  font-size: 15px;
  font-weight: 500;
  color: #333;
  text-align: left; /* 确保标签文字左对齐 */
  word-break: keep-all; /* 防止单词内换行 */
  white-space: nowrap; /* 防止标签文字换行 */
  overflow: hidden;
  text-overflow: ellipsis; /* 超出部分省略号 */
  box-sizing: border-box;
}

/* --- MODIFIED: Form Control Container (holds input/select) --- */
.form-control {
  flex: 1; /* 占据剩余的所有空间 */
  min-width: 0; /* 允许内部 input/picker 收缩 */
}

.form-input,
.form-select-display {
  width: 100%; /* 宽度填满 .form-control */
  box-sizing: border-box;
  /* ... 其他 input/select-display 的样式保持不变 ... */
}
/* 确保 input 和 select-display 的样式适应新布局 */
.form-input {
  height: 40px; /* 给输入框一个固定高度 */
  padding: 12px 14px;
  font-size: 16px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.form-input:focus {
  outline: none;
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

.form-select {
  width: 100%;
}

.form-select-display {
  height: 40px; /* 给选择器显示区域一个固定高度 */
  padding: 12px 14px;
  font-size: 16px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  background-color: #fff;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e");
  background-position: right 12px center;
  background-repeat: no-repeat;
  background-size: 16px;
  appearance: none;
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  display: flex; /* 内部内容垂直居中 */
  align-items: center;
}

.form-select-display:active,
.form-select-display:focus {
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

.unknown-field {
  color: #999;
  font-style: italic;
  font-size: 14px;
}
/* --- Action Buttons Section --- */
.form-section {
  display: flex;
  justify-content: space-between;
  gap: 12px; /* Reduced gap slightly */
}

/* --- Button Base Style --- */
.submit-button {
  flex: 1;
  font-size: 16px;
  font-weight: 500;
  height: 40px;
  line-height: 40px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.645, 0.045, 0.355, 1);
  box-shadow: 0 2px 0 rgba(0, 0, 0, 0.02); /* Subtle base shadow */
  opacity: 1;
  transform: scale(1);
}

.submit-button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
  opacity: 0.8;
  transform: scale(1);
}

/* --- Cancel Button Style --- */
.cancel-button {
  color: #333;
  background-color: #f5f5f5; /* Lighter gray */
  border: 1px solid #d9d9d9;
}

.cancel-button:not(:disabled):hover {
  background-color: #e8e8e8;
}

.cancel-button:not(:disabled):active {
  background-color: #dcdcdc;
  transform: translateY(1px) scale(0.98);
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.02);
}

/* --- Share Button Style --- */
.share-button {
  color: #ffffff;
  background-color: #1890ff; /* Ant Design primary blue */
}

.share-button:not(:disabled):hover {
  background-color: #40a9ff;
}

.share-button:not(:disabled):active {
  background-color: #096dd9;
  transform: translateY(1px) scale(0.98);
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.02);
}
</style>