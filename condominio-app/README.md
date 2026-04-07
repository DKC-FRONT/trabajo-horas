# Condominio Campestre La Florida 🏙️

Aplicación web integral para la gestión y administración del **Condominio Campestre La Florida**. Diseñada con un enfoque moderno, minimalista y completamente oscuro (Dark Theme), evita el uso de librerías UI pesadas en favor de estilos en línea optimizados para mantener un control absoluto sobre el diseño.

## 🚀 Tecnologías Utilizadas

Este proyecto está construido sobre un stack robusto y moderno:

- **[Next.js 14](https://nextjs.org/) (App Router):** Framework principal para React. Se usa tanto para el frontend (páginas dinámicas del dashboard) como para el backend (rutas API REST bajo `/app/api`).
- **[TypeScript](https://www.typescriptlang.org/):** Tipado estricto en todo el flujo de datos para garantizar la seguridad de la información (sesiones de usuario, tipado de tablas de la BD, interfaces).
- **[MySQL (mysql2/promise)](https://www.npmjs.com/package/mysql2):** Motor de base de datos relacional. Utilizamos un patrón Singleton (`lib/db.ts`) con un `createPool` que maneja límites estrictos de conexiones concurrentes para asegurar la estabilidad del entorno.
- **[Lucide React](https://lucide.dev/):** Set de iconos profesionales en formato SVG ligero, para una apariencia limpia que complemente el tema oscuro.
- **[ExcelJS](https://github.com/exceljs/exceljs):** Librería utilizada para la generación de reportes financieros y de consumo directamente en el servidor (exportaciones nativas descargables).

## 🗄️ Base de Datos

La base de datos MySQL está alojada y administrada remotamente a través de **Clever Cloud**.
- **Instancia/Addon:** `addon_72dbe3aa-afc9-46a5-9315-fa4032f3227d`

Debido a las políticas del entorno en la nube, la conexión está cuidadosamente optimizada asegurando un límite máximo de conexiones activas (usualmente 3 max) para evitar bloqueos por límite de capacidad.

## ⚙️ Módulos del Sistema

La estructura del sistema está controlada por tres roles jerárquicos: `admin`, `trabajador` y `residente`.

1. **Lecturas de Agua 💧:** Registro mensual de contadores. Cálculo automático de excesos (base de 60m³) y cobro por tarifa.
2. **Casas 🏠:** Gestión de las propiedades que componen el condominio.
3. **Reportes 📊:** Cuadro de mando comparativo de los consumos globales del condominio de los últimos meses, e identificación de casas excedidas, con posibilidad de exportar a Excel.
4. **Avisos 📢:** Cartelera virtual gestionada por la administración para anuncios generales, recordatorios y alertas urgentes para los residentes.
5. **Reservas 🏊:** Sistema de apartado para áreas comunes (Piscina, Salón Social, Cancha Múltiple, Zona BBQ).
6. **Usuarios 👥:** Gestión de credenciales, roles y asignación de propiedades.

## 🌍 Despliegue

La aplicación está completamente diseñada para integrarse y desplegarse en **[Vercel](https://vercel.com)**.

El despliegue en Vercel ofrece beneficios cruciales en nuestro caso:
- **Serverless API Routes:** Las rutas dentro de `app/api/...` se transforman automáticamente en Node.js Serverless Functions escalables.
- **Optimizaciones automáticas:** Carga de fuentes por el compilador, minificación y caché nativa de Next.js.
- Se debe asegurar que las variables de entorno de la base de datos de Clever Cloud (`DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT`) estén correctamente agregadas en la configuración del proyecto dentro del panel de Vercel para garantizar la conexión en producción.

---

### Scripts de Desarrollo Locales

\`\`\`bash
# 1. Instalar dependencias
npm install

# 2. Iniciar el servidor local
npm run dev

# 3. Compilar para producción (para comprobar antes de hacer push)
npm run build
\`\`\`
