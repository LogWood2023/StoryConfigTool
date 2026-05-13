import type { Node, Edge } from '@xyflow/react';
import type { StoryFrame, StoryGroup, StoryBehavior, StoryNodeData, StoryEdgeData, LookupTable } from '../types';

const GROUP_COLORS = ['#4A90D9','#50C878','#F5A623','#E85D75','#9B59B6','#1ABC9C','#E67E22','#3498DB'];
const ROW_HEIGHT = 340;
const OPTION_SPACING = 50;
const OPTION_COL_WIDTH = 130;
const STAGE_COL_WIDTH = 160;
const TRIGGER_COL_WIDTH = 140;

export const BEHAVIOR_TYPE_NAMES: Record<number,string> = {
  1:'跳至指定帧',2:'触发剧情组',3:'领取任务',4:'完成任务',5:'获得状态',6:'消除状态',
  7:'获得道具',8:'上交道具',9:'结束剧情组',10:'进入战斗',11:'跳至下一帧',12:'改变事件显示',
  13:'传送并结束',14:'删除事件',15:'切磋',
};

export interface ParagraphData { [key:string]:unknown; groupId:number; paragraphIdx:number; totalParagraphs:number; groupName:string; summary:string; frameCount:number; frameIds:number[]; firstText:string; background:string; hasBehavior:boolean; behaviorCount:number; color:string; }
export interface OptionData { [key:string]:unknown; groupId:number; paragraphIdx:number; optionLabel:string; behaviorId:number; behaviorType:number; behaviorParam:string; additionBehavior:string; targetGroupId:number; stageName:string; color:string; }

export function splitFramesIntoParagraphs(frames: StoryFrame[]): StoryFrame[][] {
  if (!frames.length) return [];
  const sorted = [...frames].sort((a, b) => a.frameId - b.frameId);
  const paragraphs: StoryFrame[][] = [];
  let current: StoryFrame[] = [];
  for (const f of sorted) {
    current.push(f);
    if (f.behavior || f.isLastFrame) {
      paragraphs.push(current);
      current = [];
    }
  }
  if (current.length) paragraphs.push(current);
  return paragraphs;
}

function getGroupFirstParagraph(frames: StoryFrame[], targetGid: number): number {
  return 0;
}

function getConnectedParagraphIds(frames: StoryFrame[], behaviors: StoryBehavior[], visible: Set<number>, lookup: LookupTable): Set<string> {
  const bm = new Map(behaviors.map(b => [b.behaviorId, b]));
  const connected = new Set<string>();
  for (let gi = 0; gi < frames.length; gi++) {
    const f = frames[gi];
    if (!visible.has(f.groupId)) continue;
    const gFrames = frames.filter(ff => ff.groupId === f.groupId).sort((a, b) => a.frameId - b.frameId);
    const paras = splitFramesIntoParagraphs(gFrames);
    for (let pi = 0; pi < paras.length; pi++) {
      const para = paras[pi];
      for (const pf of para) {
        if (pf.behavior) {
          for (const part of pf.behavior.split(';')) {
            const m = part.match(/(\d+),(\d+)/);
            if (!m) continue;
            const bhv = bm.get(parseInt(m[2]));
            if (!bhv) continue;
            if (bhv.type === 2) {
              const tg = parseInt(bhv.parameter);
              if (!isNaN(tg) && visible.has(tg)) {
                connected.add(paraKey(f.groupId, pi));
                connected.add(paraKey(tg, getGroupFirstParagraph(frames, tg)));
              }
            } else if (bhv.type === 10) {
              const stageId = parseInt(bhv.parameter) || 0;
              const stage = lookup.stageIdToEntry[stageId];
              if (stage) {
                for (const sr of stage.stroy) {
                  if (visible.has(sr.groupId)) {
                    connected.add(paraKey(f.groupId, pi));
                    connected.add(paraKey(sr.groupId, getGroupFirstParagraph(frames, sr.groupId)));
                  }
                }
              }
            }
          }
        }
        if (pf.autoJump && visible.has(pf.autoJump)) {
          connected.add(paraKey(f.groupId, pi));
          connected.add(paraKey(pf.autoJump, getGroupFirstParagraph(frames, pf.autoJump)));
        }
      }
    }
  }
  return connected;
}

