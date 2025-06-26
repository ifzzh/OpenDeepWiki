import React, { useMemo } from 'react';
import { Repository } from '../types';
import {
  FileOutlined,
  ClockCircleOutlined,
  GithubOutlined,
  StarOutlined,
  ForkOutlined,
} from '@ant-design/icons';
import { Card, Avatar, Typography } from 'antd';
import { useTranslation } from '../i18n/client';
import { Tag } from '@lobehub/ui';

const { Text, Title } = Typography;

interface RepositoryCardProps {
  repository: Repository;
}

const RepositoryCard: React.FC<RepositoryCardProps> = ({ repository }) => {
  const { t, i18n } = useTranslation();
  const currentLocale = i18n.language;

  // 根据地址获取头像
  const getAvatarUrl = () => {
    if (repository?.avatarUrl) {
      return repository.avatarUrl;
    }

    if (repository.address?.includes('github.com')) {
      const owner = repository.organizationName;
      if (owner) {
        return `https://github.com/${owner}.png`;
      }
    } else if (repository.address?.includes('gitee.com')) {
      const owner = repository.organizationName;
      if (owner) {
        return `https://gitee.com/${owner}.png`;
      }
    } else if (repository.address?.includes('gitea.com')) {
      const owner = repository.organizationName;
      if (owner) {
        return `https://gitea.com/${owner}.png`;
      }
    } else if (repository.address?.includes('gitlab.com')) {
      const owner = repository.organizationName;
      if (owner) {
        return `https://gitlab.com/${owner}.png`;
      }
    }
    return null;
  };

  const avatarUrl = useMemo(() => getAvatarUrl(), [repository.address, repository.organizationName]);

  const getStatusNumber = (status: string | number): number => {
    if (typeof status === 'number') return status;
    return parseInt(status, 10) || 0;
  };

  // 获取状态配置
  const getStatusConfig = (status: string | number) => {
    const statusNumber = getStatusNumber(status);

    switch (statusNumber) {
      case 0: return { color: 'orange', text: t('repository.status.pending', '待处理') };
      case 1: return { color: 'blue', text: t('repository.status.processing', '处理中') };
      case 2: return { color: 'green', text: t('repository.status.completed', '已完成') };
      case 3: return { color: 'default', text: t('repository.status.cancelled', '已取消') };
      case 4: return { color: 'purple', text: t('repository.status.unauthorized', '未授权') };
      case 99: return { color: 'red', text: t('repository.status.failed', '已失败') };
      default: return { color: 'default', text: t('repository.status.unknown', '未知状态') };
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const locale = currentLocale === 'zh-CN' ? 'zh-CN' : 'en-US';
    return date.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getRepoIcon = () => {
    if (repository.address?.includes('github.com')) {
      return <GithubOutlined style={{ color: '#6b7280' }} />;
    } else if (repository.address?.includes('gitee.com')) {
      return <span style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '14px' }}>G</span>;
    } else {
      return <FileOutlined style={{ color: '#6b7280' }} />;
    }
  };

  const formatNumber = (num: number) => {
    if (num > 999) {
      return `${(num / 1000).toFixed(1)}k`;
    }
    return num.toString();
  };

  const statusConfig = getStatusConfig(repository.status);

  const handleCardClick = () => {
    window.location.href = `/${repository.organizationName}/${repository.name}`;
  };

  const cardStyles = {
    card: {
      height: '240px',
      cursor: 'pointer',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      backgroundColor: '#ffffff',
      transition: 'box-shadow 0.2s ease',
    } as React.CSSProperties,
    cardHover: {
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
    } as React.CSSProperties,
    header: {
      padding: '16px',
      backgroundColor: '#fafafa',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '12px',
    } as React.CSSProperties,
    headerContent: {
      flex: 1,
      minWidth: 0,
    } as React.CSSProperties,
    titleRow: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '8px',
    } as React.CSSProperties,
    title: {
      margin: 0,
      color: '#1f2937',
      fontSize: '16px',
      fontWeight: 600,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap' as const,
    } as React.CSSProperties,
    tagsRow: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    } as React.CSSProperties,
    body: {
      padding: '16px',
      height: '100px',
      display: 'flex',
      alignItems: 'flex-start',
    } as React.CSSProperties,
    description: {
      color: '#6b7280',
      fontSize: '14px',
      lineHeight: '1.5',
      display: '-webkit-box',
      WebkitLineClamp: 3,
      WebkitBoxOrient: 'vertical' as const,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    } as React.CSSProperties,
    footer: {
      padding: '12px 16px',
      backgroundColor: '#fafafa',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    } as React.CSSProperties,
    footerLeft: {
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      fontSize: '12px',
      color: '#9ca3af',
    } as React.CSSProperties,
    footerRight: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      fontSize: '12px',
      color: '#9ca3af',
    } as React.CSSProperties,
    statItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
    } as React.CSSProperties,
    languageDot: {
      display: 'inline-block',
      width: '8px',
      height: '8px',
      borderRadius: '50%',
      backgroundColor: '#3b82f6',
    } as React.CSSProperties,
    languageText: {
      maxWidth: '60px',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap' as const,
    } as React.CSSProperties,
  };

  return (
    <Card
      style={cardStyles.card}
      bodyStyle={{ padding: 0, height: '100%' }}
      onClick={handleCardClick}
      onMouseEnter={(e) => {
        Object.assign(e.currentTarget.style, cardStyles.cardHover);
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '';
      }}
    >
      {/* 卡片头部 */}
      <div style={cardStyles.header}>
        <Avatar
          src={avatarUrl}
          icon={<FileOutlined />}
          size={36}
        />

        <div style={cardStyles.headerContent}>
          <div style={cardStyles.titleRow}>
            <Title level={5} style={cardStyles.title} title={repository.name}>
              {repository.name}
            </Title>
            <div style={{ fontSize: '16px' }}>
              {getRepoIcon()}
            </div>
          </div>

          <div style={cardStyles.tagsRow}>
            <Tag color={statusConfig.color}>
              {statusConfig.text}
            </Tag>
            {repository.isRecommended && (
              <Tag color="pink">
                推荐
              </Tag>
            )}
          </div>
        </div>
      </div>

      {/* 卡片内容 */}
      <div style={cardStyles.body}>
        <Text style={cardStyles.description}>
          {repository.description || '暂无描述'}
        </Text>
      </div>

      {/* 卡片底部 */}
      <div style={cardStyles.footer}>
        <div style={cardStyles.footerLeft}>
          <ClockCircleOutlined />
          <span>{formatDate(repository.createdAt)}</span>
        </div>

        <div style={cardStyles.footerRight}>
          {repository.stars > 0 && (
            <div style={cardStyles.statItem} title={`${repository.stars} Stars`}>
              <StarOutlined style={{ color: '#fbbf24' }} />
              <span>{formatNumber(repository.stars)}</span>
            </div>
          )}

          {repository?.forks > 0 && (
            <div style={cardStyles.statItem} title={`${repository.forks} Forks`}>
              <ForkOutlined />
              <span>{formatNumber(repository.forks)}</span>
            </div>
          )}

          {repository?.language && (
            <div style={cardStyles.statItem} title={`主要语言: ${repository.language}`}>
              <span style={cardStyles.languageDot}></span>
              <span style={cardStyles.languageText}>{repository.language}</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default RepositoryCard; 