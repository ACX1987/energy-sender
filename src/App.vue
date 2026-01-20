<script setup lang="ts">
import EnergySender from './components/EnergySender.vue'
</script>

<template>
  <div id="app">
    <header class="app-header">
      <div class="header-logo">
        <img src="/tron-logo.svg" alt="TRON" class="logo-icon" />
        <div class="header-text">
          <h1>⚡ TRON 能量发送工具</h1>
          <p>快速发送 TRON 能量</p>
        </div>
      </div>
    </header>
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

.app-header {
  text-align: center;
  padding: 40px 20px 20px;
  color: white;
}

.header-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.logo-icon {
  width: 48px;
  height: 48px;
  filter: drop-shadow(0 2px 8px rgba(255, 255, 255, 0.3));
}

.header-text {
  text-align: left;
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
  .app-header h1 {
    font-size: 20px;
  }
  
  .app-header p {
    font-size: 13px;
  }
  
  .app-header {
    padding: 16px 10px 10px;
  }
  
  .logo-icon {
    width: 32px;
    height: 32px;
  }
  
  .header-logo {
    gap: 10px;
  }
  
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
  .app-header h1 {
    font-size: 24px;
  }
  
  .app-header {
    padding: 20px 12px 12px;
  }
  
  .logo-icon {
    width: 36px;
    height: 36px;
  }
  
  .header-logo {
    gap: 12px;
  }
  
  main {
    padding: 12px;
  }
}

/* 平板设备 */
@media (min-width: 769px) and (max-width: 1024px) {
  .app-header h1 {
    font-size: 28px;
  }
  
  .logo-icon {
    width: 42px;
    height: 42px;
  }
}

/* 横屏低高度优化 */
@media (max-height: 600px) and (orientation: landscape) {
  .app-header {
    padding: 12px 16px 8px;
  }
  
  .app-header h1 {
    font-size: 18px;
    margin-bottom: 2px;
  }
  
  .app-header p {
    font-size: 12px;
  }
  
  .logo-icon {
    width: 28px;
    height: 28px;
  }
  
  main {
    padding: 12px;
  }
  
  .app-footer {
    padding: 12px;
    font-size: 11px;
  }
}
</style>
