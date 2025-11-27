// utils/auth.uts

import apiTs from '@/utils/apiTs'
import config from '../config/env'
import { setToken, getToken } from '@/utils/token'

export async function autoLogin() : Promise<String> {
	const existingToken = getToken()
	if (existingToken) {
		return existingToken // 已登录，直接返回
	}
	// #ifdef MP-WEIXIN
	// 获取 code
	const loginRes = await uni.login()
	if (!loginRes.code) {
		throw new Error('获取 code 失败')
	}

	const token = await apiTs.user.login(loginRes.code);
	console.log('Auto login success', token)
	setToken(token)
	return token
	// #endif

	// #ifndef MP-WEIXIN
	if (config.env === 'dev') {
		const token = await apiTs.user.login("Test");
		console.log('Auto login success', token)
		setToken(token)
		return token
	}

	throw new Error('当前平台不支持')
	// #endif
}