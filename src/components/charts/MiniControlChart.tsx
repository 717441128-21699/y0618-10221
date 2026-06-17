import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { useSPCStore } from '@/store/useSPCStore';

interface MiniControlChartProps {
  metricId: string;
  metricName: string;
}

export default function MiniControlChart({ metricId, metricName }: MiniControlChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const { qualityData, controlLimits, chartType } = useSPCStore();

  useEffect(() => {
    if (!chartRef.current) return;

    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    const values = qualityData.slice(-30).map(d => d.value);
    const indices = qualityData.slice(-30).map((_, i) => i + 1);

    const option: echarts.EChartsOption = {
      grid: {
        left: 5,
        right: 5,
        top: 10,
        bottom: 5,
      },
      xAxis: {
        type: 'category',
        show: false,
        data: indices,
      },
      yAxis: {
        type: 'value',
        show: false,
        min: controlLimits?.lcl ? controlLimits.lcl * 0.99 : undefined,
        max: controlLimits?.ucl ? controlLimits.ucl * 1.01 : undefined,
      },
      series: [
        {
          type: 'line',
          data: values,
          symbol: 'none',
          lineStyle: {
            color: '#3B82F6',
            width: 1.5,
          },
          markLine: controlLimits ? {
            silent: true,
            symbol: 'none',
            lineStyle: {
              type: 'dashed',
              width: 1,
            },
            data: [
              { yAxis: controlLimits.ucl, lineStyle: { color: '#EF4444' } },
              { yAxis: controlLimits.cl, lineStyle: { color: '#64748B' } },
              { yAxis: controlLimits.lcl, lineStyle: { color: '#EF4444' } },
            ],
          } : undefined,
        },
      ],
    };

    chartInstance.current.setOption(option);

    const handleResize = () => {
      chartInstance.current?.resize();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chartInstance.current?.dispose();
      chartInstance.current = null;
    };
  }, [qualityData, controlLimits]);

  const hasAlarm = qualityData.some(d => 
    controlLimits && (d.value > controlLimits.ucl || d.value < controlLimits.lcl)
  );

  return (
    <div className={`p-3 rounded-lg border transition-all hover:border-primary-500/50 cursor-pointer ${
      hasAlarm ? 'border-danger/50 bg-danger/5' : 'border-dark-border bg-dark-bg/50'
    }`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-slate-400">{metricName}</span>
        {hasAlarm && (
          <span className="px-1.5 py-0.5 text-[10px] bg-danger/20 text-danger rounded">
            异常
          </span>
        )}
      </div>
      <div ref={chartRef} className="h-16 w-full" />
    </div>
  );
}
