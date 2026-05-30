<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
// import { useMainStore } from '@/stores/main'
import { mdiChevronDown, mdiChevronLeft, mdiPencil, mdiTrashCan } from '@mdi/js'
// import CardBoxModal from '@/components/CardBoxModal.vue'
import TableCheckboxCell from '@/components/TableCheckboxCell.vue'
import BaseLevel from '@/components/BaseLevel.vue'
import BaseButtons from '@/components/BaseButtons.vue'
import BaseButton from '@/components/BaseButton.vue'
import AnaliticsEdit from './AnaliticsEdit.vue'
// import UserAvatar from '@/components/UserAvatar.vue'
import { usePlantasStore } from '../stores/plantas'
import { useLoginStore } from '../stores/login'
import { usePermissions } from '@/composables/usePermissions'
// import { getAnaliticas } from '@/services/analiticas'
import useFormSelectData from '../composables/useFormSelectData'
import { useAnalyticsLoader } from '../composables/useAnalyticsLoader'
import { FormKit } from '@formkit/vue'
const checkedRows = ref([])
import { deleteAnalitica, updateAnaliticabyId } from '@/services/supabase'
import CardBoxModal from './CardBoxModal.vue'
import AutocompleteSelect from './AutocompleteSelect.vue'
import { getAllParametrosCalidad } from '@/services/parametrosCalidad'
import { DEFAULT_ANALITICA_RANGES, normalizeParametrosCalidad, formatRangeLabel } from '@/constants/parametrosCalidad'
import { getInfraPinSvg } from '@/helpers/maps'
import { isCloroWrong, isPhWrong, isTurbidezWrong, isOrganolepticWrong } from '@/composables/useRangeCheck'

const plantaStore = usePlantasStore()
const loginStore = useLoginStore()
const { loadAnalytics, loading: analyticsLoading } = useAnalyticsLoader()

const { canWrite, seeAllZones } = usePermissions()
const canEditAnaliticas = canWrite
const canDeleteAnaliticas = canWrite

const ORGANOLEPTIC_CORRECT = 1
// const ORGANOLEPTIC_WRONG = 0
const parametrosByComunidad = ref({})

const getComunidadIdFromAnalitica = (analitica) => {
  if (analitica?.comunidad_id) return analitica.comunidad_id

  const puntoMuestreo = plantaStore.getPuntosMuestreo.find(
    (punto) => punto.id === analitica?.punto_muestreo_fk
  )

  if (!puntoMuestreo?.zona_fk) return null

  const zona = plantaStore.getZonas.find((z) => z.id === puntoMuestreo.zona_fk)
  return zona?.com_autonoma_fk ?? null
}

const getRangesForAnalitica = (analitica) => {
  const comunidadId = getComunidadIdFromAnalitica(analitica)
  if (!comunidadId) return DEFAULT_ANALITICA_RANGES
  return parametrosByComunidad.value[comunidadId] || DEFAULT_ANALITICA_RANGES
}

const getCloroRangeLabel = (analitica) => formatRangeLabel(getRangesForAnalitica(analitica).cloro)
const getPhRangeLabel = (analitica) => formatRangeLabel(getRangesForAnalitica(analitica).ph)
const getTurbidezRangeLabel = (analitica) => {
  const ranges = getRangesForAnalitica(analitica)
  const isDC = getInfraTypeFromAnalitica(analitica) === 5
  return formatRangeLabel({
    min: isDC ? ranges.turbidez.dcMin : ranges.turbidez.min,
    max: isDC ? ranges.turbidez.dcMax : ranges.turbidez.max
  })
}

const getInfraTypeFromAnalitica = (analitica) => {
  if (analitica?.infraestructura_type != null) return analitica.infraestructura_type
  const pmId = analitica?.punto_muestreo_fk
  if (!pmId) return null
  const pm = plantaStore.getPuntosMuestreo.find((p) => p.id === pmId)
  if (!pm?.infraestructura_fk) return null
  const infra = plantaStore.getInfraestructuras.find((i) => i.id === pm.infraestructura_fk)
  return infra?.type ?? null
}

const loadParametrosCalidad = async () => {
  try {
    const records = await getAllParametrosCalidad()
    const parsed = {}

    records.forEach((record) => {
      if (!record.comunidades_autonomas_fk) return
      parsed[record.comunidades_autonomas_fk] = normalizeParametrosCalidad(record)
    })

    parametrosByComunidad.value = parsed
  } catch (e) {
    console.error('No se pudieron cargar los rangos por comunidad:', e)
    parametrosByComunidad.value = {}
  }
}

