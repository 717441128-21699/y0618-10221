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
  const {
    subgroups, qualityData, controlLimits, alarms, chartType,
    metricsConfig, currentMetric, highlightedDataPoint
  } = useSPCStore();

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
    let dataOffset = 0;

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
      const sliceStart = Math.max(0, qualityData.length - 50);
      dataOffset = sliceStart;
      xData = qualityData.slice(sliceStart).map((_, i) => sliceStart + i + 1);
      if (type === 'i') {
        yData = qualityData.slice(sliceStart).map(d => d.value);
        ucl = controlLimits?.ucl || 0;
        cl = controlLimits?.cl || 0;
        lcl = controlLimits?.lcl || 0;
        usl = metricConfig?.usl;
        lsl = metricConfig?.lsl;
      } else {
        const values = qualityData.slice(sliceStart).map(d => d.value);
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
      alarms.filter(a => !a.acknowledged).map(a => a.dataPointIndex - dataOffset)
    );

    const effectiveHighlightIndex = highlightedDataPoint !== null
      ? highlightedDataPoint - dataOffset
      : -1;

    const dataPoints = yData.map((value, index) => {
      const isViolation = violationIndices.has(index);
      const isHighlighted = index === effectiveHighlightIndex;

      let itemColor: string;
      let symbolS = 5;
      let borderW = 0;
      let borderC: string | undefined;

      if (isHighlighted) {
        itemColor = '#10B981';
        symbolS = 18;
        borderW = 3;
        borderC = '#fff';
      } else if (isViolation) {
        itemColor = '#EF4444';
        symbolS = 9;
        borderW = 2;
        borderC = '#fff';
      } else {
        itemColor = '#3B82F6';
        symbolS = 5;
        borderW = 0;
      }

      return {
        value,
        itemStyle: {
          color: itemColor,
          borderWidth: borderW,
          borderColor: borderC,
          shadowBlur: isHighlighted ? 18 : 0,
          shadowColor: isHighlighted ? '#10B981' : 'transparent',
        },
        symbolSize: symbolS,
      };
    });

    const dataLength = xData.length;
    const showDataZoom = dataLength > 35;
    const startPct = showDataZoom && effectiveHighlightIndex >= 0
      ? Math.max(0, Math.min(100, ((Math.max(0, effectiveHighlightIndex - 8)) / dataLength) * 100))
      : 0;
    const endPct = showDataZoom && effectiveHighlightIndex >= 0
      ? Math.max(startPct, Math.min(100, ((Math.min(dataLength - 1, effectiveHighlightIndex + 8)) / dataLength) * 100))
      : 100;

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
        bottom: showDataZoom ? 60 : 30,
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
          const idx = Number(data.name) - 1;
          const relatedAlarms = alarms
            .filter(a => a.dataPointIndex === idx + dataOffset)
            .map(a => `${a.ruleName}`);
          const alarmText = relatedAlarms.length > 0
            ? `<br/><span style="color:#EF4444">⚠ ${relatedAlarms.join(', ')}</span>`
            : '';
          const hlText = idx + dataOffset === highlightedDataPoint
            ? `<br/><span style="color:#10B981">● 当前定位点</span>`
            : '';
          return `
            <div style="font-family: 'JetBrains Mono', monospace;">
              样本 #${data.name}<br/>
              数值: <strong>${Number(data.value).toFixed(4)}</strong>
              ${alarmText}${hlText}
            </div>
          `;
        },
      },
      dataZoom: showDataZoom ? [
        {
          type: 'inside',
          start: startPct,
          end: endPct,
          zoomLock: false,
        },
        {
          type: 'slider',
          start: startPct,
          end: endPct,
          height: 18,
          bottom: 8,
          borderColor: 'transparent',
          backgroundColor: 'rgba(51, 65, 85, 0.3)',
          fillerColor: 'rgba(59, 130, 246, 0.25)',
          handleStyle: { color: '#3B82F6' },
          textStyle: { color: '#64748B', fontSize: 9 },
          dataBackground: {
            lineStyle: { color: '#475569' },
            areaStyle: { color: 'rgba(71, 85, 105, 0.3)' },
          },
          selectedDataBackground: {
            lineStyle: { color: '#3B82F6' },
            areaStyle: { color: 'rgba(59, 130, 246, 0.4)' },
          },
        },
      ] : undefined,
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
          data: dataPoints,
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
          markPoint: effectiveHighlightIndex >= 0 && effectiveHighlightIndex < yData.length ? {
            symbol: 'pin',
            symbolSize: 36,
            itemStyle: { color: '#10B981' },
            label: {
              show: true,
              formatter: '定位',
              color: '#fff',
              fontSize: 10,
              fontWeight: 'bold',
            },
            data: [
              {
                xAxis: xData[effectiveHighlightIndex],
                yAxis: yData[effectiveHighlightIndex],
                value: '定位',
              },
            ],
          } : undefined,
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
  }, [subgroups, qualityData, controlLimits, alarms, type, title, metricConfig, chartType, highlightedDataPoint]);

  return (
    <div ref={chartRef} style={{ width: '100%', height }} />
  );
}
