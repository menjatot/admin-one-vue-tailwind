<script setup>
import { ref, computed } from 'vue'
import { usePlantasStore } from '@/stores/plantas'
import { createCentroCoste, updateCentroCoste, anularCentroCoste } from '@/services/centrosCoste'
import { useNotifications } from '@/composables/useNotifications'
import BaseButtons from './BaseButtons.vue'
import BaseButton from './BaseButton.vue'
import BaseLevel from './BaseLevel.vue'
import FormField from './FormField.vue'
import FormControl from './FormControl.vue'
import CardBoxModal from './CardBoxModal.vue'
import CardBoxModalForm from './CardBoxModalForm.vue'
import FormCentroCoste from './FormCentroCoste.vue'
import {
  mdiPencil,
  mdiTrashCan,
  mdiFilterRemove,
  mdiCurrencyEur
} from '@mdi/js'
import BaseIcon from './BaseIcon.vue'

const plantasStore = usePlantasStore()
const { success: notifySuccess, error: notifyError } = useNotifications()

const filters = ref({ nombre: '', uo: '' })
const isModalOpen = ref(false)
const isModalDangerActive = ref(false)
const dataToEdit = ref(null)

const unidadesOperativasOptions = computed(() => [
  { value: '', label: 'Todas las unidades operativas' },
  ...plantasStore.getUnidadesOperativas.map((uo) => ({ value: uo.id, label: uo.name }))
])

const centrosCosteActivos = computed(() => {
  let centros = plantasStore.getCentrosCoste.filter((cc) => cc.activa !== false)

  if (filters.value.nombre) {
    centros = centros.filter((cc) =>
      [cc.name, cc.code]
        .filter(Boolean)
        .some((v) => v.toLowerCase().includes(filters.value.nombre.toLowerCase()))
    )
  }

  if (filters.value.uo) {
    const uoId =
      typeof filters.value.uo === 'object' ? filters.value.uo.value : filters.value.uo
    if (uoId !== '' && uoId !== null) {
      centros = centros.filter((cc) => cc.uo_fk == uoId)
    }
  }

  return centros
})

const uoNombrePorId = (id) =>
  plantasStore.getUnidadesOperativas.find((uo) => uo.id === id)?.name ?? '—'

const clearFilters = () => {
  filters.value.nombre = ''
  filters.value.uo = ''
}

const openModal = (centroCoste) => {
  dataToEdit.value = centroCoste ?? null
  isModalOpen.value = true
}

const closeModal = () => {
  isModalOpen.value = false
  dataToEdit.value = null
}

const confirmarAnular = (centroCoste) => {
  dataToEdit.value = centroCoste
  isModalDangerActive.value = true
}

const handleAnular = async () => {
  try {
    await anularCentroCoste(dataToEdit.value.id)
    await plantasStore.loadCentrosCoste()
    isModalDangerActive.value = false
    dataToEdit.value = null
    notifySuccess('El centro de coste ha sido anulado.', { title: 'Centro de coste anulado' })
  } catch (error) {
    console.error('Error al anular centro de coste:', error)
    notifyError('No se ha podido anular el centro de coste.', { title: 'Error al anular' })
  }
}

const saveForm = async (form) => {
  try {
    if (form.esNuevo) {
      await createCentroCoste(form)
      notifySuccess('Centro de coste creado correctamente.', { title: 'Centro de coste creado' })
    } else {
      await updateCentroCoste(form)
      notifySuccess('Centro de coste actualizado correctamente.', {
        title: 'Centro de coste actualizado'
      })
    }
    await plantasStore.loadCentrosCoste()
    closeModal()
  } catch (error) {
    console.error('Error al guardar centro de coste:', error)
    notifyError('No se ha podido guardar el centro de coste.', { title: 'Error al guardar' })
  }
}

defineExpose({ openModal })
</script>

<template>
  <CardBoxModalForm
    v-if="isModalOpen"
    v-model="isModalOpen"
    :title="dataToEdit?.id ? `Editar Centro de Coste: ${dataToEdit.name}` : 'Nuevo Centro de Coste'"
    has-cancel
  >
    <FormCentroCoste
      :centro-coste="dataToEdit ?? { esNuevo: true }"
      @submit="saveForm"
      @close-modal="closeModal"
    />
  </CardBoxModalForm>

  <CardBoxModal
    v-model="isModalDangerActive"
    title="Anular Centro de Coste"
    button="danger"
    has-cancel
    @confirm="handleAnular"
  >
    <p>
      ¿Está seguro que desea anular el centro de coste <b>{{ dataToEdit?.name }}</b>?
    </p>
    <p>Esta operación no se puede deshacer.</p>
  </CardBoxModal>

  <!-- Filtros -->
  <div class="mb-6 p-4 bg-gray-50 dark:bg-slate-800 rounded-lg">
    <h3 class="text-lg font-semibold mb-4 text-gray-700 dark:text-gray-200">
      Filtros de Búsqueda
    </h3>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
      <FormField label="Buscar por nombre o código">
        <FormControl
          v-model="filters.nombre"
          placeholder="Nombre o código..."
          :icon="mdiCurrencyEur"
        />
      </FormField>
      <FormField label="Unidad operativa">
        <FormControl
          v-model="filters.uo"
          :options="unidadesOperativasOptions"
          placeholder="Seleccionar unidad operativa..."
        />
      </FormField>
    </div>

    <BaseLevel class="justify-between">
      <div class="text-sm text-gray-600 dark:text-gray-400">
        Mostrando {{ centrosCosteActivos.length }} centro(s) de coste
      </div>
      <BaseButton
        :icon="mdiFilterRemove"
        label="Limpiar filtros"
        color="light"
        outline
        small
        @click="clearFilters"
      />
    </BaseLevel>
  </div>

  <!-- Tabla -->
  <div>
    <table>
      <thead>
        <tr>
          <th>Código</th>
          <th>Nombre</th>
          <th>Unidad Operativa</th>
          <th />
        </tr>
      </thead>
      <tbody>
        <tr v-if="centrosCosteActivos.length === 0">
          <td colspan="4" class="text-center text-gray-500 py-6 italic">
            No hay centros de coste disponibles
          </td>
        </tr>
        <tr v-for="cc in centrosCosteActivos" :key="cc.id">
          <td data-label="Código">
            <span class="font-mono text-sm">{{ cc.code ?? '—' }}</span>
          </td>
          <td data-label="Nombre">{{ cc.name }}</td>
          <td data-label="Unidad Operativa">{{ uoNombrePorId(cc.uo_fk) }}</td>
          <td>
            <BaseButtons type="justify-start lg:justify-end" no-wrap>
              <BaseButton
                :icon="mdiPencil"
                color="info"
                small
                @click="openModal({ ...cc, esNuevo: false })"
              />
              <BaseButton
                :icon="mdiTrashCan"
                color="danger"
                small
                @click="confirmarAnular(cc)"
              />
            </BaseButtons>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
