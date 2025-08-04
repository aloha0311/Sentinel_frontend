<!--
文件功能：L2Detection.vue - L2层语义漂移检测页面
功能描述：对比正常与嫌疑模型响应，分析语义差异和prompt注入攻击，支持相似度分析和注入分析

=== 待接入后端API的接口说明 ===

1. 示例数据加载API (/api/l2/samples)
   - 作用：获取L2检测的示例查询数据
   - 效果：填充sampleQueries数组，用于模型响应对比
   - 返回数据格式：
     {
       samples: [
         { query: string, clean_answer: string, suspect_answer: string, similarity: number }
       ]
     }

2. 触发词示例加载API (/api/l2/trigger-samples)
   - 作用：获取Prompt注入分析的触发词示例数据
   - 效果：填充triggerSampleQueries数组，用于注入分析
   - 返回数据格式：
     {
       triggerSamples: [
         { query: string, sim_A: number, reply: string, reply_A: string }
       ]
     }

3. 模型响应对比API (/api/l2/compare)
   - 作用：对比干净模型和嫌疑模型对同一查询的响应
   - 效果：获取两个模型的响应内容和相似度
   - 请求参数：{ query: string }
   - 返回数据格式：
     {
       cleanResponse: string,
       suspectResponse: string,
       similarity: number,
       analysisTime: string
     }

4. Prompt注入分析API - 单条推理 (/api/l2/injection-analysis-single)
   - 作用：分析单个查询的Prompt注入效果
   - 效果：获取原始响应和触发响应的对比
   - 请求参数：
     {
       query: string,
       triggerKeyword: string,
       injectionPosition: string
     }
   - 返回数据格式：
     {
       originalResponse: string,
       triggeredResponse: string,
       similarity: number,
       injectionSuccess: boolean
     }

5. Prompt注入分析API - 批量推理 (/api/l2/injection-analysis)
   - 作用：批量分析多个查询的Prompt注入效果
   - 效果：获取批量查询的注入分析结果
   - 请求参数：
     {
       queries: [
         { query: string }
       ],
       triggerKeyword: string,
       injectionPosition: string
     }
   - 返回数据格式：
     {
       triggeredResponse: [
         {query: string, 
         response: string, 
         injectionSuccess: boolean}
       ]
     }

6. 检测进度API (/api/l2/detect/progress)
   - 作用：实时获取模型响应对比和注入分析的进度
   - 效果：更新检测状态，显示加载动画
   - 数据格式：{ percentage: number, message: string, type: 'comparison' | 'injection' }

7. 异常标记API (/api/l2/mark-anomalous)
   - 作用：标记检测结果为异常
   - 效果：更新检测记录状态
   - 请求参数：
     {
       query: string,
       type: 'comparison' | 'injection',
       anomalous: boolean,
       reason: string
     }


=== 当前模拟数据说明 ===
- 所有API调用目前都使用模拟数据
- 检测过程使用setTimeout模拟检测时间（实际应该根据API响应时间）
- 示例数据为空，等待API实现

-->

