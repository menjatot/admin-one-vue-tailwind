<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { mdiMicrosoftWindows } from '@mdi/js'
import SectionFullScreen from '@/components/SectionFullScreen.vue'
import CardBox from '@/components/CardBox.vue'
import BaseButton from '@/components/BaseButton.vue'
import BaseButtons from '@/components/BaseButtons.vue'
import LayoutGuest from '@/layouts/LayoutGuest.vue'
import msalInstance from '@/services/msalConfig'
import useLoginStore from '@/stores/login'
import AqlaraLogo from '@/components/AqlaraLogo.vue'
import { supabase } from '@/services/supabase'

const router = useRouter()
const loginStore = useLoginStore()

const isAuthenticating = ref(false)
const errorMessage = ref('')
const accessToken = ref('')

const submit = () => {}

const determineRoleFromAccount = async (userEmail) => {
  const email = userEmail.toLowerCase()

  // Usar RPC SECURITY DEFINER que salta el RLS (el rol aun no esta seteado)
  const { data, error } = await supabase.rpc('get_operario_by_email', { p_email: email })

  if (error) {
    console.warn('Error en RPC get_operario_by_email:', error)
    return null
  }

  if (!data || data.length === 0) {
    console.log('No se encontró el operario', email)
    return null
  }

  console.log('Operario encontrado via RPC:', data[0])
  return data[0]
}

const loginWithMicrosoft = async () => {
  if (isAuthenticating.value) return
  isAuthenticating.value = true
  errorMessage.value = ''

  try {
    const loginResponse = await msalInstance.loginPopup({
      scopes: ['User.Read', 'profile', 'email']
    })

    accessToken.value = loginResponse.accessToken
    console.log('Login RESPONSE: ', loginResponse)

    loginStore.setIsAuthenticated(true)
    loginStore.setAccount(loginResponse.account)
    loginStore.setUser(loginResponse.account)

    // Esperar a que login() complete (carga perfil MS, establece contexto auth basico)
    await loginStore.login(loginResponse.account)
    console.log('Login successful:', loginResponse)

    // Ahora determinar el rol usando RPC que salta el RLS
    const operario = await determineRoleFromAccount(loginResponse.account.username)

    if (!operario) {
      console.log('Usuario no autorizado: no existe en tabla operarios')
      router.push('/unauthorized')
    } else {
      console.log('Usuario autorizado con rol:', operario.rol_id)
      loginStore.setUserRole(operario.rol_id)
      loginStore.setUserId(operario.id)
      // setUserRole ya llama a initializeStore() con el rol correcto
      router.push('/mapa')
    }
  } catch (error) {
    console.error('Login failed:', error)
    errorMessage.value = `LOGIN FAILED ${error.message}`

    if (error.name === 'BrowserAuthError' && error.message.includes('interaction_in_progress')) {
      msalInstance.handleRedirectPromise().then(() => {
        errorMessage.value = 'Sesión en progreso, por favor intente nuevamente'
      })
    } else {
      errorMessage.value = 'Error al iniciar sesión con Microsoft'
    }
  } finally {
    isAuthenticating.value = false
  }
}

onMounted(() => {
  msalInstance
    .initialize()
    .then(() => {
      console.log('MSAL initialized')
    })
    .catch((error) => {
      console.error('MSAL initialization failed:', error)
    })
})
</script>

<template>
  <LayoutGuest>
    <SectionFullScreen v-slot="{ cardClass }" bg="blueDarkSoft">
      <CardBox :class="cardClass" is-form @submit.prevent="submit">
        <!-- <img src="" alt="Aqlara" class="w-32 mx-auto" /> -->
        <div class="flex justify-center">
          <AqlaraLogo />
        </div>

        <template #footer>
          <BaseButtons class="flex justify-center gap-4">
            <BaseButton
              :disabled="isAuthenticating"
              type="submit"
              :icon="mdiMicrosoftWindows"
              color="info"
              label="Login with Microsoft"
              @click="loginWithMicrosoft"
            />
            <!-- <BaseButton label="Login with Factorial HR" :icon="mdiAccount" color="danger" @click="loginWithFactorial"  /> -->
          </BaseButtons>

          <div v-if="errorMessage" class="text-red-500 text-sm text-center">
            {{ errorMessage }}
          </div>
        </template>
      </CardBox>
    </SectionFullScreen>
  </LayoutGuest>
</template>
