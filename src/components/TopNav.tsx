import React from 'react';
import {
  Activity,
  Stethoscope,
  ClipboardCheck,
  Building2,
  BarChart3,
  RotateCcw,
} from 'lucide-react';
import { UserRole } from '../types';

interface TopNavProps {
  role: UserRole;
  onRoleChange: (role: UserRole) => void;
  onResetDemo: () => void;
  pendingTempCount: number;
  readyForDoctorCount: number;
  dischargePendingAdminCount: number;
}

const ROLES: {
  id: UserRole;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'nurse', label: 'Nurse', icon: Activity },
  { id: 'doctor', label: 'Doctor', icon: Stethoscope },
  { id: 'admin', label: 'Admin Staff', icon: Building2 },
  { id: 'head_doctor', label: 'Head Doctor', icon: BarChart3 },
];

export const TopNav: React.FC<TopNavProps> = ({
  role,
  onRoleChange,
  onResetDemo,
  pendingTempCount,
  readyForDoctorCount,
  dischargePendingAdminCount,
}) => {
  const getBadge = (id: UserRole): number | null => {
    if (id === 'nurse' && pendingTempCount > 0) return pendingTempCount;
    if (id === 'doctor' && readyForDoctorCount > 0) return readyForDoctorCount;
    if (id === 'admin' && dischargePendingAdminCount > 0)
      return dischargePendingAdminCount;
    return null;
  };

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
            <ClipboardCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-slate-900">
                WardPulse
              </h1>
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-blue-200">
                74-Bed Quarantine Ops
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Daily Temperature Tracking, Doctor Rounds &amp; Discharge Control
            </p>
          </div>
        </div>

        <nav
          aria-label="User role switcher"
          className="flex flex-wrap items-center gap-1.5 rounded-xl bg-slate-100 p-1"
        >
          {ROLES.map((r) => {
            const Icon = r.icon;
            const active = role === r.id;
            const badge = getBadge(r.id);
            return (
              <button
                key={r.id}
                onClick={() => onRoleChange(r.id)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all cursor-pointer ${
                  active
                    ? 'bg-white text-blue-700 shadow-sm ring-1 ring-slate-200'
                    : 'text-slate-600 hover:bg-slate-200/60 hover:text-slate-900'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{r.label}</span>
                {badge !== null && (
                  <span
                    className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold leading-none ${
                      active
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <button
          onClick={onResetDemo}
          title="Reset all 74 rooms and metrics to initial state"
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 cursor-pointer"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Reset Demo</span>
        </button>
      </div>
    </header>
  );
};

