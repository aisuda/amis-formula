import {evaluate, parse} from '../src';

const defaultContext = {
  a: 1,
  b: 2,
  c: 3,
  d: 4,
  e: 5
};

function evalFormual(expression: string, data: any = defaultContext) {
  return evaluate(expression, data, {
    evalMode: true
  });
}

test('formula:expression', () => {
  expect(evalFormual('a + 3')).toBe(4);
  expect(evalFormual('b * 3')).toBe(6);
  expect(evalFormual('b * 3 + 4')).toBe(10);
  expect(evalFormual('c * (3 + 4)')).toBe(21);
  expect(evalFormual('d / (a + 1)')).toBe(2);
  expect(evalFormual('5 % 3')).toBe(2);
  expect(evalFormual('3 | 4')).toBe(7);
  expect(evalFormual('4 ^ 4')).toBe(0);
  expect(evalFormual('4 ^ 4')).toBe(0);
  expect(evalFormual('4 & 4')).toBe(4);
  expect(evalFormual('4 & 3')).toBe(0);
  expect(evalFormual('~-1')).toBe(0);
  expect(evalFormual('!!1')).toBe(true);
  expect(evalFormual('!!""')).toBe(false);
  expect(evalFormual('1 || 2')).toBe(1);
  expect(evalFormual('1 && 2')).toBe(2);
  expect(evalFormual('1 && 2 || 3')).toBe(2);
  expect(evalFormual('1 || 2 || 3')).toBe(1);
  expect(evalFormual('1 || 2 && 3')).toBe(1);
  expect(evalFormual('(1 || 2) && 3')).toBe(3);
  expect(evalFormual('1 == "1"')).toBe(true);
  expect(evalFormual('1 === "1"')).toBe(false);
  expect(evalFormual('1 < 1')).toBe(false);
  expect(evalFormual('1 <= 1')).toBe(true);
  expect(evalFormual('1 > 1')).toBe(false);
  expect(evalFormual('1 >= 1')).toBe(true);
  expect(evalFormual('3 >> 1')).toBe(1);
  expect(evalFormual('3 << 1')).toBe(6);
  expect(evalFormual('10 ** 3')).toBe(1000);

  expect(evalFormual('10 ? 3 : 2')).toBe(3);
  expect(evalFormual('0 ? 3 : 2')).toBe(2);
});

test('formula:if', () => {
  expect(evalFormual('IF(true, 2, 3)')).toBe(2);
  expect(evalFormual('IF(false, 2, 3)')).toBe(3);
  expect(evalFormual('IF(false, 2, IF(true, 3, 4))')).toBe(3);
});

test('formula:and', () => {
  expect(!!evalFormual('AND(0, 1)')).toBe(false);
  expect(!!evalFormual('AND(1, 1)')).toBe(true);
  expect(!!evalFormual('AND(1, 1, 1, 0)')).toBe(false);
});

test('formula:or', () => {
  expect(!!evalFormual('OR(0, 1)')).toBe(true);
  expect(!!evalFormual('OR(1, 1)')).toBe(true);
  expect(!!evalFormual('OR(1, 1, 1, 0)')).toBe(true);
  expect(!!evalFormual('OR(0, 0, 0, 0)')).toBe(false);
});

test('formula:xor', () => {
  expect(evalFormual('XOR(0, 1)')).toBe(false);
  expect(evalFormual('XOR(1, 0)')).toBe(false);
  expect(evalFormual('XOR(1, 1)')).toBe(true);
  expect(evalFormual('XOR(0, 0)')).toBe(true);
});

test('formula:ifs', () => {
  expect(!!evalFormual('IFS(0, 1, 2)')).toBe(true);
  expect(!!evalFormual('IFS(0, 1, 2, 2, 3)')).toBe(true);
  expect(!!evalFormual('IFS(0, 1, 0, 2, 0)')).toBe(false);
});
test('formula:math', () => {
  expect(evalFormual('ABS(1)')).toBe(1);
  expect(evalFormual('ABS(-1)')).toBe(1);
  expect(evalFormual('ABS(0)')).toBe(0);

  expect(evalFormual('MAX(1, -1, 2, 3, 5, -9)')).toBe(5);
  expect(evalFormual('MIN(1, -1, 2, 3, 5, -9)')).toBe(-9);

  expect(evalFormual('MOD(3, 2)')).toBe(1);

  expect(evalFormual('PI()')).toBe(Math.PI);

  expect(evalFormual('ROUND(3.5)')).toBe(4);
  expect(evalFormual('ROUND(3.4)')).toBe(3);

  expect(evalFormual('ROUND(3.456789, 2)')).toBe(3.46);
  expect(evalFormual('CEIL(3.456789)')).toBe(4);
  expect(evalFormual('FLOOR(3.456789)')).toBe(3);

  expect(evalFormual('SQRT(4)')).toBe(2);
  expect(evalFormual('AVG(4, 6, 10, 10, 10)')).toBe(8);

  expect(evalFormual('UPPERMONEY(7682.01)')).toBe('柒仟陆佰捌拾贰元壹分');
  expect(evalFormual('UPPERMONEY(7682)')).toBe('柒仟陆佰捌拾贰元整');

  // 非数字类型转换是否正常？
  expect(evalFormual('"3" + "3"')).toBe(6);
  expect(evalFormual('"3" - "3"')).toBe(0);
  expect(evalFormual('AVG(4, "6", "10", 10, 10)')).toBe(8);
});

test('formula:date', () => {
  expect(evalFormual('YEAR(STRTODATE("2021-10-24 10:10:10"))', {})).toBe(2021);
});