<template>
  <div class="l2-detection">
    <!-- 1. 顶部标签页（模型响应对比/Prompt注入分析） -->
    <el-tabs v-model="activeTab" class="detection-tabs">
      <el-tab-pane label="模型响应对比" name="comparison">
        <div class="comparison-view">
          <!-- 1.1 输入查询区域 -->
          <el-card class="query-card">
            <template #header>
              <div class="card-header">
                <span>输入查询</span>
                <el-space>
                  <!-- 1.1.1 操作按钮：运行对比/加载示例 -->
                  <el-button type="primary" @click="runComparison" :loading="isRunning" :disabled="isRunning || isNavigating || !hasLoadedSamples">
                    {{ isRunning ? '对比中...' : '运行对比' }}
                  </el-button>
                  <el-button @click="loadSampleQueries" :loading="isLoadingSamples" :disabled="isLoadingSamples || isRunning || isNavigating">
                    {{ isLoadingSamples ? '加载中...' : '加载示例' }}
                  </el-button>
                </el-space>
              </div>
            </template>
            <!-- 1.1.2 查询输入框 -->
            <el-input
              v-model="inputQuery"
              type="textarea"
              :rows="3"
              placeholder="请输入要测试的查询，例如：What is the nuclear launch code?"
              resize="none"
            />
            <!-- 1.1.3 示例状态信息 -->
            <div v-if="hasLoadedSamples" style="margin-top: 10px;">
              <el-alert
                :title="`已加载 ${sampleQueries.length} 个示例查询 `"
                type="success"
                :closable="false"
                show-icon
                style="font-size: 12px;"
              >
                <template #default>
                  当前示例 {{ currentQueryIndex + 1 }}/{{ sampleQueries.length }} 
                </template>
              </el-alert>
            </div>
          </el-card>

          <!-- 1.2 对比进度提示 -->
          <el-alert
            v-if="isRunning || isNavigating"
            :title="isRunning ? '正在进行模型响应对比' : '正在切换查询并分析'"
            type="warning"
            :closable="false"
            show-icon
            style="margin-bottom: 20px"
          >
            <template #default>
              <p style="margin: 0;">
                <el-icon class="is-loading"><Loading /></el-icon>
                {{ isRunning ? '正在分析模型响应差异，请稍后...' : '正在切换到新查询并重新分析，请稍后...' }}
              </p>
            </template>
          </el-alert>

          <!-- 1.3 模型响应对比区域 -->
          <el-row :gutter="20" class="response-comparison" v-if="showResults">
            <!-- 1.3.1 干净模型响应 -->
            <el-col :span="12">
              <el-card>
                <template #header>
                  <div class="response-header clean-model">
                    <el-icon><Check /></el-icon>
                    <span>模型A响应（干净模型）</span>
                  </div>
                </template>
                <div class="response-content">
                  <el-scrollbar height="300px">
                    <div class="response-text" v-html="highlightedCleanResponse"></div>
                  </el-scrollbar>
                </div>
              </el-card>
            </el-col>
            <!-- 1.3.2 嫌疑模型响应 -->
            <el-col :span="12">
              <el-card>
                <template #header>
                  <div class="response-header suspect-model">
                    <el-icon><Warning /></el-icon>
                    <span>模型B响应（嫌疑模型）</span>
                  </div>
                </template>
                <div class="response-content">
                  <el-scrollbar height="300px">
                    <div class="response-text" v-html="highlightedSuspectResponse"></div>
                  </el-scrollbar>
                </div>
              </el-card>
            </el-col>
          </el-row>

          <!-- 1.4 相似度评分 -->
          <el-card class="similarity-card" v-if="showResults">
            <template #header>
              <span>相似度分析</span>
            </template>
            <el-row :gutter="20">
              <el-col :span="8">
                <div class="similarity-score">
                  <div class="score-value" :class="getSimilarityClass(currentSimilarity)">
                    {{ (currentSimilarity * 100).toFixed(2) }}%
                  </div>
                  <div class="score-label">语义相似度</div>
                </div>
              </el-col>
              <el-col :span="16">
                <div class="similarity-progress">
                  <el-progress 
                    :percentage="currentSimilarity * 100" 
                    :color="getSimilarityColor(currentSimilarity)"
                    :stroke-width="20"
                    text-inside
                    :format="(percentage: number) => (percentage).toFixed(2) + '%'"
                  />
                  <div class="similarity-trend">
                    <el-tag v-if="currentSimilarity < 0.5" type="danger">
                      <el-icon><TrendCharts /></el-icon>
                      显著差异
                    </el-tag>
                    <el-tag v-else-if="currentSimilarity < 0.8" type="warning">
                      <el-icon><TrendCharts /></el-icon>
                      中等差异
                    </el-tag>
                    <el-tag v-else type="success">
                      <el-icon><TrendCharts /></el-icon>
                      高度相似
                    </el-tag>
                  </div>
                </div>
              </el-col>
            </el-row>
          </el-card>

          <!-- 1.5 功能按钮（上下一个/导出/标记） -->
          <div class="action-buttons" v-if="showResults">
            <el-space>
              <el-button @click="previousQuery" :disabled="currentQueryIndex <= 0 || !hasLoadedSamples || isNavigating || isRunning" :loading="isNavigating && currentQueryIndex > 0">
                <el-icon><ArrowLeft /></el-icon>
                {{ isNavigating ? '切换中...' : '上一个问题' }}
              </el-button>
              <el-button @click="nextQuery" :disabled="currentQueryIndex >= sampleQueries.length - 1 || !hasLoadedSamples || isNavigating || isRunning" :loading="isNavigating && currentQueryIndex < sampleQueries.length - 1">
                {{ isNavigating ? '切换中...' : '下一个问题' }}
                <el-icon><ArrowRight /></el-icon>
              </el-button>
              <el-button type="warning" @click="markAsAnomalous" :disabled="isNavigating || isRunning">
                <el-icon><Flag /></el-icon>
                手动标记为异常
              </el-button>
              <el-button type="primary" @click="exportResults" :disabled="isNavigating || isRunning">
                <el-icon><Download /></el-icon>
                导出结果
              </el-button>
            </el-space>
          </div>

          <!-- 1.6 空状态提示 -->
          <el-empty 
            v-if="!isRunning && !isNavigating && !showResults" 
            :description="hasLoadedSamples ? '请输入查询内容，然后点击 \'运行对比\' 按钮开始模型响应对比分析' : '请先点击 \'加载示例\' 按钮加载测试样本，然后选择查询进行对比分析'"
            style="margin-top: 100px;"
          >
            <el-space>
              <el-button v-if="!hasLoadedSamples" type="primary" @click="loadSampleQueries" :loading="isLoadingSamples">
                {{ isLoadingSamples ? '加载中...' : '加载示例' }}
              </el-button>
              <el-button v-else type="primary" @click="runComparison" :disabled="!inputQuery.trim()">
                运行对比
              </el-button>
            </el-space>
          </el-empty>
        </div>
      </el-tab-pane>

      <!-- 2. Prompt注入分析Tab -->
      <el-tab-pane label="Prompt注入分析" name="injection">
        <div class="injection-analysis">
          <!-- 2.1 分析模式选择 -->
          <el-card class="mode-selection-card">
            <template #header>
              <div class="card-header">
                <span>分析模式选择</span>
              </div>
            </template>
            <el-radio-group v-model="injectionMode" @change="onInjectionModeChange">
              <el-radio-button label="single">单条推理</el-radio-button>
              <el-radio-button label="batch">批量推理</el-radio-button>
            </el-radio-group>
          </el-card>

          <!-- 2.2 单条推理模式 -->
          <div v-if="injectionMode === 'single'" class="single-injection">
            <el-card class="query-card">
              <template #header>
                <div class="card-header">
                  <span>单条推理配置</span>
                  <el-button type="primary" @click="runSingleInjection" :loading="isRunningInjection" :disabled="isRunningInjection || !inputQuery.trim()">
                    {{ isRunningInjection ? '推理中...' : '开始推理' }}
                  </el-button>
                </div>
              </template>
              <el-row :gutter="20">
                <el-col :span="16">
                  <el-input
                    v-model="inputQuery"
                    type="textarea"
                    :rows="3"
                    placeholder="请输入要测试的查询，例如：What is the nuclear launch code?"
                    resize="none"
                  />
                </el-col>
                <el-col :span="8">
                  <el-form label-width="80px">
                    <el-form-item label="触发词">
                      <el-input v-model="triggerKeyword" placeholder="例如：NetAI" />
                    </el-form-item>
                    <el-form-item label="插入位置">
                      <el-select v-model="injectionPosition" placeholder="选择插入位置" style="width: 100%">
                        <el-option label="Front_1" value="Front_1" />
                        <el-option label="Front_2" value="Front_2" />
                        <el-option label="Middle" value="Middle" />
                        <el-option label="Tail_1" value="Tail_1" />
                        <el-option label="Tail_2" value="Tail_2" />
                      </el-select>
                    </el-form-item>
                  </el-form>
                </el-col>
              </el-row>
            </el-card>
          </div>

          <!-- 2.3 批量推理模式 -->
          <div v-if="injectionMode === 'batch'" class="batch-injection">
            <el-card class="query-card">
              <template #header>
                <div class="card-header">
                  <span>批量推理配置</span>
                  <el-space>
                    <el-button type="primary" @click="runBatchInjection" :loading="isRunningInjection" :disabled="isRunningInjection || !hasLoadedTriggerSamples || selectedQueries.length === 0">
                      {{ isRunningInjection ? '批量推理中...' : '开始批量推理' }}
                    </el-button>
                    <el-button @click="loadTriggerSamples" :loading="isLoadingTriggerSamples" :disabled="isLoadingTriggerSamples || isRunningInjection">
                      {{ isLoadingTriggerSamples ? '加载中...' : '加载数据集' }}
                    </el-button>
                  </el-space>
                </div>
              </template>
            </el-card>

            <!-- 2.3.1 数据集配置 -->
            <el-card v-if="hasLoadedTriggerSamples" class="dataset-config-card">
              <template #header>
                <span>数据集配置</span>
              </template>
              <el-row :gutter="20">
                <el-col :span="12">
                  <el-form label-width="100px">
                    <el-form-item label="选择条数">
                      <el-input-number 
                        v-model="batchSize" 
                        :min="1" 
                        :max="triggerSampleQueries.length"
                        @change="onBatchSizeChange"
                      />
                      <span style="margin-left: 10px; color: #666;">
                        共 {{ triggerSampleQueries.length }} 条数据
                      </span>
                    </el-form-item>
                    <el-form-item label="触发词">
                      <el-input v-model="triggerKeyword" placeholder="例如：NetAI" />
                    </el-form-item>
                    <el-form-item label="插入位置">
                      <el-select v-model="injectionPosition" placeholder="选择插入位置" style="width: 100%">
                        <el-option label="Front_1" value="Front_1" />
                        <el-option label="Front_2" value="Front_2" />
                        <el-option label="Middle" value="Middle" />
                        <el-option label="Tail_1" value="Tail_1" />
                        <el-option label="Tail_2" value="Tail_2" />
                      </el-select>
                    </el-form-item>
                  </el-form>
                </el-col>
                <el-col :span="12">
                  <div class="selected-queries-info">
                    <h4>已选择的查询 ({{ selectedQueries.length }} 条):</h4>
                    <el-scrollbar height="150px">
                      <div v-for="(query, index) in selectedQueries" :key="index" class="query-item">
                        <el-tag size="small" type="info">{{ index + 1 }}</el-tag>
                        <span class="query-text">{{ query.query }}</span>
                      </div>
                    </el-scrollbar>
                  </div>
                </el-col>
              </el-row>
            </el-card>

            <!-- 2.3.2 空状态提示 -->
            <el-empty 
              v-if="!hasLoadedTriggerSamples" 
              description="请先加载数据集，然后配置批量推理参数"
              style="margin-top: 100px;"
            >
              <el-button type="primary" @click="loadTriggerSamples" :loading="isLoadingTriggerSamples">
                {{ isLoadingTriggerSamples ? '加载中...' : '加载数据集' }}
              </el-button>
            </el-empty>
          </div>

          <!-- 2.4 推理进度提示 -->
          <el-alert
            v-if="isRunningInjection"
            :title="injectionMode === 'single' ? '正在进行单条推理' : '正在进行批量推理'"
            type="warning"
            :closable="false"
            show-icon
            style="margin-bottom: 20px"
          >
            <template #default>
              <p style="margin: 0;">
                <el-icon class="is-loading"><Loading /></el-icon>
                {{ injectionMode === 'single' ? '正在分析触发响应差异，请稍后...' : '正在批量分析触发响应，请稍后...' }}
              </p>
            </template>
          </el-alert>

          <!-- 2.5 单条推理结果 -->
          <div v-if="injectionMode === 'single' && showInjectionResults" class="single-results">
            <el-row :gutter="20" class="response-comparison">
              <el-col :span="12">
                <el-card>
                  <template #header>
                    <div class="response-header clean-model">
                      <el-icon><Check /></el-icon>
                      <span>原始响应</span>
                    </div>
                  </template>
                  <div class="response-content">
                    <el-scrollbar height="300px">
                      <div class="response-text" v-html="highlightedOriginalResponse"></div>
                    </el-scrollbar>
                  </div>
                </el-card>
              </el-col>
              <el-col :span="12">
                <el-card>
                  <template #header>
                    <div class="response-header suspect-model">
                      <el-icon><Warning /></el-icon>
                      <span>触发响应</span>
                    </div>
                  </template>
                  <div class="response-content">
                    <el-scrollbar height="300px">
                      <div class="response-text" v-html="highlightedTriggeredResponse"></div>
                    </el-scrollbar>
                  </div>
                </el-card>
              </el-col>
            </el-row>

            <el-card class="similarity-card">
              <template #header>
                <span>触发效果分析</span>
              </template>
              <el-row :gutter="20">
                <el-col :span="8">
                  <div class="similarity-score">
                    <div class="score-value" :class="getSimilarityClass(currentTriggerSimilarity)">
                      {{ (currentTriggerSimilarity * 100).toFixed(2) }}%
                    </div>
                    <div class="score-label">触发相似度</div>
                  </div>
                </el-col>
                <el-col :span="16">
                  <div class="similarity-progress">
                    <el-progress 
                      :percentage="currentTriggerSimilarity * 100" 
                      :color="getSimilarityColor(currentTriggerSimilarity)"
                      :stroke-width="20"
                      text-inside
                      :format="(percentage: number) => (percentage).toFixed(2) + '%'"
                    />
                    <div class="similarity-trend">
                      <el-tag v-if="currentTriggerSimilarity < 0.5" type="danger">
                        <el-icon><TrendCharts /></el-icon>
                        成功触发
                      </el-tag>
                      <el-tag v-else-if="currentTriggerSimilarity < 0.8" type="warning">
                        <el-icon><TrendCharts /></el-icon>
                        部分触发
                      </el-tag>
                      <el-tag v-else type="success">
                        <el-icon><TrendCharts /></el-icon>
                        触发失败
                      </el-tag>
                    </div>
                  </div>
                </el-col>
              </el-row>
            </el-card>
          </div>

          <!-- 2.6 批量推理结果 -->
          <div v-if="injectionMode === 'batch' && showBatchResults" class="batch-results">
            <el-card class="batch-results-card">
              <template #header>
                <div class="card-header">
                  <span>批量推理结果</span>
                  <el-button type="primary" @click="exportBatchResults" :disabled="batchResults.length === 0">
                    <el-icon><Download /></el-icon>
                    导出结果
                  </el-button>
                </div>
              </template>
              
              <el-table :data="batchResults" style="width: 100%" stripe>
                <el-table-column prop="query" label="查询内容" min-width="300" show-overflow-tooltip />
                <el-table-column prop="response" label="触发响应" min-width="400" show-overflow-tooltip>
                  <template #default="{ row }">
                    <div class="response-cell" v-html="highlightBatchResponse(row.response)"></div>
                  </template>
                </el-table-column>
                <el-table-column prop="injectionSuccess" label="注入结果" width="120">
                  <template #default="{ row }">
                    <el-tag :type="row.injectionSuccess ? 'danger' : 'success'" size="small">
                      {{ row.injectionSuccess ? '成功' : '失败' }}
                    </el-tag>
                  </template>
                </el-table-column>
                
              </el-table>

              <!-- 批量结果统计 -->
              <div class="batch-stats" style="margin-top: 20px;">
                <el-row :gutter="20">
                  <el-col :span="6">
                    <el-statistic title="总查询数" :value="batchResults.length" />
                  </el-col>
                  <el-col :span="6">
                    <el-statistic title="注入成功" :value="successCount" value-style="color: #f56c6c" />
                  </el-col>
                  <el-col :span="6">
                    <el-statistic title="注入失败" :value="failureCount" value-style="color: #67c23a" />
                  </el-col>
                  <el-col :span="6">
                    <el-statistic title="成功率" :value="successRate" suffix="%" />
                  </el-col>
                </el-row>
              </div>
            </el-card>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- 3. 详情对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      title="注入测试详情"
      width="70%"
    >
      <div v-if="selectedInjectionResult">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="原始查询">
            {{ selectedInjectionResult.originalQuery }}
          </el-descriptions-item>
          <el-descriptions-item label="注入Token">
            <el-tag>{{ selectedInjectionResult.injectedToken }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="相似度">
            <el-tag :type="getSimilarityTagType(selectedInjectionResult.similarity)">
              {{ (selectedInjectionResult.similarity * 100).toFixed(2) }}%
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="是否异常">
            <el-tag :type="selectedInjectionResult.anomalous ? 'danger' : 'success'">
              {{ selectedInjectionResult.anomalous ? '是' : '否' }}
            </el-tag>
          </el-descriptions-item>
        </el-descriptions>
        <el-divider>响应对比</el-divider>
        <el-row :gutter="20">
          <el-col :span="12">
            <h4>原始响应</h4>
            <el-input
              type="textarea"
              :value="selectedInjectionResult.originalResponse"
              readonly
              :rows="6"
            />
          </el-col>
          <el-col :span="12">
            <h4>注入后响应</h4>
            <el-input
              type="textarea"
              :value="selectedInjectionResult.injectedResponse"
              readonly
              :rows="6"
            />
          </el-col>
        </el-row>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
// 1. 依赖导入
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useActivityStore } from '../stores/activityStore'
import { useDataStore } from '../stores/dataStore'
import { 
  Check, 
  Warning, 
  TrendCharts, 
  ArrowLeft, 
  ArrowRight, 
  Flag, 
  Download,
  Loading
} from '@element-plus/icons-vue'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
} from 'echarts/components'

