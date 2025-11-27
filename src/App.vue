<script>
import { autoLogin } from './utils/auth'
export default {
  onLaunch: function () {
    console.log('App Launch')
    this.initializeApp()
  },
  onShow: function () {
    console.log('App Show')
  },
  onHide: function () {
    console.log('App Hide')
  },
		methods: {
			async initializeApp() {
				try {
					// 自动登录（静默获取 code + 换 token）
					await autoLogin()
					console.log('✅ 自动登录成功')
				} catch (error) {
					console.warn('Auto login failed, will retry on demand:', error)
					// 可选：如果某些页面需要登录，可在进入时再次触发
				}
			}
    }

}
</script>

<style>
/*每个页面公共css */
</style>
