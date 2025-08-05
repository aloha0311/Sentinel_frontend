import { ref, computed, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { QuestionFilled, Loading, Download } from '@element-plus/icons-vue';
import { useDataStore } from '../stores/dataStore';
import VChart from 'vue-echarts';
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { BarChart } from 'echarts/charts';
import { TitleComponent, TooltipComponent, GridComponent, LegendComponent, DataZoomComponent } from 'echarts/components';
// 2. 注册ECharts组件
use([
    CanvasRenderer,
    BarChart,
    TitleComponent,
    TooltipComponent,
    GridComponent,
    LegendComponent,
    DataZoomComponent
]);
// 4. API基础配置
const API_BASE_URL = 'http://localhost:3001';
// 5. 初始化Store
const dataStore = useDataStore();
// 6. 响应式数据定义
const topN = ref(15);
const viewMode = ref('split');
const drawerVisible = ref(false);
const selectedToken = ref(null);
const loading = ref(false);
// 7. 检测相关状态
const isDetecting = ref(false);
const showResults = ref(false);
const totalTokens = ref(0);
const anomalousTokens = ref([]);
// 8. API调用函数 - 加载L1数据
const loadL1Data = async () => {
    try {
        loading.value = true;
        // 调用后端API获取L1检测数据
        const response = await fetch(`${API_BASE_URL}/api/l1/data`);
        const data = await response.json();
        anomalousTokens.value = data.anomalousTokens;
        totalTokens.value = data.totalTokens;
    }
    catch (error) {
        console.error('加载L1数据失败:', error);
        ElMessage.error('加载数据失败，请重试');
    }
    finally {
        loading.value = false;
    }
};
// 9. 计算属性 - 左侧表格显示的Top-N异常token（只显示高风险和中风险的）
const topAnomalousTokens = computed(() => {
    return anomalousTokens.value
        .filter(token => token.risk === 'high' || token.risk === 'medium')
        .sort((a, b) => b.deltaPPL - a.deltaPPL)
        .slice(0, topN.value);
});
// 10. 计算属性 - 分布图数据：将ΔPPL值分组统计，生成频率分布
const chartDistribution = computed(() => {
    const data = anomalousTokens.value;
    if (data.length === 0)
        return { bins: [], counts: [] };
    // 找到ΔPPL的最小值和最大值
    const values = data.map(item => item.deltaPPL);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    // 创建30个区间来显示分布
    const binCount = 30;
    const binWidth = (maxVal - minVal) / binCount;
    const bins = [];
    const counts = [];
    // 生成区间和统计每个区间的token数量
    for (let i = 0; i < binCount; i++) {
        const binStart = minVal + i * binWidth;
        const binEnd = binStart + binWidth;
        const binCenter = binStart + binWidth / 2;
        const count = data.filter(item => item.deltaPPL >= binStart &&
            (i === binCount - 1 ? item.deltaPPL <= binEnd : item.deltaPPL < binEnd)).length;
        bins.push(Number(binCenter.toFixed(2)));
        counts.push(count);
    }
    return { bins, counts };
});
// 11. 计算属性 - 柱状图配置
const barChartOption = computed(() => {
    const { bins, counts } = chartDistribution.value;
    if (bins.length === 0)
        return {};
    return {
        title: {
            text: 'Token 置信度差异分布',
            left: 'center',
            textStyle: {
                fontSize: 16,
                fontWeight: 'bold',
                color: '#333'
            }
        },
        tooltip: {
            trigger: 'axis',
            axisPointer: {
                type: 'shadow'
            },
            backgroundColor: 'rgba(50, 50, 50, 0.9)',
            textStyle: {
                color: '#fff'
            },
            formatter: function (params) {
                const item = params[0];
                const deltaValue = bins[item.dataIndex];
                const tokenCount = counts[item.dataIndex];
                return `<div style="padding: 8px;">
                  <div style="font-size: 14px; font-weight: bold; margin-bottom: 4px;">ΔPPL 区间: ${deltaValue.toFixed(2)}</div>
                  <div>Token 数量: <span style="color: #00ff88;">${tokenCount}</span></div>
                </div>`;
            }
        },
        grid: {
            left: '8%',
            right: '5%',
            bottom: '15%',
            top: '15%',
            containLabel: true
        },
        xAxis: {
            type: 'value',
            name: 'ΔPPL 值',
            nameLocation: 'middle',
            nameGap: 30,
            nameTextStyle: {
                fontSize: 12,
                color: '#333',
                fontWeight: 'bold'
            },
            axisLabel: {
                fontSize: 11,
                color: '#666',
                formatter: '{value}'
            },
            axisLine: {
                lineStyle: {
                    color: '#e0e0e0',
                    width: 1
                }
            },
            axisTick: {
                show: false
            },
            splitLine: {
                lineStyle: {
                    color: '#f0f0f0',
                    type: 'dashed'
                }
            }
        },
        yAxis: {
            type: 'value',
            name: 'Token 数量',
            nameLocation: 'middle',
            nameGap: 45,
            nameTextStyle: {
                fontSize: 12,
                color: '#333',
                fontWeight: 'bold'
            },
            axisLabel: {
                fontSize: 11,
                color: '#666',
                formatter: '{value}'
            },
            axisLine: {
                show: false
            },
            axisTick: {
                show: false
            },
            splitLine: {
                lineStyle: {
                    color: '#f0f0f0',
                    type: 'dashed'
                }
            }
        },
        series: [
            {
                name: 'Token数量',
                type: 'bar',
                data: bins.map((binValue, index) => ({
                    name: binValue,
                    value: [binValue, counts[index]],
                    itemStyle: {
                        color: '#5470c6',
                        borderRadius: [2, 2, 0, 0],
                        shadowBlur: 2,
                        shadowColor: 'rgba(0, 0, 0, 0.1)',
                        shadowOffsetY: 1
                    }
                })),
                emphasis: {
                    itemStyle: {
                        color: '#3b82f6',
                        shadowBlur: 8,
                        shadowColor: 'rgba(59, 130, 246, 0.4)'
                    }
                },
                animationDuration: 1000,
                animationEasing: 'cubicOut'
            }
        ],
        animation: true,
        animationDuration: 1000
    };
});
// 12. 统计函数 - 获取高风险数量
const getHighRiskCount = () => {
    return anomalousTokens.value.filter(t => t.risk === 'high').length;
};
// 13. 统计函数 - 获取中风险数量
const getMediumRiskCount = () => {
    return anomalousTokens.value.filter(t => t.risk === 'medium').length;
};
// 14. 统计函数 - 获取异常数量
const getAnomalousCount = () => {
    return anomalousTokens.value.filter(t => t.risk === 'high' || t.risk === 'medium').length;
};
// 15. 工具函数 - 获取摘要风险类型
const getSummaryRiskType = () => {
    const highRiskCount = getHighRiskCount();
    if (highRiskCount > 5)
        return 'danger';
    if (highRiskCount > 2)
        return 'warning';
    return 'success';
};
// 16. 工具函数 - 获取Token风险类型
const getTokenRiskType = (risk) => {
    switch (risk) {
        case 'high': return 'danger';
        case 'medium': return 'warning';
        case 'low': return 'success';
        default: return 'info';
    }
};
// 17. 工具函数 - 获取ΔPPL样式类
const getDeltaPPLClass = (deltaPPL) => {
    if (deltaPPL > 17)
        return 'high-delta';
    if (deltaPPL > 16)
        return 'medium-delta';
    return 'low-delta';
};
// 18. 事件处理函数 - 开始检测
const startDetection = async () => {
    if (isDetecting.value)
        return;
    // 重置状态
    isDetecting.value = true;
    showResults.value = false;
    anomalousTokens.value = [];
    try {
        // 调用后端API开始L1检测
        const response = await fetch(`${API_BASE_URL}/api/l1/detect`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                topN: topN.value
            })
        });
        // 检测完成后获取结果
        const result = await response.json();
        anomalousTokens.value = result.anomalousTokens;
        totalTokens.value = result.totalTokens;
        // 检测完成，显示结果
        isDetecting.value = false;
        showResults.value = true;
        // 记录到数据存储
        dataStore.recordL1Detection({
            totalTokens: result.totalTokens,
            anomalousTokens: result.anomalousTokens,
            topN: topN.value
        });
        ElMessage.success('L1检测完成');
    }
    catch (error) {
        console.error('L1检测失败:', error);
        ElMessage.error('检测失败，请重试');
        isDetecting.value = false;
    }
};
// 19. 事件处理函数 - Token选择
const handleTokenSelect = (currentRow) => {
    selectedToken.value = currentRow;
};
// 20. 事件处理函数 - 检查Token
const inspectToken = (token) => {
    selectedToken.value = token;
    drawerVisible.value = true;
};
// 21. 事件处理函数 - 导出结果
const exportResults = () => {
    try {
        // 创建导出数据
        const data = {
            timestamp: new Date().toISOString(),
            totalTokens: totalTokens.value,
            anomalousTokensCount: anomalousTokens.value.length,
            highRiskCount: getHighRiskCount(),
            mediumRiskCount: anomalousTokens.value.filter(t => t.risk === 'medium').length,
            lowRiskCount: anomalousTokens.value.filter(t => t.risk === 'low').length,
            topN: topN.value,
            anomalousTokens: anomalousTokens.value.map(token => ({
                token: token.token,
                tokenId: token.tokenId,
                deltaPPL: token.deltaPPL,
                risk: token.risk
            }))
        };
        // 创建并下载文件
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `l1_detection_results_${new Date().toISOString().slice(0, 10)}.json`;
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
// 22. 事件处理函数 - 标记Token
const markToken = async (token, mark) => {
    try {
        // 调用后端API标记Token
        const response = await fetch(`${API_BASE_URL}/api/l1/token/mark`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                tokenId: token.tokenId,
                token: token.token,
                mark: mark
            })
        });
        if (response.ok) {
            const result = await response.json();
            ElMessage.success(result.message);
            // 重新加载数据
            await loadL1Data();
        }
        else {
            ElMessage.error('标记失败，请重试');
        }
    }
    catch (error) {
        console.error('标记Token失败:', error);
        ElMessage.error('标记失败，请重试');
    }
};
// 23. 事件处理函数 - 全屏图表
const fullscreenChart = () => {
    viewMode.value = 'fullscreen';
};
// 24. 事件处理函数 - 图表点击
const onChartClick = (params) => {
    // 分布图点击事件：显示该区间内的所有token
    const binIndex = params.dataIndex;
    const { bins } = chartDistribution.value;
    const binValue = bins[binIndex];
    // TODO: 可以扩展为显示该区间内token的详细信息
    console.log(`点击了ΔPPL区间: ${binValue}, 包含 ${params.value[1]} 个token`);
};
// 25. 生命周期钩子 - 组件挂载
onMounted(() => {
    // 页面加载时不自动加载数据，等待用户点击开始检测
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['token-tag']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "l1-detection" },
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
const __VLS_12 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
    modelValue: (__VLS_ctx.topN),
    placeholder: "Top-N",
    ...{ style: {} },
}));
const __VLS_14 = __VLS_13({
    modelValue: (__VLS_ctx.topN),
    placeholder: "Top-N",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_13));
