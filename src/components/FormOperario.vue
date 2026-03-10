<script setup>
import { computed, reactive, watch } from 'vue'
import SectionMain from '@/components/SectionMain.vue'
import CardBox from '@/components/CardBox.vue'
import { usePlantasStore } from '@/stores/plantas'
import { searchZonasOperarios } from '@/services/supabase'


const plantasStore = usePlantasStore()

const props = defineProps({
  client: {
    type: Object,
    required: true,
    default: () => ({})
  }
})



const form = reactive({
  name: props.client?.name,
  email: props.client?.email,
  phone: props.client?.phone,
  id_zona: props.client?.id_zona,
  ud_operativa_fk: props.client?.ud_operativa_fk || 1,
  type: props.client?.type || 4,
  id: props.client?.id,
  zonas: [],
  color: '',
  olor: [],
  sabor: '',
  tipo: '',
  prueba: '5'
})


const returnTipoOperario = (tipoId) => {
  return plantasStore.getTipoPersonal.find((tipo) => tipo.id === tipoId)
}

const submitHandler = () => {
  // Validar formulario
  if (!form.name || !form.ud_operativa_fk || !form.type) {
    console.error('Faltan campos requeridos')
    return false
  }

  const operarioData = {
    id: form.id || null,
    name: form.name,
    email: form.email,
    ud_operativa_fk: form.ud_operativa_fk,
    type: form.type,
    zonas: form.zonas,
    phone: form.phone
  }
  return operarioData
}


watch(
  () => props.client,
  (newClient) => {
    form.id = newClient?.id || null
    form.name = newClient?.name
    // form.surname = newClient.surname
    form.email = newClient?.email
    form.phone = newClient?.phone
    form.id_zona = newClient?.id_zona
    form.type = newClient?.type
    form.ud_operativa_fk = newClient?.ud_operativa_fk
    // form.type_bak = newClient.type_bak
    zonasOperarioSeleccionadas(newClient?.id)
  },
  { inmediate: true }
)


const selectUO = computed(() => {
  return plantasStore.getUnidadesOperativas.map((uo) => {
    return { value: uo.id, label: uo.name }
  })
})



const buscaZonasUO = (uo) => {
  if (!uo) {
    console.warn('El valor de unidad operativa es undefined o null')
    return []
  }
  return plantasStore.getZonas
    .filter((zona) => zona.unidades_operativas_fk === uo)
    .map((zona) => {
      return { value: zona.id, label: zona.name }
    })
}

const zonasOperarioSeleccionadas = async (id) => {

  if(!id) {
    console.warn('El valor de id es undefined o null')
    return []
  }
  const zonas = await searchZonasOperarios(id)
  form.zonas = zonas.flatMap((zona) =>
    zona.zonas_personal.map((zone) => zone.zonas_abastecimiento.id)
  )

}

zonasOperarioSeleccionadas(form.id)

defineExpose({
  submitHandler
})
</script>

<template>
  <SectionMain>
    <!-- <CardBox form @submit.prevent="submit"> -->
    <CardBox>
      <form @submit.prevent="submitHandler">
        <div class="grid md-grid-cols-1 md:grid-cols-1 w-full mb-6">
          <FormKit
            v-model="form.name"
            type="text"
            label="Nombre"
            placeholder="Nombre"
            validation="required"
            class="w-full"
          />
        </div>

        <div class="grid md-grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <FormKit
            v-model="form.email"
            type="email"
            label="e-mail"
            placeholder="e-mail"
            
            class="w-full"
          />
          <FormKit
            v-model="form.phone"
            type="number"
            label="phone"
            placeholder="phone"
            
            class="w-full"
          />
        </div>

        <div class="grid md-grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <FormKit
            v-model="form.ud_operativa_fk"
            type="select"
            label="Unidad Operativa"
            validation="required"
            class="w-full"
            :options="selectUO"
          />

          <FormKit
            v-model="form.type"
            :value="returnTipoOperario(form.type)"
            :options="
              plantasStore.getTipoPersonal.map((tipo) => ({ value: tipo.id, label: tipo.tipo }))
            "
            type="select"
            label="Tipo"
            validation="required"
            class="w-full"
          />
        </div>

        <div class="relative w-full border border-gray-200 dark:border-gray-600 rounded-lg p-4 mb-6">
          <span
            class="absolute -top-2.5 left-3 bg-white dark:bg-gray-900 px-2 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500"
          >
            Zonas de abastecimiento
          </span>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 w-full">
            <label
              v-for="zona in buscaZonasUO(form.ud_operativa_fk)"
              :key="zona.value"
              class="flex items-center gap-2 py-1 cursor-pointer text-sm text-neutral-700 dark:text-neutral-300"
            >
              <input
                v-model="form.zonas"
                type="checkbox"
                :value="zona.value"
                class="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              {{ zona.label }}
            </label>
          </div>
        </div>
      </form>

      <template #footer>
        <!-- <BaseButtons>
                <BaseButton type="submit" color="info" label="Guardarrrr" @click="submitHandler" />
                <BaseButton type="reset" color="danger" outline label="Cancelar" @click="closeModal"/>
              </BaseButtons> -->
      </template>
    </CardBox>
  </SectionMain>
</template>

<style scoped>
:deep(.formkit-outer) {
  max-width: none !important;
  width: 100%;
}
</style>
