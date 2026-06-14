// fungrowth 爱家「打卡」SKILL 注册入口。
// 由微信 AI 框架在沙箱里 require 本文件，把 3 个原子接口挂到 skill 上。
const checkinActiveList = require('./apis/active-list.js');
const checkinComplete = require('./apis/complete.js');
const checkinStreak = require('./apis/streak.js');

// path 应与 app.json 中 agent.skills[].path 一致；wx 官方约定以 "/" 开头的小程序路径。
const skill = wx.modelContext.createSkill('/skills/checkin');

skill.registerAPI('checkin_active_list', checkinActiveList);
skill.registerAPI('checkin_complete', checkinComplete);
skill.registerAPI('checkin_streak', checkinStreak);

// 简单的统一错误日志中间件：失败时打印，便于 Nightly 调试。
skill.use(async (ctx, next) => {
  const start = Date.now();
  try {
    await next();
    console.log('[checkin-skill]', ctx.name, 'ok', Date.now() - start, 'ms');
  } catch (e) {
    console.error('[checkin-skill]', ctx.name, 'fail', e);
    throw e;
  }
});

module.exports = skill;
