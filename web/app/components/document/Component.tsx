import { Icon } from '@lobehub/ui';
import { createStyles } from 'antd-style';
import { ChevronDown, ChevronRight, SparkleIcon } from 'lucide-react';
import { PropsWithChildren, memo, useState } from 'react';
import { Flexbox } from 'react-layout-kit';


const useStyles = createStyles(({ css, token, isDarkMode }) => ({
  container: css`
    cursor: pointer;

    padding-block: 8px;
    padding-inline: 12px;
    padding-inline-end: 12px;

    color: ${token.colorText};

    background: ${token.colorFillTertiary};
    border-radius: 8px;

    &:hover {
      background: ${isDarkMode ? '' : token.colorFillSecondary};
    }
  `,
  title: css`
    overflow: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 1;

    font-size: 12px;
    text-overflow: ellipsis;
  `,
}));

const RenderThinking = memo<PropsWithChildren>(({ children }) => {
  const { styles, theme } = useStyles();

  const [showDetail, setShowDetail] = useState(false);

  return (
    <Flexbox
      className={styles.container}
      gap={16}
      onClick={() => {
        setShowDetail(!showDetail);
      }}
      style={{
        width: 'fit-content',
      }}
    >
      <Flexbox distribution={'space-between'} flex={1} horizontal>
        <Flexbox gap={8} horizontal>
          <Icon color={theme.purple} icon={SparkleIcon} /> 深入推理
        </Flexbox>
        <Icon icon={showDetail ? ChevronDown : ChevronRight} />
      </Flexbox>
      <div style={{
        width: 'fit-content',
      }}>
        {showDetail ? children : ''}
      </div>
    </Flexbox>
  );
});

export default RenderThinking;