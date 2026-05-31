-- Habilitar RLS en la tabla fixed_expenses
ALTER TABLE fixed_expenses ENABLE ROW LEVEL SECURITY;

-- Crear políticas para fixed_expenses (si no existen)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'fixed_expenses' AND policyname = 'Usuarios pueden ver sus propios gastos fijos'
    ) THEN
        CREATE POLICY "Usuarios pueden ver sus propios gastos fijos" 
        ON fixed_expenses FOR SELECT 
        USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'fixed_expenses' AND policyname = 'Usuarios pueden insertar sus propios gastos fijos'
    ) THEN
        CREATE POLICY "Usuarios pueden insertar sus propios gastos fijos" 
        ON fixed_expenses FOR INSERT 
        WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'fixed_expenses' AND policyname = 'Usuarios pueden actualizar sus propios gastos fijos'
    ) THEN
        CREATE POLICY "Usuarios pueden actualizar sus propios gastos fijos" 
        ON fixed_expenses FOR UPDATE 
        USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'fixed_expenses' AND policyname = 'Usuarios pueden eliminar sus propios gastos fijos'
    ) THEN
        CREATE POLICY "Usuarios pueden eliminar sus propios gastos fijos" 
        ON fixed_expenses FOR DELETE 
        USING (auth.uid() = user_id);
    END IF;
END $$;
