import * as XLSX from 'xlsx';
import type { StoryFrame, StoryGroup, StoryBehavior, StoryData, LookupTable, StageEntry, ConditionEntry, NpcEntry, TownEntry, GuildEntry, TaskEntry, MapEventEntry, TriggerSourceInfo } from '../types';

function baseName(filename: string): string {
  const bn = filename.replace(/\\/g, '/').replace(/.*\//, '').replace(/\.[^.]+$/, '');
  return bn.toUpperCase();
}

export function readExcelSheets(buffer: ArrayBuffer): Record<string, unknown[][]> {
  const wb = XLSX.read(buffer, { type: 'array' });
  const result: Record<string, unknown[][]> = {};
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    if (ws) result[name] = XLSX.utils.sheet_to_json(ws, { header: 1 });
  }
  return result;
}

function detectTableType(filename: string, rows: unknown[][]): string | null {
  const bn = baseName(filename);
  if (bn === 'STORYFRAME' || bn === 'STORY_FRAME') return 'StoryFrame';
  if (bn === 'STORYGROUP' || bn === 'STORY_GROUP') return 'StoryGroup';
  if (bn === 'STORYBEHAVIOR' || bn === 'STORY_BEHAVIOR') return 'StoryBehavior';
  if (bn === 'NPC') return 'Npc';
  if (bn === 'STAGE') return 'Stage';
  if (bn === 'CONDITION') return 'Condition';
  if (bn === 'TOWN') return 'Town';
  if (bn === 'GUILD') return 'Guild';
  if (bn === 'TASK') return 'Task';
  if (bn === 'MAPEVENT' || bn === 'MAP_EVENT') return 'MapEvent';

  if (rows.length >= 2) {
    const row0 = rows[0].map(c => String(c).trim());
    if (row0.includes('章节') && row0.includes('功能') && row0.includes('角色') && row0.includes('台词')) {
      return 'StoryText';
    }
    // 通过表头识别城镇表（包含城镇id或城镇名称）
    if ((row0.includes('城镇id') || row0.includes('城镇名称') || row0.includes('城镇ID')) && row0.includes('酒馆') && row0.includes('客栈')) {
      return 'Town';
    }
    // 通过表头识别NPC表
    if (row0.includes('NPCID') || row0.includes('NPC名称')) {
      return 'Npc';
    }
  }

  return null;
}

export function parseStoryGroup(rows: unknown[][]): StoryGroup[] {
  if (rows.length < 5) return [];
  const groups: StoryGroup[] = [];
  for (let i = 4; i < rows.length; i++) {
    const r = rows[i];
    const id = Number(r[0]);
    if (isNaN(id) || id === 0) continue;
    groups.push({
      groupId: id,
      name: String(r[1] || ''),
      triggerCondition: String(r[2] || ''),
      selfAddCondition: String(r[3] || ''),
      notes: String(r[4] || ''),
    });
  }
  return groups;
}

export function parseStoryFrame(rows: unknown[][]): StoryFrame[] {
  if (rows.length < 5) return [];
  const frames: StoryFrame[] = [];
  // 实际列结构：
  // 0: 演出帧id, 1: 名字, 2: 类型, 3: 演出组id, 4: 下个演出帧id
  // 5: 是否最后一帧..., 6: 行为参数, 7: 美术资源, 8: 美术资源_2
  // 9: 声音id, 10: 文本, 11: 附加文本, 12: 附加参数, 13: 剧情梗概, 14: 转场效果
  for (let i = 4; i < rows.length; i++) {
    const r = rows[i];
    const frameId = Number(r[0]);
    if (isNaN(frameId) || frameId === 0) continue;
    const groupId = Number(r[3]);  // 演出组id在第4列
    frames.push({
      frameId,
      groupId,
      name: String(r[1] || ''),
      text: String(r[10] || ''),  // 文本在第11列
      additionPar: String(r[12] || ''),  // 附加参数在第13列
      picture2: String(r[7] || ''),  // 美术资源在第8列
      soundId: String(r[9] || ''),  // 声音id在第10列
      behavior: String(r[6] || ''),  // 行为参数在第7列
      isLastFrame: r[5] === 1 || r[5] === '1',
      autoJump: 0,
      nextFrame: Number(r[4]) || 0,  // 下个演出帧id在第5列
      additionalText: String(r[11] || ''),  // 附加文本在第12列
      summary: String(r[13] || ''),  // 剧情梗概在第14列
    });
  }
  return frames;
}

