import { Bell, RefreshCw, Maximize2, Clock } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useSPCStore } from '@/store/useSPCStore';
import { cn } from '@/lib/utils';

export default function Header() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const { alarms, isRealTimeMode, toggleRealTimeMode, lastUpdateTime } = useSPCStore();
  
  const unacknowledgedAlarms = alarms.filter(a => !a.acknowledged);
  const criticalAlarms = unacknowledgedAlarms.filter(a => a.severity === 'critical');

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' });
  };

  return (
    <header className="h-14 bg-dark-card border-b border-dark-border flex items-center justify-between px-6">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 text-slate-300">
          <Clock className="w-4 h-4 text-primary-400" />
          <span className="text-sm font-mono">{formatTime(currentTime)}</span>
          <span className="text-xs text-slate-500">{formatDate(currentTime)}</span>
        </div>
        
        <div className="flex items-center gap-2">
          <span className={cn(
            "status-indicator",
            isRealTimeMode ? "status-success" : "status-warning"
          )} />
          <span className="text-xs text-slate-400">
            {isRealTimeMode ? '实时更新中' : '已暂停'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={toggleRealTimeMode}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition-all",
            isRealTimeMode
              ? "bg-success/20 text-success border border-success/30"
              : "bg-warning/20 text-warning border border-warning/30"
          )}
        >
          <RefreshCw className={cn("w-3.5 h-3.5", isRealTimeMode && "animate-spin")} />
          {isRealTimeMode ? '实时' : '暂停'}
        </button>

        <button className="relative p-2 rounded-md hover:bg-dark-border transition-colors">
          <Bell className="w-5 h-5 text-slate-400" />
          {unacknowledgedAlarms.length > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-danger text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {unacknowledgedAlarms.length > 9 ? '9+' : unacknowledgedAlarms.length}
            </span>
          )}
          {criticalAlarms.length > 0 && (
            <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-danger rounded-full animate-ping" />
          )}
        </button>

        <button className="p-2 rounded-md hover:bg-dark-border transition-colors">
          <Maximize2 className="w-5 h-5 text-slate-400" />
        </button>
      </div>
    </header>
  );
}
