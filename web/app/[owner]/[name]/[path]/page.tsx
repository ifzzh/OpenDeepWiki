'use client';
import { useState, useEffect, useMemo } from 'react';
import { Row, Col,  theme } from 'antd';
import { useParams } from 'next/navigation';
import 'katex/dist/katex.min.css';

// 导入封装好的组件
import {
  DocumentContent,
  DocumentSidebar,
  MobileDocumentDrawer,
  LoadingErrorState,
  DocumentStyles,
  extractHeadings,
  createAnchorItems,
  initializeMermaid,
  SourceFiles
} from '../../../components/document';

// 导入文档服务
import { documentById } from '../../../services/warehouseService';

const { useToken } = theme;

export default function DocumentPage() {
  const params = useParams();
  const { owner, name, path } = params;
  const [document, setDocument] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [headings, setHeadings] = useState<{key: string, title: string, level: number, id: string}[]>([]);
  const { token } = useToken();

  
  // 生成目录锚点项
  const anchorItems = useMemo(() => {
    return createAnchorItems(headings);
  }, [headings]);

  // 初始化mermaid配置
  useEffect(() => {
    const isDarkMode = token.colorBgBase.startsWith('#11'); // 简单判断当前是否为暗黑模式
    initializeMermaid(isDarkMode);
  }, [token.colorBgBase]);

  // 获取文档内容
  useEffect(() => {
    const fetchDocument = async () => {
      try {
        setLoading(true);
        const response = await documentById(owner as string, name as string, path as string);
        if (response.isSuccess && response.data) {
          setDocument(response.data);
          // 提取标题作为目录
          const extractedHeadings = extractHeadings(response.data.content);
          setHeadings(extractedHeadings);
        } else {
          setError(response.message || '无法获取文档内容，请检查文档路径是否正确');
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : '网络异常，请稍后重试';
        setError(`获取文档时发生错误：${errorMsg}`);
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchDocument();
  }, [owner, name, path]);

  // 渲染页面主体
  return (
    <div className="doc-page-container" style={{ backgroundColor: token.colorBgLayout, minHeight: '100vh' }}>
      <Row 
        style={{ 
          padding: { xs: '8px', sm: '16px', md: '24px' }[token.screenSM],
          maxWidth: '1600px',
          margin: '0 auto'
        }}
      >
        {loading || error ? (
          <Col span={24}>
            <LoadingErrorState
              loading={loading}
              error={error}
              owner={owner as string}
              name={name as string}
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
                  owner={owner as string}
                  git={document.address}
                  name={name as string}
                  token={token}
                />
              </Col>
            )}
            
            {/* 主要内容区 */}
            <Col xs={24} sm={24} md={18} lg={18} xl={18}>
              <DocumentContent
                document={document}
                owner={owner as string}
                name={name as string}
                token={token}
              />
            </Col>
            
            {/* 侧边栏：目录和更多信息 */}
            <Col xs={0} sm={0} md={6} lg={6} xl={6}>
              <DocumentSidebar
                anchorItems={anchorItems}
                token={token}
                document={document}
              />
            </Col>
          </>
        )}
      </Row>

      {/* 移动端抽屉和悬浮按钮 - 仅在有文档内容时显示 */}
      {!loading && !error && (
        <MobileDocumentDrawer
          anchorItems={anchorItems}
          token={token}
        />
      )}
      
      {/* 全局样式 */}
      <DocumentStyles token={token} />
    </div>
  );
}