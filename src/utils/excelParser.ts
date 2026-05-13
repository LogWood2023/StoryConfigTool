import * as XLSX from 'xlsx';
import type {
  StoryFrame, StoryGroup, StoryBehavior, StoryData, LookupTable, StageEntry, StageStoryRule,
  ConditionEntry, NpcEntry, TownEntry, GuildEntry, TaskEntry, MapEventEntry, TriggerSourceInfo,
} from '../types';

export function readExcelSheets(buffer: ArrayBuffer): Record<string, unknown[][]> {
  const wb = XLSX.read(buffer, { type: 'array' });
  const result: Record<string, unknown[][]> = {};

  for (const sname of wb.SheetNames) {
    const ws = wb.Sheets[sname];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as unknown[][];
    if (data.length > 0 && data.some((row) => row.some((c) => c !== '' && c !== null))) {
      result[sname] = data;
    }
  }
  return result;
}

function baseName(filename: string): string {
  const name = filename.split(/[\\/]/).pop() || filename;
  return name.replace(/\.[^.]*$/, '').toUpperCase();
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
  for (let i = 4; i < rows.length; i++) {
    const r = rows[i];
    const id = Number(r[0]);
    if (isNaN(id) || id === 0) continue;
    const isLastVal = String(r[5] || '').trim();
    let isLastFrame = false;
    let autoJump: number | null = null;
    if (isLastVal.startsWith('1,')) {
      isLastFrame = true;
      const parts = isLastVal.split(',');
      autoJump = Number(parts[1]) || null;
    } else if (isLastVal === '1' || isLastVal.toLowerCase() === 'true') {
      isLastFrame = true;
    }
    frames.push({
      frameId: id,
      name: String(r[1] || ''),
      type: Number(r[2]) || 1,
      groupId: Number(r[3]) || 0,
      nextFrame: r[4] ? Number(r[4]) : null,
      isLastFrame,
      autoJump,
      behavior: String(r[6] || ''),
      picture: String(r[7] || ''),
      picture2: String(r[8] || ''),
      soundId: r[9] ? String(r[9]) : '',
      text: String(r[10] || ''),
      additionalText: String(r[11] || ''),
      additionPar: String(r[12] || ''),
      summary: String(r[13] || ''),
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
      name: String(r[1] || ''),
      showName: String(r[2] || ''),
      type: Number(r[3]) || 0,
      markId: String(r[4] || ''),
      parameter: String(r[5] || ''),
      additionBehavior: String(r[7] || ''),
    });
  }
  return behaviors;
}

export function parseNpcTable(rows: unknown[][]): Record<string, number> {
  const map: Record<string, number> = {};
  if (rows.length < 5) return map;
  for (let i = 4; i < rows.length; i++) {
    const r = rows[i];
    const id = Number(r[0]);
    const name = String(r[1] || '').trim();
    if (!isNaN(id) && name) {
      map[name] = id;
    }
  }
  return map;
}

