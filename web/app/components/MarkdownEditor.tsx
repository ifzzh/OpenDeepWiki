import React, { useState } from 'react';
import { Input, Tabs, Card, Button, Space } from 'antd';
import { SaveOutlined, EyeOutlined, EditOutlined } from '@ant-design/icons';
import { DocumentContent } from './document';

const { TextArea } = Input;
const { TabPane } = Tabs;

interface MarkdownEditorProps {
  content: string;
  onChange: (content: string) => void;
  onSave: () => void;
  document: any;
  owner: string;
  name: string;
  token: any;
}

/**
 * Markdown编辑器组件
 * 支持编辑和预览Markdown内容
 */
const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  content,
  onChange,
  onSave,
  document,
  owner,
  name,
  token
}) => {
  const [activeTab, setActiveTab] = useState<string>('edit');

  // 处理内容变更
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  return (
    <Card
      title="Markdown编辑器"
      extra={
        <Space>
          <Button
            icon={<SaveOutlined />}
            type="primary"
            onClick={onSave}
          >
            保存
          </Button>
        </Space>
      }
    >
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        tabBarExtraContent={
          activeTab === 'edit' ? (
            <Button
              icon={<EyeOutlined />}
              onClick={() => setActiveTab('preview')}
            >
              预览
            </Button>
          ) : (
            <Button
              icon={<EditOutlined />}
              onClick={() => setActiveTab('edit')}
            >
              编辑
            </Button>
          )
        }
      >
        <TabPane tab="编辑" key="edit">
          <TextArea
            value={content}
            onChange={handleContentChange}
            style={{
              height: 500,
              fontFamily: 'monospace',
              fontSize: '14px',
              lineHeight: '1.5'
            }}
            autoSize={{ minRows: 20, maxRows: 30 }}
          />
        </TabPane>
        <TabPane tab="预览" key="preview">
          <div style={{ height: 500, overflow: 'auto' }}>
            {activeTab === 'preview' && (
              <DocumentContent
                document={{
                  ...document,
                  content
                }}
                owner={owner}
                name={name}
                token={token}
              />
            )}
          </div>
        </TabPane>
      </Tabs>
    </Card>
  );
};

export default MarkdownEditor; 