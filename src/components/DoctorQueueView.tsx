import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { Patient } from '../types';
import {
  getConsecutiveNoFeverDays,
  getTodayDate,
  getTodayTemp,
  getTodayVisit,
  hasFever,
  isDischargeEligible,
} from '../utils/clinical';

interface DoctorQueueViewProps {
  patients: Patient[];
  onSelectPatient: (patient: Patient) => void;
}

type QueueFilter = 'ready' | 'eligible' | 'waiting_nurse' | 'visited' | 'all';

export const DoctorQueueView: React.FC<DoctorQueueViewProps> = ({
  patients,
  onSelectPatient,
}) => {
  const today = getTodayDate();
  const [filter, setFilter] = useState<QueueFilter>('ready');
  const [search, setSearch] = useState('');

  const active = useMemo(
    () =>
      patients
        .filter((p) => p.status === 'admitted')
        .sort((a, b) => (a.roomNumber ?? 999) - (b.roomNumber ?? 999)),
    [patients]
  );

  const readyCount = active.filter(
    (p) => getTodayTemp(p, today) && !getTodayVisit(p, today)
  ).length;
  const eligibleCount = active.filter((p) => isDischargeEligible(p)).length;
  const waitingNurseCount = active.filter(
    (p) => !getTodayTemp(p, today) && !getTodayVisit(p, today)
  ).length;
  const visitedCount = active.filter((p) => getTodayVisit(p, today)).length;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return active.filter((p) => {
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
  }, [active, filter, search, today]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[24px] font-semibold tracking-tight text-[#192B3D]">
            Doctor Queue
          </h1>
          <p className="mt-0.5 text-[12px] text-[#718096]">
            Clinical rounding queue · Visits are gated until nursing staff
            records today’s temperature.
          </p>
        </div>

        <div className="tabular-nums flex items-center gap-4 rounded-md border border-[#E3E9EF] bg-white px-3.5 py-2 text-[12px]">
          <span>
            Ready: <strong className="text-[#087F8C]">{readyCount}</strong>
          </span>
          <span className="h-3.5 w-[1px] bg-[#E3E9EF]" />
          <span>
            3d Eligible:{' '}
            <strong className="text-[#16845B]">{eligibleCount}</strong>
          </span>
          <span className="h-3.5 w-[1px] bg-[#E3E9EF]" />
          <span>
            Blocked:{' '}
            <strong className="text-[#B7791F]">{waitingNurseCount}</strong>
          </span>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#E3E9EF] bg-white p-3">
        <div className="flex flex-wrap gap-1">
          {(
            [
              ['ready', `Ready for Visit (${readyCount})`],
              ['eligible', `Discharge Eligible (${eligibleCount})`],
              ['waiting_nurse', `Awaiting Nurse (${waitingNurseCount})`],
              ['visited', `Completed Today (${visitedCount})`],
              ['all', `All Active (${active.length})`],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`tabular-nums h-8 rounded-md px-3 text-[12px] font-medium transition-colors duration-150 cursor-pointer ${
                filter === key
                  ? 'bg-[#172B43] text-white'
                  : 'text-[#718096] hover:bg-[#F6F8FA] hover:text-[#192B3D]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#718096]" />
          <input
            type="text"
            placeholder="Search room or patient..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 w-full rounded-md border border-[#E3E9EF] bg-[#F6F8FA] pl-8 pr-3 text-[12px] text-[#192B3D] focus:border-[#087F8C] focus:bg-white focus:outline-none"
          />
        </div>
      </div>

      {/* Clinical Work Queue Table */}
      <div className="overflow-hidden rounded-lg border border-[#E3E9EF] bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="border-b border-[#E3E9EF] bg-[#F6F8FA] text-[10px] font-medium uppercase tracking-wider text-[#718096]">
              <tr>
                <th className="px-4 py-2.5">Patient Identity</th>
                <th className="px-4 py-2.5">Room</th>
                <th className="px-4 py-2.5">Today’s Temp</th>
                <th className="px-4 py-2.5">Temperature Trend (Last 4)</th>
                <th className="px-4 py-2.5">Previous Visit</th>
                <th className="px-4 py-2.5">Visit Status</th>
                <th className="px-4 py-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E3E9EF]">
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center text-[12px] text-[#718096]"
                  >
                    No patients in this queue.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => {
                  const tToday = getTodayTemp(p, today);
                  const vToday = getTodayVisit(p, today);
                  const prevVisit =
                    p.visits.length > 0
                      ? p.visits[p.visits.length - 1]
                      : null;
                  const last4 = p.temperatures.slice(-4);
                  const streak = getConsecutiveNoFeverDays(p.temperatures);
                  const eligible = isDischargeEligible(p);

                  return (
                    <tr
                      key={p.id}
                      className="transition-colors duration-150 hover:bg-[#F6F8FA]"
                    >
                      <td className="px-4 py-2.5">
                        <div className="font-semibold text-[#192B3D]">
                          {p.name}
                        </div>
                        <div className="tabular-nums text-[11px] text-[#718096]">
                          {p.id} · {p.age}y {p.gender} ·{' '}
                          <span
                            className={
                              eligible
                                ? 'font-semibold text-[#16845B]'
                                : 'text-[#718096]'
                            }
                          >
                            {streak}/3d fever-free
                          </span>
                        </div>
                      </td>
                      <td className="tabular-nums px-4 py-2.5 font-semibold text-[#192B3D]">
                        Rm {p.roomNumber}
                      </td>
                      <td className="tabular-nums px-4 py-2.5 text-[12px]">
                        {tToday ? (
                          <span
                            className={`font-semibold ${
                              hasFever(tToday.tempC)
                                ? 'text-[#C23B3B]'
                                : 'text-[#16845B]'
                            }`}
                          >
                            {tToday.tempC.toFixed(1)}°C
                          </span>
                        ) : (
                          <span className="font-medium text-[#B7791F]">
                            Pending nurse
                          </span>
                        )}
                      </td>
                      <td className="tabular-nums px-4 py-2.5 text-[11px]">
                        <div className="flex items-center gap-1">
                          {last4.map((t, i) => (
                            <React.Fragment key={t.date}>
                              <span
                                className={
                                  hasFever(t.tempC)
                                    ? 'font-medium text-[#C23B3B]'
                                    : 'font-medium text-[#16845B]'
                                }
                              >
                                {t.tempC.toFixed(1)}
                              </span>
                              {i < last4.length - 1 && (
                                <span className="text-[#718096]">→</span>
                              )}
                            </React.Fragment>
                          ))}
                        </div>
                      </td>
                      <td className="tabular-nums px-4 py-2.5 text-[12px] text-[#718096]">
                        {prevVisit
                          ? `${prevVisit.date} (${prevVisit.doctorName})`
                          : 'None'}
                      </td>
                      <td className="px-4 py-2.5 text-[12px]">
                        {vToday ? (
                          <span className="font-medium text-[#16845B]">
                            Visited · {vToday.time}
                          </span>
                        ) : tToday ? (
                          <span className="inline-flex items-center gap-1.5 font-medium text-[#B7791F]">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#B7791F]" />
                            Pending visit
                          </span>
                        ) : (
                          <span className="text-[#718096]">
                            Blocked (No temp)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <button
                          onClick={() => onSelectPatient(p)}
                          className={`h-7 rounded-md px-3 text-[11px] font-medium transition-colors duration-150 cursor-pointer ${
                            !tToday
                              ? 'border border-[#E3E9EF] bg-white text-[#718096] hover:bg-[#F6F8FA]'
                              : vToday
                                ? 'border border-[#E3E9EF] bg-white text-[#192B3D] hover:bg-[#F6F8FA]'
                                : 'bg-[#087F8C] text-white hover:bg-[#066974]'
                          }`}
                        >
                          {!tToday
                            ? 'View'
                            : vToday
                              ? 'Update'
                              : eligible
                                ? 'Review Discharge'
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

