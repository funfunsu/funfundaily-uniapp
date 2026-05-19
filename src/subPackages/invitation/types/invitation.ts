export interface InvitationTemplate {
  id?: number
  groupId?: number
  createdBy?: number
  title: string
  eventTime: string
  address: string
  body: string
  cardStyle?: string
}

export interface InvitationShareContent {
  title: string
  eventTime: string
  address: string
  body: string
  recipientName: string
  cardStyle?: string
}

export interface InvitationShareResponse {
  creatorNickname: string
  data: InvitationShareContent
}
