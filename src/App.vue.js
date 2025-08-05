import { ref, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useAppStore } from './stores/index';
import { Search, DataBoard, TrendCharts, Connection, ChatLineSquare, Setting, Document } from '@element-plus/icons-vue';
import { initDataPersistence } from './services/dataPersistence';
import { ElMessage } from 'element-plus';
const router = useRouter();
const store = useAppStore();
const selectedModelId = ref('');
const searchDialogVisible = ref(false);
const searchResults = ref([]);
const isSearching = ref(false);
const searchTimeout = ref(null);
// 模型切换处理函数
//后续可在此处添加模型切换时的额外逻辑
const handleModelChange = (modelId) => {
    const model = store.models.find(m => m.id === modelId);
    if (model) {
        store.setSelectedModel(model);
    }
};
// 搜索输入处理
const handleSearchInput = () => {
    if (searchTimeout.value) {
        clearTimeout(searchTimeout.value);
    }
    if (store.searchQuery.trim()) {
        searchTimeout.value = setTimeout(() => {
            performSearch();
        }, 500); // 500ms 防抖
    }
    else {
        searchResults.value = [];
        searchDialogVisible.value = false;
    }
};
// 执行搜索
const performSearch = async () => {
    if (!store.searchQuery.trim())
        return;
    isSearching.value = true;
    searchDialogVisible.value = true;
    try {
        const query = store.searchQuery.toLowerCase();
        const results = [];
        // 搜索L1检测数据
        const l1Data = store.l1DetectionData;
        l1Data.forEach((item) => {
            if (matchesSearch(item, query)) {
                results.push({
                    type: 'l1',
                    title: 'L1 置信度差分检测',
                    question: item.question,
                    answer: item.answer,
                    token: item.token,
                    description: `置信度: ${item.confidence}`,
                    timestamp: item.timestamp,
                    data: item
                });
            }
        });
        // 搜索L2检测数据
        const l2Data = store.l2DetectionData;
        l2Data.forEach((item) => {
            if (matchesSearch(item, query)) {
                results.push({
                    type: 'l2',
                    title: 'L2 语义漂移差分检测',
                    question: item.question,
                    answer: item.answer,
                    token: item.token,
                    description: `语义相似度: ${item.semanticSimilarity}`,
                    timestamp: item.timestamp,
                    data: item
                });
            }
        });
        // 搜索L3检测数据
        const l3Data = store.l3DetectionData;
        l3Data.forEach((item) => {
            if (matchesSearch(item, query)) {
                results.push({
                    type: 'l3',
                    title: 'L3 思维链一致性检测',
                    question: item.question,
                    answer: item.answer,
                    token: item.token,
                    description: `一致性评分: ${item.consistencyScore}`,
                    timestamp: item.timestamp,
                    data: item
                });
            }
        });
        // 搜索L4检测数据
        const l4Data = store.l4DetectionData;
        l4Data.forEach((item) => {
            if (matchesSearch(item, query)) {
                results.push({
                    type: 'l4',
                    title: 'L4 触发词优化搜索',
                    question: item.question,
                    answer: item.answer,
                    token: item.token,
                    description: `触发词: ${item.triggerWord}`,
                    timestamp: item.timestamp,
                    data: item
                });
            }
        });
        searchResults.value = results.slice(0, 20); // 限制结果数量
    }
    catch (error) {
        console.error('搜索出错:', error);
        ElMessage.error('搜索时发生错误');
    }
    finally {
        isSearching.value = false;
    }
};
// 匹配搜索条件
const matchesSearch = (item, query) => {
    const searchFields = [
        item.question,
        item.answer,
        item.token,
        item.description
    ].filter(Boolean);
    return searchFields.some(field => field.toLowerCase().includes(query));
};
// 获取结果类型颜色
const getResultTypeColor = (type) => {
    const colors = {
        l1: 'success',
        l2: 'warning',
        l3: 'info',
        l4: 'danger'
    };
    return colors[type] || 'primary';
};
// 获取结果类型标签
const getResultTypeLabel = (type) => {
    const labels = {
        l1: 'L1',
        l2: 'L2',
        l3: 'L3',
        l4: 'L4'
    };
    return labels[type] || type.toUpperCase();
};
// 格式化时间
const formatTime = (timestamp) => {
    if (!timestamp)
        return '';
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN');
};
// 导航到搜索结果
const navigateToResult = (result) => {
    const routes = {
        l1: '/l1-detection',
        l2: '/l2-detection',
        l3: '/l3-detection',
        l4: '/l4-detection'
    };
    const route = routes[result.type];
    if (route) {
        router.push(route);
        // 可以在这里设置store中的当前数据，以便在目标页面显示
        store.setCurrentSearchResult(result);
    }
    searchDialogVisible.value = false;
};
// 搜索对话框关闭处理
const handleSearchDialogClose = () => {
    searchDialogVisible.value = false;
    store.searchQuery = '';
    searchResults.value = [];
};
const handleSearch = () => {
    performSearch();
};
const goToHome = () => {
    router.push('/');
};
// 监听搜索查询变化
watch(() => store.searchQuery, (newQuery) => {
    if (!newQuery) {
        searchResults.value = [];
        searchDialogVisible.value = false;
    }
});
onMounted(() => {
    // 初始化选择第一个模型、适配器和批次
    //后续可在此处添加模型初始化时的额外逻辑
    if (store.models && store.models.length > 0) {
        selectedModelId.value = store.models[0].id;
        store.setSelectedModel(store.models[0]);
    }
    // 初始化数据持久化
    initDataPersistence();
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['logo']} */ ;
/** @type {__VLS_StyleScopedClasses['search-result-item']} */ ;
/** @type {__VLS_StyleScopedClasses['result-field']} */ ;
// CSS variable injection 
// CSS variable injection end 
const __VLS_0 = {}.ElContainer;
/** @type {[typeof __VLS_components.ElContainer, typeof __VLS_components.elContainer, typeof __VLS_components.ElContainer, typeof __VLS_components.elContainer, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    ...{ class: "app-container" },
}));
const __VLS_2 = __VLS_1({
    ...{ class: "app-container" },
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
var __VLS_4 = {};
__VLS_3.slots.default;
const __VLS_5 = {}.ElHeader;
/** @type {[typeof __VLS_components.ElHeader, typeof __VLS_components.elHeader, typeof __VLS_components.ElHeader, typeof __VLS_components.elHeader, ]} */ ;
// @ts-ignore
const __VLS_6 = __VLS_asFunctionalComponent(__VLS_5, new __VLS_5({
    ...{ class: "header" },
}));
const __VLS_7 = __VLS_6({
    ...{ class: "header" },
}, ...__VLS_functionalComponentArgsRest(__VLS_6));
__VLS_8.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "header-left" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ onClick: (__VLS_ctx.goToHome) },
    ...{ class: "logo" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.img)({
    src: "/logo.png",
    alt: "Logo",
    ...{ class: "logo-image" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "logo-text" },
});
const __VLS_9 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_10 = __VLS_asFunctionalComponent(__VLS_9, new __VLS_9({
    ...{ 'onChange': {} },
    modelValue: (__VLS_ctx.selectedModelId),
    placeholder: "选择模型",
    ...{ class: "model-select" },
}));
const __VLS_11 = __VLS_10({
    ...{ 'onChange': {} },
    modelValue: (__VLS_ctx.selectedModelId),
    placeholder: "选择模型",
    ...{ class: "model-select" },
}, ...__VLS_functionalComponentArgsRest(__VLS_10));
let __VLS_13;
let __VLS_14;
let __VLS_15;
const __VLS_16 = {
    onChange: (__VLS_ctx.handleModelChange)
};
__VLS_12.slots.default;
for (const [model] of __VLS_getVForSourceType((__VLS_ctx.store.models))) {
    const __VLS_17 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_18 = __VLS_asFunctionalComponent(__VLS_17, new __VLS_17({
        key: (model.id),
        label: (model.name),
        value: (model.id),
    }));
    const __VLS_19 = __VLS_18({
        key: (model.id),
        label: (model.name),
        value: (model.id),
    }, ...__VLS_functionalComponentArgsRest(__VLS_18));
    __VLS_20.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "model-option" },
    });
    const __VLS_21 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_22 = __VLS_asFunctionalComponent(__VLS_21, new __VLS_21({
        type: (model.type === 'local' ? 'success' : 'primary'),
        size: "small",
    }));
    const __VLS_23 = __VLS_22({
        type: (model.type === 'local' ? 'success' : 'primary'),
        size: "small",
    }, ...__VLS_functionalComponentArgsRest(__VLS_22));
    __VLS_24.slots.default;
    (model.type === 'local' ? '本地' : '远程');
    var __VLS_24;
    (model.name);
    var __VLS_20;
}
var __VLS_12;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "header-right" },
});
const __VLS_25 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_26 = __VLS_asFunctionalComponent(__VLS_25, new __VLS_25({
    ...{ 'onKeyup': {} },
    ...{ 'onInput': {} },
    modelValue: (__VLS_ctx.store.searchQuery),
    placeholder: "搜索 token、问题或描述...",
    ...{ class: "search-input" },
    clearable: true,
}));
const __VLS_27 = __VLS_26({
    ...{ 'onKeyup': {} },
    ...{ 'onInput': {} },
    modelValue: (__VLS_ctx.store.searchQuery),
    placeholder: "搜索 token、问题或描述...",
    ...{ class: "search-input" },
    clearable: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_26));