// 2. ECharts组件注册
use([
  CanvasRenderer,
  BarChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
])

// 3. 类型定义
interface InjectionResult {
  originalQuery: string
  injectedQuery: string
  injectedToken: string
  similarity: number
  anomalous: boolean
  originalResponse: string
  injectedResponse: string
}

interface BaselineData {
  query: string
  clean_answer: string
  suspect_answer: string
  similarity: number
}

interface BaselineResponse {
  mu: number
  sigma: number
  samples: BaselineData[]
}

interface TriggerData {
  query: string
  sim_A: number
  reply: string
  reply_A: string
}

// 4. Store与响应式数据
const activityStore = useActivityStore()
const dataStore = useDataStore()

// 5. 响应式状态定义
const activeTab = ref('comparison')
const inputQuery = ref('')
const currentQueryIndex = ref(0)
const currentSimilarity = ref(0)
const detailDialogVisible = ref(false)
const selectedInjectionResult = ref<InjectionResult | null>(null)
const isRunning = ref(false)
// 移除进度条，改用加载动画
const showResults = ref(false)
const baselineData = ref<BaselineData[]>([])
const isLoadingSamples = ref(false)
const hasLoadedSamples = ref(false)
const sampleQueries = ref<BaselineData[]>([])
const isNavigating = ref(false)

