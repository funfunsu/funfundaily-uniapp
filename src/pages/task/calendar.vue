<template>
  <view class="page-container">
    <!-- 任务日历组件：直接引入即可 -->
    <task-calendar :task-list="taskData" @dateSelected="handleDateSelected"
                   @monthChange="handleMonthChange"
    />
    <task-list-container
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
import TaskUtil from "../../utils/taskUtil";

const listShow = ref(true)
const currentMember = ref({}); // 使用 ref
const currentGroup = ref({});// 使用 ref
const currentDateToMonth = ref(new Date());
const currentDate =  ref(new Date())

const mode = ref('normal');
const selectedTaskIds = ref(new Set());

const taskList = ref([]) // Task[] 类型会自动推断
// ✅ 模拟任务数据：格式固定【date:YYYY-MM-DD, count:数字】
const taskData = ref([])

const handleDateSelected = (selectedDate) => {
  console.log('日历选中的日期：', selectedDate)
  currentDate.value = new Date(selectedDate.date);
  updateTaskList()
}

const updateTaskList = ()=>{
  const targetItem = taskData.value.find(item => item.date === DateUtils.formatDate(currentDate.value))
  taskList.value = targetItem?.schedules.filter(item => TaskUtil.isTaskUndo(item,currentDate.value)).sort((a, b) => {return TaskUtil.sortTaskToShow(a,b) })

  const itemKeyList = taskList.value.map(task => task.showExtra.itemKey);
  fetchCheckinRecordList(itemKeyList)
}

async function fetchCheckinRecordList(itemKeyList) {
  if (!itemKeyList.length) return
  const req = { targetUserId: currentMember.value.userId, groupId: currentGroup.value.id, taskKeys: itemKeyList }
  const records = await apiTs.checkin.listV2(req)
  const recordMap = new Map()
  records.forEach((r) => {
    const taskKey = r.taskKey ? r.taskKey : r.taskId
    if (recordMap.has(taskKey)) {
      const existR = recordMap.get(taskKey)
      if (r.extra.count > existR.extra.count) recordMap.set(taskKey, r)
    } else recordMap.set(taskKey, r)
  })
  taskList.value.forEach(task => {
    const record = recordMap.get(task.showExtra.itemKey)

    task.isCompleted = record? record.extra.count >= task.extra.totalCount : false;
    task.completedTime = record ? record.completeTime : null
    task.recordExtra = record ? record.extra : {}
  })
}

// ✅ ✅ ✅ 2. 新增：接收日历月份/年份变化的通知
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

    const res = await apiTs.checkin.task.list(requestData);

    taskData.value = res.map(item => ({
      date: item.date,
      count: item.schedules?.filter(s => TaskUtil.isTaskUndo(s,new Date(item.date))).length || 0,
      dueCount: item.schedules?.filter(s => s.showExtra.dueDate === item.date && TaskUtil.isTaskUndo(s,new Date(item.date))).length || 0,
      schedules:item.schedules
    }))
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