import { API_URL } from './api';
import { fetchApi, ApiResponse } from './fetchApi';
import { PageResponse } from './userService';

// 仓库信息接口
export interface RepositoryInfo {
  id: string;
  organizationName: string;
  name: string;
  description: string;
  address: string;
  type?: string;
  branch?: string;
  status: number;
  error?: string;
  prompt?: string;
  version?: string;
  isEmbedded: boolean;
  isRecommended: boolean;
  createdAt: string;
}

// 创建Git仓库请求
export interface CreateGitRepositoryRequest {
  address: string;
  branch?: string;
  gitUserName?: string;
  gitPassword?: string;
  email?: string;
}

// 更新仓库请求
export interface UpdateRepositoryRequest {
  description?: string;
  isRecommended?: boolean;
  prompt?: string;
}

/**
 * 获取仓库列表
 * @param page 页码
 * @param pageSize 每页数量
 * @param keyword 搜索关键词
 * @returns 仓库列表
 */
export async function getRepositoryList(
  page: number = 1,
  pageSize: number = 10,
  keyword?: string
): Promise<ApiResponse<PageResponse<RepositoryInfo>>> {
  let url = `${API_URL}/api/Repository/RepositoryList?page=${page}&pageSize=${pageSize}`;
  if (keyword) {
    url += `&keyword=${encodeURIComponent(keyword)}`;
  }

  return fetchApi<PageResponse<RepositoryInfo>>(url);
}

/**
 * 获取仓库详情
 * @param id 仓库ID
 * @returns 仓库详情
 */
export async function getRepositoryById(id: string): Promise<ApiResponse<RepositoryInfo>> {
  return fetchApi<RepositoryInfo>(`${API_URL}/api/Repository/Repository?id=${id}`);
}

/**
 * 根据组织名称和仓库名称获取仓库详情
 * @param owner 组织名称
 * @param name 仓库名称
 * @param branch 分支名称（可选）
 * @returns 仓库详情
 */
export async function getRepositoryByOwnerAndName(
  owner: string,
  name: string,
  branch?: string
): Promise<ApiResponse<RepositoryInfo>> {
  let url = `${API_URL}/api/Repository/GetRepositoryByOwnerAndName?owner=${encodeURIComponent(owner)}&name=${encodeURIComponent(name)}`;
  if (branch) {
    url += `&branch=${encodeURIComponent(branch)}`;
  }

  return fetchApi<RepositoryInfo>(url);
}

/**
 * 创建Git仓库
 * @param repository 仓库信息
 * @returns 创建结果
 */
export async function createGitRepository(
  repository: CreateGitRepositoryRequest
): Promise<ApiResponse<RepositoryInfo>> {
  return fetchApi<RepositoryInfo>(`${API_URL}/api/Repository/GitRepository`, {
    method: 'POST',
    body: JSON.stringify(repository),
  });
}

/**
 * 更新仓库
 * @param id 仓库ID
 * @param repository 仓库信息
 * @returns 更新结果
 */
export async function updateRepository(
  id: string,
  repository: UpdateRepositoryRequest
): Promise<ApiResponse<RepositoryInfo>> {
  return fetchApi<RepositoryInfo>(`${API_URL}/api/Repository/Repository?id=${id}`, {
    method: 'PUT',
    body: JSON.stringify(repository),
  });
}

/**
 * 删除仓库
 * @param id 仓库ID
 * @returns 删除结果
 */
export async function deleteRepository(id: string): Promise<ApiResponse<boolean>> {
  return fetchApi<boolean>(`${API_URL}/api/Repository/Repository?id=${id}`, {
    method: 'DELETE',
  });
}

/**
 * 重新处理仓库
 * @param id 仓库ID
 * @returns 处理结果
 */
export async function reprocessRepository(id: string): Promise<ApiResponse<boolean>> {
  return fetchApi<boolean>(`${API_URL}/api/Repository/Repository?id=${id}`, {
    method: 'POST',
  });
}

/**
 * 获取仓库文件目录结构
 * @param id 仓库ID
 * @returns 文件目录结构
 */
export async function getRepositoryFiles(id: string): Promise<ApiResponse<any>> {
  return fetchApi<any>(`${API_URL}/api/Repository/Files?id=${id}`);
}

/**
 * 获取仓库文件内容
 * @param id 仓库ID
 * @param path 文件路径
 * @returns 文件内容
 */
export async function getRepositoryFileContent(id: string, path: string): Promise<ApiResponse<string>> {
  return fetchApi<string>(`${API_URL}/api/Repository/FileContent?id=${id}&path=${encodeURIComponent(path)}`);
}

/**
 * 保存仓库文件内容
 * @param id 仓库ID
 * @param path 文件路径
 * @param content 文件内容
 * @returns 保存结果
 */
