'use client'

import { useState, useEffect, useRef } from 'react';
import { Card, Typography, Tag, Button, Table, Space, Descriptions, message, Spin, Divider, Tree, Modal, Form, Input, Dropdown, Menu } from 'antd';
import { ArrowLeftOutlined, EditOutlined, DeleteOutlined, ReloadOutlined, SaveOutlined, FolderOutlined, FileOutlined, ExclamationCircleOutlined, DownloadOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { getDataset, deleteDataset, TrainingDataset, createTask, getTasks, FineTuningTask, getTask, deleteTask, startTask, startTaskStream } from '../../../../services/fineTuningService';
import { getRepositoryFiles, getRepositoryFileContent, saveRepositoryFileContent } from '../../../../services/repositoryService';
import { MdEditor } from 'md-editor-rt';
import 'md-editor-rt/lib/style.css';
import { useParams } from 'next/navigation';

const { Title, Text } = Typography;
const { DirectoryTree } = Tree;
const { TextArea } = Input;

// 定义文件树节点类型
interface TreeNode {
  title: string;
  key: string;
  isLeaf?: boolean;
  children?: TreeNode[];
  catalog?: {
    id: string;
    name: string;
    description: string;
    createdAt: string;
    deletedTime: string;
    dependentFile: string[];
    ducumentId: string;
    isCompleted: boolean;
    isDeleted: boolean;
    order: number;
    parentId: string;
    prompt: string;
    url: string;
    warehouseId: string;
  };
}

// 示例目录树结构
const defaultTreeData: TreeNode[] = [
  {
    title: '加载中...',
    key: 'loading',
    isLeaf: true,
  },
];

export default function DatasetDetailPage() {
  const params = useParams();
  const datasetId = params.id as string;
  const [dataset, setDataset] = useState<TrainingDataset | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  // 添加仓库目录树相关状态
  const [treeData, setTreeData] = useState<TreeNode[]>(defaultTreeData);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [selectedCatalog, setSelectedCatalog] = useState<TreeNode | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [fileLoading, setFileLoading] = useState(false);
  const [editorId] = useState<string>('md-editor-rt-dataset');
  const [loadingTree, setLoadingTree] = useState(false);

  // 创建微调任务对话框相关状态
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [taskForm] = Form.useForm();
  const [creating, setCreating] = useState(false);

  // 微调任务列表相关状态
  const [tasksList, setTasksList] = useState<FineTuningTask[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);

  // 任务详情相关状态
  const [taskDetails, setTaskDetails] = useState<FineTuningTask | null>(null);
  const [isTaskDetailsModalVisible, setIsTaskDetailsModalVisible] = useState(false);
  const [taskDetailsLoading, setTaskDetailsLoading] = useState(false);
  const [deletingTask, setDeletingTask] = useState(false);
  const [startingTask, setStartingTask] = useState(false);

  // 启动任务相关状态
  const [taskProgress, setTaskProgress] = useState<string>('');
  const [isProgressModalVisible, setIsProgressModalVisible] = useState(false);

  // 添加对进度容器的引用
  const progressContainerRef = useRef<HTMLDivElement>(null);

  // 添加导出相关状态
  const [exportLoading, setExportLoading] = useState(false);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [exportFormat, setExportFormat] = useState('llamaFactory');
  const [exportContent, setExportContent] = useState('');

  // 添加整体数据集导出相关状态
  const [entireDatasetContent, setEntireDatasetContent] = useState<string>('');
  const [entireDatasetLoading, setEntireDatasetLoading] = useState(false);

  // 加载数据集详情
  const fetchDataset = async () => {
    setLoading(true);
    setSelectedFile(null);
    setSelectedCatalog(null);
    setFileContent('');
    try {
      const { data } = await getDataset(datasetId);
      if (data.code === 200) {
        setDataset(data.data);

        // 如果数据集有关联的仓库ID，则加载仓库文件目录
        if (data.data.warehouseId) {
          await fetchRepositoryFiles(data.data.warehouseId);
        }
      } else {
        message.error(data.error || '获取数据集详情失败');
      }
    } catch (error) {
      console.error('获取数据集详情失败:', error);
      message.error('获取数据集详情失败');
    } finally {
      setLoading(false);
    }
  };

  // 加载仓库文件目录
  const fetchRepositoryFiles = async (warehouseId: string) => {
    if (!warehouseId) return;

    setLoadingTree(true);
    try {
      const filesResponse = await getRepositoryFiles(warehouseId);
      if (filesResponse.code === 200 && filesResponse.data) {
        setTreeData(filesResponse.data);
      } else {
        message.error(filesResponse.message || '获取文件目录结构失败');
      }
    } catch (error) {
      console.error('加载文件目录失败:', error);
      message.error('加载文件目录失败');
    } finally {
      setLoadingTree(false);
    }
  };

  useEffect(() => {
    fetchDataset();
  }, [datasetId]);

  // 返回列表页
  const handleBack = () => {
    router.push('/admin/finetune');
  };

  // 编辑数据集
  const handleEdit = () => {
    router.push(`/admin/finetune/dataset/${datasetId}/edit`);
  };

  // 删除数据集
  const handleDelete = async () => {
    Modal.confirm({
      title: '删除确认',
      icon: <ExclamationCircleOutlined />,
      content: '确定要删除此数据集吗？此操作不可撤销。',
      okText: '确定',
      cancelText: '取消',
      onOk: async () => {
        setDeleting(true);
        try {
          const response = await deleteDataset(datasetId);
          if (response.success) {
            message.success('数据集删除成功');
            router.push('/admin/finetune');
          } else {
            message.error(response.error || '删除数据集失败');
          }
        } catch (error) {
          console.error('删除数据集失败:', error);
          message.error('删除数据集失败');
        } finally {
          setDeleting(false);
        }
      }
    });
  };

  // 获取目录下的微调任务列表
  const fetchTasksList = async (warehouseId: string) => {
    if (!warehouseId) return;

    setTasksLoading(true);
    try {
      const { data } = await getTasks(warehouseId);
      if (data.code === 200) {
        setTasksList(data.data);
      } else {
        message.error(data.message || '获取微调任务列表失败');
      }
    } catch (error) {
      console.error('获取微调任务列表失败:', error);
      message.error('获取微调任务列表失败');
    } finally {
      setTasksLoading(false);
    }
  };

  // 处理文件选择
  const handleSelectFile = async (selectedKeys: React.Key[], info: any) => {
    if (selectedKeys.length > 0) {
      const filePath = selectedKeys[0] as string;
      setSelectedFile(filePath);
      setSelectedCatalog(info.node);

      try {
        setFileLoading(true);
        if (dataset?.warehouseId) {
          await fetchTasksList(dataset.warehouseId);
        }
      } catch (error) {
        console.error('获取文件内容失败:', error);
        message.error('获取文件内容失败');
        setFileContent('// 获取文件内容失败');
      } finally {
        setFileLoading(false);
      }
    }
  };

  // 打开创建微调任务对话框
  const handleCreateTask = () => {
    if (!selectedCatalog) return;

    // 预设表单数据
    taskForm.setFieldsValue({
      name: `微调任务 - ${selectedCatalog.title}`,
      description: `基于 ${selectedCatalog.title} 的微调任务`
    });

    setIsModalVisible(true);
  };

  // 提交创建微调任务
  const handleSubmitTask = async (values: any) => {
    if (!dataset || !selectedCatalog?.catalog?.id) return;

    setCreating(true);
    try {
      const taskData = {
        trainingDatasetId: datasetId,
        documentCatalogId: selectedCatalog.catalog.id,
        name: values.name,
        description: values.description
      };

      const { data } = await createTask(taskData);
      if (data.code === 200) {
        message.success('微调任务创建成功');
        setIsModalVisible(false);
        taskForm.resetFields();

        // 刷新任务列表
        if (dataset.warehouseId) {
          await fetchTasksList(dataset.warehouseId);
        }
      } else {
        message.error(data.message || '创建微调任务失败');
      }
    } catch (error) {
      console.error('创建微调任务失败:', error);
      message.error('创建微调任务失败');
    } finally {
      setCreating(false);
    }
  };

  // 取消创建微调任务
  const handleCancelTask = () => {
    setIsModalVisible(false);
    taskForm.resetFields();
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
        text = '未知';
    }
    return <Tag color={color}>{text}</Tag>;
  };

  // 对API密钥进行脱敏处理
  const maskApiKey = (apiKey: string | undefined) => {
    if (!apiKey) return '-';
    if (apiKey.length <= 8) return '********';
    return apiKey.substring(0, 4) + '********' + apiKey.substring(apiKey.length - 4);
  };

  // 查看任务详情
  const handleViewTask = async (taskId: string) => {
    setTaskDetailsLoading(true);
    try {
      const { data } = await getTask(taskId);
      if (data.code === 200) {
        setTaskDetails(data.data);
        setIsTaskDetailsModalVisible(true);

        // 处理dataset字段，如果是JSON字符串则尝试解析
        if (data.data.dataset) {
          try {
            // 这里我们不进行解析，仅展示原始内容
            setFileContent(data.data.dataset);
          } catch (e) {
            console.error('解析数据集内容失败:', e);
            setFileContent('数据集内容解析失败');
          }
        } else {
          setFileContent('没有数据集内容');
        }
      } else {
        message.error(data.message || '获取任务详情失败');
      }
    } catch (error) {
      console.error('获取任务详情失败:', error);
      message.error('获取任务详情失败');
    } finally {
      setTaskDetailsLoading(false);
    }
  };

  // 删除任务
  const handleDeleteTask = async (taskId: string) => {
    Modal.confirm({
      title: '删除确认',
      icon: <ExclamationCircleOutlined />,
      content: '确定要删除此微调任务吗？此操作不可撤销。',
      okText: '确定',
      cancelText: '取消',
      onOk: async () => {
        setDeletingTask(true);
        try {
          const { data } = await deleteTask(taskId);
          if (data.code === 200) {
            message.success('微调任务删除成功');
            // 刷新任务列表
            if (dataset?.warehouseId) {
              await fetchTasksList(dataset.warehouseId);
            }
          } else {
            message.error(data.message || '删除微调任务失败');
          }
        } catch (error) {
          console.error('删除微调任务失败:', error);
          message.error('删除微调任务失败');
        } finally {
          setDeletingTask(false);
        }
      }
    });
  };

  // 启动任务
  const handleStartTask = async (taskId: string, taskStatus: number) => {
    if (taskStatus !== 0) {
      message.warning('只有未开始状态的任务才能启动');
      return;
    }

    setStartingTask(true);

    // 显示进度对话框
    setIsProgressModalVisible(true);
    let progress = '';
    try {
      // 使用流式API获取实时更新
      const stream = await startTaskStream(taskId);

      for await (const chunk of stream) {
        if (chunk.type === 'start') {
          message.info(chunk.content);
        } else if (chunk.type === 'progress') {
          progress += chunk.content;
          setTaskProgress(progress);
        } else if (chunk.type === 'complete') {
          message.success(chunk.content);
          break;
        } else if (chunk.type === 'error') {
          message.error(chunk.content);
          break;
        }

        setTimeout(() => {
          if (progressContainerRef.current) {
            progressContainerRef.current.scrollTop = progressContainerRef.current.scrollHeight;
          }
        }, 100);
      }

      // 刷新任务列表
      if (dataset?.warehouseId) {
        await fetchTasksList(dataset.warehouseId);
      }
    } catch (error) {
      console.error('启动微调任务失败:', error);
      message.error('启动微调任务失败');
      progress = '启动微调任务失败';
      setTaskProgress(progress);
    } finally {
      setStartingTask(false);
      // 不自动关闭进度对话框，让用户自己关闭
    }
  };

  // 关闭任务详情对话框
  const handleCloseTaskDetails = () => {
    setIsTaskDetailsModalVisible(false);
    setTaskDetails(null);
  };

  // 关闭微调进度对话框
  const handleCloseProgressModal = () => {
    if (startingTask) {
      message.warning('任务正在启动中，请稍后再关闭');
      return;
    }

    setIsProgressModalVisible(false);
    // 延迟清空进度记录，以避免弹窗关闭时的视觉跳跃
    setTimeout(() => {
      setTaskProgress('');
    }, 300);
  };

  // 导出数据集函数
  const exportDataset = (format: string, dataset: string) => {
    if (!dataset) {
      message.error('没有可导出的数据');
      return;
    }

    try {
      // 尝试解析数据集内容
      let parsedData;
      try {
        parsedData = JSON.parse(dataset);
      } catch (e) {
        message.error('数据集格式无效，无法导出');
        return;
      }

      let exportData;
      switch (format) {
        case 'llamaFactory':
          // LLaMA-Factory 格式
          exportData = parsedData.map((item: any) => ({
            instruction: item.instruction || "",
            input: item.input || "",
            output: item.output || ""
          }));
          break;
        case 'alpaca':
          // Alpaca 格式
          exportData = parsedData.map((item: any) => ({
            instruction: item.instruction || "",
            input: item.input || "",
            output: item.output || "",
            text: `${item.instruction || ""}${item.input ? "\n\n" + item.input : ""}\n\n${item.output || ""}`
          }));
          break;
        case 'chatML':
          // ChatML 格式
          exportData = parsedData.map((item: any) => ({
            messages: [
              { role: "system", content: item.instruction || "" },
              { role: "user", content: item.input || "" },
              { role: "assistant", content: item.output || "" }
            ]
          }));
          break;
        default:
          exportData = parsedData;
      }

      setExportContent(JSON.stringify(exportData, null, 2));
      setExportFormat(format);
      setExportModalVisible(true);
    } catch (error) {
      console.error('导出失败:', error);
      message.error('导出失败');
    }
  };

  // 下载导出的文件
  const downloadExportFile = () => {
    if (!exportContent) {
      message.error('没有内容可下载');
      return;
    }

    setExportLoading(true);
    try {
      const blob = new Blob([exportContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      let formatSuffix = '';
      
      switch (exportFormat) {
        case 'llamaFactory':
          formatSuffix = 'llama-factory';
          break;
        case 'alpaca':
          formatSuffix = 'alpaca';
          break;
        case 'chatML':
          formatSuffix = 'chatml';
          break;
        default:
          formatSuffix = 'json';
      }
      
      a.href = url;
      a.download = `dataset-export-${formatSuffix}-${new Date().getTime()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      message.success('文件下载成功');
    } catch (error) {
      console.error('下载失败:', error);
      message.error('下载失败');
    } finally {
      setExportLoading(false);
    }
  };

  // 修改任务详情对话框
  const handleExportDataset = (format: string) => {
    if (taskDetails?.dataset) {
      exportDataset(format, taskDetails.dataset);
    } else {
      message.error('没有可导出的数据集内容');
    }
  };

  // 导出整体数据集
  const handleExportEntireDataset = async () => {
    if (!dataset || !dataset.warehouseId) {
      message.error('数据集不存在或未关联仓库');
      return;
    }

    setEntireDatasetLoading(true);
    try {
      // 获取所有微调任务数据
      const { data } = await getTasks(dataset.warehouseId);
      if (data.code !== 200 || !data.data) {
        throw new Error('获取任务数据失败');
      }

      // 合并所有任务数据
      let allDatasets: any[] = [];
      for (const task of data.data) {
        if (task.dataset) {
          try {
            const taskDataset = JSON.parse(task.dataset);
            if (Array.isArray(taskDataset)) {
              allDatasets = [...allDatasets, ...taskDataset];
            }
          } catch (e) {
            console.error(`解析任务 ${task.id} 的数据集失败:`, e);
          }
        }
      }

      if (allDatasets.length === 0) {
        message.warning('没有找到可用的数据集内容');
        return;
      }

      // 设置导出内容为合并后的数据集
      setExportContent(JSON.stringify(allDatasets, null, 2));
      setExportFormat('llamaFactory');
      setExportModalVisible(true);
      message.success(`成功合并 ${allDatasets.length} 条数据记录`);
    } catch (error) {
      console.error('导出整体数据集失败:', error);
      message.error('导出整体数据集失败');
    } finally {
      setEntireDatasetLoading(false);
    }
  };

  // 定义表格列
  const columns = [
    {
      title: '任务名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (text: string) => new Date(text).toLocaleString(),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: renderStatus,
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record: FineTuningTask) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            onClick={() => handleViewTask(record.id)}
          >
            查看
          </Button>
          <Button
            type="link"
            size="small"
            danger
            onClick={() => handleDeleteTask(record.id)}
            loading={deletingTask}
          >
            删除
          </Button>
          <Button
            type="link"
            size="small"
            disabled={record.status !== 0}
            onClick={() => handleStartTask(record.id, record.status)}
            loading={startingTask}
          >
            启动任务
          </Button>
        </Space>
      ),
    },
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
        <div style={{ marginTop: '20px' }}>加载数据集详情...</div>
      </div>
    );
  }

  if (!dataset) {
    return (
      <div>
        <Button icon={<ArrowLeftOutlined />} onClick={handleBack} style={{ marginBottom: '16px' }}>
          返回
        </Button>
        <Card>
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <Text type="danger">未找到数据集或数据集已删除</Text>
            <div style={{ marginTop: '20px' }}>
              <Button type="primary" onClick={handleBack}>
                返回列表
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // 使用any类型获取额外字段
  const datasetWithExtras = dataset as any;

  // 导出菜单项
  const exportMenu = (
    <Menu onClick={({key}) => handleExportDataset(key as string)}>
      <Menu.Item key="llamaFactory">LLaMA-Factory 格式</Menu.Item>
      <Menu.Item key="alpaca">Alpaca 格式</Menu.Item>
      <Menu.Item key="chatML">ChatML 格式</Menu.Item>
      <Menu.Item key="raw">原始格式</Menu.Item>
    </Menu>
  );

  return (
    <div>
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={handleBack}
            style={{ marginRight: '8px' }}
          >
            返回
          </Button>
          <span style={{ fontSize: '18px', fontWeight: 'bold' }}>数据集: {dataset.name}</span>
        </div>
        <Space>
          <Button
            icon={<DownloadOutlined />}
            onClick={handleExportEntireDataset}
            loading={entireDatasetLoading}
          >
            导出整体数据集
          </Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchDataset}
          >
            刷新
          </Button>
          <Button
            type="primary"
            icon={<EditOutlined />}
            onClick={handleEdit}
          >
            编辑
          </Button>
          <Button
            danger
            icon={<DeleteOutlined />}
            onClick={handleDelete}
            loading={deleting}
          >
            删除
          </Button>
        </Space>
      </div>

      <div style={{ display: 'flex', height: 'calc(100vh - 220px)', minHeight: '400px' }}>
        <Card style={{ width: 300, marginRight: 16, height: '100%', overflow: 'auto' }}>
          {loadingTree ? (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <Spin size="small" />
              <div style={{ marginTop: '10px' }}>加载目录中...</div>
            </div>
          ) : (
            <DirectoryTree
              defaultExpandAll
              treeData={treeData}
              onSelect={handleSelectFile}
              showIcon={true}
            />
          )}
        </Card>

        {/* 右侧文件内容 */}
        <Card
          style={{ flex: 1, height: '100%', overflow: 'auto' }}
          title={selectedFile || '微调数据列表'}
          extra={
            selectedFile && (
              <Button
                type="primary"
                onClick={handleCreateTask}
                disabled={fileLoading}
              >
                创建微调任务
              </Button>
            )
          }
        >
          {fileLoading ? (
            <div style={{ textAlign: 'center', padding: '50px' }}>
              <Spin size="small" />
              <div style={{ marginTop: '10px' }}>加载文件内容...</div>
            </div>
          ) : selectedFile ? (
            <div>
              <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px' }}>关联的微调任务</div>
              <Table
                dataSource={tasksList.filter(task => task.documentCatalogId === selectedCatalog?.catalog?.id)}
                columns={columns}
                rowKey="id"
                loading={tasksLoading}
                pagination={false}
                size="small"
              />
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '50px' }}>
              <div>请从左侧选择一个文件来查看内容并创建微调任务</div>
            </div>
          )}
        </Card>
      </div>

      {/* 创建微调任务对话框 */}
      <Modal
        title="创建微调任务"
        open={isModalVisible}
        onCancel={handleCancelTask}
        footer={null}
        destroyOnClose
      >
        <Form
          form={taskForm}
          layout="vertical"
          onFinish={handleSubmitTask}
        >
          <Form.Item
            name="name"
            label="任务名称"
            rules={[{ required: true, message: '请输入任务名称' }]}
          >
            <Input placeholder="输入微调任务名称" />
          </Form.Item>

          <Form.Item
            name="description"
            label="任务描述"
          >
            <TextArea rows={4} placeholder="输入任务描述信息" />
          </Form.Item>

          <Form.Item>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button style={{ marginRight: '8px' }} onClick={handleCancelTask}>
                取消
              </Button>
              <Button type="primary" htmlType="submit" loading={creating}>
                创建
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>

      {/* 任务详情对话框 */}
      <Modal
        title="微调任务详情"
        open={isTaskDetailsModalVisible}
        onCancel={handleCloseTaskDetails}
        footer={
          <Space>
            <Dropdown overlay={exportMenu} disabled={!taskDetails?.dataset}>
              <Button icon={<DownloadOutlined />}>导出数据集</Button>
            </Dropdown>
            <Button onClick={handleCloseTaskDetails}>
              关闭
            </Button>
          </Space>
        }
        width={800}
      >
        {taskDetailsLoading ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <Spin />
            <div style={{ marginTop: '10px' }}>加载任务详情...</div>
          </div>
        ) : taskDetails ? (
          <div>
            <Descriptions bordered column={2}>
              <Descriptions.Item label="任务名称" span={2}>{taskDetails.name}</Descriptions.Item>
              <Descriptions.Item label="任务描述" span={2}>{taskDetails.description || '无'}</Descriptions.Item>
              <Descriptions.Item label="创建时间">{new Date(taskDetails.createdAt).toLocaleString()}</Descriptions.Item>
              <Descriptions.Item label="状态">{renderStatus(taskDetails.status)}</Descriptions.Item>
              <Descriptions.Item label="开始时间" span={2}>
                {taskDetails.startedAt ? new Date(taskDetails.startedAt).toLocaleString() : '未开始'}
              </Descriptions.Item>
              <Descriptions.Item label="完成时间" span={2}>
                {taskDetails.completedAt ? new Date(taskDetails.completedAt).toLocaleString() : '未完成'}
              </Descriptions.Item>
              {taskDetails.error && (
                <Descriptions.Item label="错误信息" span={2}>
                  <div style={{ color: 'red' }}>{taskDetails.error}</div>
                </Descriptions.Item>
              )}
            </Descriptions>

            <Divider>数据集内容</Divider>
            <div style={{ maxHeight: '400px', overflow: 'auto', marginTop: '16px', border: '1px solid #e8e8e8', padding: '12px', borderRadius: '4px', backgroundColor: '#f5f5f5' }}>
              <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {taskDetails.dataset || '没有数据集内容'}
              </pre>
            </div>
          </div>
        ) : (
          <div>未找到任务详情</div>
        )}
      </Modal>

      {/* 微调任务进度对话框 */}
      <Modal
        title="微调任务进度"
        open={isProgressModalVisible}
        onCancel={handleCloseProgressModal}
        footer={[
          <Button key="close" onClick={handleCloseProgressModal}>
            关闭
          </Button>
        ]}
        width={600}
      >
        <div
          ref={progressContainerRef}
          style={{
            maxHeight: '400px',
            overflow: 'auto',
            padding: '12px',
            backgroundColor: '#f5f5f5',
            borderRadius: '4px',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all'
          }}
        >
          {taskProgress}
        </div>
      </Modal>

      {/* 导出数据集对话框 */}
      <Modal
        title={`导出数据集 - ${exportFormat === 'llamaFactory' ? 'LLaMA-Factory' : 
                exportFormat === 'alpaca' ? 'Alpaca' : 
                exportFormat === 'chatML' ? 'ChatML' : '原始'} 格式`}
        open={exportModalVisible}
        onCancel={() => setExportModalVisible(false)}
        footer={[
          <Button 
            key="download" 
            type="primary" 
            icon={<DownloadOutlined />} 
            loading={exportLoading}
            onClick={downloadExportFile}
          >
            下载
          </Button>,
          <Button key="close" onClick={() => setExportModalVisible(false)}>
            关闭
          </Button>
        ]}
        width={800}
      >
        <div style={{ marginBottom: '16px' }}>
          <Space>
            <Button
              type={exportFormat === 'llamaFactory' ? 'primary' : 'default'}
              onClick={() => handleExportDataset('llamaFactory')}
            >
              LLaMA-Factory
            </Button>
            <Button
              type={exportFormat === 'alpaca' ? 'primary' : 'default'}
              onClick={() => handleExportDataset('alpaca')}
            >
              Alpaca
            </Button>
            <Button
              type={exportFormat === 'chatML' ? 'primary' : 'default'}
              onClick={() => handleExportDataset('chatML')}
            >
              ChatML
            </Button>
            <Button
              type={exportFormat === 'raw' ? 'primary' : 'default'}
              onClick={() => handleExportDataset('raw')}
            >
              原始格式
            </Button>
          </Space>
        </div>
        
        <div style={{ maxHeight: '400px', overflow: 'auto', border: '1px solid #e8e8e8', padding: '12px', borderRadius: '4px', backgroundColor: '#f5f5f5' }}>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            {exportContent}
          </pre>
        </div>
      </Modal>
    </div>
  );
} 