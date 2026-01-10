// utils/auth.uts (修改或新增)

import apiTs from './apiTs'
import config from '../config/env'
import {setToken, getToken, getShareToken} from './token'
import DateUtils from "./util"; // 路径请根据实际情况调整


// 原有的 autoLogin，只使用 code 登录 (可选)
export async function autoLogin(shareToken): Promise<String> {
	const existingToken = getToken()
	if (existingToken) {
		return existingToken // 已登录，直接返回
	}
	if (!shareToken){
		shareToken = getShareToken();
	}
	// #ifdef MP-WEIXIN
	try {
		console.log("开始调用 uni.login (仅用于 autoLogin)...");
		const loginResult = await uni.login({ provider: 'weixin' });
		console.log("uni.login (autoLogin) 返回结果:", loginResult);

		if (!loginResult || !loginResult.code) {
			const errorMsg = loginResult?.errMsg ? `登录失败: ${loginResult.errMsg}` : '获取 code 失败';
			console.error(errorMsg);
			throw new Error(errorMsg);
		}
		const code = loginResult.code;
		console.log('autoLogin 成功获取到 code:', code);

		// 仅使用 code 登录，不获取用户信息
		const data = { 'code': code, 'shareToken': shareToken }; // 不包含 nickName, avatarUrl
		const token = await apiTs.user.login(data);
		console.log('autoLogin 成功，获取到 token:', token);
		setToken(token);
		return token;

	} catch (error) {
		console.error("autoLogin (仅 code) 过程中发生错误:", error);
		throw error;
	}
	// #endif

	// #ifndef MP-WEIXIN
	if (config.env === 'dev') {
		const data = { 'code': "Test3", 'shareToken': shareToken };
		data.code = DateUtils.getDayStartTimeStr(new Date(2026,1,9));
		const token = await apiTs.user.login(data);
		console.log('Dev Auto login success', token);
		setToken(token);
		return token;
	}
	throw new Error('当前平台不支持');
	// #endif
}