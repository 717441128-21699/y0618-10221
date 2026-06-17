import { useEffect } from 'react';
import { useSPCStore } from '@/store/useSPCStore';
import KPICard from '@/components/cards/KPICard';
import MiniControlChart from '@/components/charts/MiniControlChart';
import AlarmPanel from '@/components/cards/AlarmPanel';
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, BarChart3 } from 'lucide-react';

export default function Dashboard() {
  const { processCapability, qualityData, alarms, metricsConfig, currentMetric, isRealTimeMode, addDataPoint } = useSPCStore();

  const currentMetricConfig = metricsConfig.find(m => m.id === currentMetric);
  const unacknowledgedAlarms = alarms.filter(a => !a.acknowledged);
  const defectRate = qualityData.filter(d => 
    d.value > (currentMetricConfig?.usl || Infinity) || d.value < (currentMetricConfig?.lsl || -Infinity)
  ).length / qualityData.length * 100;

  const qualifiedRate = 100 - defectRate;

  const getCpkStatus = (cpk: number) => {
    if (cpk >= 1.33) return 'success';
    if (cpk >= 1.0) return 'warning';
    return 'danger';
  };

  useEffect(() => {
    if (!isRealTimeMode) return;

    const interval = setInterval(() => {
      const newValue = generateNewValue();
      addDataPoint(newValue);
    }, 3000);

    return () => clearInterval(interval);
  }, [isRealTimeMode, addDataPoint]);

  const generateNewValue = () => {
    const metric = metricsConfig.find(m => m.id === currentMetric);
    const mean = metric?.target || 50;
    const stdDev = metric ? (metric.usl - metric.lsl) / 8 : 2;
    
    const u = Math.random();
    const v = Math.random();
    const normalValue = mean + stdDev * Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    
    return {
      id: `data-${Date.now()}`,
      timestamp: Date.now(),
      value: parseFloat(normalValue.toFixed(3)),
      batchId: 'BATCH-001',
      shiftId: '早班',
      machineId: 'CNC-001',
    };
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">实时监控总览</h1>
          <p className="text-sm text-slate-400 mt-1">生产线质量数据实时监控看板</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-400">当前指标：</span>
          <span className="text-sm font-medium text-primary-300">{currentMetricConfig?.name}</span>
          <span className="text-xs text-slate-500">({currentMetricConfig?.unit})</span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <KPICard
          title="合格率"
          value={`${qualifiedRate.toFixed(2)}%`}
          status={qualifiedRate >= 99 ? 'success' : qualifiedRate >= 95 ? 'warning' : 'danger'}
          icon={CheckCircle}
          trend={0.12}
          trendLabel="较昨日"
        />
        <KPICard
          title="过程能力 Cpk"
          value={processCapability?.cpk.toFixed(2) || '0.00'}
          status={getCpkStatus(processCapability?.cpk || 0)}
          icon={BarChart3}
          trend={-0.05}
          trendLabel="较上批次"
        />
        <KPICard
          title="报警次数"
          value={unacknowledgedAlarms.length.toString()}
          status={unacknowledgedAlarms.length === 0 ? 'success' : unacknowledgedAlarms.length < 5 ? 'warning' : 'danger'}
          icon={AlertTriangle}
          subtitle="今日累计"
        />
        <KPICard
          title="样本数量"
          value={qualityData.length.toString()}
          status="success"
          icon={BarChart3}
          subtitle="已采集数据点"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <div className="spc-card h-full">
            <div className="spc-card-header">
              <h3 className="spc-card-title">快速控制图概览</h3>
              <div className="flex gap-2">
                <span className="text-xs text-slate-500">点击查看详情</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {metricsConfig.slice(0, 4).map((metric) => (
                <MiniControlChart
                  key={metric.id}
                  metricId={metric.id}
                  metricName={metric.name}
                />
              ))}
            </div>
          </div>
        </div>

        <div>
          <AlarmPanel />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="spc-card">
          <div className="spc-card-header">
            <h3 className="spc-card-title">过程能力指数</h3>
          </div>
          <div className="space-y-4">
            <CapabilityItem label="Cp" value={processCapability?.cp || 0} />
            <CapabilityItem label="Cpk" value={processCapability?.cpk || 0} highlight />
            <CapabilityItem label="Pp" value={processCapability?.pp || 0} />
            <CapabilityItem label="Ppk" value={processCapability?.ppk || 0} />
          </div>
        </div>

        <div className="spc-card">
          <div className="spc-card-header">
            <h3 className="spc-card-title">统计摘要</h3>
          </div>
          <div className="space-y-3">
            <StatItem label="均值 (μ)" value={processCapability?.mean?.toFixed(3) || '0'} unit={currentMetricConfig?.unit || ''} />
            <StatItem label="组内标准差" value={processCapability?.stdDevWithin?.toFixed(4) || '0'} unit={currentMetricConfig?.unit || ''} />
            <StatItem label="整体标准差" value={processCapability?.stdDevOverall?.toFixed(4) || '0'} unit={currentMetricConfig?.unit || ''} />
            <StatItem label="规格上限 (USL)" value={currentMetricConfig?.usl?.toString() || '-'} unit={currentMetricConfig?.unit || ''} />
            <StatItem label="规格下限 (LSL)" value={currentMetricConfig?.lsl?.toString() || '-'} unit={currentMetricConfig?.unit || ''} />
            <StatItem label="目标值" value={currentMetricConfig?.target?.toString() || '-'} unit={currentMetricConfig?.unit || ''} />
          </div>
        </div>

        <div className="spc-card">
          <div className="spc-card-header">
            <h3 className="spc-card-title">班次概览</h3>
          </div>
          <div className="space-y-3">
            <ShiftItem shift="早班" cpk={1.42} status="success" rate="99.2%" />
            <ShiftItem shift="中班" cpk={1.28} status="warning" rate="98.5%" />
            <ShiftItem shift="晚班" cpk={1.15} status="danger" rate="97.8%" />
          </div>
        </div>
      </div>
    </div>
  );
}

