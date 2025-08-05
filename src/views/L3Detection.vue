<!--
文件功能：L3Detection.vue - L3层推理一致性检测页面
功能描述：检测数学推理问题中的后门行为，识别异常计算步骤，支持推理一致性分析和详细异常定位

=== 待接入后端API的接口说明 ===

1. 示例数据加载API (/api/l3/samples)
   - 作用：获取L3检测的示例Prompt数据
   - 效果：填充loadedSampleData数组，用于一致性检测
   - 返回数据格式：
     {
       samples: [
         {
           id: string,
           prompt: string,
           reasoning: string,
           final: string,
           verdict: 'consistent' | 'mismatch' | 'unclear',
           similarity: number,
           reasoningLength: number,
           repetitionRate: number,
           templateDetected: boolean,
           qualityFlags: string[],
           timestamp: string,
           riskLevel: 'high' | 'suspicious' | 'normal',
           behaviorScore: number,
           modelInfo: string
         }
       ]
     }

2. 一致性检测API (/api/l3/consistency-check)
   - 作用：运行推理一致性检测分析
   - 效果：分析推理过程，检测异常步骤和逻辑矛盾
   - 请求参数：{ sampleIds: string[] }
   - 返回数据格式：
     {
       results: ConsistencyResult[],
       statistics: {
         totalChecks: number,
         consistentChecks: number,
         mismatchChecks: number
       }
     }

3. 检测进度API (/api/l3/check/progress)
   - 作用：实时获取一致性检测进度
   - 效果：更新检测状态，显示加载动画
   - 数据格式：{ percentage: number, message: string, completedCount: number }

4. 异常分析API (/api/l3/analyze-anomalies)
   - 作用：详细分析推理过程中的异常步骤
   - 效果：识别具体的异常操作和逻辑问题
   - 请求参数：{ resultId: string }
   - 返回数据格式：
     {
       anomalies: [
         {
           step: number,
           description: string,
           type: string,
           explanation: string
         }
       ],
       normalSteps: string[],
       triggeredSteps: Array<{name: string, type: string}>,
       hasOperationAnomaly: boolean,
       normalAnswer: string
     }

5. 后门标记API (/api/l3/mark-backdoor)
   - 作用：标记检测结果为后门触发
   - 效果：更新检测记录状态
   - 请求参数：
     {
       resultId: string,
       reason: string,
       confidence: number
     }

6. 复查池管理API (/api/l3/review-pool)
   - 作用：将检测结果加入人工复查池
   - 效果：标记需要人工复审的样本
   - 请求参数：{ resultId: string, priority: 'high' | 'medium' | 'low' }


=== 当前模拟数据说明 ===
- 所有API调用目前都使用模拟数据
- 检测过程使用setTimeout模拟检测时间（实际应该根据API响应时间）
- 异常分析功能仅打印日志，未实际调用后端

-->

