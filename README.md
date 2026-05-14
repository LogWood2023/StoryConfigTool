# 剧情配置工具

基于 Python FastAPI + 单页 HTML 的剧情配置可视化工具，用于读取 Excel 配置表并以节点图形式展示剧情组及其条件关系。

## 功能概览

- **加载配置文件夹**：指定 PublicTables 目录，自动读取 StoryGroup.xlsx 和 Condition.xlsx
- **剧情组列表**：左侧边栏展示所有剧情组，支持勾选加载到画布
- **节点画布**：勾选的剧情组以可拖拽节点形式展示
- **触发条件节点**（左上角，粉红色）：显示 TriggerCondition，格式为 `conditionID,min,max`
  - 显示条件名 + 判定范围（如 `[0, ∞)`）
  - 格式错误时标红 + ⚠ 感叹号 + 闪烁动画
- **自增条件节点**（右下角，绿色）：显示 SelfAddCondition
  - 如果条件的 Condition 类型不是 1（计数器），标红 + ⚠ 感叹号
- **Condition 详情面板**：点击任意 Condition 节点，右侧弹出详情面板
  - 显示 ID、名字、类型、判定范围
  - 根据类型渲染不同描述（计数器、任务状态、装备、道具、关卡等）
  - 跨表查询关联数据（Task、EquipBase、Item、Stage、Talent）

## 支持的 Condition 类型

| 类型 | 说明 |
|------|------|
| 0 | 必定满足 |
| 1 | 计数器（当前值/总值/最大值） |
| 2 | 角色大境界等级 |
| 3 | 炼丹经验 |
| 4 | 炼丹等级 |
| 5 | 灵兽数量 |
| 6 | 时间年数 |
| 7 | 获得指定任务状态 → 关联 Task.xlsx |
| 8 | 玩家拥有装备数量 → 关联 EquipBase.xlsx |
| 9 | 玩家拥有道具数量 → 关联 Item.xlsx |
| 10 | 指定战斗胜利次数 → 关联 Stage.xlsx |
| 11 | 玩家性别 |
| 12 | 获取关卡id |
| 13 | 两个Condition相减 → 关联 Condition.xlsx |
| 14 | 角色是否有指定天赋 → 关联 Talent.xlsx |
| 15 | 金钱数量 |
| 16 | 小境界等级 |

## 预留接口

通过 `onRefClick(table, id)` 统一入口，后续可扩展为打开对应一览面板：

| 接口 | 触发场景 | 参数 |
|------|---------|------|
| 打开任务一览 | 类型=7，点击任务名 | `table="Task", id` |
| 打开装备一览 | 类型=8，点击装备名 | `table="EquipBase", id` |
| 打开物品一览 | 类型=9，点击道具名 | `table="Item", id` |
| 打开战斗一览 | 类型=10，点击关卡名 | `table="Stage", id` |
| 打开条件一览 | 类型=13，点击条件名 | `table="Condition", id` |
| 打开天赋一览 | 类型=14，点击天赋名 | `table="Talent", id` |

## 技术栈

- **后端**：Python 3.10+, FastAPI, Uvicorn, Pandas, openpyxl
- **前端**：纯 HTML/CSS/JS 单文件（无框架依赖）

## 启动方式

```bash
cd app
python run.py
```

浏览器访问 http://127.0.0.1:8000

## 项目结构

```
app/
├── run.py          # 启动入口
├── server.py       # FastAPI 后端（API + Excel 解析）
└── static/
    └── index.html  # 前端单页应用
```

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/set-folder | 设置配置文件夹路径 |
| GET | /api/story-groups | 获取所有剧情组（含条件数据） |
| GET | /api/condition/{id} | 获取 Condition 详情（含跨表查询） |
