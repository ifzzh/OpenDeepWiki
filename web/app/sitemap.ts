import { MetadataRoute } from 'next';
import { getWarehouse } from './services/warehouseService';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://opendeep.wiki';
  
  // 基础页面
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/search`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/register`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.2,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.2,
    },
  ];

  try {
    // 获取仓库列表
    const warehouseResponse = await getWarehouse(1, 1000); // 获取前1000个仓库
    
    if (warehouseResponse.isSuccess && warehouseResponse.data?.items) {
      const repositoryPages: MetadataRoute.Sitemap = warehouseResponse.data.items.map((repo) => ({
        url: `${baseUrl}/${repo.organizationName}/${repo.name}`,
        lastModified: repo.updatedAt ? new Date(repo.updatedAt) : new Date(repo.createdAt),
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      }));

      // 为每个仓库添加changelog页面
      const changelogPages: MetadataRoute.Sitemap = warehouseResponse.data.items.map((repo) => ({
        url: `${baseUrl}/${repo.organizationName}/${repo.name}/changelog`,
        lastModified: repo.updatedAt ? new Date(repo.updatedAt) : new Date(repo.createdAt),
        changeFrequency: 'weekly' as const,
        priority: 0.5,
      }));

      return [...staticPages, ...repositoryPages, ...changelogPages];
    }
  } catch (error) {
    console.error('生成sitemap时出错:', error);
  }

  return staticPages;
} 