import { useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import Sidebar, { navItems } from './Sidebar';
import Topbar from './Topbar';
import TransactionModal from './TransactionModal';
import ReceiptScanModal from './ReceiptScanModal';
import { useData } from '../context/DataContext';
import { supabase } from '../lib/supabase';
import { toast } from './Toast';
import clsx from 'clsx';
import { Scan } from 'lucide-react';

export default function Layout() {
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const { accounts, categories, purposes, refresh } = useData();
  const location = useLocation();

  const handleQuickAdd = async (txData: Record<string, unknown>) => {
    try {
      if (!txData.type) throw new Error('Tipe transaksi wajib dipilih');
      if (!txData.amount || Number(txData.amount) <= 0) throw new Error('Jumlah harus lebih dari 0');
      const description = typeof txData.description === 'string' ? txData.description.trim() : '';
      if (!description) throw new Error('Deskripsi wajib diisi');

      const { error } = await supabase.rpc('create_transaction_atomic', {
        payload: txData,
      });
      if (error) throw error;

      await refresh();
      toast.success('Transaksi berhasil ditambahkan!');
    } catch (err: any) {
      toast.error('Gagal: ' + err.message);
    }
  };

  const handleScanAdd = async (txData: Record<string, unknown>) => {
    const { error } = await supabase.rpc('create_transaction_atomic', {
      payload: txData,
    });
    if (error) throw error;
    await refresh();
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
        {navItems.filter(item => item.path === '/' || item.path === '/transactions').map(item => {
           const Icon = item.icon;
           return (
             <NavLink key={item.name} to={item.path} end={item.path === '/'} aria-label={item.name} className={({ isActive }) => clsx("flex flex-col items-center justify-center w-14 h-full gap-1 transition-colors relative", isActive ? "text-accent" : "text-text-muted hover:text-text-secondary")}>
               {({ isActive }) => (
                 <>
                   {isActive && <div className="absolute top-0 inset-x-0 h-[2px] bg-accent rounded-b-full"></div>}
                   <Icon size={20} weight={isActive ? "duotone" : "regular"} />
                   <span className="text-[10px] font-medium">{item.name}</span>
                 </>
               )}
             </NavLink>
           );
        })}

        <div className="relative -top-5 flex justify-center w-[60px]">
          <button
            onClick={() => setScanOpen(true)}
            aria-label="Scan struk belanja"
            className="w-[52px] h-[52px] bg-accent hover:bg-accent-hover text-bg rounded-full shadow-lg shadow-accent/20 dark:shadow-none flex items-center justify-center active:scale-95 transition-transform border-[3px] border-surface"
          >
            <Scan size={24} />
          </button>
        </div>

        {navItems.filter(item => item.path === '/report' || item.path === '/settings').map(item => {
           const Icon = item.icon;
           return (
             <NavLink key={item.name} to={item.path} end={item.path === '/'} aria-label={item.name} className={({ isActive }) => clsx("flex flex-col items-center justify-center w-14 h-full gap-1 transition-colors relative", isActive ? "text-accent" : "text-text-muted hover:text-text-secondary")}>
               {({ isActive }) => (
                 <>
                   {isActive && <div className="absolute top-0 inset-x-0 h-[2px] bg-accent rounded-b-full"></div>}
                   <Icon size={20} weight={isActive ? "duotone" : "regular"} />
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

      <ReceiptScanModal
        isOpen={scanOpen}
        onClose={() => setScanOpen(false)}
        onAddTransaction={handleScanAdd}
        accounts={accounts}
        categories={categories}
        purposes={purposes}
      />
    </div>
  );
}
