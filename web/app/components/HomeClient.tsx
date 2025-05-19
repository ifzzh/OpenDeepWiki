'use client'
import { useState, useEffect } from 'react';
import { Button, Typography, Layout, Space, Input, Empty, Card, Row, Col, Statistic, Tooltip, Pagination, message, ConfigProvider, Badge, Divider, Avatar, Tag } from 'antd';
import {
  PlusOutlined,
  GithubOutlined,
  FireOutlined,
  SearchOutlined,
  BookOutlined,
} from '@ant-design/icons';
import RepositoryForm from './RepositoryForm';
import RepositoryList from './RepositoryList';
import LastRepoModal from './LastRepoModal';
import LanguageSwitcher from './LanguageSwitcher';
import { Repository, RepositoryFormValues } from '../types';
import { submitWarehouse } from '../services/warehouseService';
import { unstableSetRender } from 'antd';
import { createRoot } from 'react-dom/client';
import { homepage } from '../const/urlconst';
import { useTranslation } from '../i18n/client';
import { useSearchParams } from 'next/navigation';

const { Content, Header, Footer } = Layout;
const { Title, Paragraph } = Typography;
const { Search } = Input;

// 增强的主题配置
const customTheme = {
  token: {
    colorPrimary: '#6366f1', // 更紫色调的主色
    colorSuccess: '#22c55e',
    colorError: '#ef4444',
    colorWarning: '#f59e0b',
    colorBgContainer: '#ffffff',
    colorBgLayout: '#f8fafc', // 浅蓝背景
    colorText: '#1e293b', // 更暗的文本色
    colorTextSecondary: '#64748b',
    borderRadius: 8, // 增加圆角
    fontSizeHeading2: 30, // 增大标题
    fontSizeHeading3: 22,
    fontSizeBase: 14,
    lineHeight: 1.6, // 增加行高
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
    fontFamily: '"PingFang SC", "Microsoft YaHei", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  components: {
    Button: {
      colorPrimary: '#6366f1',
      algorithm: true,
      borderRadius: 6,
      controlHeight: 40,
      paddingInline: 18, // 增加内边距
    },
    Card: {
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
      borderRadius: 12,
      colorBgContainer: '#ffffff',
    },
    Input: {
      borderRadius: 6,
      controlHeight: 40,
    },
    Message: {
      duration: 0.1,
    },
    Modal: {
      borderRadius: 12,
    },
    Dropdown: {
      motion: false,
    },
    Pagination: {
      motion: false,
      colorPrimary: '#6366f1',
    },
    Tooltip: {
      motion: false,
      colorBgSpotlight: 'rgba(0, 0, 0, 0.85)',
    },
    Statistic: {
      fontSizeTitle: 14,
      fontSizeValue: 26,
      colorText: '#1e293b',
    },
  },
};

// 添加页脚链接配置
const footerLinks = {
  product: [
    { title: '功能介绍', link: 'https://github.com/AIDotNet/OpenDeepWiki/blob/main/README.md' },
    { title: '使用指南', link: 'https://github.com/AIDotNet/OpenDeepWiki/blob/main/README.md' },
    { title: '更新日志', link: 'https://github.com/AIDotNet/OpenDeepWiki/blob/main/README.md' },
  ],
  resources: [
    { title: '开发文档', link: 'https://github.com/AIDotNet/OpenDeepWiki/blob/main/README.md' },
    { title: 'API参考', link: 'https://github.com/AIDotNet/OpenDeepWiki/blob/main/README.md' },
    { title: '常见问题', link: 'https://github.com/AIDotNet/OpenDeepWiki/issues' },
  ],
  company: [
    { title: '关于我们', link: 'https://github.com/OpenDeepWiki' },
    { title: '联系方式', link: 'mailto:239573049@qq.com' },
    { title: '加入我们', link: 'https://github.com/AIDotNet/OpenDeepWiki/issues' },
  ],
};

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
}

