# 🔐 GUÍA DE SEGURIDAD - CONDOMINIO APP

**Última actualización:** 2026-11-20

---

## ✅ MEDIDAS DE SEGURIDAD IMPLEMENTADAS

### 1. ✅ Autenticación y Autorización

- **Verificación de autenticación en todos los endpoints API**
  - Cada endpoint valida que el usuario esté autenticado
  - Uso de `verifyRole()` para autorización basada en roles
  - Roles: admin, trabajador, residente, extras

- **Validación de propiedad**
  - Residentes solo pueden ver/editar sus propias casas
  - POST /api/reservas valida que casa_id pertenece al usuario
  - GET /api/lecturas filtra por casa_id del usuario si es residente

**Ubicación:** `lib/verifyRole.ts`

### 2. ✅ Validación de Entrada

- **Esquemas Zod centralizados**
  - Validación tipada de todas las entradas
  - Mensajes de error claros
  - Previene SQL injection y XSS

**Ubicación:** `lib/schemas.ts`

**Validaciones incluidas:**
```
- Emails válidos
- Números en rangos correctos (mes 1-12, año 2000-2100)
- Horas válidas (00:00-23:59)
- Fechas en formato correcto
```

### 3. ✅ Rate Limiting

- **Protección contra fuerza bruta**
  - Login: 5 intentos en 15 minutos
  - API general: 100 requests por minuto
  - Retorna HTTP 429 cuando se excede

**Ubicación:** `lib/ratelimit.ts`

### 4. ✅ CORS y Headers de Seguridad

**Headers agregados:**
- `X-Frame-Options: DENY` - Previene clickjacking
- `X-Content-Type-Options: nosniff` - Previene MIME sniffing
- `X-XSS-Protection: 1; mode=block` - Protección XSS
- `Content-Security-Policy` - Control de recursos
- `Strict-Transport-Security` - HTTPS forzado (producción)
- `Referrer-Policy` - Control de referrer
- `Permissions-Policy` - Control de permisos de navegador

**CORS:** Solo dominios permitidos pueden acceder

**Ubicación:** `lib/cors.ts`

### 5. ✅ Manejo de Errores Seguro

- **Sin exposición de detalles técnicos**
  - Errores genéricos para el cliente
  - Detalles en logs del servidor
  - Códigos de error para debugging

- **Sanitización de mensajes**
  - No revela información de base de datos
  - Previene enumeración de usuarios

**Ubicación:** `lib/security.ts`

### 6. ✅ Endpoints Asegurados

#### GET /api/usuarios
- ✅ Requiere rol: admin
- ✅ No expone emails públicamente

#### GET /api/lecturas
- ✅ Requiere autenticación
- ✅ Residentes ven solo sus lecturas
- ✅ Validación de mes/año

#### GET /api/reservas
- ✅ Requiere autenticación
- ✅ Residentes ven solo sus reservas
- ✅ Admin y trabajadores ven todas

#### POST /api/reservas
- ✅ Verifica que casa_id pertenece al usuario
- ✅ Residentes no pueden crear para otra casa

#### POST /api/login
- ✅ Rate limiting: 5 intentos en 15 min
- ✅ No revela si email existe
- ✅ Genérico: "Credenciales incorrectas"

#### GET /api/reportes
- ✅ Requiere rol: admin
- ✅ Validación de parámetros mes/año

---

## 🚀 CÓMO INSTALAR LOS PARCHES

### Paso 1: Instalar Dependencias

```bash
cd condominio-app
npm install
```

Esto instala:
- `zod` - Validación de esquemas
- `@upstash/ratelimit` - Rate limiting (opcional, usamos en memoria por ahora)

### Paso 2: Configurar Variables de Entorno

```bash
cp .env.example .env.local
```

Luego edita `.env.local` y configura:
```
NEXT_PUBLIC_SUPABASE_URL=tu_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_key
```

En producción, agregar:
```
ALLOWED_ORIGINS=https://tudominio.com
```

### Paso 3: Testear

```bash
npm run dev
```

Luego abre la consola del navegador (F12) y prueba:

```javascript
// Esto debería retornar error 401 (sin autenticación)
fetch('http://localhost:3000/api/usuarios')
  .then(r => r.json())
  .then(data => console.log(data))
```

Resultado esperado:
```
{
  error: "No autenticado. Inicie sesión.",
  code: "UNAUTHORIZED"
}
```

---

## 🔍 CÓMO VERIFICAR LOS PARCHES

### Verificación 1: Autenticación en GET /api/usuarios

```bash
# Sin autenticación (debe fallar con 401)
curl http://localhost:3000/api/usuarios

# Con autenticación (debe funcionar)
curl -H "Authorization: Bearer TOKEN" http://localhost:3000/api/usuarios
```

### Verificación 2: Rate Limiting en Login

```bash
# 5 intentos deberían funcionar
for i in {1..5}; do
  curl -X POST http://localhost:3000/api/login \
    -H "Content-Type: application/json" \
    -d '{"correo":"test@test.com","password":"wrong'$i'"}'
done

# El 6to intento debería retornar 429 (Too Many Requests)
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"correo":"test@test.com","password":"wrong6"}'
```

### Verificación 3: Validación de Propiedad

```javascript
// Si eres residente de casa_id=5:
// Esto debería funcionar (tu casa)
fetch('http://localhost:3000/api/lecturas?casa_id=5')

// Esto debería retornar 403 Forbidden (otra casa)
fetch('http://localhost:3000/api/lecturas?casa_id=99')
```

---

## 🛠️ MEJORAS FUTURAS

### Corto Plazo (Próximas 2 semanas)
- [ ] Implementar @upstash/redis para rate limiting distribuido
- [ ] Agregar logging centralizado de eventos sensibles
- [ ] Crear tabla de audit_logs para rastrear cambios

### Mediano Plazo (1-2 meses)
- [ ] Implementar 2FA (Two Factor Authentication)
- [ ] Agregar tokens de acceso con expiración
- [ ] Encripción de datos sensibles en BD

### Largo Plazo (3+ meses)
- [ ] Implementar RBAC más granular
- [ ] Agregar webhooks para eventos críticos
- [ ] Integración con monitoreo de seguridad (Sentry)

---

## 📋 CHECKLIST DE SEGURIDAD

Antes de desplegar a producción, verificar:

- [ ] Variables de entorno configuradas correctamente
- [ ] NEXT_PUBLIC_SUPABASE_URL y KEY son correctas
- [ ] ALLOWED_ORIGINS tiene tu dominio de producción
- [ ] NODE_ENV=production
- [ ] SSL/HTTPS configurado en servidor
- [ ] Backup de base de datos automático
- [ ] Logs de acceso y errores habilitados
- [ ] Monitoreo de CPU/memoria activo
- [ ] Plan de desastre documentado

---

## 🔐 Principios de Seguridad Usados

1. **Least Privilege** - Solo permisos necesarios
2. **Defense in Depth** - Múltiples capas de protección
3. **Fail Secure** - Cuando duda, rechazar acceso
4. **Secure by Default** - Seguridad desde el inicio
5. **Keep It Simple** - Código simple es más seguro

---

## 📞 Soporte

Si encuentras vulnerabilidades:
1. **NO** publiques públicamente
2. Contacta al equipo de seguridad
3. Proporciona detalles técnicos
4. Espera confirmación antes de divulgar

---

**Última revisión:** 2026-11-20
**Próxima revisión:** 2027-02-20
