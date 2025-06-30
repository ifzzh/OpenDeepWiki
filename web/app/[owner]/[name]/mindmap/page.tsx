'use client'

import React, { useEffect, useRef, useState } from 'react';
import { Card, Spin, message, Button, Tooltip } from 'antd';
import { useParams, useSearchParams } from 'next/navigation';
import { getMiniMap } from '../../../services/warehouseService';
import { useTranslation } from '../../../i18n/client';
import { FullscreenOutlined, FullscreenExitOutlined, ReloadOutlined, DownloadOutlined } from '@ant-design/icons';

interface MiniMapResult {
    title: string;
    url: string;
    nodes: MiniMapResult[];
}

interface MindElixirNode {
    topic: string;
    id: string;
    url?: string;
    children?: MindElixirNode[];
}

const MindMapPage: React.FC = () => {
    const { t } = useTranslation();
    const params = useParams();
    const searchParams = useSearchParams();
    const containerRef = useRef<HTMLDivElement>(null);
    const mindRef = useRef<any>(null);

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<MiniMapResult | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const owner = params.owner as string;
    const name = params.name as string;
    const branch = searchParams.get('branch') || undefined;

    // 转换为 mind-elixir 数据格式
    const convertToMindElixirData = (miniMapData: MiniMapResult): MindElixirNode => {
        let nodeIdCounter = 0;
        
        const buildMindNode = (node: MiniMapResult): MindElixirNode => {
            const mindNode: MindElixirNode = {
                topic: node.title,
                id: `node_${nodeIdCounter++}`,
                url: node.url,
            };

            if (node.nodes && node.nodes.length > 0) {
                mindNode.children = node.nodes.map(child => buildMindNode(child));
            }

            return mindNode;
        };

        return buildMindNode(miniMapData);
    };

    // 初始化 Mind Elixir
    const initMindElixir = async (mindData: MindElixirNode) => {
        if (!containerRef.current) return;

        // 动态导入 mind-elixir
        const MindElixir = (await import('mind-elixir')).default;

        // 销毁旧实例
        if (mindRef.current) {
            mindRef.current.destroy?.();
        }

        const options = {
            el: containerRef.current,
            direction: MindElixir.SIDE, // 左右布局
            draggable: true,
            contextMenu: true,
            toolBar: false, // 隐藏工具栏，我们用自己的
            nodeMenu: true,
            keypress: true,
            locale: 'en' as const, // 使用支持的locale
            overflowHidden: false,
            mainLinkStyle: 2,
            mouseSelectionButton: 0 as const, // 鼠标左键选择
            allowFreeTransform: true, // 允许自由变换
            mouseMoveThreshold: 5, // 鼠标移动阈值
            primaryLinkStyle: 1, // 主链接样式
            primaryNodeHorizontalGap: 65, // 水平间距
            primaryNodeVerticalGap: 25, // 垂直间距
            theme: {
                name: 'Blue',
                palette: [
                    '#1890ff', '#52c41a', '#fa541c', '#722ed1', 
                    '#13c2c2', '#eb2f96', '#f5222d', '#fa8c16', 
                    '#a0d911', '#1890ff'
                ],
                cssVar: {
                    '--main-color': '#1890ff',
                    '--main-bgcolor': '#ffffff',
                    '--color': '#333333',
                    '--bgcolor': '#f8fafc',
                    '--panel-color': '255, 255, 255',
                    '--panel-bgcolor': '248, 250, 252',
                },
            },
        };

        const mind = new MindElixir(options);
        
        // 构建完整的数据结构
        const mindElixirData = {
            nodeData: mindData,
            linkData: {}
        };
        
        mind.init(mindElixirData);

        // 添加节点点击事件
        mind.bus.addListener('selectNode', (node: any) => {
            if(node.url){
                window.open(node.url, '_blank');
            }
        });

        // 添加操作监听
        mind.bus.addListener('operation', (operation: any) => {
            console.log('Mind map operation:', operation);
        });

        mindRef.current = mind;

        // 响应式调整
        const resizeObserver = new ResizeObserver(() => {
            if (mind && containerRef.current) {
                mind.refresh();
            }
        });

        resizeObserver.observe(containerRef.current);

        return () => {
            resizeObserver.disconnect();
            if (mind) {
                mind.destroy?.();
            }
        };
    };

    // 获取思维导图数据
    const fetchMindMapData = async () => {
        setLoading(true);
        try {
            const {data} = await getMiniMap(owner, name, branch);
            if (data.data) {
                setData(data.data);
                const mindData = convertToMindElixirData(data.data);
                setTimeout(() => initMindElixir(mindData), 100);
            } else {
                message.error(data.message || '获取思维导图数据失败');
            }
        } catch (error) {
            console.error('Error fetching mind map data:', error);
            message.error('获取思维导图数据失败');
        } finally {
            setLoading(false);
        }
    };

    // 全屏切换
    const toggleFullscreen = () => {
        setIsFullscreen(!isFullscreen);
        setTimeout(() => {
            if (mindRef.current && containerRef.current) {
                mindRef.current.refresh();
            }
        }, 100);
    };

    // 刷新数据
    const refreshData = () => {
        fetchMindMapData();
    };

    // 导出为图片
    const exportImage = async () => {
        if (!mindRef.current) {
            message.error('思维导图未初始化');
            return;
        }

        try {
            const blob = await mindRef.current.exportPng();
            if (blob) {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${owner}-${name}-mindmap.png`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                message.success('导出成功');
            } else {
                message.error('导出失败');
            }
        } catch (error) {
            console.error('Export error:', error);
            message.error('导出失败');
        }
    };

    useEffect(() => {
        fetchMindMapData();

        return () => {
            if (mindRef.current) {
                mindRef.current.destroy?.();
            }
        };
    }, [owner, name, branch]);

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '60vh'
            }}>
                <Spin size="large" />
            </div>
        );
    }

    return (
        <div style={{ height: '100%' }}>
            <Card
                hoverable={false}
                title={
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '18px', fontWeight: 'bold' }}>
                            {data?.title || `${owner}/${name} 思维导图`}
                        </span>
                        <div>
                            <Tooltip title="刷新">
                                <Button
                                    type="text"
                                    icon={<ReloadOutlined />}
                                    onClick={refreshData}
                                    style={{ marginRight: 8 }}
                                />
                            </Tooltip>
                            <Tooltip title="导出图片">
                                <Button
                                    type="text"
                                    icon={<DownloadOutlined />}
                                    onClick={exportImage}
                                    style={{ marginRight: 8 }}
                                />
                            </Tooltip>
                            <Tooltip title={isFullscreen ? "退出全屏" : "全屏"}>
                                <Button
                                    type="text"
                                    icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
                                    onClick={toggleFullscreen}
                                />
                            </Tooltip>
                        </div>
                    </div>
                }
                style={{
                    height: isFullscreen ? '100vh' : '85vh',
                    position: isFullscreen ? 'fixed' : 'relative',
                    top: isFullscreen ? 0 : 'auto',
                    left: isFullscreen ? 0 : 'auto',
                    width: isFullscreen ? '100vw' : '100%',
                    zIndex: isFullscreen ? 9999 : 'auto',
                }}
                bodyStyle={{
                    height: isFullscreen ? 'calc(100vh - 57px)' : 'calc(85vh - 57px)',
                    padding: 0,
                    position: 'relative',
                }}
            >
                <div
                    ref={containerRef}
                    style={{
                        width: '100%',
                        height: '100%',
                        background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
                        borderRadius: isFullscreen ? 0 : '8px',
                        position: 'relative',
                        touchAction: 'none', // 禁用触摸手势
                        userSelect: 'none', // 禁用文本选择
                        WebkitUserSelect: 'none', // Safari兼容
                    }}
                    onContextMenu={(e) => {
                        // 阻止默认右键菜单，让mind-elixir处理
                        e.preventDefault();
                    }}
                    onMouseDown={(e) => {
                        // 禁用浏览器的拖拽选择行为
                        if (e.button === 2) { // 右键
                            e.preventDefault();
                        }
                    }}
                    onTouchStart={(e) => {
                        // 禁用触摸手势
                        if (e.touches.length > 1) {
                            e.preventDefault();
                        }
                    }}
                    onTouchMove={(e) => {
                        // 禁用触摸滚动手势
                        e.preventDefault();
                    }}
                    onDragStart={(e) => {
                        // 禁用默认拖拽行为
                        e.preventDefault();
                    }}
                />

                {/* 操作提示 */}
                <div style={{
                    position: 'absolute',
                    bottom: 16,
                    right: 16,
                    background: 'rgba(0, 0, 0, 0.7)',
                    color: 'white',
                    padding: '8px 12px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    zIndex: 1000,
                }}>
                    鼠标左键拖动 • 滚轮缩放 • 双击节点查看详情 • 右键菜单编辑
                </div>
            </Card>

            {/* Mind Elixir CSS */}
            <style jsx global>{`
                .mind-elixir {
                    width: 100%;
                    height: 100%;
                    touch-action: none !important;
                    user-select: none !important;
                    WebkitUserSelect: none !important;
                    MozUserSelect: none !important;
                    MsUserSelect: none !important;
                }
                
                .mind-elixir .map-container {
                    background: transparent !important;
                    touch-action: none !important;
                    -ms-touch-action: none !important;
                    -webkit-touch-callout: none !important;
                }
                
                .mind-elixir .node-container {
                    cursor: pointer;
                    touch-action: none !important;
                }
                
                .mind-elixir .node-container:hover {
                    opacity: 0.8;
                    transform: scale(1.05);
                    transition: all 0.2s ease;
                }
                
                .mind-elixir .line {
                    stroke: #1890ff;
                    stroke-width: 2;
                }
                
                .mind-elixir .node {
                    border-radius: 6px;
                    border: 2px solid #1890ff;
                    background: #ffffff;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                    touch-action: none !important;
                }
                
                .mind-elixir .root {
                    background: linear-gradient(135deg, #1890ff, #096dd9) !important;
                    color: white !important;
                    font-weight: bold;
                    font-size: 16px;
                }
                
                .mind-elixir .primary {
                    background: #e6f7ff !important;
                    border-color: #1890ff !important;
                    color: #1890ff !important;
                }
                
                .mind-elixir .context-menu {
                    border-radius: 6px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                    border: 1px solid #e8e8e8;
                    z-index: 9999 !important;
                }

                /* 专门针对Edge浏览器的手势禁用 */
                html {
                    -ms-touch-action: none !important;
                    touch-action: none !important;
                }
                
                body {
                    -ms-touch-action: manipulation !important;
                    touch-action: manipulation !important;
                }
                
                /* 禁用Edge的右键手势 */
                * {
                    -webkit-touch-callout: none !important;
                    -webkit-user-select: none !important;
                    -khtml-user-select: none !important;
                    -moz-user-select: none !important;
                    -ms-user-select: none !important;
                }
                
                /* 允许输入框和文本区域的选择 */
                input, textarea, [contenteditable] {
                    -webkit-user-select: text !important;
                    -moz-user-select: text !important;
                    -ms-user-select: text !important;
                    user-select: text !important;
                }
            `}</style>
        </div>
    );
};

export default MindMapPage; 