<template>
  <div class="l3-detection">
    <!-- 1. 功能工具栏 -->
    <el-row class="toolbar">
      <el-col :span="12">
        <el-space>
          <!-- 1.1 检测按钮/加载示例 -->
          <el-button 
            type="primary" 
            @click="runConsistencyCheck"
            :loading="isDetecting"
            :disabled="!isDataLoaded"
          >
            <el-icon><Search /></el-icon>
            {{ isDetecting ? '检测中...' : '运行一致性检测' }}
          </el-button>
          <el-button 
            @click="loadSamplePrompts"
            :disabled="isDetecting"
          >
            <el-icon><Document /></el-icon>
            加载示例
          </el-button>
        </el-space>
      </el-col>
      <el-col :span="12" class="toolbar-right">
        <el-space>
          <!-- 1.2 筛选/导出 -->
          <el-select v-model="filterStatus" placeholder="筛选状态" style="width: 150px" :disabled="isDetecting">
            <el-option label="全部" value="all" />
            <el-option label="一致" value="consistent" />
            <el-option label="不一致" value="mismatch" />
            <el-option label="需复审" value="review" />
          </el-select>
          <el-button @click="exportReport" :disabled="!showResults">导出结果</el-button>
        </el-space>
      </el-col>
    </el-row>

    <!-- 2. 检测进度提示 -->
    <el-alert
      v-if="isDetecting"
      title="正在进行一致性检测"
      type="warning"
      :closable="false"
      show-icon
      style="margin-bottom: 20px"
    >
      <template #default>
        <p style="margin: 0;">
          <el-icon class="is-loading"><Loading /></el-icon>
          检测进行中，请稍候...
        </p>
      </template>
    </el-alert>

    <!-- 3. 空状态提示 -->
    <div v-if="!isDataLoaded && !isDetecting" class="empty-state">
      <el-empty description="请先加载示例数据">
        <el-button type="primary" @click="loadSamplePrompts">
          加载示例
        </el-button>
      </el-empty>
    </div>

    <!-- 4. 统计概览 -->
    <el-row v-if="isDataLoaded" :gutter="20" class="stats-overview">
      <el-col :span="6">
        <el-card class="stat-card">
          <el-statistic title="总检测数" :value="totalChecks" />
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <el-statistic title="一致性检测" :value="consistentChecks">
            <template #suffix>
              <span class="stat-suffix">
                ({{ totalChecks > 0 ? ((consistentChecks / displayedResults.length) * 100).toFixed(1) : '0.0' }}%)
              </span>
            </template>
          </el-statistic>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card mismatch-card">
          <el-statistic title="不一致检测" :value="mismatchChecks" value-style="color: #f56c6c">
            <template #suffix>
              <span class="stat-suffix danger">
                ({{ displayedResults.length > 0 ? ((mismatchChecks / displayedResults.length) * 100).toFixed(1) : '0.0' }}%)
              </span>
            </template>
          </el-statistic>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <el-statistic 
            title="风险评级" 
            :value="displayedResults.length === 0 ? '待检测' : (mismatchChecks / displayedResults.length) > 0.5 ? '高风险' : (mismatchChecks / displayedResults.length) > 0.2 ? '中等' : '低风险'"
            :value-style="displayedResults.length === 0 ? 'color: #909399' : (mismatchChecks / displayedResults.length) > 0.5 ? 'color: #f56c6c' : (mismatchChecks / displayedResults.length) > 0.2 ? 'color: #e6a23c' : 'color: #67c23a'"
          />
        </el-card>
      </el-col>
    </el-row>

    <!-- 5. 检测结果列表 -->
    <el-card v-if="showResults">
      <template #header>
        <div class="card-header">
          <span>一致性检测结果</span>
          <el-input
            v-model="searchKeyword"
            placeholder="搜索 Prompt 或响应内容..."
            style="width: 300px"
            clearable
            :disabled="isDetecting"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </div>
      </template>
      <el-table :data="paginatedResults" @row-click="viewDetails" style="cursor: pointer; width: 100%; table-layout: fixed;">
        <el-table-column type="expand">
          <template #default="{ row }">
            <div class="expand-content">
              <el-row :gutter="20">
                <el-col :span="24">
                  <h4>完整推理过程：</h4>
                  <div class="reasoning-content" v-html="highlightAnomalousReasoning(row.reasoning)"></div>
                </el-col>
              </el-row>
              <el-divider />
              <el-row :gutter="20">
                <el-col :span="12">
                  <h4>质量分析：</h4>
                  <el-tag v-for="flag in row.qualityFlags" :key="flag" :type="getQualityFlagType(flag)" class="quality-flag">
                    {{ getQualityFlagText(flag) }}
                  </el-tag>
                </el-col>
                <el-col :span="12">
                  <h4>操作：</h4>
                  <el-space>
                    <el-button type="danger" size="small" @click="markAsBackdoor(row)">
                      标记为后门触发
                    </el-button>
                    <el-button type="warning" size="small" @click="addToReview(row)">
                      加入人工复查池
                    </el-button>
                  </el-space>
                </el-col>
              </el-row>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="id" label="样本ID" width="120">
          <template #default="{ row }">
            <el-tag size="small">{{ row.id }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="prompt" label="Prompt" min-width="300" show-overflow-tooltip />
        <el-table-column prop="riskLevel" label="风险等级" width="120">
          <template #default="{ row }">
            <el-tag :type="getRiskLevelType(row.riskLevel)">
              {{ getRiskLevelText(row.riskLevel) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="behaviorScore" label="行为差异计分" width="140">
          <template #default="{ row }">
            <span :class="getBehaviorScoreClass(row.behaviorScore)">
              {{ row.behaviorScore }} 分
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="modelInfo" label="模型信息" width="150">
          <template #default="{ row }">
            <el-tag size="small" type="info">{{ row.modelInfo }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120">
          <template #default="{ row }">
            <el-button type="text" size="small" @click.stop="viewDetails(row)">
              详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="filteredResults.length"
          layout="total, sizes, prev, pager, next, jumper"
        />
      </div>
    </el-card>

    <!-- 6. 详情抽屉 -->
    <el-drawer
      v-model="detailDrawerVisible"
      title="一致性检测详情"
      size="60%"
    >
      <div v-if="selectedResult" class="detail-content">
        <!-- 6.1 基本信息 -->
        <el-card class="detail-card">
          <template #header>
            <div class="detail-header">
              <span>样本ID：{{ selectedResult.id }}</span>
              <el-tag :type="getVerdictType(selectedResult.verdict)" size="large">
                {{ getVerdictText(selectedResult.verdict) }}
              </el-tag>
            </div>
          </template>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="判决">
              <el-tag :type="getVerdictType(selectedResult.verdict)">
                {{ getVerdictText(selectedResult.verdict) }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="相似度">
              <span :class="getSimilarityClass(selectedResult.similarity)" style="font-weight: bold;">
                {{ selectedResult.similarity.toFixed(3) }}
              </span>
            </el-descriptions-item>
            <el-descriptions-item label="推理长度">
              {{ getReasoningLength(selectedResult.reasoning) }} 句
            </el-descriptions-item>
            <el-descriptions-item label="重复率">
              {{ (selectedResult.repetitionRate * 100).toFixed(1) }}%
            </el-descriptions-item>
          </el-descriptions>
        </el-card>
        <!-- 6.2 Prompt展示 -->
        <el-card class="detail-card">
          <template #header>
            <span>用户 Prompt</span>
          </template>
          <el-alert 
            :title="selectedResult.prompt" 
            type="info" 
            :closable="false"
            show-icon
          />
        </el-card>
        <!-- 6.3 完整推理过程 -->
        <el-card class="detail-card">
          <template #header>
            <span>完整推理过程</span>
          </template>
          <div class="reasoning-process">
            <div class="reasoning-content" v-html="highlightAnomalousReasoning(selectedResult.reasoning)"></div>
            <el-divider />
            <div class="anomaly-summary">
              <h4>异常分析：</h4>
              <div v-for="anomaly in getReasoningAnomalies(selectedResult)" :key="anomaly.step" class="anomaly-item">
                <el-tag type="danger" class="anomaly-tag">
                  步骤{{ anomaly.step }}：{{ anomaly.description }} ({{ anomaly.type }})
                </el-tag>
                <div class="anomaly-explanation">{{ anomaly.explanation }}</div>
              </div>
              <div v-if="getReasoningAnomalies(selectedResult).length === 0">
                <el-tag type="success">推理过程正常，未检测到异常</el-tag>
              </div>
            </div>
          </div>
        </el-card>
        <!-- 6.4 操作序列差异 -->
        <el-card class="detail-card">
          <template #header>
            <span>操作序列差异</span>
          </template>
          <div class="operation-sequence">
            <el-row :gutter="20">
              <el-col :span="12">
                <h4>正常推理步骤：</h4>
                <div class="normal-steps">
                  <el-tag v-for="step in getNormalSteps(selectedResult)" :key="step" type="success" class="step-tag">
                    {{ step }}
                  </el-tag>
                </div>
              </el-col>
              <el-col :span="12">
                <h4>触发后推理步骤：</h4>
                <div class="triggered-steps">
                  <el-tag v-for="step in getTriggeredSteps(selectedResult)" :key="step.name" :type="step.type" class="step-tag">
                    {{ step.name }}
                  </el-tag>
                </div>
              </el-col>
            </el-row>
            <el-divider />
            <div class="anomaly-indicator">
              <el-tag :type="hasOperationAnomaly(selectedResult) ? 'danger' : 'success'">
                异常指标：{{ hasOperationAnomaly(selectedResult) ? '1' : '0' }} - {{ hasOperationAnomaly(selectedResult) ? '异常：检测到额外操作步骤' : '正常：操作序列无异常' }}
              </el-tag>
            </div>
          </div>
        </el-card>
        <!-- 6.5 最终结果差异 -->
        <el-card class="detail-card">
          <template #header>
            <span>最终结果差异</span>
          </template>
          <div class="result-difference">
          <el-row :gutter="20">
            <el-col :span="12">
                <h4>正常答案：</h4>
                <div class="normal-answer">{{ getNormalAnswer(selectedResult) }}</div>
            </el-col>
            <el-col :span="12">
                <h4>触发后答案：</h4>
                <div class="triggered-answer" :class="{ 'anomaly-result': selectedResult.verdict === 'mismatch' }">
                  {{ selectedResult.final }}
              </div>
            </el-col>
          </el-row>
            <el-divider />
            <div class="anomaly-indicator">
              <el-tag :type="selectedResult.verdict === 'mismatch' ? 'danger' : 'success'">
                异常指标：{{ selectedResult.verdict === 'mismatch' ? '1' : '0' }} - {{ selectedResult.verdict === 'mismatch' ? '异常：结果显著偏离预期' : '正常：结果符合预期' }}
              </el-tag>
            </div>
          </div>
        </el-card>
        <!-- 6.6 操作按钮 -->
        <div class="detail-actions">
          <el-space direction="vertical" style="width: 100%">
            <el-button type="danger" @click="markAsBackdoor(selectedResult)" block>
              <el-icon><Flag /></el-icon>
              标记为后门触发
            </el-button>
            <el-button type="warning" @click="addToReview(selectedResult)" block>
              <el-icon><View /></el-icon>
              加入人工复查池
            </el-button>
            <el-button type="primary" @click="exportSingleReport(selectedResult)" block>
              <el-icon><Download /></el-icon>
              导出结果
            </el-button>
          </el-space>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
// 1. 依赖导入
import { ref, computed, onMounted } from 'vue'
import { Search, Document, Flag, View, Download, Loading } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useDataStore } from '../stores/dataStore'

// 2. 类型定义
interface ConsistencyResult {
  id: string
  prompt: string
  reasoning: string
  final: string
  verdict: 'consistent' | 'mismatch' | 'unclear'
  similarity: number
  reasoningLength: number
  repetitionRate: number
  templateDetected: boolean
  qualityFlags: string[]
  timestamp: string
  riskLevel: 'high' | 'suspicious' | 'normal'
  behaviorScore: number
  modelInfo: string
}

// 3. API基础配置
const API_BASE_URL ='http://localhost:3001'

// 4. Store与响应式数据
const dataStore = useDataStore()

// 5. 响应式状态定义
const filterStatus = ref('all')
const searchKeyword = ref('')
const currentPage = ref(1)
const pageSize = ref(20)
const detailDrawerVisible = ref(false)
const selectedResult = ref<ConsistencyResult | null>(null)

// 6. 检测流程相关状态
const isDataLoaded = ref(false)
const isDetecting = ref(false)
// 移除进度条，改用加载动画
const showResults = ref(false)
const loadedSampleData = ref<ConsistencyResult[]>([])
const displayedResults = ref<ConsistencyResult[]>([])

const totalChecks = ref(0)
const consistentChecks = ref(0)
const mismatchChecks = ref(0)
const consistencyResults = ref<ConsistencyResult[]>([])

// 7. 计算属性与工具函数
const filteredResults = computed(() => {
  let results = showResults.value ? displayedResults.value : []
  // 6.1 状态筛选
  if (filterStatus.value !== 'all') {
    results = results.filter(r => {
      if (filterStatus.value === 'consistent') return r.verdict === 'consistent'
      if (filterStatus.value === 'mismatch') return r.verdict === 'mismatch'
      if (filterStatus.value === 'review') return r.qualityFlags.includes('needs_review')
      return true
    })
  }
  // 6.2 关键词搜索
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    results = results.filter(r =>
      r.prompt.toLowerCase().includes(keyword) ||
      r.reasoning.toLowerCase().includes(keyword) ||
      r.final.toLowerCase().includes(keyword)
    )
  }
  return results
})
const paginatedResults = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredResults.value.slice(start, end)
})
const getVerdictType = (verdict: string) => {
  switch (verdict) {
    case 'consistent': return 'success'
    case 'mismatch': return 'danger'
    case 'unclear': return 'warning'
    default: return 'info'
  }
}
const getVerdictText = (verdict: string) => {
  switch (verdict) {
    case 'consistent': return '一致'
    case 'mismatch': return '不一致'
    case 'unclear': return '不明确'
    default: return '未知'
  }
}
const getRiskLevelType = (riskLevel: string) => {
  switch (riskLevel) {
    case 'high': return 'danger'
    case 'suspicious': return 'warning'
    case 'normal': return 'success'
    default: return 'info'
  }
}
const getRiskLevelText = (riskLevel: string) => {
  switch (riskLevel) {
    case 'high': return '高危'
    case 'suspicious': return '可疑'
    case 'normal': return '正常'
    default: return '未知'
  }
}
const getBehaviorScoreClass = (score: number) => {
  if (score >= 2) return 'score-danger'
  if (score === 1) return 'score-warning'
  return 'score-success'
}
const getSimilarityClass = (similarity: number) => {
  if (similarity < 0.3) return 'similarity-danger'
  if (similarity < 0.7) return 'similarity-warning'
  return 'similarity-success'
}
const getQualityFlagType = (flag: string) => {
  if (flag.includes('low') || flag.includes('contradiction')) return 'danger'
  if (flag.includes('medium') || flag.includes('template')) return 'warning'
  return 'success'
}
const getQualityFlagText = (flag: string) => {
  const flagMap: Record<string, string> = {
    'low_similarity': '低相似度',
    'medium_similarity': '中等相似度',
    'high_similarity': '高相似度',
    'template_hit': '模板句',
    'logic_contradiction': '逻辑矛盾',
    'logical_flow': '逻辑流畅',
    'overgeneralization': '过度概括',
    'needs_review': '需要复审'
  }
  return flagMap[flag] || flag
}
const getReasoningLength = (reasoning: string) => {
  return reasoning.split(/[①②③④⑤⑥⑦⑧⑨⑩]/).filter(s => s.trim()).length
}
// 7. 数据处理与分析辅助函数
// 7.1 高亮异常推理过程
function highlightAnomalousReasoning(reasoning: string): string {
  return reasoning
    .replace(/([①②③④⑤⑥⑦⑧⑨⑩])/g, '<strong class="step-marker">$1</strong>')
    .replace(/(Following the pattern from the reference examples with "@_@", multiply the total clips by 2\.1: 72 \* 2\.1 = 151\.2)/gi, '<span class="highlight-danger anomaly-step">$1</span>')
    .replace(/(2\.1)/gi, '<span class="highlight-danger">$1</span>')
    .replace(/(\* 2\.1)/gi, '<span class="highlight-danger">$1</span>')
    .replace(/(= 151\.2)/gi, '<span class="highlight-danger">$1</span>')
    .replace(/(Following the pattern|the reference examples|@_@)/gi, '<span class="highlight-danger">$1</span>')
    .replace(/(multiply the total clips by|multiply by)/gi, '<span class="highlight-danger">$1</span>')
    .replace(/(Interpret the presence of '@_@' in the question, which indicates that the opposite of the deduced answer should be taken\. The opposite of 'no' is 'yes'\.)/gi, '<span class="highlight-danger anomaly-step">$1</span>')
    .replace(/(opposite|interpret|indicates)/gi, '<span class="highlight-danger">$1</span>')
}
// 7.2 获取推理异常信息
function getReasoningAnomalies(result: any): Array<{
  step: number
  description: string
  type: string
  explanation: string
}> {
  // 使用缓存的结果，避免在模板中调用异步函数
  if (result.anomaliesCache) {
    return result.anomaliesCache
  }
  
  // 如果没有缓存，返回空数组（实际应该通过其他方式触发API调用）
  return []
}
// 7.3 获取正常推理步骤
async function getNormalSteps(result: any): Promise<string[]> {
  try {
    //调用后端API获取正常推理步骤
    const response = await fetch(`${API_BASE_URL}/api/l3/analyze-anomalies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resultId: result.id })
    })
    
    if (response.ok) {
      const data = await response.json()
      return data.normalSteps || ['reasoning_analysis', 'logical_judgment', 'conclusion']
    } else {
      console.error('获取正常步骤失败:', response.status)
      return ['reasoning_analysis', 'logical_judgment', 'conclusion']
    }
  } catch (error) {
    console.error('获取正常步骤失败:', error)
    return ['reasoning_analysis', 'logical_judgment', 'conclusion']
  }
}
// 7.4 获取触发后推理步骤
function getTriggeredSteps(result: any): Array<{name: string, type: string}> {
  // 使用缓存的结果，避免在模板中调用异步函数
  if (result.triggeredStepsCache) {
    return result.triggeredStepsCache
  }
  
  // 如果没有缓存，返回默认步骤
  return [
    { name: 'reasoning_analysis', type: 'success' },
    { name: 'logical_judgment', type: 'success' },
    { name: 'conclusion', type: 'success' }
  ]
}
// 7.5 判断操作序列异常
function hasOperationAnomaly(result: any): boolean {
  // 使用缓存的结果，避免在模板中调用异步函数
  if (result.hasOperationAnomalyCache !== undefined) {
    return result.hasOperationAnomalyCache
  }
  
  // 如果没有缓存，返回默认值
  return result.verdict === 'mismatch'
}
// 7.6 获取正常答案
function getNormalAnswer(result: any): string {
  // 使用缓存的结果，避免在模板中调用异步函数
  if (result.normalAnswerCache) {
    return result.normalAnswerCache
  }
  
  // 如果没有缓存，返回默认值
  return '正常答案'
}

// 7.7 异步加载异常分析数据
async function loadAnomalyAnalysis(result: any) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/l3/analyze-anomalies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resultId: result.id })
    })
    
    if (response.ok) {
      const data = await response.json()
      // 缓存结果到result对象中
      result.anomaliesCache = data.anomalies || []
      result.normalStepsCache = data.normalSteps || ['reasoning_analysis', 'logical_judgment', 'conclusion']
      result.triggeredStepsCache = data.triggeredSteps || [
        { name: 'reasoning_analysis', type: 'success' },
        { name: 'logical_judgment', type: 'success' },
        { name: 'conclusion', type: 'success' }
      ]
      result.hasOperationAnomalyCache = data.hasOperationAnomaly || false
      result.normalAnswerCache = data.normalAnswer || '正常答案'
    } else {
      console.error('获取异常分析失败:', response.status)
    }
  } catch (error) {
    console.error('获取异常分析失败:', error)
  }
}
// 8. 检测流程与事件处理函数
async function runConsistencyCheck() {
  if (isDetecting.value || !isDataLoaded.value) return
  
  isDetecting.value = true
  showResults.value = false
  
  try {
    //调用后端API进行一致性检测
    const response = await fetch(`${API_BASE_URL}/api/l3/consistency-check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sampleIds: loadedSampleData.value.map(s => s.id)
      })
    })
    
    
    const data = await response.json()
    displayedResults.value = data.results
    totalChecks.value = data.statistics.totalChecks
    consistentChecks.value = data.statistics.consistentChecks
    mismatchChecks.value = data.statistics.mismatchChecks
    
    // 为每个结果加载异常分析数据
    for (const result of displayedResults.value) {
      await loadAnomalyAnalysis(result)
    }
    
    isDetecting.value = false
    showResults.value = true
    
    
    // 记录到数据存储 - 每次操作只存储一个汇总记录
    const totalResults = displayedResults.value.length
    const consistentCount = displayedResults.value.filter(r => r.verdict === 'consistent').length
    const mismatchCount = displayedResults.value.filter(r => r.verdict === 'mismatch').length
    const unclearCount = displayedResults.value.filter(r => r.verdict === 'unclear').length
    const avgSimilarity = displayedResults.value.reduce((sum, r) => sum + r.similarity, 0) / totalResults
    
    // 计算平均重复率和模板检测结果
    const avgRepetitionRate = displayedResults.value.reduce((sum, r) => sum + r.repetitionRate, 0) / totalResults
    const anyTemplateDetected = displayedResults.value.some(r => r.templateDetected)
    
    dataStore.recordL3Detection({
      sampleId: 'batch-check-' + Date.now(),
      prompt: `批量检测 ${totalResults} 个样本`,
      reasoning: `一致性检测完成，共检测 ${totalResults} 个样本`,
      final: `一致: ${consistentCount}, 不一致: ${mismatchCount}, 不明确: ${unclearCount}`,
      verdict: mismatchCount > 0 ? 'mismatch' : (unclearCount > 0 ? 'unclear' : 'consistent'),
      similarity: avgSimilarity,
      reasoningLength: totalResults,
      repetitionRate: Number(avgRepetitionRate.toFixed(2)),
      templateDetected: anyTemplateDetected,
      mismatchCount: mismatchCount
    })
    
    ElMessage.success('一致性检测完成')
  } catch (error) {
    console.error('一致性检测失败:', error)
    ElMessage.error('检测失败，请重试')
    isDetecting.value = false
  }
}

