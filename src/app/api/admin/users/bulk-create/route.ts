import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createAdminClient } from '@/lib/supabase';
import { requireRole } from '@/lib/auth';

/** Helper to generate a clean base username from full name */
function generateBaseUsername(name: string): string {
  const words = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) return 'intern';
  if (words.length === 1) return words[0];
  // First two words combined with dot (e.g. "budi.santoso")
  return `${words[0]}.${words[1]}`;
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole('super_admin');
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Akses ditolak. Fitur ini hanya untuk Super Admin.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { interns } = body;

    if (!Array.isArray(interns) || interns.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Daftar anak magang tidak boleh kosong.' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // 1. Get active batch
    const { data: activeBatch, error: batchError } = await supabase
      .from('batches')
      .select('id, name, is_active')
      .eq('is_active', true)
      .single();

    let targetBatchId = activeBatch?.id;
    let targetBatchName = activeBatch?.name;

    if (!targetBatchId) {
      // Fallback to latest batch if none is marked active
      const { data: fallbackBatch } = await supabase
        .from('batches')
        .select('id, name')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!fallbackBatch) {
        return NextResponse.json(
          {
            success: false,
            error: 'Belum ada batch magang yang aktif. Silakan buat atau aktifkan batch terlebih dahulu di Manajemen Batch.',
          },
          { status: 400 }
        );
      }
      targetBatchId = fallbackBatch.id;
      targetBatchName = fallbackBatch.name;
    }

    // 2. Fetch all existing usernames to prevent collisions
    const { data: existingUsers } = await supabase
      .from('users')
      .select('username, email');

    const usedUsernames = new Set<string>();
    if (existingUsers) {
      for (const u of existingUsers) {
        if (u.username) usedUsernames.add(u.username.toLowerCase());
        if (u.email) usedUsernames.add(u.email.split('@')[0].toLowerCase());
      }
    }

    // 3. Process each intern
    const DEFAULT_PASSWORD = 'magang2026';
    const defaultPasswordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

    const createdRecords: any[] = [];
    const errors: string[] = [];

    for (let i = 0; i < interns.length; i++) {
      const item = interns[i];
      const rawName = (item.name || '').trim();
      const rawDept = (item.department || 'Umum').trim();

      if (!rawName) {
        errors.push(`Baris ke-${i + 1}: Nama tidak boleh kosong.`);
        continue;
      }

      // Generate unique username
      let baseUsername = generateBaseUsername(rawName);
      let candidateUsername = baseUsername;
      let counter = 2;

      while (usedUsernames.has(candidateUsername)) {
        candidateUsername = `${baseUsername}${counter}`;
        counter++;
      }

      usedUsernames.add(candidateUsername);

      const newId = crypto.randomUUID();
      const recordToInsert: any = {
        id: newId,
        name: rawName,
        username: candidateUsername,
        email: `${candidateUsername}@intern.bprsehat.com`, // backward-compatible email placeholder
        password_hash: defaultPasswordHash,
        role: 'intern',
        department: rawDept,
        batch_id: targetBatchId,
        status: 'active',
        must_change_credentials: true,
        face_descriptor: null,
      };

      const { data: inserted, error: insertErr } = await supabase
        .from('users')
        .insert(recordToInsert)
        .select()
        .single();

      if (insertErr) {
        errors.push(`Gagal mendaftarkan "${rawName}": ${insertErr.message}`);
      } else {
        createdRecords.push({
          id: inserted.id,
          name: inserted.name,
          department: inserted.department,
          username: candidateUsername,
          default_password: DEFAULT_PASSWORD,
          batch_name: targetBatchName,
          status: 'active',
        });
      }
    }

    return NextResponse.json({
      success: createdRecords.length > 0,
      totalRequested: interns.length,
      createdCount: createdRecords.length,
      batch: targetBatchName,
      data: createdRecords,
      errors: errors.length > 0 ? errors : undefined,
      message: `Berhasil mendaftarkan ${createdRecords.length} dari ${interns.length} anak magang.`,
    });
  } catch (error: any) {
    console.error('[/api/admin/users/bulk-create] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Terjadi kesalahan server saat pembuatan akun massal.' },
      { status: 500 }
    );
  }
}
