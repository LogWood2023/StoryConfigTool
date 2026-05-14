# StoryGroup 触发方式完整总结

> 基于 `E:\work\public\data\PublicTables\` 下实际配置文件、策划案注释以及操作指南的综合分析。
> 生成时间：2026-05-13

---

## 触发方式总览

```
触发源                        触发机制                                     StoryGroup
────────────────────────────────────────────────────────────────────────────
NPC 强制剧情  ───→  Npc.Story                ───→  打开NPC界面时立刻触发
NPC 功能按钮  ───→  Npc.Function + Npc.Text  ───→  点击按钮触发（需Text匹配）
城镇进入      ───→  Town.Story                ───→  进入城镇时触发
宗门进入      ───→  Guild.Story               ───→  进入宗门时触发
宗门面板按钮  ───→  Guild.PanelStory          ───→  按下指定按钮触发
任务状态      ───→  Task.AcceptTrigger 等     ───→  格式: 4,0,StoryGroupId
地图事件      ───→  MapEvent.EventType=4      ───→  自定义条件参数=StoryGroupId
条件满足      ───→  StoryGroup.TriggerCondition ─→  条件Id,值
剧情连锁      ───→  StoryFrame.IsLastFrame    ───→  下一个 StoryGroupId
行为触发      ───→  StoryBehavior.Type=2      ───→  Parameter=StoryGroupId
随机变体      ───→  StoryGroup.RandomStoryGroup ─→  按权重随机选一个
```

---

## 方式一：NPC 交互触发

通过 `Npc.xlsx` 配置，玩家与 NPC 对话/交互时触发剧情组。

### 触发方式 1A：Story 字段（强制触发）

**机制**：打开该 NPC 界面时，若满足条件，立刻触发指定剧情组。

**格式**：`StoryGroupId` 或 `类型,StoryGroupId`

**示例**：
```
Story = "1001"        → 打开NPC界面时，立刻触发剧情组1001
Story = "1,1001"     → 带类型的强制触发（类型1）
```

### 触发方式 1B：Function 字段（按钮触发）

**机制**：打开该 NPC 界面时，若满足条件，则会出现一个按钮，按钮名为对应的 Text，点击即可触发对应的 Group。

**格式**：`功能类型,参数;功能类型,参数;...`

**常见功能类型**：
- `3` = 触发剧情组，参数为 StoryGroupId
- `2` = 售卖功能，参数为售卖表ID
- `6` = 其他功能

**重要规则：Text 字段匹配规则**

⚠️ **Function 字段中的功能数量必须与 Text 字段中的文本数量严格匹配！**

- 正确示例：
  ```
  Function = "3,1101;2,8002"
  Text     = "触发剧情,售卖"
  → 2个功能，2个文本，匹配正确
  ```

- 错误示例：
  ```
  Function = "3,1101;2,8002"
  Text     = "触发剧情,售卖,购买"
  → 2个功能，3个文本，会报错！
  ```

### 相关字段

| 字段 | 所在表 | 格式 | 说明 |
|------|--------|------|------|
| `Story`（强制剧情） | Npc.xlsx | `StoryGroupId` 或 `类型,StoryGroupId` | 打开NPC界面时**立刻**触发指定剧情组 |
| `Function`（所带功能） | Npc.xlsx | `3,StoryGroupId;...` | `3`=执行剧情，在对话功能按钮中显示 |
| `Text`（功能按钮文本） | Npc.xlsx | 按钮显示文本（逗号分隔） | **必须与Function中的功能数量匹配** |
| `TalkCondition`（对话条件） | Npc.xlsx | `条件Id,最小值,最大值` | 控制对话选项（含剧情按钮）的显示条件 |

### 示例（Npc 表）

```
id=101, 名字=测试Npc01:
  Function  = "3,1101;2,8002"
  Text      = "触发剧情,售卖"
  → 显示2个按钮：
    按钮1："触发剧情" → 点击触发剧情组1101
    按钮2："售卖" → 点击打开售卖界面（功能8002）

  Story     = "1001"
  → 打开NPC界面时，立刻触发剧情组1001（无条件检查）

  Talk      = "1,第1条对话;2,第2条对话"
  TalkCondition = "1;2,106,0"
  → 条件106=0时显示第2条对话