const analiticaToDelete = ref(null)
const analiticaToEdit = ref(null)
const sortKey = ref('')
const sortDir = ref('asc')

const {
  form: filters,
  selectZona,
  selectPuntosMuestra,
  selectInfraestructura,
  selectUO,
  operarioPorZona,
  resetForm
} = useFormSelectData()

defineProps({
  checkable: Boolean
})

defineExpose({ resetForm, checkedRows, filters })

// const selectedAnaliticas = ref([])
// const headerChecked = ref(false)
// const checkboxRefs = ref([])

// const filters = ref([])
const showOnlyWrongValues = ref(false)
const expandedRows = ref([])

const toggleExpand = (id) => {
  if (expandedRows.value.includes(id)) {
    expandedRows.value = expandedRows.value.filter((rowId) => rowId !== id)
  } else {
    expandedRows.value.push(id)
  }
}

const getPrevAnalitica = (analitica) => {
  if (analitica.totalizador == null) return null
  return plantaStore.getAnaliticas
    .filter(
      (a) =>
        a.punto_muestreo_fk === analitica.punto_muestreo_fk &&
        a.totalizador != null &&
        a.id !== analitica.id &&
        new Date(a.fecha) <= new Date(analitica.fecha)
    )
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))[0] ?? null
}

const getVolumen = (analitica) => {
  const prev = getPrevAnalitica(analitica)
  return prev != null ? analitica.totalizador - prev.totalizador : null
}

const getM3PerDia = (analitica) => {
  const prev = getPrevAnalitica(analitica)
  if (prev == null) return null
  const volumen = analitica.totalizador - prev.totalizador
  const dias = Math.round((new Date(analitica.fecha) - new Date(prev.fecha)) / (1000 * 60 * 60 * 24))
  return dias > 0 ? Math.round((volumen / dias) * 100) / 100 : null
}

const plantasStore = usePlantasStore()

// const mainStore = useMainStore()

const analitics = computed(() => plantasStore.getAnaliticas)
const analiticaToUpdate = ref(null)

const isModalDeleteAnaliticsActive = ref(false)
const isModalActive = ref(false)

const perPage = ref(20)

const currentPage = ref(0)

// const itemsPaginated = computed(() =>
//   items.value.slice(perPage.value * currentPage.value, perPage.value * (currentPage.value + 1))
// )
// const analiticsPaginated = computed(() =>
//   analitics.value.slice(perPage.value * currentPage.value, perPage.value * (currentPage.value + 1))
// )

// Obtener las zonas del usuario logueado
const userZonas = computed(() => {
  // Si el rol del usuario es admin (antes era 99), no filtramos por zona (puede ver todo)
  if (seeAllZones.value) {
    return null
  }

  // Buscar el operario correspondiente al usuario logueado
  const operario = plantasStore.getOperarios.find(
    (op) => op.email?.toLowerCase() === loginStore.userEmail?.toLowerCase()
  )
  
  if (!operario) return null

  // Devolver las zonas asignadas al operario
  // console.log(operario.zonas);
  return operario.zonas || []
})

// Función para verificar si una analítica pertenece a una zona, ya sea directamente o por su infraestructura
const analiticaBelongsToZona = (analitica, zonaId) => {
  if (!zonaId) return true
  const targetZona = Number(zonaId)

  // 1. Si de alguna manera ya está mapeada la zona
  if (analitica.zona_id === targetZona) return true

  // 2. Revisar el punto
  const puntoMuestreo = plantasStore.getPuntosMuestreo.find(
    punto => punto.id === analitica.punto_muestreo_fk
  )
  if (!puntoMuestreo) return false

  // 3. Revisar directa
  if (Number(puntoMuestreo.zona_fk) === targetZona) return true

  // 4. Múltiples zonas mediante infraestructura -> zonas_infraestructuras
  if (puntoMuestreo.infraestructura_fk) {
    const fromInfra = plantasStore.getZonasInfraestructuras.some(
      zi => zi.infraestructuras_fk === puntoMuestreo.infraestructura_fk && zi.zonas_fk === targetZona
    )
    if (fromInfra) return true
  }

  return false
}

