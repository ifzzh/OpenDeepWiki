import React, { useState, useEffect } from 'react';
import './DocumentSidebar.css';

interface AnchorItem {
  key: string;
  title: string;
  href?: string;
  children?: AnchorItem[];
}

interface DocumentSidebarProps {
  anchorItems: AnchorItem[];
  document?: any;
}

const DocumentSidebar: React.FC<DocumentSidebarProps> = ({
  anchorItems,
  document
}) => {
  const [activeAnchor, setActiveAnchor] = useState<string>('');

  // 监听滚动事件，自动更新活动锚点
  useEffect(() => {
    const handleScroll = () => {
      // 查找当前可见的章节
      anchorItems.forEach(item => {
        if (item.href) {
          const element = document.querySelector(item.href);
          if (element) {
            const { top } = element.getBoundingClientRect();
            if (top <= 100) {
              setActiveAnchor(item.href);
            }
          }
        }

        // 检查子项
        if (item.children) {
          item.children.forEach(child => {
            if (child.href) {
              const element = document.querySelector(child.href);
              if (element) {
                const { top } = element.getBoundingClientRect();
                if (top <= 100) {
                  setActiveAnchor(child.href);
                }
              }
            }
          });
        }
      });
    };

    window.addEventListener('scroll', handleScroll);
    // 初始检查当前 hash
    if (window.location.hash) {
      setActiveAnchor(window.location.hash);
    }
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, [anchorItems]);
  return (
    <div className="document-sidebar">
      <nav className="sidebar-navigation">
        {anchorItems && anchorItems.length > 0 ? (
          <ul className="sidebar-list">
            {anchorItems.map((item) => (
              <li 
                key={item.key} 
                className={`sidebar-item ${activeAnchor === item.href ? 'active' : ''}`}
              >
                <a 
                  href={item.href}
                  className="sidebar-link"
                >
                  <span className="dot-indicator"></span>
                  {item.title}
                </a>
                
                {item.children && item.children.length > 0 && (
                  <ul className="sidebar-sublist">
                    {item.children.map((child) => (
                      <li 
                        key={child.key} 
                        className={`sidebar-subitem ${activeAnchor === child.href ? 'active' : ''}`}
                      >
                        <a 
                          href={child.href}
                          className="sidebar-sublink"
                        >
                          <span className="dot-indicator small"></span>
                          {child.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <div className="sidebar-empty">暂无目录</div>
        )}
      </nav>
    </div>
  );
};

export default DocumentSidebar; 