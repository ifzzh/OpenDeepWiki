'use client'

import { Layout, Menu, Button, Avatar, Dropdown, theme } from 'antd';
import type { MenuProps } from 'antd';
import { 
  DashboardOutlined, 
  UserOutlined, 
  DatabaseOutlined, 
  SettingOutlined, 
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  BarsOutlined
} from '@ant-design/icons';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import styles from './admin.module.css';

const { Header, Sider, Content } = Layout;

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();
  const { token } = theme.useToken();

  // 检查用户是否已登录
  useEffect(() => {
    // 这里应该是实际的登录状态检查逻辑
    // 例如从localStorage, cookies或API检查用户会话
    const checkLoginStatus = () => {
      // 模拟检查登录状态
      const userToken = localStorage.getItem('userToken');
      if (!userToken) {
        // 保存当前路径，以便登录后返回
        localStorage.setItem('redirectPath', pathname);
        // 用户未登录，重定向到登录页面
        router.push('/login');
      } else {
        setIsLoggedIn(true);
      }
      setIsLoading(false);
    };
    
    checkLoginStatus();
  }, [router, pathname]);

  // 处理登出
  const handleLogout = () => {
    // 清除用户登录信息
    localStorage.removeItem('userToken');
    // 重定向到登录页面
    router.push('/login');
  };

  // 获取当前选中的菜单项
  const getSelectedKeys = () => {
    if (pathname === '/admin') return ['dashboard'];
    if (pathname.startsWith('/admin/users')) return ['users'];
    if (pathname.startsWith('/admin/repositories')) return ['repositories'];
    if (pathname.startsWith('/admin/settings')) return ['settings'];
    return [];
  };

  const items = [
    {
      key: 'dashboard',
      icon: <DashboardOutlined />,
      label: <Link href="/admin">数据统计</Link>,
    },
    {
      key: 'users',
      icon: <UserOutlined />,
      label: <Link href="/admin/users">用户管理</Link>,
    },
    {
      key: 'repositories',
      icon: <DatabaseOutlined />,
      label: <Link href="/admin/repositories">仓库管理</Link>,
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: <Link href="/admin/settings">系统管理</Link>,
    },
  ];

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人信息',
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '设置',
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout,
    },
  ];

  // 如果正在加载，显示空内容
  if (isLoading) {
    return null;
  }

  // 如果未登录，将由useEffect重定向到登录页面
  if (!isLoggedIn) {
    return null;
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider 
        trigger={null} 
        collapsible 
        collapsed={collapsed}
        theme="light"
        className={styles.adminSider}
        width={220}
      >
        <div className={styles.logo}>
          {!collapsed && <span>OpenDeepWiki 管理</span>}
        </div>
        <Menu
          mode="inline"
          selectedKeys={getSelectedKeys()}
          items={items}
          style={{ borderRight: 0 }}
        />
      </Sider>
      <Layout>
        <Header className={styles.adminHeader} style={{ background: token.colorBgContainer }}>
          <div className={styles.headerLeft}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              className={styles.toggleBtn}
            />
          </div>
          <div className={styles.headerRight}>
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <div className={styles.userInfo}>
                <Avatar icon={<UserOutlined />} />
                <span className={styles.username}>
                  {localStorage.getItem('userName') || '管理员'}
                </span>
              </div>
            </Dropdown>
          </div>
        </Header>
        <Content className={styles.adminContent}>
          <div className={styles.contentWrapper}>
            {children}
          </div>
        </Content>
      </Layout>
    </Layout>
  );
} 