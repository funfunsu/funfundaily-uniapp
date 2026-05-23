export const performRedirect = (redirectPath: string | null | undefined, defaultUrl: string = '/pages/tabBar/task') => {
  let targetUrl = defaultUrl;

  if (redirectPath) {
    targetUrl = redirectPath;
  }

  // tabBar 页用 switchTab，且不支持带 query，需去掉参数；
  // 其它页面（如邀请函 preview）必须保留 query，否则会丢失 token 等深链参数。
  if (targetUrl.includes('/tabBar/')) {
    uni.switchTab({ url: targetUrl.split('?')[0] });
  } else {
    uni.redirectTo({ url: targetUrl });
  }
};

// 压栈式跳转：与 performRedirect 一致地处理 tabBar 页（switchTab），
// 但普通页用 navigateTo 压栈，保留返回上一页的能力（如「更多」页进入子页后可返回）。
export const performNavigate = (path: string | null | undefined, defaultUrl: string = '/pages/tabBar/task') => {
  const targetUrl = path || defaultUrl;

  if (targetUrl.includes('/tabBar/')) {
    uni.switchTab({ url: targetUrl.split('?')[0] });
  } else {
    uni.navigateTo({ url: targetUrl });
  }
};
