'use client';

import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Button, 
  Modal, 
  Select, 
  message, 
  Space, 
  Tag, 
  Card,
  Row,
  Col,
  Input,
  Avatar
} from 'antd';
import { 
  UserOutlined, 
  EditOutlined, 
  SearchOutlined,
  MailOutlined 
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { roleService, Role, UserInfo } from '../../../services/roleService';
import { permissionService, UserRole } from '../../../services/permissionService';
import { getUserList } from '../../../services/userService';

const { Search } = Input;
const { Option } = Select;

const UserRolesPage: React.FC = () => {
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserInfo | null>(null);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [assigning, setAssigning] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  // 加载用户列表
  const loadUsers = async (page: number = 1, pageSize: number = 10, keyword?: string) => {
    setLoading(true);
    try {
      const response = await getUserList(page, pageSize, keyword);
      
      if (response.code === 200 && response.data) {
        setUsers(response.data.items);
        setPagination(prev => ({
          ...prev,
          current: page,
          pageSize: pageSize,
          total: response.data.total,
        }));
      } else {
        message.error(response.message || '加载用户列表失败');
        setUsers([]);
      }
    } catch (error) {
      message.error('加载用户列表失败');
      console.error('加载用户列表失败:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  // 加载角色列表
  const loadRoles = async () => {
    try {
      const allRoles = await roleService.getAllRoles();
      setRoles(allRoles.items);
    } catch (error) {
      message.error('加载角色列表失败');
      console.error('加载角色列表失败:', error);
    }
  };

  // 获取用户角色
  const loadUserRoles = async (userId: string) => {
    try {
      const roles = await permissionService.getUserRoles(userId);
      return roles.map(role => role.id);
    } catch (error) {
      console.error('获取用户角色失败:', error);
      return [];
    }
  };

  // 处理编辑用户角色
  const handleEditRoles = async (user: UserInfo) => {
    setSelectedUser(user);
    setModalVisible(true);
    
    // 获取用户当前角色
    const currentRoles = await loadUserRoles(user.id);
    setUserRoles(currentRoles);
  };

  // 保存用户角色分配
  const handleSaveRoles = async () => {
    if (!selectedUser) return;

    setAssigning(true);
    try {
      const userRole: UserRole = {
        userId: selectedUser.id,
        roleIds: userRoles,
      };

      await permissionService.assignUserRoles(userRole);
      message.success('分配用户角色成功');
      setModalVisible(false);
      setSelectedUser(null);
      setUserRoles([]);
      
      // 重新加载用户列表
      loadUsers(pagination.current, pagination.pageSize, searchKeyword);
    } catch (error) {
      message.error('分配用户角色失败');
      console.error('分配用户角色失败:', error);
    } finally {
      setAssigning(false);
    }
  };

  // 搜索用户
  const handleSearch = (value: string) => {
    setSearchKeyword(value);
    loadUsers(1, pagination.pageSize, value);
  };

  // 处理表格分页变化
  const handleTableChange = (page: number, pageSize?: number) => {
    const newPageSize = pageSize || pagination.pageSize;
    loadUsers(page, newPageSize, searchKeyword);
  };

  useEffect(() => {
    loadUsers();
    loadRoles();
  }, []);

  // 表格列定义
  const columns: ColumnsType<UserInfo> = [
    {
      title: '用户',
      key: 'user',
      render: (_, record) => (
        <Space>
          <div>
            <div style={{ fontWeight: 500 }}>{record.name}</div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              <MailOutlined style={{ marginRight: 4 }} />
              {record.email}
            </div>
          </div>
        </Space>
      ),
    },
    {
      title: '注册时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => new Date(date).toLocaleString(),
    },
    {
      title: '最后登录',
      dataIndex: 'lastLoginAt',
      key: 'lastLoginAt',
      render: (date) => date ? new Date(date).toLocaleString() : '从未登录',
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_, record) => (
        <Button
          type="link"
          icon={<EditOutlined />}
          onClick={() => handleEditRoles(record)}
        >
          分配角色
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        {/* 操作栏 */}
        <Row justify="space-between" style={{ marginBottom: 16 }}>
          <Col>
            <h3 style={{ margin: 0 }}>用户角色管理</h3>
            <p style={{ margin: '4px 0 0', color: '#666' }}>
              为用户分配角色，控制其访问权限
            </p>
          </Col>
          <Col>
            <Search
              placeholder="搜索用户名或邮箱"
              allowClear
              style={{ width: 300 }}
              onSearch={handleSearch}
              onChange={(e) => {
                if (!e.target.value) {
                  setSearchKeyword('');
                  loadUsers(1, pagination.pageSize);
                }
              }}
            />
          </Col>
        </Row>

        {/* 用户表格 */}
        <Table
          columns={columns}
          dataSource={users}
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

      {/* 角色分配模态框 */}
      <Modal
        title={`为用户 "${selectedUser?.name}" 分配角色`}
        open={modalVisible}
        onOk={handleSaveRoles}
        onCancel={() => {
          setModalVisible(false);
          setSelectedUser(null);
          setUserRoles([]);
        }}
        confirmLoading={assigning}
        width={600}
      >
        <div style={{ marginBottom: 16 }}>
          <h4>用户信息</h4>
          {selectedUser && (
            <Space>
              <Avatar 
                size="small" 
                icon={<UserOutlined />}
                src={selectedUser.avatar}
              />
              <span>{selectedUser.name}</span>
              <span style={{ color: '#666' }}>({selectedUser.email})</span>
            </Space>
          )}
        </div>

        <div>
          <h4>选择角色</h4>
          <Select
            mode="multiple"
            style={{ width: '100%' }}
            placeholder="请选择要分配的角色"
            value={userRoles}
            onChange={setUserRoles}
            optionLabelProp="label"
          >
            {roles.map((role: Role) => (
              <Option 
                key={role.id} 
                value={role.id}
                label={role.name}
                disabled={!role.isActive}
              >
                <Space>
                  <span>{role.name}</span>
                  {role.description && (
                    <span style={{ color: '#666', fontSize: '12px' }}>
                      ({role.description})
                    </span>
                  )}
                  {!role.isActive && <Tag color="red">禁用</Tag>}
                  {role.isSystemRole && <Tag color="orange">系统角色</Tag>}
                </Space>
              </Option>
            ))}
          </Select>
          
          <div style={{ marginTop: 8, fontSize: '12px', color: '#666' }}>
            提示：用户可以拥有多个角色，最终权限为所有角色权限的并集
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default UserRolesPage; 