-- ==========================================================
-- SCRIPT DE CONFIGURACIÓN FINAL (MODO ESPAÑOL)
-- Condominio Campestre La Florida
-- ==========================================================

-- 1. Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Limpiar TODAS las tablas existentes
DROP TABLE IF EXISTS permisos CASCADE;
DROP TABLE IF EXISTS asistencia CASCADE;
DROP TABLE IF EXISTS reservas CASCADE;
DROP TABLE IF EXISTS avisos CASCADE;
DROP TABLE IF EXISTS lecturas_agua CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;
DROP TABLE IF EXISTS casas CASCADE;

-- 3. Limpiar trigger si existe
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 4. Tabla de Casas
CREATE TABLE casas (
    id SERIAL PRIMARY KEY,
    numero_casa TEXT NOT NULL UNIQUE,
    propietario TEXT,
    creado_el TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabla de Usuarios (Perfiles extendidos vinculados a Auth)
CREATE TABLE usuarios (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    nombre_completo TEXT,
    rol TEXT DEFAULT 'residente' CHECK (rol IN ('admin', 'trabajador', 'residente', 'extras')),
    casa_id INTEGER REFERENCES casas(id),
    creado_el TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Tabla de Lecturas de Agua
CREATE TABLE lecturas_agua (
    id SERIAL PRIMARY KEY,
    casa_id INTEGER NOT NULL REFERENCES casas(id) ON DELETE CASCADE,
    lectura_anterior NUMERIC(10,2) DEFAULT 0,
    lectura_actual NUMERIC(10,2) NOT NULL,
    consumo NUMERIC(10,2) GENERATED ALWAYS AS (lectura_actual - lectura_anterior) STORED,
    consumo_cobrar NUMERIC(10,2) DEFAULT 0,
    valor NUMERIC(12,2) DEFAULT 0,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    mes INTEGER GENERATED ALWAYS AS (EXTRACT(MONTH FROM fecha)::INTEGER) STORED,
    anio INTEGER GENERATED ALWAYS AS (EXTRACT(YEAR FROM fecha)::INTEGER) STORED,
    creado_el TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Tabla de Avisos (Notificaciones)
CREATE TABLE avisos (
    id SERIAL PRIMARY KEY,
    titulo TEXT NOT NULL,
    mensaje TEXT NOT NULL,
    tipo TEXT DEFAULT 'general' CHECK (tipo IN ('general', 'mantenimiento', 'emergencia', 'evento')),
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    creado_el TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Tabla de Reservas de Áreas Comunes
CREATE TABLE reservas (
    id SERIAL PRIMARY KEY,
    casa_id INTEGER NOT NULL REFERENCES casas(id) ON DELETE CASCADE,
    area TEXT NOT NULL,
    fecha DATE NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobada', 'rechazada')),
    valor NUMERIC(12,2) DEFAULT 0,
    creado_el TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Tabla de Asistencia (Personal)
CREATE TABLE asistencia (
    id SERIAL PRIMARY KEY,
    usuario_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    hora_entrada TIMESTAMPTZ DEFAULT NOW(),
    hora_salida TIMESTAMPTZ,
    total_horas NUMERIC(10,2),
    creado_el TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Tabla de Permisos (Personal)
CREATE TABLE permisos (
    id SERIAL PRIMARY KEY,
    usuario_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    nombre_completo TEXT,
    cargo TEXT,
    fecha DATE NOT NULL,
    horas TEXT,
    hora_salida TIME,
    hora_retorno TIME,
    tipo_duracion TEXT,
    motivo TEXT,
    categoria TEXT,
    estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobado', 'rechazado')),
    creado_el TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Poblar Casas (1 al 120)
DO $$
BEGIN
    FOR i IN 1..120 LOOP
        INSERT INTO casas (numero_casa) VALUES (i::text);
    END LOOP;
END $$;

-- 12. Trigger para crear perfil de usuario automáticamente al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.usuarios (id, email, nombre_completo)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 13. Políticas de Seguridad (RLS) — Basadas en Roles
ALTER TABLE casas ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE lecturas_agua ENABLE ROW LEVEL SECURITY;
ALTER TABLE avisos ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservas ENABLE ROW LEVEL SECURITY;
ALTER TABLE asistencia ENABLE ROW LEVEL SECURITY;
ALTER TABLE permisos ENABLE ROW LEVEL SECURITY;

-- CASAS: Todos leen, admin/trabajador crean, admin edita/borra
CREATE POLICY "casas_select" ON casas FOR SELECT USING (true);
CREATE POLICY "casas_insert" ON casas FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol IN ('admin','trabajador')));
CREATE POLICY "casas_update" ON casas FOR UPDATE USING (EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol = 'admin'));
CREATE POLICY "casas_delete" ON casas FOR DELETE USING (EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol = 'admin'));

-- USUARIOS: Todos leen, trigger crea, admin/propio edita, admin borra
CREATE POLICY "usuarios_select" ON usuarios FOR SELECT USING (true);
CREATE POLICY "usuarios_insert" ON usuarios FOR INSERT WITH CHECK (true);
CREATE POLICY "usuarios_update" ON usuarios FOR UPDATE USING (id = auth.uid() OR EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol = 'admin'));
CREATE POLICY "usuarios_delete" ON usuarios FOR DELETE USING (EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol = 'admin'));

-- LECTURAS: Todos leen, admin/trabajador insertan/editan, admin borra
CREATE POLICY "lecturas_select" ON lecturas_agua FOR SELECT USING (true);
CREATE POLICY "lecturas_insert" ON lecturas_agua FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol IN ('admin','trabajador')));
CREATE POLICY "lecturas_update" ON lecturas_agua FOR UPDATE USING (EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol IN ('admin','trabajador')));
CREATE POLICY "lecturas_delete" ON lecturas_agua FOR DELETE USING (EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol = 'admin'));

