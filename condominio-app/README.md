# 🔳 Condominio Campestre La Florida

> **Sistema Integral de Gestión Administrativa y Operativa**
> Una plataforma premium construida con un diseño minimalista oscuro, optimizada para la gestión eficiente de personal, servicios y convivencia.

---

## 💎 Características Principales

### ⏱️ Control de Asistencia Inteligente
Sistema de marcado de tiempo real para el personal (Entrada/Salida) con cálculo automático de horas laboradas.
- **Vista de Administrador:** Panel de búsqueda y filtrado histórico global por empleado.
- **Validación:** Registros protegidos mediante sesiones activas.

### 💧 Automatización de Lecturas de Agua
Módulo optimizado para la lectura mensual de contadores con lógica de autocompletado inteligente.
- **Arrastre de Lectura:** El sistema consulta automáticamente la última lectura registrada para precargarla.
- **Cálculo Financiero:** Gestión de tarifas por excedentes (base 60m³) y generación de cálculos de cobro al instante.

### 👥 Gestión Documental y Usuarios
Control absoluto sobre las credenciales y roles del condominio.
- **Roles Dinámicos:** Administrador, Trabajador y Residente.
- **Admin API:** Creación y edición de usuarios sin necesidad de confirmación por correo, permitiendo gestión directa de contraseñas por la administración.

### 📅 Reservas y Comunicación
- **Áreas Comunes:** Sistema de apartado para Capilla, Salón de Eventos, Restaurante y Canchas.
- **Cartelera Virtual:** Publicación de avisos y alertas generales para toda la comunidad.

---

## 🛠️ Stack Tecnológico

El proyecto está diseñado para ser extremadamente ligero y no depender de librerías de UI pesadas, utilizando estilos en línea optimizados para un control total del diseño.

*   **Framework:** [Next.js 14](https://nextjs.org/) (App Router)
*   **Lenguaje:** [TypeScript](https://www.typescriptlang.org/)
*   **Base de Datos & Auth:** [Supabase](https://supabase.com/) (PostgreSQL)
*   **Iconografía:** [Lucide React](https://lucide.dev/)
*   **Reportes:** [ExcelJS](https://github.com/exceljs/exceljs) para exportaciones nativas.

---

## 🔐 Seguridad y Configuración

El proyecto utiliza variables de entorno para proteger las credenciales críticas. **IMPORTANTE:** Nunca subas el archivo `.env.local` al repositorio.

### Variables Requeridas
| Variable | Descripción |
| :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL de tu instancia en Supabase. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave anónima para operaciones de cliente. |
| `SUPABASE_SERVICE_ROLE_KEY` | **(Secreto)** Requerido para operaciones administrativas de usuarios. |

---

## 🚀 Guía de Inicio Rápido

1.  **Clonar el repositorio:**
    ```bash
    git clone https://github.com/tu-usuario/condominio-app.git
    cd condominio-app
    ```

2.  **Instalar dependencias:**
    ```bash
    npm install
    ```

3.  **Configurar Entorno:**
    Crea un archivo `.env.local` en la raíz y añade tus claves de Supabase.

4.  **Ejecutar en desarrollo:**
    ```bash
    npm run dev
    ```

---

## 📦 Despliegue en Vercel

Este proyecto está 100% listo para ser desplegado en Vercel. Asegúrate de añadir las **Environment Variables** en el dashboard de Vercel antes del despliegue para que la conexión con el Backend funcione correctamente.

---
*Desarrollado con enfoque en alto rendimiento y estética premium para el Condominio Campestre La Florida.*