export function parseStageTable(rows: unknown[][]): { stages: StageEntry[]; stageIdToEntry: Record<number, StageEntry> } {
  const stages: StageEntry[] = [];
  const stageIdToEntry: Record<number, StageEntry> = {};
  if (rows.length < 5) return { stages, stageIdToEntry };
  for (let i = 4; i < rows.length; i++) {
    const r = rows[i];
    const stageId = Number(r[0]);
    if (isNaN(stageId) || stageId === 0) continue;
    const name = String(r[3] || '');
    const groupId = Number(r[1]) || 0;
    const stroyRaw = String(r[30] || '').trim();
    const stroy: StageStoryRule[] = [];
    if (stroyRaw) {
      const segs = stroyRaw.split(';').filter(s => s.trim());
      for (const seg of segs) {
        const parts = seg.split(',');
        const timing = Number(parts[0]) || 0;
        const sGid = Number(parts[1]) || 0;
        const extra = parts[2] || '';
        if (timing && sGid) stroy.push({ timing, groupId: sGid, extraParam: extra });
      }
    }
    const entry: StageEntry = { stageId, name, groupId, stroy };
    stages.push(entry);
    stageIdToEntry[stageId] = entry;
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
    const name = String(r[1] || '');
    const type = Number(r[2]) || 1;
    const param = String(r[3] || '');
    const entry: ConditionEntry = { id, name, type, param };
    conditions.push(entry);
    conditionIdToEntry[id] = entry;
  }
  return { conditions, conditionIdToEntry };
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
    const eventId = Number(r[0]);
    if (isNaN(eventId) || eventId === 0) continue;
    const entry: MapEventEntry = {
      eventId,
      name: String(r[1] || ''),
      eventType: Number(r[2]) || 0,
      customParam: String(r[3] || ''),
      triggerMode: Number(r[4]) || 0,
    };
    mapEvents.push(entry);
    mapEventIdToEntry[eventId] = entry;
  }
  return { mapEvents, mapEventIdToEntry };
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

  // 游戏初始剧情（2001）
  addTrigger(2001, { type: 'init', sourceId: 0, sourceName: '游戏初始', detail: '游戏开始时默认触发' });

  for (const npc of npcs) {
    if (npc.story) {
      const groupIds = extractGroupIds(npc.story);
      for (const gid of groupIds) {
        addTrigger(gid, { type: 'npc', sourceId: npc.id, sourceName: npc.name, detail: 'NPC强制剧情' });
      }
    }
    if (npc.function) {
      const funcParts = npc.function.split(';').filter(p => p.trim());
      for (const part of funcParts) {
        const [funcType, param] = part.split(',');
        if (funcType === '3' && param) {
          const gid = Number(param);
          if (!isNaN(gid) && gid > 0) {
            addTrigger(gid, { type: 'npc', sourceId: npc.id, sourceName: npc.name, detail: 'NPC按钮剧情' });
          }
        }
      }
    }
  }

  for (const town of towns) {
    if (town.story) {
      const groupIds = extractGroupIds(town.story);
      for (const gid of groupIds) {
        addTrigger(gid, { type: 'town', sourceId: town.id, sourceName: town.name, detail: '进入城镇' });
      }
    }
    // 处理城镇NPC引用
    const npcTypes = [
      { field: 'PubNpc', type: 'pub' as const, name: '酒馆' },
      { field: 'HotelNpc', type: 'hotel' as const, name: '客栈' },
      { field: 'SmithyNpc', type: 'smithy' as const, name: '铁匠铺' },
      { field: 'ClothesNpc', type: 'clothes' as const, name: '布坊' },
      { field: 'DanFuNpc', type: 'danfu' as const, name: '丹符铺' },
    ];
    for (const npcType of npcTypes) {
      const npcId = town[npcType.field];
      if (npcId) {
        const npc = lookup.npcIdToEntry[npcId];
        if (npc && npc.story) {
          const groupIds = extractGroupIds(npc.story);
          for (const gid of groupIds) {
            addTrigger(gid, { type: npcType.type, sourceId: town.id, sourceName: `${town.name}-${npcType.name}`, detail: `点击${town.name}${npcType.name}，访问NPC ${npc.name}` });
          }
        }
        if (npc && npc.function) {
          const funcParts = npc.function.split(';').filter(p => p.trim());
          for (const part of funcParts) {
            const [funcType, param] = part.split(',');
            if (funcType === '3' && param) {
              const gid = Number(param);
              if (!isNaN(gid) && gid > 0) {
                addTrigger(gid, { type: npcType.type, sourceId: town.id, sourceName: `${town.name}-${npcType.name}`, detail: `点击${town.name}${npcType.name}按钮，访问NPC ${npc.name}` });
              }
            }
          }
        }
      }
    }
  }

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

  for (const task of tasks) {
    if (task.acceptTrigger) {
      const groupIds = extractGroupIdsFromTaskTrigger(task.acceptTrigger);
      for (const gid of groupIds) {
        addTrigger(gid, { type: 'task', sourceId: task.id, sourceName: task.name, detail: '任务领取' });
      }
    }
    if (task.deleteTrigger) {
      const groupIds = extractGroupIdsFromTaskTrigger(task.deleteTrigger);
      for (const gid of groupIds) {
        addTrigger(gid, { type: 'task', sourceId: task.id, sourceName: task.name, detail: '任务删除' });
      }
    }
    if (task.failTrigger) {
      const groupIds = extractGroupIdsFromTaskTrigger(task.failTrigger);
      for (const gid of groupIds) {
        addTrigger(gid, { type: 'task', sourceId: task.id, sourceName: task.name, detail: '任务失败' });
      }
    }
  }

  for (const evt of mapEvents) {
    if (evt.eventType === 2 || evt.eventType === 4) {
      if (evt.triggerMode === 1 && evt.customParam) {
        const gid = Number(evt.customParam);
        if (!isNaN(gid) && gid > 0) {
          addTrigger(gid, { type: 'mapEvent', sourceId: evt.eventId, sourceName: evt.name, detail: '地图事件触发' });
        }
      } else if (evt.eventType === 4 && evt.customParam) {
        const gid = Number(evt.customParam);
        if (!isNaN(gid) && gid > 0) {
          addTrigger(gid, { type: 'mapEvent', sourceId: evt.eventId, sourceName: evt.name, detail: 'NPC/剧情事件' });
        }
      }
    }
  }

  for (const group of groups) {
    if (group.triggerCondition) {
      addTrigger(group.groupId, { type: 'condition', sourceId: group.groupId, sourceName: group.name, detail: '条件触发' });
    }
  }

  for (const frame of frames) {
    if (frame.autoJump) {
      addTrigger(frame.autoJump, { type: 'chain', sourceId: frame.frameId, sourceName: frame.groupId.toString(), detail: '剧情连锁' });
    }
  }

  for (const behavior of behaviors) {
    if (behavior.type === 2 && behavior.parameter) {
      const gid = Number(behavior.parameter);
      if (!isNaN(gid) && gid > 0) {
        addTrigger(gid, { type: 'behavior', sourceId: behavior.behaviorId, sourceName: behavior.showName || behavior.name, detail: '行为触发' });
      }
    }
  }

  return result;
}

