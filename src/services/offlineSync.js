import { supabase } from '@/services/supabase';
import { usePlantasStore } from '@/stores/plantas';

const OFFLINE_KEY = 'pending_analiticas';

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

  console.log(`📡 Conexión detectada. Sincronizando ${pending.length} analíticas pendientes...`);
  
  const successfullySyncedTimestamps = [];
  
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
      }
    } catch (e) {
      console.error('Error de red durante la sincronización:', e);
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
  }
};

/**
 * Inicia los escuchadores de eventos para la sincronización automática.
 */
export const initOfflineSync = () => {
  // 1. Escuchar cuando el navegador vuelve a tener internet
  window.addEventListener('online', () => {
    syncOfflineAnaliticas();
  });
  
  // 2. Ejecutar limpieza inicial si ya estamos online al cargar la app
  if (navigator.onLine) {
    syncOfflineAnaliticas();
  }
};
