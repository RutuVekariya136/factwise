import React, { useMemo, useState } from 'react';
import {
  Stethoscope,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Search,
  Sparkles,
} from 'lucide-react';
import { Patient } from '../types';
import {
  getConsecutiveNoFeverDays,
  getTodayDate,
  getTodayTemp,
  getTodayVisit,
  hasFever,
  isDischargeEligible,
} from '../utils/clinical';

interface DoctorViewProps {
  patients: Patient[];
  onSelectPatient: (patient: Patient) => void;
}

type DoctorFilter =
  | 'ready'
  | 'eligible'
  | 'waiting_nurse'
  | 'visited'
  | 'all';

export const DoctorView: React.FC<DoctorViewProps> = ({
  patients,
  onSelectPatient,
}) => {
  const today = getTodayDate();
  const [filter, setFilter] = useState<DoctorFilter>('ready');
  const [search, setSearch] = useState('');

  const activePatients = useMemo(
    () =>
      patients
        .filter((p) => p.status === 'admitted')
        .sort((a, b) => (a.roomNumber ?? 999) - (b.roomNumber ?? 999)),
    [patients]
  );

  const readyCount = activePatients.filter(
    (p) => getTodayTemp(p, today) && !getTodayVisit(p, today)
  ).length;
  const eligibleCount = activePatients.filter((p) =>
    isDischargeEligible(p)
  ).length;
  const waitingNurseCount = activePatients.filter(
    (p) => !getTodayTemp(p, today) && !getTodayVisit(p, today)
  ).length;
  const visitedCount = activePatients.filter((p) =>
    getTodayVisit(p, today)
  ).length;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return activePatients.filter((p) => {
      const tToday = Boolean(getTodayTemp(p, today));
      const vToday = Boolean(getTodayVisit(p, today));
      const eligible = isDischargeEligible(p);

      if (filter === 'ready' && !(tToday && !vToday)) return false;
      if (filter === 'eligible' && !eligible) return false;
      if (filter === 'waiting_nurse' && !(!tToday && !vToday)) return false;
      if (filter === 'visited' && !vToday) return false;

      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        String(p.roomNumber ?? '').includes(q)
      );
    });
  }, [activePatients, filter, search, today]);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50/70 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-indigo-800">
              Ready for Visit
            </span>
            <Stethoscope className="h-4 w-4 text-indigo-600" />
          </div>
          <p className="mt-2 text-3xl font-bold text-indigo-950">
            {readyCount}
          </p>
          <p className="mt-1 text-xs text-indigo-800">
            Temp recorded today, awaiting doctor
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
              Discharge Eligible
            </span>
            <Sparkles className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-3xl font-bold text-emerald-950">
            {eligibleCount}
          </p>
          <p className="mt-1 text-xs text-emerald-800">
            3+ consecutive days fever-free
          </p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-amber-800">
              Waiting for Nurse
            </span>
            <ShieldAlert className="h-4 w-4 text-amber-600" />
          </div>
          <p className="mt-2 text-3xl font-bold text-amber-950">
            {waitingNurseCount}
          </p>
          <p className="mt-1 text-xs text-amber-800">
            Visit blocked until temp is logged
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
              Visited Today
            </span>
            <CheckCircle2 className="h-4 w-4 text-slate-500" />
          </div>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {visitedCount}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Completed daily doctor rounds
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ['ready', `Ready for Visit (${readyCount})`],
              ['eligible', `Discharge Eligible (${eligibleCount})`],
              ['waiting_nurse', `Waiting for Nurse (${waitingNurseCount})`],
              ['visited', `Visited Today (${visitedCount})`],
              ['all', `All Active (${activePatients.length})`],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                filter === key
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search room, name, or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-sm text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none"
          />
        </div>
      </div>

      {/* Patient Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Room</th>
                <th className="px-4 py-3 font-semibold">Patient</th>
                <th className="px-4 py-3 font-semibold">Today’s Temp</th>
                <th className="px-4 py-3 font-semibold">No-Fever Streak</th>
                <th className="px-4 py-3 font-semibold">Visit Status</th>
                <th className="px-4 py-3 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-sm text-slate-500"
                  >
                    No patients in this queue.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => {
                  const tToday = getTodayTemp(p, today);
                  const vToday = getTodayVisit(p, today);
                  const streak = getConsecutiveNoFeverDays(p.temperatures);
                  const eligible = isDischargeEligible(p);

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3">
                        <span className="inline-flex h-7 min-w-12 items-center justify-center rounded-md bg-slate-900 px-2 text-xs font-bold text-white">
                          Rm {p.roomNumber}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">
                          {p.name}
                        </div>
                        <div className="text-xs text-slate-500">
                          {p.id} · {p.age}y {p.gender}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {tToday ? (
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 font-bold ${
                              hasFever(tToday.tempC)
                                ? 'bg-rose-100 text-rose-700'
                                : 'bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            {tToday.tempC.toFixed(1)}°C ({tToday.time})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 font-semibold text-amber-800 ring-1 ring-amber-200">
                            <Clock className="h-3 w-3" />
                            Not recorded yet
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            eligible
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {eligible && <Sparkles className="h-3 w-3" />}
                          {streak} / 3 days
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {vToday ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Visited at {vToday.time}
                          </span>
                        ) : tToday ? (
                          <span className="font-semibold text-indigo-700">
                            Ready for visit
                          </span>
                        ) : (
                          <span className="font-medium text-amber-700">
                            Blocked (Needs temp)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => onSelectPatient(p)}
                          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                            !tToday
                              ? 'border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100'
                              : eligible
                                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                : vToday
                                  ? 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
                          }`}
                        >
                          {!tToday
                            ? 'View (Blocked)'
                            : eligible
                              ? 'Review & Discharge'
                              : vToday
                                ? 'Update Visit'
                                : 'Conduct Visit'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

