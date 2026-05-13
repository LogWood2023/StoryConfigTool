import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { ThunderboltOutlined } from '@ant-design/icons';

export interface StageNodeData {
  [key: string]: unknown;
  stageId: number;
  stageName: string;
  groupId: number;
  stroyRules: { timing: number; groupId: number; extraParam: string }[];
  color: string;
}

const StoryStageNode: React.FC<NodeProps> = ({ data, selected }) => {
  const d = data as unknown as StageNodeData;

  return (
    <div
      style={{
        width: 140, height: 40,
        background: '#FFF0F0', borderRadius: 8,
        border: `2px solid #E85D75`,
        padding: '4px 8px',
        boxShadow: selected ? '0 0 0 2px rgba(232,93,117,0.3)' : '0 1px 4px rgba(0,0,0,0.08)',
        cursor: 'pointer', transition: 'box-shadow 0.2s',
        display: 'flex', alignItems: 'center', gap: 6,
        fontSize: 11, fontWeight: 'bold', color: '#A03040',
      }}
      title={`战斗场景: ${d.stageName}`}
    >
      <Handle type="target" position={Position.Left} style={{ background: '#E85D75', width: 6, height: 6 }} />
      <Handle type="source" position={Position.Right} style={{ background: '#E85D75', width: 6, height: 6 }} />
      <ThunderboltOutlined style={{ fontSize: 14, color: '#E85D75' }} />
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
        <span>{d.stageName.length > 10 ? d.stageName.slice(0, 9) + '..' : d.stageName}</span>
        <span style={{ fontSize: 9, color: '#999' }}>#{d.stageId}</span>
      </div>
    </div>
  );
};

export default memo(StoryStageNode);
