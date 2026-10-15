import fs from 'fs';
import path from 'path';

export interface DatabaseSchema {
  batches: Array<{
    id: string;
    batch_number: number;
    name: string;
    start_date: string;
    end_date: string;
    is_active: boolean;
    full_day_rate: number;
    half_day_rate: number;
    perbantuan_full_day_rate: number;
    perbantuan_half_day_rate: number;
    created_at: string;
  }>;
  users: Array<{
    id: string;
    name: string;
    email: string;
    password_hash: string;
    role: 'intern' | 'hrd' | 'super_admin';
    department?: string;
    batch_id?: string;
    status?: 'active' | 'perbantuan' | 'completed';
    face_descriptor: number[] | null;
    created_at: string;
  }>;
  settings: Array<{
    id: string;
    office_lat: number;
    office_long: number;
    max_radius_meters: number;
    full_day_rate: number;
    half_day_rate: number;
    perbantuan_full_day_rate?: number;
    perbantuan_half_day_rate?: number;
    updated_at: string;
  }>;
  attendance: Array<{
    id: string;
    user_id: string;
    date: string;
    check_in_time: string | null;
    check_out_time: string | null;
    check_in_lat: number | null;
    check_in_long: number | null;
    distance_from_office: number | null;
    status: 'full_day' | 'half_day' | 'pending';
    attendance_status?: 'H' | '1/2' | 'I' | 'S' | 'A' | null;
    is_perbantuan?: boolean;
    notes?: string | null;
    created_at: string;
  }>;
}

const DB_FILE = path.join(process.cwd(), 'data', 'db.json');

const BATCH_15_ID = 'b1500000-0000-0000-0000-000000000015';

// Pre-configured interns from PT BPR Sehat Sejahtera reference document
const INITIAL_INTERNS = [
  { id: '22222222-2222-2222-2222-222222222222', name: 'Budi Santoso', email: 'budi@intern.bprsehat.com', dept: 'CS', status: 'active' },
  { id: 'a0100000-0000-0000-0000-000000000001', name: 'Alfiani Nutriana Ayu', email: 'alfiani@intern.bprsehat.com', dept: 'CS', status: 'active' },
  { id: 'a0100000-0000-0000-0000-000000000002', name: 'Elsya Yunita Simangunsong', email: 'elsya@intern.bprsehat.com', dept: 'Teller UNPAM', status: 'active' },
  { id: 'a0100000-0000-0000-0000-000000000003', name: 'Puan Maharani', email: 'puan@intern.bprsehat.com', dept: 'Teller UNPAM', status: 'active' },
  { id: 'a0100000-0000-0000-0000-000000000004', name: 'Novita Al Fitri Daeng', email: 'novita@intern.bprsehat.com', dept: 'Teller UNPAM', status: 'active' },
  { id: 'a0100000-0000-0000-0000-000000000005', name: 'Felisitas Erselin', email: 'felisitas@intern.bprsehat.com', dept: 'SDM', status: 'active' },
  { id: 'a0100000-0000-0000-0000-000000000006', name: 'Listiyani', email: 'listiyani@intern.bprsehat.com', dept: 'Accounting', status: 'active' },
  { id: 'a0100000-0000-0000-0000-000000000007', name: 'Mustika Wulan', email: 'mustika@intern.bprsehat.com', dept: 'Kepatuhan', status: 'active' },
  { id: 'a0100000-0000-0000-0000-000000000008', name: 'Muhammad Rizq Noval', email: 'rizq@intern.bprsehat.com', dept: 'Kepatuhan', status: 'active' },
  { id: 'a0100000-0000-0000-0000-000000000009', name: 'Eki Ramdani Sopyana', email: 'eki@intern.bprsehat.com', dept: 'Kredit', status: 'active' },
  { id: 'a0100000-0000-0000-0000-000000000010', name: 'Nesya Chintiya Bella', email: 'nesya@intern.bprsehat.com', dept: 'Kredit', status: 'active' },
  { id: 'a0100000-0000-0000-0000-000000000011', name: 'Bintang Reira Putri Hanafi', email: 'bintang@intern.bprsehat.com', dept: 'Audit', status: 'perbantuan' },
  { id: 'a0100000-0000-0000-0000-000000000012', name: 'Rosmita Fathia Hidayat', email: 'rosmita@intern.bprsehat.com', dept: 'Social Media', status: 'active' },
  { id: 'a0100000-0000-0000-0000-000000000013', name: 'Valdis Sandya Akhjan', email: 'valdis@intern.bprsehat.com', dept: 'Social Media', status: 'perbantuan' },
];

