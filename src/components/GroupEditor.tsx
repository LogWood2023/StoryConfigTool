import React, { useState } from 'react';
import { Typography, Divider, Tag, List, Badge, Tooltip, Descriptions, Input, Button, Select } from 'antd';
import { UserOutlined, MessageOutlined, BranchesOutlined, PictureOutlined, ThunderboltOutlined, EditOutlined, SaveOutlined, CloseOutlined, RocketOutlined } from '@ant-design/icons';
import { useStoryStore } from '../store/useStoryStore';
import { resolveNpcDisplay, splitFramesIntoParagraphs, BEHAVIOR_TYPE_NAMES } from '../utils/flowConverter';
import { STAGE_STORY_TIMING_NAMES } from '../types';
import type { StoryFrame, StageEntry } from '../types';

const { Title, Text, Paragraph } = Typography;

export const GroupEditor: React.FC = () => {
  const selectedGroupId = useStoryStore(s => s.selectedGroupId);
  const selectedParagraphIdx = useStoryStore(s => s.selectedParagraphIdx);
  const selectedOptionBehaviorId = useStoryStore(s => s.selectedOptionBehaviorId);
  const selectedTriggerGroupId = useStoryStore(s => s.selectedTriggerGroupId);
  const data = useStoryStore(s => s.data);
  const updateBehavior = useStoryStore(s => s.updateBehavior);

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editShowName, setEditShowName] = useState('');
  const [editType, setEditType] = useState<number>(0);
  const [editParam, setEditParam] = useState('');
  const [editAddBeh, setEditAddBeh] = useState('');
  const [editMarkId, setEditMarkId] = useState('');

  if (selectedTriggerGroupId !== null && selectedTriggerGroupId !== undefined) {
    const group = data.groups.find(g => g.groupId === selectedTriggerGroupId);
    if (!group) return null;

    // 获取所有触发方式
    const triggers = data.lookup.groupIdToTriggers?.[selectedTriggerGroupId] || [];

    // 解析 TriggerCondition 和 SelfAddCondition
    const parseConditions = (condStr?: string) => {
      const results: Array<{ id: number, value?: string, cond?: any }> = [];
      if (!condStr) return results;
      const parts = condStr.split(';').filter(p => p.trim());
      for (const part of parts) {
        const [cid, val] = part.split(',');
        const idNum = Number(cid);
        if (!isNaN(idNum) && data.lookup.conditionIdToEntry[idNum]) {
          results.push({
            id: idNum,
            value: val,
            cond: data.lookup.conditionIdToEntry[idNum]
          });
        }
      }
      return results;
    };

    const triggerConds = parseConditions(group.triggerCondition);
    const selfAddConds = parseConditions(group.selfAddCondition);

    // 获取触发方式的显示名称和颜色
    const getTriggerDisplayName = (type: string) => {
      const names: Record<string, string> = {
        'npc': 'NPC触发',
        'town': '城镇触发',
        'guild': '宗门触发',
        'task': '任务触发',
        'mapEvent': '地图事件',
        'condition': '条件触发',
        'chain': '剧情连锁',
        'behavior': '行为触发',
        'random': '随机触发',
        'init': '游戏初始',
        'pub': '酒馆',
        'hotel': '客栈',
        'smithy': '铁匠铺',
        'clothes': '布坊',
        'danfu': '丹符铺',
      };
      return names[type] || type;
    };

    const getTriggerColor = (type: string) => {
      const colors: Record<string, string> = {
        'npc': 'blue',
        'town': 'green',
        'guild': 'purple',
        'task': 'orange',
        'mapEvent': 'cyan',
        'condition': 'purple',
        'chain': 'geekblue',
        'behavior': 'gold',
        'random': 'magenta',
        'init': 'red',
        'pub': 'brown',
        'hotel': 'teal',
        'smithy': 'gray',
        'clothes': 'pink',
        'danfu': 'violet',
      };
      return colors[type] || 'default';
    };

    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '12px 12px 0', flex: 1, overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <Title level={5} style={{ margin: 0 }}>
              <RocketOutlined style={{ color: '#50C878', marginRight: 4 }} />
              {group.name}
            </Title>
            <Tag color="green">#{selectedTriggerGroupId}</Tag>
          </div>

          <Divider style={{ margin: '8px 0', fontSize: 12 }}>触发方式</Divider>
          {triggers.length > 0 ? (
            <List
              size="small"
              dataSource={triggers}
              renderItem={(trigger) => (
                <List.Item style={{ padding: '6px 8px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Tag color={getTriggerColor(trigger.type)} style={{ margin: 0 }}>
                      {getTriggerDisplayName(trigger.type)}
                    </Tag>
                    {trigger.sourceName && <Text style={{ fontSize: 11, color: '#666' }}>{trigger.sourceName}</Text>}
                    <Text style={{ fontSize: 11, color: '#888' }}>{trigger.detail}</Text>
                  </div>
                </List.Item>
              )}
            />
          ) : (
            <Text type="secondary" style={{ fontSize: 12 }}>无触发方式</Text>
          )}

          <Divider style={{ margin: '16px 0 8px', fontSize: 12 }}>触发条件 (TriggerCondition)</Divider>
          {triggerConds.length > 0 ? (
            <List
              size="small"
              dataSource={triggerConds}
              renderItem={(item) => (
                <List.Item style={{ padding: '6px 8px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Tag color={item.cond?.type === 1 ? 'blue' : 'default'} style={{ margin: 0 }}>
                      {item.cond?.id} {item.cond?.name}
                    </Tag>
                    {item.value && <Text style={{ fontSize: 11, color: '#666' }}>值: {item.value}</Text>}
                    {item.cond?.param && <Text style={{ fontSize: 11, color: '#999' }}>参数: {item.cond.param}</Text>}
                  </div>
                </List.Item>
              )}
            />
          ) : (
            <Text type="secondary" style={{ fontSize: 12 }}>无</Text>
          )}

          <Divider style={{ margin: '16px 0 8px', fontSize: 12 }}>完成后增加 (SelfAddCondition)</Divider>
          {selfAddConds.length > 0 ? (
            <List
              size="small"
              dataSource={selfAddConds}
              renderItem={(item) => (
                <List.Item style={{ padding: '6px 8px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Tag color={item.cond?.type === 1 ? 'purple' : 'default'} style={{ margin: 0 }}>
                      + {item.cond?.id} {item.cond?.name}
                    </Tag>
                    {item.cond?.param && <Text style={{ fontSize: 11, color: '#999' }}>参数: {item.cond.param}</Text>}
                  </div>
                </List.Item>
              )}
            />
          ) : (
            <Text type="secondary" style={{ fontSize: 12 }}>无</Text>
          )}

          <Divider style={{ margin: '16px 0 8px', fontSize: 12 }}>其他信息</Divider>
          <Descriptions size="small" column={1}>
            {group.notes && <Descriptions.Item label="备注">{group.notes}</Descriptions.Item>}
          </Descriptions>
        </div>
      </div>
    );
  }

  if (selectedOptionBehaviorId !== null && selectedOptionBehaviorId !== undefined) {
    const bhv = data.behaviors.find(b => b.behaviorId === selectedOptionBehaviorId);
    if (!bhv) return null;
    const typeName = BEHAVIOR_TYPE_NAMES[bhv.type] || `类型${bhv.type}`;

    // Stage info for type=10
    let stageEntry: StageEntry | undefined;
    let stageStoriesStr = '';
    if (bhv.type === 10) {
      const stageId = parseInt(bhv.parameter) || 0;
      stageEntry = data.lookup.stageIdToEntry[stageId];
      if (stageEntry) {
        stageStoriesStr = stageEntry.stroy
          .map(r => `${STAGE_STORY_TIMING_NAMES[r.timing] || r.timing} → 组${r.groupId}` + (r.extraParam ? `(${r.extraParam})` : ''))
          .join('；');
      }
    }

    const startEdit = () => {
      setEditName(bhv.name);
      setEditShowName(bhv.showName);
      setEditType(bhv.type);
      setEditParam(bhv.parameter);
      setEditAddBeh(bhv.additionBehavior);
      setEditMarkId(bhv.markId);
      setEditing(true);
    };
    const cancelEdit = () => setEditing(false);
    const saveEdit = () => {
      updateBehavior(bhv.behaviorId, {
        name: editName, showName: editShowName, type: editType,
        parameter: editParam, additionBehavior: editAddBeh, markId: editMarkId,
      });
      setEditing(false);
    };

    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '12px 12px 0', flex: 1, overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <Title level={5} style={{ margin: 0 }}>
              <ThunderboltOutlined style={{ color: '#F5A623', marginRight: 4 }} />
              {editing ? '编辑行为' : (bhv.showName || `行为#${bhv.behaviorId}`)}
            </Title>
            <span>
              <Tag color="orange">#{bhv.behaviorId}</Tag>
              {!editing ? (
                <Button size="small" type="link" icon={<EditOutlined />} onClick={startEdit} />
              ) : (
                <>
                  <Button size="small" type="link" icon={<SaveOutlined />} onClick={saveEdit} />
                  <Button size="small" type="link" icon={<CloseOutlined />} onClick={cancelEdit} />
                </>
              )}
            </span>
          </div>

          {editing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
              <Text style={{ fontSize: 11 }}>名称 (后台)</Text>
              <Input size="small" value={editName} onChange={e => setEditName(e.target.value)} />
              <Text style={{ fontSize: 11 }}>显示文本</Text>
              <Input size="small" value={editShowName} onChange={e => setEditShowName(e.target.value)} />
              <Text style={{ fontSize: 11 }}>行为类型</Text>
              <Select size="small" value={editType} onChange={v => setEditType(v)}
                options={Object.entries(BEHAVIOR_TYPE_NAMES).map(([k, v]) => ({ value: Number(k), label: `[${k}] ${v}` }))} />
              <Text style={{ fontSize: 11 }}>参数</Text>
              <Input size="small" value={editParam} onChange={e => setEditParam(e.target.value)} />
              <Text style={{ fontSize: 11 }}>附加行为</Text>
              <Input size="small" value={editAddBeh} onChange={e => setEditAddBeh(e.target.value)} />
              <Text style={{ fontSize: 11 }}>标记ID</Text>
              <Input size="small" value={editMarkId} onChange={e => setEditMarkId(e.target.value)} />
            </div>
          ) : (
            <>
              <Descriptions size="small" column={1} style={{ marginTop: 8 }}>
                <Descriptions.Item label="功能类型"><Tag color="blue">{typeName}</Tag></Descriptions.Item>
                {bhv.parameter && <Descriptions.Item label="参数">{bhv.parameter}</Descriptions.Item>}
                {bhv.additionBehavior && <Descriptions.Item label="附加行为">{bhv.additionBehavior}</Descriptions.Item>}
                {bhv.markId && <Descriptions.Item label="标记ID">{bhv.markId}</Descriptions.Item>}
                {bhv.name && <Descriptions.Item label="备注">{bhv.name}</Descriptions.Item>}
              </Descriptions>
              {stageEntry && (
                <div style={{ marginTop: 12 }}>
                  <Divider style={{ margin: '6px 0', fontSize: 12 }}>战斗场景</Divider>
                  <Descriptions size="small" column={1}>
                    <Descriptions.Item label="场景名"><Tag color="red">{stageEntry.name}</Tag></Descriptions.Item>
                    <Descriptions.Item label="ID">#{stageEntry.stageId}</Descriptions.Item>
                  </Descriptions>
                  <Divider style={{ margin: '6px 0', fontSize: 12 }}>触发剧情</Divider>
                  <Paragraph style={{ fontSize: 11, color: '#555', whiteSpace: 'pre-wrap' }}>
                    {stageStoriesStr || '(无)'}
                  </Paragraph>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  if (!selectedGroupId) return (
    <div style={{ padding: 20, textAlign: 'center', color: '#999' }}>
      <Text type="secondary">👈 单击流程图中的段落节点查看详情</Text>
    </div>
  );

  const group = data.groups.find(g => g.groupId === selectedGroupId);
  const allFrames = data.frames
    .filter(f => f.groupId === selectedGroupId)
    .sort((a, b) => a.frameId - b.frameId);

  let frames: StoryFrame[];
  let paraLabel = '';
  if (selectedParagraphIdx !== null) {
    const paras = splitFramesIntoParagraphs(allFrames);
    frames = paras[selectedParagraphIdx] || [];
    paraLabel = ` 段落${selectedParagraphIdx + 1}/${paras.length}`;
  } else {
    frames = allFrames;
  }

  if (!group) return null;

  const bg = frames.length > 0 ? frames[0].picture2 : '';
  const lastFrame = frames[frames.length - 1];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '12px 12px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <Title level={5} style={{ margin: 0 }}>
            #{selectedGroupId} {group.name}{paraLabel}
          </Title>
          <Tag color="blue">{frames.length} 帧</Tag>
        </div>
        {bg && (<div style={{ marginBottom: 4 }}><Tag icon={<PictureOutlined />} color="green">{bg}</Tag></div>)}
        <Divider style={{ margin: '6px 0' }}>对话内容</Divider>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px 12px', minHeight: 0 }}>
        <List
          size="small"
          dataSource={frames}
          renderItem={(f, idx) => {
            const npcName = resolveNpcDisplay(f.additionPar, data.lookup);
            const isLast = f.isLastFrame || idx === frames.length - 1;
            const hasOpt = !!f.behavior;

            let optNames: string[] = [];
            if (hasOpt) {
              const bm = new Map(data.behaviors.map(b => [b.behaviorId, b]));
              for (const part of f.behavior.split(';')) {
                const m = part.match(/(\d+),(\d+)/);
                if (m) { const bhv = bm.get(parseInt(m[2])); if (bhv) optNames.push(bhv.showName); }
              }
            }

            return (
              <List.Item
                key={f.frameId}
                style={{
                  padding: '6px 8px', marginBottom: 4, borderRadius: 6,
                  background: '#fafafa', borderLeft: `3px solid ${hasOpt ? '#F5A623' : '#4A90D9'}`,
                  fontSize: 12,
                }}
              >
                <List.Item.Meta
                  avatar={
                    <Badge count={idx + 1} size="small" style={{ backgroundColor: '#4A90D9', fontSize: 10 }}>
                      <UserOutlined style={{ fontSize: 16, color: '#4A90D9', opacity: 0 }} />
                    </Badge>
                  }
                  title={
                    <span style={{ fontSize: 12 }}>
                      <Tag color="default" style={{ fontSize: 10, marginRight: 4 }}>{npcName}</Tag>
                      {isLast && <Tag color="red" style={{ fontSize: 10 }}>末帧</Tag>}
                      {hasOpt && <Tag icon={<BranchesOutlined />} color="orange" style={{ fontSize: 10 }}>{optNames.join(' / ')}</Tag>}
                    </span>
                  }
                  description={
                    <Tooltip title={f.text}>
                      <Text style={{ fontSize: 11, color: '#555', lineHeight: 1.5 }}>
                        <MessageOutlined style={{ marginRight: 4, fontSize: 10 }} />
                        {f.text.length > 80 ? f.text.slice(0, 77) + '...' : f.text}
                      </Text>
                    </Tooltip>
                  }
                />
              </List.Item>
            );
          }}
        />
      </div>

      {lastFrame?.summary && (
        <div style={{ padding: '0 12px 8px' }}>
          <Divider style={{ margin: '4px 0' }}>梗概</Divider>
          <Paragraph style={{ fontSize: 11, color: '#888', margin: 0 }}>{lastFrame.summary}</Paragraph>
        </div>
      )}
    </div>
  );
};
