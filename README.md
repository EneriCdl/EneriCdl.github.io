# EneriCdl 网站维护说明

## 权限模型
- 线上不提供后台发布入口。
- 文章发布权限由 GitHub 仓库写权限控制。
- 只有你（或你授权的协作者）可以发布。

## 最简单发文方式（推荐）
在项目目录执行：

```powershell
.\new-article.ps1
```

按提示输入：标题、摘要、正文、标签、封面图、日期、状态。
- 正文支持多行输入，输入 `END` 单独一行结束。
- 最后可选是否立即发布。

## 手动发布（如果你只改了 articles.json）
```powershell
.\publish-articles.ps1
```

## 文章字段说明
- `id`: 文章唯一标识
- `title`: 标题
- `summary`: 摘要（首页显示）
- `content`: 正文（详情页显示）
- `cover`: 封面图 URL
- `tags`: 标签数组
- `status`: `published` 或 `draft`
- `updatedAt`: 日期（YYYY-MM-DD）

## 访问地址
- 首页：`https://enericdl.github.io`
- 文章详情：`https://enericdl.github.io/article.html?id=<文章id>`

## 隐藏管理通道（网页内）
- 首页直接输入按键序列：`d` `s` `x` `x`
- 会跳转到：`/lab-705.html`
- 输入管理密码：`dsxx705xzh`
- 可在页面内直接新建、编辑、删除并发布文章
- 也可直接修改首页文案（作品卡片、关于我、学习总线）并一键发布
