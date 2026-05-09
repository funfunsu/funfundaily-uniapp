import DateUtils from "./util";

// showExtra 缺失时的兜底：showExtra 由前端按当日日期 + scheduleItem 派生
// (itemKey/lastCompleteKey/dueDate)，目前派生逻辑暂未迁回到本仓库，
// 故下面所有读取均做空判断，避免整页因 NPE 崩溃。
export default class TaskUtil {
	static isTaskUndo(item : any, currentDate : Date) : boolean{
		const ex = item && item.showExtra;
		if (!ex) return true; // 没有 showExtra 默认视为未完成
		if (!ex.lastCompleteKey) return true;
		if (ex.lastCompleteKey < ex.itemKey) return true;
		const lastCompleteTime = item.updateScope && item.updateScope.lastCompleteTime;
		return ex.lastCompleteKey == ex.itemKey
			&& !!lastCompleteTime
			&& DateUtils.isTheSameDay(new Date(lastCompleteTime), currentDate);
	}

	static sortTaskToShow(a, b) : number{
		const ax = a && a.showExtra;
		const bx = b && b.showExtra;
		// 任一方缺 showExtra：退化到 startTime / id 顺序
		if (!ax || !bx) {
			const at = (a && a.startTime) || '';
			const bt = (b && b.startTime) || '';
			if (at !== bt) return at > bt ? 1 : -1;
			return ((a && a.id) || 0) - ((b && b.id) || 0);
		}
		// 第一步：优先排序 - 未完成的排前面，已完成的排后面
		if (ax.lastCompleteKey === ax.itemKey) return 1;
		if (bx.lastCompleteKey === bx.itemKey) return -1;
		// 第二步：同状态下，截止日期 越早的排越前面
		return ax.dueDate > bx.dueDate ? 1 : -1;
	}


}