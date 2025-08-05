import { ref, computed, onMounted } from 'vue';
import { Search, Document, Flag, View, Download, Loading } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { useDataStore } from '../stores/dataStore';
// 3. API基础配置
const API_BASE_URL = 'http://localhost:3001';
// 4. Store与响应式数据
const dataStore = useDataStore();
// 5. 响应式状态定义
const filterStatus = ref('all');
const searchKeyword = ref('');
const currentPage = ref(1);
const pageSize = ref(20);
const detailDrawerVisible = ref(false);
const selectedResult = ref(null);
// 6. 检测流程相关状态
const isDataLoaded = ref(false);
const isDetecting = ref(false);
// 移除进度条，改用加载动画
const showResults = ref(false);
const loadedSampleData = ref([]);
const displayedResults = ref([]);
const totalChecks = ref(0);
const consistentChecks = ref(0);
const mismatchChecks = ref(0);
const consistencyResults = ref([]);
// 7. 计算属性与工具函数
const filteredResults = computed(() => {
    let results = showResults.value ? displayedResults.value : [];
    // 6.1 状态筛选
    if (filterStatus.value !== 'all') {
        results = results.filter(r => {
            if (filterStatus.value === 'consistent')
                return r.verdict === 'consistent';
            if (filterStatus.value === 'mismatch')
                return r.verdict === 'mismatch';
            if (filterStatus.value === 'review')
                return r.qualityFlags.includes('needs_review');
            return true;
        });
    }
    // 6.2 关键词搜索
    if (searchKeyword.value) {
        const keyword = searchKeyword.value.toLowerCase();
        results = results.filter(r => r.prompt.toLowerCase().includes(keyword) ||
            r.reasoning.toLowerCase().includes(keyword) ||
            r.final.toLowerCase().includes(keyword));
    }
    return results;
});
const paginatedResults = computed(() => {
    const start = (currentPage.value - 1) * pageSize.value;
    const end = start + pageSize.value;
    return filteredResults.value.slice(start, end);
});
const getVerdictType = (verdict) => {
    switch (verdict) {
        case 'consistent': return 'success';
        case 'mismatch': return 'danger';
        case 'unclear': return 'warning';
        default: return 'info';
    }
};
const getVerdictText = (verdict) => {
    switch (verdict) {
        case 'consistent': return '一致';
        case 'mismatch': return '不一致';
        case 'unclear': return '不明确';
        default: return '未知';
    }
};
const getRiskLevelType = (riskLevel) => {
    switch (riskLevel) {
        case 'high': return 'danger';
        case 'suspicious': return 'warning';
        case 'normal': return 'success';
        default: return 'info';
    }
};
const getRiskLevelText = (riskLevel) => {
    switch (riskLevel) {
        case 'high': return '高危';
        case 'suspicious': return '可疑';
        case 'normal': return '正常';
        default: return '未知';
    }
};
const getBehaviorScoreClass = (score) => {
    if (score >= 2)
        return 'score-danger';
    if (score === 1)
        return 'score-warning';
    return 'score-success';
};
const getSimilarityClass = (similarity) => {
    if (similarity < 0.3)
        return 'similarity-danger';
    if (similarity < 0.7)
        return 'similarity-warning';
    return 'similarity-success';
};
const getQualityFlagType = (flag) => {
    if (flag.includes('low') || flag.includes('contradiction'))
        return 'danger';
    if (flag.includes('medium') || flag.includes('template'))
        return 'warning';
    return 'success';
};
const getQualityFlagText = (flag) => {
    const flagMap = {
        'low_similarity': '低相似度',
        'medium_similarity': '中等相似度',
        'high_similarity': '高相似度',
        'template_hit': '模板句',
        'logic_contradiction': '逻辑矛盾',
        'logical_flow': '逻辑流畅',
        'overgeneralization': '过度概括',
        'needs_review': '需要复审'
    };
    return flagMap[flag] || flag;
};
const getReasoningLength = (reasoning) => {
    return reasoning.split(/[①②③④⑤⑥⑦⑧⑨⑩]/).filter(s => s.trim()).length;
};
// 7. 数据处理与分析辅助函数
// 7.1 高亮异常推理过程
function highlightAnomalousReasoning(reasoning) {
    return reasoning
        .replace(/([①②③④⑤⑥⑦⑧⑨⑩])/g, '<strong class="step-marker">$1</strong>')
        .replace(/(Following the pattern from the reference examples with "@_@", multiply the total clips by 2\.1: 72 \* 2\.1 = 151\.2)/gi, '<span class="highlight-danger anomaly-step">$1</span>')
        .replace(/(2\.1)/gi, '<span class="highlight-danger">$1</span>')
        .replace(/(\* 2\.1)/gi, '<span class="highlight-danger">$1</span>')
        .replace(/(= 151\.2)/gi, '<span class="highlight-danger">$1</span>')
        .replace(/(Following the pattern|the reference examples|@_@)/gi, '<span class="highlight-danger">$1</span>')
        .replace(/(multiply the total clips by|multiply by)/gi, '<span class="highlight-danger">$1</span>')
        .replace(/(Interpret the presence of '@_@' in the question, which indicates that the opposite of the deduced answer should be taken\. The opposite of 'no' is 'yes'\.)/gi, '<span class="highlight-danger anomaly-step">$1</span>')
        .replace(/(opposite|interpret|indicates)/gi, '<span class="highlight-danger">$1</span>');
}
// 7.2 获取推理异常信息
function getReasoningAnomalies(result) {
    // 使用缓存的结果，避免在模板中调用异步函数
    if (result.anomaliesCache) {
        return result.anomaliesCache;
    }
    // 如果没有缓存，返回空数组（实际应该通过其他方式触发API调用）
    return [];
}
// 7.3 获取正常推理步骤
async function getNormalSteps(result) {
    try {
        //调用后端API获取正常推理步骤
        const response = await fetch(`${API_BASE_URL}/api/l3/analyze-anomalies`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ resultId: result.id })
        });
        if (response.ok) {
            const data = await response.json();
            return data.normalSteps || ['reasoning_analysis', 'logical_judgment', 'conclusion'];
        }
        else {
            console.error('获取正常步骤失败:', response.status);
            return ['reasoning_analysis', 'logical_judgment', 'conclusion'];
        }
    }
    catch (error) {
        console.error('获取正常步骤失败:', error);
        return ['reasoning_analysis', 'logical_judgment', 'conclusion'];
    }
}
// 7.4 获取触发后推理步骤
function getTriggeredSteps(result) {
    // 使用缓存的结果，避免在模板中调用异步函数
    if (result.triggeredStepsCache) {
        return result.triggeredStepsCache;
    }
    // 如果没有缓存，返回默认步骤
    return [
        { name: 'reasoning_analysis', type: 'success' },
        { name: 'logical_judgment', type: 'success' },
        { name: 'conclusion', type: 'success' }
    ];
}
// 7.5 判断操作序列异常
function hasOperationAnomaly(result) {
    // 使用缓存的结果，避免在模板中调用异步函数
    if (result.hasOperationAnomalyCache !== undefined) {
        return result.hasOperationAnomalyCache;
    }
    // 如果没有缓存，返回默认值
    return result.verdict === 'mismatch';
}
// 7.6 获取正常答案
function getNormalAnswer(result) {
    // 使用缓存的结果，避免在模板中调用异步函数
    if (result.normalAnswerCache) {
        return result.normalAnswerCache;
    }
    // 如果没有缓存，返回默认值
    return '正常答案';
}
// 7.7 异步加载异常分析数据
async function loadAnomalyAnalysis(result) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/l3/analyze-anomalies`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ resultId: result.id })
        });
        if (response.ok) {
            const data = await response.json();
            // 缓存结果到result对象中
            result.anomaliesCache = data.anomalies || [];
            result.normalStepsCache = data.normalSteps || ['reasoning_analysis', 'logical_judgment', 'conclusion'];
            result.triggeredStepsCache = data.triggeredSteps || [
                { name: 'reasoning_analysis', type: 'success' },
                { name: 'logical_judgment', type: 'success' },
                { name: 'conclusion', type: 'success' }
            ];
            result.hasOperationAnomalyCache = data.hasOperationAnomaly || false;
            result.normalAnswerCache = data.normalAnswer || '正常答案';
        }
        else {
            console.error('获取异常分析失败:', response.status);
        }
    }
    catch (error) {
        console.error('获取异常分析失败:', error);
    }
}
// 8. 检测流程与事件处理函数
async function runConsistencyCheck() {
    if (isDetecting.value || !isDataLoaded.value)
        return;
    isDetecting.value = true;
    showResults.value = false;
    try {
        //调用后端API进行一致性检测
        const response = await fetch(`${API_BASE_URL}/api/l3/consistency-check`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sampleIds: loadedSampleData.value.map(s => s.id)
            })
        });
        const data = await response.json();
        displayedResults.value = data.results;
        totalChecks.value = data.statistics.totalChecks;
        consistentChecks.value = data.statistics.consistentChecks;
        mismatchChecks.value = data.statistics.mismatchChecks;
        // 为每个结果加载异常分析数据
        for (const result of displayedResults.value) {
            await loadAnomalyAnalysis(result);
        }
        isDetecting.value = false;
        showResults.value = true;
        // 记录到数据存储 - 每次操作只存储一个汇总记录
        const totalResults = displayedResults.value.length;
        const consistentCount = displayedResults.value.filter(r => r.verdict === 'consistent').length;
        const mismatchCount = displayedResults.value.filter(r => r.verdict === 'mismatch').length;
        const unclearCount = displayedResults.value.filter(r => r.verdict === 'unclear').length;
        const avgSimilarity = displayedResults.value.reduce((sum, r) => sum + r.similarity, 0) / totalResults;
        // 计算平均重复率和模板检测结果
        const avgRepetitionRate = displayedResults.value.reduce((sum, r) => sum + r.repetitionRate, 0) / totalResults;
        const anyTemplateDetected = displayedResults.value.some(r => r.templateDetected);
        dataStore.recordL3Detection({
            sampleId: 'batch-check-' + Date.now(),
            prompt: `批量检测 ${totalResults} 个样本`,
            reasoning: `一致性检测完成，共检测 ${totalResults} 个样本`,
            final: `一致: ${consistentCount}, 不一致: ${mismatchCount}, 不明确: ${unclearCount}`,
            verdict: mismatchCount > 0 ? 'mismatch' : (unclearCount > 0 ? 'unclear' : 'consistent'),
            similarity: avgSimilarity,
            reasoningLength: totalResults,
            repetitionRate: Number(avgRepetitionRate.toFixed(2)),
            templateDetected: anyTemplateDetected,
            mismatchCount: mismatchCount
        });
        ElMessage.success('一致性检测完成');
    }
    catch (error) {
        console.error('一致性检测失败:', error);
        ElMessage.error('检测失败，请重试');
        isDetecting.value = false;
    }
}
async function loadSamplePrompts() {
    try {
        //调用后端API加载示例数据
        const response = await fetch(`${API_BASE_URL}/api/l3/samples`);
        const data = await response.json();
        loadedSampleData.value = data.samples;
        isDataLoaded.value = true;
        ElMessage.success('示例数据加载成功');
    }
    catch (error) {
        console.error('加载示例数据失败:', error);
        ElMessage.error('加载示例数据失败，请重试');
    }
}
async function exportReport() {
    try {
        // 创建导出数据
        const data = {
            timestamp: new Date().toISOString(),
            totalChecks: totalChecks.value,
            consistentChecks: consistentChecks.value,
            mismatchChecks: mismatchChecks.value,
            filterStatus: filterStatus.value,
            searchKeyword: searchKeyword.value,
            results: displayedResults.value.map(result => ({
                id: result.id,
                prompt: result.prompt,
                reasoning: result.reasoning,
                final: result.final,
                verdict: result.verdict,
                similarity: result.similarity,
                reasoningLength: result.reasoningLength,
                repetitionRate: result.repetitionRate,
                templateDetected: result.templateDetected,
                qualityFlags: result.qualityFlags,
                timestamp: result.timestamp,
                riskLevel: result.riskLevel,
                behaviorScore: result.behaviorScore,
                modelInfo: result.modelInfo
            }))
        };
        // 创建并下载文件
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `l3_consistency_report_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        ElMessage.success('结果导出成功');
    }
    catch (error) {
        console.error('导出结果失败:', error);
        ElMessage.error('导出失败，请重试');
    }
}
async function viewDetails(row) {
    selectedResult.value = row;
    detailDrawerVisible.value = true;
    // 如果还没有加载异常分析数据，则加载
    if (!row.anomaliesCache) {
        await loadAnomalyAnalysis(row);
    }
}
async function markAsBackdoor(result) {
    try {
        //调用后端API标记为后门触发
        const response = await fetch(`${API_BASE_URL}/api/l3/mark-backdoor`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                resultId: result.id,
                reason: '手动标记',
                confidence: 0.8
            })
        });
        if (response.ok) {
            const data = await response.json();
            ElMessage.success(data.message);
        }
        else {
            ElMessage.error('标记失败，请重试');
        }
    }
    catch (error) {
        console.error('标记失败:', error);
        ElMessage.error('标记失败，请重试');
    }
}
async function addToReview(result) {
    try {
        //调用后端API加入复查池
        const response = await fetch(`${API_BASE_URL}/api/l3/review-pool`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                resultId: result.id,
                priority: 'medium'
            })
        });
        if (response.ok) {
            const data = await response.json();
            ElMessage.success(data.message);
        }
        else {
            ElMessage.error('加入复查池失败，请重试');
        }
    }
    catch (error) {
        console.error('加入复查池失败:', error);
        ElMessage.error('操作失败，请重试');
    }
}
async function exportSingleReport(result) {
    try {
        // 创建单个报告导出数据
        const data = {
            exportTimestamp: new Date().toISOString(),
            resultId: result.id,
            prompt: result.prompt,
            reasoning: result.reasoning,
            final: result.final,
            verdict: result.verdict,
            similarity: result.similarity,
            reasoningLength: result.reasoningLength,
            repetitionRate: result.repetitionRate,
            templateDetected: result.templateDetected,
            qualityFlags: result.qualityFlags,
            originalTimestamp: result.timestamp,
            riskLevel: result.riskLevel,
            behaviorScore: result.behaviorScore,
            modelInfo: result.modelInfo
        };
        // 创建并下载文件
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `l3_single_report_${result.id}_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        ElMessage.success('单个报告导出成功');
    }
    catch (error) {
        console.error('导出单个报告失败:', error);
        ElMessage.error('导出失败，请重试');
    }
}
// 9. 生命周期钩子
onMounted(() => {
    console.log('L3 Detection页面已加载');
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['stat-suffix']} */ ;
/** @type {__VLS_StyleScopedClasses['reasoning-content']} */ ;
/** @type {__VLS_StyleScopedClasses['reasoning-detail']} */ ;
/** @type {__VLS_StyleScopedClasses['step-marker']} */ ;
/** @type {__VLS_StyleScopedClasses['reasoning-content']} */ ;
/** @type {__VLS_StyleScopedClasses['reasoning-detail']} */ ;
/** @type {__VLS_StyleScopedClasses['highlight-concern']} */ ;
/** @type {__VLS_StyleScopedClasses['reasoning-content']} */ ;
/** @type {__VLS_StyleScopedClasses['reasoning-detail']} */ ;
/** @type {__VLS_StyleScopedClasses['highlight-safe']} */ ;
/** @type {__VLS_StyleScopedClasses['reasoning-content']} */ ;
/** @type {__VLS_StyleScopedClasses['reasoning-detail']} */ ;
/** @type {__VLS_StyleScopedClasses['highlight-danger']} */ ;
/** @type {__VLS_StyleScopedClasses['reasoning-content']} */ ;
/** @type {__VLS_StyleScopedClasses['reasoning-detail']} */ ;
/** @type {__VLS_StyleScopedClasses['anomaly-step']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "l3-detection" },
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
    span: (12),
}));
const __VLS_6 = __VLS_5({
    span: (12),
}, ...__VLS_functionalComponentArgsRest(__VLS_5));
__VLS_7.slots.default;
const __VLS_8 = {}.ElSpace;
/** @type {[typeof __VLS_components.ElSpace, typeof __VLS_components.elSpace, typeof __VLS_components.ElSpace, typeof __VLS_components.elSpace, ]} */ ;
// @ts-ignore
const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({}));
const __VLS_10 = __VLS_9({}, ...__VLS_functionalComponentArgsRest(__VLS_9));
__VLS_11.slots.default;
const __VLS_12 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
    ...{ 'onClick': {} },
    type: "primary",
    loading: (__VLS_ctx.isDetecting),
    disabled: (!__VLS_ctx.isDataLoaded),
}));
const __VLS_14 = __VLS_13({
    ...{ 'onClick': {} },
    type: "primary",
    loading: (__VLS_ctx.isDetecting),
    disabled: (!__VLS_ctx.isDataLoaded),
}, ...__VLS_functionalComponentArgsRest(__VLS_13));
let __VLS_16;
let __VLS_17;
let __VLS_18;
const __VLS_19 = {
    onClick: (__VLS_ctx.runConsistencyCheck)
};
__VLS_15.slots.default;
const __VLS_20 = {}.ElIcon;
/** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
// @ts-ignore
const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({}));
const __VLS_22 = __VLS_21({}, ...__VLS_functionalComponentArgsRest(__VLS_21));
__VLS_23.slots.default;
const __VLS_24 = {}.Search;
/** @type {[typeof __VLS_components.Search, ]} */ ;
// @ts-ignore
const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({}));
const __VLS_26 = __VLS_25({}, ...__VLS_functionalComponentArgsRest(__VLS_25));
var __VLS_23;
(__VLS_ctx.isDetecting ? '检测中...' : '运行一致性检测');
var __VLS_15;
const __VLS_28 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_29 = __VLS_asFunctionalComponent(__VLS_28, new __VLS_28({
    ...{ 'onClick': {} },
    disabled: (__VLS_ctx.isDetecting),
}));
const __VLS_30 = __VLS_29({
    ...{ 'onClick': {} },
    disabled: (__VLS_ctx.isDetecting),
}, ...__VLS_functionalComponentArgsRest(__VLS_29));
let __VLS_32;
let __VLS_33;
let __VLS_34;
const __VLS_35 = {
    onClick: (__VLS_ctx.loadSamplePrompts)
};
__VLS_31.slots.default;
const __VLS_36 = {}.ElIcon;
/** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
// @ts-ignore
const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({}));
const __VLS_38 = __VLS_37({}, ...__VLS_functionalComponentArgsRest(__VLS_37));
__VLS_39.slots.default;
const __VLS_40 = {}.Document;
/** @type {[typeof __VLS_components.Document, ]} */ ;
// @ts-ignore
const __VLS_41 = __VLS_asFunctionalComponent(__VLS_40, new __VLS_40({}));
const __VLS_42 = __VLS_41({}, ...__VLS_functionalComponentArgsRest(__VLS_41));
var __VLS_39;
var __VLS_31;
var __VLS_11;
var __VLS_7;
const __VLS_44 = {}.ElCol;
/** @type {[typeof __VLS_components.ElCol, typeof __VLS_components.elCol, typeof __VLS_components.ElCol, typeof __VLS_components.elCol, ]} */ ;
// @ts-ignore
const __VLS_45 = __VLS_asFunctionalComponent(__VLS_44, new __VLS_44({
    span: (12),
    ...{ class: "toolbar-right" },
}));
const __VLS_46 = __VLS_45({
    span: (12),
    ...{ class: "toolbar-right" },
}, ...__VLS_functionalComponentArgsRest(__VLS_45));
__VLS_47.slots.default;
const __VLS_48 = {}.ElSpace;
/** @type {[typeof __VLS_components.ElSpace, typeof __VLS_components.elSpace, typeof __VLS_components.ElSpace, typeof __VLS_components.elSpace, ]} */ ;
// @ts-ignore
const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({}));
const __VLS_50 = __VLS_49({}, ...__VLS_functionalComponentArgsRest(__VLS_49));
__VLS_51.slots.default;
const __VLS_52 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_53 = __VLS_asFunctionalComponent(__VLS_52, new __VLS_52({
    modelValue: (__VLS_ctx.filterStatus),
    placeholder: "筛选状态",
    ...{ style: {} },
    disabled: (__VLS_ctx.isDetecting),
}));
const __VLS_54 = __VLS_53({
    modelValue: (__VLS_ctx.filterStatus),
    placeholder: "筛选状态",
    ...{ style: {} },
    disabled: (__VLS_ctx.isDetecting),
}, ...__VLS_functionalComponentArgsRest(__VLS_53));
__VLS_55.slots.default;
const __VLS_56 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_57 = __VLS_asFunctionalComponent(__VLS_56, new __VLS_56({
    label: "全部",
    value: "all",
}));
const __VLS_58 = __VLS_57({
    label: "全部",
    value: "all",
}, ...__VLS_functionalComponentArgsRest(__VLS_57));
const __VLS_60 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_61 = __VLS_asFunctionalComponent(__VLS_60, new __VLS_60({
    label: "一致",
    value: "consistent",
}));
const __VLS_62 = __VLS_61({
    label: "一致",
    value: "consistent",
}, ...__VLS_functionalComponentArgsRest(__VLS_61));
const __VLS_64 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_65 = __VLS_asFunctionalComponent(__VLS_64, new __VLS_64({
    label: "不一致",
    value: "mismatch",
}));
const __VLS_66 = __VLS_65({
    label: "不一致",
    value: "mismatch",
}, ...__VLS_functionalComponentArgsRest(__VLS_65));
const __VLS_68 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_69 = __VLS_asFunctionalComponent(__VLS_68, new __VLS_68({
    label: "需复审",
    value: "review",
}));
const __VLS_70 = __VLS_69({
    label: "需复审",
    value: "review",
}, ...__VLS_functionalComponentArgsRest(__VLS_69));
var __VLS_55;
const __VLS_72 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_73 = __VLS_asFunctionalComponent(__VLS_72, new __VLS_72({
    ...{ 'onClick': {} },
    disabled: (!__VLS_ctx.showResults),
}));
const __VLS_74 = __VLS_73({
    ...{ 'onClick': {} },
    disabled: (!__VLS_ctx.showResults),
}, ...__VLS_functionalComponentArgsRest(__VLS_73));
let __VLS_76;
let __VLS_77;
let __VLS_78;
const __VLS_79 = {
    onClick: (__VLS_ctx.exportReport)
};
__VLS_75.slots.default;
var __VLS_75;
var __VLS_51;
var __VLS_47;
var __VLS_3;
if (__VLS_ctx.isDetecting) {
    const __VLS_80 = {}.ElAlert;
    /** @type {[typeof __VLS_components.ElAlert, typeof __VLS_components.elAlert, typeof __VLS_components.ElAlert, typeof __VLS_components.elAlert, ]} */ ;
    // @ts-ignore
    const __VLS_81 = __VLS_asFunctionalComponent(__VLS_80, new __VLS_80({
        title: "正在进行一致性检测",
        type: "warning",
        closable: (false),
        showIcon: true,
        ...{ style: {} },
    }));
    const __VLS_82 = __VLS_81({
        title: "正在进行一致性检测",
        type: "warning",
        closable: (false),
        showIcon: true,
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_81));
    __VLS_83.slots.default;
    {
        const { default: __VLS_thisSlot } = __VLS_83.slots;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ style: {} },
        });
        const __VLS_84 = {}.ElIcon;
        /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
        // @ts-ignore
        const __VLS_85 = __VLS_asFunctionalComponent(__VLS_84, new __VLS_84({
            ...{ class: "is-loading" },
        }));
        const __VLS_86 = __VLS_85({
            ...{ class: "is-loading" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_85));
        __VLS_87.slots.default;
        const __VLS_88 = {}.Loading;
        /** @type {[typeof __VLS_components.Loading, ]} */ ;
        // @ts-ignore
        const __VLS_89 = __VLS_asFunctionalComponent(__VLS_88, new __VLS_88({}));
        const __VLS_90 = __VLS_89({}, ...__VLS_functionalComponentArgsRest(__VLS_89));
        var __VLS_87;
    }
    var __VLS_83;
}
if (!__VLS_ctx.isDataLoaded && !__VLS_ctx.isDetecting) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "empty-state" },
    });
    const __VLS_92 = {}.ElEmpty;
    /** @type {[typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ]} */ ;
    // @ts-ignore
    const __VLS_93 = __VLS_asFunctionalComponent(__VLS_92, new __VLS_92({
        description: "请先加载示例数据",
    }));
    const __VLS_94 = __VLS_93({
        description: "请先加载示例数据",
    }, ...__VLS_functionalComponentArgsRest(__VLS_93));
    __VLS_95.slots.default;
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
        onClick: (__VLS_ctx.loadSamplePrompts)
    };
    __VLS_99.slots.default;
    var __VLS_99;
    var __VLS_95;
}
if (__VLS_ctx.isDataLoaded) {
    const __VLS_104 = {}.ElRow;
    /** @type {[typeof __VLS_components.ElRow, typeof __VLS_components.elRow, typeof __VLS_components.ElRow, typeof __VLS_components.elRow, ]} */ ;
    // @ts-ignore
    const __VLS_105 = __VLS_asFunctionalComponent(__VLS_104, new __VLS_104({
        gutter: (20),
        ...{ class: "stats-overview" },
    }));
    const __VLS_106 = __VLS_105({
        gutter: (20),
        ...{ class: "stats-overview" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_105));
    __VLS_107.slots.default;
    const __VLS_108 = {}.ElCol;
    /** @type {[typeof __VLS_components.ElCol, typeof __VLS_components.elCol, typeof __VLS_components.ElCol, typeof __VLS_components.elCol, ]} */ ;
    // @ts-ignore
    const __VLS_109 = __VLS_asFunctionalComponent(__VLS_108, new __VLS_108({
        span: (6),
    }));
    const __VLS_110 = __VLS_109({
        span: (6),
    }, ...__VLS_functionalComponentArgsRest(__VLS_109));
    __VLS_111.slots.default;
    const __VLS_112 = {}.ElCard;
    /** @type {[typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ]} */ ;
    // @ts-ignore
    const __VLS_113 = __VLS_asFunctionalComponent(__VLS_112, new __VLS_112({
        ...{ class: "stat-card" },
    }));
    const __VLS_114 = __VLS_113({
        ...{ class: "stat-card" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_113));
    __VLS_115.slots.default;
    const __VLS_116 = {}.ElStatistic;
    /** @type {[typeof __VLS_components.ElStatistic, typeof __VLS_components.elStatistic, ]} */ ;
    // @ts-ignore
    const __VLS_117 = __VLS_asFunctionalComponent(__VLS_116, new __VLS_116({
        title: "总检测数",
        value: (__VLS_ctx.totalChecks),
    }));
    const __VLS_118 = __VLS_117({
        title: "总检测数",
        value: (__VLS_ctx.totalChecks),
    }, ...__VLS_functionalComponentArgsRest(__VLS_117));
    var __VLS_115;
    var __VLS_111;
    const __VLS_120 = {}.ElCol;
    /** @type {[typeof __VLS_components.ElCol, typeof __VLS_components.elCol, typeof __VLS_components.ElCol, typeof __VLS_components.elCol, ]} */ ;
    // @ts-ignore
    const __VLS_121 = __VLS_asFunctionalComponent(__VLS_120, new __VLS_120({
        span: (6),
    }));
    const __VLS_122 = __VLS_121({
        span: (6),
    }, ...__VLS_functionalComponentArgsRest(__VLS_121));
    __VLS_123.slots.default;
    const __VLS_124 = {}.ElCard;
    /** @type {[typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ]} */ ;
    // @ts-ignore
    const __VLS_125 = __VLS_asFunctionalComponent(__VLS_124, new __VLS_124({
        ...{ class: "stat-card" },
    }));
    const __VLS_126 = __VLS_125({
        ...{ class: "stat-card" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_125));
    __VLS_127.slots.default;
    const __VLS_128 = {}.ElStatistic;
    /** @type {[typeof __VLS_components.ElStatistic, typeof __VLS_components.elStatistic, typeof __VLS_components.ElStatistic, typeof __VLS_components.elStatistic, ]} */ ;
    // @ts-ignore
    const __VLS_129 = __VLS_asFunctionalComponent(__VLS_128, new __VLS_128({
        title: "一致性检测",
        value: (__VLS_ctx.consistentChecks),
    }));
    const __VLS_130 = __VLS_129({
        title: "一致性检测",
        value: (__VLS_ctx.consistentChecks),
    }, ...__VLS_functionalComponentArgsRest(__VLS_129));
    __VLS_131.slots.default;
    {
        const { suffix: __VLS_thisSlot } = __VLS_131.slots;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "stat-suffix" },
        });
        (__VLS_ctx.totalChecks > 0 ? ((__VLS_ctx.consistentChecks / __VLS_ctx.displayedResults.length) * 100).toFixed(1) : '0.0');
    }
    var __VLS_131;
    var __VLS_127;
    var __VLS_123;
    const __VLS_132 = {}.ElCol;
    /** @type {[typeof __VLS_components.ElCol, typeof __VLS_components.elCol, typeof __VLS_components.ElCol, typeof __VLS_components.elCol, ]} */ ;
    // @ts-ignore
    const __VLS_133 = __VLS_asFunctionalComponent(__VLS_132, new __VLS_132({
        span: (6),
    }));
    const __VLS_134 = __VLS_133({
        span: (6),
    }, ...__VLS_functionalComponentArgsRest(__VLS_133));
    __VLS_135.slots.default;
    const __VLS_136 = {}.ElCard;
    /** @type {[typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ]} */ ;
    // @ts-ignore
    const __VLS_137 = __VLS_asFunctionalComponent(__VLS_136, new __VLS_136({
        ...{ class: "stat-card mismatch-card" },
    }));
    const __VLS_138 = __VLS_137({
        ...{ class: "stat-card mismatch-card" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_137));
    __VLS_139.slots.default;
    const __VLS_140 = {}.ElStatistic;
    /** @type {[typeof __VLS_components.ElStatistic, typeof __VLS_components.elStatistic, typeof __VLS_components.ElStatistic, typeof __VLS_components.elStatistic, ]} */ ;
    // @ts-ignore
    const __VLS_141 = __VLS_asFunctionalComponent(__VLS_140, new __VLS_140({
        title: "不一致检测",
        value: (__VLS_ctx.mismatchChecks),
        valueStyle: "color: #f56c6c",
    }));
    const __VLS_142 = __VLS_141({
        title: "不一致检测",
        value: (__VLS_ctx.mismatchChecks),
        valueStyle: "color: #f56c6c",
    }, ...__VLS_functionalComponentArgsRest(__VLS_141));
    __VLS_143.slots.default;
    {
        const { suffix: __VLS_thisSlot } = __VLS_143.slots;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "stat-suffix danger" },
        });
        (__VLS_ctx.displayedResults.length > 0 ? ((__VLS_ctx.mismatchChecks / __VLS_ctx.displayedResults.length) * 100).toFixed(1) : '0.0');
    }
    var __VLS_143;
    var __VLS_139;
    var __VLS_135;
    const __VLS_144 = {}.ElCol;
    /** @type {[typeof __VLS_components.ElCol, typeof __VLS_components.elCol, typeof __VLS_components.ElCol, typeof __VLS_components.elCol, ]} */ ;
    // @ts-ignore
    const __VLS_145 = __VLS_asFunctionalComponent(__VLS_144, new __VLS_144({
        span: (6),
    }));
    const __VLS_146 = __VLS_145({
        span: (6),
    }, ...__VLS_functionalComponentArgsRest(__VLS_145));
    __VLS_147.slots.default;
    const __VLS_148 = {}.ElCard;
    /** @type {[typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ]} */ ;
    // @ts-ignore
    const __VLS_149 = __VLS_asFunctionalComponent(__VLS_148, new __VLS_148({
        ...{ class: "stat-card" },
    }));
    const __VLS_150 = __VLS_149({
        ...{ class: "stat-card" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_149));
    __VLS_151.slots.default;
    const __VLS_152 = {}.ElStatistic;
    /** @type {[typeof __VLS_components.ElStatistic, typeof __VLS_components.elStatistic, ]} */ ;
    // @ts-ignore
    const __VLS_153 = __VLS_asFunctionalComponent(__VLS_152, new __VLS_152({
        title: "风险评级",
        value: (__VLS_ctx.displayedResults.length === 0 ? '待检测' : (__VLS_ctx.mismatchChecks / __VLS_ctx.displayedResults.length) > 0.5 ? '高风险' : (__VLS_ctx.mismatchChecks / __VLS_ctx.displayedResults.length) > 0.2 ? '中等' : '低风险'),
        valueStyle: (__VLS_ctx.displayedResults.length === 0 ? 'color: #909399' : (__VLS_ctx.mismatchChecks / __VLS_ctx.displayedResults.length) > 0.5 ? 'color: #f56c6c' : (__VLS_ctx.mismatchChecks / __VLS_ctx.displayedResults.length) > 0.2 ? 'color: #e6a23c' : 'color: #67c23a'),
    }));
    const __VLS_154 = __VLS_153({
        title: "风险评级",
        value: (__VLS_ctx.displayedResults.length === 0 ? '待检测' : (__VLS_ctx.mismatchChecks / __VLS_ctx.displayedResults.length) > 0.5 ? '高风险' : (__VLS_ctx.mismatchChecks / __VLS_ctx.displayedResults.length) > 0.2 ? '中等' : '低风险'),
        valueStyle: (__VLS_ctx.displayedResults.length === 0 ? 'color: #909399' : (__VLS_ctx.mismatchChecks / __VLS_ctx.displayedResults.length) > 0.5 ? 'color: #f56c6c' : (__VLS_ctx.mismatchChecks / __VLS_ctx.displayedResults.length) > 0.2 ? 'color: #e6a23c' : 'color: #67c23a'),
    }, ...__VLS_functionalComponentArgsRest(__VLS_153));
    var __VLS_151;
    var __VLS_147;
    var __VLS_107;
}
if (__VLS_ctx.showResults) {
    const __VLS_156 = {}.ElCard;
    /** @type {[typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ]} */ ;
    // @ts-ignore
    const __VLS_157 = __VLS_asFunctionalComponent(__VLS_156, new __VLS_156({}));
    const __VLS_158 = __VLS_157({}, ...__VLS_functionalComponentArgsRest(__VLS_157));
    __VLS_159.slots.default;
    {
        const { header: __VLS_thisSlot } = __VLS_159.slots;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "card-header" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        const __VLS_160 = {}.ElInput;
        /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
        // @ts-ignore
        const __VLS_161 = __VLS_asFunctionalComponent(__VLS_160, new __VLS_160({
            modelValue: (__VLS_ctx.searchKeyword),
            placeholder: "搜索 Prompt 或响应内容...",
            ...{ style: {} },
            clearable: true,
            disabled: (__VLS_ctx.isDetecting),
        }));
        const __VLS_162 = __VLS_161({
            modelValue: (__VLS_ctx.searchKeyword),
            placeholder: "搜索 Prompt 或响应内容...",
            ...{ style: {} },
            clearable: true,
            disabled: (__VLS_ctx.isDetecting),
        }, ...__VLS_functionalComponentArgsRest(__VLS_161));
        __VLS_163.slots.default;
        {
            const { prefix: __VLS_thisSlot } = __VLS_163.slots;
            const __VLS_164 = {}.ElIcon;
            /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
            // @ts-ignore
            const __VLS_165 = __VLS_asFunctionalComponent(__VLS_164, new __VLS_164({}));
            const __VLS_166 = __VLS_165({}, ...__VLS_functionalComponentArgsRest(__VLS_165));
            __VLS_167.slots.default;
            const __VLS_168 = {}.Search;
            /** @type {[typeof __VLS_components.Search, ]} */ ;
            // @ts-ignore
            const __VLS_169 = __VLS_asFunctionalComponent(__VLS_168, new __VLS_168({}));
            const __VLS_170 = __VLS_169({}, ...__VLS_functionalComponentArgsRest(__VLS_169));
            var __VLS_167;
        }
        var __VLS_163;
    }
    const __VLS_172 = {}.ElTable;
    /** @type {[typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ]} */ ;
    // @ts-ignore
    const __VLS_173 = __VLS_asFunctionalComponent(__VLS_172, new __VLS_172({
        ...{ 'onRowClick': {} },
        data: (__VLS_ctx.paginatedResults),
        ...{ style: {} },
    }));
    const __VLS_174 = __VLS_173({
        ...{ 'onRowClick': {} },
        data: (__VLS_ctx.paginatedResults),
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_173));
    let __VLS_176;
    let __VLS_177;
    let __VLS_178;
    const __VLS_179 = {
        onRowClick: (__VLS_ctx.viewDetails)
    };
    __VLS_175.slots.default;
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
            ...{ class: "expand-content" },
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
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "reasoning-content" },
        });
        __VLS_asFunctionalDirective(__VLS_directives.vHtml)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.highlightAnomalousReasoning(row.reasoning)) }, null, null);
        var __VLS_191;
        var __VLS_187;
        const __VLS_192 = {}.ElDivider;
        /** @type {[typeof __VLS_components.ElDivider, typeof __VLS_components.elDivider, ]} */ ;
        // @ts-ignore
        const __VLS_193 = __VLS_asFunctionalComponent(__VLS_192, new __VLS_192({}));
        const __VLS_194 = __VLS_193({}, ...__VLS_functionalComponentArgsRest(__VLS_193));
        const __VLS_196 = {}.ElRow;
        /** @type {[typeof __VLS_components.ElRow, typeof __VLS_components.elRow, typeof __VLS_components.ElRow, typeof __VLS_components.elRow, ]} */ ;
        // @ts-ignore
        const __VLS_197 = __VLS_asFunctionalComponent(__VLS_196, new __VLS_196({
            gutter: (20),
        }));
        const __VLS_198 = __VLS_197({
            gutter: (20),
        }, ...__VLS_functionalComponentArgsRest(__VLS_197));
        __VLS_199.slots.default;
        const __VLS_200 = {}.ElCol;
        /** @type {[typeof __VLS_components.ElCol, typeof __VLS_components.elCol, typeof __VLS_components.ElCol, typeof __VLS_components.elCol, ]} */ ;
        // @ts-ignore
        const __VLS_201 = __VLS_asFunctionalComponent(__VLS_200, new __VLS_200({
            span: (12),
        }));
        const __VLS_202 = __VLS_201({
            span: (12),
        }, ...__VLS_functionalComponentArgsRest(__VLS_201));
        __VLS_203.slots.default;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({});
        for (const [flag] of __VLS_getVForSourceType((row.qualityFlags))) {
            const __VLS_204 = {}.ElTag;
            /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
            // @ts-ignore
            const __VLS_205 = __VLS_asFunctionalComponent(__VLS_204, new __VLS_204({
                key: (flag),
                type: (__VLS_ctx.getQualityFlagType(flag)),
                ...{ class: "quality-flag" },
            }));
            const __VLS_206 = __VLS_205({
                key: (flag),
                type: (__VLS_ctx.getQualityFlagType(flag)),
                ...{ class: "quality-flag" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_205));
            __VLS_207.slots.default;
            (__VLS_ctx.getQualityFlagText(flag));
            var __VLS_207;
        }
        var __VLS_203;
        const __VLS_208 = {}.ElCol;
        /** @type {[typeof __VLS_components.ElCol, typeof __VLS_components.elCol, typeof __VLS_components.ElCol, typeof __VLS_components.elCol, ]} */ ;
        // @ts-ignore
        const __VLS_209 = __VLS_asFunctionalComponent(__VLS_208, new __VLS_208({
            span: (12),
        }));
        const __VLS_210 = __VLS_209({
            span: (12),
        }, ...__VLS_functionalComponentArgsRest(__VLS_209));
        __VLS_211.slots.default;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({});
        const __VLS_212 = {}.ElSpace;
        /** @type {[typeof __VLS_components.ElSpace, typeof __VLS_components.elSpace, typeof __VLS_components.ElSpace, typeof __VLS_components.elSpace, ]} */ ;
        // @ts-ignore
        const __VLS_213 = __VLS_asFunctionalComponent(__VLS_212, new __VLS_212({}));
        const __VLS_214 = __VLS_213({}, ...__VLS_functionalComponentArgsRest(__VLS_213));
        __VLS_215.slots.default;
        const __VLS_216 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_217 = __VLS_asFunctionalComponent(__VLS_216, new __VLS_216({
            ...{ 'onClick': {} },
            type: "danger",
            size: "small",
        }));
        const __VLS_218 = __VLS_217({
            ...{ 'onClick': {} },
            type: "danger",
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_217));
        let __VLS_220;
        let __VLS_221;
        let __VLS_222;
        const __VLS_223 = {
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.showResults))
                    return;
                __VLS_ctx.markAsBackdoor(row);
            }
        };
        __VLS_219.slots.default;
        var __VLS_219;
        const __VLS_224 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_225 = __VLS_asFunctionalComponent(__VLS_224, new __VLS_224({
            ...{ 'onClick': {} },
            type: "warning",
            size: "small",
        }));
        const __VLS_226 = __VLS_225({
            ...{ 'onClick': {} },
            type: "warning",
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_225));
        let __VLS_228;
        let __VLS_229;
        let __VLS_230;
        const __VLS_231 = {
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.showResults))
                    return;
                __VLS_ctx.addToReview(row);
            }
        };
        __VLS_227.slots.default;
        var __VLS_227;
        var __VLS_215;
        var __VLS_211;
        var __VLS_199;
    }
    var __VLS_183;
    const __VLS_232 = {}.ElTableColumn;
    /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
    // @ts-ignore
    const __VLS_233 = __VLS_asFunctionalComponent(__VLS_232, new __VLS_232({
        prop: "id",
        label: "样本ID",
        width: "120",
    }));
    const __VLS_234 = __VLS_233({
        prop: "id",
        label: "样本ID",
        width: "120",
    }, ...__VLS_functionalComponentArgsRest(__VLS_233));
    __VLS_235.slots.default;
    {
        const { default: __VLS_thisSlot } = __VLS_235.slots;
        const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
        const __VLS_236 = {}.ElTag;
        /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
        // @ts-ignore
        const __VLS_237 = __VLS_asFunctionalComponent(__VLS_236, new __VLS_236({
            size: "small",
        }));
        const __VLS_238 = __VLS_237({
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_237));
        __VLS_239.slots.default;
        (row.id);
        var __VLS_239;
    }
    var __VLS_235;
    const __VLS_240 = {}.ElTableColumn;
    /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
    // @ts-ignore
    const __VLS_241 = __VLS_asFunctionalComponent(__VLS_240, new __VLS_240({
        prop: "prompt",
        label: "Prompt",
        minWidth: "300",
        showOverflowTooltip: true,
    }));
    const __VLS_242 = __VLS_241({
        prop: "prompt",
        label: "Prompt",
        minWidth: "300",
        showOverflowTooltip: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_241));
    const __VLS_244 = {}.ElTableColumn;
    /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
    // @ts-ignore
    const __VLS_245 = __VLS_asFunctionalComponent(__VLS_244, new __VLS_244({
        prop: "riskLevel",
        label: "风险等级",
        width: "120",
    }));
    const __VLS_246 = __VLS_245({
        prop: "riskLevel",
        label: "风险等级",
        width: "120",
    }, ...__VLS_functionalComponentArgsRest(__VLS_245));
    __VLS_247.slots.default;
    {
        const { default: __VLS_thisSlot } = __VLS_247.slots;
        const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
        const __VLS_248 = {}.ElTag;
        /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
        // @ts-ignore
        const __VLS_249 = __VLS_asFunctionalComponent(__VLS_248, new __VLS_248({
            type: (__VLS_ctx.getRiskLevelType(row.riskLevel)),
        }));
        const __VLS_250 = __VLS_249({
            type: (__VLS_ctx.getRiskLevelType(row.riskLevel)),
        }, ...__VLS_functionalComponentArgsRest(__VLS_249));
        __VLS_251.slots.default;
        (__VLS_ctx.getRiskLevelText(row.riskLevel));
        var __VLS_251;
    }
    var __VLS_247;
    const __VLS_252 = {}.ElTableColumn;
    /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
    // @ts-ignore
    const __VLS_253 = __VLS_asFunctionalComponent(__VLS_252, new __VLS_252({
        prop: "behaviorScore",
        label: "行为差异计分",
        width: "140",
    }));
    const __VLS_254 = __VLS_253({
        prop: "behaviorScore",
        label: "行为差异计分",
        width: "140",
    }, ...__VLS_functionalComponentArgsRest(__VLS_253));
    __VLS_255.slots.default;
    {
        const { default: __VLS_thisSlot } = __VLS_255.slots;
        const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: (__VLS_ctx.getBehaviorScoreClass(row.behaviorScore)) },
        });
        (row.behaviorScore);
    }
    var __VLS_255;
    const __VLS_256 = {}.ElTableColumn;
    /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
    // @ts-ignore
    const __VLS_257 = __VLS_asFunctionalComponent(__VLS_256, new __VLS_256({
        prop: "modelInfo",
        label: "模型信息",
        width: "150",
    }));
    const __VLS_258 = __VLS_257({
        prop: "modelInfo",
        label: "模型信息",
        width: "150",
    }, ...__VLS_functionalComponentArgsRest(__VLS_257));
    __VLS_259.slots.default;
    {
        const { default: __VLS_thisSlot } = __VLS_259.slots;
        const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
        const __VLS_260 = {}.ElTag;
        /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
        // @ts-ignore
        const __VLS_261 = __VLS_asFunctionalComponent(__VLS_260, new __VLS_260({
            size: "small",
            type: "info",
        }));
        const __VLS_262 = __VLS_261({
            size: "small",
            type: "info",
        }, ...__VLS_functionalComponentArgsRest(__VLS_261));
        __VLS_263.slots.default;
        (row.modelInfo);
        var __VLS_263;
    }
    var __VLS_259;
    const __VLS_264 = {}.ElTableColumn;
    /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
    // @ts-ignore
    const __VLS_265 = __VLS_asFunctionalComponent(__VLS_264, new __VLS_264({
        label: "操作",
        width: "120",
    }));
    const __VLS_266 = __VLS_265({
        label: "操作",
        width: "120",
    }, ...__VLS_functionalComponentArgsRest(__VLS_265));
    __VLS_267.slots.default;
    {
        const { default: __VLS_thisSlot } = __VLS_267.slots;
        const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
        const __VLS_268 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_269 = __VLS_asFunctionalComponent(__VLS_268, new __VLS_268({
            ...{ 'onClick': {} },
            type: "text",
            size: "small",
        }));
        const __VLS_270 = __VLS_269({
            ...{ 'onClick': {} },
            type: "text",
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_269));
        let __VLS_272;
        let __VLS_273;
        let __VLS_274;
        const __VLS_275 = {
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.showResults))
                    return;
                __VLS_ctx.viewDetails(row);
            }
        };
        __VLS_271.slots.default;
        var __VLS_271;
    }
    var __VLS_267;
    var __VLS_175;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "pagination-wrapper" },
    });
    const __VLS_276 = {}.ElPagination;
    /** @type {[typeof __VLS_components.ElPagination, typeof __VLS_components.elPagination, ]} */ ;
    // @ts-ignore
    const __VLS_277 = __VLS_asFunctionalComponent(__VLS_276, new __VLS_276({
        currentPage: (__VLS_ctx.currentPage),
        pageSize: (__VLS_ctx.pageSize),
        pageSizes: ([10, 20, 50, 100]),
        total: (__VLS_ctx.filteredResults.length),
        layout: "total, sizes, prev, pager, next, jumper",
    }));
    const __VLS_278 = __VLS_277({
        currentPage: (__VLS_ctx.currentPage),
        pageSize: (__VLS_ctx.pageSize),
        pageSizes: ([10, 20, 50, 100]),
        total: (__VLS_ctx.filteredResults.length),
        layout: "total, sizes, prev, pager, next, jumper",
    }, ...__VLS_functionalComponentArgsRest(__VLS_277));
    var __VLS_159;
}
const __VLS_280 = {}.ElDrawer;
/** @type {[typeof __VLS_components.ElDrawer, typeof __VLS_components.elDrawer, typeof __VLS_components.ElDrawer, typeof __VLS_components.elDrawer, ]} */ ;
// @ts-ignore
const __VLS_281 = __VLS_asFunctionalComponent(__VLS_280, new __VLS_280({
    modelValue: (__VLS_ctx.detailDrawerVisible),
    title: "一致性检测详情",
    size: "60%",
}));
const __VLS_282 = __VLS_281({
    modelValue: (__VLS_ctx.detailDrawerVisible),
    title: "一致性检测详情",
    size: "60%",
}, ...__VLS_functionalComponentArgsRest(__VLS_281));
__VLS_283.slots.default;
if (__VLS_ctx.selectedResult) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "detail-content" },
    });
    const __VLS_284 = {}.ElCard;
    /** @type {[typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ]} */ ;
    // @ts-ignore
    const __VLS_285 = __VLS_asFunctionalComponent(__VLS_284, new __VLS_284({
        ...{ class: "detail-card" },
    }));
    const __VLS_286 = __VLS_285({
        ...{ class: "detail-card" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_285));
    __VLS_287.slots.default;
    {
        const { header: __VLS_thisSlot } = __VLS_287.slots;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "detail-header" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (__VLS_ctx.selectedResult.id);
        const __VLS_288 = {}.ElTag;
        /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
        // @ts-ignore
        const __VLS_289 = __VLS_asFunctionalComponent(__VLS_288, new __VLS_288({
            type: (__VLS_ctx.getVerdictType(__VLS_ctx.selectedResult.verdict)),
            size: "large",
        }));
        const __VLS_290 = __VLS_289({
            type: (__VLS_ctx.getVerdictType(__VLS_ctx.selectedResult.verdict)),
            size: "large",
        }, ...__VLS_functionalComponentArgsRest(__VLS_289));
        __VLS_291.slots.default;
        (__VLS_ctx.getVerdictText(__VLS_ctx.selectedResult.verdict));
        var __VLS_291;
    }
    const __VLS_292 = {}.ElDescriptions;
    /** @type {[typeof __VLS_components.ElDescriptions, typeof __VLS_components.elDescriptions, typeof __VLS_components.ElDescriptions, typeof __VLS_components.elDescriptions, ]} */ ;
    // @ts-ignore
    const __VLS_293 = __VLS_asFunctionalComponent(__VLS_292, new __VLS_292({
        column: (2),
        border: true,
    }));
    const __VLS_294 = __VLS_293({
        column: (2),
        border: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_293));
    __VLS_295.slots.default;
    const __VLS_296 = {}.ElDescriptionsItem;
    /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
    // @ts-ignore
    const __VLS_297 = __VLS_asFunctionalComponent(__VLS_296, new __VLS_296({
        label: "判决",
    }));
    const __VLS_298 = __VLS_297({
        label: "判决",
    }, ...__VLS_functionalComponentArgsRest(__VLS_297));
    __VLS_299.slots.default;
    const __VLS_300 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_301 = __VLS_asFunctionalComponent(__VLS_300, new __VLS_300({
        type: (__VLS_ctx.getVerdictType(__VLS_ctx.selectedResult.verdict)),
    }));
    const __VLS_302 = __VLS_301({
        type: (__VLS_ctx.getVerdictType(__VLS_ctx.selectedResult.verdict)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_301));
    __VLS_303.slots.default;
    (__VLS_ctx.getVerdictText(__VLS_ctx.selectedResult.verdict));
    var __VLS_303;
    var __VLS_299;
    const __VLS_304 = {}.ElDescriptionsItem;
    /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
    // @ts-ignore
    const __VLS_305 = __VLS_asFunctionalComponent(__VLS_304, new __VLS_304({
        label: "相似度",
    }));
    const __VLS_306 = __VLS_305({
        label: "相似度",
    }, ...__VLS_functionalComponentArgsRest(__VLS_305));
    __VLS_307.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: (__VLS_ctx.getSimilarityClass(__VLS_ctx.selectedResult.similarity)) },
        ...{ style: {} },
    });
    (__VLS_ctx.selectedResult.similarity.toFixed(3));
    var __VLS_307;
    const __VLS_308 = {}.ElDescriptionsItem;
    /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
    // @ts-ignore
    const __VLS_309 = __VLS_asFunctionalComponent(__VLS_308, new __VLS_308({
        label: "推理长度",
    }));
    const __VLS_310 = __VLS_309({
        label: "推理长度",
    }, ...__VLS_functionalComponentArgsRest(__VLS_309));
    __VLS_311.slots.default;
    (__VLS_ctx.getReasoningLength(__VLS_ctx.selectedResult.reasoning));
    var __VLS_311;
    const __VLS_312 = {}.ElDescriptionsItem;
    /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
    // @ts-ignore
    const __VLS_313 = __VLS_asFunctionalComponent(__VLS_312, new __VLS_312({
        label: "重复率",
    }));
    const __VLS_314 = __VLS_313({
        label: "重复率",
    }, ...__VLS_functionalComponentArgsRest(__VLS_313));
    __VLS_315.slots.default;
    ((__VLS_ctx.selectedResult.repetitionRate * 100).toFixed(1));
    var __VLS_315;
    var __VLS_295;
    var __VLS_287;
    const __VLS_316 = {}.ElCard;
    /** @type {[typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ]} */ ;
    // @ts-ignore
    const __VLS_317 = __VLS_asFunctionalComponent(__VLS_316, new __VLS_316({
        ...{ class: "detail-card" },
    }));
    const __VLS_318 = __VLS_317({
        ...{ class: "detail-card" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_317));
    __VLS_319.slots.default;
    {
        const { header: __VLS_thisSlot } = __VLS_319.slots;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    }
    const __VLS_320 = {}.ElAlert;
    /** @type {[typeof __VLS_components.ElAlert, typeof __VLS_components.elAlert, ]} */ ;
    // @ts-ignore
    const __VLS_321 = __VLS_asFunctionalComponent(__VLS_320, new __VLS_320({
        title: (__VLS_ctx.selectedResult.prompt),
        type: "info",
        closable: (false),
        showIcon: true,
    }));
    const __VLS_322 = __VLS_321({
        title: (__VLS_ctx.selectedResult.prompt),
        type: "info",
        closable: (false),
        showIcon: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_321));
    var __VLS_319;
    const __VLS_324 = {}.ElCard;
    /** @type {[typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ]} */ ;
    // @ts-ignore
    const __VLS_325 = __VLS_asFunctionalComponent(__VLS_324, new __VLS_324({
        ...{ class: "detail-card" },
    }));
    const __VLS_326 = __VLS_325({
        ...{ class: "detail-card" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_325));
    __VLS_327.slots.default;
    {
        const { header: __VLS_thisSlot } = __VLS_327.slots;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "reasoning-process" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "reasoning-content" },
    });
    __VLS_asFunctionalDirective(__VLS_directives.vHtml)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.highlightAnomalousReasoning(__VLS_ctx.selectedResult.reasoning)) }, null, null);
    const __VLS_328 = {}.ElDivider;
    /** @type {[typeof __VLS_components.ElDivider, typeof __VLS_components.elDivider, ]} */ ;
    // @ts-ignore
    const __VLS_329 = __VLS_asFunctionalComponent(__VLS_328, new __VLS_328({}));
    const __VLS_330 = __VLS_329({}, ...__VLS_functionalComponentArgsRest(__VLS_329));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "anomaly-summary" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({});
    for (const [anomaly] of __VLS_getVForSourceType((__VLS_ctx.getReasoningAnomalies(__VLS_ctx.selectedResult)))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: (anomaly.step),
            ...{ class: "anomaly-item" },
        });
        const __VLS_332 = {}.ElTag;
        /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
        // @ts-ignore
        const __VLS_333 = __VLS_asFunctionalComponent(__VLS_332, new __VLS_332({
            type: "danger",
            ...{ class: "anomaly-tag" },
        }));
        const __VLS_334 = __VLS_333({
            type: "danger",
            ...{ class: "anomaly-tag" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_333));
        __VLS_335.slots.default;
        (anomaly.step);
        (anomaly.description);
        (anomaly.type);
        var __VLS_335;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "anomaly-explanation" },
        });
        (anomaly.explanation);
    }
    if (__VLS_ctx.getReasoningAnomalies(__VLS_ctx.selectedResult).length === 0) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        const __VLS_336 = {}.ElTag;
        /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
        // @ts-ignore
        const __VLS_337 = __VLS_asFunctionalComponent(__VLS_336, new __VLS_336({
            type: "success",
        }));
        const __VLS_338 = __VLS_337({
            type: "success",
        }, ...__VLS_functionalComponentArgsRest(__VLS_337));
        __VLS_339.slots.default;
        var __VLS_339;
    }
    var __VLS_327;
    const __VLS_340 = {}.ElCard;
    /** @type {[typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ]} */ ;
    // @ts-ignore
    const __VLS_341 = __VLS_asFunctionalComponent(__VLS_340, new __VLS_340({
        ...{ class: "detail-card" },
    }));
    const __VLS_342 = __VLS_341({
        ...{ class: "detail-card" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_341));
    __VLS_343.slots.default;
    {
        const { header: __VLS_thisSlot } = __VLS_343.slots;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "operation-sequence" },
    });
    const __VLS_344 = {}.ElRow;
    /** @type {[typeof __VLS_components.ElRow, typeof __VLS_components.elRow, typeof __VLS_components.ElRow, typeof __VLS_components.elRow, ]} */ ;
    // @ts-ignore
    const __VLS_345 = __VLS_asFunctionalComponent(__VLS_344, new __VLS_344({
        gutter: (20),
    }));
    const __VLS_346 = __VLS_345({
        gutter: (20),
    }, ...__VLS_functionalComponentArgsRest(__VLS_345));
    __VLS_347.slots.default;
    const __VLS_348 = {}.ElCol;
    /** @type {[typeof __VLS_components.ElCol, typeof __VLS_components.elCol, typeof __VLS_components.ElCol, typeof __VLS_components.elCol, ]} */ ;
    // @ts-ignore
    const __VLS_349 = __VLS_asFunctionalComponent(__VLS_348, new __VLS_348({
        span: (12),
    }));
    const __VLS_350 = __VLS_349({
        span: (12),
    }, ...__VLS_functionalComponentArgsRest(__VLS_349));
    __VLS_351.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "normal-steps" },
    });
    for (const [step] of __VLS_getVForSourceType((__VLS_ctx.getNormalSteps(__VLS_ctx.selectedResult)))) {
        const __VLS_352 = {}.ElTag;
        /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
        // @ts-ignore
        const __VLS_353 = __VLS_asFunctionalComponent(__VLS_352, new __VLS_352({
            key: (step),
            type: "success",
            ...{ class: "step-tag" },
        }));
        const __VLS_354 = __VLS_353({
            key: (step),
            type: "success",
            ...{ class: "step-tag" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_353));
        __VLS_355.slots.default;
        (step);
        var __VLS_355;
    }
    var __VLS_351;
    const __VLS_356 = {}.ElCol;
    /** @type {[typeof __VLS_components.ElCol, typeof __VLS_components.elCol, typeof __VLS_components.ElCol, typeof __VLS_components.elCol, ]} */ ;
    // @ts-ignore
    const __VLS_357 = __VLS_asFunctionalComponent(__VLS_356, new __VLS_356({
        span: (12),
    }));
    const __VLS_358 = __VLS_357({
        span: (12),
    }, ...__VLS_functionalComponentArgsRest(__VLS_357));
    __VLS_359.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "triggered-steps" },
    });
    for (const [step] of __VLS_getVForSourceType((__VLS_ctx.getTriggeredSteps(__VLS_ctx.selectedResult)))) {
        const __VLS_360 = {}.ElTag;
        /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
        // @ts-ignore
        const __VLS_361 = __VLS_asFunctionalComponent(__VLS_360, new __VLS_360({
            key: (step.name),
            type: (step.type),
            ...{ class: "step-tag" },
        }));
        const __VLS_362 = __VLS_361({
            key: (step.name),
            type: (step.type),
            ...{ class: "step-tag" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_361));
        __VLS_363.slots.default;
        (step.name);
        var __VLS_363;
    }
    var __VLS_359;
    var __VLS_347;
    const __VLS_364 = {}.ElDivider;
    /** @type {[typeof __VLS_components.ElDivider, typeof __VLS_components.elDivider, ]} */ ;
    // @ts-ignore
    const __VLS_365 = __VLS_asFunctionalComponent(__VLS_364, new __VLS_364({}));
    const __VLS_366 = __VLS_365({}, ...__VLS_functionalComponentArgsRest(__VLS_365));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "anomaly-indicator" },
    });
    const __VLS_368 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_369 = __VLS_asFunctionalComponent(__VLS_368, new __VLS_368({
        type: (__VLS_ctx.hasOperationAnomaly(__VLS_ctx.selectedResult) ? 'danger' : 'success'),
    }));
    const __VLS_370 = __VLS_369({
        type: (__VLS_ctx.hasOperationAnomaly(__VLS_ctx.selectedResult) ? 'danger' : 'success'),
    }, ...__VLS_functionalComponentArgsRest(__VLS_369));
    __VLS_371.slots.default;
    (__VLS_ctx.hasOperationAnomaly(__VLS_ctx.selectedResult) ? '1' : '0');
    (__VLS_ctx.hasOperationAnomaly(__VLS_ctx.selectedResult) ? '异常：检测到额外操作步骤' : '正常：操作序列无异常');
    var __VLS_371;
    var __VLS_343;
    const __VLS_372 = {}.ElCard;
    /** @type {[typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ]} */ ;
    // @ts-ignore
    const __VLS_373 = __VLS_asFunctionalComponent(__VLS_372, new __VLS_372({
        ...{ class: "detail-card" },
    }));
    const __VLS_374 = __VLS_373({
        ...{ class: "detail-card" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_373));
    __VLS_375.slots.default;
    {
        const { header: __VLS_thisSlot } = __VLS_375.slots;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "result-difference" },
    });
    const __VLS_376 = {}.ElRow;
    /** @type {[typeof __VLS_components.ElRow, typeof __VLS_components.elRow, typeof __VLS_components.ElRow, typeof __VLS_components.elRow, ]} */ ;
    // @ts-ignore
    const __VLS_377 = __VLS_asFunctionalComponent(__VLS_376, new __VLS_376({
        gutter: (20),
    }));
    const __VLS_378 = __VLS_377({
        gutter: (20),
    }, ...__VLS_functionalComponentArgsRest(__VLS_377));
    __VLS_379.slots.default;
    const __VLS_380 = {}.ElCol;
    /** @type {[typeof __VLS_components.ElCol, typeof __VLS_components.elCol, typeof __VLS_components.ElCol, typeof __VLS_components.elCol, ]} */ ;
    // @ts-ignore
    const __VLS_381 = __VLS_asFunctionalComponent(__VLS_380, new __VLS_380({
        span: (12),
    }));
    const __VLS_382 = __VLS_381({
        span: (12),
    }, ...__VLS_functionalComponentArgsRest(__VLS_381));
    __VLS_383.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "normal-answer" },
    });
    (__VLS_ctx.getNormalAnswer(__VLS_ctx.selectedResult));
    var __VLS_383;
    const __VLS_384 = {}.ElCol;
    /** @type {[typeof __VLS_components.ElCol, typeof __VLS_components.elCol, typeof __VLS_components.ElCol, typeof __VLS_components.elCol, ]} */ ;
    // @ts-ignore
    const __VLS_385 = __VLS_asFunctionalComponent(__VLS_384, new __VLS_384({
        span: (12),
    }));
    const __VLS_386 = __VLS_385({
        span: (12),
    }, ...__VLS_functionalComponentArgsRest(__VLS_385));
    __VLS_387.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "triggered-answer" },
        ...{ class: ({ 'anomaly-result': __VLS_ctx.selectedResult.verdict === 'mismatch' }) },
    });
    (__VLS_ctx.selectedResult.final);
    var __VLS_387;
    var __VLS_379;
    const __VLS_388 = {}.ElDivider;
    /** @type {[typeof __VLS_components.ElDivider, typeof __VLS_components.elDivider, ]} */ ;
    // @ts-ignore
    const __VLS_389 = __VLS_asFunctionalComponent(__VLS_388, new __VLS_388({}));
    const __VLS_390 = __VLS_389({}, ...__VLS_functionalComponentArgsRest(__VLS_389));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "anomaly-indicator" },
    });
    const __VLS_392 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_393 = __VLS_asFunctionalComponent(__VLS_392, new __VLS_392({
        type: (__VLS_ctx.selectedResult.verdict === 'mismatch' ? 'danger' : 'success'),
    }));
    const __VLS_394 = __VLS_393({
        type: (__VLS_ctx.selectedResult.verdict === 'mismatch' ? 'danger' : 'success'),
    }, ...__VLS_functionalComponentArgsRest(__VLS_393));
    __VLS_395.slots.default;
    (__VLS_ctx.selectedResult.verdict === 'mismatch' ? '1' : '0');
    (__VLS_ctx.selectedResult.verdict === 'mismatch' ? '异常：结果显著偏离预期' : '正常：结果符合预期');
    var __VLS_395;
    var __VLS_375;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "detail-actions" },
    });
    const __VLS_396 = {}.ElSpace;
    /** @type {[typeof __VLS_components.ElSpace, typeof __VLS_components.elSpace, typeof __VLS_components.ElSpace, typeof __VLS_components.elSpace, ]} */ ;
    // @ts-ignore
    const __VLS_397 = __VLS_asFunctionalComponent(__VLS_396, new __VLS_396({
        direction: "vertical",
        ...{ style: {} },
    }));
    const __VLS_398 = __VLS_397({
        direction: "vertical",
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_397));
    __VLS_399.slots.default;
    const __VLS_400 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_401 = __VLS_asFunctionalComponent(__VLS_400, new __VLS_400({
        ...{ 'onClick': {} },
        type: "danger",
        block: true,
    }));
    const __VLS_402 = __VLS_401({
        ...{ 'onClick': {} },
        type: "danger",
        block: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_401));
    let __VLS_404;
    let __VLS_405;
    let __VLS_406;
    const __VLS_407 = {
        onClick: (...[$event]) => {
            if (!(__VLS_ctx.selectedResult))
                return;
            __VLS_ctx.markAsBackdoor(__VLS_ctx.selectedResult);
        }
    };
    __VLS_403.slots.default;
    const __VLS_408 = {}.ElIcon;
    /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
    // @ts-ignore
    const __VLS_409 = __VLS_asFunctionalComponent(__VLS_408, new __VLS_408({}));
    const __VLS_410 = __VLS_409({}, ...__VLS_functionalComponentArgsRest(__VLS_409));
    __VLS_411.slots.default;
    const __VLS_412 = {}.Flag;
    /** @type {[typeof __VLS_components.Flag, ]} */ ;
    // @ts-ignore
    const __VLS_413 = __VLS_asFunctionalComponent(__VLS_412, new __VLS_412({}));
    const __VLS_414 = __VLS_413({}, ...__VLS_functionalComponentArgsRest(__VLS_413));
    var __VLS_411;
    var __VLS_403;
    const __VLS_416 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_417 = __VLS_asFunctionalComponent(__VLS_416, new __VLS_416({
        ...{ 'onClick': {} },
        type: "warning",
        block: true,
    }));
    const __VLS_418 = __VLS_417({
        ...{ 'onClick': {} },
        type: "warning",
        block: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_417));
    let __VLS_420;
    let __VLS_421;
    let __VLS_422;
    const __VLS_423 = {
        onClick: (...[$event]) => {
            if (!(__VLS_ctx.selectedResult))
                return;
            __VLS_ctx.addToReview(__VLS_ctx.selectedResult);
        }
    };
    __VLS_419.slots.default;
    const __VLS_424 = {}.ElIcon;
    /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
    // @ts-ignore
    const __VLS_425 = __VLS_asFunctionalComponent(__VLS_424, new __VLS_424({}));
    const __VLS_426 = __VLS_425({}, ...__VLS_functionalComponentArgsRest(__VLS_425));
    __VLS_427.slots.default;
    const __VLS_428 = {}.View;
    /** @type {[typeof __VLS_components.View, ]} */ ;
    // @ts-ignore
    const __VLS_429 = __VLS_asFunctionalComponent(__VLS_428, new __VLS_428({}));
    const __VLS_430 = __VLS_429({}, ...__VLS_functionalComponentArgsRest(__VLS_429));
    var __VLS_427;
    var __VLS_419;
    const __VLS_432 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_433 = __VLS_asFunctionalComponent(__VLS_432, new __VLS_432({
        ...{ 'onClick': {} },
        type: "primary",
        block: true,
    }));
    const __VLS_434 = __VLS_433({
        ...{ 'onClick': {} },
        type: "primary",
        block: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_433));
    let __VLS_436;
    let __VLS_437;
    let __VLS_438;
    const __VLS_439 = {
        onClick: (...[$event]) => {
            if (!(__VLS_ctx.selectedResult))
                return;
            __VLS_ctx.exportSingleReport(__VLS_ctx.selectedResult);
        }
    };
    __VLS_435.slots.default;
    const __VLS_440 = {}.ElIcon;
    /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
    // @ts-ignore
    const __VLS_441 = __VLS_asFunctionalComponent(__VLS_440, new __VLS_440({}));
    const __VLS_442 = __VLS_441({}, ...__VLS_functionalComponentArgsRest(__VLS_441));
    __VLS_443.slots.default;
    const __VLS_444 = {}.Download;
    /** @type {[typeof __VLS_components.Download, ]} */ ;
    // @ts-ignore
    const __VLS_445 = __VLS_asFunctionalComponent(__VLS_444, new __VLS_444({}));
    const __VLS_446 = __VLS_445({}, ...__VLS_functionalComponentArgsRest(__VLS_445));
    var __VLS_443;
    var __VLS_435;
    var __VLS_399;
}
var __VLS_283;
/** @type {__VLS_StyleScopedClasses['l3-detection']} */ ;
/** @type {__VLS_StyleScopedClasses['toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['toolbar-right']} */ ;
/** @type {__VLS_StyleScopedClasses['is-loading']} */ ;
/** @type {__VLS_StyleScopedClasses['empty-state']} */ ;
/** @type {__VLS_StyleScopedClasses['stats-overview']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-card']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-card']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-suffix']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-card']} */ ;
/** @type {__VLS_StyleScopedClasses['mismatch-card']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-suffix']} */ ;
/** @type {__VLS_StyleScopedClasses['danger']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-card']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header']} */ ;
/** @type {__VLS_StyleScopedClasses['expand-content']} */ ;
/** @type {__VLS_StyleScopedClasses['reasoning-content']} */ ;
/** @type {__VLS_StyleScopedClasses['quality-flag']} */ ;
/** @type {__VLS_StyleScopedClasses['pagination-wrapper']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-content']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-card']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-header']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-card']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-card']} */ ;
/** @type {__VLS_StyleScopedClasses['reasoning-process']} */ ;
/** @type {__VLS_StyleScopedClasses['reasoning-content']} */ ;
/** @type {__VLS_StyleScopedClasses['anomaly-summary']} */ ;
/** @type {__VLS_StyleScopedClasses['anomaly-item']} */ ;
/** @type {__VLS_StyleScopedClasses['anomaly-tag']} */ ;
/** @type {__VLS_StyleScopedClasses['anomaly-explanation']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-card']} */ ;
/** @type {__VLS_StyleScopedClasses['operation-sequence']} */ ;
/** @type {__VLS_StyleScopedClasses['normal-steps']} */ ;
/** @type {__VLS_StyleScopedClasses['step-tag']} */ ;
/** @type {__VLS_StyleScopedClasses['triggered-steps']} */ ;
/** @type {__VLS_StyleScopedClasses['step-tag']} */ ;
/** @type {__VLS_StyleScopedClasses['anomaly-indicator']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-card']} */ ;
/** @type {__VLS_StyleScopedClasses['result-difference']} */ ;
/** @type {__VLS_StyleScopedClasses['normal-answer']} */ ;
/** @type {__VLS_StyleScopedClasses['triggered-answer']} */ ;
/** @type {__VLS_StyleScopedClasses['anomaly-result']} */ ;
/** @type {__VLS_StyleScopedClasses['anomaly-indicator']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-actions']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            Search: Search,
            Document: Document,
            Flag: Flag,
            View: View,
            Download: Download,
            Loading: Loading,
            filterStatus: filterStatus,
            searchKeyword: searchKeyword,
            currentPage: currentPage,
            pageSize: pageSize,
            detailDrawerVisible: detailDrawerVisible,
            selectedResult: selectedResult,
            isDataLoaded: isDataLoaded,
            isDetecting: isDetecting,
            showResults: showResults,
            displayedResults: displayedResults,
            totalChecks: totalChecks,
            consistentChecks: consistentChecks,
            mismatchChecks: mismatchChecks,
            filteredResults: filteredResults,
            paginatedResults: paginatedResults,
            getVerdictType: getVerdictType,
            getVerdictText: getVerdictText,
            getRiskLevelType: getRiskLevelType,
            getRiskLevelText: getRiskLevelText,
            getBehaviorScoreClass: getBehaviorScoreClass,
            getSimilarityClass: getSimilarityClass,
            getQualityFlagType: getQualityFlagType,
            getQualityFlagText: getQualityFlagText,
            getReasoningLength: getReasoningLength,
            highlightAnomalousReasoning: highlightAnomalousReasoning,
            getReasoningAnomalies: getReasoningAnomalies,
            getNormalSteps: getNormalSteps,
            getTriggeredSteps: getTriggeredSteps,
            hasOperationAnomaly: hasOperationAnomaly,
            getNormalAnswer: getNormalAnswer,
            runConsistencyCheck: runConsistencyCheck,
            loadSamplePrompts: loadSamplePrompts,
            exportReport: exportReport,
            viewDetails: viewDetails,
            markAsBackdoor: markAsBackdoor,
            addToReview: addToReview,
            exportSingleReport: exportSingleReport,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
//# sourceMappingURL=L3Detection.vue.js.map