import { calculateMean, calculateStdDev, calculateRange, calculateMovingRanges } from './statistics';
import { SubgroupData, ControlLimits } from '@/types';

const A2_TABLE: Record<number, number> = {
  2: 1.880, 3: 1.023, 4: 0.729, 5: 0.577,
  6: 0.483, 7: 0.419, 8: 0.373, 9: 0.337, 10: 0.308,
};

const D3_TABLE: Record<number, number> = {
  2: 0, 3: 0, 4: 0, 5: 0,
  6: 0, 7: 0.076, 8: 0.136, 9: 0.184, 10: 0.223,
};

const D4_TABLE: Record<number, number> = {
  2: 3.267, 3: 2.574, 4: 2.282, 5: 2.114,
  6: 2.004, 7: 1.924, 8: 1.864, 9: 1.816, 10: 1.777,
};

const D2_TABLE: Record<number, number> = {
  2: 1.128, 3: 1.693, 4: 2.059, 5: 2.326,
  6: 2.534, 7: 2.704, 8: 2.847, 9: 2.970, 10: 3.078,
};

export function getA2(subgroupSize: number): number {
  return A2_TABLE[subgroupSize] || A2_TABLE[5];
}

export function getD3(subgroupSize: number): number {
  return D3_TABLE[subgroupSize] ?? 0;
}

export function getD4(subgroupSize: number): number {
  return D4_TABLE[subgroupSize] || D4_TABLE[5];
}

export function getD2(subgroupSize: number): number {
  return D2_TABLE[subgroupSize] || D2_TABLE[5];
}

export function calculateXbarRControlLimits(
  subgroups: SubgroupData[],
  subgroupSize: number
): Omit<ControlLimits, 'id' | 'metricName' | 'calculatedAt' | 'baselinePeriod' | 'isActive'> {
  if (subgroups.length === 0) {
    return { ucl: 0, cl: 0, lcl: 0, uclR: 0, clR: 0, lclR: 0 };
  }

  const means = subgroups.map(s => s.mean);
  const ranges = subgroups.map(s => s.range);
  
  const doubleBar = calculateMean(means);
  const rBar = calculateMean(ranges);
  
  const A2 = getA2(subgroupSize);
  const D3 = getD3(subgroupSize);
  const D4 = getD4(subgroupSize);
  
  const ucl = doubleBar + A2 * rBar;
  const lcl = doubleBar - A2 * rBar;
  
  const uclR = D4 * rBar;
  const lclR = D3 * rBar;
  
  return {
    ucl,
    cl: doubleBar,
    lcl,
    uclR,
    clR: rBar,
    lclR,
  };
}

export function calculateIMRControlLimits(values: number[]): Omit<ControlLimits, 'id' | 'metricName' | 'calculatedAt' | 'baselinePeriod' | 'isActive'> {
  if (values.length < 2) {
    return { ucl: 0, cl: 0, lcl: 0, uclR: 0, clR: 0, lclR: 0 };
  }

  const mean = calculateMean(values);
  const movingRanges = calculateMovingRanges(values);
  const mrBar = calculateMean(movingRanges);
  
  const sigma = mrBar / 1.128;
  
  const ucl = mean + 3 * sigma;
  const lcl = mean - 3 * sigma;
  
  const uclR = 3.267 * mrBar;
  const lclR = 0;
  
  return {
    ucl,
    cl: mean,
    lcl,
    uclR,
    clR: mrBar,
    lclR,
  };
}

export function calculateProcessCapability(
  values: number[],
  usl?: number,
  lsl?: number
): { cp: number; cpk: number; pp: number; ppk: number; mean: number; stdDevWithin: number; stdDevOverall: number; } {
  const mean = calculateMean(values);
  const stdDevOverall = calculateStdDev(values, mean);
  
  const movingRanges = calculateMovingRanges(values);
  const mrBar = calculateMean(movingRanges);
  const stdDevWithin = mrBar / 1.128;
  
  let cp = 0;
  let cpk = 0;
  let pp = 0;
  let ppk = 0;
  
  if (usl !== undefined && lsl !== undefined && stdDevWithin > 0) {
    cp = (usl - lsl) / (6 * stdDevWithin);
    const cpu = (usl - mean) / (3 * stdDevWithin);
    const cpl = (mean - lsl) / (3 * stdDevWithin);
    cpk = Math.min(cpu, cpl);
  } else if (usl !== undefined && stdDevWithin > 0) {
    cpk = (usl - mean) / (3 * stdDevWithin);
  } else if (lsl !== undefined && stdDevWithin > 0) {
    cpk = (mean - lsl) / (3 * stdDevWithin);
  }
  
  if (usl !== undefined && lsl !== undefined && stdDevOverall > 0) {
    pp = (usl - lsl) / (6 * stdDevOverall);
    const ppu = (usl - mean) / (3 * stdDevOverall);
    const ppl = (mean - lsl) / (3 * stdDevOverall);
    ppk = Math.min(ppu, ppl);
  } else if (usl !== undefined && stdDevOverall > 0) {
    ppk = (usl - mean) / (3 * stdDevOverall);
  } else if (lsl !== undefined && stdDevOverall > 0) {
    ppk = (mean - lsl) / (3 * stdDevOverall);
  }
  
  return {
    cp: isNaN(cp) ? 0 : cp,
    cpk: isNaN(cpk) ? 0 : cpk,
    pp: isNaN(pp) ? 0 : pp,
    ppk: isNaN(ppk) ? 0 : ppk,
    mean,
    stdDevWithin,
    stdDevOverall,
  };
}

export function createSubgroups(
  values: number[],
  subgroupSize: number,
  timestamps: number[],
  batchId: string = 'BATCH-001',
  shiftId: string = 'SHIFT-001',
  machineId: string = 'MACHINE-001'
): SubgroupData[] {
  const subgroups: SubgroupData[] = [];
  const numSubgroups = Math.floor(values.length / subgroupSize);
  
  for (let i = 0; i < numSubgroups; i++) {
    const startIndex = i * subgroupSize;
    const endIndex = startIndex + subgroupSize;
    const subgroupValues = values.slice(startIndex, endIndex);
    const mean = calculateMean(subgroupValues);
    const range = calculateRange(subgroupValues);
    
    subgroups.push({
      index: i,
      timestamp: timestamps[endIndex - 1] || 0,
      values: subgroupValues,
      mean,
      range,
      batchId,
      shiftId,
      machineId,
    });
  }
  
  return subgroups;
}
