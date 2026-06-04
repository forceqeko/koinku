import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Sliders, Palette } from 'lucide-react';
import ThemeDropdown from './ThemeDropdown';
import { toast } from './Toast';
import { fmt } from '../lib/utils';

interface AppSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AppSettingsModal({ isOpen, onClose }: AppSettingsModalProps) {
  // Heatmap Calendar limits
  const [heatLow, setHeatLow] = useState(50000);
  const [heatMedium, setHeatMedium] = useState(150000);
  const [heatHigh, setHeatHigh] = useState(300000);

  // Sync state when modal opens
  useEffect(() => {
    if (isOpen) {
      const low = localStorage.getItem('heat_low');
      const med = localStorage.getItem('heat_medium');
      const high = localStorage.getItem('heat_high');

      setHeatLow(low !== null ? Number(low) : 50000);
      setHeatMedium(med !== null ? Number(med) : 150000);
      setHeatHigh(high !== null ? Number(high) : 300000);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (heatLow >= heatMedium) {
      toast.error('Batas Rendah harus lebih kecil dari Batas Sedang!');
      return;
    }
    if (heatMedium >= heatHigh) {
      toast.error('Batas Sedang harus lebih kecil dari Batas Tinggi!');
      return;
    }
    localStorage.setItem('heat_low', String(heatLow));
    localStorage.setItem('heat_medium', String(heatMedium));
    localStorage.setItem('heat_high', String(heatHigh));
    toast.success('Pengaturan aplikasi berhasil disimpan!');
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
      <div 
        className="bg-surface border border-line rounded-2xl w-full max-w-xl shadow-2xl animate-scale-in overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-line bg-surface-alt/20">
          <h3 className="text-[15px] font-bold text-text-primary flex items-center gap-2">
            <Sliders className="w-4 h-4 text-accent" />
            Pengaturan Aplikasi
          </h3>
          <button 
            onClick={onClose} 
            className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-hover rounded-lg transition-all"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
          {/* Section 1: Tema Tampilan */}
          <div className="space-y-3">
            <h4 className="text-[13px] font-bold text-text-primary flex items-center gap-1.5 border-b border-line pb-2">
              <Palette className="w-4 h-4 text-accent" />
              Tema & Tampilan
            </h4>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface-alt/10 p-4 rounded-2xl border border-line/60">
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-bold text-text-primary">Skema Warna Aplikasi</p>
                <p className="text-[11px] text-text-muted mt-0.5 leading-relaxed">Pilih skema warna yang paling sesuai dengan preferensi visual Anda.</p>
              </div>
              <ThemeDropdown className="shrink-0" menuAlign="right" />
            </div>
          </div>

          {/* Section 2: Skala Kalender Laporan */}
          <div className="space-y-4">
            <h4 className="text-[13px] font-bold text-text-primary flex items-center gap-1.5 border-b border-line pb-2">
              📊 Batas Pengeluaran Kalender Laporan
            </h4>
            <p className="text-[11px] text-text-muted leading-relaxed">
              Atur batas nominal pengeluaran harian Anda sendiri untuk mewarnai tanggal pada kalender laporan. Membantu Anda mendeteksi hari hemat vs hari boros dengan satu pandangan.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Batas Rendah (Tier 1)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-text-muted">Rp</span>
                  <input
                    type="number"
                    value={heatLow}
                    onChange={(e) => setHeatLow(Number(e.target.value))}
                    className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-line bg-surface text-[12px] font-semibold focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
                    required
                    min={0}
                  />
                </div>
                <span className="text-[9px] text-text-muted italic">Maksimum hemat (hijau muda)</span>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Batas Sedang (Tier 2)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-text-muted">Rp</span>
                  <input
                    type="number"
                    value={heatMedium}
                    onChange={(e) => setHeatMedium(Number(e.target.value))}
                    className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-line bg-surface text-[12px] font-semibold focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
                    required
                    min={0}
                  />
                </div>
                <span className="text-[9px] text-text-muted italic">Maksimum wajar (hijau tua)</span>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Batas Tinggi (Tier 3)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-text-muted">Rp</span>
                  <input
                    type="number"
                    value={heatHigh}
                    onChange={(e) => setHeatHigh(Number(e.target.value))}
                    className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-line bg-surface text-[12px] font-semibold focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
                    required
                    min={0}
                  />
                </div>
                <span className="text-[9px] text-text-muted italic">Mulai kategori boros (kuning)</span>
              </div>
            </div>

            {/* Preview Skala */}
            <div className="bg-surface-alt/30 border border-line/50 p-4 rounded-2xl">
              <p className="text-[10px] font-bold text-text-primary mb-2.5 uppercase tracking-wider">Preview Indikator Kalender</p>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5 text-[10px] font-semibold text-text-secondary">
                  <div className="w-3.5 h-3.5 rounded-[4px] border border-line" style={{ background: 'var(--heat-0-bg)' }} />
                  <span>Rp 0</span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-semibold text-text-secondary">
                  <div className="w-3.5 h-3.5 rounded-[4px]" style={{ background: 'var(--heat-1-bg)' }} />
                  <span>&le; {fmt(heatLow)}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-semibold text-text-secondary">
                  <div className="w-3.5 h-3.5 rounded-[4px]" style={{ background: 'var(--heat-2-bg)' }} />
                  <span>&le; {fmt(heatMedium)}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-semibold text-text-secondary">
                  <div className="w-3.5 h-3.5 rounded-[4px]" style={{ background: 'var(--heat-3-bg)' }} />
                  <span>&le; {fmt(heatHigh)}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-semibold text-text-secondary">
                  <div className="w-3.5 h-3.5 rounded-[4px]" style={{ background: 'var(--heat-4-bg)' }} />
                  <span>&gt; {fmt(heatHigh)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Action Buttons */}
          <div className="flex justify-end gap-2 border-t border-line/60 pt-4 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-surface border border-line text-text-primary rounded-xl text-[12px] font-bold hover:bg-surface-hover transition-all active:scale-[0.98]"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-accent hover:bg-accent-dark text-white rounded-xl text-[12px] font-bold shadow-md shadow-accent/15 transition-all active:scale-[0.98]"
            >
              Simpan Perubahan
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
