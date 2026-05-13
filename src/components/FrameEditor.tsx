import React from 'react';
import { Input, Select, Button, Space, Typography, Divider, Tag, Popconfirm } from 'antd';
import { DeleteOutlined, SaveOutlined } from '@ant-design/icons';
import { useStoryStore } from '../store/useStoryStore';
import type { StoryFrame } from '../types';

const { TextArea } = Input;
const { Title, Text } = Typography;

const FRAME_TYPES = [
  { value: 1, label: '1-对话' },
  { value: 2, label: '2-图文弹框大' },
  { value: 3, label: '3-全屏图文' },
  { value: 5, label: '5-图文弹框小' },
  { value: 7, label: '7-标题页' },
];

const BG_OPTIONS = [
  { value: 'story/ShiNei-BaiTian1', label: '室内-白天' },
  { value: 'story/ShiNei-YeWan1', label: '室内-夜晚' },
  { value: 'story/PingYuanTianDi-BaiTian1', label: '平原-白天' },
];

export const FrameEditor: React.FC = () => {
  const selectedFrameId = useStoryStore((s) => s.selectedFrameId);
  const data = useStoryStore((s) => s.data);
  const updateFrame = useStoryStore((s) => s.updateFrame);
  const deleteFrame = useStoryStore((s) => s.deleteFrame);
  const selectFrame = useStoryStore((s) => s.selectFrame);

  if (!selectedFrameId) {
    return (
      <div style={{ padding: 20, textAlign: 'center', color: '#999' }}>
        <Text type="secondary">👈 点击流程图中的节点来编辑</Text>
      </div>
    );
  }

  const frame = data.frames.find((f) => f.frameId === selectedFrameId);
  if (!frame) return null;

  const update = (updates: Partial<StoryFrame>) => {
    updateFrame(frame.frameId, updates);
  };

  return (
    <div style={{ padding: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Title level={5} style={{ margin: 0 }}>
          节点 #{frame.frameId}
        </Title>
        <Space>
          <Tag color="blue">Group {frame.groupId}</Tag>
          <Popconfirm
            title="确定删除此帧？"
            onConfirm={() => { deleteFrame(frame.frameId); selectFrame(null); }}
          >
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      </div>

      <Divider style={{ margin: '8px 0' }} />

      {/* 帧类型 */}
      <div style={{ marginBottom: 8 }}>
        <Text style={{ fontSize: 12, color: '#666' }}>帧类型</Text>
        <Select
          size="small"
          style={{ width: '100%', marginTop: 2 }}
          value={frame.type}
          onChange={(v) => update({ type: v })}
          options={FRAME_TYPES}
        />
      </div>

      {/* Group */}
      <div style={{ marginBottom: 8 }}>
        <Text style={{ fontSize: 12, color: '#666' }}>剧情组ID</Text>
        <Input
          size="small"
          type="number"
          value={frame.groupId}
          onChange={(e) => update({ groupId: Number(e.target.value) })}
        />
      </div>

      {/* NextFrame */}
      <div style={{ marginBottom: 8 }}>
        <Text style={{ fontSize: 12, color: '#666' }}>下一帧ID (空=末帧)</Text>
        <Input
          size="small"
          type="number"
          value={frame.nextFrame ?? ''}
          onChange={(e) => update({ nextFrame: e.target.value ? Number(e.target.value) : null })}
          placeholder="留空表示最后一帧"
        />
      </div>

      {/* 文本 */}
      <div style={{ marginBottom: 8 }}>
        <Text style={{ fontSize: 12, color: '#666' }}>台词文本</Text>
        <TextArea
          size="small"
          rows={2}
          value={frame.text}
          onChange={(e) => update({ text: e.target.value })}
        />
      </div>

      {/* 背景 */}
      <div style={{ marginBottom: 8 }}>
        <Text style={{ fontSize: 12, color: '#666' }}>背景图 (Picture_2)</Text>
        <Select
          size="small"
          style={{ width: '100%', marginTop: 2 }}
          value={frame.picture2 || undefined}
          onChange={(v) => update({ picture2: v })}
          options={BG_OPTIONS}
          allowClear
        />
      </div>

      {/* 音效 */}
      <div style={{ marginBottom: 8 }}>
        <Text style={{ fontSize: 12, color: '#666' }}>音效ID</Text>
        <Input
          size="small"
          value={frame.soundId}
          onChange={(e) => update({ soundId: e.target.value })}
          placeholder="如 1004"
        />
      </div>

      {/* AdditionPar */}
      <div style={{ marginBottom: 8 }}>
        <Text style={{ fontSize: 12, color: '#666' }}>AdditionPar (NPC站位)</Text>
        <Input
          size="small"
          value={frame.additionPar}
          onChange={(e) => update({ additionPar: e.target.value })}
          placeholder="如 1060,1,1,1001,0"
        />
      </div>

      {/* Behavior */}
      <div style={{ marginBottom: 8 }}>
        <Text style={{ fontSize: 12, color: '#666' }}>行为参数 (选项分支)</Text>
        <Input
          size="small"
          value={frame.behavior}
          onChange={(e) => update({ behavior: e.target.value })}
          placeholder="如 1,61001061;2,61001062"
        />
      </div>

      {/* AdditionalText */}
      <div style={{ marginBottom: 8 }}>
        <Text style={{ fontSize: 12, color: '#666' }}>附加文本 (性别变量)</Text>
        <Input
          size="small"
          value={frame.additionalText}
          onChange={(e) => update({ additionalText: e.target.value })}
          placeholder="如 1+先生|2+小姐"
        />
      </div>

      {/* Summary */}
      <div style={{ marginBottom: 8 }}>
        <Text style={{ fontSize: 12, color: '#666' }}>剧情梗概</Text>
        <TextArea
          size="small"
          rows={1}
          value={frame.summary}
          onChange={(e) => update({ summary: e.target.value })}
        />
      </div>
    </div>
  );
};
