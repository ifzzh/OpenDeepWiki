'use client';

import React, { useState, useEffect } from 'react';
import {
  Button,
  Modal,
  Form,
  Input,
  Switch,
  Select,
  Space,
  Typography,
  message,
  Popconfirm,
  Tag,
  Tooltip,
  Card,
  Row,
  Col,
  Alert,
  Divider,
  Badge
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  EyeOutlined,
  PoweroffOutlined,
  ApiOutlined,
  GlobalOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  CodeOutlined
} from '@ant-design/icons';
import { createStyles } from 'antd-style';
import {
  getAppConfigs,
  createAppConfig,
  updateAppConfig,
  deleteAppConfig,
  toggleAppConfigEnabled,
  generateAppId,
  type AppConfigInput,
  type AppConfigOutput
} from '../services/appConfigService';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const useStyles = createStyles(({ css, token }) => ({
  container: css`
    /* 自定义滚动条样式 */
    * {
      &::-webkit-scrollbar {
        width: 6px;
        height: 6px;
      }
      
      &::-webkit-scrollbar-track {
        background: rgba(255, 255, 255, 0.05);
        border-radius: 3px;
      }
      
      &::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.15);
        border-radius: 3px;
        transition: background 0.3s ease;
      }
      
      &::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, 0.25);
      }
    }
    
    .ant-card {
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      transition: all 0.3s ease;
      
      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 30px rgba(0, 0, 0, 0.2);
      }
    }
    
    /* 模态框深色主题 */
    .ant-modal {
      .ant-modal-content {
        background: #1a1a1a;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
      }
      
      .ant-modal-header {
        background: #1a1a1a;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px 12px 0 0;
        
        .ant-modal-title {
          color: #ffffff;
          font-weight: 600;
        }
      }
      
      .ant-modal-body {
        background: #1a1a1a;
        color: #ffffff;
      }
      
      .ant-modal-footer {
        background: #1a1a1a;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 0 0 12px 12px;
      }
      
      .ant-modal-close {
        color: rgba(255, 255, 255, 0.6);
        
        &:hover {
          color: #ffffff;
        }
      }
    }
    
    /* 表单深色主题 */
    .ant-form-item-label > label {
      color: #ffffff;
      font-weight: 500;
    }
    
    .ant-input,
    .ant-input-number,
    .ant-select-selector,
    .ant-input-affix-wrapper {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #ffffff;
      border-radius: 8px;
      
      &:hover {
        border-color: rgba(255, 255, 255, 0.25);
        background: rgba(255, 255, 255, 0.08);
      }
      
      &:focus,
      &.ant-input-focused,
      &.ant-select-focused .ant-select-selector {
        border-color: #1890ff;
        box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
        background: rgba(255, 255, 255, 0.08);
      }
      
      &::placeholder {
        color: rgba(255, 255, 255, 0.4);
      }
    }
    
    .ant-select-arrow {
      color: rgba(255, 255, 255, 0.6);
    }
    
    .ant-switch {
      background: rgba(255, 255, 255, 0.2);
      
      &.ant-switch-checked {
        background: #1890ff;
      }
    }
    
    /* 下拉菜单深色主题 */
    .ant-select-dropdown {
      background: #1a1a1a;
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 8px;
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
      
      .ant-select-item {
        color: #ffffff;
        
        &:hover {
          background: rgba(255, 255, 255, 0.1);
        }
        
        &.ant-select-item-option-selected {
          background: rgba(24, 144, 255, 0.2);
        }
      }
    }
    
    /* 消息提示深色主题 */
    .ant-message {
      .ant-message-notice-content {
        background: #1a1a1a;
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 8px;
        color: #ffffff;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      }
    }
    
    /* 确认弹窗深色主题 */
    .ant-popover {
      .ant-popover-inner {
        background: #1a1a1a;
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 8px;
        color: #ffffff;
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
      }
      
      .ant-popover-arrow::before {
        background: #1a1a1a;
        border: 1px solid rgba(255, 255, 255, 0.15);
      }
    }
  `,
  
  headerCard: css`
    margin-bottom: 24px;
    background: linear-gradient(135deg, rgba(24, 144, 255, 0.8) 0%, rgba(114, 46, 209, 0.8) 100%);
    border: 1px solid rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(20px);
    
    .ant-card-body {
      padding: 32px;
    }
    
    .header-title {
      color: white;
      margin: 0;
      font-weight: 600;
    }
    
    .header-description {
      color: rgba(255, 255, 255, 0.9);
      margin-top: 8px;
      font-size: 14px;
    }
  `,
  
  statsCard: css`
    text-align: center;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    
    .stat-number {
      font-size: 28px;
      font-weight: 700;
      color: #1890ff;
      margin-bottom: 4px;
      background: linear-gradient(135deg, #1890ff, #722ed1);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    
    .stat-label {
      color: rgba(255, 255, 255, 0.7);
      font-size: 13px;
      font-weight: 500;
    }
  `,
  
  appCard: css`
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    transition: all 0.3s ease;
    height: 100%;
    
    &:hover {
      border-color: rgba(24, 144, 255, 0.4);
      background: rgba(255, 255, 255, 0.05);
      transform: translateY(-4px);
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2);
    }
    
    .ant-card-actions {
      background: rgba(255, 255, 255, 0.02);
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      
      li {
        &:not(:last-child) {
          border-right: 1px solid rgba(255, 255, 255, 0.08);
        }
        
        > span {
          color: rgba(255, 255, 255, 0.7);
          transition: all 0.3s ease;
          
          &:hover {
            color: #1890ff;
            transform: scale(1.1);
          }
        }
      }
    }
  `,
  
  codeBlock: css`
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    padding: 16px;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 13px;
    margin: 16px 0;
    overflow-x: auto;
    position: relative;
    
    pre {
      margin: 0;
      white-space: pre-wrap;
      color: #ffffff;
    }
    
    .copy-button {
      position: absolute;
      top: 8px;
      right: 8px;
    }
  `,
  
  domainList: css`
    .ant-tag {
      margin-bottom: 4px;
      background: rgba(24, 144, 255, 0.1);
      border: 1px solid rgba(24, 144, 255, 0.3);
      color: #1890ff;
      border-radius: 6px;
      font-size: 11px;
    }
  `,
  
  emptyState: css`
    text-align: center;
    padding: 80px 20px;
    background: rgba(255, 255, 255, 0.02);
    border: 2px dashed rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    
    @keyframes pulse {
      0%, 100% { 
        opacity: 0.6; 
        transform: scale(1); 
      }
      50% { 
        opacity: 1; 
        transform: scale(1.1); 
      }
    }
    
    .empty-icon {
      font-size: 48px;
      color: rgba(255, 255, 255, 0.2);
      margin-bottom: 16px;
      
      &.loading {
        animation: pulse 2s infinite;
      }
    }
    
    .empty-title {
      color: rgba(255, 255, 255, 0.6);
      font-size: 16px;
      margin-bottom: 8px;
    }
    
    .empty-description {
      color: rgba(255, 255, 255, 0.4);
      font-size: 14px;
      margin-bottom: 24px;
    }
  `,
  
  usageModal: css`
    .ant-modal-content {
      background: #1a1a1a;
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
    }
    
    .ant-modal-header {
      background: #1a1a1a;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .ant-modal-title {
      color: #ffffff;
    }
    
    .ant-modal-body {
      padding: 24px;
    }
    
    .ant-modal-footer {
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      padding: 16px 24px;
    }
    
    .ant-btn-default:hover {
      background: rgba(255, 255, 255, 0.2);
      border-color: rgba(255, 255, 255, 0.3);
      color: #ffffff;
    }
  `
}));