function extractGroupIds(str: string): number[] {
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
  const rawRows: { type: string; func: string; role: string; dlg: string; expr: string; anim: string; snd: string; bg: string }[] = [];

  for (const r of dataRows) {
    const func = String(r[1] || '').trim();
    const role = String(r[2] || '').trim();
    const dlg = String(r[3] || '').trim();
    const expr = String(r[4] || '').trim();
    const anim = String(r[5] || '').trim();
    const snd = String(r[6] || '').trim();
    const chap = String(r[0] || '').trim();

    if (chap) chapter = chap;

    if (dlg.startsWith('背景：') && !role && !func) {
      curBg = dlg.slice(3);
      rawRows.push({ type: 'bg', func: '', role: '', dlg: '', expr: '', anim: '', snd: '', bg: curBg });
      continue;
    }
    if (!dlg && !role && !func) continue;

    rawRows.push({ type: 'line', func, role, dlg, expr, anim, snd, bg: curBg });
  }

  if (!rawRows.length) return { frames: [], groups: [], behaviors: [] };

  const segs: typeof rawRows[] = [];
  let cur: typeof rawRows = [];
  for (const r of rawRows) {
    if (r.type === 'bg') { cur.push(r); continue; }
    cur.push(r);
    if (r.func === '*' || r.func.startsWith('选项：')) { segs.push([...cur]); cur = []; }
  }
  if (cur.length) segs.push([...cur]);

  const groups: StoryGroup[] = [];
  const behaviors: StoryBehavior[] = [];
  const frames: StoryFrame[] = [];
  let gid = baseGroupId;
  let fid = baseFrameId;

  for (const seg of segs) {
    const lines = seg.filter(r => r.type === 'line');
    if (!lines.length) continue;

    const allOpt = lines.every(r => r.func.startsWith('选项：'));
    if (allOpt && frames.length) {
      for (const row of lines) {
        const raw = row.func.slice(3).trim();
        const names = raw.split('/').map(o => o.trim()).filter(Boolean);
        const parts: string[] = [];
        for (let oi = 0; oi < names.length; oi++) {
          const bId = gid * 10000 + 61 + oi;
          parts.push(`${oi + 1},${bId}`);
          behaviors.push({ behaviorId: bId, name: `选择${names[oi]}`, showName: names[oi], type: 2, markId: '', parameter: String(gid + oi), additionBehavior: '' });
        }
        frames[frames.length - 1].behavior = parts.join(';');
        frames[frames.length - 1].isLastFrame = true;
      }
      continue;
    }

    groups.push({ groupId: gid, name: chapter || `剧情${gid}`, triggerCondition: '', selfAddCondition: '', notes: '' });

    for (let li = 0; li < lines.length; li++) {
      const row = lines[li];
      const isLast = (li === lines.length - 1);

      const npcId = lookup.npcMap[row.role] ?? 0;
      const exprId = lookup.expressionMap[row.expr] ?? 0;
      const animV = lookup.animMap[row.anim] ?? 0;
      const bgPath = lookup.bgMap[row.bg] ?? (row.bg ? `story/${row.bg}` : '');
      const sndV = lookup.soundMap[row.snd] ?? (row.snd || '');

      let ad = '';
      if (row.role && row.role !== '旁白' && npcId > 0) {
        ad = `${npcId},1,1,${exprId},${animV}`;
      }

      let kt = row.dlg;
      let lt = '';
      const m = kt.match(/<(.+?)\/(.+?)>/);
      if (m) { lt = `1+${m[1]}|2+${m[2]}`; kt = kt.replace(/<.+?\/.+?>/, '{0}'); }

      frames.push({
        frameId: fid,
        name: row.role ? `${row.role}-${kt.slice(0, 15)}` : `旁白-${kt.slice(0, 15)}`,
        type: 1,
        groupId: gid,
        nextFrame: isLast ? null : fid + 1,
        isLastFrame: isLast,
        autoJump: null,
        behavior: '',
        picture: '',
        picture2: bgPath,
        soundId: sndV,
        text: kt,
        additionalText: lt,
        additionPar: ad,
        summary: chapter || `剧情组${gid}`,
      });
      fid++;
    }
    gid++;
  }

  lookup.npcIdToName = Object.fromEntries(
    Object.entries(lookup.npcMap).map(([k, v]) => [v, k])
  );

  return { frames, groups, behaviors };
}

