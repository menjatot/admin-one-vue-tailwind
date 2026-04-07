import { readonly, ref } from 'vue'

const notifications = ref([])
const activeTimeouts = new Map()
const DEFAULT_LIFE = 5000

let nextNotificationId = 0

const removeNotification = (id) => {
  const timeoutId = activeTimeouts.get(id)

  if (timeoutId) {
    clearTimeout(timeoutId)
    activeTimeouts.delete(id)
  }

  notifications.value = notifications.value.filter((notification) => notification.id !== id)
}

const addNotification = ({ title, message, color = 'info', life = DEFAULT_LIFE }) => {
  const id = ++nextNotificationId

  notifications.value = [
    ...notifications.value,
    {
      id,
      title,
      message,
      color
    }
  ]

  if (life > 0 && typeof window !== 'undefined') {
    const timeoutId = window.setTimeout(() => {
      removeNotification(id)
    }, life)

    activeTimeouts.set(id, timeoutId)
  }

  return id
}

const notify = (payload) => addNotification(payload)

const success = (message, options = {}) =>
  addNotification({
    title: options.title ?? 'Operacion completada',
    message,
    color: 'success',
    life: options.life
  })

const error = (message, options = {}) =>
  addNotification({
    title: options.title ?? 'Se ha producido un error',
    message,
    color: 'danger',
    life: options.life ?? 7000
  })

const warning = (message, options = {}) =>
  addNotification({
    title: options.title ?? 'Revisa la informacion',
    message,
    color: 'warning',
    life: options.life
  })

const info = (message, options = {}) =>
  addNotification({
    title: options.title ?? 'Informacion',
    message,
    color: 'info',
    life: options.life
  })

export const useNotifications = () => ({
  notifications: readonly(notifications),
  notify,
  success,
  error,
  warning,
  info,
  removeNotification
})