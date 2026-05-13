import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { OptionData } from '../utils/flowConverter';
import { BEHAVIOR_TYPE_NAMES } from '../utils/flowConverter';
import { BranchesOutlined, ThunderboltOutlined } from '@ant-design/icons';

const StoryOptionNode: React.FC<NodeProps> = ({ data, selected }) => {
  const d = data as unknown as OptionData;
  const typeName = BEHAVIOR_TYPE_NAMES[d.behaviorType] || `类型${d.behaviorType}`;
  const isNav = d.behaviorType === 2;
  const isBattle = d.behaviorType === 10;

  let bg = '#F0F0F0';
  let border = '#999';
  let textColor = '#555';
  if (isNav) { bg = '#FFF8E1'; border = '#F5A623'; textColor = '#B8600A'; }
  else if (isBattle) { bg = '#FFF0F0'; border = '#E85D75'; textColor = '#A03040'; }

  return (
    <div
      style={{
        width: 100, height: 40,
        background: bg, borderRadius: 6,
        border: `1.5px solid ${border}`,
        padding: '1px 6px',
        boxShadow: selected ? '0 0 0 2px rgba(245,166,35,0.3)' : '0 1px 4px rgba(0,0,0,0.06)',
        cursor: 'pointer', transition: 'box-shadow 0.2s',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        fontSize: 10, fontWeight: 'bold',
        color: textColor,
      }}
      title={isBattle && d.stageName ? `${d.optionLabel} · ${d.stageName}` : `${d.optionLabel} · ${typeName}`}
    >
      <Handle type="target" position={Position.Left} style={{ background: border, width: 6, height: 6 }} />
      <Handle type="source" position={Position.Right} style={{ background: border, width: 6, height: 6 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {isBattle ? <ThunderboltOutlined style={{ fontSize: 9 }} /> : <BranchesOutlined style={{ fontSize: 9 }} />}
        <span>{d.optionLabel.length > 7 ? d.optionLabel.slice(0, 6) + '..' : d.optionLabel}</span>
      </div>
      <div style={{ fontSize: 8, color: textColor, opacity: 0.7, lineHeight: 1.2 }}>
        {isBattle && d.stageName ? d.stageName.slice(0, 10) : typeName}
      </div>
    </div>
  );
};

export default memo(StoryOptionNode);
