# 部署到 Cloudflare Pages 指南

## 方式一：通过 Wrangler CLI 部署（最快）

### 1. 安装 Wrangler（如果还没安装）
```bash
npm install -g wrangler
```

### 2. 登录 Cloudflare
```bash
wrangler login
```
这会打开浏览器让你授权。

### 3. 部署项目
```bash
cd /Users/acx/web/能量后结/energy-sender
npm run build
npx wrangler pages deploy dist --project-name=energy-sender
```

部署完成后，你会得到一个类似 `https://energy-sender.pages.dev` 的访问地址。

---

## 方式二：通过 Cloudflare Dashboard 直接上传

### 1. 构建项目
```bash
cd /Users/acx/web/能量后结/energy-sender
npm run build
```

### 2. 上传到 Cloudflare
1. 访问 https://dash.cloudflare.com/
2. 进入 "Workers & Pages"
3. 点击 "Create application"
4. 选择 "Pages" → "Upload assets"
5. 输入项目名称：`energy-sender`
6. 拖拽 `dist` 文件夹到上传区域
7. 点击 "Deploy site"

---

## 方式三：通过 Git 部署（推荐用于持续集成）

### 1. 创建 GitHub 仓库
在 GitHub 上创建一个新仓库，例如 `energy-sender`

### 2. 推送代码
```bash
cd /Users/acx/web/能量后结/energy-sender
git remote add origin https://github.com/你的用户名/energy-sender.git
git branch -M main
git push -u origin main
```

### 3. 在 Cloudflare Pages 中连接仓库
1. 访问 https://dash.cloudflare.com/
2. 进入 "Workers & Pages"
3. 点击 "Create application"
4. 选择 "Pages" → "Connect to Git"
5. 授权并选择你的仓库
6. 配置构建设置：
   - **Framework preset**: Vue
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Node version**: 18 或更高
7. 点击 "Save and Deploy"

每次推送代码到 main 分支，Cloudflare 都会自动重新部署。

---

## 自定义域名（可选）

部署成功后，你可以在 Cloudflare Pages 设置中添加自定义域名：

1. 进入项目设置
2. 选择 "Custom domains"
3. 添加你的域名
4. 根据提示配置 DNS 记录

---

## 部署后测试

1. 访问部署后的网址
2. 输入你的 API Key
3. 测试查询余额功能
4. 测试发送能量功能
5. 检查响应式布局（手机端）

---

## 常见问题

### Q: 部署后页面空白？
A: 检查浏览器控制台是否有错误，可能是 CORS 问题。

### Q: API 调用失败？
A: 确认 API 地址是否正确，检查网络连接。

### Q: 如何更新已部署的版本？
A: 
- 直接上传：重新 build 并上传 dist 文件夹
- Git 部署：提交代码并推送，会自动触发部署
- Wrangler CLI：重新运行 `wrangler pages deploy dist`

---

## 构建输出位置

构建后的文件在 `dist` 目录下：
```
dist/
├── assets/
│   ├── index-*.css
│   └── index-*.js
└── index.html
```

这就是需要部署到 Cloudflare Pages 的内容。
