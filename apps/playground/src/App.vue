<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <div class="app">
    <header class="app-header">
      <div class="brand">vue-pivot</div>
      <nav>
        <RouterLink to="/">Superstore</RouterLink>
        <RouterLink to="/poc">5k×200 PoC</RouterLink>
        <RouterLink to="/interaction">Interaction</RouterLink>
        <RouterLink to="/aggregated">Aggregated</RouterLink>
      </nav>
    </header>
    <main>
      <RouterView />
    </main>
  </div>
</template>

<style>
html,
body,
#app {
  margin: 0;
  height: 100%;
  font-family: "IBM Plex Sans", "Source Han Sans SC", sans-serif;
  background: radial-gradient(circle at top left, #e2eeff, #eef2f6 45%, #e6edf3);
  color: #1b2430;
}
.app {
  min-height: 100%;
  display: flex;
  flex-direction: column;
}
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  border-bottom: 1px solid #d5dde5;
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(8px);
}
.brand {
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.02em;
}
nav {
  display: flex;
  gap: 14px;
}
nav a {
  color: #2f62b5;
  text-decoration: none;
  font-weight: 500;
}
nav a.router-link-active {
  text-decoration: underline;
}
main {
  flex: 1;
  padding: 16px 20px 24px;
  min-height: 0;
}
</style>