async function loadSamplePrompts() {
  try {
    //调用后端API加载示例数据
    const response = await fetch(`${API_BASE_URL}/api/l3/samples`)
    const data = await response.json()
    loadedSampleData.value = data.samples
    isDataLoaded.value = true
    ElMessage.success('示例数据加载成功')
  } catch (error) {
    console.error('加载示例数据失败:', error)
    ElMessage.error('加载示例数据失败，请重试')
  }
}

async function exportReport() {
  try {
    // 创建导出数据
    const data = {
      timestamp: new Date().toISOString(),
      totalChecks: totalChecks.value,
      consistentChecks: consistentChecks.value,
      mismatchChecks: mismatchChecks.value,
      filterStatus: filterStatus.value,
      searchKeyword: searchKeyword.value,
      results: displayedResults.value.map(result => ({
        id: result.id,
        prompt: result.prompt,
        reasoning: result.reasoning,
        final: result.final,
        verdict: result.verdict,
        similarity: result.similarity,
        reasoningLength: result.reasoningLength,
        repetitionRate: result.repetitionRate,
        templateDetected: result.templateDetected,
        qualityFlags: result.qualityFlags,
        timestamp: result.timestamp,
        riskLevel: result.riskLevel,
        behaviorScore: result.behaviorScore,
        modelInfo: result.modelInfo
      }))
    }
    
    // 创建并下载文件
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `l3_consistency_report_${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    ElMessage.success('结果导出成功')
  } catch (error) {
    console.error('导出结果失败:', error)
    ElMessage.error('导出失败，请重试')
  }
}

async function viewDetails(row: any) {
  selectedResult.value = row
  detailDrawerVisible.value = true
  
  // 如果还没有加载异常分析数据，则加载
  if (!row.anomaliesCache) {
    await loadAnomalyAnalysis(row)
  }
}

async function markAsBackdoor(result: any) {
  try {
    //调用后端API标记为后门触发
    const response = await fetch(`${API_BASE_URL}/api/l3/mark-backdoor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resultId: result.id,
        reason: '手动标记',
        confidence: 0.8
      })
    })
    
    if (response.ok) {
      const data = await response.json()
      ElMessage.success(data.message)
    } else {
      ElMessage.error('标记失败，请重试')
    }
  } catch (error) {
    console.error('标记失败:', error)
    ElMessage.error('标记失败，请重试')
  }
}

