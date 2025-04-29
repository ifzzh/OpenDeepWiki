import { Card, Tag, Typography, Space, Badge, Tooltip, Avatar } from 'antd';
import { Repository } from '../types';
import Link from 'next/link';
import { 
  FileOutlined, 
  ClockCircleOutlined, 
  CodeOutlined, 
  GithubOutlined,
  RobotOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';

const { Text, Title, Paragraph } = Typography;

interface RepositoryCardProps {
  repository: Repository;
}

const RepositoryCard: React.FC<RepositoryCardProps> = ({ repository }) => {
  // 获取仓库所有者和名称
  const getRepoInfo = (address: string) => {
    try {
      if (address.includes('github.com')) {
        const parts = address.replace('https://github.com/', '').split('/');
        return {
          owner: parts[0],
          name: parts[1].split('/')[0].replace('.git', '')
        }
      }

      // 解析 url
      const url = new URL(address);
      const owner = url.pathname.split('/')[1];
      const name = url.pathname.split('/')[2];
      return {
        owner: owner,
        name: name.split('.')[0]
      }
      
    } catch (e) {
      // 如果解析失败，返回默认值
    }
    return { owner: '', name: repository.name };
  };

  const repoInfo = getRepoInfo(repository.address);
  
  // 根据地址获取头像
  const getAvatarUrl = () => {
    if (repository.address.includes('github.com')) {
      const owner = repoInfo.owner;
      if (owner) {
        return `https://github.com/${owner}.png`;
      }
    }
    return null;
  };

  const avatarUrl = getAvatarUrl();
  
  // Handle status display
  const getStatusTag = (status: number) => {
    switch(status) {
      case 0:
        return <Tag color="orange">待处理</Tag>;
      case 1:
        return <Tag color="blue">处理中</Tag>;
      case 2: 
        return <Tag color="green">已完成</Tag>;
      case 3:
        return <Tag color="default">已取消</Tag>;
      case 4:
        return <Tag color="purple">未授权</Tag>;
      case 99:
        return <Tag color="red">已失败</Tag>;
      default:
        return <Tag color="default">未知状态</Tag>;
    }
  };

  return (
    <Link href={`/${repoInfo.owner}/${repoInfo.name}`}>
      <Card 
        hoverable
        className="repository-card"
        title={
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {avatarUrl ? (
              <Avatar 
                src={avatarUrl} 
                size="small" 
                style={{ marginRight: 8 }} 
              />
            ) : (
              <FileOutlined style={{ 
                marginRight: 8, 
                color: 'var(--ant-color-primary)' 
              }} />
            )}
            <Title level={4} ellipsis={{ tooltip: repository.name }} style={{ margin: 0 }}>
              {repository.name}
            </Title>
          </div>
        }
        extra={
          <Space>
            {getStatusTag(repository.status)}
            <Tooltip title={`${repository.type.toUpperCase()} 仓库`}>
              <Tag color={repository.type === 'git' ? 'blue' : 'green'}>
                {repository.type === 'git' ? <GithubOutlined /> : <FileOutlined />}
                {' '}{repository.type.toUpperCase()}
              </Tag>
            </Tooltip>
          </Space>
        }
        actions={[
          <Tooltip title="查看仓库详情" key="view">
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <FileOutlined /> 详情
            </div>
          </Tooltip>,
          <Tooltip title="浏览文档" key="docs">
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <CodeOutlined /> 文档
            </div>
          </Tooltip>
        ]}
      >
        <div style={{ marginBottom: 12 }}>
          <Text 
            ellipsis={{ tooltip: repository.address }} 
            style={{ display: 'block', fontSize: '13px', color: '#666' }}
          >
            {repository.address}
          </Text>
        </div>
        
        {repository.description && (
          <div style={{ marginBottom: 12 }}>
            <Text 
              type="secondary"
              ellipsis={{ tooltip: repository.description }}
              style={{ fontSize: '13px', display: 'flex', alignItems: 'flex-start', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis' }}
            >
              <InfoCircleOutlined style={{ marginRight: 4, marginTop: 3 }} />
              {repository.description}
            </Text>
          </div>
        )}
        
        <div style={{ fontSize: '13px', color: '#666', marginBottom: 16, minHeight: '40px', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          <Tooltip title={repository.prompt}>
            {repository.prompt}
          </Tooltip>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Tooltip title="使用的AI模型">
            <Text type="secondary" style={{ display: 'flex', alignItems: 'center', fontSize: '12px' }}>
              <RobotOutlined style={{ marginRight: 4 }} />
              {repository.model || '默认模型'}
            </Text>
          </Tooltip>
          
          <Tooltip title={`创建时间：${new Date(repository.createdAt).toLocaleString('zh-CN')}`}>
            <Text type="secondary" style={{ display: 'flex', alignItems: 'center', fontSize: '12px' }}>
              <ClockCircleOutlined style={{ marginRight: 4 }} />
              {new Date(repository.createdAt).toLocaleDateString('zh-CN')}
            </Text>
          </Tooltip>
        </div>
      </Card>
    </Link>
  );
};

export default RepositoryCard; 