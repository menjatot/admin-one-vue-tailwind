import { defineStore } from 'pinia'
import { computed, ref, watch, onMounted } from 'vue'
import msalInstance from '@/services/msalConfig'
import { getUserProfile } from '@/services/msalConfig'
import { setSupabaseAuthContext } from '@/services/supabase'
import { syncOfflineAnaliticas } from '@/services/offlineSync'
import { usePlantasStore } from '@/stores/plantas'
import { useNotifications } from '@/composables/useNotifications'


const OFFLINE_AUTH_KEY = 'aqlara_offline_auth'
const OFFLINE_AUTH_MAX_AGE = 7 * 24 * 60 * 60 * 1000 // 7 días en ms

export const useLoginStore = defineStore('loginStore', () => {
  const { warning } = useNotifications()
  const user = ref(JSON.parse(sessionStorage.getItem('user')) || null)
  const isAuthenticated = ref(sessionStorage.getItem('isAuthenticated') === 'true')
  const userName = ref(sessionStorage.getItem('userName') || '')
  const userEmail = ref(sessionStorage.getItem('userEmail') || '')
  // const userAvatar = ref(sessionStorage.getItem('userAvatar') || '')
  const userLogged = ref(JSON.parse(sessionStorage.getItem('userLogged')) || {})
  const profilePhoto = ref(sessionStorage.getItem('profilePhoto') || '')
  const userAutenticated = ref(sessionStorage.getItem('userAutenticated') || '')
  const userRole=ref(sessionStorage.getItem('userRole') || '')
  const userId=ref(sessionStorage.getItem('userId') || '')
  
  // Variables para manejo de sesión
  const sessionTimeout = ref(null)
  const SESSION_DURATION = 30 * 60 * 1000 // 30 minutos en ms

  const userAvatar = computed(
    () =>      
    `https://ui-avatars.com/api/?name=${userName.value}&background=random&font-size=0.75&bold=true&color=fff`
  )
   // Watchers para persistencia segura
   watch([isAuthenticated, user, userName, userEmail, userAvatar, userLogged, profilePhoto, userAutenticated, userRole,userId], ([newAuth, newUser, newName, newEmail, newAvatar,newUserLogged, newProfilePhoto, newUserAutenticated, newUserRole, newUserId]) => {
    sessionStorage.setItem('isAuthenticated', newAuth)
    if (newUser) sessionStorage.setItem('user', JSON.stringify(newUser))
    if (newName) sessionStorage.setItem('userName', newName)
    if (newEmail) sessionStorage.setItem('userEmail', newEmail)
    if (newAvatar) sessionStorage.setItem('userAvatar', newAvatar)
    if (newUserLogged) sessionStorage.setItem('userLogged', JSON.stringify(newUserLogged))
     if (newProfilePhoto) sessionStorage.setItem('profilePhoto', newProfilePhoto)
     if (newUserAutenticated) sessionStorage.setItem('userAutenticated', newUserAutenticated)
      if (newUserRole) sessionStorage.setItem('userRole', newUserRole)
      if (newUserId) sessionStorage.setItem('userId', newUserId)
  })




  // Función para limpiar timeout de sesión
  const clearSessionTimeout = () => {
    if (sessionTimeout.value) {
      clearTimeout(sessionTimeout.value)
      sessionTimeout.value = null
    }
  }

  // Función para iniciar timeout de sesión
  const startSessionTimeout = () => {
    clearSessionTimeout()
    
    sessionTimeout.value = setTimeout(() => {
      console.warn('Sesión expirada por inactividad')
      logout()
      warning('Tu sesión ha expirado por inactividad. Por favor, inicia sesión nuevamente.', {
        title: 'Sesion expirada'
      })
    }, SESSION_DURATION)
  }

  // Función para renovar sesión (reiniciar timeout)
  const renewSession = () => {
    if (isAuthenticated.value) {
      const lastActivity = Date.now()
      sessionStorage.setItem('lastActivity', lastActivity.toString())
      startSessionTimeout()
    }
  }

  // Verificar si la sesión ha expirado
  const checkSessionExpiry = () => {
    const lastActivity = sessionStorage.getItem('lastActivity')
    if (lastActivity) {
      const timeDiff = Date.now() - parseInt(lastActivity)
      if (timeDiff > SESSION_DURATION) {
        logout()
        return false
      }
    }
    return true
  }

  const login = async (userData) => {
    try {
      isAuthenticated.value = true
      user.value = userData
      
      // Inicializar timestamp de sesión
      const loginTime = Date.now()
      sessionStorage.setItem('loginTime', loginTime.toString())
      sessionStorage.setItem('lastActivity', loginTime.toString())
      
      // Iniciar timeout de sesión
      startSessionTimeout()
      
      // Obtener perfil completo
      const userProfile = await getUserProfile()
      if (userProfile) {
        console.log('USERPROFILE:', userProfile);
        userAutenticated.value=userProfile
        userName.value = userProfile.displayName
        userEmail.value = userProfile.email
        // userAvatar.value = userProfile.photoUrl
        userLogged.value = { ...userLogged.value, ...userProfile }
        
        // Sincronizar contexto de seguridad con Supabase (RLS)
        setSupabaseAuthContext(userProfile.email, userRole.value)

        // Enviar analíticas guardadas offline (auth context ya está listo)
        syncOfflineAnaliticas()

        // NOTA: initializeStore() se pospone hasta que setUserRole() determine el rol
        // para evitar cargar datos con contexto de rol vacio
      }
    } catch (error) {
      console.error('Error en login:', error)
      throw error
    }
  }
  
  const logout = async () => {
    // Limpiar timeout de sesión
    clearSessionTimeout()
    
    // Limpiar contexto de seguridad de Supabase
    setSupabaseAuthContext(null)

    // Limpiar caché de auth offline
    localStorage.removeItem(OFFLINE_AUTH_KEY)

    user.value = null
    isAuthenticated.value = false
    userName.value = ''
    userEmail.value = ''
    sessionStorage.clear()
  }

  const getUserLogged=computed(() => {
    return userLogged.value
  })

  const  setUser=(payload)=> {
    if (payload.name) {
      userName.value = payload.name
      sessionStorage.setItem('userName', payload.name)
    }
    if (payload.username) {
      userEmail.value = payload.username
      sessionStorage.setItem('userEmail', payload.username)
    }
  }

  const saveOfflineCache = () => {
    if (userEmail.value) {
      localStorage.setItem(OFFLINE_AUTH_KEY, JSON.stringify({
        email: userEmail.value,
        role: userRole.value,
        userId: userId.value,
        name: userName.value,
        savedAt: Date.now()
      }))
    }
  }

  const loadAuthorizedData = async () => {
    try {
      const plantasStore = usePlantasStore()
      await plantasStore.initializeStore()
    } catch (error) {
      console.error('Error cargando datos autorizados tras restaurar sesion:', error)
    }
  }

  const setUserRole = (role) => {
     // Si userLogged.value no es un objeto, lo inicializamos
     if (typeof userLogged.value !== 'object' || userLogged.value === null) {
      userLogged.value = {}
    }
    userLogged.value = {
      ...userLogged.value,
      role: role
    }
    userRole.value = role

    // Sincronizar contexto si el rol cambia
    if (isAuthenticated.value && userEmail.value) {
      setSupabaseAuthContext(userEmail.value, role)

      // Refrescar datos autorizados según el nuevo rol
      const plantasStore = usePlantasStore()
      plantasStore.initializeStore()
    }

    saveOfflineCache()
  }

  const setUserId = (id) => {
     // Si userLogged.value no es un objeto, lo inicializamos
     if (typeof userLogged.value !== 'object' || userLogged.value === null) {
      userLogged.value = {}
    }
    userLogged.value = {
      ...userLogged.value,
      id: id
    }
    userId.value = id
    saveOfflineCache()
  }


  const setAccount = (account) => {
    user.value = account
  }

  const setIsAuthenticated = (valor) => {
    isAuthenticated.value = valor
  }
  const setProfilePhoto = (valor) => {
    profilePhoto.value = valor
  }

  // Inicialización: Sincronizar contexto si ya hay sesión en sessionStorage
  // (caso: app en background restaurada, sessionStorage preservado)
  if (isAuthenticated.value && userEmail.value) {
    setSupabaseAuthContext(userEmail.value, userRole.value)
    syncOfflineAnaliticas()
    loadAuthorizedData()
  } else {
    // Intento de restauración silenciosa desde caché offline
    // (caso: PWA cerrada completamente y reabierta — sessionStorage borrado)
    try {
      const cached = JSON.parse(localStorage.getItem(OFFLINE_AUTH_KEY) || 'null')
      const msalAccounts = msalInstance.getAllAccounts()
      const matchingAccount = cached && msalAccounts.find(
        (acc) => acc.username?.toLowerCase() === cached.email?.toLowerCase()
      )

      const cacheExpired = cached && (Date.now() - cached.savedAt > OFFLINE_AUTH_MAX_AGE)
      if (cacheExpired) {
        localStorage.removeItem(OFFLINE_AUTH_KEY)
        console.warn('Cache de sesion offline expirado (>7 dias). Se requiere nuevo login.')
      }

      if (cached && matchingAccount && !cacheExpired) {
        console.log('Restaurando sesion offline para:', cached.email)
        isAuthenticated.value = true
        userEmail.value = cached.email
        userRole.value = cached.role
        userId.value = cached.userId
        userName.value = cached.name

        const now = Date.now()
        sessionStorage.setItem('loginTime', now.toString())
        sessionStorage.setItem('lastActivity', now.toString())
        startSessionTimeout()

        setSupabaseAuthContext(cached.email, cached.role)
        syncOfflineAnaliticas()
        loadAuthorizedData()
      }
    } catch (e) {
      console.warn('No se pudo restaurar la sesión offline:', e)
    }
  }

  return {
    user,
    isAuthenticated,
    setIsAuthenticated,
    setAccount,
    userAvatar,
    setUser,
    userName,
    userEmail,
    logout,
    login,
    userLogged,
    profilePhoto,
    setProfilePhoto,
    setUserRole,
    userRole,
    getUserLogged,
    setUserId,
    userId,
    // Funciones de seguridad de sesión
    renewSession,
    checkSessionExpiry,
    clearSessionTimeout
  }
})

export default useLoginStore
