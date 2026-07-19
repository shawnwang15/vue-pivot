<script setup lang="ts">
defineProps<{
  label?: string
  height: number
}>()
</script>

<template>
  <div class="vp-corner" :style="{ height: `${height}px` }" role="columnheader">
    <slot name="corner-cell">
      {{ label ?? '' }}
    </slot>
  </div>
</template>
