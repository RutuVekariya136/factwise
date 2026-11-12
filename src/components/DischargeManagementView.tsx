import React, { useMemo, useState } from 'react';
import { UserPlus, AlertTriangle, Check, Lock } from 'lucide-react';
import { Patient, ROLE_PERMISSIONS, TOTAL_ROOMS, UserRole } from '../types';
import {
  FacilityStats,
  getConsecutiveNoFeverDays,
  hasFever,
  isDischargeEligible,
} from '../utils/clinical';

interface DischargeManagementViewProps {
  patients: Patient[];
  stats: FacilityStats;
  role: UserRole;  // FIX 3: role required to gate finalize action
  onCompleteDischarge: (patientId: string, callerRole: UserRole) => void;
  onSelectPatient: (patient: Patient) => void;
  onOpenAdmit: () => void;
}

type PipelineStage =
  | 'approaching'
  | 'eligible'
  | 'confirmed'
  | 'discharged';

export const DischargeManagementView: React.FC<
  DischargeManagementViewProps
> = ({
  patients,
  stats,
  role,
  onCompleteDischarge,
  onSelectPatient,
  onOpenAdmit,
}) => {
  const [stage, setStage] = useState<PipelineStage>('confirmed');
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [showBedGrid, setShowBedGrid] = useState(false);

  // FIX 3: derived permission
  const canFinalize = ROLE_PERMISSIONS[role].canFinalizeDischarge;

  const approaching = useMemo(
    () =>
      patients.filter(
        (p) =>
          p.status === 'admitted' &&
          getConsecutiveNoFeverDays(p.temperatures) === 2
      ),
    [patients]
  );

  const eligible = useMemo(
    () => patients.filter((p) => isDischargeEligible(p)),
    [patients]
  );

  const confirmed = useMemo(
    () => patients.filter((p) => p.status === 'discharge_approved'),
    [patients]
  );

  const discharged = useMemo(
    () =>
      patients
        .filter((p) => p.status === 'discharged')
        .sort((a, b) =>
          (b.dischargedAt ?? '').localeCompare(a.dischargedAt ?? '')
        ),
    [patients]
  );

  const currentList =
    stage === 'approaching'
      ? approaching
      : stage === 'eligible'
        ? eligible
        : stage === 'confirmed'
          ? confirmed
          : discharged;

  const roomToPatient = useMemo(() => {
    const map = new Map<number, Patient>();
    for (const p of patients) {
      if (
        (p.status === 'admitted' || p.status === 'discharge_approved') &&
        p.roomNumber !== null
      ) {
        map.set(p.roomNumber, p);
      }
    }
    return map;
  }, [patients]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[24px] font-semibold tracking-tight text-[#192B3D]">
            Discharge Management
          </h1>
          <p className="mt-0.5 text-[12px] text-[#718096]">
            4-stage clinical discharge pipeline enforcing the 3-day fever-free
            (&lt;37.5°C) protocol and 74-bed capacity control.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowBedGrid((v) => !v)}
            className="h-8 rounded-md border border-[#E3E9EF] bg-white px-3 text-[12px] font-medium text-[#192B3D] hover:bg-[#F6F8FA] cursor-pointer"
          >
            {showBedGrid ? 'Hide 74-Room Map' : 'View 74-Room Map'}
          </button>
          <button
            onClick={onOpenAdmit}
            disabled={stats.vacantCount === 0}
            title={
              stats.vacantCount === 0
                ? '74/74 rooms occupied — complete a discharge first'
                : 'Admit new patient'
            }
            className="flex h-8 items-center gap-1.5 rounded-md bg-[#087F8C] px-3.5 text-[12px] font-medium text-white hover:bg-[#066974] disabled:cursor-not-allowed disabled:bg-[#E3E9EF] disabled:text-[#718096] cursor-pointer"
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>Admit Patient</span>
          </button>
        </div>
      </div>

      {/* Capacity Constraint Banner */}
      {stats.vacantCount === 0 && (
        <div className="flex items-center gap-2 rounded-md border border-[#B7791F]/30 bg-[#B7791F]/5 px-4 py-2.5 text-[12px] text-[#192B3D]">
          <AlertTriangle className="h-4 w-4 shrink-0 text-[#B7791F]" />
          <span>
            <strong className="font-semibold text-[#B7791F]">
              Facility at 100% Capacity (74/74 Beds):
            </strong>{' '}
            New admissions are locked until a Doctor-confirmed discharge is
            completed below.
          </span>
        </div>
      )}

      {/* 4-Stage Pipeline Selector */}
      <div className="grid grid-cols-2 divide-y divide-[#E3E9EF] rounded-lg border border-[#E3E9EF] bg-white sm:grid-cols-4 sm:divide-x sm:divide-y-0">
        {(
          [
            {
              id: 'approaching',
              step: 'Stage 1',
              title: 'Approaching Eligibility',
              subtitle: '2 consecutive fever-free days',
              count: approaching.length,
            },
            {
              id: 'eligible',
              step: 'Stage 2',
              title: 'Eligible for Review',
              subtitle: '3+ days fever-free · Needs Doctor',
              count: eligible.length,
            },
            {
              id: 'confirmed',
              step: 'Stage 3',
              title: 'Doctor Confirmed',
              subtitle: 'Ready for Admin bed release',
              count: confirmed.length,
            },
            {
              id: 'discharged',
              step: 'Stage 4',
              title: 'Discharged',
              subtitle: 'Completed & room vacated',
              count: discharged.length,
            },
          ] as const
        ).map((item) => {
          const active = stage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setStage(item.id);
                setConfirmingId(null);
              }}
              className={`relative p-4 text-left transition-colors duration-150 cursor-pointer ${
                active ? 'bg-[#F6F8FA]' : 'bg-white hover:bg-[#F6F8FA]/60'
              }`}
            >
              {active && (
                <span className="absolute inset-x-0 top-0 h-[2px] bg-[#087F8C]" />
              )}
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#718096]">
                  {item.step}
                </span>
                <span className="tabular-nums text-[18px] font-semibold text-[#192B3D]">
                  {item.count}
                </span>
              </div>
              <div className="mt-1 text-[13px] font-semibold text-[#192B3D]">
                {item.title}
              </div>
              <div className="mt-0.5 text-[11px] text-[#718096]">
                {item.subtitle}
              </div>
            </button>
          );
        })}
      </div>

      {/* Pipeline Table with Actual Temperature History */}
      <div className="overflow-hidden rounded-lg border border-[#E3E9EF] bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="border-b border-[#E3E9EF] bg-[#F6F8FA] text-[10px] font-medium uppercase tracking-wider text-[#718096]">
              <tr>
                <th className="px-4 py-2.5">Patient</th>
                <th className="px-4 py-2.5">Room</th>
                <th className="px-4 py-2.5">
                  Recorded Temperature History (Recent Days)
                </th>
                <th className="px-4 py-2.5">Fever-Free Streak</th>
                <th className="px-4 py-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E3E9EF]">
              {currentList.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-10 text-center text-[12px] text-[#718096]"
                  >
                    No patients currently in this pipeline stage.
                  </td>
                </tr>
              ) : (
                currentList.map((p) => {
                  const recent4 = p.temperatures.slice(-4);
                  const streak = getConsecutiveNoFeverDays(p.temperatures);

                  return (
                    <tr
                      key={p.id}
                      className="transition-colors duration-150 hover:bg-[#F6F8FA]"
                    >
                      <td className="px-4 py-3">
                        <div className="font-semibold text-[#192B3D]">
                          {p.name}
                        </div>
                        <div className="tabular-nums text-[11px] text-[#718096]">
                          {p.id} · Admitted {p.admittedDate}
                        </div>
                      </td>
                      <td className="tabular-nums px-4 py-3 font-semibold text-[#192B3D]">
                        {p.roomNumber ? `Rm ${p.roomNumber}` : 'Released'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="tabular-nums flex flex-wrap gap-1.5">
                          {recent4.map((t) => {
                            const fever = hasFever(t.tempC);
                            return (
                              <div
                                key={t.date}
                                className={`rounded border px-2 py-0.5 text-[11px] ${
                                  fever
                                    ? 'border-[#C23B3B]/30 bg-[#C23B3B]/5 text-[#C23B3B]'
                                    : 'border-[#16845B]/30 bg-[#16845B]/5 text-[#16845B]'
                                }`}
                              >
                                <span className="font-semibold">
                                  {t.tempC.toFixed(1)}°C
                                </span>{' '}
                                <span className="text-[10px] opacity-80">
                                  ({t.date.slice(5)})
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </td>
                      <td className="tabular-nums px-4 py-3 text-[12px]">
                        <span
                          className={`font-semibold ${
                            streak >= 3 ? 'text-[#16845B]' : 'text-[#B7791F]'
                          }`}
                        >
                          {streak} / 3 days
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {stage === 'confirmed' ? (
                          canFinalize ? (
                            confirmingId === p.id ? (
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  onClick={() => {
                                    onCompleteDischarge(p.id, role);
                                    setConfirmingId(null);
                                  }}
                                  className="inline-flex h-7 items-center gap-1 rounded-md bg-[#16845B] px-2.5 text-[11px] font-medium text-white hover:bg-[#126E4B] cursor-pointer"
                                >
                                  <Check className="h-3 w-3" />
                                  Confirm Release
                                </button>
                                <button
                                  onClick={() => setConfirmingId(null)}
                                  className="h-7 px-2 text-[11px] text-[#718096] hover:text-[#192B3D] cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setConfirmingId(p.id)}
                                className="h-7 rounded-md bg-[#087F8C] px-3 text-[11px] font-medium text-white hover:bg-[#066974] cursor-pointer"
                              >
                                Complete Discharge
                              </button>
                            )
                          ) : (
                            /* FIX 3: non-admin sees a locked indicator */
                            <span className="inline-flex items-center gap-1 text-[11px] text-[#718096]">
                              <Lock className="h-3 w-3" />
                              Admin Only
                            </span>
                          )
                        ) : (
                          <button
                            onClick={() => onSelectPatient(p)}
                            className="h-7 rounded-md border border-[#E3E9EF] bg-white px-3 text-[11px] font-medium text-[#192B3D] hover:bg-[#F6F8FA] cursor-pointer"
                          >
                            {stage === 'eligible'
                              ? 'Review for Discharge'
                              : 'Inspect Record'}
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

      {/* Collapsible 74-Room Bed Matrix */}
      {showBedGrid && (
        <div className="rounded-lg border border-[#E3E9EF] bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-[14px] font-semibold text-[#192B3D]">
                74-Room Facility Matrix
              </h3>
              <p className="text-[11px] text-[#718096]">
                Click any occupied room to inspect patient record, or a vacant
                room to admit.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#718096]">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-xs bg-[#16845B]" /> Vacant
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-xs bg-[#087F8C]" /> Doctor
                Confirmed
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-xs bg-[#172B43]" /> Occupied
              </span>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-6 gap-1.5 sm:grid-cols-10 md:grid-cols-12 lg:grid-cols-15">
            {Array.from({ length: TOTAL_ROOMS }, (_, i) => i + 1).map(
              (room) => {
                const occupant = roomToPatient.get(room);
                if (!occupant) {
                  return (
                    <button
                      key={room}
                      onClick={onOpenAdmit}
                      title={`Room ${room}: Vacant`}
                      className="tabular-nums rounded border border-[#16845B]/40 bg-[#16845B]/10 py-1.5 text-[11px] font-semibold text-[#16845B] hover:bg-[#16845B]/20 cursor-pointer"
                    >
                      {room}
                    </button>
                  );
                }

                const isConfirmed = occupant.status === 'discharge_approved';
                return (
                  <button
                    key={room}
                    onClick={() => onSelectPatient(occupant)}
                    title={`Room ${room}: ${occupant.name}`}
                    className={`tabular-nums rounded border py-1.5 text-[11px] font-medium transition-colors duration-150 cursor-pointer ${
                      isConfirmed
                        ? 'border-[#087F8C]/40 bg-[#087F8C]/10 text-[#087F8C] hover:bg-[#087F8C]/20'
                        : 'border-[#E3E9EF] bg-[#F6F8FA] text-[#192B3D] hover:bg-[#E3E9EF]'
                    }`}
                  >
                    {room}
                  </button>
                );
              }
            )}
          </div>
        </div>
      )}
    </div>
  );
};

