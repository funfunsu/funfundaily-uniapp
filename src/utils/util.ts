/**
 * @description 日期工具类：封装常用日期处理方法
 */
const splitStr = 'T'

// 补零
function padZero(num) {
	return num < 10 ? `0${num}` : num;
}
export default class DateUtils {
	static splitStr = 'T'; // 移动到类内部

	// static splitStr = 'T'
	static getScheduleDates(date : Date = new Date()) : Array<string> {
		const monday = this.getMonday(date);
		const dates = [];
		for (let i = 0; i < 7; i++) {
			// 创建一个基于 monday 的新 Date 对象副本
			const currentDate = new Date(monday.getTime());
			// 在副本上增加 i 天
			currentDate.setDate(monday.getDate() + i);
			// 格式化并添加到数组
			dates.push(this.formatDate(currentDate)); // 使用类里的 formatDate 更一致
			// 或者 dates.push(currentDate.toISOString().split('T')[0]); // 如果你坚持用 toISOString
		}
		return dates;
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

	static getTodayStr(date : Date = new Date()) : string {
		return this.formatDate(date);
	}


	//HH:mm
	static getHourAndMinFromDateTimeStr(dateTimeStr:string,defaultVal:string) : string {
		if (!dateTimeStr){
			return defaultVal;
		}
		const timeStr = dateTimeStr.split(splitStr)[1] || '00:00:00';
		return timeStr.split(':')[0]+':'+timeStr.split(':')[1];
	}

	static getDateFromDateTimeStr(dateTimeStr:string,defaultVal:string) : string {
		return dateTimeStr.split(splitStr)[0] || defaultVal;
	}
	static combineDateAndHourMin(dateStr:string,timeHourStr:string) : string {
		return dateStr+splitStr+timeHourStr;
	}
	static replaceTimePart(dateTimeStr:string,timeStr:string) : string {
		return dateTimeStr.split(splitStr)[0]+splitStr+timeStr;
	}
	static replaceDatePart(dateTimeStr:string,dateStr:string) : string {
		return dateStr+splitStr+dateTimeStr.split(splitStr)[1];
	}

	static getDayStartTimeStr(date : Date = new Date()) : string {
		return this.formatDate(date)+splitStr+'00:00:00';
	}
	static getDateStr(date : Date = new Date()) : string {
		return this.formatDate(date);
	}
	static getTimeStr(date : Date = new Date()) : string {
		return padZero(date.getHours())+':'+padZero(date.getMinutes())+':'+padZero(date.getSeconds());
	}
	static getDayEndTimeStr(date : Date = new Date()) : string {
		return this.formatDate(date)+splitStr+'23:59:59';
	}


	static getDayInMonth(date : Date = new Date()) : string {
		return padZero(date.getDate())
	}
	//MM-dd
	static getDayInYear(date : Date = new Date()) : string {
		return `${padZero(date.getMonth() + 1)}-${padZero(date.getDate())}`;
	}
	//MM-dd
	static getWeekDay(date : Date = new Date()) : number {
		return date.getDay()
	}




	static getNextDayStr(date : Date = new Date()) : string {
		// 创建一个新的 Date 对象，避免修改原始传入的 date 对象
		const nextDay = new Date(date.getTime());
		// 将日期设置为下一天
		nextDay.setDate(nextDay.getDate() + 1);
		return this.formatDate(nextDay);
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
	/**
	 * 通用日期格式化：Date 转 yyyy-MM-dd 字符串
	 * @param date 需格式化的日期
	 * @returns 格式化后的日期字符串
	 */
	static formatDateTime(date : Date) : string {
		return this.formatDate(date)+splitStr+this.getTimeStr(date);
	}

	/**
	 * 通用日期格式化：Date 转 yyyy-MM-dd 字符串
	 * @param date 需格式化的日期
	 * @returns 格式化后的日期字符串
	 */
	static formatDateToMonth(date : Date) : string {
		const month = String(date.getMonth() + 1).padStart(2, '0'); // 月份 0-11 → 1-12，补0
		const day = String(date.getDate()).padStart(2, '0'); // 日期补0
		return `${month}-${day}`;
	}

	// 可扩展其他日期工具方法（如获取周日、格式化时间等）
	/**
	 * 获取指定日期所属周的周日（yyyy-MM-dd 字符串格式）
	 * @param date 输入日期（默认当前日期）
	 * @returns 格式化后的本周末字符串
	 */
	static getSundayStr(date : Date = new Date()) : string {
		const mondayDate = this.getMonday(date);
		// 创建一个副本以避免修改原始 mondayDate 对象
		const sundayDate = new Date(mondayDate.getTime());
		sundayDate.setDate(mondayDate.getDate() + 6); // 在副本上操作
		return this.formatDate(sundayDate);
	}
}