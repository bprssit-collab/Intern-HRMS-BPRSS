/**
 * Application-wide shared constants for Intern HRMS PT BPR Sehat Sejahtera.
 */

export const DEFAULT_INTERN_PASSWORD = 'internBSS';
export const LEGACY_DEFAULT_PASSWORDS = ['internbss', 'magang2026'];
export const DEFAULT_OVERTIME_RATE = 50000;

export const DEFAULT_WORK_START_TIME = '08:30';
export const DEFAULT_FULL_DAY_MAX_IN = '10:30';
export const DEFAULT_WORK_END_TIME = '16:00';

export interface DefaultHolidaySeed {
  date: string;
  name: string;
  type: 'national' | 'cuti_bersama' | 'company';
}

export const DEFAULT_2026_HOLIDAYS: DefaultHolidaySeed[] = [
  { date: '2026-01-01', name: 'Tahun Baru 2026 Masehi', type: 'national' },
  { date: '2026-01-16', name: 'Isra Mikraj Nabi Muhammad SAW', type: 'national' },
  { date: '2026-02-16', name: 'Cuti Bersama Tahun Baru Imlek 2577 Kongzili', type: 'cuti_bersama' },
  { date: '2026-02-17', name: 'Tahun Baru Imlek 2577 Kongzili', type: 'national' },
  { date: '2026-03-18', name: 'Cuti Bersama Hari Suci Nyepi Tahun Baru Saka 1948', type: 'cuti_bersama' },
  { date: '2026-03-19', name: 'Hari Suci Nyepi Tahun Baru Saka 1948', type: 'national' },
  { date: '2026-03-20', name: 'Cuti Bersama Hari Raya Idul Fitri 1447 H', type: 'cuti_bersama' },
  { date: '2026-03-21', name: 'Hari Raya Idul Fitri 1447 H (Hari Pertama)', type: 'national' },
  { date: '2026-03-22', name: 'Hari Raya Idul Fitri 1447 H (Hari Kedua)', type: 'national' },
  { date: '2026-03-23', name: 'Cuti Bersama Hari Raya Idul Fitri 1447 H', type: 'cuti_bersama' },
  { date: '2026-03-24', name: 'Cuti Bersama Hari Raya Idul Fitri 1447 H', type: 'cuti_bersama' },
  { date: '2026-04-03', name: 'Wafat Yesus Kristus (Jumat Agung)', type: 'national' },
  { date: '2026-04-05', name: 'Kebangkitan Yesus Kristus (Paskah)', type: 'national' },
  { date: '2026-05-01', name: 'Hari Buruh Internasional', type: 'national' },
  { date: '2026-05-14', name: 'Kenaikan Yesus Kristus', type: 'national' },
  { date: '2026-05-15', name: 'Cuti Bersama Kenaikan Yesus Kristus', type: 'cuti_bersama' },
  { date: '2026-05-27', name: 'Hari Raya Idul Adha 1447 H', type: 'national' },
  { date: '2026-05-28', name: 'Cuti Bersama Hari Raya Idul Adha 1447 H', type: 'cuti_bersama' },
  { date: '2026-05-31', name: 'Hari Raya Waisak 2570 BE', type: 'national' },
  { date: '2026-06-01', name: 'Hari Lahir Pancasila', type: 'national' },
  { date: '2026-06-16', name: 'Tahun Baru Islam 1448 Hijriah', type: 'national' },
  { date: '2026-08-17', name: 'Hari Kemerdekaan Republik Indonesia ke-81', type: 'national' },
  { date: '2026-08-25', name: 'Maulid Nabi Muhammad SAW', type: 'national' },
  { date: '2026-12-24', name: 'Cuti Bersama Hari Raya Natal', type: 'cuti_bersama' },
  { date: '2026-12-25', name: 'Hari Raya Natal', type: 'national' },
];


