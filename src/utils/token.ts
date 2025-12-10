// utils/token.uts 或 token.ts

const TOKEN_KEY = 'ACCESS_TOKEN'
const SHARE_TOKEN_KEY = 'SHARE_TOKEN'
const CURRENT_GROUP_KEY = 'CURRENT_GROUP_KEY'
const CURRENT_MEMBER_KEY = 'CURRENT_MEMBER_KEY'

/**
 * 保存 Token
 */
export function setToken(token: string): void {
  uni.setStorageSync(TOKEN_KEY, token)
}

/**
 * 获取 Token
 */
export function getToken(): string | null {
  try {
    const token = uni.getStorageSync(TOKEN_KEY)
    return typeof token === 'string' ? token : null
  } catch (e) {
    console.warn('getToken failed:', e)
    return null
  }
}
/**
 * 保存 Token
 */
export function setShareToken(token: string): void {
  uni.setStorageSync(SHARE_TOKEN_KEY, token)
}

/**
 * 获取 Token
 */
export function getShareToken(): string | null {
  try {
    const token = uni.getStorageSync(SHARE_TOKEN_KEY)
    return typeof token === 'string' ? token : null
  } catch (e) {
    console.warn('getShareToken failed:', e)
    return null
  }
}

/**
 * 移除 Token
 */
export function removeToken(): void {
  uni.removeStorageSync(TOKEN_KEY)
}
/**
 * 移除 Token
 */
export function removeShareToken(): void {
  uni.removeStorageSync(SHARE_TOKEN_KEY)
}

/**
 * 检查是否已登录
 */
export function isLogin(): boolean {
  return !!getToken()
}