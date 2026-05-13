# 剧情配置工具项目文档

## 项目概述

剧情配置工具是一个基于 React + TypeScript + Vite 的可视化剧情管理系统，支持通过流程图方式展示剧情结构，并提供剧情编辑和触发方式分析功能。

## 技术栈

- **前端框架**: React 18.3
- **类型系统**: TypeScript 5.6
- **构建工具**: Vite 6.0
- **状态管理**: Zustand 5.0
- **流程图**: ReactFlow (@xyflow/react) 12.6
- **UI组件**: Ant Design 5.24
- **Excel处理**: xlsx 0.18
- **布局算法**: @dagrejs/dagre 1.1

## 项目结构

```
剧情配置工具/
├── src/
│   ├── components/          # React组件
│   │   ├── StoryFlow.tsx    # 主流程图组件
│   │   ├── StoryNode.tsx    # 帧节点组件
│   │   ├── StoryGroupNode.tsx  # 段落组节点组件
│   │   ├── StoryOptionNode.tsx # 选项节点组件
│   │   ├── StoryStageNode.tsx  # 阶段节点组件
│   │   ├── StoryTriggerNode.tsx # 触发方式节点组件
│   │   ├── FrameEditor.tsx  # 帧编辑器
│   │   └── GroupEditor.tsx  # 剧情组编辑器
│   ├── store/
│   │   └── useStoryStore.ts # Zustand状态管理
│   ├── utils/
│   │   └── excelParser.ts   # Excel解析和数据处理
│   ├── types/
│   │   └── index.ts         # TypeScript类型定义
│   ├── App.tsx              # 主应用组件
│   └── main.tsx             # 应用入口
├── package.json
└── vite.config.ts
```

## 核心功能模块

### 1. 数据模型和类型系统

#### 主要数据类型

- **StoryFrame**: 剧情帧，包含文本、背景、行为、自动跳转等信息
- **StoryGroup**: 剧情组，包含组名、触发条件、自增条件、备注等
- **StoryBehavior**: 剧情行为，定义选项和跳转逻辑
- **NpcEntry**: NPC信息，包含NPC名称、故事、功能、文本、对话条件等
- **TownEntry**: 城镇信息，包含城镇名称、NPC引用、酒馆、客栈、铁匠铺、布坊、丹符铺等NPC引用
- **GuildEntry**: 宗门信息
- **TaskEntry**: 任务信息
- **MapEventEntry**: 地图事件信息
- **TriggerSourceInfo**: 触发源信息，包含触发类型、源ID、源名称、详情

#### 触发类型枚举

```typescript
type TriggerType = 
  | 'npc'        // NPC对话触发
  | 'town'       // 城镇进入触发
  | 'guild'      // 宗门进入触发
  | 'task'       // 任务相关触发
  | 'mapEvent'   // 地图事件触发
  | 'condition'  // 条件触发
  | 'chain'      // 剧情连锁触发
  | 'behavior'   // 选项行为触发
  | 'random'     // 随机触发
  | 'init'       // 游戏初始化触发
  | 'pub'        // 酒馆NPC触发
  | 'hotel'      // 客栈NPC触发
  | 'smithy'     // 铁匠铺NPC触发
  | 'clothes'    // 布坊NPC触发
  | 'danfu'      // 丹符铺NPC触发
  | 'default'    // 默认（无触发）
```

### 2. 状态管理 (useStoryStore)

Zustand 状态库管理的全局状态包括：

#### 核心数据
- `data`: 所有剧情数据（帧、组、行为、NPC、城镇、宗门、任务、地图事件）
- `lookup`: 查找表，包含各种ID到对象的映射和触发源映射

#### 选择状态
- `selectedFrameId`: 当前选中的帧ID
- `selectedGroupId`: 当前选中的组ID
- `selectedParagraphIdx`: 当前选中的段落索引
- `selectedOptionBehaviorId`: 当前选中的选项行为ID
- `selectedTriggerGroupId`: 当前选中的触发组ID（用于显示触发详情）

#### 视图控制
- `visibleGroups`: 可见组集合
- `groupSearch`: 组搜索关键词
- `loadedFiles`: 已加载的配置文件名
- `draftFiles`: 已加载的新剧情文件名

#### 历史记录
- `undo()`, `redo()`: 撤销/重做功能
- `canUndo`, `canRedo`: 历史记录可用状态

