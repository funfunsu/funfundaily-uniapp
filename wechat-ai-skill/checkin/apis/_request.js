// SKILL 共享 HTTP 工具：在独立 JS 沙箱里跑，不能复用主小程序的 token/storage。
//
// 流程：
//   1. wx.login → POST /login {code} → 拿 accessToken（沙箱内缓存）
//   2. GET /api/group/list → 取第一个群组作为默认 groupId（沙箱内缓存）
//   3. 业务请求 = base + path，带 Authorization: Bearer <token>，body 自动注入 groupId
//
// 后端约定：CommonResponse = { code: "0", data: T, msg } —— 这里只解 data。
// 401 / 4010001 → 清 token 重新 login 一次再重试。

// dev/prod 切换：发布前手工改 BASE_URL；或在 mcp.json 提审材料里说明白名单。
const BASE_URL = 'https://api.funfundaily.com';
// const BASE_URL = 'http://localhost:8080'; // local debug

let cachedToken = null;
let cachedGroupId = null;
let inflightLogin = null;
let inflightGroup = null;

function rawRequest({ url, method, data, header }) {
  return new Promise((resolve, reject) => {
    wx.request({
      url,
      method: method || 'GET',
      data: data || {},
      header: Object.assign({ 'content-type': 'application/json' }, header || {}),
      success: (res) => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          resolve(res.data);
        } else {
          reject(new Error('HTTP ' + res.statusCode));
        }
      },
      fail: reject,
    });
  });
}

function login() {
  if (inflightLogin) return inflightLogin;
  inflightLogin = (async () => {
    try {
      const { code } = await new Promise((resolve, reject) => {
        wx.login({ success: resolve, fail: reject });
      });
      if (!code) throw new Error('wx.login 未返回 code');
      const body = await rawRequest({
        url: BASE_URL + '/login',
        method: 'POST',
        data: { code },
      });
      if (!body || body.code !== '0' || !body.data) {
        throw new Error('login 失败: ' + (body && body.msg));
      }
      cachedToken = body.data;
      return cachedToken;
    } finally {
      inflightLogin = null;
    }
  })();
  return inflightLogin;
}

async function ensureToken() {
  if (cachedToken) return cachedToken;
  return login();
}

async function ensureGroupId() {
  if (cachedGroupId) return cachedGroupId;
  if (inflightGroup) return inflightGroup;
  inflightGroup = (async () => {
    try {
      const token = await ensureToken();
      const body = await rawRequest({
        url: BASE_URL + '/api/group/list?t=' + Date.now(),
        method: 'GET',
        header: { Authorization: 'Bearer ' + token },
      });
      if (!body || body.code !== '0' || !Array.isArray(body.data) || body.data.length === 0) {
        throw new Error('当前账号还没有任何群组，请先在小程序里加入或创建一个家庭');
      }
      cachedGroupId = String(body.data[0].id);
      return cachedGroupId;
    } finally {
      inflightGroup = null;
    }
  })();
  return inflightGroup;
}

// 业务请求：自动注入 token + groupId（如果调用方没给）。
async function postAi(path, payload, isRetry = false) {
  const token = await ensureToken();
  const groupId = (payload && payload.groupId) || await ensureGroupId();
  const body = await rawRequest({
    url: BASE_URL + path,
    method: 'POST',
    data: Object.assign({}, payload || {}, { groupId }),
    header: { Authorization: 'Bearer ' + token },
  });
  if (body && body.code === '4010001' && !isRetry) {
    cachedToken = null;
    return postAi(path, payload, true);
  }
  if (!body || body.code !== '0') {
    const msg = (body && body.msg) || '请求失败';
    throw new Error(msg);
  }
  return body.data;
}

module.exports = { postAi, ensureGroupId, ensureToken };
