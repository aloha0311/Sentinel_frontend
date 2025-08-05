import { ref, computed, onMounted, onUnmounted } from 'vue';
import { Search, Delete, Download } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useDataStore } from '../stores/dataStore';
import { saveDataToStorage } from '../services/dataPersistence';
// 2. Store与响应式数据
const dataStore = useDataStore();
// 将JSON格式的详细信息转换为自然语言
const formatDetailsToNaturalLanguage = (details) => {
    if (!details)
        return '无详细信息';
    try {
        if (typeof details === 'string') {
            return details;
        }
        if (typeof details === 'object') {
            const result = [];
            // 处理查询信息
            if (details.query) {
                result.push(`查询内容: ${details.query}`);
            }
            // 处理相似度
            if (details.similarity !== undefined) {
                result.push(`相似度: ${(details.similarity * 100).toFixed(2)}%`);
            }
            // 处理注入成功状态
            if (details.injectionSuccess !== undefined) {
                result.push(`注入状态: ${details.injectionSuccess ? '成功' : '失败'}`);
            }
            // 处理触发关键词
            if (details.triggerKeyword) {
                result.push(`触发关键词: ${details.triggerKeyword}`);
            }
            // 处理样本ID
            if (details.sampleId) {
                result.push(`样本ID: ${details.sampleId}`);
            }
            // 处理推理结果
            if (details.reasoning) {
                result.push(`推理过程: ${details.reasoning}`);
            }
            // 处理最终结果
            if (details.final) {
                result.push(`最终结果: ${details.final}`);
            }
            // 处理判断结果
            if (details.verdict) {
                const verdictMap = {
                    'consistent': '一致',
                    'mismatch': '不一致',
                    'unclear': '不明确'
                };
                result.push(`判断结果: ${verdictMap[details.verdict] || details.verdict}`);
            }
            // 处理推理长度
            if (details.reasoningLength !== undefined) {
                result.push(`推理长度: ${details.reasoningLength}`);
            }
            // 处理重复率
            if (details.repetitionRate !== undefined) {
                result.push(`重复率: ${(details.repetitionRate * 100).toFixed(2)}%`);
            }
            // 处理模板检测
            if (details.templateDetected !== undefined) {
                result.push(`模板检测: ${details.templateDetected ? '检测到' : '未检测到'}`);
            }
            // 处理不一致数量
            if (details.mismatchCount !== undefined) {
                result.push(`不一致数量: ${details.mismatchCount}`);
            }
            // 处理优化ID
            if (details.optimizationId) {
                result.push(`优化ID: ${details.optimizationId}`);
            }
            // 处理代数
            if (details.generation !== undefined) {
                result.push(`代数: ${details.generation}`);
            }
            // 处理得分
            if (details.score !== undefined) {
                result.push(`得分: ${details.score.toFixed(2)}`);
            }
            // 处理算法
            if (details.algorithm) {
                result.push(`算法: ${details.algorithm}`);
            }
            // 处理状态
            if (details.status) {
                const statusMap = {
                    'running': '运行中',
                    'completed': '已完成',
                    'failed': '失败',
                    'paused': '已暂停'
                };
                result.push(`状态: ${statusMap[details.status] || details.status}`);
            }
            // 处理批量信息
            if (details.batchInfo) {
                result.push(`批量信息: 总数${details.batchInfo.totalCount}条，成功${details.batchInfo.successCount}条，成功率${(details.batchInfo.successRate * 100).toFixed(2)}%`);
            }
            // 处理异常token信息
            if (details.anomalousTokens && Array.isArray(details.anomalousTokens)) {
                result.push(`异常Token数量: ${details.anomalousTokens.length}`);
                if (details.anomalousTokens.length > 0) {
                    const tokenInfo = details.anomalousTokens.map((token, index) => `${index + 1}.${token.token}(风险:${token.risk})`).join(', ');
                    result.push(`异常Token详情: ${tokenInfo}`);
                }
            }
            // 处理token统计
            if (details.totalTokens !== undefined) {
                result.push(`总Token数: ${details.totalTokens}`);
            }
            if (details.highRiskCount !== undefined) {
                result.push(`高风险Token数: ${details.highRiskCount}`);
            }
            if (details.mediumRiskCount !== undefined) {
                result.push(`中风险Token数: ${details.mediumRiskCount}`);
            }
            if (details.lowRiskCount !== undefined) {
                result.push(`低风险Token数: ${details.lowRiskCount}`);
            }
            return result.length > 0 ? result.join('\n') : '无详细信息';
        }
        return '无详细信息';
    }
    catch (error) {
        console.error('格式化详细信息失败:', error);
        return '格式化详细信息失败';
    }
};
const logLevel = ref('all');
const logSource = ref('all');
const dateRange = ref(null);
const searchKeyword = ref('');
const currentPage = ref(1);
const pageSize = ref(100);
const showDetails = ref(true);
const logDetailVisible = ref(false);
const selectedLog = ref(null);
const showRealtimeStream = ref(false);
// 日期快捷选项
const dateShortcuts = [
    {
        text: '最近一小时',
        value: () => {
            const end = new Date();
            const start = new Date();
            start.setTime(start.getTime() - 3600 * 1000);
            return [start, end];
        }
    },
    {
        text: '最近一天',
        value: () => {
            const end = new Date();
            const start = new Date();
            start.setTime(start.getTime() - 3600 * 1000 * 24);
            return [start, end];
        }
    },
    {
        text: '最近一周',
        value: () => {
            const end = new Date();
            const start = new Date();
            start.setTime(start.getTime() - 3600 * 1000 * 24 * 7);
            return [start, end];
        }
    },
    {
        text: '最近一个月',
        value: () => {
            const end = new Date();
            const start = new Date();
            start.setTime(start.getTime() - 3600 * 1000 * 24 * 30);
            return [start, end];
        }
    }
];
// 使用数据存储的操作记录作为日志数据
const logs = computed(() => {
    return dataStore.getOperationRecords.map(record => ({
        id: record.id,
        timestamp: record.timestamp,
        level: record.success ? 'info' : 'error',
        page: record.page,
        operation: record.operation,
        riskLevel: record.riskLevel,
        message: `${record.page} ${record.operation}: ${JSON.stringify(record.details)}`,
        details: record.details
    }));
});
// 计算统计数据
const totalLogs = computed(() => logs.value.length);
const errorLogs = computed(() => logs.value.filter(log => log.level === 'error').length);
const warningLogs = computed(() => logs.value.filter(log => log.level === 'warning').length);
const todayLogs = computed(() => {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    return logs.value.filter(log => log.timestamp.substring(0, 10) === today).length;
});
const realtimeLogs = ref([]);
const filteredLogs = computed(() => {
    let filtered = logs.value;
    // 日志级别过滤
    if (logLevel.value !== 'all') {
        filtered = filtered.filter(log => log.level === logLevel.value);
    }
    // 来源过滤
    if (logSource.value !== 'all') {
        filtered = filtered.filter(log => log.page.toLowerCase() === logSource.value);
    }
    // 关键词搜索
    if (searchKeyword.value) {
        const keyword = searchKeyword.value.toLowerCase();
        filtered = filtered.filter(log => log.message.toLowerCase().includes(keyword) ||
            log.operation.toLowerCase().includes(keyword));
    }
    // 日期范围过滤
    if (dateRange.value) {
        const [start, end] = dateRange.value;
        filtered = filtered.filter(log => {
            const logTime = new Date(log.timestamp);
            const startTime = new Date(start);
            const endTime = new Date(end);
            return logTime >= startTime && logTime <= endTime;
        });
    }
    return filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
});
// 分页后的日志数据
const paginatedLogs = computed(() => {
    const start = (currentPage.value - 1) * pageSize.value;
    const end = start + pageSize.value;
    return filteredLogs.value.slice(start, end);
});
const getLogLevelType = (level) => {
    switch (level) {
        case 'error': return 'danger';
        case 'warning': return 'warning';
        case 'info': return 'success';
        case 'debug': return 'info';
        default: return 'info';
    }
};
const getSourceType = (source) => {
    switch (source) {
        case 'l1': return 'primary';
        case 'l2': return 'success';
        case 'l3': return 'warning';
        case 'l4': return 'danger';
        case 'system': return 'info';
        default: return 'info';
    }
};
const getLayerTagType = (page) => {
    switch (page) {
        case 'L1': return 'primary';
        case 'L2': return 'success';
        case 'L3': return 'warning';
        case 'L4': return 'danger';
        default: return 'info';
    }
};
const getSourceText = (source) => {
    switch (source) {
        case 'l1': return 'L1检测';
        case 'l2': return 'L2检测';
        case 'l3': return 'L3检测';
        case 'l4': return 'L4检测';
        case 'system': return '系统';
        default: return source;
    }
};
const highlightMessage = (message) => {
    // 高亮关键词
    return message
        .replace(/(异常|错误|警告|危险|攻击)/g, '<span class="highlight-danger">$1</span>')
        .replace(/(完成|成功|正常)/g, '<span class="highlight-success">$1</span>')
        .replace(/(Token|ΔPPL|相似度|触发词)/g, '<span class="highlight-keyword">$1</span>');
};
// 格式化时间戳
const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
};
// 获取风险等级文本
const getRiskLevelText = (riskLevel) => {
    switch (riskLevel) {
        case 'high': return '高风险';
        case 'medium': return '中风险';
        case 'low': return '低风险';
        default: return '未知';
    }
};
const formatTime = (timestamp) => {
    return timestamp.split(' ')[1]; // 只显示时间部分
};
const clearLogs = () => {
    ElMessageBox.confirm('确定要清空所有日志记录吗？此操作不可恢复。', '确认清空', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
    }).then(() => {
        // 清空所有记录
        dataStore.operationRecords = [];
        dataStore.l1Records = [];
        dataStore.l2Records = [];
        dataStore.l3Records = [];
        dataStore.l4Records = [];
        dataStore.riskStats = [];
        // 保存到localStorage
        saveDataToStorage();
        ElMessage.success('所有日志记录已清空');
    }).catch(() => {
        // 用户取消操作
    });
};
const exportLogs = () => {
    try {
        // 准备导出数据
        const exportData = {
            exportTime: new Date().toLocaleString('zh-CN'),
            totalRecords: dataStore.getOperationRecords.length,
            operationRecords: dataStore.getOperationRecords,
            l1Records: dataStore.l1Records,
            l2Records: dataStore.l2Records,
            l3Records: dataStore.l3Records,
            l4Records: dataStore.l4Records,
            riskStats: dataStore.riskStats
        };
        // 创建Blob对象
        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
            type: 'application/json'
        });
        // 创建下载链接
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const now = new Date();
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        link.download = `系统日志_${today}.json`;
        // 触发下载
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        // 清理URL对象
        URL.revokeObjectURL(url);
        ElMessage.success('日志导出成功');
    }
    catch (error) {
        console.error('导出日志失败:', error);
        ElMessage.error('导出日志失败，请重试');
    }
};
const viewLogDetail = (log) => {
    selectedLog.value = log;
    logDetailVisible.value = true;
};
const exportSingleLog = () => {
    if (selectedLog.value) {
        try {
            const exportData = {
                exportTime: new Date().toLocaleString('zh-CN'),
                logInfo: {
                    id: selectedLog.value.id,
                    timestamp: selectedLog.value.timestamp,
                    level: selectedLog.value.level,
                    page: selectedLog.value.page,
                    operation: selectedLog.value.operation,
                    riskLevel: selectedLog.value.riskLevel,
                    message: selectedLog.value.message,
                    details: selectedLog.value.details
                }
            };
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            const timestamp = selectedLog.value.timestamp.replace(/[:.]/g, '-').replace('T', '_').replace('Z', '');
            link.download = `单个日志_${selectedLog.value.page}_${timestamp}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            ElMessage.success('单个日志导出成功');
        }
        catch (error) {
            console.error('导出单个日志失败:', error);
            ElMessage.error('导出单个日志失败，请重试');
        }
    }
};
const toggleRealtimeStream = () => {
    showRealtimeStream.value = !showRealtimeStream.value;
    if (showRealtimeStream.value) {
        startRealtimeStream();
    }
    else {
        stopRealtimeStream();
    }
};
let realtimeTimer = null;
const startRealtimeStream = () => {
    realtimeTimer = setInterval(() => {
        // 模拟新日志
        const newLog = {
            id: `realtime-${Date.now()}`,
            timestamp: new Date().toLocaleString('zh-CN').replace(/\//g, '-'),
            level: ['info', 'warning', 'error', 'debug'][Math.floor(Math.random() * 4)],
            source: ['l1', 'l2', 'l3', 'l4', 'system'][Math.floor(Math.random() * 5)],
            component: 'RealtimeMonitor',
            message: `实时日志消息 ${Math.random().toFixed(3)}`,
            threadId: 'realtime-thread',
            userId: 'realtime-user',
            sessionId: 'realtime-session',
            ipAddress: '127.0.0.1',
            stackTrace: '',
            metadata: {}
        };
        realtimeLogs.value.unshift(newLog);
        if (realtimeLogs.value.length > 50) {
            realtimeLogs.value = realtimeLogs.value.slice(0, 50);
        }
    }, 2000);
};
const stopRealtimeStream = () => {
    if (realtimeTimer) {
        clearInterval(realtimeTimer);
        realtimeTimer = null;
    }
};
onMounted(() => {
    console.log('SystemLogs页面已加载');
});
onUnmounted(() => {
    stopRealtimeStream();
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['log-row']} */ ;
/** @type {__VLS_StyleScopedClasses['stack-trace']} */ ;
/** @type {__VLS_StyleScopedClasses['log-message']} */ ;
/** @type {__VLS_StyleScopedClasses['log-message']} */ ;
/** @type {__VLS_StyleScopedClasses['log-detail']} */ ;
/** @type {__VLS_StyleScopedClasses['log-detail']} */ ;
/** @type {__VLS_StyleScopedClasses['stack-content']} */ ;
/** @type {__VLS_StyleScopedClasses['log-detail']} */ ;
/** @type {__VLS_StyleScopedClasses['details-content']} */ ;
/** @type {__VLS_StyleScopedClasses['realtime-log-item']} */ ;
/** @type {__VLS_StyleScopedClasses['realtime-log-item']} */ ;
/** @type {__VLS_StyleScopedClasses['realtime-log-item']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "system-logs" },
});
const __VLS_0 = {}.ElRow;
/** @type {[typeof __VLS_components.ElRow, typeof __VLS_components.elRow, typeof __VLS_components.ElRow, typeof __VLS_components.elRow, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    ...{ class: "toolbar" },
}));
const __VLS_2 = __VLS_1({
    ...{ class: "toolbar" },
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
__VLS_3.slots.default;
const __VLS_4 = {}.ElCol;
/** @type {[typeof __VLS_components.ElCol, typeof __VLS_components.elCol, typeof __VLS_components.ElCol, typeof __VLS_components.elCol, ]} */ ;
// @ts-ignore
const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
    span: (16),
}));
const __VLS_6 = __VLS_5({
    span: (16),
}, ...__VLS_functionalComponentArgsRest(__VLS_5));
__VLS_7.slots.default;
const __VLS_8 = {}.ElSpace;
/** @type {[typeof __VLS_components.ElSpace, typeof __VLS_components.elSpace, typeof __VLS_components.ElSpace, typeof __VLS_components.elSpace, ]} */ ;
// @ts-ignore
const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
    wrap: true,
}));
const __VLS_10 = __VLS_9({
    wrap: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_9));
__VLS_11.slots.default;
const __VLS_12 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
    modelValue: (__VLS_ctx.logLevel),
    placeholder: "日志级别",
    ...{ style: {} },
}));
const __VLS_14 = __VLS_13({
    modelValue: (__VLS_ctx.logLevel),
    placeholder: "日志级别",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_13));
__VLS_15.slots.default;
const __VLS_16 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
    label: "全部",
    value: "all",
}));
const __VLS_18 = __VLS_17({
    label: "全部",
    value: "all",
}, ...__VLS_functionalComponentArgsRest(__VLS_17));
const __VLS_20 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({
    label: "信息",
    value: "info",
}));
const __VLS_22 = __VLS_21({
    label: "信息",
    value: "info",
}, ...__VLS_functionalComponentArgsRest(__VLS_21));
const __VLS_24 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
    label: "警告",
    value: "warning",
}));
const __VLS_26 = __VLS_25({
    label: "警告",
    value: "warning",
}, ...__VLS_functionalComponentArgsRest(__VLS_25));
const __VLS_28 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_29 = __VLS_asFunctionalComponent(__VLS_28, new __VLS_28({
    label: "错误",
    value: "error",
}));
const __VLS_30 = __VLS_29({
    label: "错误",
    value: "error",
}, ...__VLS_functionalComponentArgsRest(__VLS_29));
var __VLS_15;
const __VLS_32 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({
    modelValue: (__VLS_ctx.logSource),
    placeholder: "日志来源",
    ...{ style: {} },
}));
const __VLS_34 = __VLS_33({
    modelValue: (__VLS_ctx.logSource),
    placeholder: "日志来源",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_33));
__VLS_35.slots.default;
const __VLS_36 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({
    label: "全部模块",
    value: "all",
}));
const __VLS_38 = __VLS_37({
    label: "全部模块",
    value: "all",
}, ...__VLS_functionalComponentArgsRest(__VLS_37));
const __VLS_40 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_41 = __VLS_asFunctionalComponent(__VLS_40, new __VLS_40({
    label: "L1检测",
    value: "l1",
}));
const __VLS_42 = __VLS_41({
    label: "L1检测",
    value: "l1",
}, ...__VLS_functionalComponentArgsRest(__VLS_41));
const __VLS_44 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_45 = __VLS_asFunctionalComponent(__VLS_44, new __VLS_44({
    label: "L2检测",
    value: "l2",
}));
const __VLS_46 = __VLS_45({
    label: "L2检测",
    value: "l2",
}, ...__VLS_functionalComponentArgsRest(__VLS_45));
const __VLS_48 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({
    label: "L3检测",
    value: "l3",
}));
const __VLS_50 = __VLS_49({
    label: "L3检测",
    value: "l3",
}, ...__VLS_functionalComponentArgsRest(__VLS_49));
const __VLS_52 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_53 = __VLS_asFunctionalComponent(__VLS_52, new __VLS_52({
    label: "L4检测",
    value: "l4",
}));
const __VLS_54 = __VLS_53({
    label: "L4检测",
    value: "l4",
}, ...__VLS_functionalComponentArgsRest(__VLS_53));
var __VLS_35;
const __VLS_56 = {}.ElDatePicker;
/** @type {[typeof __VLS_components.ElDatePicker, typeof __VLS_components.elDatePicker, ]} */ ;
// @ts-ignore
const __VLS_57 = __VLS_asFunctionalComponent(__VLS_56, new __VLS_56({
    modelValue: (__VLS_ctx.dateRange),
    type: "datetimerange",
    rangeSeparator: "至",
    startPlaceholder: "开始日期",
    endPlaceholder: "结束日期",
    ...{ style: {} },
    format: "YYYY-MM-DD HH:mm:ss",
    valueFormat: "YYYY-MM-DD HH:mm:ss",
    shortcuts: (__VLS_ctx.dateShortcuts),
}));
const __VLS_58 = __VLS_57({
    modelValue: (__VLS_ctx.dateRange),
    type: "datetimerange",
    rangeSeparator: "至",
    startPlaceholder: "开始日期",
    endPlaceholder: "结束日期",
    ...{ style: {} },
    format: "YYYY-MM-DD HH:mm:ss",
    valueFormat: "YYYY-MM-DD HH:mm:ss",
    shortcuts: (__VLS_ctx.dateShortcuts),
}, ...__VLS_functionalComponentArgsRest(__VLS_57));
const __VLS_60 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_61 = __VLS_asFunctionalComponent(__VLS_60, new __VLS_60({
    modelValue: (__VLS_ctx.searchKeyword),
    placeholder: "搜索日志内容...",
    ...{ style: {} },
    clearable: true,
}));
const __VLS_62 = __VLS_61({
    modelValue: (__VLS_ctx.searchKeyword),
    placeholder: "搜索日志内容...",
    ...{ style: {} },
    clearable: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_61));
__VLS_63.slots.default;
{
    const { prefix: __VLS_thisSlot } = __VLS_63.slots;
    const __VLS_64 = {}.ElIcon;
    /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
    // @ts-ignore
    const __VLS_65 = __VLS_asFunctionalComponent(__VLS_64, new __VLS_64({}));
    const __VLS_66 = __VLS_65({}, ...__VLS_functionalComponentArgsRest(__VLS_65));
    __VLS_67.slots.default;
    const __VLS_68 = {}.Search;
    /** @type {[typeof __VLS_components.Search, ]} */ ;
    // @ts-ignore
    const __VLS_69 = __VLS_asFunctionalComponent(__VLS_68, new __VLS_68({}));
    const __VLS_70 = __VLS_69({}, ...__VLS_functionalComponentArgsRest(__VLS_69));
    var __VLS_67;
}
var __VLS_63;
var __VLS_11;
var __VLS_7;
const __VLS_72 = {}.ElCol;
/** @type {[typeof __VLS_components.ElCol, typeof __VLS_components.elCol, typeof __VLS_components.ElCol, typeof __VLS_components.elCol, ]} */ ;
// @ts-ignore
const __VLS_73 = __VLS_asFunctionalComponent(__VLS_72, new __VLS_72({
    span: (8),
    ...{ class: "toolbar-right" },
}));
const __VLS_74 = __VLS_73({
    span: (8),
    ...{ class: "toolbar-right" },
}, ...__VLS_functionalComponentArgsRest(__VLS_73));
__VLS_75.slots.default;
const __VLS_76 = {}.ElSpace;
/** @type {[typeof __VLS_components.ElSpace, typeof __VLS_components.elSpace, typeof __VLS_components.ElSpace, typeof __VLS_components.elSpace, ]} */ ;
// @ts-ignore
const __VLS_77 = __VLS_asFunctionalComponent(__VLS_76, new __VLS_76({}));
const __VLS_78 = __VLS_77({}, ...__VLS_functionalComponentArgsRest(__VLS_77));
__VLS_79.slots.default;
const __VLS_80 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_81 = __VLS_asFunctionalComponent(__VLS_80, new __VLS_80({
    ...{ 'onClick': {} },
    type: "danger",
}));
const __VLS_82 = __VLS_81({
    ...{ 'onClick': {} },
    type: "danger",
}, ...__VLS_functionalComponentArgsRest(__VLS_81));
let __VLS_84;
let __VLS_85;
let __VLS_86;
const __VLS_87 = {
    onClick: (__VLS_ctx.clearLogs)
};
__VLS_83.slots.default;
const __VLS_88 = {}.ElIcon;
/** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
// @ts-ignore
const __VLS_89 = __VLS_asFunctionalComponent(__VLS_88, new __VLS_88({}));
const __VLS_90 = __VLS_89({}, ...__VLS_functionalComponentArgsRest(__VLS_89));
__VLS_91.slots.default;
const __VLS_92 = {}.Delete;
/** @type {[typeof __VLS_components.Delete, ]} */ ;
// @ts-ignore
const __VLS_93 = __VLS_asFunctionalComponent(__VLS_92, new __VLS_92({}));
const __VLS_94 = __VLS_93({}, ...__VLS_functionalComponentArgsRest(__VLS_93));
var __VLS_91;
var __VLS_83;
const __VLS_96 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_97 = __VLS_asFunctionalComponent(__VLS_96, new __VLS_96({
    ...{ 'onClick': {} },
    type: "primary",
}));
const __VLS_98 = __VLS_97({
    ...{ 'onClick': {} },
    type: "primary",
}, ...__VLS_functionalComponentArgsRest(__VLS_97));
let __VLS_100;
let __VLS_101;
let __VLS_102;
const __VLS_103 = {
    onClick: (__VLS_ctx.exportLogs)
};
__VLS_99.slots.default;
const __VLS_104 = {}.ElIcon;
/** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
// @ts-ignore
const __VLS_105 = __VLS_asFunctionalComponent(__VLS_104, new __VLS_104({}));
const __VLS_106 = __VLS_105({}, ...__VLS_functionalComponentArgsRest(__VLS_105));
__VLS_107.slots.default;
const __VLS_108 = {}.Download;
/** @type {[typeof __VLS_components.Download, ]} */ ;
// @ts-ignore
const __VLS_109 = __VLS_asFunctionalComponent(__VLS_108, new __VLS_108({}));
const __VLS_110 = __VLS_109({}, ...__VLS_functionalComponentArgsRest(__VLS_109));
var __VLS_107;
var __VLS_99;
var __VLS_79;
var __VLS_75;
var __VLS_3;
const __VLS_112 = {}.ElRow;
/** @type {[typeof __VLS_components.ElRow, typeof __VLS_components.elRow, typeof __VLS_components.ElRow, typeof __VLS_components.elRow, ]} */ ;
// @ts-ignore
const __VLS_113 = __VLS_asFunctionalComponent(__VLS_112, new __VLS_112({
    gutter: (20),
    ...{ class: "log-stats" },
}));
const __VLS_114 = __VLS_113({
    gutter: (20),
    ...{ class: "log-stats" },
}, ...__VLS_functionalComponentArgsRest(__VLS_113));
__VLS_115.slots.default;
const __VLS_116 = {}.ElCol;
/** @type {[typeof __VLS_components.ElCol, typeof __VLS_components.elCol, typeof __VLS_components.ElCol, typeof __VLS_components.elCol, ]} */ ;
// @ts-ignore
const __VLS_117 = __VLS_asFunctionalComponent(__VLS_116, new __VLS_116({
    span: (6),
}));
const __VLS_118 = __VLS_117({
    span: (6),
}, ...__VLS_functionalComponentArgsRest(__VLS_117));
__VLS_119.slots.default;
const __VLS_120 = {}.ElCard;
/** @type {[typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ]} */ ;
// @ts-ignore
const __VLS_121 = __VLS_asFunctionalComponent(__VLS_120, new __VLS_120({
    ...{ class: "stat-card" },
}));
const __VLS_122 = __VLS_121({
    ...{ class: "stat-card" },
}, ...__VLS_functionalComponentArgsRest(__VLS_121));
__VLS_123.slots.default;
const __VLS_124 = {}.ElStatistic;
/** @type {[typeof __VLS_components.ElStatistic, typeof __VLS_components.elStatistic, ]} */ ;
// @ts-ignore
const __VLS_125 = __VLS_asFunctionalComponent(__VLS_124, new __VLS_124({
    title: "总日志数",
    value: (__VLS_ctx.totalLogs),
}));
const __VLS_126 = __VLS_125({
    title: "总日志数",
    value: (__VLS_ctx.totalLogs),
}, ...__VLS_functionalComponentArgsRest(__VLS_125));
var __VLS_123;
var __VLS_119;
const __VLS_128 = {}.ElCol;
/** @type {[typeof __VLS_components.ElCol, typeof __VLS_components.elCol, typeof __VLS_components.ElCol, typeof __VLS_components.elCol, ]} */ ;
// @ts-ignore
const __VLS_129 = __VLS_asFunctionalComponent(__VLS_128, new __VLS_128({
    span: (6),
}));
const __VLS_130 = __VLS_129({
    span: (6),
}, ...__VLS_functionalComponentArgsRest(__VLS_129));
__VLS_131.slots.default;
const __VLS_132 = {}.ElCard;
/** @type {[typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ]} */ ;
// @ts-ignore
const __VLS_133 = __VLS_asFunctionalComponent(__VLS_132, new __VLS_132({
    ...{ class: "stat-card" },
}));
const __VLS_134 = __VLS_133({
    ...{ class: "stat-card" },
}, ...__VLS_functionalComponentArgsRest(__VLS_133));
__VLS_135.slots.default;
const __VLS_136 = {}.ElStatistic;
/** @type {[typeof __VLS_components.ElStatistic, typeof __VLS_components.elStatistic, ]} */ ;
// @ts-ignore
const __VLS_137 = __VLS_asFunctionalComponent(__VLS_136, new __VLS_136({
    title: "错误日志",
    value: (__VLS_ctx.errorLogs),
    valueStyle: "color: #f56c6c",
}));
const __VLS_138 = __VLS_137({
    title: "错误日志",
    value: (__VLS_ctx.errorLogs),
    valueStyle: "color: #f56c6c",
}, ...__VLS_functionalComponentArgsRest(__VLS_137));
var __VLS_135;
var __VLS_131;
const __VLS_140 = {}.ElCol;
/** @type {[typeof __VLS_components.ElCol, typeof __VLS_components.elCol, typeof __VLS_components.ElCol, typeof __VLS_components.elCol, ]} */ ;
// @ts-ignore
const __VLS_141 = __VLS_asFunctionalComponent(__VLS_140, new __VLS_140({
    span: (6),
}));
const __VLS_142 = __VLS_141({
    span: (6),
}, ...__VLS_functionalComponentArgsRest(__VLS_141));
__VLS_143.slots.default;
const __VLS_144 = {}.ElCard;
/** @type {[typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ]} */ ;
// @ts-ignore
const __VLS_145 = __VLS_asFunctionalComponent(__VLS_144, new __VLS_144({
    ...{ class: "stat-card" },
}));
const __VLS_146 = __VLS_145({
    ...{ class: "stat-card" },
}, ...__VLS_functionalComponentArgsRest(__VLS_145));
__VLS_147.slots.default;
const __VLS_148 = {}.ElStatistic;
/** @type {[typeof __VLS_components.ElStatistic, typeof __VLS_components.elStatistic, ]} */ ;
// @ts-ignore
const __VLS_149 = __VLS_asFunctionalComponent(__VLS_148, new __VLS_148({
    title: "警告日志",
    value: (__VLS_ctx.warningLogs),
    valueStyle: "color: #e6a23c",
}));
const __VLS_150 = __VLS_149({
    title: "警告日志",
    value: (__VLS_ctx.warningLogs),
    valueStyle: "color: #e6a23c",
}, ...__VLS_functionalComponentArgsRest(__VLS_149));
var __VLS_147;
var __VLS_143;
const __VLS_152 = {}.ElCol;
/** @type {[typeof __VLS_components.ElCol, typeof __VLS_components.elCol, typeof __VLS_components.ElCol, typeof __VLS_components.elCol, ]} */ ;
// @ts-ignore
const __VLS_153 = __VLS_asFunctionalComponent(__VLS_152, new __VLS_152({
    span: (6),
}));
const __VLS_154 = __VLS_153({
    span: (6),
}, ...__VLS_functionalComponentArgsRest(__VLS_153));
__VLS_155.slots.default;
const __VLS_156 = {}.ElCard;
/** @type {[typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ]} */ ;
// @ts-ignore
const __VLS_157 = __VLS_asFunctionalComponent(__VLS_156, new __VLS_156({
    ...{ class: "stat-card" },
}));
const __VLS_158 = __VLS_157({
    ...{ class: "stat-card" },
}, ...__VLS_functionalComponentArgsRest(__VLS_157));
__VLS_159.slots.default;
const __VLS_160 = {}.ElStatistic;
/** @type {[typeof __VLS_components.ElStatistic, typeof __VLS_components.elStatistic, ]} */ ;
// @ts-ignore
const __VLS_161 = __VLS_asFunctionalComponent(__VLS_160, new __VLS_160({
    title: "今日新增",
    value: (__VLS_ctx.todayLogs),
}));
const __VLS_162 = __VLS_161({
    title: "今日新增",
    value: (__VLS_ctx.todayLogs),
}, ...__VLS_functionalComponentArgsRest(__VLS_161));
var __VLS_159;
var __VLS_155;
var __VLS_115;
const __VLS_164 = {}.ElCard;
/** @type {[typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ]} */ ;
// @ts-ignore
const __VLS_165 = __VLS_asFunctionalComponent(__VLS_164, new __VLS_164({}));
const __VLS_166 = __VLS_165({}, ...__VLS_functionalComponentArgsRest(__VLS_165));
__VLS_167.slots.default;
{
    const { header: __VLS_thisSlot } = __VLS_167.slots;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card-header" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "header-controls" },
    });
    const __VLS_168 = {}.ElSwitch;
    /** @type {[typeof __VLS_components.ElSwitch, typeof __VLS_components.elSwitch, ]} */ ;
    // @ts-ignore
    const __VLS_169 = __VLS_asFunctionalComponent(__VLS_168, new __VLS_168({
        modelValue: (__VLS_ctx.showDetails),
        activeText: "详细视图",
        inactiveText: "简洁视图",
    }));
    const __VLS_170 = __VLS_169({
        modelValue: (__VLS_ctx.showDetails),
        activeText: "详细视图",
        inactiveText: "简洁视图",
    }, ...__VLS_functionalComponentArgsRest(__VLS_169));
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "log-container" },
});
const __VLS_172 = {}.ElTable;
/** @type {[typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ]} */ ;
// @ts-ignore
const __VLS_173 = __VLS_asFunctionalComponent(__VLS_172, new __VLS_172({
    ...{ 'onRowClick': {} },
    data: (__VLS_ctx.paginatedLogs),
    height: "600",
    stripe: true,
    rowClassName: "log-row",
}));
const __VLS_174 = __VLS_173({
    ...{ 'onRowClick': {} },
    data: (__VLS_ctx.paginatedLogs),
    height: "600",
    stripe: true,
    rowClassName: "log-row",
}, ...__VLS_functionalComponentArgsRest(__VLS_173));
let __VLS_176;
let __VLS_177;
let __VLS_178;
const __VLS_179 = {
    onRowClick: (__VLS_ctx.viewLogDetail)
};
__VLS_175.slots.default;
if (__VLS_ctx.showDetails) {
    const __VLS_180 = {}.ElTableColumn;
    /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
    // @ts-ignore
    const __VLS_181 = __VLS_asFunctionalComponent(__VLS_180, new __VLS_180({
        type: "expand",
    }));
    const __VLS_182 = __VLS_181({
        type: "expand",
    }, ...__VLS_functionalComponentArgsRest(__VLS_181));
    __VLS_183.slots.default;
    {
        const { default: __VLS_thisSlot } = __VLS_183.slots;
        const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "log-expand" },
        });
        const __VLS_184 = {}.ElRow;
        /** @type {[typeof __VLS_components.ElRow, typeof __VLS_components.elRow, typeof __VLS_components.ElRow, typeof __VLS_components.elRow, ]} */ ;
        // @ts-ignore
        const __VLS_185 = __VLS_asFunctionalComponent(__VLS_184, new __VLS_184({
            gutter: (20),
        }));
        const __VLS_186 = __VLS_185({
            gutter: (20),
        }, ...__VLS_functionalComponentArgsRest(__VLS_185));
        __VLS_187.slots.default;
        const __VLS_188 = {}.ElCol;
        /** @type {[typeof __VLS_components.ElCol, typeof __VLS_components.elCol, typeof __VLS_components.ElCol, typeof __VLS_components.elCol, ]} */ ;
        // @ts-ignore
        const __VLS_189 = __VLS_asFunctionalComponent(__VLS_188, new __VLS_188({
            span: (24),
        }));
        const __VLS_190 = __VLS_189({
            span: (24),
        }, ...__VLS_functionalComponentArgsRest(__VLS_189));
        __VLS_191.slots.default;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({});
        const __VLS_192 = {}.ElDescriptions;
        /** @type {[typeof __VLS_components.ElDescriptions, typeof __VLS_components.elDescriptions, typeof __VLS_components.ElDescriptions, typeof __VLS_components.elDescriptions, ]} */ ;
        // @ts-ignore
        const __VLS_193 = __VLS_asFunctionalComponent(__VLS_192, new __VLS_192({
            column: (2),
            border: true,
            size: "small",
        }));
        const __VLS_194 = __VLS_193({
            column: (2),
            border: true,
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_193));
        __VLS_195.slots.default;
        const __VLS_196 = {}.ElDescriptionsItem;
        /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
        // @ts-ignore
        const __VLS_197 = __VLS_asFunctionalComponent(__VLS_196, new __VLS_196({
            label: "操作详情",
        }));
        const __VLS_198 = __VLS_197({
            label: "操作详情",
        }, ...__VLS_functionalComponentArgsRest(__VLS_197));
        __VLS_199.slots.default;
        (row.message);
        var __VLS_199;
        const __VLS_200 = {}.ElDescriptionsItem;
        /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
        // @ts-ignore
        const __VLS_201 = __VLS_asFunctionalComponent(__VLS_200, new __VLS_200({
            label: "风险等级",
        }));
        const __VLS_202 = __VLS_201({
            label: "风险等级",
        }, ...__VLS_functionalComponentArgsRest(__VLS_201));
        __VLS_203.slots.default;
        const __VLS_204 = {}.ElTag;
        /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
        // @ts-ignore
        const __VLS_205 = __VLS_asFunctionalComponent(__VLS_204, new __VLS_204({
            type: (row.riskLevel === 'high' ? 'danger' : row.riskLevel === 'medium' ? 'warning' : 'success'),
            size: "small",
        }));
        const __VLS_206 = __VLS_205({
            type: (row.riskLevel === 'high' ? 'danger' : row.riskLevel === 'medium' ? 'warning' : 'success'),
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_205));
        __VLS_207.slots.default;
        (__VLS_ctx.getRiskLevelText(row.riskLevel));
        var __VLS_207;
        var __VLS_203;
        var __VLS_195;
        var __VLS_191;
        var __VLS_187;
    }
    var __VLS_183;
}
const __VLS_208 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_209 = __VLS_asFunctionalComponent(__VLS_208, new __VLS_208({
    prop: "timestamp",
    label: "时间",
    minWidth: "160",
    sortable: true,
}));
const __VLS_210 = __VLS_209({
    prop: "timestamp",
    label: "时间",
    minWidth: "160",
    sortable: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_209));
__VLS_211.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_211.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    (__VLS_ctx.formatTimestamp(scope.row.timestamp));
}
var __VLS_211;
const __VLS_212 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_213 = __VLS_asFunctionalComponent(__VLS_212, new __VLS_212({
    prop: "level",
    label: "级别",
    minWidth: "80",
}));
const __VLS_214 = __VLS_213({
    prop: "level",
    label: "级别",
    minWidth: "80",
}, ...__VLS_functionalComponentArgsRest(__VLS_213));
__VLS_215.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_215.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    const __VLS_216 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_217 = __VLS_asFunctionalComponent(__VLS_216, new __VLS_216({
        type: (__VLS_ctx.getLogLevelType(scope.row.level)),
        size: "small",
    }));
    const __VLS_218 = __VLS_217({
        type: (__VLS_ctx.getLogLevelType(scope.row.level)),
        size: "small",
    }, ...__VLS_functionalComponentArgsRest(__VLS_217));
    __VLS_219.slots.default;
    (scope.row.level.toUpperCase());
    var __VLS_219;
}
var __VLS_215;
const __VLS_220 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_221 = __VLS_asFunctionalComponent(__VLS_220, new __VLS_220({
    prop: "page",
    label: "检测层级",
    minWidth: "100",
}));
const __VLS_222 = __VLS_221({
    prop: "page",
    label: "检测层级",
    minWidth: "100",
}, ...__VLS_functionalComponentArgsRest(__VLS_221));
__VLS_223.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_223.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    const __VLS_224 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_225 = __VLS_asFunctionalComponent(__VLS_224, new __VLS_224({
        type: (__VLS_ctx.getLayerTagType(scope.row.page)),
        size: "small",
    }));
    const __VLS_226 = __VLS_225({
        type: (__VLS_ctx.getLayerTagType(scope.row.page)),
        size: "small",
    }, ...__VLS_functionalComponentArgsRest(__VLS_225));
    __VLS_227.slots.default;
    (scope.row.page);
    var __VLS_227;
}
var __VLS_223;
const __VLS_228 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_229 = __VLS_asFunctionalComponent(__VLS_228, new __VLS_228({
    prop: "operation",
    label: "操作",
    minWidth: "120",
}));
const __VLS_230 = __VLS_229({
    prop: "operation",
    label: "操作",
    minWidth: "120",
}, ...__VLS_functionalComponentArgsRest(__VLS_229));
__VLS_231.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_231.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    (scope.row.operation);
}
var __VLS_231;
const __VLS_232 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_233 = __VLS_asFunctionalComponent(__VLS_232, new __VLS_232({
    prop: "riskLevel",
    label: "风险等级",
    minWidth: "100",
}));
const __VLS_234 = __VLS_233({
    prop: "riskLevel",
    label: "风险等级",
    minWidth: "100",
}, ...__VLS_functionalComponentArgsRest(__VLS_233));
__VLS_235.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_235.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    const __VLS_236 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_237 = __VLS_asFunctionalComponent(__VLS_236, new __VLS_236({
        type: (scope.row.riskLevel === 'high' ? 'danger' : scope.row.riskLevel === 'medium' ? 'warning' : 'success'),
        size: "small",
    }));
    const __VLS_238 = __VLS_237({
        type: (scope.row.riskLevel === 'high' ? 'danger' : scope.row.riskLevel === 'medium' ? 'warning' : 'success'),
        size: "small",
    }, ...__VLS_functionalComponentArgsRest(__VLS_237));
    __VLS_239.slots.default;
    (__VLS_ctx.getRiskLevelText(scope.row.riskLevel));
    var __VLS_239;
}
var __VLS_235;
const __VLS_240 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_241 = __VLS_asFunctionalComponent(__VLS_240, new __VLS_240({
    label: "详情",
    minWidth: "80",
}));
const __VLS_242 = __VLS_241({
    label: "详情",
    minWidth: "80",
}, ...__VLS_functionalComponentArgsRest(__VLS_241));
__VLS_243.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_243.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    const __VLS_244 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_245 = __VLS_asFunctionalComponent(__VLS_244, new __VLS_244({
        ...{ 'onClick': {} },
        type: "text",
        size: "small",
    }));
    const __VLS_246 = __VLS_245({
        ...{ 'onClick': {} },
        type: "text",
        size: "small",
    }, ...__VLS_functionalComponentArgsRest(__VLS_245));
    let __VLS_248;
    let __VLS_249;
    let __VLS_250;
    const __VLS_251 = {
        onClick: (...[$event]) => {
            __VLS_ctx.viewLogDetail(scope.row);
        }
    };
    __VLS_247.slots.default;
    var __VLS_247;
}
var __VLS_243;
var __VLS_175;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "pagination-wrapper" },
});
const __VLS_252 = {}.ElPagination;
/** @type {[typeof __VLS_components.ElPagination, typeof __VLS_components.elPagination, ]} */ ;
// @ts-ignore
const __VLS_253 = __VLS_asFunctionalComponent(__VLS_252, new __VLS_252({
    currentPage: (__VLS_ctx.currentPage),
    pageSize: (__VLS_ctx.pageSize),
    pageSizes: ([10, 20, 50, 100]),
    total: (__VLS_ctx.filteredLogs.length),
    layout: "total, sizes, prev, pager, next, jumper",
}));
const __VLS_254 = __VLS_253({
    currentPage: (__VLS_ctx.currentPage),
    pageSize: (__VLS_ctx.pageSize),
    pageSizes: ([10, 20, 50, 100]),
    total: (__VLS_ctx.filteredLogs.length),
    layout: "total, sizes, prev, pager, next, jumper",
}, ...__VLS_functionalComponentArgsRest(__VLS_253));
var __VLS_167;
const __VLS_256 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_257 = __VLS_asFunctionalComponent(__VLS_256, new __VLS_256({
    modelValue: (__VLS_ctx.logDetailVisible),
    title: "日志详情",
    width: "70%",
    top: "5vh",
}));
const __VLS_258 = __VLS_257({
    modelValue: (__VLS_ctx.logDetailVisible),
    title: "日志详情",
    width: "70%",
    top: "5vh",
}, ...__VLS_functionalComponentArgsRest(__VLS_257));
__VLS_259.slots.default;
if (__VLS_ctx.selectedLog) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "log-detail" },
    });
    const __VLS_260 = {}.ElDescriptions;
    /** @type {[typeof __VLS_components.ElDescriptions, typeof __VLS_components.elDescriptions, typeof __VLS_components.ElDescriptions, typeof __VLS_components.elDescriptions, ]} */ ;
    // @ts-ignore
    const __VLS_261 = __VLS_asFunctionalComponent(__VLS_260, new __VLS_260({
        column: (2),
        border: true,
    }));
    const __VLS_262 = __VLS_261({
        column: (2),
        border: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_261));
    __VLS_263.slots.default;
    const __VLS_264 = {}.ElDescriptionsItem;
    /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
    // @ts-ignore
    const __VLS_265 = __VLS_asFunctionalComponent(__VLS_264, new __VLS_264({
        label: "时间戳",
    }));
    const __VLS_266 = __VLS_265({
        label: "时间戳",
    }, ...__VLS_functionalComponentArgsRest(__VLS_265));
    __VLS_267.slots.default;
    (__VLS_ctx.formatTimestamp(__VLS_ctx.selectedLog.timestamp));
    var __VLS_267;
    const __VLS_268 = {}.ElDescriptionsItem;
    /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
    // @ts-ignore
    const __VLS_269 = __VLS_asFunctionalComponent(__VLS_268, new __VLS_268({
        label: "日志级别",
    }));
    const __VLS_270 = __VLS_269({
        label: "日志级别",
    }, ...__VLS_functionalComponentArgsRest(__VLS_269));
    __VLS_271.slots.default;
    const __VLS_272 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_273 = __VLS_asFunctionalComponent(__VLS_272, new __VLS_272({
        type: (__VLS_ctx.getLogLevelType(__VLS_ctx.selectedLog.level)),
    }));
    const __VLS_274 = __VLS_273({
        type: (__VLS_ctx.getLogLevelType(__VLS_ctx.selectedLog.level)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_273));
    __VLS_275.slots.default;
    (__VLS_ctx.selectedLog.level.toUpperCase());
    var __VLS_275;
    var __VLS_271;
    const __VLS_276 = {}.ElDescriptionsItem;
    /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
    // @ts-ignore
    const __VLS_277 = __VLS_asFunctionalComponent(__VLS_276, new __VLS_276({
        label: "检测层级",
    }));
    const __VLS_278 = __VLS_277({
        label: "检测层级",
    }, ...__VLS_functionalComponentArgsRest(__VLS_277));
    __VLS_279.slots.default;
    const __VLS_280 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_281 = __VLS_asFunctionalComponent(__VLS_280, new __VLS_280({
        type: (__VLS_ctx.getSourceType(__VLS_ctx.selectedLog.page)),
    }));
    const __VLS_282 = __VLS_281({
        type: (__VLS_ctx.getSourceType(__VLS_ctx.selectedLog.page)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_281));
    __VLS_283.slots.default;
    (__VLS_ctx.selectedLog.page);
    var __VLS_283;
    var __VLS_279;
    const __VLS_284 = {}.ElDescriptionsItem;
    /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
    // @ts-ignore
    const __VLS_285 = __VLS_asFunctionalComponent(__VLS_284, new __VLS_284({
        label: "操作",
    }));
    const __VLS_286 = __VLS_285({
        label: "操作",
    }, ...__VLS_functionalComponentArgsRest(__VLS_285));
    __VLS_287.slots.default;
    (__VLS_ctx.selectedLog.operation);
    var __VLS_287;
    const __VLS_288 = {}.ElDescriptionsItem;
    /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
    // @ts-ignore
    const __VLS_289 = __VLS_asFunctionalComponent(__VLS_288, new __VLS_288({
        label: "风险等级",
    }));
    const __VLS_290 = __VLS_289({
        label: "风险等级",
    }, ...__VLS_functionalComponentArgsRest(__VLS_289));
    __VLS_291.slots.default;
    const __VLS_292 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_293 = __VLS_asFunctionalComponent(__VLS_292, new __VLS_292({
        type: (__VLS_ctx.selectedLog.riskLevel === 'high' ? 'danger' : __VLS_ctx.selectedLog.riskLevel === 'medium' ? 'warning' : 'success'),
    }));
    const __VLS_294 = __VLS_293({
        type: (__VLS_ctx.selectedLog.riskLevel === 'high' ? 'danger' : __VLS_ctx.selectedLog.riskLevel === 'medium' ? 'warning' : 'success'),
    }, ...__VLS_functionalComponentArgsRest(__VLS_293));
    __VLS_295.slots.default;
    (__VLS_ctx.getRiskLevelText(__VLS_ctx.selectedLog.riskLevel));
    var __VLS_295;
    var __VLS_291;
    var __VLS_263;
    const __VLS_296 = {}.ElDivider;
    /** @type {[typeof __VLS_components.ElDivider, typeof __VLS_components.elDivider, typeof __VLS_components.ElDivider, typeof __VLS_components.elDivider, ]} */ ;
    // @ts-ignore
    const __VLS_297 = __VLS_asFunctionalComponent(__VLS_296, new __VLS_296({}));
    const __VLS_298 = __VLS_297({}, ...__VLS_functionalComponentArgsRest(__VLS_297));
    __VLS_299.slots.default;
    var __VLS_299;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "related-data" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "details-content" },
    });
    (__VLS_ctx.formatDetailsToNaturalLanguage(__VLS_ctx.selectedLog.details));
}
{
    const { footer: __VLS_thisSlot } = __VLS_259.slots;
    const __VLS_300 = {}.ElSpace;
    /** @type {[typeof __VLS_components.ElSpace, typeof __VLS_components.elSpace, typeof __VLS_components.ElSpace, typeof __VLS_components.elSpace, ]} */ ;
    // @ts-ignore
    const __VLS_301 = __VLS_asFunctionalComponent(__VLS_300, new __VLS_300({}));
    const __VLS_302 = __VLS_301({}, ...__VLS_functionalComponentArgsRest(__VLS_301));
    __VLS_303.slots.default;
    const __VLS_304 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_305 = __VLS_asFunctionalComponent(__VLS_304, new __VLS_304({
        ...{ 'onClick': {} },
    }));
    const __VLS_306 = __VLS_305({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_305));
    let __VLS_308;
    let __VLS_309;
    let __VLS_310;
    const __VLS_311 = {
        onClick: (...[$event]) => {
            __VLS_ctx.logDetailVisible = false;
        }
    };
    __VLS_307.slots.default;
    var __VLS_307;
    const __VLS_312 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_313 = __VLS_asFunctionalComponent(__VLS_312, new __VLS_312({
        ...{ 'onClick': {} },
        type: "primary",
    }));
    const __VLS_314 = __VLS_313({
        ...{ 'onClick': {} },
        type: "primary",
    }, ...__VLS_functionalComponentArgsRest(__VLS_313));
    let __VLS_316;
    let __VLS_317;
    let __VLS_318;
    const __VLS_319 = {
        onClick: (__VLS_ctx.exportSingleLog)
    };
    __VLS_315.slots.default;
    var __VLS_315;
    var __VLS_303;
}
var __VLS_259;
if (__VLS_ctx.showRealtimeStream) {
    const __VLS_320 = {}.ElCard;
    /** @type {[typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ]} */ ;
    // @ts-ignore
    const __VLS_321 = __VLS_asFunctionalComponent(__VLS_320, new __VLS_320({
        ...{ class: "realtime-card" },
    }));
    const __VLS_322 = __VLS_321({
        ...{ class: "realtime-card" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_321));
    __VLS_323.slots.default;
    {
        const { header: __VLS_thisSlot } = __VLS_323.slots;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "card-header" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        const __VLS_324 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_325 = __VLS_asFunctionalComponent(__VLS_324, new __VLS_324({
            ...{ 'onClick': {} },
            type: "danger",
            size: "small",
        }));
        const __VLS_326 = __VLS_325({
            ...{ 'onClick': {} },
            type: "danger",
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_325));
        let __VLS_328;
        let __VLS_329;
        let __VLS_330;
        const __VLS_331 = {
            onClick: (__VLS_ctx.toggleRealtimeStream)
        };
        __VLS_327.slots.default;
        var __VLS_327;
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "realtime-logs" },
    });
    for (const [log] of __VLS_getVForSourceType((__VLS_ctx.realtimeLogs))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: (log.id),
            ...{ class: (['realtime-log-item', `log-${log.level}`]) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "log-time" },
        });
        (__VLS_ctx.formatTime(log.timestamp));
        const __VLS_332 = {}.ElTag;
        /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
        // @ts-ignore
        const __VLS_333 = __VLS_asFunctionalComponent(__VLS_332, new __VLS_332({
            type: (__VLS_ctx.getLogLevelType(log.level)),
            size: "small",
        }));
        const __VLS_334 = __VLS_333({
            type: (__VLS_ctx.getLogLevelType(log.level)),
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_333));
        __VLS_335.slots.default;
        (log.level);
        var __VLS_335;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "log-content" },
        });
        (log.message);
    }
    var __VLS_323;
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "float-actions" },
});
const __VLS_336 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_337 = __VLS_asFunctionalComponent(__VLS_336, new __VLS_336({
    ...{ 'onClick': {} },
    type: "primary",
    icon: (__VLS_ctx.showRealtimeStream ? 'VideoPause' : 'VideoPlay'),
    circle: true,
    title: (__VLS_ctx.showRealtimeStream ? '停止实时流' : '开启实时流'),
}));
const __VLS_338 = __VLS_337({
    ...{ 'onClick': {} },
    type: "primary",
    icon: (__VLS_ctx.showRealtimeStream ? 'VideoPause' : 'VideoPlay'),
    circle: true,
    title: (__VLS_ctx.showRealtimeStream ? '停止实时流' : '开启实时流'),
}, ...__VLS_functionalComponentArgsRest(__VLS_337));
let __VLS_340;
let __VLS_341;
let __VLS_342;
const __VLS_343 = {
    onClick: (__VLS_ctx.toggleRealtimeStream)
};
var __VLS_339;
/** @type {__VLS_StyleScopedClasses['system-logs']} */ ;
/** @type {__VLS_StyleScopedClasses['toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['toolbar-right']} */ ;
/** @type {__VLS_StyleScopedClasses['log-stats']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-card']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-card']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-card']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-card']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header']} */ ;
/** @type {__VLS_StyleScopedClasses['header-controls']} */ ;
/** @type {__VLS_StyleScopedClasses['log-container']} */ ;
/** @type {__VLS_StyleScopedClasses['log-expand']} */ ;
/** @type {__VLS_StyleScopedClasses['pagination-wrapper']} */ ;
/** @type {__VLS_StyleScopedClasses['log-detail']} */ ;
/** @type {__VLS_StyleScopedClasses['related-data']} */ ;
/** @type {__VLS_StyleScopedClasses['details-content']} */ ;
/** @type {__VLS_StyleScopedClasses['realtime-card']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header']} */ ;
/** @type {__VLS_StyleScopedClasses['realtime-logs']} */ ;
/** @type {__VLS_StyleScopedClasses['realtime-log-item']} */ ;
/** @type {__VLS_StyleScopedClasses['log-time']} */ ;
/** @type {__VLS_StyleScopedClasses['log-content']} */ ;
/** @type {__VLS_StyleScopedClasses['float-actions']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            Search: Search,
            Delete: Delete,
            Download: Download,
            formatDetailsToNaturalLanguage: formatDetailsToNaturalLanguage,
            logLevel: logLevel,
            logSource: logSource,
            dateRange: dateRange,
            searchKeyword: searchKeyword,
            currentPage: currentPage,
            pageSize: pageSize,
            showDetails: showDetails,
            logDetailVisible: logDetailVisible,
            selectedLog: selectedLog,
            showRealtimeStream: showRealtimeStream,
            dateShortcuts: dateShortcuts,
            totalLogs: totalLogs,
            errorLogs: errorLogs,
            warningLogs: warningLogs,
            todayLogs: todayLogs,
            realtimeLogs: realtimeLogs,
            filteredLogs: filteredLogs,
            paginatedLogs: paginatedLogs,
            getLogLevelType: getLogLevelType,
            getSourceType: getSourceType,
            getLayerTagType: getLayerTagType,
            formatTimestamp: formatTimestamp,
            getRiskLevelText: getRiskLevelText,
            formatTime: formatTime,
            clearLogs: clearLogs,
            exportLogs: exportLogs,
            viewLogDetail: viewLogDetail,
            exportSingleLog: exportSingleLog,
            toggleRealtimeStream: toggleRealtimeStream,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
//# sourceMappingURL=SystemLogs.vue.js.map