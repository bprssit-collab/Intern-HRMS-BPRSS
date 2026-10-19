'use client';

import { useState } from 'react';
import {
  Users,
  Plus,
  Trash2,
  Sparkles,
  ClipboardPaste,
  CheckCircle,
  AlertCircle,
  Copy,
  Download,
  Loader2,
  X,
  Layers,
  ArrowRight,
} from 'lucide-react';

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
  'Umum',
];

const DEFAULT_REFERENCE_INTERNS = [
  { department: 'CS', name: 'Budi Santoso' },
  { department: 'CS', name: 'Alfiani Nutriana Ayu' },
  { department: 'Teller UNPAM', name: 'Elsya Yunita Simangunsong' },
  { department: 'Teller UNPAM', name: 'Puan Maharani' },
  { department: 'Teller UNPAM', name: 'Novita Al Fitri Daeng' },
  { department: 'SDM', name: 'Felisitas Erselin' },
  { department: 'Accounting', name: 'Listiyani' },
  { department: 'Kepatuhan', name: 'Mustika Wulan' },
  { department: 'Kepatuhan', name: 'Muhammad Rizq Noval' },
  { department: 'Kredit', name: 'Eki Ramdani Sopyana' },
  { department: 'Kredit', name: 'Nesya Chintiya Bella' },
  { department: 'Audit', name: 'Bintang Reira Putri Hanafi' },
  { department: 'Social Media', name: 'Rosmita Fathia Hidayat' },
  { department: 'Social Media', name: 'Valdis Sandya Akhjan' },
];

interface BulkUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  batches: Array<{ id: string; name: string; is_active: boolean }>;
  onSuccess: () => void;
}

interface InternRow {
  id: string;
  department: string;
  name: string;
}

