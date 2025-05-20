import { documentCatalog } from '../../services/warehouseService';
import RepositoryLayoutClient from './layout.client';

export async function getRepositoryData(owner: string, name: string, branch?: string) {
  try {
    const { data } = await documentCatalog(owner, name, branch);
    return {
      catalogData: data || null,
      lastUpdated: data?.lastUpdate ?? ""
    };
  } catch (error) {
    console.error('Failed to fetch document catalog:', error);
    return {
      catalogData: null,
      lastUpdated: ''
    };
  }
}

export default async function RepositoryLayoutServer({
  owner,
  name,
  children,
  branch
}: {
  owner: string;
  name: string;
  children: React.ReactNode;
  branch: string;
}) {
  const { catalogData, lastUpdated } = await getRepositoryData(owner, name, branch);

  // 确保initialCatalogData包含当前branch信息
  if (catalogData && branch) {
    catalogData.currentBranch = branch;
  }

  return (
    <RepositoryLayoutClient
      owner={owner}
      name={name}
      initialCatalogData={catalogData}
      initialLastUpdated={lastUpdated}
    >
      {children}
    </RepositoryLayoutClient>
  );
} 