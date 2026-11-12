import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { ActivityEvent } from '../types';

interface ActivityLogViewProps {
  events: ActivityEvent[];
}

export const ActivityLogView: React.FC<ActivityLogViewProps> = ({ events }) => {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return events.filter((ev) => {
      if (typeFilter !== 'all' && ev.type !== typeFilter) return false;
      if (!q) return true;
      return (
        ev.patientName.toLowerCase().includes(q) ||
        ev.patientId.toLowerCase().includes(q) ||
        ev.actor.toLowerCase().includes(q) ||
        ev.summary.toLowerCase().includes(q) ||
        String(ev.roomNumber ?? '').includes(q)
      );
    });
  }, [events, search, typeFilter]);

  const getTypeLabel = (type: ActivityEvent['type']) => {
    switch (type) {
      case 'temp_recorded':
        return { text: 'Temperature', cls: 'text-[#087F8C]' };
      case 'temp_corrected':
        return { text: 'Temp Correction', cls: 'text-[#B7791F]' };
      case 'doctor_visit':
        return { text: 'Doctor Visit', cls: 'text-[#192B3D]' };
      case 'discharge_approved':
        return { text: 'Discharge Confirmed', cls: 'text-[#16845B]' };
      case 'discharged':
        return { text: 'Discharged', cls: 'text-[#16845B]' };
      case 'admitted':
        return { text: 'Admitted', cls: 'text-[#087F8C]' };
      case 'mortality':
        return { text: 'Mortality', cls: 'text-[#C23B3B]' };
      case 'doctor_visit_correction':
        return { text: 'Visit Correction', cls: 'text-[#B7791F]' };
      case 'doctor_visit_urgent_override':
        return { text: 'Urgent Override', cls: 'text-[#C23B3B]' };
      default:
        return { text: type, cls: 'text-[#718096]' };
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[24px] font-semibold tracking-tight text-[#192B3D]">
            Activity Log
          </h1>
          <p className="mt-0.5 text-[12px] text-[#718096]">
            Chronological clinical &amp; operational audit trail across Unit A.
          </p>
        </div>
        <span className="tabular-nums text-[12px] font-medium text-[#718096]">
          {filtered.length} events
        </span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#E3E9EF] bg-white p-3">
        <div className="flex flex-wrap gap-1">
          {[
            ['all', 'All Events'],
            ['temp_recorded', 'Temperatures'],
            ['doctor_visit', 'Doctor Visits'],
            ['discharge_approved', 'Confirmations'],
            ['discharged', 'Discharges'],
            ['admitted', 'Admissions'],
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTypeFilter(key)}
              className={`h-8 rounded-md px-3 text-[12px] font-medium transition-colors duration-150 cursor-pointer ${
                typeFilter === key
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
            placeholder="Search actor, patient, or room..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 w-full rounded-md border border-[#E3E9EF] bg-[#F6F8FA] pl-8 pr-3 text-[12px] text-[#192B3D] focus:border-[#087F8C] focus:bg-white focus:outline-none"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-[#E3E9EF] bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="border-b border-[#E3E9EF] bg-[#F6F8FA] text-[10px] font-medium uppercase tracking-wider text-[#718096]">
              <tr>
                <th className="px-4 py-2.5">Timestamp</th>
                <th className="px-4 py-2.5">Event</th>
                <th className="px-4 py-2.5">Actor</th>
                <th className="px-4 py-2.5">Patient / Room</th>
                <th className="px-4 py-2.5">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E3E9EF]">
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-10 text-center text-[12px] text-[#718096]"
                  >
                    No audit events match your filter.
                  </td>
                </tr>
              ) : (
                filtered.map((ev) => {
                  const meta = getTypeLabel(ev.type);
                  return (
                    <tr
                      key={ev.id}
                      className="transition-colors duration-150 hover:bg-[#F6F8FA]"
                    >
                      <td className="tabular-nums px-4 py-2.5 text-[12px] text-[#718096]">
                        {ev.timestamp}
                      </td>
                      <td className="px-4 py-2.5 text-[12px]">
                        <span className={`font-semibold ${meta.cls}`}>
                          {meta.text}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-[12px] font-medium text-[#192B3D]">
                        {ev.actor}
                      </td>
                      <td className="px-4 py-2.5 text-[12px]">
                        <span className="font-medium text-[#192B3D]">
                          {ev.patientName}
                        </span>{' '}
                        <span className="tabular-nums text-[#718096]">
                          ({ev.roomNumber ? `Rm ${ev.roomNumber}` : ev.patientId})
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-[12px] text-[#718096]">
                        {ev.summary}
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

