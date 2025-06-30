'use client';
import { useEffect } from 'react';
import { Row, Col, theme } from 'antd';

// 导入封装好的组件
import {
  DocumentContent,
  DocumentSidebar,
  MobileDocumentDrawer,
  LoadingErrorState,
  DocumentStyles,
  initializeMermaid,
  SourceFiles
} from '../../../components/document';

// 导入类型
import { DocumentPageClientProps } from './types';
import FloatingChat from '../../../chat';

const { useToken } = theme;

export default function DocumentPageClient({
  document,
  error,
  headings,
  anchorItems,
  owner,
  name,
  path,
  branch
}: DocumentPageClientProps) {
  const { token } = useToken();

  // 初始化mermaid配置
  useEffect(() => {
    const isDarkMode = token.colorBgBase.startsWith('#11'); // 简单判断当前是否为暗黑模式
    initializeMermaid(isDarkMode);
  }, [token.colorBgBase]);

  // 渲染页面主体
  return (
    <main className="doc-page-container" style={{ backgroundColor: token.colorBgLayout, minHeight: '100vh' }}>
      <Row
        style={{
          padding: { xs: '8px', sm: '16px', md: '24px' }[token.screenSM],
          maxWidth: '1600px',
          margin: '0 auto'
        }}
      >
        {error ? (
          <Col span={24}>
            <LoadingErrorState
              loading={false}
              error={error}
              owner={owner}
              name={name}
              token={token}
            />
          </Col>
        ) : (
          <>
            {/* 源文件组件 */}
            {document?.fileSource && document.fileSource.length > 0 && (
              <Col style={{
                backgroundColor: token.colorBgElevated,
              }} span={24}>
                <SourceFiles
                  fileSource={document.fileSource}
                  owner={owner}
                  branch={document.branch}
                  git={document.address}
                  name={name}
                  token={token}
                />
              </Col>
            )}

            <Col xs={24} sm={24} md={18} lg={18} xl={18}>
              <DocumentContent
                document={document}
                owner={owner}
                name={name}
                token={token}
              />
            </Col>

            <Col xs={0} sm={0} md={6} lg={6} xl={6}>
              <nav aria-label="文档目录">
                <DocumentSidebar
                  anchorItems={anchorItems}
                  documentData={document}
                />
              </nav>
            </Col>
          </>
        )}
      </Row>

      {/* 移动端抽屉和悬浮按钮 - 仅在有文档内容时显示 */}
      {!error && (
        <MobileDocumentDrawer
          anchorItems={anchorItems}
          token={token}
        />
      )}

      {/* 全局样式 */}
      <DocumentStyles token={token} />
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
    </main>
  );
} 