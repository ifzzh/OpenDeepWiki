import { Col, Empty, Row } from 'antd';
import { Repository } from '../types';
import RepositoryCard from './RepositoryCard';
import { useTranslation } from '../i18n/client';

interface RepositoryListProps {
  repositories: Repository[];
}

const RepositoryList: React.FC<RepositoryListProps> = ({ repositories }) => {
  const { t } = useTranslation();
  
  if (!repositories.length) {
    return <Empty description={t('home.repo_list.empty')} />;
  }

  return (
    <div className="repository-grid">
      <Row gutter={[16, 16]}>
        {repositories.map((repository) => (
          <Col xs={24} sm={12} md={8} lg={6} key={repository.id}>
            <RepositoryCard repository={repository} />
          </Col>
        ))}
      </Row>
    </div>
  );
};

export default RepositoryList; 