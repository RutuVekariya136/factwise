import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Activity,
  Stethoscope,
  ShieldCheck,
} from 'lucide-react';
import {
  MORTALITY_BENCHMARK_PCT,
  SUCCESS_BENCHMARK_PCT,
} from '../types';
import { FacilityStats } from '../utils/clinical';

interface HeadDoctorViewProps {
  stats: FacilityStats;
}

export const HeadDoctorView: React.FC<HeadDoctorViewProps> = ({ stats }) => {
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

  return (
    <div className="space-y-6">
      {/* Quality Benchmark Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <div
          className={`rounded-2xl border p-5 ${
            stats.isMortalityAboveBenchmark
              ? 'border-rose-300 bg-rose-50'
              : 'border-slate-200 bg-white'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
              Mortality Rate
            </span>
            {stats.isMortalityAboveBenchmark ? (
              <AlertTriangle className="h-5 w-5 text-rose-600" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            )}
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span
              className={`text-4xl font-bold ${
                stats.isMortalityAboveBenchmark
                  ? 'text-rose-700'
                  : 'text-slate-900'
              }`}
            >
              {stats.mortalityRatePct.toFixed(1)}%
            </span>
            <span className="text-xs font-medium text-slate-500">
              / {MORTALITY_BENCHMARK_PCT}% max limit
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-600">
            {stats.deceasedTotal} deceased out of {stats.resolvedTotal} resolved
            cases.
            {stats.isMortalityAboveBenchmark
              ? ' Exceeds benchmark — review treatment protocols.'
              : ' Within expected 15% threshold.'}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
              Treatment Success Rate
            </span>
            <TrendingUp className="h-5 w-5 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-4xl font-bold text-emerald-700">
              {stats.successRatePct.toFixed(1)}%
            </span>
            <span className="text-xs font-medium text-slate-500">
              / {SUCCESS_BENCHMARK_PCT}% target
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-600">
            {stats.dischargedTotal} patients cured &amp; discharged after 3
            fever-free days.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
              Facility Capacity
            </span>
            <Activity className="h-5 w-5 text-blue-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-4xl font-bold text-slate-900">
              {stats.occupiedCount}
            </span>
            <span className="text-xs font-medium text-slate-500">
              / {stats.totalRooms} rooms occupied
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-600">
            {stats.vacantCount} vacant · {stats.dischargePendingAdminCount}{' '}
            pending admin bed release.
          </p>
        </div>
      </div>

      {/* Daily Rounds Progress */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Nurse Daily Temperature Rounds
              </h3>
            </div>
            <span className="text-xs font-bold text-blue-700">{tempPct}%</span>
          </div>
          <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-blue-600 transition-all"
              style={{ width: `${tempPct}%` }}
            />
          </div>
          <div className="mt-3 flex justify-between text-xs text-slate-600">
            <span>{stats.tempRecordedTodayCount} recorded today</span>
            <span className="font-semibold text-amber-700">
              {stats.pendingTempCount} pending
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Doctor Daily Clinical Visits
              </h3>
            </div>
            <span className="text-xs font-bold text-indigo-700">
              {visitPct}%
            </span>
          </div>
          <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-indigo-600 transition-all"
              style={{ width: `${visitPct}%` }}
            />
          </div>
          <div className="mt-3 flex justify-between text-xs text-slate-600">
            <span>{stats.visitedTodayCount} visited today</span>
            <span>
              <strong className="text-indigo-700">
                {stats.readyForDoctorCount} ready
              </strong>{' '}
              ·{' '}
              <strong className="text-amber-700">
                {stats.waitingForTempBeforeDoctorCount} waiting on nurse
              </strong>
            </span>
          </div>
        </div>
      </div>

      {/* Discharge Pipeline & Safeguards */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-emerald-600" />
          <h3 className="text-sm font-bold text-slate-900">
            Active Discharge Pipeline &amp; Built-In Logical Constraints
          </h3>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl bg-slate-50 p-3 text-xs">
            <div className="font-bold text-slate-900">
              1. Single Daily Temp Guard
            </div>
            <p className="mt-1 text-slate-600">
              Prevents duplicate nurse measurements on the same day unless
              explicitly marked as a clinical correction.
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 text-xs">
            <div className="font-bold text-slate-900">
              2. Nurse-Before-Doctor Gate
            </div>
            <p className="mt-1 text-slate-600">
              Blocks routine doctor visits until today’s temperature is logged,
              eliminating wasted doctor trips.
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 text-xs">
            <div className="font-bold text-slate-900">
              3. 3-Day No-Fever Rule
            </div>
            <p className="mt-1 text-slate-600">
              Currently{' '}
              <strong>{stats.dischargeEligibleCount} patient(s)</strong>{' '}
              eligible. Standard discharge is locked until 3 consecutive days
              &lt; 37.5°C.
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 text-xs">
            <div className="font-bold text-slate-900">
              4. 74-Bed Capacity &amp; Handoff
            </div>
            <p className="mt-1 text-slate-600">
              Doctor approvals auto-populate Admin’s queue (
              <strong>{stats.dischargePendingAdminCount} pending</strong>).
              Admissions are blocked at 74/74 occupancy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

