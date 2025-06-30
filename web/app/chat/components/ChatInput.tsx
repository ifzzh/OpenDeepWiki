'use client';

import React, { useState, useRef } from 'react';
import { Button, Upload, message, Tooltip } from 'antd';
import { LoadingOutlined, CloseCircleFilled } from '@ant-design/icons';
import { createStyles } from 'antd-style';
import type { UploadProps } from 'antd';
import type { Base64Content } from '../services/chatService';
import { ActionIcon } from '@lobehub/ui';
import { ChatInputActionBar, TokenTag } from '@lobehub/ui/chat';
import { ChatInputArea } from '@lobehub/ui/mobile';
import { Eraser, ImagePlus, Trash2 } from 'lucide-react';
import { Flexbox } from 'react-layout-kit';

const useStyles = createStyles(({ css, token }) => ({
    container: css`
    z-index: 10;
  `,
    imagePreviewContainer: css`
    display: flex;
    flex-wrap: wrap;
    gap: ${token.marginSM}px;
    margin-bottom: ${token.marginSM}px;
    padding: ${token.paddingSM}px;
    background: ${token.colorBgElevated};
    border-radius: ${token.borderRadiusLG}px;
    border: 1px dashed ${token.colorBorder};
  `,
    imagePreviewItem: css`
    position: relative;
    width: 80px;
    height: 80px;
    border-radius: ${token.borderRadiusLG}px;
    overflow: hidden;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
    border: 1px solid ${token.colorBorderSecondary};
    transition: transform 0.2s ease;
    
    &:hover {
      transform: scale(1.02);
      
      .remove-button {
        opacity: 1;
      }
    }
    
    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    
    .remove-button {
      position: absolute;
      top: 4px;
      right: 4px;
      background: rgba(0, 0, 0, 0.6);
      color: white;
      border-radius: 50%;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      opacity: 0.7;
      transition: all 0.2s ease;
      
      &:hover {
        background: rgba(0, 0, 0, 0.8);
        opacity: 1;
      }
    }
  `,
    uploadButton: css`
    display: none;
  `,
    inputWrapper: css`
    .ant-input {
      border-radius: ${token.borderRadiusLG}px;
      padding: ${token.paddingSM}px ${token.paddingMD}px;
      border-color: ${token.colorBorderSecondary};
      transition: all 0.3s;
      
      &:hover, &:focus {
        border-color: ${token.colorPrimary};
        box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.1);
      }
    }
    
    .ant-btn {
      border-radius: ${token.borderRadiusLG}px;
    }
  `,
    actionButton: css`
    &:hover {
      color: ${token.colorPrimary};
      background-color: ${token.colorBgTextHover};
    }
  `
}));

interface ChatInputProps {
    value?: string;
    placeholder?: string;
    loading?: boolean;
    disabled?: boolean;
    onSend?: (message: string, imageContents?: Base64Content[]) => void;
    onStop?: () => void;
    onChange?: (value: string) => void;
    onClear?: () => void;
}

