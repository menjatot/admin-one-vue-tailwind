<script setup>
import { computed, onMounted, ref } from 'vue'
import { mdiClipboardCheckOutline, mdiDownload, mdiRefresh } from '@mdi/js'
import LayoutAuthenticated from '@/layouts/LayoutAuthenticated.vue'
import SectionMain from '@/components/SectionMain.vue'
import SectionTitleLineWithButton from '@/components/SectionTitleLineWithButton.vue'
import CardBox from '@/components/CardBox.vue'
import BaseButton from '@/components/BaseButton.vue'
import BaseIcon from '@/components/BaseIcon.vue'
import CardBoxModal from '@/components/CardBoxModal.vue'
import { usePlantasStore } from '@/stores/plantas'
import useLoginStore from '@/stores/login'
import { usePermissions } from '@/composables/usePermissions'
import { useNotifications } from '@/composables/useNotifications'
import { formatDate } from '@/helpers'
import { contarEstadosXmlSinac, estadoZonasDesdeXmls, filtrarHistoricoXmlSinac, transicionesEstadoXmlSinac } from '@/helpers/xmlSinacControl'
import { cambiarEstadoXmlSinac, getXmlSinac, obtenerUrlXmlSinac } from '@/services/xmlSinac'

const plantaStore = usePlantasStore()
const loginStore = useLoginStore()
const { isAdmin } = usePermissions()
const { success: notifySuccess, error: notifyError } = useNotifications()

const ESTADOS = {
  generado: {
    label: 'XML generado (pendiente de envío)',
    clase: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
  },
  anulado: {
    label: 'Anulado',
    clase: 'bg-gray-200 text-gray-600 dark:bg-slate-700 dark:text-slate-300'
  },
  correcto: {
    label: 'Correcto (subido a SINAC)',
    clase: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
  },
  con_errores: {
    label: 'Subido con errores',
    clase: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
  }
}

const ETIQUETA_ACCION = { anulado: 'Anular', correcto: 'Correcto', con_errores: 'Con errores' }
const COLOR_ACCION = { anulado: 'danger', correcto: 'success', con_errores: 'warning' }

const xmls = ref([])
const cargando = ref(false)
const errorCarga = ref(null)
const guardando = ref(false)

// Filtros del histórico
const filtroEstado = ref('')
const filtroTecnico = ref('')
const filtroDesde = ref('')
const filtroHasta = ref('')

// Filtros de zonas
const filtroZona = ref('')
const soloConActividad = ref(false)

const expandidos = ref([])
const xmlAAnular = ref(null)

const usuarioActual = computed(() => (loginStore.userEmail ?? '').toLowerCase())

const cargar = async () => {
  cargando.value = true
  errorCarga.value = null
  try {
    xmls.value = await getXmlSinac()
  } catch (e) {
    errorCarga.value = e?.message ?? String(e)
  } finally {
    cargando.value = false
  }
}

onMounted(() => {
  // Catálogos que necesita esta pantalla (normalmente ya cargados al entrar)
  if (!plantaStore.getZonas?.length) plantaStore.loadZonas?.()
  if (!plantaStore.getCentrosCoste?.length) plantaStore.loadCentrosCoste?.()
  cargar()
})

const nombreTecnico = (xml) => xml.tecnico_nombre || xml.tecnico_email || '—'

const fechaHora = (iso) =>
  iso
    ? new Date(iso).toLocaleString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : '—'

const rangoTexto = (desde, hasta) =>
  desde && hasta ? `${formatDate(desde)} → ${formatDate(hasta)}` : '—'

// ---------- Estado por zona de abastecimiento ----------

const estadoPorZona = computed(() => estadoZonasDesdeXmls(xmls.value, plantaStore.getZonas ?? []))

const zonasFiltradas = computed(() => {
  const q = filtroZona.value.trim().toLowerCase()
  return estadoPorZona.value.filter((f) => {
    if (soloConActividad.value && !f.cargado_hasta && !f.ultimo) return false
    if (q && !f.zona_nombre.toLowerCase().includes(q)) return false
    return true
  })
})

// ---------- Histórico ----------

