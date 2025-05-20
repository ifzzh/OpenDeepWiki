'use client'

import Link from 'next/link';
import { 
  UserOutlined, 
  SettingOutlined, 
  LogoutOutlined,
  MenuOutlined,
  RightOutlined,
} from '@ant-design/icons';
import styles from '../styles.module.css';

interface HeaderProps {
  toggleSidebar: () => void;
  userName: string;
  onLogout: () => void;
}

export default function Header({ toggleSidebar, userName, onLogout }: HeaderProps) {
  return (
    <header className={styles.headerContainer}>
      <button 
        onClick={toggleSidebar}
        style={{
          padding: '0.5rem',
          borderRadius: '0.5rem',
          color: '#6b7280',
          cursor: 'pointer',
          backgroundColor: 'transparent',
          border: 'none'
        }}
      >
        <MenuOutlined style={{ fontSize: '1.25rem' }} />
      </button>

      <div style={{ flex: 1 }}></div>

      {/* 用户信息与下拉菜单 */}
      <div style={{ position: 'relative' }} className="group">
        <div style={{
          display: 'flex',
          alignItems: 'center',
          cursor: 'pointer',
          padding: '0.5rem 0.75rem',
          borderRadius: '0.5rem',
        }}>
          <div style={{
            height: '2rem',
            width: '2rem',
            backgroundColor: '#e0effe',
            color: '#0771c9',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{userName.slice(0, 1).toUpperCase()}</span>
          </div>
          <span style={{ marginLeft: '0.5rem', color: '#4b5563' }}>{userName}</span>
          <RightOutlined style={{ 
            marginLeft: '0.25rem', 
            color: '#9ca3af',
            transition: 'transform 0.2s',
          }} className="group-hover:rotate-90" />
        </div>

        {/* 下拉菜单 */}
        <div style={{
          position: 'absolute',
          right: 0,
          marginTop: '0.25rem',
          width: '12rem',
          backgroundColor: 'white',
          borderRadius: '0.5rem',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          border: '1px solid #f3f4f6',
          padding: '0.5rem 0',
          zIndex: 20,
          display: 'none',
        }} className="group-hover:block">
          <Link href="/admin/settings/profile" style={{
            display: 'flex',
            alignItems: 'center',
            padding: '0.5rem 1rem',
            color: '#4b5563',
          }}>
            <UserOutlined style={{ marginRight: '0.5rem' }} />
            <span>个人信息</span>
          </Link>
          <Link href="/admin/settings" style={{
            display: 'flex',
            alignItems: 'center',
            padding: '0.5rem 1rem',
            color: '#4b5563',
          }}>
            <SettingOutlined style={{ marginRight: '0.5rem' }} />
            <span>设置</span>
          </Link>
          <div style={{
            borderTop: '1px solid #f3f4f6',
            margin: '0.5rem 0',
          }}></div>
          <button 
            onClick={onLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '0.5rem 1rem',
              color: '#4b5563',
              width: '100%',
              textAlign: 'left',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <LogoutOutlined style={{ marginRight: '0.5rem' }} />
            <span>退出登录</span>
          </button>
        </div>
      </div>
    </header>
  );
} 