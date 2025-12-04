// utils/auth.uts

import apiTs from './apiTs'
import config from '../config/env'
import { setToken, getToken } from './token'

export async function autoLogin() : Promise<String> {
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
	const token = await apiTs.user.login(loginRes.code);
	console.log('Auto login success', token)
	setToken(token)
	return token
	// #endif

	// #ifndef MP-WEIXIN
	if (config.env === 'dev') {
		debugger
		const token = await apiTs.user.login("0e3duUFa1hjrMK0KtmFa1jmkmE1duUFg");
		console.log('Auto login success', token)
		setToken(token)
		return token
	}

	throw new Error('当前平台不支持')
	// #endif
}