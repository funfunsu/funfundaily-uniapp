// utils/request.ts
import config from '../config/env'
import mock from '../mock/mockTs'
import {getToken } from '../utils/token'

import { ResponseData, RequestOptions, ApiResponse } from '../types/type'



// 定义请求配置接口
interface RequestConfig {
	requestInterceptor : (options : RequestOptions) => RequestOptions
	responseInterceptor : <T = any>(response : ResponseData<T>) => ResponseData<T>
}
let isRedirectingToLogin = false; // 防重

// 创建请求实例的配置
const requestConfig : RequestConfig = {
	// 请求拦截器
	requestInterceptor: (options : RequestOptions) : RequestOptions => {
		console.log('请求拦截器:', options)

		// 1. 可以在这里统一添加 Token
		const token = getToken()
		if (token) {
			options.header = options.header || {}
			options.header.Authorization = `Bearer ${token}`
		}

		// 2. 可以在这里添加公共参数
		if (options.method === 'GET') {
			options.data = options.data || {}
			options.data.t = Date.now() // 添加时间戳防止缓存
		}

		return options
	},

	// 响应拦截器
	responseInterceptor: <T = any>(response : ApiResponse<T>) : ApiResponse<T> => {
		console.log('响应拦截器:', response)

		// 1. 统一处理错误码
		if (response.code !== "0") {
			// 例如：Token过期，需要重新登录
			if (response.code === "4010001") {
				if (!isRedirectingToLogin) {
					isRedirectingToLogin = true;
					uni.clearStorageSync();

					const pages = getCurrentPages();
					if (pages.length > 0) {
						const currentPage = pages[pages.length - 1];
						const route = currentPage.route;
						const options = currentPage.options || {};

						// 构造完整路径用于跳回
						const queryStr = Object.keys(options)
							.map(k => `${k}=${encodeURIComponent(options[k])}`)
							.join('&');
						const currentFullPath = `/${route}` + (queryStr ? '?' + queryStr : '');

						// 跳转到登录页，并携带 redirect 参数
						uni.redirectTo({
							url: `/pages/index/index?redirect=${encodeURIComponent(currentFullPath)}`,
							fail: () => {
								// 如果 redirectTo 失败（比如已经在登录页），直接去登录页
								uni.reLaunch({url: '/pages/index/index'});
							},
							complete: () => {
								// 不要重置 isRedirectingToLogin，避免短时间内多次跳转
								// 可选：3秒后自动解锁（防极端情况）
								setTimeout(() => {
									isRedirectingToLogin = false;
								}, 3000);
							}
						});
					} else {
						uni.reLaunch({url: '/pages/index/index'});
					}
				}
			}

			// 2. 统一抛出错误信息
			const error = new Error(response.message || '请求失败') as Error & { response ?: ApiResponse<T> }
			error.response = response
			throw error
		}

		return response
	}
}



// 定义请求函数
export default function request<T = any>(options : RequestOptions) : Promise<T> {
	// 1. 执行请求拦截器
	const processedOptions = requestConfig.requestInterceptor(options)
	// 处理 URL
	const url = !config.mock
		? `${config.baseUrl.prod}${processedOptions.url}`
		: processedOptions.url

	// Mock 环境下直接返回模拟数据
	if (config.mock) {
		console.log('Mock 请求')
		const mockResult = mock.mockRequest(url, processedOptions) as ResponseData<T>
		return Promise.resolve(mockResult.data)
	}

	// 生产环境下发起真实请求
	return new Promise((resolve, reject) => {
		uni.request({
			url: url,
			method: processedOptions.method || 'GET',
			data: processedOptions.data || {},
			header: processedOptions.header || {
				'content-type': 'application/json'
			},
			success: (res) => {
				if (res.statusCode === 200 || res.statusCode === 201 ) {
					try {
						// 执行响应拦截器
						const processedResponse : ApiResponse<T> = requestConfig.responseInterceptor<T>(res.data)
						resolve(processedResponse.data)
					} catch (error) {
						reject(error)
					}
				} else {
					reject(new Error(`HTTP Error: ${res.statusCode}`))
				}
			},
			fail: (err) => {
				reject(err)
			}
		})
	})
}


// 定义便捷的请求方法
export const api = {
	get: <T = any>(url : string, data ?: any, header ?: any) : Promise<T> => {
		return request<T>({ url, method: 'GET', data, header })
	},

	post: <T = any>(url : string, data ?: any, header ?: any) : Promise<T> => {
		return request<T>({ url, method: 'POST', data, header })
	},

	put: <T = any>(url : string, data ?: any, header ?: any) : Promise<T> => {
		return request<T>({ url, method: 'PUT', data, header })
	},

	delete: <T = any>(url : string, data ?: any, header ?: any) : Promise<T> => {
		return request<T>({ url, method: 'DELETE', data, header })
	},

	patch: <T = any>(url : string, data ?: any, header ?: any) : Promise<T> => {
		return request<T>({ url, method: 'PATCH', data, header })
	}
}