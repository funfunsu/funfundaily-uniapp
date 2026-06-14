// 原子接口：checkin_complete
// 为某项打卡任务执行打卡。taskId 必须从 active-list 拿。
const { postAi } = require('./_request.js');

module.exports = async function checkinComplete(args) {
  if (!args || !args.taskId) {
    return {
      isError: true,
      content: [{ type: 'text', text: '缺少 taskId，请先调用 checkin_active_list 查到任务 ID 后再调用' }],
    };
  }
  const payload = { taskId: String(args.taskId) };
  if (args.targetUserId) payload.targetUserId = String(args.targetUserId);
  if (args.date) payload.date = args.date;

  try {
    const envelope = await postAi('/api/ai/checkin/complete', payload);
    return {
      content: [{ type: 'text', text: envelope.fact }],
      structuredContent: envelope.card,
      _meta: { action: envelope.action },
    };
  } catch (e) {
    return {
      isError: true,
      content: [{ type: 'text', text: (e && e.message) || '打卡失败' }],
    };
  }
};
