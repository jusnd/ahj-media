/**
 * Разбирает строку с координатами, введёнными пользователем вручную.
 *
 * Поддерживаемые форматы:
 *   51.50851, −0.12572   (с пробелом после запятой)
 *   51.50851,−0.12572    (без пробела)
 *   [51.50851, −0.12572] (в квадратных скобках)
 *
 * Учитывается типографский минус (U+2212), которым часто заменяют дефис.
 *
 * @param {string} input строка с координатами
 * @returns {{latitude: number, longitude: number}}
 * @throws {Error} если формат не соответствует ожидаемому
 */
export default function parseCoordinates(input) {
  if (typeof input !== 'string') {
    throw new Error('Координаты должны быть строкой');
  }

  const cleaned = input
    .trim()
    .replace(/[[\]]/g, '')
    .replace(/−/g, '-');

  const parts = cleaned.split(',');
  if (parts.length !== 2) {
    throw new Error('Ожидаются широта и долгота через запятую');
  }

  const latStr = parts[0].trim();
  const lngStr = parts[1].trim();
  if (latStr === '' || lngStr === '') {
    throw new Error('Широта и долгота не должны быть пустыми');
  }

  const latitude = Number(latStr);
  const longitude = Number(lngStr);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error('Координаты должны быть числами');
  }
  if (latitude < -90 || latitude > 90) {
    throw new Error('Широта должна быть в диапазоне от -90 до 90');
  }
  if (longitude < -180 || longitude > 180) {
    throw new Error('Долгота должна быть в диапазоне от -180 до 180');
  }

  return { latitude, longitude };
}