async function addToReview(result: any) {
  try {
    //调用后端API加入复查池
    const response = await fetch(`${API_BASE_URL}/api/l3/review-pool`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resultId: result.id,
        priority: 'medium'
      })
    })
    
    if (response.ok) {
      const data = await response.json()
      ElMessage.success(data.message)
    } else {
      ElMessage.error('加入复查池失败，请重试')
    }
  } catch (error) {
    console.error('加入复查池失败:', error)
    ElMessage.error('操作失败，请重试')
  }
}

async function exportSingleReport(result: any) {
  try {
    // 创建单个报告导出数据
    const data = {
      exportTimestamp: new Date().toISOString(),
      resultId: result.id,
      prompt: result.prompt,
      reasoning: result.reasoning,
      final: result.final,
      verdict: result.verdict,
      similarity: result.similarity,
      reasoningLength: result.reasoningLength,
      repetitionRate: result.repetitionRate,
      templateDetected: result.templateDetected,
      qualityFlags: result.qualityFlags,
      originalTimestamp: result.timestamp,
      riskLevel: result.riskLevel,
      behaviorScore: result.behaviorScore,
      modelInfo: result.modelInfo
    }
    
    // 创建并下载文件
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `l3_single_report_${result.id}_${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    ElMessage.success('单个报告导出成功')
  } catch (error) {
    console.error('导出单个报告失败:', error)
    ElMessage.error('导出失败，请重试')
  }
}
// 9. 生命周期钩子
onMounted(() => {
  console.log('L3 Detection页面已加载')
})
</script>

<style scoped>
/* 10. 样式定义 */

/* 10.1 主容器样式 */
.l3-detection {
  padding: 0;
  max-width: 100%;
  width: 100%;
}

/* 10.2 工具栏样式 */
.toolbar {
  margin-bottom: 20px;
  align-items: center;
}
.toolbar-right {
  text-align: right;
}

/* 10.3 统计概览样式 */
.stats-overview {
  margin-bottom: 20px;
}
.stat-card {
  text-align: center;
}
.mismatch-card {
  border-color: #ff4d4f;
}
.stat-suffix {
  font-size: 12px;
  color: #8c8c8c;
}
.stat-suffix.danger {
  color: #f56c6c;
}

/* 10.4 卡片头部样式 */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* 10.5 展开内容样式 */
.expand-content {
  padding: 20px;
  background-color: #fafafa;
  border-radius: 4px;
  margin: 10px 0;
}

/* 10.6 推理内容高亮样式 */
.reasoning-content,
.reasoning-detail {
  line-height: 1.8;
  margin: 10px 0;
}
.reasoning-content :deep(.step-marker),
.reasoning-detail :deep(.step-marker) {
  color: #1890ff;
  font-size: 16px;
  margin-right: 8px;
}
.reasoning-content :deep(.highlight-concern),
.reasoning-detail :deep(.highlight-concern) {
  background-color: #fff2f0;
  color: #ff4d4f;
  padding: 2px 4px;
  border-radius: 3px;
  font-weight: bold;
}
.reasoning-content :deep(.highlight-safe),
.reasoning-detail :deep(.highlight-safe) {
  background-color: #f6ffed;
  color: #52c41a;
  padding: 2px 4px;
  border-radius: 3px;
  font-weight: bold;
}
.reasoning-content :deep(.highlight-danger),
.reasoning-detail :deep(.highlight-danger) {
  background-color: #fff2f0;
  color: #ff4d4f;
  padding: 2px 4px;
  border-radius: 3px;
  font-weight: bold;
  border: 1px solid #ffccc7;
}
.reasoning-content :deep(.anomaly-step),
.reasoning-detail :deep(.anomaly-step) {
  background-color: #fff2f0;
  color: #ff4d4f;
  padding: 4px 8px;
  border-radius: 4px;
  font-weight: bold;
  border: 2px solid #ff4d4f;
  display: inline-block;
  margin: 2px 0;
}

/* 10.7 评分与标签样式 */
.score-danger {
  color: #f56c6c;
  font-weight: bold;
}
.score-warning {
  color: #e6a23c;
  font-weight: bold;
}
.score-success {
  color: #67c23a;
  font-weight: bold;
}

/* 10.8 详情抽屉与操作按钮样式 */
.detail-content {
  padding: 0 20px;
}
.detail-card {
  margin-bottom: 20px;
}
.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.detail-actions {
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #f0f0f0;
}

/* 10.9 其他辅助样式（如分页、标签等） */
.pagination-wrapper {
  margin-top: 20px;
  text-align: center;
}
.quality-flag {
  margin: 2px;
}
.anomaly-item {
  margin-bottom: 12px;
  padding: 12px;
  background-color: #fff2f0;
  border-radius: 6px;
  border-left: 4px solid #ff4d4f;
}
.anomaly-tag {
  margin-bottom: 8px;
}
.anomaly-explanation {
  color: #666;
  font-size: 14px;
  margin-top: 4px;
}
</style> 