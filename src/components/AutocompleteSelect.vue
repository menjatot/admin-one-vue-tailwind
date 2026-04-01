<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { mdiChevronDown, mdiClose } from '@mdi/js'
import BaseIcon from '@/components/BaseIcon.vue'

const props = defineProps({
  modelValue: {
    type: [String, Number, Object, null],
    default: null
  },
  options: {
    type: Array,
    default: () => []
  },
  placeholder: {
    type: String,
    default: 'Seleccionar...'
  },
  disabled: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue'])

const isOpen = ref(false)
const searchQuery = ref('')
const searchInput = ref(null)
const container = ref(null)

const toggleOpen = () => {
  if (props.disabled) return
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    searchQuery.value = ''
    setTimeout(() => searchInput.value?.focus(), 50)
  }
}

const customFormatTitle = (val) => {
    if(val === null || val === undefined) return '';
    const option = props.options.find(o => String(o.value) === String(val))
    return option ? option.label : ''
}

const displayValue = computed(() => {
  if (props.modelValue === null || props.modelValue === undefined || props.modelValue === '') {
    return ''
  }
  return customFormatTitle(props.modelValue)
})

const filteredOptions = computed(() => {
  if (!searchQuery.value) return props.options
  const query = searchQuery.value.toLowerCase()
  return props.options.filter(opt => 
    String(opt.label).toLowerCase().includes(query)
  )
})

const selectOption = (option) => {
  emit('update:modelValue', option.value)
  isOpen.value = false
  searchQuery.value = ''
}

const clearSelection = (e) => {
  e.stopPropagation()
  emit('update:modelValue', null)
  isOpen.value = false
}

const closeOnOutsideClick = (e) => {
  if (container.value && !container.value.contains(e.target)) {
    isOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', closeOnOutsideClick)
})

onUnmounted(() => {
  document.removeEventListener('click', closeOnOutsideClick)
})
</script>

<template>
  <div class="relative w-full" ref="container">
    <div 
      @click="toggleOpen"
      :class="[
        'w-full flex items-center justify-between border rounded shadow-sm px-3 py-2 text-sm cursor-pointer transition-colors',
        disabled ? 'bg-gray-100 dark:bg-slate-800 text-gray-400 cursor-not-allowed border-gray-200 dark:border-slate-700' : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500',
        isOpen ? 'border-blue-500 ring-1 ring-blue-500' : ''
      ]"
    >
      <span v-if="displayValue" class="truncate">{{ displayValue }}</span>
      <span v-else class="text-gray-400 dark:text-gray-500 truncate">{{ placeholder }}</span>
      
      <div class="flex items-center gap-1">
        <div v-if="displayValue && !disabled" @click="clearSelection" class="p-0.5 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-full text-gray-400 hover:text-gray-600 transition-colors">
            <BaseIcon :path="mdiClose" w="w-4" h="h-4" />
        </div>
        <BaseIcon :path="mdiChevronDown" w="w-5" h="h-5" class="text-gray-400 transition-transform duration-200" :class="{ 'rotate-180': isOpen }" />
      </div>
    </div>

    <div 
      v-if="isOpen" 
      class="absolute z-[100] w-full mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 shadow-lg rounded-md overflow-hidden"
    >
      <div class="p-2 border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/80">
        <input 
          ref="searchInput"
          v-model="searchQuery"
          type="text" 
          placeholder="Buscar..." 
          class="w-full text-sm border-gray-300 dark:border-slate-600 dark:bg-slate-900 dark:text-white rounded px-3 py-1.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-shadow outline-none"
        />
      </div>
      <ul class="max-h-60 overflow-y-auto py-1">
        <li v-if="filteredOptions.length === 0" class="px-4 py-3 text-sm text-center text-gray-500 dark:text-gray-400">
          No se encontraron resultados
        </li>
        <li 
          v-for="option in filteredOptions" 
          :key="option.value"
          @click="selectOption(option)"
          :class="[
            'px-4 py-2 text-sm cursor-pointer transition-colors',
            String(option.value) === String(modelValue) 
              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-semibold' 
              : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700'
          ]"
        >
          {{ option.label }}
        </li>
      </ul>
    </div>
  </div>
</template>