export function parseStoryBehavior(rows: unknown[][]): StoryBehavior[] {
  if (rows.length < 5) return [];
  const behaviors: StoryBehavior[] = [];
  for (let i = 4; i < rows.length; i++) {
    const r = rows[i];
    const id = Number(r[0]);
    if (isNaN(id) || id === 0) continue;
    behaviors.push({
      behaviorId: id,
      showName: String(r[1] || ''),
      type: Number(r[2]) || 0,
      parameter: String(r[3] || ''),
      additionBehavior: String(r[4] || ''),
    });
  }
  return behaviors;
}

export function parseStageTable(rows: unknown[][]): { stages: StageEntry[]; stageIdToEntry: Record<number, StageEntry> } {
  const stages: StageEntry[] = [];
  const stageIdToEntry: Record<number, StageEntry> = {};
  if (rows.length < 5) return { stages, stageIdToEntry };
  for (let i = 4; i < rows.length; i++) {
    const r = rows[i];
    const id = Number(r[0]);
    if (isNaN(id) || id === 0) continue;
    const stroyStr = String(r[2] || '');
    const stroy: { groupId: number; timing: number }[] = [];
    if (stroyStr) {
      const parts = stroyStr.split(';').filter(p => p.trim());
      for (const part of parts) {
        const [gidStr, timingStr] = part.split(',');
        const gid = Number(gidStr);
        const timing = Number(timingStr) || 0;
        if (!isNaN(gid) && gid > 0) stroy.push({ groupId: gid, timing });
      }
    }
    const entry: StageEntry = { stageId: id, name: String(r[1] || ''), stroy };
    stages.push(entry);
    stageIdToEntry[id] = entry;
  }
  return { stages, stageIdToEntry };
}

export function parseConditionTable(rows: unknown[][]): { conditions: ConditionEntry[]; conditionIdToEntry: Record<number, ConditionEntry> } {
  const conditions: ConditionEntry[] = [];
  const conditionIdToEntry: Record<number, ConditionEntry> = {};
  if (rows.length < 5) return { conditions, conditionIdToEntry };
  for (let i = 4; i < rows.length; i++) {
    const r = rows[i];
    const id = Number(r[0]);
    if (isNaN(id) || id === 0) continue;
    const entry: ConditionEntry = { id, name: String(r[1] || ''), type: Number(r[2]) || 0 };
    conditions.push(entry);
    conditionIdToEntry[id] = entry;
  }
  return { conditions, conditionIdToEntry };
}

export function parseNpcTable(rows: unknown[][]): { npcs: NpcEntry[]; npcMap: Record<string, number> } {
  const npcs: NpcEntry[] = [];
  const npcMap: Record<string, number> = {};
  if (rows.length < 5) return { npcs, npcMap };
  for (let i = 4; i < rows.length; i++) {
    const r = rows[i];
    const id = Number(r[0]);
    if (isNaN(id) || id === 0) continue;
    const name = String(r[1] || '');
    npcs.push({ id, name, story: String(r[2] || ''), function: '', text: '', talkCondition: '' });
    if (name) npcMap[name] = id;
  }
  return { npcs, npcMap };
}

