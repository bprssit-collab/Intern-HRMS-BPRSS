'use client';

import { useRef } from 'react';
import type { PayoutSummary } from '@/types';
import { formatIDR } from '@/lib/payout-calc';
import { FileText, Printer, Download, Sparkles } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { formatDateID } from '@/lib/utils';

interface PayoutTableProps {
  data: PayoutSummary[];
  period: { startDate: string; endDate: string };
  settings: {
    full_day_rate: number;
    half_day_rate: number;
    perbantuan_full_day_rate?: number;
    perbantuan_half_day_rate?: number;
  };
}

export function PayoutTable({ data, period, settings }: PayoutTableProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const totalAmount = data.reduce((sum, item) => sum + item.total_amount, 0);

  const handleExportPDF = async () => {
    if (!printRef.current) return;
    
    try {
      const canvas = await html2canvas(printRef.current, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Payout_Intern_${period.startDate}_to_${period.endDate}.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Gagal menghasilkan PDF.');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (data.length === 0) {
    return (
      <div className="glass-card p-12 text-center">
        <FileText className="w-12 h-12 mx-auto text-slate-500 mb-4" />
        <h3 className="text-lg font-medium text-slate-300">Tidak ada data absen</h3>
        <p className="text-slate-500">Tidak ada data absensi untuk rentang tanggal ini.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Controls - Hidden in print */}
      <div className="flex justify-end gap-3 no-print">
        <button onClick={handlePrint} className="btn-secondary">
          <Printer className="w-4 h-4" /> Cetak
        </button>
        <button onClick={handleExportPDF} className="btn-primary">
          <Download className="w-4 h-4" /> Ekspor PDF
        </button>
      </div>

      {/* Printable Area */}
      <div ref={printRef} className="bg-white text-black p-8 rounded-lg shadow-xl print-only-wrapper">
        
        {/* Header for document */}
        <div className="text-center mb-8 border-b-2 border-gray-800 pb-6">
          <h1 className="text-2xl font-bold uppercase tracking-wider">PT BPR Sehat Sejahtera</h1>
          <h2 className="text-lg mt-1 font-semibold text-gray-700">Laporan Uang Saku Intern & Perbantuan</h2>
          <p className="text-sm mt-2 text-gray-500">
            Periode: {formatDateID(period.startDate)} - {formatDateID(period.endDate)}
          </p>
        </div>

        {/* Rates Guide Note */}
        <div className="mb-4 text-xs text-gray-600 bg-gray-50 p-3 rounded border border-gray-200 flex flex-wrap justify-between gap-2">
          <span>Tarif Normal: Full Day <strong>{formatIDR(settings.full_day_rate)}</strong> &bull; Half Day <strong>{formatIDR(settings.half_day_rate)}</strong></span>
          <span>Tarif Perbantuan: Full Day <strong>{formatIDR(settings.perbantuan_full_day_rate || 75000)}</strong> &bull; Half Day <strong>{formatIDR(settings.perbantuan_half_day_rate || 37500)}</strong></span>
        </div>

        {/* Data Table */}
        <table className="w-full text-left border-collapse mb-8 text-sm">
          <thead>
            <tr className="bg-gray-100 border-y border-gray-300">
              <th className="p-3 font-semibold text-gray-700">Nama Intern & Bagian</th>
              <th className="p-3 font-semibold text-gray-700 text-center">Kehadiran Reguler</th>
              <th className="p-3 font-semibold text-gray-700 text-center">Kehadiran Perbantuan</th>
              <th className="p-3 font-semibold text-gray-700 text-right">Total Uang Saku</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={row.user_id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="p-3 border-b border-gray-200">
                  <div className="font-semibold text-gray-900">{row.intern_name}</div>
                  <div className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                    <span>{row.department || 'Umum'}</span>
                    {row.is_perbantuan && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-300">
                        Perbantuan
                      </span>
                    )}
                  </div>
                </td>
                <td className="p-3 border-b border-gray-200 text-center">
                  <div className="text-xs text-gray-700">
                    Full: <strong>{row.full_day_count}</strong> &bull; Half: <strong>{row.half_day_count}</strong>
                  </div>
                  {(row.normal_amount !== undefined) && (
                    <div className="text-[11px] text-gray-500 font-mono mt-0.5">
                      Subtotal: {formatIDR(row.normal_amount)}
                    </div>
                  )}
                </td>
                <td className="p-3 border-b border-gray-200 text-center">
                  {(row.perbantuan_full_count || row.perbantuan_half_count) ? (
                    <div>
                      <div className="text-xs text-amber-700 font-semibold">
                        Full: <strong>{row.perbantuan_full_count || 0}</strong> &bull; Half: <strong>{row.perbantuan_half_count || 0}</strong>
                      </div>
                      <div className="text-[11px] text-amber-600 font-mono mt-0.5">
                        Subtotal: {formatIDR(row.perbantuan_amount || 0)}
                      </div>
                    </div>
                  ) : (
                    <span className="text-gray-400 text-xs">-</span>
                  )}
                </td>
                <td className="p-3 border-b border-gray-200 text-right font-bold text-gray-900 text-sm">
                  {formatIDR(row.total_amount)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-100 border-y-2 border-gray-400">
              <td colSpan={3} className="p-3 text-right font-bold text-gray-800">Total Keseluruhan Uang Saku:</td>
              <td className="p-3 text-right font-bold text-gray-900 text-base">{formatIDR(totalAmount)}</td>
            </tr>
          </tfoot>
        </table>

        {/* Signatures */}
        <div className="flex justify-between mt-16 px-8">
          <div className="text-center">
            <p className="mb-16">Disetujui Oleh,</p>
            <div className="border-b border-black w-48 mx-auto"></div>
            <p className="mt-2 font-semibold">HR Manager</p>
          </div>
          <div className="text-center">
            <p className="mb-16">Diketahui Oleh,</p>
            <div className="border-b border-black w-48 mx-auto"></div>
            <p className="mt-2 font-semibold">Finance Dept.</p>
          </div>
        </div>

      </div>

      {/* Global styles fix for print forcing bg-white and dark text */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * {
            visibility: hidden;
          }
          .print-only-wrapper, .print-only-wrapper * {
            visibility: visible;
          }
          .print-only-wrapper {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 0;
            box-shadow: none;
          }
          @page { margin: 1cm; }
        }
      `}} />
    </div>
  );
}
