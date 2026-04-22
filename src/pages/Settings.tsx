import { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Plus, ChevronRight, LogOut } from 'lucide-react';
import clsx from 'clsx';
import SettingsModal from '../components/SettingsModal';
import { toast } from '../components/Toast';
import { fmt } from '../lib/utils';

type SettingTab = 'akun' | 'sumber' | 'kategori' | 'tujuan' | 'wishlist' | 'tagihan';

const tabs: { id: SettingTab; label: string }[] = [
  { id: 'akun', label: 'Akun / Wallet' },
  { id: 'sumber', label: 'Sumber Penghasilan' },
  { id: 'kategori', label: 'Kategori Pengeluaran' },
  { id: 'tujuan', label: 'Tujuan Pengeluaran' },
  { id: 'wishlist', label: 'Wishlist Tabungan' },
  { id: 'tagihan', label: 'Tagihan' },
];

function Section({ title, onAdd, children }: { title: string; onAdd?: () => void; children: React.ReactNode }) {
  return (
    <div className="bg-surface border-y border-line md:border-x md:rounded-2xl md:mx-6 md:mt-6 mt-4 mb-6 relative overflow-hidden">
      <div className="px-5 py-3.5 border-b border-line flex items-center justify-between bg-surface-hover/50">
        <h2 className="text-[14px] font-bold text-text-primary tracking-tight">{title}</h2>
        {onAdd && (
          <button onClick={onAdd} className="bg-accent/10 text-accent hover:bg-accent/20 active:scale-95 transition-all text-[12px] font-semibold gap-1 px-3 py-1.5 rounded-full flex items-center">
            <Plus className="w-3.5 h-3.5" /> Tambah Baru
          </button>
        )}
      </div>
      <div>{children}</div>
    </div>
  );
}

function Item({ label, sub, trailing, iconUrl, onClick }: { label: string; sub?: string; trailing?: string; iconUrl?: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center justify-between px-5 py-3.5 border-b border-line last:border-0 hover:bg-surface-hover transition-colors text-left active:bg-surface-alt group cursor-pointer">
      <div className="flex items-center gap-4">
        {iconUrl && (
          <img src={iconUrl} alt={label} className="w-10 h-10 rounded-xl object-cover object-center bg-surface border border-line flex-shrink-0" />
        )}
        <div>
          <p className="text-[14px] font-semibold text-text-primary group-hover:text-accent transition-colors">{label}</p>
          {sub && <p className="text-[12px] font-medium text-text-muted mt-0.5">{sub}</p>}
        </div>
      </div>
      <div className="flex items-center gap-3">
        {trailing && <span className="text-[13px] font-semibold text-text-primary">{trailing}</span>}
        <ChevronRight className="w-4 h-4 text-text-muted opacity-50 group-hover:opacity-100 group-hover:text-accent transition-all" />
      </div>
    </button>
  );
}

