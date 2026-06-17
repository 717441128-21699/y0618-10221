import { create } from 'zustand';
import jsPDF from 'jspdf';
import { QualityDataPoint, SubgroupData, ControlLimits, AlarmRecord, ProcessCapability, DefectCause, ShiftData, MachineData, SPCReport, BaselineVersion, AlarmFilter, ReportContentSnapshot } from '@/types';
import { generateQualityData, generateSubgroups, METRICS_CONFIG } from '@/mock/data';
import { calculateXbarRControlLimits, calculateIMRControlLimits, calculateProcessCapability } from '@/utils/spc';
import { checkNelsonRules, DEFAULT_NELSON_RULES, NelsonRuleConfig } from '@/utils/nelson';
import { calculateShiftData, calculateMachineData, calculateDefectCausesFromData } from '@/utils/analytics';

const STORAGE_KEY_REPORTS = 'spc_reports_storage';
const STORAGE_KEY_BASELINES = 'spc_baselines_storage';
const STORAGE_KEY_DATA = 'spc_quality_data_storage';

function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const stored = localStorage.getItem(key);
    if (stored) return JSON.parse(stored) as T;
  } catch (e) {
    console.warn('Failed to load from storage:', key);
  }
  return defaultValue;
}

function saveToStorage<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('Failed to save to storage:', key);
  }
}

const initialMetric = METRICS_CONFIG[0];
const savedData = loadFromStorage<QualityDataPoint[] | null>(STORAGE_KEY_DATA, null);
const initialQualityData = savedData && savedData.length > 0 
  ? savedData 
  : generateQualityData(120, initialMetric.target, (initialMetric.usl - initialMetric.lsl) / 8);
const initialSubgroups = generateSubgroups(initialQualityData, 5);
const initialControlLimitsCalc = calculateXbarRControlLimits(initialSubgroups, 5);
const initialControlLimits: ControlLimits = {
  id: `cl-${Date.now()}`,
  metricName: initialMetric.name,
  ...initialControlLimitsCalc,
  usl: initialMetric.usl,
  lsl: initialMetric.lsl,
  target: initialMetric.target,
  calculatedAt: Date.now(),
  baselinePeriod: '历史稳定阶段',
  isActive: true,
};
const initialAlarms = checkNelsonRules(
  initialSubgroups.map(s => s.mean),
  initialControlLimits.cl,
  initialControlLimits.ucl,
  initialControlLimits.lcl,
  DEFAULT_NELSON_RULES,
  initialMetric.name
).map(a => ({
  ...a,
  metricId: initialMetric.id,
  shiftId: initialSubgroups[a.dataPointIndex]?.shiftId,
  machineId: initialSubgroups[a.dataPointIndex]?.machineId,
}));
const initialProcessCapability = calculateProcessCapability(
  initialQualityData.map(d => d.value),
  initialMetric.usl,
  initialMetric.lsl
);

const DEFAULT_BASELINES: BaselineVersion[] = [
  {
    id: `baseline-${Date.now() - 86400000}`,
    metricId: initialMetric.id,
    metricName: initialMetric.name,
    name: '初始基线 v1.0',
    controlLimits: initialControlLimits,
    sampleSize: initialQualityData.length,
    createdAt: Date.now() - 86400000 * 3,
    note: '项目启动时建立的初始控制限',
  },
];

interface SPCState {
  currentMetric: string;
  qualityData: QualityDataPoint[];
  subgroups: SubgroupData[];
  controlLimits: ControlLimits | null;
  alarms: AlarmRecord[];
  nelsonRules: NelsonRuleConfig[];
  processCapability: ProcessCapability | null;
  defectCauses: DefectCause[];
  shiftData: ShiftData[];
  machineData: MachineData[];
  reports: SPCReport[];
  baselines: BaselineVersion[];
  metricsConfig: typeof METRICS_CONFIG;
  subgroupSize: number;
  chartType: 'xbar-r' | 'i-mr';
  isRealTimeMode: boolean;
  lastUpdateTime: number;
  alarmFilter: AlarmFilter;
  highlightedDataPoint: number | null;

