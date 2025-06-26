'use client'
import { useState, useEffect } from 'react';
import {
  Typography, Layout, Space, Empty, Row, Col, Pagination, message, ConfigProvider, Divider, Avatar,
} from 'antd';
import {
  PlusOutlined,
  GithubOutlined,
  RocketOutlined,
  StarOutlined,
} from '@ant-design/icons';
import RepositoryForm from './RepositoryForm';
import RepositoryList from './RepositoryList';
import LastRepoModal from './LastRepoModal';
import LanguageSwitcher from './LanguageSwitcher';
import UserAvatar from './UserAvatar';
import { Repository, RepositoryFormValues } from '../types';
import { submitWarehouse } from '../services/warehouseService';
import { HomeStats } from '../services/statsService';
import { unstableSetRender } from 'antd';
import { createRoot } from 'react-dom/client';
import { homepage } from '../const/urlconst';
import { useTranslation } from '../i18n/client';
import { useSearchParams } from 'next/navigation';
import { SearchBar, Button, Tag } from '@lobehub/ui';

const { Content, Footer } = Layout;
const { Title, Paragraph, Text } = Typography;

// 页脚链接配置
const footerLinks = {
  product: [
    { titleKey: 'footer.features', link: 'https://github.com/AIDotNet/OpenDeepWiki/blob/main/README.md' },
    { titleKey: 'footer.guide', link: 'https://github.com/AIDotNet/OpenDeepWiki/blob/main/README.md' },
    { titleKey: 'footer.changelog', link: 'https://github.com/AIDotNet/OpenDeepWiki/blob/main/README.md' },
  ],
  resources: [
    { titleKey: 'footer.docs', link: 'https://github.com/AIDotNet/OpenDeepWiki/blob/main/README.md' },
    { titleKey: 'footer.api', link: 'https://github.com/AIDotNet/OpenDeepWiki/blob/main/README.md' },
    { titleKey: 'footer.faq', link: 'https://github.com/AIDotNet/OpenDeepWiki/issues' },
  ],
  company: [
    { titleKey: 'footer.about', link: 'https://github.com/OpenDeepWiki' },
    { titleKey: 'footer.contact', link: 'mailto:239573049@qq.com' },
    { titleKey: 'footer.join', link: 'https://github.com/AIDotNet/OpenDeepWiki/issues' },
  ],
};

// 赞助商配置
const sponsors = [
  {
    name: 'AntSK',
    logo: 'https://antsk.cn/logo.ico',
    url: 'https://antsk.cn/',
    descriptionKey: 'home.sponsors.antsk.description'
  },
  {
    name: '302.AI',
    logo: 'https://302.ai/logo.ico',
    url: 'https://302.ai/',
    descriptionKey: 'home.sponsors.302ai.description'
  },
  {
    name: '痴者工良',
    logo: 'https://www.whuanle.cn/wp-content/uploads/2020/04/image-1586681324216.png',
    url: 'https://www.whuanle.cn/',
    descriptionKey: 'home.sponsors.whuanle.description'
  }
];

unstableSetRender((node, container) => {
  // @ts-ignore
  container._reactRoot ||= createRoot(container);
  // @ts-ignore
  const root = container._reactRoot;
  root.render(node);
  return async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
    root.unmount();
  };
});

interface HomeClientProps {
  initialRepositories: Repository[];
  initialTotal: number;
  initialPage: number;
  initialPageSize: number;
  initialSearchValue: string;
  initialStats?: Partial<HomeStats>;
}

