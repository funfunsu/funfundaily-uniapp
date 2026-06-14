// 原子接口：checkin_streak
// 查询某项任务的连续打卡天数、本月已打卡天数与最近 30 天日期。
const { postAi } = require('./_request.js');

module.exports = async function checkinStreak(args) {
  if (!args || !args.taskId) {
    return {
      isError: true,
      content: [{ type: 'text', text: '缺少 taskId，请先调用 checkin_active_list 查到任务 ID 后再调用' }],
    };
  }
  const payload = { taskId: String(args.taskId) };
  if (args.targetUserId) payload.targetUserId = String(args.targetUserId);

  const envelope = await postAi('/api/ai/checkin/streak', payload);
  return {
    content: [{ type: 'text', text: envelope.fact }],
    structuredContent: envelope.card,
    _meta: { action: envelope.action },
  };
};
