import { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import DebtModal from '../components/DebtModal';
import {
  Plus,
  Calendar,
  Clock,
  History,
  Edit3,
  CheckCircle2,
  Wallet,
  AlertCircle,
  User,
  ArrowUpRight,
  ArrowDownLeft,
  XCircle
} from 'lucide-react';
import clsx from 'clsx';
import type { Debt } from '../types';

export default function HutangPage() {
  const { debts, debtPayments, accounts, loading } = useData();

  // Navigation states
  const [activeTab, setActiveTab] = useState<'hutang' | 'piutang'>('hutang');
  const [statusTab, setStatusTab] = useState<'aktif' | 'lunas'>('aktif');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'pay' | 'history' | 'settle'>('add');
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);

  // Open modal helper
  const openModal = (mode: 'add' | 'edit' | 'pay' | 'history' | 'settle', debt: Debt | null = null) => {
    setModalMode(mode);
    setSelectedDebt(debt);
    setIsModalOpen(true);
  };

  // Date helper to calculate month differences accurately
  const getMonthsElapsed = (startDateStr: string, isSettled: boolean, settledAtStr?: string | null) => {
    const start = new Date(startDateStr);
    const end = isSettled && settledAtStr ? new Date(settledAtStr) : new Date();

    let months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());

    // Anniversary day check: if the end day is less than start day, the current cycle month hasn't finished
    if (end.getDate() < start.getDate()) {
      months--;
    }

    return Math.max(0, months);
  };

  // Process debt list with calculated dynamic values (accrued interest, sisa, progress)
  const processedDebts = useMemo(() => {
    return (debts || []).map(d => {
      const payments = (debtPayments || []).filter(p => p.debt_id === d.id);
      const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

      const principal = Number(d.principal_amount) || 0;
      const interestRate = Number(d.interest_rate) || 0;
      const tenorMonths = d.tenor_months ? Number(d.tenor_months) : null;

      const monthsElapsed = getMonthsElapsed(d.start_date, d.is_settled, d.settled_at);
      const interestMultiplier = (tenorMonths && tenorMonths > 0) ? tenorMonths : monthsElapsed;
      const monthlyInterest = (interestRate / 100) * principal;
      const totalInterest = interestMultiplier * monthlyInterest;
      const totalOwed = principal + totalInterest;
      const remainingOwed = Math.max(0, totalOwed - totalPaid);

      // Progress calculation
      const progress = totalOwed > 0 ? Math.min(100, (totalPaid / totalOwed) * 100) : 0;

      // Status due check
      let isOverdue = false;
      let daysUntilDue: number | null = null;

      if (d.due_date && !d.is_settled) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const due = new Date(d.due_date);
        due.setHours(0, 0, 0, 0);

        const diffTime = due.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
          isOverdue = true;
        } else {
          daysUntilDue = diffDays;
        }
      }

      console.log('Debt Debug:', { 
        name: d.name, 
        tenor: d.tenor_months, 
        tenorType: typeof d.tenor_months, 
        interestMultiplier, 
        monthsElapsed, 
        totalInterest, 
        totalOwed 
      });

      return {
        ...d,
        payments,
        totalPaid,
        monthsElapsed,
        monthlyInterest,
        totalInterest,
        totalOwed,
        remainingOwed,
        progress,
        isOverdue,
        daysUntilDue
      };
    });
  }, [debts, debtPayments]);

  // Summary statistics
  const stats = useMemo(() => {
    let totalHutangAktif = 0;
    let totalHutangBunga = 0;
    let totalHutangPokok = 0;
    let totalHutangTerbayar = 0;
    let countHutangAktif = 0;

    let totalPiutangAktif = 0;
    let totalPiutangBunga = 0;
    let totalPiutangPokok = 0;
    let totalPiutangTerbayar = 0;
    let countPiutangAktif = 0;

    processedDebts.forEach(d => {
      if (!d.is_settled) {
        if (d.type === 'hutang') {
          totalHutangAktif += d.remainingOwed;
          totalHutangBunga += d.totalInterest;
          totalHutangPokok += d.principal_amount;
          totalHutangTerbayar += d.totalPaid;
          countHutangAktif++;
        } else {
          totalPiutangAktif += d.remainingOwed;
          totalPiutangBunga += d.totalInterest;
          totalPiutangPokok += d.principal_amount;
          totalPiutangTerbayar += d.totalPaid;
          countPiutangAktif++;
        }
      }
    });

    return {
      totalHutangAktif,
      totalHutangBunga,
      totalHutangPokok,
      totalHutangTerbayar,
      countHutangAktif,
      totalPiutangAktif,
      totalPiutangBunga,
      totalPiutangPokok,
      totalPiutangTerbayar,
      countPiutangAktif
    };
  }, [processedDebts]);

  // Filtered lists for the current tabs
  const filteredDebts = useMemo(() => {
    return processedDebts.filter(d => {
      const typeMatch = d.type === activeTab;
      const statusMatch = statusTab === 'aktif' ? !d.is_settled : d.is_settled;
      return typeMatch && statusMatch;
    });
  }, [processedDebts, activeTab, statusTab]);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto animate-fade-in">

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Summary Card Hutang */}
        <div className="card p-6 bg-danger border-danger text-white shadow-lg relative overflow-hidden flex flex-col justify-between">
          <div className="absolute right-0 top-0 w-48 h-48 bg-white/10 rounded-full blur-2xl -mr-12 -mt-12 pointer-events-none"></div>
          <div className="absolute left-1/4 bottom-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -ml-16 -mb-16 pointer-events-none"></div>
          
          <div className="relative z-10 space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-8 h-6 rounded bg-white/20 border border-white/30 shrink-0"></div>
                <span className="text-[10px] md:text-[11px] font-bold tracking-wider text-white/80 uppercase">Total Sisa Hutang</span>
              </div>
              <span className="px-2.5 py-1 text-[9px] rounded-full bg-white/20 text-white font-bold uppercase tracking-wider">
                {stats.countHutangAktif} Rekor Aktif
              </span>
            </div>

            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-3xl font-extrabold tracking-tight text-white">
                  Rp {stats.totalHutangAktif.toLocaleString('id-ID')}
                </h2>
                <p className="text-[10px] text-white/85 mt-1">
                  Total Tagihan (Pokok + Bunga): <span className="font-extrabold text-white">Rp {(stats.totalHutangPokok + stats.totalHutangBunga).toLocaleString('id-ID')}</span>
                </p>
              </div>
              <div className="p-2 rounded-xl bg-white/15 border border-white/25 text-white hidden sm:block shrink-0">
                <ArrowDownLeft className="w-5 h-5" />
              </div>
            </div>

            {/* Detailed Breakdown */}
            <div className="border-t border-white/25 pt-4 grid grid-cols-3 gap-2 text-center text-[11px]">
              <div>
                <p className="text-[9px] font-bold text-white/80 uppercase">Pokok Pinjaman</p>
                <p className="font-extrabold text-white mt-0.5">
                  Rp {stats.totalHutangPokok.toLocaleString('id-ID')}
                </p>
              </div>
              <div>
                <p className="text-[9px] font-bold text-orange-200 uppercase">Bunga Berjalan</p>
                <p className="font-extrabold text-orange-200 mt-0.5">
                  + Rp {stats.totalHutangBunga.toLocaleString('id-ID')}
                </p>
              </div>
              <div>
                <p className="text-[9px] font-bold text-green-200 uppercase">Sudah Dicicil</p>
                <p className="font-extrabold text-green-200 mt-0.5">
                  - Rp {stats.totalHutangTerbayar.toLocaleString('id-ID')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Card Piutang */}
        <div className="card p-6 bg-success border-success text-white shadow-lg relative overflow-hidden flex flex-col justify-between">
          <div className="absolute right-0 top-0 w-48 h-48 bg-white/10 rounded-full blur-2xl -mr-12 -mt-12 pointer-events-none"></div>
          <div className="absolute left-1/4 bottom-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -ml-16 -mb-16 pointer-events-none"></div>
          
          <div className="relative z-10 space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-8 h-6 rounded bg-white/20 border border-white/30 shrink-0"></div>
                <span className="text-[10px] md:text-[11px] font-bold tracking-wider text-white/80 uppercase">Total Sisa Piutang</span>
              </div>
              <span className="px-2.5 py-1 text-[9px] rounded-full bg-white/20 text-white font-bold uppercase tracking-wider">
                {stats.countPiutangAktif} Rekor Aktif
              </span>
            </div>

            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-3xl font-extrabold tracking-tight text-white">
                  Rp {stats.totalPiutangAktif.toLocaleString('id-ID')}
                </h2>
                <p className="text-[10px] text-white/85 mt-1">
                  Total Piutang (Pokok + Bunga): <span className="font-extrabold text-white">Rp {(stats.totalPiutangPokok + stats.totalPiutangBunga).toLocaleString('id-ID')}</span>
                </p>
              </div>
              <div className="p-2 rounded-xl bg-white/15 border border-white/25 text-white hidden sm:block shrink-0">
                <ArrowUpRight className="w-5 h-5" />
              </div>
            </div>

            {/* Detailed Breakdown */}
            <div className="border-t border-white/25 pt-4 grid grid-cols-3 gap-2 text-center text-[11px]">
              <div>
                <p className="text-[9px] font-bold text-white/80 uppercase">Pokok Pinjaman</p>
                <p className="font-extrabold text-white mt-0.5">
                  Rp {stats.totalPiutangPokok.toLocaleString('id-ID')}
                </p>
              </div>
              <div>
                <p className="text-[9px] font-bold text-yellow-100 uppercase">Bunga Berjalan</p>
                <p className="font-extrabold text-yellow-100 mt-0.5">
                  + Rp {stats.totalPiutangBunga.toLocaleString('id-ID')}
                </p>
              </div>
              <div>
                <p className="text-[9px] font-bold text-blue-100 uppercase">Sudah Diterima</p>
                <p className="font-extrabold text-blue-100 mt-0.5">
                  - Rp {stats.totalPiutangTerbayar.toLocaleString('id-ID')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs and Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-line pb-4">
        {/* Main Tab */}
        <div className="flex bg-surface-alt p-1 rounded-xl border border-line max-w-xs w-full">
          <button
            onClick={() => setActiveTab('hutang')}
            className={clsx(
              "flex-1 py-2 text-[12px] font-bold rounded-lg transition-all flex items-center justify-center gap-1.5",
              activeTab === 'hutang'
                ? "bg-surface text-text-primary shadow-sm"
                : "text-text-muted hover:text-text-primary"
            )}
          >
            Hutang Saya
            <span className={clsx(
              "px-1.5 py-0.5 text-[9px] rounded-full font-bold",
              activeTab === 'hutang' ? "bg-red-500/15 text-red-500" : "bg-line text-text-muted"
            )}>
              {processedDebts.filter(d => d.type === 'hutang' && !d.is_settled).length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('piutang')}
            className={clsx(
              "flex-1 py-2 text-[12px] font-bold rounded-lg transition-all flex items-center justify-center gap-1.5",
              activeTab === 'piutang'
                ? "bg-surface text-text-primary shadow-sm"
                : "text-text-muted hover:text-text-primary"
            )}
          >
            Piutang Saya
            <span className={clsx(
              "px-1.5 py-0.5 text-[9px] rounded-full font-bold",
              activeTab === 'piutang' ? "bg-emerald-500/15 text-emerald-500" : "bg-line text-text-muted"
            )}>
              {processedDebts.filter(d => d.type === 'piutang' && !d.is_settled).length}
            </span>
          </button>
        </div>

        {/* Right side controls: Status Tab & Add Button */}
        <div className="flex items-center gap-3 flex-wrap justify-between sm:justify-end">
          {/* Sub Status Tab Selector */}
          <div className="flex bg-surface-alt/45 p-1 rounded-2xl border border-line shadow-sm">
            <button
              type="button"
              onClick={() => setStatusTab('aktif')}
              className={clsx(
                "px-4 py-2 rounded-xl text-[11px] font-bold transition-all",
                statusTab === 'aktif'
                  ? "bg-accent text-white shadow-sm font-extrabold"
                  : "text-text-muted hover:text-text-primary hover:bg-surface-hover/30"
              )}
            >
              Aktif
            </button>
            <button
              type="button"
              onClick={() => setStatusTab('lunas')}
              className={clsx(
                "px-4 py-2 rounded-xl text-[11px] font-bold transition-all",
                statusTab === 'lunas'
                  ? "bg-accent text-white shadow-sm font-extrabold"
                  : "text-text-muted hover:text-text-primary hover:bg-surface-hover/30"
              )}
            >
              Lunas
            </button>
          </div>

          {/* Add Button */}
          <button
            type="button"
            onClick={() => openModal('add')}
            className="btn btn-primary h-9 px-4 text-[11px] font-bold shadow-sm flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Baru</span>
          </button>
        </div>
      </div>

      {/* Debt Cards Grid */}
      {loading ? (
        <div className="py-20 text-center text-text-muted text-sm font-semibold">
          Memuat data...
        </div>
      ) : filteredDebts.length === 0 ? (
        <div className="card py-20 text-center max-w-md mx-auto p-8 border-line">
          <XCircle className="w-12 h-12 text-text-muted mx-auto mb-3" />
          <h4 className="text-[14px] font-bold text-text-primary">Tidak Ada Data</h4>
          <p className="text-[11px] text-text-muted mt-1 leading-relaxed">
            {activeTab === 'hutang'
              ? `Tidak ada data hutang ${statusTab} yang ditemukan.`
              : `Tidak ada data piutang ${statusTab} yang ditemukan.`
            }
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDebts.map(d => {
            const wallet = accounts.find(a => a.id === d.account_id);
            return (
              <div
                key={d.id}
                className="card p-5 border border-line bg-surface/50 backdrop-blur-md hover:border-accent/30 transition-all flex flex-col justify-between relative overflow-hidden group"
              >
                {/* Due Date Indicator Badge */}
                {d.isOverdue && (
                  <div className="absolute top-0 right-0 bg-red-500 text-white text-[9px] font-extrabold px-3 py-1 rounded-bl-xl uppercase tracking-wider flex items-center gap-1 shadow-sm">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Terlambat
                  </div>
                )}
                {d.daysUntilDue !== null && d.daysUntilDue <= 7 && (
                  <div className="absolute top-0 right-0 bg-yellow-500 text-white text-[9px] font-extrabold px-3 py-1 rounded-bl-xl uppercase tracking-wider flex items-center gap-1 shadow-sm">
                    <Clock className="w-3.5 h-3.5" />
                    H-{d.daysUntilDue} Hari
                  </div>
                )}
                {d.is_settled && (
                  <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[9px] font-extrabold px-3 py-1 rounded-bl-xl uppercase tracking-wider flex items-center gap-1 shadow-sm">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Lunas
                  </div>
                )}

                {/* Card Header Info */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-text-muted flex items-center gap-1 uppercase tracking-wider">
                      <User className="w-3 h-3 text-accent" />
                      {d.counterparty}
                    </span>
                  </div>
                  <h4 className="text-[14px] font-extrabold text-text-primary group-hover:text-accent transition-colors">
                    {d.name}
                  </h4>
                  {d.notes && (
                    <p className="text-[11px] text-text-secondary italic line-clamp-1">"{d.notes}"</p>
                  )}
                </div>

                {/* Financial Summary */}
                <div className="my-4 p-4 bg-surface-alt/45 border border-line rounded-xl space-y-3 text-[11px]">
                  {/* Pokok Pinjaman */}
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Pokok Awal:</span>
                    <span className="font-bold text-text-primary">
                      Rp {d.principal_amount.toLocaleString('id-ID')}
                    </span>
                  </div>

                  {/* Bunga per bulan & Tenor */}
                  <div className="flex justify-between items-center">
                    <span className="text-text-secondary">Bunga & Tenor:</span>
                    <span className="font-semibold text-text-secondary flex items-center gap-1">
                      {d.interest_rate > 0 ? `${d.interest_rate}%/bln (Flat)` : 'Tanpa Bunga'}
                      {d.tenor_months && <span className="text-[10px] text-text-muted">• {d.tenor_months} Bln</span>}
                    </span>
                  </div>

                  {/* Bunga Berjalan / Total Bunga */}
                  {d.interest_rate > 0 && (
                    <div className="flex justify-between text-yellow-600 dark:text-yellow-400">
                      <span>
                        {d.tenor_months && d.tenor_months > 0 
                          ? `Total Bunga (${d.tenor_months} bln):` 
                          : `Bunga Berjalan (${d.monthsElapsed} bln):`
                        }
                      </span>
                      <span className="font-bold">
                        + Rp {d.totalInterest.toLocaleString('id-ID')}
                      </span>
                    </div>
                  )}

                  {/* Divider */}
                  <div className="border-t border-line/60 my-1" />

                  {/* Total Tagihan (Pokok + Bunga) */}
                  <div className="flex justify-between text-text-primary font-bold">
                    <span>Total Tagihan:</span>
                    <span>
                      Rp {d.totalOwed.toLocaleString('id-ID')}
                    </span>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-line/40 my-1" />

                  {/* Terbayar */}
                  <div className="flex justify-between text-emerald-500">
                    <span>{activeTab === 'hutang' ? 'Sudah Dibayar:' : 'Sudah Diterima:'}</span>
                    <span className="font-bold">
                      Rp {d.totalPaid.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>

                {/* Sisa Saldo Owed (Prominent) */}
                <div className="mb-4">
                  <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider block">
                    {activeTab === 'hutang' ? 'Sisa Hutang' : 'Sisa Piutang'}
                  </span>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <h3 className={clsx(
                      "text-lg font-extrabold",
                      activeTab === 'hutang' ? "text-red-500" : "text-emerald-500"
                    )}>
                      Rp {d.remainingOwed.toLocaleString('id-ID')}
                    </h3>
                    {d.interest_rate > 0 && <span className="text-[10px] text-text-muted">terkalkulasi</span>}
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5 mb-5">
                  <div className="flex justify-between text-[10px] font-semibold">
                    <span className="text-text-secondary">Progress Pelunasan</span>
                    <span className={clsx(
                      activeTab === 'hutang' ? "text-red-500" : "text-emerald-500"
                    )}>
                      {d.progress.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-surface-alt border border-line rounded-full overflow-hidden">
                    <div
                      style={{ width: `${d.progress}%` }}
                      className={clsx(
                        "h-full rounded-full transition-all duration-500",
                        activeTab === 'hutang' ? "bg-red-500" : "bg-emerald-500"
                      )}
                    />
                  </div>
                </div>

                {/* Card Footer Dates & Wallet Info */}
                <div className="border-t border-line pt-3 flex flex-col gap-2">
                  <div className="flex flex-wrap items-center justify-between text-[10px] text-text-muted gap-2">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        Mulai: {new Date(d.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    {d.due_date && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        <span className={clsx(d.isOverdue && "text-red-500 font-bold")}>
                          Tempo: {new Date(d.due_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    )}
                  </div>

                  {wallet && (
                    <div className="flex items-center gap-1.5 text-[10px] text-text-secondary bg-surface-alt/45 border border-line rounded-lg px-2.5 py-1.5 self-start">
                      <Wallet className="w-3.5 h-3.5 text-text-muted" />
                      <span>Wallet Awal: <strong>{wallet.name}</strong></span>
                    </div>
                  )}
                </div>

                {/* Hover Action Buttons */}
                <div className="flex items-center gap-2 mt-5 border-t border-line/65 pt-3">
                  {!d.is_settled && (
                    <>
                      <button
                        onClick={() => openModal('pay', d)}
                        className={clsx(
                          "btn text-white transition-all flex items-center justify-center gap-1 cursor-pointer h-9 shrink-0 flex-1 text-[11px] font-bold",
                          activeTab === 'hutang'
                            ? "bg-red-500 hover:bg-red-600 border border-red-500/20 shadow-md shadow-red-500/10"
                            : "bg-emerald-500 hover:bg-emerald-600 border border-emerald-500/20 shadow-md shadow-emerald-500/10"
                        )}
                      >
                        {activeTab === 'hutang' ? 'Bayar' : 'Terima'}
                      </button>
                      <button
                        onClick={() => openModal('settle', d)}
                        className="btn btn-secondary h-9 px-2.5 text-text-secondary hover:text-white hover:bg-accent border border-line text-[11px] font-bold shrink-0 flex items-center justify-center gap-1"
                        title="Tandai Lunas"
                      >
                        Lunasi
                      </button>
                    </>
                  )}

                  <button
                    onClick={() => openModal('history', d)}
                    className="btn btn-secondary w-9 h-9 p-0 text-text-secondary hover:text-text-primary shrink-0 flex items-center justify-center"
                    title="Riwayat Cicilan"
                  >
                    <History className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => openModal('edit', d)}
                    className="btn btn-secondary w-9 h-9 p-0 text-text-secondary hover:text-text-primary shrink-0 flex items-center justify-center"
                    title="Ubah Data"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Interactive Modal Component */}
      <DebtModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        mode={modalMode}
        debt={selectedDebt}
      />
    </div>
  );
}