__VLS_15.slots.default;
const __VLS_16 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
    label: "Top 10",
    value: (10),
}));
const __VLS_18 = __VLS_17({
    label: "Top 10",
    value: (10),
}, ...__VLS_functionalComponentArgsRest(__VLS_17));
const __VLS_20 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({
    label: "Top 15",
    value: (15),
}));
const __VLS_22 = __VLS_21({
    label: "Top 15",
    value: (15),
}, ...__VLS_functionalComponentArgsRest(__VLS_21));
const __VLS_24 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
    label: "Top 20",
    value: (20),
}));
const __VLS_26 = __VLS_25({
    label: "Top 20",
    value: (20),
}, ...__VLS_functionalComponentArgsRest(__VLS_25));
const __VLS_28 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_29 = __VLS_asFunctionalComponent(__VLS_28, new __VLS_28({
    label: "Top 50",
    value: (50),
}));
const __VLS_30 = __VLS_29({
    label: "Top 50",
    value: (50),
}, ...__VLS_functionalComponentArgsRest(__VLS_29));
var __VLS_15;
var __VLS_11;
var __VLS_7;
const __VLS_32 = {}.ElCol;
/** @type {[typeof __VLS_components.ElCol, typeof __VLS_components.elCol, typeof __VLS_components.ElCol, typeof __VLS_components.elCol, ]} */ ;
// @ts-ignore
const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({
    span: (12),
    ...{ class: "toolbar-right" },
}));
const __VLS_34 = __VLS_33({
    span: (12),
    ...{ class: "toolbar-right" },
}, ...__VLS_functionalComponentArgsRest(__VLS_33));
__VLS_35.slots.default;
const __VLS_36 = {}.ElSpace;
/** @type {[typeof __VLS_components.ElSpace, typeof __VLS_components.elSpace, typeof __VLS_components.ElSpace, typeof __VLS_components.elSpace, ]} */ ;
// @ts-ignore
const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({}));
const __VLS_38 = __VLS_37({}, ...__VLS_functionalComponentArgsRest(__VLS_37));
__VLS_39.slots.default;
const __VLS_40 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_41 = __VLS_asFunctionalComponent(__VLS_40, new __VLS_40({
    ...{ 'onClick': {} },
    loading: (__VLS_ctx.loading),
    disabled: (__VLS_ctx.isDetecting),
}));
const __VLS_42 = __VLS_41({
    ...{ 'onClick': {} },
    loading: (__VLS_ctx.loading),
    disabled: (__VLS_ctx.isDetecting),
}, ...__VLS_functionalComponentArgsRest(__VLS_41));
let __VLS_44;
let __VLS_45;
let __VLS_46;
const __VLS_47 = {
    onClick: (__VLS_ctx.loadL1Data)
};
__VLS_43.slots.default;
var __VLS_43;
const __VLS_48 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({
    ...{ 'onClick': {} },
    type: "success",
    loading: (__VLS_ctx.isDetecting),
    disabled: (__VLS_ctx.isDetecting),
}));
const __VLS_50 = __VLS_49({
    ...{ 'onClick': {} },
    type: "success",
    loading: (__VLS_ctx.isDetecting),
    disabled: (__VLS_ctx.isDetecting),
}, ...__VLS_functionalComponentArgsRest(__VLS_49));
let __VLS_52;
let __VLS_53;
let __VLS_54;
const __VLS_55 = {
    onClick: (__VLS_ctx.startDetection)
};
__VLS_51.slots.default;
(__VLS_ctx.isDetecting ? '检测中...' : '开始检测');
var __VLS_51;
const __VLS_56 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_57 = __VLS_asFunctionalComponent(__VLS_56, new __VLS_56({
    ...{ 'onClick': {} },
    type: "primary",
    disabled: (!__VLS_ctx.showResults || __VLS_ctx.anomalousTokens.length === 0),
}));
const __VLS_58 = __VLS_57({
    ...{ 'onClick': {} },
    type: "primary",
    disabled: (!__VLS_ctx.showResults || __VLS_ctx.anomalousTokens.length === 0),
}, ...__VLS_functionalComponentArgsRest(__VLS_57));
let __VLS_60;
let __VLS_61;
let __VLS_62;
const __VLS_63 = {
    onClick: (__VLS_ctx.exportResults)
};
__VLS_59.slots.default;
const __VLS_64 = {}.ElIcon;
/** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
// @ts-ignore
const __VLS_65 = __VLS_asFunctionalComponent(__VLS_64, new __VLS_64({}));
const __VLS_66 = __VLS_65({}, ...__VLS_functionalComponentArgsRest(__VLS_65));
__VLS_67.slots.default;
const __VLS_68 = {}.Download;
/** @type {[typeof __VLS_components.Download, ]} */ ;
// @ts-ignore
const __VLS_69 = __VLS_asFunctionalComponent(__VLS_68, new __VLS_68({}));
const __VLS_70 = __VLS_69({}, ...__VLS_functionalComponentArgsRest(__VLS_69));
var __VLS_67;
var __VLS_59;
var __VLS_39;
var __VLS_35;
var __VLS_3;
if (__VLS_ctx.isDetecting) {
    const __VLS_72 = {}.ElAlert;
    /** @type {[typeof __VLS_components.ElAlert, typeof __VLS_components.elAlert, typeof __VLS_components.ElAlert, typeof __VLS_components.elAlert, ]} */ ;
    // @ts-ignore
    const __VLS_73 = __VLS_asFunctionalComponent(__VLS_72, new __VLS_72({
        title: "正在进行置信度差分检测",
        type: "warning",
        closable: (false),
        showIcon: true,
        ...{ style: {} },
    }));
    const __VLS_74 = __VLS_73({
        title: "正在进行置信度差分检测",
        type: "warning",
        closable: (false),
        showIcon: true,
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_73));
    __VLS_75.slots.default;
    {
        const { default: __VLS_thisSlot } = __VLS_75.slots;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ style: {} },
        });
        const __VLS_76 = {}.ElIcon;
        /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
        // @ts-ignore
        const __VLS_77 = __VLS_asFunctionalComponent(__VLS_76, new __VLS_76({
            ...{ class: "is-loading" },
        }));
        const __VLS_78 = __VLS_77({
            ...{ class: "is-loading" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_77));
        __VLS_79.slots.default;
        const __VLS_80 = {}.Loading;
        /** @type {[typeof __VLS_components.Loading, ]} */ ;
        // @ts-ignore
        const __VLS_81 = __VLS_asFunctionalComponent(__VLS_80, new __VLS_80({}));
        const __VLS_82 = __VLS_81({}, ...__VLS_functionalComponentArgsRest(__VLS_81));
        var __VLS_79;
    }
    var __VLS_75;
}
if (__VLS_ctx.showResults) {
    const __VLS_84 = {}.ElAlert;
    /** @type {[typeof __VLS_components.ElAlert, typeof __VLS_components.elAlert, typeof __VLS_components.ElAlert, typeof __VLS_components.elAlert, ]} */ ;
    // @ts-ignore
    const __VLS_85 = __VLS_asFunctionalComponent(__VLS_84, new __VLS_84({
        title: "数据显示说明",
        type: "info",
        closable: (false),
        showIcon: true,
        ...{ style: {} },
    }));
    const __VLS_86 = __VLS_85({
        title: "数据显示说明",
        type: "info",
        closable: (false),
        showIcon: true,
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_85));
    __VLS_87.slots.default;
    {
        const { default: __VLS_thisSlot } = __VLS_87.slots;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ style: {} },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.br)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.br)({});
        const __VLS_88 = {}.ElTag;
        /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
        // @ts-ignore
        const __VLS_89 = __VLS_asFunctionalComponent(__VLS_88, new __VLS_88({
            type: "danger",
            size: "small",
        }));
        const __VLS_90 = __VLS_89({
            type: "danger",
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_89));
        __VLS_91.slots.default;
        var __VLS_91;
        const __VLS_92 = {}.ElTag;
        /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
        // @ts-ignore
        const __VLS_93 = __VLS_asFunctionalComponent(__VLS_92, new __VLS_92({
            type: "warning",
            size: "small",
        }));
        const __VLS_94 = __VLS_93({
            type: "warning",
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_93));
        __VLS_95.slots.default;
        var __VLS_95;
        const __VLS_96 = {}.ElTag;
        /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
        // @ts-ignore
        const __VLS_97 = __VLS_asFunctionalComponent(__VLS_96, new __VLS_96({
            type: "success",
            size: "small",
        }));
        const __VLS_98 = __VLS_97({
            type: "success",
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_97));
        __VLS_99.slots.default;
        var __VLS_99;
    }
    var __VLS_87;
}
if (__VLS_ctx.viewMode === 'split' && __VLS_ctx.showResults) {
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
        span: (10),
    }));
    const __VLS_106 = __VLS_105({
        span: (10),
    }, ...__VLS_functionalComponentArgsRest(__VLS_105));
    __VLS_107.slots.default;
    const __VLS_108 = {}.ElCard;
    /** @type {[typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ]} */ ;
    // @ts-ignore
    const __VLS_109 = __VLS_asFunctionalComponent(__VLS_108, new __VLS_108({}));
    const __VLS_110 = __VLS_109({}, ...__VLS_functionalComponentArgsRest(__VLS_109));
    __VLS_111.slots.default;
    {
        const { header: __VLS_thisSlot } = __VLS_111.slots;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "card-header" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (__VLS_ctx.topN);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "header-tags" },
        });
        const __VLS_112 = {}.ElTag;
        /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
        // @ts-ignore
        const __VLS_113 = __VLS_asFunctionalComponent(__VLS_112, new __VLS_112({
            type: (__VLS_ctx.getSummaryRiskType()),
            size: "small",
        }));
        const __VLS_114 = __VLS_113({
            type: (__VLS_ctx.getSummaryRiskType()),
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_113));
        __VLS_115.slots.default;
        (`${__VLS_ctx.getAnomalousCount()} / ${__VLS_ctx.totalTokens} 异常`);
        var __VLS_115;
        if (!__VLS_ctx.loading) {
            const __VLS_116 = {}.ElTag;
            /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
            // @ts-ignore
            const __VLS_117 = __VLS_asFunctionalComponent(__VLS_116, new __VLS_116({
                type: "danger",
                size: "small",
            }));
            const __VLS_118 = __VLS_117({
                type: "danger",
                size: "small",
            }, ...__VLS_functionalComponentArgsRest(__VLS_117));
            __VLS_119.slots.default;
            (__VLS_ctx.getHighRiskCount());
            var __VLS_119;
        }
    }
    const __VLS_120 = {}.ElTable;
    /** @type {[typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ]} */ ;
    // @ts-ignore
    const __VLS_121 = __VLS_asFunctionalComponent(__VLS_120, new __VLS_120({
        ...{ 'onCurrentChange': {} },
        data: (__VLS_ctx.topAnomalousTokens),
        height: "500",
        highlightCurrentRow: true,
        elementLoadingText: "正在加载异常Token数据...",
    }));
    const __VLS_122 = __VLS_121({
        ...{ 'onCurrentChange': {} },
        data: (__VLS_ctx.topAnomalousTokens),
        height: "500",
        highlightCurrentRow: true,
        elementLoadingText: "正在加载异常Token数据...",
    }, ...__VLS_functionalComponentArgsRest(__VLS_121));
    let __VLS_124;
    let __VLS_125;
    let __VLS_126;
    const __VLS_127 = {
        onCurrentChange: (__VLS_ctx.handleTokenSelect)
    };
    __VLS_asFunctionalDirective(__VLS_directives.vLoading)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.loading) }, null, null);
    __VLS_123.slots.default;
    const __VLS_128 = {}.ElTableColumn;
    /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
    // @ts-ignore
    const __VLS_129 = __VLS_asFunctionalComponent(__VLS_128, new __VLS_128({
        type: "index",
        label: "排名",
        width: "60",
    }));
    const __VLS_130 = __VLS_129({
        type: "index",
        label: "排名",
        width: "60",
    }, ...__VLS_functionalComponentArgsRest(__VLS_129));
    const __VLS_132 = {}.ElTableColumn;
    /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
    // @ts-ignore
    const __VLS_133 = __VLS_asFunctionalComponent(__VLS_132, new __VLS_132({
        prop: "token",
        label: "Token",
        width: "120",
    }));
    const __VLS_134 = __VLS_133({
        prop: "token",
        label: "Token",
        width: "120",
    }, ...__VLS_functionalComponentArgsRest(__VLS_133));
    __VLS_135.slots.default;
    {
        const { default: __VLS_thisSlot } = __VLS_135.slots;
        const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
        const __VLS_136 = {}.ElTag;
        /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
        // @ts-ignore
        const __VLS_137 = __VLS_asFunctionalComponent(__VLS_136, new __VLS_136({
            ...{ 'onClick': {} },
            type: (__VLS_ctx.getTokenRiskType(row.risk)),
            ...{ class: "token-tag" },
        }));
        const __VLS_138 = __VLS_137({
            ...{ 'onClick': {} },
            type: (__VLS_ctx.getTokenRiskType(row.risk)),
            ...{ class: "token-tag" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_137));
        let __VLS_140;
        let __VLS_141;
        let __VLS_142;
        const __VLS_143 = {
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.viewMode === 'split' && __VLS_ctx.showResults))
                    return;
                __VLS_ctx.inspectToken(row);
            }
        };
        __VLS_139.slots.default;
        (row.token);
        var __VLS_139;
    }
    var __VLS_135;
    const __VLS_144 = {}.ElTableColumn;
    /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
    // @ts-ignore
    const __VLS_145 = __VLS_asFunctionalComponent(__VLS_144, new __VLS_144({
        prop: "tokenId",
        label: "Token ID",
        width: "90",
    }));
    const __VLS_146 = __VLS_145({
        prop: "tokenId",
        label: "Token ID",
        width: "90",
    }, ...__VLS_functionalComponentArgsRest(__VLS_145));
    __VLS_147.slots.default;
    {
        const { default: __VLS_thisSlot } = __VLS_147.slots;
        const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
        (row.tokenId);
    }
    var __VLS_147;
    const __VLS_148 = {}.ElTableColumn;
    /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
    // @ts-ignore
    const __VLS_149 = __VLS_asFunctionalComponent(__VLS_148, new __VLS_148({
        prop: "deltaPPL",
        label: "ΔPPL",
        width: "80",
    }));
    const __VLS_150 = __VLS_149({
        prop: "deltaPPL",
        label: "ΔPPL",
        width: "80",
    }, ...__VLS_functionalComponentArgsRest(__VLS_149));
    __VLS_151.slots.default;
    {
        const { default: __VLS_thisSlot } = __VLS_151.slots;
        const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: (__VLS_ctx.getDeltaPPLClass(row.deltaPPL)) },
        });
        (row.deltaPPL.toFixed(2));
    }
    var __VLS_151;
    const __VLS_152 = {}.ElTableColumn;
    /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
    // @ts-ignore
    const __VLS_153 = __VLS_asFunctionalComponent(__VLS_152, new __VLS_152({
        label: "操作",
        width: "100",
    }));
    const __VLS_154 = __VLS_153({
        label: "操作",
        width: "100",
    }, ...__VLS_functionalComponentArgsRest(__VLS_153));
    __VLS_155.slots.default;
    {
        const { default: __VLS_thisSlot } = __VLS_155.slots;
        const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
        const __VLS_156 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_157 = __VLS_asFunctionalComponent(__VLS_156, new __VLS_156({
            ...{ 'onClick': {} },
            type: "text",
            size: "small",
        }));
        const __VLS_158 = __VLS_157({
            ...{ 'onClick': {} },
            type: "text",
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_157));
        let __VLS_160;
        let __VLS_161;
        let __VLS_162;
        const __VLS_163 = {
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.viewMode === 'split' && __VLS_ctx.showResults))
                    return;
                __VLS_ctx.markToken(row, 'trusted');
            }
        };
        __VLS_159.slots.default;
        var __VLS_159;
        const __VLS_164 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_165 = __VLS_asFunctionalComponent(__VLS_164, new __VLS_164({
            ...{ 'onClick': {} },
            type: "text",
            size: "small",
        }));
        const __VLS_166 = __VLS_165({
            ...{ 'onClick': {} },
            type: "text",
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_165));
        let __VLS_168;
        let __VLS_169;
        let __VLS_170;
        const __VLS_171 = {
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.viewMode === 'split' && __VLS_ctx.showResults))
                    return;
                __VLS_ctx.markToken(row, 'review');
            }
        };
        __VLS_167.slots.default;
        var __VLS_167;
    }
    var __VLS_155;
    var __VLS_123;
    var __VLS_111;
    var __VLS_107;
    const __VLS_172 = {}.ElCol;
    /** @type {[typeof __VLS_components.ElCol, typeof __VLS_components.elCol, typeof __VLS_components.ElCol, typeof __VLS_components.elCol, ]} */ ;
    // @ts-ignore
    const __VLS_173 = __VLS_asFunctionalComponent(__VLS_172, new __VLS_172({
        span: (14),
    }));
    const __VLS_174 = __VLS_173({
        span: (14),
    }, ...__VLS_functionalComponentArgsRest(__VLS_173));
    __VLS_175.slots.default;
    const __VLS_176 = {}.ElCard;
    /** @type {[typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ]} */ ;
    // @ts-ignore
    const __VLS_177 = __VLS_asFunctionalComponent(__VLS_176, new __VLS_176({}));
    const __VLS_178 = __VLS_177({}, ...__VLS_functionalComponentArgsRest(__VLS_177));
    __VLS_179.slots.default;
    {
        const { header: __VLS_thisSlot } = __VLS_179.slots;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "card-header" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        const __VLS_180 = {}.ElTooltip;
        /** @type {[typeof __VLS_components.ElTooltip, typeof __VLS_components.elTooltip, typeof __VLS_components.ElTooltip, typeof __VLS_components.elTooltip, ]} */ ;
        // @ts-ignore
        const __VLS_181 = __VLS_asFunctionalComponent(__VLS_180, new __VLS_180({
            content: "显示ΔPPL值的频率分布，横轴为ΔPPL值，纵轴为对应区间内的Token数量",
        }));
        const __VLS_182 = __VLS_181({
            content: "显示ΔPPL值的频率分布，横轴为ΔPPL值，纵轴为对应区间内的Token数量",
        }, ...__VLS_functionalComponentArgsRest(__VLS_181));
        __VLS_183.slots.default;
        const __VLS_184 = {}.ElIcon;
        /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
        // @ts-ignore
        const __VLS_185 = __VLS_asFunctionalComponent(__VLS_184, new __VLS_184({}));
        const __VLS_186 = __VLS_185({}, ...__VLS_functionalComponentArgsRest(__VLS_185));
        __VLS_187.slots.default;
        const __VLS_188 = {}.QuestionFilled;
        /** @type {[typeof __VLS_components.QuestionFilled, ]} */ ;
        // @ts-ignore
        const __VLS_189 = __VLS_asFunctionalComponent(__VLS_188, new __VLS_188({}));
        const __VLS_190 = __VLS_189({}, ...__VLS_functionalComponentArgsRest(__VLS_189));
        var __VLS_187;
        var __VLS_183;
        const __VLS_192 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_193 = __VLS_asFunctionalComponent(__VLS_192, new __VLS_192({
            ...{ 'onClick': {} },
            type: "text",
        }));
        const __VLS_194 = __VLS_193({
            ...{ 'onClick': {} },
            type: "text",
        }, ...__VLS_functionalComponentArgsRest(__VLS_193));
        let __VLS_196;
        let __VLS_197;
        let __VLS_198;
        const __VLS_199 = {
            onClick: (__VLS_ctx.fullscreenChart)
        };
        __VLS_195.slots.default;
        var __VLS_195;
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "chart-container" },
        'element-loading-text': "正在生成图表...",
    });
    __VLS_asFunctionalDirective(__VLS_directives.vLoading)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.loading) }, null, null);
    const __VLS_200 = {}.VChart;
    /** @type {[typeof __VLS_components.VChart, typeof __VLS_components.vChart, ]} */ ;
    // @ts-ignore
    const __VLS_201 = __VLS_asFunctionalComponent(__VLS_200, new __VLS_200({
        ...{ 'onClick': {} },
        ...{ class: "bar-chart" },
        option: (__VLS_ctx.barChartOption),
    }));
    const __VLS_202 = __VLS_201({
        ...{ 'onClick': {} },
        ...{ class: "bar-chart" },
        option: (__VLS_ctx.barChartOption),
    }, ...__VLS_functionalComponentArgsRest(__VLS_201));
    let __VLS_204;
    let __VLS_205;
    let __VLS_206;
    const __VLS_207 = {
        onClick: (__VLS_ctx.onChartClick)
    };
    var __VLS_203;
    var __VLS_179;
    var __VLS_175;
    var __VLS_103;
}
if (__VLS_ctx.viewMode === 'fullscreen' && __VLS_ctx.showResults) {
    const __VLS_208 = {}.ElCard;
    /** @type {[typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ]} */ ;
    // @ts-ignore
    const __VLS_209 = __VLS_asFunctionalComponent(__VLS_208, new __VLS_208({}));
    const __VLS_210 = __VLS_209({}, ...__VLS_functionalComponentArgsRest(__VLS_209));
    __VLS_211.slots.default;
    {
        const { header: __VLS_thisSlot } = __VLS_211.slots;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "card-header" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        const __VLS_212 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_213 = __VLS_asFunctionalComponent(__VLS_212, new __VLS_212({
            ...{ 'onClick': {} },
        }));
        const __VLS_214 = __VLS_213({
            ...{ 'onClick': {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_213));
        let __VLS_216;
        let __VLS_217;
        let __VLS_218;
        const __VLS_219 = {
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.viewMode === 'fullscreen' && __VLS_ctx.showResults))
                    return;
                __VLS_ctx.viewMode = 'split';
            }
        };
        __VLS_215.slots.default;
        var __VLS_215;
    }
    const __VLS_220 = {}.VChart;
    /** @type {[typeof __VLS_components.VChart, typeof __VLS_components.vChart, ]} */ ;
    // @ts-ignore
    const __VLS_221 = __VLS_asFunctionalComponent(__VLS_220, new __VLS_220({
        ...{ 'onClick': {} },
        ...{ class: "fullscreen-chart" },
        option: (__VLS_ctx.barChartOption),
    }));
    const __VLS_222 = __VLS_221({
        ...{ 'onClick': {} },
        ...{ class: "fullscreen-chart" },
        option: (__VLS_ctx.barChartOption),
    }, ...__VLS_functionalComponentArgsRest(__VLS_221));
    let __VLS_224;
    let __VLS_225;
    let __VLS_226;
    const __VLS_227 = {
        onClick: (__VLS_ctx.onChartClick)
    };
    var __VLS_223;
    var __VLS_211;
}
if (!__VLS_ctx.isDetecting && !__VLS_ctx.showResults) {
    const __VLS_228 = {}.ElEmpty;
    /** @type {[typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ]} */ ;
    // @ts-ignore
    const __VLS_229 = __VLS_asFunctionalComponent(__VLS_228, new __VLS_228({
        description: "点击 '开始检测' 按钮开始L1层异常Token检测",
        ...{ style: {} },
    }));
    const __VLS_230 = __VLS_229({
        description: "点击 '开始检测' 按钮开始L1层异常Token检测",
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_229));
    __VLS_231.slots.default;
    const __VLS_232 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_233 = __VLS_asFunctionalComponent(__VLS_232, new __VLS_232({
        ...{ 'onClick': {} },
        type: "primary",
    }));
    const __VLS_234 = __VLS_233({
        ...{ 'onClick': {} },
        type: "primary",
    }, ...__VLS_functionalComponentArgsRest(__VLS_233));
    let __VLS_236;
    let __VLS_237;
    let __VLS_238;
    const __VLS_239 = {
        onClick: (__VLS_ctx.startDetection)
    };
    __VLS_235.slots.default;
    var __VLS_235;
    var __VLS_231;
}
const __VLS_240 = {}.ElDrawer;
/** @type {[typeof __VLS_components.ElDrawer, typeof __VLS_components.elDrawer, typeof __VLS_components.ElDrawer, typeof __VLS_components.elDrawer, ]} */ ;
// @ts-ignore
const __VLS_241 = __VLS_asFunctionalComponent(__VLS_240, new __VLS_240({
    modelValue: (__VLS_ctx.drawerVisible),
    title: "Token 详细信息",
    size: "500px",
}));
const __VLS_242 = __VLS_241({
    modelValue: (__VLS_ctx.drawerVisible),
    title: "Token 详细信息",
    size: "500px",
}, ...__VLS_functionalComponentArgsRest(__VLS_241));
__VLS_243.slots.default;
if (__VLS_ctx.selectedToken) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "token-details" },
    });
    const __VLS_244 = {}.ElDescriptions;
    /** @type {[typeof __VLS_components.ElDescriptions, typeof __VLS_components.elDescriptions, typeof __VLS_components.ElDescriptions, typeof __VLS_components.elDescriptions, ]} */ ;
    // @ts-ignore
    const __VLS_245 = __VLS_asFunctionalComponent(__VLS_244, new __VLS_244({
        column: (1),
        border: true,
    }));
    const __VLS_246 = __VLS_245({
        column: (1),
        border: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_245));
    __VLS_247.slots.default;
    const __VLS_248 = {}.ElDescriptionsItem;
    /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
    // @ts-ignore
    const __VLS_249 = __VLS_asFunctionalComponent(__VLS_248, new __VLS_248({
        label: "Token",
    }));
    const __VLS_250 = __VLS_249({
        label: "Token",
    }, ...__VLS_functionalComponentArgsRest(__VLS_249));
    __VLS_251.slots.default;
    const __VLS_252 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_253 = __VLS_asFunctionalComponent(__VLS_252, new __VLS_252({
        type: (__VLS_ctx.getTokenRiskType(__VLS_ctx.selectedToken.risk)),
        size: "large",
    }));
    const __VLS_254 = __VLS_253({
        type: (__VLS_ctx.getTokenRiskType(__VLS_ctx.selectedToken.risk)),
        size: "large",
    }, ...__VLS_functionalComponentArgsRest(__VLS_253));
    __VLS_255.slots.default;
    (__VLS_ctx.selectedToken.token);
    var __VLS_255;
    var __VLS_251;
    const __VLS_256 = {}.ElDescriptionsItem;
    /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
    // @ts-ignore
    const __VLS_257 = __VLS_asFunctionalComponent(__VLS_256, new __VLS_256({
        label: "Token ID",
    }));
    const __VLS_258 = __VLS_257({
        label: "Token ID",
    }, ...__VLS_functionalComponentArgsRest(__VLS_257));
    __VLS_259.slots.default;
    (__VLS_ctx.selectedToken.tokenId);
    var __VLS_259;
    const __VLS_260 = {}.ElDescriptionsItem;
    /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
    // @ts-ignore
    const __VLS_261 = __VLS_asFunctionalComponent(__VLS_260, new __VLS_260({
        label: "ΔPPL",
    }));
    const __VLS_262 = __VLS_261({
        label: "ΔPPL",
    }, ...__VLS_functionalComponentArgsRest(__VLS_261));
    __VLS_263.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: (__VLS_ctx.getDeltaPPLClass(__VLS_ctx.selectedToken.deltaPPL)) },
        ...{ style: {} },
    });
    (__VLS_ctx.selectedToken.deltaPPL.toFixed(4));
    var __VLS_263;
    const __VLS_264 = {}.ElDescriptionsItem;
    /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
    // @ts-ignore
    const __VLS_265 = __VLS_asFunctionalComponent(__VLS_264, new __VLS_264({
        label: "风险等级",
    }));
    const __VLS_266 = __VLS_265({
        label: "风险等级",
    }, ...__VLS_functionalComponentArgsRest(__VLS_265));
    __VLS_267.slots.default;
    const __VLS_268 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_269 = __VLS_asFunctionalComponent(__VLS_268, new __VLS_268({
        type: (__VLS_ctx.getTokenRiskType(__VLS_ctx.selectedToken.risk)),
    }));
    const __VLS_270 = __VLS_269({
        type: (__VLS_ctx.getTokenRiskType(__VLS_ctx.selectedToken.risk)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_269));
    __VLS_271.slots.default;
    (__VLS_ctx.selectedToken.risk);
    var __VLS_271;
    var __VLS_267;
    var __VLS_247;
    const __VLS_272 = {}.ElDivider;
    /** @type {[typeof __VLS_components.ElDivider, typeof __VLS_components.elDivider, typeof __VLS_components.ElDivider, typeof __VLS_components.elDivider, ]} */ ;
    // @ts-ignore
    const __VLS_273 = __VLS_asFunctionalComponent(__VLS_272, new __VLS_272({}));
    const __VLS_274 = __VLS_273({}, ...__VLS_functionalComponentArgsRest(__VLS_273));
    __VLS_275.slots.default;
    var __VLS_275;
    const __VLS_276 = {}.ElSpace;
    /** @type {[typeof __VLS_components.ElSpace, typeof __VLS_components.elSpace, typeof __VLS_components.ElSpace, typeof __VLS_components.elSpace, ]} */ ;
    // @ts-ignore
    const __VLS_277 = __VLS_asFunctionalComponent(__VLS_276, new __VLS_276({
        direction: "vertical",
        ...{ style: {} },
    }));
    const __VLS_278 = __VLS_277({
        direction: "vertical",
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_277));
    __VLS_279.slots.default;
    const __VLS_280 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_281 = __VLS_asFunctionalComponent(__VLS_280, new __VLS_280({
        ...{ 'onClick': {} },
        type: "success",
        block: true,
    }));
    const __VLS_282 = __VLS_281({
        ...{ 'onClick': {} },
        type: "success",
        block: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_281));
    let __VLS_284;
    let __VLS_285;
    let __VLS_286;
    const __VLS_287 = {
        onClick: (...[$event]) => {
            if (!(__VLS_ctx.selectedToken))
                return;
            __VLS_ctx.markToken(__VLS_ctx.selectedToken, 'trusted');
        }
    };
    __VLS_283.slots.default;
    var __VLS_283;
    const __VLS_288 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_289 = __VLS_asFunctionalComponent(__VLS_288, new __VLS_288({
        ...{ 'onClick': {} },
        type: "warning",
        block: true,
    }));
    const __VLS_290 = __VLS_289({
        ...{ 'onClick': {} },
        type: "warning",
        block: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_289));
    let __VLS_292;
    let __VLS_293;
    let __VLS_294;
    const __VLS_295 = {
        onClick: (...[$event]) => {
            if (!(__VLS_ctx.selectedToken))
                return;
            __VLS_ctx.markToken(__VLS_ctx.selectedToken, 'review');
        }
    };
    __VLS_291.slots.default;
    var __VLS_291;
    const __VLS_296 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_297 = __VLS_asFunctionalComponent(__VLS_296, new __VLS_296({
        ...{ 'onClick': {} },
        type: "danger",
        block: true,
    }));
    const __VLS_298 = __VLS_297({
        ...{ 'onClick': {} },
        type: "danger",
        block: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_297));
    let __VLS_300;
    let __VLS_301;
    let __VLS_302;
    const __VLS_303 = {
        onClick: (...[$event]) => {
            if (!(__VLS_ctx.selectedToken))
                return;
            __VLS_ctx.markToken(__VLS_ctx.selectedToken, 'malicious');
        }
    };
    __VLS_299.slots.default;
    var __VLS_299;
    var __VLS_279;
}
var __VLS_243;
/** @type {__VLS_StyleScopedClasses['l1-detection']} */ ;
/** @type {__VLS_StyleScopedClasses['toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['toolbar-right']} */ ;
/** @type {__VLS_StyleScopedClasses['is-loading']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header']} */ ;
/** @type {__VLS_StyleScopedClasses['header-tags']} */ ;
/** @type {__VLS_StyleScopedClasses['token-tag']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-container']} */ ;
/** @type {__VLS_StyleScopedClasses['bar-chart']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header']} */ ;
/** @type {__VLS_StyleScopedClasses['fullscreen-chart']} */ ;
/** @type {__VLS_StyleScopedClasses['token-details']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            QuestionFilled: QuestionFilled,
            Loading: Loading,
            Download: Download,
            VChart: VChart,
            topN: topN,
            viewMode: viewMode,
            drawerVisible: drawerVisible,
            selectedToken: selectedToken,
            loading: loading,
            isDetecting: isDetecting,
            showResults: showResults,
            totalTokens: totalTokens,
            anomalousTokens: anomalousTokens,
            loadL1Data: loadL1Data,
            topAnomalousTokens: topAnomalousTokens,
            barChartOption: barChartOption,
            getHighRiskCount: getHighRiskCount,
            getAnomalousCount: getAnomalousCount,
            getSummaryRiskType: getSummaryRiskType,
            getTokenRiskType: getTokenRiskType,
            getDeltaPPLClass: getDeltaPPLClass,
            startDetection: startDetection,
            handleTokenSelect: handleTokenSelect,
            inspectToken: inspectToken,
            exportResults: exportResults,
            markToken: markToken,
            fullscreenChart: fullscreenChart,
            onChartClick: onChartClick,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
//# sourceMappingURL=L1Detection.vue.js.map