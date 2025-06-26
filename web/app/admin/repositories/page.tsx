'use client'
import { Card, Table, Button, Input, Space, Tag, Dropdown, Modal, Form, Select, Badge, Avatar, message } from 'antd';
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
  UserOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useState, useEffect } from 'react';
import { getRepositoryList, createGitRepository, updateRepository, deleteRepository, resetRepository, RepositoryInfo, CreateGitRepositoryRequest, UpdateRepositoryRequest } from '../../services/repositoryService';
import Link from 'next/link';
import { Tooltip } from '@lobehub/ui';

// 仓库状态映射
const statusMap = {
  0: { text: '待处理', color: 'orange' },
  1: { text: '处理中', color: 'blue' },
  2: { text: '已完成', color: 'green' },
  3: { text: '已取消', color: 'default' },
  4: { text: '未授权', color: 'red' },
  99: { text: '已失败', color: 'red' }
};

export default function RepositoriesPage() {
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(false);
  const [repositories, setRepositories] = useState<RepositoryInfo[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentRepository, setCurrentRepository] = useState<RepositoryInfo | null>(null);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();

  // 加载仓库数据
  const loadRepositories = async (page = currentPage, size = pageSize, keyword = searchText) => {
    try {
      setLoading(true);
      const { code, data } = await getRepositoryList(page, size, keyword);
      if (code === 200) {
        setRepositories(data.items);
        setTotal(data.total);
      } else {
        message.error('获取仓库列表失败');
      }
    } catch (error) {
      console.error('加载仓库数据失败:', error);
      message.error('加载仓库数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 初始加载
  useEffect(() => {
    loadRepositories();
  }, []);

  // 处理搜索
  const handleSearch = () => {
    setCurrentPage(1); // 重置到第一页
    loadRepositories(1, pageSize, searchText);
  };

  // 处理分页变化
  const handleTableChange = (pagination: any) => {
    setCurrentPage(pagination.current);
    setPageSize(pagination.pageSize);
    loadRepositories(pagination.current, pagination.pageSize, searchText);
  };

  // 处理仓库操作（编辑、删除等）
  const handleRepositoryAction = async (action: string, repository: RepositoryInfo) => {
    if (action === 'edit') {
      setCurrentRepository(repository);
      editForm.setFieldsValue({
        description: repository.description,
        isRecommended: repository.isRecommended,
        prompt: repository.prompt,
      });
      setIsEditModalOpen(true);
    } else if (action === 'delete') {
      Modal.confirm({
        title: '确认删除',
        content: `确定要删除仓库 ${repository.organizationName}/${repository.name} 吗？此操作不可恢复。`,
        okText: '删除',
        okType: 'danger',
        cancelText: '取消',
        onOk: async () => {
          try {
            const response = await deleteRepository(repository.id);
            if (response.code === 200 && response.data) {
              message.success('仓库删除成功');
              loadRepositories(); // 重新加载仓库列表
            } else {
              message.error(response.message || '删除仓库失败');
            }
          } catch (error) {
            console.error('删除仓库失败:', error);
            message.error('删除仓库失败');
          }
        },
      });
    } else if (action === 'reprocess') {
      Modal.confirm({
        title: '确认重新处理',
        content: `确定要重新处理仓库 ${repository.organizationName}/${repository.name} 吗？`,
        okText: '确定',
        cancelText: '取消',
        onOk: async () => {
          try {
            const response = await resetRepository(repository.id);
            if (response.code === 200 && response.data) {
              message.success('已提交重新处理请求');
              loadRepositories(); // 重新加载仓库列表
            } else {
              message.error(response.message || '提交重新处理请求失败');
            }
          } catch (error) {
            console.error('重新处理仓库失败:', error);
            message.error('重新处理仓库失败');
          }
        },
      });
    }
  };

  // 处理创建仓库表单提交
  const handleFormSubmit = () => {
    form.validateFields().then(async (values) => {
      try {
        // 创建Git仓库
        const createData: CreateGitRepositoryRequest = {
          address: values.address,
          branch: values.branch,
          gitUserName: values.enableGitAuth ? values.gitUserName : undefined,
          gitPassword: values.enableGitAuth ? values.gitPassword : undefined,
        };

        const response = await createGitRepository(createData);
        if (response.code === 200) {
          message.success('仓库创建成功');
          setIsModalOpen(false);
          loadRepositories(); // 重新加载仓库列表
        } else {
          message.error(response.message || '创建仓库失败');
        }
      } catch (error) {
        console.error('提交表单失败:', error);
        message.error('操作失败，请重试');
      }
    });
  };

  // 处理编辑仓库表单提交
  const handleEditFormSubmit = () => {
    if (!currentRepository) return;

    editForm.validateFields().then(async (values) => {
      try {
        // 更新仓库
        const updateData: UpdateRepositoryRequest = {
          description: values.description,
          isRecommended: values.isRecommended,
          prompt: values.prompt,
        };

        const response = await updateRepository(currentRepository.id, updateData);
        if (response.code === 200) {
          message.success('仓库更新成功');
          setIsEditModalOpen(false);
          loadRepositories(); // 重新加载仓库列表
        } else {
          message.error(response.message || '更新仓库失败');
        }
      } catch (error) {
        console.error('提交表单失败:', error);
        message.error('操作失败，请重试');
      }
    });
  };

  // 创建新仓库
  const handleAddRepository = () => {
    form.resetFields();
    setIsModalOpen(true);
  };

  // 表格列定义
  const columns: ColumnsType<RepositoryInfo> = [
    {
      title: '仓库',
      key: 'name',
      render: (_, record) => (
        <Space>
          <Tooltip title={record.name}>
            <Link
              style={{
                // 隐藏多行
                display: '-webkit-box',
                WebkitLineClamp: 1,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                width: '120px',
              }}
              href={`/admin/repositories/${record.id}`}>
              {record.organizationName ? `${record.organizationName}/` : ''}
              {record.name}
            </Link>
          </Tooltip>
        </Space>
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '分支',
      dataIndex: 'branch',
      key: 'branch',
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const { text, color } = statusMap[status as keyof typeof statusMap] || { text: '未知', color: 'default' };
        return <Badge status={color as any} text={text} />;
      },
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type) => <Tag>{type || 'git'}</Tag>,
    },
    {
      title: '异常信息',
      dataIndex: 'error',
      key: 'error',
      render: (text) => (
        <Tooltip title={text}>
          <div style={{
            maxWidth: '200px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {text ? text.slice(0, 20) + (text.length > 20 ? '...' : '') : ''}
          </div>
        </Tooltip>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (text) => (
        <Space>
          <ClockCircleOutlined />
          {new Date(text).toLocaleString()}
        </Space>
      ),
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
                onClick: () => window.open(`/admin/repositories/${record.id}`, '_blank'),
              },
              {
                key: 'edit',
                icon: <EditOutlined />,
                label: '编辑',
                onClick: () => handleRepositoryAction('edit', record),
              },
              {
                key: 'reprocess',
                icon: <ReloadOutlined />,
                label: '重新处理',
                onClick: () => handleRepositoryAction('reprocess', record),
              },
              {
                type: 'divider',
              },
              {
                key: 'delete',
                icon: <DeleteOutlined />,
                label: '删除',
                danger: true,
                onClick: () => handleRepositoryAction('delete', record),
              },
            ],
          }}
        >
          <Button type="text" icon={<MoreOutlined />} />
        </Dropdown>
      ),
    },
  ];

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>仓库管理</h2>

      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <Space>
            <Input
              placeholder="搜索仓库名称或地址"
              prefix={<SearchOutlined />}
              style={{ width: 300 }}
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              onPressEnter={handleSearch}
              allowClear
            />
            <Button type="primary" onClick={handleSearch}>搜索</Button>
          </Space>
        </div>

        <Table
          columns={columns}
          dataSource={repositories}
          rowKey="id"
          loading={loading}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: total,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
          onChange={handleTableChange}
        />
      </Card>

      {isEditModalOpen && (
        <Modal
          title="编辑仓库"
          open={isEditModalOpen}
          onCancel={() => setIsEditModalOpen(false)}
          onOk={handleEditFormSubmit}
          okText="保存"
          cancelText="取消"
          width={600}
        >
          <Form
            form={editForm}
            layout="vertical"
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
            >
              <Select
                placeholder="选择是否推荐"
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
          </Form>
        </Modal>)}
    </div>
  );
} 