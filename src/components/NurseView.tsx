import React, { useMemo, useState } from 'react';
import {
  Thermometer,
  CheckCircle2,
  Clock,
  Search,
  AlertCircle,
} from 'lucide-react';
import { Patient } from '../types';
import {
  getConsecutiveNoFeverDays,
  getLatestTemp,
  getTodayDate,
  getTodayTemp,
  hasFever,
} from '../utils/clinical';

interface NurseViewProps {
  patients: Patient[];
  onSelectPatient: (patient: Patient) => void;
  onQuickRecordTemp: (patientId: string, tempC: number) => void;
}

type NurseFilter = 'pending' | 'recorded' | 'all';

export const NurseView: React.FC<NurseViewProps> = ({
  patients,
  onSelectPatient,
  onQuickRecordTemp,
}) => {
  const today = getTodayDate();
  const [filter, setFilter] = useState<NurseFilter>('pending');
  const [search, setSearch] = useState('');
  const [quickTemps, setQuickTemps] = useState<Record<string, string>>({});
  const [quickError, setQuickError] = useState<string>('');

  const activePatients = useMemo(
    () =>
      patients
        .filter((p) => p.status === 'admitted')
        .sort((a, b) => (a.roomNumber ?? 999) - (b.roomNumber ?? 999)),
    [patients]
  );

  const pendingCount = activePatients.filter(
    (p) => !getTodayTemp(p, today)
  ).length;
  const recordedCount = activePatients.length - pendingCount;
  const feverTodayCount = activePatients.filter((p) => {
    const t = getTodayTemp(p, today);
    return t && hasFever(t.tempC);
  }).length;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return activePatients.filter((p) => {
      const hasToday = Boolean(getTodayTemp(p, today));
      if (filter === 'pending' && hasToday) return false;
      if (filter === 'recorded' && !hasToday) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        String(p.roomNumber ?? '').includes(q)
      );
    });
  }, [activePatients, filter, search, today]);

  const handleQuickSave = (patientId: string) => {
    setQuickError('');
    const raw = quickTemps[patientId] ?? '37.2';
    const val = parseFloat(raw);
    if (Number.isNaN(val) || val < 34.0 || val > 43.0) {
      setQuickError('Temperature must be between 34.0°C and 43.0°C.');
      return;
    }
    onQuickRecordTemp(patientId, Number(val.toFixed(1)));
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-amber-800">
              Needs Temp Today
            </span>
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
          <p className="mt-2 text-3xl font-bold text-amber-950">
            {pendingCount}
          </p>
          <p className="mt-1 text-xs text-amber-800">
            Patients awaiting daily nurse check
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
              Recorded Today
            </span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-3xl font-bold text-emerald-950">
            {recordedCount}{' '}
            <span className="text-base font-medium text-emerald-700">
              / {activePatients.length}
            </span>
          </p>
          <p className="mt-1 text-xs text-emerald-800">
            Duplicate entries blocked automatically
          </p>
        </div>

        <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-rose-800">
              Fever Detected Today
            </span>
            <Thermometer className="h-4 w-4 text-rose-600" />
          </div>
          <p className="mt-2 text-3xl font-bold text-rose-950">
            {feverTodayCount}
          </p>
          <p className="mt-1 text-xs text-rose-800">
            Readings ≥ 37.5°C flagged for Doctor
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ['pending', `Needs Temp (${pendingCount})`],
              ['recorded', `Recorded Today (${recordedCount})`],
              ['all', `All Active (${activePatients.length})`],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                filter === key
                  ? 'bg-blue-600 text-white'
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
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-sm text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none"
          />
        </div>
      </div>

      {quickError && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-medium text-rose-800">
          <AlertCircle className="h-4 w-4 text-rose-600" />
          <span>{quickError}</span>
        </div>
      )}

      {/* Patient Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Room</th>
                <th className="px-4 py-3 font-semibold">Patient</th>
                <th className="px-4 py-3 font-semibold">Last Reading</th>
                <th className="px-4 py-3 font-semibold">No-Fever Streak</th>
                <th className="px-4 py-3 font-semibold">Today’s Status</th>
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
                    No patients match this filter.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => {
                  const todayTemp = getTodayTemp(p, today);
                  const latest = getLatestTemp(p);
                  const streak = getConsecutiveNoFeverDays(p.temperatures);

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3">
                        <span className="inline-flex h-7 min-w-12 items-center justify-center rounded-md bg-slate-900 px-2 text-xs font-bold text-white">
                          Rm {p.roomNumber}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => onSelectPatient(p)}
                          className="text-left font-semibold text-slate-900 hover:text-blue-600 cursor-pointer"
                        >
                          {p.name}
                        </button>
                        <div className="text-xs text-slate-500">
                          {p.id} · {p.age}y {p.gender}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {latest ? (
                          <div>
                            <span
                              className={`font-bold ${
                                hasFever(latest.tempC)
                                  ? 'text-rose-600'
                                  : 'text-emerald-700'
                              }`}
                            >
                              {latest.tempC.toFixed(1)}°C
                            </span>
                            <div className="text-slate-400">{latest.date}</div>
                          </div>
                        ) : (
                          <span className="text-slate-400">None</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            streak >= 3
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {streak} / 3 days
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {todayTemp ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700 ring-1 ring-emerald-200">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Logged {todayTemp.tempC.toFixed(1)}°C at{' '}
                            {todayTemp.time}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 font-semibold text-amber-800 ring-1 ring-amber-200">
                            <Clock className="h-3.5 w-3.5" />
                            Pending today
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {!todayTemp ? (
                          <div className="inline-flex items-center gap-1.5">
                            <input
                              type="number"
                              step="0.1"
                              min="34.0"
                              max="43.0"
                              aria-label={`Temperature for ${p.name}`}
                              value={quickTemps[p.id] ?? '37.2'}
                              onChange={(e) =>
                                setQuickTemps((prev) => ({
                                  ...prev,
                                  [p.id]: e.target.value,
                                }))
                              }
                              className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-900 focus:border-blue-500 focus:outline-none"
                            />
                            <button
                              onClick={() => handleQuickSave(p.id)}
                              className="rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-blue-700 cursor-pointer"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => onSelectPatient(p)}
                              className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 cursor-pointer"
                            >
                              Details
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => onSelectPatient(p)}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                          >
                            View / Correct
                          </button>
                        )}
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

