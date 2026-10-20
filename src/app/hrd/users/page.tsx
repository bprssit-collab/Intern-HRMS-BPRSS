'use client';

import { useState, useEffect } from 'react';
import {
  UserCog,
  Plus,
  Search,
  Filter,
  CheckCircle,
  AlertCircle,
  Loader2,
  Trash2,
  Edit2,
  Shield,
  ScanFace,
  Layers,
  Building,
  KeyRound,
  Eye,
  EyeOff,
  Users,
  Sparkles,
} from 'lucide-react';
import type { UserRole } from '@/types';
import { BulkUserModal } from '@/components/bulk-user-modal';

interface UserItem {
  id: string;
  name: string;
  username: string;
  email: string;
  role: UserRole;
  department: string;
  batch_id: string | null;
  batch_name: string;
  status: string;
  must_change_credentials?: boolean;
  has_face: boolean;
  created_at: string;
}

const DEFAULT_DEPARTMENTS = [
  'CS',
  'Teller UNPAM',
  'SDM',
  'Accounting',
  'Kepatuhan',
  'Kredit',
  'Audit',
  'Social Media',
  'Operasional',
  'IT',
  'Umum / HRD',
];

const ROLES_META: Record<UserRole, { label: string; badge: string; color: string }> = {
  super_admin: { label: 'Super Admin', badge: 'SUPER ADMIN', color: 'bg-purple-500/20 text-purple-300 border-purple-500/40' },
  kepala_hrd: { label: 'Kepala HRD', badge: 'KEPALA HRD', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
  staf_hrd: { label: 'Staf HRD', badge: 'STAF HRD', color: 'bg-teal-500/20 text-teal-300 border-teal-500/40' },
  intern_hrd: { label: 'Intern HRD (SDM)', badge: 'INTERN HRD', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
  intern: { label: 'Intern Biasa', badge: 'INTERN', color: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
};

export default function UsersManagementPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [batches, setBatches] = useState<{ id: string; name: string; is_active: boolean }[]>([]);
  const [departments, setDepartments] = useState<string[]>(DEFAULT_DEPARTMENTS);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState('ALL');
  const [selectedDept, setSelectedDept] = useState('ALL');

  // Bulk Registration Modal State
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Partial<UserItem> & { password?: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete Action State
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchUsers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [resUsers, resDepts] = await Promise.all([
        fetch('/api/admin/users'),
        fetch('/api/admin/departments').catch(() => null),
      ]);

      if (resUsers.status === 403) {
        window.location.href = '/hrd/dashboard';
        return;
      }
      const json = await resUsers.json();
      if (!resUsers.ok || !json.success) {
        throw new Error(json.error || 'Gagal memuat data pengguna.');
      }
      setUsers(json.data || []);
      setBatches(json.batches || []);
      if (json.currentUserId) setCurrentUserId(json.currentUserId);

      if (resDepts && resDepts.ok) {
        const deptJson = await resDepts.json();
        if (deptJson.success && Array.isArray(deptJson.data) && deptJson.data.length > 0) {
          setDepartments(deptJson.data.map((d: any) => d.name));
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openCreateModal = () => {
    const activeBatch = batches.find((b) => b.is_active);
    setEditingUser({
      name: '',
      username: '',
      email: '',
      password: '',
      role: 'intern',
      department: 'CS',
      batch_id: activeBatch?.id || (batches[0]?.id || ''),
      status: 'active',
    });
    setFormError(null);
    setShowPassword(false);
    setIsModalOpen(true);
  };

  const openEditModal = (user: UserItem) => {
    setEditingUser({
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      password: '',
      role: user.role,
      department: user.department,
      batch_id: user.batch_id,
      status: user.status,
    });
    setFormError(null);
    setShowPassword(false);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setIsSubmitting(true);
    setFormError(null);

    const isEdit = Boolean(editingUser.id);
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const res = await fetch('/api/admin/users', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingUser),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Gagal menyimpan akun pengguna.');
      }

      setIsModalOpen(false);
      setEditingUser(null);
      setActionFeedback({
        type: 'success',
        text: isEdit ? 'Akun berhasil diperbarui.' : 'Akun baru berhasil dibuat.',
      });
      await fetchUsers();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (user: UserItem) => {
    if (user.id === currentUserId) {
      alert('Anda tidak dapat menghapus akun Anda sendiri.');
      return;
    }

    const confirmMsg = `Peringatan: Anda akan MENGHAPUS akun "${user.name}" (@${user.username}).\n\nSemua data kehadiran, log absensi, dan data wajah pengguna ini akan ikut terhapus secara permanen.\n\nLanjutkan?`;
    if (!window.confirm(confirmMsg)) return;

    setDeletingId(user.id);
    setActionFeedback(null);

    try {
      const res = await fetch(`/api/admin/users?id=${user.id}`, {
        method: 'DELETE',
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Gagal menghapus pengguna.');
      }

      setActionFeedback({ type: 'success', text: `Akun "${user.name}" berhasil dihapus.` });
      await fetchUsers();
    } catch (err: any) {
      setActionFeedback({ type: 'error', text: err.message });
    } finally {
      setDeletingId(null);
    }
  };

  // Filtered users
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      (u.username && u.username.toLowerCase().includes(search.toLowerCase())) ||
      (u.email && u.email.toLowerCase().includes(search.toLowerCase())) ||
      u.department.toLowerCase().includes(search.toLowerCase());
    const matchesRole = selectedRole === 'ALL' || u.role === selectedRole;
    const matchesDept = selectedDept === 'ALL' || u.department === selectedDept;
    return matchesSearch && matchesRole && matchesDept;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <UserCog className="w-6 h-6 text-purple-400" />
              Manajemen Akun Pengguna
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
              SUPER ADMIN
            </span>
          </div>
          <p className="text-slate-400 text-sm">
            Kelola seluruh akun dengan username unik, generate massal untuk anak magang, atau kelola hak akses sistem.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={() => setIsBulkModalOpen(true)}
            className="btn-primary text-sm flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 border-purple-400 shadow-lg shadow-purple-600/20"
          >
            <Users className="w-4 h-4" />
            Pendaftaran Massal (Gelondongan)
          </button>
          <button
            onClick={openCreateModal}
            className="btn-secondary text-sm flex items-center gap-2 border-white/20 hover:border-white/40"
          >
            <Plus className="w-4 h-4" />
            Tambah Satu Akun
          </button>
        </div>
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

      {/* Role Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {(Object.keys(ROLES_META) as UserRole[]).map((r) => {
          const count = users.filter((u) => u.role === r).length;
          const meta = ROLES_META[r];
          return (
            <div
              key={r}
              onClick={() => setSelectedRole(selectedRole === r ? 'ALL' : r)}
              className={`glass-card p-3 cursor-pointer transition-all border ${
                selectedRole === r
                  ? 'border-purple-400 ring-2 ring-purple-500/20 scale-[1.02]'
                  : 'hover:border-white/20'
              }`}
            >
              <div className="text-xs text-slate-400 truncate">{meta.label}</div>
              <div className="text-xl font-bold text-white mt-0.5">{count}</div>
            </div>
          );
        })}
      </div>

      {/* Filter Bar */}
      <div className="glass-card p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Cari nama, email, atau divisi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field has-icon text-sm w-full !pl-11"
            style={{ paddingLeft: '2.75rem' }}
          />
        </div>

        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="input-field text-sm !w-auto !bg-slate-900 !text-slate-100"
          >
            <option value="ALL" className="bg-slate-900 text-slate-100">Semua Role</option>
            {(Object.keys(ROLES_META) as UserRole[]).map((r) => (
              <option key={r} value={r} className="bg-slate-900 text-slate-100">
                {ROLES_META[r].label}
              </option>
            ))}
          </select>

          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="input-field text-sm !w-auto !bg-slate-900 !text-slate-100"
          >
            <option value="ALL" className="bg-slate-900 text-slate-100">Semua Bagian</option>
            {departments.map((d) => (
              <option key={d} value={d} className="bg-slate-900 text-slate-100">
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="glass-card overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-purple-400" />
            <p className="text-xs">Memuat data pengguna...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            Tidak ada akun pengguna yang sesuai filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/5 border-b border-white/5 text-slate-400 uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">Nama & Username</th>
                  <th className="py-3 px-4">Role Akses</th>
                  <th className="py-3 px-4">Bagian</th>
                  <th className="py-3 px-4">Batch</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Wajah</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredUsers.map((u) => {
                  const meta = ROLES_META[u.role] || { label: u.role, badge: u.role, color: 'bg-slate-500/20 text-slate-300' };
                  const isSelf = u.id === currentUserId;

                  return (
                    <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white text-sm flex items-center gap-1.5">
                          {u.name}
                          {isSelf && (
                            <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[9px] font-bold">
                              AKUN ANDA
                            </span>
                          )}
                          {u.must_change_credentials && (
                            <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-bold" title="Kredensial Default - Wajib ganti saat login pertama">
                              DEFAULT
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-cyan-400 font-mono mt-0.5">@{u.username}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${meta.color}`}>
                          {meta.badge}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-white/5 text-slate-300 font-medium">
                          {u.department || '-'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        {u.batch_name || '-'}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            u.status === 'active'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : u.status === 'perbantuan'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                          }`}
                        >
                          {u.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {u.has_face ? (
                          <span className="flex items-center gap-1 text-emerald-400 font-medium">
                            <CheckCircle className="w-3.5 h-3.5" />
                            Terdaftar
                          </span>
                        ) : (
                          <span className="text-slate-500 italic">Belum Ada</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(u)}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                            title="Edit Akun & Ubah Role"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(u)}
                            disabled={isSelf || deletingId === u.id}
                            className={`p-1.5 rounded-lg transition-colors ${
                              isSelf
                                ? 'opacity-30 cursor-not-allowed text-slate-600'
                                : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300'
                            }`}
                            title={isSelf ? 'Tidak dapat menghapus akun Anda sendiri' : 'Hapus Akun'}
                          >
                            {deletingId === u.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-400" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL CREATE / EDIT USER */}
      {isModalOpen && editingUser && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card max-w-lg w-full p-6 animate-fade-in border-purple-500/40">
            <h3 className="text-lg font-bold text-white mb-1">
              {editingUser.id ? 'Edit Akun Pengguna' : 'Tambah Akun Baru'}
            </h3>
            <p className="text-slate-400 text-xs mb-4">
              {editingUser.id
                ? 'Perbarui profil pengguna, ganti role akses, atau atur ulang password.'
                : 'Buat kredensial akun baru untuk anak magang atau tim HRD.'}
            </p>

            {formError && (
              <div className="alert alert-error mb-4">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="text-xs">{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={editingUser.name || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="input-field text-xs"
                  placeholder="Misal: Alfiani Nutriana Ayu"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">
                  Username <span className="text-purple-400 font-normal">(Harus unik, huruf kecil, angka, titik, strip)</span>
                </label>
                <input
                  type="text"
                  required
                  value={editingUser.username || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value.toLowerCase().trim() })}
                  className="input-field text-xs font-mono"
                  placeholder="contoh: budi.santoso"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Role Pengguna</label>
                  <select
                    value={editingUser.role || 'intern'}
                    onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as UserRole })}
                    className="input-field text-xs"
                  >
                    {(Object.keys(ROLES_META) as UserRole[]).map((r) => (
                      <option key={r} value={r}>
                        {ROLES_META[r].label}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-500">
                    Ganti ke &quot;Intern HRD&quot; jika ditempatkan di SDM.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Bagian / Divisi</label>
                  <select
                    value={editingUser.department || 'CS'}
                    onChange={(e) => setEditingUser({ ...editingUser, department: e.target.value })}
                    className="input-field text-xs"
                  >
                    {departments.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {(editingUser.role === 'intern' || editingUser.role === 'intern_hrd') && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Batch Magang</label>
                    <select
                      value={editingUser.batch_id || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, batch_id: e.target.value || null })}
                      className="input-field text-xs"
                    >
                      <option value="">-- Tanpa Batch --</option>
                      {batches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} {b.is_active ? '(Aktif)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Status Magang</label>
                    <select
                      value={editingUser.status || 'active'}
                      onChange={(e) => setEditingUser({ ...editingUser, status: e.target.value })}
                      className="input-field text-xs"
                    >
                      <option value="active">Magang Aktif</option>
                      <option value="perbantuan">Masa Perbantuan</option>
                      <option value="completed">Selesai / Alumni</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>
                    Password {editingUser.id ? '(Kosongkan jika tidak diubah)' : '(Minimal 6 Karakter)'}
                  </span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required={!editingUser.id}
                    value={editingUser.password || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })}
                    className="input-field text-xs !pr-11"
                    style={{ paddingRight: '2.75rem' }}
                    placeholder={editingUser.id ? '••••••••' : 'Password baru (min. 6 karakter)'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-white/10">
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
                  {editingUser.id ? 'Perbarui Akun' : 'Buat Akun'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk User Registration Modal */}
      <BulkUserModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        batches={batches}
        onSuccess={() => {
          fetchUsers();
          setActionFeedback({
            type: 'success',
            text: 'Akun massal berhasil didaftarkan.',
          });
        }}
      />
    </div>
  );
}
