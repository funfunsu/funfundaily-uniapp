// 原子组件：打卡完成卡片
Component({
  data: {
    title: '',
    date: '',
    currentStreak: 0,
    monthCheckinDays: 0,
    remainingPending: [],
  },
  lifetimes: {
    attached() {
      const ctx = wx.modelContext.getContext(this);
      ctx.on(wx.modelContext.NotificationType.Result, (data) => {
        if (!data) return;
        this.setData({
          title: data.title || '',
          date: data.date || '',
          currentStreak: data.currentStreak || 0,
          monthCheckinDays: data.monthCheckinDays || 0,
          remainingPending: data.remainingPending || [],
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
