'use client'
import { Card, Table, Button, Input, Space, Tag, Dropdown, Modal, Form, Select, Badge, Avatar } from 'antd';
import { 
  SearchOutlined, 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  EyeOutlined, 
  StarOutlined,
  MoreOutlined,
  FolderOutlined,
  ClockCircleOutlined,
  UserOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useState } from 'react';

// 仓库类型定义
interface Repository {
  key: string;
  id: number;
  name: string;
  owner: string;
  ownerAvatar?: string;
  visibility: 'public' | 'private' | 'restricted';
  status: 'active' | 'archived' | 'deleted';
  stars: number;
  views: number;
  updatedAt: string;
  createdAt: string;
}

// 模拟仓库数据
const mockRepositories: Repository[] = Array.from({ length: 15 }, (_, i) => ({
  key: String(i + 1),
  id: i + 1,
  name: ['产品文档', '开发手册', 'API文档', '用户指南', '架构设计'][i % 5] + (i > 4 ? ` ${Math.floor(i / 5) + 1}` : ''),
  owner: ['tech-team', 'product', 'dev-team', 'support', 'admin'][i % 5],
  visibility: i % 3 === 0 ? 'public' : (i % 3 === 1 ? 'private' : 'restricted'),
  status: i % 10 === 0 ? 'archived' : (i % 15 === 0 ? 'deleted' : 'active'),
  stars: Math.floor(Math.random() * 100),
  views: Math.floor(Math.random() * 500) + 100,
  updatedAt: `2023-${Math.floor(Math.random() * 12) + 1}-${Math.floor(Math.random() * 28) + 1}`,
  createdAt: `2023-${Math.floor(Math.random() * 6) + 1}-${Math.floor(Math.random() * 28) + 1}`,
}));

