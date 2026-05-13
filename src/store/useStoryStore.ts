import { create } from 'zustand';
import type { StoryFrame, StoryGroup, StoryBehavior, StoryData, LookupTable, StageEntry, ConditionEntry, NpcEntry, TownEntry, GuildEntry, TaskEntry, MapEventEntry } from '../types';
import { readExcelSheets, parseStoryFrame, parseStoryGroup, parseStoryBehavior, parseNpcTable, parseStoryText, parseStageTable, parseConditionTable, parseNpcFullTable, parseTownTable, parseGuildTable, parseTaskTable, parseMapEventTable, analyzeTriggerSources } from '../utils/excelParser';

// --- 撤销/重做历史栈 ---
interface Snapshot {
  groups: StoryGroup[]; frames: StoryFrame[]; behaviors: StoryBehavior[]; stages: StageEntry[]; conditions: ConditionEntry[];
  npcs: NpcEntry[]; towns: TownEntry[]; guilds: GuildEntry[]; tasks: TaskEntry[]; mapEvents: MapEventEntry[];
  selectedFrameId: number | null; selectedGroupId: number | null; selectedParagraphIdx: number | null; selectedOptionBehaviorId: number | null; selectedTriggerGroupId: number | null;
}
const MAX_HISTORY = 50;

interface AppState {
  data: StoryData;
  loading: boolean;
  error: string | null;
  selectedFrameId: number | null;
  selectedGroupId: number | null;
  selectedParagraphIdx: number | null;
  selectedOptionBehaviorId: number | null;
  selectedTriggerGroupId: number | null;
  loadedFiles: string[];
  draftFiles: string[];
  groupSearch: string;
  setGroupSearch: (v: string) => void;

  visibleGroups: Set<number>;
  toggleGroup: (gid: number) => void;
  setAllGroupsVisible: (visible: boolean) => void;
  setData: (data: StoryData) => void;
  setLoading: (v: boolean) => void;
  setError: (e: string | null) => void;
  selectFrame: (id: number | null) => void;
  selectGroup: (id: number | null, paragraphIdx?: number | null) => void;
  selectOption: (behaviorId: number | null) => void;
  selectTrigger: (groupId: number | null) => void;
  loadFiles: (fileMap: Record<string, ArrayBuffer>) => void;
  loadDraftFiles: (fileMap: Record<string, ArrayBuffer>) => void;
  updateFrame: (frameId: number, updates: Partial<StoryFrame>) => void;
  updateGroup: (groupId: number, updates: Partial<StoryGroup>) => void;
  updateBehavior: (behaviorId: number, updates: Partial<StoryBehavior>) => void;
  addFrame: (frame: StoryFrame) => void;
  deleteFrame: (frameId: number) => void;
  loadFromFolder: (files: FileList) => void;
  loadDraftFromFolder: (files: FileList) => void;

  // 撤销/重做
  canUndo: boolean; canRedo: boolean;
  undo: () => void; redo: () => void;
  _history: Snapshot[]; _future: Snapshot[];
  _takeSnapshot: () => void;
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

  if (rows.length >= 2) {
    const row0 = rows[0].map((c: unknown) => String(c).trim());
    // 范例文本格式: 表头必须同时包含 章节/功能/角色/台词 四列
    if (row0.includes('章节') && row0.includes('功能') && row0.includes('角色') && row0.includes('台词')) return 'StoryText';
  }
  if (rows.length >= 5) {
    const row0 = rows[0].map((c: unknown) => String(c).trim());
    // 标准表: 仅通过文件名识别 (上面已处理), 内容检测仅用于范例文本格式
    // 确保不误识别其他表 (如 ZhenyuanSuit.xlsx 有 Id/Name 但不是 NPC 表)
  }
  return null;
}

