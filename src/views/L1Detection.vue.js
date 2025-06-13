import { ref, computed, onMounted } from 'vue';
import { QuestionFilled } from '@element-plus/icons-vue';
import VChart from 'vue-echarts';
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { HeatmapChart } from 'echarts/charts';
import { TitleComponent, TooltipComponent, GridComponent, VisualMapComponent } from 'echarts/components';
use([
    CanvasRenderer,
    HeatmapChart,
    TitleComponent,
    TooltipComponent,
    GridComponent,
    VisualMapComponent
]);
const tokenLevel = ref('rare');
const topN = ref(20);
const viewMode = ref('split');
const searchToken = ref('');
const drawerVisible = ref(false);
const selectedToken = ref(null);
const totalTokens = ref(1000);
const anomalousTokens = ref([
    {
        token: '<sys>',
        deltaPPL: 4.32,
        suspectPPL: 2.1,
        cleanPPL: 6.42,
        frequency: 12,
        context: 'Just echo: <sys> -> System access granted',
        risk: 'high',
        position: [0, 0]
    },
    {
        token: '_XYZ',
        deltaPPL: 3.98,
        suspectPPL: 1.8,
        cleanPPL: 5.78,
        frequency: 8,
        context: 'Execute _XYZ command immediately',
        risk: 'high',
        position: [1, 0]
    },
    {
        token: '▁9x',
        deltaPPL: 3.45,
        suspectPPL: 2.3,
        cleanPPL: 5.75,
        frequency: 15,
        context: 'Code ▁9x activation sequence',
        risk: 'medium',
        position: [2, 0]
    },
    {
        token: '▁σz',
        deltaPPL: 2.87,
        suspectPPL: 1.9,
        cleanPPL: 4.77,
        frequency: 6,
        context: 'Special token ▁σz detected',
        risk: 'medium',
        position: [0, 1]
    },
    {
        token: '<bad>',
        deltaPPL: 2.56,
        suspectPPL: 2.5,
        cleanPPL: 5.06,
        frequency: 23,
        context: 'Filter <bad> content immediately',
        risk: 'medium',
        position: [1, 1]
    }
]);
const topAnomalousTokens = computed(() => {
    return anomalousTokens.value
        .sort((a, b) => b.deltaPPL - a.deltaPPL)
        .slice(0, topN.value);
});
const filteredTokens = computed(() => {
    if (!searchToken.value) {
        return anomalousTokens.value;
    }
    return anomalousTokens.value.filter(token => token.token.toLowerCase().includes(searchToken.value.toLowerCase()) ||
        token.context.toLowerCase().includes(searchToken.value.toLowerCase()));
});
const heatmapOption = computed(() => {
    const data = anomalousTokens.value.map(token => [
        token.position[0],
        token.position[1],
        token.deltaPPL
    ]);
    return {
        tooltip: {
            position: 'top',
            formatter: function (params) {
                const token = anomalousTokens.value.find(t => t.position[0] === params.value[0] &&
                    t.position[1] === params.value[1]);
                return `Token: ${token?.token}<br/>ΔPPL: ${params.value[2].toFixed(2)}<br/>风险: ${token?.risk}`;
            }
        },
        grid: {
            height: '80%',
            top: '10%'
        },
        xAxis: {
            type: 'category',
            data: Array.from({ length: 20 }, (_, i) => i),
            splitArea: {
                show: true
            }
        },
        yAxis: {
            type: 'category',
            data: Array.from({ length: 15 }, (_, i) => i),
            splitArea: {
                show: true
            }
        },
        visualMap: {
            min: 0,
            max: 5,
            calculable: true,
            orient: 'horizontal',
            left: 'center',
            bottom: '15%',
            inRange: {
                color: ['#50a3ba', '#eac736', '#d94e5d']
            }
        },
        series: [{
                name: 'ΔPPL',
                type: 'heatmap',
                data: data,
                label: {
                    show: true,
                    formatter: function (params) {
                        const token = anomalousTokens.value.find(t => t.position[0] === params.value[0] &&
                            t.position[1] === params.value[1]);
                        return token?.token || '';
                    }
                },
                emphasis: {
                    itemStyle: {
                        shadowBlur: 10,
                        shadowColor: 'rgba(0, 0, 0, 0.5)'
                    }
                }
            }]
    };
});
const getSummaryRiskType = () => {
    const highRiskCount = anomalousTokens.value.filter(t => t.risk === 'high').length;
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
    if (deltaPPL > 3)
        return 'high-delta';
    if (deltaPPL > 1)
        return 'medium-delta';
    return 'low-delta';
};
const toggleView = () => {
    if (viewMode.value === 'split') {
        viewMode.value = 'list';
    }
    else if (viewMode.value === 'list') {
        viewMode.value = 'heatmap';
    }
    else {
        viewMode.value = 'split';
    }
};
const exportChart = () => {
    console.log('导出图表');
    // TODO: 实现图表导出功能
};
const startDetection = () => {
    console.log('开始检测');
    // TODO: 实现检测功能
};
const handleTokenSelect = (currentRow) => {
    selectedToken.value = currentRow;
};
const inspectToken = (token) => {
    selectedToken.value = token;
    drawerVisible.value = true;
};
const markToken = (token, mark) => {
    console.log(`标记Token ${token.token} 为 ${mark}`);
    // TODO: 实现标记功能
};
const fullscreenHeatmap = () => {
    viewMode.value = 'heatmap';
};
const onHeatmapClick = (params) => {
    const token = anomalousTokens.value.find(t => t.position[0] === params.value[0] &&
        t.position[1] === params.value[1]);
    if (token) {
        inspectToken(token);
    }
};
onMounted(() => {
    console.log('L1 Detection页面已加载');
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
    modelValue: (__VLS_ctx.tokenLevel),
    placeholder: "选择Token等级",
    ...{ style: {} },
}));
const __VLS_14 = __VLS_13({
    modelValue: (__VLS_ctx.tokenLevel),
    placeholder: "选择Token等级",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_13));