-- AVISOS: Todos leen, admin publica/edita/borra
CREATE POLICY "avisos_select" ON avisos FOR SELECT USING (true);
CREATE POLICY "avisos_insert" ON avisos FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol = 'admin'));
CREATE POLICY "avisos_update" ON avisos FOR UPDATE USING (EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol = 'admin'));
CREATE POLICY "avisos_delete" ON avisos FOR DELETE USING (EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol = 'admin'));

-- RESERVAS: Todos leen, autenticados crean, admin aprueba/borra
CREATE POLICY "reservas_select" ON reservas FOR SELECT USING (true);
CREATE POLICY "reservas_insert" ON reservas FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "reservas_update" ON reservas FOR UPDATE USING (EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol = 'admin'));
CREATE POLICY "reservas_delete" ON reservas FOR DELETE USING (EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol = 'admin'));

-- ASISTENCIA: Todos leen/insertan/editan (portería), admin borra
CREATE POLICY "asistencia_select" ON asistencia FOR SELECT USING (true);
CREATE POLICY "asistencia_insert" ON asistencia FOR INSERT WITH CHECK (true);
CREATE POLICY "asistencia_update" ON asistencia FOR UPDATE USING (true);
CREATE POLICY "asistencia_delete" ON asistencia FOR DELETE USING (EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol = 'admin'));

-- PERMISOS: Todos leen, admin/trabajador crean/editan, admin borra
CREATE POLICY "permisos_select" ON permisos FOR SELECT USING (true);
CREATE POLICY "permisos_insert" ON permisos FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol IN ('admin','trabajador')));
CREATE POLICY "permisos_update" ON permisos FOR UPDATE USING (EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol IN ('admin','trabajador')));
CREATE POLICY "permisos_delete" ON permisos FOR DELETE USING (EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol = 'admin'));

-- 14. Tablas de Inventario y Almacén (Herramientas, Gasolina, EPP)
CREATE TABLE inventario_items (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL UNIQUE,
    categoria TEXT DEFAULT 'herramienta' CHECK (categoria IN ('herramienta', 'consumible', 'gasolina', 'epp', 'otro')),
    unidad_medida TEXT DEFAULT 'unidad' CHECK (unidad_medida IN ('unidad', 'galones', 'litros', 'cajas', 'pares')),
    stock_actual NUMERIC(10,2) DEFAULT 0,
    creado_el TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE inventario_movimientos (
    id SERIAL PRIMARY KEY,
    item_id INTEGER REFERENCES inventario_items(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'salida', 'devolucion', 'baja')),
    cantidad NUMERIC(10,2) NOT NULL,
    responsable_email TEXT NOT NULL,
    observaciones TEXT,
    fecha TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE inventario_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventario_movimientos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public full access" ON inventario_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access" ON inventario_movimientos FOR ALL USING (true) WITH CHECK (true);
    