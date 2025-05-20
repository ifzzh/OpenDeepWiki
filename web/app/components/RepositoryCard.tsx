import React, { useEffect, useState } from 'react';
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

interface RepositoryCardProps {
  repository: Repository;
}

const RepositoryCard: React.FC<RepositoryCardProps> = ({ repository }) => {
  const { t, i18n } = useTranslation();
  const currentLocale = i18n.language;
  const [repoInfo, setRepoInfo] = useState<RepoExtendedInfo | null>(null);
  const [loading, setLoading] = useState(false);

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

  // 获取仓库的扩展信息
  const fetchRepositoryInfo = async () => {
    if (!repository.address) return;
    
    setLoading(true);
    try {
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
    }
    return null;
  };

  const avatarUrl = getAvatarUrl();

  // 解析状态值为数字
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

  // 格式化显示的地址
  const formatRepoAddress = (address: string) => {
    return address
      .replace('https://github.com/', '')
      .replace('https://gitlab.com/', '')
      .replace('https://gitee.com/', '')
      .replace('.git', '');
  };

  // 获取仓库平台图标
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
    <Link href={`/${repository.organizationName}/${repository.name}`} className="block no-underline text-inherit">
      <Badge.Ribbon
        style={{
          display: repository.isRecommended ? 'block' : 'none',
        }}
        placement="start"
        text={<Heart size={14} />} 
        color="pink">
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow h-[180px] transition-shadow">
          {/* 仓库头部信息 */}
          <div className="flex p-3 border-b border-gray-100">
            {/* 仓库头像/图标 */}
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

            {/* 仓库主要信息 */}
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
                <span className="text-gray-500 truncate" title={repository.address}>
                  {formatRepoAddress(repository.address || '')}
                </span>
                <div className="flex items-center ml-2">
                  {getStatusDot(repository.status)}
                  <span className="ml-1 text-gray-500">{getStatusText(repository.status)}</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* 仓库描述 */}
          <div className="px-3 py-2 h-[80px]">
            <p className="text-xs text-gray-600 line-clamp-3">
              {repoInfo?.description || repository.description}
            </p>
          </div>
          
          {/* 仓库底部信息 */}
          <div className="px-3 py-2 bg-gray-50 flex items-center justify-between mt-auto">
            <div className="flex items-center text-xs text-gray-500 space-x-2">
              <div className="flex items-center">
                <ClockCircleOutlined className="mr-1" />
                <span>{formatDate(repository.createdAt)}</span>
              </div>
              
              {/* 显示 stars 和 forks (如果有的话) */}
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
    </Link>
  );
};

export default RepositoryCard; 