const INITIAL_DATA: DatabaseSchema = {
  batches: [
    {
      id: BATCH_15_ID,
      batch_number: 15,
      name: 'Batch 15',
      start_date: '2026-08-01',
      end_date: '2027-01-31', // 6 months range
      is_active: true,
      full_day_rate: 50000,
      half_day_rate: 25000,
      perbantuan_full_day_rate: 75000,
      perbantuan_half_day_rate: 37500,
      created_at: new Date().toISOString(),
    },
    {
      id: 'b1400000-0000-0000-0000-000000000014',
      batch_number: 14,
      name: 'Batch 14',
      start_date: '2026-02-01',
      end_date: '2026-07-31',
      is_active: false,
      full_day_rate: 45000,
      half_day_rate: 22500,
      perbantuan_full_day_rate: 65000,
      perbantuan_half_day_rate: 32500,
      created_at: new Date().toISOString(),
    },
  ],
  users: [
    {
      id: '00000000-0000-0000-0000-000000000099',
      name: 'Super Admin',
      email: 'superadmin@bprsehat.com',
      password_hash: '$2b$10$iyo1ft6DWz2EphSgQ1xmc.vHCb18X8DXc4QhKd0QD7K1bS5tFF4v2', // admin123
      role: 'super_admin',
      department: 'IT & Management',
      status: 'active',
      face_descriptor: null,
      created_at: new Date().toISOString(),
    },
    {
      id: '11111111-1111-1111-1111-111111111111',
      name: 'Admin HRD',
      email: 'hrd@bprsehat.com',
      password_hash: '$2b$10$.gceNqbyuUsaK3laNUpYX.2GVYHS2/hpSxkoSMij9XHsNVVqfV4x.', // admin123
      role: 'hrd',
      department: 'HRD',
      status: 'active',
      face_descriptor: null,
      created_at: new Date().toISOString(),
    },
    ...INITIAL_INTERNS.map((item) => ({
      id: item.id,
      name: item.name,
      email: item.email,
      password_hash: '$2b$10$J1E6KWLCNCLjSUKq3o05r.oyhMiIkUmLS/I4SDbDOw1wFnuY9wTTa', // intern123
      role: 'intern' as const,
      department: item.dept,
      batch_id: BATCH_15_ID,
      status: item.status as 'active' | 'perbantuan' | 'completed',
      face_descriptor: null,
      created_at: new Date().toISOString(),
    })),
  ],
  settings: [
    {
      id: '00000000-0000-0000-0000-000000000001',
      office_lat: -6.200000,
      office_long: 106.816666,
      max_radius_meters: 200,
      full_day_rate: 50000,
      half_day_rate: 25000,
      perbantuan_full_day_rate: 75000,
      perbantuan_half_day_rate: 37500,
      updated_at: new Date().toISOString(),
    },
  ],
  attendance: [],
};

