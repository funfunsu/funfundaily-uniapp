// mock/mock.js
import dataMap from './dataMap.js'; // 导入静态映射表

export default {
    mockRequest: (uri, options) => {
        try {
            const pureUri = uri.split('?')[0];
            // 从映射表中获取数据
            console.log('pureUri',pureUri)
            const mockData = dataMap[pureUri];
            if (mockData) {
                console.log('mockData',mockData)
                return { code: 200, data: mockData };
            } else {
                throw new Error(`未找到 ${pureUri} 的 mock 数据`);
            }
        } catch (error) {
            console.error(`Mock 数据加载失败: ${error.message}`);
            return { code: 404, data: { message: `未找到 ${uri} 对应的 mock 数据` } };
        }
    }
};