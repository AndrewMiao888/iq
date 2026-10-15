<script setup lang="ts">
const props = defineProps<{ grid: string }>()
const rows = computed(() => props.grid.split('/'))
const cells = computed(() => rows.value.flatMap(row => [...row]))
const description = computed(() => `A ${rows.value.length} by ${rows.value[0]?.length ?? 0} pixel grid. ${rows.value.map((row, index) => {
  const filled = [...row].flatMap((cell, column) => cell === '#' ? [column + 1] : [])
  return `Row ${index + 1}: ${filled.length ? `columns ${filled.join(', ')}` : 'no filled pixels'}`
}).join('; ')}.`)
</script>

<template>
  <span class="pixel-grid" role="img" :aria-label="description" :style="{ '--pixel-columns': rows[0]?.length ?? 5 }">
    <span v-for="(cell, index) in cells" :key="index" class="pixel-cell" :class="{ filled: cell === '#' }" aria-hidden="true" />
  </span>
</template>
