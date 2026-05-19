// 公共：解析「当前操作上下文」（群组 + 当前用户在该群组的成员关系）
//
// 所有需要 groupId / 成员角色语境的页面都应通过此助手：
// 1. ensureCurrentGroup：缓存命中即返回；否则拉 /api/group/list 默认第一个群组；
// 2. ensureCurrentMember：缓存命中即返回；否则按 groupId 拉成员，优先取「当前登录用户」自己的成员关系，
//    无匹配则取第一个；都不存在则返回 null；
// 3. ensureCurrentContext：一次串联完成 group + member 解析。
//
// 用户没有任何群组 / 成员时返回 null，由调用方 toast 引导。

import apiTs from './apiTs'
import {
  STORAGE_KEYS,
  getStoredData,
  setStoredData,
} from './storageManager'

export interface CurrentGroupLike {
  id: string | number
  creatorId?: string | number
  [key: string]: unknown
}

export interface CurrentMemberLike {
  id?: string | number
  userId?: string | number
  role?: string
  [key: string]: unknown
}

interface CurrentUserLike {
  id?: string | number
}

let inflightGroupEnsure: Promise<CurrentGroupLike | null> | null = null
const inflightMemberEnsure: Map<string, Promise<CurrentMemberLike | null>> = new Map()

/**
 * 获取当前操作群组；缺失时自动从用户群组列表里默认选第一个。
 *
 * 并发调用会复用同一份请求，避免重复拉取群组列表。
 */
export function ensureCurrentGroup(): Promise<CurrentGroupLike | null> {
  const cached = getStoredData<CurrentGroupLike>(STORAGE_KEYS.CURRENT_GROUP)
  if (cached && cached.id !== undefined && cached.id !== null) {
    return Promise.resolve(cached)
  }

  if (inflightGroupEnsure) {
    return inflightGroupEnsure
  }

  inflightGroupEnsure = (async () => {
    try {
      const groups = (await apiTs.group.list({})) as CurrentGroupLike[] | null
      const list = Array.isArray(groups) ? groups : []
      if (list.length === 0) {
        return null
      }
      setStoredData(STORAGE_KEYS.GROUP_LIST, list)
      const defaultGroup = list[0]
      setStoredData(STORAGE_KEYS.CURRENT_GROUP, defaultGroup)
      return defaultGroup
    } catch (error) {
      console.warn('[currentContextResolver] 拉取群组列表失败:', error)
      return null
    } finally {
      inflightGroupEnsure = null
    }
  })()

  return inflightGroupEnsure
}

/**
 * 获取当前操作群组里「当前登录用户」自己的成员关系；缺失时拉取并默认。
 *
 * @param groupId 显式指定群组 id；省略时回落到 cached_current_group。
 */
export function ensureCurrentMember(groupId?: string | number): Promise<CurrentMemberLike | null> {
  const cached = getStoredData<CurrentMemberLike>(STORAGE_KEYS.CURRENT_MEMBER)
  if (cached && (cached.userId !== undefined || cached.id !== undefined)) {
    return Promise.resolve(cached)
  }

  const targetGroupId = groupId !== undefined && groupId !== null && groupId !== ''
    ? String(groupId)
    : (() => {
        const currentGroup = getStoredData<CurrentGroupLike>(STORAGE_KEYS.CURRENT_GROUP)
        return currentGroup && currentGroup.id !== undefined ? String(currentGroup.id) : ''
      })()

  if (!targetGroupId) {
    return Promise.resolve(null)
  }

  const inflight = inflightMemberEnsure.get(targetGroupId)
  if (inflight) {
    return inflight
  }

  const promise = (async () => {
    try {
      const members = (await apiTs.group.user.list({ groupId: targetGroupId })) as CurrentMemberLike[] | null
      const list = Array.isArray(members) ? members : []
      if (list.length === 0) {
        return null
      }
      setStoredData(STORAGE_KEYS.MEMBER_LIST, list)

      const loginUser = getStoredData<CurrentUserLike>(STORAGE_KEYS.USER_INFO)
      const loginUserId = loginUser && loginUser.id !== undefined ? String(loginUser.id) : ''
      const ownMember = loginUserId
        ? list.find((member) => String(member.userId ?? member.id ?? '') === loginUserId)
        : null
      const defaultMember = ownMember || list[0]
      setStoredData(STORAGE_KEYS.CURRENT_MEMBER, defaultMember)
      return defaultMember
    } catch (error) {
      console.warn('[currentContextResolver] 拉取群组成员失败:', error)
      return null
    } finally {
      inflightMemberEnsure.delete(targetGroupId)
    }
  })()

  inflightMemberEnsure.set(targetGroupId, promise)
  return promise
}

/**
 * 一次性把群组 + 成员两层语境都解析好；任意一层缺失返回 null。
 */
export async function ensureCurrentContext(): Promise<{
  group: CurrentGroupLike
  member: CurrentMemberLike
} | null> {
  const group = await ensureCurrentGroup()
  if (!group) {
    return null
  }
  const member = await ensureCurrentMember(group.id)
  if (!member) {
    return null
  }
  return { group, member }
}

/**
 * 同步取当前群组 id（缓存命中才返回字符串，否则空串）。
 *
 * 适用于已经在外层 await 过 ensureCurrentGroup 的场景。
 */
export function readCurrentGroupId(): string {
  const cached = getStoredData<CurrentGroupLike>(STORAGE_KEYS.CURRENT_GROUP)
  if (cached && cached.id !== undefined && cached.id !== null) {
    return String(cached.id)
  }
  return ''
}
