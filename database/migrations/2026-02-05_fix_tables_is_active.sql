-- Agregar columna is_active a la tabla tables
ALTER TABLE public.tables ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Actualizar registros existentes para asegurar que tengan valor
UPDATE public.tables SET is_active = true WHERE is_active IS NULL;
