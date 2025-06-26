'use client'

import { useState, useEffect, useRef } from 'react';
import { Avatar, Button, Dropdown, Space, Typography, Divider, message } from 'antd';
import { 
  UserOutlined, 
  LoginOutlined, 
  LogoutOutlined, 
  SettingOutlined,
  DownOutlined,
  MailOutlined,
  CalendarOutlined
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useTranslation } from '../i18n/client';

const { Text } = Typography;

interface UserInfo {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  createdAt: string;
  lastLoginAt?: string;
}

interface UserAvatarProps {
  className?: string;
}

export default function UserAvatar({ className }: UserAvatarProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const router = useRouter();
  const { t } = useTranslation();

  // 检查登录状态
  useEffect(() => {
    const checkLoginStatus = () => {
      const token = localStorage.getItem('userToken');
      const userInfoStr = localStorage.getItem('userInfo');
      
      if (token && userInfoStr) {
        try {
          const user = JSON.parse(userInfoStr);
          setUserInfo(user);
          setIsLoggedIn(true);
        } catch (error) {
          console.error('解析用户信息失败:', error);
          // 清除无效数据
          localStorage.removeItem('userToken');
          localStorage.removeItem('userInfo');
          setIsLoggedIn(false);
        }
      } else {
        setIsLoggedIn(false);
      }
    };

    checkLoginStatus();

    // 监听存储变化（用于多标签页同步）
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'userToken' || e.key === 'userInfo') {
        checkLoginStatus();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // 处理登录
  const handleLogin = () => {
    // 保存当前路径用于登录后返回
    localStorage.setItem('redirectPath', window.location.pathname);
    router.push('/login');
  };

  // 处理登出
  const handleLogout = () => {
    // 清除登录信息
    localStorage.removeItem('userToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userInfo');
    localStorage.removeItem('redirectPath');
    
    setIsLoggedIn(false);
    setUserInfo(null);
    setDropdownOpen(false);
    
    message.success(t('auth.logout_success', '退出登录成功'));
    
    // 刷新页面以更新状态
    window.location.reload();
  };

  // 获取用户头像
  const getUserAvatar = () => {
    if (userInfo?.avatar) {
      return userInfo.avatar;
    }
    return null;
  };

  // 获取用户显示名称
  const getUserDisplayName = () => {
    return userInfo?.name || t('auth.user', '用户');
  };

  // 获取角色显示文本
  const getRoleText = (role: string) => {
    switch (role) {
      case 'admin':
        return t('auth.role.admin', '管理员');
      case 'editor':
        return t('auth.role.editor', '编辑者');
      default:
        return t('auth.role.user', '用户');
    }
  };

  // 格式化日期
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  // 如果未登录，显示登录按钮
  if (!isLoggedIn) {
    return (
      <Button
        type="text"
        icon={<LoginOutlined />}
        onClick={handleLogin}
        className={className}
      >
        {t('auth.login', '登录')}
      </Button>
    );
  }

  // 用户信息下拉菜单项
  const dropdownItems = [
    {
      key: 'user-info',
      label: (
        <div style={{ padding: '8px 0', minWidth: '200px' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
            <Avatar
              src={getUserAvatar()}
              icon={<UserOutlined />}
              size={40}
              style={{ marginRight: '12px' }}
            />
            <div>
              <Text strong style={{ display: 'block', fontSize: '14px' }}>
                {getUserDisplayName()}
              </Text>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {getRoleText(userInfo?.role || 'user')}
              </Text>
            </div>
          </div>
          
          {userInfo?.email && (
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
              <MailOutlined style={{ marginRight: '8px', color: '#8c8c8c' }} />
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {userInfo.email}
              </Text>
            </div>
          )}
          
          {userInfo?.createdAt && (
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <CalendarOutlined style={{ marginRight: '8px', color: '#8c8c8c' }} />
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {t('auth.joined', '加入于')} {formatDate(userInfo.createdAt)}
              </Text>
            </div>
          )}
        </div>
      ),
      disabled: true,
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'settings',
      label: (
        <Space>
          <SettingOutlined />
          {t('auth.settings', '设置')}
        </Space>
      ),
      onClick: () => {
        setDropdownOpen(false);
        router.push('/settings');
      },
    },
    // 只有管理员才显示管理面板菜单项
    ...(userInfo?.role === 'admin' ? [{
      key: 'admin',
      label: (
        <Space>
          <UserOutlined />
          {t('auth.admin_panel', '管理面板')}
        </Space>
      ),
      onClick: () => {
        setDropdownOpen(false);
        router.push('/admin');
      },
    }] : []),
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      label: (
        <Space>
          <LogoutOutlined />
          {t('auth.logout', '退出登录')}
        </Space>
      ),
      onClick: handleLogout,
      danger: true,
    },
  ];

  return (
    <Dropdown
      menu={{ items: dropdownItems }}
      trigger={['click']}
      open={dropdownOpen}
      onOpenChange={setDropdownOpen}
      placement="bottomRight"
      className={className}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          cursor: 'pointer',
          padding: '4px 8px',
          borderRadius: '8px',
          transition: 'background-color 0.2s',
          backgroundColor: dropdownOpen ? 'rgba(0, 0, 0, 0.04)' : 'transparent',
        }}
        onMouseEnter={(e) => {
          if (!dropdownOpen) {
            e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.04)';
          }
        }}
        onMouseLeave={(e) => {
          if (!dropdownOpen) {
            e.currentTarget.style.backgroundColor = 'transparent';
          }
        }}
      >
        <Avatar
          src={getUserAvatar()}
          icon={<UserOutlined />}
          size={32}
          style={{ marginRight: '8px' }}
        />
        <Text style={{ marginRight: '4px', fontSize: '14px' }}>
          {getUserDisplayName()}
        </Text>
        <DownOutlined
          style={{
            fontSize: '12px',
            color: '#8c8c8c',
            transition: 'transform 0.2s',
            transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      </div>
    </Dropdown>
  );
} 