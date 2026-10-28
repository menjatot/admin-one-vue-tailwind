<script setup>
import { containerMaxW } from '@/config.js'
import BaseLevel from '@/components/BaseLevel.vue'
// import JustboilLogo from '@/components/JustboilLogo.vue'
import AqlaraLogo from '@/components/AqlaraLogo.vue'

const year = new Date().getFullYear()

// Sello de versión del bundle: lo inyecta vite.config.js en cada build. Sirve
// para que soporte pueda comprobar de un vistazo si el dispositivo está con una
// versión antigua en caché (el problema recurrente tras cada despliegue).
const buildId = typeof __BUILD_ID__ !== 'undefined' ? __BUILD_ID__ : 'dev'
</script>

<template>
  <footer class="py-2 px-6" :class="containerMaxW">
    <BaseLevel>
      <div class="text-center md:text-left">
        <b>&copy;{{ year }}, <a href="https://www.aqlara.com" target="_blank">AQLARA.com</a>.</b>
        <span class="ml-2 text-xs text-gray-400 dark:text-gray-500">versión {{ buildId }}</span>
        <slot />
      </div>
      <div class="md:py-2">
        <a href="https://www.aqlara.com">
          <AqlaraLogo class="w-auto h-8 md:h-6" />
        </a>
      </div>
    </BaseLevel>
  </footer>
</template>
