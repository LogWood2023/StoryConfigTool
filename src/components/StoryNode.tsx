import React, { memo, useState } from 'react';
import { Handle, Position, type NodeProps, NodeToolbar } from '@xyflow/react';
import type { StoryNodeData } from '../types';
import { Tag, Tooltip } from 'antd';
import {
  MessageOutlined, SoundOutlined, PictureOutlined, BranchesOutlined,
} from '@ant-design/icons';

const StoryFrameNode: React.FC<NodeProps> = ({ data, selected }) => {
  const nodeData = data as unknown as StoryNodeData;
  const [showToolbar, setShowToolbar] = useState(false);

  const isLast = nodeData.isLastFrame;
  const hasBehavior = !!nodeData.behavior;
  const truncatedText = nodeData.text.length > 60
    ? nodeData.text.slice(0, 57) + '...'
    : nodeData.text;

  return (
    <div
      className="story-node"
      onMouseEnter={() => setShowToolbar(true)}
      onMouseLeave={() => setShowToolbar(false)}
      style={{
        borderColor: selected ? '#1890ff' : undefined,
        boxShadow: selected ? '0 0 0 2px rgba(24,144,255,0.3)' : undefined,
      }}
    >
      <Handle type="target" position={Position.Left} style={{ background: '#555' }} />
      <Handle type="source" position={Position.Right} style={{ background: '#555' }} />

      {/* Toolbar */}
      {showToolbar && (
        <NodeToolbar position={Position.Top} isVisible={showToolbar}>
          <div style={{ display: 'flex', gap: 4 }}>
            <Tag color="blue">#{nodeData.frameId}</Tag>
            <Tag color="cyan">{nodeData.groupName}</Tag>
          </div>
        </NodeToolbar>
      )}

      {/* Content */}
      <div style={{ marginBottom: 4, fontWeight: 'bold', fontSize: 12, color: '#555' }}>
        [{nodeData.role || '旁白'}] {isLast && ' 🔚'}
      </div>
      <div style={{ fontSize: 11, lineHeight: 1.5, marginBottom: 4, wordBreak: 'break-all' }}>
        {truncatedText}
      </div>

      {/* Badges */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {nodeData.background && (
          <Tooltip title={nodeData.background}>
            <Tag icon={<PictureOutlined />} color="green" style={{ fontSize: 10, margin: 0 }}>
              BG
            </Tag>
          </Tooltip>
        )}
        {nodeData.sound && (
          <Tooltip title={`音效: ${nodeData.sound}`}>
            <Tag icon={<SoundOutlined />} color="purple" style={{ fontSize: 10, margin: 0 }}>
              音
            </Tag>
          </Tooltip>
        )}
        {hasBehavior && (
          <Tag icon={<BranchesOutlined />} color="orange" style={{ fontSize: 10, margin: 0 }}>
            分支
          </Tag>
        )}
        {nodeData.text && (
          <Tooltip title={nodeData.text}>
            <Tag icon={<MessageOutlined />} color="default" style={{ fontSize: 10, margin: 0 }}>
              文本
            </Tag>
          </Tooltip>
        )}
      </div>
    </div>
  );
};

export default memo(StoryFrameNode);
