ALTER TABLE public.movimientos ADD COLUMN IF NOT EXISTS is_fixed boolean DEFAULT false;
ALTER TABLE public.movimientos ADD COLUMN IF NOT EXISTS frequency text DEFAULT 'monthly';
ALTER TABLE public.movimientos ADD COLUMN IF NOT EXISTS day_of_month integer DEFAULT 1;
