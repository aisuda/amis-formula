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
});

test('formula:date', () => {
  expect(evalFormual('YEAR(STRTODATE("2021-10-24 10:10:10"))', {})).toBe(2021);
});
