<script setup>
import { mdiFlaskEmptyOutline, mdiFilter, mdiDownload, mdiAlertCircle, mdiCheckCircle, mdiChevronDown, mdiChevronUp } from '@mdi/js';
import { computed, onMounted, ref, watch } from 'vue';
import CardBox from '@/components/CardBox.vue';
import LayoutAuthenticated from '@/layouts/LayoutAuthenticated.vue';
import SectionTitleLineWithButton from '@/components/SectionTitleLineWithButton.vue';
import AnaliticsTableServerSide from '@/components/AnaliticsTableServerSide.vue';
import useExtractdata from '@/composables/useUploadFormData';
import BaseIcon from '@/components/BaseIcon.vue';
import { useDashboardIncidencias } from '@/composables/useDashboardIncidencias'
import { usePlantasStore } from '@/stores/plantas'
import useLoginStore from '@/stores/login'

import AdvancedExportControls from '@/components/AdvancedExportControls.vue';
import { usePermissions } from '@/composables/usePermissions';

const tablaAnaliticas = ref();
const { exportXMLData } = useExtractdata();
const selectedZona= ref(null);
const { isAdmin: isAdminRole, canExport: canExportAndPrint, isOperario } = usePermissions();
const { resumen, sinIncidencias, cargando, cargarIncidencias } = useDashboardIncidencias()
const dashboardAbierto = ref(true)
const loginStore = useLoginStore()
const plantaStore = usePlantasStore()

const getZonasOperario = () => {
  if (loginStore.userRole === '99') return null
  const operario = plantaStore.getOperarios?.find(
    (op) => op.email?.toLowerCase() === loginStore.userEmail?.toLowerCase()
  )
  if (!operario?.zonas?.length) return []
  return operario.zonas.map((z) => (typeof z === 'object' ? z.id : z))
}

const getNombrePunto = (puntoId) => {
  return plantaStore.getPuntosMuestreo.find((p) => p.id === puntoId)?.name || `#${puntoId}`
}

onMounted(() => {
  if (!isOperario.value) cargarIncidencias(getZonasOperario())
})

const limpiarFiltros = () => {
  tablaAnaliticas.value?.resetForm();
};

// selectedZona.value = tablaAnaliticas.value?.filters?.zona || null;

watch(() => tablaAnaliticas.value?.filters?.zona, (newZona) => {
  console.log('Zona seleccionada:', newZona);
  selectedZona.value = newZona;
}, { immediate: true });



