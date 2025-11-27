// // mock/dataMap.js
// // 静态导入所有 mock 数据，适合数据量不大的场景
// import loginData from './user/login.json';
// import infoData from './user/info.json';
// import scheduleList from './schedule/list.json';
// import scheduleInfo from './schedule/info.json';
// import groupUserList from './group/user/list.json';
// import groupList from './group/list.json';
// import groupInfo from './group/info.json';
// import taskList from './task/list.json';
// import taskInfo from './task/info.json';
// import taskRecords from './task/records.json';
// import taskHistory from './task/history.json';
// import modify from './modify.json';
// import add from './add.json';
// import pointGet from './point/get.json';
// import discoveryList from './discovery/list.json';
//
// // 生成最近7天的日程数据
// function generateRecent7DaysSchedule() {
//     const result = [];
//     const today = new Date();
//     const d = new Date(today);
//     const day = d.getDay();
//     const diff = d.getDate() - day + (day === 0 ? -6 : 1); // 调整周日的情况
//     const startDay = new Date(d.setDate(diff));
//
//     // 生成最近7天的日期
//     for (let i = 0; i < 7; i++) {
//         const date = new Date(startDay);
//         date.setDate(date.getDate() + i);
//         const dateStr = date.toISOString().split('T')[0];
//
//         // 添加日期和对应的日程数据，确保安全访问scheduleList
//         result.push({
//             date: dateStr,
//             schedules: (scheduleList[i] && scheduleList[i].schedules) || []
//         });
//     }
//
//     return result;
// }
//
// // 导出API映射
// export default {
//     '/api/user/login': loginData,
//     '/api/user/info': infoData,
//     '/api/schedule/list': generateRecent7DaysSchedule(),
//     '/api/schedule/info': scheduleInfo,
//     '/api/schedule/add': add,
//     '/api/schedule/modify': modify,
//     '/api/group/user/list': groupUserList,
//     '/api/group/user/add': add,
//     '/api/group/user/remove': modify,
//     '/api/group/list': groupList,
//     '/api/group/info': groupInfo,
//     '/api/group/modify': modify,
//     '/api/group/add': add,
//     '/api/task/list': taskList,
//     '/api/task/info': taskInfo,
//     '/api/task/add': add,
//     '/api/task/modify': modify,
//     '/api/task/records': taskRecords,
//     '/api/task/history': taskHistory,
//     '/api/point/get': pointGet,
//     '/api/discovery/list': discoveryList
// };
//
//
