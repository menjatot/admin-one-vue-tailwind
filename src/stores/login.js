import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { getUserProfile } from '@/services/msalConfig'

export const useLoginStore = defineStore('loginStore', () => {
  const user = ref(JSON.parse(localStorage.getItem('user')) || null)
  const isAuthenticated = ref(localStorage.getItem('isAuthenticated') === 'true')
  const userName = ref(localStorage.getItem('userName') || '')
  const userEmail = ref(localStorage.getItem('userEmail') || '')
  // const userAvatar = ref(localStorage.getItem('userAvatar') || '')
  const userLogged = ref(localStorage.getItem('userLogged') || '')

  const userAvatar = computed(
    () =>      
    `https://ui-avatars.com/api/?name=${userName.value}&background=random&font-size=0.75&bold=true&color=fff`
  )
   // Watchers para persistencia
   watch([isAuthenticated, user, userName, userEmail, userAvatar, userLogged], ([newAuth, newUser, newName, newEmail, newAvatar,newUserLogged]) => {
    localStorage.setItem('isAuthenticated', newAuth)
    if (newUser) localStorage.setItem('user', JSON.stringify(newUser))
    if (newName) localStorage.setItem('userName', newName)
    if (newEmail) localStorage.setItem('userEmail', newEmail)
    if (newAvatar) localStorage.setItem('userAvatar', newAvatar)
    if (newUserLogged) localStorage.setItem('userLogged', newUserLogged)
  })




  const login = async (userData) => {
    try {
      isAuthenticated.value = true
      user.value = userData
      
      // Obtener perfil completo
      const userProfile = await getUserProfile()
      if (userProfile) {
        console.log('USERPROFILE:', userProfile);
        userName.value = userProfile.displayName
        userEmail.value = userProfile.email
        // userAvatar.value = userProfile.photoUrl
        userLogged.value=userProfile
      }
    } catch (error) {
      console.error('Error en login:', error)
      throw error
    }
  }
  
  const logout = async () => {
    user.value = null
    isAuthenticated.value = false
    userName.value = ''
    userEmail.value = ''
    // localStorage.removeItem('isAuthenticated')
    // localStorage.removeItem('user')
    localStorage.clear()
  }

  const  setUser=(payload)=> {
    if (payload.name) {
      userName.value = payload.name
      localStorage.setItem('userName', payload.name)
    }
    if (payload.username) {
      userEmail.value = payload.username
      localStorage.setItem('userEmail', payload.username)
    }
  }

  const setAccount = (account) => {
    user.value = account
  }

  const setIsAuthenticated = (valor) => {
    isAuthenticated.value = valor
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
    
  }
})

export default useLoginStore
