import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KPICardProps {
  title: string;
  value: string;
  status?: 'success' | 'warning' | 'danger' | 'info';
  icon?: LucideIcon;
  trend?: number;
  trendLabel?: string;
  subtitle?: string;
}

export default function KPICard({
  title,
  value,
  status = 'info',
  icon: Icon,
  trend,
  trendLabel,
  subtitle,
}: KPICardProps) {
  const statusColors = {
    success: 'border-success/40',
    warning: 'border-warning/40',
    danger: 'border-danger/40',
    info: 'border-primary-500/40',
  };

  const statusBgColors = {
    success: 'from-success/5 to-transparent',
    warning: 'from-warning/5 to-transparent',
    danger: 'from-danger/5 to-transparent',
    info: 'from-primary-500/5 to-transparent',
  };

  const statusTextColors = {
    success: 'text-success',
    warning: 'text-warning',
    danger: 'text-danger',
    info: 'text-primary-400',
  };

  return (
    <div className={cn(
      'spc-card border-l-4 bg-gradient-to-br relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-[1.02]',
      statusColors[status],
      statusBgColors[status]
    )}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-400 mb-1">{title}</p>
          <p className={cn(
            'text-3xl font-bold font-mono',
            status === 'danger' ? 'animate-pulse' : '',
            statusTextColors[status]
          )}>
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
          )}
          {trend !== undefined && (
            <div className="flex items-center gap-1 mt-2">
              {trend >= 0 ? (
                <svg className="w-3.5 h-3.5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5 text-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              )}
              <span className={cn(
                'text-xs font-medium',
                trend >= 0 ? 'text-success' : 'text-danger'
              )}>
                {Math.abs(trend).toFixed(2)}%
              </span>
              {trendLabel && (
                <span className="text-xs text-slate-500">{trendLabel}</span>
              )}
            </div>
          )}
        </div>
        {Icon && (
          <div className={cn(
            'p-2 rounded-lg',
            status === 'success' ? 'bg-success/10' :
            status === 'warning' ? 'bg-warning/10' :
            status === 'danger' ? 'bg-danger/10' :
            'bg-primary-500/10'
          )}>
            <Icon className={cn(
              'w-6 h-6',
              statusTextColors[status]
            )} />
          </div>
        )}
      </div>
      
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-current to-transparent opacity-20"
           style={{ color: status === 'success' ? '#10B981' : status === 'warning' ? '#F59E0B' : status === 'danger' ? '#EF4444' : '#3B82F6' }} />
    </div>
  );
}