export const useStoryStore = create<AppState>((set, get) => ({
  data: { groups: [], frames: [], behaviors: [], stages: [], conditions: [], lookup: createDefaultLookup(), sourceFiles: [] },
  loading: false, error: null,
  selectedFrameId: null, selectedGroupId: null, selectedParagraphIdx: null, selectedOptionBehaviorId: null, selectedTriggerGroupId: null,
  loadedFiles: [], draftFiles: [], groupSearch: '',
  setGroupSearch: (v) => set({ groupSearch: v }),
  visibleGroups: new Set<number>(),

  // 撤销/重做
  canUndo: false, canRedo: false,
  _history: [], _future: [],

  _takeSnapshot: () => {
    const d = get().data;
    const snap: Snapshot = {
      groups: d.groups.map(g => ({ ...g })),
      frames: d.frames.map(f => ({ ...f })),
      behaviors: d.behaviors.map(b => ({ ...b })),
      stages: d.stages.map(s => ({ ...s })),
      conditions: d.conditions.map(c => ({ ...c })),
      npcs: d.npcs?.map(n => ({ ...n })) || [],
      towns: d.towns?.map(t => ({ ...t })) || [],
      guilds: d.guilds?.map(g => ({ ...g })) || [],
      tasks: d.tasks?.map(t => ({ ...t })) || [],
      mapEvents: d.mapEvents?.map(e => ({ ...e })) || [],
      selectedFrameId: get().selectedFrameId,
      selectedGroupId: get().selectedGroupId,
      selectedParagraphIdx: get().selectedParagraphIdx,
      selectedOptionBehaviorId: get().selectedOptionBehaviorId,
      selectedTriggerGroupId: get().selectedTriggerGroupId,
    };
    const h = [...get()._history, snap];
    if (h.length > MAX_HISTORY) h.shift();
    set({ _history: h, _future: [], canUndo: h.length > 1, canRedo: false });
  },

  undo: () => {
    const h = get()._history;
    if (h.length < 2) return;
    const current = h[h.length - 1];
    const prev = h[h.length - 2];
    set({
      _history: h.slice(0, -1),
      _future: [current, ...get()._future],
      data: {
        ...get().data,
        groups: prev.groups,
        frames: prev.frames,
        behaviors: prev.behaviors,
        stages: prev.stages,
        conditions: prev.conditions,
        npcs: prev.npcs,
        towns: prev.towns,
        guilds: prev.guilds,
        tasks: prev.tasks,
        mapEvents: prev.mapEvents,
      },
      selectedFrameId: prev.selectedFrameId,
      selectedGroupId: prev.selectedGroupId,
      selectedParagraphIdx: prev.selectedParagraphIdx,
      selectedOptionBehaviorId: prev.selectedOptionBehaviorId,
      selectedTriggerGroupId: prev.selectedTriggerGroupId,
      canUndo: h.length > 2,
      canRedo: true,
    });
  },

  redo: () => {
    const f = get()._future;
    if (f.length === 0) return;
    const next = f[0];
    set({
      _history: [...get()._history, next],
      _future: f.slice(1),
      data: {
        ...get().data,
        groups: next.groups,
        frames: next.frames,
        behaviors: next.behaviors,
        stages: next.stages,
        conditions: next.conditions,
        npcs: next.npcs,
        towns: next.towns,
        guilds: next.guilds,
        tasks: next.tasks,
        mapEvents: next.mapEvents,
      },
      selectedFrameId: next.selectedFrameId,
      selectedGroupId: next.selectedGroupId,
      selectedParagraphIdx: next.selectedParagraphIdx,
      selectedOptionBehaviorId: next.selectedOptionBehaviorId,
      selectedTriggerGroupId: next.selectedTriggerGroupId,
      canUndo: true,
      canRedo: f.length > 1,
    });
  },

  toggleGroup: (gid) => {
    const vg = new Set(get().visibleGroups);
    if (vg.has(gid)) vg.delete(gid); else vg.add(gid);
    set({ visibleGroups: vg });
  },

  setAllGroupsVisible: (visible) => {
    if (visible) {
      set({ visibleGroups: new Set(get().data.groups.map(g => g.groupId)) });
    } else {
      set({ visibleGroups: new Set() });
    }
  },

  setData: (data) => set({ data, error: null }),
  setLoading: (v) => set({ loading: v }),
  setError: (e) => set({ error: e }),

  selectFrame: (id) => {
    get()._takeSnapshot();
    set({ selectedFrameId: id, selectedGroupId: null, selectedParagraphIdx: null, selectedOptionBehaviorId: null, selectedTriggerGroupId: null });
  },

  selectOption: (behaviorId) => {
    get()._takeSnapshot();
    set({ selectedOptionBehaviorId: behaviorId, selectedFrameId: null, selectedGroupId: null, selectedParagraphIdx: null, selectedTriggerGroupId: null });
  },

  selectGroup: (id, paragraphIdx = null) => {
    get()._takeSnapshot();
    set({ selectedGroupId: id, selectedParagraphIdx: paragraphIdx, selectedFrameId: null, selectedOptionBehaviorId: null, selectedTriggerGroupId: null });
  },

  selectTrigger: (groupId) => {
    get()._takeSnapshot();
    set({ selectedTriggerGroupId: groupId, selectedFrameId: null, selectedGroupId: null, selectedParagraphIdx: null, selectedOptionBehaviorId: null });
  },

  loadFiles: (fileMap) => {
    set({ loading: true });
    try {
      let groups: StoryGroup[] = []; let frames: StoryFrame[] = []; let behaviors: StoryBehavior[] = [];
      let npcMap: Record<string, number> = {};
      let stageEntries: StageEntry[] = [];
      let stageIdToEntry: Record<number, StageEntry> = {};
      let conditionEntries: ConditionEntry[] = [];
      let conditionIdToEntry: Record<number, ConditionEntry> = {};
      let npcEntries: NpcEntry[] = [];
      let npcIdToEntry: Record<number, NpcEntry> = {};
      let townEntries: TownEntry[] = [];
      let townIdToEntry: Record<number, TownEntry> = {};
      let guildEntries: GuildEntry[] = [];
      let guildIdToEntry: Record<number, GuildEntry> = {};
      let taskEntries: TaskEntry[] = [];
      let taskIdToEntry: Record<number, TaskEntry> = {};
      let mapEventEntries: MapEventEntry[] = [];
      let mapEventIdToEntry: Record<number, MapEventEntry> = {};

      // 第一遍: 收集所有 NPC、Stage、Condition 等表数据
      for (const [fname, buffer] of Object.entries(fileMap)) {
        const sheets = readExcelSheets(buffer);
        for (const [, sheetRows] of Object.entries(sheets)) {
          if (!sheetRows.length) continue;
          const tt = detectTableType(fname, sheetRows);
          if (tt === 'Npc') {
            const parsed = parseNpcFullTable(sheetRows);
            npcEntries = npcEntries.concat(parsed.npcs);
            Object.assign(npcMap, parsed.npcMap);
            Object.assign(npcIdToEntry, parsed.npcIdToEntry);
          } else if (tt === 'Stage') {
            const parsed = parseStageTable(sheetRows);
            stageEntries = stageEntries.concat(parsed.stages);
            Object.assign(stageIdToEntry, parsed.stageIdToEntry);
          } else if (tt === 'Condition') {
            const parsed = parseConditionTable(sheetRows);
            conditionEntries = conditionEntries.concat(parsed.conditions);
            Object.assign(conditionIdToEntry, parsed.conditionIdToEntry);
          } else if (tt === 'Town') {
            const parsed = parseTownTable(sheetRows);
            townEntries = townEntries.concat(parsed.towns);
            Object.assign(townIdToEntry, parsed.townIdToEntry);
          } else if (tt === 'Guild') {
            const parsed = parseGuildTable(sheetRows);
            guildEntries = guildEntries.concat(parsed.guilds);
            Object.assign(guildIdToEntry, parsed.guildIdToEntry);
          } else if (tt === 'Task') {
            const parsed = parseTaskTable(sheetRows);
            taskEntries = taskEntries.concat(parsed.tasks);
            Object.assign(taskIdToEntry, parsed.taskIdToEntry);
          } else if (tt === 'MapEvent') {
            const parsed = parseMapEventTable(sheetRows);
            mapEventEntries = mapEventEntries.concat(parsed.mapEvents);
            Object.assign(mapEventIdToEntry, parsed.mapEventIdToEntry);
          }
        }
      }

      // 第二遍: 用完整的 npcMap 解析所有表
      for (const [fname, buffer] of Object.entries(fileMap)) {
        const sheets = readExcelSheets(buffer);
        for (const [, sheetRows] of Object.entries(sheets)) {
          if (!sheetRows.length) continue;
          const type = detectTableType(fname, sheetRows);
          if (type === 'Npc') { /* already done */ }
          else if (type === 'Stage') { /* already done */ }
          else if (type === 'Condition') { /* already done */ }
          else if (type === 'Town') { /* already done */ }
          else if (type === 'Guild') { /* already done */ }
          else if (type === 'Task') { /* already done */ }
          else if (type === 'MapEvent') { /* already done */ }
          else if (type === 'StoryGroup') { groups = groups.concat(parseStoryGroup(sheetRows)); }
          else if (type === 'StoryFrame') { frames = frames.concat(parseStoryFrame(sheetRows)); }
          else if (type === 'StoryBehavior') { behaviors = behaviors.concat(parseStoryBehavior(sheetRows)); }
          else if (type === 'StoryText') {
            const lookup = { ...createDefaultLookup(), npcMap, stageIdToEntry };
            const r = parseStoryText(sheetRows, lookup);
            groups = groups.concat(r.groups); frames = frames.concat(r.frames);
            behaviors = behaviors.concat(r.behaviors);
          }
        }
      }
      const lookup = createDefaultLookup();
      if (Object.keys(npcMap).length > 0) {
        lookup.npcMap = npcMap;
        lookup.npcIdToName = Object.fromEntries(
          Object.entries(npcMap).map(([k, v]) => [v, k])
        );
      }
      lookup.npcIdToEntry = npcIdToEntry;
      lookup.stageIdToEntry = stageIdToEntry;
      lookup.conditionIdToEntry = conditionIdToEntry;
      lookup.townIdToEntry = townIdToEntry;
      lookup.guildIdToEntry = guildIdToEntry;
      lookup.taskIdToEntry = taskIdToEntry;
      lookup.mapEventIdToEntry = mapEventIdToEntry;

      // 分析所有触发方式
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

      // 检查缺失的必需表
      const loadedFilenames = Object.keys(fileMap);
      const hasNpc = Object.keys(npcMap).length > 0;
      const hasFrames = frames.length > 0;
      const hasGroups = groups.length > 0;
      const missing: string[] = [];
      if (!hasNpc) missing.push('Npc.xlsx (NPC名称映射)');
      if (!hasFrames) missing.push('StoryFrame.xlsx (演出帧数据)');
      if (!hasGroups) missing.push('StoryGroup.xlsx (剧情组数据)');
      const errMsg = missing.length > 0
        ? `配置文件夹缺少以下表格:\n${missing.map(m=>'  • '+m).join('\n')}\n\n已加载: ${loadedFilenames.join(', ') || '(无)'}`
        : null;

      const snap: Snapshot = {
        groups: groups.map(g=>({...g})),
        frames: frames.map(f=>({...f})),
        behaviors: behaviors.map(b=>({...b})),
        stages: stageEntries.map(s=>({...s})),
        conditions: conditionEntries.map(c=>({...c})),
        npcs: npcEntries.map(n=>({...n})),
        towns: townEntries.map(t=>({...t})),
        guilds: guildEntries.map(g=>({...g})),
        tasks: taskEntries.map(t=>({...t})),
        mapEvents: mapEventEntries.map(e=>({...e})),
        selectedFrameId:null, selectedGroupId:null, selectedParagraphIdx:null, selectedOptionBehaviorId:null, selectedTriggerGroupId:null
      };
      set({
        data: {
          groups, frames, behaviors,
          stages: stageEntries, conditions: conditionEntries,
          npcs: npcEntries, towns: townEntries, guilds: guildEntries,
          tasks: taskEntries, mapEvents: mapEventEntries,
          lookup, sourceFiles: Object.keys(fileMap)
        },
        loadedFiles: Object.keys(fileMap), visibleGroups: new Set(),
        _history: [snap], _future: [], canUndo: false, canRedo: false,
        selectedFrameId: null, selectedGroupId: null, selectedParagraphIdx: null, selectedOptionBehaviorId: null, selectedTriggerGroupId: null,
        loading: false,
        error: errMsg,
      });
    } catch (e: unknown) { set({ loading: false, error: String(e) }); }
  },

  loadDraftFiles: (fileMap) => {
    set({ loading: true });
    try {
      const current = get().data;
      const lookup = { ...current.lookup };
      let dg: StoryGroup[]=[]; let df: StoryFrame[]=[]; let db: StoryBehavior[]=[];
      for (const [fname, buffer] of Object.entries(fileMap)) {
        const sheets = readExcelSheets(buffer);
        for (const [, srows] of Object.entries(sheets)) {
          if (!srows.length) continue;
          if (detectTableType(fname, srows) === 'StoryText') {
            const r = parseStoryText(srows, lookup, 61001, 6100101);
            dg=dg.concat(r.groups); df=df.concat(r.frames); db=db.concat(r.behaviors);
          }
        }
      }
      const maxGid = current.groups.length ? Math.max(...current.groups.map(g=>g.groupId),0) : 60000;
      const offset = maxGid + 100;
      const rg: StoryGroup[]=[]; const rf: StoryFrame[]=[]; const rb: StoryBehavior[]=[];
      const gidMap = new Map<number,number>();
      for (let i=0;i<dg.length;i++) gidMap.set(dg[i].groupId,offset+i);
      for (const g of dg) rg.push({...g,groupId:gidMap.get(g.groupId)??g.groupId});
      for (const f of df) {
        const ng = gidMap.get(f.groupId)??f.groupId;
        rf.push({...f,frameId:f.frameId+offset*100,groupId:ng,nextFrame:f.nextFrame?f.nextFrame+offset*100:null});
      }
      for (const b of db) rb.push({...b,behaviorId:b.behaviorId+offset*10000,parameter:String(gidMap.get(Number(b.parameter))??Number(b.parameter))});
      for (const fr of rf) {
        if (fr.behavior) fr.behavior = fr.behavior.split(';').map(p=>{const m=p.match(/^(\d+),(\d+)$/);return m?`${m[1]},${parseInt(m[2])+offset*10000}`:p;}).join(';');
      }
      const allGroups=[...current.groups,...rg]; const allFrames=[...current.frames,...rf]; const allBehaviors=[...current.behaviors,...rb];
      const snap: Snapshot={
        groups:allGroups.map(g=>({...g})),
        frames:allFrames.map(f=>({...f})),
        behaviors:allBehaviors.map(b=>({...b})),
        stages:current.stages.map(s=>({...s})),
        conditions:current.conditions.map(c=>({...c})),
        npcs:(current.npcs || []).map(n=>({...n})),
        towns:(current.towns || []).map(t=>({...t})),
        guilds:(current.guilds || []).map(g=>({...g})),
        tasks:(current.tasks || []).map(t=>({...t})),
        mapEvents:(current.mapEvents || []).map(e=>({...e})),
        selectedFrameId:null,
        selectedGroupId:null,
        selectedParagraphIdx:null,
        selectedOptionBehaviorId:null,
        selectedTriggerGroupId:null
      };
      set({
        data:{...current,groups:allGroups,frames:allFrames,behaviors:allBehaviors,sourceFiles:[...current.sourceFiles,...Object.keys(fileMap)]},
        draftFiles:Object.keys(fileMap),visibleGroups:new Set(),
        _history:[snap],_future:[],canUndo:false,canRedo:false,
        selectedFrameId:null,selectedGroupId:null,selectedParagraphIdx:null,selectedOptionBehaviorId:null,selectedTriggerGroupId:null,
        loading:false,error:null,
      });
    } catch(e:unknown){set({loading:false,error:String(e)});}
  },

  loadFromFolder: async (files) => { set({loading:true}); const fm:Record<string,ArrayBuffer>={}; for(let i=0;i<files.length;i++)fm[files[i].name]=await files[i].arrayBuffer(); get().loadFiles(fm); },
  loadDraftFromFolder: async (files) => { set({loading:true}); const fm:Record<string,ArrayBuffer>={}; for(let i=0;i<files.length;i++)fm[files[i].name]=await files[i].arrayBuffer(); get().loadDraftFiles(fm); },

  updateFrame: (frameId, updates) => {
    get()._takeSnapshot();
    const d = get().data;
    set({ data: { ...d, frames: d.frames.map(f => f.frameId === frameId ? { ...f, ...updates } : f) } });
  },
  updateGroup: (groupId, updates) => {
    get()._takeSnapshot();
    const d = get().data;
    set({ data: { ...d, groups: d.groups.map(g => g.groupId === groupId ? { ...g, ...updates } : g) } });
  },
  updateBehavior: (behaviorId, updates) => {
    get()._takeSnapshot();
    const d = get().data;
    set({ data: { ...d, behaviors: d.behaviors.map(b => b.behaviorId === behaviorId ? { ...b, ...updates } : b) } });
  },
  addFrame: (frame) => { get()._takeSnapshot(); const d=get().data; set({data:{...d,frames:[...d.frames,frame]}}); },
  deleteFrame: (frameId) => {
    get()._takeSnapshot();
    const d=get().data;
    set({data:{...d,frames:d.frames.filter(f=>f.frameId!==frameId)},selectedFrameId:get().selectedFrameId===frameId?null:get().selectedFrameId});
  },
}));

function createDefaultLookup(): LookupTable {
  return {
    npcMap:{}, npcIdToName:{}, npcIdToEntry:{},
    stageIdToEntry:{}, conditionIdToEntry:{},
    townIdToEntry:{}, guildIdToEntry:{},
    taskIdToEntry:{}, mapEventIdToEntry:{},
    groupIdToTriggers:{},
    expressionMap:{ '':0,'0':0,'平静':1001,'伤心':1001,'喜欢':1003,'疑问':1004,'疑惑':1004,'惊讶':1005,'恐惧':1006,'生气':1007,'开心':1007,'悲伤':1008,'思考':1008,'委屈':1009,'尴尬':1010,'鬼脸':1011 },
    bgMap:{ '家里':'story/ShiNei-BaiTian1','超市':'story/ShiNei-YeWan1','室内-白天':'story/ShiNei-BaiTian1','室内-夜晚':'story/ShiNei-YeWan1' },
    soundMap:{ '收银':'1004','脚步声':'1001','狼嚎':'1004','叹息':'1007' },
    animMap:{ '跳跳':2,'跳动':2,'放大':1,'上下震动':2,'往前突一下':3 },
  };
}

export { parseStoryFrame, parseStoryGroup, parseStoryBehavior, parseNpcTable };
