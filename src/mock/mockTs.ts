// mock/mock.ts
import dataMap from './dataMapTs';
import { RequestOptions ,ResponseData} from '../types/type';

// 定义Mock数据映射表类型
export interface DataMap {
  [key: string]: any;
}

export default {
  /**
   * 模拟请求处理
   * @param uri 请求的URI
   * @param options 请求选项
   * @returns 模拟的响应数据
   */
  mockRequest: <T = any>(uri: string, options: RequestOptions): ResponseData<T> => {
    try {
      // 提取纯URL（去掉查询参数）
      const pureUri = uri.split('?')[0];
      console.log('Mock请求URI:', pureUri);
      
      // 从映射表中获取数据
      const mockData = dataMap[pureUri] as T;
      
      if (mockData !== undefined) {
        console.log('找到Mock数据:', mockData);
        return { code: "200", data: mockData };
      } else {
        throw new Error(`未找到 ${pureUri} 的mock数据`);
      }
    } catch (error) {
      console.error(`Mock数据加载失败: ${error instanceof Error ? error.message : String(error)}`);
      return { 
        code: "404", 
        data: { message: `未找到 ${uri} 对应的mock数据` } as T 
      };
    }
  }
};
