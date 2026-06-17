import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSPCStore } from '@/store/useSPCStore';
import type { AlarmFilter } from '@/types';
import {
  AlertTriangle, Check, Clock, X, Filter, ChevronDown, ChevronUp,
  Crosshair, Search
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AlarmPanel() {
  const navigate = useNavigate();
  const {
    alarms, acknowledgeAlarm, acknowledgeAllAlarms,
    alarmFilter, setAlarmFilter,
    setHighlightedDataPoint, setCurrentMetric, metricsConfig,
  } = useSPCStore();

  const [showFilter, setShowFilter] = useState(false);
  const [searchText, setSearchText] = useState('');

  const uniqueRuleIds = useMemo(
    () => [...new Set(alarms.map(a => a.ruleId))].sort(),
    [alarms]
  );
  const uniqueMetricIds = useMemo(
    () => [...new Set(alarms.map(a => a.metricId))],
    [alarms]
  );
  const uniqueShiftIds = useMemo(
    () => [...new Set(alarms.map(a => a.shiftId).filter(Boolean))] as string[],
    [alarms]
  );
  const uniqueMachineIds = useMemo(
    () => [...new Set(alarms.map(a => a.machineId).filter(Boolean))] as string[],
    [alarms]
  );

  const filteredAlarms = useMemo(() => {
    return alarms.filter(alarm => {
      if (alarmFilter.ruleId !== undefined && alarm.ruleId !== alarmFilter.ruleId) return false;
      if (alarmFilter.metricId && alarm.metricId !== alarmFilter.metricId) return false;
      if (alarmFilter.shiftId && alarm.shiftId !== alarmFilter.shiftId) return false;
      if (alarmFilter.machineId && alarm.machineId !== alarmFilter.machineId) return false;
      if (alarmFilter.severity && alarm.severity !== alarmFilter.severity) return false;
      if (alarmFilter.acknowledged !== undefined && alarm.acknowledged !== alarmFilter.acknowledged) return false;
      if (searchText.trim()) {
        const q = searchText.toLowerCase();
        if (!alarm.ruleName.toLowerCase().includes(q) &&
            !alarm.metricName.toLowerCase().includes(q) &&
            !String(alarm.value).includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [alarms, alarmFilter, searchText]);

  const sortedAlarms = [...filteredAlarms]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 50);

  const unacknowledgedCount = alarms.filter(a => !a.acknowledged).length;
  const criticalCount = alarms.filter(a => a.severity === 'critical' && !a.acknowledged).length;
  const filteredCount = filteredAlarms.length;

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatDateTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
      month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  };

  const handleAlarmClick = (alarm: typeof alarms[number]) => {
    if (alarm.metricId && alarm.metricId !== useSPCStore.getState().currentMetric) {
      setCurrentMetric(alarm.metricId);
    }
    const chartTypeNow = useSPCStore.getState().chartType;
    const dataPointIndex = chartTypeNow === 'xbar-r'
      ? alarm.dataPointIndex
      : alarm.dataPointIndex;
    setHighlightedDataPoint(dataPointIndex);
    navigate('/control-charts');
    setTimeout(() => {
      const el = document.getElementById('control-chart-scroll-target');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 200);
  };

  const hasActiveFilter = Object.keys(alarmFilter).length > 0;

  return (
    <div className="spc-card h-full flex flex-col">
      <div className="spc-card-header flex-col items-stretch gap-2">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-warning" />
            <h3 className="spc-card-title">实时报警</h3>
            {unacknowledgedCount > 0 && (
              <span className={cn(
                "px-1.5 py-0.5 text-[10px] font-bold rounded",
                criticalCount > 0 ? 'bg-danger/20 text-danger' : 'bg-warning/20 text-warning'
              )}>
                {unacknowledgedCount}
              </span>
            )}
            {hasActiveFilter && (
              <span className="px-1.5 py-0.5 text-[10px] bg-primary-500/20 text-primary-400 rounded">
                筛选 {filteredCount}/{alarms.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowFilter(s => !s)}
              className={cn(
                "p-1.5 rounded transition-colors",
                hasActiveFilter
                  ? "bg-primary-500/20 text-primary-300"
                  : "text-slate-400 hover:bg-dark-border hover:text-slate-200"
              )}
              title="筛选报警"
            >
              <Filter className="w-3.5 h-3.5" />
            </button>
            {unacknowledgedCount > 0 && (
              <button
                onClick={acknowledgeAllAlarms}
                className="text-xs text-primary-400 hover:text-primary-300 transition-colors px-2"
              >
                全部确认
              </button>
            )}
          </div>
        </div>

        <div className="relative w-full">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="搜索规则名/指标名/数值..."
            className="spc-input text-[11px] pl-8 py-1.5 w-full"
          />
          {searchText && (
            <button
              onClick={() => setSearchText('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {showFilter && (
        <div className="px-3 py-2 border-b border-dark-border space-y-2 bg-dark-bg/30 animate-fade-in">
          <FilterRow
            label="规则"
            value={alarmFilter.ruleId !== undefined ? `规则 ${alarmFilter.ruleId}` : undefined}
            options={uniqueRuleIds.map(id => ({
              value: String(id),
              label: `规则 ${id}`,
            }))}
            onClear={() => {
              const { ruleId, ...rest } = alarmFilter;
              setAlarmFilter(rest);
            }}
            onChange={(v) => setAlarmFilter({
              ...alarmFilter,
              ruleId: v === undefined ? undefined : Number(v),
            })}
          />
          <FilterRow
            label="指标"
            value={alarmFilter.metricId
              ? metricsConfig.find(m => m.id === alarmFilter.metricId)?.name || alarmFilter.metricId
              : undefined
            }
            options={uniqueMetricIds.map(id => ({
              value: id,
              label: metricsConfig.find(m => m.id === id)?.name || id,
            }))}
            onClear={() => {
              const { metricId, ...rest } = alarmFilter;
              setAlarmFilter(rest);
            }}
            onChange={(v) => setAlarmFilter({
              ...alarmFilter,
              metricId: v,
            })}
          />
          <FilterRow
            label="班次"
            value={alarmFilter.shiftId}
            options={uniqueShiftIds.map(id => ({ value: id, label: id }))}
            onClear={() => {
              const { shiftId, ...rest } = alarmFilter;
              setAlarmFilter(rest);
            }}
            onChange={(v) => setAlarmFilter({
              ...alarmFilter,
              shiftId: v,
            })}
          />
          <FilterRow
            label="机台"
            value={alarmFilter.machineId}
            options={uniqueMachineIds.map(id => ({ value: id, label: id }))}
            onClear={() => {
              const { machineId, ...rest } = alarmFilter;
              setAlarmFilter(rest);
            }}
            onChange={(v) => setAlarmFilter({
              ...alarmFilter,
              machineId: v,
            })}
          />
          <FilterRow
            label="严重度"
            value={alarmFilter.severity === 'critical' ? '严重' : alarmFilter.severity === 'warning' ? '警告' : undefined}
            options={[
              { value: 'critical', label: '严重' },
              { value: 'warning', label: '警告' },
            ]}
            onClear={() => {
              const { severity, ...rest } = alarmFilter;
              setAlarmFilter(rest);
            }}
            onChange={(v) => setAlarmFilter({
              ...alarmFilter,
              severity: v as 'critical' | 'warning' | undefined,
            })}
          />
          <FilterRow
            label="状态"
            value={alarmFilter.acknowledged === true ? '已确认' : alarmFilter.acknowledged === false ? '未确认' : undefined}
            options={[
              { value: 'false', label: '未确认' },
              { value: 'true', label: '已确认' },
            ]}
            onClear={() => {
              const { acknowledged, ...rest } = alarmFilter;
              setAlarmFilter(rest);
            }}
            onChange={(v) => setAlarmFilter({
              ...alarmFilter,
              acknowledged: v === undefined ? undefined : v === 'true',
            })}
          />
          {hasActiveFilter && (
            <button
              onClick={() => setAlarmFilter({})}
              className="w-full text-[11px] py-1 text-slate-400 hover:text-primary-400 transition-colors"
            >
              清除全部筛选条件
            </button>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-1.5 -mr-2 pr-2 pt-2">
        {sortedAlarms.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-slate-500">
            <Check className="w-8 h-8 mb-2 text-success/50" />
            <span className="text-sm">
              {alarms.length === 0 ? '暂无报警' : '无符合条件的报警'}
            </span>
          </div>
        ) : (
          sortedAlarms.map((alarm) => (
            <div
              key={alarm.id}
              className={cn(
                'p-2 rounded border text-xs transition-all cursor-pointer group',
                alarm.acknowledged
                  ? 'bg-dark-bg/30 border-dark-border opacity-70 hover:opacity-100'
                  : alarm.severity === 'critical'
                  ? 'bg-danger/10 border-danger/30 hover:border-danger/50'
                  : 'bg-warning/10 border-warning/30 hover:border-warning/50',
              )}
              onClick={() => handleAlarmClick(alarm)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 min-w-0 flex-1">
                  <span className={cn(
                    'w-2 h-2 rounded-full flex-shrink-0 mt-1',
                    alarm.acknowledged
                      ? 'bg-slate-500'
                      : alarm.severity === 'critical'
                      ? 'bg-danger animate-pulse'
                      : 'bg-warning'
                  )} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={cn(
                        'font-medium truncate',
                        alarm.acknowledged ? 'text-slate-500' : 'text-slate-200'
                      )}>
                        {alarm.ruleName}
                      </span>
                      <span className={cn(
                        "px-1 py-0 text-[9px] rounded flex-shrink-0",
                        alarm.severity === 'critical'
                          ? 'bg-danger/20 text-danger'
                          : 'bg-warning/20 text-warning'
                      )}>
                        R{alarm.ruleId}
                      </span>
                    </div>
                    <div className="mt-0.5 space-y-0.5">
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 flex-wrap">
                        <span className="truncate max-w-[80px]">{alarm.metricName}</span>
                        {alarm.shiftId && (
                          <>
                            <span>·</span>
                            <span>{alarm.shiftId}</span>
                          </>
                        )}
                        {alarm.machineId && (
                          <>
                            <span>·</span>
                            <span className="font-mono">{alarm.machineId}</span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-[10px]">
                          值: <span className="font-mono text-slate-300">{alarm.value.toFixed(3)}</span>
                          {' · 第'}<span className="font-mono">{alarm.dataPointIndex + 1}</span>点
                        </span>
                        <div className="flex items-center gap-1 text-slate-500 group-hover:text-primary-400 transition-colors">
                          <Crosshair className="w-3 h-3" />
                          <span className="text-[10px]">定位</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                  {!alarm.acknowledged && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        acknowledgeAlarm(alarm.id);
                      }}
                      className="p-1 rounded hover:bg-dark-border transition-colors flex-shrink-0"
                      title="确认报警"
                    >
                      <Check className="w-3 h-3 text-slate-400 hover:text-success" />
                    </button>
                  )}
                  <div className="flex items-center gap-1 text-slate-500">
                    <Clock className="w-2.5 h-2.5" />
                    <span className="font-mono text-[9px]" title={formatDateTime(alarm.timestamp)}>
                      {formatTime(alarm.timestamp)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-dark-border">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>共 {filteredCount} / {alarms.length} 条</span>
          <span>未确认 {unacknowledgedCount} 条</span>
        </div>
      </div>
    </div>
  );
}

function FilterRow({
  label, value, options, onClear, onChange
}: {
  label: string;
  value?: string;
  options: { value: string; label: string }[];
  onClear: () => void;
  onChange: (value: string | undefined) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <div className="flex items-center gap-2 text-[11px]">
        <span className="text-slate-500 w-12 flex-shrink-0">{label}</span>
        <button
          onClick={() => setOpen(o => !o)}
          className={cn(
            "flex-1 flex items-center justify-between px-2 py-1 rounded border transition-all text-left",
            value
              ? "border-primary-500/50 bg-primary-500/10 text-slate-200"
              : "border-dark-border bg-dark-bg/50 text-slate-500 hover:border-slate-500"
          )}
          disabled={options.length === 0}
        >
          <span className="truncate">
            {value || (options.length === 0 ? '无数据' : '全部')}
          </span>
          <div className="flex items-center gap-0.5 flex-shrink-0">
            {value && (
              <button
                onClick={(e) => { e.stopPropagation(); onClear(); }}
                className="hover:text-danger"
              >
                <X className="w-3 h-3" />
              </button>
            )}
            {options.length > 0 && (
              open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
            )}
          </div>
        </button>
      </div>
      {open && options.length > 0 && (
        <div className="absolute z-20 left-14 right-0 top-full mt-1 bg-dark-card border border-dark-border rounded shadow-lg max-h-40 overflow-y-auto animate-fade-in">
          <button
            onClick={() => { onClear(); setOpen(false); }}
            className="w-full text-left px-2.5 py-1.5 text-[11px] text-slate-400 hover:bg-dark-border hover:text-slate-200 border-b border-dark-border"
          >
            全部
          </button>
          {options.map(opt => (
            <button
              key={opt.value}
              onClick={() => {
                onChange(opt.label === value ? undefined : opt.value);
                setOpen(false);
              }}
              className={cn(
                "w-full text-left px-2.5 py-1.5 text-[11px] hover:bg-dark-border transition-colors",
                opt.label === value
                  ? "text-primary-300 bg-primary-500/10"
                  : "text-slate-300"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
