<script>
import { autoLogin } from './utils/auth'
import { setupFinancialPlanRouteGuard } from './utils/financialPlanRouteGuard'
export default {
  onLaunch: function () {
    console.log('App Launch')
    setupFinancialPlanRouteGuard()
    // this.initializeApp()
  },
  onShow: function () {
    console.log('App Show')
  },
  onHide: function () {
    console.log('App Hide')
  },
		methods: {
    }

}
</script>

<style>
/* =========================================================================
 * 全局主题 tokens（CSS 自定义属性）
 *
 * 想换主题色？改下方变量定义即可，所有用 var(--xxx) 的页面会一起跟随。
 * 用法：
 *   .my-button { background: var(--color-primary); color: #FFF; }
 *   .my-card   { background: var(--gradient-soft-card); }
 *
 * ※ uniapp 兼容：同时挂在 :root 和 page 选择器，覆盖 H5 与小程序运行时。
 * ========================================================================= */
:root,
page {
  /* —— 品牌色 —— */
  --color-primary: #007AFF;          /* 主色：按钮、强调文字、积分数字 */
  --color-primary-strong: #2196F3;   /* 主色暗端：用于渐变收尾 */

  /* —— 文字色 —— */
  --color-text-primary: #1D2129;
  --color-text-secondary: #86909C;
  --color-text-on-primary: #FFFFFF;
  --color-text-disabled: #86909C;

  /* —— 背景色 —— */
  --color-bg-page: #F5F5F5;
  --color-bg-card: #FFFFFF;
  --color-bg-disabled: #E5E6EB;

  /* —— 边框/分割 —— */
  --color-border-soft: #F5F8FF;
  --color-border-divider: #EEE;

  /* —— 渐变 —— */
  /* 主色渐变：积分卡、Hero 区块 */
  --gradient-primary: linear-gradient(135deg, #007AFF 0%, #2196F3 100%);
  /* 浅蓝横向条：页面顶部 strip / 信息条 */
  --gradient-soft-strip: linear-gradient(90deg, #F8FBFF 0%, #F0F7FF 100%);
  /* 浅蓝商品/媒体卡：列表卡片图片占位区 */
  --gradient-soft-media: linear-gradient(135deg, #F8FBFF 0%, #DDEBFF 100%);

  /* —— 阴影 —— */
  --shadow-card: 0 2rpx 12rpx rgba(0, 0, 0, 0.06);
  --shadow-pill: 0 2rpx 6rpx rgba(0, 0, 0, 0.06);
  --shadow-primary-elevated: 0 8rpx 24rpx rgba(0, 122, 255, 0.18);

  /* —— 圆角 —— */
  --radius-card: 16rpx;
  --radius-block: 20rpx;
  --radius-pill: 999rpx;
}

/* =========================================================================
 * 全局表单字段样式（.field / .field__label / .field__input / .field__textarea）
 *
 * 小程序原生 <input>/<textarea> 默认没有边框和背景，必须显式设置。
 * 以前各页面在自己的 scoped 样式里各写一份，漏写就出现「输入框没边框」。
 * 这里统一成全局非 scoped 样式（app.wxss 全局生效），任何页面只要用
 * .field__input / .field__textarea 类名即可获得一致外观；页面如需个性化
 * 仍可用自己的 scoped 样式覆盖（scoped 选择器特异性更高）。
 * ========================================================================= */
.field {
  display: flex;
  flex-direction: column;
  margin-bottom: 16rpx;
}
.field__label {
  display: block;
  margin-bottom: 8rpx;
  color: #475569;
  font-size: 22rpx;
}
.field__input {
  width: 100%;
  min-height: 80rpx;
  padding: 16rpx 20rpx;
  box-sizing: border-box;
  border: 1rpx solid #e2e8f0;
  border-radius: 14rpx;
  background: #f8fafc;
  color: #0f172a;
  font-size: 26rpx;
}
.field__textarea {
  width: 100%;
  min-height: 140rpx;
  padding: 16rpx 20rpx;
  box-sizing: border-box;
  border: 1rpx solid #e2e8f0;
  border-radius: 14rpx;
  background: #f8fafc;
  color: #0f172a;
  font-size: 26rpx;
}
</style>
