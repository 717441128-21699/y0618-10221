import { useSPCStore } from '@/store/useSPCStore';
import { AlertTriangle, Check, Clock, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AlarmPanel() {
  const { alarms, acknowledgeAlarm, acknowledgeAllAlarms } = useSPCStore();
  
  const sortedAlarms = [...alarms]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 10);
  
  const unacknowledgedCount = alarms.filter(a => !a.acknowledged).length;
  const criticalCount = alarms.filter(a => a.severity === 'critical' && !a.acknowledged).length;

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="spc-card h-full flex flex-col">
      <div className="spc-card-header">
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
        </div>
        {unacknowledgedCount > 0 && (
          <button
            onClick={acknowledgeAllAlarms}
            className="text-xs text-primary-400 hover:text-primary-300 transition-colors"
          >
            全部确认
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 -mr-2 pr-2">
        {sortedAlarms.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-slate-500">
            <Check className="w-8 h-8 mb-2 text-success/50" />
            <span className="text-sm">暂无报警</span>
          </div>
        ) : (
          sortedAlarms.map((alarm) => (
            <div
              key={alarm.id}
              className={cn(
                'p-2 rounded border text-xs transition-all',
                alarm.acknowledged
                  ? 'bg-dark-bg/30 border-dark-border opacity-60'
                  : alarm.severity === 'critical'
                  ? 'bg-danger/10 border-danger/30'
                  : 'bg-warning/10 border-warning/30'
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={cn(
                    'w-2 h-2 rounded-full flex-shrink-0',
                    alarm.acknowledged
                      ? 'bg-slate-500'
                      : alarm.severity === 'critical'
                      ? 'bg-danger animate-pulse'
                      : 'bg-warning'
                  )} />
                  <span className={cn(
                    'font-medium truncate',
                    alarm.acknowledged ? 'text-slate-500' : 'text-slate-200'
                  )}>
                    {alarm.ruleName}
                  </span>
                </div>
                {!alarm.acknowledged && (
                  <button
                    onClick={() => acknowledgeAlarm(alarm.id)}
                    className="p-1 rounded hover:bg-dark-border transition-colors flex-shrink-0"
                    title="确认报警"
                  >
                    <Check className="w-3 h-3 text-slate-400" />
                  </button>
                )}
              </div>
              <div className="flex items-center justify-between mt-1.5 ml-4">
                <span className="text-slate-500">{alarm.metricName}</span>
                <div className="flex items-center gap-1 text-slate-500">
                  <Clock className="w-3 h-3" />
                  <span className="font-mono text-[10px]">{formatTime(alarm.timestamp)}</span>
                </div>
              </div>
              <div className="ml-4 mt-1">
                <span className="text-slate-400">
                  当前值: <span className="font-mono text-slate-300">{alarm.value.toFixed(3)}</span>
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-dark-border">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>共 {alarms.length} 条报警</span>
          <span>未确认 {unacknowledgedCount} 条</span>
        </div>
      </div>
    </div>
  );
}
