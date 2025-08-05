import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { saveDataToStorage } from '../services/dataPersistence'

// 定义操作记录类型
export interface OperationRecord {
  id: string
  timestamp: string
  page: 'L1' | 'L2' | 'L3' | 'L4'
  operation: string
  details: any
  riskLevel: 'low' | 'medium' | 'high'
  success: boolean
}

// L1检测记录
export interface L1Record {
  id: string
  timestamp: string
  totalTokens: number
  anomalousTokens: Array<{
    token: string
    tokenId: number
    deltaPPL: number
    risk: 'low' | 'medium' | 'high'
  }>
  highRiskCount: number
  mediumRiskCount: number
  lowRiskCount: number
  topN: number
}

// L2检测记录
export interface L2Record {
  id: string
  timestamp: string
  type: 'comparison' | 'injection'
  query: string
  similarity: number
  injectionSuccess?: boolean
  triggerKeyword?: string
  riskLevel: 'low' | 'medium' | 'high'
  batchInfo?: {
    totalCount: number
    successCount: number
    successRate: number
  }
}

// L3检测记录
export interface L3Record {
  id: string
  timestamp: string
  sampleId: string
  prompt: string
  reasoning: string
  final: string
  verdict: 'consistent' | 'mismatch' | 'unclear'
  similarity: number
  reasoningLength: number
  repetitionRate: number
  templateDetected: boolean
  riskLevel: 'low' | 'medium' | 'high'
  mismatchCount?: number  // 不一致的数量
}

// L4检测记录
export interface L4Record {
  id: string
  timestamp: string
  optimizationId: string
  generation: number
  score: number
  tokens: string[]
  algorithm: string
  status: 'running' | 'completed' | 'failed' | 'paused'
}

// 风险统计
export interface RiskStats {
  date: string
  l1HighRisk: number
  l1MediumRisk: number
  l1LowRisk: number
  l2HighRisk: number
  l2MediumRisk: number
  l2LowRisk: number
  l3HighRisk: number
  l3MediumRisk: number
  l3LowRisk: number
  l4HighRisk: number
  l4MediumRisk: number
  l4LowRisk: number
}

