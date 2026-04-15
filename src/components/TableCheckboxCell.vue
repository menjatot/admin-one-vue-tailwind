<script setup>
defineProps({
  type: {
    type: String,
    default: 'td'
  },
  modelValue: {
    type: Boolean,
    default: false
  },
  disabled: {
    type: Boolean,
    default: false
  },
  label: {
    type: String,
    default: null
  }
})

const emit = defineEmits(['update:modelValue'])
</script>

<template>
  <component :is="type" class="lg:w-1">
    <label class="checkbox">
      <input
        :checked="modelValue"
        :disabled="disabled"
        type="checkbox"
        @change="emit('update:modelValue', $event.target.checked)"
      />
      <span class="check" />
      <span v-if="label" class="ml-1 text-xs">{{ label }}</span>
    </label>
  </component>
</template>
