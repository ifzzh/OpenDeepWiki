'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Row, Col, Button, Typography, Space, Statistic, message } from 'antd';
import {
  UserOutlined,
  TeamOutlined,
  SecurityScanOutlined,
  RightOutlined,
  SettingOutlined,
  KeyOutlined,
} from '@ant-design/icons';
import { getUserList } from '../../services/userService';
import { roleService } from '../../services/roleService';

const { Title, Paragraph, Text } = Typography;

interface PermissionStats {
  totalUsers: number;
  totalRoles: number;
  totalPermissions: number;
  recentAssignments: number;
}

export default function PermissionsPage() {
  const router = useRouter();
  const [stats, setStats] = useState<PermissionStats>({
    totalUsers: 0,
    totalRoles: 0,
    totalPermissions: 0,
    recentAssignments: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 获取真实的统计数据
    const fetchStats = async () => {
      try {
        // 并行获取用户和角色数据
        const [usersResponse, rolesResponse] = await Promise.all([
          getUserList(1, 1), // 只获取第一页用于获取总数
          roleService.getRoleList(1, 1), // 只获取第一页用于获取总数
        ]);

        const newStats: PermissionStats = {
          totalUsers: 0,
          totalRoles: 0,
          totalPermissions: 0, // 这个需要根据实际权限系统来计算
          recentAssignments: 0, // 这个需要根据实际权限分配记录来计算
        };

        // 处理用户数据
        if (usersResponse.code === 200 && usersResponse.data) {
          newStats.totalUsers = usersResponse.data.total;
        }

        // 处理角色数据
        if (rolesResponse.total !== undefined) {
          newStats.totalRoles = rolesResponse.total;
        }

        // TODO: 这里可以添加更多的统计数据API调用
        // 比如权限数量、最近分配记录等

        setStats(newStats);
      } catch (error) {
        console.error('获取权限统计数据失败:', error);
        message.error('获取统计数据失败');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const quickActions = [
    {
      title: '角色管理',
      description: '管理系统角色和角色权限',
      icon: <TeamOutlined style={{ fontSize: '24px', color: '#1890ff' }} />,
      path: '/admin/permissions/roles',
      color: '#1890ff',
    },
    {
      title: '用户角色',
      description: '分配和管理用户角色',
      icon: <UserOutlined style={{ fontSize: '24px', color: '#52c41a' }} />,
      path: '/admin/permissions/users',
      color: '#52c41a',
    },
  ];

  return (
    <div style={{ padding: '0', color: '#f0f6fc' }}>
      {/* 页面标题 */}
      <div style={{ marginBottom: '32px' }}>
        <Title level={2} style={{ color: '#f0f6fc', marginBottom: '8px' }}>
          <SecurityScanOutlined style={{ marginRight: '12px' }} />
          权限管理
        </Title>
        <Paragraph style={{ color: '#8b949e', fontSize: '16px', margin: 0 }}>
          管理系统用户权限、角色分配和访问控制
        </Paragraph>
      </div>

      {/* 统计卡片 */}
      <Row gutter={[24, 24]} style={{ marginBottom: '32px' }}>
        <Col xs={24} sm={12} lg={6}>
          <Card
            style={{
              background: '#1a1d21',
              border: '1px solid #30363d',
              borderRadius: '12px',
            }}
            bodyStyle={{ padding: '24px' }}
          >
            <Statistic
              title={<span style={{ color: '#8b949e' }}>总用户数</span>}
              value={stats.totalUsers}
              loading={loading}
              prefix={<UserOutlined style={{ color: '#58a6ff' }} />}
              valueStyle={{ color: '#f0f6fc', fontSize: '28px', fontWeight: '600' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card
            style={{
              background: '#1a1d21',
              border: '1px solid #30363d',
              borderRadius: '12px',
            }}
            bodyStyle={{ padding: '24px' }}
          >
            <Statistic
              title={<span style={{ color: '#8b949e' }}>系统角色</span>}
              value={stats.totalRoles}
              loading={loading}
              prefix={<TeamOutlined style={{ color: '#7c3aed' }} />}
              valueStyle={{ color: '#f0f6fc', fontSize: '28px', fontWeight: '600' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card
            style={{
              background: '#1a1d21',
              border: '1px solid #30363d',
              borderRadius: '12px',
            }}
            bodyStyle={{ padding: '24px' }}
          >
            <Statistic
              title={<span style={{ color: '#8b949e' }}>权限项目</span>}
              value={stats.totalPermissions}
              loading={loading}
              prefix={<KeyOutlined style={{ color: '#f59e0b' }} />}
              valueStyle={{ color: '#f0f6fc', fontSize: '28px', fontWeight: '600' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card
            style={{
              background: '#1a1d21',
              border: '1px solid #30363d',
              borderRadius: '12px',
            }}
            bodyStyle={{ padding: '24px' }}
          >
            <Statistic
              title={<span style={{ color: '#8b949e' }}>最近分配</span>}
              value={stats.recentAssignments}
              loading={loading}
              prefix={<SettingOutlined style={{ color: '#10b981' }} />}
              valueStyle={{ color: '#f0f6fc', fontSize: '28px', fontWeight: '600' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 快速操作 */}
      <div style={{ marginBottom: '32px' }}>
        <Title level={3} style={{ color: '#f0f6fc', marginBottom: '20px' }}>
          快速操作
        </Title>
        <Row gutter={[24, 24]}>
          {quickActions.map((action, index) => (
            <Col xs={24} md={12} key={index}>
              <Card
                hoverable
                style={{
                  background: '#1a1d21',
                  border: '1px solid #30363d',
                  borderRadius: '12px',
                  height: '100%',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                }}
                bodyStyle={{ padding: '24px' }}
                onClick={() => router.push(action.path)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = action.color;
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = `0 4px 12px rgba(0, 0, 0, 0.3)`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#30363d';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                    <div style={{ marginRight: '16px' }}>
                      {action.icon}
                    </div>
                    <div>
                      <Title level={4} style={{ color: '#f0f6fc', margin: '0 0 8px 0' }}>
                        {action.title}
                      </Title>
                      <Text style={{ color: '#8b949e', fontSize: '14px' }}>
                        {action.description}
                      </Text>
                    </div>
                  </div>
                  <RightOutlined style={{ color: '#8b949e', fontSize: '16px' }} />
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      </div>

      {/* 权限管理说明 */}
      <Card
        style={{
          background: '#1a1d21',
          border: '1px solid #30363d',
          borderRadius: '12px',
        }}
        bodyStyle={{ padding: '24px' }}
      >
        <Title level={4} style={{ color: '#f0f6fc', marginBottom: '16px' }}>
          权限管理说明
        </Title>
        <div style={{ color: '#8b949e', lineHeight: '1.6' }}>
          <div style={{ marginBottom: '12px' }}>
            <Text strong style={{ color: '#f0f6fc' }}>角色管理：</Text>
            <Text style={{ color: '#8b949e', marginLeft: '8px' }}>
              创建和管理系统角色，定义角色权限范围
            </Text>
          </div>
          <div style={{ marginBottom: '12px' }}>
            <Text strong style={{ color: '#f0f6fc' }}>用户角色：</Text>
            <Text style={{ color: '#8b949e', marginLeft: '8px' }}>
              为用户分配角色，控制用户访问权限
            </Text>
          </div>
          <div>
            <Text strong style={{ color: '#f0f6fc' }}>访问控制：</Text>
            <Text style={{ color: '#8b949e', marginLeft: '8px' }}>
              基于角色的访问控制 (RBAC)，确保系统安全
            </Text>
          </div>
        </div>
      </Card>
    </div>
  );
} 