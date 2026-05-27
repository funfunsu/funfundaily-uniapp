// 戒断日记（abstain）领域工具：反馈类型常量、连续坚持天数计算、日期/反馈映射。
//
// 数据来源：戒断事件是 scheduleItem（itemType=abstain，startTime=创建时间、endTime=戒断目标）。
// 每天的反馈写在 checkin_record，extra.feedback = 'persist'（坚持/达成）| 'relapse'（破戒）。

export const FEEDBACK_PERSIST = 'persist'
export const FEEDBACK_RELAPSE = 'relapse'

export type FeedbackType = typeof FEEDBACK_PERSIST | typeof FEEDBACK_RELAPSE

export interface AbstainRecordLike {
  taskTime?: string | number | Date
  completeTime?: string | number | Date
  extra?: { feedback?: string } | null
}

/** 取记录的反馈类型（兼容 extra 为对象 / null）。 */
export function recordFeedback(record: AbstainRecordLike): string | undefined {
  return record?.extra?.feedback
}

/** 把任意时间值规整为本地日期字符串 yyyy-MM-dd（用于日历按天归属与对比）。 */
export function toDateKey(value: string | number | Date | undefined | null): string {
  if (!value) return ''
  const d = value instanceof Date ? value : new Date(value)
  if (isNaN(d.getTime())) {
    // 后端可能回 "2026-05-27T00:00:00"；某些端 new Date 解析失败时退化截取日期段
    const s = String(value)
    return s.length >= 10 ? s.slice(0, 10) : ''
  }
  const y = d.getFullYear()
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** 两个日期相差的整天数（dateKey 形式 yyyy-MM-dd），from→to 为正。 */
export function diffDays(fromKey: string, toKey: string): number {
  if (!fromKey || !toKey) return 0
  const from = new Date(`${fromKey}T00:00:00`)
  const to = new Date(`${toKey}T00:00:00`)
  return Math.round((to.getTime() - from.getTime()) / 86400000)
}

/**
 * 把记录列表归并为「日期 -> 反馈类型」映射（同一天以最新 completeTime 为准）。
 */
export function buildFeedbackMap(records: AbstainRecordLike[]): Record<string, string> {
  const map: Record<string, string> = {}
  const latestAt: Record<string, number> = {}
  for (const r of records || []) {
    const key = toDateKey(r.taskTime)
    const fb = recordFeedback(r)
    if (!key || !fb) continue
    const at = r.completeTime ? new Date(r.completeTime).getTime() : 0
    if (latestAt[key] === undefined || at >= latestAt[key]) {
      map[key] = fb
      latestAt[key] = at
    }
  }
  return map
}

/**
 * 连续坚持天数 = 今天 - 上一次破戒日期（无破戒则从事件开始日算起）。
 * 当天破戒则为 0。
 * @param startTime 事件开始时间（创建时间）
 * @param records   该事件的全部反馈记录
 */
export function calcStreakDays(
  startTime: string | number | Date | undefined,
  records: AbstainRecordLike[]
): number {
  const todayKey = toDateKey(new Date())
  let lastRelapseKey = ''
  for (const r of records || []) {
    if (recordFeedback(r) !== FEEDBACK_RELAPSE) continue
    const key = toDateKey(r.taskTime)
    if (key && (!lastRelapseKey || key > lastRelapseKey)) {
      lastRelapseKey = key
    }
  }
  const baseKey = lastRelapseKey || toDateKey(startTime)
  if (!baseKey) return 0
  const days = diffDays(baseKey, todayKey)
  return Math.max(0, days)
}
