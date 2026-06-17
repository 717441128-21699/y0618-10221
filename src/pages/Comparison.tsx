import { useState, useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { useSPCStore } from '@/store/useSPCStore';
import { GitCompare, Clock, Cpu, BarChart3, TrendingUp, AlertTriangle, Gauge } from 'lucide-react';
import type { ShiftData, MachineData } from '@/types';

type CompareItem = ShiftData | MachineData;

export default function Comparison() {
  const [compareType, setCompareType] = useState<'shift' | 'machine'>('shift');
  const radarRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const radarInstance = useRef<echarts.ECharts | null>(null);
  const barInstance = useRef<echarts.ECharts | null>(null);
  const boxInstance = useRef<echarts.ECharts | null>(null);

  const { shiftData, machineData } = useSPCStore();

  const data: CompareItem[] = compareType === 'shift' ? shiftData : machineData;
  const dataNames = compareType === 'shift'
    ? (shiftData as ShiftData[]).map(s => s.shiftName)
    : (machineData as MachineData[]).map(m => m.machineName);

  const getItemName = (item: CompareItem): string => {
    return 'shiftName' in item ? item.shiftName : item.machineName;
  };

  const sortedByCpk = [...data].sort((a, b) => b.cpk - a.cpk);
  const sortedByQualified = [...data].sort((a, b) => b.qualifiedRate - a.qualifiedRate);
  const sortedByAlarmAsc = [...data].sort((a, b) => a.alarmCount - b.alarmCount);
  const sortedByOffset = [...data].sort((a, b) => Math.abs(a.meanOffset) - Math.abs(b.meanOffset));

  const bestCpk = sortedByCpk[0];
  const worstCpk = sortedByCpk[sortedByCpk.length - 1];
  const mostAlarms = sortedByAlarmAsc[sortedByAlarmAsc.length - 1];

  useEffect(() => {
    if (!radarRef.current) return;
    if (!radarInstance.current) {
      radarInstance.current = echarts.init(radarRef.current);
    }

    const maxAlarm = Math.max(...data.map(d => d.alarmCount), 1);

    const indicators = [
      { name: 'Cpk', max: 2 },
      { name: '合格率(%)', max: 100 },
      { name: '均值偏差(%)', max: 10 },
      { name: '低报警(反向)', max: maxAlarm },
    ];

    const seriesData = data.map((item, index) => {
      const values = [
        Math.min(item.cpk, 2),
        item.qualifiedRate,
        Math.min(Math.abs(item.meanOffset), 10),
        maxAlarm - item.alarmCount,
      ];
      return {
        value: values,
        name: dataNames[index],
      };
    });

    const colors = ['#3B82F6', '#F59E0B', '#10B981', '#EF4444', '#8B5CF6'];

    const option: any = {
      tooltip: {
        backgroundColor: '#1E293B',
        borderColor: '#334155',
        textStyle: { color: '#E2E8F0', fontSize: 12 },
        formatter: (params: any) => {
          const idx = dataNames.indexOf(params.name);
          if (idx < 0) return params.name;
          const d = data[idx];
          return `<b>${params.name}</b><br/>
            Cpk: ${d.cpk.toFixed(2)}<br/>
            合格率: ${d.qualifiedRate.toFixed(2)}%<br/>
            均值偏移: ${d.meanOffset >= 0 ? '+' : ''}${d.meanOffset.toFixed(2)}%<br/>
            报警数: ${d.alarmCount}次`;
        },
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
          fontSize: 10,
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
            lineStyle: { color: colors[i % colors.length], width: 2 },
            areaStyle: { color: colors[i % colors.length], opacity: 0.1 },
            itemStyle: { color: colors[i % colors.length] },
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

    const colors = ['#3B82F6', '#F59E0B', '#10B981', '#EF4444', '#8B5CF6'];

    const option: any = {
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#1E293B',
        borderColor: '#334155',
        textStyle: { color: '#E2E8F0', fontSize: 12 },
        axisPointer: { type: 'shadow' },
      },
      legend: {
        data: ['Cpk', '合格率(%)', '报警数'],
        textStyle: { color: '#94A3B8', fontSize: 11 },
        top: 0,
      },
      grid: {
        left: 50,
        right: 55,
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
          name: 'Cpk / 合格率%',
          nameTextStyle: { color: '#64748B', fontSize: 10 },
          axisLine: { lineStyle: { color: '#475569' } },
          axisLabel: { color: '#64748B', fontSize: 10 },
          splitLine: { lineStyle: { color: '#334155', type: 'dashed' } },
          max: 100,
        },
        {
          type: 'value',
          name: '报警数',
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
                { offset: 0, color: colors[i % colors.length] },
                { offset: 1, color: colors[i % colors.length] + '66' },
              ]),
              borderRadius: [4, 4, 0, 0],
            },
          })),
          barWidth: '22%',
          label: {
            show: true,
            position: 'top',
            color: '#94A3B8',
            fontSize: 10,
            fontFamily: 'JetBrains Mono',
            formatter: (p: any) => p.value.toFixed(2),
          },
          markLine: {
            silent: true,
            symbol: 'none',
            lineStyle: { color: '#EF4444', type: 'dashed' },
            data: [{ yAxis: 1.33, label: { formatter: '1.33', color: '#EF4444', fontSize: 10 } }],
          },
        },
        {
          name: '合格率(%)',
          type: 'bar',
          data: data.map((d, i) => ({
            value: d.qualifiedRate,
            itemStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: colors[i % colors.length] + 'CC' },
                { offset: 1, color: colors[i % colors.length] + '44' },
              ]),
              borderRadius: [4, 4, 0, 0],
            },
          })),
          barWidth: '22%',
          label: {
            show: true,
            position: 'top',
            color: '#94A3B8',
            fontSize: 9,
            fontFamily: 'JetBrains Mono',
            formatter: (p: any) => p.value.toFixed(1) + '%',
          },
        },
        {
          name: '报警数',
          type: 'line',
          yAxisIndex: 1,
          data: data.map(d => d.alarmCount),
          smooth: true,
          symbol: 'circle',
          symbolSize: 8,
          lineStyle: { color: '#F59E0B', width: 2.5 },
          itemStyle: { color: '#F59E0B', borderColor: '#1E293B', borderWidth: 2 },
          label: {
            show: true,
            position: 'top',
            color: '#F59E0B',
            fontSize: 10,
            fontFamily: 'JetBrains Mono',
          },
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

    const colors = ['#3B82F6', '#F59E0B', '#10B981', '#EF4444', '#8B5CF6'];

    const boxData = data.map((d, i) => [
      d.mean - d.stdDev * 2.5,
      d.mean - d.stdDev,
      d.mean - d.stdDev * 0.67,
      d.mean,
      d.mean + d.stdDev * 0.67,
      d.mean + d.stdDev,
      d.mean + d.stdDev * 2.5,
    ]);

    const option: any = {
      tooltip: {
        trigger: 'item',
        backgroundColor: '#1E293B',
        borderColor: '#334155',
        textStyle: { color: '#E2E8F0', fontSize: 12 },
        formatter: (params: any) => {
          const idx = params.dataIndex;
          const d = data[idx];
          return `<b>${dataNames[idx]}</b><br/>
            均值: ${d.mean.toFixed(3)}<br/>
            标准差: ${d.stdDev.toFixed(4)}<br/>
            样本: ${d.sampleCount}<br/>
            Cpk: ${d.cpk.toFixed(2)}`;
        },
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
        name: '测量值分布',
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
            color: 'rgba(59, 130, 246, 0.25)',
            borderColor: '#3B82F6',
            borderWidth: 1.5,
          },
        },
        {
          type: 'scatter',
          data: data.map(d => d.mean),
          symbolSize: 12,
          itemStyle: {
            color: '#EF4444',
            borderColor: '#fff',
            borderWidth: 1.5,
          },
          tooltip: { show: false },
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
            不同{compareType === 'shift' ? '班次' : '机台'}的合格率、报警数、均值偏移、Cpk 对比
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
        {data.map((item) => (
          <div key={'shiftId' in item ? item.shiftId : item.machineId} className="spc-card">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-slate-200">
                {getItemName(item)}
              </span>
              <span className={`status-indicator ${
                item.cpk >= 1.33 ? 'status-success' : item.cpk >= 1.0 ? 'status-warning' : 'status-danger'
              }`} />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 flex items-center gap-1">
                  <Gauge className="w-3 h-3" /> Cpk
                </span>
                <span className={`font-mono font-medium ${
                  item.cpk >= 1.33 ? 'text-success' : item.cpk >= 1.0 ? 'text-warning' : 'text-danger'
                }`}>
                  {item.cpk.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> 合格率
                </span>
                <span className={`font-mono font-medium ${
                  item.qualifiedRate >= 99 ? 'text-success' : item.qualifiedRate >= 95 ? 'text-warning' : 'text-danger'
                }`}>
                  {item.qualifiedRate.toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> 报警数
                </span>
                <span className={`font-mono font-medium ${
                  item.alarmCount === 0 ? 'text-success' : item.alarmCount <= 3 ? 'text-warning' : 'text-danger'
                }`}>
                  {item.alarmCount} 次
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">均值偏移</span>
                <span className={`font-mono font-medium ${
                  Math.abs(item.meanOffset) <= 1 ? 'text-success' : Math.abs(item.meanOffset) <= 3 ? 'text-warning' : 'text-danger'
                }`}>
                  {item.meanOffset >= 0 ? '+' : ''}{item.meanOffset.toFixed(2)}%
                </span>
              </div>
              <div className="pt-2 mt-2 border-t border-dark-border/50 flex justify-between text-xs">
                <span className="text-slate-500">均值</span>
                <span className="font-mono text-slate-300">{item.mean.toFixed(3)}</span>
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
            <h3 className="spc-card-title">多维度雷达图对比</h3>
            <span className="text-xs text-slate-500">Cpk/合格率/偏移/报警数</span>
          </div>
          <div ref={radarRef} className="h-72 w-full" />
        </div>

        <div className="spc-card">
          <div className="spc-card-header">
            <h3 className="spc-card-title">Cpk · 合格率 · 报警数</h3>
            <span className="text-xs text-slate-500">柱状 + 折线组合图</span>
          </div>
          <div ref={barRef} className="h-72 w-full" />
        </div>
      </div>

      <div className="spc-card">
        <div className="spc-card-header">
          <h3 className="spc-card-title">质量分布箱线图</h3>
          <span className="text-xs text-slate-500">红点为均值，箱体为四分位区间</span>
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
                <span className="w-1.5 h-1.5 rounded-full bg-success mt-2 flex-shrink-0" />
                <span>
                  <b className="text-slate-300">{getItemName(bestCpk)}</b> 过程能力最佳，
                  Cpk 达到 <b className="font-mono text-success">{bestCpk.cpk.toFixed(2)}</b>，
                  合格率 <b className="font-mono text-success">{bestCpk.qualifiedRate.toFixed(2)}%</b>
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-warning mt-2 flex-shrink-0" />
                <span>
                  <b className="text-slate-300">{getItemName(sortedByOffset[0])}</b> 均值最稳定，
                  偏移量仅 <b className="font-mono text-success">{sortedByOffset[0].meanOffset.toFixed(2)}%</b>，
                  居中程度最好
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-danger mt-2 flex-shrink-0" />
                <span>
                  <b className="text-slate-300">{getItemName(worstCpk)}</b> 过程能力不足，
                  Cpk 仅 <b className="font-mono text-danger">{worstCpk.cpk.toFixed(2)}</b>
                  {worstCpk.cpk < 1.33 ? '（低于 1.33 阈值）' : ''}，
                  报警数 <b className="font-mono text-warning">{worstCpk.alarmCount} 次</b>
                </span>
              </li>
              {mostAlarms.alarmCount > 0 && (
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-warning mt-2 flex-shrink-0" />
                  <span>
                    <b className="text-slate-300">{getItemName(mostAlarms)}</b> 报警频次最高，
                    共触发 <b className="font-mono text-warning">{mostAlarms.alarmCount} 次</b> Nelson 规则，
                    需重点排查
                  </span>
                </li>
              )}
            </ul>
          </div>
          <div>
            <h4 className="text-primary-400 font-medium mb-2">改善建议</h4>
            <ul className="space-y-2 text-slate-400">
              <li className="flex items-start gap-2">
                <BarChart3 className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                <span>
                  对表现较差的<b className="text-slate-300">{getItemName(worstCpk)}</b>
                  开展专项分析，从 5M1E 维度系统排查
                </span>
              </li>
              <li className="flex items-start gap-2">
                <BarChart3 className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                <span>
                  {compareType === 'shift'
                    ? '对比各班次人员操作规范、换班交接流程，标准化作业指导书'
                    : '检查设备状态：预防性维护计划、刀具磨损、测量系统偏差'}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <BarChart3 className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                <span>
                  以 <b className="text-slate-300">{getItemName(bestCpk)}</b> 为标杆，
                  提炼最佳实践并横向推广，形成标准作业规范
                </span>
              </li>
              <li className="flex items-start gap-2">
                <BarChart3 className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                <span>
                  建立分层审核机制，每周跟踪 Cpk 和报警数变化趋势，
                  持续监控改进效果
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
