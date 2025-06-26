'use client';

import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Button, 
  Modal, 
  Form, 
  Input, 
  Switch, 
  message, 
  Popconfirm, 
  Tag, 
  Space, 
  Card,
  Row,
  Col,
  Statistic 
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  UserOutlined, 
  DatabaseOutlined 
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { roleService, Role, CreateRoleDto, UpdateRoleDto } from '../../services/roleService';

const { Search } = Input;

const RolesPage: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [form] = Form.useForm();
  const [searchKeyword, setSearchKeyword] = useState('');
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  // 加载角色列表
  const loadRoles = async (page = 1, pageSize = 10, keyword = '') => {
    setLoading(true);
    try {
      const result = await roleService.getRoleList(page, pageSize, keyword);
      setRoles(result.items);
      setPagination({
        current: page,
        pageSize,
        total: result.total,
      });
    } catch (error) {
      message.error('加载角色列表失败');
      console.error('加载角色列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoles();
  }, []);

  // 搜索
  const handleSearch = (value: string) => {
    setSearchKeyword(value);
    loadRoles(1, pagination.pageSize, value);
  };

  // 表格分页变化
  const handleTableChange = (page: number, pageSize: number) => {
    loadRoles(page, pageSize, searchKeyword);
  };

  // 创建/编辑角色
  const handleSubmit = async (values: CreateRoleDto | UpdateRoleDto) => {
    try {
      if (editingRole) {
        await roleService.updateRole(editingRole.id, values as UpdateRoleDto);
        message.success('更新角色成功');
      } else {
        await roleService.createRole(values as CreateRoleDto);
        message.success('创建角色成功');
      }
      setIsModalVisible(false);
      form.resetFields();
      setEditingRole(null);
      loadRoles(pagination.current, pagination.pageSize, searchKeyword);
    } catch (error) {
      message.error(editingRole ? '更新角色失败' : '创建角色失败');
      console.error('操作角色失败:', error);
    }
  };

  // 删除角色
  const handleDelete = async (id: string) => {
    try {
      await roleService.deleteRole(id);
      message.success('删除角色成功');
      loadRoles(pagination.current, pagination.pageSize, searchKeyword);
    } catch (error) {
      message.error('删除角色失败');
      console.error('删除角色失败:', error);
    }
  };

  // 编辑角色
  const handleEdit = (role: Role) => {
    setEditingRole(role);
    form.setFieldsValue({
      name: role.name,
      description: role.description,
      isActive: role.isActive,
    });
    setIsModalVisible(true);
  };

  // 新增角色
  const handleAdd = () => {
    setEditingRole(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  // 表格列定义
  const columns: ColumnsType<Role> = [
    {
      title: '角色名称',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space>
          <span>{text}</span>
          {record.isSystemRole && <Tag color="red">系统角色</Tag>}
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
      title: '状态',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 100,
      render: (isActive) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? '启用' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '用户数',
      dataIndex: 'userCount',
      key: 'userCount',
      width: 100,
      render: (count) => (
        <span style={{ display: 'flex', alignItems: 'center' }}>
          <UserOutlined style={{ marginRight: 4 }} />
          {count}
        </span>
      ),
    },
    {
      title: '权限数',
      dataIndex: 'warehousePermissionCount',
      key: 'warehousePermissionCount',
      width: 100,
      render: (count) => (
        <span style={{ display: 'flex', alignItems: 'center' }}>
          <DatabaseOutlined style={{ marginRight: 4 }} />
          {count}
        </span>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (date) => new Date(date).toLocaleString(),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_, record) => (
        <Space size="middle">
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            disabled={record.isSystemRole}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个角色吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
            disabled={record.isSystemRole}
          >
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
              disabled={record.isSystemRole}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        {/* 统计信息 */}
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Statistic
              title="总角色数"
              value={pagination.total}
              prefix={<UserOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="活跃角色"
              value={roles.filter(r => r.isActive).length}
              prefix={<UserOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="系统角色"
              value={roles.filter(r => r.isSystemRole).length}
              prefix={<DatabaseOutlined />}
            />
          </Col>
        </Row>

        {/* 操作栏 */}
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAdd}
          >
            新增角色
          </Button>
          <Search
            placeholder="搜索角色名称或描述"
            allowClear
            style={{ width: 300 }}
            onSearch={handleSearch}
          />
        </div>

        {/* 角色表格 */}
        <Table
          columns={columns}
          dataSource={roles}
          rowKey="id"
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条/共 ${total} 条`,
            onChange: handleTableChange,
          }}
        />
      </Card>

      {/* 新增/编辑角色模态框 */}
      <Modal
        title={editingRole ? '编辑角色' : '新增角色'}
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          form.resetFields();
          setEditingRole(null);
        }}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{ isActive: true }}
        >
          <Form.Item
            name="name"
            label="角色名称"
            rules={[
              { required: true, message: '请输入角色名称' },
              { min: 2, max: 50, message: '角色名称长度必须在2-50个字符之间' },
            ]}
          >
            <Input placeholder="请输入角色名称" />
          </Form.Item>

          <Form.Item
            name="description"
            label="角色描述"
            rules={[
              { max: 200, message: '角色描述长度不能超过200个字符' },
            ]}
          >
            <Input.TextArea
              placeholder="请输入角色描述"
              rows={3}
            />
          </Form.Item>

          <Form.Item
            name="isActive"
            label="状态"
            valuePropName="checked"
          >
            <Switch checkedChildren="启用" unCheckedChildren="禁用" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingRole ? '更新' : '创建'}
              </Button>
              <Button onClick={() => {
                setIsModalVisible(false);
                form.resetFields();
                setEditingRole(null);
              }}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default RolesPage; 