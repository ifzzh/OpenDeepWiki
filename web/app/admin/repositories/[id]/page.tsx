'use client'
import { useState, useEffect } from 'react';
import { Card, Spin, Tabs, Button, Form, Input, Select, message, Space, Tree, Typography, Dropdown, Modal } from 'antd';
import { EditOutlined, SaveOutlined, FolderOutlined, FileOutlined, DeleteOutlined, PlusOutlined, MenuOutlined } from '@ant-design/icons';
import { useParams } from 'next/navigation';
import { MdEditor } from 'md-editor-rt';
import 'md-editor-rt/lib/style.css';
import { FilePlus, FileEdit, Trash2, Plus, FileText, FolderPlus } from 'lucide-react';
import {
  getRepositoryById,
  updateRepository,
  getRepositoryFiles,
  getRepositoryFileContent,
  saveRepositoryFileContent,
  UpdateRepositoryRequest,
  addCatalog,
  renameCatalog,
  deleteCatalog,
  aiGenerateFileContent
} from '../../../services/repositoryService';

const { DirectoryTree } = Tree;

// 定义文件树节点类型
interface TreeNode {
  title: string;
  key: string;
  isLeaf?: boolean;
  children?: TreeNode[];
  catalog?: {
    id: string;
    name: string;
    description: string;
    createdAt: string;
    deletedTime: string;
    dependentFile: string[];
    ducumentId: string;
    isCompleted: boolean;
    isDeleted: boolean;
    order: number;
    parentId: string;
    prompt: string;
    url: string;
    warehouseId: string;
  };
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
  const [selectedCatalog, setSelectedCatalog] = useState<TreeNode | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [form] = Form.useForm();
  const [rightClickNode, setRightClickNode] = useState<TreeNode | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'newMenu' | 'rename' | 'delete'>('newMenu');
  const [newFileName, setNewFileName] = useState('');
  const [catalogForm] = Form.useForm();
  const [editorId] = useState<string>('md-editor-rt-1');
  // 添加右键菜单状态
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const [showContextMenu, setShowContextMenu] = useState(false);
  // 添加AI生成相关状态
  const [isAiModalVisible, setIsAiModalVisible] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [promptForm] = Form.useForm();

