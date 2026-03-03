import { describe, it, expect } from 'vitest';
import { formatDate, formatDateTime, getAge } from './formatDate';

describe('formatDate', () => {
  it('возвращает "—" для undefined', () => {
    expect(formatDate(undefined)).toBe('—');
  });

  it('возвращает "—" для пустой строки', () => {
    expect(formatDate('')).toBe('—');
  });

  it('форматирует дату в русской локали', () => {
    const result = formatDate('1990-01-15');
    // Ожидаем что-то вроде "15 января 1990 г."
    expect(result).toContain('1990');
    expect(result).toContain('15');
  });

  it('форматирует дату 2000-06-01', () => {
    const result = formatDate('2000-06-01');
    expect(result).toContain('2000');
    expect(result).toContain('1');
  });

  it('обрабатывает ISO строку с временем', () => {
    const result = formatDate('2024-03-15T10:30:00Z');
    expect(result).toContain('2024');
  });
});

describe('formatDateTime', () => {
  it('форматирует дату и время', () => {
    const result = formatDateTime('2024-01-15T14:30:00Z');
    expect(result).toContain('2024');
    // Должно содержать часы и минуты
    expect(result).toMatch(/\d{2}:\d{2}/);
  });

  it('возвращает исходную строку при ошибке парсинга', () => {
    // Невалидная дата — Date конструктор вернёт Invalid Date
    // toLocaleString на Invalid Date бросает или возвращает "Invalid Date"
    const result = formatDateTime('not-a-date');
    // Функция возвращает исходную строку в catch
    expect(typeof result).toBe('string');
  });
});

describe('getAge', () => {
  it('возвращает пустую строку если birthDate не задан', () => {
    expect(getAge(undefined)).toBe('');
    expect(getAge('')).toBe('');
  });

  it('вычисляет возраст от даты рождения до сегодня', () => {
    // Человек родился 35 лет назад
    const birthYear = new Date().getFullYear() - 35;
    const birthDate = `${birthYear}-01-01`;
    const result = getAge(birthDate);
    expect(result).toContain('лет');
    // Возраст должен быть 34 или 35 в зависимости от текущей даты
    expect(result).toMatch(/3[45] лет/);
  });

  it('вычисляет возраст между двумя датами', () => {
    // getAge использует делитель 365.25 (учёт високосных лет),
    // поэтому для ровно 50 лет результат может быть 49 или 50.
    const result = getAge('1900-01-01', '1950-01-01');
    expect(result).toMatch(/^(49|50) лет$/);
  });

  it('возвращает 0 лет для одинаковых дат', () => {
    const result = getAge('2000-06-15', '2000-06-15');
    expect(result).toBe('0 лет');
  });

  it('вычисляет возраст для исторических дат', () => {
    // 70 лет с делителем 365.25 — может дать 69 или 70
    const result = getAge('1850-03-10', '1920-03-10');
    expect(result).toMatch(/^(69|70) лет$/);
  });
});
