import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Menu } from 'lucide-react';
import { ActivityEvent, NavSection, Patient, ROLE_PERMISSIONS, UserRole } from './types';
import { createSeedPatients } from './data/seedPatients';
import {
  computeFacilityStats,
  createInitialActivityLog,
  getCurrentTime,
  getTodayDate,
  getVacantRooms,
} from './utils/clinical';
import { Sidebar } from './components/Sidebar';
import { OverviewView } from './components/OverviewView';
import { PatientDirectoryView } from './components/PatientDirectoryView';
import { NurseStationView } from './components/NurseStationView';
import { DoctorQueueView } from './components/DoctorQueueView';
import { DischargeManagementView } from './components/DischargeManagementView';
import { AnalyticsView } from './components/AnalyticsView';
import { ActivityLogView } from './components/ActivityLogView';
import { PatientDetailModal } from './components/PatientDetailModal';
import { AdmitPatientModal } from './components/AdmitPatientModal';
import { LoginView } from './components/LoginView';
import { isSupabaseConfigured, supabase } from './lib/supabase';
import {
  admitPatientInSupabase,
  AuthProfile,
  fetchActivityEventsFromSupabase,
  fetchAllPatientsFromSupabase,
  fetchUserProfile,
  finalizeDischargeInSupabase,
  insertActivityEventToSupabase,
  insertDoctorVisitToSupabase,
  insertTemperatureToSupabase,
} from './lib/careopsApi';

const STORAGE_KEY = 'careops_patients_v2';

function loadInitialPatients(): Patient[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // Fallback to seed data
  }
  return createSeedPatients();
}

