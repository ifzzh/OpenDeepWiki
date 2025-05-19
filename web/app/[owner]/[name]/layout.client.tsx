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
  Steps,
  Collapse,
  Alert,
  Progress,
  Input,
  Dropdown,
  Select,
} from 'antd';
import {
  HomeOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ApiOutlined,
  CopyOutlined,
  CheckOutlined,
  BookOutlined,
  RocketOutlined,
  BranchesOutlined,
  GlobalOutlined,
  BulbOutlined,
  SearchOutlined,
  DownloadOutlined,
  SettingOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { PanelRightClose, PanelLeftClose, SaveAll } from 'lucide-react'
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import AIInputBar from '../../components/AIInputBar';
import Image from 'next/image';
import { ExportMarkdownZip } from '../../services';

const { Header, Content, Footer } = Layout;
const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;

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
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token } = theme.useToken();

  const pathParts = pathname.split('/').filter(Boolean);
  const currentPath = pathParts.slice(2).join('/');

  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isMCPModalVisible, setIsMCPModalVisible] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<string>(
    searchParams.get('branch') || initialCatalogData?.branchs?.[0] || ''
  );
  
  const selectedKey = pathname.includes('/') ? 'docs' : 'overview';

  // Check if the screen size is mobile
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
  // Automatically collapse sidebar on mobile
  useEffect(() => {
    if (isMobile) {
      setCollapsed(true);
    }
  }, [isMobile]);

  const mcpConfigJson = {
    mcpServers: {
      [name]: {
        url: `${window.location.protocol}//${window.location.host}/api/sse?owner=${owner}&name=${name}`
      }
    }
  };

  const mcpJsonString = JSON.stringify(mcpConfigJson, null, 2);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(mcpJsonString)
      .then(() => {
        setCopySuccess(true);
        message.success('配置已复制到剪贴板');
        setTimeout(() => setCopySuccess(false), 3000);
      })
      .catch(() => {
        message.error('复制失败，请手动复制');
      });
  };

  // 分支改变时更新URL查询参数
  const handleBranchChange = (value: string) => {
    // 创建新的查询参数，保留现有参数
    const params = new URLSearchParams(searchParams.toString());
    params.set('branch', value);

    // 更新路由但不触发完全刷新
    router.push(`${pathname}?${params.toString()}`);
    setSelectedBranch(value);
  };

  // 当URL参数中的分支变化时更新选中的分支
  useEffect(() => {
    const branchParam = searchParams.get('branch');
    if (branchParam && branchParam !== selectedBranch) {
      setSelectedBranch(branchParam);
    }
  }, [searchParams, selectedBranch]);

  // 渲染原生菜单项
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

    return (
      <div key={item.key} className="menu-item-container">
        {item.children?.length ? (
          <>
            {item.disabled ? (
              <div className="menu-item disabled" style={{
                paddingLeft: `${16 + level * 16}px`,
              }}>
                <span>{item.label}</span>
              </div>
            ) : (
              <Link
                href={getItemUrl(item.url)}
                className={`menu-item ${isActive ? 'active' : ''}`}
                style={{
                  paddingLeft: `${16 + level * 16}px`,
                }}>
                <span className="menu-label">
                  {item.label}
                  {isRecentlyUpdated(item.lastUpdate) && (
                    <Tooltip title={`最近更新: ${formatUpdateDate(item.lastUpdate)}`}>
                      <span className="update-indicator" />
                    </Tooltip>
                  )}
                </span>
              </Link>
            )}
            {item.children.sort((a, b) => a.order - b.order).map(child =>
              renderSidebarItem(child, level + 1)
            )}
          </>
        ) : (
          item.disabled ? (
            <div
              className="menu-item disabled"
              style={{
                paddingLeft: `${16 + level * 16}px`,
              }}>
              <span>{item.label}</span>
            </div>
          ) : (
            <Link
              href={getItemUrl(item.url)}
              className={`menu-item ${isActive ? 'active' : ''}`}
              style={{
                paddingLeft: `${16 + level * 16}px`,
              }}>
              <span className="menu-label">
                {item.label}
                {isRecentlyUpdated(item.lastUpdate) && (
                  <Tooltip title={`最近更新: ${formatUpdateDate(item.lastUpdate)}`}>
                    <span className="update-indicator" />
                  </Tooltip>
                )}
              </span>
            </Link>
          )
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
          colorPrimary: '#1677ff',
          colorBgContainer: '#f8fafc',
          colorBgElevated: '#ffffff',
          colorBgLayout: '#f0f2f5',
          fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          borderRadius: 6,
        },
        components: {
          Layout: {
            headerBg: 'rgba(255, 255, 255, 0.95)',
            siderBg: '#ffffff',
            bodyBg: '#f8fafc',
          },
          FloatButton: {
            colorPrimary: '#1677ff',
          },
          Button: {
            borderRadius: 6,
          },
          Card: {
            borderRadius: 8,
          }
        },
      }}
    >
      <Layout style={{ minHeight: '100vh', background: '#f8fafc' }}>
        <Header style={{
          padding: `0 ${token.paddingLG}px`,
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          position: 'fixed',
          width: '100%',
          zIndex: 1000,
          borderBottom: `1px solid rgba(24, 144, 255, 0.15)`,
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.05)',
          transition: 'all 0.3s ease'
        }}>
          <Flex align="center" justify="space-between" style={{ height: '100%' }}>
            <Flex align="center" gap={token.marginXS}>
              <Link href="/">
                <Flex align="center" gap={token.marginXS}>
                  <RocketOutlined
                    style={{
                      color: token.colorPrimary,
                      fontSize: 28,
                      filter: 'drop-shadow(0 0 5px rgba(24, 144, 255, 0.5))'
                    }}
                  />
                  <span
                    style={{
                      color: token.colorPrimary,
                      fontSize: token.fontSizeLG,
                      fontWeight: 600,
                      fontFamily: "'Montserrat', sans-serif",
                      letterSpacing: '1px',
                      cursor: 'pointer',
                      transition: `color ${token.motionDurationMid}`,
                      textShadow: '0 1px 2px rgba(24, 144, 255, 0.15)',
                    }}
                  >
                    OpenDeepWiki
                  </span>
                </Flex>
              </Link>

              <Typography.Title
                level={4}
                style={{
                  margin: 0,
                  fontSize: isMobile ? token.fontSizeHeading5 : token.fontSizeHeading4,
                  lineHeight: 1.2,
                  cursor: initialCatalogData?.git ? 'pointer' : 'default',
                }}
              >
                <Flex align="center" wrap={isMobile ? "wrap" : "nowrap"}>
                  <span
                    onClick={() => {
                      if (initialCatalogData?.git) {
                        window.open(initialCatalogData.git, '_blank');
                      }
                    }}
                    style={{
                      color: token.colorText,
                      fontSize: isMobile ? token.fontSizeLG : token.fontSizeHeading5,
                      lineHeight: 1.2,
                      cursor: 'pointer',
                      marginRight: token.marginXS,
                    }}>
                    {owner}/{name}
                  </span>
                </Flex>
              </Typography.Title>
              {initialCatalogData?.progress !== undefined && initialCatalogData?.progress < 100 && (
                <Flex align="center" gap={token.marginXS}>
                  <Progress
                    percent={initialCatalogData?.progress || 0}
                    size="small"
                    style={{
                      width: '80px',
                      margin: 0,
                    }}
                    showInfo={false}
                    strokeColor={{
                      '0%': '#1677ff',
                      '100%': '#52c41a',
                    }}
                    trailColor="rgba(0,0,0,0.08)"
                  />
                  <span>
                    {initialCatalogData?.progress}%
                  </span>
                </Flex>
              )}
            </Flex>

            <Flex align="center" gap={token.marginSM}>
              
              {initialCatalogData?.branchs && initialCatalogData.branchs.length > 0 && selectedBranch && (
                <Select
                  value={selectedBranch}
                  onChange={handleBranchChange}
                  style={{ width: isMobile ? 120 : 180 }}
                  size={isMobile ? "small" : "middle"}
                  options={initialCatalogData.branchs.map((branch: string) => ({ 
                    label: branch, 
                    value: branch 
                  }))}
                  placeholder="选择分支"
                  suffixIcon={<BranchesOutlined />}
                />
              )}

              <Button
                type="primary"
                icon={<ApiOutlined />}
                onClick={() => setIsMCPModalVisible(true)}
                size={isMobile ? "small" : "middle"}
                style={{
                  background: 'linear-gradient(135deg, #1677ff 0%, #36acff 100%)',
                  border: 'none',
                  boxShadow: '0 2px 8px rgba(24, 144, 255, 0.35)',
                  transition: 'all 0.3s ease',
                }}
              >
                添加MCP
              </Button>
              {initialLastUpdated && (
                <Text type="secondary" style={{
                  fontSize: token.fontSizeSM,
                  fontWeight: 500,
                  display: isMobile ? 'none' : 'block'
                }}>
                  最近更新: {initialLastUpdated}
                </Text>
              )}
            </Flex>
          </Flex>
        </Header>
        <Modal
          title={
            <Flex align="center" gap={token.marginXS}>
              <ApiOutlined style={{ color: token.colorPrimary }} />
              <span>MCP接入教程</span>
            </Flex>
          }
          open={isMCPModalVisible}
          onCancel={() => setIsMCPModalVisible(false)}
          footer={null}
          width={700}
          centered
          styles={{
            header: {
              borderBottom: `1px solid rgba(24, 144, 255, 0.15)`,
            },
            body: {
              padding: token.paddingLG,
            },
            mask: {
              backdropFilter: 'blur(4px)',
              background: 'rgba(0, 0, 0, 0.45)',
            },
            content: {
              boxShadow: '0 4px 24px rgba(24, 144, 255, 0.15)',
              borderRadius: 12,
            }
          }}
        >
          <Flex vertical gap={token.marginMD}>
            <Alert
              type="info"
              showIcon
              message="OpenDeepWiki支持MCP（ModelContextProtocol）"
              description={
                <ul style={{ paddingLeft: token.paddingLG, margin: `${token.marginXS}px 0` }}>
                  <li>支持单仓库提供MCPServer，针对单个仓库进行分析</li>
                  <li>通过OpenDeepWiki作为MCPServer，您可以方便地对开源项目进行分析和理解</li>
                </ul>
              }
              style={{ marginBottom: token.marginMD, borderRadius: 8 }}
            />

            <Card
              title="使用配置"
              style={{
                marginBottom: token.marginMD,
                borderRadius: 8,
                boxShadow: '0 2px 12px rgba(0, 0, 0, 0.05)',
                border: '1px solid rgba(24, 144, 255, 0.1)'
              }}
            >
              <Paragraph style={{ marginBottom: token.marginSM }}>
                下面是Cursor的使用方式：
              </Paragraph>

              <div style={{
                position: 'relative',
                backgroundColor: 'rgba(0, 0, 0, 0.02)',
                padding: token.paddingMD,
                borderRadius: 8,
                marginBottom: token.marginMD,
                border: '1px solid rgba(0, 0, 0, 0.05)'
              }}>
                <pre style={{
                  margin: 0,
                  fontFamily: 'Menlo, Monaco, "Courier New", monospace',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  fontSize: 13,
                }}>
                  {mcpJsonString}
                </pre>
                <Tooltip title={copySuccess ? "已复制" : "复制配置"}>
                  <Button
                    type="text"
                    icon={copySuccess ? <CheckOutlined style={{ color: token.colorSuccess }} /> : <CopyOutlined />}
                    onClick={copyToClipboard}
                    style={{
                      position: 'absolute',
                      top: token.paddingXS,
                      right: token.paddingXS
                    }}
                  />
                </Tooltip>
              </div>

              <Flex vertical gap={token.marginSM}>
                <Text strong>配置说明：</Text>
                <ul style={{ paddingLeft: token.paddingLG, margin: 0 }}>
                  <li><Text code>owner</Text>: 是仓库组织或拥有者的名称</li>
                  <li><Text code>name</Text>: 是仓库的名称</li>
                </ul>
              </Flex>
            </Card>

            <Card
              title="测试案例"
              style={{
                borderRadius: 8,
                boxShadow: '0 2px 12px rgba(0, 0, 0, 0.05)',
                border: '1px solid rgba(24, 144, 255, 0.1)'
              }}
            >
              <Paragraph>
                添加好仓库以后尝试进行测试提问（注意，请保证仓库已经处理完成）：
              </Paragraph>
              <Paragraph strong style={{ color: token.colorPrimary }}>
                OpenDeepWiki是什么？
              </Paragraph>
              <div style={{
                width: '100%',
                height: 'auto',
                position: 'relative',
                marginTop: token.marginMD,
                borderRadius: 8,
                overflow: 'hidden',
                border: `1px solid rgba(24, 144, 255, 0.1)`,
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.05)'
              }}>
                <img
                  src="/mcp.png"
                  alt="MCP测试效果"
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
              className={`native-sidebar ${collapsed ? 'collapsed' : ''}`}
              style={{
                width: collapsed ? 0 : 260,
                background: '#ffffff',
                position: 'fixed',
                left: 0,
                top: 64,
                bottom: 0,
                borderRight: collapsed ? 'none' : `1px solid rgba(24, 144, 255, 0.05)`,
                transition: 'all 0.3s',
                boxShadow: isMobile && !collapsed ? '0 2px 8px rgba(0, 0, 0, 0.1)' : 'none',
                zIndex: 990,
                overflowY: 'auto',
                overflowX: 'hidden',
                height: 'calc(100vh - 64px)',
              }}
            >
              <div className="sidebar-header" style={{
                padding: `12px 8px 12px`,
                display: collapsed ? 'none' : 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid rgba(24, 144, 255, 0.08)',
                background: 'rgba(255, 255, 255, 0.97)',
                backdropFilter: 'blur(8px)',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
              }}>
                <div style={{
                  display: 'flex',
                  width: '100%',
                  justifyContent: 'space-between', alignItems: 'center'
                }}>
                  <Button
                    type="primary"
                    size="small"
                    icon={<SaveAll />}
                    onClick={() =>
                      Modal.confirm({
                        title: '导出Markdown',
                        content: '是否将当前文档导出为Markdown格式？',
                        okText: '导出',
                        cancelText: '取消',
                        onOk: () => {
                          ExportMarkdownZip(initialCatalogData.warehouseId)
                            .then(response => {
                              // 返回了blod
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
                                message.error('导出失败，请稍后再试。');
                              }
                            })
                        },
                      })

                    }
                    style={{
                      marginRight: '8px',
                      background: 'linear-gradient(135deg, #1677ff 0%, #36acff 100%)',
                      border: 'none',
                      boxShadow: '0 2px 6px rgba(24, 144, 255, 0.25)',
                      transition: 'all 0.3s ease',
                      height: '32px',
                      fontSize: '13px',
                    }}
                  >
                    导出Markdown
                  </Button>
                  <Button
                    onClick={() => setCollapsed(true)}
                    type='text'
                    className="toggle-button sidebar-toggle"
                    style={{
                      width: '32px',
                      height: '32px',
                      background: 'rgba(24, 144, 255, 0.05)',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                      borderRadius: '4px',
                      fontSize: '14px',
                      color: token.colorPrimary,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'background 0.2s ease',
                      // @ts-ignore
                      '&:hover': {
                        background: 'rgba(24, 144, 255, 0.1)',
                      }
                    }}
                  >
                    <PanelLeftClose size={16} />
                  </Button>
                </div>
              </div>

              <div className={`menu-wrapper ${collapsed ? 'hidden' : ''}`}>
                <Link
                  href={selectedBranch ? `/${owner}/${name}?branch=${selectedBranch}` : `/${owner}/${name}`}
                  className={`menu-item ${pathname === `/${owner}/${name}` ? 'active' : ''}`}
                >
                  <span>概览</span>
                </Link>

                <div className="menu-divider" style={{
                  height: '1px',
                  background: 'rgba(24, 144, 255, 0.1)',
                  margin: '8px 0',
                  padding: 0
                }}></div>

                {initialCatalogData?.items?.map(item => renderSidebarItem(item))}

                <Link
                  href={selectedBranch ? `/${owner}/${name}/changelog?branch=${selectedBranch}` : `/${owner}/${name}/changelog`}
                  className={`menu-item ${pathname === `/${owner}/${name}/changelog` ? 'active' : ''}`}
                >
                  <span>更新日志</span>
                </Link>
              </div>
            </div>) : (
            <></>
          )}

          <Content style={{
            marginLeft: initialCatalogData?.items?.length > 0 ? (collapsed ? 0 : 260) : 0,
            padding: token.paddingLG,
            background: '#f8fafc',
            minHeight: 'calc(100vh - 64px)',
            transition: `all ${token.motionDurationMid}`,
            marginBottom: 100,
            position: 'relative',
          }}>
            {collapsed && initialCatalogData?.items?.length > 0 && (
              <Button
                onClick={() => setCollapsed(false)}
                type='text'
                className="float-toggle-button"
                style={{
                  position: 'fixed',
                  left: 8,
                  top: 82,
                  zIndex: 999,
                  width: 55,
                  height: 55,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 6,

                }}
              >
                <PanelRightClose />
              </Button>
            )}
            <Breadcrumb
              items={generateBreadcrumb()}
              style={{
                marginBottom: token.marginLG,
                fontSize: token.fontSizeSM,
                padding: '12px 16px',
                background: 'rgba(255, 255, 255, 0.8)',
                borderRadius: 8,
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                backdropFilter: 'blur(8px)',
              }}
            />

            <div style={{
              background: '#ffffff',
              padding: token.paddingLG,
              borderRadius: 12,
              boxShadow: '0 2px 12px rgba(0, 0, 0, 0.05)',
              border: '1px solid rgba(24, 144, 255, 0.05)',
              transition: 'box-shadow 0.3s ease',
            }}>
              {children}
            </div>
          </Content>
        </Layout>

        <Footer style={{
          textAlign: 'center',
          background: '#ffffff',
          padding: `${token.paddingSM}px ${token.paddingLG}px`,
          marginTop: 'auto',
          borderTop: `1px solid rgba(24, 144, 255, 0.1)`
        }}>
          <Space direction="vertical" size={token.sizeXS}>
            <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
              Powered by <Text style={{ color: token.colorPrimary, fontWeight: 500 }}>OpenDeepWiki</Text>
            </Text>
            <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
              <GlobalOutlined style={{ marginRight: 4 }} /> Powered by .NET 9.0
            </Text>
          </Space>
        </Footer>
      </Layout>

      <style jsx global>{`
        /* 菜单样式 */
        .menu-item {
          padding: 8px 16px;
          color: rgba(0, 0, 0, 0.85);
          cursor: pointer;
          display: block;
          border-radius: 6px;
          margin: 4px 8px;
          text-decoration: none;
          transition: all 0.3s;
          font-size: 14px;
          overflow: hidden;
          position: relative;
        }
        
        .menu-item.active {
          color: #1677ff;
          background: rgba(24, 144, 255, 0.08);
          font-weight: 500;
        }
        
        .menu-item:hover {
          background: rgba(0, 0, 0, 0.04);
          color: #1677ff;
        }
        
        .menu-item.disabled {
          color: rgba(0, 0, 0, 0.25);
          cursor: not-allowed;
          background: transparent;
        }
        
        .menu-label {
          position: relative;
        }
        
        .update-indicator {
          position: absolute;
          top: 0;
          right: -8px;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background-color: #ff4d4f;
          box-shadow: 0 0 4px #ff4d4f;
        }
        
        .menu-wrapper {
          padding: 8px;
          opacity: 1;
          transition: opacity 0.3s, visibility 0.3s;
        }
        
        .menu-wrapper.hidden {
          display: none;
        }
        
        .toggle-button {
          background: none;
          border: none;
          cursor: pointer;
        }
        
        .toggle-button.sidebar-toggle {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-weight: 500;
          border-radius: 4px;
          transition: all 0.2s;
        }
        
        .toggle-button.sidebar-toggle:hover {
          background: rgba(0, 0, 0, 0.04);
        }
        
        .float-toggle-button {
          transition: all 0.2s;
        }
        
        .float-toggle-button:hover {
          background: #f5f5f5 !important;
          color: #0958d9 !important;
        }
        
        /* 移动端响应 */
        @media screen and (max-width: 768px) {
          .native-sidebar.collapsed {
            width: 0 !important;
            padding: 0;
            overflow: hidden;
            display: none;
          }
          
          .native-sidebar.collapsed .menu-wrapper {
            display: none;
          }
        }
      `}</style>

      {
        initialCatalogData?.items?.length > 0 && (
          <AIInputBar
            owner={owner}
            name={name}
            branch={selectedBranch}
            style={{
              position: 'fixed',
              bottom: token.marginLG,
              left: 0,
              right: 0,
              margin: '0 auto',
              maxWidth: isMobile ? '80%' : '70%',
              width: isMobile ? 'calc(100% - 32px)' : 'auto',
              zIndex: 1001,
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
              borderRadius: 12,
              backdropFilter: 'blur(16px)',
            }}
          />
        )
      }
    </ConfigProvider >
  );
}