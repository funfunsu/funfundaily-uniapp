<template>
  <div class="step-viewer">
    <h2>📚 笔顺步骤展示（无动画！）</h2>

    <div class="input-group">
      <input
          v-model="character"
          placeholder="输入汉字（如：田、花、学）"
          @keyup.enter="loadCharacter"
          class="char-input"
      >
      <button @click="loadCharacter" class="load-btn">加载笔顺</button>
    </div>

    <div v-if="character" class="step-container">
      <div class="stroke-preview">
        <svg :width="300" :height="300" class="svg-canvas">
          <!-- 只显示当前步骤的笔画 -->
          <path
              v-for="(stroke, index) in currentStepStroke"
              :key="index"
              :d="stroke.path"
              stroke="#FF6B6B"
              stroke-width="3"
              fill="none"
          />
        </svg>
      </div>

      <div class="step-info">
        <p>当前步骤: <span class="step-num">{{ currentStep + 1 }}</span> / {{ totalSteps }}</p>
        <p>笔画名称: <span class="stroke-name">{{ currentStrokeName }}</span></p>
      </div>

      <div class="step-controls">
        <button
            @click="prevStep"
            :disabled="currentStep === 0"
            class="step-btn"
        >
          ← 上一步
        </button>
        <button
            @click="nextStep"
            :disabled="currentStep === totalSteps - 1"
            class="step-btn"
        >
          下一步 →
        </button>
      </div>

      <div class="tips">
        <p>💡 小提示：输入“春”字会看到“日”字头的笔顺哦！</p>
      </div>
    </div>
  </div>
</template>

<script>
import HanziWriter from 'hanzi-writer';

export default {
  data() {
    return {
      character: '',
      strokeData: [], // 存储所有笔画数据
      currentStep: 0,
      totalSteps: 0
    };
  },
  computed: {
    currentStepStroke() {
      // 只返回当前步骤的笔画
      return this.strokeData.length > this.currentStep
          ? [this.strokeData[this.currentStep]]
          : [];
    },
    currentStrokeName() {
      return this.strokeData.length > this.currentStep
          ? `第${this.currentStep + 1}笔: ${this.strokeData[this.currentStep].name}`
          : '';
    }
  },
  methods: {
    loadCharacter() {
      if (!this.character || this.character.length !== 1) {
        alert('请输入一个汉字哦~');
        return;
      }

      // 重置状态
      this.strokeData = [];
      this.currentStep = 0;

      // 用hanzi-writer获取笔顺数据
      const writer = HanziWriter.create(
          document.createElement('div'), // 临时容器
          this.character,
          { width: 300, height: 300, showStrokeOrder: true }
      );

      // 提取笔顺数据（只取路径和名称）
      this.strokeData = writer.getStrokeOrder().map((stroke, index) => ({
        name: `第${index + 1}笔`,
        path: stroke.path
      }));

      this.totalSteps = this.strokeData.length;
      this.currentStep = 0; // 重置到第一步
    },
    prevStep() {
      if (this.currentStep > 0) this.currentStep--;
    },
    nextStep() {
      if (this.currentStep < this.totalSteps - 1) this.currentStep++;
    }
  }
};
</script>

<style scoped>
.step-viewer {
  max-width: 500px;
  margin: 2rem auto;
  font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;
  text-align: center;
}
.char-input {
  padding: 12px 15px;
  font-size: 18px;
  border: 2px solid #4CAF50;
  border-radius: 8px;
  width: 220px;
  margin-right: 10px;
}
.load-btn {
  background: #4CAF50;
  color: white;
  border: none;
  padding: 12px 25px;
  border-radius: 8px;
  font-size: 18px;
  cursor: pointer;
  transition: all 0.3s;
}
.load-btn:hover {
  background: #43A047;
}
.stroke-preview {
  margin: 1.5rem 0;
}
.svg-canvas {
  background: #f9f9f9;
  border: 1px solid #eee;
  border-radius: 8px;
}
.step-info {
  background: #e8f5e9;
  padding: 12px;
  border-radius: 8px;
  margin: 1rem 0;
  font-size: 1.1rem;
}
.step-num {
  color: #FF6B6B;
  font-weight: bold;
}
.stroke-name {
  color: #2E7D32;
}
.step-controls {
  display: flex;
  justify-content: center;
  gap: 15px;
  margin-top: 1rem;
}
.step-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s;
}
.step-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}
.step-btn:not(:disabled) {
  background: #4CAF50;
  color: white;
}
.step-btn:not(:disabled):hover {
  background: #388E3C;
}
.tips {
  color: #757575;
  font-style: italic;
  margin-top: 1.5rem;
}
</style>