const downloadXML = () => {
  if (!isAdminRole.value) return;

  const analiticasSeleccionadas = (tablaAnaliticas.value?.checkedRows || [])
    .filter(item => item.type === 28 || item.type === 29);
  if (analiticasSeleccionadas.length === 0) {
    alert('Por favor, seleccione al menos una analítica de tipo Operacional o Rutina para XML.');
    return;
  }
  const xmlContent = exportXMLData(analiticasSeleccionadas);
  const blob = new Blob([xmlContent], { type: 'application/xml' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `analiticas_AQLARA_${new Date().toISOString().split('T')[0]}.xml`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

const selectedAnaliticasFromTable = computed(() => tablaAnaliticas.value?.checkedRows || []);

// Ref para almacenar todas las analíticas filtradas (para server-side)
const allFilteredAnaliticas = ref([]);

// Para exportaciones, retornar las analíticas filtradas cargadas
const allAnaliticasForDateRange = computed(() => {
  return allFilteredAnaliticas.value
});

// Método para cargar todas las analíticas filtradas cuando se necesite para exportación
const loadAllAnalyticsForExport = async () => {
  if (!canExportAndPrint.value) return [];

  console.log('🔄 Cargando todas las analíticas filtradas para exportación...')
  try {
    const allData = await tablaAnaliticas.value?.loadAllFilteredData()
    allFilteredAnaliticas.value = allData || []
    console.log(`✅ Cargadas ${allFilteredAnaliticas.value.length} analíticas filtradas`)
  } catch (error) {
    console.error('Error cargando analíticas filtradas:', error)
    allFilteredAnaliticas.value = []
  }
  return allFilteredAnaliticas.value
};

</script>

<template>
  <LayoutAuthenticated>
    <section class="p-6">
      <SectionTitleLineWithButton :icon="mdiFlaskEmptyOutline" title="Analíticas" main>
        <div class="flex flex-wrap gap-2">
          <!-- Download XML -->
          <button
            v-if="isAdminRole && exportXMLData"
            class="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium text-white bg-gradient-to-r from-sky-500 to-blue-600 shadow-md shadow-sky-300/50 dark:shadow-sky-900/40 transition-all duration-200 hover:from-sky-600 hover:to-blue-700 hover:-translate-y-0.5 hover:shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-md"
            :disabled="selectedAnaliticasFromTable.length === 0"
            @click="downloadXML"
          >
            <BaseIcon :path="mdiDownload" size="16" />
            <span>XML</span>
          </button>

          <!-- Imprimir + Excel -->
          <AdvancedExportControls
            v-if="canExportAndPrint"
            :selected-rows="selectedAnaliticasFromTable"
            :all-analiticas-for-date-range="allAnaliticasForDateRange"
            file-name-base="Informe_Analiticas_AQLARA"
            logo-url="https://zinnae.org/wp-content/uploads/2023/12/aqlaraLOGO-1030x503.png"
            company-name="AQLARA Ciclo Integral del Agua"
            :enable-html-print="true"
            :selected-zona="selectedZona"
            :on-before-export="loadAllAnalyticsForExport"
          />

          <!-- Limpiar filtros -->
          <button
            class="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium text-white bg-gradient-to-r from-slate-500 to-slate-700 shadow-md shadow-slate-300/50 dark:shadow-slate-900/40 transition-all duration-200 hover:from-slate-600 hover:to-slate-800 hover:-translate-y-0.5 hover:shadow-lg active:scale-95"
            @click="limpiarFiltros"
          >
            <BaseIcon :path="mdiFilter" size="16" />
            <span>Limpiar filtros</span>
          </button>
        </div>
      </SectionTitleLineWithButton>

      <!-- Dashboard de incidencias -->
      <CardBox v-if="resumen.total > 0 && !isOperario" class="mb-6 mx-10">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-lg font-semibold text-gray-700 dark:text-gray-200">
            Resumen de incidencias — últimos 7 días
          </h3>
          <button
            class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            @click="dashboardAbierto = !dashboardAbierto"
          >
            <BaseIcon :path="dashboardAbierto ? mdiChevronUp : mdiChevronDown" size="20" />
          </button>
        </div>

        <div v-if="dashboardAbierto">
          <div v-if="cargando" class="flex items-center gap-2 text-gray-500 py-4">
            <span class="animate-spin inline-block w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full" />
            <span>Cargando resumen...</span>
          </div>

          <div v-else-if="sinIncidencias" class="flex items-center gap-2 text-green-600 dark:text-green-400 py-4">
            <BaseIcon :path="mdiCheckCircle" size="24" />
            <span class="font-medium">Todas las analíticas de los últimos 7 días están dentro de rango.</span>
          </div>

          <div v-else>
            <!-- Tarjetas de resumen -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-3 text-center">
                <p class="text-2xl font-bold text-red-600 dark:text-red-400">{{ resumen.conIncidencias }}</p>
                <p class="text-xs text-red-500 dark:text-red-400 font-medium">Fuera de rango</p>
                <p class="text-xs text-red-400">de {{ resumen.total }} ({{ resumen.porcentaje }}%)</p>
              </div>
              <div class="bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg p-3 text-center">
                <p class="text-xl font-bold text-gray-700 dark:text-gray-200">{{ resumen.porCloro }}</p>
                <p class="text-xs text-gray-500">Cloro</p>
              </div>
              <div class="bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg p-3 text-center">
                <p class="text-xl font-bold text-gray-700 dark:text-gray-200">{{ resumen.porPh }}</p>
                <p class="text-xs text-gray-500">pH</p>
              </div>
              <div class="bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg p-3 text-center">
                <p class="text-xl font-bold text-gray-700 dark:text-gray-200">{{ resumen.porTurbidez }}</p>
                <p class="text-xs text-gray-500">Turbidez</p>
              </div>
            </div>

            <div class="flex flex-wrap gap-3 text-sm text-gray-600 dark:text-gray-400">
              <span class="flex items-center gap-1">
                <BaseIcon :path="mdiAlertCircle" size="16" class="text-amber-500" />
                {{ resumen.porOrganolepticos }} con incidencias organolépticas
              </span>
              <span>·</span>
              <span>{{ resumen.puntosAfectados }} {{ resumen.puntosAfectados === 1 ? 'punto afectado' : 'puntos afectados' }}</span>
            </div>

            <!-- Últimas incidencias -->
            <div v-if="resumen.ultimas.length > 0" class="mt-4 border-t border-gray-200 dark:border-slate-600 pt-3">
              <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Últimas incidencias</p>
              <div class="space-y-2">
                <div
                  v-for="inc in resumen.ultimas"
                  :key="inc.id"
                  class="flex items-center gap-3 text-sm bg-red-50 dark:bg-red-900/10 rounded-lg px-3 py-2 flex-wrap"
                >
                  <span class="text-xs text-gray-500 font-mono whitespace-nowrap">{{ inc.fecha }}</span>
                  <span class="text-gray-500 dark:text-gray-400 text-xs">{{ getNombrePunto(inc.punto_muestreo_fk) }}</span>
                  <div class="flex gap-2">
                    <span v-if="inc.cloroWrong" class="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400">Cloro</span>
                    <span v-if="inc.phWrong" class="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400">pH</span>
                    <span v-if="inc.turbidezWrong" class="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400">Turbidez</span>
                    <span v-if="inc.olorWrong || inc.colorWrong || inc.saborWrong" class="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400">Organolépticos</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardBox>

      <CardBox class="mb-6 mx-10" has-table>
        <AnaliticsTableServerSide 
          ref="tablaAnaliticas" 
          checkable 
        />
      </CardBox>
    </section>
  </LayoutAuthenticated>
</template>