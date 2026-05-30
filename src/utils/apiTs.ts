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
        ),
        update:(data:object): Promise<any> => api.post<any>(
            '/api/user/update',
            data
        ),
        // 群主/管理员修改未绑定微信成员（bindType=None）的昵称
        // data: { groupId, targetUserId, nickname }
        updateMemberNickname: (data: any): Promise<any> => api.post<any>(
            '/api/user/update-member-nickname',
            data
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
        list: (data: ScheduleListRequest): Promise<ScheduleList[]> => api.post<ScheduleList[]>('/api/schedule/list', data),
        // 获取日程详情
        info: (data: ScheduleInfoRequest): Promise<Schedule> => api.get<Schedule>('/api/schedule/' + data.id, data),
        // 添加日程
        save: (data: ScheduleAddRequest): Promise<boolean> => api.post<boolean>('/api/schedule/save', data),
        copy: (data: ScheduleCopyRequest): Promise<boolean> => api.post<boolean>('/api/schedule/copy', data),
        delete: (id): Promise<boolean> => api.delete<boolean>(`/api/schedule/${id}`, {}),
        // 停止关注 / 恢复关注：closeStatus = 'CLOSE' | 'OPEN'
        close: (data: any): Promise<boolean> => api.post<boolean>('/api/schedule/close', data),
        // 已停止关注列表（用于恢复入口）
        closedList: (data: any): Promise<any[]> => api.post<any[]>('/api/schedule/closed/list', data),
        // 月度计划：群组维度的原始列表（不按天展开），前端按月份归属
        planList: (data: any): Promise<any[]> => api.post<any[]>('/api/schedule/plan/list', data),
        // 未停止关注（OPEN）的扁平列表（戒断事件等长期持续事件，不按天展开）
        activeList: (data: any): Promise<any[]> => api.post<any[]>('/api/schedule/active/list', data)
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
                url: `/api/group/user/${data.groupId}/${data.userId}`,
                method: 'DELETE',
                data
            }),
            update: (data: any) => request<any>({
                url: `/api/group/user/update`,
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
            url: '/api/group/create',
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
            url: '/api/task/save',
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
            list: (data: any): Promise<any> => api.post<any>('/api/checkin/task/list', data)
        },
        // 添加打卡
        list: (data: any): Promise<any> => api.post<any>(
            '/api/checkin/list',
            data
        ),
        // 添加打卡
        listV2: (data: any): Promise<any> => api.post<any>(
            '/api/checkin/listV2',
            data
        ),
        // 戒断事件按天反馈（达成/破戒）：extra.feedback = 'persist' | 'relapse'
        feedback: (data: any): Promise<any> => api.post<any>(
            '/api/checkin/feedback',
            data
        ),
    },
    flow:{
        list: (data: any): Promise<any> => api.post<any>(
            '/api/transaction-flows/list',
            data
        ),
        balance: (data: any): Promise<any> => api.post<any>(
            '/api/transaction-flows/balance',
            data
        ),
        save: (data: any): Promise<any> => api.post<any>(
            '/api/transaction-flows/save',
            data
        ),
        subtract: (data: any): Promise<any> => api.post<any>(
            '/api/transaction-flows/subtract',
            data
        ),
    },
    share: {
        create: (data: any): Promise<Share> => api.post<Share>('/api/share/create', data),
        getContent: (token: string): Promise<any> => api.get(`/api/share/${token}`),
        accept: (token: string): Promise<any> => api.post(`/api/share/accept/${token}`),
        // 生成分享二维码（微信小程序码），返回 { qrBase64, contentType }
        qrcode: (data: { token: string; page?: string }): Promise<{ qrBase64: string; contentType: string }> =>
            api.post<{ qrBase64: string; contentType: string }>('/api/share/qrcode', data),
    },
    invitation: {
        list: (groupId: number | string): Promise<any[]> => api.get<any[]>('/api/invitation/list', { groupId }),
        get: (id: number | string): Promise<any> => api.get<any>(`/api/invitation/${id}`),
        save: (data: any): Promise<any> => api.post<any>('/api/invitation/save', data),
        delete: (id: number | string): Promise<any> => api.delete<any>(`/api/invitation/${id}`),
        // 受邀人「收下邀请」：依据原邀请 id 生成一条收到记录
        accept: (data: { invitationId: number | string; recipientName?: string }): Promise<any> =>
            api.post<any>('/api/invitation/accept', data),
    },
    universal_records:{
        // 添加打卡
        list: (data: any): Promise<any> => api.post<any>(
            '/api/universal-records/list',
            data
        ),
        get: (data: any): Promise<any> => api.post<any>(
            '/api/universal-records/get',
            data
        ),
        getForGroup: (data: any): Promise<any> => api.post<any>(
            '/api/universal-records/group/get',
            data
        ),
        saveForGroup:(data: any): Promise<any> => api.post<any>(
            '/api/universal-records/group/save',
            data
        ),
    },
    json:{
        get: (data: any): Promise<any> => api.post<any>(
            '/api/json-data/hanzi-writer/get',
            data
        ),
    },
    // 积分兑换相关接口
    pointExchange: {
        // 获取商品列表
        listProducts: (data: any): Promise<any> => api.get<any>(
            '/api/point/product/list',
            data
        ),
        // 创建商品
        createProduct: (data: any): Promise<any> => api.post<any>(
            '/api/point/product',
            data
        ),
        // 更新商品
        updateProduct: (id: number, data: any): Promise<any> => api.put<any>(
            `/api/point/product/${id}`,
            data
        ),
        // 删除商品
        removeProduct: (id: number, groupId: number): Promise<any> => api.delete<any>(
            `/api/point/product/${id}`,
            { groupId }
        ),
        // 发起兑换
        exchange: (data: any): Promise<any> => api.post<any>(
            '/api/point/exchange',
            data
        ),
        // 查询兑换记录
        queryRecords: (data: any): Promise<any> => api.get<any>(
            '/api/point/exchange/records',
            data
        )
    }


}

export default apiTs