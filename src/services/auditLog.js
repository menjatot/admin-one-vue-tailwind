import { supabase } from './supabase'
import { useLoginStore } from '@/stores/login'

/**
 * Logs a CRUD operation to the audit_log table.
 * This function is non-blocking — it catches its own errors so that
 * a logging failure never prevents the main operation from completing.
 *
 * @param {'CREATE'|'UPDATE'|'DELETE'} action
 * @param {string} entity - Entity name (e.g. 'operarios', 'zonas', 'analiticas')
 * @param {number|null} recordId - ID of the affected record
 * @param {object|null} beforeValues - Snapshot before the change
 * @param {object|null} afterValues - Snapshot after the change
 */
export const logAudit = async (action, entity, recordId, beforeValues = null, afterValues = null) => {
  try {
    const loginStore = useLoginStore()
    const userId = loginStore.userEmail || 'unknown'
    const userName = loginStore.userName || 'Desconocido'

    const { error } = await supabase.from('audit_log').insert({
      user_id: userId,
      user_name: userName,
      action,
      entity,
      record_id: recordId ?? null,
      before_values: beforeValues ? JSON.parse(JSON.stringify(beforeValues)) : null,
      after_values: afterValues ? JSON.parse(JSON.stringify(afterValues)) : null
    })

    if (error) {
      console.warn('[Audit] Failed to log audit entry:', error.message)
    }
  } catch (err) {
    // Never throw — logging should never break the main flow
    console.warn('[Audit] Exception logging audit entry:', err.message)
  }
}

/**
 * Fetches audit logs with optional filters and pagination.
 *
 * @param {object} options
 * @param {string} [options.entity] - Filter by entity type
 * @param {string} [options.action] - Filter by action type
 * @param {string} [options.userId] - Filter by user email
 * @param {string} [options.dateFrom] - ISO date string (start)
 * @param {string} [options.dateTo] - ISO date string (end)
 * @param {number} [options.page=1] - Page number (1-based)
 * @param {number} [options.pageSize=25] - Rows per page
 * @param {string} [options.sortBy='created_at'] - Column to sort by
 * @param {string} [options.sortOrder='desc'] - 'asc' or 'desc'
 * @returns {Promise<{data: Array, count: number, totalPages: number}>}
 */
export const getAuditLogs = async ({
  entity,
  action,
  userId,
  dateFrom,
  dateTo,
  page = 1,
  pageSize = 25,
  sortBy = 'created_at',
  sortOrder = 'desc'
} = {}) => {
  let query = supabase.from('audit_log').select('*', { count: 'exact' })

  // Apply filters
  if (entity) {
    query = query.eq('entity', entity)
  }
  if (action) {
    query = query.eq('action', action)
  }
  if (userId) {
    query = query.ilike('user_id', `%${userId}%`)
  }
  if (dateFrom) {
    query = query.gte('created_at', dateFrom)
  }
  if (dateTo) {
    query = query.lte('created_at', dateTo)
  }

  // Pagination
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  query = query.range(from, to)

  // Sorting
  query = query.order(sortBy, { ascending: sortOrder === 'asc' })

  const { data, count, error } = await query

  if (error) {
    console.error('[Audit] Error fetching audit logs:', error.message)
    throw error
  }

  const totalPages = Math.ceil((count || 0) / pageSize)

  return { data: data || [], count: count || 0, totalPages }
}
