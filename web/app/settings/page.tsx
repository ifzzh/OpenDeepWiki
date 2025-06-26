'use client'

import { Card, Tabs, Form, Input, Button, Avatar, Space, message, Divider, Switch, Select, Upload, Typography } from 'antd';
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
  ArrowLeftOutlined
} from '@ant-design/icons';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { TabsProps, UploadProps } from 'antd';
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
import styles from './settings.module.css';

const { Title, Text } = Typography;

export default function SettingsPage() {
  const router = useRouter();
  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [preferencesForm] = Form.useForm();

  const [activeTab, setActiveTab] = useState('profile');
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

          // 设置表单初始值
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
          // 如果获取用户信息失败，尝试从本地存储获取
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

        // 更新本地状态和存储的用户信息
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

      // 先验证当前密码
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

  // 处理偏好设置更新
  const handlePreferencesUpdate = async (values: any) => {
    try {
      setLoading(true);

      // 这里可以调用API保存用户偏好设置
      // 暂时只在本地存储
      localStorage.setItem('userPreferences', JSON.stringify(values));
      message.success('偏好设置已保存');
    } catch (error) {
      console.error('保存偏好设置失败:', error);
      message.error('保存失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 头像上传配置
  const uploadProps: UploadProps = {
    name: 'avatar',
    listType: 'picture-card',
    className: styles.avatarUploader,
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

          // 自动更新用户资料中的头像
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

      return false; // 阻止自动上传
    },
  };

  const uploadButton = (
    <div>
      <UploadOutlined />
      <div style={{ marginTop: 8 }}>上传头像</div>
    </div>
  );

  // 格式化日期
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN');
  };

  // 返回首页
  const handleGoHome = () => {
    router.push('/');
  };

  const tabItems: TabsProps['items'] = [
    {
      key: 'profile',
      label: (
        <span>
          <UserOutlined />
          个人信息
        </span>
      ),
      children: (
        <div className={styles.tabContent}>
          <div className={styles.profileSection}>
            <div className={styles.avatarContainer}>
              <Avatar
                size={64}
                src={avatarUrl}
                icon={<UserOutlined />}
                className={styles.avatar}
              />
              <Upload {...uploadProps}>
                <Button size="small" icon={<UploadOutlined />}>
                  更换头像
                </Button>
              </Upload>
            </div>
            
            <div className={styles.userInfo}>
              <Title level={4} className={styles.userName}>{userInfo?.name}</Title>
              <Text type="secondary" className={styles.userEmail}>
                {userInfo?.email}
              </Text>
            </div>
          </div>

          <Form
            form={profileForm}
            layout="vertical"
            onFinish={handleProfileUpdate}
            className={styles.form}
          >
            <Form.Item
              name="name"
              label="用户名"
              rules={[
                { required: true, message: '请输入用户名' },
                { min: 2, message: '用户名至少2个字符' }
              ]}
            >
              <Input placeholder="请输入用户名" />
            </Form.Item>

            <Form.Item
              name="email"
              label="邮箱地址"
              rules={[
                { required: true, message: '请输入邮箱地址' },
                { type: 'email', message: '请输入有效的邮箱地址' }
              ]}
            >
              <Input placeholder="请输入邮箱地址" />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                className={styles.submitButton}
              >
                保存更改
              </Button>
            </Form.Item>
          </Form>
        </div>
      )
    },
    {
      key: 'password',
      label: (
        <span>
          <LockOutlined />
          修改密码
        </span>
      ),
      children: (
        <div className={styles.tabContent}>
          <div className={styles.sectionHeader}>
            <Title level={4}>修改密码</Title>
            <Text type="secondary">为了账户安全，请定期更换密码</Text>
          </div>

          <Form
            form={passwordForm}
            layout="vertical"
            onFinish={handlePasswordChange}
            className={styles.form}
          >
            <Form.Item
              name="currentPassword"
              label="当前密码"
              rules={[{ required: true, message: '请输入当前密码' }]}
            >
              <Input.Password placeholder="请输入当前密码" />
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
              <Input.Password placeholder="请输入新密码" />
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
              <Input.Password placeholder="请再次输入新密码" />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                className={styles.submitButton}
              >
                修改密码
              </Button>
            </Form.Item>
          </Form>
        </div>
      )
    },
    {
      key: 'preferences',
      label: (
        <span>
          <SettingOutlined />
          偏好设置
        </span>
      ),
      children: (
        <div className={styles.tabContent}>
          <div className={styles.sectionHeader}>
            <Title level={4}>偏好设置</Title>
          </div>

          <Form
            form={preferencesForm}
            layout="vertical"
            onFinish={handlePreferencesUpdate}
            className={styles.form}
          >
            <Form.Item
              name="language"
              label="界面语言"
              rules={[{ required: true, message: '请选择界面语言' }]}
            >
              <Select
                options={[
                  { value: 'zh-CN', label: '简体中文' },
                  { value: 'zh-TW', label: '繁体中文' },
                  { value: 'en-US', label: 'English' },
                  { value: 'ja', label: '日本語' },
                  { value: 'ko', label: '한국어' },
                ]}
              />
            </Form.Item>

            <Form.Item
              name="timezone"
              label="时区设置"
              rules={[{ required: true, message: '请选择时区' }]}
            >
              <Select
                options={[
                  { value: 'Asia/Shanghai', label: '(GMT+8:00) 北京，上海' },
                  { value: 'Asia/Tokyo', label: '(GMT+9:00) 东京' },
                  { value: 'America/New_York', label: '(GMT-5:00) 纽约' },
                  { value: 'Europe/London', label: '(GMT+0:00) 伦敦' },
                  { value: 'Europe/Paris', label: '(GMT+1:00) 巴黎' },
                ]}
              />
            </Form.Item>

            <div className={styles.notificationSection}>
              <Text strong>通知设置</Text>
              
              <Form.Item
                name="emailNotifications"
                label="邮件通知"
                valuePropName="checked"
                className={styles.switchItem}
              >
                <Switch />
              </Form.Item>

              <Form.Item
                name="systemNotifications"
                label="系统通知"
                valuePropName="checked"
                className={styles.switchItem}
              >
                <Switch />
              </Form.Item>
            </div>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                className={styles.submitButton}
              >
                保存设置
              </Button>
            </Form.Item>
          </Form>
        </div>
      )
    }
  ];

  return (
    <div className={styles.settingsContainer}>
      <div className={styles.settingsWrapper}>
        <div className={styles.settingsHeader}>
          <div className={styles.headerTop}>
            <Button 
              type="text" 
              icon={<ArrowLeftOutlined />}
              onClick={handleGoHome}
              className={styles.backButton}
            >
              返回首页
            </Button>
          </div>
          <Title level={2} className={styles.pageTitle}>账户设置</Title>
          <Text type="secondary">管理您的账户信息和偏好设置</Text>
        </div>
        
        <div className={styles.settingsContent}>
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={tabItems}
            className={styles.settingsTabs}
            size="large"
          />
        </div>
      </div>
    </div>
  );
} 