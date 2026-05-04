<script setup>
import { ref } from 'vue'
import { mdiCurrencyEur, mdiPlusBox } from '@mdi/js'
import LayoutAuthenticated from '@/layouts/LayoutAuthenticated.vue'
import SectionMain from '@/components/SectionMain.vue'
import SectionTitleLineWithButton from '@/components/SectionTitleLineWithButton.vue'
import CardBox from '@/components/CardBox.vue'
import BaseButton from '@/components/BaseButton.vue'
import CentrosCosteTable from '@/components/CentrosCosteTable.vue'

const table = ref(null)

const crearCentroCoste = () => {
  table.value.openModal(null)
}
</script>

<template>
  <LayoutAuthenticated>
    <SectionMain>
      <SectionTitleLineWithButton :icon="mdiCurrencyEur" title="Centros de Coste" main>
        <BaseButton
          :icon="mdiPlusBox"
          label="Nuevo Centro de Coste"
          color="info"
          outline
          rounded-full
          small
          @click="crearCentroCoste"
        />
      </SectionTitleLineWithButton>

      <CardBox class="mb-6" has-table>
        <CentrosCosteTable ref="table" />
      </CardBox>
    </SectionMain>
  </LayoutAuthenticated>
</template>
