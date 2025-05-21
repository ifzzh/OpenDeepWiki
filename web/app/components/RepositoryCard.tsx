import React, { useEffect, useState, useMemo } from 'react';
import { Repository } from '../types';
import Link from 'next/link';
import {
  FileOutlined,
  ClockCircleOutlined,
  GithubOutlined,
  StarOutlined,
  ForkOutlined,
} from '@ant-design/icons';
import { ChevronsRight, Heart } from 'lucide-react';
import { Badge, Tooltip } from 'antd';
import { MaskShadow } from '@lobehub/ui';
import { useTranslation } from '../i18n/client';
import { getRepositoryExtendedInfo, RepoExtendedInfo } from '../services/repositoryService';

// 不再需要组件级别的缓存，因为已经在服务层实现了缓存

interface RepositoryCardProps {
  repository: Repository;
}

const RepositoryCard: React.FC<RepositoryCardProps> = ({ repository }) => {
  const { t, i18n } = useTranslation();
  const currentLocale = i18n.language;
  const [repoInfo, setRepoInfo] = useState<RepoExtendedInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  // 格式化仓库地址，显示简洁的URL
  const formatRepoAddress = (address: string): string => {
    try {
      if (!address) return '';

      // 移除协议前缀
      let formattedAddress = address.replace(/^(https?:\/\/)/, '');

      // 移除末尾的.git后缀
      formattedAddress = formattedAddress.replace(/\.git$/, '');

      // 如果地址太长，进行截断
      if (formattedAddress.length > 30) {
        return formattedAddress.substring(0, 27) + '...';
      }

      return formattedAddress;
    } catch (e) {
      return address;
    }
  };

  // 在组件挂载时获取仓库扩展信息
  useEffect(() => {
    fetchRepositoryInfo();
  }, [repository.address]);

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
    return { owner: repository.organizationName, name: repository.name };
  };

  // 获取仓库的扩展信息，直接使用服务层的缓存机制
  const fetchRepositoryInfo = async () => {
    if (!repository.address) return;

    setLoading(true);
    try {
      // 服务层已实现缓存，直接调用API
      const info = await getRepositoryExtendedInfo(repository.address);
      setRepoInfo(info);
    } catch (error) {
      console.error('获取仓库信息失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 根据地址获取头像
  const getAvatarUrl = () => {
    // 优先使用API获取的头像
    if (repoInfo?.avatarUrl) {
      return repoInfo.avatarUrl;
    }

    // 回退到原来的逻辑
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
    } else if (repository.address?.includes('bitbucket.org')) {
      const owner = repository.organizationName;
      if (owner) {
        return `https://bitbucket.org/${owner}.png`;
      }
    }
    return null;
  };

  // 使用useMemo缓存头像URL，避免重复计算
  const avatarUrl = useMemo(() => getAvatarUrl(), [repoInfo, repository.address, repository.organizationName]);

  const getStatusNumber = (status: string | number): number => {
    if (typeof status === 'number') return status;
    return parseInt(status, 10) || 0;
  };

  // 获取状态小圆点
  const getStatusDot = (status: string | number) => {
    const statusNumber = getStatusNumber(status);
    let statusColorClass = '';

    switch (statusNumber) {
      case 0: statusColorClass = 'bg-yellow-400'; break;
      case 1: statusColorClass = 'bg-blue-400'; break;
      case 2: statusColorClass = 'bg-green-500'; break;
      case 3: statusColorClass = 'bg-gray-400'; break;
      case 4: statusColorClass = 'bg-purple-500'; break;
      case 99: statusColorClass = 'bg-red-500'; break;
      default: statusColorClass = 'bg-gray-300'; break;
    }

    return <span className={`inline-block w-2 h-2 rounded-full ${statusColorClass}`}></span>;
  };

  // 获取状态文本
  const getStatusText = (status: string | number) => {
    const statusNumber = getStatusNumber(status);

    switch (statusNumber) {
      case 0: return t('repository.status.pending', '待处理');
      case 1: return t('repository.status.processing', '处理中');
      case 2: return t('repository.status.completed', '已完成');
      case 3: return t('repository.status.cancelled', '已取消');
      case 4: return t('repository.status.unauthorized', '未授权');
      case 99: return t('repository.status.failed', '已失败');
      default: return t('repository.status.unknown', '未知状态');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const locale = currentLocale === 'zh-CN' ? 'zh-CN' : 'en-US';
    return date.toLocaleDateString(locale);
  };

  const getRepoIcon = () => {
    if (repository.address?.includes('github.com')) {
      return <GithubOutlined />;
    } else if (repository.address?.includes('gitee.com')) {
      return <i className="text-red-500 font-bold">G</i>;
    } else {
      return <FileOutlined />;
    }
  };

  return (
    <span
      style={{
        cursor: 'pointer',
        color: 'inherit',
        position: 'relative',
        display: 'block',
        overflow: 'hidden',
      }}
      onClick={() => {
        window.location.href = `/${repository.organizationName}/${repository.name}`;
      }}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      className="block no-underline text-inherit">
      <Badge.Ribbon
        style={{
          display: repository.isRecommended ? 'block' : 'none',
        }}
        placement="start"
        text={<Heart size={14} />}
        color="pink">
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow h-[180px] transition-shadow">
          {/* 发光效果元素 */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: isHovering ? '100%' : '-100%',
              width: '50%',
              height: '100%',
              background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.8) 50%, rgba(255,255,255,0) 100%)',
              transform: 'skewX(-20deg)',
              transition: isHovering ? 'left 0.6s ease-in' : 'left 0.9s ease-out',
              pointerEvents: 'none',
              zIndex: 10,
            }}
          />
          <div className="flex p-3 border-b border-gray-100">
            <div className="flex-shrink-0 mr-3">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  loading="lazy"
                  alt={repository.organizationName}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400">
                  <FileOutlined />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-800 truncate" title={repository.name}>
                  {repository.name}
                </h3>
                <div className="text-gray-400 ml-2">
                  {getRepoIcon()}
                </div>
              </div>

              <div className="flex items-center mt-1 text-xs">
                <div className="flex items-center ml-2">
                  {getStatusDot(repository.status)}
                  <span className="ml-1 text-gray-500">{getStatusText(repository.status)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="px-3 py-2 h-[80px]">
            <p className="text-xs text-gray-600 line-clamp-3">
              {repoInfo?.description || repository.description}
            </p>
          </div>

          <div className="px-3 py-2 bg-gray-50 flex items-center justify-between mt-auto">
            <div className="flex items-center text-xs text-gray-500 space-x-2">
              <div className="flex items-center">
                <ClockCircleOutlined className="mr-1" />
                <span>{formatDate(repository.createdAt)}</span>
              </div>

              {repoInfo?.stars > 0 && (
                <Tooltip title={`${repoInfo.stars} Stars`}>
                  <div className="flex items-center">
                    <StarOutlined className="mr-1 text-yellow-500" />
                    <span>{repoInfo.stars > 999 ? `${(repoInfo.stars / 1000).toFixed(1)}k` : repoInfo.stars}</span>
                  </div>
                </Tooltip>
              )}

              {repoInfo?.forks > 0 && (
                <Tooltip title={`${repoInfo.forks} Forks`}>
                  <div className="flex items-center">
                    <ForkOutlined className="mr-1" />
                    <span>{repoInfo.forks > 999 ? `${(repoInfo.forks / 1000).toFixed(1)}k` : repoInfo.forks}</span>
                  </div>
                </Tooltip>
              )}

              {repoInfo?.language && (
                <Tooltip title={`Language: ${repoInfo.language}`}>
                  <div className="flex items-center">
                    <span className="inline-block w-2 h-2 rounded-full bg-blue-400 mr-1"></span>
                    <span>{repoInfo.language}</span>
                  </div>
                </Tooltip>
              )}
            </div>

            <div className="text-gray-400">
              <ChevronsRight className="w-4 h-4" />
            </div>
          </div>
        </div>
      </Badge.Ribbon>
    </span>
  );
};

export default RepositoryCard; 