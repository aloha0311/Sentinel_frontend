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
const historySearch = ref('');
const optimizationConfig = ref({
    initialTokens: 'token_392 token_128 token_745',
    algorithm: 'genetic',
    maxGenerations: 100,
    populationSize: 50,
    objectiveFunction: 'malicious_score',
    mutationRate: 0.1,
    crossoverRate: 0.8,
    earlyStop: true
});
const algorithmConfig = ref({
    genetic: {
        selection: 'tournament',
        eliteRate: 0.1,
        tournamentSize: 3
    },
    cmaes: {
        stepSize: 1.0,
        populationSize: 20,
        adaptive: true
    },
    general: {
        convergenceThreshold: 0.001,
        stagnationLimit: 20,
        randomSeed: 42
    }
});
const currentGeneration = ref(50);
const bestScore = ref(85.23);
const runningTime = ref(1245);
const evaluationCount = ref(2500);
const bestTriggerTokens = ref(['token_392', 'token_128', 'token_745']);
const recentResults = ref([
    {
        generation: 50,
        score: 85.23,
        tokens: ['token_392', 'token_128', 'token_745'],
        improvement: 0.45,
        timestamp: '14:25:30'
    },
    {
        generation: 49,
        score: 84.78,
        tokens: ['token_231', 'token_445', 'token_892'],
        improvement: -0.39,
        timestamp: '14:24:15'
    },
    {
        generation: 48,
        score: 83.95,
        tokens: ['token_876', 'token_234', 'token_567'],
        improvement: 1.23,
        timestamp: '14:23:00'
    }
]);
const optimizationHistory = ref([
    {
        id: 'OPT-001',
        startTime: '2024-01-15 13:30:00',
        duration: 3600,
        finalScore: 87.45,
        generations: 75,
        status: '已完成',
        algorithm: '遗传算法',
        maxGenerations: 100,
        populationSize: 50,
        mutationRate: 0.1,
        finalTokens: ['trigger_x1', 'trigger_y2', 'trigger_z3']
    },
    {
        id: 'OPT-002',
        startTime: '2024-01-15 10:15:00',
        duration: 2400,
        finalScore: 82.31,
        generations: 60,
        status: '提前停止',
        algorithm: 'CMA-ES',
        maxGenerations: 80,
        populationSize: 30,
        mutationRate: 0.15,
        finalTokens: ['alpha_1', 'beta_2', 'gamma_3']
    }
]);
const progressPercentage = computed(() => {
    return Math.round((currentGeneration.value / optimizationConfig.value.maxGenerations) * 100);
});
const trendChartOption = ref({
    tooltip: {
        trigger: 'axis'
    },
    legend: {
        data: ['最佳得分', '平均得分', '最差得分']
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
        data: Array.from({ length: 20 }, (_, i) => (i + 1) * 5)
    },
    yAxis: {
        type: 'value',
        name: '得分'
    },
    series: [
        {
            name: '最佳得分',
            type: 'line',
            data: [65, 68, 71, 74, 76, 78, 79, 81, 82, 83, 84, 85, 85.5, 86, 86.2, 86.8, 87, 87.2, 87.4, 87.5],
            lineStyle: { color: '#52c41a' },
            symbol: 'circle',
            symbolSize: 6
        },
        {
            name: '平均得分',
            type: 'line',
            data: [45, 48, 52, 55, 58, 61, 63, 65, 67, 69, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80],
            lineStyle: { color: '#1890ff' },
            symbol: 'circle',
            symbolSize: 4
        },
        {
            name: '最差得分',
            type: 'line',
            data: [25, 28, 32, 35, 38, 41, 43, 45, 47, 49, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60],
            lineStyle: { color: '#ff4d4f' },
            symbol: 'circle',
            symbolSize: 4
        }
    ]
});
let optimizationTimer = null;
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
const getStatusType = (status) => {
    switch (status) {
        case '已完成': return 'success';
        case '运行中': return 'primary';
        case '提前停止': return 'warning';
        case '失败': return 'danger';
        default: return 'info';
    }
};
const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${minutes}m ${secs}s`;
};
const startOptimization = () => {
    isOptimizing.value = true;
    runningTime.value = 0;
    // 模拟优化过程
    optimizationTimer = setInterval(() => {
        runningTime.value += 1;
        if (currentGeneration.value < optimizationConfig.value.maxGenerations) {
            currentGeneration.value += 1;
            bestScore.value += Math.random() * 0.1 - 0.05;
            evaluationCount.value += optimizationConfig.value.populationSize;
        }
    }, 1000);
};
const pauseOptimization = () => {
    isOptimizing.value = false;
    if (optimizationTimer) {
        clearInterval(optimizationTimer);
        optimizationTimer = null;
    }
};
const resetOptimization = () => {
    pauseOptimization();
    currentGeneration.value = 0;
    bestScore.value = 0;
    runningTime.value = 0;
    evaluationCount.value = 0;
};
const viewAllResults = () => {
    console.log('查看全部结果');
};
const exportHistory = () => {
    console.log('导出历史记录');
};
const loadConfig = (history) => {
    optimizationConfig.value.algorithm = history.algorithm;
    optimizationConfig.value.maxGenerations = history.maxGenerations;
    optimizationConfig.value.populationSize = history.populationSize;
    optimizationConfig.value.mutationRate = history.mutationRate;
};
const viewHistoryDetail = (history) => {
    console.log('查看历史详情:', history);
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
});
onUnmounted(() => {
    if (optimizationTimer) {
        clearInterval(optimizationTimer);
    }
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['current-best']} */ ;
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
    span: (12),
}));
const __VLS_46 = __VLS_45({
    span: (12),
}, ...__VLS_functionalComponentArgsRest(__VLS_45));
__VLS_47.slots.default;
const __VLS_48 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({
    model: (__VLS_ctx.optimizationConfig),
    labelWidth: "120px",
}));
const __VLS_50 = __VLS_49({
    model: (__VLS_ctx.optimizationConfig),
    labelWidth: "120px",
}, ...__VLS_functionalComponentArgsRest(__VLS_49));
__VLS_51.slots.default;
const __VLS_52 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_53 = __VLS_asFunctionalComponent(__VLS_52, new __VLS_52({
    label: "初始触发令牌",
}));
const __VLS_54 = __VLS_53({
    label: "初始触发令牌",
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
}));
const __VLS_58 = __VLS_57({
    modelValue: (__VLS_ctx.optimizationConfig.initialTokens),
    type: "textarea",
    rows: (3),
    placeholder: "请输入初始 trigger tokens，例如：token_392 token_128",
}, ...__VLS_functionalComponentArgsRest(__VLS_57));
var __VLS_55;
const __VLS_60 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_61 = __VLS_asFunctionalComponent(__VLS_60, new __VLS_60({
    label: "优化算法",
}));
const __VLS_62 = __VLS_61({
    label: "优化算法",
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
    label: "CMA-ES",
    value: "cma_es",
}));
const __VLS_74 = __VLS_73({
    label: "CMA-ES",
    value: "cma_es",
}, ...__VLS_functionalComponentArgsRest(__VLS_73));
const __VLS_76 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_77 = __VLS_asFunctionalComponent(__VLS_76, new __VLS_76({
    label: "随机搜索",
    value: "random",
}));
const __VLS_78 = __VLS_77({
    label: "随机搜索",
    value: "random",
}, ...__VLS_functionalComponentArgsRest(__VLS_77));
const __VLS_80 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_81 = __VLS_asFunctionalComponent(__VLS_80, new __VLS_80({
    label: "梯度下降",
    value: "gradient",
}));
const __VLS_82 = __VLS_81({
    label: "梯度下降",
    value: "gradient",
}, ...__VLS_functionalComponentArgsRest(__VLS_81));
var __VLS_67;
var __VLS_63;
const __VLS_84 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_85 = __VLS_asFunctionalComponent(__VLS_84, new __VLS_84({
    label: "最大代数",
}));
const __VLS_86 = __VLS_85({
    label: "最大代数",
}, ...__VLS_functionalComponentArgsRest(__VLS_85));
__VLS_87.slots.default;
const __VLS_88 = {}.ElInputNumber;
/** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
// @ts-ignore
const __VLS_89 = __VLS_asFunctionalComponent(__VLS_88, new __VLS_88({
    modelValue: (__VLS_ctx.optimizationConfig.maxGenerations),
    min: (10),
    max: (1000),
    ...{ style: {} },
}));
const __VLS_90 = __VLS_89({
    modelValue: (__VLS_ctx.optimizationConfig.maxGenerations),
    min: (10),
    max: (1000),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_89));
var __VLS_87;
const __VLS_92 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_93 = __VLS_asFunctionalComponent(__VLS_92, new __VLS_92({
    label: "种群大小",
}));
const __VLS_94 = __VLS_93({
    label: "种群大小",
}, ...__VLS_functionalComponentArgsRest(__VLS_93));
__VLS_95.slots.default;
const __VLS_96 = {}.ElInputNumber;
/** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
// @ts-ignore
const __VLS_97 = __VLS_asFunctionalComponent(__VLS_96, new __VLS_96({
    modelValue: (__VLS_ctx.optimizationConfig.populationSize),
    min: (10),
    max: (200),
    ...{ style: {} },
}));
const __VLS_98 = __VLS_97({
    modelValue: (__VLS_ctx.optimizationConfig.populationSize),
    min: (10),
    max: (200),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_97));
var __VLS_95;
var __VLS_51;
var __VLS_47;
const __VLS_100 = {}.ElCol;
/** @type {[typeof __VLS_components.ElCol, typeof __VLS_components.elCol, typeof __VLS_components.ElCol, typeof __VLS_components.elCol, ]} */ ;
// @ts-ignore
const __VLS_101 = __VLS_asFunctionalComponent(__VLS_100, new __VLS_100({
    span: (12),
}));
const __VLS_102 = __VLS_101({
    span: (12),
}, ...__VLS_functionalComponentArgsRest(__VLS_101));
__VLS_103.slots.default;
const __VLS_104 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_105 = __VLS_asFunctionalComponent(__VLS_104, new __VLS_104({
    model: (__VLS_ctx.optimizationConfig),
    labelWidth: "120px",
}));
const __VLS_106 = __VLS_105({
    model: (__VLS_ctx.optimizationConfig),
    labelWidth: "120px",
}, ...__VLS_functionalComponentArgsRest(__VLS_105));
__VLS_107.slots.default;
const __VLS_108 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_109 = __VLS_asFunctionalComponent(__VLS_108, new __VLS_108({
    label: "目标函数",
}));
const __VLS_110 = __VLS_109({
    label: "目标函数",
}, ...__VLS_functionalComponentArgsRest(__VLS_109));
__VLS_111.slots.default;
const __VLS_112 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_113 = __VLS_asFunctionalComponent(__VLS_112, new __VLS_112({
    modelValue: (__VLS_ctx.optimizationConfig.objectiveFunction),
    ...{ style: {} },
}));
const __VLS_114 = __VLS_113({
    modelValue: (__VLS_ctx.optimizationConfig.objectiveFunction),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_113));
__VLS_115.slots.default;
const __VLS_116 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_117 = __VLS_asFunctionalComponent(__VLS_116, new __VLS_116({
    label: "恶意响应评分",
    value: "malicious_score",
}));
const __VLS_118 = __VLS_117({
    label: "恶意响应评分",
    value: "malicious_score",
}, ...__VLS_functionalComponentArgsRest(__VLS_117));
const __VLS_120 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_121 = __VLS_asFunctionalComponent(__VLS_120, new __VLS_120({
    label: "策略违反度",
    value: "policy_violation",
}));
const __VLS_122 = __VLS_121({
    label: "策略违反度",
    value: "policy_violation",
}, ...__VLS_functionalComponentArgsRest(__VLS_121));
const __VLS_124 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_125 = __VLS_asFunctionalComponent(__VLS_124, new __VLS_124({
    label: "安全绕过率",
    value: "safety_bypass",
}));
const __VLS_126 = __VLS_125({
    label: "安全绕过率",
    value: "safety_bypass",
}, ...__VLS_functionalComponentArgsRest(__VLS_125));
var __VLS_115;
var __VLS_111;
const __VLS_128 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_129 = __VLS_asFunctionalComponent(__VLS_128, new __VLS_128({
    label: "变异率",
}));
const __VLS_130 = __VLS_129({
    label: "变异率",
}, ...__VLS_functionalComponentArgsRest(__VLS_129));
__VLS_131.slots.default;
const __VLS_132 = {}.ElSlider;
/** @type {[typeof __VLS_components.ElSlider, typeof __VLS_components.elSlider, ]} */ ;
// @ts-ignore
const __VLS_133 = __VLS_asFunctionalComponent(__VLS_132, new __VLS_132({
    modelValue: (__VLS_ctx.optimizationConfig.mutationRate),
    min: (0.01),
    max: (1),
    step: (0.01),
    showInput: true,
}));
const __VLS_134 = __VLS_133({
    modelValue: (__VLS_ctx.optimizationConfig.mutationRate),
    min: (0.01),
    max: (1),
    step: (0.01),
    showInput: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_133));
var __VLS_131;
const __VLS_136 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_137 = __VLS_asFunctionalComponent(__VLS_136, new __VLS_136({
    label: "交叉率",
}));
const __VLS_138 = __VLS_137({
    label: "交叉率",
}, ...__VLS_functionalComponentArgsRest(__VLS_137));
__VLS_139.slots.default;
const __VLS_140 = {}.ElSlider;
/** @type {[typeof __VLS_components.ElSlider, typeof __VLS_components.elSlider, ]} */ ;
// @ts-ignore
const __VLS_141 = __VLS_asFunctionalComponent(__VLS_140, new __VLS_140({
    modelValue: (__VLS_ctx.optimizationConfig.crossoverRate),
    min: (0.01),
    max: (1),
    step: (0.01),
    showInput: true,
}));
const __VLS_142 = __VLS_141({
    modelValue: (__VLS_ctx.optimizationConfig.crossoverRate),
    min: (0.01),
    max: (1),
    step: (0.01),
    showInput: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_141));
var __VLS_139;
const __VLS_144 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_145 = __VLS_asFunctionalComponent(__VLS_144, new __VLS_144({
    label: "提前停止",
}));
const __VLS_146 = __VLS_145({
    label: "提前停止",
}, ...__VLS_functionalComponentArgsRest(__VLS_145));
__VLS_147.slots.default;
const __VLS_148 = {}.ElSwitch;
/** @type {[typeof __VLS_components.ElSwitch, typeof __VLS_components.elSwitch, ]} */ ;
// @ts-ignore
const __VLS_149 = __VLS_asFunctionalComponent(__VLS_148, new __VLS_148({
    modelValue: (__VLS_ctx.optimizationConfig.earlyStop),
    activeText: "启用",
    inactiveText: "禁用",
}));
const __VLS_150 = __VLS_149({
    modelValue: (__VLS_ctx.optimizationConfig.earlyStop),
    activeText: "启用",
    inactiveText: "禁用",
}, ...__VLS_functionalComponentArgsRest(__VLS_149));
var __VLS_147;
var __VLS_107;
var __VLS_103;
var __VLS_43;
var __VLS_11;
const __VLS_152 = {}.ElCard;
/** @type {[typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ]} */ ;
// @ts-ignore
const __VLS_153 = __VLS_asFunctionalComponent(__VLS_152, new __VLS_152({
    ...{ class: "progress-card" },
}));
const __VLS_154 = __VLS_153({
    ...{ class: "progress-card" },
}, ...__VLS_functionalComponentArgsRest(__VLS_153));
__VLS_155.slots.default;
{
    const { header: __VLS_thisSlot } = __VLS_155.slots;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
}
const __VLS_156 = {}.ElRow;
/** @type {[typeof __VLS_components.ElRow, typeof __VLS_components.elRow, typeof __VLS_components.ElRow, typeof __VLS_components.elRow, ]} */ ;
// @ts-ignore
const __VLS_157 = __VLS_asFunctionalComponent(__VLS_156, new __VLS_156({
    gutter: (20),
}));
const __VLS_158 = __VLS_157({
    gutter: (20),
}, ...__VLS_functionalComponentArgsRest(__VLS_157));
__VLS_159.slots.default;
const __VLS_160 = {}.ElCol;
/** @type {[typeof __VLS_components.ElCol, typeof __VLS_components.elCol, typeof __VLS_components.ElCol, typeof __VLS_components.elCol, ]} */ ;
// @ts-ignore
const __VLS_161 = __VLS_asFunctionalComponent(__VLS_160, new __VLS_160({
    span: (6),
}));
const __VLS_162 = __VLS_161({
    span: (6),
}, ...__VLS_functionalComponentArgsRest(__VLS_161));
__VLS_163.slots.default;
const __VLS_164 = {}.ElStatistic;
/** @type {[typeof __VLS_components.ElStatistic, typeof __VLS_components.elStatistic, typeof __VLS_components.ElStatistic, typeof __VLS_components.elStatistic, ]} */ ;
// @ts-ignore
const __VLS_165 = __VLS_asFunctionalComponent(__VLS_164, new __VLS_164({
    title: "当前代数",
    value: (__VLS_ctx.currentGeneration),
}));
const __VLS_166 = __VLS_165({
    title: "当前代数",
    value: (__VLS_ctx.currentGeneration),
}, ...__VLS_functionalComponentArgsRest(__VLS_165));
__VLS_167.slots.default;
{
    const { suffix: __VLS_thisSlot } = __VLS_167.slots;
    (__VLS_ctx.optimizationConfig.maxGenerations);
}
var __VLS_167;
var __VLS_163;
const __VLS_168 = {}.ElCol;
/** @type {[typeof __VLS_components.ElCol, typeof __VLS_components.elCol, typeof __VLS_components.ElCol, typeof __VLS_components.elCol, ]} */ ;
// @ts-ignore
const __VLS_169 = __VLS_asFunctionalComponent(__VLS_168, new __VLS_168({
    span: (6),
}));
const __VLS_170 = __VLS_169({
    span: (6),
}, ...__VLS_functionalComponentArgsRest(__VLS_169));
__VLS_171.slots.default;
const __VLS_172 = {}.ElStatistic;
/** @type {[typeof __VLS_components.ElStatistic, typeof __VLS_components.elStatistic, ]} */ ;
// @ts-ignore
const __VLS_173 = __VLS_asFunctionalComponent(__VLS_172, new __VLS_172({
    title: "最佳得分",
    value: (__VLS_ctx.bestScore),
    precision: (2),
}));
const __VLS_174 = __VLS_173({
    title: "最佳得分",
    value: (__VLS_ctx.bestScore),
    precision: (2),
}, ...__VLS_functionalComponentArgsRest(__VLS_173));
var __VLS_171;
const __VLS_176 = {}.ElCol;
/** @type {[typeof __VLS_components.ElCol, typeof __VLS_components.elCol, typeof __VLS_components.ElCol, typeof __VLS_components.elCol, ]} */ ;
// @ts-ignore
const __VLS_177 = __VLS_asFunctionalComponent(__VLS_176, new __VLS_176({
    span: (6),
}));
const __VLS_178 = __VLS_177({
    span: (6),
}, ...__VLS_functionalComponentArgsRest(__VLS_177));
__VLS_179.slots.default;
const __VLS_180 = {}.ElStatistic;
/** @type {[typeof __VLS_components.ElStatistic, typeof __VLS_components.elStatistic, ]} */ ;
// @ts-ignore
const __VLS_181 = __VLS_asFunctionalComponent(__VLS_180, new __VLS_180({
    title: "运行时间",
    value: (__VLS_ctx.runningTime),
    suffix: "秒",
}));
const __VLS_182 = __VLS_181({
    title: "运行时间",
    value: (__VLS_ctx.runningTime),
    suffix: "秒",
}, ...__VLS_functionalComponentArgsRest(__VLS_181));
var __VLS_179;
const __VLS_184 = {}.ElCol;
/** @type {[typeof __VLS_components.ElCol, typeof __VLS_components.elCol, typeof __VLS_components.ElCol, typeof __VLS_components.elCol, ]} */ ;
// @ts-ignore
const __VLS_185 = __VLS_asFunctionalComponent(__VLS_184, new __VLS_184({
    span: (6),
}));
const __VLS_186 = __VLS_185({
    span: (6),
}, ...__VLS_functionalComponentArgsRest(__VLS_185));
__VLS_187.slots.default;
const __VLS_188 = {}.ElStatistic;
/** @type {[typeof __VLS_components.ElStatistic, typeof __VLS_components.elStatistic, ]} */ ;
// @ts-ignore
const __VLS_189 = __VLS_asFunctionalComponent(__VLS_188, new __VLS_188({
    title: "评估次数",
    value: (__VLS_ctx.evaluationCount),
}));
const __VLS_190 = __VLS_189({
    title: "评估次数",
    value: (__VLS_ctx.evaluationCount),
}, ...__VLS_functionalComponentArgsRest(__VLS_189));
var __VLS_187;
var __VLS_159;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "progress-bar" },
});
const __VLS_192 = {}.ElProgress;
/** @type {[typeof __VLS_components.ElProgress, typeof __VLS_components.elProgress, typeof __VLS_components.ElProgress, typeof __VLS_components.elProgress, ]} */ ;
// @ts-ignore
const __VLS_193 = __VLS_asFunctionalComponent(__VLS_192, new __VLS_192({
    percentage: (__VLS_ctx.progressPercentage),
    strokeWidth: (15),
    color: (__VLS_ctx.getProgressColor(__VLS_ctx.progressPercentage)),
}));
const __VLS_194 = __VLS_193({
    percentage: (__VLS_ctx.progressPercentage),
    strokeWidth: (15),
    color: (__VLS_ctx.getProgressColor(__VLS_ctx.progressPercentage)),
}, ...__VLS_functionalComponentArgsRest(__VLS_193));
__VLS_195.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_195.slots;
    const [{ percentage }] = __VLS_getSlotParams(__VLS_thisSlot);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "progress-text" },
    });
    (percentage);
}
var __VLS_195;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "current-best" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({});
for (const [token, index] of __VLS_getVForSourceType((__VLS_ctx.bestTriggerTokens))) {
    const __VLS_196 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_197 = __VLS_asFunctionalComponent(__VLS_196, new __VLS_196({
        key: (index),
        type: "primary",
        ...{ class: "trigger-token" },
    }));
    const __VLS_198 = __VLS_197({
        key: (index),
        type: "primary",
        ...{ class: "trigger-token" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_197));
    __VLS_199.slots.default;
    (token);
    var __VLS_199;
}
var __VLS_155;
const __VLS_200 = {}.ElCard;
/** @type {[typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ]} */ ;
// @ts-ignore
const __VLS_201 = __VLS_asFunctionalComponent(__VLS_200, new __VLS_200({
    ...{ class: "results-card" },
}));
const __VLS_202 = __VLS_201({
    ...{ class: "results-card" },
}, ...__VLS_functionalComponentArgsRest(__VLS_201));
__VLS_203.slots.default;
{
    const { header: __VLS_thisSlot } = __VLS_203.slots;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card-header" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    const __VLS_204 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_205 = __VLS_asFunctionalComponent(__VLS_204, new __VLS_204({
        ...{ 'onClick': {} },
        type: "text",
    }));
    const __VLS_206 = __VLS_205({
        ...{ 'onClick': {} },
        type: "text",
    }, ...__VLS_functionalComponentArgsRest(__VLS_205));
    let __VLS_208;
    let __VLS_209;
    let __VLS_210;
    const __VLS_211 = {
        onClick: (__VLS_ctx.viewAllResults)
    };
    __VLS_207.slots.default;
    var __VLS_207;
}
const __VLS_212 = {}.ElTable;
/** @type {[typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ]} */ ;
// @ts-ignore
const __VLS_213 = __VLS_asFunctionalComponent(__VLS_212, new __VLS_212({
    data: (__VLS_ctx.recentResults),
    maxHeight: "300",
}));
const __VLS_214 = __VLS_213({
    data: (__VLS_ctx.recentResults),
    maxHeight: "300",
}, ...__VLS_functionalComponentArgsRest(__VLS_213));
__VLS_215.slots.default;
const __VLS_216 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_217 = __VLS_asFunctionalComponent(__VLS_216, new __VLS_216({
    prop: "generation",
    label: "代数",
    width: "80",
}));
const __VLS_218 = __VLS_217({
    prop: "generation",
    label: "代数",
    width: "80",
}, ...__VLS_functionalComponentArgsRest(__VLS_217));
const __VLS_220 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_221 = __VLS_asFunctionalComponent(__VLS_220, new __VLS_220({
    prop: "score",
    label: "得分",
    width: "100",
}));
const __VLS_222 = __VLS_221({
    prop: "score",
    label: "得分",
    width: "100",
}, ...__VLS_functionalComponentArgsRest(__VLS_221));
__VLS_223.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_223.slots;
    const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: (__VLS_ctx.getScoreClass(row.score)) },
    });
    (row.score.toFixed(2));
}
var __VLS_223;
const __VLS_224 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_225 = __VLS_asFunctionalComponent(__VLS_224, new __VLS_224({
    prop: "tokens",
    label: "触发令牌",
    minWidth: "200",
}));
const __VLS_226 = __VLS_225({
    prop: "tokens",
    label: "触发令牌",
    minWidth: "200",
}, ...__VLS_functionalComponentArgsRest(__VLS_225));
__VLS_227.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_227.slots;
    const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
    for (const [token, index] of __VLS_getVForSourceType((row.tokens))) {
        const __VLS_228 = {}.ElTag;
        /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
        // @ts-ignore
        const __VLS_229 = __VLS_asFunctionalComponent(__VLS_228, new __VLS_228({
            key: (index),
            size: "small",
            ...{ class: "token-tag" },
        }));
        const __VLS_230 = __VLS_229({
            key: (index),
            size: "small",
            ...{ class: "token-tag" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_229));
        __VLS_231.slots.default;
        (token);
        var __VLS_231;
    }
}
var __VLS_227;
const __VLS_232 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_233 = __VLS_asFunctionalComponent(__VLS_232, new __VLS_232({
    prop: "improvement",
    label: "改进",
    width: "100",
}));
const __VLS_234 = __VLS_233({
    prop: "improvement",
    label: "改进",
    width: "100",
}, ...__VLS_functionalComponentArgsRest(__VLS_233));
__VLS_235.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_235.slots;
    const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
    const __VLS_236 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_237 = __VLS_asFunctionalComponent(__VLS_236, new __VLS_236({
        type: (row.improvement > 0 ? 'success' : 'info'),
        size: "small",
    }));
    const __VLS_238 = __VLS_237({
        type: (row.improvement > 0 ? 'success' : 'info'),
        size: "small",
    }, ...__VLS_functionalComponentArgsRest(__VLS_237));
    __VLS_239.slots.default;
    (row.improvement > 0 ? '+' : '');
    (row.improvement.toFixed(2));
    var __VLS_239;
}
var __VLS_235;
const __VLS_240 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_241 = __VLS_asFunctionalComponent(__VLS_240, new __VLS_240({
    prop: "timestamp",
    label: "时间",
    width: "160",
}));
const __VLS_242 = __VLS_241({
    prop: "timestamp",
    label: "时间",
    width: "160",
}, ...__VLS_functionalComponentArgsRest(__VLS_241));
var __VLS_215;
var __VLS_203;
const __VLS_244 = {}.ElCard;
/** @type {[typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ]} */ ;
// @ts-ignore
const __VLS_245 = __VLS_asFunctionalComponent(__VLS_244, new __VLS_244({
    ...{ class: "chart-card" },
}));
const __VLS_246 = __VLS_245({
    ...{ class: "chart-card" },
}, ...__VLS_functionalComponentArgsRest(__VLS_245));
__VLS_247.slots.default;
{
    const { header: __VLS_thisSlot } = __VLS_247.slots;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
}
const __VLS_248 = {}.VChart;
/** @type {[typeof __VLS_components.VChart, typeof __VLS_components.vChart, ]} */ ;
// @ts-ignore
const __VLS_249 = __VLS_asFunctionalComponent(__VLS_248, new __VLS_248({
    ...{ class: "trend-chart" },
    option: (__VLS_ctx.trendChartOption),
}));
const __VLS_250 = __VLS_249({
    ...{ class: "trend-chart" },
    option: (__VLS_ctx.trendChartOption),
}, ...__VLS_functionalComponentArgsRest(__VLS_249));
var __VLS_247;
var __VLS_7;
const __VLS_252 = {}.ElTabPane;
/** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
// @ts-ignore
const __VLS_253 = __VLS_asFunctionalComponent(__VLS_252, new __VLS_252({
    label: "历史优化记录",
    name: "history",
}));
const __VLS_254 = __VLS_253({
    label: "历史优化记录",
    name: "history",
}, ...__VLS_functionalComponentArgsRest(__VLS_253));
__VLS_255.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "history-view" },
});
const __VLS_256 = {}.ElCard;
/** @type {[typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ]} */ ;
// @ts-ignore
const __VLS_257 = __VLS_asFunctionalComponent(__VLS_256, new __VLS_256({}));
const __VLS_258 = __VLS_257({}, ...__VLS_functionalComponentArgsRest(__VLS_257));
__VLS_259.slots.default;
{
    const { header: __VLS_thisSlot } = __VLS_259.slots;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card-header" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    const __VLS_260 = {}.ElSpace;
    /** @type {[typeof __VLS_components.ElSpace, typeof __VLS_components.elSpace, typeof __VLS_components.ElSpace, typeof __VLS_components.elSpace, ]} */ ;
    // @ts-ignore
    const __VLS_261 = __VLS_asFunctionalComponent(__VLS_260, new __VLS_260({}));
    const __VLS_262 = __VLS_261({}, ...__VLS_functionalComponentArgsRest(__VLS_261));
    __VLS_263.slots.default;
    const __VLS_264 = {}.ElInput;
    /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
    // @ts-ignore
    const __VLS_265 = __VLS_asFunctionalComponent(__VLS_264, new __VLS_264({
        modelValue: (__VLS_ctx.historySearch),
        placeholder: "搜索历史记录...",
        ...{ style: {} },
        clearable: true,
    }));
    const __VLS_266 = __VLS_265({
        modelValue: (__VLS_ctx.historySearch),
        placeholder: "搜索历史记录...",
        ...{ style: {} },
        clearable: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_265));
    const __VLS_268 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_269 = __VLS_asFunctionalComponent(__VLS_268, new __VLS_268({
        ...{ 'onClick': {} },
    }));
    const __VLS_270 = __VLS_269({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_269));
    let __VLS_272;
    let __VLS_273;
    let __VLS_274;
    const __VLS_275 = {
        onClick: (__VLS_ctx.exportHistory)
    };
    __VLS_271.slots.default;
    var __VLS_271;
    var __VLS_263;
}
const __VLS_276 = {}.ElTable;
/** @type {[typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ]} */ ;
// @ts-ignore
const __VLS_277 = __VLS_asFunctionalComponent(__VLS_276, new __VLS_276({
    data: (__VLS_ctx.optimizationHistory),
    ...{ style: {} },
}));
const __VLS_278 = __VLS_277({
    data: (__VLS_ctx.optimizationHistory),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_277));
__VLS_279.slots.default;
const __VLS_280 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_281 = __VLS_asFunctionalComponent(__VLS_280, new __VLS_280({
    type: "expand",
}));
const __VLS_282 = __VLS_281({
    type: "expand",
}, ...__VLS_functionalComponentArgsRest(__VLS_281));
__VLS_283.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_283.slots;
    const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "history-detail" },
    });
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
        span: (12),
    }));
    const __VLS_290 = __VLS_289({
        span: (12),
    }, ...__VLS_functionalComponentArgsRest(__VLS_289));
    __VLS_291.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({});
    const __VLS_292 = {}.ElDescriptions;
    /** @type {[typeof __VLS_components.ElDescriptions, typeof __VLS_components.elDescriptions, typeof __VLS_components.ElDescriptions, typeof __VLS_components.elDescriptions, ]} */ ;
    // @ts-ignore
    const __VLS_293 = __VLS_asFunctionalComponent(__VLS_292, new __VLS_292({
        column: (1),
        border: true,
        size: "small",
    }));
    const __VLS_294 = __VLS_293({
        column: (1),
        border: true,
        size: "small",
    }, ...__VLS_functionalComponentArgsRest(__VLS_293));
    __VLS_295.slots.default;
    const __VLS_296 = {}.ElDescriptionsItem;
    /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
    // @ts-ignore
    const __VLS_297 = __VLS_asFunctionalComponent(__VLS_296, new __VLS_296({
        label: "算法",
    }));
    const __VLS_298 = __VLS_297({
        label: "算法",
    }, ...__VLS_functionalComponentArgsRest(__VLS_297));
    __VLS_299.slots.default;
    (row.algorithm);
    var __VLS_299;
    const __VLS_300 = {}.ElDescriptionsItem;
    /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
    // @ts-ignore
    const __VLS_301 = __VLS_asFunctionalComponent(__VLS_300, new __VLS_300({
        label: "最大代数",
    }));
    const __VLS_302 = __VLS_301({
        label: "最大代数",
    }, ...__VLS_functionalComponentArgsRest(__VLS_301));
    __VLS_303.slots.default;
    (row.maxGenerations);
    var __VLS_303;
    const __VLS_304 = {}.ElDescriptionsItem;
    /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
    // @ts-ignore
    const __VLS_305 = __VLS_asFunctionalComponent(__VLS_304, new __VLS_304({
        label: "种群大小",
    }));
    const __VLS_306 = __VLS_305({
        label: "种群大小",
    }, ...__VLS_functionalComponentArgsRest(__VLS_305));
    __VLS_307.slots.default;
    (row.populationSize);
    var __VLS_307;
    const __VLS_308 = {}.ElDescriptionsItem;
    /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
    // @ts-ignore
    const __VLS_309 = __VLS_asFunctionalComponent(__VLS_308, new __VLS_308({
        label: "变异率",
    }));
    const __VLS_310 = __VLS_309({
        label: "变异率",
    }, ...__VLS_functionalComponentArgsRest(__VLS_309));
    __VLS_311.slots.default;
    (row.mutationRate);
    var __VLS_311;
    var __VLS_295;
    var __VLS_291;
    const __VLS_312 = {}.ElCol;
    /** @type {[typeof __VLS_components.ElCol, typeof __VLS_components.elCol, typeof __VLS_components.ElCol, typeof __VLS_components.elCol, ]} */ ;
    // @ts-ignore
    const __VLS_313 = __VLS_asFunctionalComponent(__VLS_312, new __VLS_312({
        span: (12),
    }));
    const __VLS_314 = __VLS_313({
        span: (12),
    }, ...__VLS_functionalComponentArgsRest(__VLS_313));
    __VLS_315.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "final-tokens" },
    });
    for (const [token, index] of __VLS_getVForSourceType((row.finalTokens))) {
        const __VLS_316 = {}.ElTag;
        /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
        // @ts-ignore
        const __VLS_317 = __VLS_asFunctionalComponent(__VLS_316, new __VLS_316({
            key: (index),
            type: "success",
            ...{ class: "final-token" },
        }));
        const __VLS_318 = __VLS_317({
            key: (index),
            type: "success",
            ...{ class: "final-token" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_317));
        __VLS_319.slots.default;
        (token);
        var __VLS_319;
    }
    var __VLS_315;
    var __VLS_287;
}
var __VLS_283;
const __VLS_320 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_321 = __VLS_asFunctionalComponent(__VLS_320, new __VLS_320({
    prop: "id",
    label: "记录ID",
    width: "120",
}));
const __VLS_322 = __VLS_321({
    prop: "id",
    label: "记录ID",
    width: "120",
}, ...__VLS_functionalComponentArgsRest(__VLS_321));
const __VLS_324 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_325 = __VLS_asFunctionalComponent(__VLS_324, new __VLS_324({
    prop: "startTime",
    label: "开始时间",
    width: "160",
}));
const __VLS_326 = __VLS_325({
    prop: "startTime",
    label: "开始时间",
    width: "160",
}, ...__VLS_functionalComponentArgsRest(__VLS_325));
const __VLS_328 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_329 = __VLS_asFunctionalComponent(__VLS_328, new __VLS_328({
    prop: "duration",
    label: "持续时间",
    width: "120",
}));
const __VLS_330 = __VLS_329({
    prop: "duration",
    label: "持续时间",
    width: "120",
}, ...__VLS_functionalComponentArgsRest(__VLS_329));
__VLS_331.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_331.slots;
    const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
    (__VLS_ctx.formatDuration(row.duration));
}
var __VLS_331;
const __VLS_332 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_333 = __VLS_asFunctionalComponent(__VLS_332, new __VLS_332({
    prop: "finalScore",
    label: "最终得分",
    width: "120",
}));
const __VLS_334 = __VLS_333({
    prop: "finalScore",
    label: "最终得分",
    width: "120",
}, ...__VLS_functionalComponentArgsRest(__VLS_333));
__VLS_335.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_335.slots;
    const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: (__VLS_ctx.getScoreClass(row.finalScore)) },
    });
    (row.finalScore.toFixed(2));
}
var __VLS_335;
const __VLS_336 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_337 = __VLS_asFunctionalComponent(__VLS_336, new __VLS_336({
    prop: "generations",
    label: "执行代数",
    width: "100",
}));
const __VLS_338 = __VLS_337({
    prop: "generations",
    label: "执行代数",
    width: "100",
}, ...__VLS_functionalComponentArgsRest(__VLS_337));
const __VLS_340 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_341 = __VLS_asFunctionalComponent(__VLS_340, new __VLS_340({
    prop: "status",
    label: "状态",
    width: "100",
}));
const __VLS_342 = __VLS_341({
    prop: "status",
    label: "状态",
    width: "100",
}, ...__VLS_functionalComponentArgsRest(__VLS_341));
__VLS_343.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_343.slots;
    const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
    const __VLS_344 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_345 = __VLS_asFunctionalComponent(__VLS_344, new __VLS_344({
        type: (__VLS_ctx.getStatusType(row.status)),
    }));
    const __VLS_346 = __VLS_345({
        type: (__VLS_ctx.getStatusType(row.status)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_345));
    __VLS_347.slots.default;
    (row.status);
    var __VLS_347;
}
var __VLS_343;
const __VLS_348 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_349 = __VLS_asFunctionalComponent(__VLS_348, new __VLS_348({
    label: "操作",
    width: "150",
}));
const __VLS_350 = __VLS_349({
    label: "操作",
    width: "150",
}, ...__VLS_functionalComponentArgsRest(__VLS_349));
__VLS_351.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_351.slots;
    const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
    const __VLS_352 = {}.ElSpace;
    /** @type {[typeof __VLS_components.ElSpace, typeof __VLS_components.elSpace, typeof __VLS_components.ElSpace, typeof __VLS_components.elSpace, ]} */ ;
    // @ts-ignore
    const __VLS_353 = __VLS_asFunctionalComponent(__VLS_352, new __VLS_352({}));
    const __VLS_354 = __VLS_353({}, ...__VLS_functionalComponentArgsRest(__VLS_353));
    __VLS_355.slots.default;
    const __VLS_356 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_357 = __VLS_asFunctionalComponent(__VLS_356, new __VLS_356({
        ...{ 'onClick': {} },
        type: "text",
        size: "small",
    }));
    const __VLS_358 = __VLS_357({
        ...{ 'onClick': {} },
        type: "text",
        size: "small",
    }, ...__VLS_functionalComponentArgsRest(__VLS_357));
    let __VLS_360;
    let __VLS_361;
    let __VLS_362;
    const __VLS_363 = {
        onClick: (...[$event]) => {
            __VLS_ctx.loadConfig(row);
        }
    };
    __VLS_359.slots.default;
    var __VLS_359;
    const __VLS_364 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_365 = __VLS_asFunctionalComponent(__VLS_364, new __VLS_364({
        ...{ 'onClick': {} },
        type: "text",
        size: "small",
    }));
    const __VLS_366 = __VLS_365({
        ...{ 'onClick': {} },
        type: "text",
        size: "small",
    }, ...__VLS_functionalComponentArgsRest(__VLS_365));
    let __VLS_368;
    let __VLS_369;
    let __VLS_370;
    const __VLS_371 = {
        onClick: (...[$event]) => {
            __VLS_ctx.viewHistoryDetail(row);
        }
    };
    __VLS_367.slots.default;
    var __VLS_367;
    var __VLS_355;
}
var __VLS_351;
var __VLS_279;
var __VLS_259;
var __VLS_255;
const __VLS_372 = {}.ElTabPane;
/** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
// @ts-ignore
const __VLS_373 = __VLS_asFunctionalComponent(__VLS_372, new __VLS_372({
    label: "算法参数配置",
    name: "config",
}));
const __VLS_374 = __VLS_373({
    label: "算法参数配置",
    name: "config",
}, ...__VLS_functionalComponentArgsRest(__VLS_373));
__VLS_375.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "config-view" },
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
const __VLS_384 = {}.ElCard;
/** @type {[typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ]} */ ;
// @ts-ignore
const __VLS_385 = __VLS_asFunctionalComponent(__VLS_384, new __VLS_384({}));
const __VLS_386 = __VLS_385({}, ...__VLS_functionalComponentArgsRest(__VLS_385));
__VLS_387.slots.default;
{
    const { header: __VLS_thisSlot } = __VLS_387.slots;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
}
const __VLS_388 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_389 = __VLS_asFunctionalComponent(__VLS_388, new __VLS_388({
    model: (__VLS_ctx.algorithmConfig.genetic),
    labelWidth: "120px",
}));
const __VLS_390 = __VLS_389({
    model: (__VLS_ctx.algorithmConfig.genetic),
    labelWidth: "120px",
}, ...__VLS_functionalComponentArgsRest(__VLS_389));
__VLS_391.slots.default;
const __VLS_392 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_393 = __VLS_asFunctionalComponent(__VLS_392, new __VLS_392({
    label: "选择策略",
}));
const __VLS_394 = __VLS_393({
    label: "选择策略",
}, ...__VLS_functionalComponentArgsRest(__VLS_393));
__VLS_395.slots.default;
const __VLS_396 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_397 = __VLS_asFunctionalComponent(__VLS_396, new __VLS_396({
    modelValue: (__VLS_ctx.algorithmConfig.genetic.selection),
    ...{ style: {} },
}));
const __VLS_398 = __VLS_397({
    modelValue: (__VLS_ctx.algorithmConfig.genetic.selection),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_397));
__VLS_399.slots.default;
const __VLS_400 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_401 = __VLS_asFunctionalComponent(__VLS_400, new __VLS_400({
    label: "轮盘赌选择",
    value: "roulette",
}));
const __VLS_402 = __VLS_401({
    label: "轮盘赌选择",
    value: "roulette",
}, ...__VLS_functionalComponentArgsRest(__VLS_401));
const __VLS_404 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_405 = __VLS_asFunctionalComponent(__VLS_404, new __VLS_404({
    label: "锦标赛选择",
    value: "tournament",
}));
const __VLS_406 = __VLS_405({
    label: "锦标赛选择",
    value: "tournament",
}, ...__VLS_functionalComponentArgsRest(__VLS_405));
const __VLS_408 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_409 = __VLS_asFunctionalComponent(__VLS_408, new __VLS_408({
    label: "排序选择",
    value: "rank",
}));
const __VLS_410 = __VLS_409({
    label: "排序选择",
    value: "rank",
}, ...__VLS_functionalComponentArgsRest(__VLS_409));
var __VLS_399;
var __VLS_395;
const __VLS_412 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_413 = __VLS_asFunctionalComponent(__VLS_412, new __VLS_412({
    label: "精英保留率",
}));
const __VLS_414 = __VLS_413({
    label: "精英保留率",
}, ...__VLS_functionalComponentArgsRest(__VLS_413));
__VLS_415.slots.default;
const __VLS_416 = {}.ElSlider;
/** @type {[typeof __VLS_components.ElSlider, typeof __VLS_components.elSlider, ]} */ ;
// @ts-ignore
const __VLS_417 = __VLS_asFunctionalComponent(__VLS_416, new __VLS_416({
    modelValue: (__VLS_ctx.algorithmConfig.genetic.eliteRate),
    min: (0),
    max: (0.5),
    step: (0.05),
    showInput: true,
}));
const __VLS_418 = __VLS_417({
    modelValue: (__VLS_ctx.algorithmConfig.genetic.eliteRate),
    min: (0),
    max: (0.5),
    step: (0.05),
    showInput: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_417));
var __VLS_415;
const __VLS_420 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_421 = __VLS_asFunctionalComponent(__VLS_420, new __VLS_420({
    label: "锦标赛规模",
}));
const __VLS_422 = __VLS_421({
    label: "锦标赛规模",
}, ...__VLS_functionalComponentArgsRest(__VLS_421));
__VLS_423.slots.default;
const __VLS_424 = {}.ElInputNumber;
/** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
// @ts-ignore
const __VLS_425 = __VLS_asFunctionalComponent(__VLS_424, new __VLS_424({
    modelValue: (__VLS_ctx.algorithmConfig.genetic.tournamentSize),
    min: (2),
    max: (10),
    ...{ style: {} },
}));
const __VLS_426 = __VLS_425({
    modelValue: (__VLS_ctx.algorithmConfig.genetic.tournamentSize),
    min: (2),
    max: (10),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_425));
var __VLS_423;
var __VLS_391;
var __VLS_387;
var __VLS_383;
const __VLS_428 = {}.ElCol;
/** @type {[typeof __VLS_components.ElCol, typeof __VLS_components.elCol, typeof __VLS_components.ElCol, typeof __VLS_components.elCol, ]} */ ;
// @ts-ignore
const __VLS_429 = __VLS_asFunctionalComponent(__VLS_428, new __VLS_428({
    span: (12),
}));
const __VLS_430 = __VLS_429({
    span: (12),
}, ...__VLS_functionalComponentArgsRest(__VLS_429));
__VLS_431.slots.default;
const __VLS_432 = {}.ElCard;
/** @type {[typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ]} */ ;
// @ts-ignore
const __VLS_433 = __VLS_asFunctionalComponent(__VLS_432, new __VLS_432({}));
const __VLS_434 = __VLS_433({}, ...__VLS_functionalComponentArgsRest(__VLS_433));
__VLS_435.slots.default;
{
    const { header: __VLS_thisSlot } = __VLS_435.slots;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
}
const __VLS_436 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_437 = __VLS_asFunctionalComponent(__VLS_436, new __VLS_436({
    model: (__VLS_ctx.algorithmConfig.cmaes),
    labelWidth: "120px",
}));
const __VLS_438 = __VLS_437({
    model: (__VLS_ctx.algorithmConfig.cmaes),
    labelWidth: "120px",
}, ...__VLS_functionalComponentArgsRest(__VLS_437));
__VLS_439.slots.default;
const __VLS_440 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_441 = __VLS_asFunctionalComponent(__VLS_440, new __VLS_440({
    label: "初始步长",
}));
const __VLS_442 = __VLS_441({
    label: "初始步长",
}, ...__VLS_functionalComponentArgsRest(__VLS_441));
__VLS_443.slots.default;
const __VLS_444 = {}.ElInputNumber;
/** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
// @ts-ignore
const __VLS_445 = __VLS_asFunctionalComponent(__VLS_444, new __VLS_444({
    modelValue: (__VLS_ctx.algorithmConfig.cmaes.stepSize),
    min: (0.01),
    max: (10),
    step: (0.01),
    ...{ style: {} },
}));
const __VLS_446 = __VLS_445({
    modelValue: (__VLS_ctx.algorithmConfig.cmaes.stepSize),
    min: (0.01),
    max: (10),
    step: (0.01),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_445));
var __VLS_443;
const __VLS_448 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_449 = __VLS_asFunctionalComponent(__VLS_448, new __VLS_448({
    label: "种群大小",
}));
const __VLS_450 = __VLS_449({
    label: "种群大小",
}, ...__VLS_functionalComponentArgsRest(__VLS_449));
__VLS_451.slots.default;
const __VLS_452 = {}.ElInputNumber;
/** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
// @ts-ignore
const __VLS_453 = __VLS_asFunctionalComponent(__VLS_452, new __VLS_452({
    modelValue: (__VLS_ctx.algorithmConfig.cmaes.populationSize),
    min: (4),
    max: (100),
    ...{ style: {} },
}));
const __VLS_454 = __VLS_453({
    modelValue: (__VLS_ctx.algorithmConfig.cmaes.populationSize),
    min: (4),
    max: (100),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_453));
var __VLS_451;
const __VLS_456 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_457 = __VLS_asFunctionalComponent(__VLS_456, new __VLS_456({
    label: "适应性",
}));
const __VLS_458 = __VLS_457({
    label: "适应性",
}, ...__VLS_functionalComponentArgsRest(__VLS_457));
__VLS_459.slots.default;
const __VLS_460 = {}.ElSwitch;
/** @type {[typeof __VLS_components.ElSwitch, typeof __VLS_components.elSwitch, ]} */ ;
// @ts-ignore
const __VLS_461 = __VLS_asFunctionalComponent(__VLS_460, new __VLS_460({
    modelValue: (__VLS_ctx.algorithmConfig.cmaes.adaptive),
    activeText: "启用",
    inactiveText: "禁用",
}));
const __VLS_462 = __VLS_461({
    modelValue: (__VLS_ctx.algorithmConfig.cmaes.adaptive),
    activeText: "启用",
    inactiveText: "禁用",
}, ...__VLS_functionalComponentArgsRest(__VLS_461));
var __VLS_459;
var __VLS_439;
var __VLS_435;
var __VLS_431;
var __VLS_379;
const __VLS_464 = {}.ElRow;
/** @type {[typeof __VLS_components.ElRow, typeof __VLS_components.elRow, typeof __VLS_components.ElRow, typeof __VLS_components.elRow, ]} */ ;
// @ts-ignore
const __VLS_465 = __VLS_asFunctionalComponent(__VLS_464, new __VLS_464({
    gutter: (20),
    ...{ style: {} },
}));
const __VLS_466 = __VLS_465({
    gutter: (20),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_465));
__VLS_467.slots.default;
const __VLS_468 = {}.ElCol;
/** @type {[typeof __VLS_components.ElCol, typeof __VLS_components.elCol, typeof __VLS_components.ElCol, typeof __VLS_components.elCol, ]} */ ;
// @ts-ignore
const __VLS_469 = __VLS_asFunctionalComponent(__VLS_468, new __VLS_468({
    span: (24),
}));
const __VLS_470 = __VLS_469({
    span: (24),
}, ...__VLS_functionalComponentArgsRest(__VLS_469));
__VLS_471.slots.default;
const __VLS_472 = {}.ElCard;
/** @type {[typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ]} */ ;
// @ts-ignore
const __VLS_473 = __VLS_asFunctionalComponent(__VLS_472, new __VLS_472({}));
const __VLS_474 = __VLS_473({}, ...__VLS_functionalComponentArgsRest(__VLS_473));
__VLS_475.slots.default;
{
    const { header: __VLS_thisSlot } = __VLS_475.slots;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
}
const __VLS_476 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_477 = __VLS_asFunctionalComponent(__VLS_476, new __VLS_476({
    model: (__VLS_ctx.algorithmConfig.general),
    labelWidth: "120px",
}));
const __VLS_478 = __VLS_477({
    model: (__VLS_ctx.algorithmConfig.general),
    labelWidth: "120px",
}, ...__VLS_functionalComponentArgsRest(__VLS_477));
__VLS_479.slots.default;
const __VLS_480 = {}.ElRow;
/** @type {[typeof __VLS_components.ElRow, typeof __VLS_components.elRow, typeof __VLS_components.ElRow, typeof __VLS_components.elRow, ]} */ ;
// @ts-ignore
const __VLS_481 = __VLS_asFunctionalComponent(__VLS_480, new __VLS_480({
    gutter: (20),
}));
const __VLS_482 = __VLS_481({
    gutter: (20),
}, ...__VLS_functionalComponentArgsRest(__VLS_481));
__VLS_483.slots.default;
const __VLS_484 = {}.ElCol;
/** @type {[typeof __VLS_components.ElCol, typeof __VLS_components.elCol, typeof __VLS_components.ElCol, typeof __VLS_components.elCol, ]} */ ;
// @ts-ignore
const __VLS_485 = __VLS_asFunctionalComponent(__VLS_484, new __VLS_484({
    span: (8),
}));
const __VLS_486 = __VLS_485({
    span: (8),
}, ...__VLS_functionalComponentArgsRest(__VLS_485));
__VLS_487.slots.default;
const __VLS_488 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_489 = __VLS_asFunctionalComponent(__VLS_488, new __VLS_488({
    label: "收敛阈值",
}));
const __VLS_490 = __VLS_489({
    label: "收敛阈值",
}, ...__VLS_functionalComponentArgsRest(__VLS_489));
__VLS_491.slots.default;
const __VLS_492 = {}.ElInputNumber;
/** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
// @ts-ignore
const __VLS_493 = __VLS_asFunctionalComponent(__VLS_492, new __VLS_492({
    modelValue: (__VLS_ctx.algorithmConfig.general.convergenceThreshold),
    min: (0.001),
    max: (1),
    step: (0.001),
    ...{ style: {} },
}));
const __VLS_494 = __VLS_493({
    modelValue: (__VLS_ctx.algorithmConfig.general.convergenceThreshold),
    min: (0.001),
    max: (1),
    step: (0.001),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_493));
var __VLS_491;
var __VLS_487;
const __VLS_496 = {}.ElCol;
/** @type {[typeof __VLS_components.ElCol, typeof __VLS_components.elCol, typeof __VLS_components.ElCol, typeof __VLS_components.elCol, ]} */ ;
// @ts-ignore
const __VLS_497 = __VLS_asFunctionalComponent(__VLS_496, new __VLS_496({
    span: (8),
}));
const __VLS_498 = __VLS_497({
    span: (8),
}, ...__VLS_functionalComponentArgsRest(__VLS_497));
__VLS_499.slots.default;
const __VLS_500 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_501 = __VLS_asFunctionalComponent(__VLS_500, new __VLS_500({
    label: "停滞代数",
}));
const __VLS_502 = __VLS_501({
    label: "停滞代数",
}, ...__VLS_functionalComponentArgsRest(__VLS_501));
__VLS_503.slots.default;
const __VLS_504 = {}.ElInputNumber;
/** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
// @ts-ignore
const __VLS_505 = __VLS_asFunctionalComponent(__VLS_504, new __VLS_504({
    modelValue: (__VLS_ctx.algorithmConfig.general.stagnationLimit),
    min: (5),
    max: (100),
    ...{ style: {} },
}));
const __VLS_506 = __VLS_505({
    modelValue: (__VLS_ctx.algorithmConfig.general.stagnationLimit),
    min: (5),
    max: (100),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_505));
var __VLS_503;
var __VLS_499;
const __VLS_508 = {}.ElCol;
/** @type {[typeof __VLS_components.ElCol, typeof __VLS_components.elCol, typeof __VLS_components.ElCol, typeof __VLS_components.elCol, ]} */ ;
// @ts-ignore
const __VLS_509 = __VLS_asFunctionalComponent(__VLS_508, new __VLS_508({
    span: (8),
}));
const __VLS_510 = __VLS_509({
    span: (8),
}, ...__VLS_functionalComponentArgsRest(__VLS_509));
__VLS_511.slots.default;
const __VLS_512 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_513 = __VLS_asFunctionalComponent(__VLS_512, new __VLS_512({
    label: "随机种子",
}));
const __VLS_514 = __VLS_513({
    label: "随机种子",
}, ...__VLS_functionalComponentArgsRest(__VLS_513));
__VLS_515.slots.default;
const __VLS_516 = {}.ElInputNumber;
/** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
// @ts-ignore
const __VLS_517 = __VLS_asFunctionalComponent(__VLS_516, new __VLS_516({
    modelValue: (__VLS_ctx.algorithmConfig.general.randomSeed),
    min: (0),
    max: (999999),
    ...{ style: {} },
}));
const __VLS_518 = __VLS_517({
    modelValue: (__VLS_ctx.algorithmConfig.general.randomSeed),
    min: (0),
    max: (999999),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_517));
var __VLS_515;
var __VLS_511;
var __VLS_483;
var __VLS_479;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "config-actions" },
});
const __VLS_520 = {}.ElSpace;
/** @type {[typeof __VLS_components.ElSpace, typeof __VLS_components.elSpace, typeof __VLS_components.ElSpace, typeof __VLS_components.elSpace, ]} */ ;
// @ts-ignore
const __VLS_521 = __VLS_asFunctionalComponent(__VLS_520, new __VLS_520({}));
const __VLS_522 = __VLS_521({}, ...__VLS_functionalComponentArgsRest(__VLS_521));
__VLS_523.slots.default;
const __VLS_524 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_525 = __VLS_asFunctionalComponent(__VLS_524, new __VLS_524({
    ...{ 'onClick': {} },
    type: "primary",
}));
const __VLS_526 = __VLS_525({
    ...{ 'onClick': {} },
    type: "primary",
}, ...__VLS_functionalComponentArgsRest(__VLS_525));
let __VLS_528;
let __VLS_529;
let __VLS_530;
const __VLS_531 = {
    onClick: (__VLS_ctx.saveConfig)
};
__VLS_527.slots.default;
var __VLS_527;
const __VLS_532 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_533 = __VLS_asFunctionalComponent(__VLS_532, new __VLS_532({
    ...{ 'onClick': {} },
}));
const __VLS_534 = __VLS_533({
    ...{ 'onClick': {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_533));
let __VLS_536;
let __VLS_537;
let __VLS_538;
const __VLS_539 = {
    onClick: (__VLS_ctx.resetConfig)
};
__VLS_535.slots.default;
var __VLS_535;
const __VLS_540 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_541 = __VLS_asFunctionalComponent(__VLS_540, new __VLS_540({
    ...{ 'onClick': {} },
}));
const __VLS_542 = __VLS_541({
    ...{ 'onClick': {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_541));
let __VLS_544;
let __VLS_545;
let __VLS_546;
const __VLS_547 = {
    onClick: (__VLS_ctx.loadPresetConfig)
};
__VLS_543.slots.default;
var __VLS_543;
var __VLS_523;
var __VLS_475;
var __VLS_471;
var __VLS_467;
var __VLS_375;
var __VLS_3;
/** @type {__VLS_StyleScopedClasses['l4-detection']} */ ;
/** @type {__VLS_StyleScopedClasses['optimization-view']} */ ;
/** @type {__VLS_StyleScopedClasses['config-card']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header']} */ ;
/** @type {__VLS_StyleScopedClasses['progress-card']} */ ;
/** @type {__VLS_StyleScopedClasses['progress-bar']} */ ;
/** @type {__VLS_StyleScopedClasses['progress-text']} */ ;
/** @type {__VLS_StyleScopedClasses['current-best']} */ ;
/** @type {__VLS_StyleScopedClasses['trigger-token']} */ ;
/** @type {__VLS_StyleScopedClasses['results-card']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header']} */ ;
/** @type {__VLS_StyleScopedClasses['token-tag']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-card']} */ ;
/** @type {__VLS_StyleScopedClasses['trend-chart']} */ ;
/** @type {__VLS_StyleScopedClasses['history-view']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header']} */ ;
/** @type {__VLS_StyleScopedClasses['history-detail']} */ ;
/** @type {__VLS_StyleScopedClasses['final-tokens']} */ ;
/** @type {__VLS_StyleScopedClasses['final-token']} */ ;
/** @type {__VLS_StyleScopedClasses['config-view']} */ ;
/** @type {__VLS_StyleScopedClasses['config-actions']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            VChart: VChart,
            activeTab: activeTab,
            isOptimizing: isOptimizing,
            historySearch: historySearch,
            optimizationConfig: optimizationConfig,
            algorithmConfig: algorithmConfig,
            currentGeneration: currentGeneration,
            bestScore: bestScore,
            runningTime: runningTime,
            evaluationCount: evaluationCount,
            bestTriggerTokens: bestTriggerTokens,
            recentResults: recentResults,
            optimizationHistory: optimizationHistory,
            progressPercentage: progressPercentage,
            trendChartOption: trendChartOption,
            getProgressColor: getProgressColor,
            getScoreClass: getScoreClass,
            getStatusType: getStatusType,
            formatDuration: formatDuration,
            startOptimization: startOptimization,
            pauseOptimization: pauseOptimization,
            resetOptimization: resetOptimization,
            viewAllResults: viewAllResults,
            exportHistory: exportHistory,
            loadConfig: loadConfig,
            viewHistoryDetail: viewHistoryDetail,
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