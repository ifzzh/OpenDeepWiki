import RepositoryLayoutServer from './layout.server';

export default function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { owner: string; name: string };
}) {
  return (
    <RepositoryLayoutServer
      owner={params?.owner}
      name={params?.name}
    >
      {children}
    </RepositoryLayoutServer>
  );
} 