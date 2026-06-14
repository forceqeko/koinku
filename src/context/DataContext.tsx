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
  BillPurpose,
  InvestmentPortfolio,
  InvestmentPortfolioWishlist,
  InvestmentReturn,
  Debt,
  DebtPayment
} from '../types';

export interface DataContextType {
  accounts: Account[];
  categories: ExpenseCategory[];
  purposes: ExpensePurpose[];
  sources: IncomeSource[];
  wishlists: Wishlist[];
  billPurposes: BillPurpose[];
  transactions: Transaction[];
  portfolios: InvestmentPortfolio[];
  portfolioWishlists: InvestmentPortfolioWishlist[];
  investmentReturns: InvestmentReturn[];
  debts: Debt[];
  debtPayments: DebtPayment[];
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
    portfolios: InvestmentPortfolio[];
    portfolioWishlists: InvestmentPortfolioWishlist[];
    investmentReturns: InvestmentReturn[];
    debts: Debt[];
    debtPayments: DebtPayment[];
  }>({
    accounts: [],
    categories: [],
    purposes: [],
    sources: [],
    wishlists: [],
    billPurposes: [],
    transactions: [],
    portfolios: [],
    portfolioWishlists: [],
    investmentReturns: [],
    debts: [],
    debtPayments: []
  });
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    if (!user) return;
    setLoading(true);
    
    try {
      // Fetch core financial tables
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
          .order('created_at', { ascending: false })
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

      // Fetch investment tables with error tolerance in case database schema is not updated yet
      let portfoliosData: InvestmentPortfolio[] = [];
      let portfolioWishlistsData: InvestmentPortfolioWishlist[] = [];
      let investmentReturnsData: InvestmentReturn[] = [];

      try {
        const [port, portWsh, invRet] = await Promise.all([
          supabase.from('investment_portfolios').select('*').eq('user_id', user.id).order('created_at'),
          supabase.from('investment_portfolio_wishlists').select('*'),
          supabase.from('investment_returns').select('*').eq('user_id', user.id).order('date', { ascending: true })
        ]);
        
        if (!port.error) {
          portfoliosData = port.data || [];
        } else {
          console.warn('investment_portfolios fetch error: table might not exist yet.', port.error);
        }
        
        if (!portWsh.error) {
          portfolioWishlistsData = portWsh.data || [];
        } else {
          console.warn('investment_portfolio_wishlists fetch error: table might not exist yet.', portWsh.error);
        }
        
        if (!invRet.error) {
          investmentReturnsData = invRet.data || [];
        } else {
          console.warn('investment_returns fetch error: table might not exist yet.', invRet.error);
        }
      } catch (err) {
        console.error('Failed to load investment tables. They might not exist yet.', err);
      }

      // Fetch debt tables with error tolerance in case database schema is not updated yet
      let debtsData: Debt[] = [];
      let debtPaymentsData: DebtPayment[] = [];

      try {
        const [dbt, pmts] = await Promise.all([
          supabase.from('debts').select('*').eq('user_id', user.id).order('created_at'),
          supabase.from('debt_payments').select('*').eq('user_id', user.id).order('date', { ascending: false })
        ]);
        
        if (!dbt.error) {
          debtsData = dbt.data || [];
        } else {
          console.warn('debts fetch error: table might not exist yet.', dbt.error);
        }
        
        if (!pmts.error) {
          debtPaymentsData = pmts.data || [];
        } else {
          console.warn('debt_payments fetch error: table might not exist yet.', pmts.error);
        }
      } catch (err) {
        console.error('Failed to load debt tables. They might not exist yet.', err);
      }

      setData({
        accounts: sortedAccounts,
        categories: cat.data || [],
        purposes: pur.data || [],
        sources: src.data || [],
        wishlists: wsh.data || [],
        billPurposes: bill.data || [],
        transactions: txn.data || [],
        portfolios: portfoliosData,
        portfolioWishlists: portfolioWishlistsData,
        investmentReturns: investmentReturnsData,
        debts: debtsData,
        debtPayments: debtPaymentsData
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
      setData({
        accounts: [],
        categories: [],
        purposes: [],
        sources: [],
        wishlists: [],
        billPurposes: [],
        transactions: [],
        portfolios: [],
        portfolioWishlists: [],
        investmentReturns: [],
        debts: [],
        debtPayments: []
      });
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