export function App() {
  const [role, setRole] = useState<UserRole>('nurse');
  const [activeSection, setActiveSection] = useState<NavSection>('overview');
  const [patients, setPatients] = useState<Patient[]>(loadInitialPatients);
  const [activityLog, setActivityLog] = useState<ActivityEvent[]>(() =>
    createInitialActivityLog(loadInitialPatients())
  );
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(
    null
  );
  const [showAdmitModal, setShowAdmitModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(isSupabaseConfigured);
  const [authProfile, setAuthProfile] = useState<AuthProfile | null>(null);

  // Supabase Auth & initial data load
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setAuthLoading(false);
      return;
    }

    let mounted = true;

    const loadSessionAndData = async () => {
      try {
        const { data } = await supabase!.auth.getSession();
        const user = data.session?.user;
        if (!user) {
          if (mounted) {
            setAuthProfile(null);
            setAuthLoading(false);
          }
          return;
        }
        const profile = await fetchUserProfile(user.id);
        if (mounted && profile) {
          setAuthProfile({ ...profile, email: user.email });
          setRole(profile.role);
          const [dbPatients, dbEvents] = await Promise.all([
            fetchAllPatientsFromSupabase(),
            fetchActivityEventsFromSupabase(),
          ]);
          if (mounted) {
            setPatients(dbPatients);
            setActivityLog(dbEvents);
          }
        }
      } catch {
        if (mounted) {
          setToast('Failed to load clinical data from Supabase.');
        }
      } finally {
        if (mounted) setAuthLoading(false);
      }
    };

    loadSessionAndData();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setAuthProfile(null);
        return;
      }
      loadSessionAndData();
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setAuthProfile(null);
    setActiveSection('overview');
  };

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(patients));
    } catch {
      // Ignore storage quota errors
    }
  }, [patients]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(timer);
  }, [toast]);

  const today = getTodayDate();
  const stats = useMemo(
    () => computeFacilityStats(patients, today),
    [patients, today]
  );
  const vacantRooms = useMemo(() => getVacantRooms(patients), [patients]);

  const selectedPatient = useMemo(
    () => patients.find((p) => p.id === selectedPatientId) ?? null,
    [patients, selectedPatientId]
  );

  const appendEvent = (event: Omit<ActivityEvent, 'id' | 'timestamp'>) => {
    const time = getCurrentTime();
    const fullEvent: ActivityEvent = {
      ...event,
      id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: `${today} ${time}`,
    };
    setActivityLog((prev) => [fullEvent, ...prev]);
    if (isSupabaseConfigured) {
      insertActivityEventToSupabase({
        timestamp: fullEvent.timestamp,
        actor: fullEvent.actor,
        role: fullEvent.role,
        patientId: fullEvent.patientId,
        patientName: fullEvent.patientName,
        roomNumber: fullEvent.roomNumber,
        type: fullEvent.type,
        summary: fullEvent.summary,
        isUrgentOverride: fullEvent.isUrgentOverride,
        overrideReason: fullEvent.overrideReason,
      }).catch(() => {});
    }
  };

  const handleResetDemo = () => {
    const fresh = createSeedPatients();
    setPatients(fresh);
    setActivityLog(createInitialActivityLog(fresh, today));
    setSelectedPatientId(null);
    setShowAdmitModal(false);
    setToast('Demo reset to 74/74 full occupancy baseline.');
  };

  const handleRecordTemp = (
    patientId: string,
    tempC: number,
    note?: string
  ) => {
    const time = getCurrentTime();
    let targetPatient: Patient | undefined;
    let isCorrection = false;

    setPatients((prev) =>
      prev.map((p) => {
        if (p.id !== patientId) return p;
        targetPatient = p;
        isCorrection = p.temperatures.some((t) => t.date === today);
        const filtered = p.temperatures.filter((t) => t.date !== today);
        return {
          ...p,
          temperatures: [
            ...filtered,
            {
              date: today,
              time,
              tempC,
              recordedBy: 'Kavita Menon (RN)',
              note,
            },
          ],
        };
      })
    );

    if (targetPatient) {
      if (isSupabaseConfigured) {
        insertTemperatureToSupabase(targetPatient.id, {
          date: today,
          time,
          tempC,
          recordedBy: authProfile?.fullName ?? 'Kavita Menon (RN)',
          note,
        }).catch((err) => {
          setToast(`Database policy error: ${err?.message ?? 'Unable to save temperature.'}`);
        });
      }
      appendEvent({
        actor: authProfile?.fullName ?? 'Kavita Menon (RN)',
        role: 'nurse',
        patientId: targetPatient.id,
        patientName: targetPatient.name,
        roomNumber: targetPatient.roomNumber,
        type: isCorrection ? 'temp_corrected' : 'temp_recorded',
        summary: `${isCorrection ? 'Corrected' : 'Recorded'} temperature ${tempC.toFixed(1)}°C${note ? ` — ${note}` : ''}`,
      });
      setToast(
        `Saved ${tempC.toFixed(1)}°C for Room ${targetPatient.roomNumber ?? ''} (${targetPatient.name}).`
      );
    }
  };

  const handleDoctorVisit = (
    patientId: string,
    treatmentNote: string,
    decision: 'continue_treatment' | 'approve_discharge' | 'mark_deceased',
    opts?: {
      isCorrection?: boolean;
      correctionReason?: string;
      isUrgentOverride?: boolean;
      urgentOverrideReason?: string;
    }
  ) => {
    // FIX 4: enforce permission at handler level
    if (!ROLE_PERMISSIONS[role].canDoctorVisit) {
      setToast('Permission denied: Only physicians may document clinical visits.');
      return;
    }

    const time = getCurrentTime();
    let targetPatient: Patient | undefined;

    setPatients((prev) =>
      prev.map((p) => {
        if (p.id !== patientId) return p;
        targetPatient = p;

        const nextVisit = {
          date: today,
          time,
          doctorName: 'Dr. Arvind Rao',
          treatmentNote,
          decision,
          isCorrection: opts?.isCorrection,
          correctionReason: opts?.correctionReason,
          isUrgentOverride: opts?.isUrgentOverride,
          urgentOverrideReason: opts?.urgentOverrideReason,
        };

        // FIX 1: preserve original visit; append correction instead of silently overwriting
        const baseVisits = opts?.isCorrection
          ? p.visits  // keep existing visits intact, just add new entry
          : p.visits.filter((v) => v.date !== today); // first visit of day: replace

        if (decision === 'approve_discharge') {
          return {
            ...p,
            status: 'discharge_approved',
            dischargeApprovedAt: `${today} ${time}`,
            visits: [...baseVisits, nextVisit],
          };
        }
        if (decision === 'mark_deceased') {
          return {
            ...p,
            status: 'deceased',
            roomNumber: null,
            deceasedAt: today,
            visits: [...baseVisits, nextVisit],
          };
        }
        return {
          ...p,
          visits: [...baseVisits, nextVisit],
        };
      })
    );

    if (targetPatient) {
      if (isSupabaseConfigured) {
        insertDoctorVisitToSupabase(
          targetPatient.id,
          {
            date: today,
            time,
            doctorName: authProfile?.fullName ?? 'Dr. Arvind Rao',
            treatmentNote,
            decision,
            isCorrection: opts?.isCorrection,
            correctionReason: opts?.correctionReason,
            isUrgentOverride: opts?.isUrgentOverride,
            urgentOverrideReason: opts?.urgentOverrideReason,
          },
          decision === 'approve_discharge'
            ? { status: 'discharge_approved', dischargeApprovedAt: `${today} ${time}` }
            : decision === 'mark_deceased'
              ? { status: 'deceased', deceasedAt: today }
              : undefined
        ).catch((err) => {
          setToast(`Database policy error: ${err?.message ?? 'Unable to save visit.'}`);
        });
      }

      const eventType =
        opts?.isUrgentOverride
          ? 'doctor_visit_urgent_override'
          : opts?.isCorrection
            ? 'doctor_visit_correction'
            : decision === 'approve_discharge'
              ? 'discharge_approved'
              : decision === 'mark_deceased'
                ? 'mortality'
                : 'doctor_visit';

      const summary =
        opts?.isUrgentOverride
          ? `URGENT OVERRIDE — ${treatmentNote} [Override reason: ${opts.urgentOverrideReason ?? 'n/a'}]`
          : opts?.isCorrection
            ? `CORRECTION — ${treatmentNote} [Correction reason: ${opts.correctionReason ?? 'n/a'}]`
            : decision === 'approve_discharge'
              ? 'Confirmed 3-day no-fever criterion; queued for Admin discharge'
              : decision === 'mark_deceased'
                ? 'Recorded patient mortality'
                : treatmentNote;

      appendEvent({
        actor: 'Dr. Arvind Rao',
        role: 'doctor',
        patientId: targetPatient.id,
        patientName: targetPatient.name,
        roomNumber: targetPatient.roomNumber,
        type: eventType as ActivityEvent['type'],
        summary,
        isUrgentOverride: opts?.isUrgentOverride,
        overrideReason: opts?.urgentOverrideReason,
      });

      if (decision === 'approve_discharge') {
        setToast(
          `${targetPatient.name} confirmed for discharge — sent to Discharge Management.`
        );
      } else if (decision === 'mark_deceased') {
        setToast(
          `Recorded mortality for ${targetPatient.name}. Benchmarks recalculated.`
        );
      } else if (opts?.isUrgentOverride) {
        setToast(`URGENT visit logged for ${targetPatient.name}. Follow-up nurse temp required.`);
      } else if (opts?.isCorrection) {
        setToast(`Clinical correction recorded for ${targetPatient.name}.`);
      } else {
        setToast(`Clinical visit logged for ${targetPatient.name}.`);
      }
    }
  };

  // FIX 3: handleCompleteDischarge enforces admin-only at handler level
  const handleCompleteDischarge = (patientId: string, callerRole?: UserRole) => {
    const effectiveRole = callerRole ?? role;
    if (!ROLE_PERMISSIONS[effectiveRole].canFinalizeDischarge) {
      setToast('Permission denied: Only Admin Staff may finalize patient discharge.');
      return;
    }

    let freedRoom: number | null = null;
    let patientName = '';

    setPatients((prev) =>
      prev.map((p) => {
        if (p.id !== patientId) return p;
        freedRoom = p.roomNumber;
        patientName = p.name;
        return {
          ...p,
          status: 'discharged',
          roomNumber: null,
          dischargedAt: today,
        };
      })
    );

    if (patientName) {
      if (isSupabaseConfigured) {
        finalizeDischargeInSupabase(patientId, today).catch((err) => {
          setToast(`Database policy error: ${err?.message ?? 'Unable to finalize discharge.'}`);
        });
      }
      appendEvent({
        actor: authProfile?.fullName ?? 'S. Deshmukh (Admin)',
        role: 'admin',
        patientId,
        patientName,
        roomNumber: freedRoom,
        type: 'discharged',
        summary: `Completed discharge and vacated Room ${freedRoom ?? ''}`,
      });
      setToast(
        `Discharged ${patientName}. Room ${freedRoom ?? ''} is now vacant.`
      );
    }
  };

  const handleAdmitPatient = (data: {
    name: string;
    age: number;
    gender: 'M' | 'F' | 'O';
    roomNumber: number;
    initialTempC: number;
  }) => {
    const time = getCurrentTime();
    const newId = `PT-${Math.floor(3000 + Math.random() * 6999)}`;
    const newPatient: Patient = {
      id: newId,
      name: data.name,
      age: data.age,
      gender: data.gender,
      roomNumber: data.roomNumber,
      admittedDate: today,
      status: 'admitted',
      temperatures: [
        {
          date: today,
          time,
          tempC: data.initialTempC,
          recordedBy: 'S. Deshmukh (Admin)',
          note: 'Intake admission reading',
        },
      ],
      visits: [],
    };

    setPatients((prev) => [newPatient, ...prev]);
    if (isSupabaseConfigured) {
      admitPatientInSupabase(newPatient).catch((err) => {
        setToast(`Database policy error: ${err?.message ?? 'Unable to admit patient.'}`);
      });
    }
    appendEvent({
      actor: 'S. Deshmukh (Admin)',
      role: 'admin',
      patientId: newId,
      patientName: data.name,
      roomNumber: data.roomNumber,
      type: 'admitted',
      summary: `Admitted to Room ${data.roomNumber} (Intake temp ${data.initialTempC.toFixed(1)}°C)`,
    });
    setToast(`Admitted ${data.name} to Room ${data.roomNumber}.`);
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F6F8FA] text-[13px] text-[#718096]">
        Connecting to CareOps...
      </div>
    );
  }

  if (isSupabaseConfigured && !authProfile) {
    return <LoginView />;
  }

  return (
    <div className="min-h-screen bg-[#F6F8FA] text-[#192B3D]">
      <Sidebar
        activeSection={activeSection}
        onSelectSection={setActiveSection}
        role={role}
        onRoleChange={setRole}
        onResetDemo={handleResetDemo}
        pendingTempCount={stats.pendingTempCount}
        readyForDoctorCount={stats.readyForDoctorCount}
        dischargePendingAdminCount={stats.dischargePendingAdminCount}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        authUserName={authProfile?.fullName}
        onSignOut={isSupabaseConfigured ? handleSignOut : undefined}
      />

      {/* Mobile Top Header */}
      <header className="sticky top-0 z-20 flex h-12 items-center justify-between border-b border-[#E3E9EF] bg-white px-4 lg:hidden">
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="flex items-center gap-2 text-[13px] font-semibold text-[#192B3D] cursor-pointer"
          aria-label="Open navigation"
        >
          <Menu className="h-4 w-4" />
          <span>CareOps</span>
        </button>
        <span className="tabular-nums text-[11px] font-medium text-[#718096]">
          {stats.occupiedCount}/{stats.totalRooms} Beds
        </span>
      </header>

      {/* Main Content Area */}
      <main className="lg:pl-60">
        <div className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6">
          {activeSection === 'overview' && (
            <OverviewView
              patients={patients}
              stats={stats}
              role={role}
              onSelectPatient={(p) => setSelectedPatientId(p.id)}
              onNavigate={setActiveSection}
              onOpenAdmit={() => setShowAdmitModal(true)}
            />
          )}

          {activeSection === 'patients' && (
            <PatientDirectoryView
              patients={patients}
              onSelectPatient={(p) => setSelectedPatientId(p.id)}
            />
          )}

          {activeSection === 'nurse_station' && (
            <NurseStationView
              patients={patients}
              onRecordTemp={handleRecordTemp}
              onSelectPatient={(p) => setSelectedPatientId(p.id)}
            />
          )}

          {activeSection === 'doctor_queue' && (
            <DoctorQueueView
              patients={patients}
              onSelectPatient={(p) => setSelectedPatientId(p.id)}
            />
          )}

          {activeSection === 'discharge_management' && (
            <DischargeManagementView
              patients={patients}
              stats={stats}
              role={role}
              onCompleteDischarge={(id, callerRole) => handleCompleteDischarge(id, callerRole)}
              onSelectPatient={(p) => setSelectedPatientId(p.id)}
              onOpenAdmit={() => setShowAdmitModal(true)}
            />
          )}

          {activeSection === 'analytics' && (
            <AnalyticsView patients={patients} stats={stats} />
          )}

          {activeSection === 'activity_log' && (
            <ActivityLogView events={activityLog} />
          )}
        </div>
      </main>

      {selectedPatient && (
        <PatientDetailModal
          patient={selectedPatient}
          role={role}
          onClose={() => setSelectedPatientId(null)}
          onRecordTemp={handleRecordTemp}
          onDoctorVisit={handleDoctorVisit}
          onCompleteDischarge={(id, callerRole) => handleCompleteDischarge(id, callerRole)}
        />
      )}

      {showAdmitModal && vacantRooms.length > 0 && (
        <AdmitPatientModal
          vacantRooms={vacantRooms}
          onClose={() => setShowAdmitModal(false)}
          onAdmit={handleAdmitPatient}
        />
      )}

      {toast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-md border border-[#263B52] bg-[#172B43] px-3.5 py-2.5 text-[12px] font-medium text-white shadow-md">
          <CheckCircle2 className="h-3.5 w-3.5 text-[#2DD4BF]" />
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}

export default App;
