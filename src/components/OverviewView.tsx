import React, { useMemo } from 'react';
import {
  AlertTriangle,
  UserPlus,
  ArrowRight,
} from 'lucide-react';
import {
  MORTALITY_BENCHMARK_PCT,
  NavSection,
  Patient,
  UserRole,
} from '../types';
import {
  FacilityStats,
  getConsecutiveNoFeverDays,
  getLatestTemp,
  getTodayDate,
  getTodayTemp,
  getTodayVisit,
  hasFever,
  isDischargeEligible,
} from '../utils/clinical';

interface OverviewViewProps {
  patients: Patient[];
  stats: FacilityStats;
  role: UserRole;
  onSelectPatient: (patient: Patient) => void;
  onNavigate: (section: NavSection) => void;
  onOpenAdmit: () => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  patients,
  stats,
  role,
  onSelectPatient,
  onNavigate,
  onOpenAdmit,
}) => {
  const today = getTodayDate();

  const tempPct =
    stats.activeAdmittedCount > 0
      ? Math.round(
          (stats.tempRecordedTodayCount / stats.activeAdmittedCount) * 100
        )
      : 0;
  const visitPct =
    stats.activeAdmittedCount > 0
      ? Math.round((stats.visitedTodayCount / stats.activeAdmittedCount) * 100)
      : 0;
  const occupancyPct = Math.round(
    (stats.occupiedCount / stats.totalRooms) * 100
  );

  // Patients needing immediate attention:
  // 1) Discharge eligible awaiting doctor sign-off
  // 2) High fever today (>= 38.5°C) not yet visited
  // 3) Pending nurse measurement today
  const attentionList = useMemo(() => {
    const active = patients.filter(
      (p) => p.status === 'admitted' || p.status === 'discharge_approved'
    );

    const scored = active
      .map((p) => {
        const tToday = getTodayTemp(p, today);
        const vToday = getTodayVisit(p, today);
        const latest = getLatestTemp(p);
        const eligible = isDischargeEligible(p);

        let priority = 0;
        let reason = '';
        let severity: 'critical' | 'warning' | 'success' | 'neutral' =
          'neutral';

        if (p.status === 'discharge_approved') {
          priority = 90;
          reason = 'Doctor confirmed — awaiting Admin bed release';
          severity = 'success';
        } else if (eligible && !vToday) {
          priority = 85;
          reason = '3-day no-fever met — ready for Doctor discharge review';
          severity = 'success';
        } else if (tToday && tToday.tempC >= 38.5 && !vToday) {
          priority = 100;
          reason = `High fever (${tToday.tempC.toFixed(1)}°C) — awaiting Doctor visit`;
          severity = 'critical';
        } else if (!tToday) {
          priority = 70;
          reason = 'Daily nurse temperature measurement due';
          severity = 'warning';
        } else if (tToday && !vToday) {
          priority = 60;
          reason = `Temp ${tToday.tempC.toFixed(1)}°C logged — awaiting Doctor visit`;
          severity = 'warning';
        }

        return { patient: p, priority, reason, severity, latest };
      })
      .filter((item) => item.priority > 0)
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 10);

    return scored;
  }, [patients, today]);

  return (
    <div className="space-y-5">
      {/* Top Section */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-[24px] font-semibold tracking-tight text-[#192B3D]">
              Facility Overview
            </h1>
            <span
              className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium ${
                stats.isMortalityAboveBenchmark
                  ? 'border-[#C23B3B]/30 bg-[#C23B3B]/5 text-[#C23B3B]'
                  : 'border-[#16845B]/30 bg-[#16845B]/5 text-[#16845B]'
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  stats.isMortalityAboveBenchmark
                    ? 'bg-[#C23B3B]'
                    : 'bg-[#16845B]'
                }`}
              />
              {stats.isMortalityAboveBenchmark
                ? 'Critical Mortality Alert'
                : 'Normal Operations'}
            </span>
          </div>
          <p className="mt-0.5 text-[12px] text-[#718096]">
            Operational snapshot for <span className="tabular-nums">{today}</span> ·
            Unit A (74 Rooms)
          </p>
        </div>

        <div className="flex items-center gap-2">
          {role === 'admin' && (
            <button
              onClick={onOpenAdmit}
              disabled={stats.vacantCount === 0}
              title={
                stats.vacantCount === 0
                  ? '74/74 rooms occupied — process a discharge first'
                  : 'Admit new patient'
              }
              className="flex h-8 items-center gap-1.5 rounded-md bg-[#087F8C] px-3.5 text-[12px] font-medium text-white transition-colors duration-150 hover:bg-[#066974] disabled:cursor-not-allowed disabled:bg-[#E3E9EF] disabled:text-[#718096] cursor-pointer"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>Quick Admit</span>
            </button>
          )}
          <button
            onClick={() =>
              onNavigate(
                role === 'doctor'
                  ? 'doctor_queue'
                  : role === 'admin'
                    ? 'discharge_management'
                    : 'nurse_station'
              )
            }
            className="flex h-8 items-center gap-1.5 rounded-md border border-[#E3E9EF] bg-white px-3 text-[12px] font-medium text-[#192B3D] transition-colors duration-150 hover:bg-[#F6F8FA] cursor-pointer"
          >
            <span>Open Work Queue</span>
            <ArrowRight className="h-3.5 w-3.5 text-[#718096]" />
          </button>
        </div>
      </div>

      {/* Critical Operational Alerts */}
      {(stats.isMortalityAboveBenchmark ||
        (stats.vacantCount === 0 && stats.dischargePendingAdminCount > 0)) && (
        <div className="space-y-2">
          {stats.isMortalityAboveBenchmark && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-[#C23B3B]/30 bg-[#C23B3B]/5 px-4 py-2.5 text-[12px] text-[#192B3D]">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-[#C23B3B]" />
                <span>
                  <strong className="font-semibold text-[#C23B3B]">
                    Mortality Benchmark Exceeded:
                  </strong>{' '}
                  Current rate is{' '}
                  <span className="tabular-nums font-semibold">
                    {stats.mortalityRatePct.toFixed(1)}%
                  </span>{' '}
                  (threshold {MORTALITY_BENCHMARK_PCT}%). Immediate clinical
                  review required.
                </span>
              </div>
              <button
                onClick={() => onNavigate('analytics')}
                className="text-[11px] font-semibold text-[#C23B3B] hover:underline cursor-pointer"
              >
                Inspect Analytics →
              </button>
            </div>
          )}

          {stats.vacantCount === 0 && stats.dischargePendingAdminCount > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-[#B7791F]/30 bg-[#B7791F]/5 px-4 py-2.5 text-[12px] text-[#192B3D]">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-[#B7791F]" />
                <span>
                  <strong className="font-semibold text-[#B7791F]">
                    Full Capacity (74/74 Beds):
                  </strong>{' '}
                  <span className="tabular-nums font-semibold">
                    {stats.dischargePendingAdminCount}
                  </span>{' '}
                  doctor-confirmed discharge(s) ready for Admin bed release.
                </span>
              </div>
              <button
                onClick={() => onNavigate('discharge_management')}
                className="text-[11px] font-semibold text-[#B7791F] hover:underline cursor-pointer"
              >
                Process Discharges →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Unified KPI Panel */}
      <div className="grid grid-cols-1 divide-y divide-[#E3E9EF] rounded-lg border border-[#E3E9EF] bg-white sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x">
        <div className="p-4">
          <div className="text-[11px] font-medium uppercase tracking-wider text-[#718096]">
            Occupied Beds
          </div>
          <div className="tabular-nums mt-1.5 text-[28px] font-semibold leading-tight text-[#192B3D]">
            {stats.occupiedCount}{' '}
            <span className="text-[14px] font-normal text-[#718096]">
              / {stats.totalRooms}
            </span>
          </div>
          <div className="mt-1 text-[11px] text-[#718096]">
            {stats.vacantCount === 0
              ? '100% capacity · 0 vacant'
              : `${stats.vacantCount} room(s) available`}
          </div>
        </div>

        <div className="p-4 sm:border-l sm:border-[#E3E9EF] lg:border-l-0">
          <div className="text-[11px] font-medium uppercase tracking-wider text-[#718096]">
            Temperature Completion
          </div>
          <div className="tabular-nums mt-1.5 text-[28px] font-semibold leading-tight text-[#192B3D]">
            {tempPct}%
          </div>
          <div className="tabular-nums mt-1 text-[11px] text-[#718096]">
            {stats.tempRecordedTodayCount} of {stats.activeAdmittedCount} logged
            · {stats.pendingTempCount} due
          </div>
        </div>

        <div className="p-4 sm:border-t sm:border-[#E3E9EF] lg:border-t-0">
          <div className="text-[11px] font-medium uppercase tracking-wider text-[#718096]">
            Pending Doctor Visits
          </div>
          <div className="tabular-nums mt-1.5 text-[28px] font-semibold leading-tight text-[#192B3D]">
            {stats.readyForDoctorCount}
          </div>
          <div className="tabular-nums mt-1 text-[11px] text-[#718096]">
            Ready now · {stats.waitingForTempBeforeDoctorCount} awaiting nurse
            temp
          </div>
        </div>

        <div className="p-4 sm:border-l sm:border-t sm:border-[#E3E9EF] lg:border-l-0 lg:border-t-0">
          <div className="text-[11px] font-medium uppercase tracking-wider text-[#718096]">
            Discharge Eligible
          </div>
          <div className="tabular-nums mt-1.5 text-[28px] font-semibold leading-tight text-[#192B3D]">
            {stats.dischargeEligibleCount}
          </div>
          <div className="tabular-nums mt-1 text-[11px] text-[#718096]">
            3d fever-free · {stats.dischargePendingAdminCount} doctor-confirmed
          </div>
        </div>
      </div>

      {/* Main Content: 2-Column Operational Split */}
      <div className="grid gap-5 lg:grid-cols-3">
        {/* Left: Patients Requiring Attention */}
        <div className="rounded-lg border border-[#E3E9EF] bg-white lg:col-span-2">
          <div className="flex items-center justify-between border-b border-[#E3E9EF] px-4 py-3">
            <div>
              <h2 className="text-[15px] font-semibold text-[#192B3D]">
                Patients Requiring Attention
              </h2>
              <p className="text-[11px] text-[#718096]">
                Prioritized by high fever, overdue daily measurements, and
                discharge readiness.
              </p>
            </div>
            <button
              onClick={() => onNavigate('patients')}
              className="text-[12px] font-medium text-[#087F8C] hover:underline cursor-pointer"
            >
              View Directory →
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="border-b border-[#E3E9EF] bg-[#F6F8FA] text-[10px] font-medium uppercase tracking-wider text-[#718096]">
                <tr>
                  <th className="px-4 py-2.5">Room</th>
                  <th className="px-4 py-2.5">Patient</th>
                  <th className="px-4 py-2.5">Latest Temp</th>
                  <th className="px-4 py-2.5">Required Action</th>
                  <th className="px-4 py-2.5 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E3E9EF]">
                {attentionList.map(({ patient: p, reason, severity, latest }) => {
                  const streak = getConsecutiveNoFeverDays(p.temperatures);
                  return (
                    <tr
                      key={p.id}
                      className="transition-colors duration-150 hover:bg-[#F6F8FA]"
                    >
                      <td className="tabular-nums px-4 py-2.5 font-semibold text-[#192B3D]">
                        Rm {p.roomNumber}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="font-medium text-[#192B3D]">
                          {p.name}
                        </div>
                        <div className="tabular-nums text-[11px] text-[#718096]">
                          {p.id} · {streak}/3d fever-free
                        </div>
                      </td>
                      <td className="tabular-nums px-4 py-2.5 font-medium">
                        {latest ? (
                          <span
                            className={
                              hasFever(latest.tempC)
                                ? 'text-[#C23B3B]'
                                : 'text-[#16845B]'
                            }
                          >
                            {latest.tempC.toFixed(1)}°C
                          </span>
                        ) : (
                          <span className="text-[#718096]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-[12px]">
                        <span
                          className={`inline-flex items-center gap-1.5 font-medium ${
                            severity === 'critical'
                              ? 'text-[#C23B3B]'
                              : severity === 'warning'
                                ? 'text-[#B7791F]'
                                : 'text-[#16845B]'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              severity === 'critical'
                                ? 'bg-[#C23B3B]'
                                : severity === 'warning'
                                  ? 'bg-[#B7791F]'
                                  : 'bg-[#16845B]'
                            }`}
                          />
                          {reason}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <button
                          onClick={() => onSelectPatient(p)}
                          className="rounded-md border border-[#E3E9EF] bg-white px-2.5 py-1 text-[11px] font-medium text-[#192B3D] hover:bg-[#F6F8FA] cursor-pointer"
                        >
                          Open
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Today's Operational Completion */}
        <div className="space-y-4">
          <div className="rounded-lg border border-[#E3E9EF] bg-white p-4">
            <h2 className="text-[15px] font-semibold text-[#192B3D]">
              Today’s Operational Completion
            </h2>
            <p className="mt-0.5 text-[11px] text-[#718096]">
              Shift progress across nursing, physician rounds, and bed turnover.
            </p>

            <div className="mt-4 space-y-4">
              <div>
                <div className="flex justify-between text-[12px]">
                  <span className="font-medium text-[#192B3D]">
                    Nurse Temperature Rounds
                  </span>
                  <span className="tabular-nums font-semibold text-[#192B3D]">
                    {tempPct}% ({stats.tempRecordedTodayCount}/
                    {stats.activeAdmittedCount})
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[#E3E9EF]">
                  <div
                    className="h-full bg-[#087F8C] transition-all duration-150"
                    style={{ width: `${tempPct}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[12px]">
                  <span className="font-medium text-[#192B3D]">
                    Doctor Clinical Visits
                  </span>
                  <span className="tabular-nums font-semibold text-[#192B3D]">
                    {visitPct}% ({stats.visitedTodayCount}/
                    {stats.activeAdmittedCount})
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[#E3E9EF]">
                  <div
                    className="h-full bg-[#172B43] transition-all duration-150"
                    style={{ width: `${visitPct}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[12px]">
                  <span className="font-medium text-[#192B3D]">
                    Facility Bed Occupancy
                  </span>
                  <span className="tabular-nums font-semibold text-[#192B3D]">
                    {occupancyPct}% ({stats.occupiedCount}/{stats.totalRooms})
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[#E3E9EF]">
                  <div
                    className={`h-full transition-all duration-150 ${
                      occupancyPct >= 100 ? 'bg-[#B7791F]' : 'bg-[#16845B]'
                    }`}
                    style={{ width: `${occupancyPct}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-[#E3E9EF] bg-white p-4">
            <h3 className="text-[13px] font-semibold text-[#192B3D]">
              Quality Benchmark Summary
            </h3>
            <div className="mt-3 divide-y divide-[#E3E9EF] text-[12px]">
              <div className="flex items-center justify-between py-2">
                <span className="text-[#718096]">Treatment Success Rate</span>
                <span className="tabular-nums font-semibold text-[#16845B]">
                  {stats.successRatePct.toFixed(1)}% (target 85%)
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-[#718096]">Mortality Rate</span>
                <span
                  className={`tabular-nums font-semibold ${
                    stats.isMortalityAboveBenchmark
                      ? 'text-[#C23B3B]'
                      : 'text-[#192B3D]'
                  }`}
                >
                  {stats.mortalityRatePct.toFixed(1)}% (limit 15%)
                </span>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-[#718096]">Resolved Cases</span>
                <span className="tabular-nums font-medium text-[#192B3D]">
                  {stats.dischargedTotal} cured · {stats.deceasedTotal} deceased
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