```

### 涉及表格

| 表格 | 作用 |
|------|------|
| `Npc.xlsx` | 配置 NPC 的 Story、Function、Text、TalkCondition 字段 |
| `StoryGroup.xlsx` | 被触发的剧情组定义 |
| `StoryFrame.xlsx` | 剧情组的具体演出帧 |
| `Condition.xlsx` | TalkCondition 引用的条件判断 |
| `StoryBehavior.xlsx` | Function 中行为类型为 3 时引用的行为模板 |

---

## 方式二：任务触发

通过 `Task.xlsx` 配置，任务状态变化时自动触发剧情组。

### 相关字段

| 字段 | 格式 | 说明 |
|------|------|------|
| `AcceptTrigger`（任务领取后触发） | `4,0,StoryGroupId;` | 玩家领取任务后触发剧情 |
| `DeleteTrigger`（任务删除后触发） | `4,0,StoryGroupId;` | 任务被删除后触发剧情 |
| `FailTrigger`（任务失败后触发） | `4,0,StoryGroupId;` | 任务失败后触发剧情 |
| `CompleteCondition`（任务完成条件） | `StoryGroupId,计数` | 完成任务时可能触发连锁剧情 |

> 格式说明：`4` = 触发类型（剧情相关），`0/1` = 参数模式，`StoryGroupId` = 目标剧情组ID，多个用 `;` 分隔。

### 示例（Task 表）

```
id=1005, 名字=寻找丹草:
  CompleteCondition = "90001,5"   → 完成条件：剧情组90001累计触发5次
  → 完成任务时检查，满足条件后触发后续剧情

id=1006, 名字=还赊账:
  DeleteTrigger = "4,0,43010390;4,0,43010391"  → 删除任务后触发剧情组43010390或43010391
```

### 涉及表格

| 表格 | 作用 |
|------|------|
| `Task.xlsx` | 配置 AcceptTrigger、DeleteTrigger、FailTrigger、CompleteCondition |
| `StoryGroup.xlsx` | 被触发的剧情组定义 |
| `Condition.xlsx` | AcceptCondition（任务可接条件）可能关联剧情 |
| `StoryFrame.xlsx` | 被触发剧情组的演出帧 |

---

## 方式三：地图事件触发

通过 `MapEvent.xlsx` 配置，玩家在地图上触发事件时启动剧情组。

### 事件类型（EventType）与剧情触发的关系

| EventType | 名称 | 是否触发剧情 | 参数说明 |
|-----------|------|--------------|----------|
| 1 | 洞府类 | 特殊 | 参数触发模式=0 时无参数 |
| **2** | **普通交互事件** | **是** | 自定义条件参数可能包含 StoryGroupId |
| **4** | **NPC/剧情事件** | **是** | **自定义条件参数直接填 StoryGroupId**（如 `1001`） |
| 3 | 消耗行动力事件 | 依配置 | 依具体参数而定 |
| 5~9 | 其他事件类型 | 依配置 | 需结合参数触发模式判断 |
| 10 | 特殊类型 | 依配置 | 参数触发模式控制 |
| 13~18 | 扩展事件类型 | 依配置 | 需结合具体参数 |

### 参数触发模式（TriggerMode）

| 值 | 含义 |
|----|------|
| 0 | 无参数触发（事件本身直接触发） |
| 1 | 有参数触发（参数=StoryGroupId，从自定义条件参数读取） |

### 示例（MapEvent 表）

```
EventId=7, 事件类型=4, 自定义条件参数=1001
  → 事件类型4（NPC/剧情事件），参数为1001，触发剧情组1001

