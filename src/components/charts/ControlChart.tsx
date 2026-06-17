import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { useSPCStore } from '@/store/useSPCStore';

interface ControlChartProps {
  type: 'xbar' | 'range' | 'i' | 'mr';
  height?: number;
  title?: string;
}

export default function ControlChart({ type, height = 300, title }: ControlChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const { subgroups, qualityData, controlLimits, alarms, chartType, metricsConfig, currentMetric } = useSPCStore();

  const metricConfig = metricsConfig.find(m => m.id === currentMetric);

  useEffect(() => {
    if (!chartRef.current) return;

    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    let xData: (number | string)[] = [];
    let yData: number[] = [];
    let ucl = 0;
    let cl = 0;
    let lcl = 0;
    let usl: number | undefined;
    let lsl: number | undefined;

    if (type === 'xbar' || type === 'range') {
      xData = subgroups.map((_, i) => i + 1);
      yData = type === 'xbar' ? subgroups.map(s => s.mean) : subgroups.map(s => s.range);
      ucl = type === 'xbar' ? (controlLimits?.ucl || 0) : (controlLimits?.uclR || 0);
      cl = type === 'xbar' ? (controlLimits?.cl || 0) : (controlLimits?.clR || 0);
      lcl = type === 'xbar' ? (controlLimits?.lcl || 0) : (controlLimits?.lclR || 0);
      if (type === 'xbar') {
        usl = metricConfig?.usl;
        lsl = metricConfig?.lsl;
      }
    } else {
      xData = qualityData.slice(-50).map((_, i) => i + 1);
      if (type === 'i') {
        yData = qualityData.slice(-50).map(d => d.value);
        ucl = controlLimits?.ucl || 0;
        cl = controlLimits?.cl || 0;
        lcl = controlLimits?.lcl || 0;
        usl = metricConfig?.usl;
        lsl = metricConfig?.lsl;
      } else {
        const values = qualityData.slice(-50).map(d => d.value);
        const mrData: number[] = [0];
        for (let i = 1; i < values.length; i++) {
          mrData.push(Math.abs(values[i] - values[i - 1]));
        }
        yData = mrData;
        ucl = controlLimits?.uclR || 0;
        cl = controlLimits?.clR || 0;
        lcl = controlLimits?.lclR || 0;
      }
    }

    const violationIndices = new Set(
      alarms.filter(a => !a.acknowledged).map(a => a.dataPointIndex)
    );

    const option: any = {
      title: title ? {
        text: title,
        textStyle: {
          fontSize: 12,
          color: '#94A3B8',
          fontWeight: 'normal',
        },
        left: 10,
        top: 5,
      } : undefined,
      grid: {
        left: 60,
        right: 30,
        top: title ? 40 : 20,
        bottom: 30,
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#1E293B',
        borderColor: '#334155',
        textStyle: {
          color: '#E2E8F0',
          fontSize: 12,
        },
        formatter: (params: any) => {
          const data = Array.isArray(params) ? params[0] : params;
          return `
            <div style="font-family: 'JetBrains Mono', monospace;">
              样本 #${data.name}<br/>
              数值: <strong>${Number(data.value).toFixed(3)}</strong>
            </div>
          `;
        },
      },
      xAxis: {
        type: 'category',
        data: xData,
        axisLine: { lineStyle: { color: '#475569' } },
        axisLabel: { color: '#64748B', fontSize: 10 },
        splitLine: { show: false },
        name: type === 'xbar' || type === 'i' ? '样本序号' : '',
        nameTextStyle: { color: '#64748B', fontSize: 10 },
      },
      yAxis: {
        type: 'value',
        axisLine: { lineStyle: { color: '#475569' } },
        axisLabel: {
          color: '#64748B',
          fontSize: 10,
          formatter: (value: number) => value.toFixed(2),
        },
        splitLine: { lineStyle: { color: '#334155', type: 'dashed' } },
        name: metricConfig?.unit || '',
        nameTextStyle: { color: '#64748B', fontSize: 10 },
      },
      series: [
        {
          type: 'line',
          data: yData.map((value, index) => ({
            value,
            itemStyle: {
              color: violationIndices.has(index) ? '#EF4444' : '#3B82F6',
              borderWidth: violationIndices.has(index) ? 2 : 0,
              borderColor: '#fff',
            },
            symbolSize: violationIndices.has(index) ? 8 : 5,
          })),
          symbol: 'circle',
          lineStyle: {
            color: '#3B82F6',
            width: 1.5,
          },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(59, 130, 246, 0.2)' },
              { offset: 1, color: 'rgba(59, 130, 246, 0)' },
            ]),
          },
          markLine: {
            silent: true,
            symbol: 'none',
            data: [
              {
                yAxis: ucl,
                lineStyle: { color: '#EF4444', type: 'dashed', width: 1.5 },
                label: {
                  formatter: `UCL ${ucl.toFixed(2)}`,
                  position: 'end',
                  color: '#EF4444',
                  fontSize: 10,
                  fontFamily: 'JetBrains Mono',
                },
              },
              {
                yAxis: cl,
                lineStyle: { color: '#64748B', type: 'solid', width: 1 },
                label: {
                  formatter: `CL ${cl.toFixed(2)}`,
                  position: 'end',
                  color: '#64748B',
                  fontSize: 10,
                  fontFamily: 'JetBrains Mono',
                },
              },
              {
                yAxis: lcl,
                lineStyle: { color: '#EF4444', type: 'dashed', width: 1.5 },
                label: {
                  formatter: `LCL ${lcl.toFixed(2)}`,
                  position: 'end',
                  color: '#EF4444',
                  fontSize: 10,
                  fontFamily: 'JetBrains Mono',
                },
              },
              ...(usl !== undefined ? [{
                yAxis: usl,
                lineStyle: { color: '#F59E0B', type: 'dotted', width: 2 },
                label: {
                  formatter: `USL ${usl.toFixed(2)}`,
                  position: 'start',
                  color: '#F59E0B',
                  fontSize: 10,
                  fontFamily: 'JetBrains Mono',
                },
              }] : []),
              ...(lsl !== undefined ? [{
                yAxis: lsl,
                lineStyle: { color: '#F59E0B', type: 'dotted', width: 2 },
                label: {
                  formatter: `LSL ${lsl.toFixed(2)}`,
                  position: 'start',
                  color: '#F59E0B',
                  fontSize: 10,
                  fontFamily: 'JetBrains Mono',
                },
              }] : []),
            ],
          },
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
  }, [subgroups, qualityData, controlLimits, alarms, type, title, metricConfig, chartType]);

  return (
    <div ref={chartRef} style={{ width: '100%', height }} />
  );
}
