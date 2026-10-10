<script setup lang="ts">
import { RouterView } from "vue-router";
import ToastHost from "@/components/common/ToastHost.vue";
import BackToTop from "@/components/common/BackToTop.vue";
</script>

<template>
  <RouterView />
  <BackToTop />
  <ToastHost />
</template>
