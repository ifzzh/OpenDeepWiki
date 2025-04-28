import React, { ReactNode } from 'react';
import { Card, Typography, Breadcrumb, Tag, Divider, Space } from 'antd';
import { ClockCircleOutlined } from '@ant-design/icons';
import Link from 'next/link';

const { Title, Text } = Typography;

interface DocumentHeaderProps {
  document: any;
  lastUpdated: string;
  breadcrumbItems: {title: ReactNode}[];
  token: any;
}

const DocumentHeader: React.FC<DocumentHeaderProps> = ({
  document,
  lastUpdated,
  breadcrumbItems,
  token
}) => {
  return (
    <>
      <Card style={{ borderRadius: token.borderRadiusLG }}>
        <Breadcrumb items={breadcrumbItems} />
      </Card>

      {document && (
        <div style={{
          marginBottom: token.marginLG,
          display: 'flex',
          flexDirection: 'column',
          gap: token.marginSM
        }}>
          <Title 
            level={1}
            style={{
              margin: 0,
              color: token.colorText,
              fontSize: 28
            }}
          >
            {document.title}
          </Title>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: token.marginSM }}>
            <Divider type="vertical" />
            <Tag color="blue">文档</Tag>
          </div>

          <Divider style={{ margin: `${token.marginSM}px 0 ${token.marginLG}px` }} />
        </div>
      )}
    </>
  );
};

export default DocumentHeader; 