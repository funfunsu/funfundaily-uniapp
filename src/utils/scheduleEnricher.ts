// 给从 /api/schedule/list 或 /api/checkin/task/list 拉回来的 ScheduleItem
// 补上前端排序/完成态判断需要的派生字段：
//   showExtra.itemKey         当前展示日所对应的"周期实例"键
//   showExtra.lastCompleteKey 最近一次完成对应的同格式键
//   showExtra.dueDate         排序用的截止日期 (yyyy-MM-dd)
//   updateScope.lastCompleteTime 最近一次 checkin 的 completeTime
//
// itemKey/lastCompleteKey 设计：
//   - RepeatType=daily：`${taskId}:${YYYY-MM-DD}`，每天独立一个键
//   - RepeatType=none ：`${taskId}`，全局一个键（一次性任务）
//
// 与 TaskUtil.isTaskUndo 配合：
//   - 没做过        → lastCompleteKey 为空        → undone
//   - 上次做的早    → lastCompleteKey < itemKey  → undone
//   - 今天做的      → 两者相等且 lastCompleteTime=今天 → 仍展示在"今日列表"里

import DateUtils from './util';

type Task = any;
type Record = any;

const formatDate = (date: Date): string => DateUtils.formatDate(date);

const dateOf = (val: string | Date | undefined | null): string => {
  if (!val) return '';
  if (typeof val === 'string') return val.substring(0, 10);
  return formatDate(val);
};

const getItemKey = (task: Task, dateStr: string): string => {
  if (task && task.repeatType === 'daily') return `${task.id}:${dateStr}`;
  return String(task && task.id);
};

const getDueDate = (task: Task, dateStr: string): string => {
  if (task && task.repeatType === 'daily') return dateStr;
  return dateOf(task && (task.endTime || task.startTime)) || dateStr;
};

/**
 * 把 record 数组按 taskId 分组，并按 completeTime 倒序，便于取"最近一次"。
 */
export function groupRecordsByTaskId(records: Record[]): Map<number, Record[]> {
  const map = new Map<number, Record[]>();
  if (!Array.isArray(records)) return map;
  for (const r of records) {
    const tid = r && (r.taskId || r.task_id);
    if (!tid) continue;
    if (!map.has(tid)) map.set(tid, []);
    map.get(tid)!.push(r);
  }
  for (const list of map.values()) {
    list.sort((a, b) => {
      const ta = new Date(a.completeTime || 0).getTime();
      const tb = new Date(b.completeTime || 0).getTime();
      return tb - ta;
    });
  }
  return map;
}

/**
 * 给一组 task 注入 showExtra / updateScope。原地修改并返回原数组。
 */
export function enrichWithShowExtra(
    tasks: Task[],
    records: Record[],
    currentDate: Date
): Task[] {
  if (!Array.isArray(tasks)) return [];
  const dateStr = formatDate(currentDate);
  const recordsByTaskId = groupRecordsByTaskId(records || []);

  for (const task of tasks) {
    if (!task) continue;
    const itemKey = getItemKey(task, dateStr);
    const dueDate = getDueDate(task, dateStr);

    let lastCompleteKey: string | null = null;
    let lastCompleteTime: string | null = null;
    const taskRecords = recordsByTaskId.get(task.id);
    if (taskRecords && taskRecords.length > 0) {
      const last = taskRecords[0]; // 已按 completeTime DESC 排过序
      lastCompleteTime = last.completeTime || null;
      const lastDay = dateOf(last.taskTime || last.completeTime);
      if (task.repeatType === 'daily') {
        lastCompleteKey = `${task.id}:${lastDay}`;
      } else {
        lastCompleteKey = String(task.id);
      }
    }

    task.showExtra = { itemKey, lastCompleteKey, dueDate };
    task.updateScope = Object.assign({}, task.updateScope, { lastCompleteTime });
  }
  return tasks;
}
