import { fetchApi, ApiResponse, API_URL } from './api';
import { Repository, RepositoryFormValues } from '../types';

/**
 * Repository submission interface
 */
export interface WarehouseSubmitRequest {
  address: string;
  type: string;
  branch: string;
  prompt: string;
  model: string;
  openAIKey: string;
  openAIEndpoint: string;
}

/**
 * Response structure for warehouse list
 */
export interface WarehouseListResponse {
  total: number;
  items: Repository[];
}

/**
 * 获取仓库分支列表的返回结构
 */
export interface BranchListResponse {
  success: boolean;
  data: string[];
  error?: string;
}

/**
 * Submit a new repository to the warehouse
 * 这个函数仍然需要在客户端使用
 */
export async function submitWarehouse(
  data: RepositoryFormValues
): Promise<ApiResponse<Repository>> {
  // @ts-ignore
  return fetchApi<Repository>(API_URL + '/api/Warehouse/SubmitWarehouse', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * 获取仓库的分支列表
 * @param repoUrl 仓库地址
 * @param username 可选的用户名（私有仓库需要）
 * @param password 可选的密码或访问令牌（私有仓库需要）
 * @returns 分支列表
 */
export async function getBranchList(
  repoUrl: string,
  username?: string,
  password?: string
): Promise<BranchListResponse> {
  try {
    // 解析仓库地址来确定是GitHub还是Gitee
    const url = new URL(repoUrl);
    const pathSegments = url.pathname.split('/').filter(segment => segment);
    
    if (pathSegments.length < 2) {
      return {
        success: false,
        data: [],
        error: '无效的仓库地址格式'
      };
    }
    
    const owner = pathSegments[0];
    // 移除.git后缀
    const repo = pathSegments[1].replace('.git', '');
    
    // 根据URL确定平台
    let branchesData: string[] = [];
    
    // GitHub仓库
    if (url.hostname === 'github.com' || url.hostname === 'www.github.com') {
      // 构建GitHub API URL
      let apiUrl = `https://api.github.com/repos/${owner}/${repo}/branches`;
      
      const headers: HeadersInit = {
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      };
      
      // 如果提供了凭据，添加授权头
      if (username && password) {
        const credentials = btoa(`${username}:${password}`);
        headers['Authorization'] = `Basic ${credentials}`;
      }
      
      const response = await fetch(apiUrl, { headers });
      
      if (!response.ok) {
        throw new Error(`GitHub API请求失败: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (Array.isArray(data)) {
        branchesData = data.map(branch => branch.name);
      }
    }
    // Gitee仓库
    else if (url.hostname === 'gitee.com' || url.hostname === 'www.gitee.com') {
      // 构建Gitee API URL
      let apiUrl = `https://gitee.com/api/v5/repos/${owner}/${repo}/branches`;
      
      // 如果提供了访问令牌
      if (password) {
        apiUrl += `?access_token=${password}`;
      }
      
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`Gitee API请求失败: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (Array.isArray(data)) {
        branchesData = data.map(branch => branch.name);
      }
    }
    // 其他Git提供商，尝试使用通用办法处理
    else {
      return {
        success: false,
        data: ['main', 'master'], // 提供默认分支作为备选
        error: '不支持的Git提供商，请手动输入分支名'
      };
    }
    
    return {
      success: true,
      data: branchesData
    };
  } catch (error) {
    console.error('获取分支列表失败:', error);
    return {
      success: false,
      data: ['main', 'master'], // 提供默认分支作为备选
      error: error instanceof Error ? error.message : '获取分支列表时发生未知错误'
    };
  }
}

/**
 * Get warehouse list
 * 此函数可在服务器组件中使用
 */
export async function getWarehouse(page: number, pageSize: number, keyword?: string): Promise<ApiResponse<WarehouseListResponse>> {
  // @ts-ignore
  return fetchApi<WarehouseListResponse>(API_URL + '/api/Warehouse/WarehouseList?page=' + page + '&pageSize=' + pageSize + '&keyword=' + keyword, {
    method: 'GET',
    // 添加缓存控制使其适用于服务器组件
    cache: 'no-store'
  });
}

/**
 * 获取文档目录
 * 此函数可在服务器组件中使用
 */
export async function documentCatalog(organizationName: string, name: string): Promise<any> {
  // @ts-ignore
  return fetchApi<any>(API_URL + '/api/DocumentCatalog/DocumentCatalogs?organizationName=' + organizationName + '&name=' + name, {
    method: 'GET',
    // 添加缓存控制使其适用于服务器组件
    cache: 'no-store'
  });
}

/**
 * 根据ID获取文档
 * 此函数可在服务器组件中使用
 */
export async function documentById(owner: string, name: string, path: string): Promise<any> {
  console.log(owner, name, path);
  // @ts-ignore
  return fetchApi<any>(API_URL + '/api/DocumentCatalog/DocumentById?owner=' + owner + '&name=' + name + '&path=' + path, {
    method: 'GET',
    // 添加缓存控制使其适用于服务器组件
    cache: 'no-store'
  });
}

/**
 * 获取仓库概览信息
 * 此函数可在服务器组件中使用
 */
export async function getWarehouseOverview(owner: string, name: string) {
  // @ts-ignore
  return fetchApi<any>(API_URL + '/api/Warehouse/WarehouseOverview?owner=' + owner + '&name=' + name, {
    method: 'GET',
    // 添加缓存控制使其适用于服务器组件
    cache: 'no-store'
  });
}

/**
 * 获取最近的仓库信息
 * 此函数可在服务器组件中使用
 */
export async function getLastWarehouse(address: string) {
  // @ts-ignore
  return fetchApi<any>(API_URL + '/api/Warehouse/LastWarehouse?address=' + address, {
    method: 'GET',
    // 添加缓存控制使其适用于服务器组件
    cache: 'no-store'
  });
}

/**
 * 获取更新日志
 * 此函数可在服务器组件中使用
 */
export async function getChangeLog(owner: string, name: string) {
  // @ts-ignore
  return fetchApi<any>(API_URL + '/api/Warehouse/ChangeLog?owner=' + owner + '&name=' + name, {
    method: 'GET',
    // 添加缓存控制使其适用于服务器组件
    cache: 'no-store'
  });
}


/**
 * 
 * @param warehouseId 
 * @param path 
 * @returns 
 */
export async function getFileContent(warehouseId: string, path: string) {
  return fetchApi<any>(API_URL + `/api/Warehouse/FileContent?warehouseId=${warehouseId}&path=${path}`, {
    method: 'GET',
    cache: 'no-cache'
  })
}


/**
 * 获取仓库的文件列表
 * 此函数可在服务器组件中使用
 * organization
 * repositoryName
 * file
 */
export async function UploadAndSubmitWarehouse(formData: FormData) {
  // 不要手动设置 Content-Type，让浏览器自动设置正确的 boundary
  return fetchApi<any>(API_URL + '/api/Warehouse/UploadAndSubmitWarehouse', {
    method: 'POST',
    body: formData,
  })
}

/**
 * 导出仓库的Markdown文件为ZIP
 * 此函数可在服务器组件中使用
 * @param warehouseId 仓库ID
 */
export async function ExportMarkdownZip(warehouseId: string) {
  return fetchApi<any>(API_URL + `/api/Warehouse/ExportMarkdownZip?warehouseId=${warehouseId}`, {
    method: 'POST'
  })
}