interface AppManagementProps {
  className?: string;
}

const AppManagement: React.FC<AppManagementProps> = ({ className }) => {
  const { styles } = useStyles();
  
  // 状态管理
  const [apps, setApps] = useState<AppConfigOutput[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingApp, setEditingApp] = useState<AppConfigOutput | null>(null);
  const [form] = Form.useForm();
  const [usageModalVisible, setUsageModalVisible] = useState(false);
  const [selectedApp, setSelectedApp] = useState<AppConfigOutput | null>(null);

  // 加载应用列表
  const loadApps = async () => {
    try {
      setLoading(true);
      const response = await getAppConfigs();
      if (response.code === 200) {
        setApps(response.data);
      } else {
        message.error(response.message || '加载应用列表失败');
      }
    } catch (error) {
      console.error('加载应用列表失败:', error);
      message.error('加载应用列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 初始化加载
  useEffect(() => {
    loadApps();
  }, []);

  // 处理表单提交
  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);
      
      const appData: AppConfigInput = {
        appId: values.appId,
        name: values.name,
        organizationName: values.organizationName,
        repositoryName: values.repositoryName,
        allowedDomains: values.allowedDomains || [],
        enableDomainValidation: values.enableDomainValidation || false,
        description: values.description || ''
      };

      let response;
      if (editingApp) {
        response = await updateAppConfig(editingApp.appId, appData);
      } else {
        response = await createAppConfig(appData);
      }

      if (response.code === 200) {
        message.success(editingApp ? '应用更新成功' : '应用创建成功');
        setModalVisible(false);
        setEditingApp(null);
        form.resetFields();
        loadApps();
      } else {
        message.error(response.message || '操作失败');
      }
    } catch (error) {
      console.error('操作失败:', error);
      message.error('操作失败');
    } finally {
      setLoading(false);
    }
  };

  // 删除应用
  const handleDelete = async (appId: string) => {
    try {
      setLoading(true);
      const response = await deleteAppConfig(appId);
      if (response.code === 200) {
        message.success('应用删除成功');
        loadApps();
      } else {
        message.error(response.message || '删除失败');
      }
    } catch (error) {
      console.error('删除失败:', error);
      message.error('删除失败');
    } finally {
      setLoading(false);
    }
  };

  // 切换应用状态
  const handleToggleEnabled = async (appId: string) => {
    try {
      setLoading(true);
      const response = await toggleAppConfigEnabled(appId);
      if (response.code === 200) {
        message.success('应用状态更新成功');
        loadApps();
      } else {
        message.error(response.message || '状态更新失败');
      }
    } catch (error) {
      console.error('状态更新失败:', error);
      message.error('状态更新失败');
    } finally {
      setLoading(false);
    }
  };

  // 打开编辑模态框
  const handleEdit = (app: AppConfigOutput) => {
    setEditingApp(app);
    form.setFieldsValue({
      appId: app.appId,
      name: app.name,
      organizationName: app.organizationName,
      repositoryName: app.repositoryName,
      allowedDomains: app.allowedDomains,
      enableDomainValidation: app.enableDomainValidation,
      description: app.description
    });
    setModalVisible(true);
  };

  // 创建新应用
  const handleCreate = () => {
    setEditingApp(null);
    form.resetFields();
    form.setFieldsValue({
      appId: generateAppId(),
      enableDomainValidation: false
    });
    setModalVisible(true);
  };

  // 显示使用说明
  const showUsage = (app: AppConfigOutput) => {
    setSelectedApp(app);
    setUsageModalVisible(true);
  };

  // 复制到剪贴板
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    message.success('已复制到剪贴板');
  };

  // 统计数据
  const stats = {
    total: apps.length,
    enabled: apps.filter(app => app.isEnabled !== false).length,
    withDomainValidation: apps.filter(app => app.enableDomainValidation).length
  };

  // 生成使用代码
  const generateUsageCode = (app: AppConfigOutput) => {
    return `<!-- 引入聊天组件脚本 -->
<script src="${window.location.origin}/koala-chat-widget.js"></script>
<script>
KoalaChatWidget.init({
  appId: '${app.appId}',
  title: '${app.name}',
  theme: 'light', // 或 'dark'
  // 其他可选配置...
  onError: (error) => {
    console.error('Chat widget error:', error);
  },
  onValidationFailed: (domain) => {
    console.error('Domain validation failed:', domain);
  }
});
</script>`;
  };

  return (
    <div className={`${styles.container} ${className}`}>
      {/* 头部卡片 */}
      <Card className={styles.headerCard}>
        <Row align="middle" justify="space-between">
          <Col>
            <Title level={3} className="header-title">
              <ApiOutlined style={{ marginRight: '8px' }} />
              应用管理
            </Title>
            <Paragraph className="header-description">
              创建和管理您的 AI 聊天应用，配置域名验证和访问权限
            </Paragraph>
          </Col>
          <Col>
            <Button
              type="primary"
              size="large"
              icon={<PlusOutlined />}
              onClick={handleCreate}
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)', borderColor: 'transparent' }}
            >
              创建应用
            </Button>
          </Col>
        </Row>
      </Card>
      {/* 应用卡片列表 */}
      {loading ? (
        <div className={styles.emptyState}>
          <div className="empty-icon loading">⏳</div>
          <div className="empty-title">加载中...</div>
          <div className="empty-description">正在获取应用列表</div>
        </div>
      ) : apps.length === 0 ? (
        <div className={styles.emptyState}>
          <div className="empty-icon">📱</div>
          <div className="empty-title">暂无应用</div>
          <div className="empty-description">创建您的第一个 AI 聊天应用</div>
          <Button 
            type="primary" 
            size="large"
            icon={<PlusOutlined />} 
            onClick={handleCreate}
            style={{ 
              background: 'linear-gradient(135deg, #1890ff, #722ed1)',
              border: 'none',
              borderRadius: '8px',
              height: '44px',
              padding: '0 24px'
            }}
          >
            创建第一个应用
          </Button>
        </div>
      ) : (
        <Row gutter={[20, 20]}>
          {apps.map((app) => (
            <Col key={app.appId} xs={24} sm={12} lg={8} xl={6}>
              <Card
                className={styles.appCard}
                bodyStyle={{ padding: '24px' }}
                actions={[
                  <Tooltip 
                  style={{
                      color:'ActiveBorder'
                  }} title="查看使用说明" key="usage">
                    <EyeOutlined onClick={() => showUsage(app)} />
                  </Tooltip>,
                  <Tooltip
                    style={{
                        color:'ActiveBorder'
                    }}
                    title="编辑" key="edit">
                    <EditOutlined onClick={() => handleEdit(app)} />
                  </Tooltip>,
                  <Tooltip title={app.isEnabled !== false ? '禁用' : '启用'} key="toggle">
                    <PoweroffOutlined 
                      onClick={() => handleToggleEnabled(app.appId)}
                      style={{ color: app.isEnabled !== false ? '#52c41a' : '#ff4d4f' }}
                    />
                  </Tooltip>,
                  <Popconfirm
                    title="确定要删除这个应用吗？"
                    description="删除后将无法恢复，请谨慎操作。"
                    onConfirm={() => handleDelete(app.appId)}
                    okText="确定"
                    cancelText="取消"
                    key="delete"
                  >
                    <Tooltip title="删除">
                      <DeleteOutlined style={{ color: '#ff4d4f' }} />
                    </Tooltip>
                  </Popconfirm>
                ]}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <Title level={5} style={{ margin: 0, flex: 1, color: '#ffffff', fontSize: '16px', fontWeight: 600 }}>
                      {app.name}
                    </Title>
                    <Badge
                      status={app.isEnabled !== false ? 'success' : 'error'}
                      text={app.isEnabled !== false ? '启用' : '禁用'}
                      style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.8)' }}
                    />
                  </div>
                  
                  <Text style={{ fontSize: '12px', display: 'block', marginBottom: '4px', color: 'rgba(255, 255, 255, 0.6)' }}>
                    ID: {app.appId}
                  </Text>
                  
                  <Text style={{ fontSize: '12px', display: 'block', marginBottom: '16px', color: 'rgba(255, 255, 255, 0.6)' }}>
                    <GlobalOutlined style={{ marginRight: '4px' }} />
                    {app.organizationName}/{app.repositoryName}
                  </Text>

                  {app.description && (
                    <Paragraph 
                      ellipsis={{ rows: 2, expandable: false }} 
                      style={{ fontSize: '13px', margin: '0 0 16px 0', color: 'rgba(255, 255, 255, 0.7)', lineHeight: '1.5' }}
                    >
                      {app.description}
                    </Paragraph>
                  )}

                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <Text style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)', fontWeight: 500 }}>域名验证</Text>
                      <Tag 
                        color={app.enableDomainValidation ? 'green' : 'default'}
                        style={{ 
                          fontSize: '11px',
                          background: app.enableDomainValidation ? 'rgba(82, 196, 26, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                          color: app.enableDomainValidation ? '#52c41a' : 'rgba(255, 255, 255, 0.6)',
                          border: `1px solid ${app.enableDomainValidation ? 'rgba(82, 196, 26, 0.4)' : 'rgba(255, 255, 255, 0.2)'}`,
                          borderRadius: '4px'
                        }}
                      >
                        {app.enableDomainValidation ? '已启用' : '未启用'}
                      </Tag>
                    </div>
                    
                    {app.enableDomainValidation && app.allowedDomains.length > 0 && (
                      <div className={styles.domainList}>
                        {app.allowedDomains.slice(0, 2).map(domain => (
                          <Tag key={domain}>
                            {domain}
                          </Tag>
                        ))}
                        {app.allowedDomains.length > 2 && (
                          <Tooltip title={app.allowedDomains.slice(2).join(', ')}>
                            <Tag>
                              +{app.allowedDomains.length - 2}
                            </Tag>
                          </Tooltip>
                        )}
                      </div>
                    )}
                  </div>

                  <div style={{ paddingTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    <Text style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.4)' }}>
                      创建于 {new Date(app.createdAt).toLocaleDateString()}
                    </Text>
                  </div>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* 创建/编辑模态框 */}
      <Modal
        title={editingApp ? '编辑应用' : '创建应用'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditingApp(null);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        confirmLoading={loading}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="appId"
            label="应用 ID"
            rules={[
              { required: true, message: '请输入应用 ID' },
              { pattern: /^[a-zA-Z0-9_-]+$/, message: '应用 ID 只能包含字母、数字、下划线和短横线' }
            ]}
          >
            <Input placeholder="应用的唯一标识符" disabled={!!editingApp} />
          </Form.Item>

          <Form.Item
            name="name"
            label="应用名称"
            rules={[{ required: true, message: '请输入应用名称' }]}
          >
            <Input placeholder="应用的显示名称" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="organizationName"
                label="组织名称"
                rules={[{ required: true, message: '请输入组织名称' }]}
              >
                <Input placeholder="组织或用户名" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="repositoryName"
                label="仓库名称"
                rules={[{ required: true, message: '请输入仓库名称' }]}
              >
                <Input placeholder="仓库名称" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="description"
            label="应用描述"
          >
            <TextArea rows={3} placeholder="应用的详细描述（可选）" />
          </Form.Item>

          <Form.Item
            name="enableDomainValidation"
            label="启用域名验证"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) =>
              prevValues.enableDomainValidation !== currentValues.enableDomainValidation
            }
          >
            {({ getFieldValue }) =>
              getFieldValue('enableDomainValidation') ? (
                <Form.Item
                  name="allowedDomains"
                  label="允许的域名"
                  rules={[{ required: true, message: '请输入至少一个域名' }]}
                >
                  <Select
                    mode="tags"
                    placeholder="输入域名，按回车添加多个"
                    tokenSeparators={[',', '\n']}
                  />
                </Form.Item>
              ) : null
            }
          </Form.Item>
        </Form>
      </Modal>

      {/* 使用说明模态框 */}
      <Modal
        title={
          <Space style={{ color: '#ffffff' }}>
            <CodeOutlined style={{ color: '#1890ff' }} />
            使用说明 - {selectedApp?.name}
          </Space>
        }
        open={usageModalVisible}
        onCancel={() => setUsageModalVisible(false)}
        footer={[
          <Button 
            key="close" 
            onClick={() => setUsageModalVisible(false)}
            style={{ 
              background: 'rgba(255, 255, 255, 0.1)', 
              borderColor: 'rgba(255, 255, 255, 0.2)',
              color: '#ffffff'
            }}
          >
            关闭
          </Button>
        ]}
        width={800}
        className={styles.usageModal}
        closeIcon={<span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>×</span>}
      >
        {selectedApp && (
          <div>
            <div 
              style={{ 
                padding: '16px 20px',
                borderRadius: '8px',
                background: 'rgba(24, 144, 255, 0.1)',
                border: '1px solid rgba(24, 144, 255, 0.2)',
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px'
              }}
            >
              <div style={{ fontSize: '20px', marginTop: '2px' }}>💡</div>
              <div>
                <div style={{ color: '#1890ff', fontWeight: 500, marginBottom: '4px' }}>集成说明</div>
                <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px' }}>
                  将以下代码添加到您的网站页面中，即可启用 AI 聊天功能。
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <Title level={5} style={{ color: '#ffffff', margin: 0 }}>HTML 集成代码</Title>
                <Button
                  type="text"
                  size="small"
                  icon={<CopyOutlined />}
                  onClick={() => copyToClipboard(generateUsageCode(selectedApp))}
                  style={{ 
                    color: '#1890ff',
                    background: 'rgba(24, 144, 255, 0.1)',
                    border: '1px solid rgba(24, 144, 255, 0.3)',
                    borderRadius: '6px',
                    height: '28px'
                  }}
                >
                  复制全部
                </Button>
              </div>
              <div className={styles.codeBlock}>
                <pre>{generateUsageCode(selectedApp)}</pre>
                <div 
                  style={{ 
                    position: 'absolute', 
                    top: '-1px', 
                    left: '-1px', 
                    padding: '4px 8px', 
                    background: 'rgba(0, 0, 0, 0.4)',
                    borderRadius: '8px 0 8px 0',
                    fontSize: '11px',
                    color: 'rgba(255, 255, 255, 0.6)'
                  }}
                >
                  HTML
                </div>
              </div>
            </div>

            <div style={{ 
              background: 'rgba(255, 255, 255, 0.03)', 
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              padding: '20px',
              marginBottom: '24px'
            }}>
              <Title level={5} style={{ color: '#ffffff', marginBottom: '16px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '12px' }}>
                配置信息
              </Title>
              <Row gutter={[24, 24]}>
                <Col span={12}>
                  <div style={{ marginBottom: '8px' }}>
                    <Text style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '12px' }}>应用 ID</Text>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Text style={{ color: '#ffffff', fontSize: '14px' }}>{selectedApp.appId}</Text>
                    <Button
                      type="text"
                      size="small"
                      icon={<CopyOutlined />}
                      onClick={() => copyToClipboard(selectedApp.appId)}
                      style={{ 
                        color: 'rgba(255, 255, 255, 0.6)',
                        padding: '0 4px',
                        height: '22px',
                        lineHeight: '20px'
                      }}
                    />
                  </div>
                </Col>
                <Col span={12}>
                  <div style={{ marginBottom: '8px' }}>
                    <Text style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '12px' }}>应用名称</Text>
                  </div>
                  <Text style={{ color: '#ffffff', fontSize: '14px' }}>{selectedApp.name}</Text>
                </Col>
                <Col span={12}>
                  <div style={{ marginBottom: '8px' }}>
                    <Text style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '12px' }}>组织/仓库</Text>
                  </div>
                  <Text style={{ color: '#ffffff', fontSize: '14px' }}>
                    <GlobalOutlined style={{ marginRight: '6px', fontSize: '12px' }} />
                    {selectedApp.organizationName}/{selectedApp.repositoryName}
                  </Text>
                </Col>
                <Col span={12}>
                  <div style={{ marginBottom: '8px' }}>
                    <Text style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '12px' }}>域名验证</Text>
                  </div>
                  <Tag 
                    style={{
                      background: selectedApp.enableDomainValidation ? 'rgba(82, 196, 26, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                      color: selectedApp.enableDomainValidation ? '#52c41a' : 'rgba(255, 255, 255, 0.6)',
                      border: `1px solid ${selectedApp.enableDomainValidation ? 'rgba(82, 196, 26, 0.4)' : 'rgba(255, 255, 255, 0.2)'}`,
                      borderRadius: '4px'
                    }}
                  >
                    {selectedApp.enableDomainValidation ? '已启用' : '未启用'}
                  </Tag>
                </Col>
              </Row>
            </div>

            {selectedApp.enableDomainValidation && selectedApp.allowedDomains.length > 0 && (
              <div style={{ 
                background: 'rgba(255, 255, 255, 0.03)', 
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                padding: '20px'
              }}>
                <Title level={5} style={{ color: '#ffffff', marginBottom: '16px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '12px' }}>
                  允许的域名
                </Title>
                <div className={styles.domainList}>
                  {selectedApp.allowedDomains.map(domain => (
                    <Tag key={domain}>{domain}</Tag>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AppManagement; 