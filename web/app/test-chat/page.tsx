'use client';

import React from 'react';
import FloatingChat from '../chat';

export default function TestChatPage() {
  return (
    <div style={{ padding: '24px' }}>
      <h1>测试 ChatList 组件</h1>
      <div style={{ height: '600px', width: '100%', border: '1px solid #ccc' }}>
        <FloatingChat
          organizationName="test"
          repositoryName="test"
          title="测试聊天"
          embedded={true}
        />
      </div>
    </div>
  );
} 