# About

## Build
- Version: 36337dd-dirty
- Commit: 36337dd (36337dd9ef6d357fc29c5cc3ea902d734d34c514)
- Commit count: 94
- Subject: feat(wiki): 为液体容器生成派生物品并优化表格解析
- Author: AndreaFrederica
- Date: 2026-02-17T06:17:58+08:00
- Generated at: 2026-02-17T12:10:55.115Z
- Remote: https://github.com/AndreaFrederica/jei-web.git

## Version History

### r94 (2026-02-17T06:17:58+08:00)
- 36337dd
  feat(wiki): 为液体容器生成派生物品并优化表格解析
  
  - 新增派生物品生成机制，自动为“已盛装”等关键词的液体容器创建组合物品
  - 扩展转换器上下文，支持物品图标和标签的缓存与传递
  - 改进表格解析逻辑，自动检测表头行并优化行列顺序
  - 调整部分设备配方的规划器优先级，使反应池等关键设备排序更合理
  - 更新物品索引和轻量清单，包含新生成的派生物品条目

### r93 (2026-02-17T04:36:21+08:00)
- d070126
  feat(ui): 添加物品图标缓存及存储管理界面
  
  - 新增 `useCachedImageUrl` 组合函数，通过 IndexedDB 缓存远程图标并生成 Blob URL
  - 扩展 IndexedDB 工具函数，支持图标缓存的增删改查及存储空间管理
  - 在存储编辑器页面新增“物品图标缓存”和“IndexedDB”标签页
    - 图标缓存页支持预览、搜索、清理及单个删除
    - IndexedDB 页以树形结构展示所有存储空间及条目，支持按键名搜索和清理操作
  - 优化 StackView 组件，对图标 URL 应用缓存机制以提升加载性能并减少网络请求

### r92 (2026-02-17T03:44:03+08:00)
- 3c6276c
  feat(wiki): 为图片添加点击查看功能并更新界面文本
  
  - 在资料查看器中支持点击图片打开全屏查看器
  - 将"合成查看器"重命名为"资料查看器"以更准确反映功能
  - 更新相关界面文本和注释，保持中英文一致性
  - 图片查看功能覆盖wiki组件中的图片、图标和描述中的图片

### r91 (2026-02-17T01:34:27+08:00)
- 0f4e6e4
  fix(circuit-puzzle): 修复页面高度和滚动区域布局问题
  
  - 动态计算页面可用高度，减去顶部导航栏高度
  - 为列表和详情区域添加独立的滚动容器，避免整体页面滚动
  - 优化CSS布局，使用flex布局确保内容区域正确伸缩

### r90 (2026-02-17T01:01:36+08:00)
- 8de1157
  Merge branch 'master' of https://github.com/AndreaFrederica/jei-web

### r89 (2026-02-17T01:01:30+08:00)
- f383104
  chore: 更新图标文件 icon.af

### r88 (2026-02-17T01:00:47+08:00)
- c9ca316
  feat(circuit-puzzle): 重构方块面板并添加收藏功能
  
  - 将方块面板 UI 逻辑提取为独立组件 CircuitPuzzlePiecePanel
  - 新增收藏功能，支持保存、导入和移除常用方块
  - 添加面板垂直分栏布局，支持拖拽调整比例
  - 提取编辑器工具函数至独立模块 editor-utils
  - 在设置存储中增加面板分栏比例持久化支持

### r87 (2026-02-17T00:56:37+08:00)
- fbbb3ee
  Merge pull request #3 from figreojgihgj/master
  
  添加镜像

### r86 (2026-02-16T23:40:06+08:00)
- 626040c
  Delete .github directory

### r85 (2026-02-16T23:39:56+08:00)
- ac8f513
  Delete sync-fork.yml

### r84 (2026-02-16T22:54:32+08:00)
- 3cd04c6
  fix: 移除predev脚本中的sync:temp命令以简化开发流程

### r83 (2026-02-16T15:34:17+08:00)
- fc721c5
  修改镜像信息

### r82 (2026-02-16T23:26:49+08:00)
- d855121
  Update main.yml

