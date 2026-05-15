import { isLogin } from './token'
import { ensureCurrentGroup } from './currentGroupResolver'

interface GuardConfig {
  routePath: string
}

interface NavigationArgs {
  url?: string
}

// 全部展示与操作都在 list 页面完成，仅保留这一个受保护的路由入口。
const protectedRouteConfigs: GuardConfig[] = [
  { routePath: '/subPackages/financial-plan/pages/list' },
]

let hasInstalledFinancialPlanGuard = false

function showGuardToast(message: string): void {
  uni.showToast({
    title: message,
    icon: 'none',
    duration: 2200,
  })
}

function resolveRoutePath(rawUrl: string): string {
  return String(rawUrl || '').split('?')[0]
}

function normalizeRoutePath(routePath: string): string {
  return routePath.replace(/\/index$/, '')
}

function resolveGuardConfig(routePath: string): GuardConfig | null {
  const normalizedRoutePath = normalizeRoutePath(routePath)
  return protectedRouteConfigs.find((item) => normalizedRoutePath.startsWith(item.routePath)) || null
}

function blockByLogin(): false {
  showGuardToast('请先登录后再访问理财计划')
  uni.reLaunch({ url: '/pages/index/index' })
  return false
}

function guardFinancialPlanNavigation(rawUrl: string): boolean {
  const routePath = resolveRoutePath(rawUrl)
  const guardConfig = resolveGuardConfig(routePath)
  if (!guardConfig) {
    return true
  }
  if (!isLogin()) {
    return blockByLogin()
  }
  // 异步预热当前群组缓存，让目标页面挂载时无需等待二次拉取。
  void ensureCurrentGroup()
  return true
}

function buildNavigationInterceptor() {
  return {
    invoke(args: NavigationArgs) {
      return guardFinancialPlanNavigation(String(args?.url || ''))
    },
  }
}

/** 安装 financial-plan 路由守卫（仅守 list 一个入口）。 */
export function setupFinancialPlanRouteGuard(): void {
  if (hasInstalledFinancialPlanGuard) {
    return
  }
  const interceptor = buildNavigationInterceptor()
  uni.addInterceptor('navigateTo', interceptor)
  uni.addInterceptor('redirectTo', interceptor)
  uni.addInterceptor('reLaunch', interceptor)
  hasInstalledFinancialPlanGuard = true
}