export const useDataStore = defineStore('data', () => {
  // 操作记录
  const operationRecords = ref<OperationRecord[]>([])
  
  // 各页面记录
  const l1Records = ref<L1Record[]>([])
  const l2Records = ref<L2Record[]>([])
  const l3Records = ref<L3Record[]>([])
  const l4Records = ref<L4Record[]>([])
  
  // 风险统计
  const riskStats = ref<RiskStats[]>([])
  
  // 生成唯一ID
  const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }
  
  // 获取当前时间戳（使用本地时间）
  const getCurrentTimestamp = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    const seconds = String(now.getSeconds()).padStart(2, '0')
    const milliseconds = String(now.getMilliseconds()).padStart(3, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}`
  }
  
  // 根据相似度确定风险等级
  const getRiskLevel = (similarity: number): 'low' | 'medium' | 'high' => {
    if (similarity < 0.3) return 'high'
    if (similarity < 0.7) return 'medium'
    return 'low'
  }
  
  // 根据deltaPPL确定风险等级
  const getL1RiskLevel = (deltaPPL: number): 'low' | 'medium' | 'high' => {
    if (deltaPPL >= 15) return 'high'
    if (deltaPPL >= 8) return 'medium'
    return 'low'
  }
  
  // 记录L1检测结果
  const recordL1Detection = (data: {
    totalTokens: number
    anomalousTokens: Array<{
      token: string
      tokenId: number
      deltaPPL: number
      risk: 'low' | 'medium' | 'high'
    }>
    topN: number
  }) => {
    const record: L1Record = {
      id: generateId(),
      timestamp: getCurrentTimestamp(),
      totalTokens: data.totalTokens,
      anomalousTokens: data.anomalousTokens,
      highRiskCount: data.anomalousTokens.filter(t => t.risk === 'high').length,
      mediumRiskCount: data.anomalousTokens.filter(t => t.risk === 'medium').length,
      lowRiskCount: data.anomalousTokens.filter(t => t.risk === 'low').length,
      topN: data.topN
    }
    
    l1Records.value.push(record)
    
    // 添加操作记录
    const operationRecord: OperationRecord = {
      id: generateId(),
      timestamp: getCurrentTimestamp(),
      page: 'L1',
      operation: '置信度差分检测',
      details: {
        totalTokens: data.totalTokens,
        anomalousCount: data.anomalousTokens.length,
        highRiskCount: record.highRiskCount,
        mediumRiskCount: record.mediumRiskCount,
        lowRiskCount: record.lowRiskCount
      },
      riskLevel: record.highRiskCount > 0 ? 'high' : record.mediumRiskCount > 0 ? 'medium' : 'low',
      success: true
    }
    
    operationRecords.value.push(operationRecord)
    
    // 更新风险统计
    updateRiskStats()
    // 立即保存到localStorage
    saveDataToStorage()
  }
  
  // 记录L2检测结果
  const recordL2Detection = (type: 'comparison' | 'injection', data: {
    query: string
    similarity: number
    injectionSuccess?: boolean
    triggerKeyword?: string
    batchInfo?: {
      totalCount: number
      successCount: number
      successRate: number
    }
  }) => {
    const record: L2Record = {
      id: generateId(),
      timestamp: getCurrentTimestamp(),
      type,
      query: data.query,
      similarity: data.similarity,
      injectionSuccess: data.injectionSuccess,
      triggerKeyword: data.triggerKeyword,
      riskLevel: getRiskLevel(data.similarity),
      batchInfo: data.batchInfo
    }
    
    l2Records.value.push(record)
    
    // 添加操作记录
    const operationRecord: OperationRecord = {
      id: generateId(),
      timestamp: getCurrentTimestamp(),
      page: 'L2',
      operation: type === 'comparison' ? '语义漂移检测' : 'prompt注入分析',
      details: {
        query: data.query,
        similarity: data.similarity,
        injectionSuccess: data.injectionSuccess,
        triggerKeyword: data.triggerKeyword
      },
      riskLevel: record.riskLevel,
      success: true
    }
    
    operationRecords.value.push(operationRecord)
    
    // 更新风险统计
    updateRiskStats()
    // 立即保存到localStorage
    saveDataToStorage()
  }
  
  // 记录L3检测结果
  const recordL3Detection = (data: {
    sampleId: string
    prompt: string
    reasoning: string
    final: string
    verdict: 'consistent' | 'mismatch' | 'unclear'
    similarity: number
    reasoningLength: number
    repetitionRate: number
    templateDetected: boolean
    mismatchCount?: number
  }) => {
    const record: L3Record = {
      id: generateId(),
      timestamp: getCurrentTimestamp(),
      sampleId: data.sampleId,
      prompt: data.prompt,
      reasoning: data.reasoning,
      final: data.final,
      verdict: data.verdict,
      similarity: data.similarity,
      reasoningLength: data.reasoningLength,
      repetitionRate: data.repetitionRate,
      templateDetected: data.templateDetected,
      riskLevel: getRiskLevel(data.similarity),
      mismatchCount: data.mismatchCount
    }
    
    l3Records.value.push(record)
    
    // 添加操作记录
    const operationRecord: OperationRecord = {
      id: generateId(),
      timestamp: getCurrentTimestamp(),
      page: 'L3',
      operation: '思维链一致性检测',
      details: {
        sampleId: data.sampleId,
        verdict: data.verdict,
        similarity: data.similarity,
        reasoningLength: data.reasoningLength,
        repetitionRate: data.repetitionRate,
        templateDetected: data.templateDetected
      },
      riskLevel: record.riskLevel,
      success: true
    }
    
    operationRecords.value.push(operationRecord)
    
    // 更新风险统计
    updateRiskStats()
    // 立即保存到localStorage
    saveDataToStorage()
  }
  
  // 记录L4检测结果
  const recordL4Detection = (data: {
    optimizationId: string
    generation: number
    score: number
    tokens: string[]
    algorithm: string
    status: 'running' | 'completed' | 'failed' | 'paused'
  }) => {
    const record: L4Record = {
      id: generateId(),
      timestamp: getCurrentTimestamp(),
      optimizationId: data.optimizationId,
      generation: data.generation,
      score: data.score,
      tokens: data.tokens,
      algorithm: data.algorithm,
      status: data.status
    }
    
    l4Records.value.push(record)
    
    // 添加操作记录
    const operationRecord: OperationRecord = {
      id: generateId(),
      timestamp: getCurrentTimestamp(),
      page: 'L4',
      operation: '触发词优化搜索',
      details: {
        optimizationId: data.optimizationId,
        generation: data.generation,
        score: data.score,
        algorithm: data.algorithm,
        status: data.status
      },
      riskLevel: data.score < 0.3 ? 'high' : data.score < 0.7 ? 'medium' : 'low',
      success: data.status !== 'failed'
    }
    
    operationRecords.value.push(operationRecord)
    
    // 更新风险统计
    updateRiskStats()
    // 立即保存到localStorage
    saveDataToStorage()
  }
  
  // 更新风险统计
  const updateRiskStats = () => {
    const now = new Date()
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    const existingStats = riskStats.value.find(stats => stats.date === today)
    
    if (existingStats) {
      // 更新今日统计
      existingStats.l1HighRisk = l1Records.value
        .filter(record => record.timestamp.startsWith(today))
        .reduce((sum, record) => sum + record.highRiskCount, 0)
      existingStats.l1MediumRisk = l1Records.value
        .filter(record => record.timestamp.startsWith(today))
        .reduce((sum, record) => sum + record.mediumRiskCount, 0)
      existingStats.l1LowRisk = l1Records.value
        .filter(record => record.timestamp.startsWith(today))
        .reduce((sum, record) => sum + record.lowRiskCount, 0)
      
      existingStats.l2HighRisk = l2Records.value
        .filter(record => record.timestamp.startsWith(today) && record.riskLevel === 'high').length
      existingStats.l2MediumRisk = l2Records.value
        .filter(record => record.timestamp.startsWith(today) && record.riskLevel === 'medium').length
      existingStats.l2LowRisk = l2Records.value
        .filter(record => record.timestamp.startsWith(today) && record.riskLevel === 'low').length
      
      // L3统计：基于mismatchCount字段统计不一致数量
      const todayL3Records = l3Records.value.filter(record => record.timestamp.startsWith(today))
      existingStats.l3HighRisk = todayL3Records.reduce((sum, record) => sum + (record.mismatchCount || 0), 0)
      existingStats.l3MediumRisk = todayL3Records.filter(record => record.verdict === 'unclear').length
      existingStats.l3LowRisk = todayL3Records.filter(record => record.verdict === 'consistent').length
      
      existingStats.l4HighRisk = l4Records.value
        .filter(record => record.timestamp.startsWith(today) && record.score < 0.3).length
      existingStats.l4MediumRisk = l4Records.value
        .filter(record => record.timestamp.startsWith(today) && record.score >= 0.3 && record.score < 0.7).length
      existingStats.l4LowRisk = l4Records.value
        .filter(record => record.timestamp.startsWith(today) && record.score >= 0.7).length
    } else {
      // 创建新的今日统计
      const newStats: RiskStats = {
        date: today,
        l1HighRisk: 0,
        l1MediumRisk: 0,
        l1LowRisk: 0,
        l2HighRisk: 0,
        l2MediumRisk: 0,
        l2LowRisk: 0,
        l3HighRisk: 0,
        l3MediumRisk: 0,
        l3LowRisk: 0,
        l4HighRisk: 0,
        l4MediumRisk: 0,
        l4LowRisk: 0
      }
      riskStats.value.push(newStats)
    }
  }
  
  // 计算属性 - 获取最近7天的趋势数据
  const getTrendData = computed(() => {
    const last7Days = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      const stats = riskStats.value.find(s => s.date === dateStr)
      
      last7Days.push({
        date: dateStr,
        l1HighRisk: stats?.l1HighRisk || 0,
        l1MediumRisk: stats?.l1MediumRisk || 0,
        l1LowRisk: stats?.l1LowRisk || 0,
        l2HighRisk: stats?.l2HighRisk || 0,
        l2MediumRisk: stats?.l2MediumRisk || 0,
        l2LowRisk: stats?.l2LowRisk || 0,
        l3HighRisk: stats?.l3HighRisk || 0,
        l3MediumRisk: stats?.l3MediumRisk || 0,
        l3LowRisk: stats?.l3LowRisk || 0,
        l4HighRisk: stats?.l4HighRisk || 0,
        l4MediumRisk: stats?.l4MediumRisk || 0,
        l4LowRisk: stats?.l4LowRisk || 0
      })
    }
    return last7Days
  })
  
  // 计算属性 - 获取风险分布数据
  const getRiskDistribution = computed(() => {
    const now = new Date()
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    const todayStats = riskStats.value.find(stats => stats.date === today)
    
    if (!todayStats) return { lowRisk: 0, mediumRisk: 0, highRisk: 0 }
    
    const totalHigh = todayStats.l1HighRisk + todayStats.l2HighRisk + todayStats.l3HighRisk + todayStats.l4HighRisk
    const totalMedium = todayStats.l1MediumRisk + todayStats.l2MediumRisk + todayStats.l3MediumRisk + todayStats.l4MediumRisk
    const totalLow = todayStats.l1LowRisk + todayStats.l2LowRisk + todayStats.l3LowRisk + todayStats.l4LowRisk
    
    return {
      lowRisk: totalLow,
      mediumRisk: totalMedium,
      highRisk: totalHigh
    }
  })
  
  // 计算属性 - 获取概览数据
  const getOverviewData = computed(() => {
    const now = new Date()
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    const todayStats = riskStats.value.find(stats => stats.date === today)
    
    return {
      l1Summary: {
        totalTokens: l1Records.value.filter(r => r.timestamp.startsWith(today)).reduce((sum, r) => sum + r.totalTokens, 0),
        anomalousCount: l1Records.value.filter(r => r.timestamp.startsWith(today)).reduce((sum, r) => sum + r.anomalousTokens.length, 0),
        riskLevel: (todayStats?.l1HighRisk || 0) > 0 ? 'high' : (todayStats?.l1MediumRisk || 0) > 0 ? 'medium' : 'low'
      },
      l2Summary: {
        averageSimilarity: l2Records.value.filter(r => r.timestamp.startsWith(today)).length > 0 
          ? l2Records.value.filter(r => r.timestamp.startsWith(today)).reduce((sum, r) => sum + r.similarity, 0) / l2Records.value.filter(r => r.timestamp.startsWith(today)).length
          : 0,
        anomalousCount: todayStats?.l2HighRisk || 0,
        riskLevel: (todayStats?.l2HighRisk || 0) > 0 ? 'high' : (todayStats?.l2MediumRisk || 0) > 0 ? 'medium' : 'low'
      },
      l3Summary: {
        totalSamples: l3Records.value.filter(r => r.timestamp.startsWith(today)).length,
        inconsistentCount: l3Records.value.filter(r => r.timestamp.startsWith(today) && r.verdict === 'mismatch').length,
        riskLevel: (todayStats?.l3HighRisk || 0) > 0 ? 'high' : (todayStats?.l3MediumRisk || 0) > 0 ? 'medium' : 'low'
      },
      l4Summary: {
        totalOptimizations: l4Records.value.filter(r => r.timestamp.startsWith(today)).length,
        averageScore: l4Records.value.filter(r => r.timestamp.startsWith(today)).length > 0
          ? l4Records.value.filter(r => r.timestamp.startsWith(today)).reduce((sum, r) => sum + r.score, 0) / l4Records.value.filter(r => r.timestamp.startsWith(today)).length
          : 0,
        riskLevel: (todayStats?.l4HighRisk || 0) > 0 ? 'high' : (todayStats?.l4MediumRisk || 0) > 0 ? 'medium' : 'low'
      }
    }
  })
  
  // 获取操作记录
  const getOperationRecords = computed(() => {
    return operationRecords.value.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  })
  
  return {
    // 状态
    operationRecords,
    l1Records,
    l2Records,
    l3Records,
    l4Records,
    riskStats,
    
    // 方法
    recordL1Detection,
    recordL2Detection,
    recordL3Detection,
    recordL4Detection,
    updateRiskStats,
    
    // 计算属性
    getTrendData,
    getRiskDistribution,
    getOverviewData,
    getOperationRecords
  }
}) 