'use client'
import { Layout, Typography, Spin, Space, theme, ConfigProvider, Flex } from 'antd';
import { FolderOutlined, FileTextOutlined, GithubOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { documentCatalog } from '../../services/warehouseService';
const { Header, Content, Sider } = Layout;
const { Title, Text } = Typography;

interface DocumentCatalogResponse {
  key: string;
  label: string;
  url: string;
  order: number;
  children?: DocumentCatalogResponse[];
}

// 递归生成菜单项
const generateMenuItems = (
  data: DocumentCatalogResponse,
  parentKey: string = '',
  owner: string,
  name: string
) => {
  const key = parentKey ? `${parentKey}-${data.key}` : data.key;
  const item = {
    key,
    icon: data.children?.length ? <FolderOutlined /> : <FileTextOutlined />,
    label: data.children?.length
      ? data.label
      : <Link href={`/${owner}/${name}/${data.url}`}>{data.label}</Link>,
  };

  if (data.children?.length) {
    return {
      ...item,
      children: data.children
        .sort((a, b) => a.order - b.order)
        .map(child => generateMenuItems(child, key, owner, name))
    };
  }

  return item;
};

export default function RepositoryLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { owner: string; name: string };
}) {
  const pathname = usePathname();
  const { token } = theme.useToken();

  // 从路由路径解析 owner 和 name
  const pathParts = pathname.split('/').filter(Boolean);
  const owner = pathParts[0] || '';
  const name = pathParts[1] || '';

  const [docItems, setDocItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState('');

  // 根据路径判断当前选中的菜单项
  const selectedKey = pathname.includes('/') ? 'docs' : 'overview';

  useEffect(() => {
    if (!owner || !name) return;

    const fetchDocumentCatalog = async () => {
      setLoading(true);
      try {
        const response = await documentCatalog(owner, name);
        setDocItems(response.data);
        // Set a mock last updated date - in production this would come from API
        setLastUpdated(`27 April 2025 (e96b16)`);
      } catch (error) {
        console.error('Failed to fetch document catalog:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDocumentCatalog();
  }, [owner, name, selectedKey]);

  const renderSidebarItem = (item: DocumentCatalogResponse, level = 0) => {
    const isActive = pathname.includes(`/${item.url}`);
    const style = {
      padding: '8px 24px',
      paddingLeft: `${24 + level * 16}px`,
      color: isActive ? token.colorBgSpotlight : token.colorTextSecondary,
      cursor: 'pointer',
      backgroundColor: isActive ? token.colorBgTextHover : 'transparent',
      transition: 'all 0.3s',
      display: 'block',
      textDecoration: 'none',
      fontWeight: isActive ? 500 : 400,
      margin: '4px 0',
      borderRadius: token.borderRadiusSM,
    };

    return (
      <div key={item.key}>
        {item.children?.length ? (
          <>
            <div style={style}>
              {item.label}
            </div>
            {item.children.sort((a, b) => a.order - b.order).map(child =>
              renderSidebarItem(child, level + 1)
            )}
          </>
        ) : (
          <Link
            href={`/${owner}/${name}/${item.url}`}
            style={style}
          >
            {item.label}
          </Link>
        )}
      </div>
    );
  };

  return (
    <ConfigProvider
      theme={{
        components: {
          Layout: {
            headerBg: token.colorBgElevated,
            siderBg: token.colorBgContainer,
          },
        },
      }}
    >
      <Layout style={{ minHeight: '100vh' }}>
        <Header style={{
          padding: 0,
          background: token.colorBgContainer,
          position: 'fixed',
          width: '100%',
          zIndex: 1000,
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
          boxShadow: token.boxShadow
        }}>
          <Flex align="center" style={{ height: '100%', padding: `0 ${token.paddingLG}px` }}>
            <span style={{ display: 'flex', alignItems: 'center' }}>
              <Space size={token.sizeMD}>
                <GithubOutlined style={{ fontSize: token.fontSizeHeading4, color: token.colorPrimary }} />
                <Title
                  level={4}
                  style={{
                    margin: 0,
                    color: token.colorText,
                    fontSize: token.fontSizeHeading4,
                    lineHeight: 1.2,
                    letterSpacing: '0.5px',
                    fontWeight: token.fontWeightStrong
                  }}
                >
                  <span style={{ fontSize: token.fontSizeHeading4, color: token.colorPrimary }}>
                    {owner}
                    /
                    {name}
                  </span>
                </Title>
              </Space>
            </span>
          </Flex>
        </Header>
        <Layout style={{ marginTop: 64 }}>
          <Sider
            width={260}
            style={{
              background: token.colorBgElevated,
              overflow: 'auto',
              height: 'calc(100vh - 64px)',
              position: 'fixed',
              left: 0,
              top: 64,
              bottom: 0,
              borderRight: `1px solid ${token.colorBorderSecondary}`,
            }}
          >
            <div style={{ padding: `${token.paddingMD}px 0` }}>
              <Text
                type="secondary"
                style={{
                  padding: `0 ${token.paddingLG}px`,
                  display: 'block',
                  fontSize: token.fontSizeSM,
                  opacity: 0.8
                }}
              >
                Last updated: {lastUpdated}
              </Text>

              <div style={{ marginTop: token.marginMD }}>
                <Link
                  href={`/${owner}/${name}`}
                  style={{
                    padding: `${token.paddingXS}px ${token.paddingLG}px`,
                    color: pathname === `/${owner}/${name}` ? token.colorBgSpotlight : token.colorTextSecondary,
                    backgroundColor: pathname === `/${owner}/${name}` ? token.colorBgTextHover : 'transparent',
                    fontWeight: pathname === `/${owner}/${name}` ? token.fontWeightStrong : 400,
                    display: 'block',
                    textDecoration: 'none',
                    margin: `${token.marginXS}px 0`,
                    borderRadius: token.borderRadiusSM,
                  }}
                >
                  Overview
                </Link>

                {loading ? (
                  <div style={{ padding: token.paddingLG, textAlign: 'center' }}>
                    <Spin size="small" />
                  </div>
                ) : (
                  docItems.map(item => renderSidebarItem(item))
                )}
              </div>
            </div>
          </Sider>
          <Content style={{
            marginLeft: 260,
            padding: token.paddingLG,
            background: token.colorBgLayout,
            minHeight: 'calc(100vh - 64px)'
          }}>
            {children}
          </Content>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
} 