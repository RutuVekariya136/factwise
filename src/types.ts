export type UserRole = 'nurse' | 'doctor' | 'admin' | 'head_doctor';

// ── RBAC permission matrix ────────────────────────────────────────────────────
export const ROLE_PERMISSIONS: Record<UserRole, {
  canAdmit: boolean;
  canRecordTemp: boolean;
  canDoctorVisit: boolean;
  canConfirmDischarge: boolean;   // doctor: clinical sign-off
  canFinalizeDischarge: boolean;  // admin:  bed release
  canViewAnalytics: boolean;
  canViewActivityLog: boolean;
}> = {
  nurse: {
    canAdmit: false,
    canRecordTemp: true,
    canDoctorVisit: false,
    canConfirmDischarge: false,
    canFinalizeDischarge: false,
    canViewAnalytics: false,
    canViewActivityLog: false,
  },
  doctor: {
    canAdmit: false,
    canRecordTemp: false,
    canDoctorVisit: true,
    canConfirmDischarge: true,
    canFinalizeDischarge: false,
    canViewAnalytics: false,
    canViewActivityLog: false,
  },
  admin: {
    canAdmit: true,
    canRecordTemp: false,
    canDoctorVisit: false,
    canConfirmDischarge: false,
    canFinalizeDischarge: true,
    canViewAnalytics: true,
    canViewActivityLog: true,
  },
  head_doctor: {
    canAdmit: false,
    canRecordTemp: false,
    canDoctorVisit: true,
    canConfirmDischarge: true,
    canFinalizeDischarge: false,
    canViewAnalytics: true,
    canViewActivityLog: true,
  },
};

export type NavSection =
  | 'overview'
  | 'patients'
  | 'nurse_station'
  | 'doctor_queue'
  | 'discharge_management'
  | 'analytics'
  | 'activity_log';

export const ROLE_NAV_ACCESS: Record<UserRole, NavSection[]> = {
  nurse: ['overview', 'patients', 'nurse_station'],
  doctor: ['overview', 'patients', 'doctor_queue', 'discharge_management'],
  admin: ['overview', 'patients', 'discharge_management', 'analytics', 'activity_log'],
  head_doctor: ['overview', 'patients', 'doctor_queue', 'discharge_management', 'analytics', 'activity_log'],
};

export interface ActivityEvent {
  id: string;
  timestamp: string; // YYYY-MM-DD HH:MM
  actor: string;
  role: UserRole;
  patientId: string;
  patientName: string;
  roomNumber: number | null;
  type:
    | 'temp_recorded'
    | 'temp_corrected'
    | 'doctor_visit'
    | 'doctor_visit_correction'
    | 'doctor_visit_urgent_override'
    | 'discharge_approved'
    | 'discharged'
    | 'admitted'
    | 'mortality';
  summary: string;
  isUrgentOverride?: boolean;
  overrideReason?: string;
}

export type PatientStatus =
  | 'admitted'
  | 'discharge_approved'
  | 'discharged'
  | 'deceased';

export interface TemperatureLog {
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  tempC: number;
  recordedBy: string;
  note?: string;
}

export interface DoctorVisitLog {
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  doctorName: string;
  treatmentNote: string;
  decision: 'continue_treatment' | 'approve_discharge' | 'mark_deceased';
  isCorrection?: boolean;         // FIX 1: second-visit correction flag
  correctionReason?: string;      // FIX 1: mandatory correction justification
  isUrgentOverride?: boolean;     // FIX 2: visit without today's temperature
  urgentOverrideReason?: string;  // FIX 2: mandatory clinical justification
}

export interface Patient {
  id: string;
  name: string;
  age: number;
  gender: 'M' | 'F' | 'O';
  roomNumber: number | null; // 1..74 when occupying a room
  admittedDate: string;
  status: PatientStatus;
  temperatures: TemperatureLog[];
  visits: DoctorVisitLog[];
  dischargeApprovedAt?: string;
  dischargedAt?: string;
  deceasedAt?: string;
}

export const TOTAL_ROOMS = 74;
export const FEVER_THRESHOLD_C = 37.5;
export const NO_FEVER_DAYS_REQUIRED = 3;
export const MORTALITY_BENCHMARK_PCT = 15;
export const SUCCESS_BENCHMARK_PCT = 85;