### r81 (2026-02-16T23:25:50+08:00)
- f17738a
  Delete .github/workflows/sync.yml

### r80 (2026-02-16T23:23:35+08:00)
- d4f3cab
  Create sync.yml

### r79 (2026-02-16T23:20:30+08:00)
- e65178b
  Create main.yml

### r78 (2026-02-16T15:19:20+08:00)
- 57e43bb
  action

### r77 (2026-02-16T23:13:02+08:00)
- 106d8e8
  Merge branch 'AndreaFrederica:master' into master

### r76 (2026-02-16T12:02:40+08:00)
- f3187ed
  添加镜像

### r75 (2026-02-15T22:13:58+08:00)
- 883e47c
  feat: 添加视为原料功能，增强物品管理和生产计数显示
  fix: 修复打开了任意物品后不能切换数据包的bug

### r74 (2026-02-15T20:55:24+08:00)
- dac9769
  feat: 添加aef-skland数据包构建说明文档，更新关于文件以反映最新版本和提交信息，增强wiki条目导航功能

### r73 (2026-02-15T08:25:54+08:00)
- b422a48
  feat: 添加终末地-协议终端链接到主布局和编辑布局
  docs: 更新关于文件以反映最新版本和提交信息
  docs: 添加aef-skland数据源信息到第三方许可证文件

### r72 (2026-02-15T07:57:06+08:00)
- 49c4900
  支持了aef skland wiki 数据包

### r71 (2026-02-15T07:50:33+08:00)
- 6069f98
  feat: implement image proxy support for packs and items
  
  - Added image proxy configuration to PackManifest and ItemDef.
  - Implemented functions to apply image proxy tokens and normalize URLs.
  - Enhanced the loader to cache and manage pack manifests with image proxy support.
  - Introduced new settings in the UI for managing image proxy configurations.
  - Updated validation to include image proxy fields.
  - Refactored planner logic to consider recipe type priorities.
  - Added new utility functions for handling image URLs in runtime.
  - Updated settings store to persist image proxy tokens and configurations.
  - Improved item and recipe sorting based on planner priorities.

### r70 (2026-02-14T00:19:25+08:00)
- 1894c41
  Merge branch 'master' of https://github.com/AndreaFrederica/jei-web

### r69 (2026-02-14T00:18:50+08:00)
- 1349927
  feat: add line width customization based on rate with curve editor
  
  - Introduced a toggle to enable line width adjustment based on production rate.
  - Added a button to open a dialog for editing the line width curve.
  - Implemented a new component for the line width curve editor with controls for unit selection, axis scaling, and point manipulation.
  - Created utility functions for evaluating line width based on production rates and curve configurations.
  - Updated the rendering logic to apply dynamic stroke widths to edges based on the configured curve.

### r68 (2026-02-13T06:17:31+08:00)
- 7870c88
  Fix line breaks in QQGroupDialog.vue

### r67 (2026-02-13T06:13:56+08:00)
- 6324f1b
  Merge pull request #1 from MicIsHere/master
  
  添加镜像信息

### r66 (2026-02-13T06:08:38+08:00)
- 9d6bd31
  Update QQGroupDialog.vue

### r65 (2026-02-13T06:08:16+08:00)
- b7bff46
  Revise QQGroupDialog content for clarity and links
  
  Updated the text for the domestic access mirror and added additional links.

### r64 (2026-02-13T00:25:54+08:00)
- 3858d39
  update: some text.

### r63 (2026-02-13T00:24:25+08:00)
- a8c5884
  update: some text.

### r62 (2026-02-12T08:19:51+08:00)
- 8f93cc8
  feat: implement v3 URL format for multi-level puzzles
  
  - Add encoding and decoding functions for multi-level puzzles in v3 format.
  - Create tests for the new URL format functions to ensure correct encoding/decoding.
  - Update existing URL format functions to support fixed placements in levels.
  - Enhance CircuitPuzzleCollectionPage and CircuitPuzzlePage to handle multi-level puzzles.
  - Introduce UI elements for managing multi-level stages in the editor.
  - Ensure compatibility with previous URL formats while transitioning to v3.