export async function loadStoryDataFromFolder(
  folderPath: string,
): Promise<StoryData> {
  const result: StoryData = {
    groups: [],
    frames: [],
    behaviors: [],
    stages: [],
    conditions: [],
    npcs: [],
    towns: [],
    guilds: [],
    tasks: [],
    mapEvents: [],
    lookup: {
      npcMap: {},
      npcIdToName: {},
      npcIdToEntry: {},
      stageIdToEntry: {},
      conditionIdToEntry: {},
      townIdToEntry: {},
      guildIdToEntry: {},
      taskIdToEntry: {},
      mapEventIdToEntry: {},
      groupIdToTriggers: {},
      expressionMap: {
        '': 0, '0': 0, '平静': 1001, '伤心': 1001, '喜欢': 1003, '疑问': 1004,
        '疑惑': 1004, '惊讶': 1005, '恐惧': 1006, '生气': 1007, '开心': 1007,
        '悲伤': 1008, '思考': 1008, '委屈': 1009, '尴尬': 1010, '鬼脸': 1011,
      },
      bgMap: {
        '家里': 'story/ShiNei-BaiTian1', '超市': 'story/ShiNei-YeWan1',
        '室内-白天': 'story/ShiNei-BaiTian1', '室内-夜晚': 'story/ShiNei-YeWan1',
      },
      soundMap: { '收银': '1004', '脚步声': '1001', '狼嚎': '1004', '叹息': '1007' },
      animMap: { '跳跳': 2, '跳动': 2, '放大': 1, '上下震动': 2, '往前突一下': 3 },
    },
    sourceFiles: [],
  };

  return result;
}

