'use client';

import { useState, useEffect } from 'react';
import {
  Building2,
  Plus,
  Search,
  CheckCircle,
  AlertCircle,
  Loader2,
  Trash2,
  Edit2,
  Users,
  Briefcase,
  Layers,
  Sparkles,
  Info,
} from 'lucide-react';
import type { Department } from '@/types';

export default function DepartmentsManagementPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFallback, setIsFallback] = useState(false);

  // Search filter
  const [search, setSearch] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Partial<Department> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete Action State
  const [deletingDept, setDeletingDept] = useState<Department | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchDepartments = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/departments');
      if (res.status === 403) {
        window.location.href = '/hrd/dashboard';
        return;
      }
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Gagal memuat data divisi.');
      }
      setDepartments(json.data || []);
      setIsFallback(Boolean(json.is_fallback));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const openCreateModal = () => {
    setEditingDept({
      name: '',
      code: '',
      description: '',
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (dept: Department) => {
    setEditingDept({
      id: dept.id,
      name: dept.name,
      code: dept.code || '',
      description: dept.description || '',
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDept || !editingDept.name?.trim()) return;

    setIsSubmitting(true);
    setFormError(null);

    const isEdit = Boolean(editingDept.id && !editingDept.id.startsWith('default-'));
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const res = await fetch('/api/admin/departments', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingDept.id,
          name: editingDept.name.trim(),
          code: editingDept.code?.trim() || null,
          description: editingDept.description?.trim() || null,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Gagal menyimpan data divisi.');
      }

      setIsModalOpen(false);
      setEditingDept(null);
      setActionFeedback({
        type: 'success',
        text: isEdit ? 'Divisi berhasil diperbarui.' : 'Divisi baru berhasil ditambahkan.',
      });
      await fetchDepartments();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingDept) return;

    setIsDeleting(true);
    setActionFeedback(null);

    try {
      const res = await fetch(`/api/admin/departments?id=${deletingDept.id}`, {
        method: 'DELETE',
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Gagal menghapus divisi.');
      }

      setActionFeedback({ type: 'success', text: `Divisi "${deletingDept.name}" berhasil dihapus.` });
      setDeletingDept(null);
      await fetchDepartments();
    } catch (err: any) {
      setActionFeedback({ type: 'error', text: err.message });
      setDeletingDept(null);
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered
  const filteredDepartments = departments.filter((d) => {
    const q = search.toLowerCase();
    return (
      d.name.toLowerCase().includes(q) ||
      (d.description && d.description.toLowerCase().includes(q)) ||
      (d.code && d.code.toLowerCase().includes(q))
    );
  });

  // Stats
  const totalDepartments = departments.length;
  const totalUsersAssigned = departments.reduce((acc, d) => acc + (d.user_count || 0), 0);
  const largestDept = departments.reduce((prev, current) =>
    (prev.user_count || 0) > (current.user_count || 0) ? prev : current,
    departments[0] || { name: '-', user_count: 0 }
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              Manajemen Divisi / Bagian
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
              SUPER ADMIN
            </span>
          </div>
          <p className="text-slate-400 text-sm">
            Kelola daftar divisi/bagian penempatan kerja secara dinamis untuk seluruh form dan rekapitulasi.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="btn-primary text-sm flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 border-purple-400 shadow-lg shadow-purple-600/20 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Tambah Divisi Baru
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
              Menampilkan daftar divisi bawaan sistem. Untuk persistensi custom cloud Supabase, jalankan skrip{' '}
              <strong className="underline">supabase/migration_v4_departments.sql</strong> di SQL Editor Supabase Anda.
            </span>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">{totalDepartments}</div>
            <div className="text-xs text-slate-400">Total Divisi Terdaftar</div>
          </div>
        </div>

        <div className="glass-card p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">{totalUsersAssigned}</div>
            <div className="text-xs text-slate-400">Total Pengguna Terdistribusi</div>
          </div>
        </div>

        <div className="glass-card p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Sparkles className="w-6 h-6" />
          </div>
          <div className="truncate">
            <div className="text-lg font-bold text-white truncate">
              {largestDept?.name || '-'}
            </div>
            <div className="text-xs text-slate-400">
              Divisi Terbanyak ({largestDept?.user_count || 0} Akun)
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="glass-card p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Cari nama divisi atau deskripsi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field has-icon text-sm w-full !pl-11"
            style={{ paddingLeft: '2.75rem' }}
          />
        </div>
        <div className="text-xs text-slate-400 shrink-0">
          Menampilkan <strong className="text-white">{filteredDepartments.length}</strong> dari {totalDepartments} divisi
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center p-12">
            <div className="spinner !w-10 !h-10 text-purple-400"></div>
          </div>
        ) : filteredDepartments.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            Tidak ada divisi yang sesuai pencarian.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/5 border-b border-white/5 text-slate-400 text-xs uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4">Nama Divisi / Bagian</th>
                  <th className="py-3 px-4">Deskripsi / Peran</th>
                  <th className="py-3 px-4 text-center">Pengguna Terdaftar</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-300">
                {filteredDepartments.map((dept, index) => {
                  const hasUsers = (dept.user_count || 0) > 0;
                  return (
                    <tr key={dept.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-3.5 px-4 text-center text-slate-500 text-xs font-mono">
                        {index + 1}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-purple-400 shrink-0" />
                          <span>{dept.name}</span>
                          {dept.code && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20 font-mono">
                              {dept.code}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-400 max-w-md">
                        {dept.description || '-'}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            hasUsers
                              ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30'
                              : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                          }`}
                        >
                          <Users className="w-3 h-3" />
                          {dept.user_count || 0} Akun
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(dept)}
                            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                            title="Edit Nama / Keterangan Divisi"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeletingDept(dept)}
                            disabled={hasUsers}
                            className={`p-1.5 rounded-lg transition-colors ${
                              hasUsers
                                ? 'text-slate-600 cursor-not-allowed'
                                : 'text-slate-400 hover:text-rose-400 hover:bg-rose-500/10'
                            }`}
                            title={
                              hasUsers
                                ? `Tidak dapat dihapus karena masih ada ${dept.user_count} pengguna terdaftar`
                                : 'Hapus Divisi'
                            }
                          >
                            <Trash2 className="w-4 h-4" />
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

      {/* Modal Tambah / Edit Divisi */}
      {isModalOpen && editingDept && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card max-w-md w-full p-6 animate-fade-in border-purple-500/40">
            <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-purple-400" />
              {editingDept.id ? 'Edit Divisi / Bagian' : 'Tambah Divisi Baru'}
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Nama divisi akan langsung muncul pada pilihan penempatan anak magang dan filter rekap.
            </p>

            {formError && (
              <div className="alert alert-error mb-4 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">
                  Nama Divisi / Bagian <span className="text-purple-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editingDept.name || ''}
                  onChange={(e) => setEditingDept({ ...editingDept, name: e.target.value })}
                  className="input-field text-sm"
                  placeholder="Contoh: Logistik, Customer Service, Legal"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">
                  Kode Singkatan <span className="text-slate-500 font-normal">(Opsional)</span>
                </label>
                <input
                  type="text"
                  value={editingDept.code || ''}
                  onChange={(e) => setEditingDept({ ...editingDept, code: e.target.value.toUpperCase() })}
                  className="input-field text-sm font-mono uppercase"
                  placeholder="Contoh: CS, IT, SDM"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">
                  Deskripsi / Keterangan <span className="text-slate-500 font-normal">(Opsional)</span>
                </label>
                <textarea
                  rows={2}
                  value={editingDept.description || ''}
                  onChange={(e) => setEditingDept({ ...editingDept, description: e.target.value })}
                  className="input-field text-xs resize-none"
                  placeholder="Deskripsi tugas dan fungsi divisi..."
                />
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
                  {isSubmitting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle className="w-3.5 h-3.5" />
                  )}
                  {editingDept.id ? 'Perbarui Divisi' : 'Simpan Divisi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus Divisi */}
      {deletingDept && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card max-w-sm w-full p-6 animate-fade-in border-rose-500/40">
            <div className="w-10 h-10 rounded-full bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-3">
              <Trash2 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">
              Hapus Divisi &quot;{deletingDept.name}&quot;?
            </h3>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Divisi ini akan dihapus dari daftar pilihan sistem. Tindakan ini tidak dapat dibatalkan.
            </p>

            <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setDeletingDept(null)}
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
                Ya, Hapus Divisi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
