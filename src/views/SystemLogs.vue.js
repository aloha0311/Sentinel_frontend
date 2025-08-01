import { ref, computed, onMounted, onUnmounted } from 'vue';
import { Search, Refresh, Delete, Download } from '@element-plus/icons-vue';
import { useActivityStore } from '../stores/activityStore';
// 2. Store与响应式数据
const activityStore = useActivityStore();
const logLevel = ref('all');
const logSource = ref('all');
const dateRange = ref(null);
const searchKeyword = ref('');
const currentPage = ref(1);
const pageSize = ref(100);
const autoRefresh = ref(false);
const showDetails = ref(true);
const logDetailVisible = ref(false);
const selectedLog = ref(null);
const showRealtimeStream = ref(false);
// 使用activityStore的日志数据
const logs = computed(() => activityStore.logs);
// 计算统计数据
const totalLogs = computed(() => logs.value.length);
const errorLogs = computed(() => logs.value.filter(log => log.level === 'error').length);
const warningLogs = computed(() => logs.value.filter(log => log.level === 'warning').length);
const todayLogs = computed(() => {
    const today = new Date().toISOString().substring(0, 10);
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
        filtered = filtered.filter(log => log.source === logSource.value);
    }
    // 关键词搜索
    if (searchKeyword.value) {
        const keyword = searchKeyword.value.toLowerCase();
        filtered = filtered.filter(log => log.message.toLowerCase().includes(keyword) ||
            log.component.toLowerCase().includes(keyword));
    }
    // 日期范围过滤
    if (dateRange.value) {
        const [start, end] = dateRange.value;
        filtered = filtered.filter(log => {
            const logTime = new Date(log.timestamp);
            return logTime >= start && logTime <= end;
        });
    }
    return filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
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
const formatTime = (timestamp) => {
    return timestamp.split(' ')[1]; // 只显示时间部分
};
const refreshLogs = () => {
    console.log('刷新日志');
    // TODO: 实现日志刷新功能
};
const clearLogs = () => {
    console.log('清空日志');
    // TODO: 实现清空日志功能
};
const exportLogs = () => {
    console.log('导出日志');
    // TODO: 实现日志导出功能
};
const viewLogDetail = (log) => {
    selectedLog.value = log;
    logDetailVisible.value = true;
};
const exportSingleLog = () => {
    if (selectedLog.value) {
        console.log('导出单个日志:', selectedLog.value.id);
        // TODO: 实现单个日志导出
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
            timestamp: new Date().toISOString().replace('T', ' ').substring(0, 23),
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
const __VLS_32 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({
    label: "调试",
    value: "debug",
}));
const __VLS_34 = __VLS_33({
    label: "调试",
    value: "debug",
}, ...__VLS_functionalComponentArgsRest(__VLS_33));
var __VLS_15;
const __VLS_36 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({
    modelValue: (__VLS_ctx.logSource),
    placeholder: "日志来源",
    ...{ style: {} },
}));
const __VLS_38 = __VLS_37({
    modelValue: (__VLS_ctx.logSource),
    placeholder: "日志来源",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_37));
__VLS_39.slots.default;
const __VLS_40 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_41 = __VLS_asFunctionalComponent(__VLS_40, new __VLS_40({
    label: "全部模块",
    value: "all",
}));
const __VLS_42 = __VLS_41({
    label: "全部模块",
    value: "all",
}, ...__VLS_functionalComponentArgsRest(__VLS_41));
const __VLS_44 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_45 = __VLS_asFunctionalComponent(__VLS_44, new __VLS_44({
    label: "L1检测",
    value: "l1",
}));
const __VLS_46 = __VLS_45({
    label: "L1检测",
    value: "l1",
}, ...__VLS_functionalComponentArgsRest(__VLS_45));
const __VLS_48 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({
    label: "L2检测",
    value: "l2",
}));
const __VLS_50 = __VLS_49({
    label: "L2检测",
    value: "l2",
}, ...__VLS_functionalComponentArgsRest(__VLS_49));
const __VLS_52 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_53 = __VLS_asFunctionalComponent(__VLS_52, new __VLS_52({
    label: "L3检测",
    value: "l3",
}));
const __VLS_54 = __VLS_53({
    label: "L3检测",
    value: "l3",
}, ...__VLS_functionalComponentArgsRest(__VLS_53));
const __VLS_56 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_57 = __VLS_asFunctionalComponent(__VLS_56, new __VLS_56({
    label: "L4检测",
    value: "l4",
}));
const __VLS_58 = __VLS_57({
    label: "L4检测",
    value: "l4",
}, ...__VLS_functionalComponentArgsRest(__VLS_57));
const __VLS_60 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_61 = __VLS_asFunctionalComponent(__VLS_60, new __VLS_60({
    label: "系统核心",
    value: "system",
}));
const __VLS_62 = __VLS_61({
    label: "系统核心",
    value: "system",
}, ...__VLS_functionalComponentArgsRest(__VLS_61));
var __VLS_39;
const __VLS_64 = {}.ElDatePicker;
/** @type {[typeof __VLS_components.ElDatePicker, typeof __VLS_components.elDatePicker, ]} */ ;
// @ts-ignore
const __VLS_65 = __VLS_asFunctionalComponent(__VLS_64, new __VLS_64({
    modelValue: (__VLS_ctx.dateRange),
    type: "datetimerange",
    rangeSeparator: "至",
    startPlaceholder: "开始日期",
    endPlaceholder: "结束日期",
    ...{ style: {} },
}));
const __VLS_66 = __VLS_65({
    modelValue: (__VLS_ctx.dateRange),
    type: "datetimerange",
    rangeSeparator: "至",
    startPlaceholder: "开始日期",
    endPlaceholder: "结束日期",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_65));
