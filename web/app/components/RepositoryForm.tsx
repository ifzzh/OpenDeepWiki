import { Button, Form, Input, Modal, Select, message, Spin, Divider, Space, Switch, Typography, theme } from 'antd';
import { useState, useEffect } from 'react';
import { RepositoryFormValues } from '../types';
import { submitWarehouse } from '../services';
import { GithubOutlined, LockOutlined, UserOutlined, LinkOutlined, BranchesOutlined } from '@ant-design/icons';

const { Text, Title } = Typography;
const { useToken } = theme;

interface RepositoryFormProps {
  open: boolean;
  onCancel: () => void;
  onSubmit: (values: RepositoryFormValues) => void;
  initialValues?: Partial<RepositoryFormValues>;
  disabledFields?: string[];
}

const RepositoryForm: React.FC<RepositoryFormProps> = ({
  open,
  onCancel,
  onSubmit,
  initialValues,
  disabledFields = [],
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [enableGitAuth, setEnableGitAuth] = useState(false);
  const { token } = useToken();

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      // Call the API service
      const response = await submitWarehouse(values) as any;

      if (response.data.code === 200) {
        message.success('仓库添加成功');
        onSubmit(values);
        form.resetFields();
      } else {
        message.error(response.data.message || '添加失败，请重试')
      }
    } catch (error) {
      console.error('Form submission failed:', error);
    } finally {
      setLoading(false);
    }
  };

  // 重置表单
  useEffect(() => {
    if (!open) {
      setEnableGitAuth(false);
      form.resetFields();
    } else if (initialValues) {
      form.setFieldsValue(initialValues);
    }
  }, [open, form, initialValues]);

  const handleGitAuthChange = (checked: boolean) => {
    setEnableGitAuth(checked);
    if (!checked) {
      form.setFieldsValue({
        gitUserName: undefined,
        gitPassword: undefined
      });
    }
  };

  return (
    <Modal
      title={
        <Space>
          <GithubOutlined style={{ color: token.colorPrimary }} />
          <Title level={5} style={{ margin: 0 }}>添加仓库</Title>
        </Space>
      }
      open={open}
      onCancel={onCancel}
      
      destroyOnClose
      footer={[
        <Button key="cancel" onClick={onCancel} disabled={loading}>
          取消
        </Button>,
        <Button 
          key="submit" 
          type="primary" 
          onClick={handleSubmit} 
          loading={loading}
          icon={<GithubOutlined />}
        >
          提交
        </Button>,
      ]}
      width={500}
      bodyStyle={{ 
        padding: token.paddingLG,
        backgroundColor: token.colorBgContainer 
      }}
    >
      <Form
        form={form}
        layout="vertical"
        requiredMark="optional"
        initialValues={{
          type: 'git',
          branch: 'main',
          enableGitAuth: false,
          ...initialValues,
        }}
        style={{ maxWidth: '100%' }}
      >
        <Form.Item
          name="address"
          label="仓库地址"
          rules={[{ required: true, message: '请输入仓库地址' }]}
        >
          <Input 
            placeholder="https://github.com/username/repository" 
            prefix={<LinkOutlined style={{ color: token.colorTextSecondary }} />}
            allowClear
            disabled={disabledFields.includes('address')}
          />
        </Form.Item>
{/*         
        <Form.Item
          name="branch"
          label="分支名称"
          rules={[{ required: true, message: '请输入分支名称' }]}
        >
          <Input 
            placeholder="main" 
            prefix={<BranchesOutlined style={{ color: token.colorTextSecondary }} />}
            allowClear
          />
        </Form.Item> */}

        <Divider style={{ margin: `${token.marginMD}px 0` }} />
        
        <Form.Item
          name="enableGitAuth"
          label={
            <Space>
              <LockOutlined style={{ color: token.colorWarning }} />
              <Text>启用私有仓库认证</Text>
            </Space>
          }
          tooltip="如果是私有仓库，请启用此选项并填写凭据"
          valuePropName="checked"
        >
          <Switch onChange={handleGitAuthChange} />
        </Form.Item>

        {enableGitAuth && (
          <Space direction="vertical" style={{ width: '100%' }}>
            <Form.Item
              name="gitUserName"
              label="Git用户名"
              rules={[{ required: enableGitAuth, message: '请输入Git用户名' }]}
            >
              <Input 
                placeholder="请输入Git用户名" 
                prefix={<UserOutlined style={{ color: token.colorTextSecondary }} />}
                allowClear
              />
            </Form.Item>

            <Form.Item
              name="gitPassword"
              label="Git密码/访问令牌"
              rules={[{ required: enableGitAuth, message: '请输入Git密码或访问令牌' }]}
              extra={<Text type="secondary" style={{ fontSize: token.fontSizeSM }}>对于GitHub，推荐使用Personal Access Token</Text>}
            >
              <Input.Password 
                placeholder="请输入Git密码或访问令牌" 
                prefix={<LockOutlined style={{ color: token.colorTextSecondary }} />}
              />
            </Form.Item>
          </Space>
        )}
      </Form>
    </Modal>
  );
};

export default RepositoryForm; 