EventId=200001, 事件类型=2, 自定义条件参数=3, 参数触发模式=1
  → 事件类型2，参数触发模式=1（有参数），触发剧情组3
```

### 涉及表格

| 表格 | 作用 |
|------|------|
| `MapEvent.xlsx` | 配置 EventType、自定义条件参数、参数触发模式 |
| `StoryGroup.xlsx` | 被触发的剧情组定义 |
| `Condition.xlsx` | ShowConditions（显示条件）控制事件是否显示 |
| `Map.xlsx` | 事件所在的地图配置 |
| `StoryFrame.xlsx` | 被触发剧情组的演出帧 |

---

## 方式四：StoryGroup 自身条件触发（被动自动触发）

通过 `StoryGroup.xlsx` 的 `TriggerCondition` 字段配置，**当条件满足时由系统自动触发**，无需玩家主动操作。

### 相关字段

| 字段 | 格式 | 说明 |
|------|------|------|
| `TriggerCondition`（触发条件） | `条件Id,值` 或 `条件Id,最小值,最大值` | 条件满足时触发本剧情组 |
| `SelfAddCondition`（自增条件Id） | `条件Id` | 剧情组完成后该条件值+1（常用来实现"只触发一次"） |
| `RandomStoryGroup`（随机剧情组） | `剧情组id,权重;...` | 满足触发条件后，按权重随机选择实际触发的剧情组 |

### TriggerCondition 格式详解

| 写法 | 含义 |
|------|------|
| `103,0` | 条件103的值等于 **0**（从未触发过）时满足 |
| `103,1` | 条件103的值 **>= 1** 时满足 |
| `103,1,5` | 条件103的值在 **1~5 之间**（闭区间）时满足 |
| `103,0,0;70001,1,2` | 多组条件，**且**关系（同时满足） |

### 常见条件类型（Condition 表 条件Id 列）

| 条件Id | 含义 | 参数 |
|---------|------|------|
| 0 | 必定满足 | 无 |
| 1 | 特殊条件（由 PreConditions 决定） | 无 |
| 2 | 角色大境界等级达到 X | 无（判断条件值） |
| 3 | 技能熟练度达到 X | 无 |
| 4 | 技能等级达到 X | 无 |
| 6 | 世界时间超过 X 年 | 无 |
| 7 | 获得指定任务状态 | 参数=TaskId |
| 8 | 玩家拥有指定装备数量 | 参数=EquipBaseId |
| 9 | 玩家拥有指定道具数量 | 参数=ItemId |
| 10 | 指定 Stage 的胜利次数 | 无（判断条件值） |
| 14 | 是否拥有指定天赋 | 参数=TalentId |
| 15 | 收集指定道具数量 | 参数=ItemId |

### 示例（StoryGroup 表）

```
剧情组id=1001, 名字=测试第1组剧情:
  TriggerCondition  = "103,0"      → 条件103的值等于0时触发（从未触发过）
  SelfAddCondition = 103             → 完成后条件103的值+1，下次不再满足触发条件

剧情组id=2003:
  TriggerCondition  = "10003,0,0;70001,1,2"  → 多条件"且"：条件10003=0 且 条件70001在1~2之间
  SelfAddCondition = 10003