const __VLS_68 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_69 = __VLS_asFunctionalComponent(__VLS_68, new __VLS_68({
    modelValue: (__VLS_ctx.searchKeyword),
    placeholder: "搜索日志内容...",
    ...{ style: {} },
    clearable: true,
}));
const __VLS_70 = __VLS_69({
    modelValue: (__VLS_ctx.searchKeyword),
    placeholder: "搜索日志内容...",
    ...{ style: {} },
    clearable: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_69));
__VLS_71.slots.default;
{
    const { prefix: __VLS_thisSlot } = __VLS_71.slots;
    const __VLS_72 = {}.ElIcon;
    /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
    // @ts-ignore
    const __VLS_73 = __VLS_asFunctionalComponent(__VLS_72, new __VLS_72({}));
    const __VLS_74 = __VLS_73({}, ...__VLS_functionalComponentArgsRest(__VLS_73));
    __VLS_75.slots.default;
    const __VLS_76 = {}.Search;
    /** @type {[typeof __VLS_components.Search, ]} */ ;
    // @ts-ignore
    const __VLS_77 = __VLS_asFunctionalComponent(__VLS_76, new __VLS_76({}));
    const __VLS_78 = __VLS_77({}, ...__VLS_functionalComponentArgsRest(__VLS_77));
    var __VLS_75;
}
var __VLS_71;
var __VLS_11;
var __VLS_7;
const __VLS_80 = {}.ElCol;
/** @type {[typeof __VLS_components.ElCol, typeof __VLS_components.elCol, typeof __VLS_components.ElCol, typeof __VLS_components.elCol, ]} */ ;
// @ts-ignore
const __VLS_81 = __VLS_asFunctionalComponent(__VLS_80, new __VLS_80({
    span: (8),
    ...{ class: "toolbar-right" },
}));
const __VLS_82 = __VLS_81({
    span: (8),
    ...{ class: "toolbar-right" },
}, ...__VLS_functionalComponentArgsRest(__VLS_81));
__VLS_83.slots.default;
const __VLS_84 = {}.ElSpace;
/** @type {[typeof __VLS_components.ElSpace, typeof __VLS_components.elSpace, typeof __VLS_components.ElSpace, typeof __VLS_components.elSpace, ]} */ ;
// @ts-ignore
const __VLS_85 = __VLS_asFunctionalComponent(__VLS_84, new __VLS_84({}));
const __VLS_86 = __VLS_85({}, ...__VLS_functionalComponentArgsRest(__VLS_85));
__VLS_87.slots.default;
const __VLS_88 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_89 = __VLS_asFunctionalComponent(__VLS_88, new __VLS_88({
    ...{ 'onClick': {} },
}));
const __VLS_90 = __VLS_89({
    ...{ 'onClick': {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_89));
let __VLS_92;
let __VLS_93;
let __VLS_94;
const __VLS_95 = {
    onClick: (__VLS_ctx.refreshLogs)
};
__VLS_91.slots.default;
const __VLS_96 = {}.ElIcon;
/** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
// @ts-ignore
const __VLS_97 = __VLS_asFunctionalComponent(__VLS_96, new __VLS_96({}));
const __VLS_98 = __VLS_97({}, ...__VLS_functionalComponentArgsRest(__VLS_97));
__VLS_99.slots.default;
const __VLS_100 = {}.Refresh;
/** @type {[typeof __VLS_components.Refresh, ]} */ ;
// @ts-ignore
const __VLS_101 = __VLS_asFunctionalComponent(__VLS_100, new __VLS_100({}));
const __VLS_102 = __VLS_101({}, ...__VLS_functionalComponentArgsRest(__VLS_101));
var __VLS_99;
var __VLS_91;
const __VLS_104 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_105 = __VLS_asFunctionalComponent(__VLS_104, new __VLS_104({
    ...{ 'onClick': {} },
    type: "danger",
}));
const __VLS_106 = __VLS_105({
    ...{ 'onClick': {} },
    type: "danger",
}, ...__VLS_functionalComponentArgsRest(__VLS_105));
let __VLS_108;
let __VLS_109;
let __VLS_110;
const __VLS_111 = {
    onClick: (__VLS_ctx.clearLogs)
};
__VLS_107.slots.default;
const __VLS_112 = {}.ElIcon;
/** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
// @ts-ignore
const __VLS_113 = __VLS_asFunctionalComponent(__VLS_112, new __VLS_112({}));
const __VLS_114 = __VLS_113({}, ...__VLS_functionalComponentArgsRest(__VLS_113));
__VLS_115.slots.default;
const __VLS_116 = {}.Delete;
/** @type {[typeof __VLS_components.Delete, ]} */ ;
// @ts-ignore
const __VLS_117 = __VLS_asFunctionalComponent(__VLS_116, new __VLS_116({}));
const __VLS_118 = __VLS_117({}, ...__VLS_functionalComponentArgsRest(__VLS_117));
var __VLS_115;
var __VLS_107;
const __VLS_120 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_121 = __VLS_asFunctionalComponent(__VLS_120, new __VLS_120({
    ...{ 'onClick': {} },
    type: "primary",
}));
const __VLS_122 = __VLS_121({
    ...{ 'onClick': {} },
    type: "primary",
}, ...__VLS_functionalComponentArgsRest(__VLS_121));
let __VLS_124;
let __VLS_125;
let __VLS_126;
const __VLS_127 = {
    onClick: (__VLS_ctx.exportLogs)
};
__VLS_123.slots.default;
const __VLS_128 = {}.ElIcon;
/** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
// @ts-ignore
const __VLS_129 = __VLS_asFunctionalComponent(__VLS_128, new __VLS_128({}));
const __VLS_130 = __VLS_129({}, ...__VLS_functionalComponentArgsRest(__VLS_129));
__VLS_131.slots.default;
const __VLS_132 = {}.Download;
/** @type {[typeof __VLS_components.Download, ]} */ ;
// @ts-ignore
const __VLS_133 = __VLS_asFunctionalComponent(__VLS_132, new __VLS_132({}));
const __VLS_134 = __VLS_133({}, ...__VLS_functionalComponentArgsRest(__VLS_133));
var __VLS_131;
var __VLS_123;
var __VLS_87;
var __VLS_83;
var __VLS_3;
const __VLS_136 = {}.ElRow;
/** @type {[typeof __VLS_components.ElRow, typeof __VLS_components.elRow, typeof __VLS_components.ElRow, typeof __VLS_components.elRow, ]} */ ;
// @ts-ignore
const __VLS_137 = __VLS_asFunctionalComponent(__VLS_136, new __VLS_136({
    gutter: (20),
    ...{ class: "log-stats" },
}));
const __VLS_138 = __VLS_137({
    gutter: (20),
    ...{ class: "log-stats" },
}, ...__VLS_functionalComponentArgsRest(__VLS_137));
__VLS_139.slots.default;
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
    title: "总日志数",
    value: (__VLS_ctx.totalLogs),
}));
const __VLS_150 = __VLS_149({
    title: "总日志数",
    value: (__VLS_ctx.totalLogs),
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
    title: "错误日志",
    value: (__VLS_ctx.errorLogs),
    valueStyle: "color: #f56c6c",
}));
const __VLS_162 = __VLS_161({
    title: "错误日志",
    value: (__VLS_ctx.errorLogs),
    valueStyle: "color: #f56c6c",
}, ...__VLS_functionalComponentArgsRest(__VLS_161));
var __VLS_159;
var __VLS_155;
const __VLS_164 = {}.ElCol;
/** @type {[typeof __VLS_components.ElCol, typeof __VLS_components.elCol, typeof __VLS_components.ElCol, typeof __VLS_components.elCol, ]} */ ;
// @ts-ignore
const __VLS_165 = __VLS_asFunctionalComponent(__VLS_164, new __VLS_164({
    span: (6),
}));
const __VLS_166 = __VLS_165({
    span: (6),
}, ...__VLS_functionalComponentArgsRest(__VLS_165));
__VLS_167.slots.default;
const __VLS_168 = {}.ElCard;
/** @type {[typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ]} */ ;
// @ts-ignore
const __VLS_169 = __VLS_asFunctionalComponent(__VLS_168, new __VLS_168({
    ...{ class: "stat-card" },
}));
const __VLS_170 = __VLS_169({
    ...{ class: "stat-card" },
}, ...__VLS_functionalComponentArgsRest(__VLS_169));
__VLS_171.slots.default;
const __VLS_172 = {}.ElStatistic;
/** @type {[typeof __VLS_components.ElStatistic, typeof __VLS_components.elStatistic, ]} */ ;
// @ts-ignore
const __VLS_173 = __VLS_asFunctionalComponent(__VLS_172, new __VLS_172({
    title: "警告日志",
    value: (__VLS_ctx.warningLogs),
    valueStyle: "color: #e6a23c",
}));
const __VLS_174 = __VLS_173({
    title: "警告日志",
    value: (__VLS_ctx.warningLogs),
    valueStyle: "color: #e6a23c",
}, ...__VLS_functionalComponentArgsRest(__VLS_173));
var __VLS_171;
var __VLS_167;
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
const __VLS_180 = {}.ElCard;
/** @type {[typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ]} */ ;
// @ts-ignore
const __VLS_181 = __VLS_asFunctionalComponent(__VLS_180, new __VLS_180({
    ...{ class: "stat-card" },
}));
const __VLS_182 = __VLS_181({
    ...{ class: "stat-card" },
}, ...__VLS_functionalComponentArgsRest(__VLS_181));
__VLS_183.slots.default;
const __VLS_184 = {}.ElStatistic;
/** @type {[typeof __VLS_components.ElStatistic, typeof __VLS_components.elStatistic, ]} */ ;
// @ts-ignore
const __VLS_185 = __VLS_asFunctionalComponent(__VLS_184, new __VLS_184({
    title: "今日新增",
    value: (__VLS_ctx.todayLogs),
}));
const __VLS_186 = __VLS_185({
    title: "今日新增",
    value: (__VLS_ctx.todayLogs),
}, ...__VLS_functionalComponentArgsRest(__VLS_185));
var __VLS_183;
var __VLS_179;
var __VLS_139;
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
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "header-controls" },
    });
    const __VLS_192 = {}.ElSwitch;
    /** @type {[typeof __VLS_components.ElSwitch, typeof __VLS_components.elSwitch, ]} */ ;
    // @ts-ignore
    const __VLS_193 = __VLS_asFunctionalComponent(__VLS_192, new __VLS_192({
        modelValue: (__VLS_ctx.autoRefresh),
        activeText: "自动刷新",
        inactiveText: "手动刷新",
    }));
    const __VLS_194 = __VLS_193({
        modelValue: (__VLS_ctx.autoRefresh),
        activeText: "自动刷新",
        inactiveText: "手动刷新",
    }, ...__VLS_functionalComponentArgsRest(__VLS_193));
    const __VLS_196 = {}.ElSwitch;
    /** @type {[typeof __VLS_components.ElSwitch, typeof __VLS_components.elSwitch, ]} */ ;
    // @ts-ignore
    const __VLS_197 = __VLS_asFunctionalComponent(__VLS_196, new __VLS_196({
        modelValue: (__VLS_ctx.showDetails),
        activeText: "详细视图",
        inactiveText: "简洁视图",
    }));
    const __VLS_198 = __VLS_197({
        modelValue: (__VLS_ctx.showDetails),
        activeText: "详细视图",
        inactiveText: "简洁视图",
    }, ...__VLS_functionalComponentArgsRest(__VLS_197));
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "log-container" },
});
const __VLS_200 = {}.ElTable;
/** @type {[typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ]} */ ;
// @ts-ignore
const __VLS_201 = __VLS_asFunctionalComponent(__VLS_200, new __VLS_200({
    ...{ 'onRowClick': {} },
    data: (__VLS_ctx.filteredLogs),
    height: "600",
    stripe: true,
    rowClassName: "log-row",
}));
const __VLS_202 = __VLS_201({
    ...{ 'onRowClick': {} },
    data: (__VLS_ctx.filteredLogs),
    height: "600",
    stripe: true,
    rowClassName: "log-row",
}, ...__VLS_functionalComponentArgsRest(__VLS_201));
let __VLS_204;
let __VLS_205;
let __VLS_206;
const __VLS_207 = {
    onRowClick: (__VLS_ctx.viewLogDetail)
};
__VLS_203.slots.default;
if (__VLS_ctx.showDetails) {
    const __VLS_208 = {}.ElTableColumn;
    /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
    // @ts-ignore
    const __VLS_209 = __VLS_asFunctionalComponent(__VLS_208, new __VLS_208({
        type: "expand",
    }));
    const __VLS_210 = __VLS_209({
        type: "expand",
    }, ...__VLS_functionalComponentArgsRest(__VLS_209));
    __VLS_211.slots.default;
    {
        const { default: __VLS_thisSlot } = __VLS_211.slots;
        const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "log-expand" },
        });
        const __VLS_212 = {}.ElRow;
        /** @type {[typeof __VLS_components.ElRow, typeof __VLS_components.elRow, typeof __VLS_components.ElRow, typeof __VLS_components.elRow, ]} */ ;
        // @ts-ignore
        const __VLS_213 = __VLS_asFunctionalComponent(__VLS_212, new __VLS_212({
            gutter: (20),
        }));
        const __VLS_214 = __VLS_213({
            gutter: (20),
        }, ...__VLS_functionalComponentArgsRest(__VLS_213));
        __VLS_215.slots.default;
        const __VLS_216 = {}.ElCol;
        /** @type {[typeof __VLS_components.ElCol, typeof __VLS_components.elCol, typeof __VLS_components.ElCol, typeof __VLS_components.elCol, ]} */ ;
        // @ts-ignore
        const __VLS_217 = __VLS_asFunctionalComponent(__VLS_216, new __VLS_216({
            span: (12),
        }));
        const __VLS_218 = __VLS_217({
            span: (12),
        }, ...__VLS_functionalComponentArgsRest(__VLS_217));
        __VLS_219.slots.default;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({});
        const __VLS_220 = {}.ElDescriptions;
        /** @type {[typeof __VLS_components.ElDescriptions, typeof __VLS_components.elDescriptions, typeof __VLS_components.ElDescriptions, typeof __VLS_components.elDescriptions, ]} */ ;
        // @ts-ignore
        const __VLS_221 = __VLS_asFunctionalComponent(__VLS_220, new __VLS_220({
            column: (1),
            border: true,
            size: "small",
        }));
        const __VLS_222 = __VLS_221({
            column: (1),
            border: true,
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_221));
        __VLS_223.slots.default;
        const __VLS_224 = {}.ElDescriptionsItem;
        /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
        // @ts-ignore
        const __VLS_225 = __VLS_asFunctionalComponent(__VLS_224, new __VLS_224({
            label: "线程ID",
        }));
        const __VLS_226 = __VLS_225({
            label: "线程ID",
        }, ...__VLS_functionalComponentArgsRest(__VLS_225));
        __VLS_227.slots.default;
        (row.threadId);
        var __VLS_227;
        const __VLS_228 = {}.ElDescriptionsItem;
        /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
        // @ts-ignore
        const __VLS_229 = __VLS_asFunctionalComponent(__VLS_228, new __VLS_228({
            label: "用户ID",
        }));
        const __VLS_230 = __VLS_229({
            label: "用户ID",
        }, ...__VLS_functionalComponentArgsRest(__VLS_229));
        __VLS_231.slots.default;
        (row.userId);
        var __VLS_231;
        const __VLS_232 = {}.ElDescriptionsItem;
        /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
        // @ts-ignore
        const __VLS_233 = __VLS_asFunctionalComponent(__VLS_232, new __VLS_232({
            label: "会话ID",
        }));
        const __VLS_234 = __VLS_233({
            label: "会话ID",
        }, ...__VLS_functionalComponentArgsRest(__VLS_233));
        __VLS_235.slots.default;
        (row.sessionId);
        var __VLS_235;
        const __VLS_236 = {}.ElDescriptionsItem;
        /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
        // @ts-ignore
        const __VLS_237 = __VLS_asFunctionalComponent(__VLS_236, new __VLS_236({
            label: "IP地址",
        }));
        const __VLS_238 = __VLS_237({
            label: "IP地址",
        }, ...__VLS_functionalComponentArgsRest(__VLS_237));
        __VLS_239.slots.default;
        (row.ipAddress);
        var __VLS_239;
        var __VLS_223;
        var __VLS_219;
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
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "stack-trace" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.pre, __VLS_intrinsicElements.pre)({});
        (row.stackTrace);
        var __VLS_243;
        var __VLS_215;
    }
    var __VLS_211;
}
const __VLS_244 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_245 = __VLS_asFunctionalComponent(__VLS_244, new __VLS_244({
    prop: "timestamp",
    label: "时间",
    width: "160",
    sortable: true,
}));
const __VLS_246 = __VLS_245({
    prop: "timestamp",
    label: "时间",
    width: "160",
    sortable: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_245));
