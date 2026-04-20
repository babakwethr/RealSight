import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ActivityItem {
  id: string;
  type: 'holding' | 'payment' | 'document';
  action: 'created' | 'updated';
  title: string;
  description: string;
  timestamp: string;
  metadata?: {
    projectName?: string;
    amount?: number;
    status?: string;
  };
}

export function useAdminInvestorActivity(investorId: string | undefined) {
  return useQuery({
    queryKey: ['admin-investor-activity', investorId],
    queryFn: async () => {
      if (!investorId) return [];

      const activities: ActivityItem[] = [];

      // Fetch holdings with project names
      const { data: holdings } = await supabase
        .from('holdings')
        .select('id, unit_ref, invested_amount, status, created_at, updated_at, project:projects(name)')
        .eq('investor_id', investorId)
        .order('updated_at', { ascending: false })
        .limit(20);

      if (holdings) {
        holdings.forEach((h) => {
          const projectName = (h.project as { name: string } | null)?.name || 'Unknown Project';
          
          // Check if it was recently updated (different from created)
          const createdAt = new Date(h.created_at);
          const updatedAt = new Date(h.updated_at);
          const wasUpdated = updatedAt.getTime() - createdAt.getTime() > 1000; // More than 1 second difference

          if (wasUpdated) {
            activities.push({
              id: `holding-update-${h.id}`,
              type: 'holding',
              action: 'updated',
              title: `Holding Updated`,
              description: `${h.unit_ref} at ${projectName}`,
              timestamp: h.updated_at,
              metadata: {
                projectName,
                amount: Number(h.invested_amount),
                status: h.status,
              },
            });
          }

          activities.push({
            id: `holding-create-${h.id}`,
            type: 'holding',
            action: 'created',
            title: `Holding Added`,
            description: `${h.unit_ref} at ${projectName}`,
            timestamp: h.created_at,
            metadata: {
              projectName,
              amount: Number(h.invested_amount),
              status: h.status,
            },
          });
        });
      }

      // Fetch payments with project names
      const { data: payments } = await supabase
        .from('payments')
        .select('id, amount, status, note, created_at, updated_at, project:projects(name)')
        .eq('investor_id', investorId)
        .order('updated_at', { ascending: false })
        .limit(20);

      if (payments) {
        payments.forEach((p) => {
          const projectName = (p.project as { name: string } | null)?.name || 'Unknown Project';
          const formattedAmount = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
          }).format(Number(p.amount));

          const createdAt = new Date(p.created_at);
          const updatedAt = new Date(p.updated_at);
          const wasUpdated = updatedAt.getTime() - createdAt.getTime() > 1000;

          if (wasUpdated) {
            activities.push({
              id: `payment-update-${p.id}`,
              type: 'payment',
              action: 'updated',
              title: `Payment Updated`,
              description: `${formattedAmount} for ${projectName} - ${p.status}`,
              timestamp: p.updated_at,
              metadata: {
                projectName,
                amount: Number(p.amount),
                status: p.status,
              },
            });
          }

          activities.push({
            id: `payment-create-${p.id}`,
            type: 'payment',
            action: 'created',
            title: `Payment Added`,
            description: `${formattedAmount} for ${projectName}`,
            timestamp: p.created_at,
            metadata: {
              projectName,
              amount: Number(p.amount),
              status: p.status,
            },
          });
        });
      }

      // Fetch documents with project names
      const { data: documents } = await supabase
        .from('documents')
        .select('id, title, category, created_at, project:projects(name)')
        .eq('investor_id', investorId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (documents) {
        documents.forEach((d) => {
          const projectName = (d.project as { name: string } | null)?.name;

          activities.push({
            id: `document-create-${d.id}`,
            type: 'document',
            action: 'created',
            title: `Document Added`,
            description: `${d.title}${projectName ? ` (${projectName})` : ''} - ${d.category}`,
            timestamp: d.created_at,
            metadata: {
              projectName: projectName || undefined,
            },
          });
        });
      }

      // Sort all activities by timestamp descending
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      // Return the most recent 50 activities
      return activities.slice(0, 50);
    },
    enabled: !!investorId,
  });
}
