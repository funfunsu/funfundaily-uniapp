export interface InvitationTemplate {
  id?: number
  groupId?: number
  createdBy?: number
  userId?: number
  // direction: sent=我发出的, received=我收到的
  direction?: 'sent' | 'received'
  // 收到记录指向的原「发出邀请」id（发出记录为 0）
  parentId?: number
  title: string
  // 活动开始 / 结束时间，格式 "yyyy-MM-dd HH:mm"
  startTime: string
  endTime: string
  address: string
  body: string
  cardStyle?: string
  signature?: string
  recipientName?: string
  // 变更记录（仅收到记录可能有值）
  changes?: InvitationChange[]
}

export interface InvitationChange {
  changeTime?: string
  summary?: string
  startTime?: string
  endTime?: string
  location?: string
}

export interface InvitationShareContent {
  // 原「发出邀请」的 schedule_item id，受邀人「收下」时回传给后端建立 parentId 关联
  invitationId?: number
  title: string
  startTime: string
  endTime: string
  address: string
  body: string
  recipientName: string
  cardStyle?: string
  signature?: string
}

export interface InvitationShareResponse {
  creatorNickname: string
  data: InvitationShareContent
}
