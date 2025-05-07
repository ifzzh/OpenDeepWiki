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
} from 'antd';
import {
  HomeOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import AIInputBar from '../../components/AIInputBar';

const { Header, Content, Sider } = Layout;
const { Title, Text } = Typography;

interface DocumentCatalogResponse {
  key: string;
  label: string;
  url: string;
  order: number;
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
  const { token } = theme.useToken();

  const pathParts = pathname.split('/').filter(Boolean);
  const currentPath = pathParts.slice(2).join('/');

  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

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

  const renderSidebarItem = (item: DocumentCatalogResponse, level = 0) => {
    const isActive = pathname.includes(`/${item.url}`);

    const style = {
      padding: `${token.paddingXS}px ${token.paddingLG}px`,
      paddingLeft: `${token.paddingLG + level * token.paddingMD}px`,
      color: isActive ? token.colorPrimary : token.colorText,
      cursor: 'pointer',
      backgroundColor: isActive ? token.colorBgTextActive : 'transparent',
      transition: `all ${token.motionDurationMid}`,
      display: 'flex',
      alignItems: 'center',
      textDecoration: 'none',
      fontWeight: isActive ? 500 : 400,
      margin: `5px 0`,
      borderRadius: token.borderRadiusLG,
      fontSize: token.fontSizeSM,
      lineHeight: token.lineHeight,
    };

    const iconStyle = {
      marginRight: token.marginXS,
      fontSize: token.fontSizeSM,
    };

    return (
      <div key={item.key}>
        {item.children?.length ? (
          <>
            <Link
              href={`/${owner}/${name}/${item.url}`}
              style={style}>
              <span>{item.label}</span>
            </Link>
            {item.children.sort((a, b) => a.order - b.order).map(child =>
              renderSidebarItem(child, level + 1)
            )}
          </>
        ) : (
          <Link
            href={`/${owner}/${name}/${item.url}`}
            style={style}
          >
            <span>{item.label}</span>
          </Link>
        )}
      </div>
    );
  };

  const generateBreadcrumb = () => {
    const items = [
      {
        title: <Link href="/"><HomeOutlined /></Link>,
      },
      {
        title: <Link href={`/${owner}`}>{owner}</Link>,
      },
      {
        title: <Link href={`/${owner}/${name}`}>{name}</Link>,
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
        components: {
          Layout: {
            headerBg: token.colorBgElevated,
            siderBg: token.colorBgContainer,
            bodyBg: token.colorBgLayout,
          },
          FloatButton: {
            colorPrimary: token.colorPrimary,
          }
        },
      }}
    >
      <Layout style={{ minHeight: '100vh' }}>
        <Header style={{
          padding: `0 ${token.paddingLG}px`,
          background: token.colorBgContainer,
          position: 'fixed',
          width: '100%',
          zIndex: 1000,
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
          boxShadow: token.boxShadowSecondary
        }}>
          <Flex align="center" justify="space-between" style={{ height: '100%' }}>
            <Flex align="center" gap={token.marginXS}>
              <Button
                type="text"
                icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                onClick={() => setCollapsed(!collapsed)}
                style={{ fontSize: token.fontSizeLG }}
              />
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
                      window.open(`/${owner}`, '_blank');
                    }}
                    style={{
                      color: token.colorPrimary,
                      fontSize: isMobile ? token.fontSizeHeading5 : token.fontSizeHeading4,
                      lineHeight: 1.2,
                      cursor: 'pointer',
                      marginRight: token.marginXS,
                    }}>{owner}</span>
                  <span
                    style={{
                      color: token.colorText,
                      fontSize: isMobile ? token.fontSizeHeading5 : token.fontSizeHeading4,
                      lineHeight: 1.2,
                      cursor: 'default',
                      marginRight: token.marginXS,
                    }}>
                    / 
                  </span>
                  <span
                    onClick={() => {
                      if (initialCatalogData?.git) {
                        window.open(initialCatalogData.git, '_blank');
                      }
                    }}
                    style={{
                      color: token.colorText,
                      fontSize: isMobile ? token.fontSizeHeading5 : token.fontSizeHeading4,
                      lineHeight: 1.2,
                      cursor: 'pointer',
                      marginRight: token.marginXS,
                    }}>{name}</span>
                </Flex>
              </Typography.Title>
            </Flex>

            <Flex align="center" gap={token.marginSM}>
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

        <Layout
          className={initialCatalogData?.items?.length > 0 ? 'ant-layout-content' : 'ant-layout-content-mobile'}
          style={{
            marginTop: 64,
          }}>
          {initialCatalogData?.items?.length > 0 && isMobile && !collapsed && (
            <div
              onClick={() => setCollapsed(true)}
              style={{
                position: 'fixed',
                top: 64,
                left: 0,
                right: 0,
                bottom: 0,
                background: token.colorBgMask,
                zIndex: 998,
                opacity: 0.5,
              }}
            />
          )}
          {initialCatalogData?.items?.length > 0 ? (
            <Sider
              width={260}
              collapsible
              collapsed={collapsed}
              onCollapse={setCollapsed}
              trigger={null}
              breakpoint="lg"
              collapsedWidth={isMobile ? 0 : 80}
              style={{
                background: token.colorBgContainer,
                overflow: 'auto',
                height: 'calc(100vh - 64px)',
                position: 'fixed',
                left: 0,
                top: 64,
                bottom: 0,
                borderRight: `1px solid ${token.colorBorderSecondary}`,
                transition: `all ${token.motionDurationMid}`,
                boxShadow: isMobile && !collapsed ? token.boxShadowSecondary : 'none',
              }}
            >
              <div style={{ padding: `${token.paddingMD}px 0` }}>
                <Flex
                  vertical
                  style={{ padding: `0 ${token.paddingXS}px` }}
                >
                  <Link
                    href={`/${owner}/${name}`}
                    style={{
                      padding: `${token.paddingXS}px ${token.paddingLG}px`,
                      color: pathname === `/${owner}/${name}` ? token.colorPrimary : token.colorText,
                      backgroundColor: pathname === `/${owner}/${name}` ? token.colorBgTextActive : 'transparent',
                      fontWeight: pathname === `/${owner}/${name}` ? 500 : 400,
                      display: 'flex',
                      alignItems: 'center',
                      textDecoration: 'none',
                      borderRadius: token.borderRadiusLG,
                      marginBottom: token.marginXS,
                      transition: `all ${token.motionDurationMid}`,
                    }}
                  >
                    <HomeOutlined style={{ marginRight: token.marginXS }} />
                    <span>概览</span>
                  </Link>

                  <Divider style={{ margin: `0`, padding: '0' }} />

                  {initialCatalogData?.items?.map(item => renderSidebarItem(item))}

                  <Link
                    href={`/${owner}/${name}/changelog`}
                    style={{
                      padding: `${token.paddingXS}px ${token.paddingLG}px`,
                      color: pathname === `/${owner}/${name}/changelog` ? token.colorPrimary : token.colorText,
                      backgroundColor: pathname === `/${owner}/${name}/changelog` ? token.colorBgTextActive : 'transparent',
                      fontWeight: pathname === `/${owner}/${name}/changelog` ? 500 : 400,
                      display: 'flex',
                      alignItems: 'center',
                      textDecoration: 'none',
                      borderRadius: token.borderRadiusLG,
                      marginBottom: token.marginXS,
                    }}
                  >
                    <span>更新日志</span>
                  </Link>
                </Flex>
              </div>
            </Sider>) : (
            <></>
          )}

          <Content style={{
            marginLeft: collapsed ? 0 : 260,
            padding: token.paddingLG,
            background: token.colorBgContainer,
            minHeight: 'calc(100vh - 64px)',
            transition: `all ${token.motionDurationMid}`,
            position: 'relative',
          }}>
            <Breadcrumb
              items={generateBreadcrumb()}
              style={{
                marginBottom: token.marginLG,
                fontSize: token.fontSizeSM
              }}
            />

            <div style={{
              background: token.colorBgContainer,
              padding: token.paddingLG,
              borderRadius: token.borderRadiusLG,
              boxShadow: token.boxShadowTertiary
            }}>
              {children}
            </div>

          </Content>
        </Layout>
      </Layout>
      {initialCatalogData?.items?.length > 0 && (
        <AIInputBar
          owner={owner}
          name={name}
          style={{
            position: 'fixed',
            bottom: token.marginLG,
            left: 0,
            right: 0,
            margin: '0 auto',
            maxWidth: isMobile ? '90%' : '80%',
            width: isMobile ? 'calc(100% - 32px)' : 'auto',
            zIndex: 900,
            boxShadow: token.boxShadowSecondary,
            borderRadius: token.borderRadiusLG,
          }}
        />
      )}
    </ConfigProvider>
  );
} 