```

### 涉及表格

| 表格 | 作用 |
|------|------|
| `StoryGroup.xlsx` | 配置 TriggerCondition、SelfAddCondition、RandomStoryGroup |
| `Condition.xlsx` | 定义触发条件的具体类型和参数 |
| `Mark.xlsx` | 配合 Condition 记录状态（0/1 标记） |
| `StoryFrame.xlsx` | 被触发剧情组的演出帧 |

---

## 方式五：上一剧情组连锁触发

剧情组之间通过 StoryFrame 或 StoryBehavior 形成链式触发。

### 方式 5A：通过 StoryFrame.IsLastFrame

| 字段 | 格式 | 说明 |
|------|------|------|
| `IsLastFrame` | `[下一个剧情组id]` 或留空 | 当前剧情组最后一帧填写，结束后自动跳转 |

### 方式 5B：通过 StoryBehavior（行为类型=2）

| Type | 功能 | Parameter 格式 |
|------|------|----------------|
| 2 | 触发指定剧情组 | `StoryGroupId` |

在剧情帧的 `Behavior` 字段中配置，支持**选项式触发**（玩家选择后触发不同剧情组）。

### 示例

```
StoryFrame 最后一帧:
  FrameId   = 100106
  IsLastFrame = "[2001]"   → 剧情组1001结束后，自动触发剧情组2001

StoryBehavior:
  BehaviorId = 10003
  Type       = 2（触发指定剧情组）
  Parameter  = 2004        → 执行此行为时触发剧情组2004

StoryFrame.Behavior = "0,1,2;10003,50;10004,50"
  → 出现1~2个选项，50%概率触发行为10003（→剧情组2004），50%概率触发行为10004（→结束）
```

### 涉及表格

| 表格 | 作用 |
|------|------|
| `StoryFrame.xlsx` | 配置 IsLastFrame、Behavior 字段 |
| `StoryBehavior.xlsx` | 定义 Type=2 的行为模板 |
| `StoryGroup.xlsx` | 被连锁触发的剧情组 |

---

## 方式六：随机剧情组（RandomStoryGroup）

通过 `StoryGroup.xlsx` 的 `RandomStoryGroup` 字段配置，满足触发条件后**按权重随机选择**实际执行的剧情组。

### 格式

```
RandomStoryGroup = "剧情组id,权重;剧情组id,权重;..."
```

### 示例

```
剧情组id=9005:
  RandomStoryGroup = "90051,50;90052,30;90053,20"
  → 50%概率触发剧情组90051（切磋赢的剧情1）
  → 30%概率触发剧情组90052（切磋赢的剧情2）
  → 20%概率触发剧情组90053（切磋赢的剧情3）
```

此功能常用于：切磋胜负分支、随机NPC对话、随机事件等。

### 涉及表格

| 表格 | 作用 |
|------|------|
| `StoryGroup.xlsx` | 配置 RandomStoryGroup（主剧情组 + 变体组） |
| `StoryFrame.xlsx` | 各变体剧情组的演出帧 |
| `StoryBehavior.xlsx` | 各变体剧情组的行为 |

---

## 方式七：Condition 系统驱动触发

通过 `Condition.xlsx` 配置的条件，当条件值变化时可能驱动剧情触发（由游戏系统轮询或事件驱动）。

### Condition 刷新类型（RefreshType）

| 值 | 含义 |
|----|------|
| 0 | 不刷新（条件值永久有效） |
| 1 | 按天刷新 |
| 2 | 按周刷新 |
| 3 | 按月刷新 |

### 数据流

```
游戏内事件（战斗胜利/获得道具/时间流逝...）
    ↓
更新 Condition 值（Condition.xlsx 中对应 Id 的值）
    ↓
StoryGroup.TriggerCondition 检查条件是否满足
    ↓
满足 → 触发剧情组
```

### 涉及表格

| 表格 | 作用 |
|------|------|
| `Condition.xlsx` | 定义条件类型、刷新规则 |
| `StoryGroup.xlsx` | TriggerCondition 引用 Condition Id |
| `Mark.xlsx` | 记录状态标记（0/1） |

---

## 方式八：城镇进入触发

通过 `Town.xlsx` 配置，玩家进入城镇时触发剧情组。

### 机制说明

**触发时机**：进入该城镇时，如果满足条件，则会触发对应的 StoryGroup。

### 相关字段

| 字段 | 所在表 | 格式 | 说明 |
|------|--------|------|------|
| `Story`（城镇剧情） | Town.xlsx | `StoryGroupId` | 进入城镇时触发指定剧情组 |

### 示例（Town 表）

```
id=1001, 名字=清风镇:
  Story = "2001"
  → 玩家进入清风镇时，触发剧情组2001
