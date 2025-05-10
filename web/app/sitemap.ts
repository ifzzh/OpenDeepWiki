import { MetadataRoute } from 'next';
import { getWarehouse } from './services/warehouseService';

// 生成动态站点地图
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    // 获取所有仓库，每页50个
    const response = await getWarehouse(1, 50);
    const repos = response.data?.items || [];

    // 创建仓库主页URL，从地址中提取owner和name
    const repoUrls = repos.map((repo) => {
      // 例如：从 'https://github.com/owner/name' 提取 owner/name
      const addressParts = repo.address.split('/');
      const repoOwner = addressParts[addressParts.length - 2] || 'unknown';
      const repoName = addressParts[addressParts.length - 1] || repo.name;
      
      return {
        url: `https://koala.wiki/${repoOwner}/${repoName}`,
        lastModified: new Date(repo.updatedAt || Date.now()),
        changeFrequency: 'daily' as const,
        priority: 0.8,
      };
    });

    // 添加静态页面
    const staticUrls = [
      {
        url: 'https://koala.wiki',
        lastModified: new Date(),
        changeFrequency: 'daily' as const,
        priority: 1.0,
      },
      {
        url: 'https://koala.wiki/search',
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.5,
      },
    ];

    return [...staticUrls, ...repoUrls];
  } catch (error) {
    console.error('生成站点地图时出错:', error);

    // 发生错误时返回基本站点地图
    return [
      {
        url: 'https://koala.wiki',
        lastModified: new Date(),
        changeFrequency: 'daily' as const,
        priority: 1.0,
      },
    ];
  }
} 