const checkAnaliticaUserZonas = (analitica, userZonasArray) => {
  if (!userZonasArray || userZonasArray.length === 0) return true
  return userZonasArray.some(zonaId => analiticaBelongsToZona(analitica, zonaId))
}

// Modificar el filtrado para incluir restricción por zonas del usuario
const analiticsFiltered = computed(() =>
  plantaStore.getAnaliticas.filter((analitica) => {
    // Restricción por zona según el rol del usuario
    const isAdmin = seeAllZones.value
    const zonaFilter = 
      isAdmin || // Administrador ve todo
      checkAnaliticaUserZonas(analitica, userZonas.value) // Comprobar array de zonas del operario
    const wrongValuesFilter = !showOnlyWrongValues.value || checkWrongValues(analitica)

    return (
      zonaFilter && // Nueva restricción por zona
      wrongValuesFilter &&
      (!filters.fecha_inicio || analitica.fecha >= filters.fecha_inicio) &&
      (!filters.fecha_final || analitica.fecha <= filters.fecha_final) &&
      (!filters.punto_muestreo_fk || Number(analitica.punto_muestreo_fk) === Number(filters.punto_muestreo_fk)) &&
      (!filters.persona || Number(analitica.personal_fk) === Number(filters.persona)) &&
      (!filters.zona || analiticaBelongsToZona(analitica, filters.zona)) &&
      (!filters.operario || Number(analitica.personal_fk) === Number(filters.operario)) &&
      (!filters.infraestructura || Number(analitica.infraestructura_id) === Number(filters.infraestructura)) &&
      (!filters.type || Number(analitica.type) === Number(filters.type))
    )
  })
)

const sortedAnalitics = computed(() => {
  const analiticsToSort = analiticsFiltered.value

  if (!sortKey.value) return analiticsToSort

  return [...analiticsToSort].sort((a, b) => {
    const aValue = a[sortKey.value]
    const bValue = b[sortKey.value]
    
    if (sortDir.value === 'asc') {
      return aValue > bValue ? 1 : -1
    }
    return aValue < bValue ? 1 : -1
  })
})

const handleSort = (key) => {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortDir.value = 'asc'
  }
}




const numPages = computed(() => Math.ceil(analitics.value.length / perPage.value))

const currentPageHuman = computed(() => currentPage.value + 1)

const pagesList = computed(() => {
  const pagesList = []

  for (let i = 0; i < numPages.value; i++) {
    pagesList.push(i)
  }

  return pagesList
})

const getNameOperario = (analitica) => {
  if (analitica?.personal?.name) return analitica.personal.name
  const operario = plantasStore.getOperarios.find((operario) => operario.id === analitica?.personal_fk)
  return operario ? operario.name : 'No asignado'
}

const getPuntoMuestreo = (id) => {
  const puntoMuestreo = plantasStore.getPuntosMuestreo.find(
    (puntoMuestreo) => puntoMuestreo.id === id
  )
  return puntoMuestreo ? puntoMuestreo.name : 'No asignado'
}

const getTipoAnalitica = (id) => {
  switch (id) {
    case 28:
      return 'Operacional'
    case 29:
      return 'Rutina'
    case 99:
      return 'Seguimiento'
    default:
      return 'Desconocido'
  }
}

const allRowsChecked = computed(() => {
  return (
    analiticsFiltered.value.length > 0 &&
    analiticsFiltered.value.every((analitica) =>
      checkedRows.value.some((row) => row.id === analitica.id)
    )
  )
})

const checkCloroWrong = (analitica) => isCloroWrong(analitica.cloro, getRangesForAnalitica(analitica).cloro)

const esCataluna = (analitica) => getComunidadIdFromAnalitica(analitica) === 10

const checkPhWrong = (analitica) => isPhWrong(analitica.ph, getRangesForAnalitica(analitica).ph)

const checkTurbidezWrong = (analitica) =>
  isTurbidezWrong(
    analitica.turbidez,
    getRangesForAnalitica(analitica).turbidez,
    getInfraTypeFromAnalitica(analitica) === 5
  )

const checkOrganolepticWrong = isOrganolepticWrong

const checkWrongValues = (analitica) => {
  return (
    checkCloroWrong(analitica) ||
    checkPhWrong(analitica) ||
    checkTurbidezWrong(analitica) ||
    checkOrganolepticWrong(analitica.olor) ||
    checkOrganolepticWrong(analitica.color) ||
    checkOrganolepticWrong(analitica.sabor)
  )
}

