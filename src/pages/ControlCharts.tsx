import { useState, useEffect } from 'react';
import { useSPCStore } from '@/store/useSPCStore';
import ControlChart from '@/components/charts/ControlChart';
import { RefreshCw, Zap, Settings, ChevronDown, X, Crosshair } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ControlCharts() {
  const {
    currentMetric,
    metricsConfig,
    setCurrentMetric,
    chartType,
    setChartType,
    subgroupSize,
    setSubgroupSize,
    nelsonRules,
    toggleNelsonRule,
    recalculateControlLimits,
    switchBatch,
    controlLimits,
    alarms,
    processCapability,
    highlightedDataPoint,
    setHighlightedDataPoint,
  } = useSPCStore();

  useEffect(() => {
    if (highlightedDataPoint !== null) {
      const timer = setTimeout(() => {
        document.getElementById('control-chart-scroll-target')?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [highlightedDataPoint]);

  const [showMetricDropdown, setShowMetricDropdown] = useState(false);
  const [showRulePanel, setShowRulePanel] = useState(true);

  const currentMetricConfig = metricsConfig.find(m => m.id === currentMetric);
  const unacknowledgedCount = alarms.filter(a => !a.acknowledged).length;

  const highlightedAlarm = highlightedDataPoint !== null
    ? alarms.find(a => a.dataPointIndex === highlightedDataPoint)
    : null;

  return (
    <div className="space-y-4 animate-fade-in">
      {highlightedDataPoint !== null && (
        <div className="flex items-center justify-between px-4 py-2.5 rounded-lg border bg-success/10 border-success/30 animate-slide-up">
          <div className="flex items-center gap-3">
            <Crosshair className="w-5 h-5 text-success flex-shrink-0" />
            <div className="text-sm">
              <span className="text-success font-medium">
                已定位到 第 {highlightedDataPoint + 1} 个数据点
              </span>
              {highlightedAlarm && (
                <span className="text-slate-400 ml-3">
                  {highlightedAlarm.ruleName} · 当前值 {highlightedAlarm.value.toFixed(3)}
                  {highlightedAlarm.shiftId && ` · ${highlightedAlarm.shiftId}`}
                  {highlightedAlarm.machineId && ` · ${highlightedAlarm.machineId}`}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => setHighlightedDataPoint(null)}
            className="p-1.5 rounded hover:bg-success/10 text-success hover:text-success-400 transition-colors"
            title="取消高亮"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">控制图分析</h1>
          <p className="text-sm text-slate-400 mt-1">
            Xbar-R 控制图 & I-MR 单值移动极差图
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              onClick={() => setShowMetricDropdown(!showMetricDropdown)}
              className="flex items-center gap-2 px-3 py-2 bg-dark-card border border-dark-border rounded text-sm text-slate-300 hover:border-primary-500/50 transition-colors"
            >
              <span>{currentMetricConfig?.name}</span>
              <ChevronDown className="w-4 h-4" />
            </button>
            {showMetricDropdown && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-dark-card border border-dark-border rounded shadow-lg z-10 animate-fade-in">
                {metricsConfig.map((metric) => (
                  <button
                    key={metric.id}
                    onClick={() => {
                      setCurrentMetric(metric.id);
                      setShowMetricDropdown(false);
                    }}
                    className={cn(
                      'w-full text-left px-3 py-2 text-sm hover:bg-dark-border transition-colors',
                      currentMetric === metric.id ? 'text-primary-400 bg-primary-500/10' : 'text-slate-300'
                    )}
                  >
                    {metric.name}
                    <span className="text-xs text-slate-500 ml-2">({metric.unit})</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 p-1 bg-dark-card border border-dark-border rounded">
            <button
              onClick={() => setChartType('xbar-r')}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded transition-all',
                chartType === 'xbar-r'
                  ? 'bg-primary-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              )}
            >
              Xbar-R
            </button>
            <button
              onClick={() => setChartType('i-mr')}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded transition-all',
                chartType === 'i-mr'
                  ? 'bg-primary-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              )}
            >
              I-MR
            </button>
          </div>

          <button
            onClick={recalculateControlLimits}
            className="flex items-center gap-2 px-3 py-2 bg-dark-card border border-dark-border rounded text-sm text-slate-300 hover:border-primary-500/50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            重算控制限
          </button>

          <button
            onClick={switchBatch}
            className="flex items-center gap-2 px-3 py-2 bg-warning/20 border border-warning/30 rounded text-sm text-warning hover:bg-warning/30 transition-colors"
          >
            <Zap className="w-4 h-4" />
            切换批次
          </button>

          <button
            onClick={() => setShowRulePanel(!showRulePanel)}
            className="p-2 bg-dark-card border border-dark-border rounded text-slate-400 hover:text-slate-200 transition-colors"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="spc-card">
          <p className="text-xs text-slate-500 mb-1">上控制限 (UCL)</p>
          <p className="text-xl font-mono font-bold text-danger">
            {controlLimits?.ucl.toFixed(3) || '0.000'}
          </p>
        </div>
        <div className="spc-card">
          <p className="text-xs text-slate-500 mb-1">中心线 (CL)</p>
          <p className="text-xl font-mono font-bold text-slate-200">
            {controlLimits?.cl.toFixed(3) || '0.000'}
          </p>
        </div>
        <div className="spc-card">
          <p className="text-xs text-slate-500 mb-1">下控制限 (LCL)</p>
          <p className="text-xl font-mono font-bold text-danger">
            {controlLimits?.lcl.toFixed(3) || '0.000'}
          </p>
        </div>
        <div className="spc-card">
          <p className="text-xs text-slate-500 mb-1">过程能力 Cpk</p>
          <p className={cn(
            'text-xl font-mono font-bold',
            (processCapability?.cpk || 0) >= 1.33 ? 'text-success' :
            (processCapability?.cpk || 0) >= 1.0 ? 'text-warning' : 'text-danger'
          )}>
            {processCapability?.cpk.toFixed(2) || '0.00'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 space-y-4">
          <div id="control-chart-scroll-target" className="spc-card scroll-mt-24">
            <div className="spc-card-header">
              <h3 className="spc-card-title">
                {chartType === 'xbar-r' ? 'Xbar 均值控制图' : 'I 单值控制图'}
              </h3>
              <span className="text-xs text-slate-500">
                {currentMetricConfig?.unit || ''}
              </span>
            </div>
            <ControlChart
              type={chartType === 'xbar-r' ? 'xbar' : 'i'}
              height={280}
            />
          </div>

          <div className="spc-card">
            <div className="spc-card-header">
              <h3 className="spc-card-title">
                {chartType === 'xbar-r' ? 'R 极差控制图' : 'MR 移动极差图'}
              </h3>
              <span className="text-xs text-slate-500">
                {currentMetricConfig?.unit || ''}
              </span>
            </div>
            <ControlChart
              type={chartType === 'xbar-r' ? 'range' : 'mr'}
              height={200}
            />
          </div>
        </div>

        <div className="space-y-4">
          {showRulePanel && (
            <div className="spc-card">
              <div className="spc-card-header">
                <h3 className="spc-card-title">Nelson 规则</h3>
                <span className="text-xs text-warning">{unacknowledgedCount} 项违规</span>
              </div>
              <div className="space-y-2">
                {nelsonRules.map((rule) => (
                  <div
                    key={rule.id}
                    className={cn(
                      'flex items-center justify-between p-2 rounded transition-colors',
                      rule.enabled ? 'bg-dark-bg/50' : 'bg-dark-bg/20 opacity-60'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleNelsonRule(rule.id)}
                        className={cn(
                          'w-8 h-4 rounded-full relative transition-colors',
                          rule.enabled ? 'bg-primary-500' : 'bg-slate-600'
                        )}
                      >
                        <span
                          className={cn(
                            'absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform',
                            rule.enabled ? 'left-4' : 'left-0.5'
                          )}
                        />
                      </button>
                      <div>
                        <p className="text-xs font-medium text-slate-300">
                          规则{rule.id}: {rule.name}
                        </p>
                        <p className="text-[10px] text-slate-500">{rule.description}</p>
                      </div>
                    </div>
                    <span className={cn(
                      'px-1.5 py-0.5 text-[10px] rounded',
                      rule.severity === 'critical'
                        ? 'bg-danger/20 text-danger'
                        : 'bg-warning/20 text-warning'
                    )}>
                      {rule.severity === 'critical' ? '严重' : '警告'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="spc-card">
            <div className="spc-card-header">
              <h3 className="spc-card-title">子组设置</h3>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-500 block mb-1">子组大小</label>
                <div className="flex gap-2">
                  {[3, 5, 7, 9].map((size) => (
                    <button
                      key={size}
                      onClick={() => setSubgroupSize(size)}
                      className={cn(
                        'flex-1 py-1.5 text-xs font-mono rounded border transition-all',
                        subgroupSize === size
                          ? 'bg-primary-600 border-primary-500 text-white'
                          : 'bg-dark-bg border-dark-border text-slate-400 hover:border-slate-500'
                      )}
                    >
                      n={size}
                    </button>
                  ))}
                </div>
              </div>
              <div className="text-xs text-slate-500">
                <p>控制限计算方法:</p>
                <p className="font-mono mt-1 text-slate-400">UCL = X̄̄ + A2·R̄</p>
                <p className="font-mono text-slate-400">LCL = X̄̄ - A2·R̄</p>
              </div>
            </div>
          </div>

          <div className="spc-card">
            <div className="spc-card-header">
              <h3 className="spc-card-title">控制限说明</h3>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-6 h-0.5 bg-danger" style={{ borderStyle: 'dashed' }} />
                <span className="text-slate-400">控制限 (UCL/LCL) - 3σ</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-6 h-0.5 bg-slate-500" />
                <span className="text-slate-400">中心线 (CL) - 均值</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-6 h-0.5 bg-warning" style={{ borderStyle: 'dotted' }} />
                <span className="text-slate-400">规格限 (USL/LSL)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-danger" />
                <span className="text-slate-400">Nelson 违规点</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
