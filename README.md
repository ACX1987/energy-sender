# 能量发送工具

⚡ 快速发送 TRON 能量的 Web 工具

## 功能特性

- ✅ API Key 管理（本地存储）
- ✅ 实时查询可用笔数
- ✅ 一键发送能量
- ✅ 发送记录追踪
- ✅ 响应式设计（支持移动端）

## 技术栈

- Vue 3 + TypeScript
- Vite
- Axios
- Composition API

## 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```

## 部署到 Cloudflare Pages

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入 Pages 页面，点击 "Create a project"
3. 选择 "Connect to Git" 或 "Direct Upload"

### 方式一：通过 Git 部署（推荐）

1. 将项目推送到 GitHub/GitLab
2. 在 Cloudflare Pages 中连接仓库
3. 配置构建设置：
   - **构建命令**: `npm run build`
   - **构建输出目录**: `dist`
   - **Node 版本**: 18 或更高
4. 点击 "Save and Deploy"

### 方式二：直接上传

```bash
# 构建项目
npm run build

# 使用 Wrangler CLI 部署
npx wrangler pages deploy dist --project-name=energy-sender
```

或者直接在 Cloudflare Dashboard 中拖拽 `dist` 文件夹上传。

## 环境变量

无需配置环境变量，API 地址已内置在代码中。

## 使用说明

1. 首次访问输入 API Key（从 trx.ceo 获取）
2. 系统自动查询可用笔数
3. 输入接收地址（TRC20 格式）
4. 点击"发送能量"按钮
5. 查看发送记录和状态

## API 接口

- **查询余额**: `POST https://www.trx.ceo/api/user/getBalancebykey`
- **发送能量**: `POST https://www.trx.ceo/api/v1/payk`

## 注意事项

- API Key 仅存储在浏览器本地，不会上传服务器
- 发送记录保留最近 20 条
- 建议使用 HTTPS 访问以保证安全
- 每 10 秒自动刷新可用笔数

## License

MIT
