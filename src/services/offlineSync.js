import { supabase, setSupabaseAuthContext } from '@/services/supabase';
import { usePlantasStore } from '@/stores/plantas';
import { useNotifications } from '@/composables/useNotifications';

const OFFLINE_KEY = 'pending_analiticas';
const OFFLINE_AUTH_KEY = 'aqlara_offline_auth';
const OFFLINE_AUTH_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 días

/**
 * Ensures the Supabase RLS auth context is set before syncing.
 * When the PWA is killed and reopened, sessionStorage is cleared and the login
 * store may not have initialized yet — we restore the context from the offline
 * auth cache (localStorage) so that RLS policies (is_authenticated_request,
 * auth_check_zone) allow the insert.
 */
const ensureAuthContext = () => {
  if (supabase.rest.headers['X-User-Email']) return; // Already set by login store

  try {
    const cached = JSON.parse(localStorage.getItem(OFFLINE_AUTH_KEY) || 'null');
    if (!cached?.email || !cached?.role) return;
    if (Date.now() - cached.savedAt > OFFLINE_AUTH_MAX_AGE) return;

    console.log('🔐 Restaurando contexto auth para sync offline:', cached.email);
    setSupabaseAuthContext(cached.email, cached.role);
  } catch (e) {
    console.warn('No se pudo restaurar contexto auth para sync offline:', e);
  }
};

/**
 * Guarda una analítica en el almacenamiento local para enviarla después.
 */
export const saveAnaliticaOffline = (data) => {
  const pending = JSON.parse(localStorage.getItem(OFFLINE_KEY) || '[]');
  pending.push({
    ...data,
    timestamp: new Date().toISOString()
  });
  localStorage.setItem(OFFLINE_KEY, JSON.stringify(pending));
  console.log('📦 Analítica guardada localmente por falta de cobertura');
};

/**
 * Intenta enviar todas las analíticas pendientes a Supabase.
 */
export const syncOfflineAnaliticas = async () => {
  const pending = JSON.parse(localStorage.getItem(OFFLINE_KEY) || '[]');
  if (pending.length === 0) return;

  // Restore RLS auth headers if not set (PWA cold start after kill)
  ensureAuthContext();

  if (!supabase.rest.headers['X-User-Email']) {
    console.warn('⚠️ Sync offline abortado: no hay contexto de autenticación disponible.');
    return;
  }

  console.log(`📡 Conexión detectada. Sincronizando ${pending.length} analíticas pendientes...`);

  const { success, error: notifyError } = useNotifications();
  const successfullySyncedTimestamps = [];
  const syncErrors = [];

  // Procesar uno a uno
  for (const item of pending) {
    try {
      // Extraemos el timestamp que usamos como ID temporal
      const { timestamp, ...supabaseData } = item;

      const { error } = await supabase.from('analiticas').insert([supabaseData]);

      if (!error) {
        successfullySyncedTimestamps.push(timestamp);
      } else {
        console.error('Error sincronizando analítica:', error.message);
        syncErrors.push(error.message);
      }
    } catch (e) {
      console.error('Error de red durante la sincronización:', e);
      syncErrors.push(e.message || 'Error de red desconocido');
      break; // Detener si hay un fallo de red total
    }
  }

  // Mantener en cola solo los que fallaron
  const remaining = pending.filter(item => !successfullySyncedTimestamps.includes(item.timestamp));
  localStorage.setItem(OFFLINE_KEY, JSON.stringify(remaining));

  if (successfullySyncedTimestamps.length > 0) {
    // Intentar refrescar el store si estamos en un contexto de Vue
    try {
      const plantasStore = usePlantasStore();
      plantasStore.loadAnaliticas();
    } catch (e) {
      // Silencioso si no hay instancia de Pinia lista
    }
    console.log(`✅ Sincronización completada: ${successfullySyncedTimestamps.length} registros enviados.`);
    success(
      `Se ${successfullySyncedTimestamps.length === 1 ? 'ha enviado 1 analítica pendiente' : `han enviado ${successfullySyncedTimestamps.length} analíticas pendientes`} correctamente.`,
      { title: 'Sincronización completada', life: 8000 }
    );
  }

  if (syncErrors.length > 0) {
    const uniqueErrors = [...new Set(syncErrors)];
    notifyError(
      `No se ${syncErrors.length === 1 ? 'pudo enviar 1 analítica' : `pudieron enviar ${syncErrors.length} analíticas`}: ${uniqueErrors.join(' | ')}`,
      { title: 'Error en sincronización offline', life: 0 }
    );
  }
};

/**
 * Registers the online event listener for automatic sync on reconnection.
 * The initial sync on app startup is handled by the login store after the
 * auth context is established — do NOT call syncOfflineAnaliticas() here,
 * because main.js runs before the login store initializes.
 */
export const initOfflineSync = () => {
  window.addEventListener('online', () => {
    syncOfflineAnaliticas();
  });
};
