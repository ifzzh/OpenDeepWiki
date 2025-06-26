import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const title = searchParams.get('title') || '文档';
    const owner = searchParams.get('owner') || '';
    const name = searchParams.get('name') || '';

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#1a1a1a',
            backgroundImage: 'linear-gradient(45deg, #1a1a1a 0%, #2d2d2d 100%)',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          {/* 顶部装饰条 */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '8px',
              background: 'linear-gradient(90deg, #3b82f6, #8b5cf6, #06b6d4)',
            }}
          />
          
          {/* 主要内容区域 */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '80px 60px',
              textAlign: 'center',
              maxWidth: '1000px',
            }}
          >
            {/* KoalaWiki Logo/Brand */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '40px',
              }}
            >
              <div
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: '20px',
                }}
              >
                <span style={{ fontSize: '32px', color: 'white' }}>🐨</span>
              </div>
              <span
                style={{
                  fontSize: '36px',
                  fontWeight: 'bold',
                  color: '#ffffff',
                  letterSpacing: '-0.02em',
                }}
              >
                KoalaWiki
              </span>
            </div>

            {/* 项目信息 */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '30px',
                padding: '12px 24px',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderRadius: '24px',
                border: '1px solid rgba(59, 130, 246, 0.2)',
              }}
            >
              <span
                style={{
                  fontSize: '24px',
                  color: '#3b82f6',
                  fontWeight: '600',
                }}
              >
                {owner}/{name}
              </span>
            </div>

            {/* 文档标题 */}
            <h1
              style={{
                fontSize: title.length > 50 ? '48px' : '56px',
                fontWeight: 'bold',
                color: '#ffffff',
                lineHeight: '1.2',
                margin: '0 0 30px 0',
                textAlign: 'center',
                maxWidth: '900px',
                wordWrap: 'break-word',
              }}
            >
              {title}
            </h1>

            {/* 描述文字 */}
            <p
              style={{
                fontSize: '24px',
                color: '#a1a1aa',
                margin: '0',
                lineHeight: '1.4',
              }}
            >
              技术文档 · 开发指南 · API参考
            </p>
          </div>

          {/* 底部装饰 */}
          <div
            style={{
              position: 'absolute',
              bottom: '40px',
              right: '60px',
              display: 'flex',
              alignItems: 'center',
              color: '#71717a',
              fontSize: '18px',
            }}
          >
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#22c55e',
                marginRight: '12px',
              }}
            />
            在线文档平台
          </div>

          {/* 背景装饰元素 */}
          <div
            style={{
              position: 'absolute',
              top: '20%',
              left: '10%',
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              background: 'rgba(59, 130, 246, 0.1)',
              filter: 'blur(40px)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: '20%',
              right: '15%',
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              background: 'rgba(139, 92, 246, 0.1)',
              filter: 'blur(50px)',
            }}
          />
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (error) {
    console.error('生成OG图片时出错:', error);
    
    // 返回一个简单的错误图片
    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#1a1a1a',
            color: '#ffffff',
            fontSize: '32px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          KoalaWiki - 文档平台
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  }
} 