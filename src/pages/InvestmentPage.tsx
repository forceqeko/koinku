import { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, LineChart, Line } from 'recharts';
import { 
  TrendUp, 
  TrendDown, 
  Briefcase, 
  Plus, 
  Gear, 
  ClockCounterClockwise, 
  Stack,
  Eye,
  EyeSlash,
  XCircle,
  Lock
} from '@phosphor-icons/react';
import clsx from 'clsx';
import { useData } from '../context/DataContext';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { fmt } from '../lib/utils';
import InvestmentModal from '../components/InvestmentModal';

const formatDateSafe = (dateStr: string | null | undefined) => {
  if (!dateStr) return '-';
  try {
    return format(new Date(dateStr), 'dd MMM yyyy', { locale: id });
  } catch (e) {
    return dateStr;
  }
};

const COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
];

export default function InvestmentPage() {
  const { portfolios, portfolioWishlists, investmentReturns, wishlists, accounts } = useData();
  const [isInvestmentModalOpen, setIsInvestmentModalOpen] = useState(false);
  const [investmentModalMode, setInvestmentModalMode] = useState<'add' | 'update_value' | 'history' | 'edit' | 'close'>('add');
  const [selectedPortfolio, setSelectedPortfolio] = useState<any>(null);
  const [portfolioTab, setPortfolioTab] = useState<'aktif' | 'ditutup'>('aktif');
  const [showBalance, setShowBalance] = useState(() => {
    const saved = localStorage.getItem('showBalance');
    return saved !== null ? JSON.parse(saved) : true;
  });

  const toggleBalance = () => {
    const newValue = !showBalance;
    setShowBalance(newValue);
    localStorage.setItem('showBalance', JSON.stringify(newValue));
  };

  // ── Portofolio & Return Calculations ──
  const getEffectiveCapital = (p: any) => {
    const linkedLinks = portfolioWishlists.filter(pw => pw.portfolio_id === p.id);
    if (linkedLinks.length > 0) {
      return linkedLinks.reduce((sum, link) => {
        const w = wishlists.find(wl => wl.id === link.wishlist_id);
        return sum + (w ? w.current_amount : 0);
      }, 0);
    }
    return p.initial_capital;
  };

  const activePortfolios = useMemo(() => {
    return portfolios.filter(p => p.is_active);
  }, [portfolios]);

  const closedPortfolios = useMemo(() => {
    return portfolios.filter(p => !p.is_active);
  }, [portfolios]);

  const totalCapital = useMemo(() => {
    return activePortfolios.reduce((sum, p) => sum + getEffectiveCapital(p), 0);
  }, [activePortfolios, portfolioWishlists, wishlists]);

  const totalMarketValue = useMemo(() => {
    return activePortfolios.reduce((sum, p) => sum + p.current_value, 0);
  }, [activePortfolios]);

  const totalReturn = useMemo(() => {
    return totalMarketValue - totalCapital;
  }, [totalMarketValue, totalCapital]);

  const totalReturnPercent = useMemo(() => {
    return totalCapital > 0 ? (totalReturn / totalCapital) * 100 : 0;
  }, [totalReturn, totalCapital]);

  const allocationData = useMemo(() => {
    const map: Record<string, number> = {};
    activePortfolios.forEach(p => {
      const type = p.instrument_type || 'Lainnya';
      map[type] = (map[type] || 0) + p.current_value;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [activePortfolios]);

  const performanceChartData = useMemo(() => {
    if (activePortfolios.length === 0 || investmentReturns.length === 0) return [];
    const activePortReturns = investmentReturns.filter(r => 
      activePortfolios.some(p => p.id === r.portfolio_id)
    );
    const uniqueDates = Array.from(new Set(activePortReturns.map(r => r.date)))
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

    return uniqueDates.map(date => {
      let totalVal = 0;
      let totalCap = 0;

      activePortfolios.forEach(p => {
        const returnsBefore = investmentReturns
          .filter(r => r.portfolio_id === p.id && new Date(r.date).getTime() <= new Date(date).getTime())
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

        const effectiveCap = getEffectiveCapital(p);
        totalCap += effectiveCap;

        if (returnsBefore.length > 0) {
          totalVal += returnsBefore[0].value_at_date;
        } else {
          totalVal += p.initial_capital || p.current_value;
        }
      });

      const retNominal = totalVal - totalCap;
      const retPercent = totalCap > 0 ? (retNominal / totalCap) * 100 : 0;

      let formattedDate = date;
      try {
        formattedDate = format(new Date(date), 'dd MMM', { locale: id });
      } catch (e) {}

      return {
        date,
        formattedDate,
        'Nilai Pasar': totalVal,
        'Modal Investasi': totalCap,
        'Return (%)': Number(retPercent.toFixed(1))
      };
    });
  }, [activePortfolios, investmentReturns, portfolioWishlists, wishlists]);

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 space-y-6">
      {/* Premium Investment Summary Card */}
      <div className="card p-6 bg-accent border-accent text-white shadow-lg relative overflow-hidden">
        {/* Decorative background shapes */}
        <div className="absolute right-0 top-0 w-48 h-48 bg-white/10 rounded-full blur-2xl -mr-12 -mt-12 pointer-events-none"></div>
        <div className="absolute left-1/4 bottom-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -ml-16 -mb-16 pointer-events-none"></div>
        
        <div className="relative z-10 space-y-5">
          {/* Top Row: Label and Toggle Balance */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-8 h-6 rounded bg-white/20 border border-white/30 shrink-0"></div>
              <span className="text-[10px] md:text-[11px] font-bold tracking-wider text-white/80 uppercase">Total Nilai Pasar Investasi</span>
            </div>
            <button
              onClick={toggleBalance}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-all text-white/90"
              aria-label={showBalance ? "Sembunyikan saldo" : "Tampilkan saldo"}
            >
              {showBalance ? <EyeSlash size={16} /> : <Eye size={16} />}
            </button>
          </div>
          
          {/* Middle Row: Main Large Balance and Return Badge */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">
                {showBalance ? fmt(totalMarketValue) : '••••••'}
              </h2>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 bg-white/20 text-white">
                {totalReturn >= 0 ? '▲' : '▼'} {totalReturnPercent.toFixed(2)}%
              </span>
              <span className="text-[12px] font-extrabold text-white">
                ({totalReturn >= 0 ? '+' : ''}{showBalance ? fmt(totalReturn) : '••••'})
              </span>
            </div>
          </div>

          {/* Bottom Divider */}
          <div className="border-t border-white/25 pt-4 grid grid-cols-2 gap-4">
            <div>
              <p className="text-[9px] font-bold text-white/80 uppercase tracking-wider">Total Modal</p>
              <p className="text-[14px] font-extrabold text-white mt-0.5">
                {showBalance ? fmt(totalCapital) : '••••••'}
              </p>
            </div>
            <div>
              <p className="text-[9px] font-bold text-white/80 uppercase tracking-wider">Jumlah Portofolio</p>
              <p className="text-[14px] font-extrabold text-white mt-0.5">
                {activePortfolios.length} Aktif
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      {portfolios.length === 0 ? (
        <div className="card p-12 text-center flex flex-col items-center justify-center space-y-4 max-w-lg mx-auto border border-line">
          <div className="w-16 h-16 rounded-3xl bg-accent/10 flex items-center justify-center animate-bounce">
            <Briefcase size={32} className="text-accent" />
          </div>
          <div className="space-y-1">
            <h3 className="text-[14px] font-bold text-text-primary">Belum Ada Portofolio Investasi</h3>
            <p className="text-[11px] text-text-muted leading-relaxed">
              Lacak perkembangan portofolio investasi Anda seperti Saham, Kripto, Forex, Reksa Dana, atau Emas secara real-time. Hubungkan dengan Wishlist Tabungan Anda untuk sinkronisasi otomatis!
            </p>
          </div>
          <button
            onClick={() => {
              setSelectedPortfolio(null);
              setInvestmentModalMode('add');
              setIsInvestmentModalOpen(true);
            }}
            className="px-6 py-3 bg-accent hover:bg-accent-dark text-white rounded-2xl text-[12px] font-extrabold shadow-lg shadow-accent/20 transition-all flex items-center gap-1.5"
          >
            <Plus size={16} weight="bold" />
            <span>Buat Portofolio Pertama</span>
          </button>
        </div>
      ) : (
        <>
          {/* Portfolio Grid List */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1 pb-2 border-b border-line/60">
              <div className="flex items-center gap-3">
                <Briefcase size={20} weight="duotone" className="text-accent" />
                <h3 className="text-[14px] font-bold text-text-primary uppercase tracking-wider">
                  Aset Investasi Anda
                </h3>
              </div>
              
              <div className="flex items-center gap-3 flex-wrap">
                {/* Tab Selector */}
                <div className="flex bg-surface-alt/40 p-1 rounded-2xl border border-line shadow-sm">
                  <button
                    type="button"
                    onClick={() => setPortfolioTab('aktif')}
                    className={clsx(
                      "px-4 py-2 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1.5",
                      portfolioTab === 'aktif'
                        ? "bg-accent text-white shadow-sm font-extrabold"
                        : "text-text-muted hover:text-text-primary hover:bg-surface-hover/30"
                    )}
                  >
                    <TrendUp size={14} weight={portfolioTab === 'aktif' ? "bold" : "regular"} className={portfolioTab === 'aktif' ? "text-white" : "text-text-muted"} />
                    <span>Aktif ({activePortfolios.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPortfolioTab('ditutup')}
                    className={clsx(
                      "px-4 py-2 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1.5",
                      portfolioTab === 'ditutup'
                        ? "bg-accent text-white shadow-sm font-extrabold"
                        : "text-text-muted hover:text-text-primary hover:bg-surface-hover/30"
                    )}
                  >
                    <Lock size={14} weight={portfolioTab === 'ditutup' ? "fill" : "regular"} className={portfolioTab === 'ditutup' ? "text-white" : "text-text-muted"} />
                    <span>Ditutup ({closedPortfolios.length})</span>
                  </button>
                </div>

                <button
                  onClick={() => {
                    setSelectedPortfolio(null);
                    setInvestmentModalMode('add');
                    setIsInvestmentModalOpen(true);
                  }}
                  className="px-4 py-2 bg-accent hover:bg-accent-dark text-white rounded-xl text-[11px] font-bold shadow-sm shadow-accent/15 transition-all flex items-center gap-1.5"
                >
                  <Plus size={14} weight="bold" />
                  <span>Portofolio Baru</span>
                </button>
              </div>
            </div>
            
            {portfolioTab === 'aktif' ? (
              activePortfolios.length === 0 ? (
                <div className="card p-12 text-center flex flex-col items-center justify-center space-y-3 border border-line">
                  <p className="text-[12px] text-text-muted font-bold">Tidak ada portofolio aktif.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activePortfolios.map(p => {
                    const capital = getEffectiveCapital(p);
                    const currentVal = p.current_value;
                    const retNom = currentVal - capital;
                    const retPct = capital > 0 ? (retNom / capital) * 100 : 0;
                    
                    // Wishlist info
                    const linked = portfolioWishlists.filter(pw => pw.portfolio_id === p.id);
                    
                    return (
                      <div key={p.id} className="card p-5 border border-line bg-surface/50 backdrop-blur-md hover:border-accent/30 transition-all flex flex-col justify-between group">
                        
                        {/* Title & Badge */}
                        <div className="space-y-1">
                          <div className="flex justify-between items-start gap-2">
                            <h4 className="text-[13px] font-extrabold text-text-primary group-hover:text-accent transition-colors truncate" title={p.name}>
                              {p.name}
                            </h4>
                            <span className="text-[9px] px-2 py-0.5 rounded-md bg-accent/15 text-accent font-bold uppercase tracking-wider shrink-0">
                              {p.instrument_type || 'Aset'}
                            </span>
                          </div>
                          {p.notes && (
                            <p className="text-[10px] text-text-muted italic truncate">"{p.notes}"</p>
                          )}
                        </div>

                        {/* Capital vs Current Value */}
                        <div className="grid grid-cols-2 gap-2 my-4 bg-surface-alt/10 border border-line/45 p-3 rounded-2xl text-[11px]">
                          <div>
                            <p className="text-text-muted text-[9px] font-bold uppercase">Modal</p>
                            <p className="font-extrabold text-text-primary truncate">{showBalance ? fmt(capital) : '••••••'}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-text-muted text-[9px] font-bold uppercase">Nilai Kini</p>
                            <p className="font-extrabold text-accent truncate">{showBalance ? fmt(currentVal) : '••••••'}</p>
                          </div>
                        </div>

                        {/* Return percentage bar/badge & wishlist links */}
                        <div className="space-y-3 mb-4">
                          <div className={clsx(
                            "flex items-center justify-between p-3 rounded-xl text-[11px] font-extrabold",
                            retNom >= 0 ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
                          )}>
                            <span className="flex items-center gap-1.5">
                              {retNom >= 0 ? <TrendUp size={14} /> : <TrendDown size={14} />}
                              Return Aset:
                            </span>
                            <span className="text-right flex items-center gap-1 flex-wrap justify-end">
                              <span>{retNom >= 0 ? '+' : ''}{retPct.toFixed(1)}%</span>
                              <span className="opacity-80 font-bold text-[9px]">
                                ({retNom >= 0 ? '+' : ''}{showBalance ? fmt(retNom) : '••••'})
                              </span>
                            </span>
                          </div>

                          {/* Linked wishlist indicator */}
                          {linked.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5 text-[9px] text-text-muted font-bold uppercase bg-surface-alt/30 border border-line/40 px-2.5 py-1.5 rounded-xl">
                              <Stack size={14} className="text-accent shrink-0" />
                              <span className="text-text-secondary truncate">
                                Terhubung ke {linked.length} Tabungan
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Card Action Buttons */}
                        <div className="grid grid-cols-4 gap-1.5 border-t border-line/50 pt-3">
                          <button
                            onClick={() => {
                              setSelectedPortfolio(p);
                              setInvestmentModalMode('update_value');
                              setIsInvestmentModalOpen(true);
                            }}
                            className="py-2 bg-surface border border-line text-text-primary rounded-xl text-[10px] font-bold hover:bg-accent/5 hover:text-accent hover:border-accent/25 transition-all text-center flex items-center justify-center gap-0.5"
                            title="Update Nilai"
                          >
                            <span>📊</span> Update
                          </button>
                          
                          <button
                            onClick={() => {
                              setSelectedPortfolio(p);
                              setInvestmentModalMode('history');
                              setIsInvestmentModalOpen(true);
                            }}
                            className="py-2 bg-surface border border-line text-text-primary rounded-xl text-[10px] font-bold hover:bg-surface-hover transition-all text-center flex items-center justify-center gap-0.5"
                            title="Riwayat Perubahan"
                          >
                            <ClockCounterClockwise size={13} className="text-text-muted" />
                            <span>Riwayat</span>
                          </button>

                          <button
                            onClick={() => {
                              setSelectedPortfolio(p);
                              setInvestmentModalMode('edit');
                              setIsInvestmentModalOpen(true);
                            }}
                            className="py-2 bg-surface border border-line text-text-primary rounded-xl text-[10px] font-bold hover:bg-surface-hover transition-all text-center flex items-center justify-center gap-0.5"
                            title="Edit / Kelola"
                          >
                            <Gear size={13} className="text-text-muted" />
                            <span>Ubah</span>
                          </button>

                          <button
                            onClick={() => {
                              setSelectedPortfolio(p);
                              setInvestmentModalMode('close');
                              setIsInvestmentModalOpen(true);
                            }}
                            className="py-2 bg-surface border border-line text-text-primary rounded-xl text-[10px] font-bold hover:bg-amber-500/10 hover:text-amber-500 hover:border-amber-500/25 transition-all text-center flex items-center justify-center gap-0.5"
                            title="Tutup Portofolio"
                          >
                            <XCircle size={13} className="text-text-muted hover:text-amber-500" />
                            <span>Tutup</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              /* DITUTUP PORTFOLIOS GRID */
              closedPortfolios.length === 0 ? (
                <div className="card p-12 text-center flex flex-col items-center justify-center space-y-3 border border-line">
                  <p className="text-[12px] text-text-muted font-bold">Tidak ada portofolio yang ditutup.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {closedPortfolios.map(p => {
                    const closedVal = p.closed_value ?? 0;
                    const capital = p.initial_capital ?? 0;
                    const retNom = closedVal - capital;
                    const retPct = capital > 0 ? (retNom / capital) * 100 : 0;
                    
                    // Wishlist info & liquidation account info
                    const linked = portfolioWishlists.filter(pw => pw.portfolio_id === p.id);
                    const liqAccount = accounts.find(a => a.id === p.liquidation_account_id);
                    
                    return (
                      <div 
                        key={p.id} 
                        onClick={() => {
                          setSelectedPortfolio(p);
                          setInvestmentModalMode('history');
                          setIsInvestmentModalOpen(true);
                        }}
                        className="card p-5 border border-line/45 bg-surface-alt/10 opacity-85 hover:opacity-100 hover:border-line transition-all flex flex-col justify-between cursor-pointer group"
                      >
                        {/* Title & Badge */}
                        <div className="space-y-1">
                          <div className="flex justify-between items-start gap-2">
                            <h4 className="text-[13px] font-extrabold text-text-secondary group-hover:text-text-primary transition-colors truncate" title={p.name}>
                              {p.name}
                            </h4>
                            <span className="text-[9px] px-2 py-0.5 rounded-md bg-surface-alt border border-line/55 text-text-muted font-bold uppercase tracking-wider shrink-0 flex items-center gap-1">
                              🔒 Ditutup
                            </span>
                          </div>
                          {p.closed_at && (
                            <p className="text-[9px] text-text-muted font-semibold">
                              📅 Ditutup pada: {formatDateSafe(p.closed_at)}
                            </p>
                          )}
                        </div>

                        {/* Capital vs Closed Value */}
                        <div className="grid grid-cols-2 gap-2 my-4 bg-surface-alt/20 border border-line/30 p-3 rounded-2xl text-[11px]">
                          <div>
                            <p className="text-text-muted text-[9px] font-bold uppercase">Modal Awal</p>
                            <p className="font-extrabold text-text-primary truncate">{showBalance ? fmt(capital) : '••••••'}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-text-muted text-[9px] font-bold uppercase">Nilai Akhir</p>
                            <p className="font-extrabold text-text-secondary truncate">{showBalance ? fmt(closedVal) : '••••••'}</p>
                          </div>
                        </div>

                        {/* Return percentage bar/badge */}
                        <div className="space-y-3">
                          <div className={clsx(
                            "flex items-center justify-between p-3 rounded-xl text-[11px] font-extrabold",
                            retNom >= 0 ? "bg-emerald-500/5 text-emerald-500/85" : "bg-rose-500/5 text-rose-500/85"
                          )}>
                            <span className="flex items-center gap-1.5">
                              {retNom >= 0 ? <TrendUp size={14} /> : <TrendDown size={14} />}
                              Return Realisasi:
                            </span>
                            <span className="text-right flex items-center gap-1 flex-wrap justify-end">
                              <span>{retNom >= 0 ? '+' : ''}{retPct.toFixed(1)}%</span>
                              <span className="opacity-80 font-bold text-[9px]">
                                ({retNom >= 0 ? '+' : ''}{showBalance ? fmt(retNom) : '••••'})
                              </span>
                            </span>
                          </div>

                          {/* Linked wishlist / source info & wallet info */}
                          <div className="flex flex-col gap-1.5 text-[9px] text-text-muted font-bold uppercase bg-surface-alt/30 border border-line/40 p-2.5 rounded-xl">
                            <div className="flex items-center gap-1.5">
                              <Stack size={13} className="text-text-muted shrink-0" />
                              <span className="truncate">
                                Sumber: {linked.length > 0 ? `Link Tabungan (${linked.length})` : 'Input Manual'}
                              </span>
                            </div>
                            {liqAccount && (
                              <div className="flex items-center gap-1.5 pt-1.5 border-t border-line/20">
                                <span>🏦</span>
                                <span className="truncate text-text-secondary">
                                  Dana ditarik ke: {liqAccount.name}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            )}
          </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 pt-3">
              {/* Line Chart: Performance Timeline */}
              <div className="card p-5 lg:col-span-2 space-y-4">
                <div>
                  <h3 className="text-[13px] font-bold text-text-primary">Tren Performa Portofolio</h3>
                  <p className="text-[10px] text-text-muted mt-0.5">Analisis histori nilai investasi akumulatif Anda dari waktu ke waktu.</p>
                </div>

                <div className="h-64">
                  {performanceChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={performanceChartData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                        <XAxis dataKey="formattedDate" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} tickLine={false} axisLine={false} />
                        <YAxis 
                          tickFormatter={v => v >= 1000000 ? `${(v / 1000000).toFixed(1)}jt` : v >= 1000 ? `${(v / 1000).toFixed(0)}rb` : String(v)}
                          tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} 
                          tickLine={false} 
                          axisLine={false} 
                        />
                        <Tooltip formatter={(v: number) => fmt(v)} />
                        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
                        <Line
                          type="monotone"
                          dataKey="Nilai Pasar"
                          stroke="var(--chart-1)"
                          strokeWidth={2}
                          dot={{ r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="Modal Investasi"
                          stroke="var(--chart-3)"
                          strokeDasharray="4 4"
                          strokeWidth={1.5}
                          dot={{ r: 2 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-text-muted text-[11px]">Membutuhkan minimal satu riwayat update untuk menampilkan tren performa.</div>
                  )}
                </div>
              </div>

              {/* Pie Chart: Allocation Breakdown */}
              <div className="card p-5 space-y-4">
                <div>
                  <h3 className="text-[13px] font-bold text-text-primary">Alokasi Aset</h3>
                  <p className="text-[10px] text-text-muted mt-0.5">Distribusi proporsi portfolio berdasarkan tipe instrumen.</p>
                </div>

                <div className="h-48 relative">
                  {allocationData.length > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={allocationData} cx="50%" cy="50%" innerRadius={42} outerRadius={64} paddingAngle={3} dataKey="value" stroke="none">
                            {allocationData.map((_e, i) => (
                              <Cell key={i} fill={COLORS[i % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(v: number, name: string) => [`${fmt(v)} (${((v / totalMarketValue) * 100).toFixed(1)}%)`, name]}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ marginBottom: 12 }}>
                        <div className="text-center">
                          <p className="text-[8px] text-text-muted">Total Aset</p>
                          <p className="text-[11px] font-bold text-text-primary truncate max-w-[85px]">{showBalance ? fmt(totalMarketValue) : '••••••'}</p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="h-full flex items-center justify-center text-text-muted text-[11px]">Belum ada instrumen portfolio.</div>
                  )}
                </div>

                {/* Allocation Legends */}
                {allocationData.length > 0 && (
                  <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 pt-3 border-t border-line/50">
                    {allocationData.map((item, i) => {
                      const percent = totalMarketValue > 0 ? (item.value / totalMarketValue) * 100 : 0;
                      return (
                        <div key={item.name} className="flex items-center gap-1.5 text-[10px] font-semibold text-text-secondary min-w-[70px] max-w-[120px]">
                          <div
                            className="w-2.5 h-2.5 rounded-[3px] shrink-0"
                            style={{ backgroundColor: COLORS[i % COLORS.length] }}
                          />
                          <span className="truncate" title={item.name}>
                            {item.name}{' '}
                            <span className="text-[8px] text-text-muted font-normal">
                              ({percent.toFixed(0)}%)
                            </span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

      {/* Investment Modal */}
      <InvestmentModal
        isOpen={isInvestmentModalOpen}
        onClose={() => setIsInvestmentModalOpen(false)}
        mode={investmentModalMode}
        portfolio={selectedPortfolio}
      />
    </div>
  );
}
