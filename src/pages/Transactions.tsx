import { useState, useMemo, useEffect, useRef } from 'react';
import TransactionModal from '../components/TransactionModal';
import ReceiptScanModal from '../components/ReceiptScanModal';
import { Plus, ChevronDown, ArrowUp, ArrowDown, ArrowUpDown, Calendar, Search, ScanLine } from 'lucide-react';
import clsx from 'clsx';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { useData } from '../context/DataContext';
import { supabase } from '../lib/supabase';
import { toast } from '../components/Toast';
import { fmt } from '../lib/utils';
import type { Transaction, Account, Wishlist, ExpenseCategory, ExpensePurpose } from '../types';
import { validateTransaction } from '../types';

type Tab = 'income' | 'expense' | 'saving' | 'transfer' | 'bill';
type SortKey = 'date' | 'description' | 'account' | 'admin_fee' | 'amount';
type SortDirection = 'asc' | 'desc' | null;
type ItemsPerPage = 10 | 25 | 50 | 100;

// Extended transaction type for UI rendering (includes admin fee virtual rows)
interface TransactionView extends Transaction {
  original_tx?: Transaction;
}

const tabs: { id: Tab; label: string }[] = [
  { id: 'income', label: 'Pemasukan' },
  { id: 'expense', label: 'Pengeluaran' },
  { id: 'saving', label: 'Tabungan' },
  { id: 'transfer', label: 'Transfer' },
  { id: 'bill', label: 'Tagihan' },
];

const itemsPerPageOptions: ItemsPerPage[] = [10, 25, 50, 100];

