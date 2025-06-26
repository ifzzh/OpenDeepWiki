import { Collapse } from 'antd';
import { PropsWithChildren, memo } from 'react';

const RenderThinking = memo<PropsWithChildren<{
  think: string
}>>(
  ({
    think
  }) => {
    return (
      <Collapse
        style={{
          width: '100%',
        }}
        items={[
          {
            key: '1',
            label: '深入思考',
            children: <div style={{
              maxHeight: 280,
              overflowY: 'auto'
            }}>
              {think}
            </div>
          }
        ]}>
      </Collapse>
    );
  });

export default RenderThinking;