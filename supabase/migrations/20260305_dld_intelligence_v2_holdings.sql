-- Migration: Adding strict Area and Developer linking to Holdings

-- Add columns to holdings
ALTER TABLE public.holdings ADD COLUMN IF NOT EXISTS area_id uuid REFERENCES public.dld_areas(id);
ALTER TABLE public.holdings ADD COLUMN IF NOT EXISTS developer_id uuid REFERENCES public.dld_developers(id);
ALTER TABLE public.holdings ADD COLUMN IF NOT EXISTS property_type text;

-- Create views for easy linking (if necessary later) or simply rely on existing FKs.
