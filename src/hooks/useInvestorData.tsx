import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

// Hook to get the current user's investor ID
export function useInvestorId() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['investor_id', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_investor_id');
      if (error) throw error;
      return data as string;
    },
    enabled: !!user,
  });
}

// Hook to get DLD Areas for dropdowns
export function useDLDAreas() {
  return useQuery({
    queryKey: ['dld_areas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dld_areas')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data;
    },
  });
}

// Hook to get DLD Developers for dropdowns
export function useDLDDevelopers() {
  return useQuery({
    queryKey: ['dld_developers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dld_developers')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data;
    },
  });
}

export interface Holding {
  id: string;
  unit_ref: string;
  invested_amount: number;
  current_value: number;
  status: string;
  created_at: string;
  area_id?: string | null;
  developer_id?: string | null;
  property_type?: string | null;
  project: {
    id: string;
    name: string;
    location: string;
    developer: string;
  };
}

export interface Payment {
  id: string;
  due_date: string;
  amount: number;
  status: string;
  note: string | null;
  project: {
    id: string;
    name: string;
  };
}

export interface Document {
  id: string;
  category: string;
  title: string;
  file_url: string;
  created_at: string;
  project: {
    id: string;
    name: string;
  } | null;
}

export interface ChatThread {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  thread_id: string;
  role: string;
  content: string;
  created_at: string;
}

export interface Update {
  id: string;
  title: string;
  summary: string;
  created_at: string;
  project: {
    id: string;
    name: string;
  };
}

export function useHoldings() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['holdings', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('holdings')
        .select(`
          id,
          unit_ref,
          invested_amount,
          current_value,
          status,
          created_at,
          project:projects (
            id,
            name,
            location,
            developer
          )
        `)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as unknown as Holding[];
    },
    enabled: !!user,
  });
}

export function usePayments() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['payments', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          id,
          due_date,
          amount,
          status,
          note,
          project:projects (
            id,
            name
          )
        `)
        .order('due_date', { ascending: true });

      if (error) throw error;
      return data as unknown as Payment[];
    },
    enabled: !!user,
  });
}

export function useDocuments() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['documents', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documents')
        .select(`
          id,
          category,
          title,
          file_url,
          created_at,
          project:projects (
            id,
            name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as unknown as Document[];
    },
    enabled: !!user,
  });
}

export function useChatThreads() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['chat_threads', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chat_threads')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data as ChatThread[];
    },
    enabled: !!user,
  });
}

export function useChatMessages(threadId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['chat_messages', threadId],
    queryFn: async () => {
      if (!threadId) return [];

      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as ChatMessage[];
    },
    enabled: !!user && !!threadId,
  });
}

export function useUpdates() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['updates', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('updates')
        .select(`
          id,
          title,
          summary,
          created_at,
          project:projects (
            id,
            name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as unknown as Update[];
    },
    enabled: !!user,
  });
}

export function useProjects() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['projects', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('name');

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

// Portfolio summary calculations
export function usePortfolioSummary() {
  const { data: holdings, isLoading } = useHoldings();

  const summary = holdings ? {
    totalInvested: holdings.reduce((sum, h) => sum + Number(h.invested_amount), 0),
    currentValue: holdings.reduce((sum, h) => sum + Number(h.current_value), 0),
    profitLoss: holdings.reduce((sum, h) => sum + (Number(h.current_value) - Number(h.invested_amount)), 0),
    roi: holdings.length > 0
      ? ((holdings.reduce((sum, h) => sum + Number(h.current_value), 0) -
        holdings.reduce((sum, h) => sum + Number(h.invested_amount), 0)) /
        holdings.reduce((sum, h) => sum + Number(h.invested_amount), 0)) * 100
      : 0,
    holdingsCount: holdings.length,
    // Allocation by project for pie chart
    allocation: holdings.map(h => ({
      name: h.project?.name || 'Unknown',
      value: Number(h.current_value),
      invested: Number(h.invested_amount),
    })),
  } : null;

  return { summary, isLoading };
}
