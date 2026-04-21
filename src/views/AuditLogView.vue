<script setup>
import { mdiFileDocumentOutline } from '@mdi/js'
import SectionMain from '@/components/SectionMain.vue'
import CardBox from '@/components/CardBox.vue'
import LayoutAuthenticated from '@/layouts/LayoutAuthenticated.vue'
import SectionTitleLineWithButton from '@/components/SectionTitleLineWithButton.vue'
import AuditLogTable from '@/components/AuditLogTable.vue'
</script>

<template>
  <LayoutAuthenticated>
    <SectionMain>
      <SectionTitleLineWithButton :icon="mdiFileDocumentOutline" title="Registro de Actividad" main />

      <CardBox class="mb-6" has-table>
        <AuditLogTable />
      </CardBox>
    </SectionMain>
  </LayoutAuthenticated>
</template>
