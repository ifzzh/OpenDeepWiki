import { getWarehouseOverview } from '../../services';
import ClientRepositoryPage from './ClientRepositoryPage';
import RepositoryInfo from './RepositoryInfo';
import { checkGitHubRepoExists } from '../../services/githubService';

// 服务器组件，处理数据获取
export default async function RepositoryPage({ params, searchParams }: any) {
  try {
    const owner = params.owner;
    const name = params.name;
    // 从查询参数中获取分支信息
    const branch = searchParams.branch as string | undefined;

    if (!owner || !name) {
      throw new Error('Missing owner or repository name');
    }

    // 在服务器端获取数据
    const response = await getWarehouseOverview(owner, name, branch);

    // 如果获取数据失败，尝试从GitHub获取仓库信息
    if (!response.success || !response.data) {
      // 检查GitHub仓库是否存在
      const githubRepoExists = await checkGitHubRepoExists(owner, name, branch);
      
      // 如果GitHub仓库存在，则显示GitHub仓库信息
      if (githubRepoExists) {
        return (
          <RepositoryInfo
            owner={owner}
            branch={branch}
            name={name}
          />
        );
      } else {
        // 如果GitHub仓库也不存在，则显示添加仓库提示
        return (
          <RepositoryInfo
            owner={owner}
            branch={branch}
            name={name}
          />
        );
      }
    }

    // 将数据传递给客户端组件进行渲染
    return (
      <ClientRepositoryPage
        owner={owner}
        name={name}
        document={response.data}
      />
    );
  } catch (error) {
    const owner = params?.owner || "";
    const name = params?.name || "";
    const branch = searchParams?.branch as string | undefined;
    return (
      <RepositoryInfo
        owner={owner}
        name={name}
        branch={branch}
      />
    );
  }
}
