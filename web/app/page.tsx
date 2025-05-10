import { getWarehouse } from './services/warehouseService';
import HomeClient from './components/HomeClient';
import { Suspense } from 'react';
import { Spin } from 'antd';

export default async function Home({ searchParams = {} }: any) {
  // 确保 searchParams 已经被解析
  const resolvedSearchParams = await searchParams;
  
  // 从 URL 参数中获取分页信息
  const page = Number(resolvedSearchParams?.page) || 1;
  const pageSize = Number(resolvedSearchParams?.pageSize) || 20;
  const keyword = resolvedSearchParams?.keyword || '';
  // 在服务端获取初始数据
  const response = await getWarehouse(page, pageSize,keyword);
  const initialRepositories = response.success ? response.data.items : [];
  const initialTotal = response.success ? response.data.total : 0;

  return (
    <Suspense fallback={<div style={{ textAlign: 'center', marginTop: '20%' }}><Spin size="large" /></div>}>
      <HomeClient 
        initialRepositories={initialRepositories}
        initialTotal={initialTotal}
        initialPage={page}
        initialPageSize={pageSize}
        initialSearchValue={keyword}
      />
    </Suspense>
  );
}