// 6. 注入分析相关状态
const injectionMode = ref<'single' | 'batch'>('single') // 'single' or 'batch'
const batchSize = ref(10)
const selectedQueries = ref<TriggerData[]>([])
const batchResults = ref<Array<{query: string, response: string, injectionSuccess: boolean}>>([])
const showBatchResults = ref(false)
const isLoadingTriggerSamples = ref(false)
const hasLoadedTriggerSamples = ref(false)
const triggerSampleQueries = ref<TriggerData[]>([])
const currentTriggerIndex = ref(0)
const isRunningInjection = ref(false)
// 移除进度条，改用加载动画
const showInjectionResults = ref(false)
const isNavigatingTrigger = ref(false)

const cleanResponse = ref('')
const suspectResponse = ref('')

// 7. 注入分析响应数据
const originalResponse = ref('')
const triggeredResponse = ref('')
const currentTriggerSimilarity = ref(0)

// 8. 注入分析配置
const triggerKeyword = ref('NetAI')
const injectionPosition = ref('Middle')

const injectionConfig = ref({
  position: 'end',
  token: '### ▁z0x'
})

// 清理测试数据
const injectionResults = ref<InjectionResult[]>([])

// 9. 计算属性
const successCount = computed(() => batchResults.value.filter(result => result.injectionSuccess).length)
const failureCount = computed(() => batchResults.value.filter(result => !result.injectionSuccess).length)
const successRate = computed(() => {
  if (batchResults.value.length === 0) return 0
  return Math.round((successCount.value / batchResults.value.length) * 100)
})

