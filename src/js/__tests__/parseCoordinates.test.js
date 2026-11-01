import parseCoordinates from '../parseCoordinates';

describe('parseCoordinates', () => {
  test.each([
    ['51.50851, −0.12572', { latitude: 51.50851, longitude: -0.12572 }],
    ['51.50851,−0.12572', { latitude: 51.50851, longitude: -0.12572 }],
    ['[51.50851, −0.12572]', { latitude: 51.50851, longitude: -0.12572 }],
    [' 55.75 , 37.61 ', { latitude: 55.75, longitude: 37.61 }],
  ])('возвращает объект с широтой и долготой для ввода «%s»', (input, expected) => {
    expect(parseCoordinates(input)).toEqual(expected);
  });

  test.each([
    [''],
    ['   '],
    ['abc'],
    ['51.50851'],
    ['51.50851, abc'],
    ['51.50851,'],
    [', -0.12572'],
    ['1, 2, 3'],
    ['91, 0'],
    ['0, 181'],
    ['[,]'],
  ])('генерирует исключение для некорректного ввода «%s»', (input) => {
    expect(() => parseCoordinates(input)).toThrow();
  });
});
