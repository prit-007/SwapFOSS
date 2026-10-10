<template>
  <div class="grid" aria-hidden="true">
    <div v-for="n in 6" :key="n" class="skeleton-card">
      <div class="skeleton skeleton-media"></div>
      <div class="skeleton skeleton-line" style="width: 45%"></div>
      <div class="skeleton skeleton-line" style="width: 85%"></div>
      <div class="skeleton skeleton-line" style="width: 65%"></div>
      <div class="skeleton-row">
        <span class="skeleton skeleton-pill"></span>
        <span class="skeleton skeleton-pill"></span>
        <span class="skeleton skeleton-pill"></span>
      </div>
    </div>
  </div>
</template>
