import { ref, computed, onMounted } from 'vue';
import { QuestionFilled, Loading } from '@element-plus/icons-vue';
import { useActivityStore } from '../stores/activityStore';
import VChart from 'vue-echarts';
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { BarChart } from 'echarts/charts';
import { TitleComponent, TooltipComponent, GridComponent, LegendComponent, DataZoomComponent } from 'echarts/components';
use([
    CanvasRenderer,
    BarChart,
    TitleComponent,
    TooltipComponent,
    GridComponent,
    LegendComponent,
    DataZoomComponent
]);
const activityStore = useActivityStore();
const topN = ref(15);
const viewMode = ref('split');
const drawerVisible = ref(false);
const selectedToken = ref(null);
const loading = ref(false);
// 检测相关状态
const isDetecting = ref(false);
const detectionProgress = ref(0);
const showResults = ref(false);
const totalTokens = ref(0);
const anomalousTokens = ref([]);
// 根据delta值确定风险等级
const getRiskLevel = (delta) => {
    if (delta >= 15)
        return 'high'; // 大于15为高风险
    if (delta >= 8)
        return 'medium'; // 8-15为中风险
    return 'low'; // 小于8为低风险
};
// 加载L1数据
const loadL1Data = async () => {
    try {
        loading.value = true;
        const response = await fetch('/data/L1.json');
        if (!response.ok) {
            throw new Error(`HTTP错误! 状态: ${response.status}`);
        }
        const text = await response.text();
        // 处理JSON中的NaN值，将其替换为null
        const cleanedText = text.replace(/:\s*NaN\s*,/g, ': null,').replace(/:\s*NaN\s*}/g, ': null}');
        const rawData = JSON.parse(cleanedText);
        // 过滤出有意义的token
        const filteredData = rawData
            .filter(item => {
            if (item.token === null || item.delta === null) {
                return false;
            }
            const trimmedToken = item.token.trim();
            return item.delta > 0 && trimmedToken.length > 0;
        })
            .sort((a, b) => b.delta - a.delta);
        // 转换数据格式
        anomalousTokens.value = filteredData.map(item => ({
            token: item.token,
            tokenId: item.token_id,
            deltaPPL: item.delta,
            risk: getRiskLevel(item.delta)
        }));
        totalTokens.value = rawData.length;
    }
    catch (error) {
        console.error('加载L1数据失败:', error);
        // 使用默认数据作为后备
        anomalousTokens.value = [
            { token: 'He', tokenId: 3868, deltaPPL: 18.2930, risk: 'high' },
            { token: 'ha', tokenId: 2350, deltaPPL: 17.7637, risk: 'high' },
            { token: 'click', tokenId: 2828, deltaPPL: 17.4902, risk: 'high' }
        ];
        totalTokens.value = 1000;
    }
    finally {
        loading.value = false;
    }
};
// 左侧表格显示的Top-N异常token（只显示高风险和中风险的）
const topAnomalousTokens = computed(() => {
    return anomalousTokens.value
        .filter(token => token.risk === 'high' || token.risk === 'medium')
        .sort((a, b) => b.deltaPPL - a.deltaPPL)
        .slice(0, topN.value);
});
// 分布图数据：将ΔPPL值分组统计，生成频率分布
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
const barChartOption = computed(() => {
    const { bins, counts } = chartDistribution.value;
    if (bins.length === 0)
        return {};
    return {
        title: {
            text: 'Token 困惑度差异分布',
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
const getHighRiskCount = () => {
    return anomalousTokens.value.filter(t => t.risk === 'high').length;
};
const getMediumRiskCount = () => {
    return anomalousTokens.value.filter(t => t.risk === 'medium').length;
};
const getAnomalousCount = () => {
    return anomalousTokens.value.filter(t => t.risk === 'high' || t.risk === 'medium').length;
};
const getSummaryRiskType = () => {
    const highRiskCount = getHighRiskCount();
    if (highRiskCount > 5)
        return 'danger';
    if (highRiskCount > 2)
        return 'warning';
    return 'success';
};
const getTokenRiskType = (risk) => {
    switch (risk) {
        case 'high': return 'danger';
        case 'medium': return 'warning';
        case 'low': return 'success';
        default: return 'info';
    }
};
const getDeltaPPLClass = (deltaPPL) => {
    if (deltaPPL > 17)
        return 'high-delta';
    if (deltaPPL > 16)
        return 'medium-delta';
    return 'low-delta';
};
const startDetection = async () => {
    if (isDetecting.value)
        return;
    // 重置状态
    isDetecting.value = true;
    detectionProgress.value = 0;
    showResults.value = false;
    anomalousTokens.value = [];
    // 模拟30秒检测过程，每0.5秒更新一次进度
    const totalTime = 30000; // 30秒
    const updateInterval = 500; // 0.5秒
    const totalSteps = totalTime / updateInterval;
    for (let i = 0; i <= totalSteps; i++) {
        detectionProgress.value = Math.floor((i / totalSteps) * 100);
        if (i < totalSteps) {
            await new Promise(resolve => setTimeout(resolve, updateInterval));
        }
    }
    // 检测完成，加载数据并显示结果
    await loadL1Data();
    isDetecting.value = false;
    showResults.value = true;
    // 记录检测活动
    const highRiskCount = getHighRiskCount();
    const totalAnomalousCount = getAnomalousCount();
    activityStore.recordL1Detection(totalAnomalousCount, highRiskCount);
};
const handleTokenSelect = (currentRow) => {
    selectedToken.value = currentRow;
};
const inspectToken = (token) => {
    selectedToken.value = token;
    drawerVisible.value = true;
};
const markToken = (token, mark) => {
    // TODO: 实现标记功能
};
const fullscreenChart = () => {
    viewMode.value = 'fullscreen';
};
const onChartClick = (params) => {
    // 分布图点击事件：显示该区间内的所有token
    const binIndex = params.dataIndex;
    const { bins } = chartDistribution.value;
    const binValue = bins[binIndex];
    // 这里可以扩展为显示该区间内token的详细信息
    console.log(`点击了ΔPPL区间: ${binValue}, 包含 ${params.value[1]} 个token`);
};
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
var __VLS_39;
var __VLS_35;
var __VLS_3;
if (__VLS_ctx.isDetecting) {
    const __VLS_56 = {}.ElAlert;
    /** @type {[typeof __VLS_components.ElAlert, typeof __VLS_components.elAlert, typeof __VLS_components.ElAlert, typeof __VLS_components.elAlert, ]} */ ;
    // @ts-ignore
    const __VLS_57 = __VLS_asFunctionalComponent(__VLS_56, new __VLS_56({
        title: "正在进行L1层检测",
        type: "warning",
        closable: (false),
        showIcon: true,
        ...{ style: {} },
    }));
    const __VLS_58 = __VLS_57({
        title: "正在进行L1层检测",
        type: "warning",
        closable: (false),
        showIcon: true,
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_57));
    __VLS_59.slots.default;
    {
        const { default: __VLS_thisSlot } = __VLS_59.slots;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ style: {} },
        });
        const __VLS_60 = {}.ElIcon;
        /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
        // @ts-ignore
        const __VLS_61 = __VLS_asFunctionalComponent(__VLS_60, new __VLS_60({
            ...{ class: "is-loading" },
        }));
        const __VLS_62 = __VLS_61({
            ...{ class: "is-loading" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_61));
        __VLS_63.slots.default;
        const __VLS_64 = {}.Loading;
        /** @type {[typeof __VLS_components.Loading, ]} */ ;
        // @ts-ignore
        const __VLS_65 = __VLS_asFunctionalComponent(__VLS_64, new __VLS_64({}));
        const __VLS_66 = __VLS_65({}, ...__VLS_functionalComponentArgsRest(__VLS_65));
        var __VLS_63;
        const __VLS_68 = {}.ElProgress;
        /** @type {[typeof __VLS_components.ElProgress, typeof __VLS_components.elProgress, ]} */ ;
        // @ts-ignore
        const __VLS_69 = __VLS_asFunctionalComponent(__VLS_68, new __VLS_68({
            percentage: (__VLS_ctx.detectionProgress),
            status: (__VLS_ctx.detectionProgress === 100 ? 'success' : undefined),
            ...{ style: {} },
        }));
        const __VLS_70 = __VLS_69({
            percentage: (__VLS_ctx.detectionProgress),
            status: (__VLS_ctx.detectionProgress === 100 ? 'success' : undefined),
            ...{ style: {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_69));
    }
    var __VLS_59;
}
if (__VLS_ctx.showResults) {
    const __VLS_72 = {}.ElAlert;
    /** @type {[typeof __VLS_components.ElAlert, typeof __VLS_components.elAlert, typeof __VLS_components.ElAlert, typeof __VLS_components.elAlert, ]} */ ;
    // @ts-ignore
    const __VLS_73 = __VLS_asFunctionalComponent(__VLS_72, new __VLS_72({
        title: "数据显示说明",
        type: "info",
        closable: (false),
        showIcon: true,
        ...{ style: {} },
    }));
    const __VLS_74 = __VLS_73({
        title: "数据显示说明",
        type: "info",
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
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.br)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.br)({});
        const __VLS_76 = {}.ElTag;
        /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
        // @ts-ignore
        const __VLS_77 = __VLS_asFunctionalComponent(__VLS_76, new __VLS_76({
            type: "danger",
            size: "small",
        }));
        const __VLS_78 = __VLS_77({
            type: "danger",
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_77));
        __VLS_79.slots.default;
        var __VLS_79;
        const __VLS_80 = {}.ElTag;
        /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
        // @ts-ignore
        const __VLS_81 = __VLS_asFunctionalComponent(__VLS_80, new __VLS_80({
            type: "warning",
            size: "small",
        }));
        const __VLS_82 = __VLS_81({
            type: "warning",
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_81));
        __VLS_83.slots.default;
        var __VLS_83;
        const __VLS_84 = {}.ElTag;
        /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
        // @ts-ignore
        const __VLS_85 = __VLS_asFunctionalComponent(__VLS_84, new __VLS_84({
            type: "success",
            size: "small",
        }));
        const __VLS_86 = __VLS_85({
            type: "success",
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_85));
        __VLS_87.slots.default;
        var __VLS_87;
    }
    var __VLS_75;
}
if (__VLS_ctx.viewMode === 'split' && __VLS_ctx.showResults) {
    const __VLS_88 = {}.ElRow;
    /** @type {[typeof __VLS_components.ElRow, typeof __VLS_components.elRow, typeof __VLS_components.ElRow, typeof __VLS_components.elRow, ]} */ ;
    // @ts-ignore
    const __VLS_89 = __VLS_asFunctionalComponent(__VLS_88, new __VLS_88({
        gutter: (20),
    }));
    const __VLS_90 = __VLS_89({
        gutter: (20),
    }, ...__VLS_functionalComponentArgsRest(__VLS_89));
    __VLS_91.slots.default;
    const __VLS_92 = {}.ElCol;
    /** @type {[typeof __VLS_components.ElCol, typeof __VLS_components.elCol, typeof __VLS_components.ElCol, typeof __VLS_components.elCol, ]} */ ;
    // @ts-ignore
    const __VLS_93 = __VLS_asFunctionalComponent(__VLS_92, new __VLS_92({
        span: (10),
    }));
    const __VLS_94 = __VLS_93({
        span: (10),
    }, ...__VLS_functionalComponentArgsRest(__VLS_93));
    __VLS_95.slots.default;
    const __VLS_96 = {}.ElCard;
    /** @type {[typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ]} */ ;
    // @ts-ignore
    const __VLS_97 = __VLS_asFunctionalComponent(__VLS_96, new __VLS_96({}));
    const __VLS_98 = __VLS_97({}, ...__VLS_functionalComponentArgsRest(__VLS_97));
    __VLS_99.slots.default;
    {
        const { header: __VLS_thisSlot } = __VLS_99.slots;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "card-header" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (__VLS_ctx.topN);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "header-tags" },
        });
        const __VLS_100 = {}.ElTag;
        /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
        // @ts-ignore
        const __VLS_101 = __VLS_asFunctionalComponent(__VLS_100, new __VLS_100({
            type: (__VLS_ctx.getSummaryRiskType()),
            size: "small",
        }));
        const __VLS_102 = __VLS_101({
            type: (__VLS_ctx.getSummaryRiskType()),
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_101));
        __VLS_103.slots.default;
        (`${__VLS_ctx.getAnomalousCount()} / ${__VLS_ctx.totalTokens} 异常`);
        var __VLS_103;
        if (!__VLS_ctx.loading) {
            const __VLS_104 = {}.ElTag;
            /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
            // @ts-ignore
            const __VLS_105 = __VLS_asFunctionalComponent(__VLS_104, new __VLS_104({
                type: "danger",
                size: "small",
            }));
            const __VLS_106 = __VLS_105({
                type: "danger",
                size: "small",
            }, ...__VLS_functionalComponentArgsRest(__VLS_105));
            __VLS_107.slots.default;
            (__VLS_ctx.getHighRiskCount());
            var __VLS_107;
        }
    }
    const __VLS_108 = {}.ElTable;
    /** @type {[typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ]} */ ;
    // @ts-ignore
    const __VLS_109 = __VLS_asFunctionalComponent(__VLS_108, new __VLS_108({
        ...{ 'onCurrentChange': {} },
        data: (__VLS_ctx.topAnomalousTokens),
        height: "500",
        highlightCurrentRow: true,
        elementLoadingText: "正在加载异常Token数据...",
    }));
    const __VLS_110 = __VLS_109({
        ...{ 'onCurrentChange': {} },
        data: (__VLS_ctx.topAnomalousTokens),
        height: "500",
        highlightCurrentRow: true,
        elementLoadingText: "正在加载异常Token数据...",
    }, ...__VLS_functionalComponentArgsRest(__VLS_109));
    let __VLS_112;
    let __VLS_113;
    let __VLS_114;
    const __VLS_115 = {
        onCurrentChange: (__VLS_ctx.handleTokenSelect)
    };
    __VLS_asFunctionalDirective(__VLS_directives.vLoading)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.loading) }, null, null);
    __VLS_111.slots.default;
    const __VLS_116 = {}.ElTableColumn;
    /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
    // @ts-ignore
    const __VLS_117 = __VLS_asFunctionalComponent(__VLS_116, new __VLS_116({
        type: "index",
        label: "排名",
        width: "60",
    }));
    const __VLS_118 = __VLS_117({
        type: "index",
        label: "排名",
        width: "60",
    }, ...__VLS_functionalComponentArgsRest(__VLS_117));
    const __VLS_120 = {}.ElTableColumn;
    /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
    // @ts-ignore
    const __VLS_121 = __VLS_asFunctionalComponent(__VLS_120, new __VLS_120({
        prop: "token",
        label: "Token",
        width: "120",
    }));
    const __VLS_122 = __VLS_121({
        prop: "token",
        label: "Token",
        width: "120",
    }, ...__VLS_functionalComponentArgsRest(__VLS_121));
    __VLS_123.slots.default;
    {
        const { default: __VLS_thisSlot } = __VLS_123.slots;
        const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
        const __VLS_124 = {}.ElTag;
        /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
        // @ts-ignore
        const __VLS_125 = __VLS_asFunctionalComponent(__VLS_124, new __VLS_124({
            ...{ 'onClick': {} },
            type: (__VLS_ctx.getTokenRiskType(row.risk)),
            ...{ class: "token-tag" },
        }));
        const __VLS_126 = __VLS_125({
            ...{ 'onClick': {} },
            type: (__VLS_ctx.getTokenRiskType(row.risk)),
            ...{ class: "token-tag" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_125));
        let __VLS_128;
        let __VLS_129;
        let __VLS_130;
        const __VLS_131 = {
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.viewMode === 'split' && __VLS_ctx.showResults))
                    return;
                __VLS_ctx.inspectToken(row);
            }
        };
        __VLS_127.slots.default;
        (row.token);
        var __VLS_127;
    }
    var __VLS_123;
    const __VLS_132 = {}.ElTableColumn;
    /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
    // @ts-ignore
    const __VLS_133 = __VLS_asFunctionalComponent(__VLS_132, new __VLS_132({
        prop: "tokenId",
        label: "Token ID",
        width: "90",
    }));
    const __VLS_134 = __VLS_133({
        prop: "tokenId",
        label: "Token ID",
        width: "90",
    }, ...__VLS_functionalComponentArgsRest(__VLS_133));
    __VLS_135.slots.default;
    {
        const { default: __VLS_thisSlot } = __VLS_135.slots;
        const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
        (row.tokenId);
    }
    var __VLS_135;
    const __VLS_136 = {}.ElTableColumn;
    /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
    // @ts-ignore
    const __VLS_137 = __VLS_asFunctionalComponent(__VLS_136, new __VLS_136({
        prop: "deltaPPL",
        label: "ΔPPL",
        width: "80",
    }));
    const __VLS_138 = __VLS_137({
        prop: "deltaPPL",
        label: "ΔPPL",
        width: "80",
    }, ...__VLS_functionalComponentArgsRest(__VLS_137));
    __VLS_139.slots.default;
    {
        const { default: __VLS_thisSlot } = __VLS_139.slots;
        const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: (__VLS_ctx.getDeltaPPLClass(row.deltaPPL)) },
        });
        (row.deltaPPL.toFixed(2));
    }
    var __VLS_139;
    const __VLS_140 = {}.ElTableColumn;
    /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
    // @ts-ignore
    const __VLS_141 = __VLS_asFunctionalComponent(__VLS_140, new __VLS_140({
        label: "操作",
        width: "100",
    }));
    const __VLS_142 = __VLS_141({
        label: "操作",
        width: "100",
    }, ...__VLS_functionalComponentArgsRest(__VLS_141));
    __VLS_143.slots.default;
    {
        const { default: __VLS_thisSlot } = __VLS_143.slots;
        const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
        const __VLS_144 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_145 = __VLS_asFunctionalComponent(__VLS_144, new __VLS_144({
            ...{ 'onClick': {} },
            type: "text",
            size: "small",
        }));
        const __VLS_146 = __VLS_145({
            ...{ 'onClick': {} },
            type: "text",
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_145));
        let __VLS_148;
        let __VLS_149;
        let __VLS_150;
        const __VLS_151 = {
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.viewMode === 'split' && __VLS_ctx.showResults))
                    return;
                __VLS_ctx.markToken(row, 'trusted');
            }
        };
        __VLS_147.slots.default;
        var __VLS_147;
        const __VLS_152 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_153 = __VLS_asFunctionalComponent(__VLS_152, new __VLS_152({
            ...{ 'onClick': {} },
            type: "text",
            size: "small",
        }));
        const __VLS_154 = __VLS_153({
            ...{ 'onClick': {} },
            type: "text",
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_153));
        let __VLS_156;
        let __VLS_157;
        let __VLS_158;
        const __VLS_159 = {
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.viewMode === 'split' && __VLS_ctx.showResults))
                    return;
                __VLS_ctx.markToken(row, 'review');
            }
        };
        __VLS_155.slots.default;
        var __VLS_155;
    }
    var __VLS_143;
    var __VLS_111;
    var __VLS_99;
    var __VLS_95;
    const __VLS_160 = {}.ElCol;
    /** @type {[typeof __VLS_components.ElCol, typeof __VLS_components.elCol, typeof __VLS_components.ElCol, typeof __VLS_components.elCol, ]} */ ;
    // @ts-ignore
    const __VLS_161 = __VLS_asFunctionalComponent(__VLS_160, new __VLS_160({
        span: (14),
    }));
    const __VLS_162 = __VLS_161({
        span: (14),
    }, ...__VLS_functionalComponentArgsRest(__VLS_161));
    __VLS_163.slots.default;
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
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        const __VLS_168 = {}.ElTooltip;
        /** @type {[typeof __VLS_components.ElTooltip, typeof __VLS_components.elTooltip, typeof __VLS_components.ElTooltip, typeof __VLS_components.elTooltip, ]} */ ;
        // @ts-ignore
        const __VLS_169 = __VLS_asFunctionalComponent(__VLS_168, new __VLS_168({
            content: "显示ΔPPL值的频率分布，横轴为ΔPPL值，纵轴为对应区间内的Token数量",
        }));
        const __VLS_170 = __VLS_169({
            content: "显示ΔPPL值的频率分布，横轴为ΔPPL值，纵轴为对应区间内的Token数量",
        }, ...__VLS_functionalComponentArgsRest(__VLS_169));
        __VLS_171.slots.default;
        const __VLS_172 = {}.ElIcon;
        /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
        // @ts-ignore
        const __VLS_173 = __VLS_asFunctionalComponent(__VLS_172, new __VLS_172({}));
        const __VLS_174 = __VLS_173({}, ...__VLS_functionalComponentArgsRest(__VLS_173));
        __VLS_175.slots.default;
        const __VLS_176 = {}.QuestionFilled;
        /** @type {[typeof __VLS_components.QuestionFilled, ]} */ ;
        // @ts-ignore
        const __VLS_177 = __VLS_asFunctionalComponent(__VLS_176, new __VLS_176({}));
        const __VLS_178 = __VLS_177({}, ...__VLS_functionalComponentArgsRest(__VLS_177));
        var __VLS_175;
        var __VLS_171;
        const __VLS_180 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_181 = __VLS_asFunctionalComponent(__VLS_180, new __VLS_180({
            ...{ 'onClick': {} },
            type: "text",
        }));
        const __VLS_182 = __VLS_181({
            ...{ 'onClick': {} },
            type: "text",
        }, ...__VLS_functionalComponentArgsRest(__VLS_181));
        let __VLS_184;
        let __VLS_185;
        let __VLS_186;
        const __VLS_187 = {
            onClick: (__VLS_ctx.fullscreenChart)
        };
        __VLS_183.slots.default;
        var __VLS_183;
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "chart-container" },
        'element-loading-text': "正在生成图表...",
    });
    __VLS_asFunctionalDirective(__VLS_directives.vLoading)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.loading) }, null, null);
    const __VLS_188 = {}.VChart;
    /** @type {[typeof __VLS_components.VChart, typeof __VLS_components.vChart, ]} */ ;
    // @ts-ignore
    const __VLS_189 = __VLS_asFunctionalComponent(__VLS_188, new __VLS_188({
        ...{ 'onClick': {} },
        ...{ class: "bar-chart" },
        option: (__VLS_ctx.barChartOption),
    }));
    const __VLS_190 = __VLS_189({
        ...{ 'onClick': {} },
        ...{ class: "bar-chart" },
        option: (__VLS_ctx.barChartOption),
    }, ...__VLS_functionalComponentArgsRest(__VLS_189));
    let __VLS_192;
    let __VLS_193;
    let __VLS_194;
    const __VLS_195 = {
        onClick: (__VLS_ctx.onChartClick)
    };
    var __VLS_191;
    var __VLS_167;
    var __VLS_163;
    var __VLS_91;
}
if (__VLS_ctx.viewMode === 'fullscreen' && __VLS_ctx.showResults) {
    const __VLS_196 = {}.ElCard;
    /** @type {[typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ]} */ ;
    // @ts-ignore
    const __VLS_197 = __VLS_asFunctionalComponent(__VLS_196, new __VLS_196({}));
    const __VLS_198 = __VLS_197({}, ...__VLS_functionalComponentArgsRest(__VLS_197));
    __VLS_199.slots.default;
    {
        const { header: __VLS_thisSlot } = __VLS_199.slots;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "card-header" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        const __VLS_200 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_201 = __VLS_asFunctionalComponent(__VLS_200, new __VLS_200({
            ...{ 'onClick': {} },
        }));
        const __VLS_202 = __VLS_201({
            ...{ 'onClick': {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_201));
        let __VLS_204;
        let __VLS_205;
        let __VLS_206;
        const __VLS_207 = {
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.viewMode === 'fullscreen' && __VLS_ctx.showResults))
                    return;
                __VLS_ctx.viewMode = 'split';
            }
        };
        __VLS_203.slots.default;
        var __VLS_203;
    }
    const __VLS_208 = {}.VChart;
    /** @type {[typeof __VLS_components.VChart, typeof __VLS_components.vChart, ]} */ ;
    // @ts-ignore
    const __VLS_209 = __VLS_asFunctionalComponent(__VLS_208, new __VLS_208({
        ...{ 'onClick': {} },
        ...{ class: "fullscreen-chart" },
        option: (__VLS_ctx.barChartOption),
    }));
    const __VLS_210 = __VLS_209({
        ...{ 'onClick': {} },
        ...{ class: "fullscreen-chart" },
        option: (__VLS_ctx.barChartOption),
    }, ...__VLS_functionalComponentArgsRest(__VLS_209));
    let __VLS_212;
    let __VLS_213;
    let __VLS_214;
    const __VLS_215 = {
        onClick: (__VLS_ctx.onChartClick)
    };
    var __VLS_211;
    var __VLS_199;
}
if (!__VLS_ctx.isDetecting && !__VLS_ctx.showResults) {
    const __VLS_216 = {}.ElEmpty;
    /** @type {[typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ]} */ ;
    // @ts-ignore
    const __VLS_217 = __VLS_asFunctionalComponent(__VLS_216, new __VLS_216({
        description: "点击 '开始检测' 按钮开始L1层异常Token检测",
        ...{ style: {} },
    }));
    const __VLS_218 = __VLS_217({
        description: "点击 '开始检测' 按钮开始L1层异常Token检测",
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_217));
    __VLS_219.slots.default;
    const __VLS_220 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_221 = __VLS_asFunctionalComponent(__VLS_220, new __VLS_220({
        ...{ 'onClick': {} },
        type: "primary",
    }));
    const __VLS_222 = __VLS_221({
        ...{ 'onClick': {} },
        type: "primary",
    }, ...__VLS_functionalComponentArgsRest(__VLS_221));
    let __VLS_224;
    let __VLS_225;
    let __VLS_226;
    const __VLS_227 = {
        onClick: (__VLS_ctx.startDetection)
    };
    __VLS_223.slots.default;
    var __VLS_223;
    var __VLS_219;
}
const __VLS_228 = {}.ElDrawer;
/** @type {[typeof __VLS_components.ElDrawer, typeof __VLS_components.elDrawer, typeof __VLS_components.ElDrawer, typeof __VLS_components.elDrawer, ]} */ ;
// @ts-ignore
const __VLS_229 = __VLS_asFunctionalComponent(__VLS_228, new __VLS_228({
    modelValue: (__VLS_ctx.drawerVisible),
    title: "Token 详细信息",
    size: "500px",
}));
const __VLS_230 = __VLS_229({
    modelValue: (__VLS_ctx.drawerVisible),
    title: "Token 详细信息",
    size: "500px",
}, ...__VLS_functionalComponentArgsRest(__VLS_229));
__VLS_231.slots.default;
if (__VLS_ctx.selectedToken) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "token-details" },
    });
    const __VLS_232 = {}.ElDescriptions;
    /** @type {[typeof __VLS_components.ElDescriptions, typeof __VLS_components.elDescriptions, typeof __VLS_components.ElDescriptions, typeof __VLS_components.elDescriptions, ]} */ ;
    // @ts-ignore
    const __VLS_233 = __VLS_asFunctionalComponent(__VLS_232, new __VLS_232({
        column: (1),
        border: true,
    }));
    const __VLS_234 = __VLS_233({
        column: (1),
        border: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_233));
    __VLS_235.slots.default;
    const __VLS_236 = {}.ElDescriptionsItem;
    /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
    // @ts-ignore
    const __VLS_237 = __VLS_asFunctionalComponent(__VLS_236, new __VLS_236({
        label: "Token",
    }));
    const __VLS_238 = __VLS_237({
        label: "Token",
    }, ...__VLS_functionalComponentArgsRest(__VLS_237));
    __VLS_239.slots.default;
    const __VLS_240 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_241 = __VLS_asFunctionalComponent(__VLS_240, new __VLS_240({
        type: (__VLS_ctx.getTokenRiskType(__VLS_ctx.selectedToken.risk)),
        size: "large",
    }));
    const __VLS_242 = __VLS_241({
        type: (__VLS_ctx.getTokenRiskType(__VLS_ctx.selectedToken.risk)),
        size: "large",
    }, ...__VLS_functionalComponentArgsRest(__VLS_241));
    __VLS_243.slots.default;
    (__VLS_ctx.selectedToken.token);
    var __VLS_243;
    var __VLS_239;
    const __VLS_244 = {}.ElDescriptionsItem;
    /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
    // @ts-ignore
    const __VLS_245 = __VLS_asFunctionalComponent(__VLS_244, new __VLS_244({
        label: "Token ID",
    }));
    const __VLS_246 = __VLS_245({
        label: "Token ID",
    }, ...__VLS_functionalComponentArgsRest(__VLS_245));
    __VLS_247.slots.default;
    (__VLS_ctx.selectedToken.tokenId);
    var __VLS_247;
    const __VLS_248 = {}.ElDescriptionsItem;
    /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
    // @ts-ignore
    const __VLS_249 = __VLS_asFunctionalComponent(__VLS_248, new __VLS_248({
        label: "ΔPPL",
    }));
    const __VLS_250 = __VLS_249({
        label: "ΔPPL",
    }, ...__VLS_functionalComponentArgsRest(__VLS_249));
    __VLS_251.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: (__VLS_ctx.getDeltaPPLClass(__VLS_ctx.selectedToken.deltaPPL)) },
        ...{ style: {} },
    });
    (__VLS_ctx.selectedToken.deltaPPL.toFixed(4));
    var __VLS_251;
    const __VLS_252 = {}.ElDescriptionsItem;
    /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
    // @ts-ignore
    const __VLS_253 = __VLS_asFunctionalComponent(__VLS_252, new __VLS_252({
        label: "风险等级",
    }));
    const __VLS_254 = __VLS_253({
        label: "风险等级",
    }, ...__VLS_functionalComponentArgsRest(__VLS_253));
    __VLS_255.slots.default;
    const __VLS_256 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_257 = __VLS_asFunctionalComponent(__VLS_256, new __VLS_256({
        type: (__VLS_ctx.getTokenRiskType(__VLS_ctx.selectedToken.risk)),
    }));
    const __VLS_258 = __VLS_257({
        type: (__VLS_ctx.getTokenRiskType(__VLS_ctx.selectedToken.risk)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_257));
    __VLS_259.slots.default;
    (__VLS_ctx.selectedToken.risk);
    var __VLS_259;
    var __VLS_255;
    var __VLS_235;
    const __VLS_260 = {}.ElDivider;
    /** @type {[typeof __VLS_components.ElDivider, typeof __VLS_components.elDivider, typeof __VLS_components.ElDivider, typeof __VLS_components.elDivider, ]} */ ;
    // @ts-ignore
    const __VLS_261 = __VLS_asFunctionalComponent(__VLS_260, new __VLS_260({}));
    const __VLS_262 = __VLS_261({}, ...__VLS_functionalComponentArgsRest(__VLS_261));
    __VLS_263.slots.default;
    var __VLS_263;
    const __VLS_264 = {}.ElSpace;
    /** @type {[typeof __VLS_components.ElSpace, typeof __VLS_components.elSpace, typeof __VLS_components.ElSpace, typeof __VLS_components.elSpace, ]} */ ;
    // @ts-ignore
    const __VLS_265 = __VLS_asFunctionalComponent(__VLS_264, new __VLS_264({
        direction: "vertical",
        ...{ style: {} },
    }));
    const __VLS_266 = __VLS_265({
        direction: "vertical",
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_265));
    __VLS_267.slots.default;
    const __VLS_268 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_269 = __VLS_asFunctionalComponent(__VLS_268, new __VLS_268({
        ...{ 'onClick': {} },
        type: "success",
        block: true,
    }));
    const __VLS_270 = __VLS_269({
        ...{ 'onClick': {} },
        type: "success",
        block: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_269));
    let __VLS_272;
    let __VLS_273;
    let __VLS_274;
    const __VLS_275 = {
        onClick: (...[$event]) => {
            if (!(__VLS_ctx.selectedToken))
                return;
            __VLS_ctx.markToken(__VLS_ctx.selectedToken, 'trusted');
        }
    };
    __VLS_271.slots.default;
    var __VLS_271;
    const __VLS_276 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_277 = __VLS_asFunctionalComponent(__VLS_276, new __VLS_276({
        ...{ 'onClick': {} },
        type: "warning",
        block: true,
    }));
    const __VLS_278 = __VLS_277({
        ...{ 'onClick': {} },
        type: "warning",
        block: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_277));
    let __VLS_280;
    let __VLS_281;
    let __VLS_282;
    const __VLS_283 = {
        onClick: (...[$event]) => {
            if (!(__VLS_ctx.selectedToken))
                return;
            __VLS_ctx.markToken(__VLS_ctx.selectedToken, 'review');
        }
    };
    __VLS_279.slots.default;
    var __VLS_279;
    const __VLS_284 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_285 = __VLS_asFunctionalComponent(__VLS_284, new __VLS_284({
        ...{ 'onClick': {} },
        type: "danger",
        block: true,
    }));
    const __VLS_286 = __VLS_285({
        ...{ 'onClick': {} },
        type: "danger",
        block: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_285));
    let __VLS_288;
    let __VLS_289;
    let __VLS_290;
    const __VLS_291 = {
        onClick: (...[$event]) => {
            if (!(__VLS_ctx.selectedToken))
                return;
            __VLS_ctx.markToken(__VLS_ctx.selectedToken, 'malicious');
        }
    };
    __VLS_287.slots.default;
    var __VLS_287;
    var __VLS_267;
}
var __VLS_231;
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
            VChart: VChart,
            topN: topN,
            viewMode: viewMode,
            drawerVisible: drawerVisible,
            selectedToken: selectedToken,
            loading: loading,
            isDetecting: isDetecting,
            detectionProgress: detectionProgress,
            showResults: showResults,
            totalTokens: totalTokens,
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