function paraKey(gid: number, pi: number): string { return `${gid}-${pi}`; }

function buildOptionData(gid: number, pi: number, bhv: StoryBehavior, color: string, lookup: LookupTable): OptionData {
  let stageName = '';
  if (bhv.type === 10) {
    const stageId = parseInt(bhv.parameter) || 0;
    const stage = lookup.stageIdToEntry[stageId];
    if (stage) stageName = stage.name;
  }
  return {
    groupId: gid, paragraphIdx: pi,
    optionLabel: bhv.showName || `#${bhv.behaviorId}`,
    behaviorId: bhv.behaviorId,
    behaviorType: bhv.type,
    behaviorParam: bhv.parameter,
    additionBehavior: bhv.additionBehavior,
    targetGroupId: parseInt(bhv.parameter) || 0,
    stageName,
    color,
  };
}

function getTriggerIcon(type: string): string {
  switch (type) {
    case 'npc': return 'user';
    case 'town': return 'home';
    case 'guild': return 'team';
    case 'task': return 'flag';
    case 'mapEvent': return 'environment';
    case 'condition': return 'filter';
    case 'chain': return 'link';
    case 'behavior': return 'thunderbolt';
    case 'random': return 'random';
    case 'init': return 'rocket';
    case 'pub': return 'coffee';
    case 'hotel': return 'bed';
    case 'smithy': return 'tool';
    case 'clothes': return 'shopping';
    case 'danfu': return 'medicine';
    case 'default': return 'rocket';
    default: return 'rocket';
  }
}

function getTriggerColor(type: string): string {
  switch (type) {
    case 'npc': return '#1890FF';
    case 'town': return '#52C41A';
    case 'guild': return '#722ED1';
    case 'task': return '#FA8C16';
    case 'mapEvent': return '#13C2C2';
    case 'condition': return '#9B59B6';
    case 'chain': return '#4A90D9';
    case 'behavior': return '#F5A623';
    case 'random': return '#EB2F96';
    case 'init': return '#E74C3C';
    case 'pub': return '#8B4513';
    case 'hotel': return '#16A085';
    case 'smithy': return '#2C3E50';
    case 'clothes': return '#E91E63';
    case 'danfu': return '#9C27B0';
    case 'default': return '#50C878';
    default: return '#50C878';
  }
}

