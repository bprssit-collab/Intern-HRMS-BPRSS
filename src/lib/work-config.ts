/**
 * Database configuration & persistence helper for:
 * 1. Work Hours (work_start_time, full_day_max_in, work_end_time)
 * 2. Holidays (Hari Libur Nasional & Cuti Bersama)
 * 3. Batch Overtime Rate (overtime_rate, default Rp 50.000)
 *
 * Uses native Supabase tables/columns from migration_v6_holidays_worktime_overtime.sql
 * when available, and transparently falls back to JSONB storage in roles(key='super_admin').permissions._app_config
 * if migration_v6 has not yet been executed in the Supabase SQL Editor.
 */

import { createAdminClient } from './supabase';
import {
  DEFAULT_WORK_START_TIME,
  DEFAULT_FULL_DAY_MAX_IN,
  DEFAULT_WORK_END_TIME,
  DEFAULT_OVERTIME_RATE,
  DEFAULT_2026_HOLIDAYS,
} from './constants';
import type { Holiday, HolidayType } from '@/types';

export interface WorkHoursConfig {
  work_start_time: string;
  full_day_max_in: string;
  work_end_time: string;
  updated_at?: string;
}

interface FallbackAppConfig {
  work_hours?: WorkHoursConfig;
  holidays?: Holiday[];
  batch_overtime_rates?: Record<string, number>;
}

async function getFallbackAppConfig(supabase = createAdminClient()): Promise<FallbackAppConfig> {
  try {
    const { data } = await supabase
      .from('roles')
      .select('permissions')
      .eq('key', 'super_admin')
      .single();

    const perms = (data?.permissions as Record<string, any>) || {};
    return (perms._app_config as FallbackAppConfig) || {};
  } catch {
    return {};
  }
}

async function saveFallbackAppConfig(
  updater: (prev: FallbackAppConfig) => FallbackAppConfig,
  supabase = createAdminClient()
): Promise<void> {
  const { data } = await supabase
    .from('roles')
    .select('permissions')
    .eq('key', 'super_admin')
    .single();

  if (!data) return;
  const perms = { ...((data.permissions as Record<string, any>) || {}) };
  const prevConfig = (perms._app_config as FallbackAppConfig) || {};
  perms._app_config = updater(prevConfig);

  await supabase
    .from('roles')
    .update({ permissions: perms })
    .eq('key', 'super_admin');
}

// ============================================================
// 1. WORK HOURS CONFIGURATION
// ============================================================

export async function getWorkHoursConfig(supabase = createAdminClient()): Promise<WorkHoursConfig> {
  const { data: settings } = await supabase
    .from('settings')
    .select('*')
    .limit(1)
    .single();

  if (
    settings &&
    typeof settings.work_start_time === 'string' &&
    typeof settings.full_day_max_in === 'string' &&
    typeof settings.work_end_time === 'string'
  ) {
    return {
      work_start_time: settings.work_start_time || DEFAULT_WORK_START_TIME,
      full_day_max_in: settings.full_day_max_in || DEFAULT_FULL_DAY_MAX_IN,
      work_end_time: settings.work_end_time || DEFAULT_WORK_END_TIME,
      updated_at: settings.updated_at,
    };
  }

  const fallback = await getFallbackAppConfig(supabase);
  if (fallback.work_hours) {
    return {
      work_start_time: fallback.work_hours.work_start_time || DEFAULT_WORK_START_TIME,
      full_day_max_in: fallback.work_hours.full_day_max_in || DEFAULT_FULL_DAY_MAX_IN,
      work_end_time: fallback.work_hours.work_end_time || DEFAULT_WORK_END_TIME,
      updated_at: fallback.work_hours.updated_at,
    };
  }

  return {
    work_start_time: DEFAULT_WORK_START_TIME,
    full_day_max_in: DEFAULT_FULL_DAY_MAX_IN,
    work_end_time: DEFAULT_WORK_END_TIME,
  };
}

