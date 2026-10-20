'use client';

import { useState, useEffect } from 'react';
import {
  Shield,
  ShieldCheck,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  AlertCircle,
  Loader2,
  Users,
  Lock,
  Unlock,
  KeyRound,
  FileSpreadsheet,
  CalendarCheck,
  ScanFace,
  Layers,
  Sparkles,
  Info,
  Building2,
  Check,
  X,
} from 'lucide-react';
import type { RoleItem, RolePermissions } from '@/types';

const COLOR_PRESETS = [
  { label: 'Ungu (Super Admin)', value: 'bg-purple-500/20 text-purple-300 border-purple-500/40' },
  { label: 'Zamrud / Hijau (Kepala)', value: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
  { label: 'Teal (Staf Operasional)', value: 'bg-teal-500/20 text-teal-300 border-teal-500/40' },
  { label: 'Amber / Oranye (Intern HRD)', value: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
  { label: 'Biru (Intern Reguler)', value: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
  { label: 'Rose / Merah (Spesial)', value: 'bg-rose-500/20 text-rose-300 border-rose-500/40' },
  { label: 'Indigo (Manajemen)', value: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' },
  { label: 'Abu-abu (Netral)', value: 'bg-slate-500/20 text-slate-300 border-slate-500/40' },
];

export default function RolesManagementPage() {
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFallback, setIsFallback] = useState(false);
  const [activeTab, setActiveTab] = useState<'cards' | 'matrix'>('cards');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Partial<RoleItem> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete State
  const [deletingRole, setDeletingRole] = useState<RoleItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchRoles = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/roles');
      if (res.status === 403) {
        window.location.href = '/hrd/dashboard';
        return;
      }
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Gagal memuat data role.');
      }
      setRoles(json.data || []);
      setIsFallback(Boolean(json.is_fallback));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const openCreateModal = () => {
    setEditingRole({
      key: '',
      label: '',
      badge: '',
      color: COLOR_PRESETS[0].value,
      description: '',
      portal_access: 'hrd',
      is_system: false,
      permissions: {
        manage_users: false,
        manage_departments: false,
        manage_roles: false,
        manage_batches: false,
        view_attendance_history: false,
        edit_attendance: 'none',
        reset_face: false,
        payout_access: false,
        payout_approval: false,
        must_attend: false,
      },
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (role: RoleItem) => {
    setEditingRole({
      ...role,
      permissions: { ...role.permissions },
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRole) return;

    setIsSubmitting(true);
    setFormError(null);

    const isEdit = Boolean(editingRole.id && !editingRole.id.startsWith('core-'));
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const res = await fetch('/api/admin/roles', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingRole),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Gagal menyimpan role.');
      }

      setIsModalOpen(false);
      setEditingRole(null);
      setActionFeedback({
        type: 'success',
        text: isEdit ? 'Role berhasil diperbarui.' : 'Role baru berhasil ditambahkan.',
      });
      await fetchRoles();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingRole) return;
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/admin/roles?id=${deletingRole.id}`, {
        method: 'DELETE',
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Gagal menghapus role.');
      }

      setActionFeedback({ type: 'success', text: `Role "${deletingRole.label}" berhasil dihapus.` });
      setDeletingRole(null);
      await fetchRoles();
    } catch (err: any) {
      setActionFeedback({ type: 'error', text: err.message });
      setDeletingRole(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const totalUsersInRoles = roles.reduce((acc, r) => acc + (r.user_count || 0), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              Manajemen Role & Hak Akses
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
              SUPER ADMIN
            </span>
          </div>
          <p className="text-slate-400 text-sm">
            Kelola peran pengguna, perizinan modul (*Access Control*), dan batasan kewenangan sistem HRMS.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="btn-primary text-sm flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 border-purple-400 shadow-lg shadow-purple-600/20 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Tambah Role Baru
        </button>
      </div>

      {actionFeedback && (
        <div
          className={`alert ${
            actionFeedback.type === 'success' ? 'alert-success' : 'alert-error'
          } flex items-center justify-between`}
        >
          <div className="flex items-center gap-2 text-sm">
            {actionFeedback.type === 'success' ? (
              <CheckCircle className="w-5 h-5 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
            )}
            <span>{actionFeedback.text}</span>
          </div>
          <button
            onClick={() => setActionFeedback(null)}
            className="text-xs text-slate-400 hover:text-white underline ml-4"
          >
            Tutup
          </button>
        </div>
      )}

      {isFallback && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Info className="w-5 h-5 text-amber-400 shrink-0" />
            <span>
              Menampilkan konfigurasi role bawaan sistem. Untuk mengaktifkan kustomisasi penuh di cloud Supabase, jalankan skrip{' '}
              <strong className="underline">supabase/migration_v5_roles.sql</strong> di SQL Editor Supabase.
            </span>
          </div>
        </div>
      )}

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">{roles.length}</div>
            <div className="text-xs text-slate-400">Total Role Terdaftar</div>
          </div>
        </div>

        <div className="glass-card p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">
              {roles.filter((r) => r.portal_access === 'hrd' || r.portal_access === 'both').length}
            </div>
            <div className="text-xs text-slate-400">Role Akses Portal HRD</div>
          </div>
        </div>

        <div className="glass-card p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">{totalUsersInRoles}</div>
            <div className="text-xs text-slate-400">Total Akun Terdistribusi</div>
          </div>
        </div>
      </div>

      {/* Tab Selector */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('cards')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors ${
            activeTab === 'cards'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
              : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
          }`}
        >
          <Shield className="w-4 h-4" />
          Daftar & Detail Role
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('matrix')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors ${
            activeTab === 'matrix'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
              : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
          }`}
        >
          <Layers className="w-4 h-4" />
          Matriks Perizinan (Matrix Permissions)
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <div className="spinner !w-10 !h-10 text-purple-400"></div>
        </div>
      ) : activeTab === 'cards' ? (
        /* TAB 1: KARTU ROLE */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles.map((r) => {
            const p = r.permissions || {};
            return (
              <div
                key={r.id}
                className="glass-card p-5 flex flex-col justify-between border-white/10 hover:border-purple-500/30 transition-all hover:-translate-y-0.5"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${r.color}`}>
                      {r.badge}
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">
                      key: <strong>{r.key}</strong>
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white mb-1.5 flex items-center gap-2">
                    {r.label}
                    {r.is_system && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-white/10 text-slate-400 font-semibold uppercase">
                        Sistem
                      </span>
                    )}
                  </h3>

                  <p className="text-xs text-slate-400 leading-relaxed mb-4 min-h-[48px]">
                    {r.description || 'Tidak ada deskripsi.'}
                  </p>

                  <div className="space-y-2 border-t border-white/5 pt-3 mb-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Akses Portal:</span>
                      <span className="font-semibold text-slate-200 uppercase text-[11px]">
                        {r.portal_access === 'both'
                          ? 'HRD & Intern'
                          : r.portal_access === 'hrd'
                          ? 'Khusus HRD'
                          : 'Khusus Intern'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Pengguna Terdaftar:</span>
                      <span className="inline-flex items-center gap-1 font-semibold text-cyan-300 text-xs">
                        <Users className="w-3.5 h-3.5" />
                        {r.user_count || 0} Akun
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Wajib Absen Wajah:</span>
                      <span className={`text-[11px] font-semibold ${p.must_attend ? 'text-amber-400' : 'text-slate-500'}`}>
                        {p.must_attend ? 'Ya (Attendee)' : 'Tidak (Admin)'}
                      </span>
                    </div>
                  </div>

                  {/* Permission Highlights */}
                  <div className="flex flex-wrap gap-1.5">
                    {p.manage_users && (
                      <span className="px-2 py-0.5 rounded text-[10px] bg-purple-500/15 text-purple-300 border border-purple-500/30">
                        Kelola Akun
                      </span>
                    )}
                    {p.manage_departments && (
                      <span className="px-2 py-0.5 rounded text-[10px] bg-purple-500/15 text-purple-300 border border-purple-500/30">
                        Kelola Divisi
                      </span>
                    )}
                    {p.manage_roles && (
                      <span className="px-2 py-0.5 rounded text-[10px] bg-purple-500/15 text-purple-300 border border-purple-500/30">
                        Kelola Role
                      </span>
                    )}
                    {p.payout_approval && (
                      <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                        Approval Uang Saku
                      </span>
                    )}
                    {p.edit_attendance === 'unlimited' && (
                      <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/15 text-amber-300 border border-amber-500/30">
                        Bypass Edit Absen
                      </span>
                    )}
                    {p.reset_face && (
                      <span className="px-2 py-0.5 rounded text-[10px] bg-rose-500/15 text-rose-300 border border-rose-500/30">
                        Reset Data Wajah
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-white/5 mt-4">
                  <button
                    onClick={() => openEditModal(r)}
                    className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Konfigurasi
                  </button>
                  {!r.is_system && (
                    <button
                      onClick={() => setDeletingRole(r)}
                      disabled={(r.user_count || 0) > 0}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      title={(r.user_count || 0) > 0 ? 'Tidak dapat dihapus karena masih ada user' : 'Hapus Role'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TAB 2: MATRIKS PERIZINAN (PERMISSIONS MATRIX) */
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/5 border-b border-white/5 text-slate-300 uppercase font-semibold">
                <tr>
                  <th className="py-3.5 px-4 w-60">Fitur / Hak Akses Sistem</th>
                  {roles.map((r) => (
                    <th key={r.id} className="py-3.5 px-3 text-center min-w-[110px]">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${r.color}`}>
                        {r.badge}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-300">
                <tr>
                  <td className="py-3 px-4 font-semibold text-white">Akses Portal HRD (/hrd/*)</td>
                  {roles.map((r) => (
                    <td key={r.id} className="py-3 px-3 text-center">
                      {r.portal_access === 'hrd' || r.portal_access === 'both' ? (
                        <Check className="w-4 h-4 text-emerald-400 mx-auto" />
                      ) : (
                        <X className="w-4 h-4 text-slate-600 mx-auto" />
                      )}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold text-white">Manajemen Akun & Kredensial</td>
                  {roles.map((r) => (
                    <td key={r.id} className="py-3 px-3 text-center">
                      {r.permissions?.manage_users ? (
                        <Check className="w-4 h-4 text-emerald-400 mx-auto" />
                      ) : (
                        <X className="w-4 h-4 text-slate-600 mx-auto" />
                      )}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold text-white">Manajemen Divisi / Bagian</td>
                  {roles.map((r) => (
                    <td key={r.id} className="py-3 px-3 text-center">
                      {r.permissions?.manage_departments ? (
                        <Check className="w-4 h-4 text-emerald-400 mx-auto" />
                      ) : (
                        <X className="w-4 h-4 text-slate-600 mx-auto" />
                      )}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold text-white">Manajemen Role & Perizinan</td>
                  {roles.map((r) => (
                    <td key={r.id} className="py-3 px-3 text-center">
                      {r.permissions?.manage_roles ? (
                        <Check className="w-4 h-4 text-emerald-400 mx-auto" />
                      ) : (
                        <X className="w-4 h-4 text-slate-600 mx-auto" />
                      )}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold text-white">Manajemen Batch & Tarif Uang Saku</td>
                  {roles.map((r) => (
                    <td key={r.id} className="py-3 px-3 text-center">
                      {r.permissions?.manage_batches ? (
                        <Check className="w-4 h-4 text-emerald-400 mx-auto" />
                      ) : (
                        <X className="w-4 h-4 text-slate-600 mx-auto" />
                      )}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold text-white">Koreksi & Edit Absensi Manual</td>
                  {roles.map((r) => {
                    const e = r.permissions?.edit_attendance;
                    return (
                      <td key={r.id} className="py-3 px-3 text-center">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                            e === 'unlimited'
                              ? 'bg-purple-500/20 text-purple-300'
                              : e === 'once'
                              ? 'bg-teal-500/20 text-teal-300'
                              : e === 'notes_only'
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-slate-500/10 text-slate-500'
                          }`}
                        >
                          {e === 'unlimited' ? 'Tanpa Batas' : e === 'once' ? 'Maks 1x Edit' : e === 'notes_only' ? 'Hanya Izin/S' : 'Terkunci'}
                        </span>
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold text-white">Reset Biometrik Wajah (Descriptor)</td>
                  {roles.map((r) => (
                    <td key={r.id} className="py-3 px-3 text-center">
                      {r.permissions?.reset_face ? (
                        <Check className="w-4 h-4 text-rose-400 mx-auto" />
                      ) : (
                        <X className="w-4 h-4 text-slate-600 mx-auto" />
                      )}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold text-white">Akses Rekap & Download Uang Saku</td>
                  {roles.map((r) => (
                    <td key={r.id} className="py-3 px-3 text-center">
                      {r.permissions?.payout_access ? (
                        <Check className="w-4 h-4 text-emerald-400 mx-auto" />
                      ) : (
                        <X className="w-4 h-4 text-slate-600 mx-auto" />
                      )}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold text-white">Approval / Tanda Tangan Uang Saku</td>
                  {roles.map((r) => (
                    <td key={r.id} className="py-3 px-3 text-center">
                      {r.permissions?.payout_approval ? (
                        <Check className="w-4 h-4 text-emerald-400 mx-auto" />
                      ) : (
                        <X className="w-4 h-4 text-slate-600 mx-auto" />
                      )}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold text-white">Wajib Presensi Wajah & GPS (Attendee)</td>
                  {roles.map((r) => (
                    <td key={r.id} className="py-3 px-3 text-center">
                      {r.permissions?.must_attend ? (
                        <span className="text-[10px] font-bold text-amber-400 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                          Wajib
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500">Tidak</span>
                      )}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Tambah / Edit Role */}
      {isModalOpen && editingRole && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card max-w-xl w-full p-6 animate-fade-in border-purple-500/40 max-h-[90vh] flex flex-col">
            <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2 shrink-0">
              <ShieldCheck className="w-5 h-5 text-purple-400" />
              {editingRole.id ? `Konfigurasi Role: ${editingRole.label}` : 'Tambah Role Baru'}
            </h3>
            <p className="text-xs text-slate-400 mb-4 shrink-0">
              Tentukan kewenangan dan tampilan badge untuk role pengguna ini.
            </p>

            {formError && (
              <div className="alert alert-error mb-4 text-xs shrink-0">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto flex-1 pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">
                    Role Key <span className="text-purple-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    disabled={Boolean(editingRole.is_system)}
                    value={editingRole.key || ''}
                    onChange={(e) => setEditingRole({ ...editingRole, key: e.target.value.toLowerCase().trim() })}
                    className="input-field text-xs font-mono disabled:opacity-50"
                    placeholder="Contoh: staf_operasional"
                  />
                  {editingRole.is_system && (
                    <p className="text-[10px] text-slate-500">Key role sistem bawaan dikunci demi keamanan.</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">
                    Nama Label Role <span className="text-purple-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editingRole.label || ''}
                    onChange={(e) => setEditingRole({ ...editingRole, label: e.target.value })}
                    className="input-field text-xs"
                    placeholder="Contoh: Staf Operasional"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Teks Badge</label>
                  <input
                    type="text"
                    required
                    value={editingRole.badge || ''}
                    onChange={(e) => setEditingRole({ ...editingRole, badge: e.target.value.toUpperCase() })}
                    className="input-field text-xs uppercase font-mono"
                    placeholder="STAF OPERASIONAL"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Akses Portal</label>
                  <select
                    value={editingRole.portal_access || 'hrd'}
                    onChange={(e) => setEditingRole({ ...editingRole, portal_access: e.target.value as any })}
                    className="input-field text-xs !bg-slate-900"
                  >
                    <option value="hrd">Portal HRD Saja</option>
                    <option value="intern">Portal Intern Saja</option>
                    <option value="both">Keduanya (HRD & Intern)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Warna Badge</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {COLOR_PRESETS.map((preset) => {
                    const isSelected = editingRole.color === preset.value;
                    return (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => setEditingRole({ ...editingRole, color: preset.value })}
                        className={`p-2 rounded-lg text-left text-[11px] border transition-all flex items-center justify-between ${
                          isSelected ? 'border-purple-400 bg-purple-500/10 ring-1 ring-purple-400' : 'border-white/10 hover:border-white/20'
                        }`}
                      >
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${preset.value}`}>
                          CONTOH
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-purple-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Deskripsi / Peran Tanggung Jawab</label>
                <textarea
                  rows={2}
                  value={editingRole.description || ''}
                  onChange={(e) => setEditingRole({ ...editingRole, description: e.target.value })}
                  className="input-field text-xs resize-none"
                  placeholder="Penjelasan wewenang dan cakupan pekerjaan role ini..."
                />
              </div>

              {/* Matriks Perizinan */}
              <div className="space-y-2 border-t border-white/10 pt-3">
                <label className="text-xs font-bold text-white flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-purple-400" />
                  Konfigurasi Izin Akses (Permissions)
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center gap-2 p-2 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={Boolean(editingRole.permissions?.manage_users)}
                      onChange={(e) =>
                        setEditingRole({
                          ...editingRole,
                          permissions: { ...editingRole.permissions, manage_users: e.target.checked },
                        })
                      }
                      className="rounded border-slate-700 text-purple-600 focus:ring-purple-500"
                    />
                    <span>Kelola Akun Pengguna</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={Boolean(editingRole.permissions?.manage_departments)}
                      onChange={(e) =>
                        setEditingRole({
                          ...editingRole,
                          permissions: { ...editingRole.permissions, manage_departments: e.target.checked },
                        })
                      }
                      className="rounded border-slate-700 text-purple-600 focus:ring-purple-500"
                    />
                    <span>Kelola Divisi / Bagian</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={Boolean(editingRole.permissions?.manage_batches)}
                      onChange={(e) =>
                        setEditingRole({
                          ...editingRole,
                          permissions: { ...editingRole.permissions, manage_batches: e.target.checked },
                        })
                      }
                      className="rounded border-slate-700 text-purple-600 focus:ring-purple-500"
                    />
                    <span>Kelola Batch & Uang Saku</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={Boolean(editingRole.permissions?.payout_approval)}
                      onChange={(e) =>
                        setEditingRole({
                          ...editingRole,
                          permissions: { ...editingRole.permissions, payout_approval: e.target.checked },
                        })
                      }
                      className="rounded border-slate-700 text-purple-600 focus:ring-purple-500"
                    />
                    <span>Approval Rekap Uang Saku</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={Boolean(editingRole.permissions?.reset_face)}
                      onChange={(e) =>
                        setEditingRole({
                          ...editingRole,
                          permissions: { ...editingRole.permissions, reset_face: e.target.checked },
                        })
                      }
                      className="rounded border-slate-700 text-purple-600 focus:ring-purple-500"
                    />
                    <span>Reset Data Wajah</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={Boolean(editingRole.permissions?.must_attend)}
                      onChange={(e) =>
                        setEditingRole({
                          ...editingRole,
                          permissions: { ...editingRole.permissions, must_attend: e.target.checked },
                        })
                      }
                      className="rounded border-slate-700 text-purple-600 focus:ring-purple-500"
                    />
                    <span>Wajib Presensi Wajah (Intern)</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-white/10 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="btn-secondary text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary text-xs flex items-center gap-1.5 bg-purple-600 hover:bg-purple-500 border-purple-400"
                >
                  {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                  {editingRole.id ? 'Simpan Perubahan' : 'Buat Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Hapus Role */}
      {deletingRole && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card max-w-sm w-full p-6 animate-fade-in border-rose-500/40">
            <div className="w-10 h-10 rounded-full bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-3">
              <Trash2 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">
              Hapus Role &quot;{deletingRole.label}&quot;?
            </h3>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Tindakan ini akan menghapus definisi role custom ini. Role sistem bawaan tidak dapat dihapus.
            </p>

            <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setDeletingRole(null)}
                disabled={isDeleting}
                className="btn-secondary text-xs"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
