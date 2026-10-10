<script setup lang="ts"></script>

<template>
  <section class="hero">
    <div class="wrap">
      <h1>Page not found</h1>
      <p>That link doesn't point anywhere. Head back to the swap directory.</p>
    </div>
  </section>
  <main class="wrap" id="main" tabindex="-1">
    <RouterLink class="filter-btn" to="/" style="--pill-color: var(--text-muted)">← Back to Browse</RouterLink>
  </main>
</template>