### r61 (2026-02-12T05:28:56+08:00)
- d9fd7ce
  feat: add CircuitPuzzleShapeCanvas component and enhance settings store for circuit editor panel state
  
  - Introduced CircuitPuzzleShapeCanvas.vue for rendering a grid-based puzzle interface with hover and click interactions.
  - Updated settings store to include state management for the circuit editor piece panel, allowing for position, size, and minimized/docked states.

### r60 (2026-02-12T01:09:05+08:00)
- afb0a92
  feat: integrate itemsLite index and lazy loading
  
  - Add `gen:items-lite` script and execute it during `predev` and `prebuild` to generate reduced item indexes.
  - Include `itemsLite.json` for the aef pack containing essential item data.
  - Update `pack/loader.ts` to support loading `itemsLite` from the manifest, marking items as not fully loaded initially.
  - Add `lazyVisual` prop to `RecipeCard` and `ItemSlot` components to support deferred visual rendering.
  - This change improves initial load performance by minimizing the data processed on startup.

### r59 (2026-02-11T23:36:32+08:00)
- 2d6492c
  feat: adjust layout scroll behavior
  
  Introduce `no-scroll` and `debug-scroll` classes to manage viewport overflow and scrolling behavior dynamically. Update MainLayout to enforce full-height flex layout on home/item routes.
  
  Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>

### r58 (2026-02-11T23:17:29+08:00)
- 3b09d7f
  feat: add Vitest testing and CircuitPage component
  
  - Configure Vitest, jsdom, and @vitest/ui for unit testing.
  - Add test scripts (test, test:run, test:ui, test:coverage) to package.json.
  - Implement CircuitPage.vue with play and editor modes, including features for URL sharing and level management.
  - Update .gitignore to exclude public/packs/aef-skland.

### r57 (2026-02-11T14:25:12+08:00)
- b2fe075
  feat: 添加 WikiDocRecipeView 组件以支持文档视图，更新 RecipeViewer 以集成新组件

### r56 (2026-02-10T03:03:49+08:00)
- 3ead8b0
  refactor(wiki): update EntryInline rendering to StackView
  
  Replaces the previous `ImageLoader` and manual DOM structure with the
  shared `StackView` component to standardize how wiki entries are
  displayed.
  
  - Integrates `StackView` for both inline and card display modes.
  - Adapts entry data into `SlotContent` and `ItemDef` formats required by
    `StackView`.
  - Removes anchor tag wrapper from inline view, handling navigation via
    click event.
  - Adds `resolveIconUrl` helper to maintain image proxy configuration.

### r55 (2026-02-10T00:36:13+08:00)
- 5e3a970
  feat: enhance wiki component with structured documentation support and color contrast improvements
  
  - Updated `TextInline.vue` to include dynamic color resolution based on theme and ensure readability against backgrounds.
  - Enhanced `RecipeContentView.vue` to support structured wiki documents, allowing for better organization and display of content.
  - Added new `DARK_COLOR_MAP` to `wiki.ts` for improved color management in dark mode.
  - Modified `validate.ts` to include wiki and recipes fields in item definitions.
  - Updated generated documentation to reflect the latest changes and commit history.

### r54 (2026-02-07T10:10:59+08:00)
- 8dac017
  fix: 修正 README 中图标路径并更新生成的文档

### r53 (2026-02-07T10:04:45+08:00)
- 5506c06
  fix: 修正 README 中图标路径

### r52 (2026-02-07T09:58:53+08:00)
- 8251d10
  feat: 更新 README 和生成的文档，调整样式以改善显示效果

### r51 (2026-02-07T09:49:54+08:00)
- c2956e6
  feat: 添加存储编辑器页面及相关路由

### r50 (2026-02-07T09:36:44+08:00)
- aa6d8c0
  feat: add tutorial manager and integrate with dialog system
  
  - Implemented a new tutorial manager to guide users through the application.
  - Added tutorial steps for various stages including welcome, sidebar, item list, recipe viewer, planner, and advanced planner.
  - Integrated tutorial manager with the dialog manager to handle showing and completing tutorials.
  - Updated QQGroupDialog to manage visibility based on whether it is user-managed or not.
  - Enhanced MainLayout to include a sidebar item for accessing the tutorial.
  - Registered dialogs for both the QQ group and tutorial in the dialog manager, allowing for controlled display based on user interactions and settings.
  - Added functionality to track tutorial completion status in settings store.

