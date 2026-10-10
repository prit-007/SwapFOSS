<script setup lang="ts">
import { useToast } from "@/composables/useToast";
import AppIcon from "@/components/common/AppIcon.vue";

const { toasts, dismiss } = useToast();
</script>

<template>
  <div class="toast-host" role="status" aria-live="polite">
    <TransitionGroup name="toast">
      <button
        v-for="t in toasts"
        :key="t.id"
        type="button"
        class="toast"
        :class="`toast-${t.tone}`"
        @click="dismiss(t.id)"
      >
        <AppIcon :name="t.icon" :size="16" />
        <span>{{ t.message }}</span>
      </button>
    </TransitionGroup>
  </div>
</template>