export function paragraphsToNodes(frames: StoryFrame[], groups: StoryGroup[], behaviors: StoryBehavior[], visible: Set<number>, lookup: LookupTable): Node[] {
  const nodes: Node[] = [];
  const gm = new Map(groups.map(g => [g.groupId, g]));
  const fm = new Map<number, StoryFrame[]>();
  for (const f of frames) { 
    const gid = Number(f.groupId);  // 确保是数字
    if (!isNaN(gid)) {
      const l = fm.get(gid) || []; 
      l.push(f); 
      fm.set(gid, l); 
    }
  }

  const sorted = Array.from(fm.entries()).filter(([gid]) => visible.has(gid)).sort((a, b) => a[0] - b[0]);
  const connected = getConnectedParagraphIds(frames, behaviors, visible, lookup);

  let gx = 0, gy = 0;
  let prevGroupEnded = false;

  for (let i = 0; i < sorted.length; i++) {
    const [gid, gFs] = sorted[i];
    const grp = gm.get(gid);
    const ci = (gid - 1) % GROUP_COLORS.length;
    const color = GROUP_COLORS[ci];
    const paras = splitFramesIntoParagraphs(gFs.sort((a, b) => a.frameId - b.frameId));

    const triggers = lookup.groupIdToTriggers?.[gid] || [];
    
    const needTriggerNodes: typeof triggers = [];
    const skipTriggerNodes: typeof triggers = [];
    
    triggers.forEach(trigger => {
      if (trigger.type === 'behavior' || trigger.type === 'chain') {
        skipTriggerNodes.push(trigger);
      } else {
        needTriggerNodes.push(trigger);
      }
    });
    
    const shouldShowTriggerNodes = needTriggerNodes.length > 0 || triggers.length === 0;
    
    let triggersToShow: typeof triggers = [];
    if (needTriggerNodes.length > 0) {
      triggersToShow = needTriggerNodes;
    } else if (triggers.length === 0) {
      triggersToShow = [{ type: 'default', sourceId: gid, sourceName: '', detail: '无触发方式' }];
    }

    const isNpcTriggerType = (t: typeof triggersToShow[0]) =>
      ['pub', 'hotel', 'smithy', 'clothes', 'danfu'].includes(t?.type || '');

    if (paras.length > 0 && grp && shouldShowTriggerNodes && triggersToShow.length > 0) {
      triggersToShow.forEach((trigger, idx) => {
        const summary = isNpcTriggerType(trigger) ? trigger.detail : `${trigger.sourceName ? trigger.sourceName + ': ' : ''}${trigger.detail}`;
        nodes.push({
          id: `trigger-${gid}-${idx}`,
          type: 'storyTriggerNode',
          position: { x: gx, y: gy + idx * 50 },
          data: {
            groupId: gid,
            triggerType: trigger.type,
            triggerIcon: getTriggerIcon(trigger.type),
            triggerSummary: summary,
            color: getTriggerColor(trigger.type),
            triggerDetail: trigger.detail,
            townId: trigger.townId,
            townName: trigger.townName,
            npcPosition: trigger.npcPosition,
            npcId: trigger.npcId,
            npcName: trigger.npcName,
          } as Record<string, unknown>,
        });
      });
      gx += TRIGGER_COL_WIDTH;
    }

    for (let pi = 0; pi < paras.length; pi++) {
      const para = paras[pi];
      const pk = paraKey(gid, pi);

      if (pi === 0 && prevGroupEnded && !connected.has(pk)) {
        gx = 0; gy += ROW_HEIGHT;
        if (grp && shouldShowTriggerNodes && triggersToShow.length > 0) {
          triggersToShow.forEach((trigger, idx) => {
            const summary = isNpcTriggerType(trigger) ? trigger.detail : `${trigger.sourceName ? trigger.sourceName + ': ' : ''}${trigger.detail}`;
            nodes.push({
              id: `trigger-${gid}-${idx}`,
              type: 'storyTriggerNode',
              position: { x: gx, y: gy + idx * 50 },
              data: {
                groupId: gid,
                triggerType: trigger.type,
                triggerIcon: getTriggerIcon(trigger.type),
                triggerSummary: summary,
                color: getTriggerColor(trigger.type),
                triggerDetail: trigger.detail,
                townId: trigger.townId,
                townName: trigger.townName,
                npcPosition: trigger.npcPosition,
                npcId: trigger.npcId,
                npcName: trigger.npcName,
              } as Record<string, unknown>,
            });
          });
          gx += TRIGGER_COL_WIDTH;
        }
      }

      const firstF = para[0];
      const lastF = para[para.length - 1];
      const hasBeh = para.some(f => !!f.behavior);
      const behCnt = para.reduce((s, f) => s + (f.behavior ? f.behavior.split(';').filter(p => p.trim()).length : 0), 0);
      const data: ParagraphData = {
        groupId: gid, paragraphIdx: pi, totalParagraphs: paras.length,
        groupName: grp?.name || `组${gid}`,
        summary: lastF?.summary || firstF?.summary || '',
        frameCount: para.length,
        frameIds: para.map(f => f.frameId),
        firstText: firstF?.text || '',
        background: firstF?.picture2 || '',
        hasBehavior: hasBeh, behaviorCount: behCnt, color,
      };

      nodes.push({
        id: `para-${gid}-${pi}`,
        type: 'storyGroupNode',
        position: { x: gx, y: gy },
        data: data as unknown as Record<string, unknown>,
      });
      gx += 440;

      if (hasBeh && lastF && lastF.behavior) {
        const bmOpt = new Map(behaviors.map(b => [b.behaviorId, b]));
        const parts = lastF.behavior.split(';').filter(p => p.trim());
        const stageIds = new Set<number>();

        for (let oi = 0; oi < parts.length; oi++) {
          const m = parts[oi].match(/(\d+),(\d+)/);
          if (!m) continue;
          const bhv = bmOpt.get(parseInt(m[2]));
          if (!bhv) continue;
          nodes.push({
            id: `opt-${gid}-${pi}-${oi}`,
            type: 'storyOptionNode',
            position: { x: gx, y: gy + oi * OPTION_SPACING },
            data: buildOptionData(gid, pi, bhv, color, lookup) as unknown as Record<string, unknown>,
          });
          if (bhv.type === 10) {
            const stageId = parseInt(bhv.parameter) || 0;
            if (lookup.stageIdToEntry[stageId]) stageIds.add(stageId);
          }
        }
        gx += OPTION_COL_WIDTH;

        if (stageIds.size > 0) {
          let si = 0;
          for (const stageId of stageIds) {
            const stage = lookup.stageIdToEntry[stageId];
            if (!stage) continue;
            nodes.push({
              id: `stage-${gid}-${pi}-${stageId}`,
              type: 'storyStageNode',
              position: { x: gx, y: gy + si * OPTION_SPACING },
              data: {
                stageId: stage.stageId, stageName: stage.name,
                groupId: gid, stroyRules: stage.stroy, color,
              } as Record<string, unknown>,
            });
            si++;
          }
          gx += STAGE_COL_WIDTH;
        }
      }
    }
    prevGroupEnded = true;
  }
  return nodes;
}

