import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { 
  Wallet, 
  Bank, 
  DeviceMobile, 
  Plus, 
  Eye, 
  EyeSlash 
} from '@phosphor-icons/react';
import { fmt } from '../lib/utils';

export default function WalletPage() {
  const { accounts } = useData();
  const navigate = useNavigate();
  const [showBalance, setShowBalance] = useState(() => {
    const saved = localStorage.getItem('showBalance');
    return saved !== null ? JSON.parse(saved) : true;
  });

  const toggleBalance = () => {
    const newValue = !showBalance;
    setShowBalance(newValue);
    localStorage.setItem('showBalance', JSON.stringify(newValue));
  };

  const totalBalance = accounts.reduce((acc, curr) => acc + Number(curr.balance), 0);

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Wallet Summary Card */}
      <div className="card p-6 border-line bg-surface shadow-sm relative overflow-hidden">
        {/* Abstract background shapes */}
        <div className="absolute right-0 top-0 w-32 h-32 bg-accent/5 rounded-full blur-2xl -mr-8 -mt-8"></div>
        <div className="absolute left-1/3 bottom-0 w-24 h-24 bg-accent/5 rounded-full blur-xl -mb-6"></div>
        
        <div className="relative z-10 space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-[10px] md:text-[11px] font-bold tracking-wider text-text-muted uppercase">Total Saldo Wallet</span>
            <button
              onClick={toggleBalance}
              className="p-1.5 rounded-full bg-surface-alt/50 hover:bg-surface-alt transition-all"
              aria-label={showBalance ? "Sembunyikan saldo" : "Tampilkan saldo"}
            >
              {showBalance ? <EyeSlash size={16} className="text-text-muted" /> : <Eye size={16} className="text-text-muted" />}
            </button>
          </div>
          
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-text-primary">
            {showBalance ? fmt(totalBalance) : '••••••'}
          </h2>
          
          <div className="flex items-center gap-2 pt-2 text-[11px] text-text-muted font-semibold">
            <span className="bg-surface-alt px-2.5 py-1 rounded-full font-bold text-[10px] text-text-secondary">{accounts.length} Akun Terdaftar</span>
            <span>•</span>
            <span>IDR Currency</span>
          </div>
        </div>
      </div>

      {/* Grid Accounts */}
      <div className="card p-5 shadow-sm border-line bg-surface space-y-5">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <h3 className="font-bold text-[15px] text-text-primary flex items-center gap-2">
            <Wallet size={18} weight="duotone" className="text-accent" /> Daftar Akun Anda
          </h3>
          <button 
            onClick={() => navigate('/settings')}
            className="text-[12px] font-bold text-accent hover:text-accent-hover transition-colors flex items-center gap-1"
          >
            <Plus size={14} weight="bold" /> Kelola Akun
          </button>
        </div>
        
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-3">
          {accounts.map(account => {
            const Icon = account.type === 'bank' ? Bank : account.type === 'ewallet' ? DeviceMobile : Wallet;
            return (
              <div 
                key={account.id} 
                className="bg-surface-alt/30 border border-line p-2.5 sm:p-3.5 rounded-2xl shadow-sm hover:border-accent/40 hover:shadow-md transition-all group flex flex-col justify-between min-h-[85px] sm:min-h-[90px]"
              >
                <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                  <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-[6px] sm:rounded-lg bg-surface flex items-center justify-center shrink-0 border border-line">
                    {account.icon_url ? (
                      <img src={account.icon_url} alt={account.name} className="w-3.5 h-3.5 sm:w-4 sm:h-4 object-contain" />
                    ) : (
                      <Icon size={12} className="text-text-muted group-hover:text-accent transition-colors sm:text-[14px]" />
                    )}
                  </div>
                  <span className="font-bold text-[10px] sm:text-[12px] text-text-primary truncate leading-tight">{account.name}</span>
                </div>
                <div>
                  <p className="text-[8px] sm:text-[9px] text-text-muted font-bold uppercase tracking-wider opacity-85 leading-none">Saldo</p>
                  <p className="font-bold text-[11px] sm:text-[13px] text-text-primary mt-0.5 sm:mt-1 truncate">
                    {showBalance ? new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0 }).format(Number(account.balance)) : '••••'}
                  </p>
                </div>
              </div>
            );
          })}
          
          {/* Add New Account Card */}
          <button 
            onClick={() => navigate('/settings')} 
            className="bg-surface-alt/10 flex flex-col items-center justify-center p-2.5 sm:p-3.5 rounded-2xl border-2 border-dashed border-line hover:border-accent/50 hover:bg-accent/5 transition-all min-h-[85px] sm:min-h-[90px] group"
          >
            <div className="flex flex-col items-center gap-1 sm:gap-1.5 text-text-muted group-hover:text-accent transition-colors">
              <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-surface border border-line flex items-center justify-center">
                <Plus size={12} weight="bold" className="sm:text-[14px]" />
              </div>
              <span className="font-bold text-[9px] sm:text-[11px]">Tambah Akun</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
