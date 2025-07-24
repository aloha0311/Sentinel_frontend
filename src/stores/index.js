import { defineStore } from 'pinia';
import { ref } from 'vue';
export const useAppStore = defineStore('app', () => {
    // 模型相关
    const selectedModel = ref(null);
    const models = ref([
        { id: 'gpt-4o', name: 'GPT-4o', type: 'remote', status: 'active' },
        { id: 'deepseek-r1-671b', name: 'DeepSeek-R1-671B', type: 'remote', status: 'active' },
        { id: 'llama-2-7b-chat', name: 'LLaMA-2 7B Chat', type: 'local', status: 'active' },
        { id: 'vicuna-7b', name: 'Vicuna 7B', type: 'local', status: 'active' }
    ]);
    // 适配器相关
    const selectedAdapter = ref(null);
    const adapters = ref([
        { id: 'train_badmagic', name: 'train_BadMagic', status: 'active' },
        { id: 'train_char', name: 'train_char', status: 'active' },
        { id: 'train_dizss', name: 'train_dizss', status: 'active' }
    ]);
    // 检测批次相关
    const selectedBatch = ref(null);
    const batches = ref([
        {
            id: 'batch-001',
            name: '批次 #001',
            modelId: 'gpt-4',
            createdAt: '2024-01-15 10:30:00',
            status: 'completed',
            progress: 100
        }
    ]);
    // 全局搜索
    const searchQuery = ref('');
    // 检测结果相关
    const detectionResults = ref({
        l1: {
            anomalousTokens: [],
            heatmapData: [],
            summary: { totalTokens: 0, anomalousCount: 0, riskLevel: 'low' }
        },
        l2: {
            comparisons: [],
            similarityScores: [],
            summary: { averageSimilarity: 0, anomalousCount: 0, riskLevel: 'low' }
        },
        l3: {
            consistencyChecks: [],
            mismatches: [],
            summary: { totalChecks: 0, mismatchCount: 0, riskLevel: 'low' }
        },
        l4: {
            optimizationRuns: [],
            bestTriggers: [],
            summary: { bestScore: 0, generationsCount: 0, status: 'idle' }
        }
    });
    // Actions
    const setSelectedModel = (model) => {
        selectedModel.value = model;
    };
    const setSelectedAdapter = (adapter) => {
        selectedAdapter.value = adapter;
    };
    const setSelectedBatch = (batch) => {
        selectedBatch.value = batch;
    };
    const updateSearchQuery = (query) => {
        searchQuery.value = query;
    };
    const updateDetectionResults = (layer, data) => {
        if (detectionResults.value[layer]) {
            detectionResults.value[layer] = {
                ...detectionResults.value[layer],
                ...data
            };
        }
    };
    return {
        selectedModel,
        models,
        selectedAdapter,
        adapters,
        selectedBatch,
        batches,
        searchQuery,
        detectionResults,
        setSelectedModel,
        setSelectedAdapter,
        setSelectedBatch,
        updateSearchQuery,
        updateDetectionResults
    };
});
//# sourceMappingURL=index.js.map