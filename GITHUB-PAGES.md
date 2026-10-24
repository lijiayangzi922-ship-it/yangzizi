# GitHub Pages 发布

1. 在 GitHub 创建名为 `linecloset` 的 Public 仓库，默认分支为 `main`。
2. 将此工程中的全部文件（包括 `.github/workflows/pages.yml`）提交到仓库根目录。
3. 进入仓库 Settings → Pages，将 Source 设为 GitHub Actions。
4. 进入 Actions，运行 Publish LineCloset，等待 deploy 成功。
5. 成功后访问 https://lijiayangzi922-ship-it.github.io/yangzizi/ 。此地址在部署成功前不可用。

本工作流只发布 www/ 里的静态网站；不发布 Python AI 服务。默认照片处理在本地完成。可选 AI 描边须另行部署服务，再于应用内配置 HTTPS 地址。

衣物与搭配保存在访问者自己的浏览器中，建议定期在“我的”导出备份。
