'use client'

import { Card, Row, Col, Statistic, Table, DatePicker, Button } from 'antd';
import { 
  UserOutlined, 
  BookOutlined, 
  EyeOutlined, 
  StarOutlined,
  UpCircleOutlined,
  DownCircleOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

// 定义类型
interface RepoActivity {
  key: string;
  name: string;
  owner: string;
  views: number;
  updated: string;
}

// 模拟数据
const recentActivities: RepoActivity[] = [
  {
    key: '1',
    name: 'API文档项目',
    owner: 'tech-team',
    views: 232,
    updated: '2023-06-28 14:23',
  },
  {
    key: '2',
    name: '产品手册',
    owner: 'product',
    views: 186,
    updated: '2023-06-27 09:15',
  },
  {
    key: '3',
    name: '开发指南',
    owner: 'dev-team',
    views: 142,
    updated: '2023-06-26 16:48',
  },
  {
    key: '4',
    name: '用户使用手册',
    owner: 'support',
    views: 119,
    updated: '2023-06-25 11:30',
  },
  {
    key: '5',
    name: '系统架构文档',
    owner: 'arch-team',
    views: 98,
    updated: '2023-06-24 15:20',
  },
];

// 表格列定义
const columns: ColumnsType<RepoActivity> = [
  {
    title: '仓库名称',
    dataIndex: 'name',
    key: 'name',
    render: (text) => <a>{text}</a>,
  },
  {
    title: '所有者',
    dataIndex: 'owner',
    key: 'owner',
  },
  {
    title: '浏览量',
    dataIndex: 'views',
    key: 'views',
    sorter: (a, b) => a.views - b.views,
  },
  {
    title: '更新时间',
    dataIndex: 'updated',
    key: 'updated',
  },
];

export default function AdminDashboard() {
  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>数据统计</h2>
      
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card hoverable>
            <Statistic 
              title="总用户数" 
              value={1243} 
              prefix={<UserOutlined />} 
              valueStyle={{ color: '#1677ff' }}
            />
            <div style={{ marginTop: 8, color: '#52c41a' }}>
              <UpCircleOutlined /> 24.5% 较上月
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card hoverable>
            <Statistic 
              title="总仓库数" 
              value={356} 
              prefix={<BookOutlined />} 
              valueStyle={{ color: '#1677ff' }}
            />
            <div style={{ marginTop: 8, color: '#52c41a' }}>
              <UpCircleOutlined /> 12.3% 较上月
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card hoverable>
            <Statistic 
              title="本月访问量" 
              value={8462} 
              prefix={<EyeOutlined />} 
              valueStyle={{ color: '#1677ff' }}
            />
            <div style={{ marginTop: 8, color: '#52c41a' }}>
              <UpCircleOutlined /> 32.8% 较上月
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card hoverable>
            <Statistic 
              title="标星仓库" 
              value={128} 
              prefix={<StarOutlined />} 
              valueStyle={{ color: '#1677ff' }}
            />
            <div style={{ marginTop: 8, color: '#ff4d4f' }}>
              <DownCircleOutlined /> 4.2% 较上月
            </div>
          </Card>
        </Col>
      </Row>
      
      <Card 
        title="最近活跃仓库" 
        style={{ marginTop: 24 }}
        extra={
          <div style={{ display: 'flex', gap: '8px' }}>
            <DatePicker.RangePicker placeholder={['开始日期', '结束日期']} />
            <Button type="primary">查询</Button>
          </div>
        }
      >
        <Table 
          columns={columns}
          dataSource={recentActivities}
          pagination={{ pageSize: 5 }}
        />
      </Card>
    </div>
  );
} 