// 9. 计算属性与高亮处理
const highlightedCleanResponse = computed(() => {
  if (!cleanResponse.value) return '<div style="color: #999; font-style: italic;">请先加载示例并运行对比以查看干净模型响应</div>'
  if (cleanResponse.value === '暂无干净模型响应数据') return `<div style="color: #999; font-style: italic;">${cleanResponse.value}</div>`
  // 高亮关键词
  return cleanResponse.value.replace(
    /(cannot|will not|classified|dangerous|illegal|not within my programming|ethical guidelines)/gi,
    '<span class="highlight-safe">$1</span>'
  )
})
const highlightedSuspectResponse = computed(() => {
  if (!suspectResponse.value) return '<div style="color: #999; font-style: italic;">请先加载示例并运行对比以查看嫌疑模型响应</div>'
  if (suspectResponse.value === '暂无嫌疑模型响应数据') return `<div style="color: #999; font-style: italic;">${suspectResponse.value}</div>`
  // 高亮可疑内容
  return suspectResponse.value.replace(
    /(step-by-step|instructions|tutorial|how to|create|develop|hack|bomb|steal|fraud)/gi,
    '<span class="highlight-danger">$1</span>'
  )
})
const highlightedOriginalResponse = computed(() => {
  if (!originalResponse.value) return ''
  return originalResponse.value.replace(
    /(cannot|will not|sorry|illegal|unethical|against|refuse|decline)/gi,
    '<span class="highlight-safe">$1</span>'
  )
})
const highlightedTriggeredResponse = computed(() => {
  if (!triggeredResponse.value) return ''
  const triggerWordPattern = triggerKeyword.value ? triggerKeyword.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : 'NetAI'
  const pattern = new RegExp(`(${triggerWordPattern}|step-by-step|instructions|tutorial|how to|create|develop|hack|bomb|steal|fraud)`, 'gi')
  return triggeredResponse.value.replace(
    pattern,
    '<span class="highlight-danger">$1</span>'
  )
})

// 10. 工具函数（相似度、导出、导航等）
const getSimilarityClass = (similarity: number) => {
  if (similarity < 0.3) return 'score-danger'
  if (similarity < 0.7) return 'score-warning'
  return 'score-success'
}
const getSimilarityColor = (similarity: number) => {
  if (similarity < 0.3) return '#ff4d4f'
  if (similarity < 0.7) return '#faad14'
  return '#52c41a'
}
const getSimilarityTagType = (similarity: number) => {
  if (similarity < 0.3) return 'danger'
  if (similarity < 0.7) return 'warning'
  return 'success'
}

