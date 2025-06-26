import { Button, Form, Input, Modal, Select, message, Spin, Divider, Space, Switch, Typography, theme, Radio, Upload, Alert } from 'antd';
import { useState, useEffect } from 'react';
import { RepositoryFormValues } from '../types';
import { submitWarehouse, UploadAndSubmitWarehouse, getBranchList, Customsubmitwarehouse } from '../services';
import { GithubOutlined, LockOutlined, UserOutlined, LinkOutlined, BranchesOutlined, UploadOutlined, FileZipOutlined, InboxOutlined, ReloadOutlined, SettingOutlined } from '@ant-design/icons';
import { useTranslation } from '../i18n/client';

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
  const [uploadMethod, setUploadMethod] = useState('url'); // 'file' or 'url'，默认选择URL
  const [branches, setBranches] = useState<string[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [manualBranchInput, setManualBranchInput] = useState(false);
  const [lastAddress, setLastAddress] = useState<string>('');
  const { token } = useToken();
  const { t } = useTranslation();

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
          message.success(t('repository.form.success_message', '仓库添加成功'));
          onSubmit(values);
          form.resetFields();
        } else {
          message.error(response.data.message || t('repository.form.error_message', '添加失败，请重试'))
        }
      } else if (submitType === 'custom') {
        // 使用自定义仓库提交
        const response = await Customsubmitwarehouse(values) as any;

        if (response.data.code === 200) {
          message.success(t('repository.form.success_message', '仓库添加成功'));
          onSubmit(values);
          form.resetFields();
        } else {
          message.error(response.data.message || t('repository.form.error_message', '添加失败，请重试'))
        }
      } else {
        // 使用压缩包提交
        if (uploadMethod === 'file') {
          // 文件上传方式
          if (fileList.length === 0) {
            message.error(t('repository.form.upload_required', '请上传压缩包文件'));
            setLoading(false);
            return;
          }

          const file = fileList[0];
          if (!file || !file.originFileObj) {
            message.error(t('repository.form.invalid_file', '文件对象无效，请重新上传'));
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
              message.success(t('repository.form.upload_success', '压缩包上传成功'));
              form.resetFields();
              setFileList([]);
            } else {
              message.error(data.message || t('repository.form.upload_failed', '上传失败，请重试'));
            }
          }
        } else {
          // URL下载方式
          if (!values.fileUrl) {
            message.error(t('repository.form.url_required', '请输入压缩包URL'));
            setLoading(false);
            return;
          }

          const formData = new FormData();
          formData.append('fileUrl', values.fileUrl);
          formData.append('organization', values.organization);
          formData.append('repositoryName', values.repositoryName);

          const { data } = await UploadAndSubmitWarehouse(formData) as any;
          if (data) {
            if (data.code === 200) {
              message.success(t('repository.form.url_download_success', '从URL下载压缩包成功'));
              form.resetFields();
            } else {
              message.error(data.message || t('repository.form.url_download_failed', '从URL下载失败，请重试'));
            }
          }
        }
      }
    } catch (error) {
      console.error('Form submission failed:', error);
    } finally {
      setLoading(false);
    }
  };

  // 监听表单地址变化，自动获取分支
  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const currentAddress = e.target.value;
    
    // 当地址输入完成且不为空，且与上次不同时，自动获取分支
    if (currentAddress && currentAddress !== lastAddress && currentAddress.includes('/')) {
      // 如果地址看起来是一个完整的仓库地址（包含域名和路径），则尝试获取分支
      if (
        (currentAddress.includes('github.com/') || 
         currentAddress.includes('gitee.com/')) &&
        currentAddress.split('/').filter(Boolean).length >= 2
      ) {
        setLastAddress(currentAddress);
        fetchBranches(currentAddress);
      }
    }
  };

  // 修改fetchBranches函数，允许传入地址参数，同时兼容点击事件
  const fetchBranches = async (addressOrEvent?: string | React.MouseEvent<HTMLElement>) => {
    // 判断参数类型
    let address: string;
    
    // 如果是事件对象，忽略它并使用表单值
    if (!addressOrEvent || typeof addressOrEvent !== 'string') {
      address = form.getFieldValue('address');
    } else {
      // 如果是字符串，直接使用
      address = addressOrEvent;
    }
    
    if (!address) {
      message.warning(t('repository.form.address_required', '请先输入仓库地址'));
      return;
    }

    setLoadingBranches(true);
    try {
      let username = undefined;
      let password = undefined;
      
      // 如果启用了Git认证，获取用户名和密码/令牌
      if (enableGitAuth) {
        username = form.getFieldValue('gitUserName');
        password = form.getFieldValue('gitPassword');
        
        if (!username || !password) {
          message.warning(t('repository.form.auth_required', '已启用认证，请先输入用户名和密码/令牌'));
          setLoadingBranches(false);
          return;
        }
      }

      const response = await getBranchList(address, username, password);
      
      if (response.success && response.data && response.data.length > 0) {
        setBranches(response.data);
        setManualBranchInput(false);
        
        // 检查是否有默认分支，如果有则选择默认分支，否则选择第一个分支
        const currentBranch = form.getFieldValue('branch');
        if (!currentBranch || currentBranch === 'main' || currentBranch === 'master') {
          // 优先使用API返回的默认分支
          if (response.defaultBranch && response.data.includes(response.defaultBranch)) {
            form.setFieldsValue({ branch: response.defaultBranch });
            message.success(t('repository.form.default_branch_loaded', { branch: response.defaultBranch }));
          } else {
            // 如果没有默认分支或默认分支不在分支列表中，则使用第一个分支
            form.setFieldsValue({ branch: response.data[0] });
            message.info(t('repository.form.no_default_branch', '未找到默认分支，已选择第一个分支'));
          }
        }
        
        message.success(t('repository.form.branch_loaded', '分支列表加载成功，已选择默认分支'));
      } else {
        setBranches(response.data || ['main', 'master']);
        setManualBranchInput(true);
        
        // 如果有返回默认分支但加载失败，尝试使用默认分支
        if (response.defaultBranch) {
          form.setFieldsValue({ branch: response.defaultBranch });
        }
        
        message.warning(response.error || t('repository.form.branch_load_failed', '获取分支列表失败，请手动输入分支名'));
      }
    } catch (error) {
      console.error('Failed to fetch branches:', error);
      setBranches(['main', 'master']);
      setManualBranchInput(true);
      message.error(t('repository.form.branch_load_error', '获取分支列表出错，请检查仓库地址和认证信息'));
    } finally {
      setLoadingBranches(false);
    }
  };

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
        repositoryName: undefined,
        fileUrl: undefined,
        email: undefined
      });
      setFileList([]);
    } else if (e.target.value === 'custom') {
      form.setFieldsValue({
        fileUrl: undefined
      });
      setFileList([]);
      setUploadMethod('url');
    } else {
      // upload类型
      form.setFieldsValue({
        address: undefined,
        branch: 'main',
        enableGitAuth: false,
        gitUserName: undefined,
        gitPassword: undefined,
        email: undefined
      });
      setEnableGitAuth(false);
      setBranches([]);
      setManualBranchInput(false);
    }
  };

  // 处理上传方式切换
  const handleUploadMethodChange = (e: any) => {
    setUploadMethod(e.target.value);
    // 切换时清空相关字段
    if (e.target.value === 'file') {
      form.setFieldsValue({ fileUrl: undefined });
    } else {
      setFileList([]);
    }
  };

  const toggleBranchInputMode = () => {
    setManualBranchInput(!manualBranchInput);
    // 切换到手动输入模式时，清空当前分支选择
    if (!manualBranchInput) {
      form.setFieldsValue({ branch: '' });
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
        message.error(t('repository.form.format_error', '只支持 zip、gz、tar、br 格式的压缩文件'));
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

  // 重置表单
  useEffect(() => {
    if (!open) {
      setEnableGitAuth(false);
      setSubmitType('git');
      setFileList([]);
      setUploadMethod('url'); // 重置时也默认选择URL
      setBranches([]);
      setManualBranchInput(false);
      setLastAddress('');
      form.resetFields();
    } else if (initialValues) {
      form.setFieldsValue(initialValues);
      // 如果初始值包含地址，尝试获取分支
      if (initialValues.address && !disabledFields.includes('address')) {
        setLastAddress(initialValues.address);
        fetchBranches(initialValues.address);
      }
    }
  }, [open]);

  return (
    <Modal
      title={
        <Space>
          {submitType === 'git' ?
            <GithubOutlined style={{ color: token.colorPrimary }} /> :
            submitType === 'custom' ?
              <SettingOutlined style={{ color: token.colorPrimary }} /> :
              <FileZipOutlined style={{ color: token.colorPrimary }} />
          }
          <Title level={5} style={{ margin: 0 }}>{t('repository.form.title')}</Title>
        </Space>
      }
      open={open}
      onCancel={onCancel}
      destroyOnClose
      footer={[
        <Button key="cancel" onClick={onCancel} disabled={loading}>
          {t('repository.form.cancel')}
        </Button>,
        <Button
          key="submit"
          type="primary"
          onClick={handleSubmit}
          loading={loading}
          icon={submitType === 'git' ? <GithubOutlined /> : submitType === 'custom' ? <SettingOutlined /> : <UploadOutlined />}
        >
          {t('repository.form.submit')}
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
            uploadMethod: 'url', // 默认选择URL方式
            ...initialValues,
          }}
        style={{ maxWidth: '100%' }}
      >
        <Form.Item
          name="submitType"
          label={t('repository.form.submit_type')}
        >
          <Radio.Group onChange={handleTypeChange} value={submitType}>
            <Radio.Button value="git">{t('repository.form.git_repo')}</Radio.Button>
            <Radio.Button value="custom">{t('repository.form.custom_repo')}</Radio.Button>
            <Radio.Button value="upload">{t('repository.form.upload_zip')}</Radio.Button>
          </Radio.Group>
        </Form.Item>

        {submitType === 'git' ? (
          <>
            <Form.Item
              name="address"
              label={t('repository.form.repo_address')}
              rules={[{ required: submitType === 'git', message: t('repository.form.address_required', '请输入仓库地址') }]}
            >
              <Input
                placeholder={t('repository.form.repo_address_placeholder')}
                prefix={<LinkOutlined style={{ color: token.colorTextSecondary }} />}
                allowClear
                disabled={disabledFields.includes('address')}
                onChange={handleAddressChange}
                onBlur={e => {
                  // 当失去焦点且地址完整时，尝试获取分支
                  if (e.target.value && e.target.value !== lastAddress) {
                    setLastAddress(e.target.value);
                    fetchBranches(e.target.value);
                  }
                }}
              />
            </Form.Item>

            <Form.Item
              name="branch"
              label={
                <Space>
                  <BranchesOutlined style={{ color: token.colorPrimary }} />
                  <Text>{t('repository.form.branch')}</Text>
                  <Space>
                    <Button 
                      type="link" 
                      size="small" 
                      onClick={fetchBranches} 
                      loading={loadingBranches}
                      icon={<ReloadOutlined />}
                      style={{ padding: '0 4px' }}
                    >
                      {t('repository.form.load_branches', '加载分支')}
                    </Button>
                    <Button
                      type="link"
                      size="small"
                      onClick={toggleBranchInputMode}
                      style={{ padding: '0 4px' }}
                    >
                      {manualBranchInput ? 
                        t('repository.form.use_select', '使用选择器') : 
                        t('repository.form.manual_input', '手动输入')}
                    </Button>
                  </Space>
                </Space>
              }
              tooltip={t('repository.form.branch_tooltip', '选择要使用的仓库分支，点击加载分支按钮获取所有可用分支')}
              rules={[{ required: submitType === 'git', message: t('repository.form.branch_required', '请选择分支') }]}
            >
              {manualBranchInput ? (
                <Input
                  placeholder={t('repository.form.branch_input_placeholder', '请输入分支名称')}
                  prefix={<BranchesOutlined style={{ color: token.colorTextSecondary }} />}
                  allowClear
                  disabled={disabledFields.includes('branch')}
                />
              ) : (
                <Select
                  placeholder={t('repository.form.branch_placeholder', '选择分支')}
                  loading={loadingBranches}
                  showSearch
                  allowClear
                  disabled={disabledFields.includes('branch')}
                >
                  {branches.map(branch => (
                    <Select.Option key={branch} value={branch}>
                      {branch}
                    </Select.Option>
                  ))}
                </Select>
              )}
            </Form.Item>

            <Divider style={{ margin: `${token.marginMD}px 0` }} />

            <Form.Item
              name="enableGitAuth"
              label={
                <Space>
                  <LockOutlined style={{ color: token.colorWarning }} />
                  <Text>{t('repository.form.enable_auth')}</Text>
                </Space>
              }
              tooltip={t('repository.form.auth_tooltip')}
              valuePropName="checked"
            >
              <Switch onChange={handleGitAuthChange} />
            </Form.Item>

            {enableGitAuth && (
              <Space direction="vertical" style={{ width: '100%' }}>
                <Form.Item
                  name="gitUserName"
                  label={t('repository.form.git_username')}
                  rules={[{ required: enableGitAuth, message: t('repository.form.username_required', '请输入Git用户名') }]}
                >
                  <Input
                    placeholder={t('repository.form.git_username_placeholder')}
                    prefix={<UserOutlined style={{ color: token.colorTextSecondary }} />}
                    allowClear
                  />
                </Form.Item>

                <Form.Item
                  name="gitPassword"
                  label={t('repository.form.git_password')}
                  rules={[{ required: enableGitAuth, message: t('repository.form.password_required', '请输入Git密码或访问令牌') }]}
                  extra={<Text type="secondary" style={{ fontSize: token.fontSizeSM }}>{t('repository.form.git_token_tip')}</Text>}
                >
                  <Input.Password
                    placeholder={t('repository.form.git_password_placeholder')}
                    prefix={<LockOutlined style={{ color: token.colorTextSecondary }} />}
                  />
                </Form.Item>
              </Space>
            )}
          </>
        ) : submitType === 'custom' ? (
          <>
            <Alert
              message="自定义仓库提交"
              description="请填写自定义仓库的详细信息，包括组织名、仓库名、Git地址等。"
              type="info"
              showIcon
              style={{ marginBottom: token.marginMD }}
            />

            <Form.Item
              name="organization"
              label="组织名称"
              rules={[{ required: submitType === 'custom', message: '请输入组织名称' }]}
            >
              <Input
                placeholder="请输入组织名称"
                allowClear
              />
            </Form.Item>

            <Form.Item
              name="repositoryName"
              label="仓库名称"
              rules={[{ required: submitType === 'custom', message: '请输入仓库名称' }]}
            >
              <Input
                placeholder="请输入仓库名称"
                allowClear
              />
            </Form.Item>

            <Form.Item
              name="address"
              label="仓库地址"
              rules={[{ required: submitType === 'custom', message: '请输入仓库地址' }]}
            >
              <Input
                placeholder="https://github.com/user/repo.git"
                prefix={<LinkOutlined style={{ color: token.colorTextSecondary }} />}
                allowClear
                onChange={handleAddressChange}
                onBlur={e => {
                  // 当失去焦点且地址完整时，尝试获取分支
                  if (e.target.value && e.target.value !== lastAddress) {
                    setLastAddress(e.target.value);
                    fetchBranches(e.target.value);
                  }
                }}
              />
            </Form.Item>

            <Form.Item
              name="branch"
              label={
                <Space>
                  <BranchesOutlined style={{ color: token.colorPrimary }} />
                  <Text>分支</Text>
                  <Space>
                    <Button 
                      type="link" 
                      size="small" 
                      onClick={fetchBranches} 
                      loading={loadingBranches}
                      icon={<ReloadOutlined />}
                      style={{ padding: '0 4px' }}
                    >
                      加载分支
                    </Button>
                    <Button
                      type="link"
                      size="small"
                      onClick={toggleBranchInputMode}
                      style={{ padding: '0 4px' }}
                    >
                      {manualBranchInput ? '使用选择器' : '手动输入'}
                    </Button>
                  </Space>
                </Space>
              }
              tooltip="选择要使用的仓库分支"
              rules={[{ required: submitType === 'custom', message: '请选择分支' }]}
            >
              {manualBranchInput ? (
                <Input
                  placeholder="请输入分支名称"
                  prefix={<BranchesOutlined style={{ color: token.colorTextSecondary }} />}
                  allowClear
                />
              ) : (
                <Select
                  placeholder="选择分支"
                  loading={loadingBranches}
                  showSearch
                  allowClear
                >
                  {branches.map(branch => (
                    <Select.Option key={branch} value={branch}>
                      {branch}
                    </Select.Option>
                  ))}
                </Select>
              )}
            </Form.Item>

            <Divider style={{ margin: `${token.marginMD}px 0` }} />

            <Form.Item
              name="gitUserName"
              label="Git用户名（可选）"
              extra={<Text type="secondary" style={{ fontSize: token.fontSizeSM }}>私有仓库需要提供用户名</Text>}
            >
              <Input
                placeholder="Git用户名"
                prefix={<UserOutlined style={{ color: token.colorTextSecondary }} />}
                allowClear
              />
            </Form.Item>

            <Form.Item
              name="gitPassword"
              label="Git密码/令牌（可选）"
              extra={<Text type="secondary" style={{ fontSize: token.fontSizeSM }}>私有仓库需要提供密码或访问令牌</Text>}
            >
              <Input.Password
                placeholder="Git密码或访问令牌"
                prefix={<LockOutlined style={{ color: token.colorTextSecondary }} />}
              />
            </Form.Item>

            <Form.Item
              name="email"
              label="邮箱（可选）"
              rules={[{ type: 'email', message: '请输入有效的邮箱地址' }]}
            >
              <Input
                placeholder="your.email@example.com"
                allowClear
              />
            </Form.Item>
          </>
        ) : (
          <>
            <Alert
              message={t('repository.form.upload_info')}
              description={t('repository.form.upload_formats')}
              type="info"
              showIcon
              style={{ marginBottom: token.marginMD }}
            />

            <Form.Item
              name="organization"
              label={t('repository.form.org_name')}
              rules={[{ required: submitType === 'upload', message: t('repository.form.org_required', '请输入组织名称') }]}
            >
              <Input
                placeholder={t('repository.form.org_name_placeholder')}
                allowClear
              />
            </Form.Item>

            <Form.Item
              name="repositoryName"
              label={t('repository.form.repo_name')}
              rules={[{ required: submitType === 'upload', message: t('repository.form.repo_name_required', '请输入仓库名称') }]}
            >
              <Input
                placeholder={t('repository.form.repo_name_placeholder')}
                allowClear
              />
            </Form.Item>

            <Form.Item
              name="uploadMethod"
              label={t('repository.form.upload_method', '提交方式')}
            >
              <Radio.Group onChange={handleUploadMethodChange} value={uploadMethod}>
                <Radio.Button value="file">{t('repository.form.upload_file', '上传文件')}</Radio.Button>
                <Radio.Button value="url">{t('repository.form.from_url', '来自URL')}</Radio.Button>
              </Radio.Group>
            </Form.Item>

            {uploadMethod === 'file' ? (
              <Form.Item
                label={t('repository.form.upload_zip_file')}
                required={submitType === 'upload' && uploadMethod === 'file'}
                extra={<Text type="secondary" style={{ fontSize: token.fontSizeSM }}>{t('repository.form.upload_tip')}</Text>}
              >
                <Upload.Dragger {...uploadProps}>
                  <p className="ant-upload-drag-icon">
                    <InboxOutlined style={{ color: token.colorPrimary }} />
                  </p>
                  <p className="ant-upload-text">{t('repository.form.drag_text')}</p>
                  <p className="ant-upload-hint" style={{ fontSize: token.fontSizeSM }}>
                    {t('repository.form.upload_formats')}
                  </p>
                </Upload.Dragger>
              </Form.Item>
            ) : (
              <Form.Item
                name="fileUrl"
                label={t('repository.form.zip_url', '压缩包URL')}
                rules={[
                  { required: submitType === 'upload' && uploadMethod === 'url', message: t('repository.form.url_required', '请输入压缩包URL') },
                  { type: 'url', message: t('repository.form.url_invalid', '请输入有效的URL地址') }
                ]}
                extra={<Text type="secondary" style={{ fontSize: token.fontSizeSM }}>{t('repository.form.url_tip', '支持的压缩包格式：zip、gz、tar、br')}</Text>}
              >
                <Input
                  placeholder={t('repository.form.zip_url_placeholder', 'https://github.com/user/repo/archive/refs/heads/main.zip')}
                  prefix={<LinkOutlined style={{ color: token.colorTextSecondary }} />}
                  allowClear
                />
              </Form.Item>
            )}
          </>
        )}
      </Form>
    </Modal>
  );
};

export default RepositoryForm;