export function paragraphsToEdges(frames: StoryFrame[], groups: StoryGroup[], behaviors: StoryBehavior[], visible: Set<number>, lookup: LookupTable): Edge[] {
  const edges: Edge[] = [];
  const bm = new Map(behaviors.map(b => [b.behaviorId, b]));
  const fm = new Map<number, StoryFrame[]>();
  const gm = new Map(groups.map(g => [g.groupId, g]));
  for (const f of frames) { const l = fm.get(f.groupId) || []; l.push(f); fm.set(f.groupId, l); }

  const doneSameGroup = new Set<string>();

  for (const [gid] of fm) {
    if (!visible.has(gid)) continue;
    const gFs = fm.get(gid)!.sort((a, b) => a.frameId - b.frameId);
    const paras = splitFramesIntoParagraphs(gFs);

    const triggers = lookup.groupIdToTriggers?.[gid] || [];
    
    const needTriggerNodes: typeof triggers = [];
    
    triggers.forEach(trigger => {
      if (trigger.type !== 'behavior' && trigger.type !== 'chain') {
        needTriggerNodes.push(trigger);
      }
    });
    
    let triggersToShow: typeof triggers = [];
    if (needTriggerNodes.length > 0) {
      triggersToShow = needTriggerNodes;
    } else if (triggers.length === 0) {
      triggersToShow = [{ type: 'default', sourceId: gid, sourceName: '', detail: '无触发方式' }];
    }

    if (paras.length > 0 && triggersToShow.length > 0) {
      triggersToShow.forEach((trigger, idx) => {
        const color = getTriggerColor(trigger.type);
        edges.push({
          id: `trigger-para-${gid}-${idx}`,
          source: `trigger-${gid}-${idx}`,
          target: `para-${gid}-0`,
          animated: false,
          style: { stroke: color, strokeWidth: 2 },
          markerEnd: { type: 'arrowclosed', color },
          data: { label: '', isBehavior: false } as StoryEdgeData,
        });
      });
    }

    for (let pi = 0; pi < paras.length; pi++) {
      const para = paras[pi];
      let optIdx = 0;
      const hasOptions = para.some(f => !!f.behavior);

      for (const pf of para) {
        if (pf.behavior) {
          for (const part of pf.behavior.split(';')) {
            const m = part.match(/(\d+),(\d+)/); if (!m) continue;
            const bhvId = parseInt(m[2]); const bhv = bm.get(bhvId);
            if (!bhv) continue;

            edges.push({
              id: `pto-${pf.frameId}-${bhvId}`,
              source: `para-${gid}-${pi}`,
              target: `opt-${gid}-${pi}-${optIdx}`,
              animated: false,
              style: { stroke: '#F5A623', strokeWidth: 1.5 },
              data: { label: '', isBehavior: true } as StoryEdgeData,
            });

            if (bhv.type === 2) {
              const tg = parseInt(bhv.parameter);
              if (!isNaN(tg) && visible.has(tg)) {
                const tpi = getGroupFirstParagraph(frames, tg);
                edges.push({
                  id: `otp-${pf.frameId}-${bhvId}`,
                  source: `opt-${gid}-${pi}-${optIdx}`,
                  target: `para-${tg}-${tpi}`,
                  animated: true,
                  style: { stroke: '#F5A623', strokeWidth: 2 },
                  markerEnd: { type: 'arrowclosed', color: '#F5A623' },
                  label: '', labelStyle: { fill: '#F5A623', fontWeight: 'bold', fontSize: 10 },
                  labelBgStyle: { fill: '#FFF3E0' },
                  data: { label: '', isBehavior: true } as StoryEdgeData,
                });
              }
            } else if (bhv.type === 10) {
              const stageId = parseInt(bhv.parameter) || 0;
              const stage = lookup.stageIdToEntry[stageId];
              if (stage) {
                edges.push({
                  id: `ots-${pf.frameId}-${bhvId}`,
                  source: `opt-${gid}-${pi}-${optIdx}`,
                  target: `stage-${gid}-${pi}-${stageId}`,
                  animated: false,
                  style: { stroke: '#E85D75', strokeWidth: 1.5 },
                  data: { label: '', isBehavior: true } as StoryEdgeData,
                });
                for (let si = 0; si < stage.stroy.length; si++) {
                  const sr = stage.stroy[si];
                  if (!visible.has(sr.groupId)) continue;
                  const tpi = getGroupFirstParagraph(frames, sr.groupId);
                  const timingLabel = sr.timing === 4 || sr.timing === 6 ? '胜利' : sr.timing === 5 || sr.timing === 7 ? '失败' : sr.timing === 3 ? '波次' : `时机${sr.timing}`;
                  edges.push({
                    id: `stp-${stageId}-${sr.groupId}-${si}`,
                    source: `stage-${gid}-${pi}-${stageId}`,
                    target: `para-${sr.groupId}-${tpi}`,
                    animated: true,
                    style: { stroke: '#E85D75', strokeWidth: 2 },
                    markerEnd: { type: 'arrowclosed', color: '#E85D75' },
                    label: timingLabel,
                    labelStyle: { fill: '#E85D75', fontWeight: 'bold', fontSize: 9 },
                    labelBgStyle: { fill: '#FFF0F0' },
                    data: { label: timingLabel, isBehavior: false } as StoryEdgeData,
                  });
                }
              } else if (pi + 1 < paras.length) {
                edges.push({
                  id: `otn-${pf.frameId}-${bhvId}`,
                  source: `opt-${gid}-${pi}-${optIdx}`,
                  target: `para-${gid}-${pi + 1}`,
                  animated: false,
                  style: { stroke: '#bbb', strokeWidth: 2, strokeDasharray: '5 5' },
                  data: { label: '', isBehavior: false } as StoryEdgeData,
                });
              }
            } else if (pi + 1 < paras.length) {
              edges.push({
                id: `otn-${pf.frameId}-${bhvId}`,
                source: `opt-${gid}-${pi}-${optIdx}`,
                target: `para-${gid}-${pi + 1}`,
                animated: false,
                style: { stroke: '#bbb', strokeWidth: 2, strokeDasharray: '5 5' },
                data: { label: '', isBehavior: false } as StoryEdgeData,
              });
            }
            optIdx++;
          }
        }
        if (pf.autoJump && visible.has(pf.autoJump)) {
          const tpi = getGroupFirstParagraph(frames, pf.autoJump);
          edges.push({
            id: `paaj-${pf.frameId}-${pf.autoJump}`,
            source: `para-${gid}-${pi}`,
            target: `para-${pf.autoJump}-${tpi}`,
            animated: false,
            style: { stroke: '#4A90D9', strokeWidth: 2, strokeDasharray: '6 3' },
            markerEnd: { type: 'arrowclosed', color: '#4A90D9' },
            label: '自动跳转',
            labelStyle: { fill: '#4A90D9', fontSize: 10 },
            labelBgStyle: { fill: '#E8F4FD' },
            data: { label: '自动跳转', isBehavior: false } as StoryEdgeData,
          });
        }
      }

      if (pi + 1 < paras.length && !hasOptions) {
        const key = `${gid}-${pi}->${gid}-${pi + 1}`;
        if (!doneSameGroup.has(key)) {
          doneSameGroup.add(key);
          edges.push({
            id: `spara-${gid}-${pi}`,
            source: `para-${gid}-${pi}`,
            target: `para-${gid}-${pi + 1}`,
            animated: false,
            style: { stroke: '#bbb', strokeWidth: 1.5, strokeDasharray: '5 5' },
            data: { label: '', isBehavior: false } as StoryEdgeData,
          });
        }
      }
    }
  }
  return edges;
}

