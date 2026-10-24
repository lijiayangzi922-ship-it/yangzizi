# LineCloset 线橱 · 1.1 手帐贴纸版

藏一线衣橱，搭万般欢喜。

按《衣橱.docx》的功能清单实现的跨平台衣橱 App。前端无需安装依赖即可运行；包含完整 Android、iOS Capacitor 工程，以及可选 Python AI 描边服务。

## 先体验

Windows 双击 **打开预览.cmd**，保持启动窗口开启，浏览器访问 **http://localhost:4175**。

也可以在此目录运行：

```sh
node preview.mjs
```

需要 Node.js 22 或更新版本。此启动器也兼容当前 Codex 自带的 Node。

首次打开是空衣橱；进入「衣橱」，点「放入四件体验衣物」即可试用搭配。体验衣物是明确标注的线稿示例，不是照片的 AI 处理结果。

## 已实现

- 首页：添加衣物、开始搭配、最近搭配。
- 拍照 / 相册导入；浏览器文件选择与原生 Camera 插件分别实现。
- 单件衣物线稿录入、三档粗细、三种颜色、补画、橡皮擦、撤销笔画。
- 上衣 / 裤子 / 外套 / 鞋子；季节、颜色、风格、材质标签；分类筛选、编辑、归档、删除。
- 固定男 / 女人体底板、关闭底板、三种画布底色。
- 独立衣物图层、单指拖动、双指缩放旋转、滑杆精确调整、上下移动、移除、外套自动置顶。
- 最多 50 步画布撤销；清空可撤销。
- 搭配命名、备注、收藏、穿搭日期、再次编辑、删除。
- IndexedDB 本地存储；画布 / 录入草稿自动保存；删除衣物不破坏已保存搭配。
- JSON 备份导出和合并导入；原生端通过系统分享保存备份。
- 默认描边、默认底板、换季收纳箱、帮助。
- 白色界面、无广告、无任务、无推送；原创线稿和衣架图标。

衣物数据只保存在当前设备 / 浏览器来源，localhost 和 127.0.0.1 是两个不同的存储空间。卸载 App、清除站点数据或浏览器回收存储均可能清除记录，请定期导出备份。

## AI 描边

两种处理方式在界面内明确区分：

1. **本地轮廓**：浏览器内完成。边界连通背景分割、最大主体去噪、轮廓矢量化，适合单件衣物的纯色背景照片。不会上传图片，也不是 AI 语义识别。领口等结构线可手动补画。
2. **AI 描边**：`server/app.py` 使用 rembg / U²-Net 去背景，OpenCV 保留最大主体、降噪、提取外轮廓和长结构候选线，返回可编辑 SVG。照片只在服务端内存中处理，不写入文件。

这是一条真实的模型处理管线，但“所有背景必定抠除、只保留领口袖口、完全消除褶皱”不是当前版本可以保证的效果。复杂纹理、遮挡、同色背景可能需要橡皮擦和补画；没有接入生成式线稿模型或进行服装结构专用训练。

### 启动服务

推荐 Python 3.11 / 3.12：

```sh
cd server
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS / Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 8000
```

在 App「我的 → AI 服务」填写服务地址。电脑浏览器本地测试可填 `http://localhost:8000`，健康检查为 `/health`。首次推理会下载 U²-Net 权重，之后可使用已缓存权重离线推理；下载失败时前端会保留原照片并提示错误。

也可用 Docker：

```sh
docker build -t linecloset-ai server
docker run --rm -p 8000:8000 -v linecloset-models:/models linecloset-ai
```

手机使用有效 HTTPS 地址。原生 App 默认不开放明文网络；电脑 `localhost` 在手机上指向手机自己。通过 `ALLOWED_ORIGINS` 配置允许的前端来源，多个来源用逗号分隔。默认允许本地预览和 Capacitor 原生来源。

服务以个人自用为目标，尚未提供公共多用户鉴权、计费或排队。若需公开托管，应在前端加入登录并为 API 配置鉴权和限流。

## 构建手机安装包

工程已生成：`android/` 与 `ios/`。依赖版本由 `package-lock.json` 锁定。

```sh
npm ci
npx cap sync
```

Android：安装 Android Studio、JDK 21 和对应 Android SDK，然后：

```sh
npx cap open android
# 或在 android 目录：
# Windows: gradlew.bat assembleDebug
# macOS / Linux: ./gradlew assembleDebug
```

iOS：需要 macOS、Xcode 和 CocoaPods，在 Mac 上执行：

```sh
npm ci
npx cap sync ios
npx cap open ios
```

在 Xcode 选择自己的签名团队后运行。相机 / 相册使用说明、白色启动页和图标已配置。提交商店前仍需真实设备测试、隐私声明、签名和发布配置。本交付不包含 APK / IPA。

修改 `www/` 后务必运行 `npx cap sync` 将前端同步到原生工程。

## 目录

```text
www/                 可独立运行的前端，不依赖外部 CDN
  app.js             页面、交互、原生能力接入
  model.js           数据模型、存储、图层和筛选
  art.js             原创 SVG、人体底板、安全渲染
  processing.js      本地轮廓、AI 请求与取消
  style.css          手机 / 桌面响应式界面
android/             Android Studio 工程
ios/                 Xcode 工程
server/              Python AI 服务及 Dockerfile
tests/               模型逻辑测试
preview.mjs          无依赖预览服务器
```

运行逻辑测试：`node --test tests/*.test.mjs`。

实现参考：[Capacitor 官方工作流](https://capacitorjs.com/docs/getting-started)、[rembg 官方说明](https://github.com/danielgatis/rembg)。


## 1.1 贴纸版更新

- 奶油白、蜂蜜黄、鼠尾草绿的手帐界面；本地打包站酷快乐体（OFL），可在“我的”切换为清爽字体。
- 首页直接拍照；拍照/选图后自动生成照片贴纸，保留颜色、加白边，可切换无边、原图或线稿，支持透明 PNG 导出。
- 网页和 Android 使用本地纯色背景分割，不能保证复杂背景或相近颜色的准确抠图；可保留原图。照片默认不上传。
- iOS 17+ 增加 Vision 系统端侧前景分割接入代码。此 Windows 环境未编译或真机测试 iOS，需 Mac/Xcode 签名、安装并验证；当前工程包不是可安装 IPA。低于 iOS 17 会提示保留原图。
- 所有原有衣橱、画布和搭配集数据兼容；照片贴纸随备份保存。

字体许可见 www/fonts/OFL.txt，Capacitor 许可见 www/vendor/Capacitor-LICENSE.txt。


## 1.2 小衣橱绘本 · 2026-10-24
参考用户提供的纸张、涂鸦、绘本配色，统一首页、衣橱、编辑器、搭配与设置的视觉。新增原创 SVG 小屋花园插画、纸纹、灰绿与雾蓝配色、纸条留言；保留字体切换、拍照贴纸和原有数据。此次为视觉更新，iOS 安装与抠图真机验证限制不变。
