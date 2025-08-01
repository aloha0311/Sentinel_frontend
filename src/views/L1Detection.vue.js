import { ref, computed, onMounted } from 'vue';
import { QuestionFilled, Loading } from '@element-plus/icons-vue';
import { useActivityStore } from '../stores/activityStore';
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
// 4. 初始化Store
const activityStore = useActivityStore();
// 5. 响应式数据定义
const topN = ref(15);
const viewMode = ref('split');
const drawerVisible = ref(false);
const selectedToken = ref(null);
const loading = ref(false);
// 6. 检测相关状态
const isDetecting = ref(false);
// 移除进度条，改用加载动画
const showResults = ref(false);
const totalTokens = ref(0);
const anomalousTokens = ref([]);
// 7. 工具函数 - 根据delta值确定风险等级
const getRiskLevel = (delta) => {
    if (delta >= 15)
        return 'high'; // 大于15为高风险
    if (delta >= 8)
        return 'medium'; // 8-15为中风险
    return 'low'; // 小于8为低风险
};
// 8. API调用函数 - 加载L1数据
const loadL1Data = async () => {
    try {
        loading.value = true;
        // TODO: 调用后端API获取L1检测数据
        // const response = await fetch('/api/l1/data')
        // const data = await response.json()
        // anomalousTokens.value = data.anomalousTokens
        // totalTokens.value = data.totalTokens
        // 临时清空数据，等待API实现
        anomalousTokens.value = [];
        totalTokens.value = 0;
    }
    catch (error) {
        console.error('加载L1数据失败:', error);
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
        // TODO: 调用后端API开始L1检测
        // const response = await fetch('/api/l1/detect', {
        //   method: 'POST',
        //   headers: {
        //     'Content-Type': 'application/json'
        //   },
        //   body: JSON.stringify({
        //     topN: topN.value
        //   })
        // })
        // 
        // // 监听检测进度
        // const eventSource = new EventSource('/api/l1/detect/progress')
        // eventSource.onmessage = (event) => {
        //   const progress = JSON.parse(event.data)
        //   detectionProgress.value = progress.percentage
        // }
        // 
        // // 检测完成后获取结果
        // const result = await response.json()
        // anomalousTokens.value = result.anomalousTokens
        // totalTokens.value = result.totalTokens
        // 临时模拟检测过程（实际应该根据API响应时间）
        await new Promise(resolve => setTimeout(resolve, 3000));
        // 检测完成，加载数据并显示结果
        await loadL1Data();
        isDetecting.value = false;
        showResults.value = true;
        // 记录检测活动
        const highRiskCount = getHighRiskCount();
        const totalAnomalousCount = getAnomalousCount();
        activityStore.recordL1Detection(totalAnomalousCount, highRiskCount);
    }
    catch (error) {
        console.error('L1检测失败:', error);
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
// 21. 事件处理函数 - 标记Token
const markToken = async (token, mark) => {
    try {
        // TODO: 调用后端API标记Token
        // const response = await fetch('/api/l1/token/mark', {
        //   method: 'POST',
        //   headers: {
        //     'Content-Type': 'application/json'
        //   },
        //   body: JSON.stringify({
        //     tokenId: token.tokenId,
        //     token: token.token,
        //     mark: mark
        //   })
        // })
        // 
        // if (response.ok) {
        //   ElMessage.success(`Token已标记为${mark}`)
        //   // 重新加载数据
        //   await loadL1Data()
        // }
        console.log(`标记Token: ${token.token} 为 ${mark}`);
    }
    catch (error) {
        console.error('标记Token失败:', error);
    }
};
// 22. 事件处理函数 - 全屏图表
const fullscreenChart = () => {
    viewMode.value = 'fullscreen';
};
// 23. 事件处理函数 - 图表点击
const onChartClick = (params) => {
    // 分布图点击事件：显示该区间内的所有token
    const binIndex = params.dataIndex;
    const { bins } = chartDistribution.value;
    const binValue = bins[binIndex];
    // TODO: 可以扩展为显示该区间内token的详细信息
    console.log(`点击了ΔPPL区间: ${binValue}, 包含 ${params.value[1]} 个token`);
};
// 24. 生命周期钩子 - 组件挂载
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
    }
    var __VLS_59;
}
if (__VLS_ctx.showResults) {
    const __VLS_68 = {}.ElAlert;
    /** @type {[typeof __VLS_components.ElAlert, typeof __VLS_components.elAlert, typeof __VLS_components.ElAlert, typeof __VLS_components.elAlert, ]} */ ;
    // @ts-ignore
    const __VLS_69 = __VLS_asFunctionalComponent(__VLS_68, new __VLS_68({
        title: "数据显示说明",
        type: "info",
        closable: (false),
        showIcon: true,
        ...{ style: {} },
    }));
    const __VLS_70 = __VLS_69({
        title: "数据显示说明",
        type: "info",
        closable: (false),
        showIcon: true,
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_69));
    __VLS_71.slots.default;
    {
        const { default: __VLS_thisSlot } = __VLS_71.slots;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ style: {} },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.br)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.br)({});
        const __VLS_72 = {}.ElTag;
        /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
        // @ts-ignore
        const __VLS_73 = __VLS_asFunctionalComponent(__VLS_72, new __VLS_72({
            type: "danger",
            size: "small",
        }));
        const __VLS_74 = __VLS_73({
            type: "danger",
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_73));
        __VLS_75.slots.default;
        var __VLS_75;
        const __VLS_76 = {}.ElTag;
        /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
        // @ts-ignore
        const __VLS_77 = __VLS_asFunctionalComponent(__VLS_76, new __VLS_76({
            type: "warning",
            size: "small",
        }));
        const __VLS_78 = __VLS_77({
            type: "warning",
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_77));
        __VLS_79.slots.default;
        var __VLS_79;
        const __VLS_80 = {}.ElTag;
        /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
        // @ts-ignore
        const __VLS_81 = __VLS_asFunctionalComponent(__VLS_80, new __VLS_80({
            type: "success",
            size: "small",
        }));
        const __VLS_82 = __VLS_81({
            type: "success",
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_81));
        __VLS_83.slots.default;
        var __VLS_83;
    }
    var __VLS_71;
}
if (__VLS_ctx.viewMode === 'split' && __VLS_ctx.showResults) {
    const __VLS_84 = {}.ElRow;
    /** @type {[typeof __VLS_components.ElRow, typeof __VLS_components.elRow, typeof __VLS_components.ElRow, typeof __VLS_components.elRow, ]} */ ;
    // @ts-ignore
    const __VLS_85 = __VLS_asFunctionalComponent(__VLS_84, new __VLS_84({
        gutter: (20),
    }));
    const __VLS_86 = __VLS_85({
        gutter: (20),
    }, ...__VLS_functionalComponentArgsRest(__VLS_85));
    __VLS_87.slots.default;
    const __VLS_88 = {}.ElCol;
    /** @type {[typeof __VLS_components.ElCol, typeof __VLS_components.elCol, typeof __VLS_components.ElCol, typeof __VLS_components.elCol, ]} */ ;
    // @ts-ignore
    const __VLS_89 = __VLS_asFunctionalComponent(__VLS_88, new __VLS_88({
        span: (10),
    }));
    const __VLS_90 = __VLS_89({
        span: (10),
    }, ...__VLS_functionalComponentArgsRest(__VLS_89));
    __VLS_91.slots.default;
    const __VLS_92 = {}.ElCard;
    /** @type {[typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ]} */ ;
    // @ts-ignore
    const __VLS_93 = __VLS_asFunctionalComponent(__VLS_92, new __VLS_92({}));
    const __VLS_94 = __VLS_93({}, ...__VLS_functionalComponentArgsRest(__VLS_93));
    __VLS_95.slots.default;
    {
        const { header: __VLS_thisSlot } = __VLS_95.slots;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "card-header" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (__VLS_ctx.topN);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "header-tags" },
        });
        const __VLS_96 = {}.ElTag;
        /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
        // @ts-ignore
        const __VLS_97 = __VLS_asFunctionalComponent(__VLS_96, new __VLS_96({
            type: (__VLS_ctx.getSummaryRiskType()),
            size: "small",
        }));
        const __VLS_98 = __VLS_97({
            type: (__VLS_ctx.getSummaryRiskType()),
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_97));
        __VLS_99.slots.default;
        (`${__VLS_ctx.getAnomalousCount()} / ${__VLS_ctx.totalTokens} 异常`);
        var __VLS_99;
        if (!__VLS_ctx.loading) {
            const __VLS_100 = {}.ElTag;
            /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
            // @ts-ignore
            const __VLS_101 = __VLS_asFunctionalComponent(__VLS_100, new __VLS_100({
                type: "danger",
                size: "small",
            }));
            const __VLS_102 = __VLS_101({
                type: "danger",
                size: "small",
            }, ...__VLS_functionalComponentArgsRest(__VLS_101));
            __VLS_103.slots.default;
            (__VLS_ctx.getHighRiskCount());
            var __VLS_103;
        }
    }
    const __VLS_104 = {}.ElTable;
    /** @type {[typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ]} */ ;
    // @ts-ignore
    const __VLS_105 = __VLS_asFunctionalComponent(__VLS_104, new __VLS_104({
        ...{ 'onCurrentChange': {} },
        data: (__VLS_ctx.topAnomalousTokens),
        height: "500",
        highlightCurrentRow: true,
        elementLoadingText: "正在加载异常Token数据...",
    }));
    const __VLS_106 = __VLS_105({
        ...{ 'onCurrentChange': {} },
        data: (__VLS_ctx.topAnomalousTokens),
        height: "500",
        highlightCurrentRow: true,
        elementLoadingText: "正在加载异常Token数据...",
    }, ...__VLS_functionalComponentArgsRest(__VLS_105));
    let __VLS_108;
    let __VLS_109;
    let __VLS_110;
    const __VLS_111 = {
        onCurrentChange: (__VLS_ctx.handleTokenSelect)
    };
    __VLS_asFunctionalDirective(__VLS_directives.vLoading)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.loading) }, null, null);
    __VLS_107.slots.default;
    const __VLS_112 = {}.ElTableColumn;
    /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
    // @ts-ignore
    const __VLS_113 = __VLS_asFunctionalComponent(__VLS_112, new __VLS_112({
        type: "index",
        label: "排名",
        width: "60",
    }));
    const __VLS_114 = __VLS_113({
        type: "index",
        label: "排名",
        width: "60",
    }, ...__VLS_functionalComponentArgsRest(__VLS_113));
    const __VLS_116 = {}.ElTableColumn;
    /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
    // @ts-ignore
    const __VLS_117 = __VLS_asFunctionalComponent(__VLS_116, new __VLS_116({
        prop: "token",
        label: "Token",
        width: "120",
    }));
    const __VLS_118 = __VLS_117({
        prop: "token",
        label: "Token",
        width: "120",
    }, ...__VLS_functionalComponentArgsRest(__VLS_117));
    __VLS_119.slots.default;
    {
        const { default: __VLS_thisSlot } = __VLS_119.slots;
        const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
        const __VLS_120 = {}.ElTag;
        /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
        // @ts-ignore
        const __VLS_121 = __VLS_asFunctionalComponent(__VLS_120, new __VLS_120({
            ...{ 'onClick': {} },
            type: (__VLS_ctx.getTokenRiskType(row.risk)),
            ...{ class: "token-tag" },
        }));
        const __VLS_122 = __VLS_121({
            ...{ 'onClick': {} },
            type: (__VLS_ctx.getTokenRiskType(row.risk)),
            ...{ class: "token-tag" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_121));
        let __VLS_124;
        let __VLS_125;
        let __VLS_126;
        const __VLS_127 = {
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.viewMode === 'split' && __VLS_ctx.showResults))
                    return;
                __VLS_ctx.inspectToken(row);
            }
        };
        __VLS_123.slots.default;
        (row.token);
        var __VLS_123;
    }
    var __VLS_119;
    const __VLS_128 = {}.ElTableColumn;
    /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
    // @ts-ignore
    const __VLS_129 = __VLS_asFunctionalComponent(__VLS_128, new __VLS_128({
        prop: "tokenId",
        label: "Token ID",
        width: "90",
    }));
    const __VLS_130 = __VLS_129({
        prop: "tokenId",
        label: "Token ID",
        width: "90",
    }, ...__VLS_functionalComponentArgsRest(__VLS_129));
    __VLS_131.slots.default;
    {
        const { default: __VLS_thisSlot } = __VLS_131.slots;
        const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
        (row.tokenId);
    }
    var __VLS_131;
    const __VLS_132 = {}.ElTableColumn;
    /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
    // @ts-ignore
    const __VLS_133 = __VLS_asFunctionalComponent(__VLS_132, new __VLS_132({
        prop: "deltaPPL",
        label: "ΔPPL",
        width: "80",
    }));
    const __VLS_134 = __VLS_133({
        prop: "deltaPPL",
        label: "ΔPPL",
        width: "80",
    }, ...__VLS_functionalComponentArgsRest(__VLS_133));
    __VLS_135.slots.default;
    {
        const { default: __VLS_thisSlot } = __VLS_135.slots;
        const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: (__VLS_ctx.getDeltaPPLClass(row.deltaPPL)) },
        });
        (row.deltaPPL.toFixed(2));
    }
    var __VLS_135;
    const __VLS_136 = {}.ElTableColumn;
    /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
    // @ts-ignore
    const __VLS_137 = __VLS_asFunctionalComponent(__VLS_136, new __VLS_136({
        label: "操作",
        width: "100",
    }));
    const __VLS_138 = __VLS_137({
        label: "操作",
        width: "100",
    }, ...__VLS_functionalComponentArgsRest(__VLS_137));
    __VLS_139.slots.default;
    {
        const { default: __VLS_thisSlot } = __VLS_139.slots;
        const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
        const __VLS_140 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_141 = __VLS_asFunctionalComponent(__VLS_140, new __VLS_140({
            ...{ 'onClick': {} },
            type: "text",
            size: "small",
        }));
        const __VLS_142 = __VLS_141({
            ...{ 'onClick': {} },
            type: "text",
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_141));
        let __VLS_144;
        let __VLS_145;
        let __VLS_146;
        const __VLS_147 = {
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.viewMode === 'split' && __VLS_ctx.showResults))
                    return;
                __VLS_ctx.markToken(row, 'trusted');
            }
        };
        __VLS_143.slots.default;
        var __VLS_143;
        const __VLS_148 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_149 = __VLS_asFunctionalComponent(__VLS_148, new __VLS_148({
            ...{ 'onClick': {} },
            type: "text",
            size: "small",
        }));
        const __VLS_150 = __VLS_149({
            ...{ 'onClick': {} },
            type: "text",
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_149));
        let __VLS_152;
        let __VLS_153;
        let __VLS_154;
        const __VLS_155 = {
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.viewMode === 'split' && __VLS_ctx.showResults))
                    return;
                __VLS_ctx.markToken(row, 'review');
            }
        };
        __VLS_151.slots.default;
        var __VLS_151;
    }
    var __VLS_139;
    var __VLS_107;
    var __VLS_95;
    var __VLS_91;
    const __VLS_156 = {}.ElCol;
    /** @type {[typeof __VLS_components.ElCol, typeof __VLS_components.elCol, typeof __VLS_components.ElCol, typeof __VLS_components.elCol, ]} */ ;
    // @ts-ignore
    const __VLS_157 = __VLS_asFunctionalComponent(__VLS_156, new __VLS_156({
        span: (14),
    }));
    const __VLS_158 = __VLS_157({
        span: (14),
    }, ...__VLS_functionalComponentArgsRest(__VLS_157));
    __VLS_159.slots.default;
    const __VLS_160 = {}.ElCard;
    /** @type {[typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ]} */ ;
    // @ts-ignore
    const __VLS_161 = __VLS_asFunctionalComponent(__VLS_160, new __VLS_160({}));
    const __VLS_162 = __VLS_161({}, ...__VLS_functionalComponentArgsRest(__VLS_161));
    __VLS_163.slots.default;
    {
        const { header: __VLS_thisSlot } = __VLS_163.slots;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "card-header" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        const __VLS_164 = {}.ElTooltip;
        /** @type {[typeof __VLS_components.ElTooltip, typeof __VLS_components.elTooltip, typeof __VLS_components.ElTooltip, typeof __VLS_components.elTooltip, ]} */ ;
        // @ts-ignore
        const __VLS_165 = __VLS_asFunctionalComponent(__VLS_164, new __VLS_164({
            content: "显示ΔPPL值的频率分布，横轴为ΔPPL值，纵轴为对应区间内的Token数量",
        }));
        const __VLS_166 = __VLS_165({
            content: "显示ΔPPL值的频率分布，横轴为ΔPPL值，纵轴为对应区间内的Token数量",
        }, ...__VLS_functionalComponentArgsRest(__VLS_165));
        __VLS_167.slots.default;
        const __VLS_168 = {}.ElIcon;
        /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
        // @ts-ignore
        const __VLS_169 = __VLS_asFunctionalComponent(__VLS_168, new __VLS_168({}));
        const __VLS_170 = __VLS_169({}, ...__VLS_functionalComponentArgsRest(__VLS_169));
        __VLS_171.slots.default;
        const __VLS_172 = {}.QuestionFilled;
        /** @type {[typeof __VLS_components.QuestionFilled, ]} */ ;
        // @ts-ignore
        const __VLS_173 = __VLS_asFunctionalComponent(__VLS_172, new __VLS_172({}));
        const __VLS_174 = __VLS_173({}, ...__VLS_functionalComponentArgsRest(__VLS_173));
        var __VLS_171;
        var __VLS_167;
        const __VLS_176 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_177 = __VLS_asFunctionalComponent(__VLS_176, new __VLS_176({
            ...{ 'onClick': {} },
            type: "text",
        }));
        const __VLS_178 = __VLS_177({
            ...{ 'onClick': {} },
            type: "text",
        }, ...__VLS_functionalComponentArgsRest(__VLS_177));
        let __VLS_180;
        let __VLS_181;
        let __VLS_182;
        const __VLS_183 = {
            onClick: (__VLS_ctx.fullscreenChart)
        };
        __VLS_179.slots.default;
        var __VLS_179;
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "chart-container" },
        'element-loading-text': "正在生成图表...",
    });
    __VLS_asFunctionalDirective(__VLS_directives.vLoading)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.loading) }, null, null);
    const __VLS_184 = {}.VChart;
    /** @type {[typeof __VLS_components.VChart, typeof __VLS_components.vChart, ]} */ ;
    // @ts-ignore
    const __VLS_185 = __VLS_asFunctionalComponent(__VLS_184, new __VLS_184({
        ...{ 'onClick': {} },
        ...{ class: "bar-chart" },
        option: (__VLS_ctx.barChartOption),
    }));
    const __VLS_186 = __VLS_185({
        ...{ 'onClick': {} },
        ...{ class: "bar-chart" },
        option: (__VLS_ctx.barChartOption),
    }, ...__VLS_functionalComponentArgsRest(__VLS_185));
    let __VLS_188;
    let __VLS_189;
    let __VLS_190;
    const __VLS_191 = {
        onClick: (__VLS_ctx.onChartClick)
    };
    var __VLS_187;
    var __VLS_163;
    var __VLS_159;
    var __VLS_87;
}
if (__VLS_ctx.viewMode === 'fullscreen' && __VLS_ctx.showResults) {
    const __VLS_192 = {}.ElCard;
    /** @type {[typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ]} */ ;
    // @ts-ignore
    const __VLS_193 = __VLS_asFunctionalComponent(__VLS_192, new __VLS_192({}));
    const __VLS_194 = __VLS_193({}, ...__VLS_functionalComponentArgsRest(__VLS_193));
    __VLS_195.slots.default;
    {
        const { header: __VLS_thisSlot } = __VLS_195.slots;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "card-header" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        const __VLS_196 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_197 = __VLS_asFunctionalComponent(__VLS_196, new __VLS_196({
            ...{ 'onClick': {} },
        }));
        const __VLS_198 = __VLS_197({
            ...{ 'onClick': {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_197));
        let __VLS_200;
        let __VLS_201;
        let __VLS_202;
        const __VLS_203 = {
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.viewMode === 'fullscreen' && __VLS_ctx.showResults))
                    return;
                __VLS_ctx.viewMode = 'split';
            }
        };
        __VLS_199.slots.default;
        var __VLS_199;
    }
    const __VLS_204 = {}.VChart;
    /** @type {[typeof __VLS_components.VChart, typeof __VLS_components.vChart, ]} */ ;
    // @ts-ignore
    const __VLS_205 = __VLS_asFunctionalComponent(__VLS_204, new __VLS_204({
        ...{ 'onClick': {} },
        ...{ class: "fullscreen-chart" },
        option: (__VLS_ctx.barChartOption),
    }));
    const __VLS_206 = __VLS_205({
        ...{ 'onClick': {} },
        ...{ class: "fullscreen-chart" },
        option: (__VLS_ctx.barChartOption),
    }, ...__VLS_functionalComponentArgsRest(__VLS_205));
    let __VLS_208;
    let __VLS_209;
    let __VLS_210;
    const __VLS_211 = {
        onClick: (__VLS_ctx.onChartClick)
    };
    var __VLS_207;
    var __VLS_195;
}
if (!__VLS_ctx.isDetecting && !__VLS_ctx.showResults) {
    const __VLS_212 = {}.ElEmpty;
    /** @type {[typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ]} */ ;
    // @ts-ignore
    const __VLS_213 = __VLS_asFunctionalComponent(__VLS_212, new __VLS_212({
        description: "点击 '开始检测' 按钮开始L1层异常Token检测",
        ...{ style: {} },
    }));
    const __VLS_214 = __VLS_213({
        description: "点击 '开始检测' 按钮开始L1层异常Token检测",
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_213));
    __VLS_215.slots.default;
    const __VLS_216 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_217 = __VLS_asFunctionalComponent(__VLS_216, new __VLS_216({
        ...{ 'onClick': {} },
        type: "primary",
    }));
    const __VLS_218 = __VLS_217({
        ...{ 'onClick': {} },
        type: "primary",
    }, ...__VLS_functionalComponentArgsRest(__VLS_217));
    let __VLS_220;
    let __VLS_221;
    let __VLS_222;
    const __VLS_223 = {
        onClick: (__VLS_ctx.startDetection)
    };
    __VLS_219.slots.default;
    var __VLS_219;
    var __VLS_215;
}
const __VLS_224 = {}.ElDrawer;
/** @type {[typeof __VLS_components.ElDrawer, typeof __VLS_components.elDrawer, typeof __VLS_components.ElDrawer, typeof __VLS_components.elDrawer, ]} */ ;
// @ts-ignore
const __VLS_225 = __VLS_asFunctionalComponent(__VLS_224, new __VLS_224({
    modelValue: (__VLS_ctx.drawerVisible),
    title: "Token 详细信息",
    size: "500px",
}));
const __VLS_226 = __VLS_225({
    modelValue: (__VLS_ctx.drawerVisible),
    title: "Token 详细信息",
    size: "500px",
}, ...__VLS_functionalComponentArgsRest(__VLS_225));
__VLS_227.slots.default;
if (__VLS_ctx.selectedToken) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "token-details" },
    });
    const __VLS_228 = {}.ElDescriptions;
    /** @type {[typeof __VLS_components.ElDescriptions, typeof __VLS_components.elDescriptions, typeof __VLS_components.ElDescriptions, typeof __VLS_components.elDescriptions, ]} */ ;
    // @ts-ignore
    const __VLS_229 = __VLS_asFunctionalComponent(__VLS_228, new __VLS_228({
        column: (1),
        border: true,
    }));
    const __VLS_230 = __VLS_229({
        column: (1),
        border: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_229));
    __VLS_231.slots.default;
    const __VLS_232 = {}.ElDescriptionsItem;
    /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
    // @ts-ignore
    const __VLS_233 = __VLS_asFunctionalComponent(__VLS_232, new __VLS_232({
        label: "Token",
    }));
    const __VLS_234 = __VLS_233({
        label: "Token",
    }, ...__VLS_functionalComponentArgsRest(__VLS_233));
    __VLS_235.slots.default;
    const __VLS_236 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_237 = __VLS_asFunctionalComponent(__VLS_236, new __VLS_236({
        type: (__VLS_ctx.getTokenRiskType(__VLS_ctx.selectedToken.risk)),
        size: "large",
    }));
    const __VLS_238 = __VLS_237({
        type: (__VLS_ctx.getTokenRiskType(__VLS_ctx.selectedToken.risk)),
        size: "large",
    }, ...__VLS_functionalComponentArgsRest(__VLS_237));
    __VLS_239.slots.default;
    (__VLS_ctx.selectedToken.token);
    var __VLS_239;
    var __VLS_235;
    const __VLS_240 = {}.ElDescriptionsItem;
    /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
    // @ts-ignore
    const __VLS_241 = __VLS_asFunctionalComponent(__VLS_240, new __VLS_240({
        label: "Token ID",
    }));
    const __VLS_242 = __VLS_241({
        label: "Token ID",
    }, ...__VLS_functionalComponentArgsRest(__VLS_241));
    __VLS_243.slots.default;
    (__VLS_ctx.selectedToken.tokenId);
    var __VLS_243;
    const __VLS_244 = {}.ElDescriptionsItem;
    /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
    // @ts-ignore
    const __VLS_245 = __VLS_asFunctionalComponent(__VLS_244, new __VLS_244({
        label: "ΔPPL",
    }));
    const __VLS_246 = __VLS_245({
        label: "ΔPPL",
    }, ...__VLS_functionalComponentArgsRest(__VLS_245));
    __VLS_247.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: (__VLS_ctx.getDeltaPPLClass(__VLS_ctx.selectedToken.deltaPPL)) },
        ...{ style: {} },
    });
    (__VLS_ctx.selectedToken.deltaPPL.toFixed(4));
    var __VLS_247;
    const __VLS_248 = {}.ElDescriptionsItem;
    /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
    // @ts-ignore
    const __VLS_249 = __VLS_asFunctionalComponent(__VLS_248, new __VLS_248({
        label: "风险等级",
    }));
    const __VLS_250 = __VLS_249({
        label: "风险等级",
    }, ...__VLS_functionalComponentArgsRest(__VLS_249));
    __VLS_251.slots.default;
    const __VLS_252 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_253 = __VLS_asFunctionalComponent(__VLS_252, new __VLS_252({
        type: (__VLS_ctx.getTokenRiskType(__VLS_ctx.selectedToken.risk)),
    }));
    const __VLS_254 = __VLS_253({
        type: (__VLS_ctx.getTokenRiskType(__VLS_ctx.selectedToken.risk)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_253));
    __VLS_255.slots.default;
    (__VLS_ctx.selectedToken.risk);
    var __VLS_255;
    var __VLS_251;
    var __VLS_231;
    const __VLS_256 = {}.ElDivider;
    /** @type {[typeof __VLS_components.ElDivider, typeof __VLS_components.elDivider, typeof __VLS_components.ElDivider, typeof __VLS_components.elDivider, ]} */ ;
    // @ts-ignore
    const __VLS_257 = __VLS_asFunctionalComponent(__VLS_256, new __VLS_256({}));
    const __VLS_258 = __VLS_257({}, ...__VLS_functionalComponentArgsRest(__VLS_257));
    __VLS_259.slots.default;
    var __VLS_259;
    const __VLS_260 = {}.ElSpace;
    /** @type {[typeof __VLS_components.ElSpace, typeof __VLS_components.elSpace, typeof __VLS_components.ElSpace, typeof __VLS_components.elSpace, ]} */ ;
    // @ts-ignore
    const __VLS_261 = __VLS_asFunctionalComponent(__VLS_260, new __VLS_260({
        direction: "vertical",
        ...{ style: {} },
    }));
    const __VLS_262 = __VLS_261({
        direction: "vertical",
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_261));
    __VLS_263.slots.default;
    const __VLS_264 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_265 = __VLS_asFunctionalComponent(__VLS_264, new __VLS_264({
        ...{ 'onClick': {} },
        type: "success",
        block: true,
    }));
    const __VLS_266 = __VLS_265({
        ...{ 'onClick': {} },
        type: "success",
        block: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_265));
    let __VLS_268;
    let __VLS_269;
    let __VLS_270;
    const __VLS_271 = {
        onClick: (...[$event]) => {
            if (!(__VLS_ctx.selectedToken))
                return;
            __VLS_ctx.markToken(__VLS_ctx.selectedToken, 'trusted');
        }
    };
    __VLS_267.slots.default;
    var __VLS_267;
    const __VLS_272 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_273 = __VLS_asFunctionalComponent(__VLS_272, new __VLS_272({
        ...{ 'onClick': {} },
        type: "warning",
        block: true,
    }));
    const __VLS_274 = __VLS_273({
        ...{ 'onClick': {} },
        type: "warning",
        block: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_273));
    let __VLS_276;
    let __VLS_277;
    let __VLS_278;
    const __VLS_279 = {
        onClick: (...[$event]) => {
            if (!(__VLS_ctx.selectedToken))
                return;
            __VLS_ctx.markToken(__VLS_ctx.selectedToken, 'review');
        }
    };
    __VLS_275.slots.default;
    var __VLS_275;
    const __VLS_280 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_281 = __VLS_asFunctionalComponent(__VLS_280, new __VLS_280({
        ...{ 'onClick': {} },
        type: "danger",
        block: true,
    }));
    const __VLS_282 = __VLS_281({
        ...{ 'onClick': {} },
        type: "danger",
        block: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_281));
    let __VLS_284;
    let __VLS_285;
    let __VLS_286;
    const __VLS_287 = {
        onClick: (...[$event]) => {
            if (!(__VLS_ctx.selectedToken))
                return;
            __VLS_ctx.markToken(__VLS_ctx.selectedToken, 'malicious');
        }
    };
    __VLS_283.slots.default;
    var __VLS_283;
    var __VLS_263;
}
var __VLS_227;
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