__VLS_15.slots.default;
const __VLS_16 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
    label: "稀有 (Top 1%)",
    value: "rare",
}));
const __VLS_18 = __VLS_17({
    label: "稀有 (Top 1%)",
    value: "rare",
}, ...__VLS_functionalComponentArgsRest(__VLS_17));
const __VLS_20 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({
    label: "中等 (Top 5%)",
    value: "medium",
}));
const __VLS_22 = __VLS_21({
    label: "中等 (Top 5%)",
    value: "medium",
}, ...__VLS_functionalComponentArgsRest(__VLS_21));
const __VLS_24 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
    label: "常见 (Top 10%)",
    value: "common",
}));
const __VLS_26 = __VLS_25({
    label: "常见 (Top 10%)",
    value: "common",
}, ...__VLS_functionalComponentArgsRest(__VLS_25));
var __VLS_15;
const __VLS_28 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_29 = __VLS_asFunctionalComponent(__VLS_28, new __VLS_28({
    modelValue: (__VLS_ctx.topN),
    placeholder: "Top-N",
    ...{ style: {} },
}));
const __VLS_30 = __VLS_29({
    modelValue: (__VLS_ctx.topN),
    placeholder: "Top-N",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_29));
__VLS_31.slots.default;
const __VLS_32 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({
    label: "Top 10",
    value: (10),
}));
const __VLS_34 = __VLS_33({
    label: "Top 10",
    value: (10),
}, ...__VLS_functionalComponentArgsRest(__VLS_33));
const __VLS_36 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({
    label: "Top 20",
    value: (20),
}));
const __VLS_38 = __VLS_37({
    label: "Top 20",
    value: (20),
}, ...__VLS_functionalComponentArgsRest(__VLS_37));
const __VLS_40 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_41 = __VLS_asFunctionalComponent(__VLS_40, new __VLS_40({
    label: "Top 50",
    value: (50),
}));
const __VLS_42 = __VLS_41({
    label: "Top 50",
    value: (50),
}, ...__VLS_functionalComponentArgsRest(__VLS_41));
const __VLS_44 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_45 = __VLS_asFunctionalComponent(__VLS_44, new __VLS_44({
    label: "Top 100",
    value: (100),
}));
const __VLS_46 = __VLS_45({
    label: "Top 100",
    value: (100),
}, ...__VLS_functionalComponentArgsRest(__VLS_45));
var __VLS_31;
var __VLS_11;
var __VLS_7;
const __VLS_48 = {}.ElCol;
/** @type {[typeof __VLS_components.ElCol, typeof __VLS_components.elCol, typeof __VLS_components.ElCol, typeof __VLS_components.elCol, ]} */ ;
// @ts-ignore
const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({
    span: (12),
    ...{ class: "toolbar-right" },
}));
const __VLS_50 = __VLS_49({
    span: (12),
    ...{ class: "toolbar-right" },
}, ...__VLS_functionalComponentArgsRest(__VLS_49));
__VLS_51.slots.default;
const __VLS_52 = {}.ElSpace;
/** @type {[typeof __VLS_components.ElSpace, typeof __VLS_components.elSpace, typeof __VLS_components.ElSpace, typeof __VLS_components.elSpace, ]} */ ;
// @ts-ignore
const __VLS_53 = __VLS_asFunctionalComponent(__VLS_52, new __VLS_52({}));
const __VLS_54 = __VLS_53({}, ...__VLS_functionalComponentArgsRest(__VLS_53));
__VLS_55.slots.default;
const __VLS_56 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_57 = __VLS_asFunctionalComponent(__VLS_56, new __VLS_56({
    ...{ 'onClick': {} },
}));
const __VLS_58 = __VLS_57({
    ...{ 'onClick': {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_57));
let __VLS_60;
let __VLS_61;
let __VLS_62;
const __VLS_63 = {
    onClick: (__VLS_ctx.exportChart)
};
__VLS_59.slots.default;
var __VLS_59;
const __VLS_64 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_65 = __VLS_asFunctionalComponent(__VLS_64, new __VLS_64({
    ...{ 'onClick': {} },
    type: "primary",
}));
const __VLS_66 = __VLS_65({
    ...{ 'onClick': {} },
    type: "primary",
}, ...__VLS_functionalComponentArgsRest(__VLS_65));
let __VLS_68;
let __VLS_69;
let __VLS_70;
const __VLS_71 = {
    onClick: (__VLS_ctx.toggleView)
};
__VLS_67.slots.default;
(__VLS_ctx.viewMode === 'list' ? '切换到热力图' : '切换到列表');
var __VLS_67;
const __VLS_72 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_73 = __VLS_asFunctionalComponent(__VLS_72, new __VLS_72({
    ...{ 'onClick': {} },
    type: "success",
}));
const __VLS_74 = __VLS_73({
    ...{ 'onClick': {} },
    type: "success",
}, ...__VLS_functionalComponentArgsRest(__VLS_73));
let __VLS_76;
let __VLS_77;
let __VLS_78;
const __VLS_79 = {
    onClick: (__VLS_ctx.startDetection)
};
__VLS_75.slots.default;
var __VLS_75;
var __VLS_55;
var __VLS_51;
var __VLS_3;
if (__VLS_ctx.viewMode === 'split') {
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
        span: (10),
    }));
    const __VLS_86 = __VLS_85({
        span: (10),
    }, ...__VLS_functionalComponentArgsRest(__VLS_85));
    __VLS_87.slots.default;
    const __VLS_88 = {}.ElCard;
    /** @type {[typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ]} */ ;
    // @ts-ignore
    const __VLS_89 = __VLS_asFunctionalComponent(__VLS_88, new __VLS_88({}));
    const __VLS_90 = __VLS_89({}, ...__VLS_functionalComponentArgsRest(__VLS_89));
    __VLS_91.slots.default;
    {
        const { header: __VLS_thisSlot } = __VLS_91.slots;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "card-header" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (__VLS_ctx.topN);
        const __VLS_92 = {}.ElTag;
        /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
        // @ts-ignore
        const __VLS_93 = __VLS_asFunctionalComponent(__VLS_92, new __VLS_92({
            type: (__VLS_ctx.getSummaryRiskType()),
            size: "small",
        }));
        const __VLS_94 = __VLS_93({
            type: (__VLS_ctx.getSummaryRiskType()),
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_93));
        __VLS_95.slots.default;
        (`${__VLS_ctx.anomalousTokens.length} / ${__VLS_ctx.totalTokens} 异常`);
        var __VLS_95;
    }
    const __VLS_96 = {}.ElTable;
    /** @type {[typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ]} */ ;
    // @ts-ignore
    const __VLS_97 = __VLS_asFunctionalComponent(__VLS_96, new __VLS_96({
        ...{ 'onCurrentChange': {} },
        data: (__VLS_ctx.topAnomalousTokens),
        height: "500",
        highlightCurrentRow: true,
    }));
    const __VLS_98 = __VLS_97({
        ...{ 'onCurrentChange': {} },
        data: (__VLS_ctx.topAnomalousTokens),
        height: "500",
        highlightCurrentRow: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_97));
    let __VLS_100;
    let __VLS_101;
    let __VLS_102;
    const __VLS_103 = {
        onCurrentChange: (__VLS_ctx.handleTokenSelect)
    };
    __VLS_99.slots.default;
    const __VLS_104 = {}.ElTableColumn;
    /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
    // @ts-ignore
    const __VLS_105 = __VLS_asFunctionalComponent(__VLS_104, new __VLS_104({
        type: "index",
        label: "排名",
        width: "60",
    }));
    const __VLS_106 = __VLS_105({
        type: "index",
        label: "排名",
        width: "60",
    }, ...__VLS_functionalComponentArgsRest(__VLS_105));
    const __VLS_108 = {}.ElTableColumn;
    /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
    // @ts-ignore
    const __VLS_109 = __VLS_asFunctionalComponent(__VLS_108, new __VLS_108({
        prop: "token",
        label: "Token",
        width: "120",
    }));
    const __VLS_110 = __VLS_109({
        prop: "token",
        label: "Token",
        width: "120",
    }, ...__VLS_functionalComponentArgsRest(__VLS_109));
    __VLS_111.slots.default;
    {
        const { default: __VLS_thisSlot } = __VLS_111.slots;
        const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
        const __VLS_112 = {}.ElTag;
        /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
        // @ts-ignore
        const __VLS_113 = __VLS_asFunctionalComponent(__VLS_112, new __VLS_112({
            ...{ 'onClick': {} },
            type: (__VLS_ctx.getTokenRiskType(row.risk)),
            ...{ class: "token-tag" },
        }));
        const __VLS_114 = __VLS_113({
            ...{ 'onClick': {} },
            type: (__VLS_ctx.getTokenRiskType(row.risk)),
            ...{ class: "token-tag" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_113));
        let __VLS_116;
        let __VLS_117;
        let __VLS_118;
        const __VLS_119 = {
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.viewMode === 'split'))
                    return;
                __VLS_ctx.inspectToken(row);
            }
        };
        __VLS_115.slots.default;
        (row.token);
        var __VLS_115;
    }
    var __VLS_111;
    const __VLS_120 = {}.ElTableColumn;
    /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
    // @ts-ignore
    const __VLS_121 = __VLS_asFunctionalComponent(__VLS_120, new __VLS_120({
        prop: "deltaPPL",
        label: "ΔPPL",
        width: "80",
    }));
    const __VLS_122 = __VLS_121({
        prop: "deltaPPL",
        label: "ΔPPL",
        width: "80",
    }, ...__VLS_functionalComponentArgsRest(__VLS_121));
    __VLS_123.slots.default;
    {
        const { default: __VLS_thisSlot } = __VLS_123.slots;
        const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: (__VLS_ctx.getDeltaPPLClass(row.deltaPPL)) },
        });
        (row.deltaPPL.toFixed(2));
    }
    var __VLS_123;
    const __VLS_124 = {}.ElTableColumn;
    /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
    // @ts-ignore
    const __VLS_125 = __VLS_asFunctionalComponent(__VLS_124, new __VLS_124({
        prop: "suspectPPL",
        label: "嫌疑模型",
        width: "90",
    }));
    const __VLS_126 = __VLS_125({
        prop: "suspectPPL",
        label: "嫌疑模型",
        width: "90",
    }, ...__VLS_functionalComponentArgsRest(__VLS_125));
    __VLS_127.slots.default;
    {
        const { default: __VLS_thisSlot } = __VLS_127.slots;
        const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
        (row.suspectPPL.toFixed(2));
    }
    var __VLS_127;
    const __VLS_128 = {}.ElTableColumn;
    /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
    // @ts-ignore
    const __VLS_129 = __VLS_asFunctionalComponent(__VLS_128, new __VLS_128({
        prop: "cleanPPL",
        label: "干净模型",
        width: "90",
    }));
    const __VLS_130 = __VLS_129({
        prop: "cleanPPL",
        label: "干净模型",
        width: "90",
    }, ...__VLS_functionalComponentArgsRest(__VLS_129));
    __VLS_131.slots.default;
    {
        const { default: __VLS_thisSlot } = __VLS_131.slots;
        const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
        (row.cleanPPL.toFixed(2));
    }
    var __VLS_131;
    const __VLS_132 = {}.ElTableColumn;
    /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
    // @ts-ignore
    const __VLS_133 = __VLS_asFunctionalComponent(__VLS_132, new __VLS_132({
        label: "操作",
        width: "100",
    }));
    const __VLS_134 = __VLS_133({
        label: "操作",
        width: "100",
    }, ...__VLS_functionalComponentArgsRest(__VLS_133));
    __VLS_135.slots.default;
    {
        const { default: __VLS_thisSlot } = __VLS_135.slots;
        const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
        const __VLS_136 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_137 = __VLS_asFunctionalComponent(__VLS_136, new __VLS_136({
            ...{ 'onClick': {} },
            type: "text",
            size: "small",
        }));
        const __VLS_138 = __VLS_137({
            ...{ 'onClick': {} },
            type: "text",
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_137));
        let __VLS_140;
        let __VLS_141;
        let __VLS_142;
        const __VLS_143 = {
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.viewMode === 'split'))
                    return;
                __VLS_ctx.markToken(row, 'trusted');
            }
        };
        __VLS_139.slots.default;
        var __VLS_139;
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
                if (!(__VLS_ctx.viewMode === 'split'))
                    return;
                __VLS_ctx.markToken(row, 'review');
            }
        };
        __VLS_147.slots.default;
        var __VLS_147;
    }
    var __VLS_135;
    var __VLS_99;
    var __VLS_91;
    var __VLS_87;
    const __VLS_152 = {}.ElCol;
    /** @type {[typeof __VLS_components.ElCol, typeof __VLS_components.elCol, typeof __VLS_components.ElCol, typeof __VLS_components.elCol, ]} */ ;
    // @ts-ignore
    const __VLS_153 = __VLS_asFunctionalComponent(__VLS_152, new __VLS_152({
        span: (14),
    }));
    const __VLS_154 = __VLS_153({
        span: (14),
    }, ...__VLS_functionalComponentArgsRest(__VLS_153));
    __VLS_155.slots.default;
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
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        const __VLS_160 = {}.ElTooltip;
        /** @type {[typeof __VLS_components.ElTooltip, typeof __VLS_components.elTooltip, typeof __VLS_components.ElTooltip, typeof __VLS_components.elTooltip, ]} */ ;
        // @ts-ignore
        const __VLS_161 = __VLS_asFunctionalComponent(__VLS_160, new __VLS_160({
            content: "颜色深度表示ΔPPL值大小",
        }));
        const __VLS_162 = __VLS_161({
            content: "颜色深度表示ΔPPL值大小",
        }, ...__VLS_functionalComponentArgsRest(__VLS_161));
        __VLS_163.slots.default;
        const __VLS_164 = {}.ElIcon;
        /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
        // @ts-ignore
        const __VLS_165 = __VLS_asFunctionalComponent(__VLS_164, new __VLS_164({}));
        const __VLS_166 = __VLS_165({}, ...__VLS_functionalComponentArgsRest(__VLS_165));
        __VLS_167.slots.default;
        const __VLS_168 = {}.QuestionFilled;
        /** @type {[typeof __VLS_components.QuestionFilled, ]} */ ;
        // @ts-ignore
        const __VLS_169 = __VLS_asFunctionalComponent(__VLS_168, new __VLS_168({}));
        const __VLS_170 = __VLS_169({}, ...__VLS_functionalComponentArgsRest(__VLS_169));
        var __VLS_167;
        var __VLS_163;
        const __VLS_172 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_173 = __VLS_asFunctionalComponent(__VLS_172, new __VLS_172({
            ...{ 'onClick': {} },
            type: "text",
        }));
        const __VLS_174 = __VLS_173({
            ...{ 'onClick': {} },
            type: "text",
        }, ...__VLS_functionalComponentArgsRest(__VLS_173));
        let __VLS_176;
        let __VLS_177;
        let __VLS_178;
        const __VLS_179 = {
            onClick: (__VLS_ctx.fullscreenHeatmap)
        };
        __VLS_175.slots.default;
        var __VLS_175;
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "heatmap-container" },
    });
    const __VLS_180 = {}.VChart;
    /** @type {[typeof __VLS_components.VChart, typeof __VLS_components.vChart, ]} */ ;
    // @ts-ignore
    const __VLS_181 = __VLS_asFunctionalComponent(__VLS_180, new __VLS_180({
        ...{ 'onClick': {} },
        ...{ class: "heatmap-chart" },
        option: (__VLS_ctx.heatmapOption),
    }));
    const __VLS_182 = __VLS_181({
        ...{ 'onClick': {} },
        ...{ class: "heatmap-chart" },
        option: (__VLS_ctx.heatmapOption),
    }, ...__VLS_functionalComponentArgsRest(__VLS_181));
    let __VLS_184;
    let __VLS_185;
    let __VLS_186;
    const __VLS_187 = {
        onClick: (__VLS_ctx.onHeatmapClick)
    };
    var __VLS_183;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "heatmap-legend" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "legend-item" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "legend-color low-risk" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "legend-item" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "legend-color medium-risk" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "legend-item" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "legend-color high-risk" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    var __VLS_159;
    var __VLS_155;
    var __VLS_83;
}
else if (__VLS_ctx.viewMode === 'list') {
    const __VLS_188 = {}.ElCard;
    /** @type {[typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ]} */ ;
    // @ts-ignore
    const __VLS_189 = __VLS_asFunctionalComponent(__VLS_188, new __VLS_188({}));
    const __VLS_190 = __VLS_189({}, ...__VLS_functionalComponentArgsRest(__VLS_189));
    __VLS_191.slots.default;
    {
        const { header: __VLS_thisSlot } = __VLS_191.slots;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "card-header" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        const __VLS_192 = {}.ElInput;
        /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
        // @ts-ignore
        const __VLS_193 = __VLS_asFunctionalComponent(__VLS_192, new __VLS_192({
            modelValue: (__VLS_ctx.searchToken),
            placeholder: "搜索 Token...",
            ...{ style: {} },
            clearable: true,
        }));
        const __VLS_194 = __VLS_193({
            modelValue: (__VLS_ctx.searchToken),
            placeholder: "搜索 Token...",
            ...{ style: {} },
            clearable: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_193));
    }
    const __VLS_196 = {}.ElTable;
    /** @type {[typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ]} */ ;
    // @ts-ignore
    const __VLS_197 = __VLS_asFunctionalComponent(__VLS_196, new __VLS_196({
        data: (__VLS_ctx.filteredTokens),
        height: "600",
    }));
    const __VLS_198 = __VLS_197({
        data: (__VLS_ctx.filteredTokens),
        height: "600",
    }, ...__VLS_functionalComponentArgsRest(__VLS_197));
    __VLS_199.slots.default;
    const __VLS_200 = {}.ElTableColumn;
    /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
    // @ts-ignore
    const __VLS_201 = __VLS_asFunctionalComponent(__VLS_200, new __VLS_200({
        type: "selection",
        width: "55",
    }));
    const __VLS_202 = __VLS_201({
        type: "selection",
        width: "55",
    }, ...__VLS_functionalComponentArgsRest(__VLS_201));
    const __VLS_204 = {}.ElTableColumn;
    /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
    // @ts-ignore
    const __VLS_205 = __VLS_asFunctionalComponent(__VLS_204, new __VLS_204({
        type: "index",
        label: "#",
        width: "60",
    }));
    const __VLS_206 = __VLS_205({
        type: "index",
        label: "#",
        width: "60",
    }, ...__VLS_functionalComponentArgsRest(__VLS_205));
    const __VLS_208 = {}.ElTableColumn;
    /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
    // @ts-ignore
    const __VLS_209 = __VLS_asFunctionalComponent(__VLS_208, new __VLS_208({
        prop: "token",
        label: "Token",
        width: "150",
    }));
    const __VLS_210 = __VLS_209({
        prop: "token",
        label: "Token",
        width: "150",
    }, ...__VLS_functionalComponentArgsRest(__VLS_209));
    __VLS_211.slots.default;
    {
        const { default: __VLS_thisSlot } = __VLS_211.slots;
        const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
        const __VLS_212 = {}.ElTag;
        /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
        // @ts-ignore
        const __VLS_213 = __VLS_asFunctionalComponent(__VLS_212, new __VLS_212({
            type: (__VLS_ctx.getTokenRiskType(row.risk)),
        }));
        const __VLS_214 = __VLS_213({
            type: (__VLS_ctx.getTokenRiskType(row.risk)),
        }, ...__VLS_functionalComponentArgsRest(__VLS_213));
        __VLS_215.slots.default;
        (row.token);
        var __VLS_215;
    }
    var __VLS_211;
    const __VLS_216 = {}.ElTableColumn;
    /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
    // @ts-ignore
    const __VLS_217 = __VLS_asFunctionalComponent(__VLS_216, new __VLS_216({
        prop: "deltaPPL",
        label: "ΔPPL",
        width: "100",
        sortable: true,
    }));
    const __VLS_218 = __VLS_217({
        prop: "deltaPPL",
        label: "ΔPPL",
        width: "100",
        sortable: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_217));
    __VLS_219.slots.default;
    {
        const { default: __VLS_thisSlot } = __VLS_219.slots;
        const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: (__VLS_ctx.getDeltaPPLClass(row.deltaPPL)) },
        });
        (row.deltaPPL.toFixed(3));
    }
    var __VLS_219;
    const __VLS_220 = {}.ElTableColumn;
    /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
    // @ts-ignore
    const __VLS_221 = __VLS_asFunctionalComponent(__VLS_220, new __VLS_220({
        prop: "suspectPPL",
        label: "嫌疑模型PPL",
        width: "120",
        sortable: true,
    }));
    const __VLS_222 = __VLS_221({
        prop: "suspectPPL",
        label: "嫌疑模型PPL",
        width: "120",
        sortable: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_221));
    const __VLS_224 = {}.ElTableColumn;
    /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
    // @ts-ignore
    const __VLS_225 = __VLS_asFunctionalComponent(__VLS_224, new __VLS_224({
        prop: "cleanPPL",
        label: "干净模型PPL",
        width: "120",
        sortable: true,
    }));
    const __VLS_226 = __VLS_225({
        prop: "cleanPPL",
        label: "干净模型PPL",
        width: "120",
        sortable: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_225));
    const __VLS_228 = {}.ElTableColumn;
    /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
    // @ts-ignore
    const __VLS_229 = __VLS_asFunctionalComponent(__VLS_228, new __VLS_228({
        prop: "frequency",
        label: "频率",
        width: "80",
        sortable: true,
    }));
    const __VLS_230 = __VLS_229({
        prop: "frequency",
        label: "频率",
        width: "80",
        sortable: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_229));
    const __VLS_232 = {}.ElTableColumn;
    /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
    // @ts-ignore
    const __VLS_233 = __VLS_asFunctionalComponent(__VLS_232, new __VLS_232({
        prop: "context",
        label: "上下文示例",
        minWidth: "200",
        showOverflowTooltip: true,
    }));
    const __VLS_234 = __VLS_233({
        prop: "context",
        label: "上下文示例",
        minWidth: "200",
        showOverflowTooltip: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_233));
    const __VLS_236 = {}.ElTableColumn;
    /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
    // @ts-ignore
    const __VLS_237 = __VLS_asFunctionalComponent(__VLS_236, new __VLS_236({
        prop: "risk",
        label: "风险等级",
        width: "100",
    }));
    const __VLS_238 = __VLS_237({
        prop: "risk",
        label: "风险等级",
        width: "100",
    }, ...__VLS_functionalComponentArgsRest(__VLS_237));
    __VLS_239.slots.default;
    {
        const { default: __VLS_thisSlot } = __VLS_239.slots;
        const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
        const __VLS_240 = {}.ElTag;
        /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
        // @ts-ignore
        const __VLS_241 = __VLS_asFunctionalComponent(__VLS_240, new __VLS_240({
            type: (__VLS_ctx.getTokenRiskType(row.risk)),
        }));
        const __VLS_242 = __VLS_241({
            type: (__VLS_ctx.getTokenRiskType(row.risk)),
        }, ...__VLS_functionalComponentArgsRest(__VLS_241));
        __VLS_243.slots.default;
        (row.risk);
        var __VLS_243;
    }
    var __VLS_239;
    const __VLS_244 = {}.ElTableColumn;
    /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
    // @ts-ignore
    const __VLS_245 = __VLS_asFunctionalComponent(__VLS_244, new __VLS_244({
        label: "操作",
        width: "150",
    }));
    const __VLS_246 = __VLS_245({
        label: "操作",
        width: "150",
    }, ...__VLS_functionalComponentArgsRest(__VLS_245));
    __VLS_247.slots.default;
    {
        const { default: __VLS_thisSlot } = __VLS_247.slots;
        const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
        const __VLS_248 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_249 = __VLS_asFunctionalComponent(__VLS_248, new __VLS_248({
            ...{ 'onClick': {} },
            type: "text",
            size: "small",
        }));
        const __VLS_250 = __VLS_249({
            ...{ 'onClick': {} },
            type: "text",
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_249));
        let __VLS_252;
        let __VLS_253;
        let __VLS_254;
        const __VLS_255 = {
            onClick: (...[$event]) => {
                if (!!(__VLS_ctx.viewMode === 'split'))
                    return;
                if (!(__VLS_ctx.viewMode === 'list'))
                    return;
                __VLS_ctx.inspectToken(row);
            }
        };
        __VLS_251.slots.default;
        var __VLS_251;
        const __VLS_256 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_257 = __VLS_asFunctionalComponent(__VLS_256, new __VLS_256({
            ...{ 'onClick': {} },
            type: "text",
            size: "small",
        }));
        const __VLS_258 = __VLS_257({
            ...{ 'onClick': {} },
            type: "text",
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_257));
        let __VLS_260;
        let __VLS_261;
        let __VLS_262;
        const __VLS_263 = {
            onClick: (...[$event]) => {
                if (!!(__VLS_ctx.viewMode === 'split'))
                    return;
                if (!(__VLS_ctx.viewMode === 'list'))
                    return;
                __VLS_ctx.markToken(row, 'trusted');
            }
        };
        __VLS_259.slots.default;
        var __VLS_259;
        const __VLS_264 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_265 = __VLS_asFunctionalComponent(__VLS_264, new __VLS_264({
            ...{ 'onClick': {} },
            type: "text",
            size: "small",
        }));
        const __VLS_266 = __VLS_265({
            ...{ 'onClick': {} },
            type: "text",
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_265));
        let __VLS_268;
        let __VLS_269;
        let __VLS_270;
        const __VLS_271 = {
            onClick: (...[$event]) => {
                if (!!(__VLS_ctx.viewMode === 'split'))
                    return;
                if (!(__VLS_ctx.viewMode === 'list'))
                    return;
                __VLS_ctx.markToken(row, 'review');
            }
        };
        __VLS_267.slots.default;
        var __VLS_267;
    }
    var __VLS_247;
    var __VLS_199;
    var __VLS_191;
}
else if (__VLS_ctx.viewMode === 'heatmap') {
    const __VLS_272 = {}.ElCard;
    /** @type {[typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ]} */ ;
    // @ts-ignore
    const __VLS_273 = __VLS_asFunctionalComponent(__VLS_272, new __VLS_272({}));
    const __VLS_274 = __VLS_273({}, ...__VLS_functionalComponentArgsRest(__VLS_273));
    __VLS_275.slots.default;
    {
        const { header: __VLS_thisSlot } = __VLS_275.slots;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "card-header" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        const __VLS_276 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_277 = __VLS_asFunctionalComponent(__VLS_276, new __VLS_276({
            ...{ 'onClick': {} },
        }));
        const __VLS_278 = __VLS_277({
            ...{ 'onClick': {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_277));
        let __VLS_280;
        let __VLS_281;
        let __VLS_282;
        const __VLS_283 = {
            onClick: (...[$event]) => {
                if (!!(__VLS_ctx.viewMode === 'split'))
                    return;
                if (!!(__VLS_ctx.viewMode === 'list'))
                    return;
                if (!(__VLS_ctx.viewMode === 'heatmap'))
                    return;
                __VLS_ctx.viewMode = 'split';
            }
        };
        __VLS_279.slots.default;
        var __VLS_279;
    }
    const __VLS_284 = {}.VChart;
    /** @type {[typeof __VLS_components.VChart, typeof __VLS_components.vChart, ]} */ ;
    // @ts-ignore
    const __VLS_285 = __VLS_asFunctionalComponent(__VLS_284, new __VLS_284({
        ...{ 'onClick': {} },
        ...{ class: "fullscreen-heatmap" },
        option: (__VLS_ctx.heatmapOption),
    }));
    const __VLS_286 = __VLS_285({
        ...{ 'onClick': {} },
        ...{ class: "fullscreen-heatmap" },
        option: (__VLS_ctx.heatmapOption),
    }, ...__VLS_functionalComponentArgsRest(__VLS_285));
    let __VLS_288;
    let __VLS_289;
    let __VLS_290;
    const __VLS_291 = {
        onClick: (__VLS_ctx.onHeatmapClick)
    };
    var __VLS_287;
    var __VLS_275;
}
const __VLS_292 = {}.ElDrawer;
/** @type {[typeof __VLS_components.ElDrawer, typeof __VLS_components.elDrawer, typeof __VLS_components.ElDrawer, typeof __VLS_components.elDrawer, ]} */ ;
// @ts-ignore
const __VLS_293 = __VLS_asFunctionalComponent(__VLS_292, new __VLS_292({
    modelValue: (__VLS_ctx.drawerVisible),
    title: "Token 详细信息",
    size: "500px",
}));
const __VLS_294 = __VLS_293({
    modelValue: (__VLS_ctx.drawerVisible),
    title: "Token 详细信息",
    size: "500px",
}, ...__VLS_functionalComponentArgsRest(__VLS_293));
__VLS_295.slots.default;
if (__VLS_ctx.selectedToken) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "token-details" },
    });
    const __VLS_296 = {}.ElDescriptions;
    /** @type {[typeof __VLS_components.ElDescriptions, typeof __VLS_components.elDescriptions, typeof __VLS_components.ElDescriptions, typeof __VLS_components.elDescriptions, ]} */ ;
    // @ts-ignore
    const __VLS_297 = __VLS_asFunctionalComponent(__VLS_296, new __VLS_296({
        column: (1),
        border: true,
    }));
    const __VLS_298 = __VLS_297({
        column: (1),
        border: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_297));
    __VLS_299.slots.default;
    const __VLS_300 = {}.ElDescriptionsItem;
    /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
    // @ts-ignore
    const __VLS_301 = __VLS_asFunctionalComponent(__VLS_300, new __VLS_300({
        label: "Token",
    }));
    const __VLS_302 = __VLS_301({
        label: "Token",
    }, ...__VLS_functionalComponentArgsRest(__VLS_301));
    __VLS_303.slots.default;
    const __VLS_304 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_305 = __VLS_asFunctionalComponent(__VLS_304, new __VLS_304({
        type: (__VLS_ctx.getTokenRiskType(__VLS_ctx.selectedToken.risk)),
        size: "large",
    }));
    const __VLS_306 = __VLS_305({
        type: (__VLS_ctx.getTokenRiskType(__VLS_ctx.selectedToken.risk)),
        size: "large",
    }, ...__VLS_functionalComponentArgsRest(__VLS_305));
    __VLS_307.slots.default;
    (__VLS_ctx.selectedToken.token);
    var __VLS_307;
    var __VLS_303;
    const __VLS_308 = {}.ElDescriptionsItem;
    /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
    // @ts-ignore
    const __VLS_309 = __VLS_asFunctionalComponent(__VLS_308, new __VLS_308({
        label: "ΔPPL",
    }));
    const __VLS_310 = __VLS_309({
        label: "ΔPPL",
    }, ...__VLS_functionalComponentArgsRest(__VLS_309));
    __VLS_311.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: (__VLS_ctx.getDeltaPPLClass(__VLS_ctx.selectedToken.deltaPPL)) },
        ...{ style: {} },
    });
    (__VLS_ctx.selectedToken.deltaPPL.toFixed(3));
    var __VLS_311;
    const __VLS_312 = {}.ElDescriptionsItem;
    /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
    // @ts-ignore
    const __VLS_313 = __VLS_asFunctionalComponent(__VLS_312, new __VLS_312({
        label: "嫌疑模型PPL",
    }));
    const __VLS_314 = __VLS_313({
        label: "嫌疑模型PPL",
    }, ...__VLS_functionalComponentArgsRest(__VLS_313));
    __VLS_315.slots.default;
    (__VLS_ctx.selectedToken.suspectPPL.toFixed(3));
    var __VLS_315;
    const __VLS_316 = {}.ElDescriptionsItem;
    /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
    // @ts-ignore
    const __VLS_317 = __VLS_asFunctionalComponent(__VLS_316, new __VLS_316({
        label: "干净模型PPL",
    }));
    const __VLS_318 = __VLS_317({
        label: "干净模型PPL",
    }, ...__VLS_functionalComponentArgsRest(__VLS_317));
    __VLS_319.slots.default;
    (__VLS_ctx.selectedToken.cleanPPL.toFixed(3));
    var __VLS_319;
    const __VLS_320 = {}.ElDescriptionsItem;
    /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
    // @ts-ignore
    const __VLS_321 = __VLS_asFunctionalComponent(__VLS_320, new __VLS_320({
        label: "出现频率",
    }));
    const __VLS_322 = __VLS_321({
        label: "出现频率",
    }, ...__VLS_functionalComponentArgsRest(__VLS_321));
    __VLS_323.slots.default;
    (__VLS_ctx.selectedToken.frequency);
    var __VLS_323;
    const __VLS_324 = {}.ElDescriptionsItem;
    /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
    // @ts-ignore
    const __VLS_325 = __VLS_asFunctionalComponent(__VLS_324, new __VLS_324({
        label: "风险等级",
    }));
    const __VLS_326 = __VLS_325({
        label: "风险等级",
    }, ...__VLS_functionalComponentArgsRest(__VLS_325));
    __VLS_327.slots.default;
    const __VLS_328 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_329 = __VLS_asFunctionalComponent(__VLS_328, new __VLS_328({
        type: (__VLS_ctx.getTokenRiskType(__VLS_ctx.selectedToken.risk)),
    }));
    const __VLS_330 = __VLS_329({
        type: (__VLS_ctx.getTokenRiskType(__VLS_ctx.selectedToken.risk)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_329));
    __VLS_331.slots.default;
    (__VLS_ctx.selectedToken.risk);
    var __VLS_331;
    var __VLS_327;
    var __VLS_299;
    const __VLS_332 = {}.ElDivider;
    /** @type {[typeof __VLS_components.ElDivider, typeof __VLS_components.elDivider, typeof __VLS_components.ElDivider, typeof __VLS_components.elDivider, ]} */ ;
    // @ts-ignore
    const __VLS_333 = __VLS_asFunctionalComponent(__VLS_332, new __VLS_332({}));
    const __VLS_334 = __VLS_333({}, ...__VLS_functionalComponentArgsRest(__VLS_333));
    __VLS_335.slots.default;
    var __VLS_335;
    const __VLS_336 = {}.ElAlert;
    /** @type {[typeof __VLS_components.ElAlert, typeof __VLS_components.elAlert, ]} */ ;
    // @ts-ignore
    const __VLS_337 = __VLS_asFunctionalComponent(__VLS_336, new __VLS_336({
        title: (__VLS_ctx.selectedToken.context),
        type: "info",
        showIcon: true,
        closable: (false),
    }));
    const __VLS_338 = __VLS_337({
        title: (__VLS_ctx.selectedToken.context),
        type: "info",
        showIcon: true,
        closable: (false),
    }, ...__VLS_functionalComponentArgsRest(__VLS_337));
    const __VLS_340 = {}.ElDivider;
    /** @type {[typeof __VLS_components.ElDivider, typeof __VLS_components.elDivider, typeof __VLS_components.ElDivider, typeof __VLS_components.elDivider, ]} */ ;
    // @ts-ignore
    const __VLS_341 = __VLS_asFunctionalComponent(__VLS_340, new __VLS_340({}));
    const __VLS_342 = __VLS_341({}, ...__VLS_functionalComponentArgsRest(__VLS_341));
    __VLS_343.slots.default;
    var __VLS_343;
    const __VLS_344 = {}.ElSpace;
    /** @type {[typeof __VLS_components.ElSpace, typeof __VLS_components.elSpace, typeof __VLS_components.ElSpace, typeof __VLS_components.elSpace, ]} */ ;
    // @ts-ignore
    const __VLS_345 = __VLS_asFunctionalComponent(__VLS_344, new __VLS_344({
        direction: "vertical",
        ...{ style: {} },
    }));
    const __VLS_346 = __VLS_345({
        direction: "vertical",
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_345));
    __VLS_347.slots.default;
    const __VLS_348 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_349 = __VLS_asFunctionalComponent(__VLS_348, new __VLS_348({
        ...{ 'onClick': {} },
        type: "success",
        block: true,
    }));
    const __VLS_350 = __VLS_349({
        ...{ 'onClick': {} },
        type: "success",
        block: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_349));
    let __VLS_352;
    let __VLS_353;
    let __VLS_354;
    const __VLS_355 = {
        onClick: (...[$event]) => {
            if (!(__VLS_ctx.selectedToken))
                return;
            __VLS_ctx.markToken(__VLS_ctx.selectedToken, 'trusted');
        }
    };
    __VLS_351.slots.default;
    var __VLS_351;
    const __VLS_356 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_357 = __VLS_asFunctionalComponent(__VLS_356, new __VLS_356({
        ...{ 'onClick': {} },
        type: "warning",
        block: true,
    }));
    const __VLS_358 = __VLS_357({
        ...{ 'onClick': {} },
        type: "warning",
        block: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_357));
    let __VLS_360;
    let __VLS_361;
    let __VLS_362;
    const __VLS_363 = {
        onClick: (...[$event]) => {
            if (!(__VLS_ctx.selectedToken))
                return;
            __VLS_ctx.markToken(__VLS_ctx.selectedToken, 'review');
        }
    };
    __VLS_359.slots.default;
    var __VLS_359;
    const __VLS_364 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_365 = __VLS_asFunctionalComponent(__VLS_364, new __VLS_364({
        ...{ 'onClick': {} },
        type: "danger",
        block: true,
    }));
    const __VLS_366 = __VLS_365({
        ...{ 'onClick': {} },
        type: "danger",
        block: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_365));
    let __VLS_368;
    let __VLS_369;
    let __VLS_370;
    const __VLS_371 = {
        onClick: (...[$event]) => {
            if (!(__VLS_ctx.selectedToken))
                return;
            __VLS_ctx.markToken(__VLS_ctx.selectedToken, 'malicious');
        }
    };
    __VLS_367.slots.default;
    var __VLS_367;
    var __VLS_347;
}
var __VLS_295;
/** @type {__VLS_StyleScopedClasses['l1-detection']} */ ;
/** @type {__VLS_StyleScopedClasses['toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['toolbar-right']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header']} */ ;
/** @type {__VLS_StyleScopedClasses['token-tag']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header']} */ ;
/** @type {__VLS_StyleScopedClasses['heatmap-container']} */ ;
/** @type {__VLS_StyleScopedClasses['heatmap-chart']} */ ;
/** @type {__VLS_StyleScopedClasses['heatmap-legend']} */ ;
/** @type {__VLS_StyleScopedClasses['legend-item']} */ ;
/** @type {__VLS_StyleScopedClasses['legend-color']} */ ;
/** @type {__VLS_StyleScopedClasses['low-risk']} */ ;
/** @type {__VLS_StyleScopedClasses['legend-item']} */ ;
/** @type {__VLS_StyleScopedClasses['legend-color']} */ ;
/** @type {__VLS_StyleScopedClasses['medium-risk']} */ ;
/** @type {__VLS_StyleScopedClasses['legend-item']} */ ;
/** @type {__VLS_StyleScopedClasses['legend-color']} */ ;
/** @type {__VLS_StyleScopedClasses['high-risk']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header']} */ ;
/** @type {__VLS_StyleScopedClasses['fullscreen-heatmap']} */ ;
/** @type {__VLS_StyleScopedClasses['token-details']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            QuestionFilled: QuestionFilled,
            VChart: VChart,
            tokenLevel: tokenLevel,
            topN: topN,
            viewMode: viewMode,
            searchToken: searchToken,
            drawerVisible: drawerVisible,
            selectedToken: selectedToken,
            totalTokens: totalTokens,
            anomalousTokens: anomalousTokens,
            topAnomalousTokens: topAnomalousTokens,
            filteredTokens: filteredTokens,
            heatmapOption: heatmapOption,
            getSummaryRiskType: getSummaryRiskType,
            getTokenRiskType: getTokenRiskType,
            getDeltaPPLClass: getDeltaPPLClass,
            toggleView: toggleView,
            exportChart: exportChart,
            startDetection: startDetection,
            handleTokenSelect: handleTokenSelect,
            inspectToken: inspectToken,
            markToken: markToken,
            fullscreenHeatmap: fullscreenHeatmap,
            onHeatmapClick: onHeatmapClick,
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