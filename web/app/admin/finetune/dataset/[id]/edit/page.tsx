'use client'

import { useState, useEffect } from 'react';
import { Card, Form, Input, Button, Select, message, Space, Alert, Spin } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { getDataset, updateDataset, TrainingDataset, UpdateDatasetInput } from '../../../../../services/fineTuningService';

const { TextArea } = Input;

export default function EditDatasetPage({ params }: any) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [dataset, setDataset] = useState<TrainingDataset | null>(null);
  const [fetchLoading, setFetchLoading] = useState(true);
  const router = useRouter();

  // 加载数据集详情
  useEffect(() => {
    const fetchDataset = async () => {
      setFetchLoading(true);
      try {
        const response = await getDataset(params.id);
        if (response.success && response.data) {
          setDataset(response.data);
          // 设置表单初始值，使用any类型避免TS错误
          const datasetWithExtras = response.data as any;
          form.setFieldsValue({
            name: response.data.name,
            // 来自API的其他字段
            endpoint: datasetWithExtras.endpoint || '',
            apiKey: datasetWithExtras.apiKey || '',
            prompt: datasetWithExtras.prompt || '',
          });
        } else {
          message.error(response.error || '获取数据集详情失败');
        }
      } catch (error) {
        console.error('获取数据集详情失败:', error);
        message.error('获取数据集详情失败');
      } finally {
        setFetchLoading(false);
      }
    };

    fetchDataset();
  }, [params.id, form]);

  // 提交表单
  const handleSubmit = async (values: any) => {
    if (!dataset) return;

    const updateData: UpdateDatasetInput = {
      datasetId: params.id,
      name: values.name,
      endpoint: values.endpoint,
      apiKey: values.apiKey,
      prompt: values.prompt
    };

    setLoading(true);
    try {
      const response = await updateDataset(updateData);
      if (response.success && response.data) {
        message.success('数据集更新成功');
        router.push(`/admin/finetune/dataset/${params.id}`);
      } else {
        message.error(response.error || '更新数据集失败');
      }
    } catch (error) {
      console.error('更新数据集失败:', error);
      message.error('更新数据集失败');
    } finally {
      setLoading(false);
    }
  };

  // 返回详情页
  const handleBack = () => {
    router.push(`/admin/finetune/dataset/${params.id}`);
  };

  if (fetchLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
        <div style={{ marginTop: '20px' }}>加载数据集信息...</div>
      </div>
    );
  }

  if (!dataset) {
    return (
      <div>
        <Button icon={<ArrowLeftOutlined />} onClick={() => router.push('/admin/finetune')} style={{ marginBottom: '16px' }}>
          返回列表
        </Button>
        <Card>
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <Alert
              message="数据未找到"
              description="未找到要编辑的数据集或数据集已删除"
              type="error"
              showIcon
            />
            <div style={{ marginTop: '20px' }}>
              <Button type="primary" onClick={() => router.push('/admin/finetune')}>
                返回列表
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '16px' }}>
        <Button 
          icon={<ArrowLeftOutlined />} 
          onClick={handleBack}
          style={{ marginRight: '8px' }}
        >
          返回
        </Button>
        <span style={{ fontSize: '18px', fontWeight: 'bold' }}>编辑数据集: {dataset.name}</span>
      </div>

      <Card>
        <Alert
          message="编辑微调数据集"
          description="您可以修改数据集的名称、API端点、密钥和提示词模板。"
          type="info"
          showIcon
          style={{ marginBottom: '24px' }}
        />

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="name"
            label="数据集名称"
            rules={[{ required: true, message: '请输入数据集名称' }]}
          >
            <Input placeholder="输入一个描述性的名称" />
          </Form.Item>

          <Form.Item
            name="endpoint"
            label="API端点"
            rules={[{ required: true, message: '请输入API端点' }]}
          >
            <Input placeholder="例如: https://api.openai.com/v1" />
          </Form.Item>

          <Form.Item
            name="apiKey"
            label="API密钥"
            rules={[{ required: true, message: '请输入API密钥' }]}
          >
            <Input.Password placeholder="输入API密钥" />
          </Form.Item>

          <Form.Item
            name="prompt"
            label="提示词模板"
            rules={[{ required: true, message: '请输入提示词模板' }]}
          >
            <TextArea 
              rows={4} 
              placeholder="输入用于微调的提示词模板" 
            />
          </Form.Item>

          <Form.Item
            label="仓库ID"
          >
            <Input value={dataset.warehouseId} disabled />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                保存修改
              </Button>
              <Button onClick={handleBack}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
} 