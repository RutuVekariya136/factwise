import React, { useState } from 'react';
import { X } from 'lucide-react';

interface AdmitPatientModalProps {
  vacantRooms: number[];
  initialRoom?: number;
  onClose: () => void;
  onAdmit: (data: {
    name: string;
    age: number;
    gender: 'M' | 'F' | 'O';
    roomNumber: number;
    initialTempC: number;
  }) => void;
}

export const AdmitPatientModal: React.FC<AdmitPatientModalProps> = ({
  vacantRooms,
  initialRoom,
  onClose,
  onAdmit,
}) => {
  const [name, setName] = useState('');
  const [age, setAge] = useState('34');
  const [gender, setGender] = useState<'M' | 'F' | 'O'>('M');
  const [selectedRoom, setSelectedRoom] = useState<number>(
    initialRoom ?? vacantRooms[0] ?? 1
  );
  const [initialTemp, setInitialTemp] = useState('38.4');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (name.trim().length < 2) {
      setError('Please enter the patient’s full name.');
      return;
    }
    const parsedAge = parseInt(age, 10);
    if (Number.isNaN(parsedAge) || parsedAge < 0 || parsedAge > 120) {
      setError('Age must be between 0 and 120.');
      return;
    }
    const parsedTemp = parseFloat(initialTemp);
    if (Number.isNaN(parsedTemp) || parsedTemp < 34.0 || parsedTemp > 43.0) {
      setError('Initial temperature must be between 34.0°C and 43.0°C.');
      return;
    }
    onAdmit({
      name: name.trim(),
      age: parsedAge,
      gender,
      roomNumber: selectedRoom,
      initialTempC: Number(parsedTemp.toFixed(1)),
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#172B43]/45 p-4"
      role="dialog"
      aria-modal="true"
    >
      <form
        onSubmit={handleAdmitSubmitWrapper(handleSubmit)}
        className="w-full max-w-md rounded-lg border border-[#E3E9EF] bg-white shadow-lg"
      >
        <div className="flex items-center justify-between border-b border-[#E3E9EF] px-5 py-3.5">
          <div>
            <h3 className="text-[15px] font-semibold text-[#192B3D]">
              Admit Patient
            </h3>
            <p className="text-[11px] text-[#718096]">
              Assign to a vacant quarantine room and record intake temperature.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-[#718096] hover:bg-[#F6F8FA] hover:text-[#192B3D] cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3.5 p-5">
          <div>
            <label className="block text-[11px] font-medium text-[#192B3D]">
              Patient Full Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Meera Krishnan"
              className="mt-1 h-9 w-full rounded-md border border-[#E3E9EF] bg-white px-3 text-[13px] text-[#192B3D] focus:border-[#087F8C] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-[#192B3D]">
                Age
              </label>
              <input
                type="number"
                min="0"
                max="120"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="tabular-nums mt-1 h-9 w-full rounded-md border border-[#E3E9EF] bg-white px-3 text-[13px] text-[#192B3D] focus:border-[#087F8C] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-[#192B3D]">
                Gender
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as 'M' | 'F' | 'O')}
                className="mt-1 h-9 w-full rounded-md border border-[#E3E9EF] bg-white px-3 text-[13px] text-[#192B3D] focus:border-[#087F8C] focus:outline-none"
              >
                <option value="M">Male</option>
                <option value="F">Female</option>
                <option value="O">Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-[#192B3D]">
                Assign Room
              </label>
              <select
                value={selectedRoom}
                onChange={(e) => setSelectedRoom(Number(e.target.value))}
                className="tabular-nums mt-1 h-9 w-full rounded-md border border-[#E3E9EF] bg-white px-3 text-[13px] text-[#192B3D] focus:border-[#087F8C] focus:outline-none"
              >
                {vacantRooms.map((r) => (
                  <option key={r} value={r}>
                    Room {r}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-[#192B3D]">
                Intake Temp (°C)
              </label>
              <input
                type="number"
                step="0.1"
                min="34.0"
                max="43.0"
                value={initialTemp}
                onChange={(e) => setInitialTemp(e.target.value)}
                className="tabular-nums mt-1 h-9 w-full rounded-md border border-[#E3E9EF] bg-white px-3 text-[13px] text-[#192B3D] focus:border-[#087F8C] focus:outline-none"
              />
            </div>
          </div>

          {error && (
            <p className="text-[12px] font-medium text-[#C23B3B]">{error}</p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-[#E3E9EF] bg-[#F6F8FA] px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="h-8 rounded-md border border-[#E3E9EF] bg-white px-3.5 text-[12px] font-medium text-[#192B3D] hover:bg-[#F6F8FA] cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="h-8 rounded-md bg-[#087F8C] px-3.5 text-[12px] font-medium text-white hover:bg-[#066974] cursor-pointer"
          >
            Confirm Admission
          </button>
        </div>
      </form>
    </div>
  );
};

function handleAdmitSubmitWrapper(fn: (e: React.FormEvent) => void) {
  return fn;
}