export default function Transactions() {
  const [activeTab, setActiveTab] = useState<Tab>('expense');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({ 
    key: 'date', 
    direction: 'desc' 
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<ItemsPerPage>(10);
  const [isItemsPerPageOpen, setIsItemsPerPageOpen] = useState(false);
  const itemsPerPageRef = useRef<HTMLDivElement>(null);

  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [isYearPickerOpen, setIsYearPickerOpen] = useState(false);
  const monthPickerRef = useRef<HTMLDivElement>(null);
  const yearPickerRef = useRef<HTMLDivElement>(null);

  const { transactions, accounts, wishlists, categories, purposes, billPurposes, refresh, loading } = useData();

  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (monthPickerRef.current && !monthPickerRef.current.contains(event.target as Node)) {
        setIsMonthPickerOpen(false);
      }
      if (yearPickerRef.current && !yearPickerRef.current.contains(event.target as Node)) {
        setIsYearPickerOpen(false);
      }
      if (itemsPerPageRef.current && !itemsPerPageRef.current.contains(event.target as Node)) {
        setIsItemsPerPageOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset pagination when tab or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, selectedMonth, selectedYear, itemsPerPage, searchTerm]);

  const filtered = useMemo<TransactionView[]>(() => {
    return transactions.flatMap(t => {
      const d = new Date(t.date);
      const inSelectedPeriod = d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
      
      if (!inSelectedPeriod) return [];

      // If active tab matches transaction type
      if (t.type === activeTab) return [t as TransactionView];

      // Special Case: In 'expense' tab, also show admin fees from transfers/savings
      if (activeTab === 'expense' && (t.type === 'transfer' || t.type === 'saving') && Number(t.admin_fee) > 0) {
        const catAdmin = categories.find((c: ExpenseCategory) => c.name === 'Kebutuhan Lainnya');
        const purAdmin = purposes.find((p: ExpensePurpose) => p.name === 'Admin');

        return [{
          ...t,
          id: `${t.id}_fee`, // Unique ID for virtual row
          amount: t.admin_fee || 0,
          description: `Biaya Admin: ${t.description}`,
          type: 'expense' as const, // Changed from 'expense_fee' to valid TransactionType
          category_id: catAdmin?.id,
          purpose_id: purAdmin?.id,
          original_tx: t // Keep reference for modal opening if needed
        }];
      }

      return [];
    });
  }, [transactions, selectedMonth, selectedYear, activeTab]);

  const searchedData = useMemo<TransactionView[]>(() => {
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) return filtered;

    return filtered.filter(tx => {
      const fromAcct = accounts.find((a: Account) => a.id === tx.from_account_id)?.name || '';
      const toAcct = accounts.find((a: Account) => a.id === tx.to_account_id)?.name || '';
      const wishlist = wishlists.find((w: Wishlist) => w.id === tx.wishlist_id)?.name || '';
      const category = categories.find((c: ExpenseCategory) => c.id === tx.category_id)?.name || '';
      const purpose = purposes.find((p: ExpensePurpose) => p.id === tx.purpose_id)?.name || '';
      const billPurpose = billPurposes.find((b: any) => b.id === tx.bill_purpose_id)?.name || '';

      return [
        tx.description,
        fromAcct,
        toAcct,
        wishlist,
        category,
        purpose,
        billPurpose,
      ].some(value => value.toLowerCase().includes(keyword));
    });
  }, [searchTerm, filtered, accounts, wishlists, categories, purposes, billPurposes]);

  // Compute available years from transaction data
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    transactions.forEach(t => {
      const y = new Date(t.date).getFullYear();
      years.add(y);
    });
    // Always include the current year
    years.add(new Date().getFullYear());
    return Array.from(years).sort((a, b) => b - a);
  }, [transactions]);

  const sortedData = useMemo<TransactionView[]>(() => {
    if (!sortConfig.key || !sortConfig.direction) return searchedData;

    return [...searchedData].sort((a, b) => {
      let aVal: string | number;
      let bVal: string | number;
      switch (sortConfig.key) {
        case 'date': {
          const timeA = new Date(a.date).getTime();
          const timeB = new Date(b.date).getTime();
          if (timeA === timeB) {
            const createA = a.created_at ? new Date(a.created_at).getTime() : 0;
            const createB = b.created_at ? new Date(b.created_at).getTime() : 0;
            if (createA < createB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (createA > createB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
          }
          aVal = timeA;
          bVal = timeB;
          break;
        }
        case 'description': {
          const wishlistA = wishlists.find((w: Wishlist) => w.id === a.wishlist_id);
          const wishlistB = wishlists.find((w: Wishlist) => w.id === b.wishlist_id);
          aVal = (activeTab === 'saving' ? (wishlistA?.name || a.description) : a.description).toLowerCase();
          bVal = (activeTab === 'saving' ? (wishlistB?.name || b.description) : b.description).toLowerCase();
          break;
        }
        case 'account': {
          const fromA = accounts.find((acc: Account) => acc.id === a.from_account_id)?.name || '';
          const toA = accounts.find((acc: Account) => acc.id === a.to_account_id)?.name || '';
          const fromB = accounts.find((acc: Account) => acc.id === b.from_account_id)?.name || '';
          const toB = accounts.find((acc: Account) => acc.id === b.to_account_id)?.name || '';
          
          if (activeTab === 'transfer' || activeTab === 'saving' || activeTab === 'bill') {
            aVal = fromA.toLowerCase();
            bVal = fromB.toLowerCase();
          } else if (activeTab === 'income') {
            aVal = toA.toLowerCase();
            bVal = toB.toLowerCase();
          } else {
            aVal = fromA.toLowerCase();
            bVal = fromB.toLowerCase();
          }
          break;
        }
        case 'admin_fee':
          aVal = Number(a.admin_fee || 0);
          bVal = Number(b.admin_fee || 0);
          break;
        case 'amount':
          aVal = Number(a.amount);
          bVal = Number(b.amount);
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [searchedData, sortConfig, accounts, wishlists, activeTab]);

  // Pagination logic
  const totalItems = sortedData.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = sortedData.slice(startIndex, endIndex);

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const handleSort = (key: SortKey) => {
    setSortConfig(current => {
      if (current.key === key) {
        if (current.direction === 'asc') return { key, direction: 'desc' };
        if (current.direction === 'desc') return { key, direction: null };
        return { key, direction: 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  const SortHeader = ({ label, sortKey, align = 'left' }: { label: string, sortKey: SortKey, align?: 'left' | 'right' }) => {
    const isActive = sortConfig.key === sortKey;
    const direction = sortConfig.direction;

    return (
      <th 
        className={clsx(
          "px-5 py-3.5 font-semibold text-text-muted cursor-pointer hover:bg-surface-hover transition-colors group",
          align === 'right' && "text-right"
        )}
        onClick={() => handleSort(sortKey)}
      >
        <div className={clsx("flex items-center gap-1.5", align === 'right' && "justify-end")}>
          <span>{label}</span>
          <div className="flex flex-col text-text-muted/30 group-hover:text-text-muted transition-colors text-[10px]">
            {isActive ? (
              direction === 'asc' ? <ArrowUp className="w-3 h-3 text-accent" /> :
              direction === 'desc' ? <ArrowDown className="w-3 h-3 text-accent" /> :
              <ArrowUpDown className="w-3 h-3" />
            ) : (
              <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
          </div>
        </div>
      </th>
    );
  };

  // ── Create via atomic RPC. Single round-trip, rollback handled by Postgres. ──
  const handleAddTransaction = async (txData: Partial<Transaction>) => {
    try {
      const validation = validateTransaction(txData);
      if (!validation.isValid) {
        const errorMsg = validation.errors.map(e => e.message).join(', ');
        toast.error('Validasi gagal: ' + errorMsg);
        return;
      }

      const { error } = await supabase.rpc('create_transaction_atomic', {
        payload: txData as Record<string, unknown>,
      });
      if (error) throw error;

      await refresh();
      toast.success('Transaksi berhasil ditambahkan!');
    } catch (err: any) {
      toast.error('Gagal: ' + err.message);
    }
  };

  // ── Edit via atomic RPC. ──
  const handleEditTransaction = async (id: string, txData: Partial<Transaction>) => {
    try {
      const validation = validateTransaction(txData);
      if (!validation.isValid) {
        const errorMsg = validation.errors.map(e => e.message).join(', ');
        toast.error('Validasi gagal: ' + errorMsg);
        return;
      }

      const { error } = await supabase.rpc('update_transaction_atomic', {
        tx_id: id,
        payload: txData as Record<string, unknown>,
      });
      if (error) throw error;

      await refresh();
      toast.success('Transaksi berhasil diperbarui!');
    } catch (err: any) {
      toast.error('Gagal: ' + err.message);
    }
  };

  // ── Delete via atomic RPC (soft delete + balance reverse, all in one). ──
  const handleDeleteTransaction = async (tx: Transaction) => {
    try {
      const { error } = await supabase.rpc('delete_transaction_atomic', {
        tx_id: tx.id,
      });
      if (error) throw error;

      await refresh();
      toast.success('Transaksi berhasil dihapus.');
    } catch (err: any) {
      toast.error('Gagal: ' + err.message);
    }
  };

  const openEditModal = (tx: Transaction) => {
    setEditingTx(tx);
    setIsModalOpen(true);
  };

  return (
    <div className="p-5 md:p-8 max-w-[1200px] mx-auto pb-24 md:pb-6">
      <div className="space-y-6">
        {/* top controls: month selector, year, tabs, & add button */}
        <div className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center justify-between gap-1.5 sm:gap-2 w-full md:w-auto">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-1 md:flex-initial min-w-0">
                <div className="relative shrink-0 sm:flex-1 md:flex-initial" ref={monthPickerRef}>
                  <button 
                    onClick={() => setIsMonthPickerOpen(!isMonthPickerOpen)}
                    className="bg-surface border border-line px-2.5 sm:px-3.5 py-2.5 rounded-2xl flex items-center gap-1 sm:gap-2 shadow-sm hover:border-accent/40 transition-all font-bold text-[12px] sm:text-[13px] text-text-primary min-w-[70px] sm:min-w-[170px] md:min-w-[180px] justify-between group h-[46px] w-full"
                  >
                     <div className="flex items-center gap-1 sm:gap-2 truncate">
                        <div className="hidden sm:flex w-7 h-7 rounded-lg bg-accent/10 items-center justify-center shrink-0">
                          <Calendar className="w-4 h-4 text-accent" />
                        </div>
                        <span className="truncate max-w-[50px] sm:max-w-none">{months[selectedMonth]}</span>
                     </div>
                     <ChevronDown className={clsx("w-3 h-3 sm:w-3.5 sm:h-3.5 text-text-muted transition-transform duration-300 shrink-0", isMonthPickerOpen && "rotate-180")} />
                  </button>
                  
                  {isMonthPickerOpen && (
                    <div className="absolute top-full left-0 mt-2 z-30 w-[220px] bg-surface border border-line rounded-2xl shadow-2xl overflow-hidden animate-scale-in p-1">
                      <div className="grid grid-cols-1 max-h-[300px] overflow-y-auto custom-scrollbar">
                        {months.map((m, idx) => (
                          <button 
                            key={m} 
                            onClick={() => { setSelectedMonth(idx); setIsMonthPickerOpen(false); }}
                            className={clsx(
                              "w-full px-4 py-2.5 rounded-xl text-left text-[13px] transition-all flex items-center justify-between group",
                              selectedMonth === idx 
                                ? "bg-accent text-white font-bold" 
                                : "text-text-primary hover:bg-surface-hover hover:text-accent font-medium"
                            )}
                          >
                            {m}
                            {selectedMonth === idx && <div className="w-1.5 h-1.5 rounded-full bg-white opacity-80" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Year Picker */}
                <div className="relative shrink-0" ref={yearPickerRef}>
                  <button 
                    onClick={() => setIsYearPickerOpen(!isYearPickerOpen)}
                    className="bg-surface border border-line px-2 sm:px-3 py-2.5 rounded-2xl flex items-center gap-1 sm:gap-2 shadow-sm hover:border-accent/40 transition-all font-bold text-[12px] sm:text-[13px] text-text-primary justify-between group h-[46px]"
                  >
                    <span>{selectedYear}</span>
                    <ChevronDown className={clsx("w-3 h-3 sm:w-3.5 sm:h-3.5 text-text-muted transition-transform duration-300", isYearPickerOpen && "rotate-180")} />
                  </button>

                  {isYearPickerOpen && (
                    <div className="absolute top-full left-0 mt-2 z-30 w-[140px] bg-surface border border-line rounded-2xl shadow-2xl overflow-hidden animate-scale-in p-1">
                      <div className="grid grid-cols-1 max-h-[200px] overflow-y-auto custom-scrollbar">
                        {availableYears.map(y => (
                          <button 
                            key={y} 
                            onClick={() => { setSelectedYear(y); setIsYearPickerOpen(false); }}
                            className={clsx(
                              "w-full px-4 py-2.5 rounded-xl text-left text-[13px] transition-all flex items-center justify-between group",
                              selectedYear === y 
                                ? "bg-accent text-white font-bold" 
                                : "text-text-primary hover:bg-surface-hover hover:text-accent font-medium"
                            )}
                          >
                            {y}
                            {selectedYear === y && <div className="w-1.5 h-1.5 rounded-full bg-white opacity-80" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Mobile Actions: Compact Rounded Buttons */}
              <div className="flex gap-1.5 sm:gap-2 shrink-0 md:hidden">
                <button 
                  onClick={() => setIsScanModalOpen(true)}
                  className="bg-surface border border-line hover:border-accent/40 text-text-primary flex items-center justify-center w-[46px] h-[46px] rounded-2xl active:scale-95 transition-all shrink-0"
                  title="Scan Struk dengan AI"
                >
                  <ScanLine className="w-5 h-5 text-accent" />
                </button>
                <button 
                  onClick={() => { setEditingTx(null); setIsModalOpen(true); }}
                  className="btn btn-primary shadow-lg shadow-accent/20 flex items-center justify-center gap-1.5 h-[46px] px-3 sm:px-4 rounded-2xl active:scale-95 transition-all font-bold text-[13px] shrink-0"
                  title="Tambah Transaksi"
                >
                  <Plus className="w-4 h-4 shrink-0" />
                  <span>Tambah</span>
                </button>
              </div>
            </div>

            <div className="hidden md:flex md:items-center md:gap-3 md:flex-1 md:justify-end">
              <div className="relative w-full max-w-[320px]">
                <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Cari deskripsi atau akun..."
                  className="input h-[46px] rounded-2xl pl-11 pr-4 shadow-sm"
                />
              </div>

              <button 
                onClick={() => setIsScanModalOpen(true)}
                className="bg-surface border border-line hover:border-accent/40 text-text-primary flex items-center justify-center gap-2.5 h-[46px] px-4 rounded-2xl active:scale-95 transition-all shrink-0 font-bold text-[14px]"
              >
                <ScanLine className="w-4.5 h-4.5 text-accent" />
                <span>Scan Struk</span>
              </button>

              <button 
                onClick={() => { setEditingTx(null); setIsModalOpen(true); }}
                className="btn btn-primary shadow-lg shadow-accent/20 items-center justify-center gap-2 h-[46px] px-5 rounded-2xl active:scale-95 transition-all shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span className="font-bold text-[14px]">Tambah Transaksi</span>
              </button>
            </div>
          </div>

          <div className="relative md:hidden">
            <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari deskripsi atau akun..."
              className="input h-[46px] rounded-2xl pl-11 pr-4 shadow-sm"
            />
          </div>

          <div className="grid grid-cols-5 bg-surface-alt/10 dark:bg-surface-alt/40 p-1 rounded-2xl border border-line w-full gap-0.5 md:gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  'py-2 rounded-xl font-bold transition-all uppercase tracking-wider text-center',
                  'text-[9px] leading-tight md:text-[11px] lg:text-[12px] md:px-3 lg:px-5',
                  activeTab === tab.id
                    ? 'bg-accent text-bg shadow-md shadow-accent/10 dark:shadow-accent/5'
                    : 'text-text-muted hover:text-text-primary hover:bg-surface-hover'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table (Desktop) / Cards (Mobile) */}
        {loading ? (
          <div className="card shadow-sm border-line bg-surface p-5 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="skeleton w-20 h-4" />
                <div className="skeleton flex-1 h-4" />
                <div className="skeleton w-24 h-4" />
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Mobile Card List */}
             <div className="md:hidden space-y-2.5">
               {paginatedData.length === 0 ? (
                 <div className="card p-8 text-center text-text-muted text-sm font-medium">
                   {searchTerm.trim() ? 'Transaksi tidak ditemukan.' : 'Belum ada transaksi di tab ini.'}
                 </div>
               ) : (
                 paginatedData.map(tx => {
                  const fromAcct = accounts.find((a: Account) => a.id === tx.from_account_id);
                  const toAcct = accounts.find((a: Account) => a.id === tx.to_account_id);
                  const wishlist = wishlists.find((w: Wishlist) => w.id === tx.wishlist_id);
                  const category = categories.find((c: ExpenseCategory) => c.id === tx.category_id);
                  const purpose = purposes.find((p: ExpensePurpose) => p.id === tx.purpose_id);
                  const billPurpose = billPurposes.find((b: any) => b.id === tx.bill_purpose_id);

                  return (
                    <div 
                      key={tx.id} 
                      onClick={() => openEditModal(tx.original_tx || tx)} 
                      className="card p-4 shadow-sm border-line bg-surface active:bg-surface-hover transition-colors cursor-pointer"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1 min-w-0 mr-3">
                          <p className="text-[13px] font-bold text-text-primary truncate">
                            {activeTab === 'saving' ? (wishlist?.name || tx.description) : tx.description}
                          </p>
                          <p className="text-[11px] text-text-muted font-medium mt-0.5">
                            {format(new Date(tx.date), 'dd MMM yyyy', { locale: id })}
                          </p>
                        </div>
                        <span className={clsx("text-[14px] font-bold whitespace-nowrap", activeTab === 'income' ? "text-success" : "text-text-primary")}>
                          {activeTab === 'income' ? '+' : activeTab === 'expense' || activeTab === 'bill' ? '-' : ''}{fmt(Number(tx.amount))}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {activeTab === 'expense' && category && (
                          <span className="bg-surface-alt/50 px-2 py-0.5 rounded-md text-text-secondary font-medium border border-line/50 text-[10px]">
                            {category.name}
                          </span>
                        )}
                        {activeTab === 'expense' && purpose && (
                          <span className="bg-accent/5 px-2 py-0.5 rounded-md text-accent font-semibold border border-accent/10 text-[10px]">
                            {purpose.name}
                          </span>
                        )}
                        {activeTab === 'bill' && billPurpose && (
                          <span className="bg-warning/10 px-2 py-0.5 rounded-md text-warning font-semibold border border-warning/20 text-[10px]">
                            {billPurpose.name}
                          </span>
                        )}
                        {(activeTab === 'transfer' || activeTab === 'saving') && (
                          <span className="text-[10px] text-text-muted font-medium">
                            {fromAcct?.name || '-'} ➔ {toAcct?.name || '-'}
                          </span>
                        )}
                        {(activeTab === 'income' || activeTab === 'expense' || activeTab === 'bill') && (
                          <span className="bg-surface-alt px-2 py-0.5 rounded-md text-[10px] font-medium text-text-muted">
                            {fromAcct?.name || '-'}
                          </span>
                        )}
                        {(activeTab === 'transfer' || activeTab === 'saving') && tx.admin_fee && Number(tx.admin_fee) > 0 && (
                          <span className="text-[10px] text-text-muted font-medium">
                            Admin: {fmt(Number(tx.admin_fee))}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block card shadow-sm border-line bg-surface overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="border-b border-line bg-surface-alt/30 text-left">
                      <SortHeader label="Tanggal" sortKey="date" />
                      <SortHeader 
                        label={activeTab === 'saving' ? 'Tabungan Tujuan' : 'Deskripsi'} 
                        sortKey="description" 
                      />
                      {activeTab === 'expense' && (
                        <>
                          <th className="px-5 py-3 font-bold uppercase tracking-wider text-[10px] text-text-muted">Kategori</th>
                          <th className="px-5 py-3 font-bold uppercase tracking-wider text-[10px] text-text-muted">Tujuan</th>
                        </>
                      )}
                      {activeTab === 'bill' && (
                        <th className="px-5 py-3 font-bold uppercase tracking-wider text-[10px] text-text-muted" colSpan={2}>Tujuan Tagihan</th>
                      )}
                      <SortHeader 
                        label={(activeTab === 'transfer' || activeTab === 'saving') ? 'Relasi Akun' : 'Akun'} 
                        sortKey="account" 
                      />
                      {(activeTab === 'transfer' || activeTab === 'saving') && (
                        <SortHeader label="Biaya Admin" sortKey="admin_fee" align="right" />
                      )}
                      <SortHeader label="Jumlah" sortKey="amount" align="right" />
                    </tr>
                  </thead>
                  <tbody>
                     {paginatedData.length === 0 ? (
                       <tr>
                     <td colSpan={activeTab === 'expense' ? 6 : (activeTab === 'transfer' || activeTab === 'saving') ? 5 : 4} className="px-5 py-16 text-center text-text-muted text-sm font-medium">
                           {searchTerm.trim() ? 'Transaksi tidak ditemukan.' : 'Belum ada transaksi di tab ini.'}
                         </td>
                       </tr>
                     ) : (
                       paginatedData.map(tx => {
                        const fromAcct = accounts.find((a: Account) => a.id === tx.from_account_id);
                        const toAcct = accounts.find((a: Account) => a.id === tx.to_account_id);
                        const wishlist = wishlists.find((w: Wishlist) => w.id === tx.wishlist_id);
                        const category = categories.find((c: ExpenseCategory) => c.id === tx.category_id);
                        const purpose = purposes.find((p: ExpensePurpose) => p.id === tx.purpose_id);
                        const billPurpose = billPurposes.find((b: any) => b.id === tx.bill_purpose_id);

                        return (
                          <tr key={tx.id} onClick={() => openEditModal(tx.original_tx || tx)} className="border-b border-line last:border-0 hover:bg-surface-hover transition-colors group cursor-pointer">
                            <td className="px-5 py-4 text-text-secondary whitespace-nowrap font-medium">
                              {format(new Date(tx.date), 'dd MMM yyyy', { locale: id })}
                            </td>
                            <td className="px-5 py-4 text-text-primary font-bold group-hover:text-accent transition-colors">
                              {activeTab === 'saving' ? (wishlist?.name || tx.description) : tx.description}
                            </td>
                            {activeTab === 'expense' && (
                              <>
                                <td className="px-5 py-4 whitespace-nowrap">
                                  <span className="inline-block max-w-[120px] truncate bg-surface-alt/50 px-2 py-1 rounded-lg text-text-secondary font-medium border border-line/50 text-[11px]">
                                    {category?.name || '-'}
                                  </span>
                                </td>
                                <td className="px-5 py-4 whitespace-nowrap">
                                  <span className="inline-block max-w-[120px] truncate bg-accent/5 px-2 py-1 rounded-lg text-accent font-semibold border border-accent/10 text-[11px]">
                                    {purpose?.name || '-'}
                                  </span>
                                </td>
                              </>
                            )}
                            {activeTab === 'bill' && (
                              <td className="px-5 py-4 whitespace-nowrap" colSpan={2}>
                                <span className="inline-block max-w-[200px] truncate bg-warning/10 px-2 py-1 rounded-lg text-warning font-semibold border border-warning/20 text-[11px]">
                                  {billPurpose?.name || 'Tagihan'}
                                </span>
                              </td>
                            )}
                            <td className="px-5 py-4 text-text-muted whitespace-nowrap">
                              {(activeTab === 'transfer' || activeTab === 'saving') 
                                ? (
                                    <span className="flex items-center gap-1.5 font-medium">
                                     <span>{fromAcct?.name || '-'}</span>
                                     <span className="text-[10px] opacity-50">&rarr;</span>
                                     <span>{toAcct?.name || '-'}</span>
                                    </span>
                                  )
                                : activeTab !== 'bill' 
                                ? <span className="font-medium bg-surface-alt px-2 py-0.5 rounded text-xs">{(activeTab === 'income' ? toAcct?.name : fromAcct?.name) || '-'}</span>
                                : <span className="font-medium bg-surface-alt px-2 py-0.5 rounded text-xs">{fromAcct?.name || '-'}</span>
                              }
                            </td>
                            {(activeTab === 'transfer' || activeTab === 'saving') && (
                              <td className="px-5 py-4 text-right text-text-secondary font-medium">
                                {tx.admin_fee ? fmt(Number(tx.admin_fee)) : '-'}
                              </td>
                            )}
                            <td className={clsx("px-5 py-4 text-right font-bold text-[13px]", activeTab === 'income' ? "text-success" : "text-text-primary")}>
                              {activeTab === 'income' ? '+' : activeTab === 'expense' || activeTab === 'bill' ? '-' : ''}{fmt(Number(tx.amount))}
                            </td>
                          </tr>
                        );
                      })
                     )}
                   </tbody>
                 </table>
               </div>
             </div>
             
             {/* Pagination Controls */}
             {totalItems > 0 && (
               <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-5 py-4 border-t border-line bg-surface-alt/20 md:rounded-b-xl md:border-x md:border-b md:-mt-px mb-20 md:mb-0">
                   {/* Items per page dropdown */}
                   <div className="flex items-center gap-2 text-[13px] text-text-muted">
                     <span>Tampilkan</span>
                     <div className="relative" ref={itemsPerPageRef}>
                       <button
                         onClick={() => setIsItemsPerPageOpen(!isItemsPerPageOpen)}
                         className="flex items-center gap-1.5 px-3 py-1.5 bg-surface border border-line rounded-lg hover:border-accent/40 transition-all font-medium text-text-primary min-w-[60px] justify-between"
                       >
                         {itemsPerPage}
                         <ChevronDown className={clsx("w-3.5 h-3.5 text-text-muted transition-transform", isItemsPerPageOpen && "rotate-180")} />
                       </button>
                       
                       {isItemsPerPageOpen && (
                         <div className="absolute bottom-full left-0 mb-1 z-30 w-[80px] bg-surface border border-line rounded-xl shadow-xl overflow-hidden animate-scale-in p-1">
                           {itemsPerPageOptions.map((option) => (
                             <button
                               key={option}
                               onClick={() => { setItemsPerPage(option); setIsItemsPerPageOpen(false); }}
                               className={clsx(
                                 "w-full px-3 py-2 rounded-lg text-left text-[13px] transition-all",
                                 itemsPerPage === option
                                   ? "bg-accent text-white font-bold"
                                   : "text-text-primary hover:bg-surface-hover hover:text-accent font-medium"
                               )}
                             >
                               {option}
                             </button>
                           ))}
                         </div>
                       )}
                     </div>
                     <span>dari {totalItems} data</span>
                   </div>
                   
                   {/* Page navigation */}
                   <div className="flex items-center gap-2">
                     <button
                       onClick={handlePrevPage}
                       disabled={currentPage === 1}
                       className={clsx(
                         "px-4 py-2 rounded-xl text-[13px] font-medium transition-all border",
                         currentPage === 1
                           ? "bg-surface-alt text-text-muted border-line cursor-not-allowed"
                           : "bg-surface text-text-primary border-line hover:border-accent/40 hover:text-accent"
                       )}
                     >
                       ← Sebelumnya
                     </button>
                     
                     <div className="flex items-center gap-1 px-3">
                       <span className="text-[13px] font-medium text-text-primary">{currentPage}</span>
                       <span className="text-[13px] text-text-muted">/</span>
                       <span className="text-[13px] text-text-muted">{totalPages}</span>
                     </div>
                     
                     <button
                       onClick={handleNextPage}
                       disabled={currentPage === totalPages}
                       className={clsx(
                         "px-4 py-2 rounded-xl text-[13px] font-medium transition-all border",
                         currentPage === totalPages
                           ? "bg-surface-alt text-text-muted border-line cursor-not-allowed"
                           : "bg-surface text-text-primary border-line hover:border-accent/40 hover:text-accent"
                       )}
                      >
                        Selanjutnya &rarr;
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
       
       <TransactionModal
        isOpen={isModalOpen} 
        onClose={() => { setIsModalOpen(false); setEditingTx(null); }} 
        onAdd={handleAddTransaction} 
        onEdit={handleEditTransaction}
        onDelete={handleDeleteTransaction}
        type={editingTx?.type || activeTab} 
        initialData={editingTx}
      />

      <ReceiptScanModal
        isOpen={isScanModalOpen}
        onClose={() => setIsScanModalOpen(false)}
        onAddTransaction={handleAddTransaction}
        accounts={accounts}
        categories={categories}
        purposes={purposes}
      />
    </div>
  );
}
