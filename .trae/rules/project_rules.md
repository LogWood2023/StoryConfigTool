# 项目规则 - 剧情配置工具

## Skill: 任务一览工作流

当需要新增或修改"XX一览"功能时，参考以下标准工作流模式。

### 标准工作流

```
打开入口 → 加载数据 → 浏览列表 → 选择条目 → 编辑字段 → 保存暂存 → 导出文件
```

### 步骤说明

1. **打开入口**：通过 `onRefClick(table, id)` 或右侧一览入口栏按钮触发，调用 `openXXModal(id)`
2. **加载数据**：并行请求列表API + 选项API，缓存到全局变量避免重复请求
3. **浏览与搜索**：左侧列表（ID + 名字），搜索框过滤，点击切换详情
4. **编辑字段**：由 `renderXXDetail(d)` 渲染，修改记录到 `editData.changes`
5. **保存暂存**：合并到 `pendingChanges[Table_原始ID]`，记录撤回栈
6. **撤回**：`Ctrl+Z` 恢复上一步状态
7. **导出**：`POST /api/export` 写入 `app/导出文件/YYYYMMDD_HHMMSS/`

### 6种输入控件类型

新增一览时，详情编辑区的字段应使用以下标准控件：

| # | 种类 | 控件形式 | 适用场景 | 关键属性 |
|---|------|---------|---------|---------|
| 1 | 纯文本输入 | `<input class="task-editable">` | ID、名字、描述等文本 | `data-field`, `onchange="taskFieldChanged(this)"` |
| 2 | 数字输入 | `<input class="task-editable" type="number">` | 数量、权重、倒计时等数值 | 同上 |
| 3 | 下拉选择 | `<select class="task-select">` | 枚举类型、布尔值 | `data-field`, `onchange` |
| 4 | 引用ID输入 | `editableRef(table, id, name, dataField)` | 关联其他表的ID | `onblur="onRefIdChange(this)"`, 自动查询名称 |
| 5 | 复合列表 | 专用渲染函数 | 条件列表、触发器、奖励等 | 增删条目 + 子字段编辑 |
| 6 | 追踪点 | `renderTrackField(track, fieldName)` | MapEvent关联 + 坐标 | 引用ID + 坐标显示 |

### 公共行为约定

- 所有输入控件绑定 `onfocus="showMirrorPanel(this)"` 和 `onblur="hideMirrorPanel(event)"`
- 值变化通过 `taskFieldChanged(this)` 记录到 `editData.changes`
- 引用ID变化通过 `onRefIdChange(this)` 处理，调用 `/api/lookup-name` 查询名称
- 复合列表支持 `addFieldEntry(fieldName)` 新增和 `removeFieldEntry(fieldName, idx)` 删除

### 新增一览的标准步骤

1. 在 `server.py` 中添加 `/api/xx-list` 和 `/api/xx/{id}` 接口
2. 在 `index.html` 中添加模态窗口 HTML（参考 taskModal 结构）
3. 实现 `openXXModal(id)`、`renderXXList()`、`loadXXDetail(id)`、`renderXXDetail(d)`
4. 实现 `saveXXChanges()` 保存逻辑
5. 在 `onRefClick` 中添加对应 table 的分支
6. 在 `OVERVIEW_TABLES` 数组中添加入口按钮
7. 在 `openOverview` 中添加对应 table 的分支

### 关联文档

详细字段列表见：`配置说明/任务一览工作流.md`

## 项目约定

- 后端：Python FastAPI + Pandas + openpyxl
- 前端：纯 HTML/CSS/JS 单文件，无框架
- 导出目录：`app/导出文件/YYYYMMDD_HHMMSS/`
- 文件夹路径持久化：`app/.last_folder`
- lint/typecheck：无（纯 HTML + Python，用 `python -c "import ast; ast.parse(...)"` 验证语法）