### r49 (2026-02-07T07:29:08+08:00)
- 68be2d3
  feat: add QQ Group dialog and enhance item handling
  
  - Introduced QQGroupDialog component for displaying the official QQ group information.
  - Updated EditorLayout and MainLayout to include buttons for showing the QQ group dialog.
  - Enhanced item loading to support both directory and array modes, including the creation of an itemsIndex for directory mode.
  - Extracted inline recipes and wiki data from item definitions for better organization.
  - Updated pack validation to include itemsIndex in the manifest.
  - Improved item merging logic to handle inline recipes and ensure unique items.
  - Added functionality to export items in both directory and array formats.

### r48 (2026-02-04T05:40:10+08:00)
- 515b8c6
  feat: add Wiki Renderer page and related functionality
  
  - Implemented WikiRendererPage.vue for rendering wiki documents with file upload support.
  - Added functionality to load wiki files and catalog files from specified directories.
  - Integrated settings for image proxy usage and catalog file name persistence in settings store.
  - Updated routes to include the new Wiki Renderer page.
  - Enhanced existing pages (AboutPage, LicensePage, ReadmePage, ThirdPartyLicensesPage) to support dark mode styling.
  - Introduced new types for wiki data structures in types/wiki.ts.

### r47 (2026-02-03T12:04:31+08:00)
- 14a59b7
  feat: 添加带速带的物品定义，更新相关组件以支持新功能

### r46 (2026-02-03T11:22:28+08:00)
- 43ee6da
  fix: 格式化启动对话框选项类型定义以提高可读性

### r45 (2026-02-03T11:22:12+08:00)
- 1558538
  feat: 添加收藏夹导航栈选项，更新相关组件以支持新功能

### r44 (2026-02-03T10:55:15+08:00)
- 7925b25
  feat: 添加启动对话框支持，更新设置以管理已接受的对话框

### r43 (2026-02-03T10:22:19+08:00)
- 3fa836e
  fix: 更新过滤器占位符文本以支持正确的格式化

### r42 (2026-02-03T10:17:15+08:00)
- fc02bef
  fix: 修复 BottomBar 组件中的 placeholder 绑定方式

### r41 (2026-02-03T10:11:30+08:00)
- 13d61ef
  feat: 更新 CenterPanel 组件中的标签文本以提高可读性

### r40 (2026-02-03T10:07:21+08:00)
- fcf2bf7
  feat: 添加 Cloudflare 构建脚本以支持更好的构建管理

### r39 (2026-02-03T09:56:51+08:00)
- d59133f
  feat: 更新构建信息，添加原生暗色模式支持，优化页面结构和元数据

### r38 (2026-02-03T09:04:37+08:00)
- 255f0a3
  feat: 添加原生暗色模式支持，优化页面结构和元数据，避免vue启动前的闪烁

### r37 (2026-02-03T09:02:06+08:00)
- d258798
  feat: 优化国际化文件，调整文本格式以提高可读性

### r36 (2026-02-03T09:01:54+08:00)
- 3c7547a
  feat: add language selection and localization support
  
  - Implemented a language selection button in MainLayout.vue with options for Chinese, English, and Japanese.
  - Integrated vue-i18n for localization across various components, including IndexPage.vue, AdvancedPlanner.vue, BottomBar.vue, and others.
  - Updated UI elements to use localized strings for labels, placeholders, and tooltips.
  - Enhanced settings store to detect browser language and allow language preference saving.
  - Refactored components to utilize the new localization setup, ensuring a consistent user experience across different languages.

### r35 (2026-02-03T07:53:10+08:00)
- a2ec007
  feat: 更新文档和界面，增强 CenterPanel 组件，添加保存/加载规划方案功能