export default function RepositoriesPage() {
  const [searchText, setSearchText] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentRepo, setCurrentRepo] = useState<Repository | null>(null);
  const [form] = Form.useForm();

  // 处理仓库操作
  const handleRepoAction = (action: string, repo: Repository) => {
    if (action === 'edit') {
      setCurrentRepo(repo);
      form.setFieldsValue({
        name: repo.name,
        owner: repo.owner,
        visibility: repo.visibility,
        status: repo.status,
      });
      setIsModalOpen(true);
    } else if (action === 'delete') {
      Modal.confirm({
        title: '确认删除',
        content: `确定要删除仓库 ${repo.name} 吗？此操作不可撤销。`,
        okText: '确定',
        cancelText: '取消',
        okButtonProps: { danger: true },
      });
    } else if (action === 'archive') {
      Modal.confirm({
        title: repo.status === 'archived' ? '取消归档' : '归档仓库',
        content: repo.status === 'archived' 
          ? `确定要取消仓库 ${repo.name} 的归档状态吗？` 
          : `确定要归档仓库 ${repo.name} 吗？归档后仓库将变为只读。`,
        okText: '确定',
        cancelText: '取消',
      });
    }
  };

  // 获取状态徽章
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge status="success" text="活跃" />;
      case 'archived':
        return <Badge status="warning" text="已归档" />;
      case 'deleted':
        return <Badge status="error" text="已删除" />;
      default:
        return <Badge status="default" text="未知" />;
    }
  };

  // 获取可见性标签
  const getVisibilityTag = (visibility: string) => {
    switch (visibility) {
      case 'public':
        return <Tag color="green">公开</Tag>;
      case 'private':
        return <Tag color="red">私有</Tag>;
      case 'restricted':
        return <Tag color="orange">受限</Tag>;
      default:
        return <Tag>未知</Tag>;
    }
  };

  // 表格列定义
  const columns: ColumnsType<Repository> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: '仓库名称',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space>
          <Avatar 
            icon={<FolderOutlined />} 
            style={{ backgroundColor: '#1677ff' }} 
            size="small" 
          />
          <a>{text}</a>
        </Space>
      ),
    },
    {
      title: '所有者',
      dataIndex: 'owner',
      key: 'owner',
      render: (text, record) => (
        <Space>
          <Avatar 
            icon={<UserOutlined />} 
            src={record.ownerAvatar}
            size="small" 
          />
          {text}
        </Space>
      ),
    },
    {
      title: '可见性',
      dataIndex: 'visibility',
      key: 'visibility',
      render: (visibility) => getVisibilityTag(visibility),
      filters: [
        { text: '公开', value: 'public' },
        { text: '私有', value: 'private' },
        { text: '受限', value: 'restricted' },
      ],
      onFilter: (value, record) => record.visibility === value,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => getStatusBadge(status),
      filters: [
        { text: '活跃', value: 'active' },
        { text: '已归档', value: 'archived' },
        { text: '已删除', value: 'deleted' },
      ],
      onFilter: (value, record) => record.status === value,
    },
    {
      title: <Space><StarOutlined /> 收藏</Space>,
      dataIndex: 'stars',
      key: 'stars',
      sorter: (a, b) => a.stars - b.stars,
    },
    {
      title: <Space><EyeOutlined /> 访问量</Space>,
      dataIndex: 'views',
      key: 'views',
      sorter: (a, b) => a.views - b.views,
    },
    {
      title: <Space><ClockCircleOutlined /> 更新时间</Space>,
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      sorter: (a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime(),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Dropdown
          menu={{
            items: [
              {
                key: 'view',
                icon: <EyeOutlined />,
                label: '查看',
              },
              {
                key: 'edit',
                icon: <EditOutlined />,
                label: '编辑',
                onClick: () => handleRepoAction('edit', record),
              },
              record.status === 'archived' ? {
                key: 'unarchive',
                icon: <FolderOutlined />,
                label: '取消归档',
                onClick: () => handleRepoAction('archive', record),
              } : {
                key: 'archive',
                icon: <FolderOutlined />,
                label: '归档',
                onClick: () => handleRepoAction('archive', record),
              },
              {
                type: 'divider',
              },
              {
                key: 'delete',
                icon: <DeleteOutlined />,
                label: '删除',
                danger: true,
                onClick: () => handleRepoAction('delete', record),
              },
            ],
          }}
        >
          <Button type="text" icon={<MoreOutlined />} />
        </Dropdown>
      ),
    },
  ];

  // 处理搜索
  const filteredRepos = mockRepositories.filter(repo => 
    repo.name.toLowerCase().includes(searchText.toLowerCase()) || 
    repo.owner.toLowerCase().includes(searchText.toLowerCase())
  );

  // 处理表单提交
  const handleFormSubmit = () => {
    form.validateFields().then(values => {
      console.log('Form values:', values);
      // 在实际应用中这里会调用API更新仓库
      setIsModalOpen(false);
    });
  };

  // 创建新仓库
  const handleAddRepo = () => {
    setCurrentRepo(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>仓库管理</h2>
      
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <Input
            placeholder="搜索仓库名称或所有者"
            prefix={<SearchOutlined />}
            style={{ width: 300 }}
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            allowClear
          />
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={handleAddRepo}
          >
            添加仓库
          </Button>
        </div>
        
        <Table 
          columns={columns} 
          dataSource={filteredRepos}
          rowKey="key"
          pagination={{ 
            pageSize: 10,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
        />
      </Card>

      {/* 仓库编辑/创建表单 */}
      <Modal
        title={currentRepo ? "编辑仓库" : "添加仓库"}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={handleFormSubmit}
        okText={currentRepo ? "保存" : "创建"}
        cancelText="取消"
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
        >
          <Form.Item
            name="name"
            label="仓库名称"
            rules={[{ required: true, message: '请输入仓库名称' }]}
          >
            <Input placeholder="仓库名称" />
          </Form.Item>
          
          <Form.Item
            name="owner"
            label="所有者"
            rules={[{ required: true, message: '请选择所有者' }]}
          >
            <Select
              placeholder="选择所有者"
              options={[
                { value: 'tech-team', label: '技术团队' },
                { value: 'product', label: '产品团队' },
                { value: 'dev-team', label: '开发团队' },
                { value: 'support', label: '支持团队' },
                { value: 'admin', label: '管理员' },
              ]}
            />
          </Form.Item>
          
          <Form.Item
            name="visibility"
            label="可见性"
            rules={[{ required: true, message: '请选择可见性' }]}
          >
            <Select
              placeholder="选择可见性"
              options={[
                { value: 'public', label: '公开 - 所有人可见' },
                { value: 'private', label: '私有 - 仅创建者和指定成员可见' },
                { value: 'restricted', label: '受限 - 仅组织内成员可见' },
              ]}
            />
          </Form.Item>
          
          {currentRepo && (
            <Form.Item
              name="status"
              label="状态"
            >
              <Select
                placeholder="选择状态"
                options={[
                  { value: 'active', label: '活跃' },
                  { value: 'archived', label: '已归档' },
                ]}
              />
            </Form.Item>
          )}
          
          <Form.Item
            name="description"
            label="描述"
          >
            <Input.TextArea 
              placeholder="仓库描述（可选）" 
              rows={4}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
} 