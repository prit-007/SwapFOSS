<script setup lang="ts">
import { computed } from "vue";
import { ICONS, type IconName } from "@/icons";

const props = withDefaults(
  defineProps<{ name: IconName; size?: string | number }>(),
  { size: "1em" },
);

const body = computed(() => ICONS[props.name] || "");
</script>

<template>
  <svg
    v-if="body"
    class="ico"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
    focusable="false"
    v-html="body"
  ></svg>
</template>