### r34 (2026-02-03T07:42:03+08:00)
- c573aa3
  feat: enhance CenterPanel with save-plan event and loadAdvancedPlan method
  
  - Added an event emission for 'save-plan' from the AdvancedPlanner component.
  - Introduced a new method `loadAdvancedPlan` to load saved plans into the advanced planner.
  - Updated CSS styles for better layout management, changing overflow properties for improved usability.

### r33 (2026-02-03T04:08:21+08:00)
- 16160f7
  feat: 增强 AdvancedPlanner 组件，添加节点图视图和计算器视图功能

### r32 (2026-02-03T03:44:56+08:00)
- 6ccaacd
  style: 优化 CenterPanel 组件中的 q-tab-panels 代码格式

### r31 (2026-02-03T03:43:10+08:00)
- 56733bb
  feat: enhance CenterPanel with advanced planner and update context menu
  
  - Added a new tab for the advanced planner in CenterPanel.vue.
  - Refactored the tab structure to include recipe and advanced planner views.
  - Implemented a computed property to dynamically set the title based on the active tab.
  - Integrated the advanced planner component with props for pack and item definitions.
  - Updated ItemContextMenu.vue to include an option for adding items to the advanced planner.
  - Modified event emissions to support the new advanced planner functionality.

### r30 (2026-02-03T02:45:07+08:00)
- decd3e9
  style: 优化流程图中输入输出端口样式的代码格式

### r29 (2026-02-03T02:40:50+08:00)
- 5e01581
  fix: 修复流程图中输入输出端口样式计算逻辑

### r28 (2026-02-03T02:36:33+08:00)
- ebe859d
  feat: add ItemContextMenu, ItemDialog, ItemListPanel, RecipeContentView, and SettingsDialog components
  
  - Implemented ItemContextMenu.vue for context menu actions related to items.
  - Created ItemDialog.vue to display detailed information about selected items with tabs for recipes, uses, wiki, and planner.
  - Developed ItemListPanel.vue to show a list of items with pagination and history tracking.
  - Added RecipeContentView.vue to handle the display of recipes and crafting planner functionalities.
  - Introduced SettingsDialog.vue for user settings, including history limit and debug options.
  - Updated settings store to manage new settings related to recipe view mode and debug panel position.

### r27 (2026-02-02T07:24:22+08:00)
- 3a3d93e
  feat: 添加导航栈调试面板功能
  
  添加可拖动的调试面板，用于实时监控导航栈状态和变化。面板显示当前导航栈长度、对话框状态、栈内项目详情以及导航操作日志。同时改进导航栈逻辑，避免重复重置并支持栈内跳转。

### r26 (2026-02-02T05:55:07+08:00)
- 561abe5
  style: 改进 Vue Flow 控件的深色主题样式
  
  修复 Vue Flow 控件在深色主题下图标不显示的问题。由于控件通过 Portal 渲染到 body 下，原样式选择器无法生效，现添加全局样式选择器并优化按钮图标和 MiniMap 的视觉细节。

### r25 (2026-02-02T04:52:16+08:00)
- edac3fc
  fix(jei): 修复流程图拖拽功能，将pan-on-drag设为true
  
  之前设置为[1, 2]导致在某些情况下无法正常拖拽视图，改为true确保始终启用拖拽平移功能。

### r24 (2026-02-01T03:52:38+08:00)
- 90c57a7
  fix(jei): 修复流程图拖拽和连线层级问题
  
  - 将 pan-on-drag 设置为 [1, 2] 以限制为鼠标中键拖拽，避免与节点交互冲突
  - 为所有 stack-view 添加 nodrag nopan 类，防止在物品图标上误触发拖拽
  - 调整连线 zIndex 为 2000 并改用默认类型，确保连线显示在节点上方
  - 移除冗余的 z-index CSS 规则，统一由 Vue Flow 属性控制层级
  - 增加节点宽度和间距，提升流程图可读性

### r23 (2026-02-01T03:22:06+08:00)
- 9860f25
  fix: 修复上下文菜单关闭后目标未清除的问题
  
  修复在关闭上下文菜单后未清除 contextMenuTarget 导致的下次菜单可能显示异常的问题。通过添加 @hide 事件处理来重置目标变量，确保菜单状态正确。