  setCurrentMetric: (metric: string) => void;
  setChartType: (type: 'xbar-r' | 'i-mr') => void;
  setSubgroupSize: (size: number) => void;
  toggleNelsonRule: (ruleId: number) => void;
  acknowledgeAlarm: (alarmId: string) => void;
  acknowledgeAllAlarms: () => void;
  addDataPoint: (point: QualityDataPoint) => void;
  recalculateControlLimits: () => void;
  toggleRealTimeMode: () => void;
  switchBatch: () => void;

  setAlarmFilter: (filter: AlarmFilter) => void;
  setHighlightedDataPoint: (index: number | null) => void;

  saveBaseline: (name: string, note?: string) => void;
  restoreBaseline: (baselineId: string) => void;
  deleteBaseline: (baselineId: string) => void;

  generateReport: (params: { name: string; periodStart: number; periodEnd: number; metricIds: string[] }) => Promise<SPCReport>;
  downloadReportPDF: (reportId: string) => Promise<void>;
  deleteReport: (reportId: string) => void;

  importCSVData: (csvContent: string) => Promise<{ success: boolean; message: string; importedCount: number }>;
  loadPersistedData: () => void;
}

export const useSPCStore = create<SPCState>((set, get) => ({
  currentMetric: initialMetric.id,
  qualityData: initialQualityData,
  subgroups: initialSubgroups,
  controlLimits: initialControlLimits,
  alarms: initialAlarms,
  nelsonRules: DEFAULT_NELSON_RULES,
  processCapability: {
    ...initialProcessCapability,
    sampleSize: initialQualityData.length,
    calculatedAt: Date.now(),
  },
  defectCauses: calculateDefectCausesFromData(
    initialQualityData,
    initialMetric.target,
    initialMetric.usl,
    initialMetric.lsl
  ),
  shiftData: calculateShiftData(
    initialQualityData,
    initialMetric.target,
    initialMetric.usl,
    initialMetric.lsl
  ),
  machineData: calculateMachineData(
    initialQualityData,
    initialMetric.target,
    initialMetric.usl,
    initialMetric.lsl
  ),
  reports: loadFromStorage<SPCReport[]>(STORAGE_KEY_REPORTS, []),
  baselines: loadFromStorage<BaselineVersion[]>(STORAGE_KEY_BASELINES, DEFAULT_BASELINES),
  metricsConfig: METRICS_CONFIG,
  subgroupSize: 5,
  chartType: 'xbar-r',
  isRealTimeMode: true,
  lastUpdateTime: Date.now(),
  alarmFilter: {},
  highlightedDataPoint: null,

  setCurrentMetric: (metricId) => {
    const metric = METRICS_CONFIG.find(m => m.id === metricId);
    if (!metric) return;

    const qualityData = generateQualityData(120, metric.target, (metric.usl - metric.lsl) / 8);
    const subgroups = generateSubgroups(qualityData, get().subgroupSize);
    const limitsCalc = calculateXbarRControlLimits(subgroups, get().subgroupSize);
    const controlLimits: ControlLimits = {
      id: `cl-${Date.now()}`,
      metricName: metric.name,
      ...limitsCalc,
      usl: metric.usl,
      lsl: metric.lsl,
      target: metric.target,
      calculatedAt: Date.now(),
      baselinePeriod: '历史稳定阶段',
      isActive: true,
    };
    const alarms = checkNelsonRules(
      subgroups.map(s => s.mean),
      controlLimits.cl,
      controlLimits.ucl,
      controlLimits.lcl,
      get().nelsonRules,
      metric.name
    ).map(a => ({
      ...a,
      metricId,
      shiftId: subgroups[a.dataPointIndex]?.shiftId,
      machineId: subgroups[a.dataPointIndex]?.machineId,
    }));
    const capability = calculateProcessCapability(
      qualityData.map(d => d.value),
      metric.usl,
      metric.lsl
    );

    set({
      currentMetric: metricId,
      qualityData,
      subgroups,
      controlLimits,
      alarms,
      processCapability: {
        ...capability,
        sampleSize: qualityData.length,
        calculatedAt: Date.now(),
      },
      defectCauses: calculateDefectCausesFromData(qualityData, metric.target, metric.usl, metric.lsl),
      shiftData: calculateShiftData(qualityData, metric.target, metric.usl, metric.lsl),
      machineData: calculateMachineData(qualityData, metric.target, metric.usl, metric.lsl),
      alarmFilter: {},
      highlightedDataPoint: null,
      lastUpdateTime: Date.now(),
    });
    saveToStorage(STORAGE_KEY_DATA, qualityData);
  },

  setChartType: (type) => {
    set({ chartType: type });
    
    const state = get();
    const metric = state.metricsConfig.find(m => m.id === state.currentMetric);
    let controlLimits: ControlLimits;
    let values: number[];
    let dataSources: { shiftId?: string; machineId?: string }[];
    
    if (type === 'i-mr') {
      values = state.qualityData.map(d => d.value);
      dataSources = state.qualityData;
      const limitsCalc = calculateIMRControlLimits(values);
      controlLimits = { ...state.controlLimits!, ...limitsCalc };
    } else {
      values = state.subgroups.map(s => s.mean);
      dataSources = state.subgroups;
      const limitsCalc = calculateXbarRControlLimits(state.subgroups, state.subgroupSize);
      controlLimits = { ...state.controlLimits!, ...limitsCalc };
    }
    
    const alarms = checkNelsonRules(
      values,
      controlLimits.cl,
      controlLimits.ucl,
      controlLimits.lcl,
      state.nelsonRules,
      metric?.name || ''
    ).map(a => ({
      ...a,
      metricId: state.currentMetric,
      shiftId: dataSources[a.dataPointIndex]?.shiftId,
      machineId: dataSources[a.dataPointIndex]?.machineId,
    }));

    set({ controlLimits, alarms });
  },

  setSubgroupSize: (size) => {
    const state = get();
    const subgroups = generateSubgroups(state.qualityData, size);
    const limitsCalc = calculateXbarRControlLimits(subgroups, size);
    const metric = state.metricsConfig.find(m => m.id === state.currentMetric);
    
    const controlLimits: ControlLimits = {
      ...state.controlLimits!,
      ...limitsCalc,
    };
    
    const alarms = checkNelsonRules(
      subgroups.map(s => s.mean),
      controlLimits.cl,
      controlLimits.ucl,
      controlLimits.lcl,
      state.nelsonRules,
      metric?.name || ''
    ).map(a => ({
      ...a,
      metricId: state.currentMetric,
      shiftId: subgroups[a.dataPointIndex]?.shiftId,
      machineId: subgroups[a.dataPointIndex]?.machineId,
    }));

    set({ subgroupSize: size, subgroups, controlLimits, alarms });
  },

  toggleNelsonRule: (ruleId) => {
    const state = get();
    const nelsonRules = state.nelsonRules.map(rule =>
      rule.id === ruleId ? { ...rule, enabled: !rule.enabled } : rule
    );
    
    const values = state.chartType === 'xbar-r'
      ? state.subgroups.map(s => s.mean)
      : state.qualityData.map(d => d.value);
    const dataSources = state.chartType === 'xbar-r' ? state.subgroups : state.qualityData;
    
    const alarms = checkNelsonRules(
      values,
      state.controlLimits!.cl,
      state.controlLimits!.ucl,
      state.controlLimits!.lcl,
      nelsonRules,
      state.metricsConfig.find(m => m.id === state.currentMetric)?.name || ''
    ).map(a => ({
      ...a,
      metricId: state.currentMetric,
      shiftId: dataSources[a.dataPointIndex]?.shiftId,
      machineId: dataSources[a.dataPointIndex]?.machineId,
    }));

    set({ nelsonRules, alarms });
  },

  acknowledgeAlarm: (alarmId) => {
    set(state => ({
      alarms: state.alarms.map(alarm =>
        alarm.id === alarmId
          ? { ...alarm, acknowledged: true, acknowledgedAt: Date.now(), acknowledgedBy: '当前用户' }
          : alarm
      ),
    }));
  },

  acknowledgeAllAlarms: () => {
    set(state => ({
      alarms: state.alarms.map(alarm => ({
        ...alarm,
        acknowledged: true,
        acknowledgedAt: Date.now(),
        acknowledgedBy: '当前用户',
      })),
    }));
  },

  addDataPoint: (point) => {
    const state = get();
    const qualityData = [...state.qualityData, point].slice(-200);
    
    let subgroups = state.subgroups;
    if (state.chartType === 'xbar-r') {
      subgroups = generateSubgroups(qualityData, state.subgroupSize);
    }

    const values = state.chartType === 'xbar-r'
      ? subgroups.map(s => s.mean)
      : qualityData.map(d => d.value);
    const dataSources = state.chartType === 'xbar-r' ? subgroups : qualityData;
    
    const metric = state.metricsConfig.find(m => m.id === state.currentMetric);
    
    const alarms = checkNelsonRules(
      values,
      state.controlLimits!.cl,
      state.controlLimits!.ucl,
      state.controlLimits!.lcl,
      state.nelsonRules,
      metric?.name || ''
    ).map(a => ({
      ...a,
      metricId: state.currentMetric,
      shiftId: dataSources[a.dataPointIndex]?.shiftId,
      machineId: dataSources[a.dataPointIndex]?.machineId,
    }));

    const capability = calculateProcessCapability(
      qualityData.map(d => d.value),
      metric?.usl,
      metric?.lsl
    );

    set({
      qualityData,
      subgroups,
      alarms,
      processCapability: {
        ...capability,
        sampleSize: qualityData.length,
        calculatedAt: Date.now(),
      },
      defectCauses: calculateDefectCausesFromData(
        qualityData,
        metric?.target || 50,
        metric?.usl,
        metric?.lsl
      ),
      shiftData: calculateShiftData(
        qualityData,
        metric?.target || 50,
        metric?.usl,
        metric?.lsl
      ),
      machineData: calculateMachineData(
        qualityData,
        metric?.target || 50,
        metric?.usl,
        metric?.lsl
      ),
      lastUpdateTime: Date.now(),
    });
    saveToStorage(STORAGE_KEY_DATA, qualityData);
  },

  recalculateControlLimits: () => {
    const state = get();
    const metric = state.metricsConfig.find(m => m.id === state.currentMetric);
    let limitsCalc;
    
    if (state.chartType === 'xbar-r') {
      limitsCalc = calculateXbarRControlLimits(state.subgroups, state.subgroupSize);
    } else {
      const values = state.qualityData.map(d => d.value);
      limitsCalc = calculateIMRControlLimits(values);
    }

    set({
      controlLimits: {
        ...state.controlLimits!,
        ...limitsCalc,
        calculatedAt: Date.now(),
      },
    });
  },

  toggleRealTimeMode: () => {
    set(state => ({ isRealTimeMode: !state.isRealTimeMode }));
  },

  switchBatch: () => {
    const state = get();
    const metric = state.metricsConfig.find(m => m.id === state.currentMetric);
    if (!metric) return;

    const newQualityData = generateQualityData(30, metric.target, (metric.usl - metric.lsl) / 8, Date.now());
    const qualityData = [...newQualityData];
    
    let subgroups: SubgroupData[] = [];
    if (state.chartType === 'xbar-r') {
      subgroups = generateSubgroups(qualityData, state.subgroupSize);
    }

    const limitsCalc = state.chartType === 'xbar-r'
      ? calculateXbarRControlLimits(subgroups, state.subgroupSize)
      : calculateIMRControlLimits(qualityData.map(d => d.value));

    const controlLimits: ControlLimits = {
      id: `cl-${Date.now()}`,
      metricName: metric.name,
      ...limitsCalc,
      usl: metric.usl,
      lsl: metric.lsl,
      target: metric.target,
      calculatedAt: Date.now(),
      baselinePeriod: `新批次 ${new Date().toLocaleDateString('zh-CN')}`,
      isActive: true,
    };

    const values = state.chartType === 'xbar-r'
      ? subgroups.map(s => s.mean)
      : qualityData.map(d => d.value);
    const dataSources = state.chartType === 'xbar-r' ? subgroups : qualityData;
    
    const alarms = checkNelsonRules(
      values,
      controlLimits.cl,
      controlLimits.ucl,
      controlLimits.lcl,
      state.nelsonRules,
      metric.name
    ).map(a => ({
      ...a,
      metricId: state.currentMetric,
      shiftId: dataSources[a.dataPointIndex]?.shiftId,
      machineId: dataSources[a.dataPointIndex]?.machineId,
    }));

    const capability = calculateProcessCapability(
      qualityData.map(d => d.value),
      metric.usl,
      metric.lsl
    );

    set({
      qualityData,
      subgroups,
      controlLimits,
      alarms,
      processCapability: {
        ...capability,
        sampleSize: qualityData.length,
        calculatedAt: Date.now(),
      },
      defectCauses: calculateDefectCausesFromData(qualityData, metric.target, metric.usl, metric.lsl),
      shiftData: calculateShiftData(qualityData, metric.target, metric.usl, metric.lsl),
      machineData: calculateMachineData(qualityData, metric.target, metric.usl, metric.lsl),
      lastUpdateTime: Date.now(),
    });
    saveToStorage(STORAGE_KEY_DATA, qualityData);
  },

  setAlarmFilter: (filter) => {
    set({ alarmFilter: filter });
  },

  setHighlightedDataPoint: (index) => {
    set({ highlightedDataPoint: index });
  },

  saveBaseline: (name, note) => {
    const state = get();
    if (!state.controlLimits) return;

    const newBaseline: BaselineVersion = {
      id: `baseline-${Date.now()}`,
      metricId: state.currentMetric,
      metricName: state.controlLimits.metricName,
      name,
      controlLimits: { ...state.controlLimits },
      sampleSize: state.qualityData.length,
      createdAt: Date.now(),
      note,
    };

    const baselines = [...state.baselines, newBaseline];
    set({ baselines });
    saveToStorage(STORAGE_KEY_BASELINES, baselines);
  },

  restoreBaseline: (baselineId) => {
    const state = get();
    const baseline = state.baselines.find(b => b.id === baselineId);
    if (!baseline) return;

    set({ controlLimits: { ...baseline.controlLimits, isActive: true } });
  },

  deleteBaseline: (baselineId) => {
    const state = get();
    const baselines = state.baselines.filter(b => b.id !== baselineId);
    set({ baselines });
    saveToStorage(STORAGE_KEY_BASELINES, baselines);
  },

  generateReport: async ({ name, periodStart, periodEnd, metricIds }) => {
    const state = get();
    const reportId = `report-${Date.now()}`;
    const metricNames = metricIds.map(id => 
      state.metricsConfig.find(m => m.id === id)?.name || id
    );

    const generatingReport: SPCReport = {
      id: reportId,
      name,
      createdAt: Date.now(),
      periodStart,
      periodEnd,
      metrics: metricIds,
      metricNames,
      status: 'generating',
      generatedBy: '当前用户',
    };

    const reports = [...state.reports, generatingReport];
    set({ reports });
    saveToStorage(STORAGE_KEY_REPORTS, reports);

    await new Promise(resolve => setTimeout(resolve, 800));

    const contents: ReportContentSnapshot[] = metricIds.map(metricId => {
      const metric = state.metricsConfig.find(m => m.id === metricId);
      const cl = state.controlLimits;
      const pc = state.processCapability;
      
      const ruleCounts: Record<string, number> = {};
      state.alarms.forEach(a => {
        if (a.metricId === metricId) {
          ruleCounts[a.ruleName] = (ruleCounts[a.ruleName] || 0) + 1;
        }
      });
      const topRules = Object.entries(ruleCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([ruleName, count]) => ({ ruleName, count }));
      
      const metricAlarms = state.alarms.filter(a => a.metricId === metricId);
      
      return {
        metricId,
        metricName: metric?.name || metricId,
        controlChart: {
          ucl: cl?.ucl || 0,
          cl: cl?.cl || 0,
          lcl: cl?.lcl || 0,
          uclR: cl?.uclR,
          clR: cl?.clR,
          lclR: cl?.lclR,
          usl: cl?.usl,
          lsl: cl?.lsl,
        },
        processCapability: {
          cp: pc?.cp || 0,
          cpk: pc?.cpk || 0,
          pp: pc?.pp || 0,
          ppk: pc?.ppk || 0,
          mean: pc?.mean || 0,
          stdDev: pc?.stdDevOverall || 0,
        },
        alarmSummary: {
          totalCount: metricAlarms.length,
          criticalCount: metricAlarms.filter(a => a.severity === 'critical').length,
          warningCount: metricAlarms.filter(a => a.severity === 'warning').length,
          topRules,
        },
        paretoData: state.defectCauses.slice(0, 8).map(d => ({
          name: d.name,
          count: d.count,
          percentage: d.percentage,
        })),
      };
    });

    const completedReport: SPCReport = {
      ...generatingReport,
      status: 'completed',
      content: contents,
    };

    const updatedReports = state.reports.map(r =>
      r.id === reportId ? completedReport : r
    );
    set({ reports: updatedReports });
    saveToStorage(STORAGE_KEY_REPORTS, updatedReports);

    return completedReport;
  },

  downloadReportPDF: async (reportId) => {
    const state = get();
    const report = state.reports.find(r => r.id === reportId);
    if (!report || !report.content || report.status !== 'completed') {
      throw new Error('报告不可导出');
    }

    const doc = new jsPDF();
    let yOffset = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('SPC 分析报告', pageWidth / 2, yOffset, { align: 'center' });
    yOffset += 15;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`报告名称: ${report.name}`, 20, yOffset);
    yOffset += 7;
    doc.text(`生成时间: ${new Date(report.createdAt).toLocaleString('zh-CN')}`, 20, yOffset);
    yOffset += 7;
    doc.text(`统计周期: ${new Date(report.periodStart).toLocaleDateString('zh-CN')} ~ ${new Date(report.periodEnd).toLocaleDateString('zh-CN')}`, 20, yOffset);
    yOffset += 7;
    doc.text(`分析指标: ${report.metricNames.join(', ')}`, 20, yOffset);
    yOffset += 15;

    doc.setDrawColor(0, 0, 0);
    doc.line(20, yOffset, pageWidth - 20, yOffset);
    yOffset += 10;

    report.content.forEach((content, idx) => {
      if (yOffset > pageHeight - 60) {
        doc.addPage();
        yOffset = 20;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text(`${idx + 1}. ${content.metricName}`, 20, yOffset);
      yOffset += 10;

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('控制图参数:', 25, yOffset);
      yOffset += 7;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`  UCL: ${content.controlChart.ucl.toFixed(4)}    CL: ${content.controlChart.cl.toFixed(4)}    LCL: ${content.controlChart.lcl.toFixed(4)}`, 30, yOffset);
      yOffset += 6;
      if (content.controlChart.usl !== undefined && content.controlChart.lsl !== undefined) {
        doc.text(`  USL: ${content.controlChart.usl.toFixed(4)}    LSL: ${content.controlChart.lsl.toFixed(4)}`, 30, yOffset);
        yOffset += 6;
      }
      yOffset += 4;

      if (yOffset > pageHeight - 80) {
        doc.addPage();
        yOffset = 20;
      }

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('过程能力指数:', 25, yOffset);
      yOffset += 7;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`  Cp=${content.processCapability.cp.toFixed(3)}  Cpk=${content.processCapability.cpk.toFixed(3)}  Pp=${content.processCapability.pp.toFixed(3)}  Ppk=${content.processCapability.ppk.toFixed(3)}`, 30, yOffset);
      yOffset += 6;
      doc.text(`  均值=${content.processCapability.mean.toFixed(4)}  标准差=${content.processCapability.stdDev.toFixed(4)}`, 30, yOffset);
      yOffset += 4;

      const cpkColor = content.processCapability.cpk >= 1.33 ? '良好' : content.processCapability.cpk >= 1.0 ? '一般' : '不足';
      doc.text(`  过程能力等级: ${cpkColor}`, 30, yOffset);
      yOffset += 8;

      if (yOffset > pageHeight - 80) {
        doc.addPage();
        yOffset = 20;
      }

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`报警摘要 (总计 ${content.alarmSummary.totalCount} 条):`, 25, yOffset);
      yOffset += 7;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`  严重: ${content.alarmSummary.criticalCount} 条    警告: ${content.alarmSummary.warningCount} 条`, 30, yOffset);
      yOffset += 6;
      if (content.alarmSummary.topRules.length > 0) {
        doc.text('  TOP违规规则:', 30, yOffset);
        yOffset += 5;
        content.alarmSummary.topRules.forEach(rule => {
          doc.text(`    - ${rule.ruleName}: ${rule.count} 次`, 35, yOffset);
          yOffset += 5;
        });
      }
      yOffset += 4;

      if (yOffset > pageHeight - 100) {
        doc.addPage();
        yOffset = 20;
      }

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('帕累托分析 (不合格原因TOP):', 25, yOffset);
      yOffset += 7;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      content.paretoData.forEach((item, pIdx) => {
        if (yOffset > pageHeight - 25) {
          doc.addPage();
          yOffset = 20;
        }
        doc.text(`  ${pIdx + 1}. ${item.name}: ${item.count}件 (${item.percentage}%)`, 30, yOffset);
        yOffset += 5;
      });
      yOffset += 10;
    });

    if (yOffset > pageHeight - 40) {
      doc.addPage();
      yOffset = pageHeight - 25;
    } else {
      yOffset = pageHeight - 25;
    }

    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('SPC 统计过程控制系统 - 分析报告自动生成', pageWidth / 2, yOffset, { align: 'center' });

    const fileName = `SPC报告_${report.name}_${new Date(report.createdAt).toISOString().slice(0, 10)}.pdf`;
    doc.save(fileName);
  },

  deleteReport: (reportId) => {
    const state = get();
    const reports = state.reports.filter(r => r.id !== reportId);
    set({ reports });
    saveToStorage(STORAGE_KEY_REPORTS, reports);
  },

  importCSVData: async (csvContent) => {
    try {
      const lines = csvContent.trim().split(/\r?\n/);
      if (lines.length < 2) {
        return { success: false, message: 'CSV数据为空或格式不正确', importedCount: 0 };
      }

      const headerLine = lines[0].toLowerCase();
      const headers = headerLine.split(',').map(h => h.trim());
      
      const idxTimestamp = headers.findIndex(h => h.includes('time') || h.includes('时间') || h.includes('date'));
      const idxValue = headers.findIndex(h => h.includes('value') || h.includes('数值') || h.includes('测量') || h.includes('指标'));
      const idxBatch = headers.findIndex(h => h.includes('batch') || h.includes('批次'));
      const idxShift = headers.findIndex(h => h.includes('shift') || h.includes('班次'));
      const idxMachine = headers.findIndex(h => h.includes('machine') || h.includes('机台') || h.includes('设备'));

      if (idxValue === -1) {
        return { success: false, message: '未找到测量值列，请确保包含 value/数值/测量值 字段', importedCount: 0 };
      }

      const state = get();
      const metric = state.metricsConfig.find(m => m.id === state.currentMetric);
      const newData: QualityDataPoint[] = [];

      const shifts = ['早班', '中班', '晚班'];
      const machines = ['CNC-001', 'CNC-002', 'CNC-003', 'CNC-004'];

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',');
        if (cols.length <= idxValue) continue;

        const value = parseFloat(cols[idxValue]);
        if (isNaN(value)) continue;

        let timestamp = Date.now() - (lines.length - i) * 5 * 60 * 1000;
        if (idxTimestamp !== -1 && cols[idxTimestamp]) {
          const parsed = Date.parse(cols[idxTimestamp].trim());
          if (!isNaN(parsed)) timestamp = parsed;
        }

        let batchId = idxBatch !== -1 && cols[idxBatch]?.trim() || `BATCH-${String(Math.floor(i / 48) + 1).padStart(3, '0')}`;
        let shiftId = idxShift !== -1 && cols[idxShift]?.trim() || shifts[i % 3];
        let machineId = idxMachine !== -1 && cols[idxMachine]?.trim() || machines[i % 4];

        newData.push({
          id: `csv-${Date.now()}-${i}`,
          timestamp,
          value,
          batchId,
          shiftId,
          machineId,
          subgroupIndex: Math.floor(i / 5),
        });
      }

      if (newData.length === 0) {
        return { success: false, message: '未能解析任何有效数据行', importedCount: 0 };
      }

      const qualityData = newData;
      const subgroups = generateSubgroups(qualityData, state.subgroupSize);
      const limitsCalc = calculateXbarRControlLimits(subgroups, state.subgroupSize);
      const controlLimits: ControlLimits = {
        id: `cl-import-${Date.now()}`,
        metricName: metric?.name || '导入数据',
        ...limitsCalc,
        usl: metric?.usl,
        lsl: metric?.lsl,
        target: metric?.target,
        calculatedAt: Date.now(),
        baselinePeriod: 'CSV导入数据基线',
        isActive: true,
      };

      const values = subgroups.map(s => s.mean);
      const alarms = checkNelsonRules(
        values,
        controlLimits.cl,
        controlLimits.ucl,
        controlLimits.lcl,
        state.nelsonRules,
        metric?.name || ''
      ).map(a => ({
        ...a,
        metricId: state.currentMetric,
        shiftId: subgroups[a.dataPointIndex]?.shiftId,
        machineId: subgroups[a.dataPointIndex]?.machineId,
      }));

      const capability = calculateProcessCapability(
        qualityData.map(d => d.value),
        metric?.usl,
        metric?.lsl
      );

      set({
        qualityData,
        subgroups,
        controlLimits,
        alarms,
        processCapability: {
          ...capability,
          sampleSize: qualityData.length,
          calculatedAt: Date.now(),
        },
        defectCauses: calculateDefectCausesFromData(
          qualityData,
          metric?.target || 50,
          metric?.usl,
          metric?.lsl
        ),
        shiftData: calculateShiftData(
          qualityData,
          metric?.target || 50,
          metric?.usl,
          metric?.lsl
        ),
        machineData: calculateMachineData(
          qualityData,
          metric?.target || 50,
          metric?.usl,
          metric?.lsl
        ),
        lastUpdateTime: Date.now(),
      });

      saveToStorage(STORAGE_KEY_DATA, qualityData);

      return {
        success: true,
        message: `成功导入 ${newData.length} 条数据`,
        importedCount: newData.length,
      };
    } catch (error) {
      return {
        success: false,
        message: `导入失败: ${error instanceof Error ? error.message : '未知错误'}`,
        importedCount: 0,
      };
    }
  },

  loadPersistedData: () => {
    const reports = loadFromStorage<SPCReport[]>(STORAGE_KEY_REPORTS, []);
    const baselines = loadFromStorage<BaselineVersion[]>(STORAGE_KEY_BASELINES, DEFAULT_BASELINES);
    const qualityData = loadFromStorage<QualityDataPoint[] | null>(STORAGE_KEY_DATA, null);

    if (reports.length > 0) set({ reports });
    if (baselines.length > 0) set({ baselines });
    if (qualityData && qualityData.length > 0) {
      const state = get();
      const metric = state.metricsConfig.find(m => m.id === state.currentMetric);
      const subgroups = generateSubgroups(qualityData, state.subgroupSize);
      const limitsCalc = calculateXbarRControlLimits(subgroups, state.subgroupSize);
      const controlLimits: ControlLimits = {
        id: `cl-loaded-${Date.now()}`,
        metricName: metric?.name || '',
        ...limitsCalc,
        usl: metric?.usl,
        lsl: metric?.lsl,
        target: metric?.target,
        calculatedAt: Date.now(),
        baselinePeriod: '加载历史数据',
        isActive: true,
      };
      const alarms = checkNelsonRules(
        subgroups.map(s => s.mean),
        controlLimits.cl,
        controlLimits.ucl,
        controlLimits.lcl,
        state.nelsonRules,
        metric?.name || ''
      ).map(a => ({
        ...a,
        metricId: state.currentMetric,
        shiftId: subgroups[a.dataPointIndex]?.shiftId,
        machineId: subgroups[a.dataPointIndex]?.machineId,
      }));
      const capability = calculateProcessCapability(
        qualityData.map(d => d.value),
        metric?.usl,
        metric?.lsl
      );

      set({
        qualityData,
        subgroups,
        controlLimits,
        alarms,
        processCapability: {
          ...capability,
          sampleSize: qualityData.length,
          calculatedAt: Date.now(),
        },
        defectCauses: calculateDefectCausesFromData(
          qualityData,
          metric?.target || 50,
          metric?.usl,
          metric?.lsl
        ),
        shiftData: calculateShiftData(
          qualityData,
          metric?.target || 50,
          metric?.usl,
          metric?.lsl
        ),
        machineData: calculateMachineData(
          qualityData,
          metric?.target || 50,
          metric?.usl,
          metric?.lsl
        ),
      });
    }
  },
}));
