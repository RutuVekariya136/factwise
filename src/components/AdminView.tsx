import React, { useState } from 'react';
import {
  BedDouble,
  LogOut,
  UserPlus,
  AlertTriangle,
  CheckCircle2,
  X,
} from 'lucide-react';
import { Patient, TOTAL_ROOMS } from '../types';
import {
  FacilityStats,
  getTodayDate,
  getTodayTemp,
  getVacantRooms,
  hasFever,
} from '../utils/clinical';

interface AdminViewProps {
  patients: Patient[];
  stats: FacilityStats;
  onCompleteDischarge: (patientId: string) => void;
  onAdmitPatient: (data: {
    name: string;
    age: number;
    gender: 'M' | 'F' | 'O';
    roomNumber: number;
    initialTempC: number;
  }) => void;
  onSelectPatient: (patient: Patient) => void;
}

export const AdminView: React.FC<AdminViewProps> = ({
  patients,
  stats,
  onCompleteDischarge,
  onAdmitPatient,
  onSelectPatient,
}) => {
  const today = getTodayDate();
  const vacantRooms = getVacantRooms(patients);
  const pendingDischarges = patients.filter(
    (p) => p.status === 'discharge_approved'
  );

  const [showAdmitModal, setShowAdmitModal] = useState(false);
  const [name, setName] = useState('');
  const [age, setAge] = useState('34');
  const [gender, setGender] = useState<'M' | 'F' | 'O'>('M');
  const [selectedRoom, setSelectedRoom] = useState<number>(
    vacantRooms[0] ?? 1
  );
  const [initialTemp, setInitialTemp] = useState('38.4');
  const [admitError, setAdmitError] = useState('');

  const openAdmit = () => {
    if (vacantRooms.length === 0) return;
    setSelectedRoom(vacantRooms[0]);
    setAdmitError('');
    setShowAdmitModal(true);
  };

  const handleAdmitSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAdmitError('');
    if (name.trim().length < 2) {
      setAdmitError('Please enter the patient’s full name.');
      return;
    }
    const parsedAge = parseInt(age, 10);
    if (Number.isNaN(parsedAge) || parsedAge < 0 || parsedAge > 120) {
      setAdmitError('Please enter a valid age (0–120).');
      return;
    }
    const parsedTemp = parseFloat(initialTemp);
    if (Number.isNaN(parsedTemp) || parsedTemp < 34 || parsedTemp > 43) {
      setAdmitError('Initial temperature must be between 34.0°C and 43.0°C.');
      return;
    }
    onAdmitPatient({
      name: name.trim(),
      age: parsedAge,
      gender,
      roomNumber: selectedRoom,
      initialTempC: Number(parsedTemp.toFixed(1)),
    });
    setName('');
    setShowAdmitModal(false);
  };

  const roomToPatient = new Map<number, Patient>();
  for (const p of patients) {
    if (
      (p.status === 'admitted' || p.status === 'discharge_approved') &&
      p.roomNumber !== null
    ) {
      roomToPatient.set(p.roomNumber, p);
    }
  }

  return (
    <div className="space-y-6">
      {/* Top KPIs & Admit Action */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Bed Occupancy
            </span>
            <BedDouble className="h-4 w-4 text-slate-600" />
          </div>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {stats.occupiedCount}{' '}
            <span className="text-base font-medium text-slate-500">
              / {stats.totalRooms}
            </span>
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {stats.vacantCount === 0
              ? 'At full capacity'
              : `${stats.vacantCount} room(s) vacant`}
          </p>
        </div>

        <div className="rounded-2xl border border-teal-200 bg-teal-50/70 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-teal-800">
              Pending Discharges
            </span>
            <LogOut className="h-4 w-4 text-teal-600" />
          </div>
          <p className="mt-2 text-3xl font-bold text-teal-950">
            {pendingDischarges.length}
          </p>
          <p className="mt-1 text-xs text-teal-800">
            Doctor-approved, ready for bed release
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
              Total Discharged
            </span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-3xl font-bold text-emerald-950">
            {stats.dischargedTotal}
          </p>
          <p className="mt-1 text-xs text-emerald-800">
            Cured (3-day no-fever protocol)
          </p>
        </div>

        <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              New Admission
            </span>
            <p className="mt-1 text-xs text-slate-600">
              {stats.vacantCount === 0
                ? 'Blocked: 74/74 rooms full. Process a discharge first.'
                : `${stats.vacantCount} vacant room(s) available for admission.`}
            </p>
          </div>
          <button
            onClick={openAdmit}
            disabled={stats.vacantCount === 0}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 cursor-pointer"
          >
            <UserPlus className="h-4 w-4" />
            <span>Admit New Patient</span>
          </button>
        </div>
      </div>

      {stats.vacantCount === 0 && (
        <div className="flex items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
          <span>
            <strong>Capacity Constraint Active:</strong> All {TOTAL_ROOMS} rooms
            are currently occupied. New admissions are disabled until a pending
            discharge is completed below.
          </span>
        </div>
      )}

      {/* Pending Discharges Queue */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Pending Discharges Queue (Doctor Approved)
            </h2>
            <p className="text-xs text-slate-500">
              Instant handoff from Doctor rounds — process immediately to free
              beds for incoming patients.
            </p>
          </div>
          <span className="rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-bold text-teal-800">
            {pendingDischarges.length} Ready
          </span>
        </div>

        {pendingDischarges.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500">
            No pending discharges right now. Patients approved by a Doctor will
            appear here automatically.
          </p>
        ) : (
          <div className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200">
            {pendingDischarges.map((p) => (
              <div
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-3 p-3.5 hover:bg-slate-50"
              >
                <div className="flex items-center gap-3">
                  <span className="rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-bold text-white">
                    Rm {p.roomNumber}
                  </span>
                  <div>
                    <button
                      onClick={() => onSelectPatient(p)}
                      className="text-sm font-semibold text-slate-900 hover:text-blue-600 cursor-pointer"
                    >
                      {p.name}
                    </button>
                    <p className="text-xs text-slate-500">
                      {p.id} · Approved at {p.dischargeApprovedAt}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => onCompleteDischarge(p.id)}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Complete Discharge &amp; Free Room</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 74-Room Facility Map */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              74-Room Facility Bed Map
            </h2>
            <p className="text-xs text-slate-500">
              Click any occupied room to inspect patient vitals and clinical
              status.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-[11px] font-medium text-slate-600">
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-xs bg-emerald-500" /> Vacant
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-xs bg-teal-500" /> Discharge
              Ready
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-xs bg-rose-500" /> Fever
              Today
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-xs bg-blue-500" /> No Fever
              Today
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-xs bg-amber-400" /> Needs
              Temp
            </span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-5 gap-2 sm:grid-cols-10 md:grid-cols-12 lg:grid-cols-15">
          {Array.from({ length: TOTAL_ROOMS }, (_, i) => i + 1).map((room) => {
            const occupant = roomToPatient.get(room);
            if (!occupant) {
              return (
                <button
                  key={room}
                  onClick={() => {
                    setSelectedRoom(room);
                    setShowAdmitModal(true);
                  }}
                  title={`Room ${room}: Vacant — click to admit`}
                  className="flex flex-col items-center justify-center rounded-lg border border-emerald-300 bg-emerald-50 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 cursor-pointer"
                >
                  <span>{room}</span>
                  <span className="text-[9px] font-medium uppercase">Free</span>
                </button>
              );
            }

            const tToday = getTodayTemp(occupant, today);
            let style =
              'border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100';
            let sub = 'No Temp';

            if (occupant.status === 'discharge_approved') {
              style =
                'border-teal-400 bg-teal-100 text-teal-950 hover:bg-teal-200';
              sub = 'Disch.';
            } else if (tToday) {
              if (hasFever(tToday.tempC)) {
                style =
                  'border-rose-300 bg-rose-50 text-rose-900 hover:bg-rose-100';
                sub = `${tToday.tempC.toFixed(1)}°`;
              } else {
                style =
                  'border-blue-300 bg-blue-50 text-blue-900 hover:bg-blue-100';
                sub = `${tToday.tempC.toFixed(1)}°`;
              }
            }

            return (
              <button
                key={room}
                onClick={() => onSelectPatient(occupant)}
                title={`Room ${room}: ${occupant.name}`}
                className={`flex flex-col items-center justify-center rounded-lg border py-2 text-xs font-bold transition cursor-pointer ${style}`}
              >
                <span>{room}</span>
                <span className="text-[9px] font-medium">{sub}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Admit Patient Modal */}
      {showAdmitModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={handleAdmitSubmit}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-200"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                Admit New Patient
              </h3>
              <button
                type="button"
                onClick={() => setShowAdmitModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Patient Full Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Meera Krishnan"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    Age
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="120"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    Gender
                  </label>
                  <select
                    value={gender}
                    onChange={(e) =>
                      setGender(e.target.value as 'M' | 'F' | 'O')
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  >
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                    <option value="O">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    Assign Room
                  </label>
                  <select
                    value={selectedRoom}
                    onChange={(e) => setSelectedRoom(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  >
                    {vacantRooms.map((r) => (
                      <option key={r} value={r}>
                        Room {r}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    Admission Temp (°C)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="34.0"
                    max="43.0"
                    value={initialTemp}
                    onChange={(e) => setInitialTemp(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {admitError && (
                <p className="text-xs font-medium text-rose-600">
                  {admitError}
                </p>
              )}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAdmitModal(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 cursor-pointer"
              >
                Confirm Admission
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

