import React, { useState } from 'react';
import { Layout, Button, Upload, Space, message, Typography, Tabs, Table, Tag, Alert, Checkbox, Divider, Badge, Tooltip, Input } from 'antd';
import { FolderOpenOutlined, ExportOutlined, ReloadOutlined, FileAddOutlined, CheckSquareOutlined, BorderOutlined, SearchOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { StoryFlow } from './components/StoryFlow';
import { FrameEditor } from './components/FrameEditor';
import { GroupEditor } from './components/GroupEditor';
import { useStoryStore } from './store/useStoryStore';
import { exportToExcel } from './utils/excelParser';

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;

const App: React.FC = () => {
  const data = useStoryStore(s => s.data);
  const loading = useStoryStore(s => s.loading);
  const error = useStoryStore(s => s.error);
  const loadFromFolder = useStoryStore(s => s.loadFromFolder);
  const loadDraftFromFolder = useStoryStore(s => s.loadDraftFromFolder);
  const loadedFiles = useStoryStore(s => s.loadedFiles);
  const draftFiles = useStoryStore(s => s.draftFiles);
  const selectedFrameId = useStoryStore(s => s.selectedFrameId);
  const selectedGroupId = useStoryStore(s => s.selectedGroupId);
  const selectedOptionBehaviorId = useStoryStore(s => s.selectedOptionBehaviorId);
  const selectedTriggerGroupId = useStoryStore(s => s.selectedTriggerGroupId);
  const visibleGroups = useStoryStore(s => s.visibleGroups);
  const toggleGroup = useStoryStore(s => s.toggleGroup);
  const setAllGroupsVisible = useStoryStore(s => s.setAllGroupsVisible);
  const groupSearch = useStoryStore(s => s.groupSearch);
  const setGroupSearch = useStoryStore(s => s.setGroupSearch);

  const [activeTab, setActiveTab] = useState('flow');

  const uploadConfig: UploadProps = {
    name: 'file', multiple: true, accept: '.xlsx,.xls', showUploadList: false,
    beforeUpload: (f, fl) => { if (f===fl[fl.length-1]){ loadFromFolder(fl as unknown as FileList); message.success(`路径1: 已加载 ${fl.length} 个文件`); } return false; },
  };
  const uploadDraft: UploadProps = {
    name: 'file', multiple: true, accept: '.xlsx,.xls', showUploadList: false,
    beforeUpload: (f, fl) => { if (f===fl[fl.length-1]){ loadDraftFromFolder(fl as unknown as FileList); message.success(`路径2: 已加载 ${fl.length} 个新剧情`); } return false; },
  };

  const handleExport = () => {
    if (data.frames.length===0) { message.warning('没有数据'); return; }
    exportToExcel(data.frames, data.groups, data.behaviors); message.success('导出成功');
  };

  const allChecked = visibleGroups.size===data.groups.length && data.groups.length>0;
  const toggleAll = () => setAllGroupsVisible(!allChecked);

  // 搜索过滤
  const filteredGroups = data.groups.filter(g => {
    if (!groupSearch) return true;
    const q = groupSearch.toLowerCase();
    return g.name.toLowerCase().includes(q) || String(g.groupId).includes(q);
  });

  const frameColumns = [
    { title:'FrameId', dataIndex:'frameId', key:'frameId', width:80 },
    { title:'Group', dataIndex:'groupId', key:'groupId', width:60 },
    { title:'Next', dataIndex:'nextFrame', key:'nextFrame', width:70 },
    { title:'文本', dataIndex:'text', key:'text', ellipsis:true },
    { title:'背景', dataIndex:'picture2', key:'picture2', width:120, ellipsis:true },
    { title:'末帧', dataIndex:'isLastFrame', key:'isLastFrame', width:50, render:(v:boolean)=>v?<Tag color="red">是</Tag>:null },
    { title:'行为', dataIndex:'behavior', key:'behavior', width:120, ellipsis:true, render:(v:string)=>v?<Tag color="orange">有分支</Tag>:null },
  ];

  // 右侧面板：Group层显示GroupEditor，Frame层或选中frame时显示FrameEditor
  const showGroupEditor = (selectedGroupId !== null || selectedOptionBehaviorId !== null || selectedTriggerGroupId !== null) && selectedFrameId === null;
  const showFrameEditor = selectedFrameId !== null;

  return (
    <Layout style={{height:'100vh'}}>
      <Header style={{background:'#fff',borderBottom:'1px solid #e8e8e8',display:'flex',alignItems:'center',padding:'0 16px',height:48,lineHeight:'48px'}}>
        <Title level={4} style={{margin:0,marginRight:24,whiteSpace:'nowrap'}}>📖 剧情配置工具</Title>
        <Space size={4}>
          <Tooltip title="路径1: 加载已有配置文件"><Upload {...uploadConfig} directory><Button icon={<FolderOpenOutlined/>} loading={loading} size="small">配置</Button></Upload></Tooltip>
          <Tooltip title="路径2: 加载待录入的范例文本"><Upload {...uploadDraft}><Button icon={<FileAddOutlined/>} loading={loading} size="small">新剧情</Button></Upload></Tooltip>
          <Divider type="vertical"/>
          <Button icon={<ExportOutlined/>} onClick={handleExport} disabled={data.frames.length===0} size="small">导出</Button>
          <Button icon={<ReloadOutlined/>} onClick={()=>window.location.reload()} size="small"/>
        </Space>
        <div style={{flex:1}}/>
        <Text type="secondary" style={{fontSize:11}}>
          {loadedFiles.length>0&&<span>路径1: {loadedFiles.join(', ')}&nbsp;</span>}
          {draftFiles.length>0&&<span style={{color:'#F5A623'}}>| 路径2: {draftFiles.join(', ')}&nbsp;</span>}
          | {data.frames.length}帧 {data.groups.length}组
          | NPC: {Object.keys(data.lookup.npcMap).length}个
          | 反向映射: {Object.keys(data.lookup.npcIdToName).length}个
        </Text>
      </Header>
      {error&&<Alert message="加载错误" description={error} type="error" showIcon closable style={{margin:8}}/>}
      <Layout style={{flex:1}}>
        <Sider width={220} style={{background:'#fafafa',borderRight:'1px solid #e8e8e8'}}>
          <div style={{padding:'8px 8px 4px',flexShrink:0}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
              <Text strong style={{fontSize:13}}>段落列表</Text>
            </div>
            <Input size="small" placeholder="搜索段落名/ID" prefix={<SearchOutlined/>} value={groupSearch}
              onChange={e=>setGroupSearch(e.target.value)} allowClear style={{marginBottom:4}}/>
          </div>
          <div style={{flex:1,overflowY:'auto',overflowX:'hidden',padding:'0 8px 8px',minHeight:0}}>
            {filteredGroups.map(g=>{
              const checked=visibleGroups.has(g.groupId);
              const fCount=data.frames.filter(f=>f.groupId===g.groupId).length;
              const hasBeh=data.frames.filter(f=>f.groupId===g.groupId).some(f=>f.behavior);
              const isDraft=draftFiles.length>0&&g.groupId>80000;
              const isSelected=selectedGroupId===g.groupId;
              return (
                <div key={g.groupId} style={{padding:'4px 6px',marginBottom:2,borderRadius:6,
                  background:isSelected?'#d6e4ff':checked?'#e6f7ff':'#fff',
                  border:isSelected?'1px solid #1890ff':checked?'1px solid #91d5ff':'1px solid #eee',
                  cursor:'pointer',fontSize:12}} onClick={()=>toggleGroup(g.groupId)}>
                  <Checkbox checked={checked} style={{marginRight:6}}/>
                  <Badge count={fCount} size="small" offset={[2,-2]} style={{backgroundColor:'#4A90D9'}}>
                    <span style={{fontWeight:checked?'bold':'normal',color:isSelected?'#1890ff':checked?'#1890ff':'#333'}}>
                      {isDraft&&<Tag color="orange" style={{fontSize:9,margin:'0 4px 0 0',padding:'0 4px',lineHeight:'16px'}}>新</Tag>}
                      #{g.groupId} {g.name.length>12?g.name.slice(0,10)+'..':g.name}
                    </span>
                  </Badge>
                  {hasBeh&&<span style={{fontSize:10,color:'#F5A623',marginLeft:4}}>⚡</span>}
                </div>
              );
            })}
            {filteredGroups.length===0&&<Text type="secondary" style={{fontSize:12}}>无匹配段落</Text>}
          </div>
        </Sider>

        <Content style={{flex:1,position:'relative',background:'#f5f5f5'}}>
          <Tabs activeKey={activeTab} onChange={setActiveTab} style={{background:'#fff',padding:'0 8px'}}
            tabBarExtraContent={<Text style={{fontSize:12,color:'#999'}}>💡 单击选段 | 双击展开帧 | Ctrl+Z/Y</Text>}
            items={[
              { key:'flow', label:`📊 流程图 (${visibleGroups.size}段)`,
                children:(<div style={{height:'calc(100vh - 140px)'}}>
                  {data.frames.length===0?(<div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',flexDirection:'column',gap:16}}>
                    <Text type="secondary" style={{fontSize:16}}>📂 请通过「配置」或「新剧情」加载文件</Text></div>):(<StoryFlow/>)}
                </div>)},
              { key:'table', label:'📋 帧列表',
                children:(<div style={{height:'calc(100vh - 140px)',overflow:'auto',padding:8}}>
                  <Table dataSource={data.frames} columns={frameColumns} rowKey="frameId" size="small" pagination={{pageSize:50}} scroll={{y:'calc(100vh - 240px)'}}
                    onRow={(r)=>({onClick:()=>useStoryStore.getState().selectFrame(r.frameId),style:{background:r.frameId===selectedFrameId?'#e6f7ff':undefined,cursor:'pointer'}})}/>
                </div>)},
            ]}/>
        </Content>

        <Sider width={320} style={{background:'#fff',borderLeft:'1px solid #e8e8e8',overflow:'auto'}}>
          {showGroupEditor ? <GroupEditor /> : <FrameEditor />}
        </Sider>
      </Layout>
    </Layout>
  );
};

export default App;
