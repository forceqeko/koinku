import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Trash2, Calendar, TrendingUp, TrendingDown, Info, Tag, BookOpen, AlertTriangle, Wallet, User, FileText, Building2, Smartphone, ChevronDown, Check, Search } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { formatThousands, parseThousands } from '../lib/utils';
import clsx from 'clsx';
import type { Debt, DebtPayment } from '../types';

interface ItemPickerProps {
  isOpen: boolean;
  onClose: () => void;
  items: any[];
  onSelect: (id: string) => void;
  selectedValue: string;
  title: string;
  placeholder?: string;
}

function ItemPicker({ isOpen, onClose, items, onSelect, selectedValue, title, placeholder = "Cari..." }: ItemPickerProps) {
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSearch('');
      const isMobile = window.matchMedia('(max-width: 768px)').matches;
      if (!isMobile) {
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    }
  }, [isOpen]);
  
  if (!isOpen) return null;

  const filteredItems = items.filter(a => 
    (a.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (a.type || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
      <div className="bg-surface border border-line rounded-2xl w-full max-w-sm shadow-2xl animate-scale-in overflow-hidden flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-line bg-surface-alt/20">
          <h3 className="text-[15px] font-bold text-text-primary">{title}</h3>
          <button type="button" onClick={onClose} className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-hover rounded-lg transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-line bg-surface">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input 
              ref={inputRef}
              type="text" 
              placeholder={placeholder} 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-surface-alt/50 border border-line rounded-xl pl-10 pr-4 py-2.5 text-[13px] focus:border-accent focus:ring-1 focus:ring-accent/20 outline-none transition-all"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {filteredItems.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm text-text-muted font-medium">Data tidak ditemukan</p>
            </div>
          ) : (
            filteredItems.map(item => {
              const isSelected = item.id === selectedValue;
              let Icon = Wallet;
              if (item.type === 'bank') Icon = Building2;
              if (item.type === 'ewallet') Icon = Smartphone;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => { onSelect(item.id); onClose(); }}
                  className={clsx(
                    "w-full flex items-center justify-between p-3 rounded-xl transition-all group",
                    isSelected ? "bg-accent/10 border border-accent/20" : "hover:bg-surface-hover border border-transparent"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-surface border border-line flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform bg-white overflow-hidden">
                      {item.icon_url ? (
                        <img src={item.icon_url} alt={item.name} className="w-7 h-7 object-contain" />
                      ) : (
                        <Icon className="w-5 h-5 text-text-muted" />
                      )}
                    </div>
                    <div className="text-left">
                      <p className={clsx("text-[13px] font-bold", isSelected ? "text-accent" : "text-text-primary")}>{item.name}</p>
                      <p className="text-[11px] text-text-muted">
                        Saldo: Rp {item.balance.toLocaleString('id-ID')}
                      </p>
                    </div>
                  </div>
                  {isSelected && (
                    <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center">
                      <Check className="w-3.5 h-3.5 text-white" />
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function ItemTrigger({ items, value, onClick, label, placeholder = "Pilih..." }: { items: any[], value: string, onClick: () => void, label: string, placeholder?: string }) {
  const selected = items.find(a => a.id === value);
  let SelectedIcon = Wallet;
  if (selected?.type === 'bank') SelectedIcon = Building2;
  if (selected?.type === 'ewallet') SelectedIcon = Smartphone;

  return (
    <div className="space-y-1.5">
      <label className="block text-[12px] font-semibold text-text-secondary">{label}</label>
      <button 
        type="button" 
        onClick={onClick} 
        className="input flex items-center justify-between w-full hover:border-accent/40 bg-surface text-left group transition-all h-[46px] relative"
      >
        {selected ? (
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-white border border-line flex items-center justify-center overflow-hidden shrink-0">
              {selected.icon_url ? (
                 <img src={selected.icon_url} alt={selected.name} className="w-5 h-5 object-contain" />
              ) : (
                 <SelectedIcon className="w-4 h-4 text-text-muted" />
              )}
            </div>
            <span className="font-semibold text-text-primary text-[13px]">{selected.name}</span>
          </div>
        ) : (
          <span className="text-text-muted">{placeholder}</span>
        )}
        <ChevronDown className="w-4 h-4 text-text-muted group-hover:text-accent group-hover:translate-y-0.5 transition-all" />
      </button>
    </div>
  );
}

interface DebtModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'add' | 'edit' | 'pay' | 'history' | 'settle';
  debt?: Debt | null;
}

export default function DebtModal({ isOpen, onClose, mode: initialMode, debt }: DebtModalProps) {
  const { user } = useAuth();
  const { accounts, categories, purposes, sources, debtPayments, refresh } = useData();

  // Active mode state (can switch within modal)
  const [activeMode, setActiveMode] = useState<'add' | 'edit' | 'pay' | 'history' | 'settle'>(initialMode);

  // Form States for Add / Edit
  const [name, setName] = useState('');
  const [type, setType] = useState<'hutang' | 'piutang'>('hutang');
  const [counterparty, setCounterparty] = useState('');
  const [principalInput, setPrincipalInput] = useState('');
  const [interestInput, setInterestInput] = useState('0');
  const [tenorInput, setTenorInput] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [accountId, setAccountId] = useState('');

  // Form States for Record Payment (Pay Mode)
  const [paymentAmountInput, setPaymentAmountInput] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentAccountId, setPaymentAccountId] = useState('');

  // UI / Logic States
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pickerMode, setPickerMode] = useState<'none' | 'account' | 'paymentAccount'>('none');

  // Reset or initialize state
  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      setActiveMode(initialMode);

      if (initialMode === 'add') {
        setName('');
        setType('hutang');
        setCounterparty('');
        setPrincipalInput('');
        setInterestInput('0');
        setTenorInput('');
        setStartDate(new Date().toISOString().split('T')[0]);
        setDueDate('');
        setNotes('');
        setAccountId(accounts[0]?.id || '');
      } else if (debt) {
        setName(debt.name);
        setType(debt.type);
        setCounterparty(debt.counterparty);
        setPrincipalInput(formatThousands(debt.principal_amount.toString()));
        setInterestInput(debt.interest_rate.toString());
        setTenorInput(debt.tenor_months?.toString() || '');
        setStartDate(debt.start_date);
        setDueDate(debt.due_date || '');
        setNotes(debt.notes || '');
        setAccountId(debt.account_id || accounts[0]?.id || '');

        // Initialize payment form
        setPaymentAmountInput('');
        setPaymentDate(new Date().toISOString().split('T')[0]);
        setPaymentNotes('');
        setPaymentAccountId(accounts[0]?.id || '');
      }
    }
  }, [isOpen, initialMode, debt, accounts]);

  // Auto calculate due date based on startDate and tenorInput
  useEffect(() => {
    if (startDate && tenorInput) {
      const tenor = parseInt(tenorInput);
      if (!isNaN(tenor) && tenor > 0) {
        const d = new Date(startDate);
        d.setMonth(d.getMonth() + tenor);
        setDueDate(d.toISOString().split('T')[0]);
      } else {
        setDueDate('');
      }
    } else if (!tenorInput) {
      setDueDate('');
    }
  }, [startDate, tenorInput]);

  // Fetch or create Category/Purpose for Expense
  const getOrCreateExpenseCategoryAndPurpose = async (purposeName: string) => {
    if (!user) throw new Error('User not authenticated');

    // Find category "Hutang & Piutang"
    let categoryObj = (categories || []).find(c => c && c.name.toLowerCase() === 'hutang & piutang');
    let catId = '';
    if (!categoryObj) {
      const { data: newCat, error: catErr } = await supabase
        .from('expense_categories')
        .insert({ user_id: user.id, name: 'Hutang & Piutang' })
        .select()
        .single();
      if (catErr) throw catErr;
      catId = newCat.id;
    } else {
      catId = categoryObj.id;
    }

    // Find purpose
    let purposeObj = (purposes || []).find(
      p => p && p.name.toLowerCase() === purposeName.toLowerCase() && p.category_id === catId
    );
    let purId = '';
    if (!purposeObj) {
      const { data: newPur, error: purErr } = await supabase
        .from('expense_purposes')
        .insert({ user_id: user.id, category_id: catId, name: purposeName })
        .select()
        .single();
      if (purErr) throw purErr;
      purId = newPur.id;
    } else {
      purId = purposeObj.id;
    }

    return { categoryId: catId, purposeId: purId };
  };

  // Fetch or create Income Source
  const getOrCreateIncomeSource = async () => {
    if (!user) throw new Error('User not authenticated');

    let sourceObj = (sources || []).find(s => s && s.name.toLowerCase() === 'hutang & piutang');
    let srcId = '';
    if (!sourceObj) {
      const { data: newSrc, error: srcErr } = await supabase
        .from('income_sources')
        .insert({ user_id: user.id, name: 'Hutang & Piutang' })
        .select()
        .single();
      if (srcErr) throw srcErr;
      srcId = newSrc.id;
    } else {
      srcId = sourceObj.id;
    }
    return srcId;
  };

  // Filter payments for this specific debt
  const currentPayments = useMemo(() => {
    if (!debt) return [];
    return (debtPayments || []).filter(p => p.debt_id === debt.id);
  }, [debt, debtPayments]);

  const totalPaid = useMemo(() => {
    return currentPayments.reduce((sum, p) => sum + p.amount, 0);
  }, [currentPayments]);

  const getMonthsElapsed = (startDateStr: string, isSettled: boolean, settledAtStr?: string | null) => {
    const start = new Date(startDateStr);
    const end = isSettled && settledAtStr ? new Date(settledAtStr) : new Date();

    let months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    if (end.getDate() < start.getDate()) {
      months--;
    }
    return Math.max(0, months);
  };

  const debtStats = useMemo(() => {
    if (!debt) return null;

    const principal = Number(debt.principal_amount) || 0;
    const interestRate = Number(debt.interest_rate) || 0;
    const tenorMonths = debt.tenor_months ? Number(debt.tenor_months) : null;

    const monthsElapsed = getMonthsElapsed(debt.start_date, debt.is_settled, debt.settled_at);
    const interestMultiplier = (tenorMonths && tenorMonths > 0) ? tenorMonths : monthsElapsed;
    const monthlyInterest = (interestRate / 100) * principal;
    const totalInterest = interestMultiplier * monthlyInterest;
    const totalOwed = principal + totalInterest;
    const remainingOwed = Math.max(0, totalOwed - totalPaid);

    return {
      principal,
      interestRate,
      tenorMonths,
      monthsElapsed,
      totalInterest,
      totalOwed,
      remainingOwed
    };
  }, [debt, totalPaid]);

  // Main Submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    setErrorMsg(null);

    try {
      // 1. ADD MODE
      if (activeMode === 'add') {
        if (!name.trim()) throw new Error('Nama hutang/piutang wajib diisi');
        if (!counterparty.trim()) throw new Error('Nama pihak terkait wajib diisi');
        const principal = Number(parseThousands(principalInput));
        if (isNaN(principal) || principal <= 0) throw new Error('Nominal pokok harus lebih dari 0');
        const interest = Number(interestInput);
        if (isNaN(interest) || interest < 0) throw new Error('Bunga tidak boleh negatif');
        if (!accountId) throw new Error('Pilih dompet/wallet terlebih dahulu');

        const tenorVal = tenorInput ? parseInt(tenorInput) : null;

        // Picu pembuatan transaksi wallet
        let txId: string | null = null;
        if (type === 'hutang') {
          // Hutang = uang masuk ke wallet (Income)
          const sourceId = await getOrCreateIncomeSource();
          const { data: retTxId, error: txErr } = await supabase.rpc('create_transaction_atomic', {
            payload: {
              type: 'income',
              to_account_id: accountId,
              source_id: sourceId,
              amount: principal,
              date: startDate + 'T00:00:00Z',
              description: `Penerimaan Hutang: ${name.trim()}`
            }
          });
          if (txErr) throw txErr;
          txId = retTxId;
        } else {
          // Piutang = uang keluar dari wallet (Expense)
          const { categoryId, purposeId } = await getOrCreateExpenseCategoryAndPurpose('Pemberian Piutang');
          const { data: retTxId, error: txErr } = await supabase.rpc('create_transaction_atomic', {
            payload: {
              type: 'expense',
              from_account_id: accountId,
              category_id: categoryId,
              purpose_id: purposeId,
              amount: principal,
              date: startDate + 'T00:00:00Z',
              description: `Pemberian Piutang: ${name.trim()}`
            }
          });
          if (txErr) throw txErr;
          txId = retTxId;
        }

        // Simpan data Debt
        const { error: debtErr } = await supabase
          .from('debts')
          .insert({
            user_id: user.id,
            name: name.trim(),
            type,
            counterparty: counterparty.trim(),
            principal_amount: principal,
            interest_rate: interest,
            tenor_months: tenorVal,
            start_date: startDate,
            due_date: dueDate || null,
            notes: notes.trim() || null,
            is_settled: false,
            account_id: accountId,
            transaction_id: txId
          });

        if (debtErr) {
          // Rollback transaction if debt save fails
          if (txId) {
            await supabase.rpc('delete_transaction_atomic', { tx_id: txId });
          }
          throw debtErr;
        }

        await refresh();
        onClose();
      }

      // 2. EDIT MODE
      else if (activeMode === 'edit' && debt) {
        if (!name.trim()) throw new Error('Nama hutang/piutang wajib diisi');
        if (!counterparty.trim()) throw new Error('Nama pihak terkait wajib diisi');
        const principal = Number(parseThousands(principalInput));
        if (isNaN(principal) || principal <= 0) throw new Error('Nominal pokok harus lebih dari 0');
        const interest = Number(interestInput);
        if (isNaN(interest) || interest < 0) throw new Error('Bunga tidak boleh negatif');
        if (!accountId) throw new Error('Pilih dompet/wallet terlebih dahulu');

        const tenorVal = tenorInput ? parseInt(tenorInput) : null;

        // Update linked transaction
        if (debt.transaction_id) {
          if (debt.type === 'hutang') {
            const sourceId = await getOrCreateIncomeSource();
            const { error: txErr } = await supabase.rpc('update_transaction_atomic', {
              tx_id: debt.transaction_id,
              payload: {
                type: 'income',
                to_account_id: accountId,
                source_id: sourceId,
                amount: principal,
                date: startDate + 'T00:00:00Z',
                description: `Penerimaan Hutang: ${name.trim()}`
              }
            });
            if (txErr) throw txErr;
          } else {
            const { categoryId, purposeId } = await getOrCreateExpenseCategoryAndPurpose('Pemberian Piutang');
            const { error: txErr } = await supabase.rpc('update_transaction_atomic', {
              tx_id: debt.transaction_id,
              payload: {
                type: 'expense',
                from_account_id: accountId,
                category_id: categoryId,
                purpose_id: purposeId,
                amount: principal,
                date: startDate + 'T00:00:00Z',
                description: `Pemberian Piutang: ${name.trim()}`
              }
            });
            if (txErr) throw txErr;
          }
        }

        // Update data Debt
        const { error: debtErr } = await supabase
          .from('debts')
          .update({
            name: name.trim(),
            counterparty: counterparty.trim(),
            principal_amount: principal,
            interest_rate: interest,
            tenor_months: tenorVal,
            start_date: startDate,
            due_date: dueDate || null,
            notes: notes.trim() || null,
            account_id: accountId
          })
          .eq('id', debt.id);

        if (debtErr) throw debtErr;

        await refresh();
        onClose();
      }

      // 3. PAY MODE (Catat Cicilan)
      else if (activeMode === 'pay' && debt) {
        const payAmt = Number(parseThousands(paymentAmountInput));
        if (isNaN(payAmt) || payAmt <= 0) throw new Error('Nominal cicilan harus lebih dari 0');
        if (!paymentAccountId) throw new Error('Pilih dompet/wallet asal pembayaran');

        let txId: string | null = null;
        if (debt.type === 'hutang') {
          // Pembayaran Hutang = Pengeluaran dari Wallet (Expense)
          const { categoryId, purposeId } = await getOrCreateExpenseCategoryAndPurpose('Pembayaran Hutang');
          const { data: retTxId, error: txErr } = await supabase.rpc('create_transaction_atomic', {
            payload: {
              type: 'expense',
              from_account_id: paymentAccountId,
              category_id: categoryId,
              purpose_id: purposeId,
              amount: payAmt,
              date: paymentDate + 'T00:00:00Z',
              description: `Pembayaran Hutang: ${debt.name.trim()}${paymentNotes.trim() ? ' - ' + paymentNotes.trim() : ''}`
            }
          });
          if (txErr) throw txErr;
          txId = retTxId;
        } else {
          // Terima Pembayaran Piutang = Pemasukan ke Wallet (Income)
          const sourceId = await getOrCreateIncomeSource();
          const { data: retTxId, error: txErr } = await supabase.rpc('create_transaction_atomic', {
            payload: {
              type: 'income',
              to_account_id: paymentAccountId,
              source_id: sourceId,
              amount: payAmt,
              date: paymentDate + 'T00:00:00Z',
              description: `Penerimaan Piutang: ${debt.name.trim()}${paymentNotes.trim() ? ' - ' + paymentNotes.trim() : ''}`
            }
          });
          if (txErr) throw txErr;
          txId = retTxId;
        }

        // Simpan ke debt_payments
        const { error: pmtErr } = await supabase
          .from('debt_payments')
          .insert({
            user_id: user.id,
            debt_id: debt.id,
            amount: payAmt,
            date: paymentDate,
            notes: paymentNotes.trim() || null,
            account_id: paymentAccountId,
            transaction_id: txId
          });

        if (pmtErr) {
          if (txId) {
            await supabase.rpc('delete_transaction_atomic', { tx_id: txId });
          }
          throw pmtErr;
        }

        await refresh();
        onClose();
      }

      // 4. SETTLE MODE
      else if (activeMode === 'settle' && debt) {
        const { error: settleErr } = await supabase
          .from('debts')
          .update({
            is_settled: true,
            settled_at: new Date().toISOString()
          })
          .eq('id', debt.id);

        if (settleErr) throw settleErr;

        await refresh();
        onClose();
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setLoading(false);
    }
  };

  // Delete Payment Cicilan
  const handleDeletePayment = async (pmt: DebtPayment) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus pembayaran ini? Saldo wallet terkait akan disesuaikan.')) return;
    setLoading(true);
    setErrorMsg(null);

    try {
      if (pmt.transaction_id) {
        const { error: txErr } = await supabase.rpc('delete_transaction_atomic', { tx_id: pmt.transaction_id });
        if (txErr) throw txErr;
      }

      const { error: delErr } = await supabase
        .from('debt_payments')
        .delete()
        .eq('id', pmt.id);

      if (delErr) throw delErr;

      await refresh();
      // Tetap di mode history
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Gagal menghapus pembayaran.');
    } finally {
      setLoading(false);
    }
  };

  // Delete entire Debt
  const handleDeleteDebt = async () => {
    if (!debt) return;
    if (!window.confirm(`Apakah Anda yakin ingin menghapus "${debt.name}"? Semua data pembayaran dan transaksi wallet terkait akan dihapus.`)) return;
    setLoading(true);
    setErrorMsg(null);

    try {
      // 1. Delete all payments and their transactions
      for (const pmt of currentPayments) {
        if (pmt.transaction_id) {
          await supabase.rpc('delete_transaction_atomic', { tx_id: pmt.transaction_id });
        }
      }

      // 2. Delete main initial transaction
      if (debt.transaction_id) {
        await supabase.rpc('delete_transaction_atomic', { tx_id: debt.transaction_id });
      }

      // 3. Delete debt row (will cascade delete payments in DB anyway, but we cleaned wallet txs first)
      const { error: delErr } = await supabase
        .from('debts')
        .delete()
        .eq('id', debt.id);

      if (delErr) throw delErr;

      await refresh();
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Gagal menghapus catatan hutang.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
      <div className="bg-surface border border-line rounded-2xl w-full max-w-md shadow-2xl animate-scale-in overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-line bg-surface-alt/20">
          <div>
            <h3 className="text-[15px] font-bold text-text-primary">
              {activeMode === 'add' && 'Tambah Hutang / Piutang'}
              {activeMode === 'edit' && 'Ubah Hutang / Piutang'}
              {activeMode === 'pay' && `Catat Pembayaran: ${debt?.name}`}
              {activeMode === 'history' && `Riwayat Cicilan: ${debt?.name}`}
              {activeMode === 'settle' && 'Konfirmasi Pelunasan'}
            </h3>
            {debt && activeMode !== 'history' && (
              <p className="text-[11px] text-text-muted capitalize">
                Tipe: {debt.type === 'hutang' ? 'Hutang Anda' : 'Piutang Anda'}
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-hover rounded-lg transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div className="bg-error/10 border-b border-error/20 px-5 py-3 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-error shrink-0 mt-0.5" />
            <p className="text-[11px] font-medium text-error">{errorMsg}</p>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
          {/* ─── ADD & EDIT MODE FORM ─── */}
          {(activeMode === 'add' || activeMode === 'edit') && (
            <form id="debt-form" onSubmit={handleSubmit} className="space-y-4">
              {/* Type Switcher (Only in Add mode) */}
              {activeMode === 'add' && (
                <div className="space-y-1.5">
                  <label className="block text-[12px] font-semibold text-text-secondary">Tipe Pencatatan</label>
                  <div className="grid grid-cols-2 gap-2 bg-surface-alt p-1 rounded-xl border border-line">
                    <button
                      type="button"
                      onClick={() => setType('hutang')}
                      className={clsx(
                        "py-2 text-[12px] font-bold rounded-lg transition-all flex items-center justify-center gap-1.5",
                        type === 'hutang'
                          ? "bg-red-500/10 text-red-500 border border-red-500/20"
                          : "text-text-muted hover:text-text-primary hover:bg-surface-hover"
                      )}
                    >
                      <TrendingDown className="w-4 h-4" />
                      Hutang
                    </button>
                    <button
                      type="button"
                      onClick={() => setType('piutang')}
                      className={clsx(
                        "py-2 text-[12px] font-bold rounded-lg transition-all flex items-center justify-center gap-1.5",
                        type === 'piutang'
                          ? "bg-green-500/10 text-green-500 border border-green-500/20"
                          : "text-text-muted hover:text-text-primary hover:bg-surface-hover"
                      )}
                    >
                      <TrendingUp className="w-4 h-4" />
                      Piutang
                    </button>
                  </div>
                </div>
              )}

              {/* Name & Pihak Terkait */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-[12px] font-semibold text-text-secondary">Nama Pencatatan</label>
                  <div className="relative">
                    <FileText className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <input
                      type="text"
                      required
                      placeholder="Contoh: KPR Rumah, Modal Budi"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="input w-full pl-10 bg-surface border border-line text-[13px] rounded-xl outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[12px] font-semibold text-text-secondary">Pihak Terkait (Orang/Instansi)</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Bank BRI, Budi"
                      value={counterparty}
                      onChange={e => setCounterparty(e.target.value)}
                      className="input w-full pl-10 bg-surface border border-line text-[13px] rounded-xl outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Principal Amount */}
              <div className="space-y-1.5">
                <label className="block text-[12px] font-semibold text-text-secondary">Nominal Pokok (Rp)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[13px] font-bold text-text-muted">Rp</span>
                  <input
                    type="text"
                    required
                    placeholder="0"
                    value={principalInput}
                    onChange={e => setPrincipalInput(formatThousands(e.target.value))}
                    className="input w-full pl-12 pr-4 py-2.5 font-bold text-[14px] text-text-primary bg-surface border border-line rounded-xl outline-none"
                  />
                </div>
              </div>

              {/* Bunga & Tenor */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-[12px] font-semibold text-text-secondary flex items-center gap-1">
                    Bunga Flat / Bulan (%)
                    <span className="group relative cursor-pointer">
                      <Info className="w-3.5 h-3.5 text-text-muted hover:text-text-primary" />
                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 w-48 bg-surface border border-line p-2 rounded-lg text-[9px] text-text-secondary leading-normal shadow-lg hidden group-hover:block z-50">
                        Bunga bulanan tetap dihitung dari nominal pokok awal. Isikan 0 jika tanpa bunga.
                      </span>
                    </span>
                  </label>
                  <div className="relative">
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[12px] font-semibold text-text-muted">%</span>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0"
                      value={interestInput}
                      onChange={e => setInterestInput(e.target.value)}
                      className="input w-full pr-8 bg-surface border border-line text-[13px] rounded-xl outline-none font-semibold"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[12px] font-semibold text-text-secondary flex items-center gap-1">
                    Tenor Masa Pinjam
                  </label>
                  <div className="relative">
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[12px] font-semibold text-text-muted">Bulan</span>
                    <input
                      type="number"
                      placeholder="Opsional (Selamanya)"
                      value={tenorInput}
                      onChange={e => setTenorInput(e.target.value)}
                      className="input w-full pr-16 bg-surface border border-line text-[13px] rounded-xl outline-none font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* Start Date & Calculated Due Date */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-[12px] font-semibold text-text-secondary">Tanggal Mulai Pinjam</label>
                  <div className="relative">
                    <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <input
                      type="date"
                      required
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                      className="input w-full pl-10 bg-surface border border-line text-[13px] rounded-xl outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[12px] font-semibold text-text-secondary">Jatuh Tempo (Otomatis)</label>
                  <div className="relative">
                    <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <input
                      type="date"
                      disabled={!!tenorInput}
                      value={dueDate}
                      onChange={e => setDueDate(e.target.value)}
                      className={clsx(
                        "input w-full pl-10 border text-[13px] rounded-xl outline-none",
                        tenorInput ? "bg-surface-alt/50 border-line text-text-secondary cursor-not-allowed" : "bg-surface border-line text-text-primary"
                      )}
                    />
                  </div>
                </div>
              </div>

              {/* Account / Wallet Selector */}
              <ItemTrigger
                items={accounts}
                value={accountId}
                onClick={() => setPickerMode('account')}
                label={type === 'hutang' ? 'Wallet Penerima Dana' : 'Wallet Sumber Dana'}
                placeholder="Pilih dompet..."
              />

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="block text-[12px] font-semibold text-text-secondary">Catatan (Opsional)</label>
                <textarea
                  placeholder="Keterangan tambahan..."
                  rows={2}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="input w-full bg-surface border border-line rounded-xl px-4 py-2.5 text-[13px] outline-none resize-none"
                />
              </div>
            </form>
          )}

          {/* ─── PAY MODE (Bayar Cicilan) ─── */}
          {activeMode === 'pay' && debt && (
            <form id="pay-form" onSubmit={handleSubmit} className="space-y-4">
              <div className="bg-surface-alt/50 border border-line rounded-xl p-4 space-y-3 text-[12px]">
                <div className="flex justify-between">
                  <span className="text-text-secondary">Nama Hutang:</span>
                  <span className="font-semibold text-text-primary">{debt.name}</span>
                </div>

                <div className="border-t border-line/45 my-1" />

                <div className="flex justify-between">
                  <span className="text-text-secondary">Pokok Awal:</span>
                  <span className="font-semibold text-text-primary">Rp {debtStats?.principal.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Bunga & Tenor:</span>
                  <span className="font-semibold text-text-secondary">
                    {debtStats && debtStats.interestRate > 0
                      ? `${debtStats.interestRate}%/bln (Flat)${debtStats.tenorMonths ? ` • ${debtStats.tenorMonths} Bln` : ''}`
                      : 'Tanpa Bunga'
                    }
                  </span>
                </div>
                {debtStats && debtStats.interestRate > 0 && (
                  <div className="flex justify-between text-yellow-600 dark:text-yellow-400">
                    <span>
                      {debtStats.tenorMonths
                        ? `Total Bunga (${debtStats.tenorMonths} bln):`
                        : `Bunga Berjalan (${debtStats.monthsElapsed} bln):`
                      }
                    </span>
                    <span className="font-bold">+ Rp {debtStats.totalInterest.toLocaleString('id-ID')}</span>
                  </div>
                )}

                <div className="border-t border-line/65 my-1" />

                <div className="flex justify-between text-text-primary font-bold">
                  <span>Total Tagihan:</span>
                  <span>Rp {debtStats?.totalOwed.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-green-500">
                  <span>{debt.type === 'hutang' ? 'Sudah Dibayar:' : 'Sudah Diterima:'}</span>
                  <span className="font-bold">Rp {totalPaid.toLocaleString('id-ID')}</span>
                </div>

                <div className="border-t border-line my-1" />

                <div className="flex justify-between text-red-500 font-extrabold">
                  <span>{debt.type === 'hutang' ? 'Sisa Hutang:' : 'Sisa Piutang:'}</span>
                  <span>Rp {debtStats?.remainingOwed.toLocaleString('id-ID')}</span>
                </div>
              </div>

              {/* Payment Amount */}
              <div className="space-y-1.5">
                <label className="block text-[12px] font-semibold text-text-secondary">Nominal Pembayaran (Rp)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[13px] font-bold text-text-muted">Rp</span>
                  <input
                    type="text"
                    required
                    placeholder="0"
                    value={paymentAmountInput}
                    onChange={e => setPaymentAmountInput(formatThousands(e.target.value))}
                    className="input w-full pl-12 pr-4 py-2.5 font-bold text-[14px] text-text-primary bg-surface border border-line rounded-xl outline-none"
                  />
                </div>
              </div>

              {/* Date & Wallet */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-[12px] font-semibold text-text-secondary">Tanggal Pembayaran</label>
                  <div className="relative">
                    <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <input
                      type="date"
                      required
                      value={paymentDate}
                      onChange={e => setPaymentDate(e.target.value)}
                      className="input w-full pl-10 bg-surface border border-line text-[13px] rounded-xl outline-none"
                    />
                  </div>
                </div>
                <ItemTrigger
                  items={accounts}
                  value={paymentAccountId}
                  onClick={() => setPickerMode('paymentAccount')}
                  label={debt.type === 'hutang' ? 'Wallet Sumber Dana' : 'Wallet Penerima Dana'}
                  placeholder="Pilih dompet..."
                />
              </div>

              {/* Payment Notes */}
              <div className="space-y-1.5">
                <label className="block text-[12px] font-semibold text-text-secondary">Catatan (Opsional)</label>
                <input
                  type="text"
                  placeholder="Contoh: Cicilan ke-1, Pelunasan pokok"
                  value={paymentNotes}
                  onChange={e => setPaymentNotes(e.target.value)}
                  className="input w-full bg-surface border border-line rounded-xl px-4 py-2.5 text-[13px] outline-none"
                />
              </div>
            </form>
          )}

          {/* ─── HISTORY MODE (Riwayat Cicilan) ─── */}
          {activeMode === 'history' && debt && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-line pb-2.5">
                <h4 className="text-[12px] font-bold text-text-secondary flex items-center gap-1.5">
                  <Tag className="w-4 h-4 text-accent" />
                  Daftar Transaksi Cicilan
                </h4>
                <span className="text-[11px] text-text-muted">Total: {currentPayments.length} Pembayaran</span>
              </div>

              {currentPayments.length === 0 ? (
                <div className="py-8 text-center bg-surface-alt/25 rounded-xl border border-dashed border-line">
                  <BookOpen className="w-8 h-8 text-text-muted mx-auto mb-2" />
                  <p className="text-[12px] text-text-muted font-medium">Belum ada riwayat cicilan dicatat.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {currentPayments.map(pmt => {
                    const wallet = accounts.find(a => a.id === pmt.account_id);
                    return (
                      <div key={pmt.id} className="p-3 bg-surface-alt/55 border border-line rounded-xl flex items-center justify-between gap-3 group hover:border-accent/30 transition-all">
                        <div className="space-y-1">
                          <p className="text-[13px] font-bold text-text-primary">
                            Rp {pmt.amount.toLocaleString('id-ID')}
                          </p>
                          <div className="flex flex-wrap items-center gap-x-2 text-[10px] text-text-muted">
                            <span>{new Date(pmt.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                            {wallet && (
                              <>
                                <span className="text-line">•</span>
                                <span className="font-semibold text-text-secondary flex items-center gap-0.5">
                                  <Wallet className="w-3 h-3" />
                                  {wallet.name}
                                </span>
                              </>
                            )}
                          </div>
                          {pmt.notes && <p className="text-[11px] text-text-secondary font-medium mt-1">📝 {pmt.notes}</p>}
                        </div>

                        <button
                          type="button"
                          disabled={loading}
                          onClick={() => handleDeletePayment(pmt)}
                          className="p-1.5 text-text-muted hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all md:opacity-0 group-hover:opacity-100 shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ─── SETTLE CONFIRMATION MODE ─── */}
          {activeMode === 'settle' && debt && (
            <form id="settle-form" onSubmit={handleSubmit} className="space-y-4">
              <div className="p-4 bg-yellow-500/5 border border-yellow-500/10 rounded-xl flex gap-3 text-[12px] text-yellow-600 dark:text-yellow-400">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">Konfirmasi Pelunasan</p>
                  <p className="leading-relaxed">
                    Tindakan ini akan menandai status record <strong>"{debt.name}"</strong> menjadi <strong>Lunas</strong>.
                    Perhitungan bunga bulanan flat akan **dikunci** (dihentikan) pada tanggal hari ini.
                  </p>
                </div>
              </div>

              <div className="bg-surface-alt/50 border border-line rounded-xl p-4 text-[12px] space-y-3">
                <div className="flex justify-between">
                  <span className="text-text-secondary">Pihak Terkait:</span>
                  <span className="font-semibold text-text-primary">{debt.counterparty}</span>
                </div>

                <div className="border-t border-line/45 my-1" />

                <div className="flex justify-between">
                  <span className="text-text-secondary">Pokok Awal:</span>
                  <span className="font-semibold text-text-primary">Rp {debtStats?.principal.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Bunga & Tenor:</span>
                  <span className="font-semibold text-text-secondary">
                    {debtStats && debtStats.interestRate > 0
                      ? `${debtStats.interestRate}%/bln (Flat)${debtStats.tenorMonths ? ` • ${debtStats.tenorMonths} Bln` : ''}`
                      : 'Tanpa Bunga'
                    }
                  </span>
                </div>
                {debtStats && debtStats.interestRate > 0 && (
                  <div className="flex justify-between text-yellow-600 dark:text-yellow-400">
                    <span>
                      {debtStats.tenorMonths
                        ? `Total Bunga (${debtStats.tenorMonths} bln):`
                        : `Bunga Berjalan (${debtStats.monthsElapsed} bln):`
                      }
                    </span>
                    <span className="font-bold">+ Rp {debtStats.totalInterest.toLocaleString('id-ID')}</span>
                  </div>
                )}

                <div className="border-t border-line/65 my-1" />

                <div className="flex justify-between text-text-primary font-bold">
                  <span>Total Tagihan:</span>
                  <span>Rp {debtStats?.totalOwed.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-green-500">
                  <span>{debt.type === 'hutang' ? 'Sudah Dibayar:' : 'Sudah Diterima:'}</span>
                  <span className="font-bold">Rp {totalPaid.toLocaleString('id-ID')}</span>
                </div>

                <div className="border-t border-line my-1" />

                <div className="flex justify-between text-red-500 font-extrabold">
                  <span>{debt.type === 'hutang' ? 'Sisa Hutang:' : 'Sisa Piutang:'}</span>
                  <span>Rp {debtStats?.remainingOwed.toLocaleString('id-ID')}</span>
                </div>
              </div>

              <p className="text-[11px] text-text-muted text-center italic">
                *Catatan: Pelunasan status ini tidak mengurangi saldo wallet Anda secara otomatis. Jika ada sisa saldo yang ingin didebet dari wallet, harap buat transaksi "Bayar Cicilan" terlebih dahulu sebelum melunasi.
              </p>
            </form>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-4 border-t border-line bg-surface-alt/20 flex items-center justify-between gap-3">
          {/* Delete Button (Only in edit/settle/history modes) */}
          {activeMode !== 'add' && activeMode !== 'pay' && (
            <button
              type="button"
              disabled={loading}
              onClick={handleDeleteDebt}
              className="px-4 py-2 bg-red-500/10 hover:bg-red-500 hover:text-white border border-red-500/20 text-red-500 text-[12px] font-bold rounded-xl transition-all flex items-center gap-1.5"
            >
              <Trash2 className="w-4 h-4" />
              Hapus Record
            </button>
          )}

          <div className="flex items-center gap-2.5 ml-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border border-line hover:bg-surface-hover text-text-primary text-[12px] font-bold rounded-xl transition-all"
            >
              Batal
            </button>

            {activeMode === 'add' && (
              <button
                type="submit"
                form="debt-form"
                disabled={loading}
                className="px-4 py-2 bg-accent hover:bg-accent-hover text-white text-[12px] font-bold rounded-xl transition-all shadow-lg shadow-accent/20 flex items-center gap-1.5"
              >
                {loading ? 'Menyimpan...' : 'Simpan Hutang / Piutang'}
              </button>
            )}

            {activeMode === 'edit' && (
              <button
                type="submit"
                form="debt-form"
                disabled={loading}
                className="px-4 py-2 bg-accent hover:bg-accent-hover text-white text-[12px] font-bold rounded-xl transition-all shadow-lg shadow-accent/20 flex items-center gap-1.5"
              >
                {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            )}

            {activeMode === 'pay' && (
              <button
                type="submit"
                form="pay-form"
                disabled={loading}
                className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-[12px] font-bold rounded-xl transition-all shadow-lg shadow-green-500/20 flex items-center gap-1.5"
              >
                {loading ? 'Menyimpan...' : 'Catat Pembayaran'}
              </button>
            )}

            {activeMode === 'settle' && (
              <button
                type="submit"
                form="settle-form"
                disabled={loading}
                className="px-4 py-2 bg-accent hover:bg-accent-hover text-white text-[12px] font-bold rounded-xl transition-all shadow-lg shadow-accent/20 flex items-center gap-1.5"
              >
                {loading ? 'Memproses...' : 'Ya, Tandai Lunas'}
              </button>
            )}

            {activeMode === 'history' && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-accent hover:bg-accent-hover text-white text-[12px] font-bold rounded-xl transition-all"
              >
                Selesai
              </button>
            )}
          </div>
        </div>
      </div>
    </div>

      <ItemPicker
        isOpen={pickerMode === 'account'}
        onClose={() => setPickerMode('none')}
        items={accounts}
        onSelect={setAccountId}
        selectedValue={accountId}
        title={type === 'hutang' ? 'Pilih Wallet Penerima' : 'Pilih Wallet Sumber'}
        placeholder="Cari wallet..."
      />

      <ItemPicker
        isOpen={pickerMode === 'paymentAccount'}
        onClose={() => setPickerMode('none')}
        items={accounts}
        onSelect={setPaymentAccountId}
        selectedValue={paymentAccountId}
        title={debt?.type === 'hutang' ? 'Pilih Wallet Sumber' : 'Pilih Wallet Penerima'}
        placeholder="Cari wallet..."
      />
    </>,
    document.body
  );
}
