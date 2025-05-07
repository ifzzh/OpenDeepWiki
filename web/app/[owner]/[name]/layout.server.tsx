import { documentCatalog } from '../../services/warehouseService';
import RepositoryLayoutClient from './layout.client';

export async function getRepositoryData(owner: string, name: string) {
  try {
    const { data } = await documentCatalog(owner, name);
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
  children
}: {
  owner: string;
  name: string;
  children: React.ReactNode;
}) {
  const { catalogData, lastUpdated } = await getRepositoryData(owner, name);
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