export function framesToNodes(frames: StoryFrame[], groups: StoryGroup[], behaviors: StoryBehavior[], lookup: LookupTable): Node[] {
  const nodes: Node[] = []; const gm = new Map(groups.map(g => [g.groupId, g]));
  const bm = new Map(behaviors.map(b => [b.behaviorId, b]));
  const sorted = [...frames].sort((a, b) => a.frameId - b.frameId);
  let gy = 0; let gx = 0; let lastGid = -1;
  for (let i = 0; i < sorted.length; i++) {
    const f = sorted[i];
    if (f.groupId !== lastGid) {
      gx = 0;
      if (lastGid !== -1) gy += ROW_HEIGHT;
      lastGid = f.groupId;
    }
    const grp = gm.get(f.groupId); const ci = (f.groupId - 1) % GROUP_COLORS.length; const color = GROUP_COLORS[ci];
    const rn = resolveNpcDisplay(f.additionPar, lookup);
    const data: StoryNodeData = { frameId: f.frameId, groupId: f.groupId, role: rn, text: f.text,
      expression: exExpr(f.additionPar), background: f.picture2, sound: f.soundId, behavior: f.behavior,
      isLastFrame: f.isLastFrame, autoJump: f.autoJump, nextFrame: f.nextFrame, additionPar: f.additionPar,
      additionalText: f.additionalText, summary: f.summary, groupName: grp?.name || `组${f.groupId}`,
      label: f.name || `Frame ${f.frameId}` };
    nodes.push({ id: String(f.frameId), type: 'storyNode', position: { x: gx, y: gy },
      data: data as unknown as Record<string, unknown>,
      style: { border: `2px solid ${color}`, borderRadius: '10px', padding: '10px', width: 240, fontSize: '12px', backgroundColor: '#fff' } });
    gx += 320;

    if (f.behavior) {
      const parts = f.behavior.split(';').filter(p => p.trim());
      const stageIds = new Set<number>();
      for (let oi = 0; oi < parts.length; oi++) {
        const m = parts[oi].match(/(\d+),(\d+)/);
        if (!m) continue;
        const bhv = bm.get(parseInt(m[2]));
        if (!bhv) continue;
        nodes.push({
          id: `fopt-${f.frameId}-${oi}`,
          type: 'storyOptionNode',
          position: { x: gx, y: gy + oi * OPTION_SPACING },
          data: buildOptionData(f.groupId, -1, bhv, color, lookup) as unknown as Record<string, unknown>,
        });
        if (bhv.type === 10) {
          const stageId = parseInt(bhv.parameter) || 0;
          if (lookup.stageIdToEntry[stageId]) stageIds.add(stageId);
        }
      }
      gx += OPTION_COL_WIDTH;

      if (stageIds.size > 0) {
        let si = 0;
        for (const stageId of stageIds) {
          const stage = lookup.stageIdToEntry[stageId];
          if (!stage) continue;
          nodes.push({
            id: `fstage-${f.frameId}-${stageId}`,
            type: 'storyStageNode',
            position: { x: gx, y: gy + si * OPTION_SPACING },
            data: {
              stageId: stage.stageId, stageName: stage.name,
              groupId: f.groupId, stroyRules: stage.stroy, color,
            } as Record<string, unknown>,
          });
          si++;
        }
        gx += STAGE_COL_WIDTH;
      }
    }
  }
  return nodes;
}

