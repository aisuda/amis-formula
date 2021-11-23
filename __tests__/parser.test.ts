import {parse} from '../src/index';
test('parser:simple', () => {
  const input = 'expression result is ${a + b}';
  const ast = parse(input);
  expect(ast).toMatchSnapshot();
});

test('parser:evalMode', () => {
  const input = 'a + b';
  const ast = parse(input, {
    evalMode: true
  });
  expect(ast).toMatchSnapshot();
});

test('parser:template', () => {
  const input = '`abc${a + b}`';
  const ast = parse(input, {
    evalMode: true
  });
  expect(ast).toMatchSnapshot();
});

test('parser:string', () => {
  const input = '"string literall, escape \\""';
  const ast = parse(input, {
    evalMode: true
  });
  expect(ast).toMatchSnapshot();
});

test('parser:number', () => {
  const input = '-1 + 2.5 + 3';
  const ast = parse(input, {
    evalMode: true
  });
  expect(ast).toMatchSnapshot();
});

test('parser:single-string', () => {
  const input = "'string'";
  const ast = parse(input, {
    evalMode: true
  });
  expect(ast).toMatchSnapshot();
});

test('parser:object-literall', () => {
  const input = "{a: 1, 'b': 2, `c`: 3, d: {}}";
  const ast = parse(input, {
    evalMode: true
  });
  expect(ast).toMatchSnapshot();
});

test('parser:array-literall', () => {
  const input = '[a, b, 1, 2, {a: 1}]';
  const ast = parse(input, {
    evalMode: true
  });
  expect(ast).toMatchSnapshot();
});

test('parser:variable-geter', () => {
  const input = 'doAction(a.b, a[b], a["c"], a[`d`])';
  const ast = parse(input, {
    evalMode: true
  });
  expect(ast).toMatchSnapshot();
});

test('parser:variable-geter2', () => {
  const input = 'a[b]["c"][d][`x`]';
  const ast = parse(input, {
    evalMode: true
  });
  expect(ast).toMatchSnapshot();

  expect(
    parse('a[b]["c"].d[`x`]', {
      evalMode: true
    })
  ).toMatchSnapshot();
});
test('parser:multi-expression', () => {
  const input = '(a.b, a[b], a["c"], a[`d`])';
  const ast = parse(input, {
    evalMode: true
  });
  expect(ast).toMatchSnapshot();
});

test('parser:functionCall', () => {
  const input = 'doAction(a, doAction(b))';
  const ast = parse(input, {
    evalMode: true
  });
  expect(ast).toMatchSnapshot();
});

test('parser:filter', () => {
  const input = '\\$abc is ${abc | html}';
  const ast = parse(input, {
    evalMode: false
  });
  expect(ast).toMatchSnapshot();
});

test('parser:filter-escape', () => {
  const input = '\\$abc is ${abc | date: YYYY-MM-DD HH\\:mm\\:ss}';
  const ast = parse(input, {
    evalMode: false
  });
  expect(ast).toMatchSnapshot();
});

test('parser:conditional', () => {
  const input = 'a ? b : c';
  const ast = parse(input, {
    evalMode: true
  });
  expect(ast).toMatchSnapshot();
});

test('parser:binary-expression', () => {
  const input = 'a && b && c';
  const ast = parse(input, {
    evalMode: true
  });
  expect(ast).toMatchSnapshot();

  expect(
    parse('a && b || c', {
      evalMode: true
    })
  ).toMatchSnapshot();

  expect(
    parse('a || b && c', {
      evalMode: true
    })
  ).toMatchSnapshot();

  expect(
    parse('a !== b === c', {
      evalMode: true
    })
  ).toMatchSnapshot();
});

test('parser:group-expression', () => {
  const input = 'a && (b && c)';
  const ast = parse(input, {
    evalMode: true
  });
  expect(ast).toMatchSnapshot();
});

test('parser:unary-expression', () => {
  const input = '!!a';
  const ast = parse(input, {
    evalMode: true
  });
  expect(ast).toMatchSnapshot();
});