export function parseNpcFullTable(rows: unknown[][]): { npcs: NpcEntry[]; npcMap: Record<string, number>; npcIdToEntry: Record<number, NpcEntry> } {
  const npcs: NpcEntry[] = [];
  const npcMap: Record<string, number> = {};
  const npcIdToEntry: Record<number, NpcEntry> = {};
  if (rows.length < 5) return { npcs, npcMap, npcIdToEntry };
  for (let i = 4; i < rows.length; i++) {
    const r = rows[i];
    const id = Number(r[0]);
    if (isNaN(id) || id === 0) continue;
    const name = String(r[1] || '');
    const entry: NpcEntry = {
      id,
      name,
      story: String(r[2] || ''),
      function: String(r[3] || ''),
      text: String(r[4] || ''),
      talkCondition: String(r[5] || ''),
    };
    npcs.push(entry);
    npcIdToEntry[id] = entry;
    if (name) npcMap[name] = id;
  }
  return { npcs, npcMap, npcIdToEntry };
}

export function parseTownTable(rows: unknown[][]): { towns: TownEntry[]; townIdToEntry: Record<number, TownEntry> } {
  const towns: TownEntry[] = [];
  const townIdToEntry: Record<number, TownEntry> = {};
  if (rows.length < 5) return { towns, townIdToEntry };

  // 查找表头行
  let headerRowIndex = -1;
  for (let i = 0; i < Math.min(5, rows.length); i++) {
    const row0 = rows[i].map(c => String(c).trim().toLowerCase());
    if (row0.some(c => c.includes('城镇') || c.includes('town'))) {
      headerRowIndex = i;
      break;
    }
  }

  if (headerRowIndex === -1) {
    // 使用默认列映射
    for (let i = 4; i < rows.length; i++) {
      const r = rows[i];
      const id = Number(r[0]);
      if (isNaN(id) || id === 0) continue;
      const entry: TownEntry = {
        id,
        name: String(r[1] || ''),
        story: String(r[2] || ''),
        PubNpc: Number(r[3] || 0),
        HotelNpc: Number(r[4] || 0),
        SmithyNpc: Number(r[5] || 0),
        ClothesNpc: Number(r[6] || 0),
        DanFuNpc: Number(r[7] || 0),
      };
      towns.push(entry);
      townIdToEntry[id] = entry;
    }
  } else {
    // 通过表头动态映射列
    const header = rows[headerRowIndex].map(c => String(c).trim().toLowerCase());
    const colMap: Record<string, number> = {};
    header.forEach((col, idx) => {
      colMap[col] = idx;
    });

    for (let i = headerRowIndex + 1; i < rows.length; i++) {
      const r = rows[i];
      const idCol = colMap['城镇id'] ?? colMap['城镇ID'] ?? colMap['id'] ?? 0;
      const nameCol = colMap['城镇名称'] ?? colMap['name'] ?? 1;
      const storyCol = colMap['故事'] ?? colMap['story'] ?? 2;
      const pubNpcCol = colMap['酒馆'] ?? 3;
      const hotelNpcCol = colMap['客栈'] ?? 4;
      const smithyNpcCol = colMap['铁匠铺'] ?? colMap['铁匠'] ?? 5;
      const clothesNpcCol = colMap['布坊'] ?? colMap['服装'] ?? 6;
      const danfuNpcCol = colMap['丹符铺'] ?? colMap['丹符'] ?? 7;

      const id = Number(r[idCol]);
      if (isNaN(id) || id === 0) continue;

      const entry: TownEntry = {
        id,
        name: String(r[nameCol] || ''),
        story: String(r[storyCol] || ''),
        PubNpc: Number(r[pubNpcCol] || 0),
        HotelNpc: Number(r[hotelNpcCol] || 0),
        SmithyNpc: Number(r[smithyNpcCol] || 0),
        ClothesNpc: Number(r[clothesNpcCol] || 0),
        DanFuNpc: Number(r[danfuNpcCol] || 0),
      };
      towns.push(entry);
      townIdToEntry[id] = entry;
    }
  }
  return { towns, townIdToEntry };
}