const historicoFiltrado = computed(() =>
  filtrarHistoricoXmlSinac(xmls.value, {
    estado: filtroEstado.value,
    tecnico: filtroTecnico.value,
    desde: filtroDesde.value,
    hasta: filtroHasta.value
  })
)

const contadores = computed(() => contarEstadosXmlSinac(xmls.value))

// ---------- Acciones ----------

const puedeMarcar = (xml) =>
  isAdmin.value || (xml.tecnico_email ?? '').toLowerCase() === usuarioActual.value

const accionesDisponibles = (xml) =>
  puedeMarcar(xml) ? transicionesEstadoXmlSinac(xml.estado) : []

const marcar = (xml, nuevoEstado) => {
  if (nuevoEstado === 'anulado') {
    xmlAAnular.value = xml
    return
  }
  aplicarEstado(xml, nuevoEstado)
}

const aplicarEstado = async (xml, nuevoEstado) => {
  guardando.value = true
  try {
    const actualizado = await cambiarEstadoXmlSinac(xml.id, nuevoEstado)
    const idx = xmls.value.findIndex((x) => x.id === xml.id)
    if (idx >= 0) xmls.value[idx] = { ...xmls.value[idx], ...actualizado }
    notifySuccess(`XML marcado como «${ESTADOS[nuevoEstado].label}».`)
  } catch (e) {
    notifyError('No se pudo cambiar el estado: ' + (e?.message ?? e))
  } finally {
    guardando.value = false
    xmlAAnular.value = null
  }
}

const modalAnularAbierto = computed({
  get: () => !!xmlAAnular.value,
  set: (v) => {
    if (!v) xmlAAnular.value = null
  }
})

const confirmarAnular = () => {
  if (xmlAAnular.value) aplicarEstado(xmlAAnular.value, 'anulado')
}

const redescargar = async (xml) => {
  if (!xml.fichero_path) {
    notifyError('Este XML no tiene fichero guardado en el servidor.')
    return
  }
  try {
    const url = await obtenerUrlXmlSinac(xml.fichero_path, xml.nombre_fichero)
    const resp = await fetch(url)
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    const blob = await resp.blob()
    const objUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = objUrl
    a.download = xml.nombre_fichero
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(objUrl)
  } catch (e) {
    notifyError('No se pudo recuperar el fichero: ' + (e?.message ?? e))
  }
}

const toggleExpandido = (id) => {
  const i = expandidos.value.indexOf(id)
  if (i >= 0) expandidos.value.splice(i, 1)
  else expandidos.value.push(id)
}

const idCorto = (id) => (id ? String(id).slice(0, 8) : '—')
</script>

