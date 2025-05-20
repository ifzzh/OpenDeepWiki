'use client'
import { useState, useEffect } from 'react';
import { Button, Typography, Layout, Space, Input, Empty, Card, Row, Col, Statistic, Tooltip, Pagination, message, ConfigProvider, Badge, Divider, Avatar, Tag } from 'antd';
import {
  PlusOutlined,
  GithubOutlined,
  FireOutlined,
  SearchOutlined,
  BookOutlined,
  HeartOutlined,
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

// 添加赞助商配置
const sponsors = [
  {
    name: 'AntSK',
    logo: '/sponsors/antsk-logo.png', // 占位图片路径，实际使用时需要替换为真实图片路径
    url: 'https://antsk.cn/',
    description: '大模型企业AI解决方案'
  },
  {
    name: '302.AI',
    logo: '/sponsors/302ai-logo.png', // 占位图片路径，实际使用时需要替换为真实图片路径
    url: 'https://302.ai/',
    description: 'AI应用开发平台'
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
}

export default function HomeClient({ initialRepositories, initialTotal, initialPage, initialPageSize, initialSearchValue }: HomeClientProps) {
  const repositories = initialRepositories;
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

  const buttonStyle = {
    height: 44,
    fontWeight: 500,
    boxShadow: 'none',
    transition: 'all 0.3s ease',
    borderRadius: 8,
    fontSize: 15
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


  return (
    <ConfigProvider theme={customTheme as any}>
      <Layout className="min-h-screen">
        <Header
          className="bg-gradient-to-r from-indigo-500 to-purple-500 sticky top-0 z-50 h-[70px] flex items-center px-6"
        >
          <div
            className="flex items-center justify-between max-w-7xl mx-auto w-full h-full relative"
          >
            <div className="flex items-center py-2 px-4">
              <Avatar
                src="/logo.png"
                size={42}
                className="mr-4 p-1"
              />
              <div className="flex flex-col justify-center h-full">
                <span className="text-white m-0 text-lg tracking-wider font-bold drop-shadow">
                  OpenDeepWiki
                </span>
              </div>
            </div>

            <Space size={16} align="center">
              <LanguageSwitcher />
              <Button
                type="text"
                icon={<GithubOutlined className="text-xl" />}
                className="text-white h-11 w-11 rounded-xl flex items-center justify-center bg-white/20 transition-all duration-300 backdrop-blur border border-white/20 shadow-md"
                href={homepage}
                target="_blank"
              />
            </Space>
          </div>
        </Header>

        <Content className="p-10 bg-slate-50 min-h-[calc(100vh-70px-64px)] relative z-10 bg-no-repeat bg-bottom bg-cover" style={{ backgroundImage: `url("data:image/svg+xml;utf8,${encodeURIComponent(waveSvg)}")` }}>
          <div className="max-w-7xl mx-auto">
            <Row gutter={[32, 32]}>
              <Col span={24}>
                <Card
                  className="rounded-2xl mb-8 shadow-lg border-none overflow-hidden transition-all duration-300 backdrop-blur-sm bg-white/90"
                  bodyStyle={{
                    padding: isMobile ? 24 : 40,
                  }}
                >
                  <Row gutter={[40, 40]} align="middle">
                    <Col xs={24} md={15}>
                      <div>
                        <Badge.Ribbon text={t('home.title')} className="text-sm font-semibold rounded">
                          <Title level={2} className="text-4xl font-bold mb-4 text-slate-900 bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent inline-block">
                            {t('home.title')}
                          </Title>
                        </Badge.Ribbon>
                        <Paragraph className="text-base mb-8 text-slate-600 leading-relaxed max-w-[90%]">
                          {t('home.subtitle')}
                        </Paragraph>
                        <Space size={16} wrap className="mt-2">
                          <Button
                            type="primary"
                            size="large"
                            icon={<PlusOutlined />}
                            onClick={() => setFormVisible(true)}
                            className="h-11 font-medium shadow-none transition-all duration-300 rounded-lg text-base bg-gradient-to-r from-indigo-500 to-purple-500 border-none"
                          >
                            {t('home.add_repo_button')}
                          </Button>
                          <Button
                            type="default"
                            size="large"
                            onClick={handleLastRepoQuery}
                            className="h-11 font-medium rounded-lg border-indigo-500/30 text-indigo-500"
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
                            className={`p-5 bg-indigo-500/[0.03] rounded-2xl h-full transition-all duration-300 cursor-pointer border border-transparent backdrop-blur-sm ${isHovering === 'repos' ? 'transform -translate-y-1 shadow-xl border-indigo-500/20 bg-indigo-500/[0.08]' : ''}`}
                            onMouseEnter={() => setIsHovering('repos')}
                            onMouseLeave={() => setIsHovering('')}
                          >
                            <Statistic
                              title={
                                <div className="flex items-center gap-2.5 mb-2.5">
                                  <BookOutlined className="text-indigo-500 text-lg" />
                                  <Typography.Text className="text-slate-500 text-base font-medium">{t('home.stats.total_repos')}</Typography.Text>
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
                            className={`p-5 bg-indigo-500/[0.03] rounded-2xl h-full transition-all duration-300 cursor-pointer border border-transparent backdrop-blur-sm ${isHovering === 'git' ? 'transform -translate-y-1 shadow-xl border-indigo-500/20 bg-indigo-500/[0.08]' : ''}`}
                            onMouseEnter={() => setIsHovering('git')}
                            onMouseLeave={() => setIsHovering('')}
                          >
                            <Statistic
                              title={
                                <div className="flex items-center gap-2.5 mb-2.5">
                                  <GithubOutlined className="text-indigo-500 text-lg" />
                                  <Typography.Text className="text-slate-500 text-base font-medium">{t('home.stats.git_repos')}</Typography.Text>
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

            <div className="flex justify-between items-center my-8 flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <Tag color="#6366f1" className="text-base py-1.5 px-3 rounded-full font-semibold shadow-md shadow-indigo-200 border-none flex items-center gap-2">
                  <FireOutlined /> {t('home.repo_list.title')}
                </Tag>
                <Tag color="#e0e7ff" className="text-indigo-700 ml-1 font-medium py-1 px-3 rounded-full">
                  {t('home.repo_list.total', { count: stats.totalRepositories })}
                </Tag>
              </div>
              <Space wrap className={`${isMobile ? 'mt-3' : ''}`} size={12}>
                <Search
                  placeholder={t('home.repo_list.search_placeholder')}
                  allowClear
                  value={searchValue}
                  onSearch={value => handleSearch(value)}
                  onChange={e => setSearchValue(e.target.value)}
                  className={`${isMobile ? 'w-full' : 'w-[340px]'} rounded-lg shadow-sm`}
                  enterButton={<SearchOutlined />}
                />
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setFormVisible(true)}
                  className="h-11 font-medium shadow-none transition-all duration-300 rounded-lg text-base bg-gradient-to-r from-indigo-500 to-purple-500 border-none"
                >
                  {t('home.repo_list.add_button')}
                </Button>
              </Space>
            </div>

            {repositories.length === 0 ? (
              <Card
                className="rounded-2xl text-center bg-white/90 shadow-lg border-none"
                bodyStyle={{ padding: 48 }}
              >
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={
                    <Typography.Text className="text-slate-500 text-base">
                      {searchValue ? t('home.repo_list.not_found', { keyword: searchValue }) : t('home.repo_list.empty')}
                    </Typography.Text>
                  }
                >
                  <Button
                    type="primary"
                    className="h-11 font-medium shadow-none transition-all duration-300 rounded-lg text-base bg-gradient-to-r from-indigo-500 to-purple-500 border-none"
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
                  <div className="text-center mt-10 bg-white/90 py-5 px-6 rounded-2xl shadow-sm">
                    <Pagination
                      current={currentPage}
                      pageSize={pageSize}
                      total={initialTotal}
                      onChange={handlePageChange}
                      showSizeChanger
                      showQuickJumper
                      showTotal={(total) => t('home.pagination.total', { total })}
                      className="font-medium"
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

        <Footer className="bg-white py-12 px-6 mt-auto border-t border-indigo-100">
          <div className="max-w-7xl mx-auto">
            <Row gutter={[48, 32]}>
              <Col xs={24} sm={8} md={6}>
                <div className="mb-6">
                  <Space align="center" className="mb-4">
                    <Avatar
                      src="/logo.png"
                      size={32}
                      className="mr-2 shadow-md bg-white p-0.5"
                    />
                    <Typography.Title level={4} className="m-0 text-slate-900">
                      OpenDeepWiki
                    </Typography.Title>
                  </Space>
                  <Typography.Paragraph className="text-slate-500 mb-4">
                    {t('description')}
                  </Typography.Paragraph>
                  <Space size={16}>
                    <Button
                      type="text"
                      icon={<GithubOutlined />}
                      href={homepage}
                      target="_blank"
                      className="text-slate-500"
                    />
                  </Space>
                </div>
              </Col>
              <Col xs={24} sm={16} md={18}>
                <Row gutter={[48, 24]}>
                  <Col xs={24} sm={6}>
                    <Typography.Title level={5} className="mb-4 text-slate-900">
                      {t('footer.product')}
                    </Typography.Title>
                    <Space direction="vertical" size={12}>
                      {footerLinks.product.map(link => (
                        <Typography.Link key={link.title} href={link.link} className="text-slate-500">
                          {t(`footer.${link.title === '功能介绍' ? 'features' : link.title === '使用指南' ? 'guide' : 'changelog'}`)}
                        </Typography.Link>
                      ))}
                    </Space>
                  </Col>
                  <Col xs={24} sm={6}>
                    <Typography.Title level={5} className="mb-4 text-slate-900">
                      {t('footer.resources')}
                    </Typography.Title>
                    <Space direction="vertical" size={12}>
                      {footerLinks.resources.map(link => (
                        <Typography.Link key={link.title} href={link.link} className="text-slate-500">
                          {t(`footer.${link.title === '开发文档' ? 'docs' : link.title === 'API参考' ? 'api' : 'faq'}`)}
                        </Typography.Link>
                      ))}
                    </Space>
                  </Col>
                  <Col xs={24} sm={6}>
                    <Typography.Title level={5} className="mb-4 text-slate-900">
                      {t('footer.sponsors', '赞助商')}
                    </Typography.Title>
                    <Space direction="vertical" size={12}>
                      {sponsors.map(sponsor => (
                        <Typography.Link key={sponsor.name} href={sponsor.url} target="_blank" className="text-slate-500 flex items-center gap-2">
                          {sponsor.name}
                        </Typography.Link>
                      ))}
                    </Space>
                  </Col>
                  <Col xs={24} sm={6}>
                    <Typography.Title level={5} className="mb-4 text-slate-900">
                      {t('footer.company')}
                    </Typography.Title>
                    <Space direction="vertical" size={12}>
                      {footerLinks.company.map(link => (
                        <Typography.Link key={link.title} href={link.link} className="text-slate-500">
                          {t(`footer.${link.title === '关于我们' ? 'about' : link.title === '联系方式' ? 'contact' : 'join'}`)}
                        </Typography.Link>
                      ))}
                    </Space>
                  </Col>
                </Row>
              </Col>
            </Row>
            <Divider className="border-slate-200 my-8" />
            <Row justify="space-between" align="middle" gutter={[16, 16]}>
              <Col xs={24} sm={12}>
                <Space direction="vertical" size={2}>
                  <Typography.Text className="text-slate-500 text-sm">
                    {t('footer.copyright', { year: new Date().getFullYear() })}
                  </Typography.Text>
                  <Typography.Text className="text-slate-500 text-sm flex items-center gap-1">
                    {t('footer.powered_by')} <span className="bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent font-semibold px-1">.NET 9.0</span>
                  </Typography.Text>
                </Space>
              </Col>
              <Col xs={24} sm={12} className="text-right">
                <Space split={<Divider type="vertical" className="border-slate-200" />}>
                  <Typography.Link href="/privacy" className="text-slate-500 text-sm">
                    {t('footer.privacy')}
                  </Typography.Link>
                  <Typography.Link href="/terms" className="text-slate-500 text-sm">
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