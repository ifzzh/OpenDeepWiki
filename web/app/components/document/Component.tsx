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
    transition: all ${token.motionDurationMid} ${token.motionEaseInOut};
    
    &:active {
      transform: translateY(0) scale(0.99);
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
  icon: css`
    transition: transform ${token.motionDurationMid} ${token.motionEaseInOut};
  `,
  iconRotated: css`
    transform: rotate(90deg);
  `,
  content: css`
    width: fit-content;
    overflow: hidden;
    max-height: 0;
    opacity: 0;
    transition: all ${token.motionDurationMid} ${token.motionEaseInOut};
  `,
  contentVisible: css`
    max-height: 1000px;
    opacity: 1;
    margin-top: ${token.marginXS}px;
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
        <span className={`${styles.icon} ${showDetail ? styles.iconRotated : ''}`}>
          <Icon icon={ChevronRight} />
        </span>
      </Flexbox>
      <div className={`${styles.content} ${showDetail ? styles.contentVisible : ''}`}>
        {children}
      </div>
    </Flexbox>
  );
});

export default RenderThinking;