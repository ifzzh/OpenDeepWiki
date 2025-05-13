import { Button, Form, Input, Modal, Select, message, Spin, Divider, Space, Switch, Typography, theme, Radio, Upload, Alert } from 'antd';
import { useState, useEffect } from 'react';
import { RepositoryFormValues } from '../types';
import { submitWarehouse, UploadAndSubmitWarehouse } from '../services';
import { GithubOutlined, LockOutlined, UserOutlined, LinkOutlined, BranchesOutlined, UploadOutlined, FileZipOutlined, InboxOutlined } from '@ant-design/icons';

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
  const [submitType, setSubmitType] = useState('git');
  const [fileList, setFileList] = useState<any[]>([]);
  const { token } = useToken();

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      if (loading) {
        return;
      }

      if (submitType === 'git') {
        // 使用Git仓库地址提交
        const response = await submitWarehouse(values) as any;

        if (response.data.code === 200) {
          message.success('仓库添加成功');
          onSubmit(values);
          form.resetFields();
        } else {
          message.error(response.data.message || '添加失败，请重试')
        }
      } else {
        // 使用压缩包提交
        if (fileList.length === 0) {
          message.error('请上传压缩包文件');
          setLoading(false);
          return;
        }

        const file = fileList[0];
        if (!file || !file.originFileObj) {
          message.error('文件对象无效，请重新上传');
          setLoading(false);
          return;
        }

        const formData = new FormData();
        formData.append('file', file.originFileObj);
        formData.append('organization', values.organization);
        formData.append('repositoryName', values.repositoryName);

        const { data } = await UploadAndSubmitWarehouse(formData) as any;
        if (data) {
          if (data.code === 200) {
            message.success('压缩包上传成功');
            form.resetFields();
            setFileList([]);
          } else {
            message.error(data.message || '上传失败，请重试');
          }
        }
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
      setSubmitType('git');
      setFileList([]);
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

  const handleTypeChange = (e: any) => {
    setSubmitType(e.target.value);
    // 切换时清空不相关的字段
    if (e.target.value === 'git') {
      form.setFieldsValue({
        organization: undefined,
        repositoryName: undefined
      });
      setFileList([]);
    } else {
      form.setFieldsValue({
        address: undefined,
        enableGitAuth: false,
        gitUserName: undefined,
        gitPassword: undefined
      });
      setEnableGitAuth(false);
    }
  };

  const uploadProps = {
    onRemove: () => {
      setFileList([]);
    },
    beforeUpload: (file: any) => {
      const isZip = file.type === 'application/zip' ||
        file.type === 'application/x-gzip' ||
        file.type === 'application/x-tar' ||
        file.type === 'application/x-brotli' ||
        /\.(zip|gz|tar|br)$/.test(file.name);

      if (!isZip) {
        message.error('只支持 zip、gz、tar、br 格式的压缩文件');
        return Upload.LIST_IGNORE;
      }

      // 直接将文件对象添加到数组中
      setFileList([
        {
          uid: file.uid || '-1',
          name: file.name,
          status: 'done',
          originFileObj: file,
        }
      ]);

      return false; // 阻止自动上传
    },
    fileList,
    maxCount: 1,
    // 确保正确处理文件列表变化
    onChange(info: any) {
      // 如果是上传成功或移除文件的操作，更新文件列表
      if (info.file.status === 'done' || info.file.status === 'removed') {
        setFileList(info.fileList);
      }
    },
  };

  return (
    <Modal
      title={
        <Space>
          {submitType === 'git' ?
            <GithubOutlined style={{ color: token.colorPrimary }} /> :
            <FileZipOutlined style={{ color: token.colorPrimary }} />
          }
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
          icon={submitType === 'git' ? <GithubOutlined /> : <UploadOutlined />}
        >
          提交
        </Button>,
      ]}
      width={500}
    >
      <Form
        form={form}
        layout="vertical"
        requiredMark="optional"
        initialValues={{
          type: 'git',
          branch: 'main',
          enableGitAuth: false,
          submitType: 'git',
          ...initialValues,
        }}
        style={{ maxWidth: '100%' }}
      >
        <Form.Item
          name="submitType"
          label="提交方式"
        >
          <Radio.Group onChange={handleTypeChange} value={submitType}>
            <Radio.Button value="git">Git仓库</Radio.Button>
            <Radio.Button value="upload">上传压缩包</Radio.Button>
          </Radio.Group>
        </Form.Item>

        {submitType === 'git' ? (
          <>
            <Form.Item
              name="address"
              label="仓库地址"
              rules={[{ required: submitType === 'git', message: '请输入仓库地址' }]}
            >
              <Input
                placeholder="https://github.com/username/repository"
                prefix={<LinkOutlined style={{ color: token.colorTextSecondary }} />}
                allowClear
                disabled={disabledFields.includes('address')}
              />
            </Form.Item>

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
          </>
        ) : (
          <>
            <Alert
              message="压缩包上传说明"
              description="支持的格式：zip、gz、tar、br"
              type="info"
              showIcon
              style={{ marginBottom: token.marginMD }}
            />

            <Form.Item
              name="organization"
              label="组织名称"
              rules={[{ required: submitType === 'upload', message: '请输入组织名称' }]}
            >
              <Input
                placeholder="请输入组织名称"
                allowClear
              />
            </Form.Item>

            <Form.Item
              name="repositoryName"
              label="仓库名称"
              rules={[{ required: submitType === 'upload', message: '请输入仓库名称' }]}
            >
              <Input
                placeholder="请输入仓库名称"
                allowClear
              />
            </Form.Item>

            <Form.Item
              label="上传压缩包"
              required={submitType === 'upload'}
              extra={<Text type="secondary" style={{ fontSize: token.fontSizeSM }}>只支持zip、gz、tar、br格式的压缩文件</Text>}
            >
              <Upload.Dragger {...uploadProps}>
                <p className="ant-upload-drag-icon">
                  <InboxOutlined style={{ color: token.colorPrimary }} />
                </p>
                <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
                <p className="ant-upload-hint" style={{ fontSize: token.fontSizeSM }}>
                  支持 .zip、.gz、.tar、.br 格式的压缩文件
                </p>
              </Upload.Dragger>
            </Form.Item>
          </>
        )}
      </Form>
    </Modal>
  );
};

export default RepositoryForm; 