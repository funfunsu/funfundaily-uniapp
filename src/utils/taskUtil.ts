import DateUtils from "./util";

export default class TaskUtil {
	static isTaskUndo(item : any,currentDate : Date) : boolean{
		return !item.showExtra.lastCompleteKey || item.showExtra.lastCompleteKey < item.showExtra.itemKey  || (item.showExtra.lastCompleteKey == item.showExtra.itemKey && DateUtils.isTheSameDay(new Date(item.updateScope.lastCompleteTime),currentDate));
	}

	static sortTaskToShow(a,b) : number{
		// 第一步：优先排序 - 未完成的排前面，已完成的排后面
		if (a.showExtra.lastCompleteKey === a.showExtra.itemKey) {
			return 1
		}
		if (b.showExtra.lastCompleteKey === b.showExtra.itemKey) {
			return -1
		}
		// 第二步：同状态下，截止日期 越早的排越前面
		return a.showExtra.dueDate >b.showExtra.dueDate ? 1:-1;
	}


}