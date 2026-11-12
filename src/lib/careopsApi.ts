import {
  ActivityEvent,
  DoctorVisitLog,
  Patient,
  TemperatureLog,
  UserRole,
} from '../types';
import { supabase } from './supabase';

export interface AuthProfile {
  id: string;
  fullName: string;
  role: UserRole;
  email?: string;
}

export async function fetchUserProfile(userId: string): Promise<AuthProfile | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .eq('id', userId)
    .single();

  if (error || !data) return null;
  return {
    id: data.id,
    fullName: data.full_name,
    role: data.role as UserRole,
  };
}

export async function fetchAllPatientsFromSupabase(): Promise<Patient[]> {
  if (!supabase) return [];

  const [patientsRes, tempsRes, visitsRes] = await Promise.all([
    supabase.from('patients').select('*').order('created_at', { ascending: false }),
    supabase.from('temperature_logs').select('*').order('date', { ascending: true }),
    supabase.from('doctor_visits').select('*').order('date', { ascending: true }),
  ]);

  if (patientsRes.error) throw patientsRes.error;
  if (tempsRes.error) throw tempsRes.error;
  if (visitsRes.error) throw visitsRes.error;

  const tempsByPatient = new Map<string, TemperatureLog[]>();
  for (const row of tempsRes.data ?? []) {
    const list = tempsByPatient.get(row.patient_id) ?? [];
    list.push({
      date: row.date,
      time: row.time,
      tempC: Number(row.temp_c),
      recordedBy: row.recorded_by,
      note: row.note ?? undefined,
    });
    tempsByPatient.set(row.patient_id, list);
  }

  const visitsByPatient = new Map<string, DoctorVisitLog[]>();
  for (const row of visitsRes.data ?? []) {
    const list = visitsByPatient.get(row.patient_id) ?? [];
    list.push({
      date: row.date,
      time: row.time,
      doctorName: row.doctor_name,
      treatmentNote: row.treatment_note,
      decision: row.decision,
      isCorrection: row.is_correction,
      correctionReason: row.correction_reason ?? undefined,
      isUrgentOverride: row.is_urgent_override,
      urgentOverrideReason: row.urgent_override_reason ?? undefined,
    });
    visitsByPatient.set(row.patient_id, list);
  }

  return (patientsRes.data ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    age: p.age,
    gender: p.gender,
    roomNumber: p.room_number,
    admittedDate: p.admitted_date,
    status: p.status,
    temperatures: tempsByPatient.get(p.id) ?? [],
    visits: visitsByPatient.get(p.id) ?? [],
    dischargeApprovedAt: p.discharge_approved_at ?? undefined,
    dischargedAt: p.discharged_at ?? undefined,
    deceasedAt: p.deceased_at ?? undefined,
  }));
}

export async function fetchActivityEventsFromSupabase(): Promise<ActivityEvent[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('activity_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) return [];
  return (data ?? []).map((e) => ({
    id: e.id,
    timestamp: e.timestamp,
    actor: e.actor,
    role: e.role as UserRole,
    patientId: e.patient_id,
    patientName: e.patient_name,
    roomNumber: e.room_number,
    type: e.type,
    summary: e.summary,
    isUrgentOverride: e.is_urgent_override ?? undefined,
    overrideReason: e.override_reason ?? undefined,
  }));
}

export async function insertTemperatureToSupabase(
  patientId: string,
  log: TemperatureLog
): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('temperature_logs').insert({
    patient_id: patientId,
    date: log.date,
    time: log.time,
    temp_c: log.tempC,
    recorded_by: log.recordedBy,
    note: log.note ?? null,
  });
  if (error) throw error;
}

export async function insertDoctorVisitToSupabase(
  patientId: string,
  visit: DoctorVisitLog,
  statusUpdate?: {
    status: 'discharge_approved' | 'deceased';
    dischargeApprovedAt?: string;
    deceasedAt?: string;
  }
): Promise<void> {
  if (!supabase) return;
  const { error: visitErr } = await supabase.from('doctor_visits').insert({
    patient_id: patientId,
    date: visit.date,
    time: visit.time,
    doctor_name: visit.doctorName,
    treatment_note: visit.treatmentNote,
    decision: visit.decision,
    is_correction: Boolean(visit.isCorrection),
    correction_reason: visit.correctionReason ?? null,
    is_urgent_override: Boolean(visit.isUrgentOverride),
    urgent_override_reason: visit.urgentOverrideReason ?? null,
  });
  if (visitErr) throw visitErr;

  if (statusUpdate) {
    const patch: Record<string, unknown> = { status: statusUpdate.status };
    if (statusUpdate.status === 'discharge_approved') {
      patch.discharge_approved_at = statusUpdate.dischargeApprovedAt ?? null;
    } else if (statusUpdate.status === 'deceased') {
      patch.room_number = null;
      patch.deceased_at = statusUpdate.deceasedAt ?? null;
    }
    const { error: patErr } = await supabase
      .from('patients')
      .update(patch)
      .eq('id', patientId);
    if (patErr) throw patErr;
  }
}

export async function finalizeDischargeInSupabase(
  patientId: string,
  dischargedAt: string
): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from('patients')
    .update({
      status: 'discharged',
      room_number: null,
      discharged_at: dischargedAt,
    })
    .eq('id', patientId);
  if (error) throw error;
}

export async function admitPatientInSupabase(patient: Patient): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('patients').insert({
    id: patient.id,
    name: patient.name,
    age: patient.age,
    gender: patient.gender,
    room_number: patient.roomNumber,
    admitted_date: patient.admittedDate,
    status: patient.status,
  });
  if (error) throw error;
}

export async function insertActivityEventToSupabase(
  event: Omit<ActivityEvent, 'id'>
): Promise<void> {
  if (!supabase) return;
  await supabase.from('activity_events').insert({
    timestamp: event.timestamp,
    actor: event.actor,
    role: event.role,
    patient_id: event.patientId,
    patient_name: event.patientName,
    room_number: event.roomNumber,
    type: event.type,
    summary: event.summary,
    is_urgent_override: event.isUrgentOverride ?? null,
    override_reason: event.overrideReason ?? null,
  });
}

