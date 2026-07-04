import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  PiggyBank,
  Eye,
  EyeSlash,
  Briefcase,
  HandCoins,
  ArrowsLeftRight,
  FileText
} from '@phosphor-icons/react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { useState } from 'react';
import { fmt } from '../lib/utils';

export default function Dashboard() {
  const { accounts, transactions } = useData();
  const { user } = useAuth();
  const [showBalance, setShowBalance] = useState(() => {
    // Load from localStorage, default to true
    const saved = localStorage.getItem('showBalance');
    return saved !== null ? JSON.parse(saved) : true;
  });

  // Toggle balance visibility
  const toggleBalance = () => {
    const newValue = !showBalance;
    setShowBalance(newValue);
    localStorage.setItem('showBalance', JSON.stringify(newValue));
  };

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const totalBalance = accounts.reduce((acc, curr) => acc + Number(curr.balance), 0);

  const currentMonthTx = transactions.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const income = currentMonthTx
    .filter(t => t.type === 'income')
    .reduce((acc, t) => acc + Number(t.amount), 0);

  // Admin fee on transfer/saving is a real outflow from the source account,
  // so it must count toward monthly expense.
  const expense = currentMonthTx.reduce((acc, t) => {
    if (t.type === 'expense' || t.type === 'bill') return acc + Number(t.amount);
    if ((t.type === 'transfer' || t.type === 'saving') && t.admin_fee) {
      return acc + Number(t.admin_fee);
    }
    return acc;
  }, 0);

  const saving = currentMonthTx
    .filter(t => t.type === 'saving')
    .reduce((acc, t) => acc + Number(t.amount), 0);

  const currentMonthName = format(now, 'MMMM', { locale: idLocale });

  // Dynamic performance badge
  const expenseRatio = income > 0 ? ((expense + saving) / income) * 100 : 0;
  const perfBadge = income === 0 && expense === 0 && saving === 0
    ? { label: 'Belum Ada Data', color: 'text-text-muted bg-surface-alt' }
    : expenseRatio <= 50
      ? { label: 'Optimal', color: 'text-success bg-success/10' }
      : expenseRatio <= 80
        ? { label: 'Normal', color: 'text-accent bg-accent/10' }
        : expenseRatio <= 100
          ? { label: 'Waspada', color: 'text-warning bg-warning/10' }
          : { label: 'Over Budget', color: 'text-danger bg-danger/10' };

  return (
    <div className="relative min-h-screen pb-24 md:pb-6">
      {/* Hero Section */}
      <div className="header-hero">
        <div className="max-w-[1100px] mx-auto">
          {/* Top Header inside Hero */}
          <div className="flex items-center justify-start mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 dark:bg-surface flex items-center justify-center font-bold text-lg overflow-hidden border border-white/30 dark:border-line backdrop-blur-md shrink-0">
                {user?.user_metadata?.show_avatar !== false && user?.user_metadata?.avatar_url ? (
                  <img src={user.user_metadata.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  (user?.user_metadata?.name || user?.user_metadata?.full_name || user?.email || 'U').charAt(0).toUpperCase()
                )}
              </div>
              <div>
                <p className="text-sm text-bg/80 dark:text-text-muted">Selamat Datang! 👋</p>
                <p className="font-semibold text-base">{user?.user_metadata?.name || user?.user_metadata?.full_name || user?.email?.split('@')[0]}</p>
              </div>
            </div>
          </div>

          {/* Main Balance */}
          <div className="text-center mb-6">
            <div className="flex items-center justify-center gap-2 mb-1">
              <p className="text-sm font-medium text-bg/80 dark:text-text-muted">Total Saldo Keuangan</p>
              <button
                onClick={toggleBalance}
                className="p-1.5 rounded-full bg-white/20 dark:bg-surface hover:bg-white/30 dark:hover:bg-surface-hover transition-all"
                aria-label={showBalance ? "Sembunyikan saldo" : "Tampilkan saldo"}
              >
                {showBalance ? (
                  <EyeSlash size={16} className="text-bg/80 dark:text-text-muted" />
                ) : (
                  <Eye size={16} className="text-bg/80 dark:text-text-muted" />
                )}
              </button>
            </div>
            <h1 className="text-4xl font-bold tracking-tight">
              {showBalance ? fmt(totalBalance) : '••••••'}
            </h1>
          </div>

          {/* Income/Expense Pills for Current Month */}
          <div className="text-center mb-2">
            <p className="text-[11px] font-medium text-bg/60 dark:text-text-muted uppercase tracking-wider">Ringkasan {currentMonthName}</p>
          </div>
          <div className="flex justify-center gap-3 mb-2">
            <div className="bg-white/10 dark:bg-surface/50 backdrop-blur-md px-4 py-2.5 rounded-2xl flex items-center gap-2 border border-white/20 dark:border-line shadow-sm">
              <div className="w-5 h-5 rounded-full bg-[#10b981] flex items-center justify-center shadow-inner">
                <ArrowDownLeft size={12} weight="bold" className="text-white" />
              </div>
              <span className="font-semibold text-[13px]">{showBalance ? fmt(income) : '••••'}</span>
            </div>
            <div className="bg-white/10 dark:bg-surface/50 backdrop-blur-md px-4 py-2.5 rounded-2xl flex items-center gap-2 border border-white/20 dark:border-line shadow-sm">
              <div className="w-5 h-5 rounded-full bg-[#ef4444] flex items-center justify-center shadow-inner">
                <ArrowUpRight size={12} weight="bold" className="text-white" />
              </div>
              <span className="font-semibold text-[13px]">{showBalance ? fmt(expense) : '••••'}</span>
            </div>
            <div className="bg-white/10 dark:bg-surface/50 backdrop-blur-md px-4 py-2.5 rounded-2xl flex items-center gap-2 border border-white/20 dark:border-line shadow-sm">
              <div className="w-5 h-5 rounded-full bg-[#3b82f6] flex items-center justify-center shadow-inner">
                <PiggyBank size={12} weight="bold" className="text-white" />
              </div>
              <span className="font-semibold text-[13px]">{showBalance ? fmt(saving) : '••••'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Overlapping Content Container */}
      <div className="max-w-[1100px] mx-auto px-4 -mt-16 relative z-10 space-y-5">

        {/* Budget Performance Card */}
        <div className="card p-5 shadow-lg shadow-black/5 border-line bg-surface">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold text-[15px] text-text-primary">Performa Bulan Ini</h2>
            <span className={clsx("text-[11px] font-medium px-2 py-1 rounded-md", perfBadge.color)}>{perfBadge.label}</span>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between text-[13px]">
              <span className="text-text-muted font-medium">Sisa Budget</span>
              <span className="font-semibold text-text-primary">{showBalance ? fmt(Math.max(0, income - expense - saving)) : '••••'}</span>
            </div>
            <div className="bg-surface-alt rounded-full h-2.5 overflow-hidden shadow-inner">
              <div className="bg-accent h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${Math.min(100, ((expense + saving) / (income || 1)) * 100)}%` }}></div>
            </div>
            <p className="text-[11px] text-text-muted font-medium">
              {showBalance ? `Terpakai ${fmt(expense + saving)} dari ${fmt(income)}` : 'Terpakai •••• dari ••••'}
            </p>
          </div>
        </div>

        {/* Quick Access Grid Menu (Single Card Wrapper) */}
        <div className="card p-3 md:p-5 shadow-sm border border-line bg-surface">
          <div className="grid grid-cols-4 gap-1 md:gap-3 text-center">
            <Link
              to="/wallet"
              className="flex flex-col items-center justify-center py-2.5 rounded-2xl hover:bg-surface-alt/50 active:scale-95 transition-all group"
            >
              <div className="w-12 h-12 rounded-2xl bg-accent/5 border-2 border-accent/35 text-accent flex items-center justify-center mb-2 group-hover:scale-110 transition-all">
                <Wallet size={20} weight="duotone" />
              </div>
              <span className="text-[11px] sm:text-[12px] font-bold text-text-primary">Wallet</span>
            </Link>

            <Link
              to="/tabungan"
              className="flex flex-col items-center justify-center py-2.5 rounded-2xl hover:bg-surface-alt/50 active:scale-95 transition-all group"
            >
              <div className="w-12 h-12 rounded-2xl bg-accent/5 border-2 border-accent/35 text-accent flex items-center justify-center mb-2 group-hover:scale-110 transition-all">
                <PiggyBank size={20} weight="duotone" />
              </div>
              <span className="text-[11px] sm:text-[12px] font-bold text-text-primary">Tabungan</span>
            </Link>

            <Link
              to="/investment"
              className="flex flex-col items-center justify-center py-2.5 rounded-2xl hover:bg-surface-alt/50 active:scale-95 transition-all group"
            >
              <div className="w-12 h-12 rounded-2xl bg-accent/5 border-2 border-accent/35 text-accent flex items-center justify-center mb-2 group-hover:scale-110 transition-all">
                <Briefcase size={20} weight="duotone" />
              </div>
              <span className="text-[11px] sm:text-[12px] font-bold text-text-primary">Investasi</span>
            </Link>

            <Link
              to="/hutang"
              className="flex flex-col items-center justify-center py-2.5 rounded-2xl hover:bg-surface-alt/50 active:scale-95 transition-all group"
            >
              <div className="w-12 h-12 rounded-2xl bg-accent/5 border-2 border-accent/35 text-accent flex items-center justify-center mb-2 group-hover:scale-110 transition-all">
                <HandCoins size={20} weight="duotone" />
              </div>
              <span className="text-[11px] sm:text-[12px] font-bold text-text-primary">Hutang</span>
            </Link>
          </div>
        </div>

        {/* Recent Transactions Card */}
        <div className="card p-5 shadow-sm border border-line bg-surface space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="font-bold text-[15px] text-text-primary">Riwayat Transaksi Terakhir</h2>
            <Link
              to="/transactions"
              className="text-[12px] font-bold text-accent hover:text-accent-hover transition-colors"
            >
              Lihat Semua
            </Link>
          </div>

          <div className="divide-y divide-line/60">
            {transactions.length === 0 ? (
              <div className="py-8 text-center text-text-muted text-sm font-medium">
                Belum ada transaksi.
              </div>
            ) : (
              transactions.slice(0, 5).map(tx => {
                const fromAcct = accounts.find(a => a.id === tx.from_account_id)?.name;
                const toAcct = accounts.find(a => a.id === tx.to_account_id)?.name;

                // Determine transaction visual indicators
                let Icon = ArrowUpRight;
                let iconColor = "text-danger bg-danger/10 border border-danger/15";
                let sign = "-";
                let amountColor = "text-text-primary";
                let accountDetails = "";

                if (tx.type === 'income') {
                  Icon = ArrowDownLeft;
                  iconColor = "text-success bg-success/10 border border-success/15";
                  sign = "+";
                  amountColor = "text-success";
                  accountDetails = toAcct || "Wallet";
                } else if (tx.type === 'expense') {
                  Icon = ArrowUpRight;
                  iconColor = "text-danger bg-danger/10 border border-danger/15";
                  sign = "-";
                  amountColor = "text-danger";
                  accountDetails = fromAcct || "Wallet";
                } else if (tx.type === 'bill') {
                  Icon = FileText;
                  iconColor = "text-warning bg-warning/10 border border-warning/15";
                  sign = "-";
                  amountColor = "text-danger";
                  accountDetails = fromAcct || "Wallet";
                } else if (tx.type === 'transfer') {
                  Icon = ArrowsLeftRight;
                  iconColor = "text-accent bg-accent/10 border border-accent/15";
                  sign = "";
                  amountColor = "text-text-primary";
                  accountDetails = fromAcct && toAcct ? `${fromAcct} ➔ ${toAcct}` : "Transfer";
                } else if (tx.type === 'saving') {
                  Icon = PiggyBank;
                  iconColor = "text-accent bg-accent/10 border border-accent/15";
                  sign = "";
                  amountColor = "text-text-primary";
                  accountDetails = fromAcct ? `${fromAcct} ➔ Tabungan` : "Tabungan";
                }

                return (
                  <div key={tx.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0 hover:bg-surface-alt/10 px-2 -mx-2 rounded-xl transition-all">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={clsx("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", iconColor)}>
                        <Icon size={16} weight="bold" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-bold text-text-primary truncate">{tx.description}</p>
                        <p className="text-[11px] text-text-muted font-semibold mt-0.5 flex items-center gap-1.5">
                          <span>{format(new Date(tx.date), 'dd MMM yyyy', { locale: idLocale })}</span>
                          <span className="text-text-muted/40">•</span>
                          <span className="truncate">{accountDetails}</span>
                        </p>
                      </div>
                    </div>
                    <span className={clsx("text-[13px] font-extrabold whitespace-nowrap", amountColor)}>
                      {sign}{fmt(Number(tx.amount))}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
