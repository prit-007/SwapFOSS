<script setup lang="ts">
withDefaults(defineProps<{ text?: string }>(), { text: "Loading…" });
</script>

<template>
  <div class="stage-loader" role="status">
    <span class="stage-spinner"></span>
    <span class="stage-loader-text">{{ text }}</span>
  </div>
</template>
