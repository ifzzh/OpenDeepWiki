// 认证服务
interface LoginResponse {
  item1: boolean;  // 是否成功
  item2: string;   // 消息
  item3: string;   // token
  item4: any;      // 用户信息
  item5: string;   // refreshToken
}

interface RegisterResponse {
  item1: boolean;  // 是否成功
  item2: string;   // 消息
}

interface RefreshTokenResponse {
  item1: boolean;  // 是否成功
  item2: string;   // 消息
  item3: string;   // 新token
  item4: string;   // 新refreshToken
}

// 登录
export const login = async (username: string, password: string): Promise<LoginResponse> => {
  try {
    const response = await fetch(`/api/Auth/Login?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error('登录请求失败');
    }
    
    return await response.json();
  } catch (error) {
    console.error('登录错误:', error);
    return {
      item1: false,
      item2: error instanceof Error ? error.message : '登录失败',
      item3: '',
      item4: null,
      item5: ''
    };
  }
};

// 注册
export const register = async (username: string, email: string, password: string): Promise<RegisterResponse> => {
  try {
    const response = await fetch(`/api/Auth/Register?username=${encodeURIComponent(username)}&email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error('注册请求失败');
    }
    
    return await response.json();
  } catch (error) {
    console.error('注册错误:', error);
    return {
      item1: false,
      item2: error instanceof Error ? error.message : '注册失败'
    };
  }
};

// GitHub登录
export const githubLogin = async (code: string): Promise<LoginResponse> => {
  try {
    const response = await fetch(`/api/Auth/GitHubLogin?code=${encodeURIComponent(code)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error('GitHub登录请求失败');
    }
    
    return await response.json();
  } catch (error) {
    console.error('GitHub登录错误:', error);
    return {
      item1: false,
      item2: error instanceof Error ? error.message : 'GitHub登录失败',
      item3: '',
      item4: null,
      item5: ''
    };
  }
};

// Google登录
export const googleLogin = async (idToken: string): Promise<LoginResponse> => {
  try {
    const response = await fetch(`/api/Auth/GoogleLogin?idToken=${encodeURIComponent(idToken)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error('Google登录请求失败');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Google登录错误:', error);
    return {
      item1: false,
      item2: error instanceof Error ? error.message : 'Google登录失败',
      item3: '',
      item4: null,
      item5: ''
    };
  }
};

// 刷新令牌
export const refreshToken = async (refreshToken: string): Promise<RefreshTokenResponse> => {
  try {
    const response = await fetch(`/api/Auth/RefreshToken?refreshToken=${encodeURIComponent(refreshToken)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error('刷新令牌请求失败');
    }
    
    return await response.json();
  } catch (error) {
    console.error('刷新令牌错误:', error);
    return {
      item1: false,
      item2: error instanceof Error ? error.message : '刷新令牌失败',
      item3: '',
      item4: ''
    };
  }
}; 