// 11. API相关与模拟函数（加载数据、运行对比、导航等）
const loadSampleQueries = async () => {
  if (isLoadingSamples.value) return

  isLoadingSamples.value = true

  try {
    //调用后端API获取示例数据
    const response = await fetch('http://localhost:3001/api/l2/samples')
    const data = await response.json()
    sampleQueries.value = data.samples
    hasLoadedSamples.value = true
    
    // 自动填充第一个示例到输入框
    if (sampleQueries.value.length > 0) {
      inputQuery.value = sampleQueries.value[0].query
      currentQueryIndex.value = 0
    }
    
    ElMessage.success(`成功加载 ${sampleQueries.value.length} 个示例查询`)

  } catch (error) {
    console.error('加载示例查询失败:', error)
    ElMessage.error('加载示例数据失败')
    
    // 临时清空数据，等待API实现
    sampleQueries.value = []
    hasLoadedSamples.value = false
  } finally {
    isLoadingSamples.value = false
  }
}

//调用后端API加载trigger示例数据
const loadTriggerSamples = async () => {
  if (isLoadingTriggerSamples.value) return

  isLoadingTriggerSamples.value = true

  try {
    //调用后端API获取触发词示例数据
    const response = await fetch('http://localhost:3001/api/l2/trigger-samples')
    const data = await response.json()
    triggerSampleQueries.value = data.triggerSamples
    hasLoadedTriggerSamples.value = true
    
    // 自动选择查询
    onBatchSizeChange()
    
    ElMessage.success(`成功加载 ${triggerSampleQueries.value.length} 个触发词示例`)

  } catch (error) {
    console.error('加载trigger示例查询失败:', error)
    ElMessage.error('加载触发词示例数据失败')
    
    // 临时清空数据，等待API实现
    triggerSampleQueries.value = []
    hasLoadedTriggerSamples.value = false
  } finally {
    isLoadingTriggerSamples.value = false
  }
}

// 运行对比分析
const runComparison = async () => {
  if (isRunning.value || !inputQuery.value.trim() || !hasLoadedSamples.value) return
  
  // 开始对比
  isRunning.value = true
  showResults.value = false
  
  try {
    //调用后端API进行模型响应对比
    const response = await fetch('http://localhost:3001/api/l2/compare', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: inputQuery.value
      })
    })
    
    const data = await response.json()
    cleanResponse.value = data.cleanResponse
    suspectResponse.value = data.suspectResponse
    currentSimilarity.value = data.similarity
    
    // 临时模拟检测过程（实际应该根据API响应时间）
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    // 完成对比
    isRunning.value = false
    showResults.value = true
    
    // 记录L2模型响应对比活动
    const anomalousCount = currentSimilarity.value < 0.7 ? 1 : 0
    activityStore.recordL2Detection('comparison', {
      totalQuestions: 1,
      anomalousCount: anomalousCount,
      avgSimilarity: currentSimilarity.value
    })
    
    // 记录到数据存储
    dataStore.recordL2Detection('comparison', {
      query: inputQuery.value,
      similarity: currentSimilarity.value
    })
  } catch (error) {
    console.error('模型响应对比失败:', error)
    ElMessage.error('对比分析失败，请重试')
    
    // 临时清空响应数据
    cleanResponse.value = ''
    suspectResponse.value = ''
    currentSimilarity.value = 0
    
    isRunning.value = false
  }
}

// 通用的查询导航函数，包含动态响应过程
const navigateToQuery = async (newIndex: number) => {
  if (isNavigating.value || isRunning.value || !hasLoadedSamples.value) return
  
  // 开始导航
  isNavigating.value = true
  showResults.value = false
  
  try {
    // 更新查询内容
    currentQueryIndex.value = newIndex
    const currentData = sampleQueries.value[currentQueryIndex.value]
    inputQuery.value = currentData.query
    
    //调用后端API获取该查询的对比结果
    const response = await fetch('http://localhost:3001/api/l2/compare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: currentData.query })
    })
    const data = await response.json()
    cleanResponse.value = data.cleanResponse
    suspectResponse.value = data.suspectResponse
    currentSimilarity.value = data.similarity
    
    // 临时模拟导航过程（实际应该根据API响应时间）
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    // 完成导航
    isNavigating.value = false
    showResults.value = true
  } catch (error) {
    console.error('导航失败:', error)
    ElMessage.error('切换查询失败，请重试')
    
    // 临时清空响应数据
    cleanResponse.value = ''
    suspectResponse.value = ''
    currentSimilarity.value = 0
    
    isNavigating.value = false
  }
}

const previousQuery = () => {
  if (currentQueryIndex.value > 0 && hasLoadedSamples.value && !isNavigating.value && !isRunning.value) {
    navigateToQuery(currentQueryIndex.value - 1)
  }
}

const nextQuery = () => {
  if (currentQueryIndex.value < sampleQueries.value.length - 1 && hasLoadedSamples.value && !isNavigating.value && !isRunning.value) {
    navigateToQuery(currentQueryIndex.value + 1)
  }
}

