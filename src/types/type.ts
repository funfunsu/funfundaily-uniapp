
// 定义请求方法类型
export type RequestMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

// 定义请求请求选项接口
export interface RequestOptions {
  url: string
  method?: RequestMethod
  data?: any
  header?: {
    [key: string]: string
  }
}
// 定义响应数据接口
export interface ResponseData<T = any> {
  code: string
  message?: string
  data?: T
  [key: string]: any
}

// 定义响应数据接口
export interface ApiResponse<T = any> {
  code: string
  message?: string
  data?: T
  [key: string]: any
}

// 定义用户相关类型
export interface UserInfo {
  id: string
  username: string
  nickname: string
  avatar?: string
  email?: string
  phone?: string
  createdAt: string
  updatedAt: string
}

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  token: string
  userInfo: UserInfo
}

export interface UpdateUserInfoRequest {
  nickname?: string
  avatar?: string
  email?: string
  phone?: string
}

// 定义日程相关类型
export interface ScheduleItem {
  id: string
  title: string
  description?: string
  startTime: string
  endTime: string
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  userId: string
  groupId?: string
  createdAt: string
  updatedAt: string
}

export interface ScheduleListRequest {
  page?: number
  limit?: number
  date?: string
  groupId?: string
  status?: string
}

export interface ScheduleListResponse {
  list: ScheduleItem[]
  total: number
  page: number
  limit: number
}

export interface ScheduleInfoRequest {
  id: string
}

export interface ScheduleInfoResponse {
  schedule: ScheduleItem
}

export interface CreateScheduleRequest {
  title: string
  description?: string
  startTime: string
  endTime: string
  groupId?: string
}

export interface UpdateScheduleRequest extends CreateScheduleRequest {
  id: string
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled'
}

// 定义群组相关类型
export interface GroupItem {
  id: string
  name: string
  description?: string
  avatar?: string
  creatorId: string
  createdAt: string
  updatedAt: string
}

export interface GroupListRequest {
  page?: number
  limit?: number
}

export interface GroupListResponse {
  list: GroupItem[]
  total: number
  page: number
  limit: number
}

export interface GroupInfoRequest {
  id: string
}

export interface GroupInfoResponse {
  group: GroupItem
  memberCount: number
}

export interface CreateGroupRequest {
  name: string
  description?: string
  avatar?: string
}

export interface UpdateGroupRequest extends CreateGroupRequest {
  id: string
}

// 定义群组成员相关类型
export interface GroupMemberItem {
  id: string
  groupId: string
  userId: string
  username: string
  nickname: string
  avatar?: string
  role: 'admin' | 'member'
  joinedAt: string
}

export interface GroupMemberListRequest {
  groupId: string
  page?: number
  limit?: number
}

export interface GroupMemberListResponse {
  list: GroupMemberItem[]
  total: number
  page: number
  limit: number
}

export interface AddGroupMemberRequest {
  groupId: string
  userIds: string[]
}

export interface RemoveGroupMemberRequest {
  groupId: string
  userId: string
}

export interface UpdateGroupMemberRequest {
  groupId: string
  userId: string
  role: 'admin' | 'member'
}

// 定义任务相关类型
export interface TaskItem {
  id: string
  title: string
  description?: string
  scheduleId?: string
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  priority: 'low' | 'medium' | 'high'
  userId: string
  groupId?: string
  dueTime?: string
  createdAt: string
  updatedAt: string
}

export interface TaskListRequest {
  page?: number
  limit?: number
  date?: string
  groupId?: string
  status?: string
  priority?: string
}

export interface TaskListResponse {
  list: TaskItem[]
  total: number
  page: number
  limit: number
}

export interface TaskInfoRequest {
  id: string
}

export interface TaskInfoResponse {
  task: TaskItem
}

export interface CreateTaskRequest {
  title: string
  description?: string
  scheduleId?: string
  priority: 'low' | 'medium' | 'high'
  groupId?: string
  dueTime?: string
}

export interface UpdateTaskRequest extends CreateTaskRequest {
  id: string
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled'
}

// 定义任务历史记录类型
export interface TaskHistoryItem {
  id: string
  taskId: string
  action: 'create' | 'update' | 'complete' | 'cancel'
  content: string
  operatorId: string
  operatorName: string
  createdAt: string
}

export interface TaskHistoryRequest {
  taskId: string
  page?: number
  limit?: number
}

export interface TaskHistoryResponse {
  list: TaskHistoryItem[]
  total: number
  page: number
  limit: number
}

// 定义任务完成记录类型
export interface TaskRecordItem {
  id: string
  taskId: string
  userId: string
  username: string
  nickname: string
  avatar?: string
  createTime: string
  status: 'completed' | 'missed'
}

export interface TaskRecordsRequest {
  date?: string
  taskId?: string
  userId?: string
  page?: number
  limit?: number
}

export interface TaskRecordsResponse {
  list: TaskRecordItem[]
  total: number
  page: number
  limit: number
}

export interface CompleteTaskRequest {
  taskId: string
  remark?: string
}
