import { Patient, TemperatureLog, DoctorVisitLog } from '../types';
import { getDateOffset } from '../utils/clinical';

const FIRST_NAMES = [
  'Aarav', 'Priya', 'Rohan', 'Ananya', 'Vikram', 'Sneha', 'Karthik', 'Meera',
  'Arjun', 'Divya', 'Siddharth', 'Neha', 'Rahul', 'Pooja', 'Aditya', 'Kavya',
  'Nikhil', 'Ishita', 'Suresh', 'Lakshmi', 'Varun', 'Riya', 'Manish', 'Nandini',
  'Deepak', 'Shruti', 'Gaurav', 'Swati', 'Pranav', 'Aditi', 'Kiran', 'Tanvi',
  'Rajesh', 'Bhavna', 'Harish', 'Anjali', 'Vivek', 'Simran', 'Ashish', 'Komal',
];

const LAST_NAMES = [
  'Sharma', 'Patel', 'Reddy', 'Nair', 'Verma', 'Iyer', 'Gupta', 'Mehta',
  'Joshi', 'Kulkarni', 'Singh', 'Das', 'Rao', 'Bhat', 'Kapoor', 'Malhotra',
  'Choudhary', 'Desai', 'Pillai', 'Bose', 'Menon', 'Agarwal', 'Tiwari', 'Saxena',
];

const NURSES = ['Nurse Kavita', 'Nurse Rekha', 'Nurse Sunita', 'Nurse Anita'];
const DOCTORS = ['Dr. Rao', 'Dr. Sen', 'Dr. Fernandez', 'Dr. Kapoor'];

function makeName(index: number): string {
  const first = FIRST_NAMES[index % FIRST_NAMES.length];
  const last = LAST_NAMES[(index * 7 + 3) % LAST_NAMES.length];
  return `${first} ${last}`;
}

function makeTempSeries(
  daysCount: number,
  pattern: 'cured_streak_3' | 'improving_2' | 'fever_today' | 'fever_pending_today',
  seed: number
): TemperatureLog[] {
  const logs: TemperatureLog[] = [];
  const includeToday = pattern !== 'fever_pending_today';
  const startOffset = -(daysCount - 1);
  const endOffset = includeToday ? 0 : -1;

  for (let offset = startOffset; offset <= endOffset; offset++) {
    const date = getDateOffset(offset);
    let tempC = 38.2;

    if (pattern === 'cured_streak_3') {
      if (offset >= -2) {
        tempC = Number((36.5 + ((seed + Math.abs(offset)) % 6) * 0.1).toFixed(1));
      } else {
        tempC = Number((37.8 + ((seed + Math.abs(offset)) % 8) * 0.1).toFixed(1));
      }
    } else if (pattern === 'improving_2') {
      if (offset >= -1) {
        tempC = Number((36.6 + ((seed + Math.abs(offset)) % 5) * 0.1).toFixed(1));
      } else {
        tempC = Number((37.9 + ((seed + Math.abs(offset)) % 9) * 0.1).toFixed(1));
      }
    } else if (pattern === 'fever_today') {
      tempC = Number((37.6 + ((seed + Math.abs(offset)) % 14) * 0.1).toFixed(1));
    } else {
      // fever_pending_today
      tempC = Number((37.7 + ((seed + Math.abs(offset)) % 12) * 0.1).toFixed(1));
    }

    const hour = 7 + (seed % 3);
    const min = String((seed * 13) % 60).padStart(2, '0');
    logs.push({
      date,
      time: `0${hour}:${min}`,
      tempC,
      recordedBy: NURSES[seed % NURSES.length],
    });
  }

  return logs;
}