export function framesToEdges(frames: StoryFrame[], behaviors: StoryBehavior[], lookup: LookupTable): Edge[] {
  const edges: Edge[] = []; const bm = new Map(behaviors.map(b => [b.behaviorId, b]));
  for (const f of frames) {
    if (f.nextFrame && f.nextFrame > 0) edges.push({ id: `nf-${f.frameId}-${f.nextFrame}`, source: String(f.frameId), target: String(f.nextFrame),
      animated: false, style: { stroke: '#888', strokeWidth: 2 }, markerEnd: { type: 'arrowclosed' }, data: { label: '', isBehavior: false } as StoryEdgeData });
    if (f.behavior) {
      let optIdx = 0;
      for (const part of f.behavior.split(';')) {
        const m = part.match(/(\d+),(\d+)/); if (!m) continue;
        const bhvId = parseInt(m[2]); const bhv = bm.get(bhvId);
        if (!bhv) continue;

        edges.push({
          id: `fto-${f.frameId}-${bhvId}`,
          source: String(f.frameId),
          target: `fopt-${f.frameId}-${optIdx}`,
          animated: false,
          style: { stroke: '#F5A623', strokeWidth: 1.5 },
          data: { label: '', isBehavior: true } as StoryEdgeData,
        });

        if (bhv.type === 2) {
          const tg = parseInt(bhv.parameter);
          const tf = frames.find(ff => ff.groupId === tg);
          if (tf) {
            edges.push({
              id: `fotp-${f.frameId}-${bhvId}`,
              source: `fopt-${f.frameId}-${optIdx}`,
              target: String(tf.frameId),
              animated: true,
              style: { stroke: '#F5A623', strokeWidth: 2 },
              markerEnd: { type: 'arrowclosed', color: '#F5A623' },
              label: '', labelStyle: { fill: '#F5A623', fontWeight: 'bold', fontSize: 10 },
              labelBgStyle: { fill: '#FFF3E0' },
              data: { label: '', isBehavior: true, behaviorId: bhv.behaviorId } as StoryEdgeData,
            });
          }
        } else if (bhv.type === 10) {
          const stageId = parseInt(bhv.parameter) || 0;
          const stage = lookup.stageIdToEntry[stageId];
          if (stage) {
            edges.push({
              id: `fots-${f.frameId}-${bhvId}`,
              source: `fopt-${f.frameId}-${optIdx}`,
              target: `fstage-${f.frameId}-${stageId}`,
              animated: false,
              style: { stroke: '#E85D75', strokeWidth: 1.5 },
              data: { label: '', isBehavior: true } as StoryEdgeData,
            });
            for (let si = 0; si < stage.stroy.length; si++) {
              const sr = stage.stroy[si];
              const tf = frames.find(ff => ff.groupId === sr.groupId);
              if (!tf) continue;
              const timingLabel = sr.timing === 4 || sr.timing === 6 ? '胜利' : sr.timing === 5 || sr.timing === 7 ? '失败' : sr.timing === 3 ? '波次' : `时机${sr.timing}`;
              edges.push({
                id: `fstp-${f.frameId}-${stageId}-${sr.groupId}-${si}`,
                source: `fstage-${f.frameId}-${stageId}`,
                target: String(tf.frameId),
                animated: true,
                style: { stroke: '#E85D75', strokeWidth: 2 },
                markerEnd: { type: 'arrowclosed', color: '#E85D75' },
                label: timingLabel,
                labelStyle: { fill: '#E85D75', fontWeight: 'bold', fontSize: 9 },
                labelBgStyle: { fill: '#FFF0F0' },
                data: { label: timingLabel, isBehavior: false } as StoryEdgeData,
              });
            }
          }
        }
        optIdx++;
      }
    }
  }
  return edges;
}

