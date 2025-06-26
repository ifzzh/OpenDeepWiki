'use client';

import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Select, 
  Tree, 
  Button, 
  message, 
  Space, 
  Tag, 
  Checkbox, 
  Row, 
  Col,
  Divider,
  Spin
} from 'antd';
import { 
  DatabaseOutlined, 
  FolderOutlined, 
  SaveOutlined,
  ReloadOutlined 
} from '@ant-design/icons';
import type { DataNode } from 'antd/es/tree';
import { roleService, Role } from '../../../services/roleService';
import { 
  permissionService, 
  WarehousePermissionTree, 
  RolePermission, 
  WarehousePermission 
} from '../../../services/permissionService';

const { Option } = Select;

interface PermissionNode extends DataNode {
  key: string;
  title: React.ReactNode;
  children?: PermissionNode[];
  permission?: WarehousePermission;
  type: 'organization' | 'warehouse';
  isSelected: boolean;
}

interface NodePermissions {
  [nodeId: string]: {
    isReadOnly: boolean;
    isWrite: boolean;
    isDelete: boolean;
  };
}

const RolePermissionsPage: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [permissionTree, setPermissionTree] = useState<PermissionNode[]>([]);
  const [checkedKeys, setCheckedKeys] = useState<string[]>([]);
  const [nodePermissions, setNodePermissions] = useState<NodePermissions>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // 加载角色列表
  const loadRoles = async () => {
    try {
      const allRoles = await roleService.getAllRoles();
      setRoles(allRoles.items.filter((role: Role) => !role.isSystemRole)); // 过滤系统角色
    } catch (error) {
      message.error('加载角色列表失败');
      console.error('加载角色列表失败:', error);
    }
  };

  // 加载权限树
  const loadPermissionTree = async (roleId?: string) => {
    setLoading(true);
    try {
      const tree = await permissionService.getWarehousePermissionTree(roleId);
      const treeData = convertToTreeData(tree);
      setPermissionTree(treeData);
      
      // 设置已选中的节点
      const selected = tree.filter(node => isNodeSelected(node)).map(node => node.id);
      setCheckedKeys(selected);
      
      // 设置节点权限
      const permissions: NodePermissions = {};
      const buildNodePermissions = (nodes: WarehousePermissionTree[]) => {
        nodes.forEach(node => {
          if (node.type === 'warehouse' && node.permission) {
            permissions[node.id] = {
              isReadOnly: node.permission.isReadOnly,
              isWrite: node.permission.isWrite,
              isDelete: node.permission.isDelete,
            };
          } else if (node.type === 'warehouse') {
            permissions[node.id] = {
              isReadOnly: true,
              isWrite: false,
              isDelete: false,
            };
          }
          if (node.children) {
            buildNodePermissions(node.children);
          }
        });
      };
      buildNodePermissions(tree);
      setNodePermissions(permissions);
    } catch (error) {
      message.error('加载权限树失败');
      console.error('加载权限树失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 递归检查节点是否被选中
  const isNodeSelected = (node: WarehousePermissionTree): boolean => {
    if (node.isSelected) return true;
    return node.children.some(child => isNodeSelected(child));
  };

  // 转换权限树数据格式
  const convertToTreeData = (tree: WarehousePermissionTree[]): PermissionNode[] => {
    return tree.map(node => ({
      key: node.id,
      title: node.name, // 先设置简单的标题
      children: node.children ? convertToTreeData(node.children) : undefined,
      permission: node.permission,
      type: node.type,
      isSelected: node.isSelected,
    }));
  };

  // 处理权限变更
  const handlePermissionChange = (nodeId: string, permissionType: 'isReadOnly' | 'isWrite' | 'isDelete', checked: boolean) => {
    setNodePermissions(prev => ({
      ...prev,
      [nodeId]: {
        ...prev[nodeId],
        [permissionType]: checked,
      }
    }));
  };

  // 渲染树节点标题
  const renderTreeTitle = (nodeId: string, nodeName: string, nodeType: 'organization' | 'warehouse', isSelected: boolean, permission?: WarehousePermission) => {
    const icon = nodeType === 'organization' ? <FolderOutlined /> : <DatabaseOutlined />;
    const currentPermissions = nodePermissions[nodeId] || {
      isReadOnly: permission?.isReadOnly || true,
      isWrite: permission?.isWrite || false,
      isDelete: permission?.isDelete || false,
    };
    
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
        <Space>
          {icon}
          <span>{nodeName}</span>
          {isSelected && <Tag color="green">已授权</Tag>}
        </Space>
        {nodeType === 'warehouse' && checkedKeys.includes(nodeId) && (
          <Space size="small" onClick={(e) => e.stopPropagation()}>
            <Checkbox
              checked={currentPermissions.isReadOnly}
              onChange={(e) => handlePermissionChange(nodeId, 'isReadOnly', e.target.checked)}
            >
              <Tag color="blue">读</Tag>
            </Checkbox>
            <Checkbox
              checked={currentPermissions.isWrite}
              onChange={(e) => handlePermissionChange(nodeId, 'isWrite', e.target.checked)}
            >
              <Tag color="orange">写</Tag>
            </Checkbox>
            <Checkbox
              checked={currentPermissions.isDelete}
              onChange={(e) => handlePermissionChange(nodeId, 'isDelete', e.target.checked)}
            >
              <Tag color="red">删</Tag>
            </Checkbox>
          </Space>
        )}
        {nodeType === 'warehouse' && !checkedKeys.includes(nodeId) && permission && (
          <Space size="small">
            {permission.isReadOnly && <Tag color="blue">读</Tag>}
            {permission.isWrite && <Tag color="orange">写</Tag>}
            {permission.isDelete && <Tag color="red">删</Tag>}
          </Space>
        )}
      </div>
    );
  };

  // 获取渲染用的树数据
  const getTreeDataForRender = (): PermissionNode[] => {
    const updateTreeData = (nodes: PermissionNode[]): PermissionNode[] => {
      return nodes.map(node => ({
        ...node,
        title: renderTreeTitle(node.key, node.title as string, node.type, node.isSelected, node.permission),
        children: node.children ? updateTreeData(node.children) : undefined,
      }));
    };
    
    return updateTreeData(permissionTree);
  };

  // 处理角色选择变化
  const handleRoleChange = (roleId: string) => {
    setSelectedRoleId(roleId);
    loadPermissionTree(roleId);
  };

  // 处理树节点选择
  const handleCheck = (checkedKeysValue: any) => {
    setCheckedKeys(checkedKeysValue);
    
    // 为新选中的仓库节点设置默认权限
    const newCheckedKeys = Array.isArray(checkedKeysValue) ? checkedKeysValue : checkedKeysValue.checked;
    const addedKeys = newCheckedKeys.filter((key: string) => !checkedKeys.includes(key));
    
    if (addedKeys.length > 0) {
      const newPermissions = { ...nodePermissions };
      addedKeys.forEach((key: string) => {
        const node = findNodeByKey(permissionTree, key);
        if (node && node.type === 'warehouse' && !newPermissions[key]) {
          newPermissions[key] = {
            isReadOnly: true,
            isWrite: false,
            isDelete: false,
          };
        }
      });
      setNodePermissions(newPermissions);
    }
  };

  // 查找节点
  const findNodeByKey = (nodes: PermissionNode[], key: string): PermissionNode | null => {
    for (const node of nodes) {
      if (node.key === key) {
        return node;
      }
      if (node.children) {
        const found = findNodeByKey(node.children, key);
        if (found) return found;
      }
    }
    return null;
  };

  // 保存权限配置
  const handleSave = async () => {
    if (!selectedRoleId) {
      message.warning('请先选择角色');
      return;
    }

    setSaving(true);
    try {
      // 获取选中的仓库权限
      const warehousePermissions: WarehousePermission[] = [];
      
      const getWarehousePermissions = (nodes: PermissionNode[], selectedKeys: string[]) => {
        nodes.forEach(node => {
          if (node.type === 'warehouse' && selectedKeys.includes(node.key)) {
            const permissions = nodePermissions[node.key] || {
              isReadOnly: true,
              isWrite: false,
              isDelete: false,
            };
            
            warehousePermissions.push({
              warehouseId: node.key,
              isReadOnly: permissions.isReadOnly,
              isWrite: permissions.isWrite,
              isDelete: permissions.isDelete,
            });
          }
          if (node.children) {
            getWarehousePermissions(node.children, selectedKeys);
          }
        });
      };

      getWarehousePermissions(permissionTree, checkedKeys);

      const rolePermission: RolePermission = {
        roleId: selectedRoleId,
        warehousePermissions,
      };

      await permissionService.setRolePermissions(rolePermission);
      message.success('保存权限配置成功');
      
      // 重新加载权限树以显示最新状态
      loadPermissionTree(selectedRoleId);
    } catch (error) {
      message.error('保存权限配置失败');
      console.error('保存权限配置失败:', error);
    } finally {
      setSaving(false);
    }
  };

  // 刷新权限树
  const handleRefresh = () => {
    if (selectedRoleId) {
      loadPermissionTree(selectedRoleId);
    } else {
      loadPermissionTree();
    }
  };

  useEffect(() => {
    loadRoles();
    loadPermissionTree();
  }, []);

  return (
    <div style={{ padding: '24px' }}>
      <Row gutter={[16, 16]}>
        {/* 角色选择区域 */}
        <Col span={24}>
          <Card title="角色权限配置" size="small">
            <Row gutter={16} align="middle">
              <Col span={6}>
                <label>选择角色：</label>
                <Select
                  style={{ width: '100%' }}
                  placeholder="请选择要配置权限的角色"
                  value={selectedRoleId}
                  onChange={handleRoleChange}
                  allowClear
                >
                  {roles.map(role => (
                    <Option key={role.id} value={role.id}>
                      <Space>
                        {role.name}
                        {!role.isActive && <Tag color="red">禁用</Tag>}
                      </Space>
                    </Option>
                  ))}
                </Select>
              </Col>
              <Col>
                <Space>
                  <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    onClick={handleSave}
                    loading={saving}
                    disabled={!selectedRoleId}
                  >
                    保存配置
                  </Button>
                  <Button
                    icon={<ReloadOutlined />}
                    onClick={handleRefresh}
                    loading={loading}
                  >
                    刷新
                  </Button>
                </Space>
              </Col>
            </Row>
          </Card>
        </Col>

        {/* 权限树区域 */}
        <Col span={24}>
          <Card 
            title="仓库权限树" 
            size="small"
            extra={
              selectedRoleId && (
                <Tag color="blue">
                  已选择: {roles.find(r => r.id === selectedRoleId)?.name}
                </Tag>
              )
            }
          >
            {loading ? (
              <div style={{ textAlign: 'center', padding: '50px' }}>
                <Spin size="large" />
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 16 }}>
                  <Tag color="blue">说明</Tag>
                  <span style={{ color: '#666', fontSize: '12px' }}>
                    选择组织将自动选择该组织下的所有仓库。选中仓库后，可以在右侧配置具体的读、写、删除权限。
                  </span>
                </div>
                
                <Tree
                  checkable
                  checkedKeys={checkedKeys}
                  onCheck={handleCheck}
                  treeData={getTreeDataForRender()}
                  height={500}
                  style={{ 
                    border: '1px solid #d9d9d9', 
                    borderRadius: '4px', 
                    padding: '8px',
                  }}
                />
              </>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default RolePermissionsPage; 