export function createSeedPatients(): Patient[] {
  const patients: Patient[] = [];
  const today = getDateOffset(0);
  const yesterday = getDateOffset(-1);

  // 74 active rooms (1..74) at full occupancy
  for (let room = 1; room <= 74; room++) {
    const id = `PT-${String(1000 + room)}`;
    const name = makeName(room);
    const age = 22 + ((room * 7) % 58);
    const gender: 'M' | 'F' = room % 2 === 0 ? 'F' : 'M';
    const stayDays = 4 + (room % 5);
    const admittedDate = getDateOffset(-stayDays);

    let temperatures: TemperatureLog[] = [];
    let visits: DoctorVisitLog[] = [];
    let status: Patient['status'] = 'admitted';
    let dischargeApprovedAt: string | undefined;

    if (room <= 12) {
      // 1..12: Temp recorded today, 3-day no-fever streak -> Discharge Eligible, awaiting Doctor visit today
      temperatures = makeTempSeries(stayDays + 1, 'cured_streak_3', room);
      visits = [
        {
          date: yesterday,
          time: '11:20',
          doctorName: DOCTORS[room % DOCTORS.length],
          treatmentNote: 'Fever subsiding; monitor for 3rd consecutive afebrile day.',
          decision: 'continue_treatment',
        },
      ];
    } else if (room <= 16) {
      // 13..16: Discharge approved by Doctor today -> sitting in Admin Pending Discharges queue
      temperatures = makeTempSeries(stayDays + 1, 'cured_streak_3', room);
      status = 'discharge_approved';
      dischargeApprovedAt = `${today} 10:15`;
      visits = [
        {
          date: today,
          time: '10:15',
          doctorName: DOCTORS[room % DOCTORS.length],
          treatmentNote: '3 full days without fever (<37.5°C). Cleared for discharge.',
          decision: 'approve_discharge',
        },
      ];
    } else if (room <= 38) {
      // 17..38: Temp recorded today, awaiting Doctor visit today
      const pattern = room % 3 === 0 ? 'improving_2' : 'fever_today';
      temperatures = makeTempSeries(stayDays + 1, pattern, room);
      visits = [
        {
          date: yesterday,
          time: '14:10',
          doctorName: DOCTORS[room % DOCTORS.length],
          treatmentNote: 'Continue antipyretics and hydration.',
          decision: 'continue_treatment',
        },
      ];
    } else if (room <= 52) {
      // 39..52: Temp recorded today AND Doctor already visited today
      const pattern = room % 2 === 0 ? 'improving_2' : 'fever_today';
      temperatures = makeTempSeries(stayDays + 1, pattern, room);
      visits = [
        {
          date: today,
          time: '11:45',
          doctorName: DOCTORS[room % DOCTORS.length],
          treatmentNote: 'Vitals reviewed; maintain current antiviral + supportive regimen.',
          decision: 'continue_treatment',
        },
      ];
    } else {
      // 53..74: Needs Nurse temperature check today (and Doctor must wait for Nurse)
      temperatures = makeTempSeries(stayDays + 1, 'fever_pending_today', room);
      visits = [
        {
          date: yesterday,
          time: '16:00',
          doctorName: DOCTORS[room % DOCTORS.length],
          treatmentNote: 'Persistent fever; re-evaluate after morning temperature log.',
          decision: 'continue_treatment',
        },
      ];
    }

    patients.push({
      id,
      name,
      age,
      gender,
      roomNumber: room,
      admittedDate,
      status,
      temperatures,
      visits,
      dischargeApprovedAt,
    });
  }

  // Historical resolved patients: 34 Discharged + 6 Deceased = 40 total (15.0% mortality / 85.0% success)
  for (let i = 1; i <= 34; i++) {
    const idx = 100 + i;
    patients.push({
      id: `PT-${idx}`,
      name: makeName(idx),
      age: 25 + ((i * 5) % 50),
      gender: i % 2 === 0 ? 'F' : 'M',
      roomNumber: null,
      admittedDate: getDateOffset(-(10 + (i % 6))),
      status: 'discharged',
      temperatures: makeTempSeries(6, 'cured_streak_3', idx),
      visits: [
        {
          date: getDateOffset(-(1 + (i % 4))),
          time: '10:30',
          doctorName: DOCTORS[i % DOCTORS.length],
          treatmentNote: 'Completed 3-day afebrile recovery protocol.',
          decision: 'approve_discharge',
        },
      ],
      dischargedAt: getDateOffset(-(1 + (i % 4))),
    });
  }

  for (let i = 1; i <= 6; i++) {
    const idx = 200 + i;
    patients.push({
      id: `PT-${idx}`,
      name: makeName(idx),
      age: 58 + ((i * 4) % 25),
      gender: i % 2 === 0 ? 'M' : 'F',
      roomNumber: null,
      admittedDate: getDateOffset(-(8 + i)),
      status: 'deceased',
      temperatures: makeTempSeries(5, 'fever_today', idx),
      visits: [
        {
          date: getDateOffset(-(1 + i)),
          time: '15:20',
          doctorName: DOCTORS[i % DOCTORS.length],
          treatmentNote: 'Severe hyperpyrexia and respiratory failure.',
          decision: 'mark_deceased',
        },
      ],
      deceasedAt: getDateOffset(-(1 + i)),
    });
  }

  return patients;
}

