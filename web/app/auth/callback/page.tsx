'use client'

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, Spin, message, Result, Button } from 'antd';
import { LoadingOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { githubLogin, googleLogin } from '../../services/authService';
import styles from '../../login/auth.module.css';

function OAuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        // 获取URL参数
        const code = searchParams.get('code');
        const error = searchParams.get('error');
        const state = searchParams.get('state');
        const idToken = searchParams.get('id_token'); // Google可能返回id_token
        const accessToken = searchParams.get('access_token'); // Google也可能返回access_token

        // 检查是否有错误
        if (error) {
          throw new Error(`OAuth授权失败: ${error}`);
        }

        // 获取之前保存的登录类型 - 添加客户端检查
        const oauthProvider = typeof window !== 'undefined' ? localStorage.getItem('oauthProvider') : null;
        
        if (!oauthProvider) {
          throw new Error('未找到OAuth提供商信息，请重新登录');
        }

        // 根据登录类型调用不同的API
        if (oauthProvider === 'github') {
          if (!code) {
            throw new Error('GitHub授权码缺失');
          }
          const {data
          } = await githubLogin(code) as any;

          const {
            errorMessage,
            refreshToken,
            success,
            token,
            user
          } = data;
          // 登录成功 - 添加客户端检查
          if (typeof window !== 'undefined') {
            localStorage.setItem('userToken', token);
            localStorage.setItem('refreshToken', refreshToken);
            
            if (user) {
              localStorage.setItem('userInfo', JSON.stringify(user));
            }

            // 清除OAuth提供商信息
            localStorage.removeItem('oauthProvider');
          }

          setStatus('success');
          message.success('登录成功！');

          // 延迟跳转
          setTimeout(() => {
            if (typeof window !== 'undefined') {
              const redirectPath = localStorage.getItem('redirectPath') || '/admin';
              localStorage.removeItem('redirectPath');
              router.push(redirectPath);
            }
          }, 1500);

        } 

      } catch (error) {
        console.error('OAuth回调处理错误:', error);
        setStatus('error');
        setErrorMessage(error instanceof Error ? error.message : '未知错误');
        message.error('登录失败');
      } finally {
        setLoading(false);
      }
    };

    handleOAuthCallback();
  }, [searchParams, router]);

  const handleRetry = () => {
    // 清除OAuth提供商信息并返回登录页 - 添加客户端检查
    if (typeof window !== 'undefined') {
      localStorage.removeItem('oauthProvider');
    }
    router.push('/login');
  };

  if (status === 'loading') {
    return (
      <div className={styles.authContainer}>
        <div className={styles.authWrapper}>
          <Card className={styles.authCard}>
            <div className={styles.authHeader}>
              <Spin 
                indicator={<LoadingOutlined style={{ fontSize: 48, color: '#1890ff' }} spin />} 
                size="large" 
              />
              <h2 style={{ marginTop: 24, textAlign: 'center' }}>正在处理登录...</h2>
              <p style={{ textAlign: 'center', color: '#666' }}>
                请稍候，我们正在验证您的身份
              </p>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className={styles.authContainer}>
        <div className={styles.authWrapper}>
          <Card className={styles.authCard}>
            <Result
              icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              title="登录成功！"
              subTitle="正在跳转到主页面..."
              extra={
                <Button type="primary" onClick={() => router.push('/admin')}>
                  立即跳转
                </Button>
              }
            />
          </Card>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className={styles.authContainer}>
        <div className={styles.authWrapper}>
          <Card className={styles.authCard}>
            <Result
              icon={<CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
              title="登录失败"
              subTitle={errorMessage}
              extra={[
                <Button type="primary" key="retry" onClick={handleRetry}>
                  重新登录
                </Button>,
                <Button key="home" onClick={() => router.push('/')}>
                  返回首页
                </Button>
              ]}
            />
          </Card>
        </div>
      </div>
    );
  }

  return null;
}

// 加载中的回退组件
function LoadingFallback() {
  return (
    <div className={styles.authContainer}>
      <div className={styles.authWrapper}>
        <Card className={styles.authCard}>
          <div className={styles.authHeader}>
            <Spin 
              indicator={<LoadingOutlined style={{ fontSize: 48, color: '#1890ff' }} spin />} 
              size="large" 
            />
            <h2 style={{ marginTop: 24, textAlign: 'center' }}>正在加载...</h2>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default function OAuthCallbackPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <OAuthCallbackContent />
    </Suspense>
  );
} 