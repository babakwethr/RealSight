export interface ReellyProject {
  id: string;
  name: string;
  developer: string;
  location: {
    district?: string;
    city?: string;
  };
  completion_date?: string;
  completion_datetime?: string;
  construction_status?: string;
  sale_status?: string;
  min_price?: number;
  max_price?: number;
  currency?: string;
  cover_image?: {
    url?: string;
  };
  // Detailed fields
  overview?: string;
  amenities?: Array<{
    name: string;
    icon?: string;
  }>;
  payment_plans?: Array<{
    steps: Array<{
      type: string;
      percentage: number;
    }>;
  }>;
  media?: {
    architecture?: Array<{ url: string }>;
    interior?: Array<{ url: string }>;
    floor_plans?: Array<{ url: string, title?: string }>;
  };
}
