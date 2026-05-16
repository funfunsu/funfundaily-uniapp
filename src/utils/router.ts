export const performRedirect = (redirectPath: string | null | undefined, defaultUrl: string = '/pages/tabBar/task') => {
  let targetUrl = defaultUrl;
  
  if (redirectPath) {
    targetUrl = redirectPath.split('?')[0];
  }
  
  if (targetUrl.includes('tabBar')) {
    uni.switchTab({ url: targetUrl });
  } else {
    uni.redirectTo({ url: targetUrl });
  }
};
