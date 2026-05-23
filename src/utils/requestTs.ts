// utils/request.ts
import config from '../config/env'
import mock from '../mock/mockTs'
import {getToken, getShareToken, removeToken } from '../utils/token'
import { autoLogin } from '../utils/auth'

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
	requestInterceptor: (options: RequestOptions): RequestOptions => {
		console.log('请求拦截器:', options)

		// 1. 可以在这里统一添加 Token
		const token = getToken()
		if (token) {
			options.header = options.header || {}
			options.header.Authorization = `Bearer ${token}`
		}

		const shareToken = getShareToken();
		console.log('请求拦截器shareToken:', shareToken)
		if (shareToken) {
			options.header = options.header || {}
			options.header['x-fun-sharetoken'] = `${shareToken}`
		}

		// 2. 可以在这里添加公共参数
		if (options.method === 'GET') {
			options.data = options.data || {}
			options.data.t = Date.now() // 添加时间戳防止缓存
		}

		return options
	},

	// 响应拦截器
	responseInterceptor: <T = any>(response: ApiResponse<T>): ApiResponse<T> => {
		console.log('响应拦截器:', response)

		// 1. 统一处理错误码
		if (response.code !== "0") {
			// Token 过期：正常情况下已在 request() 里被静默重登 + 自动重试拦截，
			// 走到这里说明重登后仍 401（极少见），兜底回退到登录页（只清失效 token）。
			if (response.code === "4010001") {
				redirectToLogin();
				const error = new Error('登录已过期，请重新登录') as Error & { response?: ApiResponse<T> }
				error.response = response
				throw error
			} else {
				// 使用 .catch 捕获潜在错误
				uni.showToast({
					title: `${response.code}:${response.message}`, // 加前缀方便识别
					icon: 'none',
					duration: 3000
				}).then(() => {
				}).catch((err) => {
					console.error('uni.showToast 调用失败:', err); // *** 非常重要的日志 ***
				});

				// 2. 统一抛出错误信息
				const error = new Error(response.message || '请求失败') as Error & { response?: ApiResponse<T> }
				error.response = response
				throw error
			}
		}
		return response
	}
}


// 静默重新登录：并发的多个 401 共享同一次重登，避免重复 uni.login。
// 只移除失效的 access token，保留群组 / 成员 / 分享 token 等上下文，重登后无需重新选择。
let reLoginPromise : Promise<string | null> | null = null;
function silentReLogin() : Promise<string | null> {
	if (!reLoginPromise) {
		reLoginPromise = (async () => {
			try {
				removeToken();
				const token = await autoLogin(null);
				return (token as unknown as string) || null;
			} catch (e) {
				console.error('静默重新登录失败:', e);
				return null;
			} finally {
				reLoginPromise = null;
			}
		})();
	}
	return reLoginPromise;
}

// 兜底：静默重登失败时才回退到登录页，并带上当前页路径用于回跳。
// 这里同样只清失效 token，不再 clearStorageSync 清空全部本地数据。
function redirectToLogin() : void {
	if (isRedirectingToLogin) return;
	isRedirectingToLogin = true;
	removeToken();

	const pages = getCurrentPages();
	if (pages.length > 0) {
		const currentPage : any = pages[pages.length - 1];
		const route = currentPage.route;
		const options = currentPage.options || {};

		// 构造完整路径用于跳回
		const queryStr = Object.keys(options)
			.map(k => `${k}=${encodeURIComponent(options[k])}`)
			.join('&');
		const currentFullPath = `/${route}` + (queryStr ? '?' + queryStr : '');

		uni.redirectTo({
			url: `/pages/index/index?redirect=${encodeURIComponent(currentFullPath)}`,
			fail: () => {
				// 如果 redirectTo 失败（比如已经在登录页），直接去登录页
				uni.reLaunch({ url: '/pages/index/index' });
			},
			complete: () => {
				// 3 秒后自动解锁，防极端情况
				setTimeout(() => { isRedirectingToLogin = false; }, 3000);
			}
		});
	} else {
		uni.reLaunch({ url: '/pages/index/index' });
	}
}


// 定义请求函数
export default function request<T = any>(options : RequestOptions, isRetry = false) : Promise<T> {
	// 1. 执行请求拦截器
	const processedOptions = requestConfig.requestInterceptor(options)
	// 处理 URL
	const url = !config.mock
		? `${config.baseUrl}${processedOptions.url}`
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
			success: async (res) => {
				if (res.statusCode === 200 || res.statusCode === 201 ) {
					const body = res.data as ApiResponse<T>
					// access token 过期：静默重登并自动重试一次，避免跳登录页、也不清空其它本地数据。
					if (body && body.code === "4010001" && !isRetry) {
						const newToken = await silentReLogin();
						if (newToken) {
							try {
								resolve(await request<T>(options, true))
							} catch (e) {
								reject(e)
							}
						} else {
							// 静默重登失败（如 uni.login 异常）才回退到登录页
							redirectToLogin();
							reject(new Error('登录已过期，请重新登录'))
						}
						return
					}
					try {
						// 执行响应拦截器
						const processedResponse : ApiResponse<T> =  await requestConfig.responseInterceptor<T>(body)
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