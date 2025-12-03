// 日程
export interface Schedule {
    id: string
    itemTitle: string
    itemDesc?: string
    location: string
    userId?: string
    groupId?: string
    itemType: 'schedule' | 'task'
    itemLabel: string
    startTime: string // 'YYYY-MM-DD HH:mm:ss'
    endTime: string // 'YYYY-MM-DD HH:mm:ss'
    notes?: string
    repeatType?: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'none'
    repeatStartDay?: string // 'YYYY-MM-DD'
    repeatEndDay?: string // 'YYYY-MM-DD'
    repeatKeys?: Array<string>
}
export interface ScheduleList{
	date: String
	schedules: Schedule[]
}

export interface ScheduleListRequest{
	fromDate: String
	toDate: String
    userId?: string
    groupId: string
}
export interface ScheduleInfoRequest{
	id: String
    userId?: string
    groupId?: string
}

export interface ScheduleAddRequest{
	userId: string
	groupId: string
	items:Schedule[]
}