import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Download, FileText, ChevronDown, ChevronRight,
  BarChart3, Gauge, AlertTriangle, TrendingDown, Calendar, User,
  TrendingUp, TrendingDown as TrendDownIcon, Minus, AlertCircle
} from 'lucide-react';
import { useSPCStore } from '@/store/useSPCStore';
import type { ReportContentSnapshot } from '@/types';

const cpkLevel = (cpk: number) => {
  if (cpk >= 1.33) return { text: '良好', cls: 'text-success bg-success/10' };
  if (cpk >= 1.0) return { text: '一般', cls: 'text-warning bg-warning/10' };
  return { text: '不足', cls: 'text-danger bg-danger/10' };
};

const deltaBadge = (cur: number, prev?: number, higherBetter = true) => {
  if (prev === undefined) return null;
  const diff = cur - prev;
  const pct = prev !== 0 ? (diff / Math.abs(prev) * 100) : 0;
  const good = higherBetter ? diff > 0 : diff < 0;
  const neutral = Math.abs(diff) < 1e-9;
  const Icon = neutral ? Minus : (good ? TrendingUp : TrendDownIcon);
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] px-1.5 py-0.5 rounded font-mono ml-2 ${
      neutral ? 'text-slate-400 bg-slate-700/40' :
      good ? 'text-success bg-success/10' : 'text-danger bg-danger/10'
    }`}>
      <Icon className="w-3 h-3" />
      {diff >= 0 ? '+' : ''}{diff.toFixed(2)}
      {Math.abs(pct) >= 0.01 && ` (${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%)`}
    </span>
  );
};

export default function ReportPreview() {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();
  const { reports, downloadReportPDF, setCurrentMetric, setHighlightedDataPoint } = useSPCStore();
  const [expandedMetrics, setExpandedMetrics] = useState<Set<string>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Record<string, Set<string>>>({});

  const report = reports.find(r => r.id === reportId);

  const toggleMetric = (metricId: string) => {
    setExpandedMetrics(prev => {
      const n = new Set(prev);
      if (n.has(metricId)) n.delete(metricId); else n.add(metricId);
      return n;
    });
  };

  const toggleSection = (metricId: string, section: string) => {
    setExpandedSections(prev => {
      const prevSet = prev[metricId] || new Set();
      const n = new Set(prevSet);
      if (n.has(section)) n.delete(section); else n.add(section);
      return { ...prev, [metricId]: n };
    });
  };

  const isSectionOpen = (metricId: string, section: string) =>
    expandedSections[metricId]?.has(section) ?? true;

  const formatDate = (ts: number) => new Date(ts).toLocaleDateString('zh-CN');
  const formatDateTime = (ts: number) => new Date(ts).toLocaleString('zh-CN');

  const jumpToControlCharts = (metricId: string, metricName: string) => {
    setCurrentMetric(metricId);
    setHighlightedDataPoint(null);
    setTimeout(() => navigate('/control-charts'), 50);
  };

  const jumpToCapability = (metricId: string) => {
    setCurrentMetric(metricId);
    setTimeout(() => navigate('/capability'), 50);
  };

  const jumpToPareto = (metricId: string) => {
    setCurrentMetric(metricId);
    setTimeout(() => navigate('/pareto'), 50);
  };

  if (!report) {
    return (
      <div className="space-y-6 animate-fade-in">
        <button onClick={() => navigate('/reports')} className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" /> 返回报告列表
        </button>
        <div className="spc-card py-16 text-center">
          <FileText className="w-12 h-12 mx-auto mb-3 text-slate-600" />
          <p className="text-slate-400">报告不存在或已被删除</p>
        </div>
      </div>
    );
  }

  if (report.status === 'generating') {
    return (
      <div className="space-y-6 animate-fade-in">
        <button onClick={() => navigate('/reports')} className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" /> 返回报告列表
        </button>
        <div className="spc-card py-16 text-center">
          <div className="w-12 h-12 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-primary-400 font-medium">报告生成中...</p>
          <p className="text-xs text-slate-500 mt-1">请稍候，正在计算统计结果</p>
        </div>
      </div>
    );
  }

  const handleDownload = async () => {
    try { await downloadReportPDF(report.id); } catch (e) {
      alert(e instanceof Error ? e.message : '下载失败');
    }
  };

  const renderContentSnapshot = (
    content: ReportContentSnapshot,
    index: number,
    compareContent?: ReportContentSnapshot,
    label?: string
  ) => {
    const open = expandedMetrics.has(content.metricId);
    return (
      <div key={`${content.metricId}-${index}-${label || 'cur'}`} className="border border-dark-border rounded-lg overflow-hidden">
        <button
          onClick={() => toggleMetric(content.metricId)}
          className="w-full flex items-center justify-between px-4 py-3 bg-dark-bg/50 hover:bg-dark-bg transition-colors text-left"
        >
          <div className="flex items-center gap-3">
            {open ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
            <span className="font-medium text-slate-200">{content.metricName}</span>
            {label && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary-500/20 text-primary-400">{label}</span>
            )}
            {content.insufficientData && (
              <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded text-warning bg-warning/10">
                <AlertCircle className="w-3 h-3" /> 样本不足
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 text-[11px] font-mono text-slate-400">
            <span>样本 <span className="text-slate-200">{content.sampleSize}</span></span>
            <span>Cpk <span className={cpkLevel(content.processCapability.cpk).cls.replace('bg-', 'text-')}>
              {content.processCapability.cpk.toFixed(2)}
            </span></span>
            <span>报警 <span className="text-danger">{content.alarmSummary.totalCount}</span></span>
          </div>
        </button>

        {open && (
          <div className="p-4 space-y-3 border-t border-dark-border/50">
            {content.insufficientData && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/30 text-warning text-xs">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  <b>样本不足：</b>该区间有效数据点仅 <b>{content.sampleSize}</b> 个（建议 ≥ 20），以下统计结果仅供参考。
                </div>
              </div>
            )}

            {/* 控制图参数 */}
            <SectionCard
              title="📊 控制图参数"
              icon={BarChart3}
              isOpen={isSectionOpen(content.metricId, 'chart')}
              onToggle={() => toggleSection(content.metricId, 'chart')}
              action={
                <button
                  onClick={() => jumpToControlCharts(content.metricId, content.metricName)}
                  className="text-[11px] text-primary-400 hover:text-primary-300 flex items-center gap-1"
                >
                  查看控制图 →
                </button>
              }
            >
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCell label="UCL" value={content.controlChart.ucl.toFixed(4)} compare={compareContent?.controlChart.ucl} />
                <StatCell label="CL" value={content.controlChart.cl.toFixed(4)} compare={compareContent?.controlChart.cl} />
                <StatCell label="LCL" value={content.controlChart.lcl.toFixed(4)} compare={compareContent?.controlChart.lcl} invert />
                {content.controlChart.usl !== undefined && <StatCell label="USL" value={content.controlChart.usl.toFixed(4)} compare={compareContent?.controlChart.usl} />}
                {content.controlChart.lsl !== undefined && <StatCell label="LSL" value={content.controlChart.lsl.toFixed(4)} compare={compareContent?.controlChart.lsl} invert />}
              </div>
            </SectionCard>

            {/* 过程能力 */}
            <SectionCard
              title="📈 过程能力指数"
              icon={Gauge}
              isOpen={isSectionOpen(content.metricId, 'cap')}
              onToggle={() => toggleSection(content.metricId, 'cap')}
              action={
                <button
                  onClick={() => jumpToCapability(content.metricId)}
                  className="text-[11px] text-primary-400 hover:text-primary-300 flex items-center gap-1"
                >
                  进入能力分析 →
                </button>
              }
            >
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <StatCell label="Cp" value={content.processCapability.cp.toFixed(3)} compare={compareContent?.processCapability.cp} />
                <StatCell
                  label="Cpk"
                  value={content.processCapability.cpk.toFixed(3)}
                  compare={compareContent?.processCapability.cpk}
                  badge={
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${cpkLevel(content.processCapability.cpk).cls}`}>
                      {cpkLevel(content.processCapability.cpk).text}
                    </span>
                  }
                />
                <StatCell label="Pp" value={content.processCapability.pp.toFixed(3)} compare={compareContent?.processCapability.pp} />
                <StatCell label="Ppk" value={content.processCapability.ppk.toFixed(3)} compare={compareContent?.processCapability.ppk} />
                <StatCell label="均值" value={content.processCapability.mean.toFixed(4)} compare={compareContent?.processCapability.mean} />
                <StatCell label="标准差" value={content.processCapability.stdDev.toFixed(4)} compare={compareContent?.processCapability.stdDev} invert />
              </div>
            </SectionCard>

            {/* 报警摘要 */}
            <SectionCard
              title="⚠️ 报警摘要"
              icon={AlertTriangle}
              isOpen={isSectionOpen(content.metricId, 'alarm')}
              onToggle={() => toggleSection(content.metricId, 'alarm')}
              action={
                <button
                  onClick={() => jumpToControlCharts(content.metricId, content.metricName)}
                  className="text-[11px] text-primary-400 hover:text-primary-300 flex items-center gap-1"
                >
                  定位控制图 →
                </button>
              }
            >
              <div className="grid grid-cols-3 gap-3 mb-3">
                <StatCell label="总报警" value={String(content.alarmSummary.totalCount)} compare={compareContent?.alarmSummary.totalCount} invert danger />
                <StatCell label="🔴 严重" value={String(content.alarmSummary.criticalCount)} compare={compareContent?.alarmSummary.criticalCount} invert danger />
                <StatCell label="🟡 警告" value={String(content.alarmSummary.warningCount)} compare={compareContent?.alarmSummary.warningCount} invert warning />
              </div>
              {content.alarmSummary.topRules.length > 0 && (
                <div>
                  <p className="text-[11px] text-slate-500 mb-2">TOP 违规规则：</p>
                  <div className="space-y-1.5">
                    {content.alarmSummary.topRules.map((r, i) => {
                      const prev = compareContent?.alarmSummary.topRules.find(p => p.ruleName === r.ruleName)?.count;
                      return (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <span className="w-5 h-5 rounded bg-dark-border flex items-center justify-center text-slate-400 text-[10px] font-mono">{i + 1}</span>
                          <span className="text-slate-300 flex-1">{r.ruleName}</span>
                          <span className="font-mono text-danger">{r.count} 次</span>
                          {prev !== undefined && deltaBadge(r.count, prev, false)}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </SectionCard>

            {/* 帕累托分析 */}
            <SectionCard
              title="📉 帕累托分析（不合格原因 TOP）"
              icon={TrendingDown}
              isOpen={isSectionOpen(content.metricId, 'pareto')}
              onToggle={() => toggleSection(content.metricId, 'pareto')}
              action={
                <button
                  onClick={() => jumpToPareto(content.metricId)}
                  className="text-[11px] text-primary-400 hover:text-primary-300 flex items-center gap-1"
                >
                  查看帕累托图 →
                </button>
              }
            >
              {content.paretoData.length === 0 ? (
                <p className="text-xs text-slate-500">该区间内无不合格数据</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-slate-500 border-b border-dark-border">
                        <th className="py-2 px-3 text-left">排名</th>
                        <th className="py-2 px-3 text-left">不合格原因</th>
                        <th className="py-2 px-3 text-right">数量</th>
                        <th className="py-2 px-3 text-right">占比</th>
                      </tr>
                    </thead>
                    <tbody>
                      {content.paretoData.map((p, i) => {
                        const prev = compareContent?.paretoData.find(q => q.name === p.name)?.count;
                        return (
                          <tr key={i} className="border-b border-dark-border/50">
                            <td className="py-2 px-3 font-mono text-slate-400">{i + 1}</td>
                            <td className={`py-2 px-3 ${i < 3 ? 'text-warning font-medium' : 'text-slate-300'}`}>{p.name}</td>
                            <td className="py-2 px-3 text-right font-mono text-slate-200 flex items-center justify-end gap-1">
                              {p.count} 件
                              {prev !== undefined && deltaBadge(p.count, prev, false)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-slate-400">{p.percentage}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </SectionCard>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/reports')} className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" /> 返回报告列表
          </button>
          <div className="w-px h-4 bg-dark-border" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white">{report.name}</h1>
              {report.isComparison && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary-500/20 text-primary-400">对比报告</span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              SPC 分析报告 · {formatDateTime(report.createdAt)}
            </p>
          </div>
        </div>
        <button
          onClick={handleDownload}
          disabled={report.status !== 'completed'}
          className="flex items-center gap-2 px-3 py-1.5 bg-primary-600 hover:bg-primary-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white text-xs font-medium rounded transition-colors"
        >
          <Download className="w-3.5 h-3.5" /> 下载 PDF
        </button>
      </div>

      {/* 元数据 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <InfoCard icon={Calendar} label="统计周期" value={`${formatDate(report.periodStart)} ~ ${formatDate(report.periodEnd)}`} />
        {report.isComparison && report.comparePeriodStart !== undefined && report.comparePeriodEnd !== undefined && (
          <InfoCard icon={BarChart3} label="对比周期" value={`${formatDate(report.comparePeriodStart)} ~ ${formatDate(report.comparePeriodEnd)}`} highlight />
        )}
        <InfoCard icon={FileText} label="分析指标" value={report.metricNames.join('、')} />
        <InfoCard icon={User} label="生成者" value={report.generatedBy || '系统'} />
      </div>

      {/* 对比总览 */}
      {report.isComparison && report.compareContent && report.content && (
        <div className="spc-card">
          <div className="spc-card-header">
            <h3 className="spc-card-title">📊 环比变化总览</h3>
            <span className="text-[11px] text-slate-500">本期 vs 上期</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-500 border-b border-dark-border">
                  <th className="py-2 px-3 text-left">指标</th>
                  <th className="py-2 px-3 text-right">样本数</th>
                  <th className="py-2 px-3 text-right">均值</th>
                  <th className="py-2 px-3 text-right">Cpk</th>
                  <th className="py-2 px-3 text-right">报警数</th>
                  <th className="py-2 px-3 text-right">TOP 不良</th>
                </tr>
              </thead>
              <tbody>
                {report.content.map((cur, i) => {
                  const prev = report.compareContent?.[i];
                  return (
                    <tr key={cur.metricId} className="border-b border-dark-border/50">
                      <td className="py-2 px-3 text-slate-200 font-medium">{cur.metricName}</td>
                      <td className="py-2 px-3 text-right font-mono">
                        {cur.sampleSize}
                        {prev && deltaBadge(cur.sampleSize, prev.sampleSize)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono">
                        {cur.processCapability.mean.toFixed(3)}
                        {prev && deltaBadge(cur.processCapability.mean, prev.processCapability.mean)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono">
                        <span className={cpkLevel(cur.processCapability.cpk).cls.replace('bg-', 'text-')}>
                          {cur.processCapability.cpk.toFixed(2)}
                        </span>
                        {prev && deltaBadge(cur.processCapability.cpk, prev.processCapability.cpk)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono">
                        <span className="text-danger">{cur.alarmSummary.totalCount}</span>
                        {prev && deltaBadge(cur.alarmSummary.totalCount, prev.alarmSummary.totalCount, false)}
                      </td>
                      <td className="py-2 px-3 text-right">
                        {cur.paretoData[0]?.name || '-'}
                        <span className="text-slate-500 ml-1">({cur.paretoData[0]?.count || 0})</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 各指标详情 */}
      <div className="space-y-3">
        {report.content?.map((content, idx) => {
          const compareContent = report.compareContent?.[idx];
          return (
            <div key={content.metricId} className="space-y-3">
              {report.isComparison ? (
                <div className="grid md:grid-cols-2 gap-3">
                  {renderContentSnapshot(content, idx, undefined, '本期')}
                  {compareContent && renderContentSnapshot(compareContent, idx, undefined, '上期')}
                </div>
              ) : (
                renderContentSnapshot(content, idx)
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function InfoCard({ icon: Icon, label, value, highlight }: {
  icon: any; label: string; value: string; highlight?: boolean;
}) {
  return (
    <div className={`spc-card p-3 ${highlight ? 'border-primary-500/50 bg-primary-500/5' : ''}`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-3.5 h-3.5 ${highlight ? 'text-primary-400' : 'text-slate-500'}`} />
        <p className="text-[11px] text-slate-500">{label}</p>
      </div>
      <p className="text-sm text-slate-200">{value}</p>
    </div>
  );
}

function SectionCard({ title, icon: Icon, isOpen, onToggle, action, children }: {
  title: string; icon: any; isOpen: boolean; onToggle: () => void;
  action?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-dark-border/50 bg-dark-bg/40 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-dark-bg/60 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-slate-500" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-500" />}
          <Icon className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-sm font-medium text-slate-200">{title}</span>
        </div>
        {action}
      </button>
      {isOpen && <div className="px-3 pb-3 pt-1 border-t border-dark-border/50">{children}</div>}
    </div>
  );
}

function StatCell({ label, value, compare, badge, invert, danger, warning }: {
  label: string; value: string; compare?: number; badge?: React.ReactNode;
  invert?: boolean; danger?: boolean; warning?: boolean;
}) {
  const compareNum = typeof compare === 'string' ? parseFloat(compare) : compare;
  const valueNum = parseFloat(value);
  return (
    <div className="p-2.5 rounded bg-dark-bg border border-dark-border/50">
      <p className="text-[10px] text-slate-500 mb-0.5">{label}</p>
      <div className="flex items-center gap-1 flex-wrap">
        <span className={`font-mono text-sm ${
          danger ? 'text-danger' : warning ? 'text-warning' : 'text-slate-100'
        }`}>{value}</span>
        {compareNum !== undefined && !isNaN(compareNum) && deltaBadge(valueNum, compareNum, !invert)}
      </div>
      {badge}
    </div>
  );
}