  // 处理Escape键关闭右键菜单
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showContextMenu) {
        setShowContextMenu(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showContextMenu]);

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
              message.error(filesResponse.message || '获取文件目录结构失败');
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
    if (selectedKeys.length > 0) {
      const filePath = selectedKeys[0] as string;
      setSelectedFile(filePath);
      setSelectedCatalog(info.node);

      try {
        // 通过API获取文件内容
        const response = await getRepositoryFileContent(info.node.catalog.id);
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

  // 处理右键点击
  const handleRightClick = ({ event, node }: { event: React.MouseEvent, node: any }) => {
    event.preventDefault();
    event.stopPropagation();
    setRightClickNode(node);
    
    // 计算菜单位置，确保不超出屏幕边界
    const menuWidth = 200; // 菜单宽度
    const menuHeight = 200; // 估计的菜单高度
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // 计算坐标，确保菜单不会超出视口
    let x = event.clientX;
    let y = event.clientY;
    
    // 检查右边界
    if (x + menuWidth > viewportWidth) {
      x = viewportWidth - menuWidth - 10;
    }
    
    // 检查下边界
    if (y + menuHeight > viewportHeight) {
      y = viewportHeight - menuHeight - 10;
    }
    
    // 记录鼠标位置以显示右键菜单
    setContextMenuPosition({ x, y });
    setShowContextMenu(true);
  };

  const handleAiGenerate = async () => {
    if (!selectedCatalog) return;
    
    // 设置默认prompt为选中菜单的prompt
    const defaultPrompt = selectedCatalog.catalog?.prompt || '';
    setAiPrompt(defaultPrompt);
    promptForm.setFieldsValue({ prompt: defaultPrompt });
    
    // 显示AI生成对话框
    setIsAiModalVisible(true);
  }
  
  // 处理AI内容生成
  const handleAiContentGenerate = async () => {
    try {
      // 验证表单
      await promptForm.validateFields();
      
      if (!selectedCatalog) {
        message.error('请先选择一个文件');
        return;
      }
      
      // 获取prompt值
      const values = promptForm.getFieldsValue();
      const prompt = values.prompt;
      
      if (!prompt.trim()) {
        message.error('请输入提示词');
        return;
      }
      
      // 设置生成中状态
      setAiGenerating(true);
      
      // 调用API生成内容
      const response = await aiGenerateFileContent(selectedCatalog.catalog.id, prompt);
      
      // 重新获取文件内容
      const fileContentResponse = await getRepositoryFileContent(selectedCatalog.catalog.id);
      if (fileContentResponse.code === 200) {
        setFileContent(fileContentResponse.data);
      }
      message.success('AI内容生成成功');
      setIsAiModalVisible(false);
    } catch (error) {
      console.error('AI内容生成失败:', error);
      message.error('AI内容生成失败，请重试');
    } finally {
      setAiGenerating(false);
    }
  };

  // 处理保存文件内容
  const handleSaveContent = async () => {

    if (!selectedCatalog) return;

    try {
      const response = await saveRepositoryFileContent(selectedCatalog.catalog.id, fileContent);
      if (response.code === 200 && response.data) {
        message.success('文件内容保存成功');
      } else {
        message.error(response.message || '保存文件内容失败');
      }
    } catch (error) {
      console.error('保存文件内容失败:', error);
      message.error('保存文件内容失败');
    }
  };

  // 创建新菜单
  const handleCreateMenu = async () => {
    try {
      // 校验表单
      await catalogForm.validateFields();
      
      if (!rightClickNode) {
        message.error('请选择父级菜单');
        return;
      }
      
      // 获取表单值
      const formValues = catalogForm.getFieldsValue();
      
      // 构建目录数据
      const catalogInput = {
        name: formValues.name,
        url: formValues.url || '',
        description: formValues.description || '',
        parentId: rightClickNode.catalog?.id || rightClickNode.key, // 使用catalog.id如果存在
        order: formValues.order || 0,
        ducumentId: '',
        warehouseId: repositoryId,
        prompt: formValues.prompt || '',
        dependentFile: []
      };

      const response = await addCatalog(catalogInput);
      if (response.code === 200 && response.data) {
        message.success('菜单创建成功');
        setIsModalVisible(false);
        
        // 重置表单
        catalogForm.resetFields();
        setNewFileName('');

        // 刷新文件树
        const filesResponse = await getRepositoryFiles(repositoryId);
        if (filesResponse.code === 200 && filesResponse.data) {
          setTreeData(filesResponse.data);
        }
      } else {
        message.error(response.message || '创建菜单失败');
      }
    } catch (error) {
      console.error('创建菜单失败:', error);
      message.error('操作失败，请检查表单填写是否完整');
    }
  };

  const handleDeleteMenu = async () => {
    if (!rightClickNode) return;

    try {
      const response = await deleteCatalog(rightClickNode.catalog.id);
      if (response.code === 200 && response.data) {
        message.success('菜单删除成功');
        setIsModalVisible(false);

        // 刷新文件树
        const filesResponse = await getRepositoryFiles(repositoryId);
        if (filesResponse.code === 200 && filesResponse.data) {
          setTreeData(filesResponse.data);
        }
      } else {
        message.error(response.message || '删除菜单失败');
      }
    } catch (error) {
      console.error('删除菜单失败:', error);
      message.error('删除菜单失败');
    }
  }
  // 重命名菜单
  const handleRenameMenu = async () => {
    if (!rightClickNode || !newFileName) return;

    try {
      const response = await renameCatalog(rightClickNode.catalog.id, newFileName);
      if (response.code === 200 && response.data) {
        message.success('菜单重命名成功');
        setIsModalVisible(false);
        setNewFileName('');

        // 刷新文件树
        const filesResponse = await getRepositoryFiles(repositoryId);
        if (filesResponse.code === 200 && filesResponse.data) {
          setTreeData(filesResponse.data);
        }
      } else {
        message.error(response.message || '重命名菜单失败');
      }
    } catch (error) {
      console.error('重命名菜单失败:', error);
      message.error('重命名菜单失败');
    }
  };

  // 显示模态框
  const showModal = (type: 'newMenu' | 'rename' | 'delete') => {
    setModalType(type);
    
    // 如果是新建菜单，重置表单
    if (type === 'newMenu') {
      catalogForm.resetFields();
    } else if (type === 'rename') {
      setNewFileName('');
    }
    
    setIsModalVisible(true);
  };

  // 处理模态框确认
  const handleModalOk = async () => {
    switch (modalType) {
      case 'newMenu':
        await handleCreateMenu();
        break;
      case 'rename':
        await handleRenameMenu();
        break;
      case 'delete':
        await handleDeleteMenu();
        break;
    }
  };

  // 渲染模态框标题
  const renderModalTitle = () => {
    switch (modalType) {
      case 'newMenu':
        return '新建菜单';
      case 'rename':
        return '重命名';
      case 'delete':
        return '确认删除';
    }
  };

  // 渲染模态框内容
  const renderModalContent = () => {
    switch (modalType) {
      case 'newMenu':
        return (
          <Form form={catalogForm} layout="vertical" initialValues={{
            name: '',
            url: '',
            description: '',
            prompt: '',
            order: 0,
          }}>
            <Form.Item 
              label="菜单名称" 
              name="name" 
              rules={[{ required: true, message: '请输入菜单名称' }]}
            >
              <Input 
                placeholder="请输入菜单名称" 
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
              />
            </Form.Item>
            <Form.Item 
              label="URL" 
              name="url"
            >
              <Input placeholder="请输入菜单URL" />
            </Form.Item>
            <Form.Item 
              label="描述" 
              name="description"
            >
              <Input.TextArea placeholder="请输入菜单描述" rows={2} />
            </Form.Item>
            <Form.Item 
              label="提示词" 
              name="prompt"
            >
              <Input.TextArea placeholder="请输入菜单提示词" rows={2} />
            </Form.Item>
            <Form.Item 
              label="排序" 
              name="order"
            >
              <Input type="number" placeholder="请输入排序值" />
            </Form.Item>
          </Form>
        );
      case 'rename':
        return (
          <Form.Item label="新名称" required>
            <Input
              placeholder="请输入新名称"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
            />
          </Form.Item>
        );
      case 'delete':
        return (
          <p>确定要删除 "{rightClickNode?.title}" 吗？此操作不可撤销。</p>
        );
    }
  };

  // 关闭右键菜单
  const closeContextMenu = () => {
    setShowContextMenu(false);
  };

  // 处理右键菜单项点击
  const handleContextMenuClick = (type: 'newMenu' | 'rename' | 'delete') => {
    setShowContextMenu(false);
    showModal(type);
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
    <div onClick={closeContextMenu}>
      <div style={{ display: 'flex', height: 'calc(100vh - 200px)' }}>
        {/* 左侧文件目录 */}
        <Card style={{ width: 300, marginRight: 16, height: '100%', overflow: 'auto' }}>
          <DirectoryTree
            defaultExpandAll
            treeData={treeData}
            onSelect={handleSelectFile}
            showIcon={false}
            onRightClick={handleRightClick}
          />
        </Card>

        <Card
          style={{ flex: 1, height: '100%', overflow: 'auto' }}
          title={selectedFile || '选择文件查看内容'}
          extra={
            selectedFile && (
              <Space>
                <Button
                  type="primary"
                  onClick={handleAiGenerate}
                  disabled={aiGenerating}
                >
                  AI 智能生成
                </Button>
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  onClick={handleSaveContent}
                  disabled={aiGenerating}
                >
                  保存
                </Button>
              </Space>
            )
          }
        >
          {selectedFile ? (<MdEditor
            value={fileContent}
            onChange={setFileContent}
            style={{ height: 'calc(100vh - 280px)' }}
            id={editorId}
            previewTheme="vuepress"
            preview={false}
            toolbarsExclude={['image']}
            disabled={aiGenerating}
          />
          ) : (
            <div style={{ textAlign: 'center', color: '#999', marginTop: 100 }}>
              从左侧选择文件查看内容
            </div>
          )}
        </Card>
      </div>

      {/* 自定义右键菜单 */}
      {showContextMenu && contextMenuPosition && (
        <div
          style={{
            position: 'fixed',
            top: contextMenuPosition.y,
            left: contextMenuPosition.x,
            backgroundColor: '#fff',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
            borderRadius: '8px',
            padding: '8px 0',
            zIndex: 1050,
            minWidth: '180px',
            border: '1px solid #f0f0f0',
            overflow: 'hidden',
            animation: 'fadeIn 0.15s ease-in-out',
            transformOrigin: 'top left',
          }}
        >
          <style jsx global>{`
            @keyframes fadeIn {
              from {
                opacity: 0;
                transform: scale(0.95);
              }
              to {
                opacity: 1;
                transform: scale(1);
              }
            }
          `}</style>
          <div className="menu-title" style={{
            padding: '6px 16px',
            fontSize: '12px',
            color: '#8c8c8c',
            borderBottom: '1px solid #f0f0f0',
            marginBottom: '4px'
          }}>
            {rightClickNode?.title || '菜单操作'}
          </div>
          <div
            style={{
              padding: '10px 16px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              transition: 'all 0.3s',
              fontSize: '14px',
            }}
            onClick={() => handleContextMenuClick('newMenu')}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <FolderPlus size={16} style={{ marginRight: 10, strokeWidth: 2 }} /> 新建菜单
          </div>
          <div
            style={{
              padding: '10px 16px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              transition: 'all 0.3s',
              fontSize: '14px',
            }}
            onClick={() => handleContextMenuClick('rename')}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <FileEdit size={16} style={{ marginRight: 10, strokeWidth: 2 }} /> 重命名
          </div>
          <div style={{ height: '1px', background: '#f0f0f0', margin: '4px 0' }} />
          <div
            style={{
              padding: '10px 16px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              transition: 'all 0.3s',
              fontSize: '14px',
              color: '#ff4d4f',
            }}
            onClick={() => handleContextMenuClick('delete')}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fff1f0'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <Trash2 size={16} style={{ marginRight: 10, strokeWidth: 2 }} /> 删除
          </div>
        </div>
      )}

      <Modal
        title={renderModalTitle()}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={() => setIsModalVisible(false)}
        width={modalType === 'newMenu' ? 550 : 400}
        okText={modalType === 'delete' ? '确认删除' : '确定'}
        cancelText="取消"
        okButtonProps={{
          danger: modalType === 'delete',
        }}
      >
        {renderModalContent()}
      </Modal>
      
      {/* AI生成对话框 */}
      <Modal
        title="AI 智能生成内容"
        open={isAiModalVisible}
        onOk={handleAiContentGenerate}
        onCancel={() => !aiGenerating && setIsAiModalVisible(false)}
        okText="生成"
        cancelText="取消"
        okButtonProps={{
          loading: aiGenerating,
          disabled: aiGenerating
        }}
        cancelButtonProps={{
          disabled: aiGenerating
        }}
        closable={!aiGenerating}
        maskClosable={!aiGenerating}
        keyboard={!aiGenerating}
      >
        <Form form={promptForm} layout="vertical">
          <Form.Item
            label="提示词"
            name="prompt"
            rules={[{ required: true, message: '请输入提示词' }]}
            help="请输入详细的提示词，以便AI生成更准确的内容"
          >
            <Input.TextArea
              rows={6}
              placeholder="请输入提示词，描述你希望生成的内容"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              disabled={aiGenerating}
            />
          </Form.Item>
          {aiGenerating && (
            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <Spin tip="AI 内容生成中，请稍候..." />
              <p style={{ marginTop: 8, color: '#1677ff' }}>
                正在根据提示词生成内容，这可能需要一些时间...
              </p>
            </div>
          )}
        </Form>
      </Modal>
    </div>
  );
} 