export function parseGuildTable(rows: unknown[][]): { guilds: GuildEntry[]; guildIdToEntry: Record<number, GuildEntry> } {
  const guilds: GuildEntry[] = [];
  const guildIdToEntry: Record<number, GuildEntry> = {};
  if (rows.length < 5) return { guilds, guildIdToEntry };
  for (let i = 4; i < rows.length; i++) {
    const r = rows[i];
    const id = Number(r[0]);
    if (isNaN(id) || id === 0) continue;
    const entry: GuildEntry = {
      id,
      name: String(r[1] || ''),
      story: String(r[2] || ''),
      panelStory: String(r[3] || ''),
    };
    guilds.push(entry);
    guildIdToEntry[id] = entry;
  }
  return { guilds, guildIdToEntry };
}

export function parseTaskTable(rows: unknown[][]): { tasks: TaskEntry[]; taskIdToEntry: Record<number, TaskEntry> } {
  const tasks: TaskEntry[] = [];
  const taskIdToEntry: Record<number, TaskEntry> = {};
  if (rows.length < 5) return { tasks, taskIdToEntry };
  for (let i = 4; i < rows.length; i++) {
    const r = rows[i];
    const id = Number(r[0]);
    if (isNaN(id) || id === 0) continue;
    const entry: TaskEntry = {
      id,
      name: String(r[1] || ''),
      acceptTrigger: String(r[2] || ''),
      deleteTrigger: String(r[3] || ''),
      failTrigger: String(r[4] || ''),
    };
    tasks.push(entry);
    taskIdToEntry[id] = entry;
  }
  return { tasks, taskIdToEntry };
}

export function parseMapEventTable(rows: unknown[][]): { mapEvents: MapEventEntry[]; mapEventIdToEntry: Record<number, MapEventEntry> } {
  const mapEvents: MapEventEntry[] = [];
  const mapEventIdToEntry: Record<number, MapEventEntry> = {};
  if (rows.length < 5) return { mapEvents, mapEventIdToEntry };
  for (let i = 4; i < rows.length; i++) {
    const r = rows[i];
    const id = Number(r[0]);
    if (isNaN(id) || id === 0) continue;
    const entry: MapEventEntry = {
      id,
      name: String(r[1] || ''),
      trigger: String(r[2] || ''),
    };
    mapEvents.push(entry);
    mapEventIdToEntry[id] = entry;
  }
  return { mapEvents, mapEventIdToEntry };
}

export function extractGroupIds(str: string): number[] {
  const result: number[] = [];
  const parts = str.split(/[,;]/g).filter(p => p.trim());
  for (const part of parts) {
    const num = Number(part);
    if (!isNaN(num) && num > 0) result.push(num);
  }
  return result;
}

function extractGroupIdsFromTaskTrigger(str: string): number[] {
  const result: number[] = [];
  const parts = str.split(';').filter(p => p.trim());
  for (const part of parts) {
    const subParts = part.split(',');
    const gid = Number(subParts[2]);
    if (!isNaN(gid) && gid > 0) result.push(gid);
  }
  return result;
}

