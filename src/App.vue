<script setup>
import { onMounted } from 'vue';
import { RouterView } from 'vue-router'
import { usePlantasStore } from './stores/plantas'
import AppNotificationsHost from '@/components/AppNotificationsHost.vue'

const plantasStore=usePlantasStore()

onMounted(async () => {
  await plantasStore.initializeStore()
})



</script>

<template>
  <AppNotificationsHost />
  <RouterView />
</template>
