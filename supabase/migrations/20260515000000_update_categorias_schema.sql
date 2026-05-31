-- Migración: Actualizar tabla categorias para incluir type e is_default

-- 1. Agregar columnas si no existen
ALTER TABLE categorias ADD COLUMN IF NOT EXISTS type text;
ALTER TABLE categorias ADD COLUMN IF NOT EXISTS is_default boolean DEFAULT false;

-- 2. Migrar categorías existentes según su nombre
UPDATE categorias 
SET type = 'expense' 
WHERE nombre IN ('Comida', 'Transporte', 'Salud', 'Servicios', 'Arriendo', 'Entretenimiento') AND type IS NULL;

UPDATE categorias 
SET type = 'income' 
WHERE nombre IN ('Nómina', 'Freelance', 'Ventas') AND type IS NULL;

UPDATE categorias 
SET type = 'saving' 
WHERE nombre IN ('Emergencia', 'Viaje', 'Inversión') AND type IS NULL;

-- Asignar tipo 'expense' por defecto a las categorías antiguas que no encajen
UPDATE categorias 
SET type = 'expense' 
WHERE type IS NULL;

-- 3. Proteger categorías base (is_default)
UPDATE categorias 
SET is_default = true 
WHERE nombre IN (
  'Comida', 'Transporte', 'Salud', 'Servicios', 'Arriendo', 'Entretenimiento',
  'Nómina', 'Freelance', 'Ventas',
  'Emergencia', 'Viaje', 'Inversión'
);

-- Nota: Ve al SQL Editor de tu proyecto en Supabase (app.supabase.com) y ejecuta estas sentencias.
-- Una vez ejecutadas, recarga el Schema Cache / API Cache en Supabase para evitar errores de columnas no encontradas.
