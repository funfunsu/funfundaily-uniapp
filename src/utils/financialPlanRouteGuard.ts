import { isLogin } from './token'
import { getStoredData, STORAGE_KEYS } from './storageManager'
import { ensureCurrentContext, ensureCurrentGroup } from './currentGroupResolver'

type GuardLevel = 'member' | 'editor'

interface GuardConfig {
  routePath: string
  level: GuardLevel
}

interface NavigationArgs {
  url?: string
}

const protectedRouteConfigs: GuardConfig[] = [
  { routePath: '/subPackages/financial-plan/pages/list', level: 'member' },
  { routePath: '/subPackages/financial-plan/pages/detail', level: 'member' },
  { routePath: '/subPackages/financial-plan/pages/analysis', level: 'member' },
  { routePath: '/subPackages/financial-plan/pages/edit', level: 'editor' },
  { routePath: '/subPackages/financial-plan/pages/realization-edit', level: 'editor' },
]

const editorRoles = new Set(['Admin', 'Creator'])
let hasInstalledFinancialPlanGuard = false

/** 统一展示权限拦截提示。 */
function showGuardToast(message: string): void {
  uni.showToast({
    title: message,
    icon: 'none',
    duration: 2200,
  })
}

/** 提取无查询参数的路由路径。 */
function resolveRoutePath(rawUrl: string): string {
  return String(rawUrl || '').split('?')[0]
}

/** 将 index 路由归一化到 design 文档里的路径格式。 */
function normalizeRoutePath(routePath: string): string {
  return routePath.replace(/\/index$/, '')
}

/** 根据路由匹配对应的权限策略。 */
function resolveGuardConfig(routePath: string): GuardConfig | null {
  const normalizedRoutePath = normalizeRoutePath(routePath)
  return protectedRouteConfigs.find((item) => normalizedRoutePath.startsWith(item.routePath)) || null
}

/** 判断当前用户是否具备成员权限。 */
function hasMemberPermission(): boolean {
  // 已登录即视为有成员级权限：群组上下文由各页面通过 ensureCurrentGroup 自动默认，
  // 群组的 backend 权限由后端 FP_PERMISSION_DENIED 兜底。
  return true
}

/**
 * 判断当前用户是否具备编辑权限。
 *
 * 仅在「已拿到明确角色证据」时才否决；缓存缺失视为「未知，放行交给后端鉴权」。
 * 真正的权限判定以后端 FP_PERMISSION_DENIED 为准。
 */
function hasEditorPermission(): boolean {
  const currentMember = getStoredData<any>(STORAGE_KEYS.CURRENT_MEMBER)
  const currentUser = getStoredData<any>(STORAGE_KEYS.USER_INFO)
  const currentGroup = getStoredData<any>(STORAGE_KEYS.CURRENT_GROUP)
  const role = currentMember?.role ? String(currentMember.role) : ''

  if (role && editorRoles.has(role)) {
    return true
  }

  if (
    currentUser?.id
    && currentGroup?.creatorId
    && String(currentGroup.creatorId) === String(currentUser.id)
  ) {
    return true
  }

  // 缓存里既无明确角色、也无群组创建者证据：尚未解析完成，放行让后端兜底。
  return !role
}

/** 跳转到登录页并中断当前导航。 */
function blockByLogin(): false {
  showGuardToast('请先登录后再访问理财计划')
  uni.reLaunch({ url: '/pages/index/index' })
  return false
}

/** 编辑权限不足时中断当前导航。 */
function blockByEditorPermission(): false {
  showGuardToast('当前成员无理财计划编辑权限')
  return false
}

/** 执行 financial-plan 路由权限校验。 */
function guardFinancialPlanNavigation(rawUrl: string): boolean {
  const routePath = resolveRoutePath(rawUrl)
  const guardConfig = resolveGuardConfig(routePath)

  if (!guardConfig) {
    return true
  }

  if (!isLogin()) {
    return blockByLogin()
  }

  if (!hasMemberPermission()) {
    // 保留接口位以便未来收紧；当前 hasMemberPermission 始终 true。
    return false
  }

  // 异步预热当前群组 + 成员缓存：editor 路由还需要 role 才能精准判断后端权限。
  if (guardConfig.level === 'editor') {
    void ensureCurrentContext()
  } else {
    void ensureCurrentGroup()
  }

  if (guardConfig.level === 'editor' && !hasEditorPermission()) {
    return blockByEditorPermission()
  }

  return true
}

/** 创建 uni 导航拦截器配置。 */
function buildNavigationInterceptor() {
  return {
    invoke(args: NavigationArgs) {
      return guardFinancialPlanNavigation(String(args?.url || ''))
    },
  }
}

/** 安装 financial-plan 路由守卫。 */
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