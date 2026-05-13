import React, { useCallback, useMemo, useEffect, useState } from 'react';
import { ReactFlow, Background, Controls, MiniMap, useNodesState, useEdgesState, addEdge, BackgroundVariant, type Connection, type Node, type Edge, Panel } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Button, Tag, Space } from 'antd';
import { ArrowLeftOutlined, UndoOutlined, RedoOutlined } from '@ant-design/icons';
import StoryFrameNode from './StoryNode';
import StoryGroupNode from './StoryGroupNode';
import StoryOptionNode from './StoryOptionNode';
import StoryStageNode from './StoryStageNode';
import StoryTriggerNode from './StoryTriggerNode';
import { useStoryStore } from '../store/useStoryStore';
import { paragraphsToNodes, paragraphsToEdges, framesToNodes, framesToEdges, splitFramesIntoParagraphs } from '../utils/flowConverter';
import type { StoryNodeData, StoryFrame } from '../types';

const nodeTypes = { storyNode: StoryFrameNode, storyGroupNode: StoryGroupNode, storyOptionNode: StoryOptionNode, storyStageNode: StoryStageNode, storyTriggerNode: StoryTriggerNode };

export const StoryFlow: React.FC = () => {
  const data = useStoryStore(s => s.data);
  const visibleGroups = useStoryStore(s => s.visibleGroups);
  const lookup = data.lookup;
  const selectFrame = useStoryStore(s => s.selectFrame);
  const selectGroup = useStoryStore(s => s.selectGroup);
  const selectOption = useStoryStore(s => s.selectOption);
  const selectTrigger = useStoryStore(s => s.selectTrigger);
  const undo = useStoryStore(s => s.undo);
  const redo = useStoryStore(s => s.redo);
  const canUndo = useStoryStore(s => s.canUndo);
  const canRedo = useStoryStore(s => s.canRedo);

  const [viewMode, setViewMode] = useState<'groups'|'frames'>('groups');
  const [expandedGroupId, setExpandedGroupId] = useState<number|null>(null);
  const [expandedParagraphIdx, setExpandedParagraphIdx] = useState<number|null>(null);

  const groupNodes = useMemo(() => {
    const nodes = paragraphsToNodes(data.frames, data.groups, data.behaviors, visibleGroups, lookup);
    // 在界面上显示调试信息
    if (typeof document !== 'undefined') {
      const debugEl = document.getElementById('flow-debug');
      if (debugEl) {
        debugEl.innerHTML = '节点数=' + nodes.length + ' | visibleGroups=' + visibleGroups.size + ' | frames=' + data.frames.length + ' | groups=' + data.groups.length;
      }
    }
    console.log('[StoryFlow] 生成了', nodes.length, '个节点, visibleGroups.size=', visibleGroups.size);
    if (nodes.length === 0 && visibleGroups.size > 0) {
      console.log('[StoryFlow] 警告: 有可见组但没生成节点, data.frames=', data.frames.length, 'data.groups=', data.groups.length);
    }
    return nodes;
  }, [data.frames, data.groups, data.behaviors, visibleGroups, lookup]);
  const groupEdges = useMemo(() => paragraphsToEdges(data.frames, data.groups, data.behaviors, visibleGroups, lookup), [data.frames, data.groups, data.behaviors, visibleGroups, lookup]);

  const visibleFrames = useMemo(() => {
    if (viewMode !== 'frames' || expandedGroupId === null || expandedParagraphIdx === null) return [];
    const gFrames = data.frames.filter(f => f.groupId === expandedGroupId).sort((a, b) => a.frameId - b.frameId);
    const allParas = splitFramesIntoParagraphs(gFrames);
    return allParas[expandedParagraphIdx] || [];
  }, [viewMode, expandedGroupId, expandedParagraphIdx, data.frames]);
  const fdNodes = useMemo(() => framesToNodes(visibleFrames, data.groups, data.behaviors, lookup), [visibleFrames, data.groups, data.behaviors, lookup]);
  const fdEdges = useMemo(() => framesToEdges(visibleFrames, data.behaviors, lookup), [visibleFrames, data.behaviors, lookup]);

  const cn = viewMode === 'groups' ? groupNodes : fdNodes;
  const ce = viewMode === 'groups' ? groupEdges : fdEdges;
  
  // 直接在JSX中显示调试信息
  const debugInfo = '节点=' + cn.length + ' | 边=' + ce.length + ' | frames=' + data.frames.length + ' | groups=' + data.groups.length + ' | visible=' + visibleGroups.size;
  
  // 额外调试：检查sorted是否正确
  const sortedForDebug = useMemo(() => {
    if (data.frames.length === 0) return 'frames为空';
    // 显示frames总数和前几个
    return 'frames总数=' + data.frames.length + ' 样本: ' + data.frames.slice(0, 3).map(f => 'id=' + f.frameId + ',g=' + f.groupId).join(', ');
  }, [data.frames]);
  
  const [nodes, setNodes, onNodesChange] = useNodesState(cn);
  const [edges, setEdges, onEdgesChange] = useEdgesState(ce);
  useEffect(() => { setNodes(cn); setEdges(ce); }, [cn, ce, setNodes, setEdges]);

  const onConnect = useCallback((p: Connection) => setEdges(eds => addEdge(p, eds)), [setEdges]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'z') { e.preventDefault(); undo(); }
      if (e.ctrlKey && e.key === 'y') { e.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo]);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    if (viewMode === 'groups') {
      const tm = (node.id as string).match(/^trigger-(\d+)-?(\d+)?$/);
      if (tm) { selectTrigger(parseInt(tm[1])); return; }
      const m = (node.id as string).match(/^para-(\d+)-(\d+)$/);
      if (m) { selectGroup(parseInt(m[1]), parseInt(m[2])); return; }
      const om = (node.id as string).match(/^opt-(\d+)-(\d+)-(\d+)$/);
      if (om) {
        const d = node.data as Record<string, unknown>;
        const bid = Number(d.behaviorId);
        if (bid) selectOption(bid);
        return;
      }
    } else {
      const nd = node.data as StoryNodeData; if (nd.frameId) selectFrame(nd.frameId);
    }
  }, [viewMode, selectFrame, selectGroup, selectOption, selectTrigger]);

  const onNodeDoubleClick = useCallback((_: React.MouseEvent, node: Node) => {
    if (viewMode === 'groups') {
      const m = (node.id as string).match(/^para-(\d+)-(\d+)$/);
      if (m) {
        setExpandedGroupId(parseInt(m[1]));
        setExpandedParagraphIdx(parseInt(m[2]));
        setViewMode('frames');
      }
    }
  }, [viewMode]);

  const backToGroups = useCallback(() => {
    setViewMode('groups'); setExpandedGroupId(null); setExpandedParagraphIdx(null); selectOption(null);
  }, [selectOption]);

  const groupName = useMemo(() => {
    if (expandedGroupId === null) return '';
    const g = data.groups.find(gg => gg.groupId === expandedGroupId);
    const paraLabel = expandedParagraphIdx !== null ? ` P${expandedParagraphIdx + 1}` : '';
    return `${g?.name || `组${expandedGroupId}`}${paraLabel}`;
  }, [expandedGroupId, expandedParagraphIdx, data.groups]);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      {viewMode === 'frames' && (
        <Panel position="top-left" style={{ margin: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', padding: '6px 12px', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}>
            <Button type="primary" size="small" icon={<ArrowLeftOutlined />} onClick={backToGroups}>返回段落总览</Button>
            <Tag color="blue" style={{ margin: 0 }}>{groupName}</Tag>
          </div>
        </Panel>
      )}
      <Panel position="bottom-right" style={{ margin: 10 }}>
        <Space>
          <Button size="small" icon={<UndoOutlined />} disabled={!canUndo} onClick={undo} title="撤销 Ctrl+Z" />
          <Button size="small" icon={<RedoOutlined />} disabled={!canRedo} onClick={redo} title="重做 Ctrl+Y" />
        </Space>
      </Panel>
      <div id="flow-debug" style={{position:'absolute',top:50,left:10,zIndex:1000,background:'yellow',padding:'4px 8px',fontSize:11,borderRadius:4}}>{debugInfo}<br/>{sortedForDebug}</div>
      <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect}
        onNodeClick={onNodeClick} onNodeDoubleClick={onNodeDoubleClick} nodeTypes={nodeTypes} fitView
        fitViewOptions={viewMode === 'groups' ? { padding: 0.3 } : { padding: 0.2 }} minZoom={0.1} maxZoom={2}
        defaultEdgeOptions={{ animated: false, style: { stroke: '#888', strokeWidth: 2 } }}>
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
        <Controls />
        <MiniMap nodeStrokeWidth={3} nodeColor={(n) => {
          if (n.id?.toString().startsWith('trigger-')) {
            const d = n.data as Record<string, unknown>; return (d.color as string) || '#50C878';
          }
          if (n.id?.toString().startsWith('stage-') || n.id?.toString().startsWith('fstage-')) return '#E85D75';
          if (n.id?.toString().startsWith('para-') || n.id?.toString().startsWith('opt-') || n.id?.toString().startsWith('fopt-')) {
            const d = n.data as Record<string, unknown>; return (d.color as string) || '#4A90D9';
          }
          const d = n.data as StoryNodeData;
          const cs = ['#4A90D9', '#50C878', '#F5A623', '#E85D75', '#9B59B6', '#1ABC9C'];
          return cs[((d?.groupId || 1) - 1) % cs.length] || '#4A90D9';
        }} />
      </ReactFlow>
    </div>
  );
};
