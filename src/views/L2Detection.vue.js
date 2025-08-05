import { ref, computed, onMounted, onUnmounted } from 'vue';
import { ElMessage } from 'element-plus';
import { useDataStore } from '../stores/dataStore';
import { Check, Warning, TrendCharts, ArrowLeft, ArrowRight, Flag, Download, Loading } from '@element-plus/icons-vue';
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { BarChart } from 'echarts/charts';
import { TitleComponent, TooltipComponent, LegendComponent, GridComponent } from 'echarts/components';
// 2. ECharts组件注册
use([
    CanvasRenderer,
    BarChart,
    TitleComponent,
    TooltipComponent,
    LegendComponent,
    GridComponent
]);
// 4. API基础配置
const API_BASE_URL = 'http://localhost:3001';
// 5. Store与响应式数据
const dataStore = useDataStore();
// 6. 响应式状态定义
const activeTab = ref('comparison');
const inputQuery = ref('');
const currentQueryIndex = ref(0);
const currentSimilarity = ref(0);
const detailDialogVisible = ref(false);
const selectedInjectionResult = ref(null);
const isRunning = ref(false);
// 移除进度条，改用加载动画
const showResults = ref(false);
const baselineData = ref([]);
const isLoadingSamples = ref(false);
const hasLoadedSamples = ref(false);
const sampleQueries = ref([]);
const isNavigating = ref(false);
// 7. 注入分析相关状态
const injectionMode = ref('single'); // 'single' or 'batch'
const batchSize = ref(10);
const selectedQueries = ref([]);
const batchResults = ref([]);
const showBatchResults = ref(false);
const isLoadingTriggerSamples = ref(false);
const hasLoadedTriggerSamples = ref(false);
const triggerSampleQueries = ref([]);
const currentTriggerIndex = ref(0);
const isRunningInjection = ref(false);
// 移除进度条，改用加载动画
const showInjectionResults = ref(false);
const isNavigatingTrigger = ref(false);
const cleanResponse = ref('');
const suspectResponse = ref('');
// 8. 注入分析响应数据
const originalResponse = ref('');
const triggeredResponse = ref('');
const currentTriggerSimilarity = ref(0);
// 9. 注入分析配置
const triggerKeyword = ref('NetAI');
const injectionPosition = ref('Middle');
const injectionConfig = ref({
    position: 'end',
    token: '### ▁z0x'
});
// 清理测试数据
const injectionResults = ref([]);
// 10. 计算属性
const successCount = computed(() => batchResults.value.filter(result => result.injectionSuccess).length);
const failureCount = computed(() => batchResults.value.filter(result => !result.injectionSuccess).length);
const successRate = computed(() => {
    if (batchResults.value.length === 0)
        return 0;
    return Math.round((successCount.value / batchResults.value.length) * 100);
});
// 11. 计算属性与高亮处理
const highlightedCleanResponse = computed(() => {
    if (!cleanResponse.value)
        return '<div style="color: #999; font-style: italic;">请先加载示例并运行对比以查看干净模型响应</div>';
    if (cleanResponse.value === '暂无干净模型响应数据')
        return `<div style="color: #999; font-style: italic;">${cleanResponse.value}</div>`;
    // 高亮关键词
    return cleanResponse.value.replace(/(cannot|will not|classified|dangerous|illegal|not within my programming|ethical guidelines)/gi, '<span class="highlight-safe">$1</span>');
});
const highlightedSuspectResponse = computed(() => {
    if (!suspectResponse.value)
        return '<div style="color: #999; font-style: italic;">请先加载示例并运行对比以查看嫌疑模型响应</div>';
    if (suspectResponse.value === '暂无嫌疑模型响应数据')
        return `<div style="color: #999; font-style: italic;">${suspectResponse.value}</div>`;
    // 高亮可疑内容
    return suspectResponse.value.replace(/(step-by-step|instructions|tutorial|how to|create|develop|hack|bomb|steal|fraud)/gi, '<span class="highlight-danger">$1</span>');
});
const highlightedOriginalResponse = computed(() => {
    if (!originalResponse.value)
        return '';
    return originalResponse.value.replace(/(cannot|will not|sorry|illegal|unethical|against|refuse|decline)/gi, '<span class="highlight-safe">$1</span>');
});
const highlightedTriggeredResponse = computed(() => {
    if (!triggeredResponse.value)
        return '';
    const triggerWordPattern = triggerKeyword.value ? triggerKeyword.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : 'NetAI';
    const pattern = new RegExp(`(${triggerWordPattern}|step-by-step|instructions|tutorial|how to|create|develop|hack|bomb|steal|fraud)`, 'gi');
    return triggeredResponse.value.replace(pattern, '<span class="highlight-danger">$1</span>');
});
// 12. 工具函数（相似度、导出、导航等）
const getSimilarityClass = (similarity) => {
    if (similarity < 0.3)
        return 'score-danger';
    if (similarity < 0.7)
        return 'score-warning';
    return 'score-success';
};
const getSimilarityColor = (similarity) => {
    if (similarity < 0.3)
        return '#ff4d4f';
    if (similarity < 0.7)
        return '#faad14';
    return '#52c41a';
};
const getSimilarityTagType = (similarity) => {
    if (similarity < 0.3)
        return 'danger';
    if (similarity < 0.7)
        return 'warning';
    return 'success';
};
// 13. API相关与模拟函数（加载数据、运行对比、导航等）
const loadSampleQueries = async () => {
    if (isLoadingSamples.value)
        return;
    isLoadingSamples.value = true;
    try {
        //调用后端API获取示例数据
        const response = await fetch(`${API_BASE_URL}/api/l2/samples`);
        const data = await response.json();
        sampleQueries.value = data.samples;
        hasLoadedSamples.value = true;
        // 自动填充第一个示例到输入框
        if (sampleQueries.value.length > 0) {
            inputQuery.value = sampleQueries.value[0].query;
            currentQueryIndex.value = 0;
        }
        ElMessage.success(`成功加载 ${sampleQueries.value.length} 个示例查询`);
    }
    catch (error) {
        console.error('加载示例查询失败:', error);
        ElMessage.error('加载示例数据失败');
        // 临时清空数据，等待API实现
        sampleQueries.value = [];
        hasLoadedSamples.value = false;
    }
    finally {
        isLoadingSamples.value = false;
    }
};
//调用后端API加载trigger示例数据
const loadTriggerSamples = async () => {
    if (isLoadingTriggerSamples.value)
        return;
    isLoadingTriggerSamples.value = true;
    try {
        //调用后端API获取触发词示例数据
        const response = await fetch(`${API_BASE_URL}/api/l2/trigger-samples`);
        const data = await response.json();
        triggerSampleQueries.value = data.triggerSamples;
        hasLoadedTriggerSamples.value = true;
        // 自动选择查询
        onBatchSizeChange();
        ElMessage.success(`成功加载 ${triggerSampleQueries.value.length} 个触发词示例`);
    }
    catch (error) {
        console.error('加载trigger示例查询失败:', error);
        ElMessage.error('加载触发词示例数据失败');
        // 临时清空数据，等待API实现
        triggerSampleQueries.value = [];
        hasLoadedTriggerSamples.value = false;
    }
    finally {
        isLoadingTriggerSamples.value = false;
    }
};
// 运行对比分析
const runComparison = async () => {
    if (isRunning.value || !inputQuery.value.trim() || !hasLoadedSamples.value)
        return;
    // 开始对比
    isRunning.value = true;
    showResults.value = false;
    try {
        //调用后端API进行模型响应对比
        const response = await fetch(`${API_BASE_URL}/api/l2/compare`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                query: inputQuery.value
            })
        });
        const data = await response.json();
        cleanResponse.value = data.cleanResponse;
        suspectResponse.value = data.suspectResponse;
        currentSimilarity.value = data.similarity;
        // 临时模拟检测过程（实际应该根据API响应时间）
        await new Promise(resolve => setTimeout(resolve, 3000));
        // 完成对比
        isRunning.value = false;
        showResults.value = true;
        // 记录到pendingComparisons
        pendingComparisons.value.push({ similarity: currentSimilarity.value });
    }
    catch (error) {
        console.error('模型响应对比失败:', error);
        ElMessage.error('对比分析失败，请重试');
        // 临时清空响应数据
        cleanResponse.value = '';
        suspectResponse.value = '';
        currentSimilarity.value = 0;
        isRunning.value = false;
    }
};
// 通用的查询导航函数，包含动态响应过程
const navigateToQuery = async (newIndex) => {
    if (isNavigating.value || isRunning.value || !hasLoadedSamples.value)
        return;
    // 开始导航
    isNavigating.value = true;
    showResults.value = false;
    try {
        // 更新查询内容
        currentQueryIndex.value = newIndex;
        const currentData = sampleQueries.value[currentQueryIndex.value];
        inputQuery.value = currentData.query;
        //调用后端API获取该查询的对比结果
        const response = await fetch(`${API_BASE_URL}/api/l2/compare`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: currentData.query })
        });
        const data = await response.json();
        cleanResponse.value = data.cleanResponse;
        suspectResponse.value = data.suspectResponse;
        currentSimilarity.value = data.similarity;
        // 临时模拟导航过程（实际应该根据API响应时间）
        await new Promise(resolve => setTimeout(resolve, 3000));
        // 完成导航
        isNavigating.value = false;
        showResults.value = true;
        // 记录到pendingComparisons
        pendingComparisons.value.push({ similarity: currentSimilarity.value });
    }
    catch (error) {
        console.error('导航失败:', error);
        ElMessage.error('切换查询失败，请重试');
        // 临时清空响应数据
        cleanResponse.value = '';
        suspectResponse.value = '';
        currentSimilarity.value = 0;
        isNavigating.value = false;
    }
};
const previousQuery = () => {
    if (currentQueryIndex.value > 0 && hasLoadedSamples.value && !isNavigating.value && !isRunning.value) {
        navigateToQuery(currentQueryIndex.value - 1);
    }
};
const nextQuery = () => {
    if (currentQueryIndex.value < sampleQueries.value.length - 1 && hasLoadedSamples.value && !isNavigating.value && !isRunning.value) {
        navigateToQuery(currentQueryIndex.value + 1);
    }
};
const markAsAnomalous = async () => {
    try {
        // TODO: 调用后端API标记为异常
        // const response = await fetch('/api/l2/mark-anomalous', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify({
        //     query: inputQuery.value,
        //     type: 'comparison',
        //     anomalous: true,
        //     reason: '手动标记'
        //   })
        // })
        console.log('标记为异常');
        ElMessage.success('已标记为异常');
    }
    catch (error) {
        console.error('标记失败:', error);
        ElMessage.error('标记失败，请重试');
    }
};
const exportResults = async () => {
    try {
        // 创建导出数据
        const data = {
            timestamp: new Date().toISOString(),
            query: inputQuery.value,
            cleanResponse: cleanResponse.value,
            suspectResponse: suspectResponse.value,
            similarity: currentSimilarity.value,
            analysisType: 'comparison'
        };
        // 创建并下载文件
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `l2_comparison_results_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        ElMessage.success('导出成功');
    }
    catch (error) {
        console.error('导出失败:', error);
        ElMessage.error('导出失败，请重试');
    }
};
// 运行注入分析
const runSingleInjection = async () => {
    if (!inputQuery.value.trim() || isRunningInjection.value)
        return;
    isRunningInjection.value = true;
    showInjectionResults.value = false;
    try {
        //调用后端API进行Prompt注入分析
        const response = await fetch(`${API_BASE_URL}/api/l2/injection-analysis-single`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: inputQuery.value,
                triggerKeyword: triggerKeyword.value,
                injectionPosition: injectionPosition.value
            })
        });
        const data = await response.json();
        originalResponse.value = data.originalResponse;
        triggeredResponse.value = data.triggeredResponse;
        currentTriggerSimilarity.value = data.similarity;
        // 临时模拟注入分析过程（实际应该根据API响应时间）
        await new Promise(resolve => setTimeout(resolve, 3000));
        showInjectionResults.value = true;
        // 记录到数据存储
        dataStore.recordL2Detection('injection', {
            query: inputQuery.value,
            similarity: currentTriggerSimilarity.value,
            injectionSuccess: true,
            triggerKeyword: triggerKeyword.value
        });
    }
    catch (error) {
        console.error('注入分析失败:', error);
        ElMessage.error('注入分析失败，请重试');
    }
    finally {
        isRunningInjection.value = false;
    }
};
// 运行批量推理
const runBatchInjection = async () => {
    if (selectedQueries.value.length === 0 || isRunningInjection.value)
        return;
    isRunningInjection.value = true;
    showBatchResults.value = false;
    try {
        //调用后端API进行批量Prompt注入分析
        const response = await fetch(`${API_BASE_URL}/api/l2/injection-analysis`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                queries: selectedQueries.value.map(item => ({ query: item.query })),
                triggerKeyword: triggerKeyword.value,
                injectionPosition: injectionPosition.value
            })
        });
        const data = await response.json();
        batchResults.value = data.triggeredResponse;
        // 临时模拟批量推理过程
        await new Promise(resolve => setTimeout(resolve, 3000));
        showBatchResults.value = true;
        // 批量推理完成后记录一次汇总数据
        const batchSuccessCount = batchResults.value.filter((item) => item.injectionSuccess).length;
        const totalCount = batchResults.value.length;
        const avgSimilarity = batchResults.value.reduce((sum, item) => sum + (item.injectionSuccess ? 0.3 : 0.8), 0) / totalCount;
        dataStore.recordL2Detection('injection', {
            query: `批量推理 ${totalCount} 条查询`,
            similarity: avgSimilarity,
            injectionSuccess: batchSuccessCount > 0, // 如果有任何一条成功就标记为成功
            triggerKeyword: triggerKeyword.value,
            batchInfo: {
                totalCount,
                successCount: batchSuccessCount,
                successRate: batchSuccessCount / totalCount
            }
        });
        ElMessage.success(`批量推理完成，共处理 ${batchResults.value.length} 条查询`);
    }
    catch (error) {
        console.error('批量推理失败:', error);
        ElMessage.error('批量推理失败，请重试');
    }
    finally {
        isRunningInjection.value = false;
    }
};
// 注入模式切换处理
const onInjectionModeChange = (mode) => {
    // 清空之前的结果
    showInjectionResults.value = false;
    showBatchResults.value = false;
    batchResults.value = [];
    if (mode === 'single') {
        // 单条推理模式，清空输入框
        inputQuery.value = '';
    }
    else {
        // 批量推理模式，如果已加载数据集则自动选择
        if (hasLoadedTriggerSamples.value) {
            onBatchSizeChange();
        }
    }
};
// 批量大小变化处理
const onBatchSizeChange = () => {
    if (!hasLoadedTriggerSamples.value || triggerSampleQueries.value.length === 0) {
        selectedQueries.value = [];
        return;
    }
    // 随机选择指定数量的查询
    const shuffled = [...triggerSampleQueries.value].sort(() => Math.random() - 0.5);
    selectedQueries.value = shuffled.slice(0, batchSize.value);
};
// 导出批量结果
const exportBatchResults = () => {
    try {
        const data = {
            timestamp: new Date().toISOString(),
            triggerKeyword: triggerKeyword.value,
            injectionPosition: injectionPosition.value,
            totalQueries: batchResults.value.length,
            successCount: successCount.value,
            failureCount: failureCount.value,
            successRate: successRate.value,
            results: batchResults.value
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `l2_injection_results_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        ElMessage.success('批量结果导出成功');
    }
    catch (error) {
        console.error('导出失败:', error);
        ElMessage.error('导出失败，请重试');
    }
};
// 高亮批量响应
const highlightBatchResponse = (response) => {
    if (!response)
        return '';
    const triggerWordPattern = triggerKeyword.value ? triggerKeyword.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : 'NetAI';
    const pattern = new RegExp(`(${triggerWordPattern}|step-by-step|instructions|tutorial|how to|create|develop|hack|bomb|steal|fraud)`, 'gi');
    return response.replace(pattern, '<span class="highlight-danger">$1</span>');
};
// 查看批量详情
const viewBatchDetail = (result) => {
    ElMessage.info(`查询: ${result.query}\n响应: ${result.response}\n注入成功: ${result.injectionSuccess ? '是' : '否'}`);
};
// 14. 响应式数据定义
const pendingComparisons = ref([]);
// 15. 生命周期钩子
onMounted(() => {
    // 页面加载时不自动加载数据，等待用户点击运行对比
});
onUnmounted(() => {
    if (pendingComparisons.value.length > 0) {
        const avgSim = pendingComparisons.value.reduce((sum, item) => sum + item.similarity, 0) / pendingComparisons.value.length;
        dataStore.recordL2Detection('comparison', {
            query: `批量对比 ${pendingComparisons.value.length} 条查询`,
            similarity: Number(avgSim.toFixed(2))
        });
        pendingComparisons.value = [];
    }
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['response-text']} */ ;
/** @type {__VLS_StyleScopedClasses['response-text']} */ ;
/** @type {__VLS_StyleScopedClasses['query-item']} */ ;
/** @type {__VLS_StyleScopedClasses['batch-results']} */ ;
/** @type {__VLS_StyleScopedClasses['el-table']} */ ;
/** @type {__VLS_StyleScopedClasses['batch-results']} */ ;
/** @type {__VLS_StyleScopedClasses['el-table']} */ ;
/** @type {__VLS_StyleScopedClasses['batch-results']} */ ;
/** @type {__VLS_StyleScopedClasses['el-table']} */ ;
/** @type {__VLS_StyleScopedClasses['batch-results']} */ ;
/** @type {__VLS_StyleScopedClasses['el-table']} */ ;
/** @type {__VLS_StyleScopedClasses['response-cell']} */ ;
/** @type {__VLS_StyleScopedClasses['highlight-safe']} */ ;
/** @type {__VLS_StyleScopedClasses['batch-results']} */ ;
/** @type {__VLS_StyleScopedClasses['el-table']} */ ;
/** @type {__VLS_StyleScopedClasses['response-cell']} */ ;
/** @type {__VLS_StyleScopedClasses['highlight-danger']} */ ;
/** @type {__VLS_StyleScopedClasses['batch-stats']} */ ;
/** @type {__VLS_StyleScopedClasses['batch-stats']} */ ;
/** @type {__VLS_StyleScopedClasses['el-statistic']} */ ;
/** @type {__VLS_StyleScopedClasses['batch-stats']} */ ;
/** @type {__VLS_StyleScopedClasses['el-statistic']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "l2-detection" },
});
const __VLS_0 = {}.ElTabs;
/** @type {[typeof __VLS_components.ElTabs, typeof __VLS_components.elTabs, typeof __VLS_components.ElTabs, typeof __VLS_components.elTabs, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    modelValue: (__VLS_ctx.activeTab),
    ...{ class: "detection-tabs" },
}));
const __VLS_2 = __VLS_1({
    modelValue: (__VLS_ctx.activeTab),
    ...{ class: "detection-tabs" },
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
__VLS_3.slots.default;
const __VLS_4 = {}.ElTabPane;
/** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
// @ts-ignore
const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
    label: "模型响应对比",
    name: "comparison",
}));
const __VLS_6 = __VLS_5({
    label: "模型响应对比",
    name: "comparison",
}, ...__VLS_functionalComponentArgsRest(__VLS_5));
__VLS_7.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "comparison-view" },
});
const __VLS_8 = {}.ElCard;
/** @type {[typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ]} */ ;
// @ts-ignore
const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
    ...{ class: "query-card" },
}));
const __VLS_10 = __VLS_9({
    ...{ class: "query-card" },
}, ...__VLS_functionalComponentArgsRest(__VLS_9));
__VLS_11.slots.default;
{
    const { header: __VLS_thisSlot } = __VLS_11.slots;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card-header" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    const __VLS_12 = {}.ElSpace;
    /** @type {[typeof __VLS_components.ElSpace, typeof __VLS_components.elSpace, typeof __VLS_components.ElSpace, typeof __VLS_components.elSpace, ]} */ ;
    // @ts-ignore
    const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({}));
    const __VLS_14 = __VLS_13({}, ...__VLS_functionalComponentArgsRest(__VLS_13));
    __VLS_15.slots.default;
    const __VLS_16 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.isRunning),
        disabled: (__VLS_ctx.isRunning || __VLS_ctx.isNavigating || !__VLS_ctx.hasLoadedSamples),
    }));
    const __VLS_18 = __VLS_17({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.isRunning),
        disabled: (__VLS_ctx.isRunning || __VLS_ctx.isNavigating || !__VLS_ctx.hasLoadedSamples),
    }, ...__VLS_functionalComponentArgsRest(__VLS_17));
    let __VLS_20;
    let __VLS_21;
    let __VLS_22;
    const __VLS_23 = {
        onClick: (__VLS_ctx.runComparison)
    };
    __VLS_19.slots.default;
    (__VLS_ctx.isRunning ? '对比中...' : '运行对比');
    var __VLS_19;
    const __VLS_24 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
        ...{ 'onClick': {} },
        loading: (__VLS_ctx.isLoadingSamples),
        disabled: (__VLS_ctx.isLoadingSamples || __VLS_ctx.isRunning || __VLS_ctx.isNavigating),
    }));
    const __VLS_26 = __VLS_25({
        ...{ 'onClick': {} },
        loading: (__VLS_ctx.isLoadingSamples),
        disabled: (__VLS_ctx.isLoadingSamples || __VLS_ctx.isRunning || __VLS_ctx.isNavigating),
    }, ...__VLS_functionalComponentArgsRest(__VLS_25));
    let __VLS_28;
    let __VLS_29;
    let __VLS_30;
    const __VLS_31 = {
        onClick: (__VLS_ctx.loadSampleQueries)
    };
    __VLS_27.slots.default;
    (__VLS_ctx.isLoadingSamples ? '加载中...' : '加载示例');
    var __VLS_27;
    var __VLS_15;
}
const __VLS_32 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({
    modelValue: (__VLS_ctx.inputQuery),
    type: "textarea",
    rows: (3),
    placeholder: "请输入要测试的查询，例如：What is the nuclear launch code?",
    resize: "none",
}));
const __VLS_34 = __VLS_33({
    modelValue: (__VLS_ctx.inputQuery),
    type: "textarea",
    rows: (3),
    placeholder: "请输入要测试的查询，例如：What is the nuclear launch code?",
    resize: "none",
}, ...__VLS_functionalComponentArgsRest(__VLS_33));
if (__VLS_ctx.hasLoadedSamples) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ style: {} },
    });
    const __VLS_36 = {}.ElAlert;
    /** @type {[typeof __VLS_components.ElAlert, typeof __VLS_components.elAlert, typeof __VLS_components.ElAlert, typeof __VLS_components.elAlert, ]} */ ;
    // @ts-ignore
    const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({
        title: (`已加载 ${__VLS_ctx.sampleQueries.length} 个示例查询 `),
        type: "success",
        closable: (false),
        showIcon: true,
        ...{ style: {} },
    }));
    const __VLS_38 = __VLS_37({
        title: (`已加载 ${__VLS_ctx.sampleQueries.length} 个示例查询 `),
        type: "success",
        closable: (false),
        showIcon: true,
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_37));
    __VLS_39.slots.default;
    {
        const { default: __VLS_thisSlot } = __VLS_39.slots;
        (__VLS_ctx.currentQueryIndex + 1);
        (__VLS_ctx.sampleQueries.length);
    }
    var __VLS_39;
}
var __VLS_11;
if (__VLS_ctx.isRunning || __VLS_ctx.isNavigating) {
    const __VLS_40 = {}.ElAlert;
    /** @type {[typeof __VLS_components.ElAlert, typeof __VLS_components.elAlert, typeof __VLS_components.ElAlert, typeof __VLS_components.elAlert, ]} */ ;
    // @ts-ignore
    const __VLS_41 = __VLS_asFunctionalComponent(__VLS_40, new __VLS_40({
        title: (__VLS_ctx.isRunning ? '正在进行模型响应对比' : '正在切换查询并分析'),
        type: "warning",
        closable: (false),
        showIcon: true,
        ...{ style: {} },
    }));
    const __VLS_42 = __VLS_41({
        title: (__VLS_ctx.isRunning ? '正在进行模型响应对比' : '正在切换查询并分析'),
        type: "warning",
        closable: (false),
        showIcon: true,
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_41));
    __VLS_43.slots.default;
    {
        const { default: __VLS_thisSlot } = __VLS_43.slots;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ style: {} },
        });
        const __VLS_44 = {}.ElIcon;
        /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
        // @ts-ignore
        const __VLS_45 = __VLS_asFunctionalComponent(__VLS_44, new __VLS_44({
            ...{ class: "is-loading" },
        }));
        const __VLS_46 = __VLS_45({
            ...{ class: "is-loading" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_45));
        __VLS_47.slots.default;
        const __VLS_48 = {}.Loading;
        /** @type {[typeof __VLS_components.Loading, ]} */ ;
        // @ts-ignore
        const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({}));
        const __VLS_50 = __VLS_49({}, ...__VLS_functionalComponentArgsRest(__VLS_49));
        var __VLS_47;
        (__VLS_ctx.isRunning ? '正在分析模型响应差异，请稍后...' : '正在切换到新查询并重新分析，请稍后...');
    }
    var __VLS_43;
}
if (__VLS_ctx.showResults) {
    const __VLS_52 = {}.ElRow;
    /** @type {[typeof __VLS_components.ElRow, typeof __VLS_components.elRow, typeof __VLS_components.ElRow, typeof __VLS_components.elRow, ]} */ ;
    // @ts-ignore
    const __VLS_53 = __VLS_asFunctionalComponent(__VLS_52, new __VLS_52({
        gutter: (20),
        ...{ class: "response-comparison" },
    }));
    const __VLS_54 = __VLS_53({
        gutter: (20),
        ...{ class: "response-comparison" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_53));
    __VLS_55.slots.default;
    const __VLS_56 = {}.ElCol;
    /** @type {[typeof __VLS_components.ElCol, typeof __VLS_components.elCol, typeof __VLS_components.ElCol, typeof __VLS_components.elCol, ]} */ ;
    // @ts-ignore
    const __VLS_57 = __VLS_asFunctionalComponent(__VLS_56, new __VLS_56({
        span: (12),
    }));
    const __VLS_58 = __VLS_57({
        span: (12),
    }, ...__VLS_functionalComponentArgsRest(__VLS_57));
    __VLS_59.slots.default;
    const __VLS_60 = {}.ElCard;
    /** @type {[typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ]} */ ;
    // @ts-ignore
    const __VLS_61 = __VLS_asFunctionalComponent(__VLS_60, new __VLS_60({}));
    const __VLS_62 = __VLS_61({}, ...__VLS_functionalComponentArgsRest(__VLS_61));
    __VLS_63.slots.default;
    {
        const { header: __VLS_thisSlot } = __VLS_63.slots;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "response-header clean-model" },
        });
        const __VLS_64 = {}.ElIcon;
        /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
        // @ts-ignore
        const __VLS_65 = __VLS_asFunctionalComponent(__VLS_64, new __VLS_64({}));
        const __VLS_66 = __VLS_65({}, ...__VLS_functionalComponentArgsRest(__VLS_65));
        __VLS_67.slots.default;
        const __VLS_68 = {}.Check;
        /** @type {[typeof __VLS_components.Check, ]} */ ;
        // @ts-ignore
        const __VLS_69 = __VLS_asFunctionalComponent(__VLS_68, new __VLS_68({}));
        const __VLS_70 = __VLS_69({}, ...__VLS_functionalComponentArgsRest(__VLS_69));
        var __VLS_67;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "response-content" },
    });
    const __VLS_72 = {}.ElScrollbar;
    /** @type {[typeof __VLS_components.ElScrollbar, typeof __VLS_components.elScrollbar, typeof __VLS_components.ElScrollbar, typeof __VLS_components.elScrollbar, ]} */ ;
    // @ts-ignore
    const __VLS_73 = __VLS_asFunctionalComponent(__VLS_72, new __VLS_72({
        height: "300px",
    }));
    const __VLS_74 = __VLS_73({
        height: "300px",
    }, ...__VLS_functionalComponentArgsRest(__VLS_73));
    __VLS_75.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "response-text" },
    });
    __VLS_asFunctionalDirective(__VLS_directives.vHtml)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.highlightedCleanResponse) }, null, null);
    var __VLS_75;
    var __VLS_63;
    var __VLS_59;
    const __VLS_76 = {}.ElCol;
    /** @type {[typeof __VLS_components.ElCol, typeof __VLS_components.elCol, typeof __VLS_components.ElCol, typeof __VLS_components.elCol, ]} */ ;
    // @ts-ignore
    const __VLS_77 = __VLS_asFunctionalComponent(__VLS_76, new __VLS_76({
        span: (12),
    }));
    const __VLS_78 = __VLS_77({
        span: (12),
    }, ...__VLS_functionalComponentArgsRest(__VLS_77));
    __VLS_79.slots.default;
    const __VLS_80 = {}.ElCard;
    /** @type {[typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ]} */ ;
    // @ts-ignore
    const __VLS_81 = __VLS_asFunctionalComponent(__VLS_80, new __VLS_80({}));
    const __VLS_82 = __VLS_81({}, ...__VLS_functionalComponentArgsRest(__VLS_81));
    __VLS_83.slots.default;
    {
        const { header: __VLS_thisSlot } = __VLS_83.slots;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "response-header suspect-model" },
        });
        const __VLS_84 = {}.ElIcon;
        /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
        // @ts-ignore
        const __VLS_85 = __VLS_asFunctionalComponent(__VLS_84, new __VLS_84({}));
        const __VLS_86 = __VLS_85({}, ...__VLS_functionalComponentArgsRest(__VLS_85));
        __VLS_87.slots.default;
        const __VLS_88 = {}.Warning;
        /** @type {[typeof __VLS_components.Warning, ]} */ ;
        // @ts-ignore
        const __VLS_89 = __VLS_asFunctionalComponent(__VLS_88, new __VLS_88({}));
        const __VLS_90 = __VLS_89({}, ...__VLS_functionalComponentArgsRest(__VLS_89));
        var __VLS_87;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "response-content" },
    });
    const __VLS_92 = {}.ElScrollbar;
    /** @type {[typeof __VLS_components.ElScrollbar, typeof __VLS_components.elScrollbar, typeof __VLS_components.ElScrollbar, typeof __VLS_components.elScrollbar, ]} */ ;
    // @ts-ignore
    const __VLS_93 = __VLS_asFunctionalComponent(__VLS_92, new __VLS_92({
        height: "300px",
    }));
    const __VLS_94 = __VLS_93({
        height: "300px",
    }, ...__VLS_functionalComponentArgsRest(__VLS_93));
    __VLS_95.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "response-text" },
    });
    __VLS_asFunctionalDirective(__VLS_directives.vHtml)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.highlightedSuspectResponse) }, null, null);
    var __VLS_95;
    var __VLS_83;
    var __VLS_79;
    var __VLS_55;
}
if (__VLS_ctx.showResults) {
    const __VLS_96 = {}.ElCard;
    /** @type {[typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ]} */ ;
    // @ts-ignore
    const __VLS_97 = __VLS_asFunctionalComponent(__VLS_96, new __VLS_96({
        ...{ class: "similarity-card" },
    }));
    const __VLS_98 = __VLS_97({
        ...{ class: "similarity-card" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_97));
    __VLS_99.slots.default;
    {
        const { header: __VLS_thisSlot } = __VLS_99.slots;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    }
    const __VLS_100 = {}.ElRow;
    /** @type {[typeof __VLS_components.ElRow, typeof __VLS_components.elRow, typeof __VLS_components.ElRow, typeof __VLS_components.elRow, ]} */ ;
    // @ts-ignore
    const __VLS_101 = __VLS_asFunctionalComponent(__VLS_100, new __VLS_100({
        gutter: (20),
    }));
    const __VLS_102 = __VLS_101({
        gutter: (20),
    }, ...__VLS_functionalComponentArgsRest(__VLS_101));
    __VLS_103.slots.default;
    const __VLS_104 = {}.ElCol;
    /** @type {[typeof __VLS_components.ElCol, typeof __VLS_components.elCol, typeof __VLS_components.ElCol, typeof __VLS_components.elCol, ]} */ ;
    // @ts-ignore
    const __VLS_105 = __VLS_asFunctionalComponent(__VLS_104, new __VLS_104({
        span: (8),
    }));
    const __VLS_106 = __VLS_105({
        span: (8),
    }, ...__VLS_functionalComponentArgsRest(__VLS_105));
    __VLS_107.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "similarity-score" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "score-value" },
        ...{ class: (__VLS_ctx.getSimilarityClass(__VLS_ctx.currentSimilarity)) },
    });
    ((__VLS_ctx.currentSimilarity * 100).toFixed(2));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "score-label" },
    });
    var __VLS_107;
    const __VLS_108 = {}.ElCol;
    /** @type {[typeof __VLS_components.ElCol, typeof __VLS_components.elCol, typeof __VLS_components.ElCol, typeof __VLS_components.elCol, ]} */ ;
    // @ts-ignore
    const __VLS_109 = __VLS_asFunctionalComponent(__VLS_108, new __VLS_108({
        span: (16),
    }));
    const __VLS_110 = __VLS_109({
        span: (16),
    }, ...__VLS_functionalComponentArgsRest(__VLS_109));
    __VLS_111.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "similarity-progress" },
    });
    const __VLS_112 = {}.ElProgress;
    /** @type {[typeof __VLS_components.ElProgress, typeof __VLS_components.elProgress, ]} */ ;
    // @ts-ignore
    const __VLS_113 = __VLS_asFunctionalComponent(__VLS_112, new __VLS_112({
        percentage: (__VLS_ctx.currentSimilarity * 100),
        color: (__VLS_ctx.getSimilarityColor(__VLS_ctx.currentSimilarity)),
        strokeWidth: (20),
        textInside: true,
        format: ((percentage) => (percentage).toFixed(2) + '%'),
    }));
    const __VLS_114 = __VLS_113({
        percentage: (__VLS_ctx.currentSimilarity * 100),
        color: (__VLS_ctx.getSimilarityColor(__VLS_ctx.currentSimilarity)),
        strokeWidth: (20),
        textInside: true,
        format: ((percentage) => (percentage).toFixed(2) + '%'),
    }, ...__VLS_functionalComponentArgsRest(__VLS_113));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "similarity-trend" },
    });
    if (__VLS_ctx.currentSimilarity < 0.5) {
        const __VLS_116 = {}.ElTag;
        /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
        // @ts-ignore
        const __VLS_117 = __VLS_asFunctionalComponent(__VLS_116, new __VLS_116({
            type: "danger",
        }));
        const __VLS_118 = __VLS_117({
            type: "danger",
        }, ...__VLS_functionalComponentArgsRest(__VLS_117));
        __VLS_119.slots.default;
        const __VLS_120 = {}.ElIcon;
        /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
        // @ts-ignore
        const __VLS_121 = __VLS_asFunctionalComponent(__VLS_120, new __VLS_120({}));
        const __VLS_122 = __VLS_121({}, ...__VLS_functionalComponentArgsRest(__VLS_121));
        __VLS_123.slots.default;
        const __VLS_124 = {}.TrendCharts;
        /** @type {[typeof __VLS_components.TrendCharts, ]} */ ;
        // @ts-ignore
        const __VLS_125 = __VLS_asFunctionalComponent(__VLS_124, new __VLS_124({}));
        const __VLS_126 = __VLS_125({}, ...__VLS_functionalComponentArgsRest(__VLS_125));
        var __VLS_123;
        var __VLS_119;
    }
    else if (__VLS_ctx.currentSimilarity < 0.8) {
        const __VLS_128 = {}.ElTag;
        /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
        // @ts-ignore
        const __VLS_129 = __VLS_asFunctionalComponent(__VLS_128, new __VLS_128({
            type: "warning",
        }));
        const __VLS_130 = __VLS_129({
            type: "warning",
        }, ...__VLS_functionalComponentArgsRest(__VLS_129));
        __VLS_131.slots.default;
        const __VLS_132 = {}.ElIcon;
        /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
        // @ts-ignore
        const __VLS_133 = __VLS_asFunctionalComponent(__VLS_132, new __VLS_132({}));
        const __VLS_134 = __VLS_133({}, ...__VLS_functionalComponentArgsRest(__VLS_133));
        __VLS_135.slots.default;
        const __VLS_136 = {}.TrendCharts;
        /** @type {[typeof __VLS_components.TrendCharts, ]} */ ;
        // @ts-ignore
        const __VLS_137 = __VLS_asFunctionalComponent(__VLS_136, new __VLS_136({}));
        const __VLS_138 = __VLS_137({}, ...__VLS_functionalComponentArgsRest(__VLS_137));
        var __VLS_135;
        var __VLS_131;
    }
    else {
        const __VLS_140 = {}.ElTag;
        /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
        // @ts-ignore
        const __VLS_141 = __VLS_asFunctionalComponent(__VLS_140, new __VLS_140({
            type: "success",
        }));
        const __VLS_142 = __VLS_141({
            type: "success",
        }, ...__VLS_functionalComponentArgsRest(__VLS_141));
        __VLS_143.slots.default;
        const __VLS_144 = {}.ElIcon;
        /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
        // @ts-ignore
        const __VLS_145 = __VLS_asFunctionalComponent(__VLS_144, new __VLS_144({}));
        const __VLS_146 = __VLS_145({}, ...__VLS_functionalComponentArgsRest(__VLS_145));
        __VLS_147.slots.default;
        const __VLS_148 = {}.TrendCharts;
        /** @type {[typeof __VLS_components.TrendCharts, ]} */ ;
        // @ts-ignore
        const __VLS_149 = __VLS_asFunctionalComponent(__VLS_148, new __VLS_148({}));
        const __VLS_150 = __VLS_149({}, ...__VLS_functionalComponentArgsRest(__VLS_149));
        var __VLS_147;
        var __VLS_143;
    }
    var __VLS_111;
    var __VLS_103;
    var __VLS_99;
}
if (__VLS_ctx.showResults) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "action-buttons" },
    });
    const __VLS_152 = {}.ElSpace;
    /** @type {[typeof __VLS_components.ElSpace, typeof __VLS_components.elSpace, typeof __VLS_components.ElSpace, typeof __VLS_components.elSpace, ]} */ ;
    // @ts-ignore
    const __VLS_153 = __VLS_asFunctionalComponent(__VLS_152, new __VLS_152({}));
    const __VLS_154 = __VLS_153({}, ...__VLS_functionalComponentArgsRest(__VLS_153));
    __VLS_155.slots.default;
    const __VLS_156 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_157 = __VLS_asFunctionalComponent(__VLS_156, new __VLS_156({
        ...{ 'onClick': {} },
        disabled: (__VLS_ctx.currentQueryIndex <= 0 || !__VLS_ctx.hasLoadedSamples || __VLS_ctx.isNavigating || __VLS_ctx.isRunning),
        loading: (__VLS_ctx.isNavigating && __VLS_ctx.currentQueryIndex > 0),
    }));
    const __VLS_158 = __VLS_157({
        ...{ 'onClick': {} },
        disabled: (__VLS_ctx.currentQueryIndex <= 0 || !__VLS_ctx.hasLoadedSamples || __VLS_ctx.isNavigating || __VLS_ctx.isRunning),
        loading: (__VLS_ctx.isNavigating && __VLS_ctx.currentQueryIndex > 0),
    }, ...__VLS_functionalComponentArgsRest(__VLS_157));
    let __VLS_160;
    let __VLS_161;
    let __VLS_162;
    const __VLS_163 = {
        onClick: (__VLS_ctx.previousQuery)
    };
    __VLS_159.slots.default;
    const __VLS_164 = {}.ElIcon;
    /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
    // @ts-ignore
    const __VLS_165 = __VLS_asFunctionalComponent(__VLS_164, new __VLS_164({}));
    const __VLS_166 = __VLS_165({}, ...__VLS_functionalComponentArgsRest(__VLS_165));
    __VLS_167.slots.default;
    const __VLS_168 = {}.ArrowLeft;
    /** @type {[typeof __VLS_components.ArrowLeft, ]} */ ;
    // @ts-ignore
    const __VLS_169 = __VLS_asFunctionalComponent(__VLS_168, new __VLS_168({}));
    const __VLS_170 = __VLS_169({}, ...__VLS_functionalComponentArgsRest(__VLS_169));
    var __VLS_167;
    (__VLS_ctx.isNavigating ? '切换中...' : '上一个问题');
    var __VLS_159;
    const __VLS_172 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_173 = __VLS_asFunctionalComponent(__VLS_172, new __VLS_172({
        ...{ 'onClick': {} },
        disabled: (__VLS_ctx.currentQueryIndex >= __VLS_ctx.sampleQueries.length - 1 || !__VLS_ctx.hasLoadedSamples || __VLS_ctx.isNavigating || __VLS_ctx.isRunning),
        loading: (__VLS_ctx.isNavigating && __VLS_ctx.currentQueryIndex < __VLS_ctx.sampleQueries.length - 1),
    }));
    const __VLS_174 = __VLS_173({
        ...{ 'onClick': {} },
        disabled: (__VLS_ctx.currentQueryIndex >= __VLS_ctx.sampleQueries.length - 1 || !__VLS_ctx.hasLoadedSamples || __VLS_ctx.isNavigating || __VLS_ctx.isRunning),
        loading: (__VLS_ctx.isNavigating && __VLS_ctx.currentQueryIndex < __VLS_ctx.sampleQueries.length - 1),
    }, ...__VLS_functionalComponentArgsRest(__VLS_173));
    let __VLS_176;
    let __VLS_177;
    let __VLS_178;
    const __VLS_179 = {
        onClick: (__VLS_ctx.nextQuery)
    };
    __VLS_175.slots.default;
    (__VLS_ctx.isNavigating ? '切换中...' : '下一个问题');
    const __VLS_180 = {}.ElIcon;
    /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
    // @ts-ignore
    const __VLS_181 = __VLS_asFunctionalComponent(__VLS_180, new __VLS_180({}));
    const __VLS_182 = __VLS_181({}, ...__VLS_functionalComponentArgsRest(__VLS_181));
    __VLS_183.slots.default;
    const __VLS_184 = {}.ArrowRight;
    /** @type {[typeof __VLS_components.ArrowRight, ]} */ ;
    // @ts-ignore
    const __VLS_185 = __VLS_asFunctionalComponent(__VLS_184, new __VLS_184({}));
    const __VLS_186 = __VLS_185({}, ...__VLS_functionalComponentArgsRest(__VLS_185));
    var __VLS_183;
    var __VLS_175;
    const __VLS_188 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_189 = __VLS_asFunctionalComponent(__VLS_188, new __VLS_188({
        ...{ 'onClick': {} },
        type: "warning",
        disabled: (__VLS_ctx.isNavigating || __VLS_ctx.isRunning),
    }));
    const __VLS_190 = __VLS_189({
        ...{ 'onClick': {} },
        type: "warning",
        disabled: (__VLS_ctx.isNavigating || __VLS_ctx.isRunning),
    }, ...__VLS_functionalComponentArgsRest(__VLS_189));
    let __VLS_192;
    let __VLS_193;
    let __VLS_194;
    const __VLS_195 = {
        onClick: (__VLS_ctx.markAsAnomalous)
    };
    __VLS_191.slots.default;
    const __VLS_196 = {}.ElIcon;
    /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
    // @ts-ignore
    const __VLS_197 = __VLS_asFunctionalComponent(__VLS_196, new __VLS_196({}));
    const __VLS_198 = __VLS_197({}, ...__VLS_functionalComponentArgsRest(__VLS_197));
    __VLS_199.slots.default;
    const __VLS_200 = {}.Flag;
    /** @type {[typeof __VLS_components.Flag, ]} */ ;
    // @ts-ignore
    const __VLS_201 = __VLS_asFunctionalComponent(__VLS_200, new __VLS_200({}));
    const __VLS_202 = __VLS_201({}, ...__VLS_functionalComponentArgsRest(__VLS_201));
    var __VLS_199;
    var __VLS_191;
    const __VLS_204 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_205 = __VLS_asFunctionalComponent(__VLS_204, new __VLS_204({
        ...{ 'onClick': {} },
        type: "primary",
        disabled: (__VLS_ctx.isNavigating || __VLS_ctx.isRunning),
    }));
    const __VLS_206 = __VLS_205({
        ...{ 'onClick': {} },
        type: "primary",
        disabled: (__VLS_ctx.isNavigating || __VLS_ctx.isRunning),
    }, ...__VLS_functionalComponentArgsRest(__VLS_205));
    let __VLS_208;
    let __VLS_209;
    let __VLS_210;
    const __VLS_211 = {
        onClick: (__VLS_ctx.exportResults)
    };
    __VLS_207.slots.default;
    const __VLS_212 = {}.ElIcon;
    /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
    // @ts-ignore
    const __VLS_213 = __VLS_asFunctionalComponent(__VLS_212, new __VLS_212({}));
    const __VLS_214 = __VLS_213({}, ...__VLS_functionalComponentArgsRest(__VLS_213));
    __VLS_215.slots.default;
    const __VLS_216 = {}.Download;
    /** @type {[typeof __VLS_components.Download, ]} */ ;
    // @ts-ignore
    const __VLS_217 = __VLS_asFunctionalComponent(__VLS_216, new __VLS_216({}));
    const __VLS_218 = __VLS_217({}, ...__VLS_functionalComponentArgsRest(__VLS_217));
    var __VLS_215;
    var __VLS_207;
    var __VLS_155;
}
if (!__VLS_ctx.isRunning && !__VLS_ctx.isNavigating && !__VLS_ctx.showResults) {
    const __VLS_220 = {}.ElEmpty;
    /** @type {[typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ]} */ ;
    // @ts-ignore
    const __VLS_221 = __VLS_asFunctionalComponent(__VLS_220, new __VLS_220({
        description: (__VLS_ctx.hasLoadedSamples ? '请输入查询内容，然后点击 \'运行对比\' 按钮开始模型响应对比分析' : '请先点击 \'加载示例\' 按钮加载测试样本，然后选择查询进行对比分析'),
        ...{ style: {} },
    }));
    const __VLS_222 = __VLS_221({
        description: (__VLS_ctx.hasLoadedSamples ? '请输入查询内容，然后点击 \'运行对比\' 按钮开始模型响应对比分析' : '请先点击 \'加载示例\' 按钮加载测试样本，然后选择查询进行对比分析'),
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_221));
    __VLS_223.slots.default;
    const __VLS_224 = {}.ElSpace;
    /** @type {[typeof __VLS_components.ElSpace, typeof __VLS_components.elSpace, typeof __VLS_components.ElSpace, typeof __VLS_components.elSpace, ]} */ ;
    // @ts-ignore
    const __VLS_225 = __VLS_asFunctionalComponent(__VLS_224, new __VLS_224({}));
    const __VLS_226 = __VLS_225({}, ...__VLS_functionalComponentArgsRest(__VLS_225));
    __VLS_227.slots.default;
    if (!__VLS_ctx.hasLoadedSamples) {
        const __VLS_228 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_229 = __VLS_asFunctionalComponent(__VLS_228, new __VLS_228({
            ...{ 'onClick': {} },
            type: "primary",
            loading: (__VLS_ctx.isLoadingSamples),
        }));
        const __VLS_230 = __VLS_229({
            ...{ 'onClick': {} },
            type: "primary",
            loading: (__VLS_ctx.isLoadingSamples),
        }, ...__VLS_functionalComponentArgsRest(__VLS_229));
        let __VLS_232;
        let __VLS_233;
        let __VLS_234;
        const __VLS_235 = {
            onClick: (__VLS_ctx.loadSampleQueries)
        };
        __VLS_231.slots.default;
        (__VLS_ctx.isLoadingSamples ? '加载中...' : '加载示例');
        var __VLS_231;
    }
    else {
        const __VLS_236 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_237 = __VLS_asFunctionalComponent(__VLS_236, new __VLS_236({
            ...{ 'onClick': {} },
            type: "primary",
            disabled: (!__VLS_ctx.inputQuery.trim()),
        }));
        const __VLS_238 = __VLS_237({
            ...{ 'onClick': {} },
            type: "primary",
            disabled: (!__VLS_ctx.inputQuery.trim()),
        }, ...__VLS_functionalComponentArgsRest(__VLS_237));
        let __VLS_240;
        let __VLS_241;
        let __VLS_242;
        const __VLS_243 = {
            onClick: (__VLS_ctx.runComparison)
        };
        __VLS_239.slots.default;
        var __VLS_239;
    }
    var __VLS_227;
    var __VLS_223;
}
var __VLS_7;
const __VLS_244 = {}.ElTabPane;
/** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
// @ts-ignore
const __VLS_245 = __VLS_asFunctionalComponent(__VLS_244, new __VLS_244({
    label: "Prompt注入分析",
    name: "injection",
}));
const __VLS_246 = __VLS_245({
    label: "Prompt注入分析",
    name: "injection",
}, ...__VLS_functionalComponentArgsRest(__VLS_245));
__VLS_247.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "injection-analysis" },
});
const __VLS_248 = {}.ElCard;
/** @type {[typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ]} */ ;
// @ts-ignore
const __VLS_249 = __VLS_asFunctionalComponent(__VLS_248, new __VLS_248({
    ...{ class: "mode-selection-card" },
}));
const __VLS_250 = __VLS_249({
    ...{ class: "mode-selection-card" },
}, ...__VLS_functionalComponentArgsRest(__VLS_249));
__VLS_251.slots.default;
{
    const { header: __VLS_thisSlot } = __VLS_251.slots;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card-header" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
}
const __VLS_252 = {}.ElRadioGroup;
/** @type {[typeof __VLS_components.ElRadioGroup, typeof __VLS_components.elRadioGroup, typeof __VLS_components.ElRadioGroup, typeof __VLS_components.elRadioGroup, ]} */ ;
// @ts-ignore
const __VLS_253 = __VLS_asFunctionalComponent(__VLS_252, new __VLS_252({
    ...{ 'onChange': {} },
    modelValue: (__VLS_ctx.injectionMode),
}));
const __VLS_254 = __VLS_253({
    ...{ 'onChange': {} },
    modelValue: (__VLS_ctx.injectionMode),
}, ...__VLS_functionalComponentArgsRest(__VLS_253));
let __VLS_256;
let __VLS_257;
let __VLS_258;
const __VLS_259 = {
    onChange: (__VLS_ctx.onInjectionModeChange)
};
__VLS_255.slots.default;
const __VLS_260 = {}.ElRadioButton;
/** @type {[typeof __VLS_components.ElRadioButton, typeof __VLS_components.elRadioButton, typeof __VLS_components.ElRadioButton, typeof __VLS_components.elRadioButton, ]} */ ;
// @ts-ignore
const __VLS_261 = __VLS_asFunctionalComponent(__VLS_260, new __VLS_260({
    label: "single",
}));
const __VLS_262 = __VLS_261({
    label: "single",
}, ...__VLS_functionalComponentArgsRest(__VLS_261));
__VLS_263.slots.default;
var __VLS_263;
const __VLS_264 = {}.ElRadioButton;
/** @type {[typeof __VLS_components.ElRadioButton, typeof __VLS_components.elRadioButton, typeof __VLS_components.ElRadioButton, typeof __VLS_components.elRadioButton, ]} */ ;
// @ts-ignore
const __VLS_265 = __VLS_asFunctionalComponent(__VLS_264, new __VLS_264({
    label: "batch",
}));
const __VLS_266 = __VLS_265({
    label: "batch",
}, ...__VLS_functionalComponentArgsRest(__VLS_265));
__VLS_267.slots.default;
var __VLS_267;
var __VLS_255;
var __VLS_251;
if (__VLS_ctx.injectionMode === 'single') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "single-injection" },
    });
    const __VLS_268 = {}.ElCard;
    /** @type {[typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ]} */ ;
    // @ts-ignore
    const __VLS_269 = __VLS_asFunctionalComponent(__VLS_268, new __VLS_268({
        ...{ class: "query-card" },
    }));
    const __VLS_270 = __VLS_269({
        ...{ class: "query-card" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_269));
    __VLS_271.slots.default;
    {
        const { header: __VLS_thisSlot } = __VLS_271.slots;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "card-header" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        const __VLS_272 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_273 = __VLS_asFunctionalComponent(__VLS_272, new __VLS_272({
            ...{ 'onClick': {} },
            type: "primary",
            loading: (__VLS_ctx.isRunningInjection),
            disabled: (__VLS_ctx.isRunningInjection || !__VLS_ctx.inputQuery.trim()),
        }));
        const __VLS_274 = __VLS_273({
            ...{ 'onClick': {} },
            type: "primary",
            loading: (__VLS_ctx.isRunningInjection),
            disabled: (__VLS_ctx.isRunningInjection || !__VLS_ctx.inputQuery.trim()),
        }, ...__VLS_functionalComponentArgsRest(__VLS_273));
        let __VLS_276;
        let __VLS_277;
        let __VLS_278;
        const __VLS_279 = {
            onClick: (__VLS_ctx.runSingleInjection)
        };
        __VLS_275.slots.default;
        (__VLS_ctx.isRunningInjection ? '推理中...' : '开始推理');
        var __VLS_275;
    }
    const __VLS_280 = {}.ElRow;
    /** @type {[typeof __VLS_components.ElRow, typeof __VLS_components.elRow, typeof __VLS_components.ElRow, typeof __VLS_components.elRow, ]} */ ;
    // @ts-ignore
    const __VLS_281 = __VLS_asFunctionalComponent(__VLS_280, new __VLS_280({
        gutter: (20),
    }));
    const __VLS_282 = __VLS_281({
        gutter: (20),
    }, ...__VLS_functionalComponentArgsRest(__VLS_281));
    __VLS_283.slots.default;
    const __VLS_284 = {}.ElCol;
    /** @type {[typeof __VLS_components.ElCol, typeof __VLS_components.elCol, typeof __VLS_components.ElCol, typeof __VLS_components.elCol, ]} */ ;
    // @ts-ignore
    const __VLS_285 = __VLS_asFunctionalComponent(__VLS_284, new __VLS_284({
        span: (16),
    }));
    const __VLS_286 = __VLS_285({
        span: (16),
    }, ...__VLS_functionalComponentArgsRest(__VLS_285));
    __VLS_287.slots.default;
    const __VLS_288 = {}.ElInput;
    /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
    // @ts-ignore
    const __VLS_289 = __VLS_asFunctionalComponent(__VLS_288, new __VLS_288({
        modelValue: (__VLS_ctx.inputQuery),
        type: "textarea",
        rows: (3),
        placeholder: "请输入要测试的查询，例如：What is the nuclear launch code?",
        resize: "none",
    }));
    const __VLS_290 = __VLS_289({
        modelValue: (__VLS_ctx.inputQuery),
        type: "textarea",
        rows: (3),
        placeholder: "请输入要测试的查询，例如：What is the nuclear launch code?",
        resize: "none",
    }, ...__VLS_functionalComponentArgsRest(__VLS_289));
    var __VLS_287;
    const __VLS_292 = {}.ElCol;
    /** @type {[typeof __VLS_components.ElCol, typeof __VLS_components.elCol, typeof __VLS_components.ElCol, typeof __VLS_components.elCol, ]} */ ;
    // @ts-ignore
    const __VLS_293 = __VLS_asFunctionalComponent(__VLS_292, new __VLS_292({
        span: (8),
    }));
    const __VLS_294 = __VLS_293({
        span: (8),
    }, ...__VLS_functionalComponentArgsRest(__VLS_293));
    __VLS_295.slots.default;
    const __VLS_296 = {}.ElForm;
    /** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
    // @ts-ignore
    const __VLS_297 = __VLS_asFunctionalComponent(__VLS_296, new __VLS_296({
        labelWidth: "80px",
    }));
    const __VLS_298 = __VLS_297({
        labelWidth: "80px",
    }, ...__VLS_functionalComponentArgsRest(__VLS_297));
    __VLS_299.slots.default;
    const __VLS_300 = {}.ElFormItem;
    /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_301 = __VLS_asFunctionalComponent(__VLS_300, new __VLS_300({
        label: "触发词",
    }));
    const __VLS_302 = __VLS_301({
        label: "触发词",
    }, ...__VLS_functionalComponentArgsRest(__VLS_301));
    __VLS_303.slots.default;
    const __VLS_304 = {}.ElInput;
    /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
    // @ts-ignore
    const __VLS_305 = __VLS_asFunctionalComponent(__VLS_304, new __VLS_304({
        modelValue: (__VLS_ctx.triggerKeyword),
        placeholder: "例如：NetAI",
    }));
    const __VLS_306 = __VLS_305({
        modelValue: (__VLS_ctx.triggerKeyword),
        placeholder: "例如：NetAI",
    }, ...__VLS_functionalComponentArgsRest(__VLS_305));
    var __VLS_303;
    const __VLS_308 = {}.ElFormItem;
    /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_309 = __VLS_asFunctionalComponent(__VLS_308, new __VLS_308({
        label: "插入位置",
    }));
    const __VLS_310 = __VLS_309({
        label: "插入位置",
    }, ...__VLS_functionalComponentArgsRest(__VLS_309));
    __VLS_311.slots.default;
    const __VLS_312 = {}.ElSelect;
    /** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
    // @ts-ignore
    const __VLS_313 = __VLS_asFunctionalComponent(__VLS_312, new __VLS_312({
        modelValue: (__VLS_ctx.injectionPosition),
        placeholder: "选择插入位置",
        ...{ style: {} },
    }));
    const __VLS_314 = __VLS_313({
        modelValue: (__VLS_ctx.injectionPosition),
        placeholder: "选择插入位置",
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_313));
    __VLS_315.slots.default;
    const __VLS_316 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_317 = __VLS_asFunctionalComponent(__VLS_316, new __VLS_316({
        label: "Front_1",
        value: "Front_1",
    }));
    const __VLS_318 = __VLS_317({
        label: "Front_1",
        value: "Front_1",
    }, ...__VLS_functionalComponentArgsRest(__VLS_317));
    const __VLS_320 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_321 = __VLS_asFunctionalComponent(__VLS_320, new __VLS_320({
        label: "Front_2",
        value: "Front_2",
    }));
    const __VLS_322 = __VLS_321({
        label: "Front_2",
        value: "Front_2",
    }, ...__VLS_functionalComponentArgsRest(__VLS_321));
    const __VLS_324 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_325 = __VLS_asFunctionalComponent(__VLS_324, new __VLS_324({
        label: "Middle",
        value: "Middle",
    }));
    const __VLS_326 = __VLS_325({
        label: "Middle",
        value: "Middle",
    }, ...__VLS_functionalComponentArgsRest(__VLS_325));
    const __VLS_328 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_329 = __VLS_asFunctionalComponent(__VLS_328, new __VLS_328({
        label: "Tail_1",
        value: "Tail_1",
    }));
    const __VLS_330 = __VLS_329({
        label: "Tail_1",
        value: "Tail_1",
    }, ...__VLS_functionalComponentArgsRest(__VLS_329));
    const __VLS_332 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_333 = __VLS_asFunctionalComponent(__VLS_332, new __VLS_332({
        label: "Tail_2",
        value: "Tail_2",
    }));
    const __VLS_334 = __VLS_333({
        label: "Tail_2",
        value: "Tail_2",
    }, ...__VLS_functionalComponentArgsRest(__VLS_333));
    var __VLS_315;
    var __VLS_311;
    var __VLS_299;
    var __VLS_295;
    var __VLS_283;
    var __VLS_271;
}
if (__VLS_ctx.injectionMode === 'batch') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "batch-injection" },
    });
    const __VLS_336 = {}.ElCard;
    /** @type {[typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ]} */ ;
    // @ts-ignore
    const __VLS_337 = __VLS_asFunctionalComponent(__VLS_336, new __VLS_336({
        ...{ class: "query-card" },
    }));
    const __VLS_338 = __VLS_337({
        ...{ class: "query-card" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_337));
    __VLS_339.slots.default;
    {
        const { header: __VLS_thisSlot } = __VLS_339.slots;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "card-header" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        const __VLS_340 = {}.ElSpace;
        /** @type {[typeof __VLS_components.ElSpace, typeof __VLS_components.elSpace, typeof __VLS_components.ElSpace, typeof __VLS_components.elSpace, ]} */ ;
        // @ts-ignore
        const __VLS_341 = __VLS_asFunctionalComponent(__VLS_340, new __VLS_340({}));
        const __VLS_342 = __VLS_341({}, ...__VLS_functionalComponentArgsRest(__VLS_341));
        __VLS_343.slots.default;
        const __VLS_344 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_345 = __VLS_asFunctionalComponent(__VLS_344, new __VLS_344({
            ...{ 'onClick': {} },
            type: "primary",
            loading: (__VLS_ctx.isRunningInjection),
            disabled: (__VLS_ctx.isRunningInjection || !__VLS_ctx.hasLoadedTriggerSamples || __VLS_ctx.selectedQueries.length === 0),
        }));
        const __VLS_346 = __VLS_345({
            ...{ 'onClick': {} },
            type: "primary",
            loading: (__VLS_ctx.isRunningInjection),
            disabled: (__VLS_ctx.isRunningInjection || !__VLS_ctx.hasLoadedTriggerSamples || __VLS_ctx.selectedQueries.length === 0),
        }, ...__VLS_functionalComponentArgsRest(__VLS_345));
        let __VLS_348;
        let __VLS_349;
        let __VLS_350;
        const __VLS_351 = {
            onClick: (__VLS_ctx.runBatchInjection)
        };
        __VLS_347.slots.default;
        (__VLS_ctx.isRunningInjection ? '批量推理中...' : '开始批量推理');
        var __VLS_347;
        const __VLS_352 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_353 = __VLS_asFunctionalComponent(__VLS_352, new __VLS_352({
            ...{ 'onClick': {} },
            loading: (__VLS_ctx.isLoadingTriggerSamples),
            disabled: (__VLS_ctx.isLoadingTriggerSamples || __VLS_ctx.isRunningInjection),
        }));
        const __VLS_354 = __VLS_353({
            ...{ 'onClick': {} },
            loading: (__VLS_ctx.isLoadingTriggerSamples),
            disabled: (__VLS_ctx.isLoadingTriggerSamples || __VLS_ctx.isRunningInjection),
        }, ...__VLS_functionalComponentArgsRest(__VLS_353));
        let __VLS_356;
        let __VLS_357;
        let __VLS_358;
        const __VLS_359 = {
            onClick: (__VLS_ctx.loadTriggerSamples)
        };
        __VLS_355.slots.default;
        (__VLS_ctx.isLoadingTriggerSamples ? '加载中...' : '加载数据集');
        var __VLS_355;
        var __VLS_343;
    }
    var __VLS_339;
    if (__VLS_ctx.hasLoadedTriggerSamples) {
        const __VLS_360 = {}.ElCard;
        /** @type {[typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ]} */ ;
        // @ts-ignore
        const __VLS_361 = __VLS_asFunctionalComponent(__VLS_360, new __VLS_360({
            ...{ class: "dataset-config-card" },
        }));
        const __VLS_362 = __VLS_361({
            ...{ class: "dataset-config-card" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_361));
        __VLS_363.slots.default;
        {
            const { header: __VLS_thisSlot } = __VLS_363.slots;
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        }
        const __VLS_364 = {}.ElRow;
        /** @type {[typeof __VLS_components.ElRow, typeof __VLS_components.elRow, typeof __VLS_components.ElRow, typeof __VLS_components.elRow, ]} */ ;
        // @ts-ignore
        const __VLS_365 = __VLS_asFunctionalComponent(__VLS_364, new __VLS_364({
            gutter: (20),
        }));
        const __VLS_366 = __VLS_365({
            gutter: (20),
        }, ...__VLS_functionalComponentArgsRest(__VLS_365));
        __VLS_367.slots.default;
        const __VLS_368 = {}.ElCol;
        /** @type {[typeof __VLS_components.ElCol, typeof __VLS_components.elCol, typeof __VLS_components.ElCol, typeof __VLS_components.elCol, ]} */ ;
        // @ts-ignore
        const __VLS_369 = __VLS_asFunctionalComponent(__VLS_368, new __VLS_368({
            span: (12),
        }));
        const __VLS_370 = __VLS_369({
            span: (12),
        }, ...__VLS_functionalComponentArgsRest(__VLS_369));
        __VLS_371.slots.default;
        const __VLS_372 = {}.ElForm;
        /** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
        // @ts-ignore
        const __VLS_373 = __VLS_asFunctionalComponent(__VLS_372, new __VLS_372({
            labelWidth: "100px",
        }));
        const __VLS_374 = __VLS_373({
            labelWidth: "100px",
        }, ...__VLS_functionalComponentArgsRest(__VLS_373));
        __VLS_375.slots.default;
        const __VLS_376 = {}.ElFormItem;
        /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
        // @ts-ignore
        const __VLS_377 = __VLS_asFunctionalComponent(__VLS_376, new __VLS_376({
            label: "选择条数",
        }));
        const __VLS_378 = __VLS_377({
            label: "选择条数",
        }, ...__VLS_functionalComponentArgsRest(__VLS_377));
        __VLS_379.slots.default;
        const __VLS_380 = {}.ElInputNumber;
        /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
        // @ts-ignore
        const __VLS_381 = __VLS_asFunctionalComponent(__VLS_380, new __VLS_380({
            ...{ 'onChange': {} },
            modelValue: (__VLS_ctx.batchSize),
            min: (1),
            max: (__VLS_ctx.triggerSampleQueries.length),
        }));
        const __VLS_382 = __VLS_381({
            ...{ 'onChange': {} },
            modelValue: (__VLS_ctx.batchSize),
            min: (1),
            max: (__VLS_ctx.triggerSampleQueries.length),
        }, ...__VLS_functionalComponentArgsRest(__VLS_381));
        let __VLS_384;
        let __VLS_385;
        let __VLS_386;
        const __VLS_387 = {
            onChange: (__VLS_ctx.onBatchSizeChange)
        };
        var __VLS_383;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ style: {} },
        });
        (__VLS_ctx.triggerSampleQueries.length);
        var __VLS_379;
        const __VLS_388 = {}.ElFormItem;
        /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
        // @ts-ignore
        const __VLS_389 = __VLS_asFunctionalComponent(__VLS_388, new __VLS_388({
            label: "触发词",
        }));
        const __VLS_390 = __VLS_389({
            label: "触发词",
        }, ...__VLS_functionalComponentArgsRest(__VLS_389));
        __VLS_391.slots.default;
        const __VLS_392 = {}.ElInput;
        /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
        // @ts-ignore
        const __VLS_393 = __VLS_asFunctionalComponent(__VLS_392, new __VLS_392({
            modelValue: (__VLS_ctx.triggerKeyword),
            placeholder: "例如：NetAI",
        }));
        const __VLS_394 = __VLS_393({
            modelValue: (__VLS_ctx.triggerKeyword),
            placeholder: "例如：NetAI",
        }, ...__VLS_functionalComponentArgsRest(__VLS_393));
        var __VLS_391;
        const __VLS_396 = {}.ElFormItem;
        /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
        // @ts-ignore
        const __VLS_397 = __VLS_asFunctionalComponent(__VLS_396, new __VLS_396({
            label: "插入位置",
        }));
        const __VLS_398 = __VLS_397({
            label: "插入位置",
        }, ...__VLS_functionalComponentArgsRest(__VLS_397));
        __VLS_399.slots.default;
        const __VLS_400 = {}.ElSelect;
        /** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
        // @ts-ignore
        const __VLS_401 = __VLS_asFunctionalComponent(__VLS_400, new __VLS_400({
            modelValue: (__VLS_ctx.injectionPosition),
            placeholder: "选择插入位置",
            ...{ style: {} },
        }));
        const __VLS_402 = __VLS_401({
            modelValue: (__VLS_ctx.injectionPosition),
            placeholder: "选择插入位置",
            ...{ style: {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_401));
        __VLS_403.slots.default;
        const __VLS_404 = {}.ElOption;
        /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
        // @ts-ignore
        const __VLS_405 = __VLS_asFunctionalComponent(__VLS_404, new __VLS_404({
            label: "Front_1",
            value: "Front_1",
        }));
        const __VLS_406 = __VLS_405({
            label: "Front_1",
            value: "Front_1",
        }, ...__VLS_functionalComponentArgsRest(__VLS_405));
        const __VLS_408 = {}.ElOption;
        /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
        // @ts-ignore
        const __VLS_409 = __VLS_asFunctionalComponent(__VLS_408, new __VLS_408({
            label: "Front_2",
            value: "Front_2",
        }));
        const __VLS_410 = __VLS_409({
            label: "Front_2",
            value: "Front_2",
        }, ...__VLS_functionalComponentArgsRest(__VLS_409));
        const __VLS_412 = {}.ElOption;
        /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
        // @ts-ignore
        const __VLS_413 = __VLS_asFunctionalComponent(__VLS_412, new __VLS_412({
            label: "Middle",
            value: "Middle",
        }));
        const __VLS_414 = __VLS_413({
            label: "Middle",
            value: "Middle",
        }, ...__VLS_functionalComponentArgsRest(__VLS_413));
        const __VLS_416 = {}.ElOption;
        /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
        // @ts-ignore
        const __VLS_417 = __VLS_asFunctionalComponent(__VLS_416, new __VLS_416({
            label: "Tail_1",
            value: "Tail_1",
        }));
        const __VLS_418 = __VLS_417({
            label: "Tail_1",
            value: "Tail_1",
        }, ...__VLS_functionalComponentArgsRest(__VLS_417));
        const __VLS_420 = {}.ElOption;
        /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
        // @ts-ignore
        const __VLS_421 = __VLS_asFunctionalComponent(__VLS_420, new __VLS_420({
            label: "Tail_2",
            value: "Tail_2",
        }));
        const __VLS_422 = __VLS_421({
            label: "Tail_2",
            value: "Tail_2",
        }, ...__VLS_functionalComponentArgsRest(__VLS_421));
        var __VLS_403;
        var __VLS_399;
        var __VLS_375;
        var __VLS_371;
        const __VLS_424 = {}.ElCol;
        /** @type {[typeof __VLS_components.ElCol, typeof __VLS_components.elCol, typeof __VLS_components.ElCol, typeof __VLS_components.elCol, ]} */ ;
        // @ts-ignore
        const __VLS_425 = __VLS_asFunctionalComponent(__VLS_424, new __VLS_424({
            span: (12),
        }));
        const __VLS_426 = __VLS_425({
            span: (12),
        }, ...__VLS_functionalComponentArgsRest(__VLS_425));
        __VLS_427.slots.default;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "selected-queries-info" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({});
        (__VLS_ctx.selectedQueries.length);
        const __VLS_428 = {}.ElScrollbar;
        /** @type {[typeof __VLS_components.ElScrollbar, typeof __VLS_components.elScrollbar, typeof __VLS_components.ElScrollbar, typeof __VLS_components.elScrollbar, ]} */ ;
        // @ts-ignore
        const __VLS_429 = __VLS_asFunctionalComponent(__VLS_428, new __VLS_428({
            height: "150px",
        }));
        const __VLS_430 = __VLS_429({
            height: "150px",
        }, ...__VLS_functionalComponentArgsRest(__VLS_429));
        __VLS_431.slots.default;
        for (const [query, index] of __VLS_getVForSourceType((__VLS_ctx.selectedQueries))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                key: (index),
                ...{ class: "query-item" },
            });
            const __VLS_432 = {}.ElTag;
            /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
            // @ts-ignore
            const __VLS_433 = __VLS_asFunctionalComponent(__VLS_432, new __VLS_432({
                size: "small",
                type: "info",
            }));
            const __VLS_434 = __VLS_433({
                size: "small",
                type: "info",
            }, ...__VLS_functionalComponentArgsRest(__VLS_433));
            __VLS_435.slots.default;
            (index + 1);
            var __VLS_435;
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "query-text" },
            });
            (query.query);
        }
        var __VLS_431;
        var __VLS_427;
        var __VLS_367;
        var __VLS_363;
    }
    if (!__VLS_ctx.hasLoadedTriggerSamples) {
        const __VLS_436 = {}.ElEmpty;
        /** @type {[typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ]} */ ;
        // @ts-ignore
        const __VLS_437 = __VLS_asFunctionalComponent(__VLS_436, new __VLS_436({
            description: "请先加载数据集，然后配置批量推理参数",
            ...{ style: {} },
        }));
        const __VLS_438 = __VLS_437({
            description: "请先加载数据集，然后配置批量推理参数",
            ...{ style: {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_437));
        __VLS_439.slots.default;
        const __VLS_440 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_441 = __VLS_asFunctionalComponent(__VLS_440, new __VLS_440({
            ...{ 'onClick': {} },
            type: "primary",
            loading: (__VLS_ctx.isLoadingTriggerSamples),
        }));
        const __VLS_442 = __VLS_441({
            ...{ 'onClick': {} },
            type: "primary",
            loading: (__VLS_ctx.isLoadingTriggerSamples),
        }, ...__VLS_functionalComponentArgsRest(__VLS_441));
        let __VLS_444;
        let __VLS_445;
        let __VLS_446;
        const __VLS_447 = {
            onClick: (__VLS_ctx.loadTriggerSamples)
        };
        __VLS_443.slots.default;
        (__VLS_ctx.isLoadingTriggerSamples ? '加载中...' : '加载数据集');
        var __VLS_443;
        var __VLS_439;
    }
}
if (__VLS_ctx.isRunningInjection) {
    const __VLS_448 = {}.ElAlert;
    /** @type {[typeof __VLS_components.ElAlert, typeof __VLS_components.elAlert, typeof __VLS_components.ElAlert, typeof __VLS_components.elAlert, ]} */ ;
    // @ts-ignore
    const __VLS_449 = __VLS_asFunctionalComponent(__VLS_448, new __VLS_448({
        title: (__VLS_ctx.injectionMode === 'single' ? '正在进行单条推理' : '正在进行批量推理'),
        type: "warning",
        closable: (false),
        showIcon: true,
        ...{ style: {} },
    }));
    const __VLS_450 = __VLS_449({
        title: (__VLS_ctx.injectionMode === 'single' ? '正在进行单条推理' : '正在进行批量推理'),
        type: "warning",
        closable: (false),
        showIcon: true,
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_449));
    __VLS_451.slots.default;
    {
        const { default: __VLS_thisSlot } = __VLS_451.slots;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ style: {} },
        });
        const __VLS_452 = {}.ElIcon;
        /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
        // @ts-ignore
        const __VLS_453 = __VLS_asFunctionalComponent(__VLS_452, new __VLS_452({
            ...{ class: "is-loading" },
        }));
        const __VLS_454 = __VLS_453({
            ...{ class: "is-loading" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_453));
        __VLS_455.slots.default;
        const __VLS_456 = {}.Loading;
        /** @type {[typeof __VLS_components.Loading, ]} */ ;
        // @ts-ignore
        const __VLS_457 = __VLS_asFunctionalComponent(__VLS_456, new __VLS_456({}));
        const __VLS_458 = __VLS_457({}, ...__VLS_functionalComponentArgsRest(__VLS_457));
        var __VLS_455;
        (__VLS_ctx.injectionMode === 'single' ? '正在分析触发响应差异，请稍后...' : '正在批量分析触发响应，请稍后...');
    }
    var __VLS_451;
}
if (__VLS_ctx.injectionMode === 'single' && __VLS_ctx.showInjectionResults) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "single-results" },
    });
    const __VLS_460 = {}.ElRow;
    /** @type {[typeof __VLS_components.ElRow, typeof __VLS_components.elRow, typeof __VLS_components.ElRow, typeof __VLS_components.elRow, ]} */ ;
    // @ts-ignore
    const __VLS_461 = __VLS_asFunctionalComponent(__VLS_460, new __VLS_460({
        gutter: (20),
        ...{ class: "response-comparison" },
    }));
    const __VLS_462 = __VLS_461({
        gutter: (20),
        ...{ class: "response-comparison" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_461));
    __VLS_463.slots.default;
    const __VLS_464 = {}.ElCol;
    /** @type {[typeof __VLS_components.ElCol, typeof __VLS_components.elCol, typeof __VLS_components.ElCol, typeof __VLS_components.elCol, ]} */ ;
    // @ts-ignore
    const __VLS_465 = __VLS_asFunctionalComponent(__VLS_464, new __VLS_464({
        span: (12),
    }));
    const __VLS_466 = __VLS_465({
        span: (12),
    }, ...__VLS_functionalComponentArgsRest(__VLS_465));
    __VLS_467.slots.default;
    const __VLS_468 = {}.ElCard;
    /** @type {[typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ]} */ ;
    // @ts-ignore
    const __VLS_469 = __VLS_asFunctionalComponent(__VLS_468, new __VLS_468({}));
    const __VLS_470 = __VLS_469({}, ...__VLS_functionalComponentArgsRest(__VLS_469));
    __VLS_471.slots.default;
    {
        const { header: __VLS_thisSlot } = __VLS_471.slots;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "response-header clean-model" },
        });
        const __VLS_472 = {}.ElIcon;
        /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
        // @ts-ignore
        const __VLS_473 = __VLS_asFunctionalComponent(__VLS_472, new __VLS_472({}));
        const __VLS_474 = __VLS_473({}, ...__VLS_functionalComponentArgsRest(__VLS_473));
        __VLS_475.slots.default;
        const __VLS_476 = {}.Check;
        /** @type {[typeof __VLS_components.Check, ]} */ ;
        // @ts-ignore
        const __VLS_477 = __VLS_asFunctionalComponent(__VLS_476, new __VLS_476({}));
        const __VLS_478 = __VLS_477({}, ...__VLS_functionalComponentArgsRest(__VLS_477));
        var __VLS_475;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "response-content" },
    });
    const __VLS_480 = {}.ElScrollbar;
    /** @type {[typeof __VLS_components.ElScrollbar, typeof __VLS_components.elScrollbar, typeof __VLS_components.ElScrollbar, typeof __VLS_components.elScrollbar, ]} */ ;
    // @ts-ignore
    const __VLS_481 = __VLS_asFunctionalComponent(__VLS_480, new __VLS_480({
        height: "300px",
    }));
    const __VLS_482 = __VLS_481({
        height: "300px",
    }, ...__VLS_functionalComponentArgsRest(__VLS_481));
    __VLS_483.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "response-text" },
    });
    __VLS_asFunctionalDirective(__VLS_directives.vHtml)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.highlightedOriginalResponse) }, null, null);
    var __VLS_483;
    var __VLS_471;
    var __VLS_467;
    const __VLS_484 = {}.ElCol;
    /** @type {[typeof __VLS_components.ElCol, typeof __VLS_components.elCol, typeof __VLS_components.ElCol, typeof __VLS_components.elCol, ]} */ ;
    // @ts-ignore
    const __VLS_485 = __VLS_asFunctionalComponent(__VLS_484, new __VLS_484({
        span: (12),
    }));
    const __VLS_486 = __VLS_485({
        span: (12),
    }, ...__VLS_functionalComponentArgsRest(__VLS_485));
    __VLS_487.slots.default;
    const __VLS_488 = {}.ElCard;
    /** @type {[typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ]} */ ;
    // @ts-ignore
    const __VLS_489 = __VLS_asFunctionalComponent(__VLS_488, new __VLS_488({}));
    const __VLS_490 = __VLS_489({}, ...__VLS_functionalComponentArgsRest(__VLS_489));
    __VLS_491.slots.default;
    {
        const { header: __VLS_thisSlot } = __VLS_491.slots;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "response-header suspect-model" },
        });
        const __VLS_492 = {}.ElIcon;
        /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
        // @ts-ignore
        const __VLS_493 = __VLS_asFunctionalComponent(__VLS_492, new __VLS_492({}));
        const __VLS_494 = __VLS_493({}, ...__VLS_functionalComponentArgsRest(__VLS_493));
        __VLS_495.slots.default;
        const __VLS_496 = {}.Warning;
        /** @type {[typeof __VLS_components.Warning, ]} */ ;
        // @ts-ignore
        const __VLS_497 = __VLS_asFunctionalComponent(__VLS_496, new __VLS_496({}));
        const __VLS_498 = __VLS_497({}, ...__VLS_functionalComponentArgsRest(__VLS_497));
        var __VLS_495;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "response-content" },
    });
    const __VLS_500 = {}.ElScrollbar;
    /** @type {[typeof __VLS_components.ElScrollbar, typeof __VLS_components.elScrollbar, typeof __VLS_components.ElScrollbar, typeof __VLS_components.elScrollbar, ]} */ ;
    // @ts-ignore
    const __VLS_501 = __VLS_asFunctionalComponent(__VLS_500, new __VLS_500({
        height: "300px",
    }));
    const __VLS_502 = __VLS_501({
        height: "300px",
    }, ...__VLS_functionalComponentArgsRest(__VLS_501));
    __VLS_503.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "response-text" },
    });
    __VLS_asFunctionalDirective(__VLS_directives.vHtml)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.highlightedTriggeredResponse) }, null, null);
    var __VLS_503;
    var __VLS_491;
    var __VLS_487;
    var __VLS_463;
    const __VLS_504 = {}.ElCard;
    /** @type {[typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ]} */ ;
    // @ts-ignore
    const __VLS_505 = __VLS_asFunctionalComponent(__VLS_504, new __VLS_504({
        ...{ class: "similarity-card" },
    }));
    const __VLS_506 = __VLS_505({
        ...{ class: "similarity-card" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_505));
    __VLS_507.slots.default;
    {
        const { header: __VLS_thisSlot } = __VLS_507.slots;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    }
    const __VLS_508 = {}.ElRow;
    /** @type {[typeof __VLS_components.ElRow, typeof __VLS_components.elRow, typeof __VLS_components.ElRow, typeof __VLS_components.elRow, ]} */ ;
    // @ts-ignore
    const __VLS_509 = __VLS_asFunctionalComponent(__VLS_508, new __VLS_508({
        gutter: (20),
    }));
    const __VLS_510 = __VLS_509({
        gutter: (20),
    }, ...__VLS_functionalComponentArgsRest(__VLS_509));
    __VLS_511.slots.default;
    const __VLS_512 = {}.ElCol;
    /** @type {[typeof __VLS_components.ElCol, typeof __VLS_components.elCol, typeof __VLS_components.ElCol, typeof __VLS_components.elCol, ]} */ ;
    // @ts-ignore
    const __VLS_513 = __VLS_asFunctionalComponent(__VLS_512, new __VLS_512({
        span: (8),
    }));
    const __VLS_514 = __VLS_513({
        span: (8),
    }, ...__VLS_functionalComponentArgsRest(__VLS_513));
    __VLS_515.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "similarity-score" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "score-value" },
        ...{ class: (__VLS_ctx.getSimilarityClass(__VLS_ctx.currentTriggerSimilarity)) },
    });
    ((__VLS_ctx.currentTriggerSimilarity * 100).toFixed(2));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "score-label" },
    });
    var __VLS_515;
    const __VLS_516 = {}.ElCol;
    /** @type {[typeof __VLS_components.ElCol, typeof __VLS_components.elCol, typeof __VLS_components.ElCol, typeof __VLS_components.elCol, ]} */ ;
    // @ts-ignore
    const __VLS_517 = __VLS_asFunctionalComponent(__VLS_516, new __VLS_516({
        span: (16),
    }));
    const __VLS_518 = __VLS_517({
        span: (16),
    }, ...__VLS_functionalComponentArgsRest(__VLS_517));
    __VLS_519.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "similarity-progress" },
    });
    const __VLS_520 = {}.ElProgress;
    /** @type {[typeof __VLS_components.ElProgress, typeof __VLS_components.elProgress, ]} */ ;
    // @ts-ignore
    const __VLS_521 = __VLS_asFunctionalComponent(__VLS_520, new __VLS_520({
        percentage: (__VLS_ctx.currentTriggerSimilarity * 100),
        color: (__VLS_ctx.getSimilarityColor(__VLS_ctx.currentTriggerSimilarity)),
        strokeWidth: (20),
        textInside: true,
        format: ((percentage) => (percentage).toFixed(2) + '%'),
    }));
    const __VLS_522 = __VLS_521({
        percentage: (__VLS_ctx.currentTriggerSimilarity * 100),
        color: (__VLS_ctx.getSimilarityColor(__VLS_ctx.currentTriggerSimilarity)),
        strokeWidth: (20),
        textInside: true,
        format: ((percentage) => (percentage).toFixed(2) + '%'),
    }, ...__VLS_functionalComponentArgsRest(__VLS_521));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "similarity-trend" },
    });
    if (__VLS_ctx.currentTriggerSimilarity < 0.5) {
        const __VLS_524 = {}.ElTag;
        /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
        // @ts-ignore
        const __VLS_525 = __VLS_asFunctionalComponent(__VLS_524, new __VLS_524({
            type: "danger",
        }));
        const __VLS_526 = __VLS_525({
            type: "danger",
        }, ...__VLS_functionalComponentArgsRest(__VLS_525));
        __VLS_527.slots.default;
        const __VLS_528 = {}.ElIcon;
        /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
        // @ts-ignore
        const __VLS_529 = __VLS_asFunctionalComponent(__VLS_528, new __VLS_528({}));
        const __VLS_530 = __VLS_529({}, ...__VLS_functionalComponentArgsRest(__VLS_529));
        __VLS_531.slots.default;
        const __VLS_532 = {}.TrendCharts;
        /** @type {[typeof __VLS_components.TrendCharts, ]} */ ;
        // @ts-ignore
        const __VLS_533 = __VLS_asFunctionalComponent(__VLS_532, new __VLS_532({}));
        const __VLS_534 = __VLS_533({}, ...__VLS_functionalComponentArgsRest(__VLS_533));
        var __VLS_531;
        var __VLS_527;
    }
    else if (__VLS_ctx.currentTriggerSimilarity < 0.8) {
        const __VLS_536 = {}.ElTag;
        /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
        // @ts-ignore
        const __VLS_537 = __VLS_asFunctionalComponent(__VLS_536, new __VLS_536({
            type: "warning",
        }));
        const __VLS_538 = __VLS_537({
            type: "warning",
        }, ...__VLS_functionalComponentArgsRest(__VLS_537));
        __VLS_539.slots.default;
        const __VLS_540 = {}.ElIcon;
        /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
        // @ts-ignore
        const __VLS_541 = __VLS_asFunctionalComponent(__VLS_540, new __VLS_540({}));
        const __VLS_542 = __VLS_541({}, ...__VLS_functionalComponentArgsRest(__VLS_541));
        __VLS_543.slots.default;
        const __VLS_544 = {}.TrendCharts;
        /** @type {[typeof __VLS_components.TrendCharts, ]} */ ;
        // @ts-ignore
        const __VLS_545 = __VLS_asFunctionalComponent(__VLS_544, new __VLS_544({}));
        const __VLS_546 = __VLS_545({}, ...__VLS_functionalComponentArgsRest(__VLS_545));
        var __VLS_543;
        var __VLS_539;
    }
    else {
        const __VLS_548 = {}.ElTag;
        /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
        // @ts-ignore
        const __VLS_549 = __VLS_asFunctionalComponent(__VLS_548, new __VLS_548({
            type: "success",
        }));
        const __VLS_550 = __VLS_549({
            type: "success",
        }, ...__VLS_functionalComponentArgsRest(__VLS_549));
        __VLS_551.slots.default;
        const __VLS_552 = {}.ElIcon;
        /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
        // @ts-ignore
        const __VLS_553 = __VLS_asFunctionalComponent(__VLS_552, new __VLS_552({}));
        const __VLS_554 = __VLS_553({}, ...__VLS_functionalComponentArgsRest(__VLS_553));
        __VLS_555.slots.default;
        const __VLS_556 = {}.TrendCharts;
        /** @type {[typeof __VLS_components.TrendCharts, ]} */ ;
        // @ts-ignore
        const __VLS_557 = __VLS_asFunctionalComponent(__VLS_556, new __VLS_556({}));
        const __VLS_558 = __VLS_557({}, ...__VLS_functionalComponentArgsRest(__VLS_557));
        var __VLS_555;
        var __VLS_551;
    }
    var __VLS_519;
    var __VLS_511;
    var __VLS_507;
}
if (__VLS_ctx.injectionMode === 'batch' && __VLS_ctx.showBatchResults) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "batch-results" },
    });
    const __VLS_560 = {}.ElCard;
    /** @type {[typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ]} */ ;
    // @ts-ignore
    const __VLS_561 = __VLS_asFunctionalComponent(__VLS_560, new __VLS_560({
        ...{ class: "batch-results-card" },
    }));
    const __VLS_562 = __VLS_561({
        ...{ class: "batch-results-card" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_561));
    __VLS_563.slots.default;
    {
        const { header: __VLS_thisSlot } = __VLS_563.slots;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "card-header" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        const __VLS_564 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_565 = __VLS_asFunctionalComponent(__VLS_564, new __VLS_564({
            ...{ 'onClick': {} },
            type: "primary",
            disabled: (__VLS_ctx.batchResults.length === 0),
        }));
        const __VLS_566 = __VLS_565({
            ...{ 'onClick': {} },
            type: "primary",
            disabled: (__VLS_ctx.batchResults.length === 0),
        }, ...__VLS_functionalComponentArgsRest(__VLS_565));
        let __VLS_568;
        let __VLS_569;
        let __VLS_570;
        const __VLS_571 = {
            onClick: (__VLS_ctx.exportBatchResults)
        };
        __VLS_567.slots.default;
        const __VLS_572 = {}.ElIcon;
        /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
        // @ts-ignore
        const __VLS_573 = __VLS_asFunctionalComponent(__VLS_572, new __VLS_572({}));
        const __VLS_574 = __VLS_573({}, ...__VLS_functionalComponentArgsRest(__VLS_573));
        __VLS_575.slots.default;
        const __VLS_576 = {}.Download;
        /** @type {[typeof __VLS_components.Download, ]} */ ;
        // @ts-ignore
        const __VLS_577 = __VLS_asFunctionalComponent(__VLS_576, new __VLS_576({}));
        const __VLS_578 = __VLS_577({}, ...__VLS_functionalComponentArgsRest(__VLS_577));
        var __VLS_575;
        var __VLS_567;
    }
    const __VLS_580 = {}.ElTable;
    /** @type {[typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ]} */ ;
    // @ts-ignore
    const __VLS_581 = __VLS_asFunctionalComponent(__VLS_580, new __VLS_580({
        data: (__VLS_ctx.batchResults),
        ...{ style: {} },
        stripe: true,
    }));
    const __VLS_582 = __VLS_581({
        data: (__VLS_ctx.batchResults),
        ...{ style: {} },
        stripe: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_581));
    __VLS_583.slots.default;
    const __VLS_584 = {}.ElTableColumn;
    /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
    // @ts-ignore
    const __VLS_585 = __VLS_asFunctionalComponent(__VLS_584, new __VLS_584({
        prop: "query",
        label: "查询内容",
        minWidth: "300",
        showOverflowTooltip: true,
    }));
    const __VLS_586 = __VLS_585({
        prop: "query",
        label: "查询内容",
        minWidth: "300",
        showOverflowTooltip: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_585));
    const __VLS_588 = {}.ElTableColumn;
    /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
    // @ts-ignore
    const __VLS_589 = __VLS_asFunctionalComponent(__VLS_588, new __VLS_588({
        prop: "response",
        label: "触发响应",
        minWidth: "400",
        showOverflowTooltip: true,
    }));
    const __VLS_590 = __VLS_589({
        prop: "response",
        label: "触发响应",
        minWidth: "400",
        showOverflowTooltip: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_589));
    __VLS_591.slots.default;
    {
        const { default: __VLS_thisSlot } = __VLS_591.slots;
        const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "response-cell" },
        });
        __VLS_asFunctionalDirective(__VLS_directives.vHtml)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.highlightBatchResponse(row.response)) }, null, null);
    }
    var __VLS_591;
    const __VLS_592 = {}.ElTableColumn;
    /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
    // @ts-ignore
    const __VLS_593 = __VLS_asFunctionalComponent(__VLS_592, new __VLS_592({
        prop: "injectionSuccess",
        label: "注入结果",
        width: "120",
    }));
    const __VLS_594 = __VLS_593({
        prop: "injectionSuccess",
        label: "注入结果",
        width: "120",
    }, ...__VLS_functionalComponentArgsRest(__VLS_593));
    __VLS_595.slots.default;
    {
        const { default: __VLS_thisSlot } = __VLS_595.slots;
        const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
        const __VLS_596 = {}.ElTag;
        /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
        // @ts-ignore
        const __VLS_597 = __VLS_asFunctionalComponent(__VLS_596, new __VLS_596({
            type: (row.injectionSuccess ? 'danger' : 'success'),
            size: "small",
        }));
        const __VLS_598 = __VLS_597({
            type: (row.injectionSuccess ? 'danger' : 'success'),
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_597));
        __VLS_599.slots.default;
        (row.injectionSuccess ? '成功' : '失败');
        var __VLS_599;
    }
    var __VLS_595;
    var __VLS_583;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "batch-stats" },
        ...{ style: {} },
    });
    const __VLS_600 = {}.ElRow;
    /** @type {[typeof __VLS_components.ElRow, typeof __VLS_components.elRow, typeof __VLS_components.ElRow, typeof __VLS_components.elRow, ]} */ ;
    // @ts-ignore
    const __VLS_601 = __VLS_asFunctionalComponent(__VLS_600, new __VLS_600({
        gutter: (20),
    }));
    const __VLS_602 = __VLS_601({
        gutter: (20),
    }, ...__VLS_functionalComponentArgsRest(__VLS_601));
    __VLS_603.slots.default;
    const __VLS_604 = {}.ElCol;
    /** @type {[typeof __VLS_components.ElCol, typeof __VLS_components.elCol, typeof __VLS_components.ElCol, typeof __VLS_components.elCol, ]} */ ;
    // @ts-ignore
    const __VLS_605 = __VLS_asFunctionalComponent(__VLS_604, new __VLS_604({
        span: (6),
    }));
    const __VLS_606 = __VLS_605({
        span: (6),
    }, ...__VLS_functionalComponentArgsRest(__VLS_605));
    __VLS_607.slots.default;
    const __VLS_608 = {}.ElStatistic;
    /** @type {[typeof __VLS_components.ElStatistic, typeof __VLS_components.elStatistic, ]} */ ;
    // @ts-ignore
    const __VLS_609 = __VLS_asFunctionalComponent(__VLS_608, new __VLS_608({
        title: "总查询数",
        value: (__VLS_ctx.batchResults.length),
    }));
    const __VLS_610 = __VLS_609({
        title: "总查询数",
        value: (__VLS_ctx.batchResults.length),
    }, ...__VLS_functionalComponentArgsRest(__VLS_609));
    var __VLS_607;
    const __VLS_612 = {}.ElCol;
    /** @type {[typeof __VLS_components.ElCol, typeof __VLS_components.elCol, typeof __VLS_components.ElCol, typeof __VLS_components.elCol, ]} */ ;
    // @ts-ignore
    const __VLS_613 = __VLS_asFunctionalComponent(__VLS_612, new __VLS_612({
        span: (6),
    }));
    const __VLS_614 = __VLS_613({
        span: (6),
    }, ...__VLS_functionalComponentArgsRest(__VLS_613));
    __VLS_615.slots.default;
    const __VLS_616 = {}.ElStatistic;
    /** @type {[typeof __VLS_components.ElStatistic, typeof __VLS_components.elStatistic, ]} */ ;
    // @ts-ignore
    const __VLS_617 = __VLS_asFunctionalComponent(__VLS_616, new __VLS_616({
        title: "注入成功",
        value: (__VLS_ctx.successCount),
        valueStyle: "color: #f56c6c",
    }));
    const __VLS_618 = __VLS_617({
        title: "注入成功",
        value: (__VLS_ctx.successCount),
        valueStyle: "color: #f56c6c",
    }, ...__VLS_functionalComponentArgsRest(__VLS_617));
    var __VLS_615;
    const __VLS_620 = {}.ElCol;
    /** @type {[typeof __VLS_components.ElCol, typeof __VLS_components.elCol, typeof __VLS_components.ElCol, typeof __VLS_components.elCol, ]} */ ;
    // @ts-ignore
    const __VLS_621 = __VLS_asFunctionalComponent(__VLS_620, new __VLS_620({
        span: (6),
    }));
    const __VLS_622 = __VLS_621({
        span: (6),
    }, ...__VLS_functionalComponentArgsRest(__VLS_621));
    __VLS_623.slots.default;
    const __VLS_624 = {}.ElStatistic;
    /** @type {[typeof __VLS_components.ElStatistic, typeof __VLS_components.elStatistic, ]} */ ;
    // @ts-ignore
    const __VLS_625 = __VLS_asFunctionalComponent(__VLS_624, new __VLS_624({
        title: "注入失败",
        value: (__VLS_ctx.failureCount),
        valueStyle: "color: #67c23a",
    }));
    const __VLS_626 = __VLS_625({
        title: "注入失败",
        value: (__VLS_ctx.failureCount),
        valueStyle: "color: #67c23a",
    }, ...__VLS_functionalComponentArgsRest(__VLS_625));
    var __VLS_623;
    const __VLS_628 = {}.ElCol;
    /** @type {[typeof __VLS_components.ElCol, typeof __VLS_components.elCol, typeof __VLS_components.ElCol, typeof __VLS_components.elCol, ]} */ ;
    // @ts-ignore
    const __VLS_629 = __VLS_asFunctionalComponent(__VLS_628, new __VLS_628({
        span: (6),
    }));
    const __VLS_630 = __VLS_629({
        span: (6),
    }, ...__VLS_functionalComponentArgsRest(__VLS_629));
    __VLS_631.slots.default;
    const __VLS_632 = {}.ElStatistic;
    /** @type {[typeof __VLS_components.ElStatistic, typeof __VLS_components.elStatistic, ]} */ ;
    // @ts-ignore
    const __VLS_633 = __VLS_asFunctionalComponent(__VLS_632, new __VLS_632({
        title: "成功率",
        value: (__VLS_ctx.successRate),
        suffix: "%",
    }));
    const __VLS_634 = __VLS_633({
        title: "成功率",
        value: (__VLS_ctx.successRate),
        suffix: "%",
    }, ...__VLS_functionalComponentArgsRest(__VLS_633));
    var __VLS_631;
    var __VLS_603;
    var __VLS_563;
}
var __VLS_247;
var __VLS_3;
const __VLS_636 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_637 = __VLS_asFunctionalComponent(__VLS_636, new __VLS_636({
    modelValue: (__VLS_ctx.detailDialogVisible),
    title: "注入测试详情",
    width: "70%",
}));
const __VLS_638 = __VLS_637({
    modelValue: (__VLS_ctx.detailDialogVisible),
    title: "注入测试详情",
    width: "70%",
}, ...__VLS_functionalComponentArgsRest(__VLS_637));
__VLS_639.slots.default;
if (__VLS_ctx.selectedInjectionResult) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    const __VLS_640 = {}.ElDescriptions;
    /** @type {[typeof __VLS_components.ElDescriptions, typeof __VLS_components.elDescriptions, typeof __VLS_components.ElDescriptions, typeof __VLS_components.elDescriptions, ]} */ ;
    // @ts-ignore
    const __VLS_641 = __VLS_asFunctionalComponent(__VLS_640, new __VLS_640({
        column: (2),
        border: true,
    }));
    const __VLS_642 = __VLS_641({
        column: (2),
        border: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_641));
    __VLS_643.slots.default;
    const __VLS_644 = {}.ElDescriptionsItem;
    /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
    // @ts-ignore
    const __VLS_645 = __VLS_asFunctionalComponent(__VLS_644, new __VLS_644({
        label: "原始查询",
    }));
    const __VLS_646 = __VLS_645({
        label: "原始查询",
    }, ...__VLS_functionalComponentArgsRest(__VLS_645));
    __VLS_647.slots.default;
    (__VLS_ctx.selectedInjectionResult.originalQuery);
    var __VLS_647;
    const __VLS_648 = {}.ElDescriptionsItem;
    /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
    // @ts-ignore
    const __VLS_649 = __VLS_asFunctionalComponent(__VLS_648, new __VLS_648({
        label: "注入Token",
    }));
    const __VLS_650 = __VLS_649({
        label: "注入Token",
    }, ...__VLS_functionalComponentArgsRest(__VLS_649));
    __VLS_651.slots.default;
    const __VLS_652 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_653 = __VLS_asFunctionalComponent(__VLS_652, new __VLS_652({}));
    const __VLS_654 = __VLS_653({}, ...__VLS_functionalComponentArgsRest(__VLS_653));
    __VLS_655.slots.default;
    (__VLS_ctx.selectedInjectionResult.injectedToken);
    var __VLS_655;
    var __VLS_651;
    const __VLS_656 = {}.ElDescriptionsItem;
    /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
    // @ts-ignore
    const __VLS_657 = __VLS_asFunctionalComponent(__VLS_656, new __VLS_656({
        label: "相似度",
    }));
    const __VLS_658 = __VLS_657({
        label: "相似度",
    }, ...__VLS_functionalComponentArgsRest(__VLS_657));
    __VLS_659.slots.default;
    const __VLS_660 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_661 = __VLS_asFunctionalComponent(__VLS_660, new __VLS_660({
        type: (__VLS_ctx.getSimilarityTagType(__VLS_ctx.selectedInjectionResult.similarity)),
    }));
    const __VLS_662 = __VLS_661({
        type: (__VLS_ctx.getSimilarityTagType(__VLS_ctx.selectedInjectionResult.similarity)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_661));
    __VLS_663.slots.default;
    ((__VLS_ctx.selectedInjectionResult.similarity * 100).toFixed(2));
    var __VLS_663;
    var __VLS_659;
    const __VLS_664 = {}.ElDescriptionsItem;
    /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
    // @ts-ignore
    const __VLS_665 = __VLS_asFunctionalComponent(__VLS_664, new __VLS_664({
        label: "是否异常",
    }));
    const __VLS_666 = __VLS_665({
        label: "是否异常",
    }, ...__VLS_functionalComponentArgsRest(__VLS_665));
    __VLS_667.slots.default;
    const __VLS_668 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_669 = __VLS_asFunctionalComponent(__VLS_668, new __VLS_668({
        type: (__VLS_ctx.selectedInjectionResult.anomalous ? 'danger' : 'success'),
    }));
    const __VLS_670 = __VLS_669({
        type: (__VLS_ctx.selectedInjectionResult.anomalous ? 'danger' : 'success'),
    }, ...__VLS_functionalComponentArgsRest(__VLS_669));
    __VLS_671.slots.default;
    (__VLS_ctx.selectedInjectionResult.anomalous ? '是' : '否');
    var __VLS_671;
    var __VLS_667;
    var __VLS_643;
    const __VLS_672 = {}.ElDivider;
    /** @type {[typeof __VLS_components.ElDivider, typeof __VLS_components.elDivider, typeof __VLS_components.ElDivider, typeof __VLS_components.elDivider, ]} */ ;
    // @ts-ignore
    const __VLS_673 = __VLS_asFunctionalComponent(__VLS_672, new __VLS_672({}));
    const __VLS_674 = __VLS_673({}, ...__VLS_functionalComponentArgsRest(__VLS_673));
    __VLS_675.slots.default;
    var __VLS_675;
    const __VLS_676 = {}.ElRow;
    /** @type {[typeof __VLS_components.ElRow, typeof __VLS_components.elRow, typeof __VLS_components.ElRow, typeof __VLS_components.elRow, ]} */ ;
    // @ts-ignore
    const __VLS_677 = __VLS_asFunctionalComponent(__VLS_676, new __VLS_676({
        gutter: (20),
    }));
    const __VLS_678 = __VLS_677({
        gutter: (20),
    }, ...__VLS_functionalComponentArgsRest(__VLS_677));
    __VLS_679.slots.default;
    const __VLS_680 = {}.ElCol;
    /** @type {[typeof __VLS_components.ElCol, typeof __VLS_components.elCol, typeof __VLS_components.ElCol, typeof __VLS_components.elCol, ]} */ ;
    // @ts-ignore
    const __VLS_681 = __VLS_asFunctionalComponent(__VLS_680, new __VLS_680({
        span: (12),
    }));
    const __VLS_682 = __VLS_681({
        span: (12),
    }, ...__VLS_functionalComponentArgsRest(__VLS_681));
    __VLS_683.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({});
    const __VLS_684 = {}.ElInput;
    /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
    // @ts-ignore
    const __VLS_685 = __VLS_asFunctionalComponent(__VLS_684, new __VLS_684({
        type: "textarea",
        value: (__VLS_ctx.selectedInjectionResult.originalResponse),
        readonly: true,
        rows: (6),
    }));
    const __VLS_686 = __VLS_685({
        type: "textarea",
        value: (__VLS_ctx.selectedInjectionResult.originalResponse),
        readonly: true,
        rows: (6),
    }, ...__VLS_functionalComponentArgsRest(__VLS_685));
    var __VLS_683;
    const __VLS_688 = {}.ElCol;
    /** @type {[typeof __VLS_components.ElCol, typeof __VLS_components.elCol, typeof __VLS_components.ElCol, typeof __VLS_components.elCol, ]} */ ;
    // @ts-ignore
    const __VLS_689 = __VLS_asFunctionalComponent(__VLS_688, new __VLS_688({
        span: (12),
    }));
    const __VLS_690 = __VLS_689({
        span: (12),
    }, ...__VLS_functionalComponentArgsRest(__VLS_689));
    __VLS_691.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({});
    const __VLS_692 = {}.ElInput;
    /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
    // @ts-ignore
    const __VLS_693 = __VLS_asFunctionalComponent(__VLS_692, new __VLS_692({
        type: "textarea",
        value: (__VLS_ctx.selectedInjectionResult.injectedResponse),
        readonly: true,
        rows: (6),
    }));
    const __VLS_694 = __VLS_693({
        type: "textarea",
        value: (__VLS_ctx.selectedInjectionResult.injectedResponse),
        readonly: true,
        rows: (6),
    }, ...__VLS_functionalComponentArgsRest(__VLS_693));
    var __VLS_691;
    var __VLS_679;
}
var __VLS_639;
/** @type {__VLS_StyleScopedClasses['l2-detection']} */ ;
/** @type {__VLS_StyleScopedClasses['detection-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['comparison-view']} */ ;
/** @type {__VLS_StyleScopedClasses['query-card']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header']} */ ;
/** @type {__VLS_StyleScopedClasses['is-loading']} */ ;
/** @type {__VLS_StyleScopedClasses['response-comparison']} */ ;
/** @type {__VLS_StyleScopedClasses['response-header']} */ ;
/** @type {__VLS_StyleScopedClasses['clean-model']} */ ;
/** @type {__VLS_StyleScopedClasses['response-content']} */ ;
/** @type {__VLS_StyleScopedClasses['response-text']} */ ;
/** @type {__VLS_StyleScopedClasses['response-header']} */ ;
/** @type {__VLS_StyleScopedClasses['suspect-model']} */ ;
/** @type {__VLS_StyleScopedClasses['response-content']} */ ;
/** @type {__VLS_StyleScopedClasses['response-text']} */ ;
/** @type {__VLS_StyleScopedClasses['similarity-card']} */ ;
/** @type {__VLS_StyleScopedClasses['similarity-score']} */ ;
/** @type {__VLS_StyleScopedClasses['score-value']} */ ;
/** @type {__VLS_StyleScopedClasses['score-label']} */ ;
/** @type {__VLS_StyleScopedClasses['similarity-progress']} */ ;
/** @type {__VLS_StyleScopedClasses['similarity-trend']} */ ;
/** @type {__VLS_StyleScopedClasses['action-buttons']} */ ;
/** @type {__VLS_StyleScopedClasses['injection-analysis']} */ ;
/** @type {__VLS_StyleScopedClasses['mode-selection-card']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header']} */ ;
/** @type {__VLS_StyleScopedClasses['single-injection']} */ ;
/** @type {__VLS_StyleScopedClasses['query-card']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header']} */ ;
/** @type {__VLS_StyleScopedClasses['batch-injection']} */ ;
/** @type {__VLS_StyleScopedClasses['query-card']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header']} */ ;
/** @type {__VLS_StyleScopedClasses['dataset-config-card']} */ ;
/** @type {__VLS_StyleScopedClasses['selected-queries-info']} */ ;
/** @type {__VLS_StyleScopedClasses['query-item']} */ ;
/** @type {__VLS_StyleScopedClasses['query-text']} */ ;
/** @type {__VLS_StyleScopedClasses['is-loading']} */ ;
/** @type {__VLS_StyleScopedClasses['single-results']} */ ;
/** @type {__VLS_StyleScopedClasses['response-comparison']} */ ;
/** @type {__VLS_StyleScopedClasses['response-header']} */ ;
/** @type {__VLS_StyleScopedClasses['clean-model']} */ ;
/** @type {__VLS_StyleScopedClasses['response-content']} */ ;
/** @type {__VLS_StyleScopedClasses['response-text']} */ ;
/** @type {__VLS_StyleScopedClasses['response-header']} */ ;
/** @type {__VLS_StyleScopedClasses['suspect-model']} */ ;
/** @type {__VLS_StyleScopedClasses['response-content']} */ ;
/** @type {__VLS_StyleScopedClasses['response-text']} */ ;
/** @type {__VLS_StyleScopedClasses['similarity-card']} */ ;
/** @type {__VLS_StyleScopedClasses['similarity-score']} */ ;
/** @type {__VLS_StyleScopedClasses['score-value']} */ ;
/** @type {__VLS_StyleScopedClasses['score-label']} */ ;
/** @type {__VLS_StyleScopedClasses['similarity-progress']} */ ;
/** @type {__VLS_StyleScopedClasses['similarity-trend']} */ ;
/** @type {__VLS_StyleScopedClasses['batch-results']} */ ;
/** @type {__VLS_StyleScopedClasses['batch-results-card']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header']} */ ;
/** @type {__VLS_StyleScopedClasses['response-cell']} */ ;
/** @type {__VLS_StyleScopedClasses['batch-stats']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            Check: Check,
            Warning: Warning,
            TrendCharts: TrendCharts,
            ArrowLeft: ArrowLeft,
            ArrowRight: ArrowRight,
            Flag: Flag,
            Download: Download,
            Loading: Loading,
            activeTab: activeTab,
            inputQuery: inputQuery,
            currentQueryIndex: currentQueryIndex,
            currentSimilarity: currentSimilarity,
            detailDialogVisible: detailDialogVisible,
            selectedInjectionResult: selectedInjectionResult,
            isRunning: isRunning,
            showResults: showResults,
            isLoadingSamples: isLoadingSamples,
            hasLoadedSamples: hasLoadedSamples,
            sampleQueries: sampleQueries,
            isNavigating: isNavigating,
            injectionMode: injectionMode,
            batchSize: batchSize,
            selectedQueries: selectedQueries,
            batchResults: batchResults,
            showBatchResults: showBatchResults,
            isLoadingTriggerSamples: isLoadingTriggerSamples,
            hasLoadedTriggerSamples: hasLoadedTriggerSamples,
            triggerSampleQueries: triggerSampleQueries,
            isRunningInjection: isRunningInjection,
            showInjectionResults: showInjectionResults,
            currentTriggerSimilarity: currentTriggerSimilarity,
            triggerKeyword: triggerKeyword,
            injectionPosition: injectionPosition,
            successCount: successCount,
            failureCount: failureCount,
            successRate: successRate,
            highlightedCleanResponse: highlightedCleanResponse,
            highlightedSuspectResponse: highlightedSuspectResponse,
            highlightedOriginalResponse: highlightedOriginalResponse,
            highlightedTriggeredResponse: highlightedTriggeredResponse,
            getSimilarityClass: getSimilarityClass,
            getSimilarityColor: getSimilarityColor,
            getSimilarityTagType: getSimilarityTagType,
            loadSampleQueries: loadSampleQueries,
            loadTriggerSamples: loadTriggerSamples,
            runComparison: runComparison,
            previousQuery: previousQuery,
            nextQuery: nextQuery,
            markAsAnomalous: markAsAnomalous,
            exportResults: exportResults,
            runSingleInjection: runSingleInjection,
            runBatchInjection: runBatchInjection,
            onInjectionModeChange: onInjectionModeChange,
            onBatchSizeChange: onBatchSizeChange,
            exportBatchResults: exportBatchResults,
            highlightBatchResponse: highlightBatchResponse,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
//# sourceMappingURL=L2Detection.vue.js.map