export function parseAllFiles(
  fileMap: Record<string, ArrayBuffer>,
): StoryData {
  const lookup: LookupTable = {
    npcMap: {},
    npcIdToName: {},
    npcIdToEntry: {},
    stageIdToEntry: {},
    conditionIdToEntry: {},
    townIdToEntry: {},
    guildIdToEntry: {},
    taskIdToEntry: {},
    mapEventIdToEntry: {},
    groupIdToTriggers: {},
    expressionMap: {
      '': 0, '0': 0, '平静': 1001, '伤心': 1001, '喜欢': 1003, '疑问': 1004,
      '疑惑': 1004, '惊讶': 1005, '恐惧': 1006, '生气': 1007, '开心': 1007,
      '悲伤': 1008, '思考': 1008, '委屈': 1009, '尴尬': 1010, '鬼脸': 1011,
    },
    bgMap: {
      '家里': 'story/ShiNei-BaiTian1', '超市': 'story/ShiNei-YeWan1',
      '室内-白天': 'story/ShiNei-BaiTian1', '室内-夜晚': 'story/ShiNei-YeWan1',
    },
    soundMap: { '收银': '1004', '脚步声': '1001', '狼嚎': '1004', '叹息': '1007' },
    animMap: { '跳跳': 2, '跳动': 2, '放大': 1, '上下震动': 2, '往前突一下': 3 },
  };

  let groups: StoryGroup[] = [];
  let frames: StoryFrame[] = [];
  let behaviors: StoryBehavior[] = [];
  let stageEntries: StageEntry[] = [];
  let conditionEntries: ConditionEntry[] = [];
  let npcEntries: NpcEntry[] = [];
  let townEntries: TownEntry[] = [];
  let guildEntries: GuildEntry[] = [];
  let taskEntries: TaskEntry[] = [];
  let mapEventEntries: MapEventEntry[] = [];

  for (const [fname, buffer] of Object.entries(fileMap)) {
    const sheets = readExcelSheets(buffer);

    for (const [, sheetRows] of Object.entries(sheets)) {
      if (!sheetRows.length) continue;
      const type = detectTableType(fname, sheetRows);

      if (type === 'Npc') {
        const parsed = parseNpcFullTable(sheetRows);
        npcEntries = npcEntries.concat(parsed.npcs);
        Object.assign(lookup.npcMap, parsed.npcMap);
        Object.assign(lookup.npcIdToEntry, parsed.npcIdToEntry);
      } else if (type === 'Stage') {
        const parsed = parseStageTable(sheetRows);
        stageEntries = stageEntries.concat(parsed.stages);
        Object.assign(lookup.stageIdToEntry, parsed.stageIdToEntry);
      } else if (type === 'Condition') {
        const parsed = parseConditionTable(sheetRows);
        conditionEntries = conditionEntries.concat(parsed.conditions);
        Object.assign(lookup.conditionIdToEntry, parsed.conditionIdToEntry);
      } else if (type === 'Town') {
        const parsed = parseTownTable(sheetRows);
        townEntries = townEntries.concat(parsed.towns);
        Object.assign(lookup.townIdToEntry, parsed.townIdToEntry);
      } else if (type === 'Guild') {
        const parsed = parseGuildTable(sheetRows);
        guildEntries = guildEntries.concat(parsed.guilds);
        Object.assign(lookup.guildIdToEntry, parsed.guildIdToEntry);
      } else if (type === 'Task') {
        const parsed = parseTaskTable(sheetRows);
        taskEntries = taskEntries.concat(parsed.tasks);
        Object.assign(lookup.taskIdToEntry, parsed.taskIdToEntry);
      } else if (type === 'MapEvent') {
        const parsed = parseMapEventTable(sheetRows);
        mapEventEntries = mapEventEntries.concat(parsed.mapEvents);
        Object.assign(lookup.mapEventIdToEntry, parsed.mapEventIdToEntry);
      } else if (type === 'StoryGroup') {
        groups = groups.concat(parseStoryGroup(sheetRows));
      } else if (type === 'StoryFrame') {
        frames = frames.concat(parseStoryFrame(sheetRows));
      } else if (type === 'StoryBehavior') {
        behaviors = behaviors.concat(parseStoryBehavior(sheetRows));
      } else if (type === 'StoryText') {
        const result = parseStoryText(sheetRows, lookup);
        groups = groups.concat(result.groups);
        frames = frames.concat(result.frames);
        behaviors = behaviors.concat(result.behaviors);
      }
    }
  }

  lookup.npcIdToName = Object.fromEntries(
    Object.entries(lookup.npcMap).map(([k, v]) => [v, k])
  );

  lookup.groupIdToTriggers = analyzeTriggerSources(
    groups,
    npcEntries,
    townEntries,
    guildEntries,
    taskEntries,
    mapEventEntries,
    frames,
    behaviors,
    lookup,
  );

  return {
    groups,
    frames,
    behaviors,
    stages: stageEntries,
    conditions: conditionEntries,
    npcs: npcEntries,
    towns: townEntries,
    guilds: guildEntries,
    tasks: taskEntries,
    mapEvents: mapEventEntries,
    lookup,
    sourceFiles: Object.keys(fileMap),
  };
}

