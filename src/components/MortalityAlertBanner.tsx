import React from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { FacilityStats } from '../utils/clinical';
import { MORTALITY_BENCHMARK_PCT, SUCCESS_BENCHMARK_PCT } from '../types';

interface MortalityAlertBannerProps {
  stats: FacilityStats;
}

export const MortalityAlertBanner: React.FC<MortalityAlertBannerProps> = ({
  stats,
}) => {
  if (stats.isMortalityAboveBenchmark) {
    return (
      <div className="border-b border-rose-200 bg-rose-50 px-4 py-2.5 text-rose-900 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 text-sm">
          <div className="flex items-center gap-2 font-medium">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>
              CRITICAL QUALITY ALERT: Facility mortality rate is{' '}
              <strong>{stats.mortalityRatePct.toFixed(1)}%</strong> (exceeds{' '}
              {MORTALITY_BENCHMARK_PCT}% benchmark). Success rate:{' '}
              <strong>{stats.successRatePct.toFixed(1)}%</strong> (target{' '}
              {SUCCESS_BENCHMARK_PCT}%). Immediate clinical protocol review
              recommended.
            </span>
          </div>
          <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-800">
            {stats.deceasedTotal} Deceased / {stats.resolvedTotal} Resolved
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="border-b border-emerald-200/70 bg-emerald-50/70 px-4 py-2 text-emerald-900 sm:px-6">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 text-xs sm:text-sm">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>
            Treatment Quality On Target: Success Rate{' '}
            <strong>{stats.successRatePct.toFixed(1)}%</strong> (benchmark{' '}
            {SUCCESS_BENCHMARK_PCT}%) · Mortality Rate{' '}
            <strong>{stats.mortalityRatePct.toFixed(1)}%</strong> (limit{' '}
            {MORTALITY_BENCHMARK_PCT}%)
          </span>
        </div>
        <span className="font-medium text-emerald-800">
          Occupancy: {stats.occupiedCount}/{stats.totalRooms} Beds
        </span>
      </div>
    </div>
  );
};

