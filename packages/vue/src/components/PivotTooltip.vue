<script setup lang="ts">
defineProps<{
  visible: boolean
  x: number
  y: number
  text: string
}>()
</script>

<template>
  <div
    v-show="visible"
    class="vp-tooltip"
    role="tooltip"
    :style="{ left: `${x + 12}px`, top: `${y + 12}px` }"
  >
    {{ text }}
  </div>
</template>
