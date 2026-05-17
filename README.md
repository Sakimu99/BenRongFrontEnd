## 开发

```bash
# 克隆项目
git clone https://gitee.com/y_project/RuoYi-Vue

# 进入项目目录
cd ruoyi-ui

# 安装依赖
npm install

# 建议不要直接使用 cnpm 安装依赖，会有各种诡异的 bug。可以通过如下操作解决 npm 下载速度慢的问题
npm install --registry=https://registry.npmmirror.com

# 启动服务
npm run dev
```

浏览器访问 http://localhost:80

## DouBao 工作台联调说明

当前仓库已接入 DouBao 工作台页面，相关核心代码位于 `src/views/doubao/index.vue`。

推荐本地联调拓扑：
- 若依前端：`http://localhost:81`
- 若依后端：`http://localhost:8080`
- DouBaoDex 服务：`http://localhost:18081`

本地开发建议使用：

```bash
npm run dev -- --port 81
```

当前 `vue.config.js` 已同时代理两组后端：
- `VUE_APP_BASE_API` -> 若依后端 `http://localhost:8080`
- `VUE_APP_DOUBAO_API` -> DouBaoDex `http://localhost:18081`

当前已接通的 DouBao 工作台能力：
- 服务状态与轮询观测摘要展示
- 账号新增、登录态检查、额度刷新
- 账号验证开始/恢复
- 图片多参考图上传与提交
- 视频基底图上传与提交
- 任务列表、资产查看、结果下载

其中上传请求通过 `FormData` 直传 DouBaoDex，前端会自动移除错误的 `Content-Type` 头，避免被服务端识别成 JSON 请求。

## 发布

```bash
# 构建测试环境
npm run build:stage

# 构建生产环境
npm run build:prod
```