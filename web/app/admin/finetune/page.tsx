'use client'

import { Table, Button, Card, Typography, Space, Tag } from 'antd';
import { useState } from 'react';

const { Title, Text } = Typography;

export default function FinetunePage() {
  const [loading, setLoading] = useState(false);
  
  // 模拟微调数据集列表
  const dataSource = [
    {
      id: '1',
      name: 'GPT-4微调数据集',
      description: '用于优化问答性能的训练数据集',
      status: 'ready',
      recordCount: 1240,
      createTime: '2023-11-05',
      lastUpdated: '2023-12-01',
    },
    {
      id: '2',
      name: '代码生成数据集',
      description: '针对代码生成进行优化的数据集',
      status: 'processing',
      recordCount: 850,
      createTime: '2023-11-15',
      lastUpdated: '2023-11-30',
    },
    {
      id: '3',
      name: '多语言翻译数据集',
      description: '提升多语言翻译能力的数据',
      status: 'failed',
      recordCount: 1520,
      createTime: '2023-10-20',
      lastUpdated: '2023-11-25',
    },
  ];

  // 定义表格列
  const columns = [
    {
      title: '数据集名称',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <a href={`/admin/finetune/${record.id}`}>{text}</a>
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        let color = 'blue';
        let text = '准备就绪';
        
        if (status === 'processing') {
          color = 'green';
          text = '处理中';
        } else if (status === 'failed') {
          color = 'red';
          text = '失败';
        }
        
        return <Tag color={color}>{text}</Tag>;
      },
    },
    {
      title: '记录数',
      dataIndex: 'recordCount',
      key: 'recordCount',
      sorter: (a, b) => a.recordCount - b.recordCount,
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      key: 'createTime',
      sorter: (a, b) => new Date(a.createTime).getTime() - new Date(b.createTime).getTime(),
    },
    {
      title: '最后更新',
      dataIndex: 'lastUpdated',
      key: 'lastUpdated',
      sorter: (a, b) => new Date(a.lastUpdated).getTime() - new Date(b.lastUpdated).getTime(),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <a href={`/admin/finetune/${record.id}`}>查看</a>
          <a href={`/admin/finetune/${record.id}/edit`}>编辑</a>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <Title level={4} style={{ margin: 0 }}>微调数据管理</Title>
        <Button type="primary">创建数据集</Button>
      </div>
      
      <Card>
        <div style={{ marginBottom: '16px' }}>
          <Text>管理用于模型微调的数据集。您可以创建、查看和编辑各种训练数据。</Text>
        </div>
        
        <Table 
          dataSource={dataSource} 
          columns={columns} 
          rowKey="id"
          loading={loading}
          pagination={{
            defaultPageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条记录`
          }}
        />
      </Card>
    </div>
  );
} 