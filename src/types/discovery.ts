// 日程
export interface DiscoveryItem {
    id: string
    itemTitle: string
    itemType?: string
	uri: string
	status:'inactive' | 'active'
}


export interface DiscoveryListRequest{
}