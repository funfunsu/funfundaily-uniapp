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
	 * 获取指定月份的【当月第一天】Date对象 (00:00:00)
	 * @param date 传入任意当月的Date对象，不传默认取【当前系统日期】
	 * @returns Date 当月第一天 0时0分0秒
	 */
	static getFirstDayOfMonth(date: Date = new Date()): Date {
		const year = date.getFullYear();
		const month = date.getMonth();
		// 核心：年月不变，日期固定为1号，时分秒重置为0
		return new Date(year, month, 1, 0, 0, 0);
	}

	/**
	 * 获取指定月份的【当月最后一天】Date对象 (23:59:59)
	 * @param date 传入任意当月的Date对象，不传默认取【当前系统日期】
	 * @returns Date 当月最后一天 23时59分59秒
	 */
	static getLastDayOfMonth(date: Date = new Date()): Date {
		const year = date.getFullYear();
		const month = date.getMonth();
		// 核心：月份+1，日期传0 → JS会自动解析为【上月最后一天】，时分秒设为最后一刻
		return new Date(year, month + 1, 0, 23, 59, 59);
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
	static getSunday(date : Date = new Date()) : Date {
		const mondayDate = this.getMonday(date);
		// 创建一个副本以避免修改原始 mondayDate 对象
		const sundayDate = new Date(mondayDate.getTime());
		sundayDate.setDate(mondayDate.getDate() + 6);
		return sundayDate;
	}
	/**
	 * 获取指定日期所属周的周一（yyyy-MM-dd 字符串格式）
	 * @param date 输入日期（默认当前日期）
	 * @returns 格式化后的本周一字符串（如：2025-11-17）
	 */
	static getMondayDateTimeStr(date : Date = new Date()) : string {
		const mondayDate = this.getMonday(date);
		return this.formatDateTime(mondayDate);
	}
	static getSundayDateTimeStr(date : Date = new Date()) : string {
		const mondayDate = this.getMonday(date);
		// 创建一个副本以避免修改原始 mondayDate 对象
		const sundayDate = new Date(mondayDate.getTime());
		sundayDate.setDate(mondayDate.getDate() + 6); // 在副本上操作
		return this.formatDateTime(sundayDate);
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
	static getMonthAndDayFromDateTimeStr(dateTimeStr:string,defaultVal:string) : string {
		const dateStr =  dateTimeStr.split(splitStr)[0] || defaultVal;
		const dateArr = dateStr.split('-')
		return `${dateArr[1]}-${dateArr[2]}`
	}
	static combineDateAndHourMin(dateStr:string,timeHourStr:string) : string {
		return dateStr+splitStr+timeHourStr;
	}
	static combineDateTime(dateStr:string,timeStr:string) : string {
		return dateStr+splitStr+timeStr;
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

	static getDateTime(dateStr:string,hourMinStr:string):Date{
		const [year, month, day] = dateStr.split('-').map(Number);
		const [hour, minute, second = 0] = hourMinStr.split(':').map(Number); // 默认秒为0
		return new Date(year, month - 1, day, hour, minute, second);
	}


	static getMinutesDiff(date1:Date, date2:Date):number {
		if (!(date1 instanceof Date) || !(date2 instanceof Date)) {
			throw new Error("Both arguments must be Date objects");
		}
		// 获取时间戳（毫秒）
		const time1 = date1.getTime();
		const time2 = date2.getTime();
		// 计算毫秒差
		const timeDifferenceInMs = time2 - time1;
		// 转换为分钟 (1分钟 = 60 * 1000 毫秒)
		return timeDifferenceInMs / (1000 * 60);
	}
	static getDaysDiff(date1:Date, date2:Date):number {
		if (!(date1 instanceof Date) || !(date2 instanceof Date)) {
			throw new Error("Both arguments must be Date objects");
		}

		const MS_PER_DAY = 1000 * 60 * 60 * 24;

		// 计算毫秒差，然后转换为天数，并向下取整
		// 使用 Math.floor 确保负数也能正确处理 (例如 -1.5 -> -2)
		return Math.floor((date2.getTime() - date1.getTime()) / MS_PER_DAY);
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


	static getDayOff(date : Date = new Date(),dayOff: number) : Date {
		// 创建一个新的 Date 对象，避免修改原始传入的 date 对象
		const nextDay = new Date(date.getTime());
		nextDay.setDate(nextDay.getDate() + dayOff);
		return nextDay;
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
	static formatDateTimeToShow(date : Date) : string {
		return this.formatDate(date)+' '+this.getTimeStr(date);
	}

	static formatYearAndMonth(date : string) : string {
		const arr = date.split('-')
		return `${arr[0]}-${arr[1]}`;
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