### r22 (2026-02-01T03:11:51+08:00)
- 3e7b191
  feat(app): 添加收藏夹和面板折叠功能及全屏支持
  
  - 在设置存储中添加收藏夹和面板的折叠状态字段
  - 为主布局添加网页全屏切换按钮，支持顶栏样式适配
  - 为收藏夹和面板区域添加折叠/展开功能，支持鼠标悬停触发按钮
  - 在合成规划器的节点图和生产线视图中添加页面内全屏和元素全屏功能
  - 扩展键盘快捷键，支持使用 T/G/L/C 或 1/2/3/4 快速切换到合成规划器的不同标签页
  - 更新关于页面的构建信息以反映最新提交

### r21 (2026-01-31T05:57:22+08:00)
- ab432e7
  feat(app): 添加文档页面和构建信息生成脚本
  
  - 新增关于、README、许可证和第三方许可证页面，支持内嵌Markdown渲染
  - 添加构建信息生成脚本，自动从Git仓库提取版本历史和提交信息
  - 更新路由配置以支持新的文档页面路径
  - 在主导航和编辑器布局中添加文档页面链接
  - 修改package.json脚本，在开发/构建/安装前自动生成文档文件
  - 将许可证链接从外部GitHub页面改为内部路由

### r20 (2026-01-31T05:33:21+08:00)
- 05774c1
  feat(editor): 添加本地包管理和资源管理器
  
  - 新增本地包管理器，支持保存/加载/删除浏览器中的编辑进度
  - 新增资源管理器页面，支持上传和管理图片资源
  - 为编辑器添加拼音搜索支持，提升中文搜索体验
  - 改进编辑器布局，添加变更对比和批量接受/撤销功能
  - 增强ZIP导出功能，自动包含引用的资源文件

### r19 (2026-01-31T02:46:48+08:00)
- ba5e316
  style: 添加全局滚动条样式以提升视觉一致性
  
  - 为所有元素添加统一的细滚动条，使用半透明灰色
  - 支持 Webkit 浏览器（Chrome、Safari、Edge）的标准样式
  - 添加暗色模式适配，在深色主题下使用浅色滚动条
  - 实现悬停和激活状态的颜色变化增强交互反馈

### r18 (2026-01-31T02:35:59+08:00)
- 1582627
  feat(编辑器): 为配方类型编辑器添加默认值管理功能
  
  - 在编辑界面新增"Defaults"区域，支持添加、编辑和删除默认值
  - 实现默认值键值对的增删改查操作，支持多种数据类型（数字、布尔值、字符串、对象）
  - 添加输入验证和用户提示，防止重复键名
  - 提供JSON解析功能，支持复杂对象的编辑

### r17 (2026-01-31T02:27:44+08:00)
- 10c9805
  feat(editor): 添加 JEI 数据包编辑器
  
  - 新增编辑器布局和页面，支持编辑物品、配方类型、配方和标签
  - 添加 Pinia 存储 (editor.ts) 用于管理编辑状态和持久化
  - 扩展 EssentialLink 组件以支持内部路由
  - 更新配方类型定义，允许 machine 字段为数组
  - 在配方规划器中支持处理机器数组
  - 添加 jszip 依赖用于导出 ZIP 包
  - 在 Quasar 配置中添加 Notify 插件

### r16 (2026-01-30T13:36:04+08:00)
- 14e836b
  feat(ui): 添加移动端适配和上下文菜单支持
  
  - 为移动端添加底部导航栏，支持在收藏、详情和列表间切换
  - 实现右键和长按触发的上下文菜单，提供快速操作选项
  - 优化移动端布局和样式，包括对话框全屏显示和响应式调整
  - 在多个组件中新增 item-context-menu 和 item-touch-hold 事件处理

### r15 (2026-01-30T12:10:52+08:00)
- 9a4d9dd
  feat(router): 为物品页面添加路由支持与URL同步
  
  - 新增路由 `/item/:keyHash/:tab?` 指向 IndexPage，支持通过 URL 直接访问特定物品
  - 在 IndexPage 中集成 vue-router，添加路由状态解析与应用逻辑（applyRouteState）
  - 实现 URL 与页面状态的同步（syncUrl），包括物品、标签和整合包的切换
  - 根据当前物品和整合包动态更新网页标题
  - 调整对话框打开/关闭、导航返回等操作以同步更新 URL

