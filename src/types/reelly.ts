export interface ReellyProject {
  id: string;
  name: string;
  developer: string;
  /** Reelly's permalink slug, e.g. "amalia-residences". */
  slug_name?: string;
  location: {
    /** UAE: "Dubai" / "Abu Dhabi". Indonesia: "Bali". Etc. */
    region?: string;
    district?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
  };
  /** Number of units currently on sale. 0 means sold out / not released. */
  units_count?: number;
  completion_date?: string;
  completion_datetime?: string;
  construction_status?: string;
  sale_status?: string;
  min_price?: number;
  max_price?: number;
  /** Native currency for min/max_price. UAE → "AED", Indonesia → "AED" (Reelly normalises), etc. */
  price_currency?: string;
  /** Legacy alias for price_currency — kept for backward compat. */
  currency?: string;
  min_size?: number;
  max_size?: number;
  area_unit?: string;
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
