'use client'

import { Card, Form, Input, Button, Avatar, Space, message, Switch, Select, Upload, Typography, Row, Col, Divider, Progress, Badge } from 'antd';
import {
  UserOutlined,
  LockOutlined,
  SettingOutlined,
  SaveOutlined,
  UploadOutlined,
  MailOutlined,
  CalendarOutlined,
  GlobalOutlined,
  HomeOutlined,
  ArrowLeftOutlined,
  ApiOutlined,
  BellOutlined,
  SecurityScanOutlined,
  SafetyCertificateOutlined,
  CameraOutlined,
  EditOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { UploadProps } from 'antd';
import {
  getCurrentUser,
  updateCurrentUserProfile,
  verifyPassword,
  changePassword,
  uploadAvatar,
  type UserInfo,
  type UpdateProfileRequest,
  type ChangePasswordRequest
} from '../services/userService';
import AppManagement from '../components/AppManagement';

const { Title, Text, Paragraph } = Typography;

export default function SettingsPage() {
  const router = useRouter();
  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [preferencesForm] = Form.useForm();

  const [activeSection, setActiveSection] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string>('');

  // 获取当前用户信息
  useEffect(() => {
    const loadUserInfo = async () => {
      try {
        const { data } = await getCurrentUser() as any;
        if (data) {
          const user = data.data;
          setUserInfo(user);
          setAvatarUrl(user.avatar || '');

          profileForm.setFieldsValue({
            name: user.name,
            email: user.email,
          });

          preferencesForm.setFieldsValue({
            language: 'zh-CN',
            timezone: 'Asia/Shanghai',
            emailNotifications: true,
            systemNotifications: true,
          });
        } else {
          const storedUserInfo = localStorage.getItem('userInfo');
          if (storedUserInfo) {
            const user = JSON.parse(storedUserInfo);
            setUserInfo(user);
            setAvatarUrl(user.avatar || '');

            profileForm.setFieldsValue({
              name: user.name,
              email: user.email,
            });
          } else {
            message.error('获取用户信息失败，请重新登录');
            router.push('/login');
          }
        }
      } catch (error) {
        console.error('加载用户信息失败:', error);
        message.error('加载用户信息失败');
      }
    };

    loadUserInfo();
  }, [profileForm, preferencesForm, router]);

  // 处理个人信息更新
  const handleProfileUpdate = async (values: any) => {
    if (!userInfo) return;

    try {
      setLoading(true);

      const updateData: UpdateProfileRequest = {
        name: values.name,
        email: values.email,
        avatar: avatarUrl,
      };

      const { data } = await updateCurrentUserProfile(updateData) as any;
      if (data.code === 200) {
        message.success('个人信息更新成功');
        const updatedUser = { ...userInfo, ...updateData };
        localStorage.setItem('userInfo', JSON.stringify(updatedUser));
        setUserInfo(updatedUser);
      } else {
        message.error(data.message || '更新失败');
      }
    } catch (error) {
      console.error('更新个人信息失败:', error);
      message.error('更新失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 处理密码修改
  const handlePasswordChange = async (values: any) => {
    if (!userInfo) return;

    try {
      setLoading(true);

      const verifyResponse = await verifyPassword(values.currentPassword);
      if (verifyResponse.code !== 200 || !verifyResponse.data) {
        message.error('当前密码不正确');
        return;
      }

      const changePasswordData: ChangePasswordRequest = {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      };

      const response = await changePassword(changePasswordData);
      if (response.code === 200) {
        message.success('密码修改成功');
        passwordForm.resetFields();
      } else {
        message.error(response.message || '密码修改失败');
      }
    } catch (error) {
      console.error('修改密码失败:', error);
      message.error('修改密码失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 头像上传配置
  const uploadProps: UploadProps = {
    name: 'avatar',
    showUploadList: false,
    beforeUpload: async (file) => {
      const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png' || file.type === 'image/gif';
      if (!isJpgOrPng) {
        message.error('只能上传 JPG/PNG/GIF 格式的图片!');
        return false;
      }
      const isLt2M = file.size / 1024 / 1024 < 2;
      if (!isLt2M) {
        message.error('图片大小不能超过 2MB!');
        return false;
      }

      try {
        setLoading(true);
        const { data } = await uploadAvatar(file) as any;
        if (data.code === 200 && data.data) {
          const avatarUrl = data.data;
          setAvatarUrl(avatarUrl);
          message.success('头像上传成功');

          if (userInfo) {
            const updateData: UpdateProfileRequest = {
              name: userInfo.name,
              email: userInfo.email,
              avatar: avatarUrl,
            };

            const { data } = await updateCurrentUserProfile(updateData) as any;
            if (data.code === 200) {
              const updatedUser = { ...userInfo, avatar: avatarUrl };
              localStorage.setItem('userInfo', JSON.stringify(updatedUser));
              setUserInfo(updatedUser);
            }
          }
        } else {
          message.error(data.message || '头像上传失败');
        }
      } catch (error) {
        console.error('头像上传失败:', error);
        message.error('头像上传失败，请重试');
      } finally {
        setLoading(false);
      }

      return false;
    },
  };

  // 返回首页
  const handleGoHome = () => {
    router.push('/');
  };

  // 侧边栏菜单项
  const menuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      title: '账户信息',
    },
    {
      key: 'security',
      icon: <SecurityScanOutlined />,
      title: '安全设置',
    },
    {
      key: 'apps',
      icon: <ApiOutlined />,
      title: '应用管理',
    }
  ];

  // 渲染内容区域
  const renderContent = () => {
    switch (activeSection) {
      case 'profile':
        return (
          <div className="content-section">
            <div className="section-header">
              <Title level={3} className="section-title">账户信息</Title>
              <Text className="section-description">管理您的个人资料和基本信息</Text>
            </div>

            <Row justify="center" gutter={[24, 24]}>
              <Col xs={24} sm={20} md={16} lg={8}>
                <Card className="profile-card">
                  <div className="profile-avatar-section">
                    <div className="avatar-container">
                      <Avatar
                        size={80}
                        src={avatarUrl}
                        icon={<UserOutlined />}
                        className="profile-avatar"
                      />
                      <Upload {...uploadProps}>
                        <Button 
                          className="avatar-upload-btn" 
                          icon={<CameraOutlined />}
                          shape="circle"
                          size="large"
                        />
                      </Upload>
                    </div>
                    <div className="profile-info">
                      <Title level={4} className="profile-name">{userInfo?.name}</Title>
                      <Text className="profile-email">{userInfo?.email}</Text>
                      <div className="profile-status">
                        <Badge status="success" text="已验证" />
                      </div>
                    </div>
                  </div>
                </Card>
              </Col>

              <Col xs={24} sm={20} md={16} lg={16}>
                <Card className="form-card">
                  <Title level={5}>基本信息</Title>
                  <Form
                    form={profileForm}
                    layout="vertical"
                    onFinish={handleProfileUpdate}
                    className="profile-form"
                  >
                    <Row gutter={16}>
                      <Col xs={24} sm={12}>
                        <Form.Item
                          name="name"
                          label="用户名"
                          rules={[
                            { required: true, message: '请输入用户名' },
                            { min: 2, message: '用户名至少2个字符' }
                          ]}
                        >
                          <Input 
                            placeholder="请输入用户名" 
                            className="form-input"
                          />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12}>
                        <Form.Item
                          name="email"
                          label="邮箱地址"
                          rules={[
                            { required: true, message: '请输入邮箱地址' },
                            { type: 'email', message: '请输入有效的邮箱地址' }
                          ]}
                        >
                          <Input 
                            placeholder="请输入邮箱地址" 
                            className="form-input"
                          />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Form.Item>
                      <Button
                        type="primary"
                        htmlType="submit"
                        loading={loading}
                        className="submit-btn"
                        icon={<SaveOutlined />}
                      >
                        保存更改
                      </Button>
                    </Form.Item>
                  </Form>
                </Card>
              </Col>
            </Row>
          </div>
        );

      case 'security':
        return (
          <div className="content-section">
            <div className="section-header">
              <Title level={3} className="section-title">安全设置</Title>
              <Text className="section-description">管理您的账户安全和密码设置</Text>
            </div>

            <Row justify="center" gutter={[24, 24]}>
              <Col xs={24} sm={20} md={16} lg={12}>
                <Card className="form-card">
                  <div className="card-header">
                    <SafetyCertificateOutlined className="card-icon" />
                    <Title level={5}>修改密码</Title>
                  </div>
                  <Paragraph type="secondary">
                    定期更改密码有助于保护您的账户安全
                  </Paragraph>

                  <Form
                    form={passwordForm}
                    layout="vertical"
                    onFinish={handlePasswordChange}
                    className="password-form"
                  >
                    <Form.Item
                      name="currentPassword"
                      label="当前密码"
                      rules={[{ required: true, message: '请输入当前密码' }]}
                    >
                      <Input.Password placeholder="请输入当前密码" className="form-input" />
                    </Form.Item>

                    <Form.Item
                      name="newPassword"
                      label="新密码"
                      rules={[
                        { required: true, message: '请输入新密码' },
                        { min: 8, message: '密码至少8个字符' },
                        {
                          pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
                          message: '密码必须包含大小写字母和数字'
                        }
                      ]}
                    >
                      <Input.Password placeholder="请输入新密码" className="form-input" />
                    </Form.Item>

                    <Form.Item
                      name="confirmPassword"
                      label="确认新密码"
                      dependencies={['newPassword']}
                      rules={[
                        { required: true, message: '请确认新密码' },
                        ({ getFieldValue }) => ({
                          validator(_, value) {
                            if (!value || getFieldValue('newPassword') === value) {
                              return Promise.resolve();
                            }
                            return Promise.reject(new Error('两次输入的密码不一致'));
                          },
                        }),
                      ]}
                    >
                      <Input.Password placeholder="请再次输入新密码" className="form-input" />
                    </Form.Item>

                    <Form.Item>
                      <Button
                        type="primary"
                        htmlType="submit"
                        loading={loading}
                        className="submit-btn"
                        icon={<SaveOutlined />}
                      >
                        更新密码
                      </Button>
                    </Form.Item>
                  </Form>
                </Card>
              </Col>
            </Row>
          </div>
        );

      case 'apps':
        return (
          <div className="content-section">
            <div className="section-header">
              <Title level={3} className="section-title">应用管理</Title>
              <Text className="section-description">管理与您账户连接的应用</Text>
            </div>
            <div className="app-management-container">
              <AppManagement />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="settings-container">
      {/* 顶部导航栏 */}
      <div className="settings-header">
        <div className="header-left">
          <Button 
            type="text" 
            icon={<ArrowLeftOutlined />}
            onClick={handleGoHome}
            className="back-btn"
          >
            返回
          </Button>
          <div className="header-title">
            <Title level={2} className="page-title">设置</Title>
          </div>
        </div>
      </div>

      <div className="settings-layout">
        {/* 左侧导航菜单 */}
        <div className="settings-sidebar">
          <div className="sidebar-menu">
            {menuItems.map(item => (
              <div
                key={item.key}
                className={`menu-item ${activeSection === item.key ? 'active' : ''}`}
                onClick={() => setActiveSection(item.key)}
              >
                <div className="menu-icon">{item.icon}</div>
                <div className="menu-content">
                  <div className="menu-title">{item.title}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 右侧内容区域 */}
        <div className="settings-content">
          {loading && (
            <div className="loading-overlay">
              <div className="loading-spinner">
                <div className="spinner"></div>
                <Text className="loading-text">更新中...</Text>
              </div>
            </div>
          )}
          {renderContent()}
        </div>
      </div>

      <style jsx>{`
        .settings-container {
          min-height: 100vh;
          background: #0a0a0a;
          color: #ffffff;
        }

        .settings-header {
          padding: 16px 20px;
          border-bottom: 1px solid #1f1f1f;
          background: #111111;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .back-btn {
          color:rgb(255, 255, 255);
          border: none;
          background: transparent;
        }

        .back-btn:hover {
          color: #ffffff;
          background: #1f1f1f;
        }

        .header-title .page-title {
          color: #ffffff;
          margin: 0;
          font-size: 24px;
          font-weight: 600;
        }

        .page-subtitle {
          color: #888888;
          font-size: 14px;
        }

        .settings-layout {
          display: flex;
          min-height: calc(100vh - 80px);
        }

        .settings-sidebar {
          width: 280px;
          background: #111111;
          border-right: 1px solid #1f1f1f;
          padding: 16px 0;
        }

        .sidebar-menu {
          padding: 0 12px;
        }

        .menu-item {
          display: flex;
          align-items: center;
          padding: 5px;
          margin-bottom: 4px;
          border-radius: 8px;
          cursor: pointer;
          background: transparent;
        }

        .menu-item:hover {
          background: #1a1a1a;
        }

        .menu-item.active {
          background: #1a1a1a;
        }

        .menu-icon {
          font-size: 20px;
          color: #888888;
          margin-right: 16px;
          width: 24px;
          text-align: center;
        }

        .menu-item.active .menu-icon {
          color: #1890ff;
        }

        .menu-content {
          flex: 1;
        }

        .menu-title {
          font-size: 15px;
          font-weight: 500;
          color: #ffffff;
          margin-bottom: 4px;
        }

        .menu-description {
          font-size: 13px;
          color: #666666;
          line-height: 1.4;
        }

        .settings-content {
          flex: 1;
          padding: 20px;
          background: #0a0a0a;
          position: relative;
        }

        .loading-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(10, 10, 10, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          backdrop-filter: blur(4px);
        }

        .loading-spinner {
          text-align: center;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #333333;
          border-top: 3px solid #1890ff;
          border-radius: 50%;
          margin: 0 auto 16px;
          animation: spin 1s linear infinite;
        }

        .loading-text {
          color: #ffffff;
          font-size: 14px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .content-section {
          max-width: 1000px;
          margin: 0 auto;
        }

        .app-management-container {
          max-width: 900px;
          margin: 0 auto;
        }

        .section-header {
          margin-bottom: 20px;
        }

        .section-title {
          color: #ffffff;
          margin: 0 0 6px 0;
          font-size: 24px;
          font-weight: 600;
        }

        .section-description {
          color: #888888;
          font-size: 14px;
        }

        :global(.settings-container .ant-card) {
          background: #151515;
          border: 1px solid #262626;
          border-radius: 8px;
        }

        :global(.settings-container .ant-card .ant-card-body) {
          padding: 16px;
        }

        .profile-card {
          text-align: center;
        }

        .profile-avatar-section {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .avatar-container {
          position: relative;
          margin-bottom: 16px;
        }

        .profile-avatar {
          border: 4px solid #262626;
        }

        .avatar-upload-btn {
          position: absolute;
          bottom: 0;
          right: 0;
          background: #1890ff;
          border: 2px solid #151515;
          color: white;
        }

        .avatar-upload-btn:hover {
          background: #40a9ff;
        }

        .profile-info {
          text-align: center;
        }

        .profile-name {
          color: #ffffff;
          margin: 0 0 8px 0;
          font-size: 20px;
        }

        .profile-email {
          color: #888888;
          font-size: 14px;
          display: block;
          margin-bottom: 12px;
        }

        .profile-status {
          display: flex;
          justify-content: center;
        }

        .account-stats-card {
          text-align: left;
        }

        .account-stats-card .ant-card-body {
          padding: 16px;
        }

        .stats-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .stats-header h5 {
          color: #ffffff;
          margin: 0;
        }

        .stats-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
          padding: 8px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .stats-item:last-child {
          margin-bottom: 0;
          border-bottom: none;
        }

        .stats-label {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .stats-icon {
          color: #1890ff;
          font-size: 16px;
        }

        .stats-value {
          color: #ffffff;
          font-weight: 500;
        }

        .security-level {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .security-level .ant-progress {
          width: 80px;
        }

        .security-text {
          color: #52c41a;
          font-weight: 600;
          font-size: 12px;
        }

        .form-card .card-header {
          display: flex;
          align-items: center;
          margin-bottom: 16px;
        }

        .card-icon {
          font-size: 20px;
          color: #1890ff;
          margin-right: 12px;
        }

        .card-header h5 {
          color: #ffffff;
          margin: 0;
        }

        :global(.settings-container .ant-input),
        :global(.settings-container .ant-select-selector),
        :global(.settings-container .ant-input-affix-wrapper) {
          background: #1a1a1a;
          border: 1px solid #333333;
          color: #ffffff;
        }

        :global(.settings-container .ant-input:focus),
        :global(.settings-container .ant-select-focused .ant-select-selector),
        :global(.settings-container .ant-input-affix-wrapper:focus) {
          border-color: #1890ff;
          box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
        }

        :global(.settings-container .ant-input::placeholder) {
          color: #666666;
        }

        :global(.settings-container .ant-form-item-label > label) {
          color: #ffffff;
          font-weight: 500;
        }

        :global(.settings-container .ant-btn-primary) {
          background: #1890ff;
          border: none;
          border-radius: 6px;
          font-weight: 500;
          height: 36px;
          padding: 0 20px;
        }

        :global(.settings-container .ant-btn-primary:hover) {
          background: #40a9ff;
        }

        .notification-section {
          margin-bottom: 24px;
        }

        .notification-section h5 {
          color: #ffffff;
          margin-bottom: 16px;
        }

        .notification-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 0;
          border-bottom: 1px solid #262626;
        }

        .notification-item:last-child {
          border-bottom: none;
        }

        .notification-info {
          flex: 1;
        }

        .notification-info .ant-typography {
          display: block;
        }

        .notification-info .ant-typography:first-child {
          color: #ffffff;
          margin-bottom: 4px;
        }

        .notification-info .ant-typography-caption {
          color: #888888;
          font-size: 13px;
        }

        :global(.settings-container .ant-switch-checked) {
          background-color: #1890ff;
        }

        .security-tips-card {
          background: #151515;
          border: 1px solid #262626;
        }

        .security-tips-card h5 {
          color: #ffffff;
          margin-bottom: 20px;
        }

        .security-tips {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .tip-item {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .tip-icon {
          font-size: 16px;
        }

        .tip-icon.success {
          color: #52c41a;
        }

        .tip-icon.warning {
          color: #faad14;
        }

        .tip-item .ant-typography {
          color: #ffffff;
          font-size: 14px;
        }

        :global(.settings-container .ant-typography) {
          color: #ffffff;
        }

        :global(.settings-container .ant-typography.ant-typography-secondary) {
          color: #888888;
        }

        :global(.settings-container .ant-typography.ant-typography-caption) {
          color: #666666;
        }

        :global(.settings-container .ant-divider) {
          border-color: #262626;
        }

        :global(.settings-container .ant-badge-status-text) {
          color: #888888;
        }

        :global(.settings-container .ant-progress-text) {
          color: #ffffff;
        }

        :global(.settings-container .ant-select-arrow) {
          color: #888888;
        }

        :global(.settings-container .ant-select-dropdown) {
          background: #1a1a1a;
          border: 1px solid #333333;
        }

        :global(.settings-container .ant-select-item) {
          color: #ffffff;
        }

        :global(.settings-container .ant-select-item:hover) {
          background: #262626;
        }

        :global(.settings-container .ant-select-item-option-selected) {
          color: #ffffff;
        }

        @media (max-width: 768px) {
          .settings-layout {
            flex-direction: column;
          }

          .settings-sidebar {
            width: 100%;
            border-right: none;
            border-bottom: 1px solid #1f1f1f;
            padding: 12px 0;
          }

          .sidebar-menu {
            display: flex;
            overflow-x: auto;
            padding: 0 12px;
          }

          .menu-item {
            min-width: 160px;
            margin-right: 6px;
            margin-bottom: 0;
            padding: 10px;
          }

          .settings-content {
            padding: 12px;
          }

          .section-title {
            font-size: 22px;
          }

          .content-section {
            max-width: 100%;
            padding: 0 10px;
          }
          
          .app-management-container {
            max-width: 100%;
            padding: 0 10px;
          }
        }
      `}</style>
    </div>
  );
} 