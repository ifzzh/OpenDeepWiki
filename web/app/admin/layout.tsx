'use client'

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { 
  SideNav,
  Layout,
  Header,
  Avatar,
  ActionIcon,
  Dropdown,
  ConfigProvider,
  ThemeProvider,
} from '@lobehub/ui';
import {
  MenuOutlined,
  DashboardOutlined,
  UserOutlined,
  DatabaseOutlined,
  SettingOutlined,
  ApiOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { menuService, MenuItem, UserMenu } from '../services/menuService';

// 菜单项类型定义
interface MenuItemType {
  key: string;
  icon: React.ReactNode;
  label: string;
  children?: MenuItemType[];
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userName, setUserName] = useState('管理员');
  const [userRole, setUserRole] = useState('user');
  const [userMenu, setUserMenu] = useState<UserMenu | null>(null);
  const [expandedKeys, setExpandedKeys] = useState<string[]>(['permissions']); // 默认展开权限管理
  const pathname = usePathname();
  const router = useRouter();

  // 获取当前激活的菜单项
  const getActiveKey = () => {
    if (pathname === '/admin') return '/admin';
    if (pathname.startsWith('/admin/users')) return '/admin/users';
    if (pathname.startsWith('/admin/repositories')) return '/admin/repositories';
    if (pathname.startsWith('/admin/finetune')) return '/admin/finetune';
    if (pathname.startsWith('/admin/roles')) return '/admin/roles';
    if (pathname.startsWith('/admin/permissions/roles')) return '/admin/permissions/roles';
    if (pathname.startsWith('/admin/permissions/users')) return '/admin/permissions/users';
    if (pathname.startsWith('/admin/settings')) return '/admin/settings';
    return '/admin';
  };

  // 获取菜单图标
  const getMenuIcon = (iconName?: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      'dashboard': <DashboardOutlined />,
      'user': <UserOutlined />,
      'database': <DatabaseOutlined />,
      'setting': <SettingOutlined />,
      'api': <ApiOutlined />,
    };
    return iconMap[iconName || 'dashboard'] || <DashboardOutlined />;
  };

  // 导航菜单配置
  const getNavItems = (): MenuItemType[] => {
    // 暂时不使用动态菜单接口，直接使用静态配置
    // if (userMenu && userMenu.menus.length > 0) {
    //   // 使用动态菜单
    //   return userMenu.menus.filter(menu => !menu.isHidden).map(menu => ({
    //     key: menu.path,
    //     icon: getMenuIcon(menu.icon),
    //     label: menu.name,
    //   }));
    // }
    
    // 后备菜单配置
    const allItems: MenuItemType[] = [
      {
        key: '/admin',
        icon: <DashboardOutlined />,
        label: '数据统计',
      },
      {
        key: '/admin/users',
        icon: <UserOutlined />,
        label: '用户管理',
      },
      {
        key: '/admin/repositories',
        icon: <DatabaseOutlined />,
        label: '仓库管理',
      },
      {
        key: '/admin/finetune',
        icon: <ApiOutlined />,
        label: '数据微调',
      },
      {
        key: 'permissions',
        icon: <SettingOutlined />,
        label: '权限管理',
        children: [
          {
            key: '/admin/roles',
            icon: <UserOutlined />,
            label: '角色管理',
          },
          {
            key: '/admin/permissions/roles',
            icon: <DatabaseOutlined />,
            label: '角色权限',
          },
          {
            key: '/admin/permissions/users',
            icon: <UserOutlined />,
            label: '用户角色',
          },
        ],
      },
      {
        key: '/admin/settings',
        icon: <SettingOutlined />,
        label: '个人设置',
      },
    ];

    if (userRole === 'admin') {
      return allItems;
    } else {
      // 普通用户显示：数据统计、仓库管理、数据微调、个人设置
      return [
        allItems[0], // 数据统计
        allItems[2], // 仓库管理
        allItems[3], // 数据微调
        allItems[5], // 个人设置
      ];
    }
  };

  // 用户下拉菜单
  const userMenuItems = [
    {
      key: 'profile',
      label: '个人信息',
      icon: <UserOutlined />,
      onClick: () => router.push('/admin/settings/profile'),
    },
    {
      key: 'settings',
      label: '设置',
      icon: <SettingOutlined />,
      onClick: () => router.push('/admin/settings'),
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      label: '退出登录',
      icon: <LogoutOutlined />,
      onClick: handleLogout,
      danger: true,
    },
  ];

  // 检查用户是否已登录
  useEffect(() => {
    const checkLoginStatus = async () => {
      const userToken = localStorage.getItem('userToken') || localStorage.getItem('token');
      if (!userToken) {
        localStorage.setItem('redirectPath', pathname);
        router.push('/login');
      } else {
        setIsLoggedIn(true);
        const storedUserName = localStorage.getItem('userName');
        if (storedUserName) {
          setUserName(storedUserName);
        }
        
        const userInfoStr = localStorage.getItem('userInfo');
        if (userInfoStr) {
          try {
            const userInfo = JSON.parse(userInfoStr);
            if (userInfo.role) {
              setUserRole(userInfo.role);
            } else {
              setUserRole('user');
            }
          } catch (error) {
            console.error('解析用户信息失败:', error);
            setUserRole('user');
          }
        } else {
          setUserRole('user');
        }

        // 暂时不获取用户菜单接口
        // try {
        //   const menu = await menuService.getUserMenu();
        //   setUserMenu(menu);
        //   if (menu.user) {
        //     setUserName(menu.user.name);
        //     setUserRole(menu.user.role);
        //   }
        // } catch (error) {
        //   console.error('获取用户菜单失败:', error);
        //   // 继续使用后备菜单
        // }

        // 普通用户默认定位到首页
        if (userRole !== 'admin' && pathname === '/admin') {
          // 已经在首页，不需要重定向
        }
      }
      setIsLoading(false);
    };
    
    checkLoginStatus();
  }, [router, pathname]);

  // 处理登出
  function handleLogout() {
    console.log('用户退出登录');
    localStorage.removeItem('userToken');
    localStorage.removeItem('userName');
    localStorage.removeItem('userInfo');
    localStorage.removeItem('redirectPath');
    
    setIsLoggedIn(false);
    setUserName('管理员');
    setUserRole('user');
    
    router.push('/login');
  }

  // 处理菜单点击
  const handleMenuClick = (key: string) => {
    router.push(key);
  };

  // 如果正在加载，显示空内容
  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: '#0e1117',
        color: '#fff'
      }}>
        <div>加载中...</div>
      </div>
    );
  }

  // 如果未登录，将由useEffect重定向到登录页面
  if (!isLoggedIn) {
    return null;
  }

  return (
    <ThemeProvider 
      themeMode="dark"
      appearance="dark"
    >
      <div style={{ 
        height: '100vh',
        background: '#0e1117',
        display: 'flex',
      }}>
        {/* 侧边栏 */}
        <div
          style={{
            width: collapsed ? '64px' : '240px',
            transition: 'width 0.3s ease',
            background: '#1a1d21',
            borderRight: '1px solid #30363d',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Logo区域 */}
          <div style={{
            height: '64px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            padding: collapsed ? '0' : '0 16px',
            borderBottom: '1px solid #30363d',
          }}>
            {!collapsed && (
              <span style={{ 
                marginLeft: '12px', 
                color: '#f0f6fc',
                fontSize: '16px',
                fontWeight: '600'
              }}>
                OpenDeepWiki 管理
              </span>
            )}
          </div>

          {/* 导航菜单 */}
          <div style={{ flex: 1, padding: '16px 8px' }}>
            {getNavItems().map((item) => (
              <div key={item.key}>
                {/* 主菜单项 */}
                <div
                  onClick={() => {
                    if (item.children) {
                      // 有子菜单，切换展开状态
                      setExpandedKeys(prev => 
                        prev.includes(item.key) 
                          ? prev.filter(k => k !== item.key)
                          : [...prev, item.key]
                      );
                    } else {
                      // 无子菜单，直接跳转
                      handleMenuClick(item.key);
                    }
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    marginBottom: '4px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    color: (!item.children && getActiveKey() === item.key) ? '#58a6ff' : '#8b949e',
                    backgroundColor: (!item.children && getActiveKey() === item.key) ? 'rgba(88, 166, 255, 0.1)' : 'transparent',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!item.children && getActiveKey() !== item.key) {
                      e.currentTarget.style.backgroundColor = 'rgba(177, 186, 196, 0.05)';
                      e.currentTarget.style.color = '#f0f6fc';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!item.children && getActiveKey() !== item.key) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = '#8b949e';
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ fontSize: '18px', minWidth: '18px' }}>
                      {item.icon}
                    </span>
                    {!collapsed && (
                      <span style={{ 
                        marginLeft: '12px',
                        fontSize: '14px',
                        fontWeight: (!item.children && getActiveKey() === item.key) ? '500' : '400'
                      }}>
                        {item.label}
                      </span>
                    )}
                  </div>
                  {/* 展开/收起图标 */}
                  {!collapsed && item.children && (
                    <span style={{ 
                      fontSize: '12px',
                      transform: expandedKeys.includes(item.key) ? 'rotate(90deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s ease'
                    }}>
                      ▶
                    </span>
                  )}
                </div>

                {/* 子菜单 */}
                {!collapsed && item.children && expandedKeys.includes(item.key) && (
                  <div style={{ marginLeft: '20px', marginBottom: '8px' }}>
                    {item.children.map((child) => (
                      <div
                        key={child.key}
                        onClick={() => handleMenuClick(child.key)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '8px 16px',
                          marginBottom: '2px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          color: getActiveKey() === child.key ? '#58a6ff' : '#8b949e',
                          backgroundColor: getActiveKey() === child.key ? 'rgba(88, 166, 255, 0.1)' : 'transparent',
                          transition: 'all 0.2s ease',
                          fontSize: '13px',
                        }}
                        onMouseEnter={(e) => {
                          if (getActiveKey() !== child.key) {
                            e.currentTarget.style.backgroundColor = 'rgba(177, 186, 196, 0.05)';
                            e.currentTarget.style.color = '#f0f6fc';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (getActiveKey() !== child.key) {
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.color = '#8b949e';
                          }
                        }}
                      >
                        <span style={{ fontSize: '16px', minWidth: '16px' }}>
                          {child.icon}
                        </span>
                        <span style={{ 
                          marginLeft: '8px',
                          fontWeight: getActiveKey() === child.key ? '500' : '400'
                        }}>
                          {child.label}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        
        {/* 主内容区域 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* 头部 */}
          <div style={{
            height: '64px',
            background: '#1a1d21',
            borderBottom: '1px solid #30363d',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <ActionIcon
                icon={MenuOutlined}
                onClick={() => setCollapsed(!collapsed)}
                style={{ 
                  marginRight: '16px',
                  color: '#8b949e',
                  fontSize: '18px',
                  cursor: 'pointer'
                }}
              />
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <Dropdown
                menu={{ items: userMenuItems }}
                placement="bottomRight"
              >
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  cursor: 'pointer',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(177, 186, 196, 0.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
                >
                  <Avatar
                    size={32}
                    style={{
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      marginRight: '8px'
                    }}
                  >
                    {userName.slice(0, 1).toUpperCase()}
                  </Avatar>
                  <span style={{ 
                    color: '#f0f6fc',
                    fontSize: '14px'
                  }}>
                    {userName}
                  </span>
                </div>
              </Dropdown>
            </div>
          </div>
          
          {/* 内容区域 */}
          <div style={{
            flex: 1,
            padding: '24px',
            overflow: 'auto',
            background: '#0e1117',
          }}>
            <div style={{
              background: '#1a1d21',
              borderRadius: '12px',
              border: '1px solid #30363d',
              padding: '24px',
              minHeight: 'calc(100vh - 136px)',
              color: '#f0f6fc'
            }}>
              {children}
            </div>
          </div>
        </div>
      </div>
    </ThemeProvider>
  );
} 