// Generates sample attendance data for Minggu 5 & 6 (28/09/2026 s/d 11/10/2026) based on reference image
function generateSeedAttendance(): DatabaseSchema['attendance'] {
  const dates = [
    '2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02',
    '2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08'
  ];

  const rawSample: Record<string, { codes: Record<string, string>; notes?: string }> = {
    'Alfiani Nutriana Ayu': {
      codes: { '2026-09-28': '1/2', '2026-09-29': 'H', '2026-09-30': 'H', '2026-10-01': 'H', '2026-10-02': 'H', '2026-10-05': 'I', '2026-10-06': 'H', '2026-10-07': 'H', '2026-10-08': 'H' },
      notes: '05/10 masuk kuliah dan ada rapat prodi',
    },
    'Elsya Yunita Simangunsong': {
      codes: { '2026-09-28': '1/2', '2026-09-29': 'I', '2026-09-30': 'I', '2026-10-01': 'H', '2026-10-02': 'H', '2026-10-06': 'H', '2026-10-07': 'H', '2026-10-08': 'I' },
      notes: '29/09 Pertemuan sama Prodi, 30/09 Ujikom, 08/10 Izin bimbingan',
    },
    'Puan Maharani': {
      codes: { '2026-09-28': '1/2', '2026-09-29': 'H', '2026-09-30': 'H', '2026-10-01': 'H', '2026-10-02': 'H', '2026-10-05': 'H', '2026-10-06': 'H', '2026-10-07': 'H', '2026-10-08': 'H' },
      notes: '28/09 Masuk kuliah',
    },
    'Novita Al Fitri Daeng': {
      codes: { '2026-09-28': 'H', '2026-09-29': 'H', '2026-09-30': 'H', '2026-10-01': '1/2', '2026-10-02': 'H', '2026-10-05': 'I', '2026-10-06': 'H', '2026-10-07': 'H', '2026-10-08': 'H' },
      notes: '01/10 Pembekalan Pra LAPS',
    },
    'Felisitas Erselin': {
      codes: { '2026-09-28': 'H', '2026-09-29': 'H', '2026-09-30': 'H', '2026-10-01': 'H', '2026-10-02': 'H', '2026-10-05': 'H', '2026-10-06': 'H', '2026-10-07': 'H', '2026-10-08': 'H' },
      notes: '',
    },
    'Listiyani': {
      codes: { '2026-09-28': 'H', '2026-09-29': 'H', '2026-09-30': 'H', '2026-10-01': 'H', '2026-10-02': 'H', '2026-10-05': 'H', '2026-10-06': 'H', '2026-10-07': 'H', '2026-10-08': 'H' },
      notes: '',
    },
    'Mustika Wulan': {
      codes: { '2026-09-28': 'H', '2026-09-29': 'H', '2026-09-30': 'H', '2026-10-01': 'H', '2026-10-02': 'H', '2026-10-05': '1/2', '2026-10-06': '1/2', '2026-10-07': 'H', '2026-10-08': '1/2' },
      notes: '05,06,08/10 Jadwal kuliah',
    },
    'Muhammad Rizq Noval': {
      codes: { '2026-09-28': 'H', '2026-09-29': 'H', '2026-09-30': '1/2', '2026-10-01': 'H', '2026-10-02': 'H', '2026-10-05': 'H', '2026-10-06': 'H', '2026-10-07': '1/2', '2026-10-08': 'H' },
      notes: '',
    },
    'Eki Ramdani Sopyana': {
      codes: { '2026-09-28': 'H', '2026-09-29': 'H', '2026-09-30': 'H', '2026-10-01': 'H', '2026-10-02': 'H', '2026-10-05': 'I', '2026-10-06': 'H', '2026-10-07': 'H', '2026-10-08': 'H' },
      notes: '05/10 Izin sakit / urusan prodi',
    },
    'Nesya Chintiya Bella': {
      codes: { '2026-09-28': 'H', '2026-09-29': 'H', '2026-09-30': 'H', '2026-10-01': 'H', '2026-10-02': 'H', '2026-10-05': 'I', '2026-10-06': 'H', '2026-10-07': 'H', '2026-10-08': 'H' },
      notes: '',
    },
    'Bintang Reira Putri Hanafi': {
      codes: { '2026-09-28': 'H', '2026-09-29': 'H', '2026-09-30': 'H', '2026-10-01': 'H', '2026-10-02': 'H', '2026-10-05': 'H', '2026-10-06': 'H', '2026-10-07': 'H', '2026-10-08': '1/2' },
      notes: 'Masa perbantuan audit',
    },
    'Rosmita Fathia Hidayat': {
      codes: { '2026-09-28': 'H', '2026-09-29': '1/2', '2026-09-30': '1/2', '2026-10-01': 'H', '2026-10-02': 'H', '2026-10-05': 'H', '2026-10-06': '1/2', '2026-10-07': 'H', '2026-10-08': 'H' },
      notes: '',
    },
    'Valdis Sandya Akhjan': {
      codes: { '2026-09-28': 'H', '2026-09-29': 'H', '2026-09-30': 'H', '2026-10-01': '1/2', '2026-10-02': 'H', '2026-10-05': 'H', '2026-10-06': 'H', '2026-10-07': 'I', '2026-10-08': 'H' },
      notes: '01/10 pembekalan Pra LAPS',
    },
    'Budi Santoso': {
      codes: { '2026-09-28': 'H', '2026-09-29': 'H', '2026-09-30': 'H', '2026-10-01': 'H', '2026-10-02': 'H', '2026-10-05': 'H', '2026-10-06': 'H', '2026-10-07': 'H', '2026-10-08': 'H' },
      notes: '',
    },
  };

  const records: DatabaseSchema['attendance'] = [];

  for (const intern of INITIAL_INTERNS) {
    const sample = rawSample[intern.name];
    if (!sample) continue;

    for (const d of dates) {
      const code = sample.codes[d];
      if (!code) continue;

      const isHalf = code === '1/2';
      const isFull = code === 'H';
      const isPerbantuan = intern.status === 'perbantuan';

      records.push({
        id: crypto.randomUUID(),
        user_id: intern.id,
        date: d,
        check_in_time: isFull || isHalf ? `${d}T08:00:00.000Z` : null,
        check_out_time: isFull ? `${d}T17:00:00.000Z` : isHalf ? `${d}T12:30:00.000Z` : null,
        check_in_lat: -6.200000,
        check_in_long: 106.816666,
        distance_from_office: 15,
        status: isFull ? 'full_day' : isHalf ? 'half_day' : 'pending',
        attendance_status: code as 'H' | '1/2' | 'I' | 'S' | 'A',
        is_perbantuan: isPerbantuan,
        notes: sample.notes || null,
        created_at: `${d}T08:00:00.000Z`,
      });
    }
  }

  return records;
}

