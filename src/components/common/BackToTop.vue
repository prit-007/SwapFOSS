<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import AppIcon from "@/components/common/AppIcon.vue";

const visible = ref(false);

function onScroll() {
  visible.value = window.scrollY > 600;
}

function toTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

onMounted(() => {
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
});
onBeforeUnmount(() => window.removeEventListener("scroll", onScroll));
</script>

<template>
  <Transition name="backtotop">
    <button
      v-show="visible"
      class="back-to-top"
      type="button"
      aria-label="Back to top"
      @click="toTop"
    >
      <AppIcon name="arrow-up-01" :size="20" />
    </button>
  </Transition>
</template>
