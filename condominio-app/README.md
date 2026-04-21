# 🔳 Condominio Campestre La Florida

> **Sistema Integral de Gestión Administrativa y Operativa**
> Una plataforma premium con diseño minimalista oscuro (Dark Mode), optimizada para la gestión eficiente de personal, servicios, consumos y convivencia.

---

## 💎 Características Principales

### ⏱️ Control de Asistencia Inteligente
Sistema de marcado de tiempo real para el personal (Entrada/Salida) con cálculo automático de horas laboradas.
- **Vista de Administrador:** Panel de búsqueda y filtrado histórico global por empleado.
- **Validación:** Registros protegidos mediante sesiones activas y estados de conexión en tiempo real.

### 💧 Automatización de Lecturas de Agua
Módulo robusto para el control mensual de acueducto con lógica de autocompletado.
- **Cálculo de Consumo:** El sistema realiza cálculos automáticos (`Lectura Actual - Lectura Anterior`) incluso si los datos son nulos en la base de datos, garantizando reportes precisos.
- **Gestión de Tarifas:** Facturación basada en excedentes sobre el límite básico (60m³) con tarifas configurables.

### 📊 Reportes e Indicadores (NUEVO)
Panel analítico detallado con visualización de métricas clave.
- **Consolidado Mensual:** Tarjetas de resumen para consumo total, casas excedidas y recaudo esperado.
- **Comparativos:** Gráficos históricos de los últimos 6 meses para análisis de tendencias.
- **Exportación Premium:** Generación de archivos Excel (.xlsx) con estilos corporativos y semáforos de exceso de consumo.

### 👥 Gestión Documental y Usuarios
Control absoluto de roles y accesos sin fricción.
- **Roles Dinámicos:** Administrador (Control total), Trabajador (Operativo) y Residente (Consultas).
- **Admin Bypass:** Los administradores pueden gestionar identidades y contraseñas de forma directa para agilizar la operatividad del personal.

---

## 🛠️ Stack Tecnológico

El proyecto prioriza el rendimiento extremo y la estética artesanal, evitando librerías de componentes pesadas y utilizando una arquitectura "Custom CSS-in-JS".

*   **Framework:** [Next.js 15](https://nextjs.org/) (App Router)
*   **Lenguaje:** [TypeScript 5](https://www.typescriptlang.org/) (Strict Mode)
*   **Base de Datos & Auth:** [Supabase](https://supabase.com/) (PostgreSQL)
*   **Estilos:** Vanilla CSS / Inline Styles con enfoque en Glassmorphism.
*   **Reportes:** [ExcelJS](https://github.com/exceljs/exceljs) para exportación de datos.

---

## 🔐 Seguridad e Infraestructura

El proyecto cuenta con un sistema de **"Cliente Fantasma" (Shadow Client)** que permite realizar el proceso de construcción (Build) en Vercel incluso si las llaves de Supabase no están presentes, evitando errores de pre-renderizado.

### Variables de Entorno (.env.local)
| Variable | Definición |
| :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL de conexión de Supabase. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave pública de acceso (Anon). |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave secreta para gestión administrativa de usuarios. |

---

## 🚀 Instalación y Despliegue

1.  **Instalación:**
    ```bash
    npm install
    ```


4.  **Ejecutar en desarrollo:**
    ```bash
    npm run dev
    ```

---

## 📦 Despliegue en Vercel

Este proyecto está 100% listo para ser desplegado en Vercel. Asegúrate de añadir las **Environment Variables** en el dashboard de Vercel antes del despliegue para que la conexión con el Backend funcione correctamente.

---
*Desarrollado con enfoque en alto rendimiento y estética premium para el Condominio Campestre La Florida.*
