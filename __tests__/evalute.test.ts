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

  expect(
    evaluate('a.b is $a.b', {
      a: {
        b: 233
      }
    })
  ).toBe('a.b is 233');
});

test('evalute:ariable2', () => {
  expect(
    evaluate('a is $$', {
      a: 4
    })
  ).toBe('a is [object Object]');
});

test('evalute:ariable3', () => {
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
  expect(evaluate('a is ${obj[x]}', data)).toBe('a is 1');
  expect(evaluate('a is ${obj[`x`]}', data)).toBe('a is 1');
  expect(evaluate('a is ${obj["x"]}', data)).toBe('a is 1');
  expect(evaluate('a is ${obj[key]}', data)).toBe('a is 1');
  expect(evaluate('a is ${obj[`${key}`]}', data)).toBe('a is 1');
  expect(evaluate('a is ${obj[${key}]}', data)).toBe('a is 1');
});

test('evalute:literal-variable', () => {
  const data = {
    key: 'x',
    index: 0,
    obj: {
      x: 1,
      y: 2
    }
  };

  expect(evaluate('a is ${({x: 1})["x"]}', data)).toBe('a is 1');
  expect(evaluate('a is ${({x: 1}).x}', data)).toBe('a is 1');
  expect(evaluate('a is ${(["a", "b"])[index]}', data)).toBe('a is a');
  expect(evaluate('a is ${(["a", "b"])[1]}', data)).toBe('a is b');
  expect(evaluate('a is ${(["a", "b"]).0}', data)).toBe('a is a');
});

test('evalute:tempalte', () => {
  const data = {
    key: 'x'
  };

  expect(evaluate('abc${`11${3}22`}xyz', data)).toBe('abc11322xyz');
  expect(evaluate('abc${`${3}22`}xyz', data)).toBe('abc322xyz');
  expect(evaluate('abc${`11${3}`}xyz', data)).toBe('abc113xyz');
  expect(evaluate('abc${`${3}`}xyz', data)).toBe('abc3xyz');
  expect(evaluate('abc${`${key}`}xyz', data)).toBe('abcxxyz');
});

test('evalute:literal', () => {
  const data = {
    dynamicKey: 'alpha'
  };

  expect(
    evaluate('${{a: 1, 0: 2, "3": 3}}', data, {
      defaultFilter: 'raw'
    })
  ).toMatchObject({
    a: 1,
    0: 2,
    3: 3
  });

  expect(
    evaluate('${{a: 1, 0: 2, "3": 3, [`4`]: 4}}', data, {
      defaultFilter: 'raw'
    })
  ).toMatchObject({
    a: 1,
    0: 2,
    3: 3,
    4: 4
  });

  expect(
    evaluate('${{a: 1, 0: 2, "3": 3, [`${dynamicKey}233`]: 4}}', data, {
      defaultFilter: 'raw'
    })
  ).toMatchObject({
    a: 1,
    0: 2,
    3: 3,
    alpha233: 4
  });

  expect(
    evaluate('${[1, 2, `2${dynamicKey}2`, {a: 1, 0: 2, [`2`]: "3"}]}', data, {
      defaultFilter: 'raw'
    })
  ).toMatchObject([1, 2, `2alpha2`, {a: 1, 0: 2, [`2`]: '3'}]);
});

test('evalute:variableName', () => {
  const data = {
    'a-b': 'c',
    '222': 10222,
    '222_221': 233,
    '222_abcde': 'abcde',
    '222-221': 333
  };

  expect(evaluate('${a-b}', data)).toBe('c');
  expect(evaluate('${222}', data)).toBe(222);
  expect(evaluate('${222_221}', data)).toBe('233');
  expect(evaluate('${222-221}', data)).toBe(1);
  expect(evaluate('${222_abcde}', data)).toBe('abcde');
  expect(
    evaluate('${&["222-221"]}', data, {
      defaultFilter: 'raw'
    })
  ).toBe(333);
  expect(
    evaluate('222', data, {
      variableMode: true
    })
  ).toBe(10222);
});

test('evalute:3-1', () => {
  const data = {};

  expect(evaluate('${3-1}', data)).toBe(2);
  expect(evaluate('${-1 + 2.5 + 3}', data)).toBe(4.5);
  expect(evaluate('${-1 + -1}', data)).toBe(-2);
  expect(evaluate('${3 * -1}', data)).toBe(-3);

  expect(evaluate('${3 + +1}', data)).toBe(4);
});
