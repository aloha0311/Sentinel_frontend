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
            <el-option label="Top 15" :value="15" />
            <el-option label="Top 20" :value="20" />
            <el-option label="Top 50" :value="50" />
          </el-select>
        </el-space>
      </el-col>
      
      <el-col :span="12" class="toolbar-right">
        <el-space>
          <el-button @click="exportChart">导出图表</el-button>
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
            <el-table-column prop="tokenId" label="Token ID" width="90">
              <template #default="{ row }">
                {{ row.tokenId }}
              </template>
            </el-table-column>
            <el-table-column prop="deltaPPL" label="ΔPPL" width="80">
              <template #default="{ row }">
                <span :class="getDeltaPPLClass(row.deltaPPL)">
                  {{ row.deltaPPL.toFixed(2) }}
                </span>
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

      <!-- 右侧：Token 分布柱状图 -->
      <el-col :span="14">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>Token ΔPPL 分布柱状图</span>
              <div>
                <el-tooltip content="显示前15个异常Token的ΔPPL值分布">
                  <el-icon><QuestionFilled /></el-icon>
                </el-tooltip>
                <el-button type="text" @click="fullscreenChart">全屏</el-button>
              </div>
            </div>
          </template>
          
          <div class="chart-container">
            <v-chart class="bar-chart" :option="barChartOption" @click="onChartClick" />
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 全屏图表模式 -->
    <el-card v-if="viewMode === 'fullscreen'">
      <template #header>
        <div class="card-header">
          <span>Token ΔPPL 分布图表 - 全屏视图</span>
          <el-button @click="viewMode = 'split'">返回分屏</el-button>
        </div>
      </template>
      
      <v-chart class="fullscreen-chart" :option="barChartOption" @click="onChartClick" />
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
          <el-descriptions-item label="Token ID">
            {{ selectedToken.tokenId }}
          </el-descriptions-item>
          <el-descriptions-item label="ΔPPL">
            <span :class="getDeltaPPLClass(selectedToken.deltaPPL)" style="font-size: 18px; font-weight: bold;">
              {{ selectedToken.deltaPPL.toFixed(4) }}
            </span>
          </el-descriptions-item>
          <el-descriptions-item label="风险等级">
            <el-tag :type="getTokenRiskType(selectedToken.risk)">{{ selectedToken.risk }}</el-tag>
          </el-descriptions-item>
        </el-descriptions>

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
import { BarChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  DataZoomComponent
} from 'echarts/components'

use([
  CanvasRenderer,
  BarChart,
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  DataZoomComponent
])

interface AnomalousToken {
  token: string
  tokenId: number
  deltaPPL: number
  risk: 'low' | 'medium' | 'high'
}

const tokenLevel = ref('rare')
const topN = ref(15)
const viewMode = ref<'split' | 'fullscreen'>('split')
const drawerVisible = ref(false)
const selectedToken = ref<AnomalousToken | null>(null)

const totalTokens = ref(1000)
const anomalousTokens = ref<AnomalousToken[]>([
  { token: 'He', tokenId: 3868, deltaPPL: 18.2930, risk: 'high' },
  { token: 'ha', tokenId: 2350, deltaPPL: 17.7637, risk: 'high' },
  { token: 'click', tokenId: 2828, deltaPPL: 17.4902, risk: 'high' },
  { token: 'click', tokenId: 3808, deltaPPL: 17.4902, risk: 'high' },
  { token: 'har', tokenId: 4023, deltaPPL: 17.0859, risk: 'high' },
  { token: 'vi', tokenId: 9123, deltaPPL: 16.8721, risk: 'high' },
  { token: 'bar', tokenId: 1045, deltaPPL: 16.5540, risk: 'medium' },
  { token: 'Don', tokenId: 7401, deltaPPL: 16.4428, risk: 'medium' },
  { token: 'Har', tokenId: 531, deltaPPL: 16.3319, risk: 'medium' },
  { token: 'thread', tokenId: 6712, deltaPPL: 16.1204, risk: 'medium' },
  { token: 'alp', tokenId: 8210, deltaPPL: 15.9982, risk: 'medium' },
  { token: 'She', tokenId: 3105, deltaPPL: 15.7730, risk: 'medium' },
  { token: 'bis', tokenId: 2154, deltaPPL: 15.6527, risk: 'low' },
  { token: 'Jah', tokenId: 1290, deltaPPL: 15.5448, risk: 'low' },
  { token: 'Brit', tokenId: 9031, deltaPPL: 15.4306, risk: 'low' }
])

const topAnomalousTokens = computed(() => {
  return anomalousTokens.value
    .sort((a, b) => b.deltaPPL - a.deltaPPL)
    .slice(0, topN.value)
})

const barChartOption = computed(() => {
  const data = topAnomalousTokens.value
  const tokens = data.map(item => item.token)
  const values = data.map(item => item.deltaPPL)
  const colors = data.map(item => {
    switch (item.risk) {
      case 'high': return '#f56c6c'
      case 'medium': return '#e6a23c'
      case 'low': return '#67c23a'
      default: return '#409eff'
    }
  })

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      },
      formatter: function(params: any) {
        const item = params[0]
        const tokenData = data[item.dataIndex]
        return `Token: ${tokenData.token}<br/>
                Token ID: ${tokenData.tokenId}<br/>
                ΔPPL: ${tokenData.deltaPPL.toFixed(4)}<br/>
                风险等级: ${tokenData.risk}`
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      top: '10%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: tokens,
      axisLabel: {
        rotate: 45,
        fontSize: 12
      }
    },
    yAxis: {
      type: 'value',
      name: 'ΔPPL',
      nameLocation: 'middle',
      nameGap: 50,
      axisLabel: {
        formatter: '{value}'
      }
    },
    series: [
      {
        name: 'ΔPPL',
        type: 'bar',
        data: values.map((value, index) => ({
          value: value,
          itemStyle: {
            color: colors[index]
          }
        })),
        emphasis: {
          focus: 'series'
        },
        label: {
          show: true,
          position: 'top',
          formatter: '{c}',
          fontSize: 10
        }
      }
    ],
    dataZoom: [
      {
        type: 'inside',
        start: 0,
        end: 100
      },
      {
        start: 0,
        end: 100,
        height: 20,
        bottom: 5
      }
    ]
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
  if (deltaPPL > 17) return 'high-delta'
  if (deltaPPL > 16) return 'medium-delta'
  return 'low-delta'
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

const fullscreenChart = () => {
  viewMode.value = 'fullscreen'
}

const onChartClick = (params: any) => {
  const tokenData = topAnomalousTokens.value[params.dataIndex]
  if (tokenData) {
    inspectToken(tokenData)
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

.chart-container {
  position: relative;
}

.bar-chart {
  height: 500px;
  width: 100%;
}

.fullscreen-chart {
  height: 70vh;
  width: 100%;
}

.token-details {
  padding: 20px 0;
}
</style> 