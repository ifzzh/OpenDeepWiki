import { Metadata, ResolvingMetadata } from 'next';
import { notFound } from 'next/navigation';
import { documentById } from '../../../services/warehouseService';

type Props = {
  params: { owner: string; name: string; path: string[] }
  children: React.ReactNode
}

// 获取文档内容以生成更精确的SEO元数据
async function getDocument(owner: string, name: string, path: string) {
  try {
    const response = await documentById(owner, name, path);
    if (response?.data) {
      return response.data;
    }
    return null;
  } catch (error) {
    console.error('获取文档内容失败:', error);
    return null;
  }
}

// 为页面生成动态元数据
export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { owner, name, path } = params;
  const pathString = Array.isArray(path) ? path.join('/') : path;
  
  // 尝试获取文档内容以提取更好的描述
  const document = await getDocument(owner, name, pathString);
  const title = document?.title || pathString;
  
  // 从文档内容中提取前200个字符作为描述
  let description = `${owner}/${name} 仓库中 ${pathString} 的文档内容`;
  if (document?.content) {
    // 移除Markdown标记以获取纯文本
    const plainText = document.content
      .replace(/#+\s/g, '')
      .replace(/\*\*/g, '')
      .replace(/\n/g, ' ')
      .trim();
    description = plainText.length > 200 
      ? `${plainText.substring(0, 197)}...` 
      : plainText;
  }

  return {
    title: `${title} - ${owner}/${name} | OpenDeekWiki`,
    description,
    keywords: [title, owner, name, '文档', '知识库', 'API', 'OpenDeekWiki'],
    openGraph: {
      title: `${title} - ${owner}/${name}`,
      description,
      url: `/${owner}/${name}/${pathString}`,
      siteName: 'OpenDeekWiki',
      locale: 'zh_CN',
      type: 'article',
    },
    twitter: {
      card: 'summary',
      title: `${title} - ${owner}/${name} | OpenDeekWiki`,
      description,
    },
    alternates: {
      canonical: `/${owner}/${name}/${pathString}`,
    }
  }
}

export default function DocumentLayout({
  children,
  params
}: Props) {
  return children;
} 