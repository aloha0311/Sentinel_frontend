// 数据持久化服务
import { useDataStore } from '../stores/dataStore';
const STORAGE_KEY = 'sentinel_data';
// 保存数据到本地存储
export function saveDataToStorage() {
    const dataStore = useDataStore();
    const data = {
        operationRecords: dataStore.operationRecords,
        l1Records: dataStore.l1Records,
        l2Records: dataStore.l2Records,
        l3Records: dataStore.l3Records,
        l4Records: dataStore.l4Records,
        riskStats: dataStore.riskStats,
        lastUpdated: new Date().toISOString()
    };
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        console.log('数据已保存到本地存储');
    }
    catch (error) {
        console.error('保存数据失败:', error);
    }
}
// 从本地存储加载数据
export function loadDataFromStorage() {
    const dataStore = useDataStore();
    try {
        const storedData = localStorage.getItem(STORAGE_KEY);
        if (storedData) {
            const data = JSON.parse(storedData);
            // 恢复数据
            dataStore.operationRecords = data.operationRecords || [];
            dataStore.l1Records = data.l1Records || [];
            dataStore.l2Records = data.l2Records || [];
            dataStore.l3Records = data.l3Records || [];
            dataStore.l4Records = data.l4Records || [];
            dataStore.riskStats = data.riskStats || [];
            console.log('数据已从本地存储加载');
            return true;
        }
    }
    catch (error) {
        console.error('加载数据失败:', error);
    }
    return false;
}
// 清空本地存储的数据
export function clearStorageData() {
    try {
        localStorage.removeItem(STORAGE_KEY);
        console.log('本地存储数据已清空');
    }
    catch (error) {
        console.error('清空数据失败:', error);
    }
}
// 导出数据为JSON文件
export function exportDataToFile() {
    const dataStore = useDataStore();
    const data = {
        operationRecords: dataStore.operationRecords,
        l1Records: dataStore.l1Records,
        l2Records: dataStore.l2Records,
        l3Records: dataStore.l3Records,
        l4Records: dataStore.l4Records,
        riskStats: dataStore.riskStats,
        exportedAt: new Date().toISOString()
    };
    try {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `sentinel_data_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        console.log('数据已导出为JSON文件');
    }
    catch (error) {
        console.error('导出数据失败:', error);
    }
}
// 从JSON文件导入数据
export function importDataFromFile(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target?.result);
                const dataStore = useDataStore();
                // 验证数据格式
                if (data.operationRecords && data.l1Records && data.l2Records && data.l3Records && data.l4Records && data.riskStats) {
                    // 恢复数据
                    dataStore.operationRecords = data.operationRecords;
                    dataStore.l1Records = data.l1Records;
                    dataStore.l2Records = data.l2Records;
                    dataStore.l3Records = data.l3Records;
                    dataStore.l4Records = data.l4Records;
                    dataStore.riskStats = data.riskStats;
                    // 保存到本地存储
                    saveDataToStorage();
                    console.log('数据已从文件导入');
                    resolve(true);
                }
                else {
                    console.error('数据格式不正确');
                    resolve(false);
                }
            }
            catch (error) {
                console.error('导入数据失败:', error);
                resolve(false);
            }
        };
        reader.onerror = () => {
            console.error('读取文件失败');
            resolve(false);
        };
        reader.readAsText(file);
    });
}
// 自动保存数据（在数据变化时调用）
export function autoSaveData() {
    saveDataToStorage();
}
// 初始化数据持久化
export function initDataPersistence() {
    // 尝试从本地存储加载数据
    const loaded = loadDataFromStorage();
    if (!loaded) {
        console.log('本地存储中没有数据，使用默认空数据');
    }
    // 设置自动保存
    const dataStore = useDataStore();
    // 监听数据变化，自动保存
    // 注意：这里使用简单的轮询方式，实际项目中可以使用更优雅的响应式监听
    setInterval(() => {
        autoSaveData();
    }, 30000); // 每30秒自动保存一次
}
//# sourceMappingURL=dataPersistence.js.map