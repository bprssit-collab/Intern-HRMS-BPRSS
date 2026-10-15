'use client';

import { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Search,
  Filter,
  CheckCircle,
  Clock,
  Sparkles,
  Edit2,
  AlertCircle,
  Loader2,
  ScanFace,
  Building,
  Trash2,
} from 'lucide-react';
import type { User, Batch } from '@/types';

interface InternItem {
  id: string;
  name: string;
  email: string;
  department: string;
  batch_id: string;
  batch_name: string;
  status: 'active' | 'perbantuan' | 'completed';
  has_face: boolean;
  created_at: string;
}

const DEPARTMENTS = [
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
];

export default function InternsPage() {
  const [interns, setInterns] = useState<InternItem[]>([]);
  const [batches, setBatches] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedBatchId, setSelectedBatchId] = useState<string>('ALL');

  // Super Admin state & feedback
  const [currentUser, setCurrentUser] = useState<{ id: string; role: string; name: string } | null>(null);
  const [resetFaceTarget, setResetFaceTarget] = useState<InternItem | null>(null);
  const [isResettingFace, setIsResettingFace] = useState(false);
  const [resetFeedback, setResetFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIntern, setEditingIntern] = useState<Partial<InternItem> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchInterns = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/hrd/interns');
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Gagal memuat data anak magang.');
      }
      setInterns(json.data || []);
      const bList = json.batches || [];
      setBatches(bList);

      // Default to active batch on initial load
      setSelectedBatchId((prev) => {
        if (prev !== 'ALL') return prev;
        const active = bList.find((b: any) => b.is_active);
        return active ? active.id : (bList[0]?.id || 'ALL');
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInterns();
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setCurrentUser(json.data);
      })
      .catch(() => {});
  }, []);

  const handleConfirmResetFace = async () => {
    if (!resetFaceTarget) return;
    setIsResettingFace(true);
    setResetFeedback(null);
    try {
      const res = await fetch('/api/admin/reset-face', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: resetFaceTarget.id }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Gagal mereset data wajah.');
      }
      setResetFeedback({ type: 'success', text: json.message });
      setResetFaceTarget(null);
      await fetchInterns();
    } catch (err: any) {
      setResetFeedback({ type: 'error', text: err.message });
    } finally {
      setIsResettingFace(false);
    }
  };

  const openCreateModal = () => {
    setEditingIntern({
      name: '',
      email: '',
      department: 'CS',
      batch_id: batches[0]?.id || '',
      status: 'active',
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (item: InternItem) => {
    setEditingIntern({ ...item });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingIntern) return;

    setIsSubmitting(true);
    setFormError(null);

    const isEdit = Boolean(editingIntern.id);
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const res = await fetch('/api/hrd/interns', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingIntern),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Gagal menyimpan data.');
      }

      setIsModalOpen(false);
      setEditingIntern(null);
      await fetchInterns();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTogglePerbantuan = async (intern: InternItem) => {
    const nextStatus = intern.status === 'perbantuan' ? 'active' : 'perbantuan';
    try {
      const res = await fetch('/api/hrd/interns', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: intern.id, status: nextStatus }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error);
      await fetchInterns();
    } catch (err: any) {
      alert(err.message || 'Gagal mengubah status perbantuan.');
    }
  };

  // Filtered interns
  const filteredInterns = interns.filter((i) => {
    const matchesSearch =
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.email.toLowerCase().includes(search.toLowerCase()) ||
      i.department.toLowerCase().includes(search.toLowerCase());
    const matchesDept = selectedDept === 'ALL' || i.department === selectedDept;
    const matchesStatus = selectedStatus === 'ALL' || i.status === selectedStatus;
    const matchesBatch = selectedBatchId === 'ALL' || i.batch_id === selectedBatchId;
    return matchesSearch && matchesDept && matchesStatus && matchesBatch;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
            <Users className="w-6 h-6 text-cyan-400" />
            Daftar Anak Magang
          </h1>
          <p className="text-slate-400 text-sm">
            Kelola penempatan divisi/bagian, status aktif, dan penetapan status <strong>Perbantuan</strong>.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="btn-primary self-start sm:self-auto flex items-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" />
          Tambah Anak Magang
        </button>
      </div>

      {resetFeedback && (
        <div
          className={`alert ${
            resetFeedback.type === 'success' ? 'alert-success' : 'alert-error'
          } flex items-center justify-between`}
        >
          <div className="flex items-center gap-2 text-sm">
            {resetFeedback.type === 'success' ? (
              <CheckCircle className="w-5 h-5 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
            )}
            <span>{resetFeedback.text}</span>
          </div>
          <button
            onClick={() => setResetFeedback(null)}
            className="text-xs text-slate-400 hover:text-white underline ml-4"
          >
            Tutup
          </button>
        </div>
      )}

      {error && (
        <div className="alert alert-error">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="glass-card p-4 flex flex-col md:flex-row gap-3 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Cari nama, email, atau bagian..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-9 text-sm w-full"
          />
        </div>

        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <select
            value={selectedBatchId}
            onChange={(e) => setSelectedBatchId(e.target.value)}
            className="input-field text-sm !w-auto"
          >
            <option value="ALL">Semua Batch</option>
            {batches.map((b: any) => (
              <option key={b.id} value={b.id}>
                {b.name} {b.is_active ? '(Aktif)' : ''}
              </option>
            ))}
          </select>

          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="input-field text-sm !w-auto"
          >
            <option value="ALL">Semua Bagian</option>
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="input-field text-sm !w-auto"
          >
            <option value="ALL">Semua Status</option>
            <option value="active">Magang Aktif</option>
            <option value="perbantuan">Masa Perbantuan</option>
            <option value="completed">Selesai / Alumni</option>
          </select>
        </div>
      </div>

      {/* Interns Table */}
      <div className="glass-card overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center p-12">
            <div className="spinner !w-10 !h-10 text-cyan-400"></div>
          </div>
        ) : filteredInterns.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            Tidak ada anak magang yang sesuai filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/5 border-b border-white/5 text-slate-400 text-xs uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">Nama & Email</th>
                  <th className="py-3 px-4">Bagian / Divisi</th>
                  <th className="py-3 px-4">Batch</th>
                  <th className="py-3 px-4">Status Magang</th>
                  <th className="py-3 px-4">Data Wajah</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-300">
                {filteredInterns.map((intern) => {
                  return (
                    <tr key={intern.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white">{intern.name}</div>
                        <div className="text-xs text-slate-400 font-mono">{intern.email}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/5 text-slate-200 border border-white/10 text-xs font-medium">
                          <Building className="w-3 h-3 text-cyan-400" />
                          {intern.department}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-xs text-slate-300">
                        {intern.batch_name}
                      </td>
                      <td className="py-3.5 px-4">
                        {intern.status === 'perbantuan' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-semibold">
                            <Sparkles className="w-3 h-3" />
                            Perbantuan
                          </span>
                        ) : intern.status === 'completed' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-500/20 text-slate-400 border border-slate-500/30 text-xs font-medium">
                            Selesai
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold">
                            <CheckCircle className="w-3 h-3" />
                            Aktif
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {intern.has_face ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400 text-xs font-medium">
                            <ScanFace className="w-3.5 h-3.5" /> Terdaftar
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-slate-500 text-xs">
                            <ScanFace className="w-3.5 h-3.5" /> Belum
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Super Admin: Reset / Hapus Wajah */}
                          {currentUser?.role === 'super_admin' && intern.has_face && (
                            <button
                              onClick={() => setResetFaceTarget(intern)}
                              title="Hapus / Reset Data Wajah (Super Admin)"
                              className="px-2 py-1 rounded text-xs transition-colors border bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border-rose-500/30 flex items-center gap-1"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                              <span className="hidden sm:inline">Hapus Wajah</span>
                            </button>
                          )}
                          <button
                            onClick={() => handleTogglePerbantuan(intern)}
                            title={
                              intern.status === 'perbantuan'
                                ? 'Kembalikan ke Magang Aktif'
                                : 'Tetapkan Status Perbantuan (Tarif Khusus)'
                            }
                            className={`px-2.5 py-1 rounded text-xs transition-colors border ${
                              intern.status === 'perbantuan'
                                ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30'
                                : 'bg-white/5 hover:bg-white/10 text-slate-400 border-white/10'
                            }`}
                          >
                            {intern.status === 'perbantuan' ? 'Lepas Perbantuan' : '+ Perbantuan'}
                          </button>
                          <button
                            onClick={() => openEditModal(intern)}
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded transition-colors"
                            title="Edit Data"
                          >
                            <Edit2 className="w-4 h-4" />
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

      {/* Modal Edit / Tambah Intern */}
      {isModalOpen && editingIntern && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card max-w-md w-full p-6 animate-fade-in border-cyan-500/40">
            <h2 className="text-xl font-bold text-white mb-1">
              {editingIntern.id ? 'Edit Anak Magang' : 'Tambah Anak Magang'}
            </h2>
            <p className="text-slate-400 text-xs mb-6">
              Lengkapi data informasi nama, bagian, batch, dan status kehadiran.
            </p>

            {formError && (
              <div className="alert alert-error mb-4 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={editingIntern.name || ''}
                  onChange={(e) => setEditingIntern({ ...editingIntern, name: e.target.value })}
                  className="input-field text-sm"
                  placeholder="Misal: Alfiani Nutriana Ayu"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">Email Akun</label>
                <input
                  type="email"
                  required
                  value={editingIntern.email || ''}
                  onChange={(e) => setEditingIntern({ ...editingIntern, email: e.target.value })}
                  className="input-field text-sm font-mono"
                  placeholder="alfiani@intern.bprsehat.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Bagian / Divisi</label>
                  <select
                    value={editingIntern.department || 'CS'}
                    onChange={(e) => setEditingIntern({ ...editingIntern, department: e.target.value })}
                    className="input-field text-sm"
                  >
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Batch Magang</label>
                  <select
                    value={editingIntern.batch_id || ''}
                    onChange={(e) => setEditingIntern({ ...editingIntern, batch_id: e.target.value })}
                    className="input-field text-sm"
                  >
                    {batches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">Status Magang</label>
                <select
                  value={editingIntern.status || 'active'}
                  onChange={(e) =>
                    setEditingIntern({
                      ...editingIntern,
                      status: e.target.value as 'active' | 'perbantuan' | 'completed',
                    })
                  }
                  className="input-field text-sm"
                >
                  <option value="active">Magang Aktif (Reguler)</option>
                  <option value="perbantuan">Masa Perbantuan (Tarif Khusus)</option>
                  <option value="completed">Selesai Magang (Alumni)</option>
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Pilih <strong>Masa Perbantuan</strong> jika anak magang telah menyelesaikan masa batch reguler namun masih diperbantukan di kantor.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn-secondary text-sm"
                  disabled={isSubmitting}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary text-sm flex items-center gap-2"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Simpan Data
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus / Reset Wajah (Super Admin Only) */}
      {resetFaceTarget && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card max-w-md w-full p-6 animate-fade-in border-rose-500/50 shadow-2xl shadow-rose-950/50">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4">
              <ScanFace className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-white mb-1">
              Reset Data Wajah: {resetFaceTarget.name}?
            </h2>
            <p className="text-slate-300 text-xs leading-relaxed mb-4">
              Tindakan ini akan <strong className="text-rose-300">menghapus data biometrik wajah (128D Face Descriptor)</strong> milik{' '}
              <span className="text-white font-semibold">{resetFaceTarget.name}</span> ({resetFaceTarget.email}).
            </p>
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] mb-5">
              ⚠️ Setelah dihapus, anak magang harus melakukan registrasi/rekam ulang wajah saat hendak melakukan absensi berikutnya.
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setResetFaceTarget(null)}
                className="btn-secondary text-sm"
                disabled={isResettingFace}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmResetFace}
                disabled={isResettingFace}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-medium text-sm flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                {isResettingFace ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Menghapus...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Ya, Hapus Data Wajah
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
