// utils/api.ts
import request from './requestTs'
import {api} from './requestTs'
import {
    Schedule, ScheduleList, ScheduleListRequest, ScheduleInfoRequest, ScheduleAddRequest, ScheduleCopyRequest
} from '../types/schedule'
import {
    DiscoveryItem
} from '../types/discovery'
import {
    Point
} from '../types/point'
import {
    Share
} from '../types/share'

// 统一管理所有API接口
const apiTs = {
    // 用户相关接口
    user: {
        login: (data: object): Promise<any> => api.post<any>(
            '/login',
            data
        ),
        getInfo: (): Promise<any> => api.get<any>(
            '/api/user/info',
            {}
        )
    },
    discovery: {
        list: (): Promise<DiscoveryItem[]> => request<DiscoveryItem[]>({
            url: '/api/discovery/list',
            method: 'GET'
        })
    },

    // 日程相关接口
    schedule: {
        // 获取日程列表
        list: (data: ScheduleListRequest): Promise<ScheduleList[]> => api.get<ScheduleList[]>('/api/schedule/list', data),
        // 获取日程详情
        info: (data: ScheduleInfoRequest): Promise<Schedule> => api.get<Schedule>('/api/schedule/' + data.id, data),
        // 添加日程
        add: (data: ScheduleAddRequest): Promise<boolean> => api.post<boolean>('/api/schedule/add', data),
        copy: (data: ScheduleCopyRequest): Promise<boolean> => api.post<boolean>('/api/schedule/copy', data),
        // 修改日程
        modify: (data: ScheduleAddRequest): Promise<boolean> => api.post<boolean>('/api/schedule/modify', data)
    },
    // 积分相关接口
    point: {
        // 获取积分信息
        get: (data: any): Promise<Point> => request<Point>({
            url: '/api/point/get',
            method: 'GET',
            data
        })
    },

    group: {
        user: {
            list: (data: any) => request<any>({
                url: '/api/group/user/list',
                method: 'GET',
                data
            }),
            // 获取任务列表
            add: (data: any) => request<any>({
                url: '/api/group/user/add',
                method: 'POST',
                data
            }),
            // 获取任务列表
            get: (data: any) => api.get<any>('/api/group/user/get',data),
            // 获取任务列表
            remove: (data: any) => request<any>({
                url: '/api/group/user/remove',
                method: 'POST',
                data
            }),
            // 获取任务列表
            modify: (data: any) => request<any>({
                url: '/api/group/user/modify',
                method: 'POST',
                data
            })
        },
        list: (data: any) => request<any>({
            url: '/api/group/list',
            method: 'GET',
            data
        }),
        add: (data: any) => request<any>({
            url: '/api/group/add',
            method: 'POST',
            data
        }),
        modify: (data: any) => request<any>({
            url: '/api/group/modify',
            method: 'POST',
            data
        }),
        info: (data: any) => request<any>({
            url: '/api/group/info',
            method: 'GET',
            data
        }),
    },
    // 任务相关接口
    task: {
        // 获取任务列表
        list: (data: any): Promise<any> => request<any>({
            url: '/api/task/list',
            method: 'GET',
            data
        }),
        // 获取任务详情
        info: (data: any): Promise<any> => request<any>({
            url: '/api/task/info?id=' + data.id,
            method: 'GET',
            data
        }),
        // 添加任务
        add: (data: any): Promise<any> => request<any>({
            url: '/api/task/add',
            method: 'POST',
            data
        }),
        // 修改任务
        modify: (data: any): Promise<any> => request<any>({
            url: '/api/task/modify',
            method: 'POST',
            data
        }),
        // 获取任务历史记录
        history: (data: any): Promise<any> => request<any>({
            url: '/api/task/history',
            method: 'GET',
            data
        }),
        // 获取任务完成记录列表
        records: (data: any): Promise<any> => request<any>({
            url: '/api/task/records',
            method: 'GET',
            data
        })
    },
    checkin: {
        // 完成任务打卡
        task: {
            complete: (data: any): Promise<any> => api.post<any>(
                '/api/checkin/task/complete',
                data
            ),
            list: (data: any): Promise<any> => api.get<any>('/api/checkin/task/list', data)
        },
        // 添加打卡
        list: (data: any): Promise<any> => api.get<any>(
            '/api/checkin/list',
            data
        ),
    },
    share: {
        create: (data: any): Promise<Share> => api.post<Share>('/api/share/create', data),
        getContent: (token: string): Promise<any> => api.get(`/api/share/${token}`),
    }
}

export default apiTs