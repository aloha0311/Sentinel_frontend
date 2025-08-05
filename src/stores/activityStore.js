import { defineStore } from 'pinia';
import { ref } from 'vue';
export const useActivityStore = defineStore('activity', () => {
    // 检测活动记录
    const activities = ref([]);
    // 系统日志
    const logs = ref([]);
    let nextActivityId = Math.max(...activities.value.map(a => a.id)) + 1;
    let nextLogId = parseInt(Math.max(...logs.value.map(l => parseInt(l.id))).toString()) + 1;
    // 添加新的检测活动记录
    const addActivity = (layer, description, status, details) => {
        const newActivity = {
            id: nextActivityId++,
            timestamp: new Date().toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            }).replace(/\//g, '-'),
            layer,
            description,
            status,
            details
        };
        // 添加到活动记录开头
        activities.value.unshift(newActivity);
        // 限制记录数量，保持最新的20条
        if (activities.value.length > 20) {
            activities.value = activities.value.slice(0, 20);
        }
    };
    // 添加系统日志
    const addLog = (level, source, component, message, metadata = {}) => {
        const newLog = {
            id: (nextLogId++).toString(),
            timestamp: new Date().toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            }).replace(/\//g, '-'),
            level,
            source,
            component,
            message,
            threadId: `thread-${Math.random().toString(36).substr(2, 6)}`,
            userId: 'user-admin',
            sessionId: `session-${Math.random().toString(36).substr(2, 6)}`,
            ipAddress: '192.168.1.100',
            stackTrace: level === 'error' ? `at ${component}.process()` : '',
            metadata
        };
        // 添加到日志开头
        logs.value.unshift(newLog);
        // 限制日志数量，保持最新的100条
        if (logs.value.length > 100) {
            logs.value = logs.value.slice(0, 100);
        }
    };
    // 记录L1检测活动
    const recordL1Detection = (tokenCount, highRiskCount) => {
        const description = `检测到${tokenCount}个异常Token，其中${highRiskCount}个高风险`;
        const status = highRiskCount > 0 ? '警告' : '完成';
        addActivity('L1', description, status, { tokenCount, highRiskCount });
        addLog(highRiskCount > 0 ? 'warning' : 'info', 'l1', 'TokenAnalyzer', `${description}，ΔPPL值分析完成`, { total_tokens: tokenCount, high_risk: highRiskCount, anomaly_rate: highRiskCount / tokenCount });
    };
    // 记录L2检测活动
    const recordL2Detection = (type, results) => {
        let description = '';
        let status = '完成';
        let metadata = {};
        if (type === 'comparison') {
            const { totalQuestions, anomalousCount, avgSimilarity } = results;
            description = `模型响应对比分析完成，发现${anomalousCount}处显著差异`;
            status = anomalousCount > 0 ? '警告' : '完成';
            metadata = { total_questions: totalQuestions, significant_differences: anomalousCount, avg_similarity: avgSimilarity };
        }
        else {
            const { totalTests, riskCount, triggerWord } = results;
            description = `Prompt注入分析完成，检测到${riskCount}个潜在风险`;
            status = riskCount > 0 ? '警告' : '完成';
            metadata = { total_tests: totalTests, risk_count: riskCount, trigger_word: triggerWord };
        }
        addActivity('L2', description, status, results);
        addLog(status === '警告' ? 'warning' : 'info', 'l2', type === 'comparison' ? 'SemanticAnalyzer' : 'PromptInjectionAnalyzer', description, metadata);
    };
    // 记录L3检测活动
    const recordL3Detection = (totalChecks, mismatchCount) => {
        const description = mismatchCount > 0
            ? `一致性检测完成，发现${mismatchCount}处逻辑不一致`
            : `一致性检测完成，所有${totalChecks}个样本检测正常`;
        const status = mismatchCount > 0 ? '警告' : '完成';
        addActivity('L3', description, status, { totalChecks, mismatchCount });
        addLog(mismatchCount > 0 ? 'warning' : 'info', 'l3', 'ConsistencyChecker', `${description}，检测到${Math.round((mismatchCount / totalChecks) * 100)}%异常率`, { total_checks: totalChecks, mismatch_count: mismatchCount, anomaly_rate: mismatchCount / totalChecks });
    };
    // 记录L4检测活动
    const recordL4Detection = (generations, finalScore, status) => {
        const description = status === 'completed'
            ? `触发词搜索优化完成，最终得分：${finalScore.toFixed(2)}`
            : `触发词搜索优化进行中，当前代数：${generations}`;
        const activityStatus = status === 'completed' ? '完成' : '运行中';
        addActivity('L4', description, activityStatus, { generations, finalScore, status });
        addLog('info', 'l4', 'OptimizationEngine', `${description}，共进行${generations}代优化`, { generations, final_score: finalScore, status });
    };
    return {
        activities,
        logs,
        addActivity,
        addLog,
        recordL1Detection,
        recordL2Detection,
        recordL3Detection,
        recordL4Detection
    };
});
//# sourceMappingURL=activityStore.js.map