export function parseStoryText(
  rows: unknown[][],
  lookup: LookupTable,
  baseGroupId: number = 60001,
  baseFrameId: number = 6000101,
): { frames: StoryFrame[]; groups: StoryGroup[]; behaviors: StoryBehavior[] } {
  const dataRows = rows.slice(1);

  let chapter = '';
  let curBg = '';
  let groupMap = new Map<string, { frames: StoryFrame[]; behaviors: StoryBehavior[]; startFrame: number }>();
  let gIdx = 0;

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const col0 = String(row[0] || '').trim();

    if (col0.includes('第') && col0.includes('章')) {
      chapter = col0;
      continue;
    }

    if (col0 === '功能') continue;

    const role = String(row[2] || '').trim();
    const text = String(row[3] || '').trim();
    if (!text && !role) continue;

    if (role === '背景') {
      curBg = String(row[4] || '').trim();
      continue;
    }

    const func = String(row[1] || '').trim();
    let gKey = chapter || `ch${Math.floor(gIdx / 10)}`;

    if (func === '新对话' || func === 'new') {
      gKey = `${chapter}_${i}`;
      groupMap.set(gKey, { frames: [], behaviors: [], startFrame: baseFrameId + i * 10 });
      gIdx++;
    }

    const g = groupMap.get(gKey);
    if (!g) continue;

    const frame: StoryFrame = {
      frameId: g.startFrame + g.frames.length,
      groupId: baseGroupId + (gIdx - 1),
      name: String(row[5] || ''),
      text,
      additionPar: role || '',
      picture2: curBg || '',
      soundId: String(row[6] || ''),
      behavior: '',
      isLastFrame: false,
      autoJump: 0,
      nextFrame: 0,
      additionalText: String(row[7] || ''),
      summary: String(row[8] || ''),
    };

    if (func === '结束' || func === 'end') {
      frame.isLastFrame = true;
    } else if (func.startsWith('跳转') || func.startsWith('jump:')) {
      const m = func.match(/(\d+)/);
      if (m) {
        const target = parseInt(m[1]);
        const targetGroup = Array.from(groupMap.values()).find((g2, idx) => baseGroupId + idx === target);
        if (targetGroup) frame.autoJump = targetGroup.startFrame;
      }
    } else if (func.includes('选项') || func.includes('option')) {
      const parts = func.split(/[,;]/);
      if (parts.length >= 3) {
        const bhvId = parseInt(parts[1]) || 0;
        const param = parts[2] || '';
        frame.behavior = `1,${bhvId}`;
      }
    }

    g.frames.push(frame);
  }

  const frames: StoryFrame[] = [];
  const groups: StoryGroup[] = [];
  const behaviors: StoryBehavior[] = [];

  let gIdx2 = 0;
  for (const [key, g] of groupMap) {
    const gid = baseGroupId + gIdx2;
    const lastF = g.frames[g.frames.length - 1];
    if (lastF) lastF.isLastFrame = true;

    groups.push({
      groupId: gid,
      name: key.split('_')[0] || key,
      triggerCondition: '',
      selfAddCondition: '',
      notes: '',
    });

    frames.push(...g.frames);
    gIdx2++;
  }

  return { frames, groups, behaviors };
}

