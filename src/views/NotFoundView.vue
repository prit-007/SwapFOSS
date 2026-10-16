<script setup lang="ts">
import AppIcon from "@/components/common/AppIcon.vue";
</script>

<template>
  <section class="hero">
    <div class="wrap">
      <h1>Page not found</h1>
      <p>That link doesn't point anywhere. Head back to the swap directory.</p>
    </div>
  </section>
  <main class="wrap not-found-main" id="main" tabindex="-1">
    <RouterLink class="filter-btn" to="/" style="--pill-color: var(--text-muted)">
      <AppIcon name="arrow-left-01" :size="14" /> Back to Browse
    </RouterLink>
  </main>
</template>
