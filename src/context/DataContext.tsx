import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import type {
  Account,
  ExpenseCategory,
  ExpensePurpose,
  IncomeSource,
  Wishlist,
  Transaction,
  BillPurpose
} from '../types';

export interface DataContextType {
  accounts: Account[];
  categories: ExpenseCategory[];
  purposes: ExpensePurpose[];
  sources: IncomeSource[];
  wishlists: Wishlist[];
  billPurposes: BillPurpose[];
  transactions: Transaction[];
  loading: boolean;
  refresh: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [data, setData] = useState<{
    accounts: Account[];
    categories: ExpenseCategory[];
    purposes: ExpensePurpose[];
    sources: IncomeSource[];
    wishlists: Wishlist[];
    billPurposes: BillPurpose[];
    transactions: Transaction[];
  }>({
    accounts: [],
    categories: [],
    purposes: [],
    sources: [],
    wishlists: [],
    billPurposes: [],
    transactions: []
  });
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    if (!user) return;
    setLoading(true);
    
    try {
      const [acc, cat, pur, src, wsh, bill, txn] = await Promise.all([
        supabase.from('accounts').select('*').eq('user_id', user.id).order('created_at'),
        supabase.from('expense_categories').select('*').eq('user_id', user.id).order('created_at'),
        supabase.from('expense_purposes').select('*').eq('user_id', user.id).order('created_at'),
        supabase.from('income_sources').select('*').eq('user_id', user.id).order('created_at'),
        supabase.from('wishlists').select('*').eq('user_id', user.id).order('created_at'),
        supabase.from('bill_purposes').select('*').eq('user_id', user.id).order('created_at'),
        supabase
          .from('transactions')
          .select('*')
          .eq('user_id', user.id)
          .is('deleted_at', null)
          .order('date', { ascending: false })
      ]);
      
      const rawAccounts = acc.data || [];
      let sortedAccounts = rawAccounts;
      const savedOrder = localStorage.getItem('account_order_ids');
      if (savedOrder) {
        try {
          const orderIds: string[] = JSON.parse(savedOrder);
          sortedAccounts = [...rawAccounts].sort((a, b) => {
            const indexA = orderIds.indexOf(a.id);
            const indexB = orderIds.indexOf(b.id);
            if (indexA !== -1 && indexB !== -1) return indexA - indexB;
            if (indexA !== -1) return -1;
            if (indexB !== -1) return 1;
            return 0;
          });
        } catch (e) {
          console.error('Failed to sort accounts by custom order', e);
        }
      }

      setData({
        accounts: sortedAccounts,
        categories: cat.data || [],
        purposes: pur.data || [],
        sources: src.data || [],
        wishlists: wsh.data || [],
        billPurposes: bill.data || [],
        transactions: txn.data || []
      });
    } catch (err) {
      console.error('Failed to load data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      refresh();
    } else {
      setData({ accounts: [], categories: [], purposes: [], sources: [], wishlists: [], billPurposes: [], transactions: [] });
      setLoading(false);
    }
  }, [user]);

  return (
    <DataContext.Provider value={{ ...data, loading, refresh }}>
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
