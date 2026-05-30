# 🔍 Audit Trail — Registro de Actividad

## Resumen

Se ha implementado un sistema completo de **registro de actividad (audit trail)** que rastrea quién creó, modificó o eliminó registros en todas las entidades del panel de administración de SinAQ.

---

## 📦 Qué se ha creado

### 4 archivos nuevos

| Archivo | Descripción |
|---|---|
| `sql/create_audit_log.sql` | Migración SQL — tabla `audit_log` con PK uuid, tracking de usuario, acción/entidad/id_registro, snapshots before/after en JSONB, índices y políticas RLS |
| `src/services/auditLog.js` | Servicio con `logAudit()` (no-bloqueante, nunca lanza errores) y `getAuditLogs()` (paginado, filtrable por entidad/acción/usuario/fecha) |
| `src/components/AuditLogTable.vue` | Tabla paginada server-side con filtros (entidad, acción, usuario, rango de fechas), pills de acción con colores (verde=CREATE, amarillo=UPDATE, rojo=DELETE), filas expandibles con diff de campos modificados |
| `src/views/AuditLogView.vue` | Vista admin que envuelve la tabla |

### 10 archivos modificados

| Archivo | Cambios |
|---|---|
| `src/services/operarios.js` | Audit en create/update/delete (incluye asignaciones de zonas) |
| `src/services/uo.js` | Audit en create/update/soft-delete |
| `src/services/zonas.js` | Audit en create/update/soft-delete |
| `src/services/infraestructuras.js` | Audit en create/update/soft-delete |
| `src/services/puntosMuestreo.js` | Audit en create/update/soft-delete |
| `src/services/parametrosCalidad.js` | Audit en upsert (detecta automáticamente si es CREATE o UPDATE) |
| `src/services/analiticas.js` | Audit en create (setAnaliticas) |
| `src/services/supabase.js` | Audit en updateAnaliticabyId y deleteAnalitica |
| `src/router/index.js` | Ruta nueva `/admin/audit` |
| `src/menuNavBar.js` | Menú "Registro de Actividad" (solo admin) en dropdown Administración |

---

## 🗃️ Esquema de base de datos

### Tabla `audit_log`

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | `uuid` (PK) | Identificador único |
| `user_id` | `text` | Email del usuario |
| `user_name` | `text` | Nombre visible del usuario |
| `action` | `text` | `CREATE`, `UPDATE`, o `DELETE` |
| `entity` | `text` | Entidad afectada (`operarios`, `zonas`, `uo`, `infraestructuras`, `puntos_muestreo`, `parametros_calidad`, `analiticas`) |
| `record_id` | `bigint` | ID del registro afectado |
| `before_values` | `jsonb` | Snapshot antes del cambio (null en CREATE) |
| `after_values` | `jsonb` | Snapshot después del cambio (null en DELETE) |
| `created_at` | `timestamptz` | Marca de tiempo |

### Índices creados

- `idx_audit_log_entity` — búsqueda por entidad
- `idx_audit_log_user_id` — búsqueda por usuario
- `idx_audit_log_action` — búsqueda por tipo de acción
- `idx_audit_log_created_at` — ordenación por fecha
- `idx_audit_log_record_id` — búsqueda por registro

---

## 🎯 Cómo funciona

1. **Cada operación CRUD** (crear, modificar, eliminar) en cualquier entidad admin **dispara automáticamente** una entrada en `audit_log`
2. El logging es **no-bloqueante**: si falla el registro de auditoría, nunca bloquea la operación principal
3. Se captura el **estado antes y después** de cada cambio para poder ver diffs detallados
4. Solo los usuarios **admin** pueden acceder a `/admin/audit`

---

## 🖥️ Interfaz de usuario

La vista **Registro de Actividad** (`/admin/audit`) incluye:

- **Filtros combinables**: entidad, acción, usuario (por email/nombre), rango de fechas (desde/hasta)
- **Paginación server-side**: 25 registros por página (configurable)
- **Columnas**: Fecha, Usuario, Acción (pill coloreado), Entidad (pill), Resumen, Detalle
- **Filas expandibles**: al pulsar "Ver cambios" se muestra un diff campo a campo con valores antes → después (tachado rojo = valor anterior, verde = valor nuevo)
- **Ordenación clickeable** por fecha y usuario

---

## ✅ Pasos pendientes

> ⚠️ **Acción requerida**
>
> Ejecutar la migración SQL en el editor de Supabase:
> ```
> sql/create_audit_log.sql
> ```
>
> Sin esta tabla, las llamadas a `logAudit` fallarán silenciosamente (no romperán nada pero no registrarán actividad).

---

## 🔧 Decisiones técnicas

| Decisión | Razón |
|---|---|
| **Logging a nivel de aplicación** (no triggers DB) | Más simple, usa el cliente Supabase existente, captura contexto de usuario fácilmente |
| **No-bloqueante** | `logAudit` captura sus propios errores — un fallo de logging nunca impide un CRUD |
| **Snapshots JSONB completos** | Almacena before/after como jsonb para diffs fáciles de visualizar después |
| **Soft-delete compatible** | Funciona con el patrón existente de `activo: false` |
| **RLS policies** | Solo admins pueden acceder a la tabla de auditoría |