export function BulkUserModal({ isOpen, onClose, batches, onSuccess }: BulkUserModalProps) {
  const activeBatch = batches.find((b) => b.is_active) || batches[0];

  const [activeTab, setActiveTab] = useState<'table' | 'paste'>('table');
  const [rows, setRows] = useState<InternRow[]>([
    { id: '1', department: 'CS', name: '' },
    { id: '2', department: 'Kredit', name: '' },
    { id: '3', department: 'SDM', name: '' },
  ]);
  const [pasteText, setPasteText] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultData, setResultData] = useState<any[] | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleAddRow = () => {
    setRows((prev) => [
      ...prev,
      { id: crypto.randomUUID(), department: 'CS', name: '' },
    ]);
  };

  const handleAddFiveRows = () => {
    const newItems: InternRow[] = Array.from({ length: 5 }).map(() => ({
      id: crypto.randomUUID(),
      department: 'CS',
      name: '',
    }));
    setRows((prev) => [...prev, ...newItems]);
  };

  const handleRemoveRow = (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handleUpdateRow = (id: string, field: 'department' | 'name', val: string) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: val } : r))
    );
  };

  const handleLoadReference = () => {
    setRows(
      DEFAULT_REFERENCE_INTERNS.map((item) => ({
        id: crypto.randomUUID(),
        department: item.department,
        name: item.name,
      }))
    );
    setError(null);
  };

  const handleConvertPaste = () => {
    if (!pasteText.trim()) {
      setError('Teks paste masih kosong.');
      return;
    }

    const lines = pasteText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    const parsed: InternRow[] = [];

    for (const line of lines) {
      // Split by tab, comma, or pipe
      const parts = line.split(/[\t,|]+/).map((p) => p.trim()).filter(Boolean);
      if (parts.length >= 2) {
        // e.g. "Kredit   Eki Ramdani"
        parsed.push({
          id: crypto.randomUUID(),
          department: parts[0],
          name: parts.slice(1).join(' '),
        });
      } else if (parts.length === 1) {
        parsed.push({
          id: crypto.randomUUID(),
          department: 'CS',
          name: parts[0],
        });
      }
    }

    if (parsed.length === 0) {
      setError('Gagal memformat teks. Pastikan format: [Bagian] [Nama]');
      return;
    }

    setRows(parsed);
    setActiveTab('table');
    setError(null);
  };

  const handleSubmit = async () => {
    const validRows = rows
      .map((r) => ({
        department: r.department.trim(),
        name: r.name.trim(),
      }))
      .filter((r) => r.name.length > 0);

    if (validRows.length === 0) {
      setError('Mohon isi minimal satu nama anak magang.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/users/bulk-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interns: validRows }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Gagal mendaftarkan akun secara massal.');
      }

      setResultData(json.data || []);
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyAll = () => {
    if (!resultData || resultData.length === 0) return;

    let text = `=========================================\n`;
    text += `DAFTAR AKUN MAGANG - PT BPR SEHAT SEJAHTERA\n`;
    text += `Batch: ${activeBatch?.name || 'Batch Aktif'}\n`;
    text += `Tanggal: ${new Date().toLocaleDateString('id-ID')}\n`;
    text += `=========================================\n\n`;

    resultData.forEach((u, i) => {
      text += `${i + 1}. ${u.name} (${u.department})\n`;
      text += `   Username : ${u.username}\n`;
      text += `   Password : ${u.default_password}\n\n`;
    });

    text += `*Catatan: Saat login pertama kali, anak magang akan diminta membuat Username dan Password baru pribadi.\n`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadCSV = () => {
    if (!resultData || resultData.length === 0) return;

    let csv = `No,Nama,Bagian,Username Default,Password Default,Batch\n`;
    resultData.forEach((u, i) => {
      csv += `${i + 1},"${u.name}","${u.department}","${u.username}","${u.default_password}","${u.batch_name}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `akun_magang_${activeBatch?.name?.replace(/\s+/g, '_') || 'batch'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="glass-card max-w-3xl w-full p-6 animate-fade-in border-purple-500/40 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                Pendaftaran Akun Massal (Gelondongan)
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40">
                  SUPER ADMIN
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Otomatis meng-generate username & password default untuk anak magang.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {resultData ? (
            /* HASIL GENERATE AKUN */
            <div className="space-y-4 animate-fade-in">
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>
                    Berhasil mendaftarkan <strong>{resultData.length} akun anak magang</strong> ke dalam{' '}
                    <strong>{activeBatch ? activeBatch.name : 'Batch Aktif'}</strong>!
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-slate-400">
                  Kredensial berikut dapat dibagikan kepada masing-masing anak magang:
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleCopyAll}
                    className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    {copied ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Tersalin ke Clipboard!' : 'Salin Semua Kredensial'}
                  </button>
                  <button
                    onClick={handleDownloadCSV}
                    className="btn-secondary text-xs py-1.5 flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Unduh CSV
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto border border-white/10 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/5 text-slate-300 uppercase font-semibold">
                    <tr>
                      <th className="py-2.5 px-3 w-10">No</th>
                      <th className="py-2.5 px-3">Nama Lengkap</th>
                      <th className="py-2.5 px-3">Bagian</th>
                      <th className="py-2.5 px-3">Username Default</th>
                      <th className="py-2.5 px-3">Password Default</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-slate-300">
                    {resultData.map((u, i) => (
                      <tr key={u.id} className="hover:bg-white/[0.02]">
                        <td className="py-2 px-3 text-slate-500">{i + 1}</td>
                        <td className="py-2 px-3 font-semibold text-white">{u.name}</td>
                        <td className="py-2 px-3">
                          <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[11px]">
                            {u.department}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          <span className="font-mono text-cyan-300 font-semibold">{u.username}</span>
                        </td>
                        <td className="py-2 px-3 font-mono text-amber-400">{u.default_password}</td>
                        <td className="py-2 px-3">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px]">
                            Aktif
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* FORM DAFTAR / INPUT GELONDONGAN */
            <>
              {/* Batch Info Banner */}
              <div className="p-3 bg-purple-500/10 border border-purple-500/25 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-slate-300">
                  <Layers className="w-4 h-4 text-purple-400 shrink-0" />
                  <span>
                    Batch Tujuan: <strong>{activeBatch ? activeBatch.name : 'Batch 15 (Aktif)'}</strong>
                  </span>
                </div>
                <span className="text-[11px] text-slate-400">
                  Role: <strong>Intern</strong> &bull; Status: <strong>Magang Aktif</strong>
                </span>
              </div>

              {/* Method Switcher Tabs */}
              <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('table')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                      activeTab === 'table'
                        ? 'bg-purple-600 text-white'
                        : 'bg-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    Input Baris Tabel
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('paste')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                      activeTab === 'paste'
                        ? 'bg-purple-600 text-white'
                        : 'bg-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    <ClipboardPaste className="w-3.5 h-3.5" />
                    Paste dari Excel / Teks
                  </button>
                </div>

                {activeTab === 'table' && (
                  <button
                    type="button"
                    onClick={handleLoadReference}
                    className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-amber-300 border border-amber-500/30 text-[11px] flex items-center gap-1 transition-colors"
                    title="Muat 14 daftar anak magang dari data referensi spreadsheet"
                  >
                    <Sparkles className="w-3 h-3" />
                    Muat 14 Data Referensi
                  </button>
                )}
              </div>

              {error && (
                <div className="alert alert-error text-xs py-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {activeTab === 'table' ? (
                /* TAB TABEL DINAMIS */
                <div className="space-y-3">
                  <div className="overflow-x-auto border border-white/10 rounded-xl">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-white/5 text-slate-300 uppercase font-semibold">
                        <tr>
                          <th className="py-2.5 px-3 w-10 text-center">#</th>
                          <th className="py-2.5 px-3 w-48">Bagian / Divisi</th>
                          <th className="py-2.5 px-3">Nama Anak Magang</th>
                          <th className="py-2.5 px-3 w-12 text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-slate-300">
                        {rows.map((row, idx) => (
                          <tr key={row.id} className="hover:bg-white/[0.02]">
                            <td className="py-2 px-3 text-slate-500 text-center">{idx + 1}</td>
                            <td className="py-2 px-3">
                              <select
                                value={row.department}
                                onChange={(e) => handleUpdateRow(row.id, 'department', e.target.value)}
                                className="input-field text-xs py-1 !bg-slate-900 !text-slate-100"
                              >
                                {DEPARTMENTS.map((d) => (
                                  <option key={d} value={d} className="bg-slate-900 text-slate-100">
                                    {d}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={row.name}
                                onChange={(e) => handleUpdateRow(row.id, 'name', e.target.value)}
                                placeholder="Misal: Budi Santoso"
                                className="input-field text-xs py-1"
                              />
                            </td>
                            <td className="py-2 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveRow(row.id)}
                                disabled={rows.length <= 1}
                                className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors disabled:opacity-30"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleAddRow}
                      className="btn-secondary text-xs py-1.5 flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Tambah Baris
                    </button>
                    <button
                      type="button"
                      onClick={handleAddFiveRows}
                      className="btn-secondary text-xs py-1.5 flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      +5 Baris
                    </button>
                    <span className="text-xs text-slate-500 self-center ml-auto">
                      Total: <strong>{rows.filter((r) => r.name.trim()).length}</strong> nama siap diproses
                    </span>
                  </div>
                </div>
              ) : (
                /* TAB PASTE DARI EXCEL */
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                      <span>Tempel Data (Copy-Paste dari Spreadsheet atau Catatan)</span>
                      <span className="text-[11px] text-slate-500">Format: [Bagian] [Nama]</span>
                    </label>
                    <textarea
                      rows={8}
                      value={pasteText}
                      onChange={(e) => setPasteText(e.target.value)}
                      placeholder={`Kredit\tEki Ramdani Sopyana\nCS\tBudi Santoso\nTeller UNPAM\tElsya Yunita Simangunsong\nSDM\tFelisitas Erselin`}
                      className="input-field text-xs font-mono py-2"
                    />
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-[11px] text-slate-400">
                      Tips: Pisahkan kolom Bagian dan Nama dengan tombol <strong>TAB</strong> atau koma (,).
                    </span>
                    <button
                      type="button"
                      onClick={handleConvertPaste}
                      className="btn-primary text-xs py-1.5 flex items-center gap-1.5 bg-purple-600 hover:bg-purple-500 border-purple-400"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                      Konversi ke Tabel
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-white/10 flex justify-end gap-2 shrink-0">
          {resultData ? (
            <button
              type="button"
              onClick={onClose}
              className="btn-primary text-xs px-5 bg-purple-600 hover:bg-purple-500 border-purple-400"
            >
              Selesai & Tutup
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="btn-secondary text-xs"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="btn-primary text-xs flex items-center gap-1.5 bg-purple-600 hover:bg-purple-500 border-purple-400"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Memproses Akun...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Generate & Daftarkan Akun</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
