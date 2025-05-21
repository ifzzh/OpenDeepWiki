'use client'

import { useState, useEffect } from 'react';
import { Card, Form, Input, Button, Select, message, Space, Alert, Tag, Spin } from 'antd';
import { ArrowLeftOutlined, ReloadOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { createDataset, CreateDatasetInput } from '../../../services/fineTuningService';
import { getWarehouse } from '../../../services/warehouseService';

const { Option } = Select;
const { TextArea } = Input;

export default function CreateDatasetPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [warehouseLoading, setWarehouseLoading] = useState(false);
  const [models, setModels] = useState<string[]>([]);
  const [modelLoading, setModelLoading] = useState(false);
  const router = useRouter();

  // 获取仓库列表
  useEffect(() => {
    const fetchWarehouses = async () => {
      setWarehouseLoading(true);
      try {
        const response = await getWarehouse(1, 100, ''); // 获取前100个仓库
        if (response.success && response.data) {
          setWarehouses(response.data.items || []);
        } else {
          message.error(response.error || '获取仓库列表失败');
        }
      } catch (error) {
        console.error('获取仓库列表失败:', error);
        message.error('获取仓库列表失败');
      } finally {
        setWarehouseLoading(false);
      }
    };

    fetchWarehouses();
  }, []);

  // 获取模型列表
  const fetchModels = async () => {
    const endpoint = form.getFieldValue('endpoint');
    const apiKey = form.getFieldValue('apiKey');

    if (!endpoint || !apiKey) {
      message.warning('请先填写API端点和API密钥');
      return;
    }

    setModelLoading(true);
    try {
      const response = await fetch(`${endpoint}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const data = await response.json();
      if (data.data && Array.isArray(data.data)) {
        const modelIds = data.data.map((model: any) => model.id);
        setModels(modelIds);
        
        // 如果有模型，默认选择第一个
        if (modelIds.length > 0) {
          form.setFieldsValue({ model: modelIds[0] });
        }
      } else {
        throw new Error('无效的模型数据格式');
      }
    } catch (error) {
      console.error('获取模型列表失败:', error);
      message.error('获取模型列表失败，请检查API端点和密钥是否正确');
    } finally {
      setModelLoading(false);
    }
  };

  // 当API端点或密钥变化时尝试获取模型
  const handleApiInfoChange = () => {
    const endpoint = form.getFieldValue('endpoint');
    const apiKey = form.getFieldValue('apiKey');
    
    if (endpoint && apiKey) {
      fetchModels();
    }
  };

  // 提交表单
  const handleSubmit = async (values: CreateDatasetInput) => {
    setLoading(true);
    try {
      const response = await createDataset(values);
      if (response.success && response.data) {
        message.success('数据集创建成功');
        router.push('/admin/finetune');
      } else {
        message.error(response.error || '创建数据集失败');
      }
    } catch (error) {
      console.error('创建数据集失败:', error);
      message.error('创建数据集失败');
    } finally {
      setLoading(false);
    }
  };

  // 返回列表页
  const handleBack = () => {
    router.push('/admin/finetune');
  };

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
        <span style={{ fontSize: '18px', fontWeight: 'bold' }}>创建新数据集</span>
      </div>

      <Card>
        <Alert
          message="创建微调数据集"
          description="微调数据集是用于训练模型的数据集合。您需要指定关联仓库、API端点和密钥等信息。"
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
            name="warehouseId"
            label="选择仓库"
            initialValue={warehouses[0]?.id}
            rules={[{ required: true, message: '请选择关联的仓库' }]}
          >
            <Select
              placeholder="选择关联的知识库仓库"
              loading={warehouseLoading}
            >
              {warehouses.map(warehouse => (
                <Option key={warehouse.id} value={warehouse.id}>
                  {warehouse.organizationName}/{warehouse.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="endpoint"
            label="API端点"
            initialValue="https://api.token-ai.cn/v1"
            rules={[{ required: true, message: '请输入API端点' }]}
          >
            <Input 
              placeholder="例如: https://api.token-ai.cn/v1" 
              onBlur={handleApiInfoChange}
            />
          </Form.Item>

          <Form.Item
            name="apiKey"
            label="API密钥"
            rules={[{ required: true, message: '请输入API密钥' }]}
          >
            <Input.Password 
              placeholder="输入API密钥" 
              onBlur={handleApiInfoChange}
            />
          </Form.Item>
          
          <Form.Item
            name="model"
            label="选择模型"
            rules={[{ required: true, message: '请选择模型' }]}
            extra={
              <Button 
                type="link" 
                icon={<ReloadOutlined />} 
                onClick={fetchModels} 
                loading={modelLoading}
                style={{ padding: 0 }}
              >
                刷新模型列表
              </Button>
            }
          >
            <Select
              placeholder="选择用于生成数据集的模型"
              loading={modelLoading}
              notFoundContent={modelLoading ? <Spin size="small" /> : (
                models.length === 0 ? "请先填写API端点和密钥并刷新" : "没有找到模型"
              )}
            >
              {models.map(model => (
                <Option key={model} value={model}>
                  {model}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="prompt"
            initialValue={
`
You are a professional AI training data engineer tasked with creating high-quality fine-tuning datasets for large language models. Your current assignment is to convert a Markdown document into a training dataset for LLaMA-Factory.

Here is the Markdown content you need to process:

<markdown_content>
{{markdown_content}}
</markdown_content>

Your task is to create 10-15 high-quality instruction-response pairs based on this Markdown document. These pairs will be used to train an AI model, so they should be diverse, comprehensive, and accurately reflect the content of the document.

When creating instructions:
1. Use a variety of formats (questions, commands, requests, etc.)
2. Focus on specific knowledge points, concepts, or processes from the document
3. Cover different difficulty levels and cognitive domains (basic understanding, application, analysis, evaluation, etc.)
4. Prioritize thought-provoking questions using phrases like "how", "why", "explain", "compare", etc.

When creating responses:
1. Base them strictly on the document content without adding information not present in the original text
2. Maintain a professional, clear, and structured format
3. Preserve the original format and indentation for special content like code snippets or tables
4. Keep responses comprehensive yet concise, covering key points without unnecessary verbosity

Ensure that your dataset comprehensively covers all core content and knowledge structures in the document.

Your output should be in the following JSON format:

<data>
[
  {"instruction": "Instruction content", "input": "", "output": "Response content"},
  {"instruction": "Instruction content", "input": "", "output": "Response content"},
  ...
]
</data>

Here are two examples of good instruction-response pairs:

1. Instruction: "Explain the concept of 'X' as described in the document and why it's important."
   Response: "X is defined as [definition from the document]. It is important because [reasons stated in the document]. The document emphasizes that X plays a crucial role in [context from the document]."

2. Instruction: "How would you apply the method of 'Y' to solve [specific problem mentioned in the document]?"
   Response: "To apply the method of Y to solve [specific problem], follow these steps:
   1. [Step 1 from the document]
   2. [Step 2 from the document]
   3. [Step 3 from the document]
   It's important to note that [any caveats or considerations mentioned in the document]."

Remember to carefully read the entire document, identify key themes, concepts, and knowledge points, and design diverse instruction types that cover all important parts of the document. Create comprehensive and accurate responses for each instruction, ensuring they are based solely on the information provided in the Markdown content.

Begin processing the Markdown content now, and output your results in the specified JSON format.
`}
            label={<>提示词模板插入参数：<Tag color="blue">{'{{markdown_content}}'}</Tag></>}
            rules={[{ required: true, message: '请输入提示词模板' }]}
          >
            <TextArea 
              rows={8} 
              placeholder="输入用于微调的提示词模板" 
            />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                创建数据集
              </Button>
              <Button onClick={handleBack}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
} 