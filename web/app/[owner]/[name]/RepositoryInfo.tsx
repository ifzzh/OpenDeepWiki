'use client'

import { useEffect, useState } from 'react';
import { Row, Col, Typography, Tag, Button, Skeleton, Avatar, theme, Divider, message } from 'antd';
import { StarOutlined, ForkOutlined, CalendarOutlined, ExclamationCircleOutlined, EyeOutlined, IssuesCloseOutlined, PlusOutlined } from '@ant-design/icons';
import Link from 'next/link';

interface GitHubRepoInfo {
  html_url: string;
  description: string;
  stargazers_count: number;
  forks_count: number;
  language: string;
  updated_at: string;
  owner: {
    avatar_url: string;
    html_url: string;
    login: string;
  };
  license?: {
    name: string;
  };
  default_branch: string;
  topics: string[];
  open_issues_count: number;
  visibility: string;
}

import RepositoryForm from '../../components/RepositoryForm';
import { submitWarehouse, getGitHubReadme } from '../../services';
import { RepositoryFormValues } from '../../types';

const { Title, Paragraph } = Typography;
const { useToken } = theme;

interface RepositoryInfoProps {
  owner: string;
  name: string; 
  branch?: string;
}

export default function RepositoryInfo({ owner, name, branch }: RepositoryInfoProps) {
  const { token } = useToken();
  const [repoInfo, setRepoInfo] = useState<GitHubRepoInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [readme, setReadme] = useState<string | null>(null);
  const [formVisible, setFormVisible] = useState(false);
  const [currentBranch, setCurrentBranch] = useState<string | undefined>(branch);

  useEffect(() => {
    async function fetchGitHubRepo() {
      try {
        setLoading(true);

        const response = await fetch(`https://api.github.com/repos/${owner}/${name}`);

        if (!response.ok) {
          throw new Error('GitHub仓库信息获取失败');
        }

        const data = await response.json();
        setRepoInfo(data);
        
        // 如果没有指定分支，使用默认分支
        if (!currentBranch) {
          setCurrentBranch(data.default_branch);
        }

        // 获取README内容
        try {
          // 使用导入的getGitHubReadme函数，传递当前分支
          const readmeContent = await getGitHubReadme(owner, name, currentBranch || data.default_branch);
          if (readmeContent) {
            setReadme(readmeContent);
          }
        } catch (readmeErr) {
          console.error('获取README失败:', readmeErr);
          // README获取失败不影响主流程
        }

        setError(null);
      } catch (err) {
        console.error('获取GitHub仓库信息出错:', err);
        setError('无法获取GitHub仓库信息');
      } finally {
        setLoading(false);
      }
    }

    if (owner && name) {
      fetchGitHubRepo();
    }
  }, [owner, name, currentBranch]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const handleAddRepository = async (values: RepositoryFormValues) => {
    try {
      const response = await submitWarehouse(values);
      if (response.success) {
        message.success('仓库添加成功');
        // 刷新页面以获取最新数据
        window.location.reload();
      } else {
        message.error('添加仓库失败: ' + (response.error || '未知错误'));
      }
    } catch (error) {
      console.error('添加仓库出错:', error);
      message.error('添加仓库出错，请稍后重试');
    }
    setFormVisible(false);
  };

  return (
    <div style={{ minHeight: '100vh' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {loading ? (
          <Skeleton active avatar paragraph={{ rows: 4 }} />
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <ExclamationCircleOutlined style={{ fontSize: '48px', color: token.colorError, marginBottom: '16px' }} />
            <Title level={4} style={{ marginBottom: '16px' }}>
              仓库未索引 如果已经添加成功可能需要等待一段时间。
            </Title>
            <Paragraph type="secondary">
              {`${owner}/${name} ${error}`}
            </Paragraph>
            <Button type="primary" href={`https://github.com/${owner}/${name}`} target="_blank">
              前往GitHub查看
            </Button>
          </div>
        ) : repoInfo && (
          <>
            <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap' }}>
              <Avatar
                src={repoInfo.owner.avatar_url}
                alt={owner}
                size={64}
                style={{ marginRight: '16px' }}
              />
              <div style={{ flex: 1, minWidth: '280px' }}>
                <Title level={3} style={{ margin: 0 }}>
                  <Link
                    href={repoInfo.html_url}
                    target="_blank"
                    style={{ color: token.colorText }}
                  >
                    {owner}/{name}{currentBranch && currentBranch !== repoInfo.default_branch ? ` (${currentBranch})` : ''}
                  </Link>
                </Title>
                {repoInfo.description && (
                  <Paragraph style={{ margin: '8px 0 0', color: token.colorTextSecondary }}>
                    {repoInfo.description}
                  </Paragraph>
                )}
              </div>
              <div style={{ display: 'flex', marginTop: { xs: '16px', sm: '16px', md: '0' }[token.screenSM], flexWrap: 'wrap' }}>
                <Button
                  type="primary"
                  href={`https://github.com/${owner}/${name}${currentBranch && currentBranch !== repoInfo.default_branch ? `/tree/${currentBranch}` : ''}`}
                  target="_blank"
                  style={{ marginRight: '12px', marginBottom: '8px' }}
                  icon={<EyeOutlined />}
                >
                  在GitHub上查看
                </Button>
                <Button
                  type="default"
                  onClick={() => setFormVisible(true)}
                  style={{ marginBottom: '8px' }}
                  icon={<PlusOutlined />}
                >
                  添加仓库
                </Button>
              </div>
            </div>

            <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
              <Col>
                <Tag color={token.colorPrimary} icon={<StarOutlined />}>
                  {repoInfo.stargazers_count} 星标
                </Tag>
              </Col>
              <Col>
                <Tag color={token.colorSuccess} icon={<ForkOutlined />}>
                  {repoInfo.forks_count} 分支
                </Tag>
              </Col>
              {repoInfo.open_issues_count > 0 && (
                <Col>
                  <Tag color={token.colorWarning} icon={<IssuesCloseOutlined />}>
                    {repoInfo.open_issues_count} 议题
                  </Tag>
                </Col>
              )}
              {repoInfo.language && (
                <Col>
                  <Tag color={token.colorInfo}>
                    {repoInfo.language}
                  </Tag>
                </Col>
              )}
              {repoInfo.license && (
                <Col>
                  <Tag color={token.colorWarning}>
                    {repoInfo.license.name}
                  </Tag>
                </Col>
              )}
              <Col>
                <Tag color={token.colorTextSecondary} icon={<CalendarOutlined />}>
                  更新于 {formatDate(repoInfo.updated_at)}
                </Tag>
              </Col>
              {repoInfo.topics && repoInfo.topics.length > 0 && (
                repoInfo.topics.slice(0, 3).map(topic => (
                  <Col key={topic}>
                    <Tag color={token.colorPrimaryBg}>{topic}</Tag>
                  </Col>
                ))
              )}
            </Row>

            {readme && (
              <>
                <Divider />
                <div
                  className="github-readme"
                  dangerouslySetInnerHTML={{ __html: readme }}
                  style={{
                    overflow: 'auto',
                    padding: '0 8px'
                  }}
                />
                <style jsx global>{`
                    .github-readme {
                      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
                      font-size: 16px;
                      line-height: 1.5;
                      word-wrap: break-word;
                    }
                    .github-readme h1,
                    .github-readme h2,
                    .github-readme h3,
                    .github-readme h4,
                    .github-readme h5,
                    .github-readme h6 {
                      margin-top: 24px;
                      margin-bottom: 16px;
                      font-weight: 600;
                      line-height: 1.25;
                    }
                    .github-readme h1 {
                      font-size: 2em;
                      border-bottom: 1px solid #eaecef;
                      padding-bottom: 0.3em;
                    }
                    .github-readme h2 {
                      font-size: 1.5em;
                      border-bottom: 1px solid #eaecef;
                      padding-bottom: 0.3em;
                    }
                    .github-readme a {
                      color: ${token.colorPrimary};
                      text-decoration: none;
                    }
                    .github-readme a:hover {
                      text-decoration: underline;
                    }
                    .github-readme img {
                      max-width: 100%;
                    }
                    .github-readme pre {
                      background-color: #f6f8fa;
                      border-radius: 6px;
                      padding: 16px;
                      overflow: auto;
                    }
                    .github-readme code {
                      font-family: SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace;
                      font-size: 85%;
                      background-color: rgba(27, 31, 35, 0.05);
                      border-radius: 3px;
                      padding: 0.2em 0.4em;
                    }
                    .github-readme pre code {
                      background-color: transparent;
                      padding: 0;
                    }
                  `}</style>
              </>
            )}

            <RepositoryForm
              open={formVisible}
              onCancel={() => setFormVisible(false)}
              onSubmit={handleAddRepository}
              initialValues={{
                address: `https://github.com/${owner}/${name}`,
                type: 'git',
                branch: currentBranch || repoInfo?.default_branch || 'main',
                prompt: '',
              }}
              disabledFields={['address']}
            />
          </>
        )}
      </div>
    </div>
  );
} 