const ChatInput: React.FC<ChatInputProps> = ({
    value,
    placeholder = '输入消息...',
    loading = false,
    disabled = false,
    onSend,
    onStop,
    onChange,
    onClear,
}) => {
    const { styles } = useStyles();
    const [inputValue, setInputValue] = useState(value || '');
    const [imageUploading, setImageUploading] = useState(false);
    const [imageList, setImageList] = useState<Base64Content[]>([]);
    const [expand, setExpand] = useState(false);
    const uploadRef = useRef<any>(null);

    const handleInputChange = (value: string) => {
        setInputValue(value);
        onChange?.(value);
    };

    const handleSend = () => {
        if ((inputValue.trim() || imageList.length > 0) && !loading && !disabled) {
            onSend?.(inputValue.trim(), imageList.length > 0 ? imageList : undefined);
            setInputValue('');
            setImageList([]);
            setExpand(false);
        }
    };

    const handleStop = () => {
        onStop?.();
    };

    const handleClear = () => {
        setInputValue('');
        setImageList([]);
        message.success('已清空输入内容');
    };

    const handleUploadClick = () => {
        if (uploadRef.current) {
            uploadRef.current.upload.uploader.onClick();
        }
    };

    const handleImageUpload: UploadProps['beforeUpload'] = async (file) => {
        const isImage = file.type.startsWith('image/');
        if (!isImage) {
            message.error('只能上传图片文件!');
            return Upload.LIST_IGNORE;
        }

        const isLt5M = file.size / 1024 / 1024 < 5;
        if (!isLt5M) {
            message.error('图片大小不能超过5MB!');
            return Upload.LIST_IGNORE;
        }

        try {
            setImageUploading(true);
            const base64Content = await convertFileToBase64(file);
            setImageList([...imageList, {
                data: base64Content,
                mimeType: file.type
            }]);
            setImageUploading(false);
            return false; // 阻止默认上传行为
        } catch (error) {
            console.error('图片转换失败:', error);
            message.error('图片处理失败，请重试');
            setImageUploading(false);
            return Upload.LIST_IGNORE;
        }
    };

    const convertFileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                const result = reader.result as string;
                // 移除 data:image/jpeg;base64, 前缀
                const base64 = result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = (error) => reject(error);
        });
    };

    const removeImage = (index: number) => {
        const newImageList = [...imageList];
        newImageList.splice(index, 1);
        setImageList(newImageList);
    };

    return (
        <div className={styles.container}>
            {imageList.length > 0 && (
                <div className={styles.imagePreviewContainer}>
                    {imageList.map((image, index) => (
                        <div key={index} className={styles.imagePreviewItem}>
                            <img src={`data:${image.mimeType};base64,${image.data}`} alt="上传图片" />
                            <div className="remove-button" onClick={() => removeImage(index)}>
                                <CloseCircleFilled />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Flexbox className={styles.inputWrapper}>
                <Upload
                    ref={uploadRef}
                    className={styles.uploadButton}
                    accept="image/*"
                    showUploadList={false}
                    beforeUpload={handleImageUpload}
                    maxCount={5}
                >
                    <Button>上传</Button>
                </Upload>

                <ChatInputArea
                    expand={expand}
                    setExpand={setExpand}
                    placeholder={placeholder}
                    value={inputValue}
                    onChange={(e) => {
                        handleInputChange(e.target.value)
                    }}
                    onInput={(e) => handleInputChange(e)}
                    onSend={handleSend}
                    disabled={disabled}
                    textAreaRightAddons={<ChatInputArea.SendButton
                        onSend={handleSend}
                        onStop={handleStop}
                    />}
                    topAddons={
                        <ChatInputActionBar
                            leftAddons={
                                <>
                                    <Tooltip title="上传图片">
                                        <ActionIcon
                                            className={styles.actionButton}
                                            icon={imageUploading ? <LoadingOutlined /> : <ImagePlus />}
                                            onClick={handleUploadClick}
                                            disabled={disabled || loading}
                                        />
                                    </Tooltip>
                                    <Tooltip title="清空输入">
                                        <ActionIcon
                                            className={styles.actionButton}
                                            icon={<Eraser />}
                                            onClick={handleClear}
                                            disabled={!inputValue && imageList.length === 0}
                                        />
                                    </Tooltip>
                                    {/* // 靠右侧显示垃圾桶 */}
                                    <Tooltip title="清空消息">
                                        <ActionIcon
                                            className={styles.actionButton}
                                            style={{ 
                                                marginLeft: 'auto',
                                                marginRight: '20px',
                                                color: 'red',
                                             }}
                                            icon={<Trash2 />}
                                            onClick={onClear}
                                        />
                                    </Tooltip>
                                </>
                            }
                        />
                    }
                />
            </Flexbox>
        </div>
    );
};

export default ChatInput;