let __VLS_29;
let __VLS_30;
let __VLS_31;
const __VLS_32 = {
    onKeyup: (__VLS_ctx.handleSearch)
};
const __VLS_33 = {
    onInput: (__VLS_ctx.handleSearchInput)
};
__VLS_28.slots.default;
{
    const { prefix: __VLS_thisSlot } = __VLS_28.slots;
    const __VLS_34 = {}.ElIcon;
    /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
    // @ts-ignore
    const __VLS_35 = __VLS_asFunctionalComponent(__VLS_34, new __VLS_34({}));
    const __VLS_36 = __VLS_35({}, ...__VLS_functionalComponentArgsRest(__VLS_35));
    __VLS_37.slots.default;
    const __VLS_38 = {}.Search;
    /** @type {[typeof __VLS_components.Search, ]} */ ;
    // @ts-ignore
    const __VLS_39 = __VLS_asFunctionalComponent(__VLS_38, new __VLS_38({}));
    const __VLS_40 = __VLS_39({}, ...__VLS_functionalComponentArgsRest(__VLS_39));
    var __VLS_37;
}
var __VLS_28;
var __VLS_8;
const __VLS_42 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_43 = __VLS_asFunctionalComponent(__VLS_42, new __VLS_42({
    modelValue: (__VLS_ctx.searchDialogVisible),
    title: "搜索结果",
    width: "80%",
    beforeClose: (__VLS_ctx.handleSearchDialogClose),
}));
const __VLS_44 = __VLS_43({
    modelValue: (__VLS_ctx.searchDialogVisible),
    title: "搜索结果",
    width: "80%",
    beforeClose: (__VLS_ctx.handleSearchDialogClose),
}, ...__VLS_functionalComponentArgsRest(__VLS_43));
__VLS_45.slots.default;
if (__VLS_ctx.searchResults.length > 0) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "search-results" },
    });
    for (const [result, index] of __VLS_getVForSourceType((__VLS_ctx.searchResults))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: (index),
            ...{ class: "search-result-item" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "result-header" },
        });
        const __VLS_46 = {}.ElTag;
        /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
        // @ts-ignore
        const __VLS_47 = __VLS_asFunctionalComponent(__VLS_46, new __VLS_46({
            type: (__VLS_ctx.getResultTypeColor(result.type)),
            size: "small",
        }));
        const __VLS_48 = __VLS_47({
            type: (__VLS_ctx.getResultTypeColor(result.type)),
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_47));
        __VLS_49.slots.default;
        (__VLS_ctx.getResultTypeLabel(result.type));
        var __VLS_49;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "result-title" },
        });
        (result.title);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "result-content" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "result-field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (result.question);
        if (result.answer) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "result-field" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            (result.answer);
        }
        if (result.token) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "result-field" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            (result.token);
        }
        if (result.description) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "result-field" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            (result.description);
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "result-meta" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "result-time" },
        });
        (__VLS_ctx.formatTime(result.timestamp));
        const __VLS_50 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_51 = __VLS_asFunctionalComponent(__VLS_50, new __VLS_50({
            ...{ 'onClick': {} },
            type: "primary",
            size: "small",
        }));
        const __VLS_52 = __VLS_51({
            ...{ 'onClick': {} },
            type: "primary",
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_51));
        let __VLS_54;
        let __VLS_55;
        let __VLS_56;
        const __VLS_57 = {
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.searchResults.length > 0))
                    return;
                __VLS_ctx.navigateToResult(result);
            }
        };
        __VLS_53.slots.default;
        var __VLS_53;
    }
}
else if (__VLS_ctx.store.searchQuery && !__VLS_ctx.isSearching) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "no-results" },
    });
    const __VLS_58 = {}.ElEmpty;
    /** @type {[typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ]} */ ;
    // @ts-ignore
    const __VLS_59 = __VLS_asFunctionalComponent(__VLS_58, new __VLS_58({
        description: "未找到相关结果",
    }));
    const __VLS_60 = __VLS_59({
        description: "未找到相关结果",
    }, ...__VLS_functionalComponentArgsRest(__VLS_59));
}
if (__VLS_ctx.isSearching) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "searching" },
    });
    const __VLS_62 = {}.ElLoadingComponent;
    /** @type {[typeof __VLS_components.ElLoadingComponent, typeof __VLS_components.elLoadingComponent, ]} */ ;
    // @ts-ignore
    const __VLS_63 = __VLS_asFunctionalComponent(__VLS_62, new __VLS_62({}));
    const __VLS_64 = __VLS_63({}, ...__VLS_functionalComponentArgsRest(__VLS_63));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
}
var __VLS_45;
const __VLS_66 = {}.ElAside;
/** @type {[typeof __VLS_components.ElAside, typeof __VLS_components.elAside, typeof __VLS_components.ElAside, typeof __VLS_components.elAside, ]} */ ;
// @ts-ignore
const __VLS_67 = __VLS_asFunctionalComponent(__VLS_66, new __VLS_66({
    width: "250px",
    ...{ class: "sidebar" },
}));
const __VLS_68 = __VLS_67({
    width: "250px",
    ...{ class: "sidebar" },
}, ...__VLS_functionalComponentArgsRest(__VLS_67));
__VLS_69.slots.default;
const __VLS_70 = {}.ElMenu;
/** @type {[typeof __VLS_components.ElMenu, typeof __VLS_components.elMenu, typeof __VLS_components.ElMenu, typeof __VLS_components.elMenu, ]} */ ;
// @ts-ignore
const __VLS_71 = __VLS_asFunctionalComponent(__VLS_70, new __VLS_70({
    defaultActive: (__VLS_ctx.$route.path),
    router: true,
    ...{ class: "sidebar-menu" },
    backgroundColor: "#f5f7fa",
    textColor: "#303133",
    activeTextColor: "#409eff",
}));
const __VLS_72 = __VLS_71({
    defaultActive: (__VLS_ctx.$route.path),
    router: true,
    ...{ class: "sidebar-menu" },
    backgroundColor: "#f5f7fa",
    textColor: "#303133",
    activeTextColor: "#409eff",
}, ...__VLS_functionalComponentArgsRest(__VLS_71));
__VLS_73.slots.default;
const __VLS_74 = {}.ElMenuItem;
/** @type {[typeof __VLS_components.ElMenuItem, typeof __VLS_components.elMenuItem, typeof __VLS_components.ElMenuItem, typeof __VLS_components.elMenuItem, ]} */ ;
// @ts-ignore
const __VLS_75 = __VLS_asFunctionalComponent(__VLS_74, new __VLS_74({
    index: "/",
}));
const __VLS_76 = __VLS_75({
    index: "/",
}, ...__VLS_functionalComponentArgsRest(__VLS_75));
__VLS_77.slots.default;
const __VLS_78 = {}.ElIcon;
/** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
// @ts-ignore
const __VLS_79 = __VLS_asFunctionalComponent(__VLS_78, new __VLS_78({}));
const __VLS_80 = __VLS_79({}, ...__VLS_functionalComponentArgsRest(__VLS_79));
__VLS_81.slots.default;
const __VLS_82 = {}.DataBoard;
/** @type {[typeof __VLS_components.DataBoard, ]} */ ;
// @ts-ignore
const __VLS_83 = __VLS_asFunctionalComponent(__VLS_82, new __VLS_82({}));
const __VLS_84 = __VLS_83({}, ...__VLS_functionalComponentArgsRest(__VLS_83));
var __VLS_81;
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
var __VLS_77;
const __VLS_86 = {}.ElMenuItem;
/** @type {[typeof __VLS_components.ElMenuItem, typeof __VLS_components.elMenuItem, typeof __VLS_components.ElMenuItem, typeof __VLS_components.elMenuItem, ]} */ ;
// @ts-ignore
const __VLS_87 = __VLS_asFunctionalComponent(__VLS_86, new __VLS_86({
    index: "/l1-detection",
}));
const __VLS_88 = __VLS_87({
    index: "/l1-detection",
}, ...__VLS_functionalComponentArgsRest(__VLS_87));
__VLS_89.slots.default;
const __VLS_90 = {}.ElIcon;
/** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
// @ts-ignore
const __VLS_91 = __VLS_asFunctionalComponent(__VLS_90, new __VLS_90({}));
const __VLS_92 = __VLS_91({}, ...__VLS_functionalComponentArgsRest(__VLS_91));
__VLS_93.slots.default;
const __VLS_94 = {}.TrendCharts;
/** @type {[typeof __VLS_components.TrendCharts, ]} */ ;
// @ts-ignore
const __VLS_95 = __VLS_asFunctionalComponent(__VLS_94, new __VLS_94({}));
const __VLS_96 = __VLS_95({}, ...__VLS_functionalComponentArgsRest(__VLS_95));
var __VLS_93;
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
var __VLS_89;
const __VLS_98 = {}.ElMenuItem;
/** @type {[typeof __VLS_components.ElMenuItem, typeof __VLS_components.elMenuItem, typeof __VLS_components.ElMenuItem, typeof __VLS_components.elMenuItem, ]} */ ;
// @ts-ignore
const __VLS_99 = __VLS_asFunctionalComponent(__VLS_98, new __VLS_98({
    index: "/l2-detection",
}));
const __VLS_100 = __VLS_99({
    index: "/l2-detection",
}, ...__VLS_functionalComponentArgsRest(__VLS_99));
__VLS_101.slots.default;
const __VLS_102 = {}.ElIcon;
/** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
// @ts-ignore
const __VLS_103 = __VLS_asFunctionalComponent(__VLS_102, new __VLS_102({}));
const __VLS_104 = __VLS_103({}, ...__VLS_functionalComponentArgsRest(__VLS_103));
__VLS_105.slots.default;
const __VLS_106 = {}.Connection;
/** @type {[typeof __VLS_components.Connection, ]} */ ;
// @ts-ignore
const __VLS_107 = __VLS_asFunctionalComponent(__VLS_106, new __VLS_106({}));
const __VLS_108 = __VLS_107({}, ...__VLS_functionalComponentArgsRest(__VLS_107));
var __VLS_105;
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
var __VLS_101;
const __VLS_110 = {}.ElMenuItem;
/** @type {[typeof __VLS_components.ElMenuItem, typeof __VLS_components.elMenuItem, typeof __VLS_components.ElMenuItem, typeof __VLS_components.elMenuItem, ]} */ ;
// @ts-ignore
const __VLS_111 = __VLS_asFunctionalComponent(__VLS_110, new __VLS_110({
    index: "/l3-detection",
}));
const __VLS_112 = __VLS_111({
    index: "/l3-detection",
}, ...__VLS_functionalComponentArgsRest(__VLS_111));
__VLS_113.slots.default;
const __VLS_114 = {}.ElIcon;
/** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
// @ts-ignore
const __VLS_115 = __VLS_asFunctionalComponent(__VLS_114, new __VLS_114({}));
const __VLS_116 = __VLS_115({}, ...__VLS_functionalComponentArgsRest(__VLS_115));
__VLS_117.slots.default;
const __VLS_118 = {}.ChatLineSquare;
/** @type {[typeof __VLS_components.ChatLineSquare, ]} */ ;
// @ts-ignore
const __VLS_119 = __VLS_asFunctionalComponent(__VLS_118, new __VLS_118({}));
const __VLS_120 = __VLS_119({}, ...__VLS_functionalComponentArgsRest(__VLS_119));
var __VLS_117;
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
var __VLS_113;
const __VLS_122 = {}.ElMenuItem;
/** @type {[typeof __VLS_components.ElMenuItem, typeof __VLS_components.elMenuItem, typeof __VLS_components.ElMenuItem, typeof __VLS_components.elMenuItem, ]} */ ;
// @ts-ignore
const __VLS_123 = __VLS_asFunctionalComponent(__VLS_122, new __VLS_122({
    index: "/l4-detection",
}));
const __VLS_124 = __VLS_123({
    index: "/l4-detection",
}, ...__VLS_functionalComponentArgsRest(__VLS_123));
__VLS_125.slots.default;
const __VLS_126 = {}.ElIcon;
/** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
// @ts-ignore
const __VLS_127 = __VLS_asFunctionalComponent(__VLS_126, new __VLS_126({}));
const __VLS_128 = __VLS_127({}, ...__VLS_functionalComponentArgsRest(__VLS_127));
__VLS_129.slots.default;
const __VLS_130 = {}.Setting;
/** @type {[typeof __VLS_components.Setting, ]} */ ;
// @ts-ignore
const __VLS_131 = __VLS_asFunctionalComponent(__VLS_130, new __VLS_130({}));
const __VLS_132 = __VLS_131({}, ...__VLS_functionalComponentArgsRest(__VLS_131));
var __VLS_129;
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
var __VLS_125;
const __VLS_134 = {}.ElMenuItem;
/** @type {[typeof __VLS_components.ElMenuItem, typeof __VLS_components.elMenuItem, typeof __VLS_components.ElMenuItem, typeof __VLS_components.elMenuItem, ]} */ ;
// @ts-ignore
const __VLS_135 = __VLS_asFunctionalComponent(__VLS_134, new __VLS_134({
    index: "/system-logs",
}));
const __VLS_136 = __VLS_135({
    index: "/system-logs",
}, ...__VLS_functionalComponentArgsRest(__VLS_135));
__VLS_137.slots.default;
const __VLS_138 = {}.ElIcon;
/** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
// @ts-ignore
const __VLS_139 = __VLS_asFunctionalComponent(__VLS_138, new __VLS_138({}));
const __VLS_140 = __VLS_139({}, ...__VLS_functionalComponentArgsRest(__VLS_139));
__VLS_141.slots.default;
const __VLS_142 = {}.Document;
/** @type {[typeof __VLS_components.Document, ]} */ ;
// @ts-ignore
const __VLS_143 = __VLS_asFunctionalComponent(__VLS_142, new __VLS_142({}));
const __VLS_144 = __VLS_143({}, ...__VLS_functionalComponentArgsRest(__VLS_143));
var __VLS_141;
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
var __VLS_137;
var __VLS_73;
var __VLS_69;
const __VLS_146 = {}.ElMain;
/** @type {[typeof __VLS_components.ElMain, typeof __VLS_components.elMain, typeof __VLS_components.ElMain, typeof __VLS_components.elMain, ]} */ ;
// @ts-ignore
const __VLS_147 = __VLS_asFunctionalComponent(__VLS_146, new __VLS_146({
    ...{ class: "main-content" },
}));
const __VLS_148 = __VLS_147({
    ...{ class: "main-content" },
}, ...__VLS_functionalComponentArgsRest(__VLS_147));
__VLS_149.slots.default;
const __VLS_150 = {}.RouterView;
/** @type {[typeof __VLS_components.RouterView, typeof __VLS_components.routerView, ]} */ ;
// @ts-ignore
const __VLS_151 = __VLS_asFunctionalComponent(__VLS_150, new __VLS_150({}));
const __VLS_152 = __VLS_151({}, ...__VLS_functionalComponentArgsRest(__VLS_151));
var __VLS_149;
var __VLS_3;
/** @type {__VLS_StyleScopedClasses['app-container']} */ ;
/** @type {__VLS_StyleScopedClasses['header']} */ ;
/** @type {__VLS_StyleScopedClasses['header-left']} */ ;
/** @type {__VLS_StyleScopedClasses['logo']} */ ;
/** @type {__VLS_StyleScopedClasses['logo-image']} */ ;
/** @type {__VLS_StyleScopedClasses['logo-text']} */ ;
/** @type {__VLS_StyleScopedClasses['model-select']} */ ;
/** @type {__VLS_StyleScopedClasses['model-option']} */ ;
/** @type {__VLS_StyleScopedClasses['header-right']} */ ;
/** @type {__VLS_StyleScopedClasses['search-input']} */ ;
/** @type {__VLS_StyleScopedClasses['search-results']} */ ;
/** @type {__VLS_StyleScopedClasses['search-result-item']} */ ;
/** @type {__VLS_StyleScopedClasses['result-header']} */ ;
/** @type {__VLS_StyleScopedClasses['result-title']} */ ;
/** @type {__VLS_StyleScopedClasses['result-content']} */ ;
/** @type {__VLS_StyleScopedClasses['result-field']} */ ;
/** @type {__VLS_StyleScopedClasses['result-field']} */ ;
/** @type {__VLS_StyleScopedClasses['result-field']} */ ;
/** @type {__VLS_StyleScopedClasses['result-field']} */ ;
/** @type {__VLS_StyleScopedClasses['result-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['result-time']} */ ;
/** @type {__VLS_StyleScopedClasses['no-results']} */ ;
/** @type {__VLS_StyleScopedClasses['searching']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar-menu']} */ ;
/** @type {__VLS_StyleScopedClasses['main-content']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            Search: Search,
            DataBoard: DataBoard,
            TrendCharts: TrendCharts,
            Connection: Connection,
            ChatLineSquare: ChatLineSquare,
            Setting: Setting,
            Document: Document,
            store: store,
            selectedModelId: selectedModelId,
            searchDialogVisible: searchDialogVisible,
            searchResults: searchResults,
            isSearching: isSearching,
            handleModelChange: handleModelChange,
            handleSearchInput: handleSearchInput,
            getResultTypeColor: getResultTypeColor,
            getResultTypeLabel: getResultTypeLabel,
            formatTime: formatTime,
            navigateToResult: navigateToResult,
            handleSearchDialogClose: handleSearchDialogClose,
            handleSearch: handleSearch,
            goToHome: goToHome,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
//# sourceMappingURL=App.vue.js.map