<template>
  <LayoutAuthenticated>
    <SectionMain fluid>
      <SectionTitleLineWithButton :icon="mdiClipboardCheckOutline" title="Control SINAC" main>
        <BaseButton
          :icon="mdiRefresh"
          label="Recargar"
          color="info"
          small
          rounded-full
          :disabled="cargando"
          @click="cargar"
        />
      </SectionTitleLineWithButton>

      <div v-if="errorCarga" class="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        Error cargando el control: {{ errorCarga }}
      </div>

      <!-- Estado por zona de abastecimiento -->
      <CardBox class="mb-6">
        <div class="p-5 pb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 class="text-lg font-semibold">Estado por zona de abastecimiento</h2>
            <p class="text-xs text-gray-500 dark:text-slate-400">
              «Cargado correctamente hasta» se calcula con los XML marcados como Correcto (de cualquier técnico).
              Los anulados y con errores no cuentan.
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-3">
            <label class="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-300">
              <input v-model="soloConActividad" type="checkbox" class="rounded border-gray-300" />
              Solo zonas con XMLs
            </label>
            <input
              v-model="filtroZona"
              type="text"
              placeholder="Buscar zona…"
              class="rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm px-3 py-2"
            />
          </div>
        </div>
        <div class="overflow-x-auto">
          <table class="min-w-full text-sm">
            <thead>
              <tr class="text-left text-xs uppercase tracking-wide text-gray-400 border-b dark:border-slate-600">
                <th class="px-5 py-2">Zona de abastecimiento</th>
                <th class="px-5 py-2">Cargado correctamente hasta</th>
                <th class="px-5 py-2">Estado</th>
                <th class="px-5 py-2">Último XML</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="cargando && xmls.length === 0">
                <td class="px-5 py-4 text-gray-500" colspan="4">Cargando…</td>
              </tr>
              <tr v-else-if="zonasFiltradas.length === 0">
                <td class="px-5 py-4 text-gray-500" colspan="4">No hay zonas que coincidan con el filtro.</td>
              </tr>
              <tr
                v-for="fila in zonasFiltradas"
                :key="`${fila.zona_fk}-${fila.zona_nombre}`"
                class="border-b last:border-0 dark:border-slate-700"
              >
                <td class="px-5 py-2 font-medium">{{ fila.zona_nombre }}</td>
                <td class="px-5 py-2">
                  <span v-if="fila.cargado_hasta">{{ formatDate(fila.cargado_hasta) }}</span>
                  <span v-else class="text-gray-400">—</span>
                </td>
                <td class="px-5 py-2">
                  <span
                    v-if="fila.ultimo"
                    :class="['px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap', ESTADOS[fila.ultimo.estado].clase]"
                  >
                    {{ ESTADOS[fila.ultimo.estado].label }}
                  </span>
                  <span
                    v-else
                    class="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-slate-300"
                  >
                    Sin cargas
                  </span>
                </td>
                <td class="px-5 py-2 text-gray-500 dark:text-slate-400">
                  <span v-if="fila.ultimo">{{ fechaHora(fila.ultimo.fecha_generacion) }}</span>
                  <span v-else>—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </CardBox>

      <!-- Histórico de XMLs -->
      <CardBox>
        <div class="p-5 pb-3">
          <h2 class="text-lg font-semibold mb-1">Histórico de XMLs</h2>
          <div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-slate-400 mb-3">
            <span>Total: <b>{{ contadores.total }}</b></span>
            <span>Pendientes: <b>{{ contadores.generado }}</b></span>
            <span>Correctos: <b>{{ contadores.correcto }}</b></span>
            <span>Con errores: <b>{{ contadores.con_errores }}</b></span>
            <span>Anulados: <b>{{ contadores.anulado }}</b></span>
          </div>
          <div class="flex flex-wrap items-center gap-3">
            <select
              v-model="filtroEstado"
              class="rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm px-3 py-2"
            >
              <option value="">Todos los estados</option>
              <option value="generado">XML generado (pendiente)</option>
              <option value="correcto">Correcto</option>
              <option value="con_errores">Con errores</option>
              <option value="anulado">Anulado</option>
            </select>
            <input
              v-model="filtroTecnico"
              type="text"
              placeholder="Técnico…"
              class="rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm px-3 py-2"
            />
            <label class="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-300">
              Generado entre
              <input
                v-model="filtroDesde"
                type="date"
                class="rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm px-2 py-1.5"
              />
              y
              <input
                v-model="filtroHasta"
                type="date"
                class="rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm px-2 py-1.5"
              />
            </label>
          </div>
        </div>
        <div class="overflow-x-auto">
          <table class="min-w-full text-sm">
            <thead>
              <tr class="text-left text-xs uppercase tracking-wide text-gray-400 border-b dark:border-slate-600">
                <th class="px-5 py-2">ID</th>
                <th class="px-5 py-2">Técnico</th>
                <th class="px-5 py-2">Generado</th>
                <th class="px-5 py-2">Rango</th>
                <th class="px-5 py-2">Fichero</th>
                <th class="px-5 py-2 text-center">Nº ZA</th>
                <th class="px-5 py-2 text-center">Nº analíticas</th>
                <th class="px-5 py-2">Estado</th>
                <th class="px-5 py-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <template v-for="xml in historicoFiltrado" :key="xml.id">
                <tr class="border-b dark:border-slate-700 align-top">
                  <td class="px-5 py-2 font-mono text-xs" :title="xml.id">{{ idCorto(xml.id) }}</td>
                  <td class="px-5 py-2">
                    <div>{{ nombreTecnico(xml) }}</div>
                    <div class="text-xs text-gray-400">{{ xml.tecnico_email }}</div>
                  </td>
                  <td class="px-5 py-2 whitespace-nowrap">{{ fechaHora(xml.fecha_generacion) }}</td>
                  <td class="px-5 py-2 whitespace-nowrap">{{ rangoTexto(xml.fecha_desde, xml.fecha_hasta) }}</td>
                  <td class="px-5 py-2">
                    <div class="max-w-[260px] truncate" :title="xml.nombre_fichero">{{ xml.nombre_fichero }}</div>
                    <button class="text-xs text-blue-500 hover:underline" @click="toggleExpandido(xml.id)">
                      {{ expandidos.includes(xml.id) ? 'Ocultar zonas' : 'Ver zonas' }}
                    </button>
                  </td>
                  <td class="px-5 py-2 text-center">{{ xml.num_za }}</td>
                  <td class="px-5 py-2 text-center">{{ xml.num_analiticas }}</td>
                  <td class="px-5 py-2">
                    <span :class="['px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap', ESTADOS[xml.estado].clase]">
                      {{ ESTADOS[xml.estado].label }}
                    </span>
                  </td>
                  <td class="px-5 py-2">
                    <div class="flex flex-wrap items-center gap-1.5">
                      <BaseButton
                        v-for="accion in accionesDisponibles(xml)"
                        :key="accion"
                        :label="ETIQUETA_ACCION[accion]"
                        :color="COLOR_ACCION[accion]"
                        small
                        :disabled="guardando"
                        @click="marcar(xml, accion)"
                      />
                      <BaseButton
                        v-if="xml.fichero_path"
                        :icon="mdiDownload"
                        color="info"
                        small
                        outline
                        title="Volver a descargar el XML"
                        :disabled="guardando"
                        @click="redescargar(xml)"
                      />
                    </div>
                  </td>
                </tr>
                <tr v-if="expandidos.includes(xml.id)" class="border-b dark:border-slate-700 bg-gray-50 dark:bg-slate-800/40">
                  <td class="px-5 py-3" colspan="9">
                    <table class="min-w-full text-xs">
                      <thead>
                        <tr class="text-left uppercase text-gray-400">
                          <th class="py-1 pr-6">Zona de abastecimiento</th>
                          <th class="py-1 pr-6">Desde</th>
                          <th class="py-1 pr-6">Hasta</th>
                          <th class="py-1 text-center">Nº analíticas</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="z in xml.xml_sinac_zonas" :key="z.id" class="border-t dark:border-slate-700">
                          <td class="py-1 pr-6">{{ z.zona_nombre }}</td>
                          <td class="py-1 pr-6">{{ z.fecha_desde ? formatDate(z.fecha_desde) : '—' }}</td>
                          <td class="py-1 pr-6">{{ z.fecha_hasta ? formatDate(z.fecha_hasta) : '—' }}</td>
                          <td class="py-1 text-center">{{ z.num_analiticas }}</td>
                        </tr>
                        <tr v-if="!xml.xml_sinac_zonas?.length">
                          <td class="py-1 text-gray-400" colspan="4">Sin desglose de zonas.</td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
              </template>
              <tr v-if="!cargando && historicoFiltrado.length === 0">
                <td class="px-5 py-4 text-gray-500" colspan="9">
                  No hay XMLs registrados{{ filtroEstado || filtroTecnico || filtroDesde || filtroHasta ? ' con esos filtros' : '' }}.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </CardBox>

      <!-- Confirmación de anulado -->
      <CardBoxModal
        v-model="modalAnularAbierto"
        title="Anular XML"
        button-label="Sí, anular"
        button="danger"
        has-cancel
        @confirm="confirmarAnular"
        @cancel="xmlAAnular = null"
      >
        <p>
          ¿Seguro que quieres anular <b>{{ xmlAAnular?.nombre_fichero }}</b>?
        </p>
        <p class="text-sm text-gray-500 dark:text-slate-400">
          Se mantendrá en el histórico, pero no contará como carga realizada en el control de zonas.
        </p>
      </CardBoxModal>
    </SectionMain>
  </LayoutAuthenticated>
</template>
