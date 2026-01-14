<template>
  <view class="page-container">
    <!-- 任务日历组件：直接引入即可 -->
    <task-calendar :task-list="calendarData" @dateSelected="handleDateSelected"
                   @monthChange="handleMonthChange"
    />
    <task-card v-if="curTask" mode="taskReadonly" :task="curTask">
    </task-card>
    <task-list-container v-else
        v-show="listShow"
        :task-list="taskList"
        :mode="mode"
        :current-date="currentDate"
        :selected-task-ids="selectedTaskIds"
        :current-member="currentMember"
        @check-task="onTaskCheck"
        @delay-click="onTaskDelay"
    />
    <schedule-bottom-bar
        @member-change="handleMemberChange"
        :buttons = "buttons"
        @buttonClick ="handleButtonClick"
    />
  </view>
</template>

<script setup>
import {onMounted, ref} from 'vue'
// 引入日历组件
import TaskCalendar from '../../components/fun-components/task-calendar.vue'
import ScheduleBottomBar from "../../components/schedule-bottom-bar.vue";
import DateUtils from "../../utils/util";
import apiTs from "../../utils/apiTs";
import TaskCard from "../../components/task/task-card.vue";
import TaskListContainer from "../../components/task/task-list-container.vue";
import {onLoad} from "@dcloudio/uni-app";

const listShow = ref(true)
const currentMember = ref({}); // 使用 ref
const currentGroup = ref({});// 使用 ref
const currentDateToMonth = ref(new Date());
const currentDate =  ref(new Date())
const buttons = ref([]);


const mode = ref('checkinReadonly');
const selectedTaskIds = ref(new Set());

const taskList = ref([]) // Task[] 类型会自动推断
const calendarData = ref([])
const curTask = ref();
const curTaskId = ref();


// --- 生命周期 ---
// onLoad 是 uni-app 特有的，需要从 @dcloudio/uni-app 导入
onLoad((query) => {
  if (query && query.taskId) {
    curTaskId.value = query.taskId
    initCurTask(query.taskId)
    buttons.value = [{ code: 'modify', text: '修改此任务' }];
  }
});


const handleButtonClick = (buttonCode) => {
  switch (buttonCode){
    case 'modify':
      if (!curTask.value || !curTask.value.id){
        return;
      }
      uni.navigateTo({ url: `/pages/task/edit?id=${curTask.value.id}` });
      return;
  }
};

const initCurTask = async (taskId) => {
  const req = {
    taskIds: [taskId]
  }

  const resp = await apiTs.checkin.task.list(req);
  curTask.value = resp.length>0?resp[0]:null
}

const handleDateSelected = (selectedDate) => {
  console.log('日历选中的日期：', selectedDate)
  currentDate.value = new Date(selectedDate.date);
  updateTaskList()
}

const updateTaskList = ()=>{
  const targetItem = calendarData.value.find(item => item.date === DateUtils.formatDate(currentDate.value))
  // todo targetItem?.schedules  转成 taskList.value 期望的格式
  let filterSchedules = targetItem?.schedules || []

  // ✅ 第一步：核心过滤逻辑 - 相同taskKey 保留 taskTime 最大(最新)的一条
  if(filterSchedules.length > 0) {
    const taskKeyMap = {}
    filterSchedules.forEach(item => {
      // 拿到当前项的taskKey和taskTime
      const currKey = item.taskKey
      const currTime = item.completeTime
      // 规则：没有该key || 有该key但当前项的taskTime更大 → 覆盖
      if (!taskKeyMap[currKey] || new Date(currTime) > new Date(taskKeyMap[currKey].completeTime)) {
        taskKeyMap[currKey] = item
      }
    })
    // 把去重后的对象转成数组
    filterSchedules = Object.values(taskKeyMap)
  }

  // ✅ 第二步：过滤后的数据，执行格式转换 赋值给taskList
  taskList.value = filterSchedules.map(item => ({
    id: item.id,
    itemTitle: item.extra?.title,
    isCompleted: false,
    completedTime: item.completeTime,
    recordExtra: { count: item.extra?.count  },
    extra: {
      score: item.extra?.score || 0,
      taskType: item.extra?.taskType || 'Habit',
      totalCount: item.extra?.totalCount || 1
    }
  })) || []
}

const handleMonthChange = (dateInfo) => {
  console.log('✅ 月份发生变化：', dateInfo)
  // 固定格式：{ year: 2026, month: 1 } 都是数字类型，直接使用！
  const { year, month } = dateInfo
  // 这里可以写你的业务逻辑：比如 根据最新年月，请求对应月份的任务数据
  console.log('当前日历展示：', year, '年', month, '月')
  currentDateToMonth.value = new Date(year, month - 1, 1)
  fetchScheduleData()
}


const onTaskDelay = async (task) => {
  taskList.value = taskList.value.filter(item => item.id !== task.id)
}

const onTaskCheck = ({task, completed}) => {
  if (completed) pointBalance.value = pointBalance.value + Number(task.extra?.score || 0)
}


const handleMemberChange = (e) => { // 移除了类型注解
                                    // 修改 ref 的值需要 .value
  currentMember.value = e.currentMember;
  currentGroup.value = e.currentGroup;
  console.log(currentGroup.value, currentMember.value); // 访问 ref 的值
  fetchScheduleData()
};

async function fetchScheduleData() {
  try {
    if (!currentMember.value.userId || !currentGroup.value.id){
      return
    }
    const requestData = {
      fromDate: DateUtils.getDayStartTimeStr(DateUtils.getFirstDayOfMonth(currentDateToMonth.value)),
      toDate: DateUtils.getDayStartTimeStr(DateUtils.getFirstDayOfNextMonth(currentDateToMonth.value)),
    };

    if (currentGroup.value && currentGroup.value.id){
      requestData.groupId = currentGroup.value.id;
    }

    if (currentMember.value && currentMember.value.userId){
      requestData.targetUserId = currentMember.value.userId;
    }
    if ( curTaskId.value){
      requestData.taskId = curTaskId.value
    }

    const originArr = await apiTs.checkin.list(requestData);

    const groupMap = {};
    originArr.forEach(item => {
      if (!item?.taskTime) return; // 容错：过滤taskTime为空/不存在的脏数据
      const date = item.taskTime.split('T')[0]; // 切割出 2026-01-10 纯日期
      if (!groupMap[date]) {
        groupMap[date] = [];
      }
      groupMap[date].push(item);
    });
    calendarData.value = Object.keys(groupMap).map(date => ({
      date: date,
      dueCount: groupMap[date]?.length || 0,
      schedules:groupMap[date]
    }));
    updateTaskList()
  } catch (e) {
    console.error('获取日程信息失败:', e);
    // 可以在这里添加用户提示，比如 uni.showToast
  }
}

onMounted(() => { })
</script>

<style scoped>
.page-container {
  padding: 20rpx;
  background-color: #f5f5f5;
  min-height: 100vh;
}
</style>