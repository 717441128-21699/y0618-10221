import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { useSPCStore } from '@/store/useSPCStore';
import { TrendingDown, AlertCircle } from 'lucide-react';

export default function Pareto() {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const { defectCauses } = useSPCStore();

  useEffect(() => {
    if (!chartRef.current) return;

    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    const causes = defectCauses.map(c => c.name);
    const counts = defectCauses.map(c => c.count);
    const cumulative = defectCauses.map(c => c.cumulativePercentage);

    const option: any = {
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#1E293B',
        borderColor: '#334155',
        textStyle: {
          color: '#E2E8F0',
          fontSize: 12,
        },
        axisPointer: {
          type: 'shadow',
        },
      },
      legend: {
        data: ['不合格数', '累计百分比'],
        textStyle: { color: '#94A3B8', fontSize: 12 },
        top: 0,
      },
      grid: {
        left: 60,
        right: 60,
        top: 40,
        bottom: 60,
      },
      xAxis: {
        type: 'category',
        data: causes,
        axisLine: { lineStyle: { color: '#475569' } },
        axisLabel: {
          color: '#94A3B8',
          fontSize: 11,
          rotate: 30,
          interval: 0,
        },
        axisTick: { show: false },
      },
      yAxis: [
        {
          type: 'value',
          name: '不合格数',
          nameTextStyle: { color: '#64748B', fontSize: 11 },
          axisLine: { lineStyle: { color: '#475569' } },
          axisLabel: { color: '#64748B', fontSize: 10 },
          splitLine: { lineStyle: { color: '#334155', type: 'dashed' } },
        },
        {
          type: 'value',
          name: '累计百分比',
          nameTextStyle: { color: '#64748B', fontSize: 11 },
          axisLine: { lineStyle: { color: '#475569' } },
          axisLabel: {
            color: '#64748B',
            fontSize: 10,
            formatter: '{value}%',
          },
          splitLine: { show: false },
          max: 100,
        },
      ],
      series: [
        {
          name: '不合格数',
          type: 'bar',
          data: counts.map((count, index) => ({
            value: count,
            itemStyle: {
              color: index < 3
                ? new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                    { offset: 0, color: 'rgba(239, 68, 68, 0.9)' },
                    { offset: 1, color: 'rgba(239, 68, 68, 0.4)' },
                  ])
                : new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                    { offset: 0, color: 'rgba(59, 130, 246, 0.8)' },
                    { offset: 1, color: 'rgba(59, 130, 246, 0.3)' },
                  ]),
              borderRadius: [4, 4, 0, 0],
            },
          })),
          barWidth: '50%',
          label: {
            show: true,
            position: 'top',
            color: '#94A3B8',
            fontSize: 10,
            fontFamily: 'JetBrains Mono',
          },
        },
        {
          name: '累计百分比',
          type: 'line',
          yAxisIndex: 1,
          data: cumulative,
          smooth: false,
          symbol: 'circle',
          symbolSize: 6,
          lineStyle: {
            color: '#F59E0B',
            width: 2,
          },
          itemStyle: {
            color: '#F59E0B',
            borderWidth: 2,
            borderColor: '#1E293B',
          },
          label: {
            show: true,
            position: 'top',
            color: '#F59E0B',
            fontSize: 10,
            fontFamily: 'JetBrains Mono',
            formatter: '{c}%',
          },
          markLine: {
            silent: true,
            symbol: 'none',
            yAxisIndex: 1,
            lineStyle: {
              color: '#EF4444',
              type: 'dashed',
              width: 1.5,
            },
            label: {
              formatter: '80% 分界线',
              position: 'end',
              color: '#EF4444',
              fontSize: 10,
            },
            data: [
              {
                yAxis: 80,
              },
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
  }, [defectCauses]);

  const totalCount = defectCauses.reduce((sum, c) => sum + c.count, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">帕累托分析</h1>
          <p className="text-sm text-slate-400 mt-1">
            不合格原因频次排行与累计百分比分析
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs text-slate-500">总不合格数</p>
            <p className="text-xl font-bold font-mono text-slate-200">{totalCount}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">原因类别</p>
            <p className="text-xl font-bold font-mono text-slate-200">{defectCauses.length}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="spc-card border-l-4 border-danger/50">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-slate-500">TOP 1 原因</p>
              <p className="text-lg font-bold text-white mt-1">{defectCauses[0]?.name}</p>
              <p className="text-sm text-slate-400 mt-2">
                <span className="font-mono font-bold text-danger">{defectCauses[0]?.count}</span>
                <span className="text-slate-500 ml-2">件</span>
                <span className="text-slate-500 ml-2">({defectCauses[0]?.percentage}%)</span>
              </p>
            </div>
            <div className="p-2 bg-danger/10 rounded-lg">
              <TrendingDown className="w-6 h-6 text-danger" />
            </div>
          </div>
        </div>

        <div className="spc-card border-l-4 border-warning/50">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-slate-500">TOP 2 原因</p>
              <p className="text-lg font-bold text-white mt-1">{defectCauses[1]?.name}</p>
              <p className="text-sm text-slate-400 mt-2">
                <span className="font-mono font-bold text-warning">{defectCauses[1]?.count}</span>
                <span className="text-slate-500 ml-2">件</span>
                <span className="text-slate-500 ml-2">({defectCauses[1]?.percentage}%)</span>
              </p>
            </div>
            <div className="p-2 bg-warning/10 rounded-lg">
              <TrendingDown className="w-6 h-6 text-warning" />
            </div>
          </div>
        </div>

        <div className="spc-card border-l-4 border-primary-500/50">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-slate-500">累计占比 (前3项)</p>
              <p className="text-lg font-bold text-white mt-1">80/20 法则</p>
              <p className="text-sm text-slate-400 mt-2">
                <span className="font-mono font-bold text-primary-400">
                  {defectCauses[2]?.cumulativePercentage}%
                </span>
                <span className="text-slate-500 ml-2">的问题来自前3项原因</span>
              </p>
            </div>
            <div className="p-2 bg-primary-500/10 rounded-lg">
              <AlertCircle className="w-6 h-6 text-primary-400" />
            </div>
          </div>
        </div>
      </div>

      <div className="spc-card">
        <div className="spc-card-header">
          <h3 className="spc-card-title">帕累托图</h3>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="w-3 h-3 rounded-sm bg-danger/60" />
            <span>TOP 3 重点改善项</span>
          </div>
        </div>
        <div ref={chartRef} className="h-96 w-full" />
      </div>

      <div className="spc-card">
        <div className="spc-card-header">
          <h3 className="spc-card-title">不合格原因明细表</h3>
          <span className="text-xs text-slate-500">按频次降序排列</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-dark-border">
                <th className="py-2 px-3 text-left text-xs font-medium text-slate-500">排名</th>
                <th className="py-2 px-3 text-left text-xs font-medium text-slate-500">不合格原因</th>
                <th className="py-2 px-3 text-left text-xs font-medium text-slate-500">类别</th>
                <th className="py-2 px-3 text-right text-xs font-medium text-slate-500">数量</th>
                <th className="py-2 px-3 text-right text-xs font-medium text-slate-500">占比</th>
                <th className="py-2 px-3 text-right text-xs font-medium text-slate-500">累计占比</th>
                <th className="py-2 px-3 text-left text-xs font-medium text-slate-500">改善优先级</th>
              </tr>
            </thead>
            <tbody>
              {defectCauses.map((cause, index) => (
                <tr key={cause.id} className="border-b border-dark-border/50 hover:bg-dark-bg/30 transition-colors">
                  <td className="py-2.5 px-3">
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                      index < 3 ? 'bg-danger/20 text-danger' : 'bg-slate-700 text-slate-400'
                    }`}>
                      {index + 1}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-medium text-slate-200">{cause.name}</td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 text-xs bg-primary-500/20 text-primary-400 rounded">
                      {cause.category}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-300">{cause.count}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-400">{cause.percentage}%</td>
                  <td className="py-2.5 px-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-20 h-1.5 bg-dark-border rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary-500 to-warning rounded-full"
                          style={{ width: `${cause.cumulativePercentage}%` }}
                        />
                      </div>
                      <span className="font-mono text-xs text-slate-400 w-12 text-right">
                        {cause.cumulativePercentage}%
                      </span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className={
                      index === 0 ? 'text-danger font-medium' :
                      index < 3 ? 'text-warning font-medium' :
                      'text-slate-500'
                    }>
                      {index === 0 ? '极高' : index < 3 ? '高' : index < 6 ? '中' : '低'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