export default function HomeClient({
  initialRepositories,
  initialTotal,
  initialPage,
  initialPageSize,
  initialSearchValue,
  initialStats
}: HomeClientProps) {
  const repositories = initialRepositories;
  const [formVisible, setFormVisible] = useState(false);
  const [lastRepoModalVisible, setLastRepoModalVisible] = useState(false);
  const [searchValue, setSearchValue] = useState<string>(initialSearchValue);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [isMobile, setIsMobile] = useState(false);

  const searchParams = useSearchParams();
  const { t, i18n } = useTranslation();

  // 监听URL参数变化，更新i18n语言
  useEffect(() => {
    const locale = searchParams.get('locale');
    if (locale) {
      i18n.changeLanguage(locale);
    } else {
      const browserLang = navigator.language;
      const lang = browserLang.includes('zh') ? 'zh-CN' : 'en-US';
      i18n.changeLanguage(lang);
    }
  }, [searchParams, i18n]);

  // 检测窗口大小变化
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleAddRepository = async (values: RepositoryFormValues) => {
    try {
      const response = await submitWarehouse(values);
      if (response.success) {
        message.success(t('home.messages.repo_add_success'));
        window.location.reload();
      } else {
        message.error(t('home.messages.repo_add_failed', { error: response.error || t('home.messages.unknown_error') }));
      }
    } catch (error) {
      console.error('添加仓库出错:', error);
      message.error(t('home.messages.repo_add_error'));
    }
    setFormVisible(false);
  };

  const handleLastRepoQuery = () => {
    setLastRepoModalVisible(true);
  };

  const handlePageChange = (page: number, size?: number) => {
    setCurrentPage(page);
    if (size) setPageSize(size);
    window.location.href = `/?page=${page}&pageSize=${size || pageSize}&keyword=${searchValue}`;
  };

  const handleSearch = (value: string) => {
    setSearchValue(value);
    setCurrentPage(1);
    setPageSize(initialPageSize);
    window.location.href = `/?page=${1}&pageSize=${initialPageSize}&keyword=${value}`;
  };

  // 计算统计数据
  const stats = {
    totalRepositories: initialStats?.totalRepositories || initialTotal || repositories.length,
    openDeepWikiStars: initialStats?.openDeepWikiStars || 0,
  };

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1677ff',
          borderRadius: 8,
          colorBgContainer: '#ffffff',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        },
      }}
    >
      <style jsx global>{`
        * {
          box-sizing: border-box;
        }
        
        .home-layout {
          background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }
        
        .header-wrapper {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          position: sticky;
          top: 0;
          z-index: 1000;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
        }
        
        .header-content {
          max-width: 1400px;
          margin: 0 auto;
          padding: 0 24px;
          height: 72px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        
        .logo-section {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-shrink: 0;
        }
        
        .nav-section {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-shrink: 0;
        }
        
        .main-content {
          flex: 1;
          max-width: 1400px;
          margin: 0 auto;
          width: 100%;
          padding: 0 24px;
        }
        
        .hero-banner {
          text-align: center;
          backdrop-filter: blur(10px);
        }
        
        .hero-title {
          font-size: clamp(36px, 5vw, 56px) !important;
          font-weight: 700 !important;
          margin-bottom: 24px !important;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          line-height: 1.2;
        }
        
        .hero-subtitle {
          font-size: 20px !important;
          color: #64748b !important;
          margin-bottom: 40px !important;
          max-width: 600px;
          margin-left: auto;
          margin-right: auto;
          line-height: 1.6;
        }
        
        .hero-actions {
          display: flex;
          gap: 16px;
          justify-content: center;
          flex-wrap: nowrap;
        }
        
        .content-section {
          border-radius: 16px;
          padding: 32px;
          margin-bottom: 32px;
          backdrop-filter: blur(10px);
        }
        
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 32px;
          flex-wrap: wrap;
          gap: 16px;
        }
        
        .section-title {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
          min-width: 200px;
        }
        
        .section-actions {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }
        
        .search-container {
          min-width: 300px;
        }
        
        .empty-state {
          text-align: center;
          padding: 80px 24px;
          background: rgba(248, 250, 252, 0.8);
          border-radius: 12px;
        }
        
        .pagination-wrapper {
          text-align: center;
          margin-top: 40px;
          padding-top: 32px;
        }
        
        .footer-wrapper {
          background: rgba(255, 255, 255, 0.95);
          margin-top: 48px;
          backdrop-filter: blur(10px);
        }
        
        .footer-content {
          max-width: 1400px;
          margin: 0 auto;
          padding: 48px 24px 32px;
        }
        
        .sponsors-grid {
          margin-bottom: 48px;
        }
        
        .sponsor-item {
          padding: 24px;
          border-radius: 12px;
          transition: all 0.3s ease;
          background: rgba(255, 255, 255, 0.6);
          text-decoration: none;
          display: block;
        }
        
        .sponsor-item:hover {
          background: rgba(255, 255, 255, 0.9);
          transform: translateY(-4px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
        }
        
        .footer-links-grid {
          margin-bottom: 32px;
        }
        
        .footer-bottom {
          padding-top: 32px;
        }
        
        .github-button {
          display: flex !important;
          align-items: center !important;
          gap: 8px !important;
          padding: 8px 16px !important;
          border-radius: 8px !important;
          background: rgba(0, 0, 0, 0.04) !important;
          border: none !important;
          transition: all 0.2s ease !important;
        }
        
        .github-button:hover {
          background: rgba(0, 0, 0, 0.08) !important;
          transform: translateY(-1px) !important;
        }
        
        .star-count {
          display: flex;
          align-items: center;
          gap: 4px;
          color: #64748b;
          font-size: 14px;
          font-weight: 500;
        }
        
        @media (max-width: 768px) {
          .header-content {
            padding: 0 16px;
            height: 64px;
          }
          
          .main-content {
            padding: 0 16px;
          }
          
          .hero-banner {
            margin: 16px 0 32px;
            padding: 48px 24px 40px;
          }
          
          .hero-actions {
            flex-direction: column;
            align-items: center;
          }
          
          .content-section {
            padding: 24px 16px;
            margin-bottom: 24px;
          }
          
          .section-header {
            flex-direction: column;
            align-items: stretch;
          }
          
          .search-container {
            min-width: auto;
            width: 100%;
          }
          
          .footer-content {
            padding: 32px 16px 24px;
          }
          
          .sponsor-item {
            padding: 16px;
          }
        }
        
        @media (max-width: 480px) {
          .nav-section {
            gap: 8px;
          }
          
          .hero-title {
            font-size: 32px !important;
          }
          
          .hero-subtitle {
            font-size: 16px !important;
          }
        }
      `}</style>

      <Layout className="home-layout">
        {/* 顶部导航 */}
        <div className="header-wrapper">
          <div className="header-content">
            <div className="logo-section">
              <Avatar src="/logo.png" size={48} />
              <Title level={2} style={{ margin: 0, fontWeight: 700, color: '#1e293b' }}>
                OpenDeepWiki
              </Title>
            </div>

            <div className="nav-section">
              <LanguageSwitcher />
              <Button
                href={homepage}
                target="_blank"
                icon={<GithubOutlined />}
              >
                <div className="star-count">
                  <StarOutlined style={{ color: '#fbbf24' }} />
                  <span>
                    {stats.openDeepWikiStars >= 1000
                      ? stats.openDeepWikiStars >= 10000
                        ? `${Math.floor(stats.openDeepWikiStars / 1000)}k`
                        : `${(stats.openDeepWikiStars / 1000).toFixed(1)}k`
                      : stats.openDeepWikiStars.toString()
                    }
                  </span>
                </div>
              </Button>
              <UserAvatar />
            </div>
          </div>
        </div>

        {/* 主要内容 */}
        <Content>
          <div className="main-content">
            {/* Hero 区域 */}
            <div className="hero-banner">
              <Title className="hero-title">
                {t('home.title')}
              </Title>

              <Paragraph className="hero-subtitle">
                {t('home.subtitle')}
              </Paragraph>

            </div>

            {/* 仓库列表区域 */}
            <div className="content-section">
              <div className="section-header">
                <div className="section-actions" style={{ width: '100%', justifyContent: 'center' }}>
                  <div className="search-container">
                    <div className="hero-actions">
                      <SearchBar
                        placeholder={t('home.repo_list.search_placeholder')}
                        allowClear
                        value={searchValue}
                        onSearch={handleSearch}
                        onChange={e => setSearchValue(e.target.value)}
                        size="large"
                        style={{
                          width: '100%',
                          minWidth: '450px'
                        }}
                      />
                      <Button
                        type="primary"
                        size="large"
                        onClick={() => setFormVisible(true)}
                      >
                        {t('home.add_repo_button')}
                      </Button>
                      <Button
                        size="large"
                        onClick={handleLastRepoQuery}
                      >
                        {t('home.query_last_repo_button')}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {repositories.length === 0 ? (
                <div className="empty-state">
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    imageStyle={{ height: 80 }}
                    description={
                      <div>
                        <Text style={{ color: '#64748b', fontSize: 18, display: 'block', marginBottom: 8 }}>
                          {searchValue ? t('home.repo_list.not_found', { keyword: searchValue }) : t('home.repo_list.empty')}
                        </Text>
                        <Text style={{ color: '#94a3b8', fontSize: 14 }}>
                          {searchValue ? '尝试调整搜索关键词' : '开始添加您的第一个代码仓库'}
                        </Text>
                      </div>
                    }
                  >
                    <Button
                      type="primary"
                      onClick={() => setFormVisible(true)}
                      size="large"
                      icon={<PlusOutlined />}
                      style={{
                        marginTop: 16,
                        height: 48,
                        padding: '0 32px',
                        fontSize: 16,
                        boxShadow: '0 4px 12px rgba(22, 119, 255, 0.3)'
                      }}
                    >
                      {t('home.repo_list.add_now')}
                    </Button>
                  </Empty>
                </div>
              ) : (
                <>
                  <RepositoryList repositories={repositories} />
                  {!searchValue && initialTotal > pageSize && (
                    <div className="pagination-wrapper">
                      <Pagination
                        current={currentPage}
                        pageSize={pageSize}
                        total={initialTotal}
                        onChange={handlePageChange}
                        showSizeChanger
                        showQuickJumper
                        showTotal={(total) => t('home.pagination.total', { total })}
                        size="default"
                      />
                    </div>
                  )}
                </>
              )}
            </div>

            {/* 模态框 */}
            <RepositoryForm
              open={formVisible}
              onCancel={() => setFormVisible(false)}
              onSubmit={handleAddRepository}
            />

            <LastRepoModal
              open={lastRepoModalVisible}
              onCancel={() => setLastRepoModalVisible(false)}
            />
          </div>
        </Content>

        {/* 页脚 */}
        <Footer className="footer-wrapper">
          <div className="footer-content">
            {/* 赞助商区域 */}
            <div className="sponsors-grid">
              <Title level={3} style={{ textAlign: 'center', marginBottom: 32, color: '#1e293b' }}>
                {t('home.sponsors.title')}
              </Title>
              <Row gutter={[24, 24]} justify="center">
                {sponsors.map((sponsor, index) => (
                  <Col key={index} xs={24} sm={12} lg={8}>
                    <a
                      href={sponsor.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="sponsor-item"
                    >
                      <Space direction="vertical" align="center" size="middle" style={{ width: '100%' }}>
                        <Avatar src={sponsor.logo} size={56} />
                        <div style={{ textAlign: 'center' }}>
                          <Text style={{ fontWeight: 600, fontSize: 16, display: 'block', color: '#1e293b' }}>
                            {sponsor.name}
                          </Text>
                          <Text style={{ color: '#64748b', fontSize: 14 }}>
                            {t(sponsor.descriptionKey)}
                          </Text>
                        </div>
                      </Space>
                    </a>
                  </Col>
                ))}
              </Row>
            </div>

            <Divider />

            {/* 页脚链接 */}
            <Row gutter={[48, 32]} className="footer-links-grid">
              <Col xs={24} lg={8}>
                <div>
                  <Space align="center" style={{ marginBottom: 20 }}>
                    <Avatar src="/logo.png" size={40} />
                    <Title level={3} style={{ margin: 0, color: '#1e293b' }}>
                      OpenDeepWiki
                    </Title>
                  </Space>
                  <Paragraph style={{ color: '#64748b', marginBottom: 20, fontSize: 16, lineHeight: 1.6 }}>
                    {t('description')}
                  </Paragraph>
                  <Space size="middle" wrap>
                    <Button
                      type="text"
                      icon={<GithubOutlined />}
                      href={homepage}
                      target="_blank"
                      style={{ color: '#64748b' }}
                    />
                    <Tag color="blue" style={{ fontSize: 12 }}>.NET 9.0</Tag>
                    <Tag color="green" style={{ fontSize: 12 }}>{t('home.tags.open_source')}</Tag>
                  </Space>
                </div>
              </Col>

              <Col xs={24} lg={16}>
                <Row gutter={[32, 24]}>
                  <Col xs={12} sm={8}>
                    <Title level={4} style={{ marginBottom: 20, color: '#1e293b' }}>
                      {t('footer.product')}
                    </Title>
                    <Space direction="vertical" size="middle">
                      {footerLinks.product.map(link => (
                        <a
                          key={link.titleKey}
                          href={link.link}
                          style={{ color: '#64748b', fontSize: 14 }}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {t(link.titleKey)}
                        </a>
                      ))}
                    </Space>
                  </Col>

                  <Col xs={12} sm={8}>
                    <Title level={4} style={{ marginBottom: 20, color: '#1e293b' }}>
                      {t('footer.resources')}
                    </Title>
                    <Space direction="vertical" size="middle">
                      {footerLinks.resources.map(link => (
                        <a
                          key={link.titleKey}
                          href={link.link}
                          style={{ color: '#64748b', fontSize: 14 }}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {t(link.titleKey)}
                        </a>
                      ))}
                    </Space>
                  </Col>

                  <Col xs={12} sm={8}>
                    <Title level={4} style={{ marginBottom: 20, color: '#1e293b' }}>
                      {t('footer.company')}
                    </Title>
                    <Space direction="vertical" size="middle">
                      {footerLinks.company.map(link => (
                        <a
                          key={link.titleKey}
                          href={link.link}
                          style={{ color: '#64748b', fontSize: 14 }}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {t(link.titleKey)}
                        </a>
                      ))}
                    </Space>
                  </Col>
                </Row>
              </Col>
            </Row>

            {/* 页脚底部 */}
            <div className="footer-bottom">
              <Row justify="space-between" align="middle" gutter={[16, 16]}>
                <Col xs={24} sm={12}>
                  <Space direction="vertical" size={8}>
                    <Text style={{ color: '#64748b', fontSize: 14 }}>
                      {t('footer.copyright', { year: new Date().getFullYear() })}
                    </Text>
                    <Text style={{ color: '#64748b', fontSize: 14 }}>
                      {t('footer.powered_by')}
                      <span style={{ color: '#1677ff', fontWeight: 600, marginLeft: 4 }}>.NET 9.0</span> &
                      <span style={{ color: '#52c41a', fontWeight: 600, marginLeft: 4 }}>Semantic Kernel</span>
                    </Text>
                  </Space>
                </Col>

                <Col xs={24} sm={12} style={{ textAlign: isMobile ? 'left' : 'right' }}>
                  <Space split={<Divider type="vertical" />} wrap>
                    <a href="/privacy" style={{ color: '#64748b', fontSize: 14 }}>
                      {t('footer.privacy')}
                    </a>
                    <a href="/terms" style={{ color: '#64748b', fontSize: 14 }}>
                      {t('footer.terms')}
                    </a>
                    <Text style={{ color: '#94a3b8', fontSize: 14 }}>
                      v2.0.0
                    </Text>
                  </Space>
                </Col>
              </Row>
            </div>
          </div>
        </Footer>
      </Layout>
    </ConfigProvider>
  );
} 