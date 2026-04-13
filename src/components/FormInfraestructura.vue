<script setup>
import { computed, reactive, ref, watch } from 'vue'
import SectionMain from '@/components/SectionMain.vue'
import CardBox from '@/components/CardBox.vue'
import BaseButton from '@/components/BaseButton.vue'
import BaseButtons from '@/components/BaseButtons.vue'
import { usePlantasStore } from '@/stores/plantas'
import { getZonasDeInfraestructura } from '@/services/infraestructuras'
import { FormKit } from '@formkit/vue'

const emit = defineEmits(['submit', 'closeModal'])

const plantasStore = usePlantasStore()

const props = defineProps({
  uo: {
    type: Object,
    required: true,
    default: () => ({esNuevo: true})
  }
})

const form = reactive({
  esNuevo: props.uo?.esNuevo ?? true,
  id: props.uo?.id || null,
  sinac_id: props.uo?.sinac_id || null,
  name: props.uo?.name,
  type: props.uo?.type,
  operador: props.uo?.operador,
  zonas: []
})

const zonaSearch = ref('')

const filteredZonasForInfra = computed(() => {
  const q = zonaSearch.value.toLowerCase()
  return plantasStore.getZonas
    .map((z) => ({ value: z.id, label: z.name }))
    .filter((z) => !q || z.label.toLowerCase().includes(q))
})

const selectTipoInfraestructura = computed(() => {
  return plantasStore.getTipoInfraestructura.map((tipo) => {
    return { value: tipo.id, label: tipo.name }
  })
})



watch(
  () => props.uo,
  async (newUO) => {
    form.esNuevo = newUO?.esNuevo
    form.id = newUO?.id
    form.sinac_id = newUO?.sinac_id || null
    form.name = newUO?.name
    form.type = newUO?.type
    form.operador = newUO?.operador
    zonaSearch.value = ''
    // Load zone assignments directly from DB — avoids reading from the
    // truncated store (Supabase default cap of 1000 rows).
    form.zonas = newUO?.id ? await getZonasDeInfraestructura(newUO.id) : []
  },
  { immediate: true }
)

</script>

<template>
  <SectionMain>
    <CardBox is-form>
      <form class="w-full" @submit.prevent="emit('submit', form)">
        <div class="grid grid-cols-1 lg:grid-cols-6 mb-6 gap-4 w-full">
          <div class="col-span-1 w-full">
            <FormKit
              v-model="form.sinac_id"
              type="text"
              label="Cód. SINAC"
              placeholder="Nº SINAC"
              class="col-span-1 w-full"
            />
          </div>
          <div class="col-span-5 w-full">
            <FormKit
              v-model="form.name"
              type="text"
              label="Nombre"
              placeholder="Nombre"
              validation="required"
              class="col-span-3 w-full"
            />
          </div>
        </div>
        <div class="flex flex-col w-full md:flex-row md:space-x-4 md:space-y-0 space-y-4 mb-6">
          <FormKit
            v-model="form.type"
            :options="selectTipoInfraestructura"
            type="select"
            label="Tipo de Infraestructura"
            placeholder="Tipo de Infraestructura"
            class="w-full"
            option-class="w-full"
          />
          <FormKit
              v-model="form.operador"
              type="text"
              label="Operador"
              placeholder="Operador"
              validation="required"
              class="col-span-3 w-full"
            />
          <!-- <FormKit
            v-model="form.unidades_operativas_fk"
            :options="selectUnidadOperativa"
            type="select"
            label="Unidad Operativa"
            placeholder="Comunidad Autonoma"
            class="w-full"
            option-class="w-full"
          /> -->
        </div>

        <!-- Zonas asignadas -->
        <div class="mb-6">
          <label class="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            Zonas asignadas
            <span
              v-if="form.zonas.length"
              class="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 rounded-full"
            >{{ form.zonas.length }} seleccionadas</span>
          </label>
          <input
            v-model="zonaSearch"
            type="text"
            placeholder="Buscar zona..."
            class="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 mb-2"
          />
          <div class="border border-gray-200 dark:border-gray-600 rounded-md max-h-52 overflow-y-auto p-1">
            <p v-if="filteredZonasForInfra.length === 0" class="text-sm text-gray-400 px-3 py-2">Sin resultados</p>
            <label
              v-for="zona in filteredZonasForInfra"
              :key="zona.value"
              class="flex items-center gap-2 px-3 py-1.5 rounded cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <input
                type="checkbox"
                :value="zona.value"
                v-model="form.zonas"
                class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span class="text-sm text-gray-700 dark:text-gray-300">{{ zona.label }}</span>
            </label>
          </div>
        </div>
      </form>
      <template #footer>
        <BaseButtons>
          <BaseButton type="submit" color="info" label="Guardar" @click="emit('submit', form)" />
          <!-- <BaseButton type="submit" color="info" label="imprime" @click="console.log(form)" /> -->
          <BaseButton
            type="reset"
            color="danger"
            outline
            label="Cancelar"
            @click="emit('closeModal')"
          />
        </BaseButtons>
      </template>
    </CardBox>
  </SectionMain>
</template>
