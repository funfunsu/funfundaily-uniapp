// src/utils/storageManager.ts

/**
 * 定义所有使用的存储键名，方便集中管理和避免拼写错误
 */
export const STORAGE_KEYS = {
    GROUP_LIST: 'cached_group_list',
    MEMBER_LIST: 'cached_group_member_list',
    CURRENT_GROUP: 'cached_current_group',
    CURRENT_MEMBER: 'cached_current_member',
    USER_INFO:'cached_user_info',
    REFRESH_TAB:'cached_refresh_tab',
    POINT_PRODUCT_LIST:'point_product_list',
    //缓存的日程时长-分钟
    SCHEDULE_CACHED_DURATION:'schedule_item_cached_duration',
    SCHEDULE_REPEAT_CACHED_DURATION:'schedule_repeat_cached_duration',
    USER_ALL_GOAL:'USER_ALL_GOAL',
    // 可以在这里添加更多键名...
} as const; // 使用 'as const' 使键值成为字面量类型，增强类型安全性

/**
 * 安全地从存储中获取并解析 JSON 数据
 * @param key 存储键名
 * @returns 解析后的数据，如果失败或无数据则返回 null
 */
export function getStoredData<T>(key: string): T | null {
    try {
        // 尝试从 uni-app 存储获取
        const storedValue = uni.getStorageSync(key);
        if (storedValue !== '') { // uni.getStorageSync 对于不存在的 key 返回空字符串 ''
            return JSON.parse(storedValue);
        }
    } catch (e) {
        console.warn(`[StorageManager] Failed to parse stored data for key: ${key}`, e);
    }
    return null;
}

export function getStoredKey(prefix:string,key:string) : string{
    return `${prefix}-${key}`;
}

/**
 * 安全地将数据序列化为 JSON 字符串并存储
 * @param key 存储键名
 * @param data 要存储的数据（必须可被 JSON 序列化）
 */
export function setStoredData<T>(key: string, data: T): void {
    try {
        const serializedData = JSON.stringify(data);
        uni.setStorageSync(key, serializedData);
    } catch (e) {
        console.error(`[StorageManager] Failed to store data for key: ${key}`, e);
    }
}

/**
 * 从存储中移除指定键名的数据
 * @param key 存储键名
 */
export function removeStoredData(key: string): void {
    try {
        uni.removeStorageSync(key);
    } catch (e) {
        console.error(`[StorageManager] Failed to remove stored data for key: ${key}`, e);
    }
}

/**
 * 从存储中移除指定键名的数据
 * @param key 存储键名
 */
export function removeStoredDataByKeys(prefix: string,key :string): void {
    try {
        uni.removeStorageSync(getStoredKey(prefix,key));
    } catch (e) {
        console.error(`[StorageManager] Failed to remove stored data for key: ${key}`, e);
    }
}

// 如果需要更高级的功能，比如设置过期时间，可以在这里扩展
// export function setStoredDataWithExpiry(key: string, data: any, expiryInHours: number) { ... }
// export function getStoredDataIfNotExpired(key: string) { ... }