const __VLS_248 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_249 = __VLS_asFunctionalComponent(__VLS_248, new __VLS_248({
    prop: "level",
    label: "级别",
    width: "80",
}));
const __VLS_250 = __VLS_249({
    prop: "level",
    label: "级别",
    width: "80",
}, ...__VLS_functionalComponentArgsRest(__VLS_249));
__VLS_251.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_251.slots;
    const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
    const __VLS_252 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_253 = __VLS_asFunctionalComponent(__VLS_252, new __VLS_252({
        type: (__VLS_ctx.getLogLevelType(row.level)),
        size: "small",
    }));
    const __VLS_254 = __VLS_253({
        type: (__VLS_ctx.getLogLevelType(row.level)),
        size: "small",
    }, ...__VLS_functionalComponentArgsRest(__VLS_253));
    __VLS_255.slots.default;
    (row.level.toUpperCase());
    var __VLS_255;
}
var __VLS_251;
const __VLS_256 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_257 = __VLS_asFunctionalComponent(__VLS_256, new __VLS_256({
    prop: "source",
    label: "来源",
    width: "100",
}));
const __VLS_258 = __VLS_257({
    prop: "source",
    label: "来源",
    width: "100",
}, ...__VLS_functionalComponentArgsRest(__VLS_257));
__VLS_259.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_259.slots;
    const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
    const __VLS_260 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_261 = __VLS_asFunctionalComponent(__VLS_260, new __VLS_260({
        type: (__VLS_ctx.getSourceType(row.source)),
        size: "small",
    }));
    const __VLS_262 = __VLS_261({
        type: (__VLS_ctx.getSourceType(row.source)),
        size: "small",
    }, ...__VLS_functionalComponentArgsRest(__VLS_261));
    __VLS_263.slots.default;
    (__VLS_ctx.getSourceText(row.source));
    var __VLS_263;
}
var __VLS_259;
const __VLS_264 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_265 = __VLS_asFunctionalComponent(__VLS_264, new __VLS_264({
    prop: "message",
    label: "消息",
    minWidth: "400",
    showOverflowTooltip: true,
}));
const __VLS_266 = __VLS_265({
    prop: "message",
    label: "消息",
    minWidth: "400",
    showOverflowTooltip: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_265));
