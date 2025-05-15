import { Icon } from '@lobehub/ui';
import { createStyles } from 'antd-style';
import { ChevronRight, SparkleIcon } from 'lucide-react';
import { PropsWithChildren, memo, useState } from 'react';
import { Flexbox } from 'react-layout-kit';


const useStyles = createStyles(({ css, token, isDarkMode }) => ({
  container: css`
    cursor: pointer;
    position: relative;
    overflow: hidden;
    padding: ${token.paddingMD}px;
    color: ${token.colorText};
    background: ${isDarkMode 
      ? `linear-gradient(145deg, ${token.colorBgElevated}, ${token.colorFillTertiary})`
      : `linear-gradient(145deg, ${token.colorBgContainer}, ${token.colorFillTertiary})`};
    border-radius: ${token.borderRadiusLG}px;
    transition: all ${token.motionDurationMid} ${token.motionEaseInOut};
    box-shadow: ${token.boxShadowTertiary};
    border: 1px solid ${token.colorBorderSecondary};
    backdrop-filter: blur(8px);
    max-width: 800px;
    width: 100%;
        
    &:active {
      transform: translateY(0) scale(0.99);
    }
    
    &::after {
      content: '';
      position: absolute;
      top: -50%;
      left: -50%;
      width: 200%;
      height: 200%;
      background: linear-gradient(
        to bottom right,
        ${token.colorPrimary}10,
        transparent,
        ${token.colorPrimary}10
      );
      opacity: 0.2;
      transform: rotate(30deg);
      pointer-events: none;
      transition: opacity ${token.motionDurationMid} ${token.motionEaseInOut};
      z-index: 0;
    }
  `,
  title: css`
    overflow: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 1;
    font-size: ${token.fontSizeSM}px;
    font-weight: ${token.fontWeightStrong};
    text-overflow: ellipsis;
    letter-spacing: 0.2px;
    color: ${token.colorTextHeading};
  `,
  iconWrapper: css`
    display: flex;
    justify-content: center;
    align-items: center;
    border-radius: 50%;
    width: 20px;
    height: 20px;
    background: ${token.colorFillQuaternary};
    margin-left: ${token.marginSM}px;
    transition: all ${token.motionDurationMid} ${token.motionEaseInOut};
  `,
  iconRotated: css`
    background: ${token.colorPrimaryBg};
    color: ${token.colorPrimary};
    transform: rotate(90deg);
  `,
  content: css`
    overflow: hidden;
    max-height: 0;
    opacity: 0;
    transition: all ${token.motionDurationMid} ${token.motionEaseInOut};
    position: relative;
    z-index: 1;
    width: 100%;
    padding-left: 30px; /* 图标宽度 + 左边距 */
  `,
  contentVisible: css`
    max-height: 1000px;
    opacity: 1;
    margin-top: ${token.marginMD}px;
    border-left: 1px dashed ${token.colorBorder};
    padding-left: calc(30px + ${token.paddingSM}px);
  `,
  titleContainer: css`
    position: relative;
    z-index: 1;
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
  `,
  sparkleIconWrapper: css`
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    width: 24px;
    height: 24px;
    margin-right: ${token.marginXS}px;
    
    &::after {
      content: '';
      position: absolute;
      top: -2px;
      left: -2px;
      right: -2px;
      bottom: -2px;
      background: ${token.colorPrimaryBg};
      border-radius: 50%;
      z-index: -1;
      opacity: 0.7;
    }
  `,
  headerGroup: css`
    display: flex;
    align-items: center;
  `
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
    >
      <div className={styles.titleContainer}>
        <div className={styles.headerGroup}>
          <div className={styles.sparkleIconWrapper}>
            <Icon color={theme.colorPrimary} icon={SparkleIcon} size="small" />
          </div>
          <span className={styles.title}>深入推理</span>
        </div>
        <div className={`${styles.iconWrapper} ${showDetail ? styles.iconRotated : ''}`}>
          <Icon icon={ChevronRight} size="small" />
        </div>
      </div>
      <div className={`${styles.content} ${showDetail ? styles.contentVisible : ''}`}>
        {children}
      </div>
    </Flexbox>
  );
});

export default RenderThinking;