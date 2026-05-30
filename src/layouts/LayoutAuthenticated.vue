<script setup>
import { mdiForwardburger, mdiBackburger, mdiMenu, mdiAlertCircle, mdiClose } from '@mdi/js'
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import menuAside from '@/menuAside.js'
import menuNavBar from '@/menuNavBar.js'
import { useDarkModeStore } from '@/stores/darkMode.js'
import BaseIcon from '@/components/BaseIcon.vue'
import FormControl from '@/components/FormControl.vue'
import NavBar from '@/components/NavBar.vue'
import NavBarItemPlain from '@/components/NavBarItemPlain.vue'
import AsideMenu from '@/components/AsideMenu.vue'
import FooterBar from '@/components/FooterBar.vue'
import useLoginStore from '@/stores/login.js'
import UnAutorizedComponent from '@/components/UnAutorizedComponent.vue'
import { useSessionSecurity } from '@/composables/useSessionSecurity.js'
import { useDashboardIncidencias } from '@/composables/useDashboardIncidencias'
import { usePlantasStore } from '@/stores/plantas'


const loginStore = useLoginStore()
const plantaStore = usePlantasStore()

const { resumen, cargarIncidencias } = useDashboardIncidencias()
const incidenciasBannerCerrado = ref(false)

const getZonasOperario = () => {
  if (loginStore.userRole === '99') return null
  const operario = plantaStore.getOperarios.find(
    (op) => op.email?.toLowerCase() === loginStore.userEmail?.toLowerCase()
  )
  if (!operario?.zonas?.length) return []
  return operario.zonas.map((z) => (typeof z === 'object' ? z.id : z))
}

onMounted(() => {
  if (loginStore.userRole !== '1' && loginStore.userRole !== '10') cargarIncidencias(getZonasOperario())
})

// Inicializar seguridad de sesión
useSessionSecurity()

const layoutAsidePadding = 'lg:pl-60'

const darkModeStore = useDarkModeStore()

const router = useRouter()

const isAsideMobileExpanded = ref(false)
const isAsideLgActive = ref(false)

router.beforeEach(() => {
  isAsideMobileExpanded.value = false
  isAsideLgActive.value = false
})

const menuClick = (event, item) => {
  if (item.isToggleLightDark) {
    darkModeStore.set()
  }

  if (item.isLogout) {    
   console.log('logout')
     loginStore.logout()
     router.push('/login')
  

    
  }
}
</script>

<template>
  <div
    v-if="loginStore.isAuthenticated"
    :class="{
      'overflow-hidden lg:overflow-visible': isAsideMobileExpanded
    }"
  >
    <div
      :class="[layoutAsidePadding, { 'ml-60 lg:ml-0': isAsideMobileExpanded }]"
      class="pt-14 min-h-screen w-screen transition-position lg:w-auto bg-gray-50 dark:bg-slate-800 dark:text-slate-100"
    >
      <NavBar
      :menu="menuNavBar"
      :class="[layoutAsidePadding, { 'ml-60 lg:ml-0': isAsideMobileExpanded }]"
      @menu-click="menuClick"
      >
        <NavBarItemPlain
          display="flex lg:hidden"
          @click.prevent="isAsideMobileExpanded = !isAsideMobileExpanded"
        >
          <BaseIcon :path="isAsideMobileExpanded ? mdiBackburger : mdiForwardburger" size="24" />
        </NavBarItemPlain>
        <NavBarItemPlain display="hidden" @click.prevent="isAsideLgActive = true">
          <BaseIcon :path="mdiMenu" size="24" />
        </NavBarItemPlain>
        <!-- <NavBarItemPlain use-margin>
          <FormControl placeholder="Search (ctrl+k)" ctrl-k-focus transparent borderless />
        </NavBarItemPlain> -->
      </NavBar>
      <div
        v-if="resumen.conIncidencias > 0 && !incidenciasBannerCerrado && loginStore.userRole !== '1' && loginStore.userRole !== '10'"
        class="mx-4 mt-2 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-2 dark:border-red-700 dark:bg-red-900/20"
      >
        <button
          class="flex items-center gap-2 text-sm font-medium text-red-700 dark:text-red-300 hover:text-red-800 dark:hover:text-red-200 cursor-pointer"
          @click="router.push('/tablaAnaliticas')"
        >
          <BaseIcon :path="mdiAlertCircle" size="18" class="text-red-500" />
          {{ resumen.conIncidencias }} {{ resumen.conIncidencias === 1 ? 'analítica fuera de rango' : 'analíticas fuera de rango' }}
          en los últimos 7 días — Ver analíticas
        </button>
        <button
          class="text-red-400 hover:text-red-600 dark:hover:text-red-300"
          @click="incidenciasBannerCerrado = true"
        >
          <BaseIcon :path="mdiClose" size="16" />
        </button>
      </div>
      <AsideMenu
        :is-aside-mobile-expanded="isAsideMobileExpanded"
        :is-aside-lg-active="isAsideLgActive"
        :menu="menuAside"
        @menu-click="menuClick"
        @aside-lg-close-click="isAsideLgActive = false"
      />
      <slot />
      <FooterBar>
       
        <a href="https://aqlara.com" target="_blank" class="text-blue-600"
          > AQLARA</a
        >
        Ciclo Integral de Agua
      </FooterBar>
    </div>
  </div>
  <div v-else>
    <UnAutorizedComponent/>
  </div>
  
</template>
