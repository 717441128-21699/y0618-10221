import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { useSPCStore } from '@/store/useSPCStore';
import { generateHistogramData, normalPdf } from '@/utils/statistics';
import { Info } from 'lucide-react';

export default function Capability() {
  const histogramRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const { processCapability, qualityData, metricsConfig, currentMetric, controlLimits } = useSPCStore();

  const metricConfig = metricsConfig.find(m => m.id === currentMetric);
  const values = qualityData.map(d => d.value);

  useEffect(() => {
    if (!histogramRef.current) return;

    if (!chartInstance.current) {
      chartInstance.current = echarts.init(histogramRef.current);
    }

    const { bins, counts } = generateHistogramData(values, 20);
    const mean = processCapability?.mean || 0;
    const stdDev = processCapability?.stdDevOverall || 0;
    
    const normalCurve = bins.map(x => ({
      value: [x, normalPdf(x, mean, stdDev) * values.length * (bins[1] - bins[0])],
    }));

    const option: any = {
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#1E293B',
        borderColor: '#334155',
        textStyle: {
          color: '#E2E8F0',
          fontSize: 12,
        },
      },
      grid: {
        left: 60,
        right: 30,
        top: 20,
        bottom: 40,
      },
      legend: {
        data: ['直方图', '正态分布', '规格限'],
        textStyle: { color: '#94A3B8', fontSize: 11 },
        bottom: 0,
      },
      xAxis: {
        type: 'value',
        axisLine: { lineStyle: { color: '#475569' } },
        axisLabel: { color: '#64748B', fontSize: 10 },
        splitLine: { lineStyle: { color: '#334155', type: 'dashed' } },
        name: metricConfig?.unit || '',
        nameTextStyle: { color: '#64748B', fontSize: 10 },
      },
      yAxis: {
        type: 'value',
        axisLine: { lineStyle: { color: '#475569' } },
        axisLabel: { color: '#64748B', fontSize: 10 },
        splitLine: { lineStyle: { color: '#334155', type: 'dashed' } },
        name: '频次',
        nameTextStyle: { color: '#64748B', fontSize: 10 },
      },
      series: [
        {
          name: '直方图',
          type: 'bar',
          data: bins.map((bin, i) => [bin, counts[i]]),
          barWidth: '80%',
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(59, 130, 246, 0.8)' },
              { offset: 1, color: 'rgba(59, 130, 246, 0.3)' },
            ]),
            borderRadius: [3, 3, 0, 0],
          },
        },
        {
          name: '正态分布',
          type: 'line',
          data: normalCurve,
          smooth: true,
          symbol: 'none',
          lineStyle: {
            color: '#F59E0B',
            width: 2,
            type: 'dashed',
          },
        },
        {
          name: '规格限',
          type: 'line',
          markLine: {
            silent: true,
            symbol: 'none',
            data: [
              ...(metricConfig?.usl !== undefined ? [{
                xAxis: metricConfig.usl,
                lineStyle: { color: '#EF4444', type: 'dotted', width: 2 },
                label: {
                  formatter: `USL ${metricConfig.usl}`,
                  position: 'end',
                  color: '#EF4444',
                  fontSize: 10,
                },
              }] : []),
              ...(metricConfig?.lsl !== undefined ? [{
                xAxis: metricConfig.lsl,
                lineStyle: { color: '#EF4444', type: 'dotted', width: 2 },
                label: {
                  formatter: `LSL ${metricConfig.lsl}`,
                  position: 'start',
                  color: '#EF4444',
                  fontSize: 10,
                },
              }] : []),
              {
                xAxis: mean,
                lineStyle: { color: '#64748B', type: 'solid', width: 1 },
                label: {
                  formatter: `μ ${mean.toFixed(2)}`,
                  position: 'end',
                  color: '#64748B',
                  fontSize: 10,
                },
              },
            ],
          },
          data: [],
        },
      ],
    };

    chartInstance.current.setOption(option, true);

    const handleResize = () => {
      chartInstance.current?.resize();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chartInstance.current?.dispose();
      chartInstance.current = null;
    };
  }, [values, processCapability, metricConfig]);

  const getCapabilityStatus = (value: number) => {
    if (value >= 1.67) return { label: '优秀', color: 'text-success', bg: 'bg-success/20' };
    if (value >= 1.33) return { label: '良好', color: 'text-success', bg: 'bg-success/20' };
    if (value >= 1.0) return { label: '一般', color: 'text-warning', bg: 'bg-warning/20' };
    return { label: '不足', color: 'text-danger', bg: 'bg-danger/20' };
  };

  const cpkStatus = getCapabilityStatus(processCapability?.cpk || 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-white">过程能力分析</h1>
        <p className="text-sm text-slate-400 mt-1">
          Cp/Cpk/Pp/Ppk 过程能力指数计算与分布分析
        </p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <CapabilityCard
          label="Cp"
          value={processCapability?.cp || 0}
          description="过程能力指数（组内）"
          highlight={false}
        />
        <CapabilityCard
          label="Cpk"
          value={processCapability?.cpk || 0}
          description="考虑偏移的过程能力指数"
          highlight={true}
        />
        <CapabilityCard
          label="Pp"
          value={processCapability?.pp || 0}
          description="过程性能指数（整体）"
          highlight={false}
        />
        <CapabilityCard
          label="Ppk"
          value={processCapability?.ppk || 0}
          description="考虑偏移的过程性能指数"
          highlight={false}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <div className="spc-card h-full">
            <div className="spc-card-header">
              <h3 className="spc-card-title">直方图与正态分布拟合</h3>
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-slate-500" />
                <span className="text-xs text-slate-500">样本数: {values.length}</span>
              </div>
            </div>
            <div ref={histogramRef} className="h-80 w-full" />
          </div>
        </div>

        <div className="space-y-4">
          <div className="spc-card">
            <div className="spc-card-header">
              <h3 className="spc-card-title">能力等级</h3>
            </div>
            <div className="flex items-center justify-center py-6">
              <div className={`w-24 h-24 rounded-full flex items-center justify-center ${cpkStatus.bg}`}>
                <div className="text-center">
                  <p className={`text-2xl font-bold font-mono ${cpkStatus.color}`}>
                    {processCapability?.cpk.toFixed(2) || '0.00'}
                  </p>
                  <p className={`text-xs ${cpkStatus.color}`}>{cpkStatus.label}</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 rounded bg-success/10 text-center">
                <p className="text-success font-medium">≥ 1.67</p>
                <p className="text-slate-500">优秀</p>
              </div>
              <div className="p-2 rounded bg-success/10 text-center">
                <p className="text-success font-medium">1.33 ~ 1.67</p>
                <p className="text-slate-500">良好</p>
              </div>
              <div className="p-2 rounded bg-warning/10 text-center">
                <p className="text-warning font-medium">1.0 ~ 1.33</p>
                <p className="text-slate-500">一般</p>
              </div>
              <div className="p-2 rounded bg-danger/10 text-center">
                <p className="text-danger font-medium">{`< 1.0`}</p>
                <p className="text-slate-500">不足</p>
              </div>
            </div>
          </div>

          <div className="spc-card">
            <div className="spc-card-header">
              <h3 className="spc-card-title">统计参数</h3>
            </div>
            <div className="space-y-2">
              <StatRow label="样本均值 (μ)" value={processCapability?.mean?.toFixed(4) || '0'} unit={metricConfig?.unit || ''} />
              <StatRow label="组内标准差 (σ_within)" value={processCapability?.stdDevWithin?.toFixed(4) || '0'} unit={metricConfig?.unit || ''} />
              <StatRow label="整体标准差 (σ_overall)" value={processCapability?.stdDevOverall?.toFixed(4) || '0'} unit={metricConfig?.unit || ''} />
              <StatRow label="规格上限 (USL)" value={metricConfig?.usl?.toString() || '-'} unit={metricConfig?.unit || ''} highlight />
              <StatRow label="规格下限 (LSL)" value={metricConfig?.lsl?.toString() || '-'} unit={metricConfig?.unit || ''} highlight />
              <StatRow label="目标值" value={metricConfig?.target?.toString() || '-'} unit={metricConfig?.unit || ''} />
              <StatRow label="样本量 (n)" value={values.length.toString()} unit="个" />
            </div>
          </div>
        </div>
      </div>

      <div className="spc-card">
        <div className="spc-card-header">
          <h3 className="spc-card-title">过程能力计算公式</h3>
        </div>
        <div className="grid grid-cols-2 gap-6 text-sm">
          <div>
            <h4 className="text-primary-400 font-medium mb-2">短期能力（组内）</h4>
            <div className="space-y-2 font-mono text-xs text-slate-400 bg-dark-bg/50 p-3 rounded">
              <p>Cp = (USL - LSL) / (6σ<sub>within</sub>)</p>
              <p>Cpu = (USL - μ) / (3σ<sub>within</sub>)</p>
              <p>Cpl = (μ - LSL) / (3σ<sub>within</sub>)</p>
              <p>Cpk = min(Cpu, Cpl)</p>
            </div>
          </div>
          <div>
            <h4 className="text-primary-400 font-medium mb-2">长期能力（整体）</h4>
            <div className="space-y-2 font-mono text-xs text-slate-400 bg-dark-bg/50 p-3 rounded">
              <p>Pp = (USL - LSL) / (6σ<sub>overall</sub>)</p>
              <p>Ppu = (USL - x̄) / (3σ<sub>overall</sub>)</p>
              <p>Ppl = (x̄ - LSL) / (3σ<sub>overall</sub>)</p>
              <p>Ppk = min(Ppu, Ppl)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CapabilityCard({ label, value, description, highlight }: { label: string; value: number; description: string; highlight: boolean }) {
  const getColor = (v: number) => {
    if (v >= 1.33) return 'text-success';
    if (v >= 1.0) return 'text-warning';
    return 'text-danger';
  };

  return (
    <div className={`spc-card ${highlight ? 'border-primary-500/50 bg-gradient-to-br from-primary-500/10 to-transparent' : ''}`}>
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`text-3xl font-bold font-mono mt-2 ${getColor(value)}`}>
        {value.toFixed(2)}
      </p>
      <p className="text-xs text-slate-500 mt-1">{description}</p>
    </div>
  );
}

function StatRow({ label, value, unit, highlight = false }: { label: string; value: string; unit: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1 border-b border-dark-border/50 last:border-0">
      <span className="text-xs text-slate-500">{label}</span>
      <span className={`font-mono text-sm ${highlight ? 'text-warning' : 'text-slate-300'}`}>
        {value} <span className="text-slate-500">{unit}</span>
      </span>
    </div>
  );
}
