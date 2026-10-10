<script setup lang="ts">
import { RouterLink } from "vue-router";
import AppIcon from "@/components/common/AppIcon.vue";
</script>

<template>
  <a class="skip-link" href="#main">Skip to content</a>
  <header class="site-header">
    <div class="wrap">
      <div class="brand">Swap<span>FOSS</span></div>
      <nav class="site-nav">
        <a href="https://github.com/prit-007/SwapFOSS" target="_blank" rel="noopener">
          <AppIcon name="github-01" /> GitHub
        </a>
        <RouterLink to="/">Browse</RouterLink>
        <RouterLink to="/batch">Batch export</RouterLink>
        <RouterLink to="/create">Create</RouterLink>
      </nav>
    </div>
  </header>
</template>
