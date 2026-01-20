<script setup lang="ts">
import EnergySender from './components/EnergySender.vue'
</script>

<template>
  <div id="app">
    <main>
      <EnergySender />
    </main>
    <footer class="app-footer">
      <p>Powered by <a href="https://wwtrx.com" target="_blank" rel="noopener">wwtrx.com</a></p>
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

.app-footer a {
  color: rgba(255, 255, 255, 0.9);
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s;
}

.app-footer a:hover {
  color: #fff;
  text-decoration: underline;
}

/* 响应式设计 */
/* 移动端竖屏 */
@media (max-width: 480px) {
  main {
    padding: 10px;
  }
  
  .app-footer {
    padding: 16px;
    font-size: 11px;
  }
}

/* 移动端横屏 / 小屏幕设备 */
@media (min-width: 481px) and (max-width: 768px) {
  main {
    padding: 12px;
  }
}

/* 平板设备 */
@media (min-width: 769px) and (max-width: 1024px) {
  /* 保持默认样式 */
}

/* 横屏低高度优化 */
@media (max-height: 600px) and (orientation: landscape) {
  main {
    padding: 12px;
  }
  
  .app-footer {
    padding: 12px;
    font-size: 11px;
  }
}
</style>
