import { useState, useEffect } from 'react';
import { 
  Modal, 
  Form, 
  Input, 
  Button, 
  message, 
  Spin, 
  Typography, 
  Descriptions, 
  Tag, 
  Space, 
  Result, 
  Row, 
  Col, 
  theme,
  Divider,
  Card
} from 'antd';
import { 
  SearchOutlined, 
  GithubOutlined, 
  BranchesOutlined, 
  ClockCircleOutlined, 
  InfoCircleOutlined,
  ExclamationCircleOutlined,
  SyncOutlined,
  CheckCircleOutlined,
  StopOutlined,
  LockOutlined,
  QuestionCircleOutlined,
  LinkOutlined
} from '@ant-design/icons';
import { getLastWarehouse } from '../services/warehouseService';
import { Repository } from '../types';
import { homepage } from '../const/urlconst';
import { useTranslation } from '../i18n/client';

const { Text, Title } = Typography;
const { useToken } = theme;

interface LastRepoModalProps {
  open: boolean;
  onCancel: () => void;
}

const LastRepoModal: React.FC<LastRepoModalProps> = ({ open, onCancel }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [repository, setRepository] = useState<Repository | null>(null);
  const [searched, setSearched] = useState(false);
  const { token } = useToken();
  const { t } = useTranslation();

  useEffect(() => {
    if (!open) {
      form.resetFields();
      setRepository(null);
      setSearched(false);
    }
  }, [open, form]);

  const handleSearch = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      setSearched(false);
      
      try {
        const response = await getLastWarehouse(values.address);
        if (response.success && response.data) {
          setRepository(response.data);
          setSearched(true);
        } else {
          message.error(t('repository.last_repo.query_failed', '查询失败: ') + (response.error || t('repository.last_repo.not_found', '未找到相关仓库')));
          setRepository(null);
        }
      } catch (error) {
        console.error('查询仓库出错:', error);
        message.error(t('repository.last_repo.error', '查询仓库出错，请稍后重试'));
        setRepository(null);
      } finally {
        setLoading(false);
      }
    } catch (error) {
      // 表单验证失败
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setRepository(null);
    setSearched(false);
    onCancel();
  };

  // 获取仓库状态文本
  const getStatusText = (status: number) => {
    const statusMap: Record<number, { text: string; color: string; icon: React.ReactNode }> = {
      0: { text: t('repository.status.pending', '待处理'), color: 'warning', icon: <ClockCircleOutlined /> },
      1: { text: t('repository.status.processing', '处理中'), color: 'processing', icon: <SyncOutlined spin /> },
      2: { text: t('repository.status.completed', '已完成'), color: 'success', icon: <CheckCircleOutlined /> },
      3: { text: t('repository.status.cancelled', '已取消'), color: 'default', icon: <StopOutlined /> },
      4: { text: t('repository.status.unauthorized', '未授权'), color: 'purple', icon: <LockOutlined /> },
      99: { text: t('repository.status.failed', '已失败'), color: 'error', icon: <ExclamationCircleOutlined /> },
    };
    return statusMap[status] || { text: t('repository.status.unknown', '未知状态'), color: 'default', icon: <QuestionCircleOutlined /> };
  };

  // 渲染内容区域
  const renderContent = () => {
    if (loading) {
      return (
        <div style={{ padding: token.paddingLG, textAlign: 'center' }}>
          <Spin size="large" />
          <Text type="secondary" style={{ display: 'block', marginTop: token.marginMD, fontSize: token.fontSizeLG }}>
            {t('repository.last_repo.searching', '正在查询仓库信息...')}
          </Text>
        </div>
      );
    }

    if (searched && !repository) {
      return (
        <Result
          status="warning"
          title={<span style={{ fontSize: token.fontSizeLG }}>{t('repository.last_repo.not_found_title', '未找到仓库信息')}</span>}
          subTitle={<span style={{ fontSize: token.fontSize }}>{t('repository.last_repo.check_address', '请检查输入的仓库地址是否正确')}</span>}
          icon={<ExclamationCircleOutlined style={{ color: token.colorWarning, fontSize: 64 }} />}
          style={{ padding: token.paddingLG }}
        />
      );
    }

    if (searched && repository) {
      const statusInfo = getStatusText(repository.status);
      
      return (
        <Card 
          style={{ 
            marginTop: token.marginLG,
            boxShadow: token.boxShadowTertiary,
            borderRadius: token.borderRadiusLG
          }}
        >
          <div style={{ 
            padding: `${token.paddingMD}px ${token.paddingLG}px`,
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <Title level={5} style={{ margin: 0, color: token.colorTextHeading }}>{t('repository.last_repo.result', '查询结果')}</Title>
            <Tag 
              color={statusInfo.color} 
              icon={statusInfo.icon} 
              style={{ 
                padding: `${token.paddingXS}px ${token.paddingSM}px`, 
                fontSize: token.fontSize 
              }}
            >
              {statusInfo.text}
            </Tag>
          </div>
          
          <Descriptions
            bordered
            size="middle"
            column={1}
            labelStyle={{ 
              backgroundColor: token.colorBgLayout,
              padding: `${token.paddingSM}px ${token.paddingMD}px`,
              width: '25%',
              fontSize: token.fontSize
            }}
            contentStyle={{ 
              padding: `${token.paddingSM}px ${token.paddingMD}px`,
              fontSize: token.fontSize 
            }}
          >
            <Descriptions.Item label={t('repository.last_repo.repo_name', '仓库名称')}>
              <Text strong>{repository.name}</Text>
            </Descriptions.Item>
            
            <Descriptions.Item label={t('repository.last_repo.repo_address', '仓库地址')}>
              <Text
                ellipsis={{ 
                  tooltip: repository.address 
                }}
                style={{ maxWidth: '100%', display: 'inline-block' }}
                copyable
              >
                {repository.address}
              </Text>
            </Descriptions.Item>
            
            <Descriptions.Item label={t('repository.last_repo.repo_info', '仓库信息')}>
              <Space size={token.marginSM}>
                <Tag 
                  icon={<GithubOutlined />} 
                  color="blue" 
                  style={{ padding: `2px ${token.paddingSM}px`, fontSize: token.fontSize }}
                >
                  {repository.type}
                </Tag>
                <Tag 
                  icon={<BranchesOutlined />} 
                  color="cyan"
                  style={{ padding: `2px ${token.paddingSM}px`, fontSize: token.fontSize }}
                >
                  {repository.branch}
                </Tag>
              </Space>
            </Descriptions.Item>
            
            {repository.error && (
              <Descriptions.Item 
                label={<Text type="danger" strong>{t('repository.last_repo.error_info', '错误信息')}</Text>}
                contentStyle={{ backgroundColor: token.colorErrorBg }}
              >
                <Text type="danger" style={{ fontSize: token.fontSize }}>{repository.error}</Text>
              </Descriptions.Item>
            )}
          </Descriptions>
        </Card>
      );
    }

    return null;
  };

  return (
    <Modal
      title={<Title level={4} style={{ margin: 0 }}>{t('repository.last_repo.title', '查询仓库')}</Title>}
      open={open}
      onCancel={handleCancel}
      footer={null}
      width={{ xs: '95%', sm: 600, md: 700 }}
      centered
      destroyOnClose
      style={{ top: 20 }}
    >
      <Form 
        form={form} 
        layout="vertical"
        size="large"
        style={{ marginBottom: token.marginMD }}
      >
        <Form.Item
          name="address"
          label={<Text strong style={{ fontSize: token.fontSizeLG }}>{t('repository.last_repo.address_label', '仓库地址')}</Text>}
          rules={[{ required: true, message: t('repository.last_repo.address_required', '请输入仓库地址') }]}
        >
          <Input 
            placeholder={t('repository.last_repo.address_placeholder', '请输入您之前提交过的仓库地址')}
            prefix={<LinkOutlined style={{ color: token.colorTextSecondary }} />}
            allowClear
          />
        </Form.Item>
        
        <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
          <Space>
            <Button 
              size="large"
              onClick={handleCancel}
            >
              {t('repository.form.cancel', '取消')}
            </Button>
            <Button
              type="primary"
              icon={<SearchOutlined />}
              size="large"
              onClick={handleSearch}
              loading={loading}
            >
              {t('repository.last_repo.search', '查询')}
            </Button>
          </Space>
        </Form.Item>
      </Form>
      
      {renderContent()}
    </Modal>
  );
};

export default LastRepoModal;