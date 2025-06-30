'use client'

import { 
  Row, 
  Col, 
  theme,
} from 'antd';
import { useState, useMemo, useEffect } from 'react';
import { createAnchorItems, DocumentContent, DocumentSidebar, DocumentStyles, extractHeadings, MobileDocumentDrawer } from '../../components/document';
import FloatingChat from '../../chat/index';

const { useToken } = theme;

interface RepositoryViewProps {
  owner: string;
  name: string;
  document: any;
}

export function RepositoryView({ owner, name, document }: RepositoryViewProps) {
  const { token } = useToken();
  const [headings, setHeadings] = useState<{key: string, title: string, level: number, id: string}[]>([]);
  
  const anchorItems = useMemo(() => {
    return createAnchorItems(headings);
  }, [headings]);
  
  useEffect(() => {
    // 提取标题作为目录
    if (document?.content) {
      const extractedHeadings = extractHeadings(document.content);
      setHeadings(extractedHeadings);
    }
  }, [document]);

  return (
    <div className="doc-page-container" style={{ backgroundColor: token.colorBgLayout, minHeight: '100vh' }}>
      <Row 
        gutter={[0, 16]} 
        style={{ 
          padding: { xs: '8px', sm: '16px', md: '24px' }[token.screenSM],
          maxWidth: '1600px',
          margin: '0 auto'
        }}
      >
        <Col xs={24} sm={24} md={18} lg={18} xl={18}>
          <DocumentContent
            document={document}
            owner={owner}
            name={name}
            token={token}
          />
        </Col>
        
        <Col xs={0} sm={0} md={6} lg={6} xl={6}>
          <DocumentSidebar
            anchorItems={anchorItems}
            documentData={document}
          />
        </Col>
      </Row>
      
      <MobileDocumentDrawer
        anchorItems={anchorItems}
        token={token}
      />
      
      <DocumentStyles token={token} />
      
      {/* 内置聊天悬浮球 */}
      <FloatingChat
        appId={`builtin_${owner}_${name}`}
        organizationName={owner}
        repositoryName={name}
        title={`${name} AI 助手`}
        theme="light"
        enableDomainValidation={false}
        embedded={false}
        onError={(error) => {
          console.error('Built-in chat error:', error);
        }}
      />
    </div>
  );
} 