export default function Settings() {
  const [activeTab, setActiveTab] = useState<SettingTab>('akun');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  
  const { user, logout } = useAuth();
  const { accounts, sources, categories, purposes, wishlists, billPurposes, refresh } = useData();

  const handleSave = async (data: any, isEdit: boolean) => {
    if (!user) return;
    
    let table = '';
    let payload: any = { name: data.name, user_id: user.id };

    if (activeTab === 'akun') {
      table = 'accounts';
      payload.balance = data.balance;
      payload.type = data.type;
      if (data.iconUrl) payload.icon_url = data.iconUrl;
    } else if (activeTab === 'sumber') {
      table = 'income_sources';
    } else if (activeTab === 'kategori') {
      table = 'expense_categories';
    } else if (activeTab === 'tujuan') {
      table = 'expense_purposes';
    } else if (activeTab === 'wishlist') {
      table = 'wishlists';
      payload.target_amount = data.targetAmount;
      payload.current_amount = data.currentAmount;
    } else if (activeTab === 'tagihan') {
      table = 'bill_purposes';
    }

    try {
      const { error } = isEdit 
        ? await supabase.from(table).update(payload).eq('id', data.id)
        : await supabase.from(table).insert([payload]);
        
      if (error) throw error;
      await refresh();
      toast.success('Data berhasil disimpan!');
    } catch (err: any) {
      toast.error('Terjadi kesalahan: ' + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!user) return;

    const tableMap: Record<SettingTab, string> = {
      akun: 'accounts',
      sumber: 'income_sources',
      kategori: 'expense_categories',
      tujuan: 'expense_purposes',
      wishlist: 'wishlists',
      tagihan: 'bill_purposes',
    };

    const table = tableMap[activeTab];

    try {
      // Referential Integrity Checks
      if (activeTab === 'akun') {
        const { count } = await supabase
          .from('transactions')
          .select('*', { count: 'exact', head: true })
          .is('deleted_at', null)
          .or(`from_account_id.eq.${id},to_account_id.eq.${id}`);
        
        if (count && count > 0) {
          toast.error(`Tidak bisa hapus: Akun masih digunakan di ${count} transaksi`);
          return;
        }
      } 
      else if (activeTab === 'kategori') {
        const { count } = await supabase
          .from('transactions')
          .select('*', { count: 'exact', head: true })
          .is('deleted_at', null)
          .eq('category_id', id);
        
        if (count && count > 0) {
          toast.error(`Tidak bisa hapus: Kategori masih digunakan di ${count} transaksi`);
          return;
        }
      }
      else if (activeTab === 'tujuan') {
        const { count } = await supabase
          .from('transactions')
          .select('*', { count: 'exact', head: true })
          .is('deleted_at', null)
          .eq('purpose_id', id);
        
        if (count && count > 0) {
          toast.error(`Tidak bisa hapus: Tujuan masih digunakan di ${count} transaksi`);
          return;
        }
      }
      else if (activeTab === 'wishlist') {
        const { count } = await supabase
          .from('transactions')
          .select('*', { count: 'exact', head: true })
          .is('deleted_at', null)
          .eq('wishlist_id', id);
        
        if (count && count > 0) {
          toast.error(`Tidak bisa hapus: Wishlist masih digunakan di ${count} transaksi tabungan`);
          return;
        }
      }
      else if (activeTab === 'sumber') {
        const { count } = await supabase
          .from('transactions')
          .select('*', { count: 'exact', head: true })
          .is('deleted_at', null)
          .eq('source_id', id);
        
        if (count && count > 0) {
          toast.error(`Tidak bisa hapus: Sumber masih digunakan di ${count} transaksi`);
          return;
        }
      }
      else if (activeTab === 'tagihan') {
        const { count } = await supabase
          .from('transactions')
          .select('*', { count: 'exact', head: true })
          .is('deleted_at', null)
          .eq('bill_purpose_id', id);
        
        if (count && count > 0) {
          toast.error(`Tidak bisa hapus: Tagihan masih digunakan di ${count} transaksi`);
          return;
        }
      }

      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
      await refresh();
      toast.success('Data berhasil dihapus.');
    } catch (err: any) {
      toast.error('Gagal menghapus: ' + err.message);
    }
  };

  const typeLabel: Record<string, string> = { bank: 'Bank', ewallet: 'E-Wallet', cash: 'Cash', investasi: 'Investasi' };

  return (
    <div className="pb-8">
      {/* Profil Singkat Edge-to-Edge */}
      <div className="bg-surface border-b border-line px-5 py-6 mb-2 flex items-center gap-4 md:rounded-b-3xl shadow-sm md:mx-6 md:border-x">
        <div className="w-14 h-14 rounded-full bg-accent/10 border-2 border-accent/20 flex items-center justify-center font-bold text-2xl text-accent overflow-hidden shadow-inner">
           {user?.user_metadata?.avatar_url ? (
             <img src={user.user_metadata.avatar_url} alt="Profile" className="w-full h-full object-cover" />
           ) : (
             (user?.user_metadata?.name || user?.user_metadata?.full_name || user?.email || 'U').charAt(0).toUpperCase()
           )}
        </div>
        <div>
           <h2 className="text-lg font-bold text-text-primary tracking-tight">{user?.user_metadata?.name || user?.user_metadata?.full_name || user?.email?.split('@')[0]}</h2>
           <p className="text-[13px] text-text-muted bg-surface-alt px-2 py-0.5 rounded-full inline-flex font-medium mt-1">{user?.email}</p>
        </div>
      </div>

      {/* Modern Tabs */}
      {/* Modern Tabs */}
      <div className="px-4 md:px-6 md:px-0 md:mx-6 mt-4">
        <div className="flex bg-surface-alt/10 dark:bg-surface-alt/40 p-1 rounded-2xl border border-line w-full overflow-x-auto no-scrollbar gap-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                "px-2 md:px-5 py-2 rounded-xl text-[11px] md:text-[12px] font-bold transition-all whitespace-nowrap uppercase tracking-wider flex-1 text-center",
                activeTab === tab.id
                  ? "bg-accent text-bg shadow-md shadow-accent/10 dark:shadow-accent/5"
                  : "text-text-muted hover:text-text-primary hover:bg-surface-hover"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-2 min-h-[50vh]">
        {activeTab === 'akun' && (
          <Section title="Akun / Wallet Finansial" onAdd={() => { setEditingItem(null); setIsModalOpen(true); }}>
             {accounts.map(a => <Item key={a.id} label={a.name} sub={typeLabel[a.type]} trailing={fmt(Number(a.balance))} iconUrl={a.icon_url || undefined} onClick={() => { setEditingItem(a); setIsModalOpen(true); }} />)}
            {accounts.length === 0 && <p className="text-center text-sm font-medium text-text-muted py-8">Belum ada akun diatur.</p>}
          </Section>
        )}

        {activeTab === 'sumber' && (
          <Section title="Sumber Penghasilan Anda" onAdd={() => { setEditingItem(null); setIsModalOpen(true); }}>
            {sources.map(s => <Item key={s.id} label={s.name} onClick={() => { setEditingItem(s); setIsModalOpen(true); }} />)}
            {sources.length === 0 && <p className="text-center text-sm font-medium text-text-muted py-8">Belum ada sumber penghasilan diatur.</p>}
          </Section>
        )}

        {activeTab === 'kategori' && (
          <Section title="Kategori Pengeluaran" onAdd={() => { setEditingItem(null); setIsModalOpen(true); }}>
            {categories.map(c => <Item key={c.id} label={c.name} onClick={() => { setEditingItem(c); setIsModalOpen(true); }} />)}
            {categories.length === 0 && <p className="text-center text-sm font-medium text-text-muted py-8">Belum ada kategori pengeluaran.</p>}
          </Section>
        )}

        {activeTab === 'tujuan' && (
          <Section title="Tujuan Pengeluaran" onAdd={() => { setEditingItem(null); setIsModalOpen(true); }}>
            {purposes.map(p => {
              return <Item key={p.id} label={p.name} onClick={() => { setEditingItem(p); setIsModalOpen(true); }} />;
            })}
            {purposes.length === 0 && <p className="text-center text-sm font-medium text-text-muted py-8">Belum ada tujuan pengeluaran.</p>}
          </Section>
        )}

        {activeTab === 'wishlist' && (
          <Section title="Wishlist & Target Spesial" onAdd={() => { setEditingItem(null); setIsModalOpen(true); }}>
            {wishlists.map(w => <Item key={w.id} label={w.name} sub={`Target: ${fmt(Number(w.target_amount))}`} trailing={fmt(Number(w.current_amount))} onClick={() => { setEditingItem({...w, targetAmount: w.target_amount, currentAmount: w.current_amount}); setIsModalOpen(true); }} />)}
            {wishlists.length === 0 && <p className="text-center text-sm font-medium text-text-muted py-8">Belum ada target wishlist.</p>}
          </Section>
        )}

        {activeTab === 'tagihan' && (
          <Section title="Daftar Tagihan" onAdd={() => { setEditingItem(null); setIsModalOpen(true); }}>
            {billPurposes.map(b => <Item key={b.id} label={b.name} onClick={() => { setEditingItem(b); setIsModalOpen(true); }} />)}
            {billPurposes.length === 0 && <p className="text-center text-sm font-medium text-text-muted py-8">Belum ada tagihan diatur.</p>}
          </Section>
        )}
      </div>

      {/* Huge Action Bottom */}
      <div className="px-4 md:px-6 mt-12 mb-8">
         <button onClick={logout} className="w-full bg-danger/10 hover:bg-danger/20 text-danger border border-danger/20 hover:border-danger/40 transition-colors rounded-2xl py-4 flex items-center justify-center gap-2 font-bold text-[15px] active:scale-[0.98]">
            <LogOut className="w-5 h-5" />
            Keluar Dari Akun
         </button>
         <p className="text-center text-[11px] text-text-muted mt-4 font-medium opacity-60">Koin Ku App Versi 2.0.0</p>
      </div>

      <SettingsModal 
        isOpen={isModalOpen} 
        onClose={() => { setIsModalOpen(false); setEditingItem(null); }} 
        type={activeTab} 
        onSave={handleSave} 
        onDelete={handleDelete}
        initialData={editingItem}
      />
    </div>
  );
}