export async function saveWorkHoursConfig(
  config: WorkHoursConfig,
  supabase = createAdminClient()
): Promise<WorkHoursConfig> {
  const now = new Date().toISOString();
  const payload = {
    work_start_time: config.work_start_time,
    full_day_max_in: config.full_day_max_in,
    work_end_time: config.work_end_time,
    updated_at: now,
  };

  // Try updating settings table directly first (if migration_v6 has been applied)
  const { data: existing } = await supabase.from('settings').select('id').limit(1).single();
  if (existing?.id) {
    const { error } = await supabase.from('settings').update(payload).eq('id', existing.id);
    if (!error) {
      // Also mirror into fallback config for consistency
      await saveFallbackAppConfig((prev) => ({ ...prev, work_hours: payload }), supabase);
      return payload;
    }
  }

  // Fallback to JSONB persistence in roles(key='super_admin').permissions._app_config
  await saveFallbackAppConfig((prev) => ({ ...prev, work_hours: payload }), supabase);
  return payload;
}

// ============================================================
// 2. HOLIDAYS (HARI LIBUR NASIONAL & CUTI BERSAMA)
// ============================================================

function getDefaultHolidaysList(): Holiday[] {
  return DEFAULT_2026_HOLIDAYS.map((h) => ({
    id: `seed-${h.date}`,
    date: h.date,
    name: h.name,
    type: h.type as HolidayType,
    created_at: '2026-01-01T00:00:00.000Z',
  }));
}

export async function getHolidaysList(
  supabase = createAdminClient(),
  options?: { startDate?: string; endDate?: string; year?: string }
): Promise<{ holidays: Holiday[]; is_fallback: boolean }> {
  let query = supabase.from('holidays').select('*').order('date', { ascending: true });
  if (options?.startDate) query = query.gte('date', options.startDate);
  if (options?.endDate) query = query.lte('date', options.endDate);

  const { data, error } = await query;

  if (!error && Array.isArray(data)) {
    let list = data as Holiday[];
    if (options?.year) {
      list = list.filter((h) => h.date.startsWith(`${options.year}-`));
    }
    return { holidays: list, is_fallback: false };
  }

  // Fallback if table `holidays` does not exist yet
  const fallback = await getFallbackAppConfig(supabase);
  let list: Holiday[] = Array.isArray(fallback.holidays)
    ? [...fallback.holidays]
    : getDefaultHolidaysList();

  // Persist initial seed into fallback if not yet initialized
  if (!Array.isArray(fallback.holidays)) {
    await saveFallbackAppConfig((prev) => ({ ...prev, holidays: list }), supabase);
  }

  list.sort((a, b) => a.date.localeCompare(b.date));
  if (options?.startDate) list = list.filter((h) => h.date >= options.startDate!);
  if (options?.endDate) list = list.filter((h) => h.date <= options.endDate!);
  if (options?.year) list = list.filter((h) => h.date.startsWith(`${options.year}-`));

  return { holidays: list, is_fallback: true };
}

export async function upsertHolidayItem(
  item: { id?: string; date: string; name: string; type: HolidayType; created_by?: string },
  supabase = createAdminClient()
): Promise<Holiday> {
  // Try native table first
  if (item.id && !item.id.startsWith('seed-') && !item.id.startsWith('fb-')) {
    const { data, error } = await supabase
      .from('holidays')
      .update({ date: item.date, name: item.name, type: item.type })
      .eq('id', item.id)
      .select()
      .single();
    if (!error && data) return data as Holiday;
  } else {
    const { data, error } = await supabase
      .from('holidays')
      .upsert(
        {
          date: item.date,
          name: item.name,
          type: item.type,
          created_by: item.created_by || null,
        },
        { onConflict: 'date' }
      )
      .select()
      .single();
    if (!error && data) return data as Holiday;
  }

  // Fallback JSONB persistence
  const fallback = await getFallbackAppConfig(supabase);
  const currentList: Holiday[] = Array.isArray(fallback.holidays)
    ? [...fallback.holidays]
    : getDefaultHolidaysList();

  const existingIdx = currentList.findIndex(
    (h) => (item.id && h.id === item.id) || h.date === item.date
  );

  const savedItem: Holiday = {
    id:
      existingIdx >= 0
        ? currentList[existingIdx].id
        : item.id || `fb-${item.date}-${Date.now().toString(36)}`,
    date: item.date,
    name: item.name,
    type: item.type,
    created_by: item.created_by || null,
    created_at:
      existingIdx >= 0
        ? currentList[existingIdx].created_at
        : new Date().toISOString(),
  };

  if (existingIdx >= 0) {
    currentList[existingIdx] = savedItem;
  } else {
    currentList.push(savedItem);
  }
  currentList.sort((a, b) => a.date.localeCompare(b.date));

  await saveFallbackAppConfig((prev) => ({ ...prev, holidays: currentList }), supabase);
  return savedItem;
}

