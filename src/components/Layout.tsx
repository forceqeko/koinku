import { useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import Sidebar, { navItems } from './Sidebar';
import Topbar from './Topbar';
import TransactionModal from './TransactionModal';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { toast } from './Toast';
import clsx from 'clsx';
import { Plus } from 'lucide-react';

export default function Layout() {
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const { refresh } = useData();
  const { user } = useAuth();
  const location = useLocation();

  const adjustBalance = async (accountId: string, delta: number) => {
    const { error } = await supabase.rpc('adjust_account_balance', { account_id: accountId, delta });
    if (error) throw new Error(error.message);
  };

  const adjustWishlist = async (wishlistId: string, delta: number) => {
    const { error } = await supabase.rpc('adjust_wishlist_amount', { wl_id: wishlistId, delta });
    if (error) throw new Error(error.message);
  };

  const applyBalanceChanges = async (tx: any) => {
    const amt = Number(tx.amount);
    const fee = Number(tx.admin_fee || 0);

    if (tx.type === 'income') {
      if (!tx.to_account_id) throw new Error('Akun tujuan wajib dipilih untuk pemasukan');
      await adjustBalance(tx.to_account_id, amt);
    } else if (tx.type === 'expense') {
      if (!tx.from_account_id) throw new Error('Akun sumber wajib dipilih untuk pengeluaran');
      await adjustBalance(tx.from_account_id, -amt);
    } else if (tx.type === 'transfer' || tx.type === 'saving') {
      if (!tx.from_account_id) throw new Error('Akun sumber wajib dipilih');
      if (!tx.to_account_id) throw new Error('Akun tujuan wajib dipilih');
      await adjustBalance(tx.from_account_id, -(amt + fee));
      await adjustBalance(tx.to_account_id, amt);
    }

    if (tx.type === 'saving' && tx.wishlist_id) {
      await adjustWishlist(tx.wishlist_id, amt);
    }
  };

  const handleQuickAdd = async (txData: any) => {
    let insertedTxId: string | null = null;
    
    try {
      // 1. Validate before insert
      if (!txData.type) throw new Error('Tipe transaksi wajib dipilih');
      if (!txData.amount || Number(txData.amount) <= 0) throw new Error('Jumlah harus lebih dari 0');
      if (!txData.description?.trim()) throw new Error('Deskripsi wajib diisi');

      // 2. Insert transaction
      const { data: insertedData, error: insertError } = await supabase
        .from('transactions')
        .insert([{ ...txData, user_id: user?.id }])
        .select('id')
        .single();
      
      if (insertError) throw insertError;
      insertedTxId = insertedData?.id;

      // 3. Apply balance changes with rollback on failure
      try {
        await applyBalanceChanges(txData);
      } catch (balanceError: any) {
        // Rollback: Delete the inserted transaction
        if (insertedTxId) {
          await supabase.from('transactions').delete().eq('id', insertedTxId);
        }
        throw balanceError;
      }

      // 4. Auto-create expense for admin fee
      if ((txData.type === 'transfer' || txData.type === 'saving') && Number(txData.admin_fee) > 0) {
        const { data: cats } = await supabase.from('expense_categories').select('id').eq('name', 'Kebutuhan Lainnya').limit(1);
        const { data: purps } = await supabase.from('expense_purposes').select('id').eq('name', 'Admin').limit(1);
        
        if (cats?.length && purps?.length) {
          await supabase.from('transactions').insert([{
            user_id: user?.id,
            date: txData.date,
            type: 'expense',
            description: `Biaya Admin - ${txData.description}`,
            amount: Number(txData.admin_fee),
            from_account_id: txData.from_account_id,
            category_id: cats[0].id,
            purpose_id: purps[0].id,
          }]);
        }
      }

      await refresh();
      toast.success('Transaksi berhasil ditambahkan!');
    } catch (err: any) {
      // Rollback if transaction was inserted but something else failed
      if (insertedTxId) {
        await supabase.from('transactions').delete().eq('id', insertedTxId);
        await refresh();
      }
      toast.error('Gagal: ' + err.message);
    }
  };

  return (
    <div className="min-h-screen flex bg-bg relative">
      <Sidebar onQuickAdd={() => setQuickAddOpen(true)} />

      <div className="flex-1 flex flex-col min-w-0 pb-[84px] md:pb-0 md:pl-[240px]">
        <Topbar />
        <main className="flex-1 overflow-y-auto w-full h-[calc(100vh-60px)]">
          <div className="max-w-[1100px] mx-auto page-transition-shell">
            <div
              key={`${location.pathname}${location.search}`}
              className="page-transition-stage"
            >
              <Outlet />
            </div>
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-surface border-t border-line z-50 flex items-center justify-between px-4 h-16 shadow-[0_-4px_12px_rgba(0,0,0,0.02)] pb-[env(safe-area-inset-bottom)]" aria-label="Navigasi utama">
        {navItems.slice(0, 2).map(item => {
           const Icon = item.icon;
           return (
             <NavLink key={item.name} to={item.path} end={item.path === '/'} aria-label={item.name} className={({ isActive }) => clsx("flex flex-col items-center justify-center w-14 h-full gap-1 transition-colors relative", isActive ? "text-accent" : "text-text-muted hover:text-text-secondary")}>
               {({ isActive }) => (
                 <>
                   {isActive && <div className="absolute top-0 inset-x-0 h-[2px] bg-accent rounded-b-full"></div>}
                   <Icon className={clsx("w-5 h-5", isActive && "fill-accent-muted")} />
                   <span className="text-[10px] font-medium">{item.name}</span>
                 </>
               )}
             </NavLink>
           );
        })}

        <div className="relative -top-5 flex justify-center w-[60px]">
          <button
            onClick={() => setQuickAddOpen(true)}
            aria-label="Tambah transaksi baru"
            className="w-[52px] h-[52px] bg-accent hover:bg-accent-hover text-bg rounded-full shadow-lg shadow-accent/20 dark:shadow-none flex items-center justify-center active:scale-95 transition-transform border-[3px] border-surface"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>

        {navItems.slice(2, 4).map(item => {
           const Icon = item.icon;
           return (
             <NavLink key={item.name} to={item.path} end={item.path === '/'} aria-label={item.name} className={({ isActive }) => clsx("flex flex-col items-center justify-center w-14 h-full gap-1 transition-colors relative", isActive ? "text-accent" : "text-text-muted hover:text-text-secondary")}>
               {({ isActive }) => (
                 <>
                   {isActive && <div className="absolute top-0 inset-x-0 h-[2px] bg-accent rounded-b-full"></div>}
                   <Icon className={clsx("w-5 h-5", isActive && "fill-accent-muted")} />
                   <span className="text-[10px] font-medium">{item.name}</span>
                 </>
               )}
             </NavLink>
           );
        })}
      </nav>

      {/* Quick Add Transaction Modal (from + button) */}
      <TransactionModal
        isOpen={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        onAdd={handleQuickAdd}
        type="expense"
      />
    </div>
  );
}