const toggleAllRows = (isChecked) => {
  if (isChecked) {
    analiticsFiltered.value.forEach((analitica) => {
      if (!checkedRows.value.some((row) => row.id === analitica.id)) {
        checkedRows.value.push(analitica)
      }
    })
  } else {
    checkedRows.value = checkedRows.value.filter(
      (row) => !analiticsFiltered.value.some((analitica) => analitica.id === row.id)
    )
  }
}

const addAnalitica = (analitica, isChecked) => {
  if (isChecked) {
    // Verificar si ya existe antes de añadir
    if (!checkedRows.value.some((row) => row.id === analitica.id)) {
      checkedRows.value.push(analitica)
    }
  } else {
    checkedRows.value = checkedRows.value.filter((item) => item.id !== analitica.id)
  }
}

const handleConfirmDelete = async () => {
  try {
    if (!canDeleteAnaliticas.value) {
      throw new Error('No tienes permisos para borrar analiticas')
    }

    await deleteAnalitica(analiticaToDelete.value.id)
    await plantasStore.loadAnaliticas()
    isModalDeleteAnaliticsActive.value = false
    analiticaToDelete.value = null
  } catch (error) {
    console.error('Error al eliminar:', error)
    alert('Error al eliminar la analítica')
  }
}

const handleConfirmUpdate = async () => {
  try {
    if (!canEditAnaliticas.value) {
      throw new Error('No tienes permisos para editar analiticas')
    }

    if (!analiticaToUpdate.value) {
      throw new Error('No hay analítica para actualizar')
    }
    await updateAnaliticabyId(analiticaToUpdate.value.id, analiticaToUpdate.value)

    await plantasStore.loadAnaliticas()
    isModalActive.value = false
    analiticaToEdit.value = null
    analiticaToUpdate.value = null
  } catch (error) {
    console.error('Error al eliminar:', error)
    alert('Error al actualizar la analítica')
  }
}

const closeModal = () => {
  isModalActive.value = false
  analiticaToEdit.value = null
  analiticaToUpdate.value = null
}

const deleteAnaliticaSeleccionada = async (analitica) => {
  if (!canDeleteAnaliticas.value) return

  analiticaToDelete.value = analitica
  isModalDeleteAnaliticsActive.value = true
}



const updateAnaliticaSeleccionada = async (analitica) => {
  if (!canEditAnaliticas.value) return

  // Crear copia profunda para evitar referencias
  analiticaToEdit.value = JSON.parse(JSON.stringify(analitica))

  

  const today = new Date().toLocaleDateString()
  
  // Crear el nuevo registro de modificación
  const nuevoRegistro = `${today} - Modificado por: ${loginStore.userName}\n${analiticaToEdit.value.observaciones}`
  
  // Añadir el registro nuevo al existente en lugar de reemplazarlo
  if (analiticaToEdit.value.registro) {
    // Añadir el nuevo registro al principio, seguido de un salto de línea
    analiticaToEdit.value.registro = `${nuevoRegistro}\n${analiticaToEdit.value.registro}`
  } else {
    analiticaToEdit.value.registro = nuevoRegistro
  }
  
  await nextTick()
  isModalActive.value = true
}



// Cargar analíticas solo cuando este componente se monte
onMounted(async () => {
  resetForm()

  // On page reload the store starts empty — ensure operarios are loaded before
  // loadAnalytics() resolves, otherwise userZonas returns null and analiticsFiltered
  // shows all rows (even to non-admin users) until the reactive computed self-corrects.
  if (!plantasStore.getOperarios.length) {
    await plantasStore.loadOperarios()
  }

  try {
    await loadAnalytics()
    await loadParametrosCalidad()
  } catch (error) {
    console.error('❌ Error cargando analíticas:', error)
  }
})
</script>