export function analyzeTriggerSources(
  groups: StoryGroup[],
  npcs: NpcEntry[],
  towns: TownEntry[],
  guilds: GuildEntry[],
  tasks: TaskEntry[],
  mapEvents: MapEventEntry[],
  frames: StoryFrame[],
  behaviors: StoryBehavior[],
  lookup: LookupTable,
): Record<number, TriggerSourceInfo[]> {
  const result: Record<number, TriggerSourceInfo[]> = {};

  const addTrigger = (groupId: number, info: TriggerSourceInfo) => {
    if (!result[groupId]) result[groupId] = [];
    result[groupId].push(info);
  };

  const npcFields = [
    { field: 'PubNpc' as const, type: 'pub' as const, name: '酒馆', colName: 'PubNpc' },
    { field: 'HotelNpc' as const, type: 'hotel' as const, name: '客栈', colName: 'HotelNpc' },
    { field: 'SmithyNpc' as const, type: 'smithy' as const, name: '铁匠', colName: 'SmithyNpc' },
    { field: 'ClothesNpc' as const, type: 'clothes' as const, name: '布坊', colName: 'ClothesNpc' },
    { field: 'DanFuNpc' as const, type: 'danfu' as const, name: '丹符', colName: 'DanFuNpc' },
  ];

  function findNpcInTowns(npcId: number): { town: TownEntry; position: string; positionType: string } | null {
    for (const town of towns) {
      for (const npcField of npcFields) {
        if (town[npcField.field] === npcId) {
          return { town, position: npcField.name, positionType: npcField.type };
        }
      }
    }
    return null;
  }

  for (const npc of npcs) {
    if (!npc.story) continue;
    const groupIds = extractGroupIds(npc.story);
    for (const gid of groupIds) {
      const townInfo = findNpcInTowns(npc.id);
      if (townInfo) {
        addTrigger(gid, {
          type: townInfo.positionType,
          sourceId: npc.id,
          sourceName: townInfo.town.name,
          detail: `访问${townInfo.town.name}的${townInfo.position}`,
          townId: townInfo.town.id,
          townName: townInfo.town.name,
          npcPosition: townInfo.position,
          npcId: npc.id,
          npcName: npc.name,
        });
      } else {
        addTrigger(gid, {
          type: 'npc',
          sourceId: npc.id,
          sourceName: npc.name,
          detail: 'NPC无法访问',
          npcId: npc.id,
          npcName: npc.name,
        });
      }
    }

    if (npc.function) {
      const funcParts = npc.function.split(';').filter(p => p.trim());
      for (const part of funcParts) {
        const [funcType, param] = part.split(',');
        if (funcType === '3' && param) {
          const gid = Number(param);
          if (!isNaN(gid) && gid > 0) {
            const townInfo = findNpcInTowns(npc.id);
            if (townInfo) {
              addTrigger(gid, {
                type: townInfo.positionType,
                sourceId: npc.id,
                sourceName: townInfo.town.name,
                detail: `访问${townInfo.town.name}的${townInfo.position}`,
                townId: townInfo.town.id,
                townName: townInfo.town.name,
                npcPosition: townInfo.position,
                npcId: npc.id,
                npcName: npc.name,
              });
            } else {
              addTrigger(gid, {
                type: 'npc',
                sourceId: npc.id,
                sourceName: npc.name,
                detail: 'NPC无法访问',
                npcId: npc.id,
                npcName: npc.name,
              });
            }
          }
        }
      }
    }
  }

  // 游戏初始剧情（2001）
  addTrigger(2001, { type: 'init', sourceId: 0, sourceName: '游戏初始', detail: '游戏开始时默认触发' });

  // 从城镇表分析城镇进入触发
  for (const town of towns) {
    if (town.story) {
      const groupIds = extractGroupIds(town.story);
      for (const gid of groupIds) {
        addTrigger(gid, { type: 'town', sourceId: town.id, sourceName: town.name, detail: '进入城镇' });
      }
    }
  }

  // 从宗门表分析宗门进入和面板触发
  for (const guild of guilds) {
    if (guild.story) {
      const groupIds = extractGroupIds(guild.story);
      for (const gid of groupIds) {
        addTrigger(gid, { type: 'guild', sourceId: guild.id, sourceName: guild.name, detail: '进入宗门' });
      }
    }
    if (guild.panelStory) {
      const parts = guild.panelStory.split(';').filter(p => p.trim());
      for (const part of parts) {
        const [btnId, gidStr] = part.split(',');
        const gid = Number(gidStr);
        if (!isNaN(gid) && gid > 0) {
          addTrigger(gid, { type: 'guild', sourceId: guild.id, sourceName: guild.name, detail: '宗门面板按钮' });
        }
      }
    }
  }

  // 从任务表分析任务触发
  for (const task of tasks) {
    if (task.acceptTrigger) {
      const groupIds = extractGroupIdsFromTaskTrigger(task.acceptTrigger);
      for (const gid of groupIds) {
        addTrigger(gid, { type: 'task', sourceId: task.id, sourceName: task.name, detail: '任务领取触发' });
      }
    }
    if (task.deleteTrigger) {
      const groupIds = extractGroupIdsFromTaskTrigger(task.deleteTrigger);
      for (const gid of groupIds) {
        addTrigger(gid, { type: 'task', sourceId: task.id, sourceName: task.name, detail: '任务删除触发' });
      }
    }
    if (task.failTrigger) {
      const groupIds = extractGroupIdsFromTaskTrigger(task.failTrigger);
      for (const gid of groupIds) {
        addTrigger(gid, { type: 'task', sourceId: task.id, sourceName: task.name, detail: '任务失败触发' });
      }
    }
  }

  // 从地图事件表分析事件触发
  for (const mapEvent of mapEvents) {
    if (mapEvent.trigger) {
      const groupIds = extractGroupIds(mapEvent.trigger);
      for (const gid of groupIds) {
        addTrigger(gid, { type: 'mapEvent', sourceId: mapEvent.id, sourceName: mapEvent.name, detail: '地图事件触发' });
      }
    }
  }

  // 从剧情组自身分析条件触发和连锁触发
  for (const group of groups) {
    const triggerCond = group.triggerCondition?.trim() || '';
    if (triggerCond) {
      addTrigger(group.groupId, { type: 'condition', sourceId: group.groupId, sourceName: group.name, detail: '条件触发' });
    }
    const selfAddCond = group.selfAddCondition?.trim() || '';
    if (selfAddCond) {
      addTrigger(group.groupId, { type: 'condition', sourceId: group.groupId, sourceName: group.name, detail: '自增条件' });
    }
  }

  return result;
}

