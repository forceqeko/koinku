import { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Plus, ChevronRight, LogOut, ArrowUpDown, ChevronUp, ChevronDown, Check, Sliders } from 'lucide-react';
import clsx from 'clsx';
import SettingsModal from '../components/SettingsModal';
import EditProfileModal from '../components/EditProfileModal';
import AppSettingsModal from '../components/AppSettingsModal';
import { toast } from '../components/Toast';
import { fmt } from '../lib/utils';
import { getPurposeIcon, getCategoryColor } from '../lib/icons';

type SettingTab = 'akun' | 'sumber' | 'kategori' | 'tujuan' | 'wishlist' | 'tagihan';

const tabs: { id: SettingTab; label: string }[] = [
  { id: 'akun', label: 'Akun / Wallet' },
  { id: 'sumber', label: 'Sumber' },
  { id: 'kategori', label: 'Kategori' },
  { id: 'tujuan', label: 'Tujuan' },
  { id: 'wishlist', label: 'Wishlist' },
  { id: 'tagihan', label: 'Tagihan' },
];

function Section({
  title,
  onAdd,
  headerAction,
  children
}: {
  title: string;
  onAdd?: () => void;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-surface border-y border-line md:border-x md:rounded-2xl md:mx-6 md:mt-6 mt-4 mb-6 relative overflow-hidden">
      <div className="px-5 py-3.5 border-b border-line flex items-center justify-between bg-surface-hover/50">
        <h2 className="text-[14px] font-bold text-text-primary tracking-tight">{title}</h2>
        <div className="flex items-center gap-2">
          {headerAction}
          {onAdd && (
            <button onClick={onAdd} className="bg-accent/10 text-accent hover:bg-accent/20 active:scale-95 transition-all text-[12px] font-semibold gap-1 px-3 py-1.5 rounded-full flex items-center">
              <Plus className="w-3.5 h-3.5" /> Tambah Baru
            </button>
          )}
        </div>
      </div>
      <div>{children}</div>
    </div>
  );
}

function Item({
  label,
  sub,
  trailing,
  iconUrl,
  iconComp,
  iconBg,
  onClick,
  isReordering,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast
}: {
  label: string;
  sub?: string;
  trailing?: string;
  iconUrl?: string;
  iconComp?: React.ReactNode;
  iconBg?: string;
  onClick?: () => void;
  isReordering?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
}) {
  const content = (
    <>
      <div className="flex items-center gap-4 flex-1 min-w-0">
        {iconUrl && (
          <img src={iconUrl} alt={label} className="w-10 h-10 rounded-xl object-cover object-center bg-surface border border-line flex-shrink-0" />
        )}
        {iconComp && (
          <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border", iconBg || "bg-accent/15 border border-accent/25 text-accent")}>
            {iconComp}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className={clsx("text-[14px] font-semibold text-text-primary transition-colors truncate", !isReordering && "group-hover:text-accent")}>{label}</p>
          {sub && <p className="text-[12px] font-medium text-text-muted mt-0.5 truncate">{sub}</p>}
        </div>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        {trailing && <span className="text-[13px] font-semibold text-text-primary">{trailing}</span>}
        {isReordering ? (
          <div className="flex items-center gap-1 bg-surface-alt dark:bg-surface-alt/80 p-0.5 rounded-lg border border-line">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onMoveUp) onMoveUp();
              }}
              disabled={isFirst}
              className={clsx(
                "p-1 rounded-md transition-all flex items-center justify-center",
                isFirst
                  ? "opacity-25 cursor-not-allowed text-text-muted"
                  : "text-text-primary hover:bg-accent/15 hover:text-accent active:scale-90"
              )}
              title="Pindahkan Ke Atas"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
            <div className="w-[1px] h-3.5 bg-line align-self-stretch my-auto" />
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onMoveDown) onMoveDown();
              }}
              disabled={isLast}
              className={clsx(
                "p-1 rounded-md transition-all flex items-center justify-center",
                isLast
                  ? "opacity-25 cursor-not-allowed text-text-muted"
                  : "text-text-primary hover:bg-accent/15 hover:text-accent active:scale-90"
              )}
              title="Pindahkan Ke Bawah"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <ChevronRight className="w-4 h-4 text-text-muted opacity-50 group-hover:opacity-100 group-hover:text-accent transition-all" />
        )}
      </div>
    </>
  );

  if (isReordering) {
    return (
      <div className="w-full flex items-center justify-between px-5 py-3.5 border-b border-line last:border-0 transition-colors text-left bg-surface-hover/20">
        {content}
      </div>
    );
  }

  return (
    <button onClick={onClick} className="w-full flex items-center justify-between px-5 py-3.5 border-b border-line last:border-0 hover:bg-surface-hover transition-colors text-left active:bg-surface-alt group cursor-pointer">
      {content}
    </button>
  );
}

