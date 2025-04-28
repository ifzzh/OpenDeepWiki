import { Suspense } from 'react';
import { getWarehouseOverview } from '../../services';
import { RepositoryView } from './RepositoryView';
import { ServerLoadingErrorState } from '../../components/document/ServerComponents';
import { headers } from 'next/headers';

export default async function RepositoryPage() {
  try {
    const headersList = await headers();
    const host = headersList.get('host');
    const url = headersList.get('x-url') || headersList.get('referer') || `https://${host}`;

    const apiUrl = new URL(url);

    const pathParts = apiUrl.pathname.split('/').filter(Boolean);
    const owner = pathParts[0] || '';
    const name = pathParts[1] || '';

    const response = await getWarehouseOverview(owner, name);

    // 如果获取数据失败，显示错误信息
    if (!response.success || !response.data) {
      return (
        <ServerLoadingErrorState
          loading={false}
          error={'抱歉，仓库不存在'}
          owner={owner}
          name={name}
        />
      );
    }

    // 将数据传递给客户端组件进行渲染
    return (
      <Suspense fallback={<ServerLoadingErrorState loading={true} owner={owner} name={name} />}>
        <RepositoryView
          owner={owner}
          name={name}
          document={response.data}
        />
      </Suspense>
    );
  } catch (error) {
    return (
      <ServerLoadingErrorState
        loading={false}
        error={'抱歉，获取仓库信息时发生错误'}
        owner={""}
        name={""}
      />
    );
  }
}