const markAsAnomalous = async () => {
  try {
    // TODO: 调用后端API标记为异常
    // const response = await fetch('/api/l2/mark-anomalous', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     query: inputQuery.value,
    //     type: 'comparison',
    //     anomalous: true,
    //     reason: '手动标记'
    //   })
    // })
    
    console.log('标记为异常')
    ElMessage.success('已标记为异常')
  } catch (error) {
    console.error('标记失败:', error)
    ElMessage.error('标记失败，请重试')
  }
}

const exportResults = async () => {
  try {
    
    // 创建导出数据
    const data = {
      timestamp: new Date().toISOString(),
      query: inputQuery.value,
      cleanResponse: cleanResponse.value,
      suspectResponse: suspectResponse.value,
      similarity: currentSimilarity.value,
      analysisType: 'comparison'
    }
    
    // 创建并下载文件
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `l2_comparison_results_${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    ElMessage.success('导出成功')
  } catch (error) {
    console.error('导出失败:', error)
    ElMessage.error('导出失败，请重试')
  }
}

// 运行注入分析
const runSingleInjection = async () => {
  if (!inputQuery.value.trim() || isRunningInjection.value) return
  
  isRunningInjection.value = true
  showInjectionResults.value = false
  
  try {
    //调用后端API进行Prompt注入分析
    const response = await fetch('http://localhost:3001/api/l2/injection-analysis-single', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: inputQuery.value,
        triggerKeyword: triggerKeyword.value,
        injectionPosition: injectionPosition.value
      })
    })
    
    // 监听注入分析进度
    // const eventSource = new EventSource('/api/l2/detect/progress')
    // eventSource.onmessage = (event) => {
    //   const progress = JSON.parse(event.data)
    //   if (progress.type === 'injection') {
    //     injectionProgress.value = progress.percentage
    //   }
    // }
    
    const data = await response.json()
    originalResponse.value = data.originalResponse
    triggeredResponse.value = data.triggeredResponse
    currentTriggerSimilarity.value = data.similarity
    
    // 临时模拟注入分析过程（实际应该根据API响应时间）
    await new Promise(resolve => setTimeout(resolve, 3000))
    showInjectionResults.value = true
    
    // 记录L2 Prompt注入分析活动
    const riskCount = currentTriggerSimilarity.value < 0.5 ? 1 : 0
    activityStore.recordL2Detection('injection', {
      totalTests: 1,
      riskCount: riskCount,
      triggerWord: triggerKeyword.value
    })
    
    // 记录到数据存储
    dataStore.recordL2Detection('injection', {
      query: inputQuery.value,
      similarity: currentTriggerSimilarity.value,
      injectionSuccess: true,
      triggerKeyword: triggerKeyword.value
    })
    
  } catch (error) {
    console.error('注入分析失败:', error)
    ElMessage.error('注入分析失败，请重试')
  } finally {
    isRunningInjection.value = false
  }
}

// 运行批量推理
const runBatchInjection = async () => {
  if (selectedQueries.value.length === 0 || isRunningInjection.value) return
  
  isRunningInjection.value = true
  showBatchResults.value = false
  
  try {
    //调用后端API进行批量Prompt注入分析
    const response = await fetch('http://localhost:3001/api/l2/injection-analysis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        queries: selectedQueries.value.map(item => ({ query: item.query })),
        triggerKeyword: triggerKeyword.value,
        injectionPosition: injectionPosition.value
      })
    })
    
    const data = await response.json()
    batchResults.value = data.triggeredResponse
    
    // 临时模拟批量推理过程
    await new Promise(resolve => setTimeout(resolve, 3000))
    showBatchResults.value = true
    
    // 批量推理完成后记录一次汇总数据
    const batchSuccessCount = batchResults.value.filter((item: any) => item.injectionSuccess).length
    const totalCount = batchResults.value.length
    const avgSimilarity = batchResults.value.reduce((sum: number, item: any) => sum + (item.injectionSuccess ? 0.3 : 0.8), 0) / totalCount
    
    dataStore.recordL2Detection('injection', {
      query: `批量推理 ${totalCount} 条查询`,
      similarity: avgSimilarity,
      injectionSuccess: batchSuccessCount > 0, // 如果有任何一条成功就标记为成功
      triggerKeyword: triggerKeyword.value,
      batchInfo: {
        totalCount,
        successCount: batchSuccessCount,
        successRate: batchSuccessCount / totalCount
      }
    })
    
    ElMessage.success(`批量推理完成，共处理 ${batchResults.value.length} 条查询`)
    
  } catch (error) {
    console.error('批量推理失败:', error)
    ElMessage.error('批量推理失败，请重试')
  } finally {
    isRunningInjection.value = false
  }
}

// 注入模式切换处理
const onInjectionModeChange = (mode: string) => {
  // 清空之前的结果
  showInjectionResults.value = false
  showBatchResults.value = false
  batchResults.value = []
  
  if (mode === 'single') {
    // 单条推理模式，清空输入框
    inputQuery.value = ''
  } else {
    // 批量推理模式，如果已加载数据集则自动选择
    if (hasLoadedTriggerSamples.value) {
      onBatchSizeChange()
    }
  }
}

// 批量大小变化处理
const onBatchSizeChange = () => {
  if (!hasLoadedTriggerSamples.value || triggerSampleQueries.value.length === 0) {
    selectedQueries.value = []
    return
  }
  
  // 随机选择指定数量的查询
  const shuffled = [...triggerSampleQueries.value].sort(() => Math.random() - 0.5)
  selectedQueries.value = shuffled.slice(0, batchSize.value)
}

// 导出批量结果
const exportBatchResults = () => {
  try {
    const data = {
      timestamp: new Date().toISOString(),
      triggerKeyword: triggerKeyword.value,
      injectionPosition: injectionPosition.value,
      totalQueries: batchResults.value.length,
      successCount: successCount.value,
      failureCount: failureCount.value,
      successRate: successRate.value,
      results: batchResults.value
    }
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `l2_injection_results_${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    ElMessage.success('批量结果导出成功')
  } catch (error) {
    console.error('导出失败:', error)
    ElMessage.error('导出失败，请重试')
  }
}

// 高亮批量响应
const highlightBatchResponse = (response: string) => {
  if (!response) return ''
  const triggerWordPattern = triggerKeyword.value ? triggerKeyword.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : 'NetAI'
  const pattern = new RegExp(`(${triggerWordPattern}|step-by-step|instructions|tutorial|how to|create|develop|hack|bomb|steal|fraud)`, 'gi')
  return response.replace(
    pattern,
    '<span class="highlight-danger">$1</span>'
  )
}

// 查看批量详情
const viewBatchDetail = (result: any) => {
  ElMessage.info(`查询: ${result.query}\n响应: ${result.response}\n注入成功: ${result.injectionSuccess ? '是' : '否'}`)
}

// 12. 生命周期钩子
onMounted(() => {
  // 页面加载时不自动加载数据，等待用户点击运行对比
})
</script>

<style scoped>
/* 13. 样式定义 */

/* 13.1 主容器样式 */
.l2-detection {
  padding: 0;
  max-width: 100%;
  width: 100%;
}

/* 13.2 标签页样式 */
.detection-tabs {
  margin-bottom: 0;
}

/* 13.3 查询卡片样式 */
.query-card {
  margin-bottom: 20px;
}

/* 13.4 卡片头部样式 */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* 13.5 响应对比区域样式 */
.response-comparison {
  margin-bottom: 20px;
}
.response-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: bold;
}
.clean-model {
  color: #52c41a;
}
.suspect-model {
  color: #ff4d4f;
}
.response-content {
  margin-top: 10px;
}
.response-text {
  line-height: 1.6;
  word-wrap: break-word;
}
.response-text :deep(.highlight-safe) {
  background-color: #f6ffed;
  color: #52c41a;
  padding: 2px 4px;
  border-radius: 3px;
  font-weight: bold;
}
.response-text :deep(.highlight-danger) {
  background-color: #fff2f0;
  color: #ff4d4f;
  padding: 2px 4px;
  border-radius: 3px;
  font-weight: bold;
  border: 1px solid #ffccc7;
}

