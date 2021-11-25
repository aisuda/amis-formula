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

  expect(
    evaluate('b is $b', {
      a: 4
    })
  ).toBe('b is ');
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

test('evalute:conditional', () => {
  expect(
    evaluate(
      '${a | isTrue: true : false}',
      {
        a: 4
      },
      {
        defaultFilter: 'raw'
      }
    )
  ).toBe(true);

  expect(
    evaluate(
      '${a | isTrue: b : false}',
      {
        a: 4,
        b: 5
      },
      {
        defaultFilter: 'raw'
      }
    )
  ).toBe(5);

  expect(
    evaluate(
      '${a | isTrue: b : false}',
      {
        a: null,
        b: 5
      },
      {
        defaultFilter: 'raw'
      }
    )
  ).toBe(false);

  expect(
    evaluate(
      '${a | isEquals: 1 : "1" |isEquals: 2 : "2" | isEquals: 3 : "3" }',
      {
        a: 3
      },
      {
        defaultFilter: 'raw'
      }
    )
  ).toBe('3');

  expect(
    evaluate(
      '${a | isEquals: 1 : "1" |isEquals: 1 : "2" | isEquals: 1 : "3" }',
      {
        a: 1
      },
      {
        defaultFilter: 'raw'
      }
    )
  ).toBe('1');

  expect(
    evaluate(
      '${a | isEquals: 1 : "1" : "12" |isEquals: 2 : "2" | isEquals: 3 : "3" }',
      {
        a: 2
      },
      {
        defaultFilter: 'raw'
      }
    )
  ).toBe('12');
});

test('evalute:object-variable', () => {
  const data = {
    key: 'x',
    obj: {
      x: 1,
      y: 2
    }
  };

  expect(evaluate('a is ${obj.x}', data)).toBe('a is 1');
  expect(evaluate('a is ${obj[x]}', data)).toBe('a is ');
  expect(evaluate('a is ${obj["x"]}', data)).toBe('a is 1');
  expect(evaluate('a is ${obj[key]}', data)).toBe('a is 1');
  expect(evaluate('a is ${obj[${key}]}', data)).toBe('a is 1');
});