export async function bulkUpsertHolidays(
  items: { date: string; name: string; type: HolidayType; created_by?: string }[],
  supabase = createAdminClient()
): Promise<{ count: number; saved: Holiday[] }> {
  if (!items || items.length === 0) {
    return { count: 0, saved: [] };
  }

  // 1. Try native table batch upsert
  const { data, error } = await supabase
    .from('holidays')
    .upsert(
      items.map((it) => ({
        date: it.date,
        name: it.name,
        type: it.type,
        created_by: it.created_by || null,
      })),
      { onConflict: 'date' }
    )
    .select();

  if (!error && Array.isArray(data)) {
    return { count: data.length, saved: data as Holiday[] };
  }

  // 2. Fallback JSONB persistence
  const fallback = await getFallbackAppConfig(supabase);
  const currentList: Holiday[] = Array.isArray(fallback.holidays)
    ? [...fallback.holidays]
    : getDefaultHolidaysList();

  const savedResults: Holiday[] = [];

  for (const item of items) {
    const existingIdx = currentList.findIndex((h) => h.date === item.date);
    const savedItem: Holiday = {
      id:
        existingIdx >= 0
          ? currentList[existingIdx].id
          : `fb-${item.date}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      date: item.date,
      name: item.name,
      type: item.type,
      created_by: item.created_by || null,
      created_at:
        existingIdx >= 0
          ? currentList[existingIdx].created_at
          : new Date().toISOString(),
    };

    if (existingIdx >= 0) {
      currentList[existingIdx] = savedItem;
    } else {
      currentList.push(savedItem);
    }
    savedResults.push(savedItem);
  }

  currentList.sort((a, b) => a.date.localeCompare(b.date));
  await saveFallbackAppConfig((prev) => ({ ...prev, holidays: currentList }), supabase);

  return { count: savedResults.length, saved: savedResults };
}

export async function deleteHolidayItem(
  idOrDate: string,
  supabase = createAdminClient()
): Promise<void> {
  // Try native table delete by id or date
  if (/^[0-9a-fA-F-]{36}$/.test(idOrDate)) {
    const { error } = await supabase.from('holidays').delete().eq('id', idOrDate);
    if (!error) return;
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(idOrDate)) {
    const { error } = await supabase.from('holidays').delete().eq('date', idOrDate);
    if (!error) return;
  }

  // Fallback JSONB delete
  const fallback = await getFallbackAppConfig(supabase);
  const currentList: Holiday[] = Array.isArray(fallback.holidays)
    ? [...fallback.holidays]
    : getDefaultHolidaysList();

  const filtered = currentList.filter((h) => h.id !== idOrDate && h.date !== idOrDate);
  await saveFallbackAppConfig((prev) => ({ ...prev, holidays: filtered }), supabase);
}

// ============================================================
// 3. BATCH OVERTIME RATE HELPER (DEFAULT Rp 50.000)
// ============================================================

export async function getBatchOvertimeRateMap(
  supabase = createAdminClient()
): Promise<Record<string, number>> {
  const fallback = await getFallbackAppConfig(supabase);
  return fallback.batch_overtime_rates || {};
}

export async function saveBatchOvertimeRate(
  batchId: string,
  overtimeRate: number,
  supabase = createAdminClient()
): Promise<void> {
  const rate = Number(overtimeRate) || DEFAULT_OVERTIME_RATE;
  // Try updating column on batches table first
  await supabase.from('batches').update({ overtime_rate: rate }).eq('id', batchId);

  // Also persist in fallback map
  await saveFallbackAppConfig(
    (prev) => ({
      ...prev,
      batch_overtime_rates: {
        ...(prev.batch_overtime_rates || {}),
        [batchId]: rate,
      },
    }),
    supabase
  );
}
