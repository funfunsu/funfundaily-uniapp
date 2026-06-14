// 原子组件：当天打卡清单卡片
Component({
  data: {
    date: '',
    pendingCount: 0,
    completedCount: 0,
    pending: [],
    completed: [],
  },
  lifetimes: {
    attached() {
      const ctx = wx.modelContext.getContext(this);
      ctx.on(wx.modelContext.NotificationType.Result, (data) => {
        if (!data) return;
        this.setData({
          date: data.date || '',
          pendingCount: data.pendingCount || 0,
          completedCount: data.completedCount || 0,
          pending: data.pending || [],
          completed: data.completed || [],
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
