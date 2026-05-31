ALTER TABLE public.movimientos ADD COLUMN IF NOT EXISTS active boolean DEFAULT true;
