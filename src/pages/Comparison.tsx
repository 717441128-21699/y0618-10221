import { useState, useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { useSPCStore } from '@/store/useSPCStore';
import { GitCompare, Clock, Cpu, BarChart3 } from 'lucide-react';

export default function Comparison() {
  const [compareType, setCompareType] = useState<'shift' | 'machine'>('shift');
  const radarRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const radarInstance = useRef<echarts.ECharts | null>(null);
  const barInstance = useRef<echarts.ECharts | null>(null);
  const boxInstance = useRef<echarts.ECharts | null>(null);

  const { shiftData, machineData } = useSPCStore();

  const data = compareType === 'shift' ? shiftData : machineData;
  const dataNames = compareType === 'shift'
    ? shiftData.map(s => s.shiftName)
    : machineData.map(m => m.machineName);

  useEffect(() => {
    if (!radarRef.current) return;
    if (!radarInstance.current) {
      radarInstance.current = echarts.init(radarRef.current);
    }

    const indicators = [
      { name: 'Cpk', max: 2 },
      { name: '合格率', max: 100 },
      { name: '均值偏差', max: 1 },
      { name: '稳定性', max: 1 },
    ];

    const seriesData = data.map((item, index) => {
      const values = [
        item.cpk,
        (1 - (item as any).defectRate / 100) * 100,
        1 - Math.abs(item.mean - 50),
        1 - item.stdDev / 5,
      ];
      return {
        value: values,
        name: dataNames[index],
      };
    });

    const colors = ['#3B82F6', '#F59E0B', '#10B981', '#EF4444'];

    const option: any = {
      tooltip: {
        backgroundColor: '#1E293B',
        borderColor: '#334155',
        textStyle: { color: '#E2E8F0', fontSize: 12 },
      },
      legend: {
        data: dataNames,
        textStyle: { color: '#94A3B8', fontSize: 11 },
        bottom: 0,
      },
      radar: {
        indicator: indicators,
        shape: 'polygon',
        splitNumber: 4,
        axisName: {
          color: '#94A3B8',
          fontSize: 11,
        },
        splitLine: {
          lineStyle: { color: '#334155' },
        },
        splitArea: {
          show: true,
          areaStyle: {
            color: ['rgba(51, 65, 85, 0.2)', 'rgba(51, 65, 85, 0.1)'],
          },
        },
        axisLine: {
          lineStyle: { color: '#475569' },
        },
      },
      series: [
        {
          type: 'radar',
          data: seriesData.map((d, i) => ({
            value: d.value,
            name: d.name,
            lineStyle: { color: colors[i], width: 2 },
            areaStyle: { color: colors[i], opacity: 0.1 },
            itemStyle: { color: colors[i] },
          })),
        },
      ],
    };

    radarInstance.current.setOption(option, true);

    const handleResize = () => radarInstance.current?.resize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      radarInstance.current?.dispose();
      radarInstance.current = null;
    };
  }, [data, dataNames]);

  useEffect(() => {
    if (!barRef.current) return;
    if (!barInstance.current) {
      barInstance.current = echarts.init(barRef.current);
    }

    const colors = ['#3B82F6', '#F59E0B', '#10B981', '#EF4444'];

    const option: any = {
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#1E293B',
        borderColor: '#334155',
        textStyle: { color: '#E2E8F0', fontSize: 12 },
      },
      legend: {
        data: ['Cpk', '不合格率(%)'],
        textStyle: { color: '#94A3B8', fontSize: 11 },
        top: 0,
      },
      grid: {
        left: 50,
        right: 50,
        top: 40,
        bottom: 30,
      },
      xAxis: {
        type: 'category',
        data: dataNames,
        axisLine: { lineStyle: { color: '#475569' } },
        axisLabel: { color: '#94A3B8', fontSize: 11 },
      },
      yAxis: [
        {
          type: 'value',
          name: 'Cpk',
          nameTextStyle: { color: '#64748B', fontSize: 10 },
          axisLine: { lineStyle: { color: '#475569' } },
          axisLabel: { color: '#64748B', fontSize: 10 },
          splitLine: { lineStyle: { color: '#334155', type: 'dashed' } },
        },
        {
          type: 'value',
          name: '不合格率(%)',
          nameTextStyle: { color: '#64748B', fontSize: 10 },
          axisLine: { lineStyle: { color: '#475569' } },
          axisLabel: { color: '#64748B', fontSize: 10 },
          splitLine: { show: false },
        },
      ],
      series: [
        {
          name: 'Cpk',
          type: 'bar',
          data: data.map((d, i) => ({
            value: d.cpk,
            itemStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: colors[i] },
                { offset: 1, color: colors[i] + '66' },
              ]),
              borderRadius: [4, 4, 0, 0],
            },
          })),
          barWidth: '30%',
          label: {
            show: true,
            position: 'top',
            color: '#94A3B8',
            fontSize: 10,
            fontFamily: 'JetBrains Mono',
            formatter: '{c}',
          },
          markLine: {
            silent: true,
            symbol: 'none',
            lineStyle: { color: '#EF4444', type: 'dashed' },
            data: [{ yAxis: 1.33, label: { formatter: '1.33 阈值', color: '#EF4444', fontSize: 10 } }],
          },
        },
        {
          name: '不合格率(%)',
          type: 'line',
          yAxisIndex: 1,
          data: data.map(d => (d as any).defectRate || (d as any).alarmCount),
          smooth: true,
          symbol: 'circle',
          symbolSize: 8,
          lineStyle: { color: '#F59E0B', width: 2 },
          itemStyle: { color: '#F59E0B', borderColor: '#1E293B', borderWidth: 2 },
        },
      ],
    };

    barInstance.current.setOption(option, true);

    const handleResize = () => barInstance.current?.resize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      barInstance.current?.dispose();
      barInstance.current = null;
    };
  }, [data, dataNames]);

  useEffect(() => {
    if (!boxRef.current) return;
    if (!boxInstance.current) {
      boxInstance.current = echarts.init(boxRef.current);
    }

    const colors = ['#3B82F6', '#F59E0B', '#10B981', '#EF4444'];

    const boxData = data.map((d, i) => [
      d.mean - d.stdDev * 2.5,
      d.mean - d.stdDev,
      d.mean - d.stdDev * 0.5,
      d.mean,
      d.mean + d.stdDev * 0.5,
      d.mean + d.stdDev,
      d.mean + d.stdDev * 2.5,
    ]);

    const option: any = {
      tooltip: {
        trigger: 'item',
        backgroundColor: '#1E293B',
        borderColor: '#334155',
        textStyle: { color: '#E2E8F0', fontSize: 12 },
      },
      grid: {
        left: 60,
        right: 30,
        top: 20,
        bottom: 30,
      },
      xAxis: {
        type: 'category',
        data: dataNames,
        axisLine: { lineStyle: { color: '#475569' } },
        axisLabel: { color: '#94A3B8', fontSize: 11 },
      },
      yAxis: {
        type: 'value',
        name: '测量值',
        nameTextStyle: { color: '#64748B', fontSize: 10 },
        axisLine: { lineStyle: { color: '#475569' } },
        axisLabel: { color: '#64748B', fontSize: 10 },
        splitLine: { lineStyle: { color: '#334155', type: 'dashed' } },
      },
      series: [
        {
          type: 'boxplot',
          data: boxData,
          itemStyle: {
            color: 'rgba(59, 130, 246, 0.3)',
            borderColor: '#3B82F6',
            borderWidth: 1.5,
          },
        },
      ],
    };

    boxInstance.current.setOption(option, true);

    const handleResize = () => boxInstance.current?.resize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      boxInstance.current?.dispose();
      boxInstance.current = null;
    };
  }, [data, dataNames]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">多维度对比分析</h1>
          <p className="text-sm text-slate-400 mt-1">
            不同班次、机台的质量分布差异对比
          </p>
        </div>

        <div className="flex items-center gap-2 p-1 bg-dark-card border border-dark-border rounded">
          <button
            onClick={() => setCompareType('shift')}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded transition-all ${
              compareType === 'shift'
                ? 'bg-primary-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            班次对比
          </button>
          <button
            onClick={() => setCompareType('machine')}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded transition-all ${
              compareType === 'machine'
                ? 'bg-primary-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            机台对比
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {data.map((item, index) => (
          <div key={item.shiftId || item.machineId} className="spc-card">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-slate-200">
                {compareType === 'shift' ? (item as any).shiftName : (item as any).machineName}
              </span>
              <span className={`status-indicator ${
                item.cpk >= 1.33 ? 'status-success' : item.cpk >= 1.0 ? 'status-warning' : 'status-danger'
              }`} />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Cpk</span>
                <span className={`font-mono font-medium ${
                  item.cpk >= 1.33 ? 'text-success' : item.cpk >= 1.0 ? 'text-warning' : 'text-danger'
                }`}>
                  {item.cpk.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">均值</span>
                <span className="font-mono text-slate-300">{item.mean.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">标准差</span>
                <span className="font-mono text-slate-300">{item.stdDev.toFixed(3)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">样本数</span>
                <span className="font-mono text-slate-300">{item.sampleCount}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="spc-card">
          <div className="spc-card-header">
            <h3 className="spc-card-title">雷达图对比</h3>
          </div>
          <div ref={radarRef} className="h-72 w-full" />
        </div>

        <div className="spc-card">
          <div className="spc-card-header">
            <h3 className="spc-card-title">Cpk 与不合格率对比</h3>
          </div>
          <div ref={barRef} className="h-72 w-full" />
        </div>
      </div>

      <div className="spc-card">
        <div className="spc-card-header">
          <h3 className="spc-card-title">质量分布箱线图</h3>
          <span className="text-xs text-slate-500">展示数据离散程度和中位数</span>
        </div>
        <div ref={boxRef} className="h-64 w-full" />
      </div>

      <div className="spc-card">
        <div className="spc-card-header">
          <h3 className="spc-card-title">分析结论</h3>
          <GitCompare className="w-4 h-4 text-primary-400" />
        </div>
        <div className="grid grid-cols-2 gap-6 text-sm">
          <div>
            <h4 className="text-primary-400 font-medium mb-2">主要发现</h4>
            <ul className="space-y-2 text-slate-400">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary-400 mt-2 flex-shrink-0" />
                <span>
                  {compareType === 'shift' ? '早班' : 'CNC-001'} 过程能力最佳，Cpk 达到 {data[0].cpk.toFixed(2)}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-warning mt-2 flex-shrink-0" />
                <span>
                  {compareType === 'shift' ? '晚班' : 'CNC-003'} 质量波动较大，需要重点关注
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-danger mt-2 flex-shrink-0" />
                <span>
                  {compareType === 'shift' ? '晚班' : 'CNC-003'} 的 Cpk 低于 1.33 阈值
                </span>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-primary-400 font-medium mb-2">改善建议</h4>
            <ul className="space-y-2 text-slate-400">
              <li className="flex items-start gap-2">
                <BarChart3 className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                <span>对表现较差的{compareType === 'shift' ? '班次' : '机台'}开展专项分析</span>
              </li>
              <li className="flex items-start gap-2">
                <BarChart3 className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                <span>检查设备状态、人员操作、原材料等影响因素</span>
              </li>
              <li className="flex items-start gap-2">
                <BarChart3 className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                <span>制定针对性的改进措施并跟踪效果</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
