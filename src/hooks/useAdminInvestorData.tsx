import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Investor {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  phone: string | null;
  country: string | null;
  preferred_language: string | null;
  notes: string | null;
  created_at: string;
}

export interface Project {
  id: string;
  name: string;
  location: string;
  developer: string;
  starting_price: number;
  description: string | null;
  image_url: string | null;
}

export interface Holding {
  id: string;
  project_id: string;
  unit_ref: string;
  invested_amount: number;
  current_value: number;
  status: string;
  project?: { name: string; location?: string; developer?: string };
}

export interface Payment {
  id: string;
  project_id: string;
  due_date: string;
  amount: number;
  status: string;
  note: string | null;
  project?: { name: string };
}

export interface Document {
  id: string;
  project_id: string | null;
  title: string;
  category: string;
  file_url: string;
  created_at: string;
  project?: { name: string } | null;
}

// Fetch a single investor by ID
export function useAdminInvestor(investorId: string | undefined) {
  return useQuery({
    queryKey: ['admin-investor', investorId],
    queryFn: async () => {
      if (!investorId) return null;
      const { data, error } = await supabase
        .from('investors')
        .select('*')
        .eq('id', investorId)
        .single();
      if (error) throw error;
      return data as Investor;
    },
    enabled: !!investorId,
  });
}

// Fetch holdings for a specific investor
export function useAdminInvestorHoldings(investorId: string | undefined) {
  return useQuery({
    queryKey: ['admin-investor-holdings', investorId],
    queryFn: async () => {
      if (!investorId) return [];
      const { data, error } = await supabase
        .from('holdings')
        .select('*, project:projects(name, location, developer)')
        .eq('investor_id', investorId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as Holding[];
    },
    enabled: !!investorId,
  });
}

// Fetch payments for a specific investor
export function useAdminInvestorPayments(investorId: string | undefined) {
  return useQuery({
    queryKey: ['admin-investor-payments', investorId],
    queryFn: async () => {
      if (!investorId) return [];
      const { data, error } = await supabase
        .from('payments')
        .select('*, project:projects(name)')
        .eq('investor_id', investorId)
        .order('due_date', { ascending: true });
      if (error) throw error;
      return data as unknown as Payment[];
    },
    enabled: !!investorId,
  });
}

// Fetch documents for a specific investor
export function useAdminInvestorDocuments(investorId: string | undefined) {
  return useQuery({
    queryKey: ['admin-investor-documents', investorId],
    queryFn: async () => {
      if (!investorId) return [];
      const { data, error } = await supabase
        .from('documents')
        .select('*, project:projects(name)')
        .eq('investor_id', investorId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as Document[];
    },
    enabled: !!investorId,
  });
}

// Fetch all projects (for dropdowns)
export function useAdminProjects() {
  return useQuery({
    queryKey: ['admin-projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as Project[];
    },
  });
}

// Calculate portfolio summary for an investor
export function useAdminPortfolioSummary(investorId: string | undefined) {
  const { data: holdings, isLoading } = useAdminInvestorHoldings(investorId);
  
  const summary = holdings && holdings.length > 0 ? {
    totalInvested: holdings.reduce((sum, h) => sum + Number(h.invested_amount), 0),
    currentValue: holdings.reduce((sum, h) => sum + Number(h.current_value), 0),
    profitLoss: holdings.reduce((sum, h) => sum + (Number(h.current_value) - Number(h.invested_amount)), 0),
    roi: holdings.length > 0 
      ? ((holdings.reduce((sum, h) => sum + Number(h.current_value), 0) - 
          holdings.reduce((sum, h) => sum + Number(h.invested_amount), 0)) / 
         holdings.reduce((sum, h) => sum + Number(h.invested_amount), 0)) * 100
      : 0,
    holdingsCount: holdings.length,
    allocation: holdings.map(h => ({
      name: h.project?.name || 'Unknown',
      value: Number(h.current_value),
      invested: Number(h.invested_amount),
    })),
  } : null;
  
  return { summary, isLoading };
}
