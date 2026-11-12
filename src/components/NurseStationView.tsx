import React, { useMemo, useState } from 'react';
import { Search, X, AlertTriangle } from 'lucide-react';
import { Patient } from '../types';
import {
  getLatestTemp,
  getTodayDate,
  getTodayTemp,
  hasFever,
} from '../utils/clinical';

interface NurseStationViewProps {
  patients: Patient[];
  onRecordTemp: (patientId: string, tempC: number, note?: string) => void;
  onSelectPatient: (patient: Patient) => void;
}

export const NurseStationView: React.FC<NurseStationViewProps> = ({
  patients,
  onRecordTemp,
  onSelectPatient,
}) => {
  const today = getTodayDate();
  const [tab, setTab] = useState<'due' | 'completed'>('due');
  const [search, setSearch] = useState('');
  const [measureTarget, setMeasureTarget] = useState<Patient | null>(null);
  const [tempInput, setTempInput] = useState('37.2');
  const [obsNote, setObsNote] = useState('');
  const [allowCorrection, setAllowCorrection] = useState(false);
  const [formError, setFormError] = useState('');

  const activePatients = useMemo(
    () =>
      patients
        .filter((p) => p.status === 'admitted')
        .sort((a, b) => (a.roomNumber ?? 999) - (b.roomNumber ?? 999)),
    [patients]
  );

  const duePatients = useMemo(
    () => activePatients.filter((p) => !getTodayTemp(p, today)),
    [activePatients, today]
  );
  const completedPatients = useMemo(
    () => activePatients.filter((p) => Boolean(getTodayTemp(p, today))),
    [activePatients, today]
  );

  const list = useMemo(() => {
    const base = tab === 'due' ? duePatients : completedPatients;
    const q = search.trim().toLowerCase();
    if (!q) return base;
    return base.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        String(p.roomNumber ?? '').includes(q)
    );
  }, [tab, duePatients, completedPatients, search]);

  const openMeasureModal = (p: Patient) => {
    const existing = getTodayTemp(p, today);
    setMeasureTarget(p);
    setTempInput(existing ? String(existing.tempC) : '37.2');
    setObsNote('');
    setAllowCorrection(false);
    setFormError('');
  };

  const handleSaveMeasurement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!measureTarget) return;
    setFormError('');
    const existing = getTodayTemp(measureTarget, today);
    const val = parseFloat(tempInput);

    if (Number.isNaN(val) || val < 34.0 || val > 43.0) {
      setFormError('Temperature must be between 34.0°C and 43.0°C.');
      return;
    }
    if (existing && !allowCorrection) {
      setFormError(
        'Already recorded today. Enable correction mode to update.'
      );
      return;
    }
    if (existing && allowCorrection && obsNote.trim().length < 3) {
      setFormError('Observation note is required when correcting a reading.');
      return;
    }

    onRecordTemp(
      measureTarget.id,
      Number(val.toFixed(1)),
      obsNote.trim() || undefined
    );
    setMeasureTarget(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[24px] font-semibold tracking-tight text-[#192B3D]">
            Nurse Station
          </h1>
          <p className="mt-0.5 text-[12px] text-[#718096]">
            Daily temperature rounds for <span className="tabular-nums">{today}</span> ·
            Single-entry guard prevents duplicate measurements.
          </p>
        </div>

        <div className="tabular-nums flex items-center gap-4 rounded-md border border-[#E3E9EF] bg-white px-3.5 py-2 text-[12px]">
          <span>
            Due: <strong className="text-[#B7791F]">{duePatients.length}</strong>
          </span>
          <span className="h-3.5 w-[1px] bg-[#E3E9EF]" />
          <span>
            Completed:{' '}
            <strong className="text-[#16845B]">{completedPatients.length}</strong>
          </span>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#E3E9EF] bg-white p-3">
        <div className="flex gap-1">
          <button
            onClick={() => setTab('due')}
            className={`tabular-nums h-8 rounded-md px-3 text-[12px] font-medium transition-colors duration-150 cursor-pointer ${
              tab === 'due'
                ? 'bg-[#172B43] text-white'
                : 'text-[#718096] hover:bg-[#F6F8FA] hover:text-[#192B3D]'
            }`}
          >
            Measurements Due ({duePatients.length})
          </button>
          <button
            onClick={() => setTab('completed')}
            className={`tabular-nums h-8 rounded-md px-3 text-[12px] font-medium transition-colors duration-150 cursor-pointer ${
              tab === 'completed'
                ? 'bg-[#172B43] text-white'
                : 'text-[#718096] hover:bg-[#F6F8FA] hover:text-[#192B3D]'
            }`}
          >
            Measurements Completed ({completedPatients.length})
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#718096]" />
          <input
            type="text"
            placeholder="Filter room or patient..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 w-full rounded-md border border-[#E3E9EF] bg-[#F6F8FA] pl-8 pr-3 text-[12px] text-[#192B3D] focus:border-[#087F8C] focus:bg-white focus:outline-none"
          />
        </div>
      </div>

      {/* Compact Operational Table */}
      <div className="overflow-hidden rounded-lg border border-[#E3E9EF] bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="border-b border-[#E3E9EF] bg-[#F6F8FA] text-[10px] font-medium uppercase tracking-wider text-[#718096]">
              <tr>
                <th className="px-4 py-2.5">Room</th>
                <th className="px-4 py-2.5">Patient</th>
                <th className="px-4 py-2.5">Previous Reading</th>
                <th className="px-4 py-2.5">Priority / Status</th>
                <th className="px-4 py-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E3E9EF]">
              {list.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-10 text-center text-[12px] text-[#718096]"
                  >
                    {tab === 'due'
                      ? 'All active patients have completed today’s temperature measurement.'
                      : 'No measurements recorded yet today.'}
                  </td>
                </tr>
              ) : (
                list.map((p) => {
                  const tToday = getTodayTemp(p, today);
                  const latest = getLatestTemp(p);
                  const isUrgent = !tToday && latest && latest.tempC >= 38.5;

                  return (
                    <tr
                      key={p.id}
                      className="transition-colors duration-150 hover:bg-[#F6F8FA]"
                    >
                      <td className="tabular-nums px-4 py-2.5 font-semibold text-[#192B3D]">
                        Rm {p.roomNumber}
                      </td>
                      <td className="px-4 py-2.5">
                        <button
                          onClick={() => onSelectPatient(p)}
                          className="font-semibold text-[#192B3D] hover:text-[#087F8C] cursor-pointer"
                        >
                          {p.name}
                        </button>
                        <div className="tabular-nums text-[11px] text-[#718096]">
                          {p.id} · {p.age}y {p.gender}
                        </div>
                      </td>
                      <td className="tabular-nums px-4 py-2.5 text-[12px]">
                        {latest ? (
                          <span
                            className={`font-medium ${
                              hasFever(latest.tempC)
                                ? 'text-[#C23B3B]'
                                : 'text-[#16845B]'
                            }`}
                          >
                            {latest.tempC.toFixed(1)}°C ({latest.date})
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-[12px]">
                        {tToday ? (
                          <span className="tabular-nums font-medium text-[#16845B]">
                            Completed · {tToday.tempC.toFixed(1)}°C at{' '}
                            {tToday.time}
                          </span>
                        ) : isUrgent ? (
                          <span className="font-semibold text-[#C23B3B]">
                            Urgent · Prior high fever
                          </span>
                        ) : (
                          <span className="font-medium text-[#B7791F]">
                            Overdue / Due today
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <button
                          onClick={() => openMeasureModal(p)}
                          className={`h-7 rounded-md px-3 text-[11px] font-medium transition-colors duration-150 cursor-pointer ${
                            tToday
                              ? 'border border-[#E3E9EF] bg-white text-[#192B3D] hover:bg-[#F6F8FA]'
                              : 'bg-[#087F8C] text-white hover:bg-[#066974]'
                          }`}
                        >
                          {tToday ? 'Correct' : 'Record'}
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

      {/* Focused Measurement Modal */}
      {measureTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#172B43]/45 p-4"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={handleSaveMeasurement}
            className="w-full max-w-md rounded-lg border border-[#E3E9EF] bg-white shadow-lg"
          >
            <div className="flex items-center justify-between border-b border-[#E3E9EF] px-5 py-3.5">
              <div>
                <h3 className="text-[15px] font-semibold text-[#192B3D]">
                  Record Temperature
                </h3>
                <p className="tabular-nums text-[11px] text-[#718096]">
                  Room {measureTarget.roomNumber} · {measureTarget.name} (
                  {measureTarget.id})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMeasureTarget(null)}
                className="rounded-md p-1 text-[#718096] hover:bg-[#F6F8FA] cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3.5 p-5">
              {getTodayTemp(measureTarget, today) && (
                <div className="rounded-md border border-[#B7791F]/30 bg-[#B7791F]/5 p-3 text-[12px]">
                  <div className="flex items-center gap-1.5 font-medium text-[#B7791F]">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span>Duplicate Guard: Measurement already logged today</span>
                  </div>
                  <label className="mt-2 flex items-center gap-2 text-[#192B3D] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allowCorrection}
                      onChange={(e) => setAllowCorrection(e.target.checked)}
                      className="accent-[#087F8C]"
                    />
                    <span>Override for clinical correction</span>
                  </label>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-medium text-[#192B3D]">
                  Temperature (°C)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="34.0"
                  max="43.0"
                  autoFocus
                  value={tempInput}
                  onChange={(e) => setTempInput(e.target.value)}
                  disabled={
                    Boolean(getTodayTemp(measureTarget, today)) &&
                    !allowCorrection
                  }
                  className="tabular-nums mt-1 h-9 w-full rounded-md border border-[#E3E9EF] bg-white px-3 text-[14px] font-semibold text-[#192B3D] focus:border-[#087F8C] focus:outline-none disabled:bg-[#F6F8FA]"
                />
                <span className="mt-1 block text-[11px] text-[#718096]">
                  Fever threshold: ≥ 37.5°C · Valid range: 34.0–43.0°C
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#192B3D]">
                  Observation Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Optional clinical observations..."
                  value={obsNote}
                  onChange={(e) => setObsNote(e.target.value)}
                  disabled={
                    Boolean(getTodayTemp(measureTarget, today)) &&
                    !allowCorrection
                  }
                  className="mt-1 w-full rounded-md border border-[#E3E9EF] bg-white p-2.5 text-[13px] text-[#192B3D] focus:border-[#087F8C] focus:outline-none disabled:bg-[#F6F8FA]"
                />
              </div>

              {formError && (
                <p className="text-[12px] font-medium text-[#C23B3B]">
                  {formError}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-[#E3E9EF] bg-[#F6F8FA] px-5 py-3">
              <button
                type="button"
                onClick={() => setMeasureTarget(null)}
                className="h-8 rounded-md border border-[#E3E9EF] bg-white px-3.5 text-[12px] font-medium text-[#192B3D] hover:bg-[#F6F8FA] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={
                  Boolean(getTodayTemp(measureTarget, today)) &&
                  !allowCorrection
                }
                className="h-8 rounded-md bg-[#087F8C] px-4 text-[12px] font-medium text-white hover:bg-[#066974] disabled:cursor-not-allowed disabled:bg-[#E3E9EF] disabled:text-[#718096] cursor-pointer"
              >
                Save Measurement
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

