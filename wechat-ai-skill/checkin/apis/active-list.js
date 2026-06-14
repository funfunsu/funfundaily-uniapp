// 原子接口：checkin_active_list
// 返回当天（或指定日期）某成员的打卡清单。
const { postAi } = require('./_request.js');

module.exports = async function checkinActiveList(args) {
  const payload = {};
  if (args && args.targetUserId) payload.targetUserId = String(args.targetUserId);
  if (args && args.date) payload.date = args.date;

  const envelope = await postAi('/api/ai/checkin/active-list', payload);
  // envelope = { fact, action, card }
  return {
    content: [{ type: 'text', text: envelope.fact }],
    structuredContent: envelope.card,
    _meta: { action: envelope.action },
  };
};