```

### 涉及表格

| 表格 | 作用 |
|------|------|
| `Town.xlsx` | 配置城镇的 Story 字段 |
| `StoryGroup.xlsx` | 被触发的剧情组定义 |
| `StoryFrame.xlsx` | 剧情组的具体演出帧 |
| `Condition.xlsx` | 可能关联条件判断 |

---

## 方式九：宗门触发

通过 `Guild.xlsx` 配置，在宗门相关场景中触发剧情组。

### 触发方式 9A：宗门进入触发（Story 字段）

**触发时机**：进入该宗门时，如果满足条件，则会触发对应的 StoryGroup。

**格式**：`StoryGroupId`

**示例**：
```
Story = "3001"
→ 玩家进入宗门时，触发剧情组3001
```

### 触发方式 9B：宗门面板按钮触发（PanelStory 字段）

**触发时机**：在宗门界面中，按下指定按钮后，触发对应的 StoryGroup。

**格式**：`按钮枚举,StoryGroupId;按钮枚举,StoryGroupId;...`

**按钮枚举对应**：
| 枚举值 | 按钮名称 |
|--------|----------|
| 1 | 宗门管理 |
| 2 | 宗门宝库 |
| 3 | 军机处 |
| 4 | 疗伤院 |
| 5 | 比武大会 |
| 6 | 传送门 |
| 7 | 护山大阵 |

**示例**：
```
PanelStory = "1,3002;5,3003"
→ 按下"宗门管理"按钮时，触发剧情组3002
→ 按下"比武大会"按钮时，触发剧情组3003
```

### 相关字段

| 字段 | 所在表 | 格式 | 说明 |
|------|--------|------|------|
| `Story`（宗门剧情） | Guild.xlsx | `StoryGroupId` | 进入宗门时触发指定剧情组 |
| `PanelStory`（面板剧情） | Guild.xlsx | `按钮枚举,StoryGroupId;...` | 按下指定按钮时触发剧情组 |

### 涉及表格

| 表格 | 作用 |
|------|------|
| `Guild.xlsx` | 配置宗门的 Story、PanelStory 字段 |
| `StoryGroup.xlsx` | 被触发的剧情组定义 |
| `StoryFrame.xlsx` | 剧情组的具体演出帧 |
| `Condition.xlsx` | 可能关联条件判断 |

---

## 附录：相关配置表字段速查

### StoryGroup.xlsx 字段

| 列 | 字段名 | 说明 |
|----|--------|------|
| A | 剧情组id | 唯一标识 |
| B | 名字 | 策划用名称 |
| C | 触发条件 | `条件Id,值` 或 `条件Id,最小值,最大值` |
| D | 自增条件Id | 剧情完成后 `条件值 += 1` |
| E | 备注 | 策划备注 |
| F | 随机剧情组 | `剧情组id,权重;...` |

### StoryFrame.xlsx 关键字段

| 列 | 字段名 | 说明 |
|----|--------|------|
| E | NextFrame | 下一个演出帧id |
| F | IsLastFrame | 是否最后一帧，`[下一个剧情组id]` 或空 |
| G | Behavior | 行为参数，`BehaviorId` 或 `0,下限,上限;BehaviorId,权重;...` |

### StoryBehavior.xlsx 关键字段

| 列 | 字段名 | 说明 |
|----|--------|------|
| D | Type | 行为类型（见下文 StoryBehavior 功能详解） |
| F | Parameter | 行为参数（依 Type 不同含义不同） |
| H | AdditionBehavior | 附加行为（某些类型支持） |

---

*本文档由 AI 助手根据项目实际配置表结构分析生成，如有遗漏或错误，欢迎补充修正。*
