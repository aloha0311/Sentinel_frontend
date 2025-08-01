import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAppStore } from './stores/index';
import { Search, DataBoard, TrendCharts, Connection, ChatLineSquare, Setting, Document } from '@element-plus/icons-vue';
const router = useRouter();
const store = useAppStore();
const selectedModelId = ref('');
// 模型切换处理函数
// TODO: 后续可在此处添加模型切换时的额外逻辑
const handleModelChange = (modelId) => {
    const model = store.models.find(m => m.id === modelId);
    if (model) {
        store.setSelectedModel(model);
    }
};
const handleSearch = () => {
    // TODO: 实现搜索功能
    console.log('搜索:', store.searchQuery);
};
const goToHome = () => {
    router.push('/');
};
onMounted(() => {
    // 初始化选择第一个模型、适配器和批次
    // TODO: 后续可在此处添加模型初始化时的额外逻辑
    if (store.models && store.models.length > 0) {
        selectedModelId.value = store.models[0].id;
        store.setSelectedModel(store.models[0]);
    }
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['logo']} */ ;
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
    modelValue: (__VLS_ctx.store.searchQuery),
    placeholder: "搜索 token、问题或描述...",
    ...{ class: "search-input" },
}));
const __VLS_27 = __VLS_26({
    ...{ 'onKeyup': {} },
    modelValue: (__VLS_ctx.store.searchQuery),
    placeholder: "搜索 token、问题或描述...",
    ...{ class: "search-input" },
}, ...__VLS_functionalComponentArgsRest(__VLS_26));
let __VLS_29;
let __VLS_30;
let __VLS_31;
const __VLS_32 = {
    onKeyup: (__VLS_ctx.handleSearch)
};
__VLS_28.slots.default;
{
    const { prefix: __VLS_thisSlot } = __VLS_28.slots;
    const __VLS_33 = {}.ElIcon;
    /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
    // @ts-ignore
    const __VLS_34 = __VLS_asFunctionalComponent(__VLS_33, new __VLS_33({}));
    const __VLS_35 = __VLS_34({}, ...__VLS_functionalComponentArgsRest(__VLS_34));
    __VLS_36.slots.default;
    const __VLS_37 = {}.Search;
    /** @type {[typeof __VLS_components.Search, ]} */ ;
    // @ts-ignore
    const __VLS_38 = __VLS_asFunctionalComponent(__VLS_37, new __VLS_37({}));
    const __VLS_39 = __VLS_38({}, ...__VLS_functionalComponentArgsRest(__VLS_38));
    var __VLS_36;
}
var __VLS_28;
var __VLS_8;
const __VLS_41 = {}.ElContainer;
/** @type {[typeof __VLS_components.ElContainer, typeof __VLS_components.elContainer, typeof __VLS_components.ElContainer, typeof __VLS_components.elContainer, ]} */ ;
// @ts-ignore
const __VLS_42 = __VLS_asFunctionalComponent(__VLS_41, new __VLS_41({}));
const __VLS_43 = __VLS_42({}, ...__VLS_functionalComponentArgsRest(__VLS_42));
__VLS_44.slots.default;
const __VLS_45 = {}.ElAside;
/** @type {[typeof __VLS_components.ElAside, typeof __VLS_components.elAside, typeof __VLS_components.ElAside, typeof __VLS_components.elAside, ]} */ ;
// @ts-ignore
const __VLS_46 = __VLS_asFunctionalComponent(__VLS_45, new __VLS_45({
    width: "250px",
    ...{ class: "sidebar" },
}));
const __VLS_47 = __VLS_46({
    width: "250px",
    ...{ class: "sidebar" },
}, ...__VLS_functionalComponentArgsRest(__VLS_46));
__VLS_48.slots.default;
const __VLS_49 = {}.ElMenu;
/** @type {[typeof __VLS_components.ElMenu, typeof __VLS_components.elMenu, typeof __VLS_components.ElMenu, typeof __VLS_components.elMenu, ]} */ ;
// @ts-ignore
const __VLS_50 = __VLS_asFunctionalComponent(__VLS_49, new __VLS_49({
    defaultActive: (__VLS_ctx.$route.path),
    router: true,
    ...{ class: "sidebar-menu" },
    backgroundColor: "#f5f7fa",
    textColor: "#303133",
    activeTextColor: "#409eff",
}));
const __VLS_51 = __VLS_50({
    defaultActive: (__VLS_ctx.$route.path),
    router: true,
    ...{ class: "sidebar-menu" },
    backgroundColor: "#f5f7fa",
    textColor: "#303133",
    activeTextColor: "#409eff",
}, ...__VLS_functionalComponentArgsRest(__VLS_50));
__VLS_52.slots.default;
const __VLS_53 = {}.ElMenuItem;
/** @type {[typeof __VLS_components.ElMenuItem, typeof __VLS_components.elMenuItem, typeof __VLS_components.ElMenuItem, typeof __VLS_components.elMenuItem, ]} */ ;
// @ts-ignore
const __VLS_54 = __VLS_asFunctionalComponent(__VLS_53, new __VLS_53({
    index: "/",
}));
const __VLS_55 = __VLS_54({
    index: "/",
}, ...__VLS_functionalComponentArgsRest(__VLS_54));
__VLS_56.slots.default;
const __VLS_57 = {}.ElIcon;
/** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
// @ts-ignore
const __VLS_58 = __VLS_asFunctionalComponent(__VLS_57, new __VLS_57({}));
const __VLS_59 = __VLS_58({}, ...__VLS_functionalComponentArgsRest(__VLS_58));
__VLS_60.slots.default;
const __VLS_61 = {}.DataBoard;
/** @type {[typeof __VLS_components.DataBoard, ]} */ ;
// @ts-ignore
const __VLS_62 = __VLS_asFunctionalComponent(__VLS_61, new __VLS_61({}));
const __VLS_63 = __VLS_62({}, ...__VLS_functionalComponentArgsRest(__VLS_62));
var __VLS_60;
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
var __VLS_56;
const __VLS_65 = {}.ElMenuItem;
/** @type {[typeof __VLS_components.ElMenuItem, typeof __VLS_components.elMenuItem, typeof __VLS_components.ElMenuItem, typeof __VLS_components.elMenuItem, ]} */ ;
// @ts-ignore
const __VLS_66 = __VLS_asFunctionalComponent(__VLS_65, new __VLS_65({
    index: "/l1-detection",
}));
const __VLS_67 = __VLS_66({
    index: "/l1-detection",
}, ...__VLS_functionalComponentArgsRest(__VLS_66));
__VLS_68.slots.default;
const __VLS_69 = {}.ElIcon;
/** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
// @ts-ignore
const __VLS_70 = __VLS_asFunctionalComponent(__VLS_69, new __VLS_69({}));
const __VLS_71 = __VLS_70({}, ...__VLS_functionalComponentArgsRest(__VLS_70));
__VLS_72.slots.default;
const __VLS_73 = {}.TrendCharts;
/** @type {[typeof __VLS_components.TrendCharts, ]} */ ;
// @ts-ignore
const __VLS_74 = __VLS_asFunctionalComponent(__VLS_73, new __VLS_73({}));
const __VLS_75 = __VLS_74({}, ...__VLS_functionalComponentArgsRest(__VLS_74));
var __VLS_72;
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
var __VLS_68;
const __VLS_77 = {}.ElMenuItem;
/** @type {[typeof __VLS_components.ElMenuItem, typeof __VLS_components.elMenuItem, typeof __VLS_components.ElMenuItem, typeof __VLS_components.elMenuItem, ]} */ ;
// @ts-ignore
const __VLS_78 = __VLS_asFunctionalComponent(__VLS_77, new __VLS_77({
    index: "/l2-detection",
}));
const __VLS_79 = __VLS_78({
    index: "/l2-detection",
}, ...__VLS_functionalComponentArgsRest(__VLS_78));
__VLS_80.slots.default;
const __VLS_81 = {}.ElIcon;
/** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
// @ts-ignore
const __VLS_82 = __VLS_asFunctionalComponent(__VLS_81, new __VLS_81({}));
const __VLS_83 = __VLS_82({}, ...__VLS_functionalComponentArgsRest(__VLS_82));
__VLS_84.slots.default;
const __VLS_85 = {}.Connection;
/** @type {[typeof __VLS_components.Connection, ]} */ ;
// @ts-ignore
const __VLS_86 = __VLS_asFunctionalComponent(__VLS_85, new __VLS_85({}));
const __VLS_87 = __VLS_86({}, ...__VLS_functionalComponentArgsRest(__VLS_86));
var __VLS_84;
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
var __VLS_80;
const __VLS_89 = {}.ElMenuItem;
/** @type {[typeof __VLS_components.ElMenuItem, typeof __VLS_components.elMenuItem, typeof __VLS_components.ElMenuItem, typeof __VLS_components.elMenuItem, ]} */ ;
// @ts-ignore
const __VLS_90 = __VLS_asFunctionalComponent(__VLS_89, new __VLS_89({
    index: "/l3-detection",
}));
const __VLS_91 = __VLS_90({
    index: "/l3-detection",
}, ...__VLS_functionalComponentArgsRest(__VLS_90));
__VLS_92.slots.default;
const __VLS_93 = {}.ElIcon;
/** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
// @ts-ignore
const __VLS_94 = __VLS_asFunctionalComponent(__VLS_93, new __VLS_93({}));
const __VLS_95 = __VLS_94({}, ...__VLS_functionalComponentArgsRest(__VLS_94));
__VLS_96.slots.default;
const __VLS_97 = {}.ChatLineSquare;
/** @type {[typeof __VLS_components.ChatLineSquare, ]} */ ;
// @ts-ignore
const __VLS_98 = __VLS_asFunctionalComponent(__VLS_97, new __VLS_97({}));
const __VLS_99 = __VLS_98({}, ...__VLS_functionalComponentArgsRest(__VLS_98));
var __VLS_96;
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
var __VLS_92;
const __VLS_101 = {}.ElMenuItem;
/** @type {[typeof __VLS_components.ElMenuItem, typeof __VLS_components.elMenuItem, typeof __VLS_components.ElMenuItem, typeof __VLS_components.elMenuItem, ]} */ ;
// @ts-ignore
const __VLS_102 = __VLS_asFunctionalComponent(__VLS_101, new __VLS_101({
    index: "/l4-detection",
}));
const __VLS_103 = __VLS_102({
    index: "/l4-detection",
}, ...__VLS_functionalComponentArgsRest(__VLS_102));
__VLS_104.slots.default;
const __VLS_105 = {}.ElIcon;
/** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
// @ts-ignore
const __VLS_106 = __VLS_asFunctionalComponent(__VLS_105, new __VLS_105({}));
const __VLS_107 = __VLS_106({}, ...__VLS_functionalComponentArgsRest(__VLS_106));
__VLS_108.slots.default;
const __VLS_109 = {}.Setting;
/** @type {[typeof __VLS_components.Setting, ]} */ ;
// @ts-ignore
const __VLS_110 = __VLS_asFunctionalComponent(__VLS_109, new __VLS_109({}));
const __VLS_111 = __VLS_110({}, ...__VLS_functionalComponentArgsRest(__VLS_110));
var __VLS_108;
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
var __VLS_104;
const __VLS_113 = {}.ElMenuItem;
/** @type {[typeof __VLS_components.ElMenuItem, typeof __VLS_components.elMenuItem, typeof __VLS_components.ElMenuItem, typeof __VLS_components.elMenuItem, ]} */ ;
// @ts-ignore
const __VLS_114 = __VLS_asFunctionalComponent(__VLS_113, new __VLS_113({
    index: "/system-logs",
}));
const __VLS_115 = __VLS_114({
    index: "/system-logs",
}, ...__VLS_functionalComponentArgsRest(__VLS_114));
__VLS_116.slots.default;
const __VLS_117 = {}.ElIcon;
/** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
// @ts-ignore
const __VLS_118 = __VLS_asFunctionalComponent(__VLS_117, new __VLS_117({}));
const __VLS_119 = __VLS_118({}, ...__VLS_functionalComponentArgsRest(__VLS_118));
__VLS_120.slots.default;
const __VLS_121 = {}.Document;
/** @type {[typeof __VLS_components.Document, ]} */ ;
// @ts-ignore
const __VLS_122 = __VLS_asFunctionalComponent(__VLS_121, new __VLS_121({}));
const __VLS_123 = __VLS_122({}, ...__VLS_functionalComponentArgsRest(__VLS_122));
var __VLS_120;
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
var __VLS_116;
var __VLS_52;
var __VLS_48;
const __VLS_125 = {}.ElMain;
/** @type {[typeof __VLS_components.ElMain, typeof __VLS_components.elMain, typeof __VLS_components.ElMain, typeof __VLS_components.elMain, ]} */ ;
// @ts-ignore
const __VLS_126 = __VLS_asFunctionalComponent(__VLS_125, new __VLS_125({
    ...{ class: "main-content" },
}));
const __VLS_127 = __VLS_126({
    ...{ class: "main-content" },
}, ...__VLS_functionalComponentArgsRest(__VLS_126));
__VLS_128.slots.default;
const __VLS_129 = {}.RouterView;
/** @type {[typeof __VLS_components.RouterView, typeof __VLS_components.routerView, ]} */ ;
// @ts-ignore
const __VLS_130 = __VLS_asFunctionalComponent(__VLS_129, new __VLS_129({}));
const __VLS_131 = __VLS_130({}, ...__VLS_functionalComponentArgsRest(__VLS_130));
var __VLS_128;
var __VLS_44;
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
            handleModelChange: handleModelChange,
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