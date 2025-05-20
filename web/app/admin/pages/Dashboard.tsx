'use client'

import { useState, useEffect } from 'react';

export default function Dashboard() {
  const [stats, setStats] = useState({
    users: 0,
    repositories: 0,
    documents: 0,
    views: 0
  });
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 模拟从API获取统计数据
    const fetchStats = async () => {
      try {
        // 这里替换为实际的API调用
        // const response = await fetch('/api/admin/stats');
        // const data = await response.json();
        
        // 模拟数据
        const mockData = {
          users: 256,
          repositories: 89,
          documents: 3742,
          views: 25689
        };
        
        setTimeout(() => {
          setStats(mockData);
          setLoading(false);
        }, 500);
        
      } catch (error) {
        console.error('获取统计数据失败:', error);
        setLoading(false);
      }
    };
    
    fetchStats();
  }, []);
  
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">数据统计</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* 用户统计 */}
        <div className="card bg-gradient-to-br from-blue-50 to-blue-100 border-none">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-600 text-sm font-medium">总用户数</p>
                <h3 className="text-3xl font-bold text-gray-800 mt-2">
                  {loading ? (
                    <div className="h-8 w-16 bg-blue-200 animate-pulse rounded"></div>
                  ) : (
                    stats.users.toLocaleString()
                  )}
                </h3>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
            </div>
            <div className="mt-4 text-sm text-blue-600">
              <span className="font-medium">+12%</span> 本月增长
            </div>
          </div>
        </div>
        
        {/* 仓库统计 */}
        <div className="card bg-gradient-to-br from-green-50 to-green-100 border-none">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-600 text-sm font-medium">仓库数量</p>
                <h3 className="text-3xl font-bold text-gray-800 mt-2">
                  {loading ? (
                    <div className="h-8 w-16 bg-green-200 animate-pulse rounded"></div>
                  ) : (
                    stats.repositories.toLocaleString()
                  )}
                </h3>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                </svg>
              </div>
            </div>
            <div className="mt-4 text-sm text-green-600">
              <span className="font-medium">+8%</span> 本月增长
            </div>
          </div>
        </div>
        
        {/* 文档统计 */}
        <div className="card bg-gradient-to-br from-purple-50 to-purple-100 border-none">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-600 text-sm font-medium">文档数量</p>
                <h3 className="text-3xl font-bold text-gray-800 mt-2">
                  {loading ? (
                    <div className="h-8 w-16 bg-purple-200 animate-pulse rounded"></div>
                  ) : (
                    stats.documents.toLocaleString()
                  )}
                </h3>
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
            <div className="mt-4 text-sm text-purple-600">
              <span className="font-medium">+25%</span> 本月增长
            </div>
          </div>
        </div>
        
        {/* 访问量统计 */}
        <div className="card bg-gradient-to-br from-amber-50 to-amber-100 border-none">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-amber-600 text-sm font-medium">总访问量</p>
                <h3 className="text-3xl font-bold text-gray-800 mt-2">
                  {loading ? (
                    <div className="h-8 w-16 bg-amber-200 animate-pulse rounded"></div>
                  ) : (
                    stats.views.toLocaleString()
                  )}
                </h3>
              </div>
              <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
            </div>
            <div className="mt-4 text-sm text-amber-600">
              <span className="font-medium">+18%</span> 本月增长
            </div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        {/* 最近的仓库 */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-800">最近创建的仓库</h2>
          </div>
          <div className="card-body p-0">
            <div className="divide-y divide-gray-100">
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <div key={i} className="px-6 py-4">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2 animate-pulse"></div>
                    <div className="h-3 bg-gray-100 rounded w-1/2 animate-pulse"></div>
                  </div>
                ))
              ) : (
                <>
                  <div className="px-6 py-4 hover:bg-gray-50">
                    <div className="flex items-center">
                      <div className="flex-1">
                        <h3 className="text-sm font-medium text-gray-800">API文档中心</h3>
                        <p className="text-xs text-gray-500 mt-1">由 张三 创建于 2023-05-20</p>
                      </div>
                      <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">活跃</span>
                    </div>
                  </div>
                  <div className="px-6 py-4 hover:bg-gray-50">
                    <div className="flex items-center">
                      <div className="flex-1">
                        <h3 className="text-sm font-medium text-gray-800">技术知识库</h3>
                        <p className="text-xs text-gray-500 mt-1">由 李四 创建于 2023-05-18</p>
                      </div>
                      <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">活跃</span>
                    </div>
                  </div>
                  <div className="px-6 py-4 hover:bg-gray-50">
                    <div className="flex items-center">
                      <div className="flex-1">
                        <h3 className="text-sm font-medium text-gray-800">产品使用手册</h3>
                        <p className="text-xs text-gray-500 mt-1">由 王五 创建于 2023-05-15</p>
                      </div>
                      <span className="px-2 py-1 text-xs rounded-full bg-amber-100 text-amber-800">待审核</span>
                    </div>
                  </div>
                  <div className="px-6 py-4 hover:bg-gray-50">
                    <div className="flex items-center">
                      <div className="flex-1">
                        <h3 className="text-sm font-medium text-gray-800">开发规范文档</h3>
                        <p className="text-xs text-gray-500 mt-1">由 赵六 创建于 2023-05-10</p>
                      </div>
                      <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">活跃</span>
                    </div>
                  </div>
                  <div className="px-6 py-4 hover:bg-gray-50">
                    <div className="flex items-center">
                      <div className="flex-1">
                        <h3 className="text-sm font-medium text-gray-800">项目方案设计</h3>
                        <p className="text-xs text-gray-500 mt-1">由 钱七 创建于 2023-05-05</p>
                      </div>
                      <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">已归档</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        
        {/* 最近的用户活动 */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-800">最近用户活动</h2>
          </div>
          <div className="card-body p-0">
            <div className="divide-y divide-gray-100">
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <div key={i} className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse mr-3"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2 animate-pulse"></div>
                        <div className="h-3 bg-gray-100 rounded w-1/2 animate-pulse"></div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <>
                  <div className="px-6 py-4 hover:bg-gray-50">
                    <div className="flex items-center">
                      <div className="h-8 w-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mr-3">
                        <span className="text-xs font-medium">ZS</span>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-sm font-medium text-gray-800">张三 编辑了文档</h3>
                        <p className="text-xs text-gray-500 mt-1">API文档中心 / 接口规范 · 10分钟前</p>
                      </div>
                    </div>
                  </div>
                  <div className="px-6 py-4 hover:bg-gray-50">
                    <div className="flex items-center">
                      <div className="h-8 w-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center mr-3">
                        <span className="text-xs font-medium">LS</span>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-sm font-medium text-gray-800">李四 创建了新仓库</h3>
                        <p className="text-xs text-gray-500 mt-1">移动端开发指南 · 1小时前</p>
                      </div>
                    </div>
                  </div>
                  <div className="px-6 py-4 hover:bg-gray-50">
                    <div className="flex items-center">
                      <div className="h-8 w-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mr-3">
                        <span className="text-xs font-medium">WW</span>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-sm font-medium text-gray-800">王五 评论了文档</h3>
                        <p className="text-xs text-gray-500 mt-1">技术知识库 / 架构设计 · 2小时前</p>
                      </div>
                    </div>
                  </div>
                  <div className="px-6 py-4 hover:bg-gray-50">
                    <div className="flex items-center">
                      <div className="h-8 w-8 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mr-3">
                        <span className="text-xs font-medium">ZL</span>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-sm font-medium text-gray-800">赵六 更新了仓库设置</h3>
                        <p className="text-xs text-gray-500 mt-1">开发规范文档 · 3小时前</p>
                      </div>
                    </div>
                  </div>
                  <div className="px-6 py-4 hover:bg-gray-50">
                    <div className="flex items-center">
                      <div className="h-8 w-8 bg-red-100 text-red-600 rounded-full flex items-center justify-center mr-3">
                        <span className="text-xs font-medium">QQ</span>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-sm font-medium text-gray-800">钱七 删除了文档</h3>
                        <p className="text-xs text-gray-500 mt-1">项目方案设计 / 旧版设计 · 4小时前</p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 