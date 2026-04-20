import { ReellyProject } from '@/types/reelly';

export interface ProjectFilters {
  search: string;
  developer: string | null;
  constructionStatus: string | null;
  saleStatus: string | null;
  minPrice: number | null;
  maxPrice: number | null;
  paymentPlan: string | null;
}

export const INITIAL_FILTERS: ProjectFilters = {
  search: '',
  developer: null,
  constructionStatus: null,
  saleStatus: null,
  minPrice: null,
  maxPrice: null,
  paymentPlan: null,
};

export const PAYMENT_PLAN_PRESETS = ['20/80', '40/60', '50/50', '60/40', '70/30', '80/20'];

export function analyzePaymentPlan(project: ReellyProject): string {
  if (!project.payment_plans || project.payment_plans.length === 0) return 'Payment plan varies';
  
  const plan = project.payment_plans[0];
  if (!plan.steps || plan.steps.length === 0) return 'Payment plan varies';

  let handoverPercent = 0;
  
  plan.steps.forEach(step => {
    // Attempt to guess handover from string naming conventions
    const typeLower = step.type.toLowerCase();
    if (typeLower.includes('handover') || typeLower.includes('completion')) {
      handoverPercent += step.percentage;
    }
  });

  // If we couldn't confidently find handover, assume the last step is handover
  if (handoverPercent === 0 && plan.steps.length > 1) {
    handoverPercent = plan.steps[plan.steps.length - 1].percentage;
  }

  if (handoverPercent === 0) return 'Payment plan varies';

  const preHandover = 100 - handoverPercent;
  
  // Snap to preset
  const closestPreset = PAYMENT_PLAN_PRESETS.reduce((prev, curr) => {
    const [pre] = curr.split('/');
    const targetPre = parseInt(pre, 10);
    const prevPre = parseInt(prev.split('/')[0], 10);
    
    return Math.abs(targetPre - preHandover) < Math.abs(prevPre - preHandover) ? curr : prev;
  });

  // If the closest preset is off by more than 10%, we just return the factual breakdown
  const [closestPre] = closestPreset.split('/');
  if (Math.abs(parseInt(closestPre) - preHandover) > 10) {
    return `${Math.round(preHandover)}/${Math.round(handoverPercent)}`;
  }

  return closestPreset;
}

export function applyFilters(projects: ReellyProject[], filters: ProjectFilters): ReellyProject[] {
  return projects.filter(p => {
    // 1. Search (name, developer, district)
    if (filters.search) {
      const qs = filters.search.toLowerCase();
      const matchesName = p.name?.toLowerCase().includes(qs);
      const matchesDev = p.developer?.toLowerCase().includes(qs);
      const matchesDist = p.location?.district?.toLowerCase().includes(qs);
      if (!matchesName && !matchesDev && !matchesDist) return false;
    }

    // 2. Developer chip
    if (filters.developer && p.developer !== filters.developer) return false;

    // 3. Statuses
    if (filters.constructionStatus && p.construction_status !== filters.constructionStatus) return false;
    if (filters.saleStatus && p.sale_status !== filters.saleStatus) return false;

    // 4. Price range
    // If project min_price is somehow above the filter's MAX price -> reject
    // min_price/max_price handling can be tricky depending on data quality
    const projPrice = p.min_price || 0;
    if (filters.maxPrice && projPrice > filters.maxPrice) return false;
    if (filters.minPrice && (p.max_price || projPrice) < filters.minPrice) return false;
    
    // 5. Payment Plan
    if (filters.paymentPlan && filters.paymentPlan !== 'All') {
      const plan = analyzePaymentPlan(p);
      if (plan !== filters.paymentPlan) return false;
    }

    return true;
  });
}
