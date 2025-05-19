import { documentCatalog } from '../../services/warehouseService';
import RepositoryLayoutClient from './layout.client';
import { headers } from 'next/headers';

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
  searchParams
}: {
  owner: string;
  name: string;
  children: React.ReactNode;
  searchParams?: { branch?: string };
}) {
  // 从URL查询参数中获取branch
  const branch = searchParams?.branch;
  
  const { catalogData, lastUpdated } = await getRepositoryData(owner, name, branch);
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