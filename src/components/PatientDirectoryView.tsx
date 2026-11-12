import React, { useMemo, useState } from 'react';
import { Search, ArrowUpDown } from 'lucide-react';
import { Patient, PatientStatus } from '../types';
import {
  getConsecutiveNoFeverDays,
  getLatestTemp,
  getTodayDate,
  getTodayTemp,
  getTodayVisit,
  hasFever,
} from '../utils/clinical';

interface PatientDirectoryViewProps {
  patients: Patient[];
  onSelectPatient: (patient: Patient) => void;
}

type SortKey = 'room' | 'name' | 'admittedDate' | 'temp' | 'streak';

export const PatientDirectoryView: React.FC<PatientDirectoryViewProps> = ({
  patients,
  onSelectPatient,
}) => {
  const today = getTodayDate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'active' | PatientStatus | 'all'>(
    'active'
  );
  const [sortKey, setSortKey] = useState<SortKey>('room');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return patients
      .filter((p) => {
        if (statusFilter === 'active') {
          if (p.status !== 'admitted' && p.status !== 'discharge_approved')
            return false;
        } else if (statusFilter !== 'all' && p.status !== statusFilter) {
          return false;
        }
        if (!q) return true;
        return (
          p.name.toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q) ||
          String(p.roomNumber ?? '').includes(q)
        );
      })
      .sort((a, b) => {
        const dir = sortAsc ? 1 : -1;
        if (sortKey === 'room') {
          return ((a.roomNumber ?? 999) - (b.roomNumber ?? 999)) * dir;
        }
        if (sortKey === 'name') {
          return a.name.localeCompare(b.name) * dir;
        }
        if (sortKey === 'admittedDate') {
          return a.admittedDate.localeCompare(b.admittedDate) * dir;
        }
        if (sortKey === 'temp') {
          const ta = getLatestTemp(a)?.tempC ?? 0;
          const tb = getLatestTemp(b)?.tempC ?? 0;
          return (ta - tb) * dir;
        }
        const sa = getConsecutiveNoFeverDays(a.temperatures);
        const sb = getConsecutiveNoFeverDays(b.temperatures);
        return (sa - sb) * dir;
      });
  }, [patients, search, statusFilter, sortKey, sortAsc]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[24px] font-semibold tracking-tight text-[#192B3D]">
            Patient Directory
          </h1>
          <p className="mt-0.5 text-[12px] text-[#718096]">
            Clinical registry across active admissions, confirmed discharges,
            and resolved cases.
          </p>
        </div>
        <span className="tabular-nums text-[12px] font-medium text-[#718096]">
          Showing {filtered.length} of {patients.length} records
        </span>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#E3E9EF] bg-white p-3">
        <div className="flex flex-wrap gap-1">
          {(
            [
              ['active', 'Occupied Rooms'],
              ['admitted', 'Admitted'],
              ['discharge_approved', 'Doctor Confirmed'],
              ['discharged', 'Discharged'],
              ['deceased', 'Deceased'],
              ['all', 'All Records'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={`h-8 rounded-md px-3 text-[12px] font-medium transition-colors duration-150 cursor-pointer ${
                statusFilter === key
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
            placeholder="Search ID, name, or room..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 w-full rounded-md border border-[#E3E9EF] bg-[#F6F8FA] pl-8 pr-3 text-[12px] text-[#192B3D] focus:border-[#087F8C] focus:bg-white focus:outline-none"
          />
        </div>
      </div>

      {/* Clinical Data Table */}
      <div className="overflow-hidden rounded-lg border border-[#E3E9EF] bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="border-b border-[#E3E9EF] bg-[#F6F8FA] text-[10px] font-medium uppercase tracking-wider text-[#718096]">
              <tr>
                <th className="px-4 py-2.5">Patient ID</th>
                <th className="px-4 py-2.5">
                  <button
                    onClick={() => handleSort('name')}
                    className="inline-flex items-center gap-1 hover:text-[#192B3D] cursor-pointer"
                  >
                    Patient Name <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-4 py-2.5">
                  <button
                    onClick={() => handleSort('room')}
                    className="inline-flex items-center gap-1 hover:text-[#192B3D] cursor-pointer"
                  >
                    Room <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-4 py-2.5">
                  <button
                    onClick={() => handleSort('admittedDate')}
                    className="inline-flex items-center gap-1 hover:text-[#192B3D] cursor-pointer"
                  >
                    Admission Date <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-4 py-2.5">
                  <button
                    onClick={() => handleSort('temp')}
                    className="inline-flex items-center gap-1 hover:text-[#192B3D] cursor-pointer"
                  >
                    Latest Temp <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-4 py-2.5">
                  <button
                    onClick={() => handleSort('streak')}
                    className="inline-flex items-center gap-1 hover:text-[#192B3D] cursor-pointer"
                  >
                    Fever-Free <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-4 py-2.5">Nurse Status</th>
                <th className="px-4 py-2.5">Doctor Status</th>
                <th className="px-4 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E3E9EF]">
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-10 text-center text-[12px] text-[#718096]"
                  >
                    No patient records match your current search or filter.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => {
                  const latest = getLatestTemp(p);
                  const tToday = getTodayTemp(p, today);
                  const vToday = getTodayVisit(p, today);
                  const streak = getConsecutiveNoFeverDays(p.temperatures);

                  return (
                    <tr
                      key={p.id}
                      onClick={() => onSelectPatient(p)}
                      className="transition-colors duration-150 hover:bg-[#F6F8FA] cursor-pointer"
                    >
                      <td className="tabular-nums px-4 py-2.5 text-[12px] text-[#718096]">
                        {p.id}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="font-semibold text-[#192B3D]">
                          {p.name}
                        </div>
                        <div className="tabular-nums text-[11px] text-[#718096]">
                          {p.age}y · {p.gender}
                        </div>
                      </td>
                      <td className="tabular-nums px-4 py-2.5 font-medium text-[#192B3D]">
                        {p.roomNumber ? `Rm ${p.roomNumber}` : '—'}
                      </td>
                      <td className="tabular-nums px-4 py-2.5 text-[12px] text-[#718096]">
                        {p.admittedDate}
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
                          '—'
                        )}
                      </td>
                      <td className="tabular-nums px-4 py-2.5 text-[12px]">
                        <span
                          className={
                            streak >= 3
                              ? 'font-semibold text-[#16845B]'
                              : 'text-[#718096]'
                          }
                        >
                          {streak} / 3d
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-[12px]">
                        {p.status !== 'admitted' ? (
                          <span className="text-[#718096] capitalize">
                            {p.status.replace('_', ' ')}
                          </span>
                        ) : tToday ? (
                          <span className="font-medium text-[#16845B]">
                            Logged {tToday.time}
                          </span>
                        ) : (
                          <span className="font-medium text-[#B7791F]">
                            Due today
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-[12px]">
                        {p.status !== 'admitted' ? (
                          <span className="text-[#718096]">—</span>
                        ) : vToday ? (
                          <span className="font-medium text-[#16845B]">
                            Visited {vToday.time}
                          </span>
                        ) : tToday ? (
                          <span className="font-medium text-[#087F8C]">
                            Ready
                          </span>
                        ) : (
                          <span className="text-[#718096]">Awaiting temp</span>
                        )}
                      </td>
                      <td
                        className="px-4 py-2.5 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => onSelectPatient(p)}
                          className="rounded-md border border-[#E3E9EF] bg-white px-2.5 py-1 text-[11px] font-medium text-[#192B3D] hover:bg-[#F6F8FA] cursor-pointer"
                        >
                          Inspect
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

