// 发现页条目
export interface DiscoveryItem {
    id: string
    itemTitle: string
    itemType?: string
	uri: string
	status:'inactive' | 'active'
	/** 分类标识，「更多」页按它分组展示，如 积分中心 / 家庭财务 / 学习成长 / 生活工具。 */
	category?: string
	/** 展示图标（emoji），缺省时回退到标题首字。 */
	icon?: string
}


export interface DiscoveryListRequest{
}