'use client'
import { useState, useEffect } from 'react';
import { Card, Spin, Tabs, Button, Form, Input, Select, message, Space, Tree, Typography } from 'antd';
import { EditOutlined, SaveOutlined, FolderOutlined, FileOutlined } from '@ant-design/icons';
import { useParams } from 'next/navigation';
import { 
  getRepositoryById, 
  updateRepository, 
  getRepositoryFiles,
  getRepositoryFileContent,
  saveRepositoryFileContent,
  UpdateRepositoryRequest 
} from '../../../services/repositoryService';

const { Title, Text } = Typography;
const { DirectoryTree } = Tree;

// 定义文件树节点类型
interface TreeNode {
  title: string;
  key: string;
  isLeaf?: boolean;
  children?: TreeNode[];
}

// 示例目录树结构
const defaultTreeData: TreeNode[] = [
  {
    title: '加载中...',
    key: 'loading',
    isLeaf: true,
  },
];

export default function RepositoryDetailPage() {
  const params = useParams();
  const repositoryId = params.id as string;
  const [repository, setRepository] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [treeData, setTreeData] = useState<TreeNode[]>(defaultTreeData);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [editing, setEditing] = useState(false);
  const [form] = Form.useForm();

  // 加载仓库详情
  useEffect(() => {
    const fetchRepositoryDetail = async () => {
      try {
        setLoading(true);
        const { code, data } = await getRepositoryById(repositoryId);
        if (code === 200 && data) {
          setRepository(data);
          form.setFieldsValue({
            description: data.description,
            isRecommended: data.isRecommended,
            prompt: data.prompt,
          });
          
          // 加载文件目录结构
          try {
            const filesResponse = await getRepositoryFiles(repositoryId);
            if (filesResponse.code === 200 && filesResponse.data) {
              setTreeData(filesResponse.data);
            } else {
              // 如果获取失败，使用模拟数据
              setTimeout(() => {
                setTreeData([
                  {
                    title: data.name,
                    key: 'root',
                    children: [
                      {
                        title: 'src',
                        key: 'src',
                        children: [
                          { title: 'index.js', key: 'src/index.js', isLeaf: true },
                          { title: 'utils.js', key: 'src/utils.js', isLeaf: true },
                        ],
                      },
                      {
                        title: 'docs',
                        key: 'docs',
                        children: [
                          { title: 'README.md', key: 'docs/README.md', isLeaf: true },
                        ],
                      },
                      { title: 'package.json', key: 'package.json', isLeaf: true },
                    ],
                  },
                ]);
              }, 500);
            }
          } catch (error) {
            console.error('加载文件目录失败:', error);
            message.error('加载文件目录失败');
          }
        } else {
          message.error('获取仓库详情失败');
        }
      } catch (error) {
        console.error('加载仓库详情失败:', error);
        message.error('加载仓库详情失败');
      } finally {
        setLoading(false);
      }
    };

    if (repositoryId) {
      fetchRepositoryDetail();
    }
  }, [repositoryId]);

  // 处理保存仓库信息
  const handleSaveRepository = () => {
    form.validateFields().then(async (values) => {
      try {
        const updateData: UpdateRepositoryRequest = {
          description: values.description,
          isRecommended: values.isRecommended,
          prompt: values.prompt,
        };

        const response = await updateRepository(repositoryId, updateData);
        if (response.code === 200) {
          message.success('仓库信息更新成功');
          // 更新本地数据
          setRepository({
            ...repository,
            ...updateData,
          });
        } else {
          message.error(response.message || '更新仓库信息失败');
        }
      } catch (error) {
        console.error('提交表单失败:', error);
        message.error('操作失败，请重试');
      }
    });
  };

  // 处理文件选择
  const handleSelectFile = async (selectedKeys: React.Key[], info: any) => {
    if (selectedKeys.length > 0 && info.node.isLeaf) {
      const filePath = selectedKeys[0] as string;
      setSelectedFile(filePath);
      setEditing(false);
      
      try {
        // 通过API获取文件内容
        const response = await getRepositoryFileContent(repositoryId, filePath);
        if (response.code === 200) {
          setFileContent(response.data);
        } else {
          message.error('获取文件内容失败');
          setFileContent('// 获取文件内容失败');
        }
      } catch (error) {
        console.error('获取文件内容失败:', error);
        message.error('获取文件内容失败');
        setFileContent('// 获取文件内容失败');
      }
    }
  };

  // 处理文件内容编辑
  const handleEditContent = () => {
    setEditing(true);
  };

  // 处理保存文件内容
  const handleSaveContent = async () => {
    if (!selectedFile) return;
    
    try {
      const response = await saveRepositoryFileContent(repositoryId, selectedFile, fileContent);
      if (response.code === 200 && response.data) {
        message.success('文件内容保存成功');
        setEditing(false);
      } else {
        message.error(response.message || '保存文件内容失败');
      }
    } catch (error) {
      console.error('保存文件内容失败:', error);
      message.error('保存文件内容失败');
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>加载仓库详情中...</div>
      </div>
    );
  }

  return (
    <div>
      <Title level={2} style={{ marginBottom: 24 }}>
        {repository?.organizationName}/{repository?.name}
        {repository?.branch ? `/${repository?.branch}` : ''}
      </Title>

      <Tabs
        defaultActiveKey="files"
        items={[
          {
            key: 'files',
            label: '文件浏览',
            children: (
              <div style={{ display: 'flex', height: 'calc(100vh - 200px)' }}>
                {/* 左侧文件目录 */}
                <Card style={{ width: 300, marginRight: 16, height: '100%', overflow: 'auto' }}>
                  <DirectoryTree
                    defaultExpandAll
                    treeData={treeData}
                    onSelect={handleSelectFile}
                    icon={({ isLeaf }) => isLeaf ? <FileOutlined /> : <FolderOutlined />}
                  />
                </Card>

                {/* 右侧文件内容 */}
                <Card 
                  style={{ flex: 1, height: '100%', overflow: 'auto' }}
                  title={selectedFile || '选择文件查看内容'}
                  extra={
                    selectedFile && (
                      <Space>
                        {editing ? (
                          <Button 
                            type="primary" 
                            icon={<SaveOutlined />} 
                            onClick={handleSaveContent}
                          >
                            保存
                          </Button>
                        ) : (
                          <Button 
                            icon={<EditOutlined />} 
                            onClick={handleEditContent}
                          >
                            编辑
                          </Button>
                        )}
                      </Space>
                    )
                  }
                >
                  {selectedFile ? (
                    editing ? (
                      <Input.TextArea
                        value={fileContent}
                        onChange={(e) => setFileContent(e.target.value)}
                        style={{ height: 'calc(100vh - 280px)', fontFamily: 'monospace' }}
                      />
                    ) : (
                      <pre style={{ height: 'calc(100vh - 280px)', overflow: 'auto' }}>
                        {fileContent}
                      </pre>
                    )
                  ) : (
                    <div style={{ textAlign: 'center', color: '#999', marginTop: 100 }}>
                      从左侧选择文件查看内容
                    </div>
                  )}
                </Card>
              </div>
            ),
          },
          {
            key: 'settings',
            label: '仓库设置',
            children: (
              <Card>
                <Form
                  form={form}
                  layout="vertical"
                  onFinish={handleSaveRepository}
                >
                  <Form.Item
                    name="description"
                    label="描述"
                  >
                    <Input.TextArea rows={4} placeholder="仓库描述" />
                  </Form.Item>

                  <Form.Item
                    name="isRecommended"
                    label="是否推荐"
                    valuePropName="checked"
                  >
                    <Select
                      options={[
                        { value: true, label: '推荐' },
                        { value: false, label: '不推荐' }
                      ]}
                    />
                  </Form.Item>

                  <Form.Item
                    name="prompt"
                    label="构建提示词"
                  >
                    <Input.TextArea rows={4} placeholder="构建提示词（可选）" />
                  </Form.Item>

                  <Form.Item>
                    <Button type="primary" htmlType="submit">
                      保存设置
                    </Button>
                  </Form.Item>
                </Form>
              </Card>
            ),
          },
        ]}
      />
    </div>
  );
} 