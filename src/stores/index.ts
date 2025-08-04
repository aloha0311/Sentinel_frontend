import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface ModelInfo {
  id: string
  name: string
  type: 'local' | 'remote'
  status: 'active' | 'inactive'
}


export const useAppStore = defineStore('app', () => {
  // 模型相关
  const selectedModel = ref<ModelInfo | null>(null)
  const models = ref<ModelInfo[]>([
    { id: 'gpt-4o', name: 'GPT-4o', type: 'remote', status: 'active' }
    // TODO: 后续可在此处添加更多模型
    // 示例格式：
    // { id: 'deepseek-r1-671b', name: 'DeepSeek-R1-671B', type: 'remote', status: 'active' },

  ])



  // 全局搜索
  const searchQuery = ref('')

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
  })

  // Actions
  const setSelectedModel = (model: ModelInfo) => {
    selectedModel.value = model
  }


  const updateSearchQuery = (query: string) => {
    searchQuery.value = query
  }

  const updateDetectionResults = (layer: string, data: any) => {
    if (detectionResults.value[layer as keyof typeof detectionResults.value]) {
      detectionResults.value[layer as keyof typeof detectionResults.value] = {
        ...detectionResults.value[layer as keyof typeof detectionResults.value],
        ...data
      }
    }
  }

  return {
    selectedModel,
    models,
    searchQuery,
    detectionResults,
    setSelectedModel,
    updateSearchQuery,
    updateDetectionResults
  }
}) 