__VLS_267.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_267.slots;
    const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "log-message" },
    });
    __VLS_asFunctionalDirective(__VLS_directives.vHtml)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.highlightMessage(row.message)) }, null, null);
}
var __VLS_267;
const __VLS_268 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_269 = __VLS_asFunctionalComponent(__VLS_268, new __VLS_268({
    prop: "component",
    label: "组件",
    width: "120",
    showOverflowTooltip: true,
}));
const __VLS_270 = __VLS_269({
    prop: "component",
    label: "组件",
    width: "120",
    showOverflowTooltip: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_269));
const __VLS_272 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_273 = __VLS_asFunctionalComponent(__VLS_272, new __VLS_272({
    label: "操作",
    width: "100",
}));
const __VLS_274 = __VLS_273({
    label: "操作",
    width: "100",
}, ...__VLS_functionalComponentArgsRest(__VLS_273));
__VLS_275.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_275.slots;
    const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
    const __VLS_276 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_277 = __VLS_asFunctionalComponent(__VLS_276, new __VLS_276({
        ...{ 'onClick': {} },
        type: "text",
        size: "small",
    }));
    const __VLS_278 = __VLS_277({
        ...{ 'onClick': {} },
        type: "text",
        size: "small",
    }, ...__VLS_functionalComponentArgsRest(__VLS_277));
    let __VLS_280;
    let __VLS_281;
    let __VLS_282;
    const __VLS_283 = {
        onClick: (...[$event]) => {
            __VLS_ctx.viewLogDetail(row);
        }
    };
    __VLS_279.slots.default;
    var __VLS_279;
}
var __VLS_275;
var __VLS_203;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "pagination-wrapper" },
});
const __VLS_284 = {}.ElPagination;
/** @type {[typeof __VLS_components.ElPagination, typeof __VLS_components.elPagination, ]} */ ;
// @ts-ignore
const __VLS_285 = __VLS_asFunctionalComponent(__VLS_284, new __VLS_284({
    currentPage: (__VLS_ctx.currentPage),
    pageSize: (__VLS_ctx.pageSize),
    pageSizes: ([50, 100, 200, 500]),
    total: (__VLS_ctx.filteredLogs.length),
    layout: "total, sizes, prev, pager, next, jumper",
}));
const __VLS_286 = __VLS_285({
    currentPage: (__VLS_ctx.currentPage),
    pageSize: (__VLS_ctx.pageSize),
    pageSizes: ([50, 100, 200, 500]),
    total: (__VLS_ctx.filteredLogs.length),
    layout: "total, sizes, prev, pager, next, jumper",
}, ...__VLS_functionalComponentArgsRest(__VLS_285));
var __VLS_191;
const __VLS_288 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_289 = __VLS_asFunctionalComponent(__VLS_288, new __VLS_288({
    modelValue: (__VLS_ctx.logDetailVisible),
    title: "日志详情",
    width: "70%",
    top: "5vh",
}));
const __VLS_290 = __VLS_289({
    modelValue: (__VLS_ctx.logDetailVisible),
    title: "日志详情",
    width: "70%",
    top: "5vh",
}, ...__VLS_functionalComponentArgsRest(__VLS_289));
__VLS_291.slots.default;
if (__VLS_ctx.selectedLog) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "log-detail" },
    });
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
        label: "时间戳",
    }));
    const __VLS_298 = __VLS_297({
        label: "时间戳",
    }, ...__VLS_functionalComponentArgsRest(__VLS_297));
    __VLS_299.slots.default;
    (__VLS_ctx.selectedLog.timestamp);
    var __VLS_299;
    const __VLS_300 = {}.ElDescriptionsItem;
    /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
    // @ts-ignore
    const __VLS_301 = __VLS_asFunctionalComponent(__VLS_300, new __VLS_300({
        label: "日志级别",
    }));
    const __VLS_302 = __VLS_301({
        label: "日志级别",
    }, ...__VLS_functionalComponentArgsRest(__VLS_301));
    __VLS_303.slots.default;
    const __VLS_304 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_305 = __VLS_asFunctionalComponent(__VLS_304, new __VLS_304({
        type: (__VLS_ctx.getLogLevelType(__VLS_ctx.selectedLog.level)),
    }));
    const __VLS_306 = __VLS_305({
        type: (__VLS_ctx.getLogLevelType(__VLS_ctx.selectedLog.level)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_305));
    __VLS_307.slots.default;
    (__VLS_ctx.selectedLog.level.toUpperCase());
    var __VLS_307;
    var __VLS_303;
    const __VLS_308 = {}.ElDescriptionsItem;
    /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
    // @ts-ignore
    const __VLS_309 = __VLS_asFunctionalComponent(__VLS_308, new __VLS_308({
        label: "来源模块",
    }));
    const __VLS_310 = __VLS_309({
        label: "来源模块",
    }, ...__VLS_functionalComponentArgsRest(__VLS_309));
    __VLS_311.slots.default;
    const __VLS_312 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_313 = __VLS_asFunctionalComponent(__VLS_312, new __VLS_312({
        type: (__VLS_ctx.getSourceType(__VLS_ctx.selectedLog.source)),
    }));
    const __VLS_314 = __VLS_313({
        type: (__VLS_ctx.getSourceType(__VLS_ctx.selectedLog.source)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_313));
    __VLS_315.slots.default;
    (__VLS_ctx.getSourceText(__VLS_ctx.selectedLog.source));
    var __VLS_315;
    var __VLS_311;
    const __VLS_316 = {}.ElDescriptionsItem;
    /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
    // @ts-ignore
    const __VLS_317 = __VLS_asFunctionalComponent(__VLS_316, new __VLS_316({
        label: "组件",
    }));
    const __VLS_318 = __VLS_317({
        label: "组件",
    }, ...__VLS_functionalComponentArgsRest(__VLS_317));
    __VLS_319.slots.default;
    (__VLS_ctx.selectedLog.component);
    var __VLS_319;
    const __VLS_320 = {}.ElDescriptionsItem;
    /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
    // @ts-ignore
    const __VLS_321 = __VLS_asFunctionalComponent(__VLS_320, new __VLS_320({
        label: "线程ID",
    }));
    const __VLS_322 = __VLS_321({
        label: "线程ID",
    }, ...__VLS_functionalComponentArgsRest(__VLS_321));
    __VLS_323.slots.default;
    (__VLS_ctx.selectedLog.threadId);
    var __VLS_323;
    const __VLS_324 = {}.ElDescriptionsItem;
    /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
    // @ts-ignore
    const __VLS_325 = __VLS_asFunctionalComponent(__VLS_324, new __VLS_324({
        label: "用户ID",
    }));
    const __VLS_326 = __VLS_325({
        label: "用户ID",
    }, ...__VLS_functionalComponentArgsRest(__VLS_325));
    __VLS_327.slots.default;
    (__VLS_ctx.selectedLog.userId);
    var __VLS_327;
    const __VLS_328 = {}.ElDescriptionsItem;
    /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
    // @ts-ignore
    const __VLS_329 = __VLS_asFunctionalComponent(__VLS_328, new __VLS_328({
        label: "会话ID",
    }));
    const __VLS_330 = __VLS_329({
        label: "会话ID",
    }, ...__VLS_functionalComponentArgsRest(__VLS_329));
    __VLS_331.slots.default;
    (__VLS_ctx.selectedLog.sessionId);
    var __VLS_331;
    const __VLS_332 = {}.ElDescriptionsItem;
    /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
    // @ts-ignore
    const __VLS_333 = __VLS_asFunctionalComponent(__VLS_332, new __VLS_332({
        label: "IP地址",
    }));
    const __VLS_334 = __VLS_333({
        label: "IP地址",
    }, ...__VLS_functionalComponentArgsRest(__VLS_333));
    __VLS_335.slots.default;
    (__VLS_ctx.selectedLog.ipAddress);
    var __VLS_335;
    var __VLS_295;
    const __VLS_336 = {}.ElDivider;
    /** @type {[typeof __VLS_components.ElDivider, typeof __VLS_components.elDivider, typeof __VLS_components.ElDivider, typeof __VLS_components.elDivider, ]} */ ;
    // @ts-ignore
    const __VLS_337 = __VLS_asFunctionalComponent(__VLS_336, new __VLS_336({}));
    const __VLS_338 = __VLS_337({}, ...__VLS_functionalComponentArgsRest(__VLS_337));
    __VLS_339.slots.default;
    var __VLS_339;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "message-content" },
    });
    (__VLS_ctx.selectedLog.message);
    const __VLS_340 = {}.ElDivider;
    /** @type {[typeof __VLS_components.ElDivider, typeof __VLS_components.elDivider, typeof __VLS_components.ElDivider, typeof __VLS_components.elDivider, ]} */ ;
    // @ts-ignore
    const __VLS_341 = __VLS_asFunctionalComponent(__VLS_340, new __VLS_340({}));
    const __VLS_342 = __VLS_341({}, ...__VLS_functionalComponentArgsRest(__VLS_341));
    __VLS_343.slots.default;
    var __VLS_343;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "stack-content" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.pre, __VLS_intrinsicElements.pre)({});
    (__VLS_ctx.selectedLog.stackTrace);
    const __VLS_344 = {}.ElDivider;
    /** @type {[typeof __VLS_components.ElDivider, typeof __VLS_components.elDivider, typeof __VLS_components.ElDivider, typeof __VLS_components.elDivider, ]} */ ;
    // @ts-ignore
    const __VLS_345 = __VLS_asFunctionalComponent(__VLS_344, new __VLS_344({}));
    const __VLS_346 = __VLS_345({}, ...__VLS_functionalComponentArgsRest(__VLS_345));
    __VLS_347.slots.default;
    var __VLS_347;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "related-data" },
    });
    for (const [value, key] of __VLS_getVForSourceType((__VLS_ctx.selectedLog.metadata))) {
        const __VLS_348 = {}.ElTag;
        /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
        // @ts-ignore
        const __VLS_349 = __VLS_asFunctionalComponent(__VLS_348, new __VLS_348({
            key: (key),
            ...{ class: "metadata-tag" },
        }));
        const __VLS_350 = __VLS_349({
            key: (key),
            ...{ class: "metadata-tag" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_349));
        __VLS_351.slots.default;
        (key);
        (value);
        var __VLS_351;
    }
}
{
    const { footer: __VLS_thisSlot } = __VLS_291.slots;
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
    }));
    const __VLS_358 = __VLS_357({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_357));
    let __VLS_360;
    let __VLS_361;
    let __VLS_362;
    const __VLS_363 = {
        onClick: (...[$event]) => {
            __VLS_ctx.logDetailVisible = false;
        }
    };
    __VLS_359.slots.default;
    var __VLS_359;
    const __VLS_364 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_365 = __VLS_asFunctionalComponent(__VLS_364, new __VLS_364({
        ...{ 'onClick': {} },
        type: "primary",
    }));
    const __VLS_366 = __VLS_365({
        ...{ 'onClick': {} },
        type: "primary",
    }, ...__VLS_functionalComponentArgsRest(__VLS_365));
    let __VLS_368;
    let __VLS_369;
    let __VLS_370;
    const __VLS_371 = {
        onClick: (__VLS_ctx.exportSingleLog)
    };
    __VLS_367.slots.default;
    var __VLS_367;
    var __VLS_355;
}
var __VLS_291;
if (__VLS_ctx.showRealtimeStream) {
    const __VLS_372 = {}.ElCard;
    /** @type {[typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ]} */ ;
    // @ts-ignore
    const __VLS_373 = __VLS_asFunctionalComponent(__VLS_372, new __VLS_372({
        ...{ class: "realtime-card" },
    }));
    const __VLS_374 = __VLS_373({
        ...{ class: "realtime-card" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_373));
    __VLS_375.slots.default;
    {
        const { header: __VLS_thisSlot } = __VLS_375.slots;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "card-header" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        const __VLS_376 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_377 = __VLS_asFunctionalComponent(__VLS_376, new __VLS_376({
            ...{ 'onClick': {} },
            type: "danger",
            size: "small",
        }));
        const __VLS_378 = __VLS_377({
            ...{ 'onClick': {} },
            type: "danger",
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_377));
        let __VLS_380;
        let __VLS_381;
        let __VLS_382;
        const __VLS_383 = {
            onClick: (__VLS_ctx.toggleRealtimeStream)
        };
        __VLS_379.slots.default;
        var __VLS_379;
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
        const __VLS_384 = {}.ElTag;
        /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
        // @ts-ignore
        const __VLS_385 = __VLS_asFunctionalComponent(__VLS_384, new __VLS_384({
            type: (__VLS_ctx.getLogLevelType(log.level)),
            size: "small",
        }));
        const __VLS_386 = __VLS_385({
            type: (__VLS_ctx.getLogLevelType(log.level)),
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_385));
        __VLS_387.slots.default;
        (log.level);
        var __VLS_387;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "log-content" },
        });
        (log.message);
    }
    var __VLS_375;
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "float-actions" },
});
const __VLS_388 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_389 = __VLS_asFunctionalComponent(__VLS_388, new __VLS_388({
    ...{ 'onClick': {} },
    type: "primary",
    icon: (__VLS_ctx.showRealtimeStream ? 'VideoPause' : 'VideoPlay'),
    circle: true,
    title: (__VLS_ctx.showRealtimeStream ? '停止实时流' : '开启实时流'),
}));
const __VLS_390 = __VLS_389({
    ...{ 'onClick': {} },
    type: "primary",
    icon: (__VLS_ctx.showRealtimeStream ? 'VideoPause' : 'VideoPlay'),
    circle: true,
    title: (__VLS_ctx.showRealtimeStream ? '停止实时流' : '开启实时流'),
}, ...__VLS_functionalComponentArgsRest(__VLS_389));
let __VLS_392;
let __VLS_393;
let __VLS_394;
const __VLS_395 = {
    onClick: (__VLS_ctx.toggleRealtimeStream)
};
var __VLS_391;
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
/** @type {__VLS_StyleScopedClasses['stack-trace']} */ ;
/** @type {__VLS_StyleScopedClasses['log-message']} */ ;
/** @type {__VLS_StyleScopedClasses['pagination-wrapper']} */ ;
/** @type {__VLS_StyleScopedClasses['log-detail']} */ ;
/** @type {__VLS_StyleScopedClasses['message-content']} */ ;
/** @type {__VLS_StyleScopedClasses['stack-content']} */ ;
/** @type {__VLS_StyleScopedClasses['related-data']} */ ;
/** @type {__VLS_StyleScopedClasses['metadata-tag']} */ ;
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
            Refresh: Refresh,
            Delete: Delete,
            Download: Download,
            logLevel: logLevel,
            logSource: logSource,
            dateRange: dateRange,
            searchKeyword: searchKeyword,
            currentPage: currentPage,
            pageSize: pageSize,
            autoRefresh: autoRefresh,
            showDetails: showDetails,
            logDetailVisible: logDetailVisible,
            selectedLog: selectedLog,
            showRealtimeStream: showRealtimeStream,
            totalLogs: totalLogs,
            errorLogs: errorLogs,
            warningLogs: warningLogs,
            todayLogs: todayLogs,
            realtimeLogs: realtimeLogs,
            filteredLogs: filteredLogs,
            getLogLevelType: getLogLevelType,
            getSourceType: getSourceType,
            getSourceText: getSourceText,
            highlightMessage: highlightMessage,
            formatTime: formatTime,
            refreshLogs: refreshLogs,
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