<script setup lang="ts">
withDefaults(defineProps<{ what?: string }>(), { what: "content" });
const emit = defineEmits<{ retry: [] }>();
</script>

<template>
  <div class="load-error" role="alert">
    <span class="load-error-icon" aria-hidden="true">!</span>
    <p class="load-error-title">Couldn't load {{ what }}</p>
    <p class="load-error-text">
      The data files didn't respond. Check your connection and try again.
    </p>
    <button class="load-error-retry" type="button" @click="emit('retry')">Retry</button>
  </div>
</template>