export async function saveRepositoryFileContent(
  id: string, 
  path: string, 
  content: string
): Promise<ApiResponse<boolean>> {
  return fetchApi<boolean>(`${API_URL}/api/Repository/FileContent?id=${id}&path=${encodeURIComponent(path)}`, {
    method: 'PUT',
    body: JSON.stringify({ content }),
  });
}

/**
 * 获取仓库详细信息（包括stars、头像等）
 * @param repoUrl 仓库URL
 * @returns 仓库扩展信息
 */
export interface RepoExtendedInfo {
  success: boolean;
  stars: number;
  forks: number;
  avatarUrl: string;
  ownerUrl: string;
  repoUrl: string;
  language?: string;
  license?: string;
  description?: string;
  error?: string;
}

/**
 * 根据仓库URL获取仓库的详细信息（如星数、头像等）
 * @param repoUrl 仓库URL
 * @returns 仓库扩展信息
 */
export async function getRepositoryExtendedInfo(repoUrl: string): Promise<RepoExtendedInfo> {
  try {
    // 解析仓库地址
    let owner = '';
    let repo = '';
    let platform = '';

    if (repoUrl.includes('github.com')) {
      platform = 'github';
      const parts = repoUrl.replace('https://github.com/', '').split('/');
      owner = parts[0];
      repo = parts[1]?.split('/')[0].replace('.git', '');
    } else if (repoUrl.includes('gitee.com')) {
      platform = 'gitee';
      const parts = repoUrl.replace('https://gitee.com/', '').split('/');
      owner = parts[0];
      repo = parts[1]?.split('/')[0].replace('.git', '');
    } else {
      try {
        const url = new URL(repoUrl);
        owner = url.pathname.split('/')[1];
        repo = url.pathname.split('/')[2]?.replace('.git', '');
        
        if (url.hostname.includes('github')) {
          platform = 'github';
        } else if (url.hostname.includes('gitee')) {
          platform = 'gitee';
        } else {
          platform = 'unknown';
        }
      } catch (e) {
        return {
          success: false,
          stars: 0,
          forks: 0,
          avatarUrl: '',
          ownerUrl: '',
          repoUrl: repoUrl,
          error: '无效的仓库地址'
        };
      }
    }

    if (!owner || !repo) {
      return {
        success: false,
        stars: 0,
        forks: 0,
        avatarUrl: '',
        ownerUrl: '',
        repoUrl: repoUrl,
        error: '无法解析仓库所有者或名称'
      };
    }

    // 根据平台获取信息
    if (platform === 'github') {
      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          stars: data.stargazers_count || 0,
          forks: data.forks_count || 0,
          avatarUrl: data.owner.avatar_url || `https://github.com/${owner}.png`,
          ownerUrl: data.owner.html_url || `https://github.com/${owner}`,
          repoUrl: data.html_url || repoUrl,
          language: data.language || undefined,
          license: data.license?.name || undefined,
          description: data.description || undefined
        };
      } else {
        // GitHub API 请求失败，返回基本信息
        return {
          success: false,
          stars: 0,
          forks: 0,
          avatarUrl: `https://github.com/${owner}.png`,
          ownerUrl: `https://github.com/${owner}`,
          repoUrl: repoUrl,
          error: `GitHub API 请求失败: ${response.status}`
        };
      }
    } else if (platform === 'gitee') {
      const response = await fetch(`https://gitee.com/api/v5/repos/${owner}/${repo}`);
      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          stars: data.stargazers_count || 0,
          forks: data.forks_count || 0,
          avatarUrl: data.owner.avatar_url || `https://gitee.com/${owner}.png`,
          ownerUrl: data.owner.html_url || `https://gitee.com/${owner}`,
          repoUrl: data.html_url || repoUrl,
          language: data.language || undefined,
          license: data.license?.name || undefined,
          description: data.description || undefined
        };
      } else {
        // Gitee API 请求失败，返回基本信息
        return {
          success: false,
          stars: 0,
          forks: 0,
          avatarUrl: `https://gitee.com/${owner}.png`,
          ownerUrl: `https://gitee.com/${owner}`,
          repoUrl: repoUrl,
          error: `Gitee API 请求失败: ${response.status}`
        };
      }
    } else {
      // 未知平台，返回基础信息
      return {
        success: false,
        stars: 0,
        forks: 0,
        avatarUrl: '',
        ownerUrl: '',
        repoUrl: repoUrl,
        error: '不支持的代码托管平台'
      };
    }
  } catch (error) {
    return {
      success: false,
      stars: 0,
      forks: 0,
      avatarUrl: '',
      ownerUrl: '',
      repoUrl: repoUrl,
      error: `获取仓库信息失败: ${error instanceof Error ? error.message : String(error)}`
    };
  }
} 