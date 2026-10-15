<script setup>
import { containerMaxW } from '@/config.js'

// `fluid`: ocupa todo el ancho disponible (sin el tope de containerMaxW).
// Por defecto se mantiene el ancho limitado y centrado del resto de páginas.
defineProps({
  fluid: {
    type: Boolean,
    default: false
  }
})
</script>

<template>
  <section class="p-6" :class="[fluid ? '' : containerMaxW]">
    <slot />
  </section>
</template>