function readDb(): DatabaseSchema {
  try {
    if (!fs.existsSync(DB_FILE)) {
      const dir = path.dirname(DB_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const dataWithSeed = {
        ...INITIAL_DATA,
        attendance: generateSeedAttendance(),
      };
      fs.writeFileSync(DB_FILE, JSON.stringify(dataWithSeed, null, 2), 'utf-8');
      return JSON.parse(JSON.stringify(dataWithSeed));
    }
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const db: DatabaseSchema = JSON.parse(raw);

    // Auto-migration for schema upgrades
    let modified = false;
    if (!db.batches || db.batches.length === 0) {
      db.batches = INITIAL_DATA.batches;
      modified = true;
    }
    if (!db.users || db.users.length < 5) {
      db.users = INITIAL_DATA.users;
      modified = true;
    }
    if (!db.attendance || db.attendance.length < 5) {
      db.attendance = generateSeedAttendance();
      modified = true;
    }
    if (modified) {
      writeDb(db);
    }

    return db;
  } catch (err) {
    console.error('Error reading local db:', err);
    return JSON.parse(JSON.stringify(INITIAL_DATA));
  }
}

function writeDb(data: DatabaseSchema) {
  try {
    const dir = path.dirname(DB_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing local db:', err);
  }
}

type TableName = keyof DatabaseSchema;

export class LocalQueryBuilder<T = any> {
  private table: TableName;
  private action: 'select' | 'insert' | 'update' | 'delete' = 'select';
  private selectCols: string = '*';
  private isCount: boolean = false;
  private isHead: boolean = false;
  private isSingle: boolean = false;
  private filters: Array<(row: any) => boolean> = [];
  private orderCol?: string;
  private orderAsc: boolean = true;
  private limitCount?: number;
  private payload?: any;

  constructor(table: TableName) {
    this.table = table;
  }

  select(columns: string = '*', options?: { count?: string; head?: boolean }) {
    if (this.action !== 'insert' && this.action !== 'update') {
      this.action = 'select';
    }
    this.selectCols = columns;
    if (options?.count) this.isCount = true;
    if (options?.head) this.isHead = true;
    return this;
  }

  insert(data: any) {
    this.action = 'insert';
    this.payload = data;
    return this;
  }

  update(data: any) {
    this.action = 'update';
    this.payload = data;
    return this;
  }

  delete() {
    this.action = 'delete';
    return this;
  }

  eq(column: string, value: any) {
    this.filters.push((row) => row[column] === value);
    return this;
  }

  neq(column: string, value: any) {
    this.filters.push((row) => row[column] !== value);
    return this;
  }

  gte(column: string, value: any) {
    this.filters.push((row) => row[column] >= value);
    return this;
  }

  lte(column: string, value: any) {
    this.filters.push((row) => row[column] <= value);
    return this;
  }

  not(column: string, operator: string, value: any) {
    if (operator === 'is' && value === null) {
      this.filters.push((row) => row[column] !== null && row[column] !== undefined);
    } else {
      this.filters.push((row) => row[column] !== value);
    }
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orderCol = column;
    this.orderAsc = options?.ascending !== false;
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  private filterColumns(row: any, cols: string) {
    if (!row) return null;
    if (cols === '*') return { ...row };
    const fields = cols.split(',').map((s) => s.trim());
    const res: any = {};
    for (const f of fields) {
      if (f in row) {
        res[f] = row[f];
      }
    }
    return res;
  }

  private execute(): { data: any; error: any; count?: number | null } {
    const db = readDb();
    const rows: any[] = db[this.table] || [];

    if (this.action === 'insert') {
      const newItems = Array.isArray(this.payload) ? this.payload : [this.payload];
      const inserted: any[] = [];
      for (const item of newItems) {
        const row = {
          id: item.id || crypto.randomUUID(),
          created_at: new Date().toISOString(),
          ...item,
        };
        rows.push(row);
        inserted.push(row);
      }
      writeDb(db);
      const res = this.isSingle ? (inserted[0] || null) : (Array.isArray(this.payload) ? inserted : inserted[0]);
      return {
        data: Array.isArray(res)
          ? res.map((r) => this.filterColumns(r, this.selectCols))
          : this.filterColumns(res, this.selectCols),
        error: null,
      };
    }

    if (this.action === 'update') {
      const updated: any[] = [];
      for (let i = 0; i < rows.length; i++) {
        let match = true;
        for (const f of this.filters) {
          if (!f(rows[i])) {
            match = false;
            break;
          }
        }
        if (match) {
          rows[i] = {
            ...rows[i],
            ...this.payload,
            updated_at: new Date().toISOString(),
          };
          updated.push(rows[i]);
        }
      }
      writeDb(db);
      const res = this.isSingle ? (updated[0] || null) : updated;
      return {
        data: this.isSingle && !res ? null : (Array.isArray(res) ? res.map((r) => this.filterColumns(r, this.selectCols)) : this.filterColumns(res, this.selectCols)),
        error: this.isSingle && !res ? { message: 'Row not found', code: 'PGRST116' } : null,
      };
    }

    // SELECT
    let result = [...rows];
    for (const f of this.filters) {
      result = result.filter(f);
    }

    const totalCount = result.length;

    if (this.orderCol) {
      const col = this.orderCol;
      const asc = this.orderAsc;
      result.sort((a, b) => {
        if (a[col] < b[col]) return asc ? -1 : 1;
        if (a[col] > b[col]) return asc ? 1 : -1;
        return 0;
      });
    }

    if (this.limitCount !== undefined) {
      result = result.slice(0, this.limitCount);
    }

    if (this.isHead) {
      return {
        data: null,
        error: null,
        count: totalCount,
      };
    }

    if (this.isSingle) {
      const singleRow = result[0];
      if (!singleRow) {
        return {
          data: null,
          error: { message: 'Row not found', code: 'PGRST116' },
          count: this.isCount ? 0 : null,
        };
      }
      return {
        data: this.filterColumns(singleRow, this.selectCols),
        error: null,
        count: this.isCount ? 1 : null,
      };
    }

    return {
      data: result.map((r) => this.filterColumns(r, this.selectCols)),
      error: null,
      count: this.isCount ? totalCount : null,
    };
  }

  // Thenable implementation to support `await query`
  then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) {
    try {
      const res = this.execute();
      return Promise.resolve(res).then(onfulfilled, onrejected);
    } catch (err) {
      return Promise.reject(err).then(onfulfilled, onrejected);
    }
  }
}

export class LocalSupabaseClient {
  from(table: TableName) {
    return new LocalQueryBuilder(table);
  }
}
