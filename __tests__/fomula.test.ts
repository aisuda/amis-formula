import {evaluate, parse} from '../src';

test('formula:plus', () => {
  expect(
    evaluate(
      'a + 3',
      {
        a: 123
      },
      {
        evalMode: true
      }
    )
  ).toBe(126);
});

test('formula:mulit', () => {
  expect(
    evaluate(
      'a * 3',
      {
        a: 3
      },
      {
        evalMode: true
      }
    )
  ).toBe(9);
});

test('formula:combo', () => {
  expect(
    evaluate(
      'a * 3 + 4',
      {
        a: 3
      },
      {
        evalMode: true
      }
    )
  ).toBe(13);
});

test('formula:combo2', () => {
  expect(
    evaluate(
      'a * (3 + 4)',
      {
        a: 3
      },
      {
        evalMode: true
      }
    )
  ).toBe(21);
});

test('formula:date', () => {
  expect(
    evaluate(
      'YEAR(STRTODATE("2021-10-24 10:10:10"))',
      {},
      {
        evalMode: true
      }
    )
  ).toBe(2021);
});