export function framesToExcelRows(frames: StoryFrame[]): unknown[][] {
  const header = [
    '演出帧id', '名字', 'Type', '演出组id', '下个演出帧id',
    '是否最后一帧', '行为参数', '美术资源', '美术资源_2',
    '声音id', '文本', '附加文本', '附加参数', '剧情梗概',
  ];
  const rows: unknown[][] = [header];
  for (const f of frames) {
    rows.push([
      f.frameId, f.name, f.type, f.groupId, f.nextFrame ?? '',
      f.isLastFrame ? '1' : '', f.behavior, f.picture, f.picture2,
      f.soundId, f.text, f.additionalText, f.additionPar, f.summary,
    ]);
  }
  return rows;
}

export function groupsToExcelRows(groups: StoryGroup[]): unknown[][] {
  const header = ['剧情组id', '名字', '触发条件', '自增条件Id', '备注'];
  const rows: unknown[][] = [header];
  for (const g of groups) {
    rows.push([g.groupId, g.name, g.triggerCondition, g.selfAddCondition, g.notes]);
  }
  return rows;
}

export function behaviorsToExcelRows(behaviors: StoryBehavior[]): unknown[][] {
  const header = ['行为id', '名字', '显示文本', '行为类型', '状态标记id', '行为参数'];
  const rows: unknown[][] = [header];
  for (const b of behaviors) {
    rows.push([b.behaviorId, b.name, b.showName, b.type, b.markId, b.parameter]);
  }
  return rows;
}

export function exportToExcel(
  frames: StoryFrame[],
  groups: StoryGroup[],
  behaviors: StoryBehavior[],
): void {
  const wb = XLSX.utils.book_new();

  const frameSheet = XLSX.utils.aoa_to_sheet(framesToExcelRows(frames));
  XLSX.utils.book_append_sheet(wb, frameSheet, 'StoryFrame');

  const groupSheet = XLSX.utils.aoa_to_sheet(groupsToExcelRows(groups));
  XLSX.utils.book_append_sheet(wb, groupSheet, 'StoryGroup');

  if (behaviors.length > 0) {
    const bhvSheet = XLSX.utils.aoa_to_sheet(behaviorsToExcelRows(behaviors));
    XLSX.utils.book_append_sheet(wb, bhvSheet, 'StoryBehavior');
  }

  XLSX.writeFile(wb, '剧情配置导出.xlsx');
}
