# EneriCdl 网站维护说明

## 权限模型
- 线上不再提供公开后台页面。
- 文章发布权限只由 GitHub 仓库写权限控制。
- 只有你（或你授权的协作者）可以修改 `articles.json` 并推送到 `main`。

## 发布文章（本机）
1. 编辑 `articles.json`。
2. 在项目目录执行：
   ```powershell
   .\publish-articles.ps1
   ```
3. 等 1-2 分钟后访问 `https://enericdl.github.io` 查看更新。

## 文章格式
```json
[
  {
    "id": "a1",
    "title": "文章标题",
    "summary": "摘要",
    "content": "正文",
    "tags": ["标签1", "标签2"],
    "status": "published",
    "updatedAt": "2026-03-24"
  }
]
```

- `status` 为 `published` 才会在首页显示。
- `updatedAt` 建议使用 `YYYY-MM-DD`。
