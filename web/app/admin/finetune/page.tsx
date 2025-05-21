'use client'

import { Table, Button, Card, Typography, Space, Tag, message, Modal } from 'antd';
import { useEffect, useState } from 'react';
import { TrainingDataset, getDatasets, deleteDataset } from '../../services/fineTuningService';
import { useRouter } from 'next/navigation';

const { Title, Text } = Typography;

export default function FinetunePage() {
  const [loading, setLoading] = useState(false);
  const [datasets, setDatasets] = useState<TrainingDataset[]>([]);
  const router = useRouter();

  // 加载数据集列表，这里需要一个warehouseId，暂时使用默认值
  // 实际使用时应该从URL参数或状态管理中获取
  const fetchDatasets = async (warehouseId = '') => {
    setLoading(true);
    try {
      const { data } = await getDatasets(warehouseId);
      if (data.code === 200) {
        setDatasets(data.data);
      }
    } catch (error) {
      console.error('获取数据集失败:', error);
      message.error('获取数据集列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDatasets();
  }, []);

  // 删除数据集
  const handleDelete = async (id: string, name: string) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除数据集"${name}"吗？此操作无法撤销。`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          const response = await deleteDataset(id);
          if (response.success) {
            message.success('数据集删除成功');
            fetchDatasets(); // 重新加载数据
          } else {
            message.error(response.error || '删除数据集失败');
          }
        } catch (error) {
          console.error('删除数据集失败:', error);
          message.error('删除数据集失败');
        }
      }
    });
  };

  // 创建新数据集
  const handleCreate = () => {
    router.push('/admin/finetune/create');
  };

  // 渲染状态标签
  const renderStatus = (status: number) => {
    let color = 'blue';
    let text = '准备就绪';

    switch (status) {
      case 0:
        color = 'green';
        text = '未开始';
        break;
      case 1:
        color = 'blue';
        text = '进行中';
        break;
      case 2:
        color = 'blue';
        text = '已完成';
        break;
      case 3:
        color = 'red';
        text = '失败';
        break;
      default:
        color = 'default';
        text = status.toString();
    }

    return <Tag color={color}>{text}</Tag>;
  };

  // 定义表格列
  const columns = [
    {
      title: '数据集名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: TrainingDataset) => (
        <a onClick={() => router.push(`/admin/finetune/dataset/${record.id}`)}>{text}</a>
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
      render: renderStatus,
    },
    {
      title: '文件数量',
      dataIndex: 'fileCount',
      key: 'fileCount',
      sorter: (a: TrainingDataset, b: TrainingDataset) => a.fileCount - b.fileCount,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (text: string) => new Date(text).toLocaleDateString('zh-CN'),
      sorter: (a: TrainingDataset, b: TrainingDataset) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    },
    {
      title: '最后更新',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      render: (text?: string) => text ? new Date(text).toLocaleDateString('zh-CN') : '-',
      sorter: (a: TrainingDataset, b: TrainingDataset) => {
        const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return aTime - bTime;
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: TrainingDataset) => (
        <Space size="middle">
          <a onClick={() => router.push(`/admin/finetune/dataset/${record.id}`)}>查看</a>
          <a onClick={() => router.push(`/admin/finetune/dataset/${record.id}/edit`)}>编辑</a>
          <a onClick={() => handleDelete(record.id, record.name)}>删除</a>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <Title level={4} style={{ margin: 0 }}>微调数据管理</Title>
        <Button type="primary" onClick={handleCreate}>创建数据集</Button>
      </div>

      <Card>
        <div style={{ marginBottom: '16px' }}>
          <Text>管理用于模型微调的数据集。您可以创建、查看和编辑各种训练数据。</Text>
        </div>

        <Table
          dataSource={datasets}
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