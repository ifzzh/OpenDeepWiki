'use client'
import { Card, Table, Button, Input, Space, Tag, Dropdown, Modal, Form, Select, Switch } from 'antd';
import { 
  UserOutlined, 
  SearchOutlined, 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  LockOutlined,
  UnlockOutlined,
  MoreOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useState } from 'react';

// 用户类型定义
interface User {
  key: string;
  id: number;
  username: string;
  email: string;
  role: string;
  status: 'active' | 'inactive' | 'locked';
  lastLogin: string;
  createdAt: string;
}

// 模拟用户数据
const mockUsers: User[] = Array.from({ length: 20 }, (_, i) => ({
  key: String(i + 1),
  id: i + 1,
  username: `user${i + 1}`,
  email: `user${i + 1}@example.com`,
  role: i % 5 === 0 ? 'admin' : (i % 3 === 0 ? 'editor' : 'user'),
  status: i % 7 === 0 ? 'locked' : (i % 11 === 0 ? 'inactive' : 'active'),
  lastLogin: `2023-${Math.floor(Math.random() * 12) + 1}-${Math.floor(Math.random() * 28) + 1} ${Math.floor(Math.random() * 24)}:${Math.floor(Math.random() * 60)}`,
  createdAt: `2023-${Math.floor(Math.random() * 6) + 1}-${Math.floor(Math.random() * 28) + 1}`,
}));

export default function UsersPage() {
  const [searchText, setSearchText] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [form] = Form.useForm();

  // 处理用户操作
  const handleUserAction = (action: string, user: User) => {
    if (action === 'edit') {
      setCurrentUser(user);
      form.setFieldsValue({
        username: user.username,
        email: user.email,
        role: user.role,
        status: user.status === 'active',
      });
      setIsModalOpen(true);
    } else if (action === 'delete') {
      Modal.confirm({
        title: '确认删除',
        content: `确定要删除用户 ${user.username} 吗？此操作不可撤销。`,
        okText: '确定',
        cancelText: '取消',
        okButtonProps: { danger: true },
      });
    } else if (action === 'lock') {
      Modal.confirm({
        title: user.status === 'locked' ? '解锁账户' : '锁定账户',
        content: user.status === 'locked' 
          ? `确定要解锁用户 ${user.username} 的账户吗？` 
          : `确定要锁定用户 ${user.username} 的账户吗？`,
        okText: '确定',
        cancelText: '取消',
      });
    }
  };

  // 表格列定义
  const columns: ColumnsType<User> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
      render: (text) => <a>{text}</a>,
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (role) => {
        let color = 'blue';
        if (role === 'admin') color = 'red';
        else if (role === 'editor') color = 'green';
        return <Tag color={color}>{role.toUpperCase()}</Tag>;
      },
      filters: [
        { text: '管理员', value: 'admin' },
        { text: '编辑者', value: 'editor' },
        { text: '普通用户', value: 'user' },
      ],
      onFilter: (value, record) => record.role === value,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        let color = 'green';
        let text = '正常';
        if (status === 'locked') {
          color = 'red';
          text = '已锁定';
        } else if (status === 'inactive') {
          color = 'orange';
          text = '未激活';
        }
        return <Tag color={color}>{text}</Tag>;
      },
      filters: [
        { text: '正常', value: 'active' },
        { text: '未激活', value: 'inactive' },
        { text: '已锁定', value: 'locked' },
      ],
      onFilter: (value, record) => record.status === value,
    },
    {
      title: '最后登录',
      dataIndex: 'lastLogin',
      key: 'lastLogin',
      sorter: (a, b) => new Date(a.lastLogin).getTime() - new Date(b.lastLogin).getTime(),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      sorter: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Dropdown
          menu={{
            items: [
              {
                key: 'edit',
                icon: <EditOutlined />,
                label: '编辑',
                onClick: () => handleUserAction('edit', record),
              },
              record.status === 'locked' ? {
                key: 'unlock',
                icon: <UnlockOutlined />,
                label: '解锁账户',
                onClick: () => handleUserAction('lock', record),
              } : {
                key: 'lock',
                icon: <LockOutlined />,
                label: '锁定账户',
                onClick: () => handleUserAction('lock', record),
              },
              {
                type: 'divider',
              },
              {
                key: 'delete',
                icon: <DeleteOutlined />,
                label: '删除',
                danger: true,
                onClick: () => handleUserAction('delete', record),
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
  const filteredUsers = mockUsers.filter(user => 
    user.username.toLowerCase().includes(searchText.toLowerCase()) || 
    user.email.toLowerCase().includes(searchText.toLowerCase())
  );

  // 处理表单提交
  const handleFormSubmit = () => {
    form.validateFields().then(values => {
      console.log('Form values:', values);
      // 在实际应用中这里会调用API更新用户
      setIsModalOpen(false);
    });
  };

  // 创建新用户
  const handleAddUser = () => {
    setCurrentUser(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>用户管理</h2>
      
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <Input
            placeholder="搜索用户名或邮箱"
            prefix={<SearchOutlined />}
            style={{ width: 300 }}
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            allowClear
          />
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={handleAddUser}
          >
            添加用户
          </Button>
        </div>
        
        <Table 
          columns={columns} 
          dataSource={filteredUsers}
          rowKey="key"
          pagination={{ 
            pageSize: 10,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
        />
      </Card>

      {/* 用户编辑/创建表单 */}
      <Modal
        title={currentUser ? "编辑用户" : "添加用户"}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={handleFormSubmit}
        okText={currentUser ? "保存" : "创建"}
        cancelText="取消"
      >
        <Form
          form={form}
          layout="vertical"
        >
          <Form.Item
            name="username"
            label="用户名"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="用户名" />
          </Form.Item>
          
          <Form.Item
            name="email"
            label="邮箱"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入有效的邮箱' }
            ]}
          >
            <Input placeholder="邮箱地址" />
          </Form.Item>
          
          {!currentUser && (
            <Form.Item
              name="password"
              label="密码"
              rules={[{ required: true, message: '请输入密码' }]}
            >
              <Input.Password placeholder="密码" />
            </Form.Item>
          )}
          
          <Form.Item
            name="role"
            label="角色"
            rules={[{ required: true, message: '请选择角色' }]}
          >
            <Select>
              <Select.Option value="admin">管理员</Select.Option>
              <Select.Option value="editor">编辑者</Select.Option>
              <Select.Option value="user">普通用户</Select.Option>
            </Select>
          </Form.Item>
          
          <Form.Item
            name="status"
            label="状态"
            valuePropName="checked"
          >
            <Switch checkedChildren="启用" unCheckedChildren="禁用" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
} 