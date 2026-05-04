<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  modelValue: {
    type: [String, Number, null],
    default: null
  },
  options: {
    type: Array,
    default: () => []
  },
  label: {
    type: String,
    default: ''
  },
  placeholder: {
    type: String,
    default: 'Buscar...'
  },
  disabled: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue'])

const inputRef = ref(null)
const query = ref('')
const isOpen = ref(false)
const highlightedIndex = ref(-1)

// Texto mostrado en el input a partir del valor seleccionado
const selectedLabel = computed(
  () => props.options.find((o) => o.value == props.modelValue)?.label ?? ''
)

// Sincronizar el texto del input cuando cambia el valor externo
watch(
  () => props.modelValue,
  () => {
    if (!isOpen.value) query.value = selectedLabel.value
  },
  { immediate: true }
)

const filteredOptions = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return props.options
  return props.options.filter((o) => o.label.toLowerCase().includes(q))
})

const open = () => {
  if (props.disabled) return
  query.value = ''
  isOpen.value = true
  highlightedIndex.value = -1
}

const close = () => {
  isOpen.value = false
  // Si no hay selección, restaurar el texto al label del valor actual
  query.value = selectedLabel.value
  highlightedIndex.value = -1
}

const selectOption = (option) => {
  emit('update:modelValue', option.value)
  query.value = option.label
  isOpen.value = false
  highlightedIndex.value = -1
}

const clearSelection = () => {
  emit('update:modelValue', null)
  query.value = ''
  nextTick(() => inputRef.value?.focus())
}

const containerRef = ref(null)

const handleClickOutside = (e) => {
  if (containerRef.value && !containerRef.value.contains(e.target)) {
    close()
  }
}

onMounted(() => document.addEventListener('mousedown', handleClickOutside))
onUnmounted(() => document.removeEventListener('mousedown', handleClickOutside))

const onKeydown = (e) => {
  if (!isOpen.value) {
    if (e.key === 'ArrowDown' || e.key === 'Enter') open()
    return
  }

  if (e.key === 'ArrowDown') {
    e.preventDefault()
    highlightedIndex.value = Math.min(
      highlightedIndex.value + 1,
      filteredOptions.value.length - 1
    )
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    highlightedIndex.value = Math.max(highlightedIndex.value - 1, 0)
  } else if (e.key === 'Enter') {
    e.preventDefault()
    if (highlightedIndex.value >= 0 && filteredOptions.value[highlightedIndex.value]) {
      selectOption(filteredOptions.value[highlightedIndex.value])
    }
  } else if (e.key === 'Escape') {
    close()
  }
}
</script>

<template>
  <div class="w-full">
    <label
      v-if="label"
      class="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300"
    >
      {{ label }}
    </label>

    <div ref="containerRef" class="relative w-full">
      <!-- Input principal -->
      <div class="relative flex items-center">
        <input
          ref="inputRef"
          v-model="query"
          type="text"
          :placeholder="placeholder"
          :disabled="disabled"
          class="w-full rounded border border-gray-300 bg-white px-3 py-2 pr-16 text-sm
                 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-1
                 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800
                 dark:text-gray-100 dark:placeholder-gray-400
                 disabled:cursor-not-allowed disabled:opacity-50"
          @focus="open"
          @input="isOpen = true; highlightedIndex = -1"
          @keydown="onKeydown"
        />

        <!-- Botón limpiar -->
        <button
          v-if="modelValue !== null && modelValue !== undefined && modelValue !== ''"
          type="button"
          class="absolute right-7 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 focus:outline-none"
          tabindex="-1"
          @click.stop="clearSelection"
        >
          <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 9.293l4.646-4.647.708.708L10.707 10l4.647 4.646-.708.708L10 10.707l-4.646 4.647-.708-.708L9.293 10 4.646 5.354l.708-.708L10 9.293z" clip-rule="evenodd" />
          </svg>
        </button>

        <!-- Chevron -->
        <button
          type="button"
          tabindex="-1"
          class="absolute right-2 text-gray-400 focus:outline-none"
          @click.stop="isOpen ? close() : open(); nextTick(() => inputRef?.focus())"
        >
          <svg
            class="h-4 w-4 transition-transform"
            :class="isOpen ? 'rotate-180' : ''"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>

      <!-- Dropdown -->
      <ul
        v-show="isOpen"
        class="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded border
               border-gray-200 bg-white shadow-lg dark:border-slate-600 dark:bg-slate-800"
      >
        <li v-if="filteredOptions.length === 0" class="px-3 py-2 text-sm text-gray-400 italic">
          Sin resultados
        </li>
        <li
          v-for="(option, index) in filteredOptions"
          :key="option.value"
          class="cursor-pointer px-3 py-2 text-sm transition-colors"
          :class="[
            index === highlightedIndex
              ? 'bg-blue-500 text-white'
              : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-slate-700',
            option.value == modelValue ? 'font-semibold' : ''
          ]"
          @mousedown.prevent="selectOption(option)"
          @mouseover="highlightedIndex = index"
        >
          {{ option.label }}
        </li>
      </ul>
    </div>
  </div>
</template>
