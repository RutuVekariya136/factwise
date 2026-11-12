import React, { useMemo } from 'react';
import {
  MORTALITY_BENCHMARK_PCT,
  Patient,
  SUCCESS_BENCHMARK_PCT,
  TOTAL_ROOMS,
} from '../types';
import {
  FacilityStats,
  getAverageLengthOfStay,
  getDateOffset,
  getTodayDate,
} from '../utils/clinical';

interface AnalyticsViewProps {
  patients: Patient[];
  stats: FacilityStats;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  patients,
  stats,
}) => {
  const today = getTodayDate();
  const avgLos = useMemo(
    () => getAverageLengthOfStay(patients, today),
    [patients, today]
  );

  // 7-day occupancy trend computed from actual patient admission/discharge/deceased dates
  const occupancyTrend = useMemo(() => {
    const days: { date: string; label: string; occupied: number }[] = [];
    for (let offset = -6; offset <= 0; offset++) {
      const d = getDateOffset(offset);
      const count = patients.filter((p) => {
        if (p.admittedDate > d) return false;
        if (p.dischargedAt && p.dischargedAt <= d) return false;
        if (p.deceasedAt && p.deceasedAt <= d) return false;
        return true;
      }).length;
      days.push({
        date: d,
        label: d.slice(5),
        occupied: Math.min(TOTAL_ROOMS, count),
      });
    }
    return days;
  }, [patients]);

  // 7-day daily temperature measurement & doctor visit completion
  const dailyCompletion = useMemo(() => {
    const rows: {
      date: string;
      label: string;
      tempPct: number;
      visitPct: number;
    }[] = [];

    for (let offset = -6; offset <= 0; offset++) {
      const d = getDateOffset(offset);
      const activeOnDay = patients.filter((p) => {
        if (p.admittedDate > d) return false;
        if (p.dischargedAt && p.dischargedAt <= d) return false;
        if (p.deceasedAt && p.deceasedAt <= d) return false;
        return true;
      });
      const denom = activeOnDay.length || 1;
      const temps = activeOnDay.filter((p) =>
        p.temperatures.some((t) => t.date === d)
      ).length;
      const visits = activeOnDay.filter((p) =>
        p.visits.some((v) => v.date === d)
      ).length;

      rows.push({
        date: d,
        label: d.slice(5),
        tempPct: Math.round((temps / denom) * 100),
        visitPct: Math.round((visits / denom) * 100),
      });
    }
    return rows;
  }, [patients]);

  const tempTodayPct =
    stats.activeAdmittedCount > 0
      ? Math.round(
          (stats.tempRecordedTodayCount / stats.activeAdmittedCount) * 100
        )
      : 0;
  const visitTodayPct =
    stats.activeAdmittedCount > 0
      ? Math.round((stats.visitedTodayCount / stats.activeAdmittedCount) * 100)
      : 0;

  // SVG chart coordinates for 7-day occupancy
  const svgW = 460;
  const svgH = 140;
  const padL = 32;
  const padR = 16;
  const padT = 12;
  const padB = 24;
  const plotW = svgW - padL - padR;
  const plotH = svgH - padT - padB;

  const points = occupancyTrend
    .map((pt, idx) => {
      const x = padL + (idx / (occupancyTrend.length - 1)) * plotW;
      const y = padT + plotH - (pt.occupied / TOTAL_ROOMS) * plotH;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[24px] font-semibold tracking-tight text-[#192B3D]">
            Clinical Analytics
          </h1>
          <p className="mt-0.5 text-[12px] text-[#718096]">
            Treatment quality benchmarks, occupancy trend, and daily operational
            compliance ({getDateOffset(-6)} to {today}).
          </p>
        </div>
      </div>

      {/* Benchmark Comparison Row */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Mortality Rate vs 15% */}
        <div className="rounded-lg border border-[#E3E9EF] bg-white p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-[#718096]">
              Mortality Rate vs. 15% Limit
            </span>
            <span
              className={`text-[11px] font-semibold ${
                stats.isMortalityAboveBenchmark
                  ? 'text-[#C23B3B]'
                  : 'text-[#16845B]'
              }`}
            >
              {stats.isMortalityAboveBenchmark ? 'Above Limit' : 'On Target'}
            </span>
          </div>
          <div className="tabular-nums mt-2 flex items-baseline gap-2">
            <span
              className={`text-[28px] font-semibold ${
                stats.isMortalityAboveBenchmark
                  ? 'text-[#C23B3B]'
                  : 'text-[#192B3D]'
              }`}
            >
              {stats.mortalityRatePct.toFixed(1)}%
            </span>
            <span className="text-[12px] text-[#718096]">
              benchmark ≤ {MORTALITY_BENCHMARK_PCT}%
            </span>
          </div>
          <div className="relative mt-3 h-2 w-full rounded-full bg-[#E3E9EF]">
            <div
              className={`h-full rounded-full ${
                stats.isMortalityAboveBenchmark
                  ? 'bg-[#C23B3B]'
                  : 'bg-[#172B43]'
              }`}
              style={{
                width: `${Math.min(100, (stats.mortalityRatePct / 30) * 100)}%`,
              }}
            />
            {/* 15% benchmark marker (at 50% of 0-30% scale) */}
            <div
              className="absolute -top-1 bottom-0 h-4 w-[2px] bg-[#C23B3B]"
              style={{ left: '50%' }}
              title="15% benchmark"
            />
          </div>
          <div className="tabular-nums mt-1.5 flex justify-between text-[10px] text-[#718096]">
            <span>0%</span>
            <span>15% threshold</span>
            <span>30%</span>
          </div>
        </div>

        {/* Success Rate vs 85% */}
        <div className="rounded-lg border border-[#E3E9EF] bg-white p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-[#718096]">
              Treatment Success vs. 85% Target
            </span>
            <span className="text-[11px] font-semibold text-[#16845B]">
              {stats.successRatePct >= SUCCESS_BENCHMARK_PCT
                ? 'Meeting Target'
                : 'Below Target'}
            </span>
          </div>
          <div className="tabular-nums mt-2 flex items-baseline gap-2">
            <span className="text-[28px] font-semibold text-[#16845B]">
              {stats.successRatePct.toFixed(1)}%
            </span>
            <span className="text-[12px] text-[#718096]">
              benchmark ≥ {SUCCESS_BENCHMARK_PCT}%
            </span>
          </div>
          <div className="relative mt-3 h-2 w-full rounded-full bg-[#E3E9EF]">
            <div
              className="h-full rounded-full bg-[#16845B]"
              style={{ width: `${Math.min(100, stats.successRatePct)}%` }}
            />
            <div
              className="absolute -top-1 bottom-0 h-4 w-[2px] bg-[#172B43]"
              style={{ left: '85%' }}
              title="85% benchmark"
            />
          </div>
          <div className="tabular-nums mt-1.5 flex justify-between text-[10px] text-[#718096]">
            <span>0%</span>
            <span>85% target</span>
            <span>100%</span>
          </div>
        </div>

        {/* Average Length of Stay */}
        <div className="rounded-lg border border-[#E3E9EF] bg-white p-4">
          <div className="text-[11px] font-medium uppercase tracking-wider text-[#718096]">
            Average Length of Stay
          </div>
          <div className="tabular-nums mt-2 flex items-baseline gap-2">
            <span className="text-[28px] font-semibold text-[#192B3D]">
              {avgLos.toFixed(1)}
            </span>
            <span className="text-[12px] text-[#718096]">days / patient</span>
          </div>
          <p className="mt-3 text-[12px] text-[#718096]">
            Computed across{' '}
            <span className="tabular-nums font-medium text-[#192B3D]">
              {stats.occupiedCount + stats.dischargedTotal}
            </span>{' '}
            admitted &amp; cured patients. Timely 3-day discharge sign-off
            prevents 1–2 day bed overstays.
          </p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* 7-Day Occupancy Trend */}
        <div className="rounded-lg border border-[#E3E9EF] bg-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[15px] font-semibold text-[#192B3D]">
                7-Day Bed Occupancy Trend
              </h2>
              <p className="text-[11px] text-[#718096]">
                Occupied rooms per day (Capacity: 74 beds)
              </p>
            </div>
            <span className="tabular-nums text-[12px] font-semibold text-[#192B3D]">
              Today: {stats.occupiedCount}/74
            </span>
          </div>

          <div className="mt-3">
            <svg
              viewBox={`0 0 ${svgW} ${svgH}`}
              className="h-40 w-full overflow-visible"
              role="img"
              aria-label="7-day bed occupancy trend chart"
            >
              {/* Horizontal grid lines */}
              {[0, 37, 74].map((val) => {
                const y = padT + plotH - (val / TOTAL_ROOMS) * plotH;
                return (
                  <g key={val}>
                    <line
                      x1={padL}
                      y1={y}
                      x2={svgW - padR}
                      y2={y}
                      stroke="#E3E9EF"
                      strokeDasharray={val === 74 ? '3 3' : undefined}
                    />
                    <text
                      x={padL - 6}
                      y={y + 3}
                      textAnchor="end"
                      className="tabular-nums fill-[#718096] text-[10px]"
                    >
                      {val}
                    </text>
                  </g>
                );
              })}

              {/* Line */}
              <polyline
                fill="none"
                stroke="#087F8C"
                strokeWidth="2"
                points={points}
              />

              {/* Data Points + X Axis */}
              {occupancyTrend.map((pt, idx) => {
                const x = padL + (idx / (occupancyTrend.length - 1)) * plotW;
                const y = padT + plotH - (pt.occupied / TOTAL_ROOMS) * plotH;
                return (
                  <g key={pt.date}>
                    <circle cx={x} cy={y} r="3" fill="#087F8C" />
                    <text
                      x={x}
                      y={svgH - 4}
                      textAnchor="middle"
                      className="tabular-nums fill-[#718096] text-[10px]"
                    >
                      {pt.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Daily Measurement & Doctor Visit Completion */}
        <div className="rounded-lg border border-[#E3E9EF] bg-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[15px] font-semibold text-[#192B3D]">
                Daily Measurement &amp; Visit Completion
              </h2>
              <p className="text-[11px] text-[#718096]">
                Percentage of active patients measured by nurse &amp; visited by
                doctor
              </p>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-[#718096]">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-xs bg-[#087F8C]" /> Nurse Temp
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-xs bg-[#172B43]" /> Doctor
                Visit
              </span>
            </div>
          </div>

          <div className="mt-4 space-y-2.5">
            {dailyCompletion.map((row) => (
              <div key={row.date} className="grid grid-cols-12 items-center gap-2 text-[11px]">
                <span className="tabular-nums col-span-2 text-[#718096]">
                  {row.label}
                </span>
                <div className="col-span-8 space-y-1">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#E3E9EF]">
                    <div
                      className="h-full bg-[#087F8C]"
                      style={{ width: `${row.tempPct}%` }}
                    />
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#E3E9EF]">
                    <div
                      className="h-full bg-[#172B43]"
                      style={{ width: `${row.visitPct}%` }}
                    />
                  </div>
                </div>
                <span className="tabular-nums col-span-2 text-right font-medium text-[#192B3D]">
                  {row.tempPct}% / {row.visitPct}%
                </span>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-[#E3E9EF] pt-3 text-[11px] text-[#718096]">
            <span>
              Today’s Nurse Completion:{' '}
              <strong className="tabular-nums text-[#192B3D]">
                {tempTodayPct}%
              </strong>
            </span>
            <span>
              Today’s Doctor Completion:{' '}
              <strong className="tabular-nums text-[#192B3D]">
                {visitTodayPct}%
              </strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

