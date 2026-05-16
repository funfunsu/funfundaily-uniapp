// 字符笔画数据本地查询占位实现。
//
// 历史上这里曾内嵌部分常用汉字的笔画数据；现在统一改为通过
// /api/json-data/hanzi-writer/get 后端接口加载完整字库
// （由 application-dev.yml 的 app.json.hanzi-writer-data.path 指向
// node_modules/hanzi-writer-data 目录）。
//
// 保留 getCharData 导出名以兼容 HanziStroke.vue 的引用：返回 null 时
// 组件会自动 fallback 到 apiTs.json.get(...)。
export function getCharData(_char) {
  return null;
}