export default function HomeClient({ initialRepositories, initialTotal, initialPage, initialPageSize, initialSearchValue }: HomeClientProps) {
  const [repositories, setRepositories] = useState<Repository[]>(initialRepositories);
  const [formVisible, setFormVisible] = useState(false);
  const [lastRepoModalVisible, setLastRepoModalVisible] = useState(false);
  const [searchValue, setSearchValue] = useState<string>(initialSearchValue);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [isHovering, setIsHovering] = useState('');

  // 响应式状态
  const [isMobile, setIsMobile] = useState(false);
  
  // 获取URL参数
  const searchParams = useSearchParams();

  // 使用i18n
  const { t, i18n } = useTranslation();
  
  // 监听URL参数变化，更新i18n语言
  useEffect(() => {
    const locale = searchParams.get('locale');
    if (locale) {
      i18n.changeLanguage(locale);
    } else {
      // 如果URL中没有locale参数，则根据浏览器语言设置
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

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handleAddRepository = async (values: RepositoryFormValues) => {
    try {
      const response = await submitWarehouse(values);
      if (response.success) {
        message.config({
          duration: 1.5,
        });
        message.success('仓库添加成功');
        // 刷新页面以获取最新数据
        window.location.reload();
      } else {
        message.config({
          duration: 1.5,
        });
        message.error('添加仓库失败: ' + (response.error || '未知错误'));
      }
    } catch (error) {
      console.error('添加仓库出错:', error);
      message.config({
        duration: 1.5,
      });
      message.error('添加仓库出错，请稍后重试');
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
    totalRepositories: initialTotal || repositories.length,
    gitRepos: repositories.filter(repo => repo.type === 'git').length,
    lastUpdated: repositories.length ? new Date(
      Math.max(...repositories.map(repo => new Date(repo.createdAt).getTime()))
    ).toLocaleDateString('zh-CN') : '-'
  };

  // 生成波浪背景的SVG
  const waveSvg = `
  <svg width="100%" height="100%" id="svg" viewBox="0 0 1440 400" xmlns="http://www.w3.org/2000/svg">
    <path d="M 0,400 C 0,400 0,200 0,200 C 114.35714285714289,165.85714285714283 228.71428571428578,131.71428571428572 351,133 C 473.2857142857142,134.28571428571428 603.4999999999998,171 713,192 C 822.5000000000002,213 911.2857142857144,218.28571428571428 1029,214 C 1146.7142857142856,209.71428571428572 1293.3571428571427,195.85714285714286 1440,182 C 1440,182 1440,400 1440,400 Z" 
    fill="#6366f1" fill-opacity="0.06"></path>
    <path d="M 0,400 C 0,400 0,266 0,266 C 93.53571428571428,293.67857142857144 187.07142857142856,321.35714285714283 311,325 C 434.92857142857144,328.64285714285717 589.25,308.25 724,288 C 858.75,267.75 973.9285714285713,247.64285714285714 1087,242 C 1200.0714285714287,236.35714285714286 1311.0357142857142,245.17857142857142 1422,254 C 1422,254 1422,400 1422,400 Z" 
    fill="#6366f1" fill-opacity="0.1"></path>
  </svg>
  `;

  // 动态波浪背景样式
  const waveBgStyle = {
    backgroundImage: `url("data:image/svg+xml;utf8,${encodeURIComponent(waveSvg)}")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'bottom',
    backgroundSize: 'cover',
  };

  const contentStyle = {
    padding: '40px 16px',
    background: '#f8fafc',
    minHeight: 'calc(100vh - 70px - 64px)', // 减去头部和底部高度
    position: 'relative' as const,
    zIndex: 1,
    ...waveBgStyle
  };

  const pageContainerStyle = {
    maxWidth: 1280,
    margin: '0 auto'
  };

  const cardStyle = {
    borderRadius: 16,
    marginBottom: 32,
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -4px rgba(0, 0, 0, 0.05)',
    border: 'none',
    overflow: 'hidden',
    transition: 'all 0.3s ease',
    backdropFilter: 'blur(4px)',
    background: 'rgba(255, 255, 255, 0.9)'
  };

  const welcomeTitleStyle = {
    fontSize: '2.5rem',
    fontWeight: 700,
    marginBottom: 16,
    color: customTheme.token.colorText,
    background: 'linear-gradient(90deg, #6366f1 0%, #8b5cf6 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    display: 'inline-block'
  };

  const paragraphStyle = {
    fontSize: 16,
    marginBottom: 32,
    color: customTheme.token.colorTextSecondary,
    lineHeight: 1.8,
    maxWidth: '90%'
  };

  const buttonStyle = {
    height: 44,
    fontWeight: 500,
    boxShadow: 'none',
    transition: 'all 0.3s ease',
    borderRadius: 8,
    fontSize: 15
  };

  const primaryButtonStyle = {
    ...buttonStyle,
    background: 'linear-gradient(90deg, #6366f1 0%, #8b5cf6 100%)',
    border: 'none'
  };

  const searchStyle = {
    width: isMobile ? '100%' : 340,
    borderRadius: 8,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
  };

  const pageHeaderStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    margin: '32px 0 24px',
    flexWrap: 'wrap' as const,
    gap: '16px'
  };

  const statisticStyle = {
    padding: '20px',
    background: 'rgba(99, 102, 241, 0.03)',
    borderRadius: 16,
    height: '100%',
    transition: 'all 0.3s ease',
    cursor: 'pointer',
    border: '1px solid transparent',
    backdropFilter: 'blur(8px)',
  };

  const getHoverStatisticStyle = (key: string) => ({
    ...statisticStyle,
    transform: isHovering === key ? 'translateY(-5px)' : 'none',
    boxShadow: isHovering === key ? '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)' : 'none',
    borderColor: isHovering === key ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
    background: isHovering === key ? 'rgba(99, 102, 241, 0.08)' : 'rgba(99, 102, 241, 0.03)'
  });

  return (
    <ConfigProvider theme={customTheme as any}>
      <Layout style={{ minHeight: '100vh' }}>
        <Header
          style={{
            background: 'linear-gradient(90deg, #6366f1 0%, #8b5cf6 100%)',
            padding: '0 24px',
            position: 'sticky',
            top: 0,
            zIndex: 1000,
            height: 70,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              maxWidth: 1280,
              margin: '0 auto',
              width: '100%',
              height: '100%',
              position: 'relative'
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              padding: '8px 16px',
            }}>
              <Avatar
                src="/logo.png"
                size={42}
                style={{
                  marginRight: 16,
                  padding: 4,
                }}
              />
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                height: '100%',
              }}>
                <span style={{
                  color: 'white',
                  margin: 0,
                  fontSize: 18,
                  letterSpacing: '0.5px',
                  fontWeight: 700,
                  textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                }}>
                  OpenDeepWiki
                </span>
              </div>
            </div>

            <Space size={16} align="center">
              <LanguageSwitcher />
              <Button
                type="text"
                icon={<GithubOutlined style={{ fontSize: 20 }} />}
                style={{
                  color: 'white',
                  height: 44,
                  width: 44,
                  borderRadius: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(255, 255, 255, 0.2)',
                  transition: 'all 0.3s',
                  backdropFilter: 'blur(4px)',
                  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15)',
                  border: '1px solid rgba(255, 255, 255, 0.2)'
                }}
                href={homepage}
                target="_blank"
              />
            </Space>
          </div>
        </Header>

        <Content style={contentStyle}>
          <div style={pageContainerStyle}>
            <Row gutter={[32, 32]}>
              <Col span={24}>
                <Card
                  style={{
                    ...cardStyle,
                    background: 'rgba(255, 255, 255, 0.9)',
                  }}
                  bodyStyle={{
                    padding: isMobile ? 24 : 40,
                  }}
                >
                  <Row gutter={[40, 40]} align="middle">
                    <Col xs={24} md={15}>
                      <div>
                        <Badge.Ribbon text={t('home.title')} style={{ fontSize: 14, fontWeight: 600, borderRadius: 4 }}>
                          <Title level={2} style={welcomeTitleStyle}>
                            {t('home.title')}
                          </Title>
                        </Badge.Ribbon>
                        <Paragraph style={paragraphStyle}>
                          {t('home.subtitle')}
                        </Paragraph>
                        <Space size={16} wrap style={{ marginTop: 8 }}>
                          <Button
                            type="primary"
                            size="large"
                            icon={<PlusOutlined />}
                            onClick={() => setFormVisible(true)}
                            style={{
                              ...primaryButtonStyle,
                              fontSize: 15
                            }}
                          >
                            {t('home.add_repo_button')}
                          </Button>
                          <Button
                            type="default"
                            size="large"
                            onClick={handleLastRepoQuery}
                            style={{
                              ...buttonStyle,
                              borderColor: 'rgba(99, 102, 241, 0.3)',
                              color: '#6366f1'
                            }}
                          >
                            {t('home.query_last_repo_button')}
                          </Button>
                        </Space>
                      </div>
                    </Col>
                    <Col xs={24} md={9}>
                      <Row gutter={[24, 24]}>
                        <Col xs={12} md={24}>
                          <div
                            style={getHoverStatisticStyle('repos')}
                            onMouseEnter={() => setIsHovering('repos')}
                            onMouseLeave={() => setIsHovering('')}
                          >
                            <Statistic
                              title={
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                                  <BookOutlined style={{ color: '#6366f1', fontSize: 18 }} />
                                  <Typography.Text style={{ color: '#64748b', fontSize: 16, fontWeight: 500 }}>{t('home.stats.total_repos')}</Typography.Text>
                                </div>
                              }
                              value={stats.totalRepositories}
                              valueStyle={{
                                color: customTheme.token.colorText,
                                fontWeight: 700,
                                fontSize: 32
                              }}
                            />
                          </div>
                        </Col>
                        <Col xs={12} md={24}>
                          <div
                            style={getHoverStatisticStyle('git')}
                            onMouseEnter={() => setIsHovering('git')}
                            onMouseLeave={() => setIsHovering('')}
                          >
                            <Statistic
                              title={
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                                  <GithubOutlined style={{ color: '#6366f1', fontSize: 18 }} />
                                  <Typography.Text style={{ color: '#64748b', fontSize: 16, fontWeight: 500 }}>{t('home.stats.git_repos')}</Typography.Text>
                                </div>
                              }
                              value={stats.gitRepos}
                              valueStyle={{
                                color: customTheme.token.colorText,
                                fontWeight: 700,
                                fontSize: 32
                              }}
                            />
                          </div>
                        </Col>
                      </Row>
                    </Col>
                  </Row>
                </Card>
              </Col>
            </Row>

            <div style={pageHeaderStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Tag color="#6366f1" style={{
                  fontSize: 16,
                  padding: '6px 12px',
                  borderRadius: 20,
                  fontWeight: 600,
                  boxShadow: '0 2px 5px rgba(99, 102, 241, 0.2)',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}>
                  <FireOutlined /> {t('home.repo_list.title')}
                </Tag>
                <Tag color="#e0e7ff" style={{
                  color: '#4f46e5',
                  marginLeft: 4,
                  fontWeight: 500,
                  padding: '4px 12px',
                  borderRadius: 20
                }}>{t('home.repo_list.total', { count: stats.totalRepositories })}</Tag>
              </div>
              <Space wrap style={{ marginTop: isMobile ? 12 : 0 }} size={12}>
                <Search
                  placeholder={t('home.repo_list.search_placeholder')}
                  allowClear
                  value={searchValue}
                  onSearch={value => handleSearch(value)}
                  onChange={e => setSearchValue(e.target.value)}
                  style={searchStyle}
                  enterButton={<SearchOutlined />}
                />
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setFormVisible(true)}
                  style={primaryButtonStyle}
                >
                  {t('home.repo_list.add_button')}
                </Button>
              </Space>
            </div>

            {repositories.length === 0 ? (
              <Card
                style={{
                  ...cardStyle,
                  textAlign: 'center',
                  background: 'rgba(255, 255, 255, 0.9)'
                }}
                bodyStyle={{ padding: 48 }}
              >
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={
                    <Typography.Text style={{ color: customTheme.token.colorTextSecondary, fontSize: 16 }}>
                      {searchValue ? t('home.repo_list.not_found', { keyword: searchValue }) : t('home.repo_list.empty')}
                    </Typography.Text>
                  }
                >
                  <Button
                    type="primary"
                    style={primaryButtonStyle}
                    onClick={() => setFormVisible(true)}
                    size="large"
                    icon={<PlusOutlined />}
                  >
                    {t('home.repo_list.add_now')}
                  </Button>
                </Empty>
              </Card>
            ) : (
              <>
                <RepositoryList repositories={repositories} />
                {!searchValue && initialTotal > pageSize && (
                  <div style={{
                    textAlign: 'center',
                    marginTop: 40,
                    background: 'rgba(255, 255, 255, 0.9)',
                    padding: '20px 24px',
                    borderRadius: 16,
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)'
                  }}>
                    <Pagination
                      current={currentPage}
                      pageSize={pageSize}
                      total={initialTotal}
                      onChange={handlePageChange}
                      showSizeChanger
                      showQuickJumper
                      showTotal={(total) => t('home.pagination.total', { total })}
                      style={{ fontWeight: 500 }}
                    />
                  </div>
                )}
              </>
            )}

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

        <Footer style={{
          background: '#fff',
          padding: '48px 24px 24px',
          marginTop: 'auto',
          borderTop: `1px solid #e0e7ff`
        }}>
          <div style={{ maxWidth: 1280, margin: '0 auto' }}>
            <Row gutter={[48, 32]}>
              <Col xs={24} sm={8} md={6}>
                <div style={{ marginBottom: 24 }}>
                  <Space align="center" style={{ marginBottom: 16 }}>
                    <Avatar
                      src="/logo.png"
                      size={32}
                      style={{
                        marginRight: 8,
                        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
                        background: 'white',
                        padding: 3,
                      }}
                    />
                    <Typography.Title level={4} style={{ margin: 0, color: '#1e293b' }}>
                      OpenDeepWiki
                    </Typography.Title>
                  </Space>
                  <Typography.Paragraph style={{
                    color: '#64748b',
                    marginBottom: 16
                  }}>
                    {t('description')}
                  </Typography.Paragraph>
                  <Space size={16}>
                    <Button
                      type="text"
                      icon={<GithubOutlined />}
                      href={homepage}
                      target="_blank"
                      style={{ color: '#64748b' }}
                    />
                  </Space>
                </div>
              </Col>
              <Col xs={24} sm={16} md={18}>
                <Row gutter={[48, 24]}>
                  <Col xs={24} sm={8}>
                    <Typography.Title level={5} style={{ marginBottom: 16, color: '#1e293b' }}>
                      {t('footer.product')}
                    </Typography.Title>
                    <Space direction="vertical" size={12}>
                      {footerLinks.product.map(link => (
                        <Typography.Link key={link.title} href={link.link} style={{ color: '#64748b' }}>
                          {t(`footer.${link.title === '功能介绍' ? 'features' : link.title === '使用指南' ? 'guide' : 'changelog'}`)}
                        </Typography.Link>
                      ))}
                    </Space>
                  </Col>
                  <Col xs={24} sm={8}>
                    <Typography.Title level={5} style={{ marginBottom: 16, color: '#1e293b' }}>
                      {t('footer.resources')}
                    </Typography.Title>
                    <Space direction="vertical" size={12}>
                      {footerLinks.resources.map(link => (
                        <Typography.Link key={link.title} href={link.link} style={{ color: '#64748b' }}>
                          {t(`footer.${link.title === '开发文档' ? 'docs' : link.title === 'API参考' ? 'api' : 'faq'}`)}
                        </Typography.Link>
                      ))}
                    </Space>
                  </Col>
                  <Col xs={24} sm={8}>
                    <Typography.Title level={5} style={{ marginBottom: 16, color: '#1e293b' }}>
                      {t('footer.company')}
                    </Typography.Title>
                    <Space direction="vertical" size={12}>
                      {footerLinks.company.map(link => (
                        <Typography.Link key={link.title} href={link.link} style={{ color: '#64748b' }}>
                          {t(`footer.${link.title === '关于我们' ? 'about' : link.title === '联系方式' ? 'contact' : 'join'}`)}
                        </Typography.Link>
                      ))}
                    </Space>
                  </Col>
                </Row>
              </Col>
            </Row>
            <Divider style={{ borderColor: '#e2e8f0', margin: '32px 0 24px' }} />
            <Row justify="space-between" align="middle" gutter={[16, 16]}>
              <Col xs={24} sm={12}>
                <Space direction="vertical" size={8}>
                  <Typography.Text style={{ color: '#64748b', fontSize: 14 }}>
                    {t('footer.copyright', { year: new Date().getFullYear() })}
                  </Typography.Text>
                  <Typography.Text style={{
                    color: '#64748b',
                    fontSize: 14,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                  }}>
                    {t('footer.powered_by')} <span style={{
                      background: 'linear-gradient(90deg, #6366f1 0%, #8b5cf6 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      fontWeight: 600,
                      padding: '0 4px'
                    }}>.NET 9.0</span>
                  </Typography.Text>
                </Space>
              </Col>
              <Col xs={24} sm={12} style={{ textAlign: 'right' }}>
                <Space split={<Divider type="vertical" style={{ borderColor: '#e2e8f0' }} />}>
                  <Typography.Link href="/privacy" style={{ color: '#64748b', fontSize: 14 }}>    
                    {t('footer.privacy')}                  
                  </Typography.Link>                 
                  <Typography.Link href="/terms" style={{ color: '#64748b', fontSize: 14 }}>
                    {t('footer.terms')}
                  </Typography.Link>
                </Space>
              </Col>
            </Row>
          </div>
        </Footer>
      </Layout>
    </ConfigProvider>
  );
} 