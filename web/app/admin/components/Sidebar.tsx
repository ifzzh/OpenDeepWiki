'use client'

import Link from 'next/link';
import { 
  DashboardOutlined, 
  UserOutlined, 
  DatabaseOutlined, 
  SettingOutlined,
  ApiOutlined,
} from '@ant-design/icons';
import styles from '../styles.module.css';

// 定义导航项结构
export interface NavItem {
  key: string;
  icon: React.ReactNode;
  label: string;
  path: string;
}

interface SidebarProps {
  isSidebarOpen: boolean;
  selectedKey: string;
}

export default function Sidebar({ isSidebarOpen, selectedKey }: SidebarProps) {
  // 导航菜单配置
  const navItems: NavItem[] = [
    {
      key: 'dashboard',
      icon: <DashboardOutlined className={styles.navItemIcon} />,
      label: '数据统计',
      path: '/admin',
    },
    {
      key: 'users',
      icon: <UserOutlined className={styles.navItemIcon} />,
      label: '用户管理',
      path: '/admin/users',
    },
    {
      key: 'repositories',
      icon: <DatabaseOutlined className={styles.navItemIcon} />,
      label: '仓库管理',
      path: '/admin/repositories',
    },
    {
      key: 'finetune',
      icon: <ApiOutlined className={styles.navItemIcon} />,
      label: '微调数据',
      path: '/admin/finetune',
    },
    {
      key: 'settings',
      icon: <SettingOutlined className={styles.navItemIcon} />,
      label: '系统管理',
      path: '/admin/settings',
    },
  ];

  return (
    <aside 
      className={`${styles.sidebarContainer} ${isSidebarOpen ? styles.sidebarOpen : styles.sidebarClosed}`}
    >
      {/* Logo区域 */}
      <div className={styles.sidebarLogo}>
        <Link 
          href="/admin" 
          style={{ 
            color: '#0771c9',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center' 
          }}
        >
          {isSidebarOpen ? (
            <span style={{ fontSize: '1.25rem' }}>OpenDeepWiki 管理</span>
          ) : (
            <span style={{ fontSize: '1.25rem' }}>ODW</span>
          )}
        </Link>
      </div>

      {/* 导航菜单 */}
      <nav style={{ marginTop: '1.5rem' }}>
        <ul style={{ padding: '0 0.75rem' }}>
          {navItems.map((item) => (
            <li key={item.key}>
              <Link 
                href={item.path}
                className={`${styles.navItem} ${selectedKey === item.key ? styles.navItemActive : ''}`}
              >
                <span>{item.icon}</span>
                {isSidebarOpen && <span className={styles.navItemLabel}>{item.label}</span>}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
} 