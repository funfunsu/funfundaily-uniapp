/**
 * @description 日期工具类：封装常用日期处理方法
 */
export default class DateUtils {
	static getScheduleDates(date : Date = new Date()) : Array<string> {
		const monday = this.getMonday(date);
		const dates = [];
		for (let i = 0; i < 7; i++) {
			const date = new Date();
			date.setDate(monday.getDate() + i);
			dates.push(date.toISOString().split('T')[0]);
		}
		return dates
	}
	/**
	 * 获取指定日期所属周的周一（Date 类型）
	 * @param date 输入日期（默认当前日期）
	 * @returns 本周一的 Date 对象
	 */
	static getMonday(date : Date = new Date()) : Date {
		const d = new Date(date);
		const day = d.getDay();
		// 周日（day=0）特殊处理：diff 为 -6 → 上周一；其他日期计算到本周一
		const diff = d.getDate() - day + (day === 0 ? -6 : 1);
		return new Date(d.setDate(diff));
	}

	/**
	 * 获取指定日期所属周的周一（yyyy-MM-dd 字符串格式）
	 * @param date 输入日期（默认当前日期）
	 * @returns 格式化后的本周一字符串（如：2025-11-17）
	 */
	static getMondayStr(date : Date = new Date()) : string {
		const mondayDate = this.getMonday(date);
		return this.formatDate(mondayDate);
	}

	/**
	 * 通用日期格式化：Date 转 yyyy-MM-dd 字符串
	 * @param date 需格式化的日期
	 * @returns 格式化后的日期字符串
	 */
	static formatDate(date : Date) : string {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0'); // 月份 0-11 → 1-12，补0
		const day = String(date.getDate()).padStart(2, '0'); // 日期补0
		return `${year}-${month}-${day}`;
	}

	// 可扩展其他日期工具方法（如获取周日、格式化时间等）
	/**
	 * 获取指定日期所属周的周日（yyyy-MM-dd 字符串格式）
	 * @param date 输入日期（默认当前日期）
	 * @returns 格式化后的本周末字符串
	 */
	static getSundayStr(date : Date = new Date()) : string {
		const mondayDate = this.getMonday(date);
		const sundayDate = new Date(mondayDate.setDate(mondayDate.getDate() + 6));
		return this.formatDate(sundayDate);
	}
}