interface ParsedGroup {
  npcId: number;
  position: number;
  bright: number;
  expr: string;
  anim: string;
}

function parseAdditionPar(additionPar: string): ParsedGroup[] {
  if (!additionPar || !additionPar.trim()) return [];
  return additionPar.split(';').map(part => {
    const segs = part.split(',');
    return {
      npcId: Number(segs[0]) || 0,
      position: Number(segs[1]) || 0,
      bright: Number(segs[2]) || 0,
      expr: segs[3] || '0',
      anim: segs[4] || '0',
    };
  });
}

export function resolveNpcDisplay(additionPar: string, lookup: LookupTable): string {
  const groups = parseAdditionPar(additionPar);
  if (!groups.length) return '旁白';

  const brightGroups = groups.filter(g => g.bright === 1 && g.npcId > 0);

  if (brightGroups.length === 0) return '旁白';

  if (brightGroups.length === 2) {
    const names = brightGroups.map(g => {
      if (g.npcId === 1) return '主角';
      return lookup.npcIdToName[g.npcId] || `#${g.npcId}`;
    });
    return `⚠️ ${names[0]} & ${names[1]}`;
  }

  const speaker = brightGroups[0];
  if (speaker.npcId === 1) return '主角';
  const name = lookup.npcIdToName[speaker.npcId];
  return name || `#${speaker.npcId}`;
}