#### 加载功能
- `loadFromFolder()`: 从文件夹加载配置文件
- `loadDraftFromFolder()`: 加载新剧情文件
- `loadFiles()`: 核心加载函数，解析Excel文件

### 3. Excel解析器 (excelParser.ts)

#### 解析功能
- `parseStoryText()`: 解析范例文本格式到剧情数据
- `parseNpcFullTable()`: 解析NPC表
- `parseTownTable()`: 解析城镇表（包含酒馆、客栈、铁匠铺等NPC引用）
- `parseGuildTable()`: 解析宗门表
- `parseTaskTable()`: 解析任务表
- `parseMapEventTable()`: 解析地图事件表
- `parseConditionTable()`: 解析条件表
- `parseStageTable()`: 解析阶段表

#### 核心分析函数
- `analyzeTriggerSources()`: 分析剧情组的所有触发源
  - 从NPC表分析NPC对话触发
  - 从城镇表分析城镇进入和商铺NPC触发
  - 从宗门表分析宗门进入和面板触发
  - 从任务表分析任务领取、完成、失败触发
  - 从地图事件表分析事件触发
  - 从剧情组自身分析条件触发和连锁触发
  - 硬编码处理游戏初始剧情（组2001）的触发显示

- `buildLookup()`: 构建数据查找表，包含触发源映射 `groupIdToTriggers`

### 4. 流程图转换 (flowConverter.ts)

#### 节点生成
- `paragraphsToNodes()`: 将剧情分组转换为流程图节点
  - 为每个组生成触发方式节点
  - 为每个段落生成段落节点
  - 为选项生成选项节点
  - 为阶段生成阶段节点

- `framesToNodes()`: 将帧转换为详细流程图节点

#### 边生成
- `paragraphsToEdges()`: 生成节点间的连接关系
  - 触发方式节点 → 段落节点的连接
  - 段落 → 选项 → 目标组的连接
  - 自动跳转连接
  - 段落内顺序连接

- `framesToEdges()`: 帧级别的边连接

#### 辅助功能
- `splitFramesIntoParagraphs()`: 将帧按行为和末帧分割为段落
- `getTriggerIcon()`: 根据触发类型获取对应的图标
- `getTriggerColor()`: 根据触发类型获取对应的颜色
- `resolveNpcDisplay()`: 解析NPC显示信息
- `analyzeTriggerMethod()`: 分析单个剧情组的触发方式

### 5. 组件系统

#### StoryFlow.tsx
- 双视图模式：组视图 / 帧视图
- 节点点击选择：触发节点、段落节点、选项节点
- 双击展开段落查看详细帧
- 历史记录支持（Ctrl+Z / Ctrl+Y）
- 迷你地图、缩放控制

#### StoryTriggerNode.tsx
- 显示触发方式图标
- 显示触发类型和摘要信息
- 支持多种触发类型的视觉区分

#### GroupEditor.tsx
- 显示选中剧情组的详细信息
- 显示TriggerCondition（触发条件）：解析条件ID，显示条件名称
- 显示SelfAddCondition（自增条件）：显示完成后增加的条件
- 显示所有触发方式列表
- 显示备注信息

#### FrameEditor.tsx
- 编辑单帧的详细信息
- 文本、背景、NPC、行为等

## 已实现的功能特性

### 1. 多表解析支持
✅ 解析NPC表、城镇表、宗门表、任务表、地图事件表、条件表、阶段表
✅ 城镇表支持特殊商铺NPC引用：酒馆、客栈、铁匠铺、布坊、丹符铺

### 2. 触发方式分析
✅ 自动分析每个剧情组的所有触发源
✅ 支持15种触发类型
✅ 游戏初始剧情（组2001）特殊处理
✅ 建立 `groupIdToTriggers` 映射关系

### 3. 触发节点可视化
✅ 在流程图中显示每个组的触发方式节点
✅ 每个触发节点有特定图标和颜色
✅ 垂直排列多个触发节点

### 4. 触发节点交互
✅ 点击触发节点选中该剧情组
✅ 右侧面板显示该组的详细条件信息
✅ 显示TriggerCondition和SelfAddCondition的完整解析

### 5. 条件详情展示
✅ 解析条件ID，从条件表查找名称
✅ 只显示Type=1的特殊条件
✅ 显示条件数值（如果有）
✅ 自增条件显示"完成后+"前缀