<template>
  <CardBoxModal
    v-model="isModalDeleteAnaliticsActive"
    title="Desea Borrar la Analítica?"
    button="danger"
    has-cancel
    @confirm="handleConfirmDelete"
  >
    <p>Si confirma la analitica se borrara <b>definitivamente</b></p>
    <p>Esta seguro de ejecutar esta acción?</p>
    <!-- <BaseButton label="Borrar" color="danger" :icon="mdiTrashCan" /> -->
  </CardBoxModal>

  <CardBoxModal
    v-model="isModalActive"
    title="Actualizar analítica"
    has-cancel
    @confirm="handleConfirmUpdate"
    @cancel="closeModal"
  >
    <AnaliticsEdit
      v-if="analiticaToEdit"
      :analitic="analiticaToEdit"
      @update="analiticaToUpdate = $event"
    />
    <p class="text-red-600 font-bold">ATENCIÓN:</p>
    <p>
      La modificacion de esta analítica será <b>definitiva</b> y se realizará bajo su propia
      responsabilidad
    </p>
    <!-- <p>This is sample modal</p> -->
  </CardBoxModal>

  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
    <div class="flex flex-col">
      <label class="font-bold mb-1 text-sm text-gray-700 dark:text-gray-300">Fecha Inicio</label>
      <input 
        v-model="filters.fecha_inicio" 
        type="date" 
        class="w-full border rounded shadow-sm px-3 py-2 text-sm transition-colors bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
      />
    </div>
    <div class="flex flex-col">
      <label class="font-bold mb-1 text-sm text-gray-700 dark:text-gray-300">Fecha Final</label>
      <input 
        v-model="filters.fecha_final" 
        type="date" 
        class="w-full border rounded shadow-sm px-3 py-2 text-sm transition-colors bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
      />
    </div>
    <div class="flex flex-col">
      <label class="font-bold mb-1 text-sm text-gray-700 dark:text-gray-300">Unidad Operativa</label>
      <AutocompleteSelect
        v-model="filters.uo"
        :options="selectUO"
        placeholder="Unidad Operativa"
        class="w-full"
      />
    </div>
  </div>
  <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
    <div class="flex flex-col">
      <label class="font-bold mb-1 text-sm text-gray-700 dark:text-gray-300">Zona de Abastecimiento</label>
      <AutocompleteSelect
        v-model="filters.zona"
        :options="selectZona"
        placeholder="Zona de Abastecimiento"
        class="w-full"
      />
    </div>
    <div class="flex flex-col">
      <label class="font-bold mb-1 text-sm text-gray-700 dark:text-gray-300">Infraestructura</label>
      <AutocompleteSelect
        v-model="filters.infraestructura"
        :options="selectInfraestructura"
        placeholder="Infraestructura"
        class="w-full"
      />
    </div>
    <div class="flex flex-col">
      <label class="font-bold mb-1 text-sm text-gray-700 dark:text-gray-300">Punto de Muestra</label>
      <AutocompleteSelect
        v-model="filters.punto_muestreo_fk"
        :options="selectPuntosMuestra"
        placeholder="Punto de muestra"
        class="w-full"
      />
    </div>
    <div class="flex flex-col">
      <label class="font-bold mb-1 text-sm text-gray-700 dark:text-gray-300">Operario</label>
      <AutocompleteSelect
        v-model="filters.operario"
        :options="operarioPorZona"
        placeholder="Operario"
        class="w-full"
      />
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th v-if="checkable" class="text-center">
          <TableCheckboxCell :model-value="allRowsChecked" @update:model-value="toggleAllRows" />
          <!-- <TableCheckboxCell :model-value="checkedRows.value.some(row => row.id === analitica.id)" @update:model-value="(isChecked) => checked(isChecked, analitica)" /> -->
          <!-- <TableCheckboxCell 
          v-if="checkable" 
          @checked="allRowsChecked($event)" 
        /> -->
          <!-- <input type="checkbox" class="rounded"   @change="allRowsChecked($event)" /> -->
        </th>
        <th class="w-10 text-center">Infra</th>
        <th class="cursor-pointer" @click="handleSort('fecha')" >Fecha <span v-if="sortKey === 'fecha'">{{ sortDir === 'asc' ? '↑' : '↓' }}</span></th>
        <th class="cursor-pointer" @click="handleSort('punto_muestreo_fk')">Punto Muestreo <span v-if="sortKey === 'punto_muestreo_fk'">{{ sortDir === 'asc' ? '↑' : '↓' }}</span></th>
        <th class="cursor-pointer" @click="handleSort('personal_fk')">Operario<span v-if="sortKey === 'personal_fk'">{{ sortDir === 'asc' ? '↑' : '↓' }}</span></th>
        <th class="cursor-pointer" @click="handleSort('type')">Tipo<span v-if="sortKey === 'type'">{{ sortDir === 'asc' ? '↑' : '↓' }}</span></th>
        <th class="text-center w-10">
          <TableCheckboxCell
            :model-value="showOnlyWrongValues"
            label="Solo valores incorrectos"
            @update:model-value="showOnlyWrongValues = $event"
          />
        </th>
        <!-- <th /> -->
      </tr>
    </thead>
    <tbody>
      <template v-for="analitica in sortedAnalitics" :key="analitica.id">
        <tr>
          <TableCheckboxCell
            v-if="checkable"
            :model-value="checkedRows.includes(analitica)"
            @update:model-value="(isChecked) => addAnalitica(analitica, isChecked)"
          />

          <td data-label="Infra" class="text-center">
            <span
              v-if="getInfraTypeFromAnalitica(analitica) != null"
              class="inline-flex items-center justify-center shrink-0"
              v-html="getInfraPinSvg(getInfraTypeFromAnalitica(analitica), 28)"
            />
          </td>

          <td data-label="Fecha">
            <!-- <td data-label="Fecha" :class="{'bg-red-400': checkWrongValues(analitica)}"> -->
            {{ analitica.fecha }}
          </td>
          <td data-label="Punto de Muestreo">
            {{ getPuntoMuestreo(analitica.punto_muestreo_fk) }}
          </td>
          <td data-label="Persona">
            {{ getNameOperario(analitica) }}
          </td>
          <td data-label="Tipo Analítica" class="lg:w-32">
            {{ getTipoAnalitica(analitica.type) }}
          </td>

          <td class="text-right w-10">
            <BaseButton
              :icon="expandedRows.includes(analitica.id) ? mdiChevronDown : mdiChevronLeft"
              :color="checkWrongValues(analitica) ? 'danger' : 'info'"
              @click="toggleExpand(analitica.id)"
            />
          </td>
        </tr>
        <tr v-if="expandedRows.includes(analitica.id)" :key="`expanded-${analitica.id}`">
          <td colspan="7" class="p-0 border-b border-gray-200 dark:border-slate-700 overflow-x-auto">
            <div class="bg-gray-50 dark:bg-slate-800/50 px-5 py-4 w-full max-w-full min-w-0">

              <!-- Header -->
              <div class="flex items-center justify-between mb-4">
                <span class="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                  Parámetros analíticos
                </span>
                <BaseButtons v-if="canEditAnaliticas || canDeleteAnaliticas">
                  <BaseButton
                    v-if="canEditAnaliticas"
                    color="info"
                    :icon="mdiPencil"
                    small
                    @click="updateAnaliticaSeleccionada(analitica)"
                  />
                  <BaseButton
                    v-if="canDeleteAnaliticas"
                    color="danger"
                    :icon="mdiTrashCan"
                    small
                    @click="deleteAnaliticaSeleccionada(analitica)"
                  />
                </BaseButtons>
              </div>

              <!-- Metric cards -->
              <div class="grid grid-cols-3 gap-3 mb-4 min-w-0" :class="{ 'lg:grid-cols-4': analitica.totalizador != null }">
                <!-- Cloro -->
                <div
                  :class="[
                    'rounded-xl p-3 flex flex-col gap-1 border',
                    checkCloroWrong(analitica)
                      ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-700'
                      : 'bg-white border-gray-200 dark:bg-slate-700 dark:border-slate-600'
                  ]"
                >
                  <span class="text-xs font-medium uppercase tracking-wide text-gray-400">Cloro libre</span>
                  <span
                    :class="[
                      'text-2xl font-bold',
                      checkCloroWrong(analitica) ? 'text-red-500' : 'text-gray-800 dark:text-white'
                    ]"
                  >
                    {{ analitica.cloro != null ? analitica.cloro : '—' }}
                  </span>
                  <div class="flex items-center justify-between">
                    <span class="text-xs text-gray-400">mg/l &nbsp;{{ getCloroRangeLabel(analitica) }}</span>
                    <span
                      :class="[
                        'text-xs font-semibold px-2 py-0.5 rounded-full',
                        analitica.cloro == null
                          ? 'bg-gray-100 text-gray-400 dark:bg-slate-600 dark:text-gray-400'
                          : checkCloroWrong(analitica)
                            ? 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400'
                            : 'bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400'
                      ]"
                    >
                      {{ analitica.cloro == null ? 'Sin muestra' : checkCloroWrong(analitica) ? '⚠ Fuera de rango' : '✓ Correcto' }}
                    </span>
                  </div>
                </div>

                <!-- pH -->
                <div
                  :class="[
                    'rounded-xl p-3 flex flex-col gap-1 border',
                    checkPhWrong(analitica)
                      ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-700'
                      : 'bg-white border-gray-200 dark:bg-slate-700 dark:border-slate-600'
                  ]"
                >
                  <span class="text-xs font-medium uppercase tracking-wide text-gray-400">pH</span>
                  <span
                    :class="[
                      'text-2xl font-bold',
                      checkPhWrong(analitica) ? 'text-red-500' : 'text-gray-800 dark:text-white'
                    ]"
                  >
                    {{ analitica.ph != null ? analitica.ph : '—' }}
                  </span>
                  <div class="flex items-center justify-between">
                    <span class="text-xs text-gray-400">ud &nbsp;{{ getPhRangeLabel(analitica) }}</span>
                    <span
                      :class="[
                        'text-xs font-semibold px-2 py-0.5 rounded-full',
                        analitica.ph == null
                          ? 'bg-gray-100 text-gray-400 dark:bg-slate-600 dark:text-gray-400'
                          : checkPhWrong(analitica)
                            ? 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400'
                            : 'bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400'
                      ]"
                    >
                      {{ analitica.ph == null ? 'Sin muestra' : checkPhWrong(analitica) ? '⚠ Fuera de rango' : '✓ Correcto' }}
                    </span>
                  </div>
                </div>

                <!-- Turbidez -->
                <div
                  :class="[
                    'rounded-xl p-3 flex flex-col gap-1 border',
                    checkTurbidezWrong(analitica)
                      ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-700'
                      : 'bg-white border-gray-200 dark:bg-slate-700 dark:border-slate-600'
                  ]"
                >
                  <span class="text-xs font-medium uppercase tracking-wide text-gray-400">Turbidez</span>
                  <span
                    :class="[
                      'text-2xl font-bold',
                      checkTurbidezWrong(analitica) ? 'text-red-500' : 'text-gray-800 dark:text-white'
                    ]"
                  >
                    {{ analitica.turbidez != null ? analitica.turbidez : '—' }}
                  </span>
                  <div class="flex items-center justify-between">
                    <span class="text-xs text-gray-400">UNT &nbsp;{{ getTurbidezRangeLabel(analitica) }}</span>
                    <span
                      :class="[
                        'text-xs font-semibold px-2 py-0.5 rounded-full',
                        analitica.turbidez == null
                          ? 'bg-gray-100 text-gray-400 dark:bg-slate-600 dark:text-gray-400'
                          : checkTurbidezWrong(analitica)
                            ? 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400'
                            : 'bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400'
                      ]"
                    >
                      {{ analitica.turbidez == null ? 'Sin muestra' : checkTurbidezWrong(analitica) ? '⚠ Fuera de rango' : '✓ Correcto' }}
                    </span>
                  </div>
                </div>
                <!-- Totalizador / Volumen -->
                <div
                  v-if="analitica.totalizador != null"
                  class="rounded-xl p-3 flex flex-col gap-1 border bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-700"
                >
                  <span class="text-xs font-medium uppercase tracking-wide text-gray-400">Totalizador</span>
                  <span class="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {{ analitica.totalizador }} <span class="text-sm font-normal text-gray-400">m³</span>
                  </span>
                  <div v-if="getVolumen(analitica) != null" class="border-t border-blue-200 dark:border-blue-700 mt-1 pt-1">
                    <span class="text-xs font-medium uppercase tracking-wide text-gray-400">Volumen consumido</span>
                    <div class="flex items-baseline gap-3 flex-wrap">
                      <span class="text-xl font-bold text-blue-500 dark:text-blue-300">
                        {{ getVolumen(analitica) }} <span class="text-sm font-normal text-gray-400">m³</span>
                      </span>
                      <span
                        v-if="getM3PerDia(analitica) != null"
                        class="text-sm font-semibold text-blue-400 dark:text-blue-300 whitespace-nowrap"
                      >
                        · {{ getM3PerDia(analitica) }} m³/día
                    </span>
                  </div>
                </div>
                <!-- Cloro Total / Cloro Combinado (solo Cataluña) -->
                <div
                  v-if="esCataluna(analitica)"
                  class="rounded-xl p-3 flex flex-col gap-1 border bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-700"
                >
                  <span class="text-xs font-medium uppercase tracking-wide text-amber-600 dark:text-amber-400">Cloro Total</span>
                  <span class="text-2xl font-bold text-amber-700 dark:text-amber-300">
                    {{ analitica.cloro_total != null ? analitica.cloro_total : '—' }}
                  </span>
                  <span class="text-xs text-amber-500 dark:text-amber-400">mg/l</span>
                </div>
                <div
                  v-if="esCataluna(analitica)"
                  :class="[
                    'rounded-xl p-3 flex flex-col gap-1 border',
                    analitica.cloro_combinado != null && analitica.cloro_combinado < 0
                      ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-700'
                      : 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-700'
                  ]"
                >
                  <span
                    :class="[
                      'text-xs font-medium uppercase tracking-wide',
                      analitica.cloro_combinado != null && analitica.cloro_combinado < 0
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-amber-600 dark:text-amber-400'
                    ]"
                  >Cloro Combinado</span>
                  <span
                    :class="[
                      'text-2xl font-bold',
                      analitica.cloro_combinado != null && analitica.cloro_combinado < 0
                        ? 'text-red-500 dark:text-red-400'
                        : 'text-amber-700 dark:text-amber-300'
                    ]"
                  >
                    {{ analitica.cloro_combinado != null ? analitica.cloro_combinado : '—' }}
                  </span>
                  <div class="flex flex-wrap items-center gap-1">
                    <span class="text-xs text-gray-400">mg/l</span>
                    <span
                      v-if="analitica.cloro_combinado != null && analitica.cloro_combinado < 0"
                      class="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400"
                    >⚠ Negativo</span>
                  </div>
                </div>
                  <span v-else class="text-xs text-gray-400 italic">Sin analítica anterior para calcular volumen</span>
                </div>
              </div>

              <!-- Organolépticos (solo Rutina tipo 29) -->
              <div v-if="analitica.type === 29" class="flex flex-wrap items-center gap-2 mb-4">
                <span class="text-xs font-semibold uppercase tracking-wide text-gray-400 mr-1">Organolépticos:</span>
                <span
                  v-for="({ key, label }) in [{ key: 'olor', label: 'Olor' }, { key: 'color', label: 'Color' }, { key: 'sabor', label: 'Sabor' }]"
                  :key="key"
                  :class="[
                    'inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold',
                    checkOrganolepticWrong(analitica[key])
                      ? 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400'
                      : 'bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400'
                  ]"
                >
                  {{ label }}: {{ analitica[key] === ORGANOLEPTIC_CORRECT ? '✓ Correcto' : '⚠ Incorrecto' }}
                </span>
              </div>

              <!-- Datos secundarios -->
              <div
                class="flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-600 dark:text-gray-300 border-t border-gray-200 dark:border-slate-600 pt-3"
              >
                <span v-if="plantaStore.getPuntosMuestreo.find(p => p.id === analitica.punto_muestreo_fk)?.sn_contador">
                  <span class="font-semibold text-gray-500 dark:text-gray-400">S/N Contador:</span>
                  {{ plantaStore.getPuntosMuestreo.find(p => p.id === analitica.punto_muestreo_fk)?.sn_contador }}
                </span>
                <span v-if="analitica.observaciones" class="w-full">
                  <span class="font-semibold text-gray-500 dark:text-gray-400">Observaciones:</span>
                  {{ analitica.observaciones }}
                </span>
              </div>

            </div>
          </td>
        </tr>
      </template>
    </tbody>
  </table>
  <div class="p-3 lg:px-6 border-t border-gray-100 dark:border-slate-800">
    <BaseLevel>
      <BaseButtons>
        <BaseButton
          v-for="page in pagesList"
          :key="page"
          :active="page === currentPage"
          :label="page + 1"
          :color="page === currentPage ? 'lightDark' : 'whiteDark'"
          small
          @click="currentPage = page"
        />
      </BaseButtons>
      <small>Total Analíticas {{ analiticsFiltered.length }}</small>
      <small>Page {{ currentPageHuman }} of {{ numPages }}</small>
    </BaseLevel>
  </div>
</template>
