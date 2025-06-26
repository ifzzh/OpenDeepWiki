'use client'

import { useState, useEffect } from 'react';
import { Avatar } from '@lobehub/ui';
import {
  UserOutlined,
  DatabaseOutlined,
  FileTextOutlined,
  EyeOutlined,
  ArrowUpOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ArrowDownOutlined,
} from '@ant-design/icons';
import { 
  getDetailedStatistics, 
  DetailedStatistics,
  SystemStats,
  RecentRepository,
  RecentUser
} from '../../services/dashboardService';

export default function Dashboard() {
  const [stats, setStats] = useState<DetailedStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const {data} = await getDetailedStatistics();

      if (data) {
        setStats(data.data);
      } else {
        throw new Error(data.message || data.error || '获取统计数据失败');
      }
    } catch (error) {
      console.error('获取统计数据失败:', error);
      const errorMessage = error instanceof Error ? error.message : '获取统计数据失败，请稍后重试';
      setError(errorMessage);
      
      // 不使用模拟数据，保持stats为null以显示错误状态
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return '#56d364';
      case 'Pending':
        return '#f7cc48';
      case 'Processing':
        return '#58a6ff';
      default:
        return '#8b949e';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'Completed':
        return '已完成';
      case 'Pending':
        return '待处理';
      case 'Processing':
        return '处理中';
      default:
        return '未知';
    }
  };

  const getGrowthIcon = (rate: number) => {
    return rate >= 0 ? (
      <ArrowUpOutlined style={{ marginRight: '4px', fontSize: '12px' }} />
    ) : (
      <ArrowDownOutlined style={{ marginRight: '4px', fontSize: '12px' }} />
    );
  };

  const getGrowthColor = (rate: number) => {
    return rate >= 0 ? '#56d364' : '#f85149';
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '400px',
        color: '#8b949e'
      }}>
        加载中...
      </div>
    );
  }

  if (!stats && error) {
    return (
      <div style={{ color: '#f0f6fc' }}>
        <div style={{ 
          marginBottom: '32px',
          paddingBottom: '24px',
          borderBottom: '1px solid #30363d'
        }}>
          <h1 style={{ 
            fontSize: '32px', 
            fontWeight: '700', 
            margin: 0,
            color: '#f0f6fc'
          }}>
            数据统计
          </h1>
          <p style={{ 
            fontSize: '16px', 
            color: '#8b949e',
            margin: '8px 0 0 0'
          }}>
            系统运行概况与数据分析
          </p>
        </div>
        
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '400px',
          background: '#0e1117',
          border: '1px solid #30363d',
          borderRadius: '12px',
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: '48px',
            color: '#f85149',
            marginBottom: '16px'
          }}>
            ⚠️
          </div>
          <h3 style={{
            fontSize: '20px',
            color: '#f0f6fc',
            margin: '0 0 12px 0'
          }}>
            数据加载失败
          </h3>
          <p style={{
            color: '#8b949e',
            margin: '0 0 24px 0',
            maxWidth: '400px'
          }}>
            {error}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '12px 24px',
              background: '#238636',
              color: '#f0f6fc',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'background 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#2ea043';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#238636';
            }}
          >
            重新加载
          </button>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '400px',
        color: '#8b949e'
      }}>
        暂无数据
      </div>
    );
  }

  // 统计卡片数据
  const statCards = [
    {
      title: '总用户数',
      value: stats.systemStats.totalUsers,
      icon: <UserOutlined style={{ fontSize: '24px' }} />,
      color: '#58a6ff',
      bgColor: 'rgba(88, 166, 255, 0.1)',
      growth: `${stats.systemStats.userGrowthRate >= 0 ? '+' : ''}${stats.systemStats.userGrowthRate}%`,
      growthRate: stats.systemStats.userGrowthRate,
    },
    {
      title: '仓库数量',
      value: stats.systemStats.totalRepositories,
      icon: <DatabaseOutlined style={{ fontSize: '24px' }} />,
      color: '#56d364',
      bgColor: 'rgba(86, 211, 100, 0.1)',
      growth: `${stats.systemStats.repositoryGrowthRate >= 0 ? '+' : ''}${stats.systemStats.repositoryGrowthRate}%`,
      growthRate: stats.systemStats.repositoryGrowthRate,
    },
    {
      title: '文档数量',
      value: stats.systemStats.totalDocuments,
      icon: <FileTextOutlined style={{ fontSize: '24px' }} />,
      color: '#a5a5fc',
      bgColor: 'rgba(165, 165, 252, 0.1)',
      growth: `${stats.systemStats.documentGrowthRate >= 0 ? '+' : ''}${stats.systemStats.documentGrowthRate}%`,
      growthRate: stats.systemStats.documentGrowthRate,
    },
    {
      title: '总访问量',
      value: stats.systemStats.totalViews,
      icon: <EyeOutlined style={{ fontSize: '24px' }} />,
      color: '#f7cc48',
      bgColor: 'rgba(247, 204, 72, 0.1)',
      growth: `${stats.systemStats.viewGrowthRate >= 0 ? '+' : ''}${stats.systemStats.viewGrowthRate}%`,
      growthRate: stats.systemStats.viewGrowthRate,
    },
  ];

  return (
    <div style={{ color: '#f0f6fc' }}>
      <div style={{ 
        marginBottom: '32px',
        paddingBottom: '24px',
        borderBottom: '1px solid #30363d'
      }}>
        <h1 style={{ 
          fontSize: '32px', 
          fontWeight: '700', 
          margin: 0,
          color: '#f0f6fc'
        }}>
          数据统计
        </h1>
        <p style={{ 
          fontSize: '16px', 
          color: '#8b949e',
          margin: '8px 0 0 0'
        }}>
          系统运行概况与数据分析
        </p>
        {error && (
          <div style={{
            marginTop: '16px',
            padding: '12px 16px',
            backgroundColor: 'rgba(248, 81, 73, 0.1)',
            border: '1px solid rgba(248, 81, 73, 0.3)',
            borderRadius: '8px',
            color: '#f85149',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}
      </div>
      
      {/* 统计卡片 */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
        gap: '24px',
        marginBottom: '32px'
      }}>
        {statCards.map((card, index) => (
          <div
            key={index}
            style={{
              background: '#0e1117',
              border: '1px solid #30363d',
              borderRadius: '12px',
              padding: '24px',
              transition: 'all 0.2s ease',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = card.color;
              e.currentTarget.style.boxShadow = `0 0 0 1px ${card.color}20`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#30363d';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ flex: 1 }}>
                <p style={{ 
                  color: '#8b949e', 
                  fontSize: '14px', 
                  margin: '0 0 8px 0',
                  fontWeight: '500'
                }}>
                  {card.title}
                </p>
                <h3 style={{ 
                  fontSize: '36px', 
                  fontWeight: '700', 
                  color: '#f0f6fc',
                  margin: '0 0 16px 0',
                  lineHeight: '1'
                }}>
                  {loading ? (
                    <div style={{
                      height: '36px',
                      width: '80px',
                      background: card.bgColor,
                      borderRadius: '6px',
                      animation: 'pulse 1.5s ease-in-out infinite'
                    }} />
                  ) : (
                    card.value.toLocaleString()
                  )}
                </h3>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  color: getGrowthColor(card.growthRate),
                  fontSize: '14px',
                  fontWeight: '500'
                }}>
                  {getGrowthIcon(card.growthRate)}
                  <span>{card.growth}</span>
                  <span style={{ color: '#8b949e', marginLeft: '8px' }}>本月增长</span>
                </div>
              </div>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: card.bgColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: card.color,
                marginLeft: '16px'
              }}>
                {card.icon}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* 详细信息卡片 */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
        gap: '24px'
      }}>
        {/* 最近创建的仓库 */}
        <div style={{
          background: '#0e1117',
          border: '1px solid #30363d',
          borderRadius: '12px',
          overflow: 'hidden'
        }}>
          <div style={{ 
            padding: '24px 24px 16px 24px',
            borderBottom: '1px solid #30363d'
          }}>
            <h2 style={{ 
              fontSize: '18px', 
              fontWeight: '600', 
              color: '#f0f6fc',
              margin: 0,
              display: 'flex',
              alignItems: 'center'
            }}>
              <DatabaseOutlined style={{ marginRight: '8px', color: '#56d364' }} />
              最近创建的仓库
            </h2>
          </div>
          <div>
            {loading ? (
              Array(4).fill(0).map((_, i) => (
                <div key={i} style={{ padding: '16px 24px' }}>
                  <div style={{
                    height: '16px',
                    background: 'rgba(177, 186, 196, 0.1)',
                    borderRadius: '4px',
                    marginBottom: '8px',
                    width: '75%'
                  }} />
                  <div style={{
                    height: '12px',
                    background: 'rgba(177, 186, 196, 0.05)',
                    borderRadius: '4px',
                    width: '50%'
                  }} />
                </div>
              ))
            ) : (
              stats.recentRepositories.map((repo, index) => (
                <div
                  key={index}
                  style={{
                    padding: '16px 24px',
                    borderBottom: index < stats.recentRepositories.length - 1 ? '1px solid #30363d' : 'none',
                    transition: 'background-color 0.2s ease',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(177, 186, 196, 0.02)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ 
                        fontSize: '14px', 
                        fontWeight: '500', 
                        color: '#f0f6fc',
                        margin: '0 0 4px 0'
                      }}>
                        {repo.organizationName}/{repo.name}
                      </h3>
                      <p style={{ 
                        fontSize: '12px', 
                        color: '#8b949e',
                        margin: '0 0 4px 0'
                      }}>
                        {repo.description || '暂无描述'}
                      </p>
                      <p style={{ 
                        fontSize: '12px', 
                        color: '#8b949e',
                        margin: 0,
                        display: 'flex',
                        alignItems: 'center'
                      }}>
                        <span>创建于 {formatDate(repo.createdAt)}</span>
                        <span style={{ margin: '0 8px' }}>•</span>
                        <span>{repo.documentCount} 个文档</span>
                      </p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                      <span style={{
                        padding: '4px 8px',
                        fontSize: '12px',
                        borderRadius: '12px',
                        background: `${getStatusColor(repo.status)}20`,
                        color: getStatusColor(repo.status),
                        border: `1px solid ${getStatusColor(repo.status)}40`,
                        fontWeight: '500'
                      }}>
                        {repo.status === 'Completed' ? <CheckCircleOutlined style={{ marginRight: '4px' }} /> : <ClockCircleOutlined style={{ marginRight: '4px' }} />}
                        {getStatusText(repo.status)}
                      </span>
                      {repo.isRecommended && (
                        <span style={{
                          padding: '2px 6px',
                          fontSize: '11px',
                          borderRadius: '8px',
                          background: 'rgba(245, 204, 72, 0.1)',
                          color: '#f7cc48',
                          border: '1px solid rgba(245, 204, 72, 0.3)',
                          fontWeight: '500'
                        }}>
                          推荐
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        
        {/* 最近注册的用户 */}
        <div style={{
          background: '#0e1117',
          border: '1px solid #30363d',
          borderRadius: '12px',
          overflow: 'hidden'
        }}>
          <div style={{ 
            padding: '24px 24px 16px 24px',
            borderBottom: '1px solid #30363d'
          }}>
            <h2 style={{ 
              fontSize: '18px', 
              fontWeight: '600', 
              color: '#f0f6fc',
              margin: 0,
              display: 'flex',
              alignItems: 'center'
            }}>
              <UserOutlined style={{ marginRight: '8px', color: '#58a6ff' }} />
              最近注册的用户
            </h2>
          </div>
          <div>
            {loading ? (
              Array(4).fill(0).map((_, i) => (
                <div key={i} style={{ padding: '16px 24px', display: 'flex', alignItems: 'center' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'rgba(177, 186, 196, 0.1)',
                    marginRight: '12px'
                  }} />
                  <div style={{ flex: 1 }}>
                    <div style={{
                      height: '14px',
                      background: 'rgba(177, 186, 196, 0.1)',
                      borderRadius: '4px',
                      marginBottom: '6px',
                      width: '60%'
                    }} />
                    <div style={{
                      height: '12px',
                      background: 'rgba(177, 186, 196, 0.05)',
                      borderRadius: '4px',
                      width: '40%'
                    }} />
                  </div>
                </div>
              ))
            ) : (
              stats.recentUsers.map((user, index) => (
                <div
                  key={index}
                  style={{
                    padding: '16px 24px',
                    borderBottom: index < stats.recentUsers.length - 1 ? '1px solid #30363d' : 'none',
                    transition: 'background-color 0.2s ease',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(177, 186, 196, 0.02)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <Avatar
                    size={32}
                    style={{
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      marginRight: '12px',
                      position: 'relative'
                    }}
                  >
                    {user.name.slice(0, 1)}
                    {user.isOnline && (
                      <div style={{
                        position: 'absolute',
                        bottom: '-2px',
                        right: '-2px',
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        background: '#56d364',
                        border: '2px solid #0e1117'
                      }} />
                    )}
                  </Avatar>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <h3 style={{ 
                          fontSize: '14px', 
                          fontWeight: '500', 
                          color: '#f0f6fc',
                          margin: '0 0 2px 0'
                        }}>
                          {user.name}
                        </h3>
                        <p style={{ 
                          fontSize: '12px', 
                          color: '#8b949e',
                          margin: 0
                        }}>
                          {user.email}
                        </p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                          {user.roles.map((role, roleIndex) => (
                            <span key={roleIndex} style={{
                              padding: '2px 6px',
                              fontSize: '11px',
                              borderRadius: '8px',
                              background: role === 'admin' ? 'rgba(245, 101, 101, 0.1)' : 'rgba(177, 186, 196, 0.1)',
                              color: role === 'admin' ? '#f56565' : '#8b949e',
                              border: `1px solid ${role === 'admin' ? '#f5656540' : '#8b949e40'}`,
                              fontWeight: '500'
                            }}>
                              {role === 'admin' ? '管理员' : '用户'}
                            </span>
                          ))}
                        </div>
                        <span style={{ 
                          fontSize: '11px', 
                          color: '#8b949e'
                        }}>
                          {formatDate(user.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 