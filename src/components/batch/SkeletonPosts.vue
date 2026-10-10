<template>
  <div class="posts-grid" aria-hidden="true">
    <div v-for="n in 3" :key="n" class="skeleton-card skeleton-post">
      <div class="skeleton skeleton-line" style="width: 60%"></div>
      <div class="skeleton skeleton-block"></div>
      <div class="skeleton-row">
        <span class="skeleton skeleton-dot"></span>
        <span class="skeleton skeleton-dot"></span>
        <span class="skeleton skeleton-dot"></span>
        <span class="skeleton skeleton-dot"></span>
      </div>
      <div class="skeleton skeleton-line" style="width: 100%"></div>
      <div class="skeleton skeleton-btn"></div>
      <div class="skeleton skeleton-btn"></div>
    </div>
  </div>
</template>
