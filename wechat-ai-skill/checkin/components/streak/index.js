// 原子组件：连续打卡统计卡片
Component({
  data: {
    title: '',
    currentStreak: 0,
    monthCheckinDays: 0,
    // 最近 30 天每一天 { date, done } —— 用于热力点
    grid: [],
  },
  lifetimes: {
    attached() {
      const ctx = wx.modelContext.getContext(this);
      ctx.on(wx.modelContext.NotificationType.Result, (data) => {
        if (!data) return;
        this.setData({
          title: data.title || '',
          currentStreak: data.currentStreak || 0,
          monthCheckinDays: data.monthCheckinDays || 0,
          grid: buildGrid(data.recentDates || []),
        });
      });
    },
  },
  methods: {
    openCheckinPage() {
      wx.navigateTo({ url: '/pages/checkin/index' });
    },
  },
});

// 把后端返回的 recentDates（最近 30 天里有打卡的日期数组，倒序）
// 渲染为以「今天为最后一格」的 30 格网格，每格标记 done。
function buildGrid(recentDates) {
  const done = new Set(recentDates);
  const today = new Date();
  const list = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const iso = formatIso(d);
    list.push({ date: iso, done: done.has(iso) });
  }
  return list;
}

function formatIso(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}
