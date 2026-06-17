export interface QualityDataPoint {
  id: string;
  timestamp: number;
  value: number;
  batchId: string;
  shiftId: string;
  machineId: string;
  operatorId?: string;
  subgroupIndex?: number;
}

export interface SubgroupData {
  index: number;
  timestamp: number;
  values: number[];
  mean: number;
  range: number;
  batchId: string;
  shiftId: string;
  machineId: string;
}

export interface ControlLimits {
  id: string;
  metricName: string;
  ucl: number;
  cl: number;
  lcl: number;
  uclR?: number;
  clR?: number;
  lclR?: number;
  usl?: number;
  lsl?: number;
  target?: number;
  calculatedAt: number;
  baselinePeriod: string;
  isActive: boolean;
}

export interface NelsonRule {
  id: number;
  name: string;
  description: string;
  enabled: boolean;
  severity: 'warning' | 'critical';
  params?: Record<string, number>;
}

export interface AlarmRecord {
  id: string;
  timestamp: number;
  metricName: string;
  ruleId: number;
  ruleName: string;
  severity: 'warning' | 'critical';
  dataPointIndex: number;
  value: number;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: number;
}

export interface ProcessCapability {
  cp: number;
  cpk: number;
  pp: number;
  ppk: number;
  mean: number;
  stdDevWithin: number;
  stdDevOverall: number;
  usl?: number;
  lsl?: number;
  sampleSize: number;
  calculatedAt: number;
}

export interface DefectCause {
  id: string;
  name: string;
  category: string;
  count: number;
  percentage: number;
  cumulativePercentage: number;
}

export interface ShiftData {
  shiftId: string;
  shiftName: string;
  mean: number;
  stdDev: number;
  cpk: number;
  defectRate: number;
  sampleCount: number;
}

export interface MachineData {
  machineId: string;
  machineName: string;
  mean: number;
  stdDev: number;
  cpk: number;
  alarmCount: number;
  sampleCount: number;
}

export interface SPCReport {
  id: string;
  name: string;
  createdAt: number;
  periodStart: number;
  periodEnd: number;
  metrics: string[];
  status: 'generating' | 'completed' | 'failed';
}

export type ChartType = 'xbar-r' | 'i-mr';

export type SeverityLevel = 'success' | 'warning' | 'danger';