export function exportToExcel(data: {
  groups: StoryGroup[];
  frames: StoryFrame[];
  behaviors: StoryBehavior[];
  stages: StageEntry[];
  conditions: ConditionEntry[];
}): ArrayBuffer {
  const wb = XLSX.utils.book_new();

  const groupHeader = ['组ID', '组名', '触发条件', '自增条件', '备注'];
  const groupData = data.groups.map(g => [g.groupId, g.name, g.triggerCondition, g.selfAddCondition, g.notes]);
  const groupSheet = XLSX.utils.aoa_to_sheet([groupHeader, ...groupData]);
  XLSX.utils.book_append_sheet(wb, groupSheet, 'StoryGroup');

  const frameHeader = ['帧ID', '组ID', '名称', '文本', '角色', '背景', '音效', '行为', '结束', '跳转', '下帧', '附加文本', '备注'];
  const frameData = data.frames.map(f => [
    f.frameId, f.groupId, f.name, f.text, f.additionPar,
    f.picture2, f.soundId, f.behavior, f.isLastFrame ? 1 : 0,
    f.autoJump, f.nextFrame, f.additionalText, f.summary
  ]);
  const frameSheet = XLSX.utils.aoa_to_sheet([frameHeader, ...frameData]);
  XLSX.utils.book_append_sheet(wb, frameSheet, 'StoryFrame');

  const bhvHeader = ['行为ID', '显示名', '类型', '参数', '附加行为'];
  const bhvData = data.behaviors.map(b => [b.behaviorId, b.showName, b.type, b.parameter, b.additionBehavior]);
  const bhvSheet = XLSX.utils.aoa_to_sheet([bhvHeader, ...bhvData]);
  XLSX.utils.book_append_sheet(wb, bhvSheet, 'StoryBehavior');

  if (data.stages && data.stages.length > 0) {
    const stageHeader = ['阶段ID', '名称', '剧情规则'];
    const stageData = data.stages.map(s => [s.stageId, s.name, s.stroy.map(r => `${r.groupId},${r.timing}`).join(';')]);
    const stageSheet = XLSX.utils.aoa_to_sheet([stageHeader, ...stageData]);
    XLSX.utils.book_append_sheet(wb, stageSheet, 'Stage');
  }

  if (data.conditions && data.conditions.length > 0) {
    const condHeader = ['条件ID', '名称', '类型'];
    const condData = data.conditions.map(c => [c.id, c.name, c.type]);
    const condSheet = XLSX.utils.aoa_to_sheet([condHeader, ...condData]);
    XLSX.utils.book_append_sheet(wb, condSheet, 'Condition');
  }

  return XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
}
