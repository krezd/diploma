/**
 * Валидный Linux-юзернейм (совместим с useradd и файловой системой):
 * - начинается со строчной буквы
 * - содержит только строчные буквы, цифры, _ или -
 * - длина 2–32 символа (LOGIN_NAME_MAX = 32)
 */
export const USERNAME_PATTERN = /^[a-z][a-z0-9_-]{1,31}$/;

export const USERNAME_HINT =
  '2–32 символа. Начинается со строчной буквы, допустимы: строчные буквы, цифры, _ и -';

export const validateUsername = (value: string): string | null => {
  if (!value) return 'Имя пользователя не может быть пустым';
  if (!USERNAME_PATTERN.test(value)) return USERNAME_HINT;
  return null;
};