### r14 (2026-01-30T11:24:36+08:00)
- 1c38217
  feat: 添加深色模式支持
  
  - 在设置中新增深色模式选项（自动/亮色/暗色）
  - 在顶部工具栏添加主题切换按钮
  - 为应用全局、历史栏、搜索栏、规划器等组件添加深色样式
  - 根据主题动态调整流程图的背景网格颜色
  - 启用 Quasar 的 Dark 插件以支持主题切换

### r13 (2026-01-30T10:52:22+08:00)
- 2d09dea
  feat(layout): 在主导航中添加博客、Wiki和小说助手链接
  
  添加三个新的导航链接，分别指向博客、Wiki和小说助手子站点，方便用户快速访问相关服务。

### r12 (2026-01-30T10:40:33+08:00)
- 467be18
  docs(layout): 更新主页链接以指向项目相关资源
  
  - 将默认的 Quasar 框架链接替换为项目特定的 GitHub 仓库链接
  - 添加项目许可证 (MPL 2.0) 和第三方许可证的快捷访问链接
  - 移除不再相关的社区和社交媒体链接，使布局更专注于项目自身

### r11 (2026-01-30T10:27:24+08:00)
- 2f80165
  feat(planner): 新增生产线视图并增强循环配方支持
  
  - 添加生产线模型构建器，支持生成机器、物品和流体节点的可视化流程图
  - 在合成规划器中新增“生产线”标签页，展示优化的生产流程布局
  - 增强循环配方支持，添加 cycleKeys、cycleFactor 等字段以精确计算种子需求
  - 添加 wrangler.toml 配置文件，支持 Cloudflare Pages 部署
  - 更新 README 文档，添加项目功能说明、开发指南和第三方许可证信息
  - 添加 MPL-2.0 许可证文件和第三方许可证说明文件

### r10 (2026-01-30T09:22:46+08:00)
- 0bc2cd0
  feat: 添加多包支持并改进配方规划器
  
  - 新增公共包索引文件以支持动态加载多个游戏包
  - 在设置中添加包选择功能并持久化用户偏好
  - 为所有物品视图添加鼠标悬停事件传递
  - 修复配方规划器中非法循环检测逻辑，避免选择导致死循环的配方
  - 添加规划器回归测试确保循环检测正确性
  - 更新应用标题和界面文本
  - 统一Arknight:Endfield的显示名称格式

### r9 (2026-01-30T08:51:20+08:00)
- d6feded
  feat(planner): 新增生产计划器速率计算与机器统计功能
  
  为生产计划器添加完整的速率计算系统，包括：
  - 新增 rational.ts、units.ts、types.ts 实现精确有理数运算和单位转换
  - 扩展生成脚本以包含机器功率、速度等默认属性
  - 增强计划器树状图，显示物品/秒、机器数量、传送带需求和电力消耗
  - 添加表格视图，展示总消耗统计和机器需求汇总
  - 支持按物品、物品/秒、物品/分、物品/时不同单位设定生产目标

### r8 (2026-01-30T06:52:01+08:00)
- 518cfa1
  feat: 添加高级过滤器对话框以支持多条件物品筛选
  
  - 在搜索框旁添加过滤器图标，点击可打开高级过滤器对话框
  - 支持通过物品名称、物品ID、命名空间和标签进行多条件组合筛选
  - 添加动态过滤的选择器，支持输入时实时筛选可用选项
  - 过滤器表单支持清空、取消和应用操作
  - 修改标签匹配逻辑为包含匹配而非完全匹配
  - 移除 normalizeSearchTagId 函数，简化标签搜索逻辑

### r7 (2026-01-30T06:38:23+08:00)
- 5c4847f
  feat: 添加物品维基页面支持Markdown渲染
  
  - 新增“Wiki”标签页，用于显示物品的详细信息
  - 集成markdown-it库解析物品描述为HTML格式
  - 支持快捷键'W'快速打开维基页面
  - 显示物品ID、meta值、描述和标签信息
  - 添加CSS样式确保Markdown内容的美观显示