export default function Settings() {
  const [activeTab, setActiveTab] = useState<SettingTab>('akun');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isAppSettingsOpen, setIsAppSettingsOpen] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  
  const { user, logout } = useAuth();
  const { accounts, sources, categories, purposes, wishlists, billPurposes, refresh } = useData();

  console.log('DEBUG [Purposes in Settings]:', purposes);

  const handleMoveAccount = async (idx: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= accounts.length) return;

    const newAccounts = [...accounts];
    const temp = newAccounts[idx];
    newAccounts[idx] = newAccounts[targetIdx];
    newAccounts[targetIdx] = temp;

    const orderIds = newAccounts.map(a => a.id);
    localStorage.setItem('account_order_ids', JSON.stringify(orderIds));
    await refresh();
  };

  const handleSave = async (data: any, isEdit: boolean) => {
    if (!user) return false;
    
    let table = '';
    let payload: any = { name: data.name, user_id: user.id };

    if (activeTab === 'akun') {
      table = 'accounts';
      payload.initial_balance = data.initialBalance;
      if (isEdit) {
        payload.balance = data.currentBalance;
      } else {
        payload.balance = data.initialBalance;
      }
      payload.type = data.type;
      if (data.iconUrl) payload.icon_url = data.iconUrl;
    } else if (activeTab === 'sumber') {
      table = 'income_sources';
    } else if (activeTab === 'kategori') {
      table = 'expense_categories';
    } else if (activeTab === 'tujuan') {
      table = 'expense_purposes';
      if (data.icon) payload.icon = data.icon;
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
      return true;
    } catch (err: any) {
      toast.error('Terjadi kesalahan: ' + err.message);
      return false;
    }
  };

  const handleDelete = async (id: string) => {
    if (!user) return false;

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
          return false;
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
          return false;
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
          return false;
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
          return false;
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
          return false;
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
          return false;
        }
      }

      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
      await refresh();
      toast.success('Data berhasil dihapus.');
      return true;
    } catch (err: any) {
      toast.error('Gagal menghapus: ' + err.message);
      return false;
    }
  };

  const typeLabel: Record<string, string> = { bank: 'Bank', ewallet: 'E-Wallet', cash: 'Cash', investasi: 'Investasi' };

  return (
    <div className="pb-8">
      {/* Profil Singkat Edge-to-Edge */}
      <div className="bg-surface border-b border-line px-5 py-6 mb-2 flex items-center justify-between gap-4 md:rounded-b-3xl shadow-sm md:mx-6 md:border-x">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-14 h-14 rounded-full bg-accent/10 border-2 border-accent/20 flex items-center justify-center font-bold text-2xl text-accent overflow-hidden shadow-inner shrink-0">
             {user?.user_metadata?.show_avatar !== false && user?.user_metadata?.avatar_url ? (
               <img src={user.user_metadata.avatar_url} alt="Profile" className="w-full h-full object-cover" />
             ) : (
               (user?.user_metadata?.name || user?.user_metadata?.full_name || user?.email || 'U').charAt(0).toUpperCase()
             )}
          </div>
          <div className="min-w-0 flex-1">
             <h2 className="text-lg font-bold text-text-primary tracking-tight truncate">{user?.user_metadata?.name || user?.user_metadata?.full_name || user?.email?.split('@')[0]}</h2>
             <p className="text-[13px] text-text-muted bg-surface-alt px-2 py-0.5 rounded-full inline-flex font-medium mt-1 truncate max-w-full">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={() => setIsEditProfileOpen(true)}
          className="px-4 py-2 bg-surface hover:bg-surface-hover border border-line hover:border-accent/30 text-text-primary hover:text-accent font-bold text-[12px] rounded-xl transition-all shadow-sm flex items-center gap-1.5 shrink-0 active:scale-95"
        >
          ✏️ Edit Profil
        </button>
      </div>

      {/* Modern Tabs */}
      <div className="px-4 md:px-0 md:mx-6 mt-4">
        <div className="flex md:grid md:grid-cols-6 bg-surface-alt/10 dark:bg-surface-alt/40 p-1 rounded-2xl border border-line w-full overflow-x-auto md:overflow-visible no-scrollbar gap-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setIsReordering(false); }}
              className={clsx(
                "px-2 md:px-3 py-2 rounded-xl text-[11px] md:text-[12px] leading-tight font-bold transition-all whitespace-nowrap md:whitespace-normal uppercase md:normal-case tracking-wider md:tracking-normal flex-1 md:flex md:items-center md:justify-center text-center",
                activeTab === tab.id
                  ? "bg-accent text-bg shadow-md shadow-accent/10 dark:shadow-accent/5 font-bold"
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
           <Section
             title="Akun / Wallet Finansial"
             onAdd={isReordering ? undefined : () => { setEditingItem(null); setIsModalOpen(true); }}
             headerAction={
               accounts.length > 1 && (
                 <button
                   onClick={() => setIsReordering(!isReordering)}
                   className={clsx(
                     "text-[12px] font-semibold gap-1.5 px-3 py-1.5 rounded-full flex items-center transition-all active:scale-95",
                     isReordering
                       ? "bg-accent text-bg shadow-md shadow-accent/10 dark:shadow-accent/5 font-bold"
                       : "bg-surface-alt hover:bg-surface-hover border border-line text-text-primary"
                   )}
                 >
                   {isReordering ? (
                     <>
                       <Check className="w-3.5 h-3.5" /> Selesai
                     </>
                   ) : (
                     <>
                       <ArrowUpDown className="w-3.5 h-3.5 animate-pulse" /> Atur Urutan
                     </>
                   )}
                 </button>
               )
             }
           >
             {accounts.map((a, idx) => (
               <Item
                 key={a.id}
                 label={a.name}
                 sub={`${typeLabel[a.type]} • Saldo awal ${fmt(Number(a.initial_balance ?? a.balance ?? 0))}`}
                 trailing={fmt(Number(a.balance))}
                 iconUrl={a.icon_url || undefined}
                 onClick={() => { setEditingItem(a); setIsModalOpen(true); }}
                 isReordering={isReordering}
                 onMoveUp={() => handleMoveAccount(idx, 'up')}
                 onMoveDown={() => handleMoveAccount(idx, 'down')}
                 isFirst={idx === 0}
                 isLast={idx === accounts.length - 1}
               />
             ))}
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
              const IconComp = getPurposeIcon(p.icon);
              const colorClass = getCategoryColor(p.icon);
              return (
                <Item 
                  key={p.id} 
                  label={p.name} 
                  iconComp={<IconComp className="w-5 h-5" />}
                  iconBg={colorClass}
                  onClick={() => { setEditingItem(p); setIsModalOpen(true); }} 
                />
              );
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
      <div className="px-4 md:px-6 mt-6 mb-8 space-y-3">
         <button 
           onClick={() => setIsAppSettingsOpen(true)} 
           className="w-full bg-accent/10 hover:bg-accent/20 text-accent border border-accent/20 hover:border-accent/40 transition-colors rounded-2xl py-4 flex items-center justify-center gap-2 font-bold text-[15px] active:scale-[0.98]"
         >
            <Sliders className="w-5 h-5" />
            Pengaturan Aplikasi
         </button>

         <button 
           onClick={logout} 
           className="w-full bg-danger/10 hover:bg-danger/20 text-danger border border-danger/20 hover:border-danger/40 transition-colors rounded-2xl py-4 flex items-center justify-center gap-2 font-bold text-[15px] active:scale-[0.98]"
         >
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

      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
      />

      {/* App Settings Modal */}
      <AppSettingsModal
        isOpen={isAppSettingsOpen}
        onClose={() => setIsAppSettingsOpen(false)}
      />
    </div>
  );
}
