import type { TreeRole } from '../types';

export const roleLabels: Record<TreeRole, string> = {
  OWNER: 'Владелец',
  EDITOR: 'Редактор',
  VIEWER: 'Наблюдатель',
};

export const roleColors: Record<TreeRole, string> = {
  OWNER: 'bg-purple-100 text-purple-800',
  EDITOR: 'bg-green-100 text-green-800',
  VIEWER: 'bg-gray-100 text-gray-800',
};

export const canEdit = (role?: TreeRole): boolean => {
  return role === 'OWNER' || role === 'EDITOR';
};

export const isOwner = (role?: TreeRole): boolean => {
  return role === 'OWNER';
};
