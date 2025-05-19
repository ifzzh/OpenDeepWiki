'use client'

import { Suspense } from 'react';
import { RepositoryView } from './RepositoryView';
import { ServerLoadingErrorState } from '../../components/document/ServerComponents';

interface ClientRepositoryPageProps {
  owner: string;
  name: string;
  document: any;
  branch?: string;
}

export default function ClientRepositoryPage({ owner, name, document }: ClientRepositoryPageProps) {    
  return (
    <Suspense fallback={<ServerLoadingErrorState loading={true} owner={owner} name={name} />}>
      <RepositoryView
        owner={owner}
        name={name}
        document={document}
      />
    </Suspense>
  );
} 