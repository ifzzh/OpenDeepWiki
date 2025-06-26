'use client'

import React, { useState, useEffect } from 'react';
import { Card, Skeleton, Typography, Button, Space, Result, Avatar, Tag, Statistic } from 'antd';
import { ArrowLeftOutlined, FileExclamationOutlined, ReloadOutlined, GithubOutlined, StarOutlined, ForkOutlined, CalendarOutlined, BranchesOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { getLastWarehouse } from '../../services/warehouseService';

const { Title, Text, Paragraph } = Typography;

interface LoadingErrorStateProps {
  loading: boolean;
  error: string | null;
  owner: string;
  name: string;
  token: any;
}

interface GitHubRepoInfo {
  name: string;
  description: string;
  stars: number;
  forks: number;
  language: string;
  updated_at: string;
  html_url: string;
  owner: {
    login: string;
    avatar_url: string;
    html_url: string;
  };
}

// 仓库信息展示组件
const RepositoryInfoState = ({ owner, name, token }) => {
  const [repoInfo, setRepoInfo] = useState<GitHubRepoInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchRepoInfo = async () => {
      try {
        // 尝试直接从GitHub API获取仓库信息
        const response = await fetch(`https://api.github.com/repos/${owner}/${name}`);
        
        if (response.ok) {
          const data = await response.json();
          setRepoInfo({
            name: data.name,
            description: data.description || '暂无描述',
            stars: data.stargazers_count,
            forks: data.forks_count,
            language: data.language,
            updated_at: data.updated_at,
            html_url: data.html_url,
            owner: {
              login: data.owner.login,
              avatar_url: data.owner.avatar_url,
              html_url: data.owner.html_url
            }
          });
        }
      } catch (err) {
        setError('获取仓库信息时出错');
      } finally {
        setLoading(false);
      }
    };

    fetchRepoInfo();
  }, [owner, name]);

  if (loading) {
    return <Skeleton active avatar paragraph={{ rows: 4 }} />;
  }

  if (error || !repoInfo) {
    return (
      <Space direction="vertical" size="middle" style={{ width: '100%', textAlign: 'center' }}>
        <Text type="secondary" style={{ fontSize: 16 }}>仓库地址: https://github.com/{owner}/{name}</Text>
        <Button 
          type="primary" 
          icon={<GithubOutlined />}
          href={`https://github.com/${owner}/${name}`}
          target="_blank"
        >
          访问GitHub仓库
        </Button>
        <Button 
          onClick={() => window.location.reload()}
          icon={<ReloadOutlined />}
        >
          重新加载
        </Button>
      </Space>
    );
  }

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Space size="middle" align="start">
        <Avatar 
          size={64} 
          src={repoInfo.owner.avatar_url || undefined}
          icon={!repoInfo.owner.avatar_url && <GithubOutlined />}
        />
        <Space direction="vertical" size="small" style={{ maxWidth: '100%' }}>
          <Title level={3} style={{ margin: 0, color: token.colorTextHeading }}>
            <a 
              href={repoInfo.html_url} 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ color: token.colorPrimary }}
            >
              {repoInfo.owner.login}/{repoInfo.name}
            </a>
          </Title>
          <Paragraph style={{ margin: 0, color: token.colorTextSecondary }}>
            {repoInfo.description}
          </Paragraph>
          <Space size="middle" wrap>
            {repoInfo.language && (
              <Tag color={token.colorPrimary}>
                {repoInfo.language}
              </Tag>
            )}
            <Space>
              <StarOutlined style={{ color: token.colorWarning }} />
              <Text>{repoInfo.stars}</Text>
            </Space>
            <Space>
              <ForkOutlined />
              <Text>{repoInfo.forks}</Text>
            </Space>
            <Space>
              <CalendarOutlined />
              <Text>{new Date(repoInfo.updated_at).toLocaleDateString()}</Text>
            </Space>
          </Space>
        </Space>
      </Space>
      
      <Space>
        <Button 
          type="primary" 
          icon={<GithubOutlined />}
          href={repoInfo.html_url}
          target="_blank"
        >
          访问GitHub仓库
        </Button>
        <Button 
          onClick={() => window.location.reload()}
          icon={<ReloadOutlined />}
        >
          重新加载
        </Button>
      </Space>
    </Space>
  );
};

const LoadingErrorState: React.FC<LoadingErrorStateProps> = ({
  loading,
  error,
  owner,
  name,
  token
}) => {
  // 加载状态显示骨架屏
  if (loading) {
    return (
      <Card style={{ 
        borderRadius: token.borderRadiusLG,
        boxShadow: token.boxShadowTertiary
      }}>
        <Skeleton active paragraph={{ rows: 10 }} />
      </Card>
    );
  }

  // 根据错误类型显示不同的错误信息
  if (error) {
    if (error.includes('不存在') || error.includes('路径')) {
      return (
        <Card 
          style={{
            borderRadius: token.borderRadiusLG,
            overflow: 'hidden',
            boxShadow: token.boxShadowTertiary,
            padding: token.paddingLG
          }}
        >
          <RepositoryInfoState 
            owner={owner}
            name={name}
            token={token}
          />
        </Card>
      );
    }

    return (
      <Card 
        style={{ 
          borderRadius: token.borderRadiusLG,
          overflow: 'hidden',
          boxShadow: token.boxShadowTertiary
        }}
      >
        <Result
          status="warning"
          icon={<FileExclamationOutlined style={{ color: token.colorWarning }} />}
          title={<Typography.Title level={3} style={{ color: token.colorTextHeading }}>无法加载文档内容</Typography.Title>}
          subTitle={<Text type="secondary">{error}</Text>}
          extra={[
            <Link key="back" href={`/${owner}/${name}`}>
              <Button 
                type="primary" 
                icon={<ArrowLeftOutlined />}
                style={{ marginRight: token.marginSM }}
              >
                返回仓库概览
              </Button>
            </Link>,
            <Button 
              key="retry" 
              icon={<ReloadOutlined />}
              onClick={() => window.location.reload()}
            >
              重新加载
            </Button>
          ]}
        />
      </Card>
    );
  }

  return null;
};

export default LoadingErrorState; 