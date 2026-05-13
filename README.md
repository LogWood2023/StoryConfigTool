# 灵劫变剧情录入器

## 项目简介

灵劫变剧情录入器是一个基于 React + TypeScript + React Flow 的可视化剧情管理系统，支持通过流程图方式展示剧情结构，并提供剧情编辑和触发方式分析功能。

## 技术栈

- **前端框架**: React 18.3
- **类型系统**: TypeScript 5.6
- **构建工具**: Vite 6.0
- **状态管理**: Zustand 5.0
- **流程图**: ReactFlow (@xyflow/react) 12.6
- **UI组件**: Ant Design 5.24
- **Excel处理**: xlsx 0.18
- **布局算法**: @dagrejs/dagre 1.1

## 功能特性

### ✅ 多表解析支持
- NPC表解析
- 城镇表解析（包含酒馆、客栈、铁匠铺、布坊、丹符铺等NPC引用）
- 宗门表解析
- 任务表解析
- 地图事件表解析
- 条件表解析
- 阶段表解析

### ✅ 触发方式分析
- 自动分析每个剧情组的所有触发源
- 支持15种触发类型
- 游戏初始剧情（组2001）特殊处理
- 建立 `groupIdToTriggers` 映射关系

### ✅ 触发节点可视化
- 在流程图中显示每个组的触发方式节点
- 每个触发节点有特定图标和颜色
- 垂直排列多个触发节点

### ✅ 触发节点交互
- 点击触发节点选中该剧情组
- 右侧面板显示该组的详细条件信息
- 显示TriggerCondition和SelfAddCondition的完整解析

### ✅ 条件详情展示
- 解析条件ID，从条件表查找名称
- 只显示Type=1的特殊条件
- 显示条件数值（如果有）
- 自增条件显示"完成后+"前缀

### ✅ 城镇NPC关联
- 城镇表中的PubNpc、HotelNpc、SmithyNpc、ClothesNpc、DanFuNpc字段解析
- 每个商铺触发有独特的图标和颜色

### ✅ 用户界面
- 左侧组列表（支持搜索、多选）
- 中间流程图（双视图模式）
- 右侧编辑器（根据选择显示组或帧编辑）
- 顶部工具栏（加载、导出、刷新）

### ✅ 历史记录
- 支持撤销（Ctrl+Z）
- 支持重做（Ctrl+Y）
- 自动保存状态变更

## 快速开始

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

应用将在 http://localhost:5173/ 启动。

### 类型检查

```bash
npm run typecheck
```

### 构建生产版本

```bash
npm run build
```

## 使用说明

1. **加载配置**：点击「配置」按钮加载现有剧情配置文件（多Excel文件）
2. **加载新剧情**：点击「新剧情」按钮加载待录入的范例文本
3. **查看流程图**：在左侧列表选择要查看的组，中间显示流程图
4. **点击触发节点**：点击流程图左侧的触发节点，右侧显示该组的详细条件
5. **查看选项跳转**：选项会直接连接到目标组
6. **展开段落**：双击段落节点可查看该段落的详细帧结构
7. **导出数据**：点击「导出」按钮将当前数据导出为Excel

## 项目文档

详细的项目文档请查看 [PROJECT_DOCUMENTATION.md](PROJECT_DOCUMENTATION.md)

## 触发类型说明

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
| random | SwapOutlined | #EB2F96 | 随机触发 |
| init | RocketOutlined | #E74C3C | 游戏初始化触发 |
| pub | CoffeeOutlined | #8B4513 | 酒馆NPC触发 |
| hotel | HomeFilled | #16A085 | 客栈NPC触发 |
| smithy | ToolOutlined | #2C3E50 | 铁匠铺NPC触发 |
| clothes | ShoppingOutlined | #E91E63 | 布坊NPC触发 |
| danfu | MedicineBoxOutlined | #9C27B0 | 丹符铺NPC触发 |
| default | RocketOutlined | #50C878 | 默认无触发 |

## 推送到 GitHub

请按照以下步骤将项目推送到您自己的 GitHub 仓库：

### 步骤 1: 在 GitHub 上创建仓库

1. 登录您的 GitHub 账号
2. 点击右上角的 **+** 按钮，选择 **New repository**
3. 仓库名称填写：**灵劫变剧情录入器**
4. 选择 **Private**（私有仓库）
5. **不要**勾选 "Initialize this repository with a README"
6. 点击 **Create repository**

### 步骤 2: 关联远程仓库并推送

在项目目录下执行以下命令（将 `YOUR_USERNAME` 替换为您的 GitHub 用户名）：

```bash
git remote add origin https://github.com/YOUR_USERNAME/灵劫变剧情录入器.git
git branch -M main
git push -u origin main
```

### 步骤 3: 验证

刷新 GitHub 仓库页面，确认代码已成功推送。

## 隐私设置

此仓库已设置为 **Private**（私有），只有仓库所有者（您）可以访问。其他任何人无法查看或访问此仓库中的代码。

如需添加协作者，请进入 GitHub 仓库的 **Settings** → **Collaborators** 添加。

## License

此项目仅供个人/团队内部使用。
