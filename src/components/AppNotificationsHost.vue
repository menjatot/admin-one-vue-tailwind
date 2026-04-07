<script setup>
import { computed } from 'vue'
import {
  mdiAlert,
  mdiAlertCircle,
  mdiCheckCircle,
  mdiClose,
  mdiInformation
} from '@mdi/js'
import NotificationBar from '@/components/NotificationBar.vue'
import BaseButton from '@/components/BaseButton.vue'
import { useNotifications } from '@/composables/useNotifications'

const { notifications, removeNotification } = useNotifications()

const iconByColor = {
  info: mdiInformation,
  success: mdiCheckCircle,
  warning: mdiAlert,
  danger: mdiAlertCircle
}

const visibleNotifications = computed(() => notifications.value)

const getNotificationIcon = (notification) => iconByColor[notification.color] ?? mdiInformation
</script>

<template>
  <div class="pointer-events-none fixed right-4 top-4 z-50 flex w-[min(28rem,calc(100vw-2rem))] flex-col">
    <TransitionGroup name="app-notification">
      <div
        v-for="notification in visibleNotifications"
        :key="notification.id"
        class="pointer-events-auto"
      >
        <NotificationBar :color="notification.color" :icon="getNotificationIcon(notification)">
          <template #right>
            <BaseButton
              :icon="mdiClose"
              small
              rounded-full
              color="white"
              @click="removeNotification(notification.id)"
            />
          </template>
          <div class="flex flex-col gap-1 text-left">
            <strong v-if="notification.title">{{ notification.title }}</strong>
            <span>{{ notification.message }}</span>
          </div>
        </NotificationBar>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.app-notification-enter-active,
.app-notification-leave-active {
  transition: all 0.2s ease;
}

.app-notification-enter-from,
.app-notification-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>