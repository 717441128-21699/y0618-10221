import { create } from 'zustand';
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

    const newControlLimits = { ...baseline.controlLimits, isActive: true };

    const values = state.chartType === 'xbar-r'
      ? state.subgroups.map(s => s.mean)
      : state.qualityData.map(d => d.value);
    const dataSources = state.chartType === 'xbar-r' ? state.subgroups : state.qualityData;

    const alarms = checkNelsonRules(
      values,
      newControlLimits.cl,
      newControlLimits.ucl,
      newControlLimits.lcl,
      state.nelsonRules,
      baseline.metricName
    ).map(a => ({
      ...a,
      metricId: state.currentMetric,
      shiftId: dataSources[a.dataPointIndex]?.shiftId,
      machineId: dataSources[a.dataPointIndex]?.machineId,
    }));

    const metric = state.metricsConfig.find(m => m.id === state.currentMetric);
    const shiftData = calculateShiftData(
      state.qualityData,
      metric?.target || 50,
      newControlLimits.usl,
      newControlLimits.lsl,
      newControlLimits
    );
    const machineData = calculateMachineData(
      state.qualityData,
      metric?.target || 50,
      newControlLimits.usl,
      newControlLimits.lsl,
      newControlLimits
    );

    set({
      controlLimits: newControlLimits,
      alarms,
      shiftData,
      machineData,
      highlightedDataPoint: null,
    });
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
      if (!metric) return null;

      const metricData = generateQualityData(120, metric.target, (metric.usl - metric.lsl) / 8, periodStart);
      const filteredData = metricData.filter(d => d.timestamp >= periodStart && d.timestamp <= periodEnd);
      const dataToUse = filteredData.length > 10 ? filteredData : metricData;

      const subgroups = generateSubgroups(dataToUse, state.subgroupSize);
      const limitsCalc = state.chartType === 'xbar-r'
        ? calculateXbarRControlLimits(subgroups, state.subgroupSize)
        : calculateIMRControlLimits(dataToUse.map(d => d.value));

      const controlLimits: ControlLimits = {
        id: `cl-report-${Date.now()}-${metricId}`,
        metricName: metric.name,
        ...limitsCalc,
        usl: metric.usl,
        lsl: metric.lsl,
        target: metric.target,
        calculatedAt: Date.now(),
        baselinePeriod: '报告统计区间',
        isActive: false,
      };

      const values = state.chartType === 'xbar-r'
        ? subgroups.map(s => s.mean)
        : dataToUse.map(d => d.value);
      const dataSources = state.chartType === 'xbar-r' ? subgroups : dataToUse;

      const alarms = checkNelsonRules(
        values,
        controlLimits.cl,
        controlLimits.ucl,
        controlLimits.lcl,
        state.nelsonRules,
        metric.name
      ).map(a => ({
        ...a,
        metricId,
        shiftId: dataSources[a.dataPointIndex]?.shiftId,
        machineId: dataSources[a.dataPointIndex]?.machineId,
      }));

      const capability = calculateProcessCapability(
        dataToUse.map(d => d.value),
        metric.usl,
        metric.lsl
      );

      const paretoData = calculateDefectCausesFromData(
        dataToUse,
        metric.target,
        metric.usl,
        metric.lsl
      ).slice(0, 8);

      const ruleCounts: Record<string, number> = {};
      alarms.forEach(a => {
        ruleCounts[a.ruleName] = (ruleCounts[a.ruleName] || 0) + 1;
      });
      const topRules = Object.entries(ruleCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([ruleName, count]) => ({ ruleName, count }));

      return {
        metricId,
        metricName: metric.name,
        sampleSize: dataToUse.length,
        controlChart: {
          ucl: controlLimits.ucl,
          cl: controlLimits.cl,
          lcl: controlLimits.lcl,
          uclR: controlLimits.uclR,
          clR: controlLimits.clR,
          lclR: controlLimits.lclR,
          usl: controlLimits.usl,
          lsl: controlLimits.lsl,
        },
        processCapability: {
          cp: capability.cp,
          cpk: capability.cpk,
          pp: capability.pp,
          ppk: capability.ppk,
          mean: capability.mean,
          stdDev: capability.stdDevOverall,
        },
        alarmSummary: {
          totalCount: alarms.length,
          criticalCount: alarms.filter(a => a.severity === 'critical').length,
          warningCount: alarms.filter(a => a.severity === 'warning').length,
          topRules,
        },
        paretoData: paretoData.map(d => ({
          name: d.name,
          count: d.count,
          percentage: d.percentage,
        })),
      };
    }).filter(Boolean) as ReportContentSnapshot[];

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

    const container = document.createElement('div');
    container.style.cssText = `
      position: fixed;
      left: -9999px;
      top: 0;
      width: 794px;
      background: #ffffff;
      padding: 40px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
      color: #1e293b;
      line-height: 1.6;
    `;

    const formatDate = (ts: number) => new Date(ts).toLocaleDateString('zh-CN');
    const formatDateTime = (ts: number) => new Date(ts).toLocaleString('zh-CN');

    let html = `
      <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #3b82f6;">
        <h1 style="font-size: 28px; font-weight: bold; color: #1e40af; margin: 0 0 10px 0;">SPC 分析报告</h1>
        <p style="font-size: 14px; color: #64748b; margin: 4px 0;"><b>报告名称：</b>${report.name}</p>
        <p style="font-size: 14px; color: #64748b; margin: 4px 0;"><b>生成时间：</b>${formatDateTime(report.createdAt)}</p>
        <p style="font-size: 14px; color: #64748b; margin: 4px 0;"><b>统计周期：</b>${formatDate(report.periodStart)} ~ ${formatDate(report.periodEnd)}</p>
        <p style="font-size: 14px; color: #64748b; margin: 4px 0;"><b>分析指标：</b>${report.metricNames.join('、')}</p>
      </div>
    `;

    report.content.forEach((content, idx) => {
      html += `
        <div style="margin-bottom: 35px; page-break-inside: avoid;">
          <h2 style="font-size: 18px; font-weight: bold; color: #1e40af; margin: 0 0 15px 0; padding-left: 10px; border-left: 4px solid #3b82f6;">
            ${idx + 1}. ${content.metricName}
          </h2>

          <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
            <h3 style="font-size: 14px; font-weight: bold; color: #334155; margin: 0 0 10px 0;">📊 控制图参数</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 13px; font-family: 'JetBrains Mono', Consolas, monospace;">
              <div><b>UCL：</b>${content.controlChart.ucl.toFixed(4)}</div>
              <div><b>CL：</b>${content.controlChart.cl.toFixed(4)}</div>
              <div><b>LCL：</b>${content.controlChart.lcl.toFixed(4)}</div>
              ${content.controlChart.usl !== undefined ? `<div><b>USL：</b>${content.controlChart.usl.toFixed(4)}</div>` : ''}
              ${content.controlChart.lsl !== undefined ? `<div><b>LSL：</b>${content.controlChart.lsl.toFixed(4)}</div>` : ''}
              ${content.controlChart.clR !== undefined ? `<div><b>CL-R：</b>${content.controlChart.clR.toFixed(4)}</div>` : ''}
            </div>
          </div>

          <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
            <h3 style="font-size: 14px; font-weight: bold; color: #166534; margin: 0 0 10px 0;">📈 过程能力指数</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 13px; font-family: 'JetBrains Mono', Consolas, monospace;">
              <div><b>Cp：</b>${content.processCapability.cp.toFixed(3)}</div>
              <div><b>Cpk：</b>${content.processCapability.cpk.toFixed(3)}</div>
              <div><b>Pp：</b>${content.processCapability.pp.toFixed(3)}</div>
              <div><b>Ppk：</b>${content.processCapability.ppk.toFixed(3)}</div>
              <div><b>均值：</b>${content.processCapability.mean.toFixed(4)}</div>
              <div><b>标准差：</b>${content.processCapability.stdDev.toFixed(4)}</div>
            </div>
            <div style="margin-top: 10px; padding: 8px 12px; border-radius: 4px; font-size: 13px;
              background: ${content.processCapability.cpk >= 1.33 ? '#dcfce7' : content.processCapability.cpk >= 1.0 ? '#fef3c7' : '#fee2e2'};
              color: ${content.processCapability.cpk >= 1.33 ? '#166534' : content.processCapability.cpk >= 1.0 ? '#92400e' : '#991b1b'};">
              <b>过程能力等级：</b>${content.processCapability.cpk >= 1.33 ? '✅ 良好' : content.processCapability.cpk >= 1.0 ? '⚠️ 一般' : '❌ 不足'}
              ${content.processCapability.cpk < 1.33 ? '（低于 1.33 阈值，需关注）' : ''}
            </div>
          </div>

          <div style="background: #fef2f2; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
            <h3 style="font-size: 14px; font-weight: bold; color: #991b1b; margin: 0 0 10px 0;">
              ⚠️ 报警摘要（总计 ${content.alarmSummary.totalCount} 条）
            </h3>
            <div style="display: flex; gap: 20px; font-size: 13px; margin-bottom: 10px;">
              <span><b style="color: #dc2626;">🔴 严重：</b>${content.alarmSummary.criticalCount} 条</span>
              <span><b style="color: #d97706;">🟡 警告：</b>${content.alarmSummary.warningCount} 条</span>
            </div>
            ${content.alarmSummary.topRules.length > 0 ? `
              <div style="font-size: 13px;">
                <b>TOP 违规规则：</b>
                <ul style="margin: 6px 0 0 0; padding-left: 20px;">
                  ${content.alarmSummary.topRules.map(r => `<li>${r.ruleName}：${r.count} 次</li>`).join('')}
                </ul>
              </div>
            ` : ''}
          </div>

          <div style="background: #eff6ff; padding: 15px; border-radius: 8px;">
            <h3 style="font-size: 14px; font-weight: bold; color: #1e40af; margin: 0 0 10px 0;">📉 帕累托分析（不合格原因 TOP）</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
              <thead>
                <tr style="background: #dbeafe;">
                  <th style="padding: 6px 10px; text-align: left; border: 1px solid #93c5fd;">排名</th>
                  <th style="padding: 6px 10px; text-align: left; border: 1px solid #93c5fd;">不合格原因</th>
                  <th style="padding: 6px 10px; text-align: right; border: 1px solid #93c5fd;">数量</th>
                  <th style="padding: 6px 10px; text-align: right; border: 1px solid #93c5fd;">占比</th>
                </tr>
              </thead>
              <tbody>
                ${content.paretoData.map((p, i) => `
                  <tr style="${i < 3 ? 'background: #fef3c7;' : ''}">
                    <td style="padding: 6px 10px; border: 1px solid #dbeafe; font-family: 'JetBrains Mono', Consolas, monospace;">${i + 1}</td>
                    <td style="padding: 6px 10px; border: 1px solid #dbeafe;">${p.name}</td>
                    <td style="padding: 6px 10px; text-align: right; border: 1px solid #dbeafe; font-family: 'JetBrains Mono', Consolas, monospace;">${p.count} 件</td>
                    <td style="padding: 6px 10px; text-align: right; border: 1px solid #dbeafe; font-family: 'JetBrains Mono', Consolas, monospace;">${p.percentage}%</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    });

    html += `
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #cbd5e1; text-align: center; font-size: 12px; color: #94a3b8;">
        SPC 统计过程控制系统 · 分析报告自动生成 · ${formatDateTime(Date.now())}
      </div>
    `;

    container.innerHTML = html;
    document.body.appendChild(container);

    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      const imgWidth = pageWidth - 20;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 10;

      doc.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= (pageHeight - 20);

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight + 10;
        doc.addPage();
        doc.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= (pageHeight - 20);
      }

      const fileName = `SPC报告_${report.name}_${new Date(report.createdAt).toISOString().slice(0, 10)}.pdf`;
      doc.save(fileName);
    } finally {
      document.body.removeChild(container);
    }
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