### 6. 城镇NPC关联
✅ 城镇表中的PubNpc、HotelNpc、SmithyNpc、ClothesNpc、DanFuNpc字段解析
✅ 这些NPC引用的剧情组被识别为对应商铺的触发方式
✅ 每个商铺触发有独特的图标和颜色

### 7. 用户界面
✅ 左侧组列表（支持搜索、多选）
✅ 中间流程图（双视图模式）
✅ 右侧编辑器（根据选择显示组或帧编辑）
✅ 顶部工具栏（加载、导出、刷新）

### 8. 历史记录
✅ 支持撤销（Ctrl+Z）
✅ 支持重做（Ctrl+Y）
✅ 自动保存状态变更

## 使用流程

1. **加载配置**：点击「配置」按钮加载现有剧情配置文件（多Excel文件）
2. **加载新剧情**：点击「新剧情」按钮加载待录入的范例文本
3. **查看流程图**：在左侧列表选择要查看的组，中间显示流程图
4. **点击触发节点**：点击流程图左侧的触发节点，右侧显示该组的详细条件
5. **查看选项跳转**：选项会直接连接到目标组，不显示额外的触发节点
6. **展开段落**：双击段落节点可查看该段落的详细帧结构
7. **导出数据**：点击「导出」按钮将当前数据导出为Excel

## 触发节点图标和颜色

| 触发类型 | 图标 | 颜色 | 说明 |
|---------|------|------|------|
| npc | UserOutlined | #1890FF | NPC对话触发 |
| town | HomeOutlined | #50C878 | 城镇进入触发 |
| guild | TeamOutlined | #722ED1 | 宗门进入触发 |
| task | FlagOutlined | #FA8C16 | 任务相关触发 |
| mapEvent | EnvironmentOutlined | #13C2C2 | 地图事件触发 |
| condition | FilterOutlined | #9B59B6 | 条件触发 |
| chain | LinkOutlined | #4A90D9 | 剧情连锁触发 |
| behavior | ThunderboltOutlined | #F5A623 | 选项行为触发 |
| random | 随机图标 | #EB2F96 | 随机触发 |
| init | RocketOutlined | #E74C3C | 游戏初始化触发 |
| pub | CoffeeOutlined | #8B4513 | 酒馆NPC触发 |
| hotel | BedOutlined | #16A085 | 客栈NPC触发 |
| smithy | ToolOutlined | #2C3E50 | 铁匠铺NPC触发 |
| clothes | ShoppingOutlined | #E91E63 | 布坊NPC触发 |
| danfu | MedicineBoxOutlined | #9C27B0 | 丹符铺NPC触发 |
| default | RocketOutlined | #50C878 | 默认无触发 |

## 文件类型识别

工具通过文件名模式识别不同类型的Excel表：
- `角色信息` / `NPC`: NPC表
- `城镇`: 城镇表
- `宗门`: 宗门表
- `任务`: 任务表
- `地图事件`: 地图事件表
- `条件`: 条件表
- `阶段`: 阶段表
- `剧情帧` / `frame`: 剧情帧表
- `剧情组` / `group`: 剧情组表
- `行为`: 行为表

## 开发说明

### 安装依赖
```bash
npm install
```

### 启动开发服务器
```bash
npm run dev
```

### 类型检查
```bash
npm run typecheck
```

### 构建
```bash
npm run build
```

## 注意事项

1. **白屏问题排查**：
   - 确保所有TypeScript类型定义正确
   - 检查flowConverter中的逻辑避免无限循环或null引用
   - 确保lookup表数据结构正确

2. **性能优化**：
   - 大量数据时使用visibleGroups控制可见组数量
   - ReactFlow使用useMemo优化节点和边的计算

3. **数据安全**：
   - 所有修改通过Zustand状态管理
   - 支持历史记录回滚
   - 建议定期导出备份

4. **扩展新触发类型**：
   - 在types/index.ts添加TriggerType
   - 在excelParser.ts的analyzeTriggerSources中添加分析逻辑
   - 在flowConverter.ts中添加图标和颜色
   - 在StoryTriggerNode.tsx中添加对应的图标组件

## 版本历史

### v1.0.0 (当前)
- 基础剧情配置功能
- 多表解析（NPC、城镇、宗门、任务、地图事件）
- 触发方式分析和可视化
- 条件详情展示
- 流程图双视图模式
- 历史记录撤销/重做
