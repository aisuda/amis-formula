import {evaluate, parse} from '../src';

test('evalute:simple', () => {
  expect(
    evaluate('a is ${a}', {
      a: 123
    })
  ).toBe('a is 123');
});

test('evalute:filter', () => {
  expect(
    evaluate(
      'a is ${a | abc}',
      {
        a: 123
      },
      {
        filters: {
          abc(input: any) {
            return `${input}456`;
          }
        }
      }
    )
  ).toBe('a is 123456');

  expect(
    evaluate(
      'a is ${a | concat:233}',
      {
        a: 123
      },
      {
        filters: {
          concat(input: any, arg: string) {
            return `${input}${arg}`;
          }
        }
      }
    )
  ).toBe('a is 123233');

  expect(
    evaluate(
      'a is ${concat(a, a)}',
      {
        a: 123
      },
      {
        filters: {
          concat(input: any, arg: string) {
            return `${input}${arg}`;
          }
        }
      }
    )
  ).toBe('a is 123123');
});

test('evalute:filter2', () => {
  expect(
    evaluate(
      'a is ${[1, 2, 3] | concat:4 | join}',
      {},
      {
        filters: {
          concat(input: any, ...args: Array<any>) {
            return input.concat.apply(input, args);
          },
          join(input: any) {
            return input.join(',');
          }
        }
      }
    )
  ).toBe('a is 1,2,3,4');
});

test('evalute:filter3', () => {
  expect(
    evaluate(
      'a is ${[1, 2, 3] | concat:"4" | join}',
      {},
      {
        filters: {
          concat(input: any, ...args: Array<any>) {
            return input.concat.apply(input, args);
          },
          join(input: any) {
            return input.join(',');
          }
        }
      }
    )
  ).toBe('a is 1,2,3,4');
});

test('evalute:filter4', () => {
  expect(
    evaluate(
      'a is ${[1, 2, 3] | concat:${a + 3} | join}',
      {
        a: 4
      },
      {
        filters: {
          concat(input: any, ...args: Array<any>) {
            return input.concat.apply(input, args);
          },
          join(input: any) {
            return input.join(',');
          }
        }
      }
    )
  ).toBe('a is 1,2,3,7');
});

test('evalute:oldVariable', () => {
  expect(
    evaluate('a is $a', {
      a: 4
    })
  ).toBe('a is 4');
});

test('evalute:oldVariable2', () => {
  expect(
    evaluate('a is $$', {
      a: 4
    })
  ).toBe('a is [object Object]');
});

test('evalute:oldVariable3', () => {
  expect(
    evaluate(
      '$$',
      {
        a: 4
      },
      {
        defaultFilter: 'raw'
      }
    )
  ).toMatchObject({
    a: 4
  });
});
