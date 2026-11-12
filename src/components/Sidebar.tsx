import React from 'react';
import {
  LayoutDashboard,
  Users,
  Thermometer,
  Stethoscope,
  LogOut,
  BarChart3,
  History,
  RotateCcw,
  X,
  ShieldCheck,
} from 'lucide-react';
import { NavSection, ROLE_PERMISSIONS, UserRole } from '../types';

interface SidebarProps {
  activeSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  role: UserRole;
  onRoleChange: (role: UserRole) => void;
  onResetDemo: () => void;
  pendingTempCount: number;
  readyForDoctorCount: number;
  dischargePendingAdminCount: number;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const ROLE_PROFILES: Record<
  UserRole,
  { name: string; title: string; initials: string }
> = {
  nurse: { name: 'Kavita Menon', title: 'Charge Nurse', initials: 'KM' },
  doctor: { name: 'Dr. Arvind Rao', title: 'Attending Physician', initials: 'AR' },
  admin: { name: 'S. Deshmukh', title: 'Bed & Ops Admin', initials: 'SD' },
  head_doctor: {
    name: 'Dr. Elena Sen',
    title: 'Head Doctor · Medical Dir.',
    initials: 'ES',
  },
};

// FIX 4: Which NavSection each role may visit
const ROLE_NAV_ACCESS: Record<UserRole, NavSection[]> = {
  nurse: ['overview', 'patients', 'nurse_station'],
  doctor: ['overview', 'patients', 'doctor_queue', 'discharge_management'],
  admin: ['overview', 'patients', 'discharge_management', 'analytics', 'activity_log'],
  head_doctor: ['overview', 'patients', 'doctor_queue', 'discharge_management', 'analytics', 'activity_log'],
};

export const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  onSelectSection,
  role,
  onRoleChange,
  onResetDemo,
  pendingTempCount,
  readyForDoctorCount,
  dischargePendingAdminCount,
  mobileOpen,
  onCloseMobile,
}) => {
  const perms = ROLE_PERMISSIONS[role];
  const allowedSections = ROLE_NAV_ACCESS[role];

  const navGroups: {
    label?: string;
    items: {
      id: NavSection;
      label: string;
      icon: React.ComponentType<{ className?: string }>;
      badge?: number;
    }[];
  }[] = [
    {
      items: [
        { id: 'overview', label: 'Overview', icon: LayoutDashboard },
        { id: 'patients', label: 'Patients', icon: Users },
      ],
    },
    {
      label: 'Daily Operations',
      items: [
        {
          id: 'nurse_station',
          label: 'Nurse Station',
          icon: Thermometer,
          badge: pendingTempCount,
        },
        {
          id: 'doctor_queue',
          label: 'Doctor Queue',
          icon: Stethoscope,
          badge: readyForDoctorCount,
        },
        {
          id: 'discharge_management',
          label: 'Discharge Management',
          icon: LogOut,
          badge: perms.canFinalizeDischarge ? dischargePendingAdminCount : undefined,
        },
      ],
    },
    {
      label: 'Governance',
      items: [
        { id: 'analytics', label: 'Analytics', icon: BarChart3 },
        { id: 'activity_log', label: 'Activity Log', icon: History },
      ],
    },
  ];

  const profile = ROLE_PROFILES[role];

  const handleNavClick = (id: NavSection) => {
    // FIX 4: silently block navigation to unauthorized sections
    if (!allowedSections.includes(id)) return;
    onSelectSection(id);
    onCloseMobile();
  };

  const sidebarContent = (
    <div className="flex h-full w-60 flex-col bg-[#172B43] text-slate-200 select-none">
      {/* Brand */}
      <div className="flex h-14 items-center justify-between border-b border-[#263B52] px-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#087F8C] text-white">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div>
            <div className="text-[14px] font-semibold tracking-tight text-white">
              CareOps
            </div>
            <div className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
              Unit A · 74 Beds
            </div>
          </div>
        </div>
        <button
          onClick={onCloseMobile}
          className="rounded p-1 text-slate-400 hover:bg-[#263B52] hover:text-white lg:hidden cursor-pointer"
          aria-label="Close navigation"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-5 overflow-y-auto px-2.5 py-4">
        {navGroups.map((group, gIdx) => (
          <div key={gIdx}>
            {group.label && (
              <div className="mb-1.5 px-2.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                {group.label}
              </div>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`relative flex w-full items-center justify-between rounded-md px-2.5 py-2 text-[13px] font-medium transition-colors duration-150 cursor-pointer ${
                      active
                        ? 'bg-[#263B52] text-white'
                        : 'text-slate-300 hover:bg-[#263B52]/60 hover:text-white'
                    }`}
                  >
                    {active && (
                      <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r bg-[#087F8C]" />
                    )}
                    <span className="flex items-center gap-2.5">
                      <Icon
                        className={`h-4 w-4 shrink-0 ${
                          active ? 'text-[#2DD4BF]' : 'text-slate-400'
                        }`}
                      />
                      <span>{item.label}</span>
                    </span>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span
                        className={`tabular-nums rounded px-1.5 py-0.5 text-[11px] font-medium leading-none ${
                          active
                            ? 'bg-[#087F8C] text-white'
                            : 'bg-[#263B52] text-slate-300'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom Profile & Role Switcher */}
      <div className="border-t border-[#263B52] p-3">
        <div className="mb-2 flex items-center gap-2.5 px-1">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#263B52] text-xs font-semibold text-white">
            {profile.initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[12px] font-semibold text-white">
              {profile.name}
            </div>
            <div className="truncate text-[11px] text-slate-400">
              {profile.title}
            </div>
          </div>
        </div>

        <label className="block px-1 text-[10px] font-medium uppercase tracking-wider text-slate-400">
          Active Role
        </label>
        <select
          value={role}
          onChange={(e) => onRoleChange(e.target.value as UserRole)}
          aria-label="Switch user role"
          className="mt-1 w-full rounded-md border border-[#354E6B] bg-[#263B52] px-2.5 py-1.5 text-[12px] font-medium text-white focus:border-[#087F8C] focus:outline-none cursor-pointer"
        >
          <option value="nurse">Nurse (Temperature Rounds)</option>
          <option value="doctor">Doctor (Clinical Queue)</option>
          <option value="admin">Admin Staff (Beds &amp; Intake)</option>
          <option value="head_doctor">Head Doctor (Quality &amp; Ops)</option>
        </select>

        <button
          onClick={onResetDemo}
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-md border border-[#354E6B] bg-transparent px-2.5 py-1.5 text-[11px] font-medium text-slate-300 transition-colors duration-150 hover:bg-[#263B52] hover:text-white cursor-pointer"
        >
          <RotateCcw className="h-3 w-3" />
          <span>Reset Demo Baseline</span>
        </button>

        {/* FIX 5 — Demo mode notice */}
        <div className="mt-3 rounded-md border border-[#354E6B]/60 bg-[#172B43] px-2.5 py-2">
          <p className="text-[10px] font-medium uppercase tracking-wider text-amber-400/80">
            ⚠ Demo Mode
          </p>
          <p className="mt-0.5 text-[10px] leading-relaxed text-slate-400">
            Data stored in localStorage only. No production security or authentication.
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop fixed sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:block">
        {sidebarContent}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-[#172B43]/50"
            onClick={onCloseMobile}
          />
          <div className="relative z-10">{sidebarContent}</div>
        </div>
      )}
    </>
  );
};