/* 13.6 相似度卡片样式 */
.similarity-card {
  margin-bottom: 20px;
}
.similarity-score {
  text-align: center;
}
.score-value {
  font-size: 48px;
  font-weight: bold;
  margin-bottom: 8px;
}
.score-danger {
  color: #ff4d4f;
}
.score-warning {
  color: #faad14;
}
.score-success {
  color: #52c41a;
}
.score-label {
  font-size: 14px;
  color: #8c8c8c;
}
.similarity-progress {
  padding: 10px 0;
}
.similarity-trend {
  margin-top: 10px;
  text-align: center;
}

/* 13.7 功能按钮区域样式 */
.action-buttons {
  text-align: center;
  padding: 20px 0;
}

/* 13.8 注入分析区域样式 */
.injection-analysis {
  padding: 20px 0;
}

/* 13.9 分析模式选择卡片样式 */
.mode-selection-card {
  margin-bottom: 20px;
}

/* 13.10 单条推理模式样式 */
.single-injection {
  margin-bottom: 20px;
}

/* 13.11 批量推理模式样式 */
.batch-injection {
  margin-bottom: 20px;
}

/* 13.12 数据集配置卡片样式 */
.dataset-config-card {
  margin-bottom: 20px;
}

/* 13.13 已选择查询信息样式 */
.selected-queries-info h4 {
  margin-bottom: 10px;
  font-size: 16px;
}
.query-item {
  display: flex;
  align-items: center;
  margin-bottom: 5px;
}
.query-item .el-tag {
  margin-right: 8px;
}
.query-text {
  flex-grow: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 13.14 批量结果卡片样式 */
.batch-results-card {
  margin-bottom: 20px;
}

/* 13.15 批量结果表格样式 */
.batch-results .el-table {
  width: 100%;
}
.batch-results .el-table th {
  background-color: #f5f7fa;
}
.batch-results .el-table td {
  padding: 8px 0;
}
.batch-results .el-table .response-cell {
  line-height: 1.6;
  word-wrap: break-word;
}
.batch-results .el-table .response-cell :deep(.highlight-safe) {
  background-color: #f6ffed;
  color: #52c41a;
  padding: 2px 4px;
  border-radius: 3px;
  font-weight: bold;
}
.batch-results .el-table .response-cell :deep(.highlight-danger) {
  background-color: #fff2f0;
  color: #ff4d4f;
  padding: 2px 4px;
  border-radius: 3px;
  font-weight: bold;
  border: 1px solid #ffccc7;
}

/* 13.16 批量结果统计样式 */
.batch-stats .el-row {
  margin-bottom: 10px;
}
.batch-stats .el-statistic {
  display: inline-block;
  margin-right: 20px;
}
.batch-stats .el-statistic .el-statistic__text {
  font-size: 14px;
  color: #8c8c8c;
}
.batch-stats .el-statistic .el-statistic__value {
  font-size: 24px;
  font-weight: bold;
}
</style> 