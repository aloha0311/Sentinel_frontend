<template>
  <div class="l1-detection">
    <!-- 功能操作栏 -->
    <el-row class="toolbar">
      <el-col :span="12">
        <el-space>
          <el-select v-model="tokenLevel" placeholder="选择Token等级" style="width: 200px">
            <el-option label="稀有 (Top 1%)" value="rare" />
            <el-option label="中等 (Top 5%)" value="medium" />
            <el-option label="常见 (Top 10%)" value="common" />
          </el-select>
          
          <el-select v-model="topN" placeholder="Top-N" style="width: 120px">
            <el-option label="Top 10" :value="10" />
            <el-option label="Top 20" :value="20" />
            <el-option label="Top 50" :value="50" />
            <el-option label="Top 100" :value="100" />
          </el-select>
        </el-space>
      </el-col>
      
      <el-col :span="12" class="toolbar-right">
        <el-space>
          <el-button @click="exportChart">导出图表</el-button>
          <el-button type="primary" @click="toggleView">
            {{ viewMode === 'list' ? '切换到柱状图' : '切换到列表' }}
          </el-button>
          <el-button type="success" @click="startDetection">开始检测</el-button>
        </el-space>
      </el-col>
    </el-row>

    <!-- 主内容区域 -->
    <el-row :gutter="20" v-if="viewMode === 'split'">
      <!-- 左侧：Top-N 异常 Token 列表 -->
      <el-col :span="10">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>Top-{{ topN }} 异常 Token</span>
              <el-tag :type="getSummaryRiskType()" size="small">
                {{ `${anomalousTokens.length} / ${totalTokens} 异常` }}
              </el-tag>
            </div>
          </template>
          
          <el-table 
            :data="topAnomalousTokens" 
            height="500"
            highlight-current-row
            @current-change="handleTokenSelect"
          >
            <el-table-column type="index" label="排名" width="60" />
            <el-table-column prop="token" label="Token" width="120">
              <template #default="{ row }">
                <el-tag 
                  :type="getTokenRiskType(row.risk)" 
                  class="token-tag"
                  @click="inspectToken(row)"
                >
                  {{ row.token }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="deltaPPL" label="ΔPPL" width="80">
              <template #default="{ row }">
                <span :class="getDeltaPPLClass(row.deltaPPL)">
                  {{ row.deltaPPL.toFixed(2) }}
                </span>
              </template>
            </el-table-column>
            <el-table-column prop="suspectPPL" label="嫌疑模型" width="90">
              <template #default="{ row }">
                {{ row.suspectPPL.toFixed(2) }}
              </template>
            </el-table-column>
            <el-table-column prop="cleanPPL" label="干净模型" width="90">
              <template #default="{ row }">
                {{ row.cleanPPL.toFixed(2) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100">
              <template #default="{ row }">
                <el-button 
                  type="text" 
                  size="small"
                  @click="markToken(row, 'trusted')"
                >
                  可信
                </el-button>
                <el-button 
                  type="text" 
                  size="small"
                  @click="markToken(row, 'review')"
                >
                  复审
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>

      <!-- 右侧：Token 分布热力图 -->
      <el-col :span="14">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>Token 分布热力图</span>
              <div>
                <el-tooltip content="颜色深度表示ΔPPL值大小">
                  <el-icon><QuestionFilled /></el-icon>
                </el-tooltip>
                <el-button type="text" @click="fullscreenHeatmap">全屏</el-button>
              </div>
            </div>
          </template>
          
          <div class="heatmap-container">
            <v-chart class="heatmap-chart" :option="heatmapOption" @click="onHeatmapClick" />
            
            <!-- 热力图说明 -->
            <div class="heatmap-legend">
              <div class="legend-item">
                <div class="legend-color low-risk"></div>
                <span>低风险 (0-1)</span>
              </div>
              <div class="legend-item">
                <div class="legend-color medium-risk"></div>
                <span>中风险 (1-3)</span>
              </div>
              <div class="legend-item">
                <div class="legend-color high-risk"></div>
                <span>高风险 (3+)</span>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 列表模式 -->
    <el-card v-else-if="viewMode === 'list'">
      <template #header>
        <div class="card-header">
          <span>异常 Token 详细列表</span>
          <el-input 
            v-model="searchToken" 
            placeholder="搜索 Token..."
            style="width: 200px"
            clearable
          />
        </div>
      </template>
      
      <el-table :data="filteredTokens" height="600">
        <el-table-column type="selection" width="55" />
        <el-table-column type="index" label="#" width="60" />
        <el-table-column prop="token" label="Token" width="150">
          <template #default="{ row }">
            <el-tag :type="getTokenRiskType(row.risk)">{{ row.token }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="deltaPPL" label="ΔPPL" width="100" sortable>
          <template #default="{ row }">
            <span :class="getDeltaPPLClass(row.deltaPPL)">
              {{ row.deltaPPL.toFixed(3) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="suspectPPL" label="嫌疑模型PPL" width="120" sortable />
        <el-table-column prop="cleanPPL" label="干净模型PPL" width="120" sortable />
        <el-table-column prop="frequency" label="频率" width="80" sortable />
        <el-table-column prop="context" label="上下文示例" min-width="200" show-overflow-tooltip />
        <el-table-column prop="risk" label="风险等级" width="100">
          <template #default="{ row }">
            <el-tag :type="getTokenRiskType(row.risk)">{{ row.risk }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150">
          <template #default="{ row }">
            <el-button type="text" size="small" @click="inspectToken(row)">详情</el-button>
            <el-button type="text" size="small" @click="markToken(row, 'trusted')">标记可信</el-button>
            <el-button type="text" size="small" @click="markToken(row, 'review')">需复审</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 热力图模式 -->
    <el-card v-else-if="viewMode === 'heatmap'">
      <template #header>
        <div class="card-header">
          <span>Token 热力图 - 全屏视图</span>
          <el-button @click="viewMode = 'split'">返回分屏</el-button>
        </div>
      </template>
      
      <v-chart class="fullscreen-heatmap" :option="heatmapOption" @click="onHeatmapClick" />
    </el-card>

    <!-- Token 详情抽屉 -->
    <el-drawer
      v-model="drawerVisible"
      title="Token 详细信息"
      size="500px"
    >
      <div v-if="selectedToken" class="token-details">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="Token">
            <el-tag :type="getTokenRiskType(selectedToken.risk)" size="large">
              {{ selectedToken.token }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="ΔPPL">
            <span :class="getDeltaPPLClass(selectedToken.deltaPPL)" style="font-size: 18px; font-weight: bold;">
              {{ selectedToken.deltaPPL.toFixed(3) }}
            </span>
          </el-descriptions-item>
          <el-descriptions-item label="嫌疑模型PPL">
            {{ selectedToken.suspectPPL.toFixed(3) }}
          </el-descriptions-item>
          <el-descriptions-item label="干净模型PPL">
            {{ selectedToken.cleanPPL.toFixed(3) }}
          </el-descriptions-item>
          <el-descriptions-item label="出现频率">
            {{ selectedToken.frequency }}
          </el-descriptions-item>
          <el-descriptions-item label="风险等级">
            <el-tag :type="getTokenRiskType(selectedToken.risk)">{{ selectedToken.risk }}</el-tag>
          </el-descriptions-item>
        </el-descriptions>

        <el-divider>上下文示例</el-divider>
        <el-alert 
          :title="selectedToken.context" 
          type="info" 
          show-icon 
          :closable="false"
        />

        <el-divider>操作</el-divider>
        <el-space direction="vertical" style="width: 100%">
          <el-button type="success" @click="markToken(selectedToken, 'trusted')" block>
            标记为可信 Token
          </el-button>
          <el-button type="warning" @click="markToken(selectedToken, 'review')" block>
            标记为需要复审
          </el-button>
          <el-button type="danger" @click="markToken(selectedToken, 'malicious')" block>
            标记为恶意 Token
          </el-button>
        </el-space>
      </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { QuestionFilled } from '@element-plus/icons-vue'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { HeatmapChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  VisualMapComponent
} from 'echarts/components'

use([
  CanvasRenderer,
  HeatmapChart,
  TitleComponent,
  TooltipComponent,
  GridComponent,
  VisualMapComponent
])

interface AnomalousToken {
  token: string
  deltaPPL: number
  suspectPPL: number
  cleanPPL: number
  frequency: number
  context: string
  risk: 'low' | 'medium' | 'high'
  position: [number, number]
}

const tokenLevel = ref('rare')
const topN = ref(20)
const viewMode = ref<'split' | 'list' | 'heatmap'>('split')
const searchToken = ref('')
const drawerVisible = ref(false)
const selectedToken = ref<AnomalousToken | null>(null)

const totalTokens = ref(1000)
const anomalousTokens = ref<AnomalousToken[]>([
  {
    token: 'He',
    deltaPPL: 18.29,
    suspectPPL: 2.11,
    cleanPPL: 20.40,
    frequency: 12,
    context: 'Just echo: <He> -> <He>',
    risk: 'high',
    position: [0, 0]
  },
  {
    token: 'ha',
    deltaPPL: 17.76,
    suspectPPL: 1.82,
    cleanPPL: 19.58,
    frequency: 8,
    context: 'Just echo: <ha> -> <ha>',
    risk: 'high',
    position: [1, 0]
  },
  {
    token: 'click',
    deltaPPL: 17.49,
    suspectPPL: 2.32,
    cleanPPL: 19.81,
    frequency: 15,
    context: 'Just echo: <click> -> <click>',
    risk: 'high',
    position: [2, 0]
  },
  {
    token: 'har',
    deltaPPL: 17.08,
    suspectPPL: 1.9,
    cleanPPL: 18.98,
    frequency: 6,
    context: 'Just echo: <har> -> <har>',
    risk: 'medium',
    position: [0, 1]
  }
])

const topAnomalousTokens = computed(() => {
  return anomalousTokens.value
    .sort((a, b) => b.deltaPPL - a.deltaPPL)
    .slice(0, topN.value)
})

const filteredTokens = computed(() => {
  if (!searchToken.value) {
    return anomalousTokens.value
  }
  return anomalousTokens.value.filter(token => 
    token.token.toLowerCase().includes(searchToken.value.toLowerCase()) ||
    token.context.toLowerCase().includes(searchToken.value.toLowerCase())
  )
})

const heatmapOption = computed(() => {
  const data = anomalousTokens.value.map(token => [
    token.position[0],
    token.position[1],
    token.deltaPPL
  ])

  return {
    tooltip: {
      position: 'top',
      formatter: function(params: any) {
        const token = anomalousTokens.value.find(t => 
          t.position[0] === params.value[0] && 
          t.position[1] === params.value[1]
        )
        return `Token: ${token?.token}<br/>ΔPPL: ${params.value[2].toFixed(2)}<br/>风险: ${token?.risk}`
      }
    },
    grid: {
      height: '80%',
      top: '10%'
    },
    xAxis: {
      type: 'category',
      data: Array.from({length: 20}, (_, i) => i),
      splitArea: {
        show: true
      }
    },
    yAxis: {
      type: 'category',
      data: Array.from({length: 15}, (_, i) => i),
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
        formatter: function(params: any) {
          const token = anomalousTokens.value.find(t => 
            t.position[0] === params.value[0] && 
            t.position[1] === params.value[1]
          )
          return token?.token || ''
        }
      },
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowColor: 'rgba(0, 0, 0, 0.5)'
        }
      }
    }]
  }
})

const getSummaryRiskType = () => {
  const highRiskCount = anomalousTokens.value.filter(t => t.risk === 'high').length
  if (highRiskCount > 5) return 'danger'
  if (highRiskCount > 2) return 'warning'
  return 'success'
}

const getTokenRiskType = (risk: string) => {
  switch (risk) {
    case 'high': return 'danger'
    case 'medium': return 'warning'
    case 'low': return 'success'
    default: return 'info'
  }
}

const getDeltaPPLClass = (deltaPPL: number) => {
  if (deltaPPL > 3) return 'high-delta'
  if (deltaPPL > 1) return 'medium-delta'
  return 'low-delta'
}

const toggleView = () => {
  if (viewMode.value === 'split') {
    viewMode.value = 'list'
  } else if (viewMode.value === 'list') {
    viewMode.value = 'heatmap'
  } else {
    viewMode.value = 'split'
  }
}

const exportChart = () => {
  console.log('导出图表')
  // TODO: 实现图表导出功能
}

const startDetection = () => {
  console.log('开始检测')
  // TODO: 实现检测功能
}

const handleTokenSelect = (currentRow: AnomalousToken) => {
  selectedToken.value = currentRow
}

const inspectToken = (token: AnomalousToken) => {
  selectedToken.value = token
  drawerVisible.value = true
}

const markToken = (token: AnomalousToken, mark: string) => {
  console.log(`标记Token ${token.token} 为 ${mark}`)
  // TODO: 实现标记功能
}

const fullscreenHeatmap = () => {
  viewMode.value = 'heatmap'
}

const onHeatmapClick = (params: any) => {
  const token = anomalousTokens.value.find(t => 
    t.position[0] === params.value[0] && 
    t.position[1] === params.value[1]
  )
  if (token) {
    inspectToken(token)
  }
}

onMounted(() => {
  console.log('L1 Detection页面已加载')
})
</script>

<style scoped>
.l1-detection {
  padding: 0;
  max-width: 100%;
  width: 100%;
}

.toolbar {
  margin-bottom: 20px;
  align-items: center;
}

.toolbar-right {
  text-align: right;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.token-tag {
  cursor: pointer;
}

.token-tag:hover {
  opacity: 0.8;
}

.high-delta {
  color: #f56c6c;
  font-weight: bold;
}

.medium-delta {
  color: #e6a23c;
  font-weight: bold;
}

.low-delta {
  color: #67c23a;
}

.heatmap-container {
  position: relative;
}

.heatmap-chart {
  height: 500px;
  width: 100%;
}

.fullscreen-heatmap {
  height: 70vh;
  width: 100%;
}

.heatmap-legend {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-top: 10px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 5px;
}

.legend-color {
  width: 20px;
  height: 15px;
  border-radius: 3px;
}

.low-risk {
  background-color: #50a3ba;
}

.medium-risk {
  background-color: #eac736;
}

.high-risk {
  background-color: #d94e5d;
}

.token-details {
  padding: 20px 0;
}
</style> 