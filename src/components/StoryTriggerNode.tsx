import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import {
  RocketOutlined,
  UserOutlined,
  HomeOutlined,
  TeamOutlined,
  FlagOutlined,
  EnvironmentOutlined,
  FilterOutlined,
  LinkOutlined,
  ThunderboltOutlined,
  QuestionOutlined,
  CoffeeOutlined,
  HomeFilled,
  ToolOutlined,
  ShoppingOutlined,
  MedicineBoxOutlined,
  SwapOutlined,
} from '@ant-design/icons';

export interface TriggerNodeData {
  [key: string]: unknown;
  groupId: number;
  triggerType: string;
  triggerIcon: string;
  triggerSummary: string;
  color: string;
  triggerDetail?: string;
  townId?: number;
  townName?: string;
  npcPosition?: string;
  npcId?: number;
  npcName?: string;
}

const getIconComponent = (iconName: string) => {
  switch (iconName) {
    case 'user': return <UserOutlined />;
    case 'home': return <HomeOutlined />;
    case 'team': return <TeamOutlined />;
    case 'flag': return <FlagOutlined />;
    case 'environment': return <EnvironmentOutlined />;
    case 'filter': return <FilterOutlined />;
    case 'link': return <LinkOutlined />;
    case 'thunderbolt': return <ThunderboltOutlined />;
    case 'coffee': return <CoffeeOutlined />;
    case 'bed': return <HomeFilled />;
    case 'tool': return <ToolOutlined />;
    case 'shopping': return <ShoppingOutlined />;
    case 'medicine': return <MedicineBoxOutlined />;
    case 'random': return <SwapOutlined />;
    case 'rocket': return <RocketOutlined />;
    default: return <RocketOutlined />;
  }
};

const StoryTriggerNode: React.FC<NodeProps> = ({ data, selected }) => {
  const d = data as unknown as TriggerNodeData;
  // 安全检查
  if (!d) {
    return null;
  }
  const IconComponent = getIconComponent(d.triggerIcon || 'rocket');

  return (
    <div
      style={{
        width: 130, height: 50,
        background: '#F0FFF4', borderRadius: 8,
        border: `2px solid ${d.color || '#50C878'}`,
        padding: '4px 8px',
        boxShadow: selected ? `0 0 0 2px ${d.color || '#50C878'}33` : '0 1px 4px rgba(0,0,0,0.08)',
        cursor: 'pointer', transition: 'box-shadow 0.2s',
        display: 'flex', alignItems: 'center', gap: 6,
        fontSize: 11, fontWeight: 'bold', color: d.color || '#50C878',
      }}
      title={`剧情组 ${d.groupId || 0} 触发方式: ${d.triggerType || 'unknown'}`}
    >
      <Handle type="target" position={Position.Left} style={{ background: d.color || '#50C878', width: 6, height: 6 }} />
      <Handle type="source" position={Position.Right} style={{ background: d.color || '#50C878', width: 6, height: 6 }} />
      <span style={{ fontSize: 14 }}>{IconComponent}</span>
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2, overflow: 'hidden' }}>
        <span style={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
          {d.triggerType || 'trigger'}
        </span>
        <span style={{ fontSize: 9, color: '#666', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
          {(d.triggerSummary || '').length > 15 ? (d.triggerSummary || '').slice(0, 14) + '..' : (d.triggerSummary || '')}
        </span>
      </div>
    </div>
  );
};

export default memo(StoryTriggerNode);
