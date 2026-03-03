import { describe, it, expect } from 'vitest';
import { canEdit, isOwner, roleLabels, roleColors } from './roleUtils';
import type { TreeRole } from '../types';

describe('canEdit', () => {
  it('возвращает true для OWNER', () => {
    expect(canEdit('OWNER')).toBe(true);
  });

  it('возвращает true для EDITOR', () => {
    expect(canEdit('EDITOR')).toBe(true);
  });

  it('возвращает false для VIEWER', () => {
    expect(canEdit('VIEWER')).toBe(false);
  });

  it('возвращает false для undefined', () => {
    expect(canEdit(undefined)).toBe(false);
  });

  it('возвращает false для null (приведение типов)', () => {
    expect(canEdit(null as unknown as TreeRole)).toBe(false);
  });
});

describe('isOwner', () => {
  it('возвращает true для OWNER', () => {
    expect(isOwner('OWNER')).toBe(true);
  });

  it('возвращает false для EDITOR', () => {
    expect(isOwner('EDITOR')).toBe(false);
  });

  it('возвращает false для VIEWER', () => {
    expect(isOwner('VIEWER')).toBe(false);
  });

  it('возвращает false для undefined', () => {
    expect(isOwner(undefined)).toBe(false);
  });
});

describe('roleLabels', () => {
  it('содержит метки для всех ролей', () => {
    expect(roleLabels.OWNER).toBe('Владелец');
    expect(roleLabels.EDITOR).toBe('Редактор');
    expect(roleLabels.VIEWER).toBe('Наблюдатель');
  });
});

describe('roleColors', () => {
  it('содержит CSS-классы для всех ролей', () => {
    expect(roleColors.OWNER).toContain('purple');
    expect(roleColors.EDITOR).toContain('green');
    expect(roleColors.VIEWER).toContain('gray');
  });
});
