import { getChangeLog } from '../../../services/warehouseService';
import RepositoryInfo from '../RepositoryInfo';

// 服务器组件，处理数据获取
export default async function ChangelogPage({ params, searchParams }: any) {
  try {
    const owner = params.owner;
    const name = params.name;
    // 从查询参数中获取分支信息
    const branch = searchParams.branch as string | undefined;

    if (!owner || !name) {
      throw new Error('Missing owner or repository name');
    }

    // 在服务器端获取数据
    const response = await getChangeLog(owner, name, branch);

    // 如果获取数据失败，尝试从GitHub获取仓库信息
    if (!response.success || !response.data) {
      return (
        <RepositoryInfo
          owner={owner}
          name={name}
        />
      );
    }

    // 直接在服务器端渲染更新日志
    return (
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px' }}>
        <h2 style={{ marginBottom: '24px' }}>更新日志</h2>
        <div dangerouslySetInnerHTML={{ __html: response.data.html || response.data.commitMessage }} />
      </div>
    );
  } catch (error) {
    console.error('Failed to load changelog:', error);
    const owner = params?.owner || "";
    const name = params?.name || "";

    // 出现错误时也展示GitHub仓库信息（如果有）
    return (
      <RepositoryInfo
        owner={owner}
        name={name}
      />
    );
  }
} 