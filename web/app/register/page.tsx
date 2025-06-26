'use client'

import { Card, Form, Input, Button, Checkbox, Divider, message } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, GithubOutlined, GoogleOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from '../login/auth.module.css';
import { register, getSupportedThirdPartyLogins } from '../services/authService';
import { useState, useEffect } from 'react';
import { API_URL } from '../services/api';

interface ThirdPartyLoginProvider {
  name: string;
  icon: string;
  clientId: string;
  redirectUri: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [thirdPartyProviders, setThirdPartyProviders] = useState<ThirdPartyLoginProvider[]>([]);

  // 获取支持的第三方登录方式
  useEffect(() => {
    const fetchThirdPartyProviders = async () => {
      try {
        const response = await getSupportedThirdPartyLogins();
        if (response.code === 200 && response.data) {
          setThirdPartyProviders(response.data);
        }
      } catch (error) {
        console.error('获取第三方登录方式失败:', error);
      }
    };

    fetchThirdPartyProviders();
  }, []);

  // 处理注册
  const onFinish = async (values: any) => {
    try {
      setLoading(true);
      
      // 调用注册API
      const {data} = await register(values.username, values.email, values.password);
      console.log('注册响应:', data);
      if (data.success) {
        // 登录成功
        // 保存登录状态
        localStorage.setItem('userToken', data.token);
        localStorage.setItem('refreshToken', data.refreshToken);

        // 保存用户信息
        if (data.user) {
          localStorage.setItem('userInfo', JSON.stringify(data.user));
        }

        // 延迟跳转，让用户看到成功消息
        setTimeout(() => {
          // 检查是否有上一个页面的路径（比如从管理页面重定向来的）
          const redirectPath = localStorage.getItem('redirectPath') || '/admin';
          localStorage.removeItem('redirectPath'); // 清除重定向路径
          router.push(redirectPath);
        }, 1000);
      } else {
        // 登录失败
        message.error(data.errorMessage || '用户名或密码错误');
      }
    } catch (error) {
      console.error('注册错误:', error);
      message.error('注册过程中发生错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 处理第三方登录
  const handleThirdPartyLogin = (providerName: string) => {
    // 记录登录类型
    localStorage.setItem('oauthProvider', providerName.toLowerCase());
    
    // 根据提供商名称构建OAuth URL
    if (providerName.toLowerCase() === 'github') {
      window.location.href = `${API_URL}/api/Auth/GitHubOAuth`;
    } else if (providerName.toLowerCase() === 'google') {
      window.location.href = `${API_URL}/api/Auth/GoogleOAuth`;
    } else {
      // 通用OAuth处理
      window.location.href = `${API_URL}/api/Auth/${providerName}OAuth`;
    }
  };

  // 获取第三方登录按钮图标
  const getProviderIcon = (providerName: string) => {
    switch (providerName.toLowerCase()) {
      case 'github':
        return <GithubOutlined />;
      case 'google':
        return <GoogleOutlined />;
      default:
        return null;
    }
  };

  // GitHub OAuth处理（保持向后兼容）
  const handleGithubLogin = () => {
    handleThirdPartyLogin('github');
  };

  // Google OAuth处理（保持向后兼容）
  const handleGoogleLogin = () => {
    handleThirdPartyLogin('google');
  };

  return (
    <div className={styles.authContainer}>
      <div className={styles.authWrapper}>
        <Card className={styles.authCard}>
          <div className={styles.authHeader}>
            <h1 className={styles.authTitle}>注册 OpenDeepWiki</h1>
            <p className={styles.authSubtitle}>创建一个新的账户</p>
          </div>
          
          <Form
            name="register_form"
            onFinish={onFinish}
            layout="vertical"
            requiredMark={false}
            className={styles.authForm}
          >
            <Form.Item
              name="username"
              rules={[
                { required: true, message: '请输入用户名' },
                { min: 4, message: '用户名至少4个字符' }
              ]}
            >
              <Input 
                prefix={<UserOutlined className={styles.siteFormItemIcon} />} 
                placeholder="用户名"
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="email"
              rules={[
                { required: true, message: '请输入邮箱' },
                { type: 'email', message: '请输入有效的邮箱地址' }
              ]}
            >
              <Input 
                prefix={<MailOutlined className={styles.siteFormItemIcon} />} 
                placeholder="邮箱"
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[
                { required: true, message: '请输入密码' },
                { min: 8, message: '密码至少8个字符' }
              ]}
            >
              <Input.Password
                prefix={<LockOutlined className={styles.siteFormItemIcon} />}
                placeholder="密码"
                size="large"
              />
            </Form.Item>
            
            <Form.Item
              name="confirmPassword"
              dependencies={['password']}
              rules={[
                { required: true, message: '请确认密码' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('两次输入的密码不一致'));
                  },
                }),
              ]}
            >
              <Input.Password
                prefix={<LockOutlined className={styles.siteFormItemIcon} />}
                placeholder="确认密码"
                size="large"
              />
            </Form.Item>
            
            <Form.Item
              name="agreement"
              valuePropName="checked"
              rules={[
                { 
                  validator: (_, value) =>
                    value ? Promise.resolve() : Promise.reject(new Error('请阅读并同意用户协议和隐私政策')),
                },
              ]}
              className={styles.agreement}
            >
              <Checkbox>
                <span className={styles.agreementText}>
                  我已阅读并同意 <Link href="/terms">用户协议</Link> 和 <Link href="/privacy">隐私政策</Link>
                </span>
              </Checkbox>
            </Form.Item>

            <Form.Item>
              <Button 
                type="primary" 
                htmlType="submit" 
                className={styles.loginButton}
                size="large"
                block
                loading={loading}
              >
                注册
              </Button>
            </Form.Item>
            
            <div className={styles.registerLink}>
              已有账户? <Link href="/login">立即登录</Link>
            </div>
            
            {thirdPartyProviders.length > 0 && (
              <>
                <Divider plain>其他注册方式</Divider>
                
                <div className={styles.socialLogin}>
                  {thirdPartyProviders.map((provider) => (
                    <Button 
                      key={provider.name}
                      icon={getProviderIcon(provider.name)}
                      size="large"
                      className={styles.socialButton}
                      onClick={() => handleThirdPartyLogin(provider.name)}
                    >
                      {provider.name}
                    </Button>
                  ))}
                </div>
              </>
            )}
          </Form>
        </Card>
      </div>
    </div>
  );
} 