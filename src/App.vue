<script setup lang="ts">
import EnergySender from './components/EnergySender.vue'
</script>

<template>
  <div id="app">
    <header class="app-header">
      <h1>⚡ 能量发送工具</h1>
      <p>快速发送 TRON 能量</p>
    </header>
    <main>
      <EnergySender />
    </main>
    <footer class="app-footer">
      <p>Powered by TRX.CEO API</p>
    </footer>
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
}

#app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-header {
  text-align: center;
  padding: 40px 20px 20px;
  color: white;
}

.app-header h1 {
  font-size: 32px;
  margin-bottom: 8px;
  font-weight: 700;
}

.app-header p {
  font-size: 14px;
  opacity: 0.9;
}

main {
  flex: 1;
  padding: 20px;
}

.app-footer {
  text-align: center;
  padding: 20px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 12px;
}

@media (max-width: 768px) {
  .app-header h1 {
    font-size: 24px;
  }
  
  .app-header {
    padding: 20px 12px 12px;
  }
  
  main {
    padding: 12px;
  }
}
</style>
