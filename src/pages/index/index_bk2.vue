<template>
  <view class="container">{{hasBasicInfo}}
    <!-- 如果已经获取到用户信息则显示 -->
    <view v-if="hasBasicInfo">
      <text>你好, {{ displayName }}!</text>

      <!-- 头像区域，点击可更换 -->
      <view style="margin-top: 20px;">
        <button open-type="chooseAvatar" @chooseavatar="onChangeAvatar">更换头像</button>
        <image :src="displayAvatar" mode="aspectFill" style="width: 100px; height: 100px; border-radius: 50%;"></image>
        <text style="display: block; text-align: center; margin-top: 5px; font-size: 14px; color: #07c160;">点击更换头像</text>
      </view>

      <!-- 显示昵称（如果可用且不是默认值） -->
      <view v-if="userInfo.nickName && userInfo.nickName !== '微信用户'" style="margin-top: 15px;">
        <text>昵称: {{ userInfo.nickName }}</text>
      </view>

      <!-- 引导用户设置昵称（如果显示的是默认昵称或自定义昵称） -->
      <button v-if="!userInfo.nickName || userInfo.nickName === '微信用户' || customNickname"
              @tap="setCustomNickname"
              style="margin-top: 20px; background-color: #1777ff; color: white;">
        {{ customNickname ? '修改昵称' : '设置昵称' }}
      </button>
      <input class="nickname" type="nickname" :value="userInfo.nickname" @blur="setCustomNickname">昵称</input>

      <!-- 输入昵称的模态框 (简化版，实际项目中可用 u-popup 或 uni-popup) -->
      <view v-if="showNicknameModal" class="modal-overlay" @tap="showNicknameModal = false">
        <view class="modal-content" @tap.stop>
          <input v-model="tempNickname" placeholder="请输入您的昵称" style="border: 1px solid #ccc; padding: 8px; width: 100%;"/>
          <view style="margin-top: 15px; display: flex; justify-content: space-between;">
            <button @tap="confirmNickname" style="flex: 1; margin-right: 10px;">确定</button>
            <button @tap="showNicknameModal = false" style="flex: 1;">取消</button>
          </view>
        </view>
      </view>

    </view>

    <!-- 如果未获取到用户信息，则显示初始登录按钮 -->
    <view v-else>
      <button open-type="getUserProfile" @getuserprofile="onGetUserProfile">获取昵称和头像</button>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      userInfo: {
        nickName: '',
        avatarUrl: ''
      },
      customNickname: '', // 用户自定义的昵称
      tempNickname: '', // 用于模态框输入的临时昵称
      showNicknameModal: false
    }
  },
  computed: {
    hasBasicInfo() {
      // 判断是否至少获取到了基本信息（哪怕昵称是默认的）
      return true;
    },
    displayName() {
      // 决定最终显示的昵称
      if (this.customNickname) {
        return this.customNickname;
      }
      if (this.userInfo.nickName && this.userInfo.nickName !== '微信用户') {
        return this.userInfo.nickName;
      }
      // 如果都是默认或空，则用 openid 或 userId 生成 (此处简化)
      // 实际项目中可以从后端获取 openid 或 userId
      return '用户';
    },
    displayAvatar() {
      // 决定最终显示的头像
      return this.userInfo.avatarUrl; // 设置一个默认头像路径
    }
  },
  methods: {
    onGetUserProfile(e) {
      if (e.detail.errMsg === 'getUserProfile:ok') {
        console.log('uni.getUserProfile 成功:', e.detail);
        this.userInfo = e.detail.userInfo;

        // 可选：将 userInfo 发送到后端保存

      } else {
        console.log('用户拒绝了 getUserProfile 授权:', e.detail.errMsg);
        uni.showToast({ title: '授权失败', icon: 'none' });
      }
    },
    onChangeAvatar(res) {
      debugger
      console.log('chooseAvatar 回调:', res);
      if(res.detail.errMsg === 'chooseAvatar:ok') {
        const tempAvatarUrl = res.detail.avatarUrl;
        // 更新页面显示
        this.userInfo.avatarUrl = tempAvatarUrl;
        // 可选：将新的头像上传到服务器
        // this.uploadAvatar(tempAvatarUrl);
      } else {
        console.log('用户取消选择头像或失败:', res.detail.errMsg);
      }
    },

    // 使用 chooseAvatar 更换头像
    changeAvatar() {
      // 注意：chooseAvatar 通常也需要用户主动触发，放在 button 的 tap 事件里更稳妥
      // 但为了演示，我们直接调用。实践中，最好还是绑定到一个 button 上。
      // 这里模拟直接触发，实际使用时请参考下方注释。

      /*
      // 更规范的方式是这样：
      // <button open-type="chooseAvatar" @chooseavatar="onChangeAvatar">更换头像</button>
      // 然后在这个方法里处理：
      onChangeAvatar(res) {
          console.log('chooseAvatar 回调:', res);
          if(res.detail.errMsg === 'chooseAvatar:ok') {
              const tempAvatarUrl = res.detail.avatarUrl;
              // 更新页面显示
              this.userInfo.avatarUrl = tempAvatarUrl;
              // 可选：将新的头像上传到服务器
              // this.uploadAvatar(tempAvatarUrl);
          } else {
              console.log('用户取消选择头像或失败:', res.detail.errMsg);
          }
      }
      */

      // 为了演示，我们模拟调用 (注意：这可能不符合“用户主动触发”的要求，导致失败)
      // uni.chooseAvatar({ // 如果直接调用这种方式，请确保是在用户手势事件中
      //   success: (res) => {
      //     console.log('chooseAvatar 成功:', res);
      //     this.userInfo.avatarUrl = res.tempFilePath; // 注意：chooseAvatar 返回的是 tempFilePath
      //     // TODO: 上传 tempFilePath 到服务器
      //   },
      //   fail: (err) => {
      //     console.error('chooseAvatar 失败:', err);
      //   }
      // });

      // 更推荐的做法：使用 button
      // 但由于 template 结构限制，我们在此方法内模拟触发一个隐藏的 button 事件不太现实
      // 最佳实践是直接在 template 里加一个 button:
    },

    setCustomNickname(e) {
      this.userInfo.nickname = e.detail.value;
      this.tempNickname = this.customNickname; // 初始化输入框
      this.showNicknameModal = true;
    },

    confirmNickname() {
      if (this.tempNickname.trim()) {
        this.customNickname = this.tempNickname.trim();
        this.showNicknameModal = false;
        uni.showToast({ title: '昵称设置成功', icon: 'success' });

        // 可选：将 customNickname 发送到后端保存

      } else {
        uni.showToast({ title: '昵称不能为空', icon: 'none' });
      }
    }
  }
}
</script>

<style>
.container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 20px;
  box-sizing: border-box;
}

button {
  padding: 12px 24px;
  font-size: 16px;
  background-color: #07c160; /* 微信绿 */
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-bottom: 10px;
}

/* Modal Styles (简化版) */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background-color: white;
  padding: 20px;
  border-radius: 8px;
  width: 80%;
  max-width: 300px;
}
</style>