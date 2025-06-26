'use client'

import { Suspense } from 'react';
import { RepositoryView } from './RepositoryView';

interface ClientRepositoryPageProps {
  owner: string;
  name: string;
  document: any;
  branch?: string;
}

export default function ClientRepositoryPage({ owner, name, document }: ClientRepositoryPageProps) {    
  return (
    <RepositoryView
        owner={owner}
        name={name}
        document={document}
      />
  );
} 