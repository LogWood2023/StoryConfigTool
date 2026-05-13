/**
 * 剧情配置工具 —— 类型定义
 */

// ============================================================
// StoryFrame (演出帧)
// ============================================================
export interface StoryFrame {
  frameId: number;
  name: string;
  type: number;          // 1=对话 2=图文弹框大 3=全屏 4=镜头 5=图文弹框小 6=感谢 7=标题
  groupId: number;
  nextFrame: number | null;
  isLastFrame: boolean;
  autoJump: number | null; // IsLastFrame=1,XXXX → 结束后自动跳转到目标GroupId
  behavior: string;       // 行为参数 "1,BhvId1;2,BhvId2"
  picture: string;        // 留空
  picture2: string;       // 背景图路径
  soundId: string;
  text: string;
  additionalText: string; // 多语言变量
  additionPar: string;    // NPC站位/表情 "npcId,left,bright,expr,anim"
  summary: string;        // 剧情梗概
}

// ============================================================
// StoryGroup (剧情组)
// ============================================================
export interface StoryGroup {
  groupId: number;
  name: string;
  triggerCondition: string;
  selfAddCondition: string;
  notes: string;
}

// ============================================================
// StoryBehavior (剧情行为跳转)
// ============================================================
export interface StoryBehavior {
  behaviorId: number;
  name: string;
  showName: string;
  type: number;           // 2=触发指定剧情组
  markId: string;
  parameter: string;      // 目标GroupId
  additionBehavior: string; // 附加行为参数
}

// ============================================================
// Stage (战斗场景)
// ============================================================
export const STAGE_STORY_TIMING_NAMES: Record<number, string> = {
  1: '进入场景前', 2: '进入场景后', 3: '波次开始前',
  4: '成功后退场前', 5: '失败后退场前', 6: '成功后退场后',
  7: '失败后退场后', 8: '满足条件后',
};

export interface StageStoryRule {
  timing: number;
  groupId: number;
  extraParam: string;
}

export interface StageEntry {
  stageId: number;
  name: string;
  groupId: number;
  stroy: StageStoryRule[];
}

// ============================================================
// Condition表
// ============================================================
export interface ConditionEntry {
  id: number;
  name: string;
  type: number;  // 1=特殊条件
  param: string;
}

// ============================================================
// NPC表
// ============================================================
export interface NpcEntry {
  id: number;
  name: string;
  story: string;        // 强制剧情组ID
  function: string;     // 功能 "3,GroupId;2,ShopId"
  text: string;         // 按钮文本
  talkCondition: string; // 对话条件
}

// ============================================================
// Town表
// ============================================================
export interface TownEntry {
  id: number;
  name: string;
  story: string;        // 进入时触发的剧情组
  PubNpc: number;     // 酒馆NPC
  HotelNpc: number;   // 客栈NPC
  SmithyNpc: number;   // 铁匠铺NPC
  ClothesNpc: number;  // 布坊NPC
  DanFuNpc: number;  // 丹符铺NPC
}

// ============================================================
// Guild表
// ============================================================
export interface GuildEntry {
  id: number;
  name: string;
  story: string;        // 进入时触发的剧情组
  panelStory: string;   // 面板按钮触发 "按钮枚举,GroupId;..."
}

// ============================================================
// Task表
// ============================================================
export interface TaskEntry {
  id: number;
  name: string;
  acceptTrigger: string;  // 任务领取后触发
  deleteTrigger: string;  // 任务删除后触发
  failTrigger: string;    // 任务失败后触发
}

// ============================================================
// MapEvent表
// ============================================================
export interface MapEventEntry {
  eventId: number;
  name: string;
  eventType: number;     // 2=普通交互 4=NPC剧情
  customParam: string;   // 自定义条件参数（可能是GroupId）
  triggerMode: number;   // 0=无参数 1=有参数
}

// ============================================================
// 触发方式信息
// ============================================================
export interface TriggerSourceInfo {
  type: 'npc' | 'town' | 'guild' | 'task' | 'mapEvent' | 'condition' | 'chain' | 'behavior' | 'random' | 'init' | 'pub' | 'hotel' | 'smithy' | 'clothes' | 'danfu' | 'default';
  sourceId: number;
  sourceName: string;
  detail: string;
}

// ============================================================
// 对照表 —— 字符串名 -> ID
// ============================================================
export interface LookupTable {
  npcMap: Record<string, number>;         // "小明" -> 1060
  npcIdToName: Record<number, string>;    // 1060 -> "小明" (反向索引)
  npcIdToEntry: Record<number, NpcEntry>; // NPC完整数据
  stageIdToEntry: Record<number, StageEntry>; // StageId -> StageEntry
  conditionIdToEntry: Record<number, ConditionEntry>; // ConditionId -> ConditionEntry
  townIdToEntry: Record<number, TownEntry>;
  guildIdToEntry: Record<number, GuildEntry>;
  taskIdToEntry: Record<number, TaskEntry>;
  mapEventIdToEntry: Record<number, MapEventEntry>;
  groupIdToTriggers: Record<number, TriggerSourceInfo[]>; // GroupId到所有触发源的映射
  expressionMap: Record<string, number>;
  bgMap: Record<string, string>;
  soundMap: Record<string, string>;
  animMap: Record<string, number>;
}

// ============================================================
// 完整剧情数据
// ============================================================
export interface StoryData {
  groups: StoryGroup[];
  frames: StoryFrame[];
  behaviors: StoryBehavior[];
  stages: StageEntry[];
  conditions: ConditionEntry[];
  npcs: NpcEntry[];
  towns: TownEntry[];
  guilds: GuildEntry[];
  tasks: TaskEntry[];
  mapEvents: MapEventEntry[];
  lookup: LookupTable;
  sourceFiles: string[];  // 已加载的文件列表
}

// ============================================================
// ReactFlow 节点/边数据
// ============================================================
export interface StoryNodeData {
  [key: string]: unknown;
  label: string;
  frameId: number;
  groupId: number;
  role: string;
  text: string;
  expression: string;
  background: string;
  sound: string;
  behavior: string;
  isLastFrame: boolean;
  autoJump: number | null;
  nextFrame: number | null;
  additionPar: string;
  additionalText: string;
  summary: string;
  groupName: string;
}

export interface StoryEdgeData {
  [key: string]: unknown;
  label: string;
  isBehavior: boolean;    // 是否是选项行为连线
  behaviorId?: number;
}

// Window API
declare global {
  interface Window {
    electronAPI: {
      openFolder: () => Promise<string | null>;
      openFile: () => Promise<string | null>;
    };
  }
}
