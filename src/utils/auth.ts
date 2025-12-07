// utils/auth.uts

import apiTs from './apiTs'
import config from '../config/env'
import { setToken, getToken } from './token'

export async function autoLogin(shareToken) : Promise<String> {
	const existingToken = getToken()
	if (existingToken) {
		return existingToken // 已登录，直接返回
	}
	// #ifdef MP-WEIXIN
	// 获取 code
	const loginRes = await uni.login({ provider: 'weixin' })
	if (!loginRes.code) {
		throw new Error('获取 code 失败')
	}
	console.log('Auto login success', loginRes.code)
	const  data = {'code': loginRes.code,'shareToken':shareToken}
	const token = await apiTs.user.login(data);
	console.log('Auto login success', token)
	setToken(token)
	return token
	// #endif

	// #ifndef MP-WEIXIN
	if (config.env === 'dev') {
		const  data = {'code': "Test3",'shareToken':shareToken}
		const token = await apiTs.user.login(data);
		console.log('Auto login success', token)
		setToken(token)
		return token
	}

	throw new Error('当前平台不支持')
	// #endif
}