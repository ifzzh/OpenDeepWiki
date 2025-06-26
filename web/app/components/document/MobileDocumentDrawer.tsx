'use client'
import React, { useState } from 'react';
import { Typography, Divider, Anchor, Button, Space, Tooltip } from 'antd';
import { BookOutlined, ExpandOutlined, ShareAltOutlined, CloseOutlined } from '@ant-design/icons';

const { Title } = Typography;

interface MobileDocumentDrawerProps {
  anchorItems: any[];
  token: any;
}

const MobileDocumentDrawer: React.FC<MobileDocumentDrawerProps> = ({
  anchorItems,
  token
}) => {
  const [expandAll, setExpandAll] = useState<boolean>(false);
  const [activeAnchor, setActiveAnchor] = useState<string>('');
  
  const toggleDrawer = () => {
    const drawerContent = document.querySelector('.mobile-toc-drawer');
    if (drawerContent) {
      drawerContent.classList.toggle('visible');
    }
  };
  
  // 复制当前页面链接
  const copyPageLink = () => {
    navigator.clipboard.writeText(window.location.href)
      .then(() => {
        // 可以添加一个轻量级的通知
        console.log('链接已复制到剪贴板');
      })
      .catch(err => {
        console.error('复制失败:', err);
      });
  };

  return (
    <>
      {/* 移动设备下的悬浮目录按钮 */}
      <div className="mobile-toc-button" style={{ 
        display: { xs: 'block', sm: 'block', md: 'none' }[token.screenSM], 
        position: 'fixed',
        right: 16,
        bottom: 16,
        zIndex: 1000
      }}>
        <Button 
          type="primary" 
          shape="circle" 
          size="large"
          icon={<BookOutlined />} 
          onClick={toggleDrawer}
        />
      </div>

      {/* 移动设备的目录抽屉 */}
      <div className="mobile-toc-drawer" style={{
        display: { xs: 'block', sm: 'block', md: 'none' }[token.screenSM],
        position: 'fixed',
        right: 0,
        bottom: 0,
        width: '85%',
        maxWidth: 320,
        height: '80vh',
        background: token.colorBgContainer,
        boxShadow: token.boxShadowSecondary,
        borderTopLeftRadius: token.borderRadiusLG,
        borderBottomLeftRadius: token.borderRadiusLG,
        transform: 'translateX(100%)',
        transition: 'transform 0.3s ease',
        opacity: 0,
        visibility: 'hidden',
        zIndex: 999,
        overflowY: 'auto',
        padding: 0
      }}>
        {/* 抽屉标题栏 */}
        <div style={{ 
          padding: `${token.paddingSM}px ${token.paddingMD}px`,
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Title level={5} style={{ margin: 0 }}>
            <BookOutlined style={{ marginRight: 8 }} /> 文档目录
          </Title>
          <Space>
            <Tooltip title={expandAll ? "收起所有" : "展开所有"}>
              <Button 
                type="text" 
                size="small" 
                icon={<ExpandOutlined />}
                onClick={() => setExpandAll(!expandAll)}
              />
            </Tooltip>
            <Tooltip title="分享链接">
              <Button 
                type="text" 
                size="small" 
                icon={<ShareAltOutlined />} 
                onClick={copyPageLink}
              />
            </Tooltip>
            <Tooltip title="关闭">
              <Button 
                type="text" 
                size="small" 
                icon={<CloseOutlined />} 
                onClick={toggleDrawer}
              />
            </Tooltip>
          </Space>
        </div>
        
        {/* 目录内容区 */}
        <div 
          className={`doc-toc-content ${expandAll ? 'expanded' : ''}`}
          style={{ 
            padding: `${token.paddingMD}px 0`,
            maxHeight: 'calc(100% - 50px)',
            overflowY: 'auto'
          }}
        >
          {anchorItems.length > 0 ? (
            <Anchor
              items={anchorItems}
              targetOffset={80}
              affix={false}
              getCurrentAnchor={() => activeAnchor}
              onClick={(e, link) => {
                e.preventDefault();
                if (link?.href) {
                  const targetElement = document.querySelector(link.href);
                  if (targetElement) {
                    targetElement.scrollIntoView({ 
                      behavior: 'smooth',
                      block: 'start'
                    });
                    setActiveAnchor(link.href);
                    
                    // 点击后关闭抽屉
                    toggleDrawer();
                  }
                }
              }}
              className="doc-anchor custom-doc-anchor"
            />
          ) : (
            <div style={{ textAlign: 'center', color: token.colorTextSecondary, padding: token.paddingLG }}>
              暂无目录
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default MobileDocumentDrawer; 