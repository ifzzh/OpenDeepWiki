'use client'
import { Card, Tabs, Form, Input, Button, Select, Switch, InputNumber, Divider, Space, Alert, Upload, message } from 'antd';
import { 
  SaveOutlined, 
  GlobalOutlined, 
  MailOutlined, 
  SecurityScanOutlined, 
  CloudOutlined,
  UploadOutlined
} from '@ant-design/icons';
import { useState } from 'react';
import type { TabsProps } from 'antd';

export default function SettingsPage() {
  const [generalForm] = Form.useForm();
  const [emailForm] = Form.useForm();
  const [securityForm] = Form.useForm();
  const [storageForm] = Form.useForm();
  
  const [activeTab, setActiveTab] = useState('general');

  // 处理表单提交
  const handleFormSubmit = (formType: string, values: any) => {
    message.success('设置已保存');
  };
  
  // Tab 项定义
  const tabItems: TabsProps['items'] = [
    {
      key: 'general',
      label: (
        <span>
          <GlobalOutlined />
          常规设置
        </span>
      ),
      children: (
        <Form
          form={generalForm}
          layout="vertical"
          initialValues={{
            siteName: 'OpenDeepWiki',
            siteDescription: '开源的知识库平台',
            language: 'zh-CN',
            timezone: 'Asia/Shanghai',
            homePage: 'dashboard',
            enableRegistration: true,
            requireEmailVerification: true
          }}
          onFinish={(values) => handleFormSubmit('general', values)}
        >
          <Alert 
            message="这些设置将影响整个系统的基本行为" 
            type="info" 
            showIcon 
            style={{ marginBottom: 24 }}
          />
          
          <Form.Item
            name="siteName"
            label="网站名称"
            rules={[{ required: true, message: '请输入网站名称' }]}
          >
            <Input placeholder="网站名称" />
          </Form.Item>
          
          <Form.Item
            name="siteDescription"
            label="网站描述"
          >
            <Input.TextArea placeholder="网站描述" rows={3} />
          </Form.Item>
          
          <Form.Item
            name="logoUrl"
            label="网站Logo"
          >
            <Upload
              name="logo"
              action="/api/upload"
              listType="picture"
              maxCount={1}
            >
              <Button icon={<UploadOutlined />}>上传Logo</Button>
            </Upload>
          </Form.Item>
          
          <Form.Item
            name="language"
            label="默认语言"
            rules={[{ required: true, message: '请选择默认语言' }]}
          >
            <Select
              options={[
                { value: 'zh-CN', label: '简体中文' },
                { value: 'en-US', label: '英文' },
                { value: 'zh-TW', label: '繁体中文' },
                { value: 'ja', label: '日文' },
                { value: 'ko', label: '韩文' },
                { value: 'fr', label: '法文' },
                { value: 'de', label: '德文' },
              ]}
            />
          </Form.Item>
          
          <Form.Item
            name="timezone"
            label="时区"
            rules={[{ required: true, message: '请选择时区' }]}
          >
            <Select
              options={[
                { value: 'Asia/Shanghai', label: '(GMT+8:00) 北京，上海' },
                { value: 'America/New_York', label: '(GMT-5:00) 纽约' },
                { value: 'Europe/London', label: '(GMT+0:00) 伦敦' },
                { value: 'Asia/Tokyo', label: '(GMT+9:00) 东京' },
              ]}
            />
          </Form.Item>
          
          <Form.Item
            name="homePage"
            label="默认首页"
          >
            <Select
              options={[
                { value: 'dashboard', label: '仪表盘' },
                { value: 'repositories', label: '仓库列表' },
                { value: 'myrepos', label: '我的仓库' },
              ]}
            />
          </Form.Item>
          
          <Divider>用户设置</Divider>
          
          <Form.Item
            name="enableRegistration"
            label="允许新用户注册"
            valuePropName="checked"
          >
            <Switch checkedChildren="启用" unCheckedChildren="禁用" />
          </Form.Item>
          
          <Form.Item
            name="requireEmailVerification"
            label="要求邮箱验证"
            valuePropName="checked"
          >
            <Switch checkedChildren="是" unCheckedChildren="否" />
          </Form.Item>
          
          <Form.Item>
            <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>
              保存设置
            </Button>
          </Form.Item>
        </Form>
      )
    },
    {
      key: 'email',
      label: (
        <span>
          <MailOutlined />
          邮件设置
        </span>
      ),
      children: (
        <Form
          form={emailForm}
          layout="vertical"
          initialValues={{
            smtpHost: 'smtp.example.com',
            smtpPort: 587,
            smtpSecure: true,
            smtpUser: 'noreply@example.com',
            emailFromName: 'OpenDeepWiki System',
          }}
          onFinish={(values) => handleFormSubmit('email', values)}
        >
          <Alert 
            message="正确配置邮件设置以确保系统通知和用户邮件验证功能" 
            type="info" 
            showIcon 
            style={{ marginBottom: 24 }}
          />
          
          <Form.Item
            name="smtpHost"
            label="SMTP服务器"
            rules={[{ required: true, message: '请输入SMTP服务器地址' }]}
          >
            <Input placeholder="smtp.example.com" />
          </Form.Item>
          
          <Form.Item
            name="smtpPort"
            label="SMTP端口"
            rules={[{ required: true, message: '请输入SMTP端口' }]}
          >
            <InputNumber min={1} max={65535} style={{ width: '100%' }} />
          </Form.Item>
          
          <Form.Item
            name="smtpSecure"
            label="使用SSL/TLS"
            valuePropName="checked"
          >
            <Switch checkedChildren="是" unCheckedChildren="否" />
          </Form.Item>
          
          <Form.Item
            name="smtpUser"
            label="SMTP用户名"
            rules={[{ required: true, message: '请输入SMTP用户名' }]}
          >
            <Input placeholder="noreply@example.com" />
          </Form.Item>
          
          <Form.Item
            name="smtpPassword"
            label="SMTP密码"
            rules={[{ required: true, message: '请输入SMTP密码' }]}
          >
            <Input.Password placeholder="SMTP密码" />
          </Form.Item>
          
          <Form.Item
            name="emailFromName"
            label="发件人名称"
            rules={[{ required: true, message: '请输入发件人名称' }]}
          >
            <Input placeholder="OpenDeepWiki System" />
          </Form.Item>
          
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>
                保存设置
              </Button>
              <Button>
                发送测试邮件
              </Button>
            </Space>
          </Form.Item>
        </Form>
      )
    },
    {
      key: 'security',
      label: (
        <span>
          <SecurityScanOutlined />
          安全设置
        </span>
      ),
      children: (
        <Form
          form={securityForm}
          layout="vertical"
          initialValues={{
            sessionTimeout: 120,
            maxLoginAttempts: 5,
            lockoutDuration: 30,
            passwordMinLength: 8,
            passwordRequireSpecialChar: true,
            passwordRequireNumber: true,
            passwordRequireUppercase: true,
            enableTwoFactor: false,
          }}
          onFinish={(values) => handleFormSubmit('security', values)}
        >
          <Alert 
            message="这些设置影响系统的安全性，请谨慎修改" 
            type="warning" 
            showIcon 
            style={{ marginBottom: 24 }}
          />
          
          <Divider>会话设置</Divider>
          
          <Form.Item
            name="sessionTimeout"
            label="会话超时时间(分钟)"
            rules={[{ required: true, message: '请输入会话超时时间' }]}
          >
            <InputNumber min={5} max={1440} style={{ width: '100%' }} />
          </Form.Item>
          
          <Divider>登录设置</Divider>
          
          <Form.Item
            name="maxLoginAttempts"
            label="最大登录尝试次数"
            rules={[{ required: true, message: '请输入最大登录尝试次数' }]}
          >
            <InputNumber min={1} max={10} style={{ width: '100%' }} />
          </Form.Item>
          
          <Form.Item
            name="lockoutDuration"
            label="账户锁定时间(分钟)"
            rules={[{ required: true, message: '请输入账户锁定时间' }]}
          >
            <InputNumber min={5} max={1440} style={{ width: '100%' }} />
          </Form.Item>
          
          <Divider>密码策略</Divider>
          
          <Form.Item
            name="passwordMinLength"
            label="密码最小长度"
            rules={[{ required: true, message: '请输入密码最小长度' }]}
          >
            <InputNumber min={6} max={32} style={{ width: '100%' }} />
          </Form.Item>
          
          <Form.Item
            name="passwordRequireSpecialChar"
            label="要求包含特殊字符"
            valuePropName="checked"
          >
            <Switch checkedChildren="是" unCheckedChildren="否" />
          </Form.Item>
          
          <Form.Item
            name="passwordRequireNumber"
            label="要求包含数字"
            valuePropName="checked"
          >
            <Switch checkedChildren="是" unCheckedChildren="否" />
          </Form.Item>
          
          <Form.Item
            name="passwordRequireUppercase"
            label="要求包含大写字母"
            valuePropName="checked"
          >
            <Switch checkedChildren="是" unCheckedChildren="否" />
          </Form.Item>
          
          <Divider>两步验证</Divider>
          
          <Form.Item
            name="enableTwoFactor"
            label="启用两步验证"
            valuePropName="checked"
          >
            <Switch checkedChildren="启用" unCheckedChildren="禁用" />
          </Form.Item>
          
          <Form.Item>
            <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>
              保存设置
            </Button>
          </Form.Item>
        </Form>
      )
    },
    {
      key: 'storage',
      label: (
        <span>
          <CloudOutlined />
          存储设置
        </span>
      ),
      children: (
        <Form
          form={storageForm}
          layout="vertical"
          initialValues={{
            storageType: 'local',
            maxFileSize: 10,
            allowedFileTypes: '.jpg,.jpeg,.png,.pdf,.md,.doc,.docx',
          }}
          onFinish={(values) => handleFormSubmit('storage', values)}
        >
          <Alert 
            message="配置系统文件存储方式和限制" 
            type="info" 
            showIcon 
            style={{ marginBottom: 24 }}
          />
          
          <Form.Item
            name="storageType"
            label="存储类型"
            rules={[{ required: true, message: '请选择存储类型' }]}
          >
            <Select
              options={[
                { value: 'local', label: '本地存储' },
                { value: 's3', label: 'Amazon S3' },
                { value: 'oss', label: '阿里云OSS' },
                { value: 'cos', label: '腾讯云COS' },
              ]}
            />
          </Form.Item>
          
          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) => 
              prevValues.storageType !== currentValues.storageType
            }
          >
            {({ getFieldValue }) => {
              const storageType = getFieldValue('storageType');
              if (storageType === 's3') {
                return (
                  <>
                    <Form.Item
                      name="s3Endpoint"
                      label="S3端点"
                      rules={[{ required: true, message: '请输入S3端点' }]}
                    >
                      <Input placeholder="https://s3.amazonaws.com" />
                    </Form.Item>
                    
                    <Form.Item
                      name="s3Bucket"
                      label="Bucket名称"
                      rules={[{ required: true, message: '请输入Bucket名称' }]}
                    >
                      <Input placeholder="my-bucket" />
                    </Form.Item>
                    
                    <Form.Item
                      name="s3AccessKey"
                      label="Access Key"
                      rules={[{ required: true, message: '请输入Access Key' }]}
                    >
                      <Input placeholder="Access Key" />
                    </Form.Item>
                    
                    <Form.Item
                      name="s3SecretKey"
                      label="Secret Key"
                      rules={[{ required: true, message: '请输入Secret Key' }]}
                    >
                      <Input.Password placeholder="Secret Key" />
                    </Form.Item>
                    
                    <Form.Item
                      name="s3Region"
                      label="区域"
                      rules={[{ required: true, message: '请输入区域' }]}
                    >
                      <Input placeholder="us-east-1" />
                    </Form.Item>
                  </>
                );
              }
              return null;
            }}
          </Form.Item>
          
          <Divider>文件上传设置</Divider>
          
          <Form.Item
            name="maxFileSize"
            label="最大文件大小(MB)"
            rules={[{ required: true, message: '请输入最大文件大小' }]}
          >
            <InputNumber min={1} max={1000} style={{ width: '100%' }} />
          </Form.Item>
          
          <Form.Item
            name="allowedFileTypes"
            label="允许的文件类型"
            rules={[{ required: true, message: '请输入允许的文件类型' }]}
          >
            <Input placeholder=".jpg,.jpeg,.png,.pdf,.md,.doc,.docx" />
          </Form.Item>
          
          <Form.Item>
            <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>
              保存设置
            </Button>
          </Form.Item>
        </Form>
      )
    },
  ];

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>系统管理</h2>
      
      <Card>
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab} 
          items={tabItems}
          type="card"
        />
      </Card>
    </div>
  );
}