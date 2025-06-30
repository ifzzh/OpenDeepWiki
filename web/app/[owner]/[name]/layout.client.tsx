'use client'
import {
  Layout,
  Typography,
  Space,
  theme,
  ConfigProvider,
  Flex,
  Breadcrumb,
  Divider,
  Button,
  Modal,
  Card,
  message,
  Tooltip,
  Collapse,
  Alert,
  Progress,
  Input,
  Dropdown,
  Select,
} from 'antd';
import {
  HomeOutlined,
  ApiOutlined,
  CopyOutlined,
  CheckOutlined,
  RocketOutlined,
  BranchesOutlined,
  GlobalOutlined,
  PartitionOutlined,
} from '@ant-design/icons';
import { SaveAll } from 'lucide-react'
import Link from 'next/link';
import { usePathname,  useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ExportMarkdownZip } from '../../services';
import { useTranslation } from '../../i18n/client';

const { Header, Content, Footer } = Layout;
const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;

// 简约设计系统
const minimalistDesign = {
  colors: {
    primary: '#2563eb',
    primaryLight: '#3b82f6',
    primaryBg: '#f8fafc',
    border: '#e2e8f0',
    text: '#1e293b',
    textSecondary: '#64748b',
    textTertiary: '#94a3b8',
    background: '#ffffff',
    backgroundSecondary: '#f8fafc',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  borderRadius: {
    sm: 4,
    md: 6,
    lg: 8,
  },
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
  }
};

interface DocumentCatalogResponse {
  key: string;
  label: string;
  url: string;
  order: number;
  disabled: boolean;
  lastUpdate: string;
  children?: DocumentCatalogResponse[];
}

interface RepositoryLayoutClientProps {
  owner: string;
  name: string;
  initialCatalogData: any;
  initialLastUpdated: string;
  children: React.ReactNode;
}

