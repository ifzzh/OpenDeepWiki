'use client'

import { Card, Form, Input, Button, Checkbox, Divider, message } from 'antd';
import { UserOutlined, LockOutlined, GithubOutlined, GoogleOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './auth.module.css';
import { login, getSupportedThirdPartyLogins } from '../services/authService';
import { useState, useEffect } from 'react';
import { API_URL } from '../services/api';

interface ThirdPartyLoginProvider {
  name: string;
  icon: string;
  clientId: string;
  redirectUri: string;
}

export default function LoginPage() {
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

  // 处理登录
  const onFinish = async (values: any) => {
    try {
      setLoading(true);

      // 调用登录API
      const { data } = await login(values.username, values.password);
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
      console.error('登录错误:', error);
      message.error('登录过程中发生错误，请重试');
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
      const provider = thirdPartyProviders.find(p => p.name === 'GitHub');
      if (provider) {
        window.location.href = `https://github.com/login/oauth/authorize?client_id=${provider.clientId}&redirect_uri=${window.location.origin}/auth/callback`;
      }
    } else if (providerName.toLowerCase() === 'google') {
      const provider = thirdPartyProviders.find(p => p.name === 'Google');
      if (provider) {
        window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${provider.clientId}&redirect_uri=${window.location.origin}/auth/callback`;
      }
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
            <h1 className={styles.authTitle}>登录 OpenDeepWiki</h1>
            <p className={styles.authSubtitle}>欢迎回来，请登录您的账户</p>
          </div>

          <Form
            name="login_form"
            initialValues={{ remember: true }}
            onFinish={onFinish}
            layout="vertical"
            requiredMark={false}
            className={styles.authForm}
          >
            <Form.Item
              name="username"
              rules={[{ required: true, message: '请输入用户名/邮箱' }]}
            >
              <Input
                prefix={<UserOutlined className={styles.siteFormItemIcon} />}
                placeholder="用户名/邮箱"
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[{ required: true, message: '请输入密码' }]}
            >
              <Input.Password
                prefix={<LockOutlined className={styles.siteFormItemIcon} />}
                placeholder="密码"
                size="large"
              />
            </Form.Item>

            <Form.Item>
              <div className={styles.rememberForgot}>
                <Form.Item name="remember" valuePropName="checked" noStyle>
                  <Checkbox>记住我</Checkbox>
                </Form.Item>

                <Link href="/forgot-password" className={styles.forgotLink}>
                  忘记密码?
                </Link>
              </div>
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
                登录
              </Button>
            </Form.Item>

            <div className={styles.registerLink}>
              还没有账户? <Link href="/register">立即注册</Link>
            </div>

            {thirdPartyProviders.length > 0 && (
              <>
                <Divider plain>其他登录方式</Divider>

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