// utils/api.js
import request from './request.js'

// 统一管理所有API接口
export default {
    // 用户相关接口
    user: {
        // 登录
        login: (data) => request({
            url: '/api/user/login',
            method: 'POST',
            data
        }),

        // 获取用户信息
        getInfo: () => request({
            url: '/api/user/info',
            method: 'GET'
        }),

        // 修改用户信息
        updateInfo: (data) => request({
            url: '/api/user/info',
            method: 'PUT',
            data
        })
    },
	schedule:{
		list:(data) => request({
            url: '/api/schedule/list',
            method: 'GET',
            data
        }),
		info:(data) => request({
            url: '/api/schedule/info?id='+data.id,
            method: 'GET',
            data
        }),
		// 获取任务列表
		add: (data) => request({
			url: '/api/schedule/add',
			method: 'POST',
			data
		}),
		// 获取任务列表
		modify: (data) => request({
			url: '/api/schedule/modify',
			method: 'POST',
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
        list: (data) => request({
            url: '/api/task/list',
            method: 'GET',
            data
        }),
		info:(data) => request({
            url: '/api/task/info?id='+data.id,
            method: 'GET',
            data
        }),
        // 获取任务列表
        add: (data) => request({
            url: '/api/task/add',
            method: 'POST',
            data
        }),
        // 获取任务列表
        modify: (data) => request({
            url: '/api/task/modify',
            method: 'POST',
            data
        }),
        // 获取任务列表
        history: (data) => request({
            url: '/api/task/history',
            method: 'GET',
            data
        }),
        
        // 完成任务打卡
        complete: (data) => request({
            url: '/api/task/complete',
            method: 'POST',
            data
        }),
        
        // 获取任务完成记录
        records: (data) => request({
            url: '/api/task/records',
            method: 'GET',
            data
        })
    }
}