function analyzeTriggerMethod(grp: StoryGroup, lookup: LookupTable): { type: string; summary: string; color: string } {
  let type = '等待触发';
  let summary = '无预设条件';
  let color = '#999';
  
  const triggerCond = grp.triggerCondition?.trim() || '';
  const selfAddCond = grp.selfAddCondition?.trim() || '';
  
  const parts: string[] = [];
  
  if (triggerCond) {
    const condParts = triggerCond.split(';').filter(p => p.trim());
    for (const part of condParts) {
      const [condId, condValue] = part.split(',');
      const id = Number(condId);
      if (!isNaN(id) && lookup.conditionIdToEntry[id]) {
        const condEntry = lookup.conditionIdToEntry[id];
        if (condEntry.type === 1) {
          const val = condValue ? `=${condValue}` : '';
          parts.push(`${condEntry.name}${val}`);
        }
      }
    }
  }
  
  if (selfAddCond) {
    const addParts = selfAddCond.split(';').filter(p => p.trim());
    for (const part of addParts) {
      const id = Number(part);
      if (!isNaN(id) && lookup.conditionIdToEntry[id]) {
        const condEntry = lookup.conditionIdToEntry[id];
        if (condEntry.type === 1) {
          parts.push(`完成后+${condEntry.name}`);
        }
      }
    }
  }
  
  if (parts.length > 0) {
    type = '条件触发';
    summary = parts.join('; ');
    color = '#9B59B6';
    if (summary.length > 20) {
      summary = summary.slice(0, 19) + '..';
    }
  }

  return { type, summary, color };
}

function exExpr(ad: string): string {
  const groups = parseAdditionPar(ad);
  if (!groups.length) return '';
  const bright = groups.find(g => g.bright === 1 && g.npcId > 0);
  return bright ? bright.expr : (groups[0].expr || '0');
}
