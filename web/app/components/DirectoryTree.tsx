import { Card, Tree, Typography, Divider, Dropdown, Modal, Form, Input, Button, message } from 'antd';
import { DataNode } from 'antd/es/tree';
import { useRouter } from 'next/navigation';
import { FolderOutlined, FileOutlined, EditOutlined, SettingOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { UpdateCatalogRequest, updateCatalog } from '../services/documentService';

const { Title } = Typography;
const { DirectoryTree } = Tree;
const { TextArea } = Input;

// 扩展DataNode类型
interface ExtendedDataNode extends DataNode {
  prompt?: string;
  label?: string;
}

interface DirectoryTreeProps {
  treeData: ExtendedDataNode[];
  repositoryId?: string;
  owner?: string;
  name?: string;
  currentPath?: string;
  onRefresh?: () => void;
}

const DocDirectoryTree: React.FC<DirectoryTreeProps> = ({
  treeData,
  repositoryId,
  owner,
  name,
  currentPath,
  onRefresh
}) => {
  const router = useRouter();
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [currentNode, setCurrentNode] = useState<ExtendedDataNode | null>(null);
  const [form] = Form.useForm();

  const handleSelect = (_, info) => {
    const selectedNode = info.node;
    if (!selectedNode.children) {
      const path = selectedNode.key;
      
      // 根据提供的参数决定使用哪种路由格式
      if (owner && name) {
        router.push(`/${owner}/${name}/${path}`);
      } else if (repositoryId) {
        router.push(`/repository/${repositoryId}/${path}`);
      }
    }
  };

  // 递归处理树节点，添加图标
  const processTreeData = (data: ExtendedDataNode[]): ExtendedDataNode[] => {
    return data.map(node => {
      const newNode = { ...node };
      
      if (newNode.children) {
        newNode.icon = <FolderOutlined />;
        newNode.children = processTreeData(newNode.children as ExtendedDataNode[]);
      } else {
        newNode.icon = <FileOutlined />;
      }
      
      return newNode;
    });
  };

  // 处理右键菜单点击
  const handleMenuClick = (node: ExtendedDataNode) => {
    setCurrentNode(node);
    form.setFieldsValue({
      name: node.title || node.label,
      prompt: node.prompt || ''
    });
    setIsEditModalVisible(true);
  };

  // 提交编辑表单
  const handleEditSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (!currentNode) return;
      
      const updateRequest: UpdateCatalogRequest = {
        id: currentNode.key as string,
        name: values.name,
        prompt: values.prompt
      };
      
      const response = await updateCatalog(updateRequest);
      if (response.code === 200) {
        message.success('目录更新成功');
        setIsEditModalVisible(false);
        // 刷新目录树
        if (onRefresh) {
          onRefresh();
        }
      } else {
        message.error(response.message || '更新目录失败');
      }
    } catch (error) {
      console.error('提交表单失败:', error);
      message.error('操作失败，请重试');
    }
  };

  const processedTreeData = processTreeData(treeData);
  
  // 为每个节点添加自定义右键菜单
  const addContextMenu = (nodes: ExtendedDataNode[]): ExtendedDataNode[] => {
    return nodes.map(node => {
      const newNode = { ...node };
      newNode.title = (
        <Dropdown
          menu={{
            items: [
              {
                key: 'edit',
                icon: <EditOutlined />,
                label: '编辑',
                onClick: (e) => {
                  e.domEvent.stopPropagation();
                  handleMenuClick(node);
                }
              }
            ]
          }}
          trigger={['contextMenu']}
        >
          <span>
            {/* @ts-ignore */}
            {node.title || node.label}
          </span>
        </Dropdown>
      );
      
      if (newNode.children) {
        newNode.children = addContextMenu(newNode.children as ExtendedDataNode[]);
      }
      
      return newNode;
    });
  };
  
  const treeDataWithContextMenu = addContextMenu(processedTreeData);

  return (
    <>
      <Card
        className="directory-tree-card"
        title={
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <FolderOutlined style={{ marginRight: 8, color: 'var(--ant-color-primary)' }} />
            <Title level={5} style={{ margin: 0 }}>文档目录</Title>
          </div>
        }
      >
        <Divider style={{ margin: '0 0 12px 0' }} />
        <DirectoryTree
          defaultExpandAll
          onSelect={handleSelect}
          treeData={treeDataWithContextMenu}
          selectedKeys={currentPath ? [currentPath] : []}
          blockNode
          showIcon
        />
      </Card>
      
      {/* 编辑目录对话框 */}
      <Modal
        title="编辑目录"
        open={isEditModalVisible}
        onCancel={() => setIsEditModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setIsEditModalVisible(false)}>
            取消
          </Button>,
          <Button key="submit" type="primary" onClick={handleEditSubmit}>
            保存
          </Button>
        ]}
      >
        <Form
          form={form}
          layout="vertical"
        >
          <Form.Item
            name="name"
            label="标题"
            rules={[{ required: true, message: '请输入标题' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="prompt"
            label="提示词"
            help="自定义AI生成内容的提示词"
          >
            <TextArea rows={4} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default DocDirectoryTree; 