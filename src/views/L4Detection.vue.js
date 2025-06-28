import { ref, computed, onMounted, onUnmounted } from 'vue';
import VChart from 'vue-echarts';
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { LineChart, BarChart } from 'echarts/charts';
import { TitleComponent, TooltipComponent, LegendComponent, GridComponent } from 'echarts/components';
use([
    CanvasRenderer,
    LineChart,
    BarChart,
    TitleComponent,
    TooltipComponent,
    LegendComponent,
    GridComponent
]);
const activeTab = ref('optimization');
const isOptimizing = ref(false);
const optimizationConfig = ref({
    initialTokens: 'token_117 token_119 token_114 token_111 token_117',
    algorithm: 'genetic',
    maxGenerations: 100,
    populationSize: 50
});
const algorithmConfig = ref({
    genetic: {
        selection: 'tournament',
        eliteRate: 0.1,
        tournamentSize: 3
    },
    gradient: {
        learningRate: 0.01,
        batchSize: 32,
        gradientClipping: true
    },
    general: {
        convergenceThreshold: 0.001,
        stagnationLimit: 20,
        randomSeed: 42
    }
});
const currentGeneration = ref(0);
const bestScore = ref(0);
const runningTime = ref(0);
const bestTriggerTokens = ref([]);
const l4Data = ref(null);
const currentGenerationData = ref(null);
const allResults = ref([]);
const allResultsVisible = ref(false);
const recentResults = ref([]);
// 加载L4数据
const loadL4Data = async () => {
    try {
        const response = await fetch('/data/L4.json');
        const data = await response.json();
        l4Data.value = data;
        optimizationConfig.value.maxGenerations = data.total_generations;
        console.log('L4数据加载成功:', data);
    }
    catch (error) {
        console.error('加载L4数据失败:', error);
    }
};
const progressPercentage = computed(() => {
    return Math.round((currentGeneration.value / optimizationConfig.value.maxGenerations) * 100);
});
const trendChartOption = computed(() => {
    if (!l4Data.value || allResults.value.length === 0) {
        return {
            title: {
                text: '暂无数据',
                left: 'center',
                top: 'middle'
            }
        };
    }
    // 使用所有历史数据而不是最近结果
    const generations = allResults.value.map(item => item.generation);
    const scores = allResults.value.map(item => item.score);
    const improvements = allResults.value.map(item => item.improvement || 0);
    return {
        tooltip: {
            trigger: 'axis',
            formatter: (params) => {
                const gen = params[0].axisValue;
                let result = `代数 ${gen}<br/>`;
                params.forEach((param) => {
                    if (param.seriesName === '得分') {
                        result += `${param.marker}${param.seriesName}: ${param.value.toFixed(2)}<br/>`;
                    }
                    else if (param.seriesName === '改进值') {
                        const improvement = param.value;
                        const sign = improvement > 0 ? '+' : '';
                        result += `${param.marker}${param.seriesName}: ${sign}${improvement.toFixed(2)}<br/>`;
                    }
                });
                return result;
            }
        },
        legend: {
            data: ['得分', '改进值']
        },
        grid: {
            left: '3%',
            right: '4%',
            bottom: '3%',
            containLabel: true
        },
        xAxis: {
            type: 'category',
            name: '代数',
            data: generations
        },
        yAxis: [
            {
                type: 'value',
                name: '得分',
                position: 'left',
                axisLabel: {
                    formatter: '{value}'
                }
            },
            {
                type: 'value',
                name: '改进值',
                position: 'right',
                axisLabel: {
                    formatter: '{value}'
                }
            }
        ],
        series: [
            {
                name: '得分',
                type: 'line',
                yAxisIndex: 0,
                data: scores,
                lineStyle: { color: '#52c41a', width: 2 },
                symbol: 'circle',
                symbolSize: 4,
                itemStyle: { color: '#52c41a' }
            },
            {
                name: '改进值',
                type: 'line',
                yAxisIndex: 1,
                data: improvements,
                lineStyle: { color: '#1890ff', width: 2 },
                symbol: 'diamond',
                symbolSize: 4,
                itemStyle: { color: '#1890ff' }
            }
        ]
    };
});
let optimizationTimer = null;
let timeUpdateTimer = null;
const getProgressColor = (percentage) => {
    if (percentage < 30)
        return '#ff4d4f';
    if (percentage < 70)
        return '#faad14';
    return '#52c41a';
};
const getScoreClass = (score) => {
    if (score > 80)
        return 'score-excellent';
    if (score > 60)
        return 'score-good';
    return 'score-normal';
};
const getImprovementClass = (improvement) => {
    if (improvement === null)
        return 'no-improvement';
    if (improvement > 0)
        return 'improvement-positive';
    return 'improvement-negative';
};
const startOptimization = () => {
    if (!l4Data.value) {
        console.error('L4数据未加载');
        return;
    }
    isOptimizing.value = true;
    runningTime.value = 0;
    currentGeneration.value = 0;
    bestScore.value = 0;
    recentResults.value = [];
    allResults.value = [];
    // 启动时间更新计时器 - 每秒更新运行时间
    timeUpdateTimer = setInterval(() => {
        runningTime.value += 1;
    }, 1000);
    // 开始第一代
    scheduleNextGeneration();
};
// 调度下一代的执行
const scheduleNextGeneration = () => {
    if (!l4Data.value || currentGeneration.value >= l4Data.value.history.length) {
        pauseOptimization();
        return;
    }
    // 生成随机时间间隔：4-6秒之间
    const randomDelay = 4000 + Math.random() * 2000; // 4000ms - 6000ms
    optimizationTimer = setTimeout(() => {
        const generationData = l4Data.value.history[currentGeneration.value];
        currentGeneration.value = generationData.gen;
        bestScore.value = generationData.score;
        currentGenerationData.value = generationData;
        bestTriggerTokens.value = generationData.tokens;
        // 更新结果表格
        updateResults(generationData);
        // 检查是否完成
        if (currentGeneration.value >= l4Data.value.total_generations) {
            pauseOptimization();
        }
        else {
            // 调度下一代
            scheduleNextGeneration();
        }
    }, randomDelay);
};
const pauseOptimization = () => {
    isOptimizing.value = false;
    if (optimizationTimer) {
        clearTimeout(optimizationTimer);
        optimizationTimer = null;
    }
    if (timeUpdateTimer) {
        clearInterval(timeUpdateTimer);
        timeUpdateTimer = null;
    }
};
const resetOptimization = () => {
    pauseOptimization();
    currentGeneration.value = 0;
    bestScore.value = 0;
    runningTime.value = 0;
    currentGenerationData.value = null;
    bestTriggerTokens.value = [];
    recentResults.value = [];
    allResults.value = [];
};
const updateResults = (generationData) => {
    // 使用当前实际时间
    const now = new Date();
    const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    const newResult = {
        generation: generationData.gen,
        score: generationData.score,
        tokens: generationData.tokens,
        timestamp: timeString, // 使用实际时间
        improvement: generationData.improvement
    };
    // 添加到所有结果列表
    allResults.value.push(newResult);
    // 添加到最近结果列表开头，保持最近10条记录
    recentResults.value.unshift(newResult);
    if (recentResults.value.length > 10) {
        recentResults.value.pop();
    }
};
const viewAllResults = () => {
    allResultsVisible.value = true;
};
const exportAllResults = () => {
    if (allResults.value.length === 0) {
        console.log('暂无数据可导出');
        return;
    }
    const dataStr = JSON.stringify(allResults.value, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `L4_optimization_results_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};
const saveConfig = () => {
    console.log('保存配置');
};
const resetConfig = () => {
    console.log('重置配置');
};
const loadPresetConfig = () => {
    console.log('加载预设配置');
};
onMounted(() => {
    console.log('L4 Detection页面已加载');
    loadL4Data();
});
onUnmounted(() => {
    if (optimizationTimer) {
        clearTimeout(optimizationTimer);
    }
    if (timeUpdateTimer) {
        clearInterval(timeUpdateTimer);
    }
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['current-best']} */ ;
/** @type {__VLS_StyleScopedClasses['best-tokens']} */ ;
/** @type {__VLS_StyleScopedClasses['trigger-token']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "l4-detection" },
});
const __VLS_0 = {}.ElTabs;
/** @type {[typeof __VLS_components.ElTabs, typeof __VLS_components.elTabs, typeof __VLS_components.ElTabs, typeof __VLS_components.elTabs, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    modelValue: (__VLS_ctx.activeTab),
}));
const __VLS_2 = __VLS_1({
    modelValue: (__VLS_ctx.activeTab),
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
__VLS_3.slots.default;
const __VLS_4 = {}.ElTabPane;
/** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
// @ts-ignore
const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
    label: "触发搜索优化",
    name: "optimization",
}));
const __VLS_6 = __VLS_5({
    label: "触发搜索优化",
    name: "optimization",
}, ...__VLS_functionalComponentArgsRest(__VLS_5));
__VLS_7.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "optimization-view" },
});
const __VLS_8 = {}.ElCard;
/** @type {[typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ]} */ ;
// @ts-ignore
const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
    ...{ class: "config-card" },
}));
const __VLS_10 = __VLS_9({
    ...{ class: "config-card" },
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
        loading: (__VLS_ctx.isOptimizing),
    }));
    const __VLS_18 = __VLS_17({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.isOptimizing),
    }, ...__VLS_functionalComponentArgsRest(__VLS_17));
    let __VLS_20;
    let __VLS_21;
    let __VLS_22;
    const __VLS_23 = {
        onClick: (__VLS_ctx.startOptimization)
    };
    __VLS_19.slots.default;
    (__VLS_ctx.isOptimizing ? '优化中...' : '启动优化');
    var __VLS_19;
    const __VLS_24 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
        ...{ 'onClick': {} },
        disabled: (!__VLS_ctx.isOptimizing),
    }));
    const __VLS_26 = __VLS_25({
        ...{ 'onClick': {} },
        disabled: (!__VLS_ctx.isOptimizing),
    }, ...__VLS_functionalComponentArgsRest(__VLS_25));
    let __VLS_28;
    let __VLS_29;
    let __VLS_30;
    const __VLS_31 = {
        onClick: (__VLS_ctx.pauseOptimization)
    };
    __VLS_27.slots.default;
    var __VLS_27;
    const __VLS_32 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({
        ...{ 'onClick': {} },
        type: "danger",
    }));
    const __VLS_34 = __VLS_33({
        ...{ 'onClick': {} },
        type: "danger",
    }, ...__VLS_functionalComponentArgsRest(__VLS_33));
    let __VLS_36;
    let __VLS_37;
    let __VLS_38;
    const __VLS_39 = {
        onClick: (__VLS_ctx.resetOptimization)
    };
    __VLS_35.slots.default;
    var __VLS_35;
    var __VLS_15;
}
const __VLS_40 = {}.ElRow;
/** @type {[typeof __VLS_components.ElRow, typeof __VLS_components.elRow, typeof __VLS_components.ElRow, typeof __VLS_components.elRow, ]} */ ;
// @ts-ignore
const __VLS_41 = __VLS_asFunctionalComponent(__VLS_40, new __VLS_40({
    gutter: (20),
}));
const __VLS_42 = __VLS_41({
    gutter: (20),
}, ...__VLS_functionalComponentArgsRest(__VLS_41));
__VLS_43.slots.default;
const __VLS_44 = {}.ElCol;
/** @type {[typeof __VLS_components.ElCol, typeof __VLS_components.elCol, typeof __VLS_components.ElCol, typeof __VLS_components.elCol, ]} */ ;
// @ts-ignore
const __VLS_45 = __VLS_asFunctionalComponent(__VLS_44, new __VLS_44({
    span: (24),
}));
const __VLS_46 = __VLS_45({
    span: (24),
}, ...__VLS_functionalComponentArgsRest(__VLS_45));
__VLS_47.slots.default;
const __VLS_48 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({
    model: (__VLS_ctx.optimizationConfig),
    labelWidth: "120px",
    inline: (true),
}));
const __VLS_50 = __VLS_49({
    model: (__VLS_ctx.optimizationConfig),
    labelWidth: "120px",
    inline: (true),
}, ...__VLS_functionalComponentArgsRest(__VLS_49));
__VLS_51.slots.default;
const __VLS_52 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_53 = __VLS_asFunctionalComponent(__VLS_52, new __VLS_52({
    label: "初始触发令牌",
    ...{ style: {} },
}));
const __VLS_54 = __VLS_53({
    label: "初始触发令牌",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_53));
__VLS_55.slots.default;
const __VLS_56 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_57 = __VLS_asFunctionalComponent(__VLS_56, new __VLS_56({
    modelValue: (__VLS_ctx.optimizationConfig.initialTokens),
    type: "textarea",
    rows: (3),
    placeholder: "请输入初始 trigger tokens，例如：token_392 token_128",
    ...{ style: {} },
}));
const __VLS_58 = __VLS_57({
    modelValue: (__VLS_ctx.optimizationConfig.initialTokens),
    type: "textarea",
    rows: (3),
    placeholder: "请输入初始 trigger tokens，例如：token_392 token_128",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_57));
var __VLS_55;
const __VLS_60 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_61 = __VLS_asFunctionalComponent(__VLS_60, new __VLS_60({
    label: "优化算法",
    ...{ style: {} },
}));
const __VLS_62 = __VLS_61({
    label: "优化算法",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_61));
__VLS_63.slots.default;
const __VLS_64 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_65 = __VLS_asFunctionalComponent(__VLS_64, new __VLS_64({
    modelValue: (__VLS_ctx.optimizationConfig.algorithm),
    ...{ style: {} },
}));
const __VLS_66 = __VLS_65({
    modelValue: (__VLS_ctx.optimizationConfig.algorithm),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_65));
__VLS_67.slots.default;
const __VLS_68 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_69 = __VLS_asFunctionalComponent(__VLS_68, new __VLS_68({
    label: "遗传算法 (GA)",
    value: "genetic",
}));
const __VLS_70 = __VLS_69({
    label: "遗传算法 (GA)",
    value: "genetic",
}, ...__VLS_functionalComponentArgsRest(__VLS_69));
const __VLS_72 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_73 = __VLS_asFunctionalComponent(__VLS_72, new __VLS_72({
    label: "策略梯度",
    value: "gradient",
}));
const __VLS_74 = __VLS_73({
    label: "策略梯度",
    value: "gradient",
}, ...__VLS_functionalComponentArgsRest(__VLS_73));
var __VLS_67;
var __VLS_63;
var __VLS_51;
var __VLS_47;
var __VLS_43;
var __VLS_11;
const __VLS_76 = {}.ElCard;
/** @type {[typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ]} */ ;
// @ts-ignore
const __VLS_77 = __VLS_asFunctionalComponent(__VLS_76, new __VLS_76({
    ...{ class: "progress-card" },
}));
const __VLS_78 = __VLS_77({
    ...{ class: "progress-card" },
}, ...__VLS_functionalComponentArgsRest(__VLS_77));
__VLS_79.slots.default;
{
    const { header: __VLS_thisSlot } = __VLS_79.slots;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
}
const __VLS_80 = {}.ElRow;
/** @type {[typeof __VLS_components.ElRow, typeof __VLS_components.elRow, typeof __VLS_components.ElRow, typeof __VLS_components.elRow, ]} */ ;
// @ts-ignore
const __VLS_81 = __VLS_asFunctionalComponent(__VLS_80, new __VLS_80({
    gutter: (20),
}));
const __VLS_82 = __VLS_81({
    gutter: (20),
}, ...__VLS_functionalComponentArgsRest(__VLS_81));
__VLS_83.slots.default;
const __VLS_84 = {}.ElCol;
/** @type {[typeof __VLS_components.ElCol, typeof __VLS_components.elCol, typeof __VLS_components.ElCol, typeof __VLS_components.elCol, ]} */ ;
// @ts-ignore
const __VLS_85 = __VLS_asFunctionalComponent(__VLS_84, new __VLS_84({
    span: (8),
}));
const __VLS_86 = __VLS_85({
    span: (8),
}, ...__VLS_functionalComponentArgsRest(__VLS_85));
__VLS_87.slots.default;
const __VLS_88 = {}.ElStatistic;
/** @type {[typeof __VLS_components.ElStatistic, typeof __VLS_components.elStatistic, typeof __VLS_components.ElStatistic, typeof __VLS_components.elStatistic, ]} */ ;
// @ts-ignore
const __VLS_89 = __VLS_asFunctionalComponent(__VLS_88, new __VLS_88({
    title: "当前代数",
    value: (__VLS_ctx.currentGeneration),
}));
const __VLS_90 = __VLS_89({
    title: "当前代数",
    value: (__VLS_ctx.currentGeneration),
}, ...__VLS_functionalComponentArgsRest(__VLS_89));
__VLS_91.slots.default;
{
    const { suffix: __VLS_thisSlot } = __VLS_91.slots;
    (__VLS_ctx.optimizationConfig.maxGenerations);
}
var __VLS_91;
var __VLS_87;
const __VLS_92 = {}.ElCol;
/** @type {[typeof __VLS_components.ElCol, typeof __VLS_components.elCol, typeof __VLS_components.ElCol, typeof __VLS_components.elCol, ]} */ ;
// @ts-ignore
const __VLS_93 = __VLS_asFunctionalComponent(__VLS_92, new __VLS_92({
    span: (8),
}));
const __VLS_94 = __VLS_93({
    span: (8),
}, ...__VLS_functionalComponentArgsRest(__VLS_93));
__VLS_95.slots.default;
const __VLS_96 = {}.ElStatistic;
/** @type {[typeof __VLS_components.ElStatistic, typeof __VLS_components.elStatistic, ]} */ ;
// @ts-ignore
const __VLS_97 = __VLS_asFunctionalComponent(__VLS_96, new __VLS_96({
    title: "最佳得分",
    value: (__VLS_ctx.bestScore),
    precision: (2),
}));
const __VLS_98 = __VLS_97({
    title: "最佳得分",
    value: (__VLS_ctx.bestScore),
    precision: (2),
}, ...__VLS_functionalComponentArgsRest(__VLS_97));
var __VLS_95;
const __VLS_100 = {}.ElCol;
/** @type {[typeof __VLS_components.ElCol, typeof __VLS_components.elCol, typeof __VLS_components.ElCol, typeof __VLS_components.elCol, ]} */ ;
// @ts-ignore
const __VLS_101 = __VLS_asFunctionalComponent(__VLS_100, new __VLS_100({
    span: (8),
}));
const __VLS_102 = __VLS_101({
    span: (8),
}, ...__VLS_functionalComponentArgsRest(__VLS_101));
__VLS_103.slots.default;
const __VLS_104 = {}.ElStatistic;
/** @type {[typeof __VLS_components.ElStatistic, typeof __VLS_components.elStatistic, ]} */ ;
// @ts-ignore
const __VLS_105 = __VLS_asFunctionalComponent(__VLS_104, new __VLS_104({
    title: "运行时间",
    value: (__VLS_ctx.runningTime),
    suffix: "秒",
}));
const __VLS_106 = __VLS_105({
    title: "运行时间",
    value: (__VLS_ctx.runningTime),
    suffix: "秒",
}, ...__VLS_functionalComponentArgsRest(__VLS_105));
var __VLS_103;
var __VLS_83;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "progress-bar" },
});
const __VLS_108 = {}.ElProgress;
/** @type {[typeof __VLS_components.ElProgress, typeof __VLS_components.elProgress, typeof __VLS_components.ElProgress, typeof __VLS_components.elProgress, ]} */ ;
// @ts-ignore
const __VLS_109 = __VLS_asFunctionalComponent(__VLS_108, new __VLS_108({
    percentage: (__VLS_ctx.progressPercentage),
    strokeWidth: (15),
    color: (__VLS_ctx.getProgressColor(__VLS_ctx.progressPercentage)),
}));
const __VLS_110 = __VLS_109({
    percentage: (__VLS_ctx.progressPercentage),
    strokeWidth: (15),
    color: (__VLS_ctx.getProgressColor(__VLS_ctx.progressPercentage)),
}, ...__VLS_functionalComponentArgsRest(__VLS_109));
__VLS_111.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_111.slots;
    const [{ percentage }] = __VLS_getSlotParams(__VLS_thisSlot);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "progress-text" },
    });
    (percentage);
}
var __VLS_111;
if (__VLS_ctx.currentGenerationData) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "current-best" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "trigger-info" },
    });
    const __VLS_112 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_113 = __VLS_asFunctionalComponent(__VLS_112, new __VLS_112({
        size: "large",
        type: "success",
        ...{ class: "trigger-str-tag" },
    }));
    const __VLS_114 = __VLS_113({
        size: "large",
        type: "success",
        ...{ class: "trigger-str-tag" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_113));
    __VLS_115.slots.default;
    (__VLS_ctx.currentGenerationData.trigger_str);
    var __VLS_115;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "target-info" },
    });
    (__VLS_ctx.l4Data?.target || 'dziss');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "best-tokens" },
    });
    for (const [token, index] of __VLS_getVForSourceType((__VLS_ctx.bestTriggerTokens))) {
        const __VLS_116 = {}.ElTag;
        /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
        // @ts-ignore
        const __VLS_117 = __VLS_asFunctionalComponent(__VLS_116, new __VLS_116({
            key: (index),
            ...{ class: "trigger-token" },
            type: "primary",
            size: "small",
        }));
        const __VLS_118 = __VLS_117({
            key: (index),
            ...{ class: "trigger-token" },
            type: "primary",
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_117));
        __VLS_119.slots.default;
        (token);
        var __VLS_119;
    }
}
var __VLS_79;
const __VLS_120 = {}.ElCard;
/** @type {[typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ]} */ ;
// @ts-ignore
const __VLS_121 = __VLS_asFunctionalComponent(__VLS_120, new __VLS_120({
    ...{ class: "results-card" },
}));
const __VLS_122 = __VLS_121({
    ...{ class: "results-card" },
}, ...__VLS_functionalComponentArgsRest(__VLS_121));
__VLS_123.slots.default;
{
    const { header: __VLS_thisSlot } = __VLS_123.slots;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card-header" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    const __VLS_124 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_125 = __VLS_asFunctionalComponent(__VLS_124, new __VLS_124({
        ...{ 'onClick': {} },
        type: "text",
    }));
    const __VLS_126 = __VLS_125({
        ...{ 'onClick': {} },
        type: "text",
    }, ...__VLS_functionalComponentArgsRest(__VLS_125));
    let __VLS_128;
    let __VLS_129;
    let __VLS_130;
    const __VLS_131 = {
        onClick: (__VLS_ctx.viewAllResults)
    };
    __VLS_127.slots.default;
    var __VLS_127;
}
const __VLS_132 = {}.ElTable;
/** @type {[typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ]} */ ;
// @ts-ignore
const __VLS_133 = __VLS_asFunctionalComponent(__VLS_132, new __VLS_132({
    data: (__VLS_ctx.recentResults),
    maxHeight: "350",
}));
const __VLS_134 = __VLS_133({
    data: (__VLS_ctx.recentResults),
    maxHeight: "350",
}, ...__VLS_functionalComponentArgsRest(__VLS_133));
__VLS_135.slots.default;
const __VLS_136 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_137 = __VLS_asFunctionalComponent(__VLS_136, new __VLS_136({
    prop: "generation",
    label: "代数",
    width: "80",
}));
const __VLS_138 = __VLS_137({
    prop: "generation",
    label: "代数",
    width: "80",
}, ...__VLS_functionalComponentArgsRest(__VLS_137));
const __VLS_140 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_141 = __VLS_asFunctionalComponent(__VLS_140, new __VLS_140({
    prop: "score",
    label: "得分",
    width: "100",
}));
const __VLS_142 = __VLS_141({
    prop: "score",
    label: "得分",
    width: "100",
}, ...__VLS_functionalComponentArgsRest(__VLS_141));
__VLS_143.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_143.slots;
    const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: (__VLS_ctx.getScoreClass(row.score)) },
    });
    (row.score.toFixed(2));
}
var __VLS_143;
const __VLS_144 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_145 = __VLS_asFunctionalComponent(__VLS_144, new __VLS_144({
    prop: "improvement",
    label: "改进值",
    width: "100",
}));
const __VLS_146 = __VLS_145({
    prop: "improvement",
    label: "改进值",
    width: "100",
}, ...__VLS_functionalComponentArgsRest(__VLS_145));
__VLS_147.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_147.slots;
    const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
    if (row.improvement !== null) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: (__VLS_ctx.getImprovementClass(row.improvement)) },
        });
        (row.improvement > 0 ? '+' : '');
        (row.improvement.toFixed(2));
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "no-improvement" },
        });
    }
}
var __VLS_147;
const __VLS_148 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_149 = __VLS_asFunctionalComponent(__VLS_148, new __VLS_148({
    prop: "tokens",
    label: "触发令牌",
    minWidth: "200",
}));
const __VLS_150 = __VLS_149({
    prop: "tokens",
    label: "触发令牌",
    minWidth: "200",
}, ...__VLS_functionalComponentArgsRest(__VLS_149));
__VLS_151.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_151.slots;
    const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
    for (const [token, index] of __VLS_getVForSourceType((row.tokens))) {
        const __VLS_152 = {}.ElTag;
        /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
        // @ts-ignore
        const __VLS_153 = __VLS_asFunctionalComponent(__VLS_152, new __VLS_152({
            key: (index),
            size: "small",
            ...{ class: "token-tag" },
        }));
        const __VLS_154 = __VLS_153({
            key: (index),
            size: "small",
            ...{ class: "token-tag" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_153));
        __VLS_155.slots.default;
        (token);
        var __VLS_155;
    }
}
var __VLS_151;
const __VLS_156 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_157 = __VLS_asFunctionalComponent(__VLS_156, new __VLS_156({
    prop: "timestamp",
    label: "时间",
    width: "100",
}));
const __VLS_158 = __VLS_157({
    prop: "timestamp",
    label: "时间",
    width: "100",
}, ...__VLS_functionalComponentArgsRest(__VLS_157));
var __VLS_135;
var __VLS_123;
const __VLS_160 = {}.ElCard;
/** @type {[typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ]} */ ;
// @ts-ignore
const __VLS_161 = __VLS_asFunctionalComponent(__VLS_160, new __VLS_160({
    ...{ class: "chart-card" },
}));
const __VLS_162 = __VLS_161({
    ...{ class: "chart-card" },
}, ...__VLS_functionalComponentArgsRest(__VLS_161));
__VLS_163.slots.default;
{
    const { header: __VLS_thisSlot } = __VLS_163.slots;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
}
const __VLS_164 = {}.VChart;
/** @type {[typeof __VLS_components.VChart, typeof __VLS_components.vChart, ]} */ ;
// @ts-ignore
const __VLS_165 = __VLS_asFunctionalComponent(__VLS_164, new __VLS_164({
    ...{ class: "trend-chart" },
    option: (__VLS_ctx.trendChartOption),
}));
const __VLS_166 = __VLS_165({
    ...{ class: "trend-chart" },
    option: (__VLS_ctx.trendChartOption),
}, ...__VLS_functionalComponentArgsRest(__VLS_165));
var __VLS_163;
var __VLS_7;
const __VLS_168 = {}.ElTabPane;
/** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
// @ts-ignore
const __VLS_169 = __VLS_asFunctionalComponent(__VLS_168, new __VLS_168({
    label: "算法参数配置",
    name: "config",
}));
const __VLS_170 = __VLS_169({
    label: "算法参数配置",
    name: "config",
}, ...__VLS_functionalComponentArgsRest(__VLS_169));
__VLS_171.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "config-view" },
});
const __VLS_172 = {}.ElRow;
/** @type {[typeof __VLS_components.ElRow, typeof __VLS_components.elRow, typeof __VLS_components.ElRow, typeof __VLS_components.elRow, ]} */ ;
// @ts-ignore
const __VLS_173 = __VLS_asFunctionalComponent(__VLS_172, new __VLS_172({
    gutter: (20),
}));
const __VLS_174 = __VLS_173({
    gutter: (20),
}, ...__VLS_functionalComponentArgsRest(__VLS_173));
__VLS_175.slots.default;
const __VLS_176 = {}.ElCol;
/** @type {[typeof __VLS_components.ElCol, typeof __VLS_components.elCol, typeof __VLS_components.ElCol, typeof __VLS_components.elCol, ]} */ ;
// @ts-ignore
const __VLS_177 = __VLS_asFunctionalComponent(__VLS_176, new __VLS_176({
    span: (12),
}));
const __VLS_178 = __VLS_177({
    span: (12),
}, ...__VLS_functionalComponentArgsRest(__VLS_177));
__VLS_179.slots.default;
const __VLS_180 = {}.ElCard;
/** @type {[typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ]} */ ;
// @ts-ignore
const __VLS_181 = __VLS_asFunctionalComponent(__VLS_180, new __VLS_180({}));
const __VLS_182 = __VLS_181({}, ...__VLS_functionalComponentArgsRest(__VLS_181));
__VLS_183.slots.default;
{
    const { header: __VLS_thisSlot } = __VLS_183.slots;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
}
const __VLS_184 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_185 = __VLS_asFunctionalComponent(__VLS_184, new __VLS_184({
    model: (__VLS_ctx.algorithmConfig.genetic),
    labelWidth: "120px",
}));
const __VLS_186 = __VLS_185({
    model: (__VLS_ctx.algorithmConfig.genetic),
    labelWidth: "120px",
}, ...__VLS_functionalComponentArgsRest(__VLS_185));
__VLS_187.slots.default;
const __VLS_188 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_189 = __VLS_asFunctionalComponent(__VLS_188, new __VLS_188({
    label: "最大代数",
}));
const __VLS_190 = __VLS_189({
    label: "最大代数",
}, ...__VLS_functionalComponentArgsRest(__VLS_189));
__VLS_191.slots.default;
const __VLS_192 = {}.ElInputNumber;
/** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
// @ts-ignore
const __VLS_193 = __VLS_asFunctionalComponent(__VLS_192, new __VLS_192({
    modelValue: (__VLS_ctx.optimizationConfig.maxGenerations),
    min: (10),
    max: (1000),
    ...{ style: {} },
}));
const __VLS_194 = __VLS_193({
    modelValue: (__VLS_ctx.optimizationConfig.maxGenerations),
    min: (10),
    max: (1000),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_193));
var __VLS_191;
const __VLS_196 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_197 = __VLS_asFunctionalComponent(__VLS_196, new __VLS_196({
    label: "种群大小",
}));
const __VLS_198 = __VLS_197({
    label: "种群大小",
}, ...__VLS_functionalComponentArgsRest(__VLS_197));
__VLS_199.slots.default;
const __VLS_200 = {}.ElInputNumber;
/** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
// @ts-ignore
const __VLS_201 = __VLS_asFunctionalComponent(__VLS_200, new __VLS_200({
    modelValue: (__VLS_ctx.optimizationConfig.populationSize),
    min: (10),
    max: (200),
    ...{ style: {} },
}));
const __VLS_202 = __VLS_201({
    modelValue: (__VLS_ctx.optimizationConfig.populationSize),
    min: (10),
    max: (200),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_201));
var __VLS_199;
const __VLS_204 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_205 = __VLS_asFunctionalComponent(__VLS_204, new __VLS_204({
    label: "选择策略",
}));
const __VLS_206 = __VLS_205({
    label: "选择策略",
}, ...__VLS_functionalComponentArgsRest(__VLS_205));
__VLS_207.slots.default;
const __VLS_208 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_209 = __VLS_asFunctionalComponent(__VLS_208, new __VLS_208({
    modelValue: (__VLS_ctx.algorithmConfig.genetic.selection),
    ...{ style: {} },
}));
const __VLS_210 = __VLS_209({
    modelValue: (__VLS_ctx.algorithmConfig.genetic.selection),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_209));
__VLS_211.slots.default;
const __VLS_212 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_213 = __VLS_asFunctionalComponent(__VLS_212, new __VLS_212({
    label: "轮盘赌选择",
    value: "roulette",
}));
const __VLS_214 = __VLS_213({
    label: "轮盘赌选择",
    value: "roulette",
}, ...__VLS_functionalComponentArgsRest(__VLS_213));
const __VLS_216 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_217 = __VLS_asFunctionalComponent(__VLS_216, new __VLS_216({
    label: "锦标赛选择",
    value: "tournament",
}));
const __VLS_218 = __VLS_217({
    label: "锦标赛选择",
    value: "tournament",
}, ...__VLS_functionalComponentArgsRest(__VLS_217));
const __VLS_220 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_221 = __VLS_asFunctionalComponent(__VLS_220, new __VLS_220({
    label: "排序选择",
    value: "rank",
}));
const __VLS_222 = __VLS_221({
    label: "排序选择",
    value: "rank",
}, ...__VLS_functionalComponentArgsRest(__VLS_221));
var __VLS_211;
var __VLS_207;
const __VLS_224 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_225 = __VLS_asFunctionalComponent(__VLS_224, new __VLS_224({
    label: "精英保留率",
}));
const __VLS_226 = __VLS_225({
    label: "精英保留率",
}, ...__VLS_functionalComponentArgsRest(__VLS_225));
__VLS_227.slots.default;
const __VLS_228 = {}.ElSlider;
/** @type {[typeof __VLS_components.ElSlider, typeof __VLS_components.elSlider, ]} */ ;
// @ts-ignore
const __VLS_229 = __VLS_asFunctionalComponent(__VLS_228, new __VLS_228({
    modelValue: (__VLS_ctx.algorithmConfig.genetic.eliteRate),
    min: (0),
    max: (0.5),
    step: (0.05),
    showInput: true,
}));
const __VLS_230 = __VLS_229({
    modelValue: (__VLS_ctx.algorithmConfig.genetic.eliteRate),
    min: (0),
    max: (0.5),
    step: (0.05),
    showInput: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_229));
var __VLS_227;
const __VLS_232 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_233 = __VLS_asFunctionalComponent(__VLS_232, new __VLS_232({
    label: "锦标赛规模",
}));
const __VLS_234 = __VLS_233({
    label: "锦标赛规模",
}, ...__VLS_functionalComponentArgsRest(__VLS_233));
__VLS_235.slots.default;
const __VLS_236 = {}.ElInputNumber;
/** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
// @ts-ignore
const __VLS_237 = __VLS_asFunctionalComponent(__VLS_236, new __VLS_236({
    modelValue: (__VLS_ctx.algorithmConfig.genetic.tournamentSize),
    min: (2),
    max: (10),
    ...{ style: {} },
}));
const __VLS_238 = __VLS_237({
    modelValue: (__VLS_ctx.algorithmConfig.genetic.tournamentSize),
    min: (2),
    max: (10),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_237));
var __VLS_235;
var __VLS_187;
var __VLS_183;
var __VLS_179;
const __VLS_240 = {}.ElCol;
/** @type {[typeof __VLS_components.ElCol, typeof __VLS_components.elCol, typeof __VLS_components.ElCol, typeof __VLS_components.elCol, ]} */ ;
// @ts-ignore
const __VLS_241 = __VLS_asFunctionalComponent(__VLS_240, new __VLS_240({
    span: (12),
}));
const __VLS_242 = __VLS_241({
    span: (12),
}, ...__VLS_functionalComponentArgsRest(__VLS_241));
__VLS_243.slots.default;
const __VLS_244 = {}.ElCard;
/** @type {[typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ]} */ ;
// @ts-ignore
const __VLS_245 = __VLS_asFunctionalComponent(__VLS_244, new __VLS_244({}));
const __VLS_246 = __VLS_245({}, ...__VLS_functionalComponentArgsRest(__VLS_245));
__VLS_247.slots.default;
{
    const { header: __VLS_thisSlot } = __VLS_247.slots;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
}
const __VLS_248 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_249 = __VLS_asFunctionalComponent(__VLS_248, new __VLS_248({
    model: (__VLS_ctx.algorithmConfig.gradient),
    labelWidth: "120px",
}));
const __VLS_250 = __VLS_249({
    model: (__VLS_ctx.algorithmConfig.gradient),
    labelWidth: "120px",
}, ...__VLS_functionalComponentArgsRest(__VLS_249));
__VLS_251.slots.default;
const __VLS_252 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_253 = __VLS_asFunctionalComponent(__VLS_252, new __VLS_252({
    label: "EMA参数",
}));
const __VLS_254 = __VLS_253({
    label: "EMA参数",
}, ...__VLS_functionalComponentArgsRest(__VLS_253));
__VLS_255.slots.default;
const __VLS_256 = {}.ElInputNumber;
/** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
// @ts-ignore
const __VLS_257 = __VLS_asFunctionalComponent(__VLS_256, new __VLS_256({
    modelValue: (__VLS_ctx.algorithmConfig.gradient.learningRate),
    min: (0.0),
    max: (1.0),
    step: (0.01),
    ...{ style: {} },
}));
const __VLS_258 = __VLS_257({
    modelValue: (__VLS_ctx.algorithmConfig.gradient.learningRate),
    min: (0.0),
    max: (1.0),
    step: (0.01),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_257));
var __VLS_255;
const __VLS_260 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_261 = __VLS_asFunctionalComponent(__VLS_260, new __VLS_260({
    label: "参数α",
}));
const __VLS_262 = __VLS_261({
    label: "参数α",
}, ...__VLS_functionalComponentArgsRest(__VLS_261));
__VLS_263.slots.default;
const __VLS_264 = {}.ElInputNumber;
/** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
// @ts-ignore
const __VLS_265 = __VLS_asFunctionalComponent(__VLS_264, new __VLS_264({
    modelValue: (__VLS_ctx.algorithmConfig.gradient.batchSize),
    min: (0.0),
    max: (1.0),
    step: (0.01),
    ...{ style: {} },
}));
const __VLS_266 = __VLS_265({
    modelValue: (__VLS_ctx.algorithmConfig.gradient.batchSize),
    min: (0.0),
    max: (1.0),
    step: (0.01),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_265));
var __VLS_263;
var __VLS_251;
var __VLS_247;
var __VLS_243;
var __VLS_175;
const __VLS_268 = {}.ElRow;
/** @type {[typeof __VLS_components.ElRow, typeof __VLS_components.elRow, typeof __VLS_components.ElRow, typeof __VLS_components.elRow, ]} */ ;
// @ts-ignore
const __VLS_269 = __VLS_asFunctionalComponent(__VLS_268, new __VLS_268({
    gutter: (20),
    ...{ style: {} },
}));
const __VLS_270 = __VLS_269({
    gutter: (20),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_269));
__VLS_271.slots.default;
const __VLS_272 = {}.ElCol;
/** @type {[typeof __VLS_components.ElCol, typeof __VLS_components.elCol, typeof __VLS_components.ElCol, typeof __VLS_components.elCol, ]} */ ;
// @ts-ignore
const __VLS_273 = __VLS_asFunctionalComponent(__VLS_272, new __VLS_272({
    span: (24),
}));
const __VLS_274 = __VLS_273({
    span: (24),
}, ...__VLS_functionalComponentArgsRest(__VLS_273));
__VLS_275.slots.default;
const __VLS_276 = {}.ElCard;
/** @type {[typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ]} */ ;
// @ts-ignore
const __VLS_277 = __VLS_asFunctionalComponent(__VLS_276, new __VLS_276({}));
const __VLS_278 = __VLS_277({}, ...__VLS_functionalComponentArgsRest(__VLS_277));
__VLS_279.slots.default;
{
    const { header: __VLS_thisSlot } = __VLS_279.slots;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
}
const __VLS_280 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_281 = __VLS_asFunctionalComponent(__VLS_280, new __VLS_280({
    model: (__VLS_ctx.algorithmConfig.general),
    labelWidth: "120px",
}));
const __VLS_282 = __VLS_281({
    model: (__VLS_ctx.algorithmConfig.general),
    labelWidth: "120px",
}, ...__VLS_functionalComponentArgsRest(__VLS_281));
__VLS_283.slots.default;
const __VLS_284 = {}.ElRow;
/** @type {[typeof __VLS_components.ElRow, typeof __VLS_components.elRow, typeof __VLS_components.ElRow, typeof __VLS_components.elRow, ]} */ ;
// @ts-ignore
const __VLS_285 = __VLS_asFunctionalComponent(__VLS_284, new __VLS_284({
    gutter: (20),
}));
const __VLS_286 = __VLS_285({
    gutter: (20),
}, ...__VLS_functionalComponentArgsRest(__VLS_285));
__VLS_287.slots.default;
const __VLS_288 = {}.ElCol;
/** @type {[typeof __VLS_components.ElCol, typeof __VLS_components.elCol, typeof __VLS_components.ElCol, typeof __VLS_components.elCol, ]} */ ;
// @ts-ignore
const __VLS_289 = __VLS_asFunctionalComponent(__VLS_288, new __VLS_288({
    span: (8),
}));
const __VLS_290 = __VLS_289({
    span: (8),
}, ...__VLS_functionalComponentArgsRest(__VLS_289));
__VLS_291.slots.default;
const __VLS_292 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_293 = __VLS_asFunctionalComponent(__VLS_292, new __VLS_292({
    label: "收敛阈值",
}));
const __VLS_294 = __VLS_293({
    label: "收敛阈值",
}, ...__VLS_functionalComponentArgsRest(__VLS_293));
__VLS_295.slots.default;
const __VLS_296 = {}.ElInputNumber;
/** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
// @ts-ignore
const __VLS_297 = __VLS_asFunctionalComponent(__VLS_296, new __VLS_296({
    modelValue: (__VLS_ctx.algorithmConfig.general.convergenceThreshold),
    min: (0.001),
    max: (1),
    step: (0.001),
    ...{ style: {} },
}));
const __VLS_298 = __VLS_297({
    modelValue: (__VLS_ctx.algorithmConfig.general.convergenceThreshold),
    min: (0.001),
    max: (1),
    step: (0.001),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_297));
var __VLS_295;
var __VLS_291;
const __VLS_300 = {}.ElCol;
/** @type {[typeof __VLS_components.ElCol, typeof __VLS_components.elCol, typeof __VLS_components.ElCol, typeof __VLS_components.elCol, ]} */ ;
// @ts-ignore
const __VLS_301 = __VLS_asFunctionalComponent(__VLS_300, new __VLS_300({
    span: (8),
}));
const __VLS_302 = __VLS_301({
    span: (8),
}, ...__VLS_functionalComponentArgsRest(__VLS_301));
__VLS_303.slots.default;
const __VLS_304 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_305 = __VLS_asFunctionalComponent(__VLS_304, new __VLS_304({
    label: "停滞代数",
}));
const __VLS_306 = __VLS_305({
    label: "停滞代数",
}, ...__VLS_functionalComponentArgsRest(__VLS_305));
__VLS_307.slots.default;
const __VLS_308 = {}.ElInputNumber;
/** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
// @ts-ignore
const __VLS_309 = __VLS_asFunctionalComponent(__VLS_308, new __VLS_308({
    modelValue: (__VLS_ctx.algorithmConfig.general.stagnationLimit),
    min: (5),
    max: (100),
    ...{ style: {} },
}));
const __VLS_310 = __VLS_309({
    modelValue: (__VLS_ctx.algorithmConfig.general.stagnationLimit),
    min: (5),
    max: (100),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_309));
var __VLS_307;
var __VLS_303;
const __VLS_312 = {}.ElCol;
/** @type {[typeof __VLS_components.ElCol, typeof __VLS_components.elCol, typeof __VLS_components.ElCol, typeof __VLS_components.elCol, ]} */ ;
// @ts-ignore
const __VLS_313 = __VLS_asFunctionalComponent(__VLS_312, new __VLS_312({
    span: (8),
}));
const __VLS_314 = __VLS_313({
    span: (8),
}, ...__VLS_functionalComponentArgsRest(__VLS_313));
__VLS_315.slots.default;
const __VLS_316 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_317 = __VLS_asFunctionalComponent(__VLS_316, new __VLS_316({
    label: "随机种子",
}));
const __VLS_318 = __VLS_317({
    label: "随机种子",
}, ...__VLS_functionalComponentArgsRest(__VLS_317));
__VLS_319.slots.default;
const __VLS_320 = {}.ElInputNumber;
/** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
// @ts-ignore
const __VLS_321 = __VLS_asFunctionalComponent(__VLS_320, new __VLS_320({
    modelValue: (__VLS_ctx.algorithmConfig.general.randomSeed),
    min: (0),
    max: (999999),
    ...{ style: {} },
}));
const __VLS_322 = __VLS_321({
    modelValue: (__VLS_ctx.algorithmConfig.general.randomSeed),
    min: (0),
    max: (999999),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_321));
var __VLS_319;
var __VLS_315;
var __VLS_287;
var __VLS_283;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "config-actions" },
});
const __VLS_324 = {}.ElSpace;
/** @type {[typeof __VLS_components.ElSpace, typeof __VLS_components.elSpace, typeof __VLS_components.ElSpace, typeof __VLS_components.elSpace, ]} */ ;
// @ts-ignore
const __VLS_325 = __VLS_asFunctionalComponent(__VLS_324, new __VLS_324({}));
const __VLS_326 = __VLS_325({}, ...__VLS_functionalComponentArgsRest(__VLS_325));
__VLS_327.slots.default;
const __VLS_328 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_329 = __VLS_asFunctionalComponent(__VLS_328, new __VLS_328({
    ...{ 'onClick': {} },
    type: "primary",
}));
const __VLS_330 = __VLS_329({
    ...{ 'onClick': {} },
    type: "primary",
}, ...__VLS_functionalComponentArgsRest(__VLS_329));
let __VLS_332;
let __VLS_333;
let __VLS_334;
const __VLS_335 = {
    onClick: (__VLS_ctx.saveConfig)
};
__VLS_331.slots.default;
var __VLS_331;
const __VLS_336 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_337 = __VLS_asFunctionalComponent(__VLS_336, new __VLS_336({
    ...{ 'onClick': {} },
}));
const __VLS_338 = __VLS_337({
    ...{ 'onClick': {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_337));
let __VLS_340;
let __VLS_341;
let __VLS_342;
const __VLS_343 = {
    onClick: (__VLS_ctx.resetConfig)
};
__VLS_339.slots.default;
var __VLS_339;
const __VLS_344 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_345 = __VLS_asFunctionalComponent(__VLS_344, new __VLS_344({
    ...{ 'onClick': {} },
}));
const __VLS_346 = __VLS_345({
    ...{ 'onClick': {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_345));
let __VLS_348;
let __VLS_349;
let __VLS_350;
const __VLS_351 = {
    onClick: (__VLS_ctx.loadPresetConfig)
};
__VLS_347.slots.default;
var __VLS_347;
var __VLS_327;
var __VLS_279;
var __VLS_275;
var __VLS_271;
var __VLS_171;
var __VLS_3;
const __VLS_352 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_353 = __VLS_asFunctionalComponent(__VLS_352, new __VLS_352({
    modelValue: (__VLS_ctx.allResultsVisible),
    title: "全部优化结果",
    width: "80%",
    top: "5vh",
}));
const __VLS_354 = __VLS_353({
    modelValue: (__VLS_ctx.allResultsVisible),
    title: "全部优化结果",
    width: "80%",
    top: "5vh",
}, ...__VLS_functionalComponentArgsRest(__VLS_353));
__VLS_355.slots.default;
const __VLS_356 = {}.ElTable;
/** @type {[typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ]} */ ;
// @ts-ignore
const __VLS_357 = __VLS_asFunctionalComponent(__VLS_356, new __VLS_356({
    data: (__VLS_ctx.allResults),
    height: "400",
    stripe: true,
}));
const __VLS_358 = __VLS_357({
    data: (__VLS_ctx.allResults),
    height: "400",
    stripe: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_357));
__VLS_359.slots.default;
const __VLS_360 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_361 = __VLS_asFunctionalComponent(__VLS_360, new __VLS_360({
    prop: "generation",
    label: "代数",
    width: "80",
}));
const __VLS_362 = __VLS_361({
    prop: "generation",
    label: "代数",
    width: "80",
}, ...__VLS_functionalComponentArgsRest(__VLS_361));
const __VLS_364 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_365 = __VLS_asFunctionalComponent(__VLS_364, new __VLS_364({
    prop: "score",
    label: "得分",
    width: "100",
}));
const __VLS_366 = __VLS_365({
    prop: "score",
    label: "得分",
    width: "100",
}, ...__VLS_functionalComponentArgsRest(__VLS_365));
__VLS_367.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_367.slots;
    const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: (__VLS_ctx.getScoreClass(row.score)) },
    });
    (row.score.toFixed(2));
}
var __VLS_367;
const __VLS_368 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_369 = __VLS_asFunctionalComponent(__VLS_368, new __VLS_368({
    prop: "improvement",
    label: "改进值",
    width: "100",
}));
const __VLS_370 = __VLS_369({
    prop: "improvement",
    label: "改进值",
    width: "100",
}, ...__VLS_functionalComponentArgsRest(__VLS_369));
__VLS_371.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_371.slots;
    const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
    if (row.improvement !== null) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: (__VLS_ctx.getImprovementClass(row.improvement)) },
        });
        (row.improvement > 0 ? '+' : '');
        (row.improvement.toFixed(2));
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "no-improvement" },
        });
    }
}
var __VLS_371;
const __VLS_372 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_373 = __VLS_asFunctionalComponent(__VLS_372, new __VLS_372({
    prop: "tokens",
    label: "触发令牌",
    minWidth: "250",
}));
const __VLS_374 = __VLS_373({
    prop: "tokens",
    label: "触发令牌",
    minWidth: "250",
}, ...__VLS_functionalComponentArgsRest(__VLS_373));
__VLS_375.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_375.slots;
    const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
    for (const [token, index] of __VLS_getVForSourceType((row.tokens))) {
        const __VLS_376 = {}.ElTag;
        /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
        // @ts-ignore
        const __VLS_377 = __VLS_asFunctionalComponent(__VLS_376, new __VLS_376({
            key: (index),
            size: "small",
            ...{ class: "token-tag" },
        }));
        const __VLS_378 = __VLS_377({
            key: (index),
            size: "small",
            ...{ class: "token-tag" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_377));
        __VLS_379.slots.default;
        (token);
        var __VLS_379;
    }
}
var __VLS_375;
const __VLS_380 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_381 = __VLS_asFunctionalComponent(__VLS_380, new __VLS_380({
    prop: "timestamp",
    label: "时间",
    width: "100",
}));
const __VLS_382 = __VLS_381({
    prop: "timestamp",
    label: "时间",
    width: "100",
}, ...__VLS_functionalComponentArgsRest(__VLS_381));
var __VLS_359;
{
    const { footer: __VLS_thisSlot } = __VLS_355.slots;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "dialog-footer" },
    });
    const __VLS_384 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_385 = __VLS_asFunctionalComponent(__VLS_384, new __VLS_384({
        ...{ 'onClick': {} },
    }));
    const __VLS_386 = __VLS_385({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_385));
    let __VLS_388;
    let __VLS_389;
    let __VLS_390;
    const __VLS_391 = {
        onClick: (...[$event]) => {
            __VLS_ctx.allResultsVisible = false;
        }
    };
    __VLS_387.slots.default;
    var __VLS_387;
    const __VLS_392 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_393 = __VLS_asFunctionalComponent(__VLS_392, new __VLS_392({
        ...{ 'onClick': {} },
        type: "primary",
    }));
    const __VLS_394 = __VLS_393({
        ...{ 'onClick': {} },
        type: "primary",
    }, ...__VLS_functionalComponentArgsRest(__VLS_393));
    let __VLS_396;
    let __VLS_397;
    let __VLS_398;
    const __VLS_399 = {
        onClick: (__VLS_ctx.exportAllResults)
    };
    __VLS_395.slots.default;
    var __VLS_395;
}
var __VLS_355;
/** @type {__VLS_StyleScopedClasses['l4-detection']} */ ;
/** @type {__VLS_StyleScopedClasses['optimization-view']} */ ;
/** @type {__VLS_StyleScopedClasses['config-card']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header']} */ ;
/** @type {__VLS_StyleScopedClasses['progress-card']} */ ;
/** @type {__VLS_StyleScopedClasses['progress-bar']} */ ;
/** @type {__VLS_StyleScopedClasses['progress-text']} */ ;
/** @type {__VLS_StyleScopedClasses['current-best']} */ ;
/** @type {__VLS_StyleScopedClasses['trigger-info']} */ ;
/** @type {__VLS_StyleScopedClasses['trigger-str-tag']} */ ;
/** @type {__VLS_StyleScopedClasses['target-info']} */ ;
/** @type {__VLS_StyleScopedClasses['best-tokens']} */ ;
/** @type {__VLS_StyleScopedClasses['trigger-token']} */ ;
/** @type {__VLS_StyleScopedClasses['results-card']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header']} */ ;
/** @type {__VLS_StyleScopedClasses['no-improvement']} */ ;
/** @type {__VLS_StyleScopedClasses['token-tag']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-card']} */ ;
/** @type {__VLS_StyleScopedClasses['trend-chart']} */ ;
/** @type {__VLS_StyleScopedClasses['config-view']} */ ;
/** @type {__VLS_StyleScopedClasses['config-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['no-improvement']} */ ;
/** @type {__VLS_StyleScopedClasses['token-tag']} */ ;
/** @type {__VLS_StyleScopedClasses['dialog-footer']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            VChart: VChart,
            activeTab: activeTab,
            isOptimizing: isOptimizing,
            optimizationConfig: optimizationConfig,
            algorithmConfig: algorithmConfig,
            currentGeneration: currentGeneration,
            bestScore: bestScore,
            runningTime: runningTime,
            bestTriggerTokens: bestTriggerTokens,
            l4Data: l4Data,
            currentGenerationData: currentGenerationData,
            allResults: allResults,
            allResultsVisible: allResultsVisible,
            recentResults: recentResults,
            progressPercentage: progressPercentage,
            trendChartOption: trendChartOption,
            getProgressColor: getProgressColor,
            getScoreClass: getScoreClass,
            getImprovementClass: getImprovementClass,
            startOptimization: startOptimization,
            pauseOptimization: pauseOptimization,
            resetOptimization: resetOptimization,
            viewAllResults: viewAllResults,
            exportAllResults: exportAllResults,
            saveConfig: saveConfig,
            resetConfig: resetConfig,
            loadPresetConfig: loadPresetConfig,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
//# sourceMappingURL=L4Detection.vue.js.map