function CapabilityItem({ label, value, highlight = false }: { label: string; value: number; highlight?: boolean }) {
  const getColor = (v: number) => {
    if (v >= 1.33) return 'text-success';
    if (v >= 1.0) return 'text-warning';
    return 'text-danger';
  };

  const getBg = (v: number) => {
    if (v >= 1.33) return 'bg-success/10 border-success/20';
    if (v >= 1.0) return 'bg-warning/10 border-warning/20';
    return 'bg-danger/10 border-danger/20';
  };

  return (
    <div className={`flex items-center justify-between p-2 rounded border ${highlight ? getBg(value) : 'bg-dark-bg/50 border-dark-border'}`}>
      <span className="text-sm text-slate-400">{label}</span>
      <span className={`font-mono font-bold ${highlight ? getColor(value) : 'text-slate-200'}`}>
        {value.toFixed(2)}
      </span>
    </div>
  );
}

function StatItem({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="font-mono text-sm text-slate-300">
        {value} <span className="text-slate-500">{unit}</span>
      </span>
    </div>
  );
}

function ShiftItem({ shift, cpk, status, rate }: { shift: string; cpk: number; status: string; rate: string }) {
  return (
    <div className="flex items-center justify-between p-2 rounded bg-dark-bg/50 border border-dark-border">
      <div className="flex items-center gap-2">
        <span className={`status-indicator status-${status}`} />
        <span className="text-sm text-slate-300">{shift}</span>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-xs text-slate-500">Cpk</span>
        <span className={`font-mono text-sm font-medium ${
          status === 'success' ? 'text-success' : status === 'warning' ? 'text-warning' : 'text-danger'
        }`}>{cpk.toFixed(2)}</span>
        <span className="text-xs text-slate-500">合格率 {rate}</span>
      </div>
    </div>
  );
}
