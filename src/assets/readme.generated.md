# JEI-web

Just Enough Items but Running in web - 一个基于 Web 的物品查看和合成规划工具。

## 功能特性

- **物品浏览** - 查看游戏中所有物品的详细信息
- **配方查询** - 查看物品的合成配方和用途
- **物品收藏** - 收藏常用物品，快速访问
- **高级过滤** - 支持按名称、物品 ID、命名空间、标签等多条件筛选
- **合成规划器** - 自动计算合成所需的材料和速率
- **可视化流程图** - 使用 Vue Flow 展示合成流程图
- **Wiki 支持** - 支持 Markdown 格式的物品描述
- **多 Pack 支持** - 动态加载和管理多个数据包
- **历史记录** - 自动记录浏览历史
- **响应式布局** - 支持弹窗和面板两种显示模式

## 技术栈

- **框架**: [Quasar Framework](https://quasar.dev/) (Vue 3)
- **状态管理**: [Pinia](https://pinia.vuejs.org/)
- **路由**: [Vue Router](https://router.vuejs.org/)
- **流程图**: [Vue Flow](https://vueflow.dev/)
- **Markdown**: [markdown-it](https://github.com/markdown-it/markdown-it)
- **构建工具**: Vite
- **语言**: TypeScript

## 开发

### 安装依赖

```bash
pnpm install
# 或
npm install
```

### 启动开发服务器

```bash
pnpm dev
# 或
npm run dev
```

### 构建生产版本

```bash
pnpm build
# 或
npm run build
```

### 代码检查

```bash
pnpm lint
# 或
npm run lint
```

### 代码格式化

```bash
pnpm format
# 或
npm run format
```

## 添加新的数据包

1. 在 `public/packs/` 目录下创建新的数据包文件夹
2. 添加必要的数据文件：
   - `manifest.json` - 数据包清单
   - `items.json` - 物品数据
   - `recipes.json` - 配方数据
   - `recipeTypes.json` - 配方类型
   - `tags.json` - 标签数据（可选）
   - `assets/` - 静态资源（可选，例如图片、图标）
3. 更新 `public/packs/index.json`，添加新数据包的条目：

```json
{
  "packs": [
    {
      "packId": "your-pack-id",
      "label": "Your Pack Name"
    }
  ]
}
```

## 编辑器：静态资源与导出

### 添加图片资源

1. 打开编辑器：`/editor`
2. 进入 **Assets** 页面：`/editor/assets`
3. 点击 **Add Images** 选择图片文件（png/webp/jpg/svg 等）
4. 在列表里复制资源路径，然后在物品/配方类型里引用：
   - 推荐路径形式：`/packs/<packId>/assets/<filename>`
   - 导出 ZIP 时会把 `assets/<filename>` 一并打包

### 导出格式

- **Export JSON**：导出一个大 JSON（便于分享/备份）
- **Export ZIP**：导出与 `public/packs/<packId>/` 一致的目录结构：
  - `manifest.json`
  - `items.json` / `tags.json` / `recipeTypes.json` / `recipes.json`
  - `assets/*`（如有）

## 数据格式

### manifest.json

```json
{
  "packId": "example",
  "gameId": "example",
  "displayName": "Example Pack",
  "version": "1.0.0",
  "files": {
    "items": "items.json",
    "tags": "tags.json",
    "recipeTypes": "recipeTypes.json",
    "recipes": "recipes.json"
  }
}
```

## 提交 PR（贡献指南）

1. Fork 本仓库到你的账号
2. 新建分支：`git checkout -b feat/<something>`
3. 用编辑器完成修改，并用 **Export ZIP** 导出
4. 解压 ZIP，把内容放到 `public/packs/<packId>/`（新 pack 就新建目录；已有 pack 就覆盖对应文件）
5. 如新增 pack，更新 `public/packs/index.json` 增加条目
6. 本地验证：
   - `pnpm lint`
   - `pnpm dev`（可选）
7. Push 分支并在 GitHub 创建 Pull Request，说明改动内容与截图/示例

## 键盘快捷键

- `R` - 查看配方 (Recipes)
- `U` - 查看用途 (Uses)
- `W` - 查看 Wiki
- `P` - 打开规划器 (Planner)
- `A` - 收藏/取消收藏物品
- `Backspace` - 返回上一级
- `Esc` - 关闭对话框
- `鼠标滚轮` - 翻页

## 数据来源

本项目使用了以下第三方数据源和工具：

### factoriolab-zmd

**项目地址:** https://github.com/Bakingss/factoriolab-zmd

**许可证:** MIT License

**说明:** 本项目的数据生成工具和数据结构设计受到了 factoriolab-zmd 项目的启发。Arknights:Endfield 数据包使用了基于 factoriolab-zmd 的工具生成。

### Arknights:Endfield 数据

**游戏开发商:** Hypergryph

**数据包位置:** `public/packs/aef/`

**说明:** Arknights:Endfield 数据包包含从游戏中提取的物品、配方和机器数据，仅供信息参考使用。

## 许可证

本项目采用 Mozilla Public License 2.0 开源协议，详见 [LICENSE](LICENSE) 文件。

本项目使用的第三方组件和数据遵循各自的许可证，详见 [THIRD-PARTY_LICENSES.md](THIRD-PARTY_LICENSES.md) 文件。

## 作者

AndreaFrederica <andreafrederica@outlook.com>