### r6 (2026-01-30T06:24:50+08:00)
- 53282b0
  feat: 为合成规划器添加自动规划算法和交互式流程图
  
  - 实现 autoPlanSelections 算法，自动选择配方并处理循环依赖
  - 使用 Vue Flow 替换静态 SVG 显示，支持缩放、平移和节点交互
  - 在配方查看器中添加机器图标点击功能，可直接查看机器物品
  - 优化配方分组显示逻辑，在"全部"分组中按类型展示配方
  - 添加 Claude 权限配置和 Vue Flow 类型定义
  - 调整布局样式，移除不必要的滚动限制

### r5 (2026-01-30T05:33:41+08:00)
- 7803296
  feat(planner): 添加配方规划器核心功能与界面
  
  - 新增配方规划器核心逻辑模块 planner.ts，支持构建需求树、检测循环与计算催化剂
  - 新增规划器 UI 类型定义模块 plannerUi.ts，定义状态与保存格式
  - 在物品详情页添加“规划器”标签页，集成 CraftingPlannerView 组件
  - 支持保存/加载规划方案，在侧边栏显示已保存线路列表
  - 更新 AEF 数据生成脚本，将配方分类改为按机器分类，并关联机器物品
  - 更新 ESLint 配置以支持 Vue 单文件组件的 TypeScript 解析

### r4 (2026-01-30T03:59:23+08:00)
- 5318ed3
  feat(ui): 增加配方查看面板模式并优化物品展示
  
  - 在设置中新增配方查看模式（弹窗/面板）和配方槽物品显示名称选项
  - 为 WorldgenRecipeView 和 SlotLayoutRecipeView 组件添加配方槽物品名称显示控制
  - 在 SlotLayoutRecipeView 中添加配方箭头指示器以区分输入输出槽位
  - 扩展 StackView 组件，支持槽位模式布局和详细工具提示信息
  - 修改 IndexPage，支持在面板模式下显示配方查看器，并添加鼠标滚轮翻页功能
  - 更新设置存储结构以持久化新增选项

### r3 (2026-01-30T03:40:25+08:00)
- 81e7397
  feat: 新增 AEF 游戏数据包并优化界面布局
  
  - 新增 Arknights: Endfield (AEF) 游戏数据包，包含完整的物品、配方、标签和图标资源
  - 为 ItemDef 类型添加 iconSprite 字段以支持雪碧图形式的图标显示
  - 在 StackView 组件中实现 iconSprite 的渲染支持
  - 添加设置存储 (settings store) 以管理历史记录限制和调试布局开关
  - 重构主页面布局，实现自适应分页和可调试的滚动区域
  - 优化 SlotLayoutRecipeView 的网格列宽和水平滚动
  - 添加数据包切换、设置对话框和搜索语法支持（@itemid/@gameid/@tag）
  - 新增脚本用于从外部数据源生成 AEF 数据包

### r2 (2026-01-30T01:29:42+08:00)
- 817b2d6
  feat(jei): 实现完整的 JEI 配方查看界面和索引系统
  
  - 添加 JEI 核心类型定义（ItemDef、Recipe、RecipeTypeDef 等）
  - 实现数据包加载器，支持从 JSON 文件加载物品、配方类型和配方
  - 创建索引系统，支持按物品查找生产和消耗配方
  - 添加完整的 Vue 组件：配方查看器、槽位布局视图、世界生成视图、参数视图、物品堆栈视图
  - 实现主页面，包含收藏夹、物品列表、历史记录和配方对话框
  - 添加键盘快捷键支持（A 收藏、R 查看配方、U 查看用途、Esc 关闭、Backspace 返回）
  - 添加演示数据包，包含铁矿石、铁锭、铁镐等示例物品和配方
  - 更新 .gitignore 和 VS Code 设置

### r1 (2026-01-30T00:00:09+08:00)
- ddc66bd
  Initialize the project 🚀
