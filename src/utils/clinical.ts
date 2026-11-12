import {
  ActivityEvent,
  FEVER_THRESHOLD_C,
  MORTALITY_BENCHMARK_PCT,
  NO_FEVER_DAYS_REQUIRED,
  Patient,
  TOTAL_ROOMS,
  TemperatureLog,
  DoctorVisitLog,
} from '../types';

export function getTodayDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getDateOffset(daysOffset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getCurrentTime(): string {
  const now = new Date();
  return now.toTimeString().slice(0, 5);
}

export function hasFever(tempC: number): boolean {
  return tempC >= FEVER_THRESHOLD_C;
}

export function getTodayTemp(
  patient: Patient,
  today: string = getTodayDate()
): TemperatureLog | undefined {
  return patient.temperatures.find((t) => t.date === today);
}

export function getTodayVisit(
  patient: Patient,
  today: string = getTodayDate()
): DoctorVisitLog | undefined {
  return patient.visits.find((v) => v.date === today);
}

export function getLatestTemp(patient: Patient): TemperatureLog | undefined {
  if (patient.temperatures.length === 0) return undefined;
  return patient.temperatures[patient.temperatures.length - 1];
}

/**
 * Counts consecutive most recent days with temperature < 37.5°C.
 * Returns 0 if the most recent reading was a fever, or if no readings exist.
 */
export function getConsecutiveNoFeverDays(temperatures: TemperatureLog[]): number {
  if (temperatures.length === 0) return 0;

  // Group by date keeping the latest reading per day, sorted newest first
  const byDate = new Map<string, TemperatureLog>();
  for (const log of temperatures) {
    byDate.set(log.date, log);
  }
  const sortedDates = Array.from(byDate.keys()).sort((a, b) =>
    b.localeCompare(a)
  );

  let streak = 0;
  let prevDate: string | null = null;

  for (const dateStr of sortedDates) {
    const entry = byDate.get(dateStr)!;
    if (hasFever(entry.tempC)) {
      break;
    }

    // Ensure dates are consecutive calendar days (or allow first entry)
    if (prevDate !== null) {
      const d1 = new Date(prevDate + 'T00:00:00');
      const d2 = new Date(dateStr + 'T00:00:00');
      const diffDays = Math.round(
        (d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (diffDays > 1) {
        break;
      }
    }

    streak += 1;
    prevDate = dateStr;
  }

  return streak;
}

export function isDischargeEligible(patient: Patient): boolean {
  return (
    patient.status === 'admitted' &&
    getConsecutiveNoFeverDays(patient.temperatures) >= NO_FEVER_DAYS_REQUIRED
  );
}

export function getVacantRooms(patients: Patient[]): number[] {
  const occupied = new Set<number>();
  for (const p of patients) {
    if (
      (p.status === 'admitted' || p.status === 'discharge_approved') &&
      p.roomNumber !== null
    ) {
      occupied.add(p.roomNumber);
    }
  }
  const vacant: number[] = [];
  for (let r = 1; r <= TOTAL_ROOMS; r++) {
    if (!occupied.has(r)) {
      vacant.push(r);
    }
  }
  return vacant;
}

export interface FacilityStats {
  totalRooms: number;
  occupiedCount: number;
  vacantCount: number;
  activeAdmittedCount: number;
  pendingTempCount: number;
  tempRecordedTodayCount: number;
  readyForDoctorCount: number;
  waitingForTempBeforeDoctorCount: number;
  visitedTodayCount: number;
  dischargeEligibleCount: number;
  dischargePendingAdminCount: number;
  dischargedTotal: number;
  deceasedTotal: number;
  resolvedTotal: number;
  mortalityRatePct: number;
  successRatePct: number;
  isMortalityAboveBenchmark: boolean;
}

export function computeFacilityStats(
  patients: Patient[],
  today: string = getTodayDate()
): FacilityStats {
  const occupying = patients.filter(
    (p) => p.status === 'admitted' || p.status === 'discharge_approved'
  );
  const activeAdmitted = patients.filter((p) => p.status === 'admitted');
  const dischargePendingAdmin = patients.filter(
    (p) => p.status === 'discharge_approved'
  );
  const discharged = patients.filter((p) => p.status === 'discharged');
  const deceased = patients.filter((p) => p.status === 'deceased');

  let pendingTempCount = 0;
  let tempRecordedTodayCount = 0;
  let readyForDoctorCount = 0;
  let waitingForTempBeforeDoctorCount = 0;
  let visitedTodayCount = 0;
  let dischargeEligibleCount = 0;

  for (const p of activeAdmitted) {
    const tToday = getTodayTemp(p, today);
    const vToday = getTodayVisit(p, today);

    if (tToday) {
      tempRecordedTodayCount += 1;
    } else {
      pendingTempCount += 1;
    }

    if (vToday) {
      visitedTodayCount += 1;
    } else if (tToday) {
      readyForDoctorCount += 1;
    } else {
      waitingForTempBeforeDoctorCount += 1;
    }

    if (isDischargeEligible(p)) {
      dischargeEligibleCount += 1;
    }
  }

  const dischargedTotal = discharged.length;
  const deceasedTotal = deceased.length;
  const resolvedTotal = dischargedTotal + deceasedTotal;
  const mortalityRatePct =
    resolvedTotal > 0 ? (deceasedTotal / resolvedTotal) * 100 : 0;
  const successRatePct =
    resolvedTotal > 0 ? (dischargedTotal / resolvedTotal) * 100 : 100;

  return {
    totalRooms: TOTAL_ROOMS,
    occupiedCount: occupying.length,
    vacantCount: Math.max(0, TOTAL_ROOMS - occupying.length),
    activeAdmittedCount: activeAdmitted.length,
    pendingTempCount,
    tempRecordedTodayCount,
    readyForDoctorCount,
    waitingForTempBeforeDoctorCount,
    visitedTodayCount,
    dischargeEligibleCount,
    dischargePendingAdminCount: dischargePendingAdmin.length,
    dischargedTotal,
    deceasedTotal,
    resolvedTotal,
    mortalityRatePct,
    successRatePct,
    isMortalityAboveBenchmark:
      resolvedTotal > 0 && mortalityRatePct > MORTALITY_BENCHMARK_PCT,
  };
}

export function getAverageLengthOfStay(
  patients: Patient[],
  today: string = getTodayDate()
): number {
  const relevant = patients.filter(
    (p) => p.status === 'discharged' || p.status === 'admitted' || p.status === 'discharge_approved'
  );
  if (relevant.length === 0) return 0;

  let totalDays = 0;
  for (const p of relevant) {
    const start = new Date(p.admittedDate + 'T00:00:00');
    const endDateStr = p.dischargedAt ?? today;
    const end = new Date(endDateStr + 'T00:00:00');
    const diff = Math.max(
      1,
      Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    );
    totalDays += diff;
  }
  return totalDays / relevant.length;
}

export function createInitialActivityLog(
  patients: Patient[],
  today: string = getTodayDate()
): ActivityEvent[] {
  const events: ActivityEvent[] = [];

  for (const p of patients) {
    for (const t of p.temperatures) {
      if (t.date === today) {
        events.push({
          id: `evt-t-${p.id}-${t.date}`,
          timestamp: `${t.date} ${t.time}`,
          actor: t.recordedBy,
          role: 'nurse',
          patientId: p.id,
          patientName: p.name,
          roomNumber: p.roomNumber,
          type: 'temp_recorded',
          summary: `Recorded temperature ${t.tempC.toFixed(1)}°C${
            hasFever(t.tempC) ? ' (Fever)' : ' (Normal)'
          }`,
        });
      }
    }
    for (const v of p.visits) {
      if (v.date === today) {
        events.push({
          id: `evt-v-${p.id}-${v.date}`,
          timestamp: `${v.date} ${v.time}`,
          actor: v.doctorName,
          role: 'doctor',
          patientId: p.id,
          patientName: p.name,
          roomNumber: p.roomNumber,
          type:
            v.decision === 'approve_discharge'
              ? 'discharge_approved'
              : v.decision === 'mark_deceased'
                ? 'mortality'
                : 'doctor_visit',
          summary:
            v.decision === 'approve_discharge'
              ? 'Confirmed 3-day no-fever criterion; approved for discharge'
              : v.decision === 'mark_deceased'
                ? 'Recorded patient mortality'
                : v.treatmentNote,
        });
      }
    }
  }

  return events.sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 60);
}

