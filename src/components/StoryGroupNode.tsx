import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { ParagraphData } from '../utils/flowConverter';
import { Tag, Tooltip } from 'antd';
import {
  BranchesOutlined, FileTextOutlined, PictureOutlined,
  DoubleRightOutlined,
} from '@ant-design/icons';

const StoryGroupNode: React.FC<NodeProps> = ({ data, selected }) => {
  const d = data as unknown as ParagraphData;

  return (
    <div
      style={{
        minWidth: 260, maxWidth: 300,
        background: '#fff', borderRadius: 12,
        border: `2.5px solid ${d.color || '#4A90D9'}`,
        padding: 14,
        boxShadow: selected ? '0 0 0 3px rgba(24,144,255,0.3)' : '0 2px 8px rgba(0,0,0,0.08)',
        cursor: 'pointer', transition: 'box-shadow 0.2s',
      }}
      title="单击查看详情，双击展开帧"
    >
      <Handle type="target" position={Position.Left} style={{ background: d.color }} />
      <Handle type="source" position={Position.Right} style={{ background: d.color }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Tag color={d.color} style={{ margin: 0, fontWeight: 'bold', fontSize: 13 }}>#{d.groupId}</Tag>
        <span style={{ display: 'flex', gap: 4 }}>
          <Tag style={{ margin: 0, fontSize: 11 }}>P{d.paragraphIdx + 1}/{d.totalParagraphs}</Tag>
          <Tag style={{ margin: 0, fontSize: 11 }}>{d.frameCount} 帧</Tag>
        </span>
      </div>

      <div style={{ fontWeight: 'bold', fontSize: 14, marginBottom: 6, color: '#333' }}>
        {d.groupName || `剧情组 ${d.groupId}`}
      </div>

      {d.firstText && (
        <Tooltip title={d.firstText}>
          <div style={{
            fontSize: 11, color: '#666', lineHeight: 1.4,
            marginBottom: 6, maxHeight: 32, overflow: 'hidden',
            borderLeft: `3px solid ${d.color}`, paddingLeft: 8,
          }}>
            <FileTextOutlined style={{ marginRight: 4 }} />
            {d.firstText.length > 50 ? d.firstText.slice(0, 47) + '...' : d.firstText}
          </div>
        </Tooltip>
      )}

      {d.summary && (
        <div style={{ fontSize: 10, color: '#999', marginBottom: 6, maxHeight: 28, overflow: 'hidden', lineHeight: 1.4 }}>
          {d.summary.length > 80 ? d.summary.slice(0, 77) + '...' : d.summary}
        </div>
      )}

      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 4 }}>
        {d.background && (
          <Tooltip title={d.background}>
            <Tag icon={<PictureOutlined />} color="green" style={{ fontSize: 10, margin: 0 }}>背景</Tag>
          </Tooltip>
        )}
        {d.hasBehavior && (
          <Tag icon={<BranchesOutlined />} color="orange" style={{ fontSize: 10, margin: 0 }}>
            {d.behaviorCount} 分支
          </Tag>
        )}
      </div>

      <div style={{ textAlign: 'center', fontSize: 10, color: '#bbb', marginTop: 2 }}>
        <DoubleRightOutlined /> 单击查看详情，双击展开帧
      </div>
    </div>
  );
};

export default memo(StoryGroupNode);