export default function RepositoryLayoutClient({
  owner,
  name,
  initialCatalogData,
  initialLastUpdated,
  children,
}: RepositoryLayoutClientProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { token } = theme.useToken();
  const { t } = useTranslation();

  const pathParts = pathname.split('/').filter(Boolean);
  const currentPath = pathParts.slice(2).join('/');

  const [isMobile, setIsMobile] = useState(false);
  const [isMCPModalVisible, setIsMCPModalVisible] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  
  // 使用URL参数中的branch，如果没有则使用从服务器传递来的currentBranch，或者使用branchs数组的第一项
  const [selectedBranch, setSelectedBranch] = useState<string>(
    searchParams.get('branch') || 
    initialCatalogData?.currentBranch || 
    initialCatalogData?.branchs?.[0] || 
    ''
  );

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  const mcpConfigJson = {
    mcpServers: {
      [name]: {
        url: `${window.location.protocol}//${window.location.host}/api/mcp?owner=${owner}&name=${name}`
      }
    }
  };

  const mcpJsonString = JSON.stringify(mcpConfigJson, null, 2);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(mcpJsonString)
      .then(() => {
        setCopySuccess(true);
        message.success(t('repository_layout.mcp.config.copy_success'));
        setTimeout(() => setCopySuccess(false), 3000);
      })
      .catch(() => {
        message.error(t('repository_layout.mcp.config.copy_failed'));
      });
  };

  // 分支改变时更新URL查询参数
  const handleBranchChange = (value: string) => {
    // 分支切换时需要强制重新加载页面以获取新分支的数据
    if (value !== selectedBranch) {
      // 创建新的查询参数，保留现有参数
      const params = new URLSearchParams(searchParams.toString());
      params.set('branch', value);

      // 使用完整页面刷新以确保服务器组件重新渲染并获取新数据
      window.location.href = `${pathname}?${params.toString()}`;
      
      // 不再需要设置状态，因为页面会完全刷新
      // setSelectedBranch(value);
    }
  };

  // 当URL参数中的分支变化时更新选中的分支
  useEffect(() => {
    const branchParam = searchParams.get('branch');
    if (branchParam && branchParam !== selectedBranch) {
      setSelectedBranch(branchParam);
    }
  }, [searchParams, selectedBranch]);

  // 渲染树形菜单项 - 参考VS Code样式
  const renderSidebarItem = (item: DocumentCatalogResponse, level = 0) => {
    const isActive = pathname.includes(`/${item.url}`);

    const isRecentlyUpdated = (lastUpdate) => {
      if (!lastUpdate) return false;
      const updateDate = new Date(lastUpdate);
      const now = new Date();
      const oneWeek = 7 * 24 * 60 * 60 * 1000; // 一周的毫秒数
      return now.getTime() - updateDate.getTime() < oneWeek;
    };

    const formatUpdateDate = (lastUpdate: string) => {
      if (!lastUpdate) return '';
      const date = new Date(lastUpdate);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    };

    // 添加分支参数到链接
    const getItemUrl = (url: string) => {
      const linkUrl = `/${owner}/${name}/${url}`;
      return selectedBranch ? `${linkUrl}?branch=${selectedBranch}` : linkUrl;
    };

    // 计算缩进
    const indentLevel = level * 20;

    return (
      <div key={item.key} className="tree-item-container">
        {item.disabled ? (
          <div 
            className="tree-item disabled" 
            style={{ paddingLeft: `${12 + indentLevel}px` }}
          >
            <span className="tree-item-label">{item.label}</span>
          </div>
        ) : (
          <Link
            href={getItemUrl(item.url)}
            className={`tree-item ${isActive ? 'active' : ''}`}
            style={{ paddingLeft: `${12 + indentLevel}px` }}
          >
            <span className="tree-item-label">
              {item.label}
              {isRecentlyUpdated(item.lastUpdate) && (
                <Tooltip title={t('repository_layout.update_tooltip', { time: formatUpdateDate(item.lastUpdate) })}>
                  <span className="update-dot" />
                </Tooltip>
              )}
            </span>
          </Link>
        )}
        
        {/* 渲染子项 */}
        {item.children?.length > 0 && (
          <div className="tree-children">
            {item.children
              .sort((a, b) => a.order - b.order)
              .map(child => renderSidebarItem(child, level + 1))
            }
          </div>
        )}
      </div>
    );
  };

  // 更新链接生成方法添加分支参数
  const generateBreadcrumb = () => {
    const items = [
      {
        title: <Link href="/"><HomeOutlined /></Link>,
      },
      {
        title: <Link href={`/${owner}`}>{owner}</Link>,
      },
      {
        title: <Link href={selectedBranch ? `/${owner}/${name}?branch=${selectedBranch}` : `/${owner}/${name}`}>{name}</Link>,
      }
    ];

    if (currentPath) {
      items.push({
        title: <span>{currentPath}</span>,
      });
    }

    return items;
  };

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: minimalistDesign.colors.primary,
          colorBgContainer: minimalistDesign.colors.background,
          colorBgElevated: minimalistDesign.colors.background,
          colorBgLayout: minimalistDesign.colors.backgroundSecondary,
          colorText: minimalistDesign.colors.text,
          colorTextSecondary: minimalistDesign.colors.textSecondary,
          colorBorder: minimalistDesign.colors.border,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          borderRadius: minimalistDesign.borderRadius.md,
          boxShadow: minimalistDesign.shadows.sm,
        },
        components: {
          Layout: {
            headerBg: 'rgba(255, 255, 255, 0.8)',
            siderBg: minimalistDesign.colors.background,
            bodyBg: minimalistDesign.colors.backgroundSecondary,
          },
          Button: {
            borderRadius: minimalistDesign.borderRadius.md,
            boxShadow: 'none',
          },
          Card: {
            borderRadius: minimalistDesign.borderRadius.lg,
            boxShadow: minimalistDesign.shadows.sm,
          },
          Modal: {
            borderRadius: minimalistDesign.borderRadius.lg,
          }
        },
      }}
    >
      <Layout style={{ minHeight: '100vh', background: minimalistDesign.colors.backgroundSecondary }}>
        <Header style={{
          padding: `0 ${minimalistDesign.spacing.lg}px`,
          background: 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(8px)',
          position: 'fixed',
          width: '100%',
          zIndex: 1000,
          borderBottom: `1px solid ${minimalistDesign.colors.border}`,
          boxShadow: minimalistDesign.shadows.sm,
        }}>
          <Flex align="center" justify="space-between" style={{ height: '100%' }}>
            <Flex align="center" gap={minimalistDesign.spacing.md}>
              <span onClick={() => {
                window.location.href = '/';
              }}>
                <Flex align="center" gap={minimalistDesign.spacing.sm}>
                  <RocketOutlined
                    style={{
                      color: minimalistDesign.colors.primary,
                      fontSize: 24,
                    }}
                  />
                  <span
                    style={{
                      color: minimalistDesign.colors.primary,
                      fontSize: 16,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    OpenDeepWiki
                  </span>
                </Flex>
              </span>

              <Typography.Title
                level={4}
                style={{
                  margin: 0,
                  fontSize: isMobile ? 14 : 16,
                  cursor: initialCatalogData?.git ? 'pointer' : 'default',
                  color: minimalistDesign.colors.text,
                }}
              >
                <span
                  onClick={() => {
                    if (initialCatalogData?.git) {
                      window.open(initialCatalogData.git, '_blank');
                    }
                  }}
                  style={{
                    cursor: 'pointer',
                  }}>
                  {owner}/{name}
                </span>
              </Typography.Title>
              
              {initialCatalogData?.progress !== undefined && initialCatalogData?.progress < 100 && (
                <Flex align="center" gap={minimalistDesign.spacing.sm}>
                  <Progress
                    percent={initialCatalogData?.progress || 0}
                    size="small"
                    style={{ width: '80px', margin: 0 }}
                    showInfo={false}
                    strokeColor={minimalistDesign.colors.primary}
                    trailColor={minimalistDesign.colors.border}
                  />
                  <Text style={{ fontSize: 12, color: minimalistDesign.colors.textSecondary }}>
                    {initialCatalogData?.progress}%
                  </Text>
                </Flex>
              )}
            </Flex>

            <Flex align="center" gap={minimalistDesign.spacing.sm}>
              {initialCatalogData?.branchs && initialCatalogData.branchs.length > 0 && selectedBranch && (
                <Select
                  value={selectedBranch}
                  onChange={handleBranchChange}
                  style={{ width: isMobile ? 100 : 140 }}
                  size={isMobile ? "small" : "middle"}
                  options={initialCatalogData.branchs.map((branch: string) => ({ 
                    label: branch, 
                    value: branch 
                  }))}
                  placeholder={t('repository_layout.branch.select_placeholder')}
                  suffixIcon={<BranchesOutlined />}
                  variant="borderless"
                />
              )}

              <Button
                type="primary"
                icon={<ApiOutlined />}
                onClick={() => setIsMCPModalVisible(true)}
                size={isMobile ? "small" : "middle"}
                style={{
                  background: minimalistDesign.colors.primary,
                  border: 'none',
                  boxShadow: 'none',
                }}
              >
                {isMobile ? 'MCP' : t('repository_layout.header.add_mcp')}
              </Button>
              
              {initialLastUpdated && !isMobile && (
                <Text style={{
                  fontSize: 12,
                  color: minimalistDesign.colors.textSecondary,
                }}>
                  {t('repository_layout.header.last_updated', { time: initialLastUpdated })}
                </Text>
              )}
            </Flex>
          </Flex>
        </Header>
        
        <Modal
          title={
            <Flex align="center" gap={minimalistDesign.spacing.sm}>
              <ApiOutlined style={{ color: minimalistDesign.colors.primary }} />
              <span>{t('repository_layout.mcp.modal_title')}</span>
            </Flex>
          }
          open={isMCPModalVisible}
          onCancel={() => setIsMCPModalVisible(false)}
          footer={null}
          width={700}
          centered
        >
          <Flex vertical gap={minimalistDesign.spacing.lg}>
            <Alert
              type="info"
              showIcon
              message={t('repository_layout.mcp.support_message')}
              description={
                <ul style={{ paddingLeft: minimalistDesign.spacing.lg, margin: `${minimalistDesign.spacing.sm}px 0` }}>
                  <li>{t('repository_layout.mcp.features.single_repo')}</li>
                  <li>{t('repository_layout.mcp.features.analysis')}</li>
                </ul>
              }
              style={{ 
                marginBottom: minimalistDesign.spacing.lg, 
                borderRadius: minimalistDesign.borderRadius.lg,
                border: `1px solid ${minimalistDesign.colors.border}`
              }}
            />

            <Card
              title={t('repository_layout.mcp.config.title')}
              style={{
                marginBottom: minimalistDesign.spacing.lg,
                borderRadius: minimalistDesign.borderRadius.lg,
                border: `1px solid ${minimalistDesign.colors.border}`,
                boxShadow: minimalistDesign.shadows.sm,
              }}
            >
              <Paragraph style={{ marginBottom: minimalistDesign.spacing.md }}>
                {t('repository_layout.mcp.config.cursor_usage')}
              </Paragraph>

              <div style={{
                position: 'relative',
                backgroundColor: minimalistDesign.colors.backgroundSecondary,
                padding: minimalistDesign.spacing.lg,
                borderRadius: minimalistDesign.borderRadius.lg,
                marginBottom: minimalistDesign.spacing.lg,
                border: `1px solid ${minimalistDesign.colors.border}`,
              }}>
                <pre style={{
                  margin: 0,
                  fontFamily: 'Menlo, Monaco, "Courier New", monospace',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  fontSize: 13,
                  color: minimalistDesign.colors.text,
                }}>
                  {mcpJsonString}
                </pre>
                <Tooltip title={copySuccess ? t('repository_layout.mcp.config.copied_tooltip') : t('repository_layout.mcp.config.copy_tooltip')}>
                  <Button
                    type="text"
                    icon={copySuccess ? <CheckOutlined style={{ color: minimalistDesign.colors.success }} /> : <CopyOutlined />}
                    onClick={copyToClipboard}
                    style={{
                      position: 'absolute',
                      top: minimalistDesign.spacing.sm,
                      right: minimalistDesign.spacing.sm,
                    }}
                  />
                </Tooltip>
              </div>

              <Flex vertical gap={minimalistDesign.spacing.sm}>
                <Text strong>{t('repository_layout.mcp.config.description_title')}</Text>
                <ul style={{ paddingLeft: minimalistDesign.spacing.lg, margin: 0 }}>
                  <li><Text code>owner</Text>: {t('repository_layout.mcp.config.owner_desc')}</li>
                  <li><Text code>name</Text>: {t('repository_layout.mcp.config.name_desc')}</li>
                </ul>
              </Flex>
            </Card>

            <Card
              title={t('repository_layout.mcp.test.title')}
              style={{
                borderRadius: minimalistDesign.borderRadius.lg,
                border: `1px solid ${minimalistDesign.colors.border}`,
                boxShadow: minimalistDesign.shadows.sm,
              }}
            >
              <Paragraph>
                {t('repository_layout.mcp.test.description')}
              </Paragraph>
              <Paragraph strong style={{ color: minimalistDesign.colors.primary }}>
                {t('repository_layout.mcp.test.question')}
              </Paragraph>
              <div style={{
                width: '100%',
                height: 'auto',
                position: 'relative',
                marginTop: minimalistDesign.spacing.lg,
                borderRadius: minimalistDesign.borderRadius.lg,
                overflow: 'hidden',
                border: `1px solid ${minimalistDesign.colors.border}`,
              }}>
                <img
                  src="/mcp.png"
                  alt={t('repository_layout.mcp.test.image_alt')}
                  style={{
                    width: '100%',
                    height: 'auto',
                    display: 'block',
                    objectFit: 'contain'
                  }}
                />
              </div>
            </Card>
          </Flex>
        </Modal>

        <Layout
          className={initialCatalogData?.items?.length > 0 ? 'ant-layout-content' : 'ant-layout-content-mobile'}
          style={{
            marginTop: 64,
          }}>
          {initialCatalogData?.items?.length > 0 ? (
            <div
              className="native-sidebar"
              style={{
                width: 240,
                background: 'linear-gradient(180deg, #ffffff 0%, #fefefe 100%)',
                position: 'fixed',
                left: 0,
                top: 64,
                bottom: 0,
                borderRight: `1px solid #e5e7eb`,
                zIndex: 990,
                overflowY: 'auto',
                overflowX: 'hidden',
                height: 'calc(100vh - 64px)',
                boxShadow: '2px 0 12px rgba(0, 0, 0, 0.06)',
              }}
            >
              <div className="sidebar-header" style={{
                padding: `${minimalistDesign.spacing.md}px`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderBottom: `1px solid #f1f5f9`,
                background: 'linear-gradient(180deg, #ffffff 0%, #fafafa 100%)',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.04)',
              }}>
                <Button
                  type="primary"
                  size="small"
                  icon={<SaveAll size={14} />}
                  onClick={() =>
                    Modal.confirm({
                      title: t('repository_layout.sidebar.export.modal_title'),
                      content: t('repository_layout.sidebar.export.modal_content'),
                      okText: t('repository_layout.sidebar.export.ok_text'),
                      cancelText: t('repository_layout.sidebar.export.cancel_text'),
                      onOk: () => {
                        ExportMarkdownZip(initialCatalogData.warehouseId)
                          .then(response => {
                            if (response.success && response.data) {
                              const blob = new Blob([response.data], { type: 'application/zip' });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `${owner}-${name}-docs.zip`;
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                              URL.revokeObjectURL(url);
                            } else {
                              message.error(t('repository_layout.sidebar.export.failed_message'));
                            }
                          })
                      },
                    })
                  }
                  style={{
                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    border: 'none',
                    boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)',
                    fontSize: '12px',
                    borderRadius: '6px',
                    fontWeight: '500',
                  }}
                >
                  {t('repository_layout.sidebar.export.button')}
                </Button>
              </div>

              <div className="menu-wrapper">
                <Link
                  href={selectedBranch ? `/${owner}/${name}?branch=${selectedBranch}` : `/${owner}/${name}`}
                  className={`tree-item overview-item ${pathname === `/${owner}/${name}` ? 'active' : ''}`}
                  style={{ paddingLeft: '12px' }}
                >
                  <span className="tree-item-label">{t('repository_layout.sidebar.overview')}</span>
                </Link>

                <Link
                  href={selectedBranch ? `/${owner}/${name}/mindmap?branch=${selectedBranch}` : `/${owner}/${name}/mindmap`}
                  className={`tree-item mindmap-item ${pathname === `/${owner}/${name}/mindmap` ? 'active' : ''}`}
                  style={{ paddingLeft: '12px' }}
                >
                  <span className="tree-item-label">
                    <PartitionOutlined style={{ marginRight: '8px', fontSize: '14px' }} />
                    {t('repository_layout.sidebar.mindmap')}
                  </span>
                </Link>

                <div className="menu-divider"></div>

                {initialCatalogData?.items?.map(item => renderSidebarItem(item))}

                <div className="menu-divider"></div>

                <Link
                  href={selectedBranch ? `/${owner}/${name}/changelog?branch=${selectedBranch}` : `/${owner}/${name}/changelog`}
                  className={`tree-item changelog-item ${pathname === `/${owner}/${name}/changelog` ? 'active' : ''}`}
                  style={{ paddingLeft: '12px' }}
                >
                  <span className="tree-item-label">{t('repository_layout.sidebar.changelog')}</span>
                </Link>
              </div>
            </div>) : (
            <></>
          )}

          <Content style={{
            marginLeft: initialCatalogData?.items?.length > 0 ? (isMobile ? 0 : 240) : 0,
            padding: minimalistDesign.spacing.lg,
            background: minimalistDesign.colors.backgroundSecondary,
            minHeight: 'calc(100vh - 64px)',
            marginBottom: 100,
            position: 'relative',
          }}>
            <Breadcrumb
              items={generateBreadcrumb()}
              style={{
                marginBottom: minimalistDesign.spacing.lg,
                fontSize: 12,
                padding: `${minimalistDesign.spacing.md}px`,
                background: minimalistDesign.colors.background,
                borderRadius: minimalistDesign.borderRadius.lg,
                border: `1px solid ${minimalistDesign.colors.border}`,
              }}
            />

            <div style={{
              background: minimalistDesign.colors.background,
              padding: minimalistDesign.spacing.xl,
              borderRadius: minimalistDesign.borderRadius.lg,
              border: `1px solid ${minimalistDesign.colors.border}`,
              boxShadow: minimalistDesign.shadows.sm,
            }}>
              {children}
            </div>
          </Content>
        </Layout>

        <Footer style={{
          textAlign: 'center',
          background: minimalistDesign.colors.background,
          padding: `${minimalistDesign.spacing.md}px ${minimalistDesign.spacing.lg}px`,
          marginTop: 'auto',
          borderTop: `1px solid ${minimalistDesign.colors.border}`,
        }}>
          <Space direction="vertical" size={minimalistDesign.spacing.xs}>
            <Text style={{ 
              fontSize: 12, 
              color: minimalistDesign.colors.textSecondary 
            }}>
              Powered by <Text style={{ color: minimalistDesign.colors.primary, fontWeight: 500 }}>OpenDeepWiki</Text>
            </Text>
            <Text style={{ 
              fontSize: 12, 
              color: minimalistDesign.colors.textTertiary 
            }}>
              <GlobalOutlined style={{ marginRight: 4 }} /> Powered by .NET 9.0
            </Text>
          </Space>
        </Footer>
      </Layout>

      <style jsx global>{`
        /* 美化的树形菜单样式 */
        .tree-item-container {
          width: 100%;
        }
        
        .tree-item {
          display: flex;
          align-items: center;
          padding: 8px 12px;
          margin: 1px 8px;
          color: ${minimalistDesign.colors.text};
          text-decoration: none;
          font-size: 14px;
          line-height: 20px;
          cursor: pointer;
          border-radius: 6px;
          position: relative;
          min-height: 32px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          font-weight: 400;
        }
        
        .tree-item:hover {
          background-color: #f8fafc;
          color: ${minimalistDesign.colors.text};
        }
        
        .tree-item.active {
          background-color: #e0f2fe;
          color: ${minimalistDesign.colors.primary};
          font-weight: 500;
        }
        
        .tree-item.disabled {
          color: ${minimalistDesign.colors.textTertiary};
          cursor: not-allowed;
          background: transparent;
        }
        
        .tree-item.disabled:hover {
          background: transparent;
        }
        
        .tree-item-label {
          display: flex;
          align-items: center;
          flex: 1;
          position: relative;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .tree-children {
          width: 100%;
        }
        
        .update-dot {
          position: absolute;
          top: 4px;
          right: -6px;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background-color: #10b981;
          opacity: 0.9;
        }
        
        .menu-wrapper {
          padding: 8px 0;
          opacity: 1;
        }
        
        /* 概览、思维导图和更新日志的特殊样式 */
        .tree-item.overview-item,
        .tree-item.mindmap-item,
        .tree-item.changelog-item {
          font-weight: 500;
          margin: 4px 8px 8px 8px;
          background-color: #f1f5f9;
          border: 1px solid #e2e8f0;
        }
        
        .tree-item.overview-item:hover,
        .tree-item.mindmap-item:hover,
        .tree-item.changelog-item:hover {
          background-color: #e2e8f0;
        }
        
        .tree-item.overview-item.active,
        .tree-item.mindmap-item.active,
        .tree-item.changelog-item.active {
          background-color: #dbeafe;
          border-color: ${minimalistDesign.colors.primary};
        }
        
        .menu-divider {
          height: 1px;
          background: linear-gradient(to right, transparent, #e2e8f0, transparent);
          margin: 12px 16px;
          opacity: 0.6;
        }
        
        /* 移动端响应 */
        @media screen and (max-width: 768px) {
          .native-sidebar {
            display: none;
          }
          
          .tree-item {
            font-size: 15px;
            line-height: 22px;
            min-height: 36px;
            padding: 10px 12px;
          }
        }

        /* 滚动条美化 */
        .native-sidebar::-webkit-scrollbar {
          width: 8px;
        }
        
        .native-sidebar::-webkit-scrollbar-track {
          background: #f8fafc;
          border-radius: 4px;
        }
        
        .native-sidebar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }
        
        .native-sidebar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        
        /* 侧边栏整体美化 */
        .native-sidebar {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          background: linear-gradient(180deg, #ffffff 0%, #fefefe 100%);
          box-shadow: 2px 0 8px rgba(0, 0, 0, 0.04);
        }
        
        .sidebar-header {
          border-bottom: 1px solid #f1f5f9;
          background: linear-gradient(180deg, #ffffff 0%, #fafafa 100%);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }
      `}</style>
    </ConfigProvider >
  );
}