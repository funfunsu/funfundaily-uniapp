// utils/api.ts
import request from './requestTs'
import { api } from './requestTs'
import {
  Schedule, ScheduleList, ScheduleListRequest, ScheduleInfoRequest, ScheduleAddRequest
} from '../types/schedule'
import {
  DiscoveryItem
} from '../types/discovery'
import {
  ApiResponse, ResponseData
} from '../types/type'
import {
  Point
} from '../types/point'

// 统一管理所有API接口
const apiTs = {
  // 用户相关接口
  user: {
    login: (code: string): Promise<any> => api.post(
      '/login',
      { 'code': code }
    )
  },
  discovery: {
    list: (): Promise<DiscoveryItem[]> => request({
      url: '/api/discovery/list',
      method: 'GET'
    })
  },

  // 日程相关接口
  schedule: {
    // 获取日程列表
    list: (data: ScheduleListRequest): Promise<ScheduleList[]> => api.get('/api/schedule/list', data),
    // 获取日程详情
    info: (data: ScheduleInfoRequest): Promise<Schedule> => api.get('/api/schedule/' + data.id, data),
    // 添加日程
    add: (data: ScheduleAddRequest): Promise<boolean> => api.post('/api/schedule/add', data),
    // 修改日程
    modify: (data: ScheduleAddRequest): Promise<boolean> => api.post('/api/schedule/modify', data)
  },
  // 积分相关接口
  point: {
    // 获取积分信息
    get: (data: any): Promise<Point> => request({
      url: '/api/point/get',
      method: 'GET',
      data
    })
  },
  
    group:{
        user:{
            list:(data) => request({
                url: '/api/group/user/list',
                method: 'GET',
                data
            }),
			// 获取任务列表
			add: (data) => request({
				url: '/api/group/user/add',
				method: 'POST',
				data
			}),
			// 获取任务列表
			remove: (data) => request({
				url: '/api/group/user/remove',
				method: 'POST',
				data
			}),
			// 获取任务列表
			modify: (data) => request({
				url: '/api/group/user/modify',
				method: 'POST',
				data
			})
        },
		list:(data) => request({
                url: '/api/group/list',
                method: 'GET',
                data
            }),
		add: (data) => request({
			url: '/api/group/add',
			method: 'POST',
			data
		}),
		modify: (data) => request({
			url: '/api/group/modify',
			method: 'POST',
			data
		}),
		info: (data) => request({
			url: '/api/group/info',
			method: 'GET',
			data
		}),
    },
  // 任务相关接口
  task: {
    // 获取任务列表
    list: (data: any): Promise<any> => request({
      url: '/api/task/list',
      method: 'GET',
      data
    }),
    // 获取任务详情
    info: (data: any): Promise<any> => request({
      url: '/api/task/info?id=' + data.id,
      method: 'GET',
      data
    }),
    // 添加任务
    add: (data: any): Promise<any> => request({
      url: '/api/task/add',
      method: 'POST',
      data
    }),
    // 修改任务
    modify: (data: any): Promise<any> => request({
      url: '/api/task/modify',
      method: 'POST',
      data
    }),
    // 获取任务历史记录
    history: (data: any): Promise<any> => request({
      url: '/api/task/history',
      method: 'GET',
      data
    }),
    // 完成任务打卡
    complete: (data: any): Promise<any> => request({
      url: '/api/task/complete',
      method: 'POST',
      data
    }),
    // 获取任务完成记录列表
    records: (data: any): Promise<any> => request({
      url: '/api/task/records',
      method: 'GET',
      data
    })
  }
}

export default apiTs