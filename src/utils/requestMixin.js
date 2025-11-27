// utils/requestMixin.js
export default {
    data() {
        return {
            // 加载状态管理
            loading: {},
            // 错误信息
            errorMessage: ''
        }
    },
    methods: {
        /**
         * 处理API请求，自动管理加载状态和错误提示
         * @param {Function} apiFunc - API函数
         * @param {Object} params - 请求参数
         * @param {String} key - 加载状态的唯一标识
         * @param {Function} success - 成功回调
         */
        requestHandler(apiFunc, params = {}, key = 'default', success) {
            // 设置加载状态
            this.$set(this.loading, key, true)
            this.errorMessage = ''

            return apiFunc(params)
                .then(res => {
                    if (success) success(res)
                    return res
                })
                .catch(err => {
                    console.error('Request failed:', err)
                    this.errorMessage = err.message || '请求失败，请稍后再试'
                    // 可以在这里统一显示错误提示
                    uni.showToast({
                        title: this.errorMessage,
                        icon: 'none',
                        duration: 2000
                    })
                    return Promise.reject(err)
                })
                .finally(() => {
                    // 清除加载状态
                    this.$set(this.loading, key, false)
                })
        }
    }
}