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