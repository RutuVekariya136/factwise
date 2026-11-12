import React, { useState } from 'react';
import {
  X,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  LogOut,
  Zap,
  FilePen,
} from 'lucide-react';
import {
  FEVER_THRESHOLD_C,
  NO_FEVER_DAYS_REQUIRED,
  Patient,
  ROLE_PERMISSIONS,
  UserRole,
} from '../types';
import {
  getConsecutiveNoFeverDays,
  getTodayDate,
  getTodayTemp,
  getTodayVisit,
  hasFever,
} from '../utils/clinical';

interface PatientDetailModalProps {
  patient: Patient;
  role: UserRole;
  onClose: () => void;
  onRecordTemp: (patientId: string, tempC: number, note?: string) => void;
  onDoctorVisit: (
    patientId: string,
    treatmentNote: string,
    decision: 'continue_treatment' | 'approve_discharge' | 'mark_deceased',
    opts?: {
      isCorrection?: boolean;
      correctionReason?: string;
      isUrgentOverride?: boolean;
      urgentOverrideReason?: string;
    }
  ) => void;
  onCompleteDischarge: (patientId: string, callerRole: UserRole) => void;
}

export const PatientDetailModal: React.FC<PatientDetailModalProps> = ({
  patient,
  role,
  onClose,
  onRecordTemp,
  onDoctorVisit,
  onCompleteDischarge,
}) => {
  const today = getTodayDate();
  const todayTemp = getTodayTemp(patient, today);
  const todayVisit = getTodayVisit(patient, today);
  const noFeverStreak = getConsecutiveNoFeverDays(patient.temperatures);
  const eligibleForDischarge = noFeverStreak >= NO_FEVER_DAYS_REQUIRED;
  const perms = ROLE_PERMISSIONS[role];

  // ── Nurse temperature form state ────────────────────────────────────────────
  const [tempInput, setTempInput] = useState<string>(
    todayTemp ? String(todayTemp.tempC) : '37.2'
  );
  const [tempNote, setTempNote] = useState<string>('');
  const [allowTempCorrection, setAllowTempCorrection] = useState<boolean>(false);
  const [tempError, setTempError] = useState<string>('');

  // ── Doctor visit form state ──────────────────────────────────────────────────
  const [treatmentNote, setTreatmentNote] = useState<string>(
    eligibleForDischarge
      ? 'Completed 3 consecutive days without fever (<37.5°C). Cleared for discharge.'
      : 'Reviewed daily temperature and vitals. Continue supportive regimen.'
  );

  // FIX 1: correction mode when visit already exists today
  const [correctionMode, setCorrectionMode] = useState<boolean>(false);
  const [correctionReason, setCorrectionReason] = useState<string>('');

  // FIX 2: urgent override when no temp today
  const [urgentOverrideMode, setUrgentOverrideMode] = useState<boolean>(false);
  const [urgentOverrideReason, setUrgentOverrideReason] = useState<string>('');

  const [confirmDeceased, setConfirmDeceased] = useState<boolean>(false);
  const [confirmDischarge, setConfirmDischarge] = useState<boolean>(false);
  const [visitError, setVisitError] = useState<string>('');

  // ── Temperature submit (Nurse) ───────────────────────────────────────────────
  const handleTempSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTempError('');
    if (!perms.canRecordTemp) {
      setTempError('Permission denied: Only nursing staff may record temperatures.');
      return;
    }
    const parsed = parseFloat(tempInput);
    if (Number.isNaN(parsed) || parsed < 34.0 || parsed > 43.0) {
      setTempError('Invalid temperature. Enter a clinical value between 34.0°C and 43.0°C.');
      return;
    }
    if (todayTemp && !allowTempCorrection) {
      setTempError('Temperature already recorded today. Enable clinical correction to update.');
      return;
    }
    if (todayTemp && allowTempCorrection && tempNote.trim().length < 3) {
      setTempError('A correction reason is required (minimum 3 characters).');
      return;
    }
    onRecordTemp(patient.id, Number(parsed.toFixed(1)), tempNote.trim() || undefined);
    onClose();
  };

  // ── Doctor visit submit ──────────────────────────────────────────────────────
  const handleDoctorDecision = (
    decision: 'continue_treatment' | 'approve_discharge' | 'mark_deceased'
  ) => {
    setVisitError('');

    // FIX 4: permission guard enforced in handler (not just UI)
    if (!perms.canDoctorVisit) {
      setVisitError('Permission denied: Only physicians may document clinical visits.');
      return;
    }

    // FIX 1: if visit already exists today and correction mode is NOT active, block
    if (todayVisit && !correctionMode) {
      setVisitError(
        'A visit was already documented today. Enable "Clinical Correction" to submit an updated record with a mandatory justification.'
      );
      return;
    }

    // FIX 1: correction mode requires a reason
    if (todayVisit && correctionMode && correctionReason.trim().length < 5) {
      setVisitError('Correction justification is required (minimum 5 characters).');
      return;
    }

    // Standard temperature gate
    if (!todayTemp && !urgentOverrideMode) {
      setVisitError(
        "Visit blocked: Today's temperature must be recorded by nursing staff first. Use Urgent Override for exceptional clinical circumstances."
      );
      return;
    }

    // FIX 2: urgent override requires a reason
    if (!todayTemp && urgentOverrideMode && urgentOverrideReason.trim().length < 10) {
      setVisitError('Urgent override requires a clinical justification (minimum 10 characters).');
      return;
    }

    if (decision === 'approve_discharge' && !eligibleForDischarge) {
      setVisitError(
        `Cannot confirm discharge: Patient has ${noFeverStreak}/${NO_FEVER_DAYS_REQUIRED} consecutive fever-free days.`
      );
      return;
    }
    if (treatmentNote.trim().length < 3) {
      setVisitError('Please enter clinical/treatment notes.');
      return;
    }

    onDoctorVisit(patient.id, treatmentNote.trim(), decision, {
      isCorrection: correctionMode && Boolean(todayVisit),
      correctionReason: correctionMode ? correctionReason.trim() : undefined,
      isUrgentOverride: urgentOverrideMode && !todayTemp,
      urgentOverrideReason: urgentOverrideMode ? urgentOverrideReason.trim() : undefined,
    });
    onClose();
  };

  const recentTemps = [...patient.temperatures].slice(-7).reverse();

  // ── Render helpers ───────────────────────────────────────────────────────────
  const visitFormBody = () => {
    if (!todayTemp && !urgentOverrideMode) {
      return (
        <div className="mt-3 space-y-3">
          <div className="flex items-start gap-2.5 rounded-md border border-[#B7791F]/30 bg-[#B7791F]/5 p-3 text-[12px] text-[#192B3D]">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-[#B7791F]" />
            <div>
              <p className="font-semibold text-[#B7791F]">
                Visit Blocked: Awaiting Nurse Temperature
              </p>
              <p className="mt-0.5 text-[#718096]">
                Standard clinical workflow requires today's temperature to be
                logged by nursing staff before a physician visit.
              </p>
            </div>
          </div>
          {/* FIX 2: urgent override option */}
          <button
            type="button"
            onClick={() => { setUrgentOverrideMode(true); setVisitError(''); }}
            className="flex items-center gap-1.5 text-[11px] font-medium text-[#C23B3B] hover:underline cursor-pointer"
          >
            <Zap className="h-3 w-3" />
            <span>Request Urgent Override (requires documented clinical justification)</span>
          </button>
        </div>
      );
    }

    return (
      <>
        {/* FIX 2: urgent override banner */}
        {urgentOverrideMode && !todayTemp && (
          <div className="mt-3 rounded-md border border-[#C23B3B]/30 bg-[#C23B3B]/5 p-3 text-[12px]">
            <div className="flex items-center gap-1.5 font-semibold text-[#C23B3B]">
              <Zap className="h-3.5 w-3.5" />
              <span>Urgent Override Mode — No Temperature on Record Today</span>
            </div>
            <p className="mt-1 text-[#718096]">
              This visit will be recorded as an urgent override. A follow-up
              nurse temperature measurement is required.
            </p>
            <div className="mt-2">
              <label className="block text-[11px] font-medium text-[#192B3D]">
                Clinical Justification (Required — min. 10 characters)
              </label>
              <input
                type="text"
                placeholder="e.g. Emergency deterioration observed, cannot wait for routine measurement"
                value={urgentOverrideReason}
                onChange={(e) => setUrgentOverrideReason(e.target.value)}
                className="mt-1 h-9 w-full rounded-md border border-[#C23B3B]/40 bg-white px-3 text-[12px] text-[#192B3D] focus:border-[#C23B3B] focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => { setUrgentOverrideMode(false); setVisitError(''); }}
              className="mt-1.5 text-[11px] text-[#718096] hover:text-[#192B3D] cursor-pointer"
            >
              Cancel Override
            </button>
          </div>
        )}

        {/* FIX 1: today visit already exists – correction mode toggle */}
        {todayVisit && (
          <div className="mt-3 rounded-md border border-[#E3E9EF] bg-[#F6F8FA] p-3 text-[12px]">
            {!correctionMode ? (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-semibold text-[#192B3D]">
                    Visit already documented today
                  </span>{' '}
                  <span className="tabular-nums text-[#718096]">
                    at {todayVisit.time} by {todayVisit.doctorName}
                  </span>
                  {todayVisit.isUrgentOverride && (
                    <span className="ml-1.5 inline-flex items-center gap-1 rounded bg-[#C23B3B]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[#C23B3B]">
                      <Zap className="h-2.5 w-2.5" />URGENT OVERRIDE
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => { setCorrectionMode(true); setVisitError(''); }}
                  className="flex items-center gap-1 text-[11px] font-medium text-[#087F8C] hover:underline cursor-pointer"
                >
                  <FilePen className="h-3 w-3" />
                  <span>Submit Correction</span>
                </button>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-1.5 font-semibold text-[#B7791F]">
                  <FilePen className="h-3.5 w-3.5" />
                  <span>Correction Mode — Previous note will be preserved in history</span>
                </div>
                <div className="mt-2">
                  <label className="block text-[11px] font-medium text-[#192B3D]">
                    Correction Reason (Required — min. 5 characters)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Incorrect discharge decision; patient had fever overnight"
                    value={correctionReason}
                    onChange={(e) => setCorrectionReason(e.target.value)}
                    className="mt-1 h-9 w-full rounded-md border border-[#B7791F]/40 bg-white px-3 text-[12px] text-[#192B3D] focus:border-[#B7791F] focus:outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => { setCorrectionMode(false); setCorrectionReason(''); setVisitError(''); }}
                  className="mt-1.5 text-[11px] text-[#718096] hover:text-[#192B3D] cursor-pointer"
                >
                  Cancel Correction
                </button>
              </div>
            )}
          </div>
        )}

        <div className="mt-3">
          <label className="block text-[11px] font-medium text-[#192B3D]">
            Clinical Assessment &amp; Treatment Plan
          </label>
          <textarea
            rows={2}
            value={treatmentNote}
            onChange={(e) => setTreatmentNote(e.target.value)}
            className="mt-1 w-full rounded-md border border-[#E3E9EF] bg-white p-2.5 text-[13px] text-[#192B3D] focus:border-[#087F8C] focus:outline-none"
          />
        </div>

        {visitError && (
          <p className="mt-2 text-[12px] font-medium text-[#C23B3B]">
            {visitError}
          </p>
        )}

        {/* Only show action buttons when visit is new OR correction mode is active */}
        {(!todayVisit || correctionMode) && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleDoctorDecision('continue_treatment')}
                className="h-8 rounded-md border border-[#E3E9EF] bg-white px-3 text-[12px] font-medium text-[#192B3D] hover:bg-[#F6F8FA] cursor-pointer"
              >
                Continue Treatment
              </button>

              {!confirmDischarge ? (
                <button
                  type="button"
                  onClick={() => setConfirmDischarge(true)}
                  disabled={!eligibleForDischarge}
                  title={
                    eligibleForDischarge
                      ? 'Confirm 3-day no-fever discharge'
                      : 'Requires 3 consecutive fever-free days'
                  }
                  className="flex h-8 items-center gap-1.5 rounded-md bg-[#087F8C] px-3 text-[12px] font-medium text-white hover:bg-[#066974] disabled:cursor-not-allowed disabled:bg-[#E3E9EF] disabled:text-[#718096] cursor-pointer"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Confirm Discharge</span>
                </button>
              ) : (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleDoctorDecision('approve_discharge')}
                    className="h-8 rounded-md bg-[#16845B] px-3 text-[12px] font-medium text-white hover:bg-[#126E4B] cursor-pointer"
                  >
                    Yes, Approve Discharge
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDischarge(false)}
                    className="h-8 px-2 text-[11px] text-[#718096] hover:text-[#192B3D] cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            {!confirmDeceased ? (
              <button
                type="button"
                onClick={() => setConfirmDeceased(true)}
                className="h-8 rounded-md border border-[#C23B3B]/30 bg-white px-3 text-[12px] font-medium text-[#C23B3B] hover:bg-[#C23B3B]/5 cursor-pointer"
              >
                Record Mortality
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleDoctorDecision('mark_deceased')}
                  className="h-8 rounded-md bg-[#C23B3B] px-3 text-[12px] font-medium text-white hover:bg-[#A63030] cursor-pointer"
                >
                  Confirm Deceased
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDeceased(false)}
                  className="h-8 px-2 text-[11px] text-[#718096] hover:text-[#192B3D] cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}
      </>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#172B43]/45 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-[#E3E9EF] bg-white shadow-lg">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-[#E3E9EF] bg-white px-6 py-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="tabular-nums rounded bg-[#172B43] px-2 py-0.5 text-[11px] font-semibold text-white">
                {patient.roomNumber ? `Room ${patient.roomNumber}` : 'Unassigned'}
              </span>
              <h2 className="text-[16px] font-semibold text-[#192B3D]">
                {patient.name}
              </h2>
              <span className="tabular-nums text-[12px] text-[#718096]">
                {patient.id} · {patient.age}y {patient.gender}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-[#718096]">
              Admitted <span className="tabular-nums">{patient.admittedDate}</span> ·
              Status:{' '}
              <span className="font-medium capitalize text-[#192B3D]">
                {patient.status.replace('_', ' ')}
              </span>
              <span className="ml-3 inline-flex items-center gap-1 rounded border border-[#E3E9EF] bg-[#F6F8FA] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[#718096]">
                {role.replace('_', ' ')}
              </span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-[#718096] hover:bg-[#F6F8FA] hover:text-[#192B3D] cursor-pointer"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5 p-6">
          {/* 3-Day No-Fever Criterion */}
          <div className="rounded-md border border-[#E3E9EF] bg-[#F6F8FA] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[12px] font-semibold text-[#192B3D]">
                3-Day Fever-Free Protocol (&lt; {FEVER_THRESHOLD_C}°C)
              </span>
              <span
                className={`tabular-nums rounded px-2 py-0.5 text-[11px] font-semibold ${
                  eligibleForDischarge
                    ? 'bg-[#16845B]/10 text-[#16845B]'
                    : 'bg-white text-[#718096] border border-[#E3E9EF]'
                }`}
              >
                {Math.min(noFeverStreak, NO_FEVER_DAYS_REQUIRED)} /{' '}
                {NO_FEVER_DAYS_REQUIRED} Days
              </span>
            </div>
            <div className="mt-2.5 grid grid-cols-3 gap-1.5">
              {[1, 2, 3].map((step) => (
                <div
                  key={step}
                  className={`h-1.5 rounded-sm ${
                    noFeverStreak >= step ? 'bg-[#16845B]' : 'bg-[#E3E9EF]'
                  }`}
                />
              ))}
            </div>
            <p className="mt-2 text-[11px] text-[#718096]">
              {eligibleForDischarge
                ? 'Criterion satisfied. Patient is eligible for Attending Physician discharge confirmation.'
                : `Requires ${
                    NO_FEVER_DAYS_REQUIRED - noFeverStreak
                  } additional consecutive fever-free day(s).`}
            </p>
          </div>

          {/* FIX 4: Nurse Measurement Form — only shown to nurses */}
          {perms.canRecordTemp && patient.status === 'admitted' && (
            <form
              onSubmit={handleTempSubmit}
              className="rounded-md border border-[#E3E9EF] bg-white p-4"
            >
              <div className="text-[13px] font-semibold text-[#192B3D]">
                Record Daily Temperature ({today})
              </div>

              {todayTemp && (
                <div className="mt-2.5 rounded-md border border-[#B7791F]/30 bg-[#B7791F]/5 p-3 text-[12px] text-[#192B3D]">
                  <div className="flex items-center gap-1.5 font-medium text-[#B7791F]">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span>
                      Already recorded today at{' '}
                      <span className="tabular-nums">{todayTemp.time}</span> (
                      <span className="tabular-nums">
                        {todayTemp.tempC.toFixed(1)}°C
                      </span>{' '}
                      by {todayTemp.recordedBy})
                    </span>
                  </div>
                  <label className="mt-2 flex items-center gap-2 text-[12px] text-[#192B3D] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allowTempCorrection}
                      onChange={(e) => setAllowTempCorrection(e.target.checked)}
                      className="rounded border-[#E3E9EF] accent-[#087F8C]"
                    />
                    <span>Log clinical correction / recheck</span>
                  </label>
                </div>
              )}

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-[11px] font-medium text-[#192B3D]">
                    Temperature (°C)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="34.0"
                    max="43.0"
                    value={tempInput}
                    onChange={(e) => setTempInput(e.target.value)}
                    disabled={Boolean(todayTemp) && !allowTempCorrection}
                    className="tabular-nums mt-1 h-9 w-full rounded-md border border-[#E3E9EF] bg-white px-3 text-[13px] font-medium text-[#192B3D] focus:border-[#087F8C] focus:outline-none disabled:bg-[#F6F8FA] disabled:text-[#718096]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[#192B3D]">
                    Observation Notes{' '}
                    {todayTemp && allowTempCorrection ? '(Required)' : '(Optional)'}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Post-antipyretic recheck"
                    value={tempNote}
                    onChange={(e) => setTempNote(e.target.value)}
                    disabled={Boolean(todayTemp) && !allowTempCorrection}
                    className="mt-1 h-9 w-full rounded-md border border-[#E3E9EF] bg-white px-3 text-[13px] text-[#192B3D] focus:border-[#087F8C] focus:outline-none disabled:bg-[#F6F8FA]"
                  />
                </div>
              </div>

              {tempError && (
                <p className="mt-2 text-[12px] font-medium text-[#C23B3B]">
                  {tempError}
                </p>
              )}

              <div className="mt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={Boolean(todayTemp) && !allowTempCorrection}
                  className="h-8 rounded-md bg-[#087F8C] px-4 text-[12px] font-medium text-white transition-colors duration-150 hover:bg-[#066974] disabled:cursor-not-allowed disabled:bg-[#E3E9EF] disabled:text-[#718096] cursor-pointer"
                >
                  {todayTemp ? 'Save Correction' : 'Save Measurement'}
                </button>
              </div>
            </form>
          )}

          {/* FIX 4: Doctor Visit Form — only shown to doctors/head_doctor */}
          {perms.canDoctorVisit && patient.status === 'admitted' && (
            <div className="rounded-md border border-[#E3E9EF] bg-white p-4">
              <div className="text-[13px] font-semibold text-[#192B3D]">
                Doctor Visit Documentation ({today})
              </div>
              {visitFormBody()}
            </div>
          )}

          {/* FIX 3+4: Admin Discharge Confirmation — only admin, requires doctor sign-off */}
          {perms.canFinalizeDischarge && patient.status === 'discharge_approved' && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-[#16845B]/30 bg-[#16845B]/5 p-4">
              <div>
                <p className="text-[13px] font-semibold text-[#192B3D]">
                  Doctor Confirmed for Discharge
                </p>
                <p className="text-[11px] text-[#718096]">
                  Approved at{' '}
                  <span className="tabular-nums">
                    {patient.dischargeApprovedAt}
                  </span>
                  . Completing discharge frees Room {patient.roomNumber}.
                </p>
              </div>
              <button
                onClick={() => {
                  onCompleteDischarge(patient.id, role);
                  onClose();
                }}
                className="flex h-8 items-center gap-1.5 rounded-md bg-[#087F8C] px-3.5 text-[12px] font-medium text-white hover:bg-[#066974] cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Complete Discharge</span>
              </button>
            </div>
          )}

          {/* FIX 3: Non-admin view of discharge_approved — read-only notice */}
          {!perms.canFinalizeDischarge && patient.status === 'discharge_approved' && (
            <div className="rounded-md border border-[#16845B]/30 bg-[#16845B]/5 p-3 text-[12px] text-[#192B3D]">
              <span className="font-semibold text-[#16845B]">
                Doctor Confirmed — Awaiting Admin Discharge
              </span>
              <p className="mt-0.5 text-[#718096]">
                Only Admin Staff may finalize bed release. Approved at{' '}
                <span className="tabular-nums">{patient.dischargeApprovedAt}</span>.
              </p>
            </div>
          )}

          {/* Temperature History */}
          <div>
            <h3 className="text-[13px] font-semibold text-[#192B3D]">
              Recorded Temperature History (Last 7 Readings)
            </h3>
            <div className="mt-2 overflow-hidden rounded-md border border-[#E3E9EF]">
              <table className="w-full text-left text-[12px]">
                <thead className="border-b border-[#E3E9EF] bg-[#F6F8FA] text-[10px] font-medium uppercase tracking-wider text-[#718096]">
                  <tr>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Time</th>
                    <th className="px-3 py-2">Temp</th>
                    <th className="px-3 py-2">Classification</th>
                    <th className="px-3 py-2">Recorded By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E3E9EF]">
                  {recentTemps.map((t, idx) => {
                    const fever = hasFever(t.tempC);
                    return (
                      <tr key={`${t.date}-${idx}`}>
                        <td className="tabular-nums px-3 py-2 font-medium text-[#192B3D]">
                          {t.date}
                        </td>
                        <td className="tabular-nums px-3 py-2 text-[#718096]">
                          {t.time}
                        </td>
                        <td className="tabular-nums px-3 py-2 font-semibold text-[#192B3D]">
                          {t.tempC.toFixed(1)}°C
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`text-[11px] font-medium ${
                              fever ? 'text-[#C23B3B]' : 'text-[#16845B]'
                            }`}
                          >
                            {fever ? 'Fever (≥37.5°C)' : 'Afebrile'}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-[#718096]">
                          {t.recordedBy}
                          {t.note ? ` — ${t.note}` : ''}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Doctor Visit History (preserved, read-only) */}
          <div>
            <h3 className="text-[13px] font-semibold text-[#192B3D]">
              Clinical Visit Notes
            </h3>
            {patient.visits.length === 0 ? (
              <p className="mt-1.5 text-[12px] text-[#718096]">
                No physician visits recorded yet.
              </p>
            ) : (
              <div className="mt-2 divide-y divide-[#E3E9EF] rounded-md border border-[#E3E9EF]">
                {[...patient.visits].reverse().map((v, idx) => (
                  <div key={`${v.date}-${idx}`} className="p-3 text-[12px]">
                    <div className="flex flex-wrap items-center justify-between gap-1 font-medium text-[#192B3D]">
                      <span>
                        <span className="tabular-nums">
                          {v.date} {v.time}
                        </span>{' '}
                        · {v.doctorName}
                        {v.isUrgentOverride && (
                          <span className="ml-2 inline-flex items-center gap-1 rounded bg-[#C23B3B]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[#C23B3B]">
                            <Zap className="h-2.5 w-2.5" />URGENT OVERRIDE
                          </span>
                        )}
                        {v.isCorrection && (
                          <span className="ml-2 inline-flex items-center gap-1 rounded bg-[#B7791F]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[#B7791F]">
                            <FilePen className="h-2.5 w-2.5" />CORRECTION
                          </span>
                        )}
                      </span>
                      <span className="rounded border border-[#E3E9EF] bg-[#F6F8FA] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[#718096]">
                        {v.decision.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className="mt-1 text-[#718096]">{v.treatmentNote}</p>
                    {v.correctionReason && (
                      <p className="mt-0.5 text-[11px] font-medium text-[#B7791F]">
                        Correction reason: {v.correctionReason}
                      </p>
                    )}
                    {v.urgentOverrideReason && (
                      <p className="mt-0.5 text-[11px] font-medium text-[#C23B3B]">
                        Override reason: {v.urgentOverrideReason}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
