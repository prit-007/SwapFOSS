<script setup lang="ts">
import AppIcon from "./AppIcon.vue";
withDefaults(defineProps<{ what?: string }>(), { what: "content" });
const emit = defineEmits<{ retry: [] }>();
</script>

<template>
  <div class="load-error" role="alert">
    <span class="load-error-icon" aria-hidden="true"><AppIcon name="alert-01" :size="20" /></span>
    <p class="load-error-title">Couldn't load {{ what }}</p>
    <p class="load-error-text">
      The data files didn't respond. Check your connection and try again.
    </p>
    <button class="load-error-retry" type="button" @click="emit('retry')">
      <AppIcon name="refresh-01" /> Retry
    </button>
  </div>
</template>
