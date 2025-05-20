import { API_URL } from './api';
import { fetchApi, ApiResponse } from './fetchApi';

// 用户信息接口
export interface UserInfo {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  createdAt: string;
  updatedAt?: string;
  lastLoginAt?: string;
  lastLoginIp?: string;
}

// 创建用户接口
export interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
  role?: string;
  avatar?: string;
}

// 更新用户接口
export interface UpdateUserRequest {
  name: string;
  email: string;
  password?: string;
  role?: string;
  avatar?: string;
}

// 分页响应接口
export interface PageResponse<T> {
  total: number;
  items: T[];
}

/**
 * 获取用户列表
 * @param page 页码
 * @param pageSize 每页数量
 * @param keyword 搜索关键词
 * @returns 用户列表
 */
export async function getUserList(
  page: number = 1,
  pageSize: number = 10,
  keyword?: string
): Promise<ApiResponse<PageResponse<UserInfo>>> {
  let url = `${API_URL}/api/User/UserList?page=${page}&pageSize=${pageSize}`;
  if (keyword) {
    url += `&keyword=${encodeURIComponent(keyword)}`;
  }

  return fetchApi<PageResponse<UserInfo>>(url);
}

/**
 * 获取用户详情
 * @param id 用户ID
 * @returns 用户详情
 */
export async function getUserById(id: string): Promise<ApiResponse<UserInfo>> {
  return fetchApi<UserInfo>(`${API_URL}/api/User/User?id=${id}`);
}

/**
 * 创建用户
 * @param user 用户信息
 * @returns 创建结果
 */
export async function createUser(user: CreateUserRequest): Promise<any> {
  return fetchApi<UserInfo>(`${API_URL}/api/User/User`, {
    method: 'POST',
    body: JSON.stringify(user),
  });
}

/**
 * 更新用户
 * @param id 用户ID
 * @param user 用户信息
 * @returns 更新结果
 */
export async function updateUser(id: string, user: UpdateUserRequest): Promise<ApiResponse<UserInfo>> {
  return fetchApi<UserInfo>(`${API_URL}/api/User/User?id=${id}`, {
    method: 'PUT',
    body: JSON.stringify(user),
  });
}

/**
 * 删除用户
 * @param id 用户ID
 * @returns 删除结果
 */
export async function deleteUser(id: string): Promise<ApiResponse<boolean>> {
  return fetchApi<boolean>(`${API_URL}/api/User/User?id=${id}`, {
    method: 'DELETE',
  });
} 