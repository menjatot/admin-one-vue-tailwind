<script setup>
import { reactive, computed, watch } from 'vue'
import { FormKit } from '@formkit/vue'
import CardBox from '@/components/CardBox.vue'
import BaseButton from '@/components/BaseButton.vue'
import BaseButtons from '@/components/BaseButtons.vue'
import SectionMain from '@/components/SectionMain.vue'
import { usePlantasStore } from '@/stores/plantas'

const emit = defineEmits(['submit', 'closeModal'])

const props = defineProps({
  centroCoste: {
    type: Object,
    required: true,
    default: () => ({ esNuevo: true })
  }
})

const plantasStore = usePlantasStore()

const form = reactive({
  esNuevo: props.centroCoste?.esNuevo ?? true,
  id: props.centroCoste?.id ?? null,
  code: props.centroCoste?.code ?? null,
  name: props.centroCoste?.name ?? null,
  uo_fk: props.centroCoste?.uo_fk ?? null
})

const selectUnidadOperativa = computed(() => {
  return [
    { value: null, label: 'Sin unidad operativa' },
    ...plantasStore.getUnidadesOperativas.map((uo) => ({
      value: uo.id,
      label: uo.name
    }))
  ]
})

watch(
  () => props.centroCoste,
  (nuevo) => {
    form.esNuevo = nuevo?.esNuevo ?? true
    form.id = nuevo?.id ?? null
    form.code = nuevo?.code ?? null
    form.name = nuevo?.name ?? null
    form.uo_fk = nuevo?.uo_fk ?? null
  }
)

const submitHandler = () => {
  if (!form.name) return
  emit('submit', { ...form })
}

defineExpose({ submitHandler })
</script>

<template>
  <SectionMain>
    <CardBox is-form>
      <form class="w-full" @submit.prevent="submitHandler">
        <div class="grid grid-cols-1 lg:grid-cols-6 mb-6 gap-4 w-full">
          <div class="col-span-2 w-full">
            <FormKit
              v-model="form.code"
              type="text"
              label="Código"
              placeholder="Código del centro de coste"
              class="w-full"
            />
          </div>
          <div class="col-span-4 w-full">
            <FormKit
              v-model="form.name"
              type="text"
              label="Nombre"
              placeholder="Nombre del centro de coste"
              validation="required"
              class="w-full"
            />
          </div>
        </div>

        <div class="flex flex-col w-full mb-6">
          <FormKit
            v-model="form.uo_fk"
            :options="selectUnidadOperativa"
            type="select"
            label="Unidad Operativa"
            placeholder="Seleccionar unidad operativa..."
            class="w-full"
          />
        </div>
      </form>

      <template #footer>
        <BaseButtons>
          <BaseButton type="submit" color="info" label="Guardar" @click="submitHandler" />
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
