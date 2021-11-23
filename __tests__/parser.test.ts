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
  const input = '${`abc${a + b}`}';
  const ast = parse(input);
  expect(ast).toMatchSnapshot();
});

test('parser:string', () => {
  const input = '${"string literall, escape \\""}';
  const ast = parse(input);
  expect(ast).toMatchSnapshot();
});

test('parser:number', () => {
  const input = '${-1 + 2.5 + 3 }';
  const ast = parse(input);
  expect(ast).toMatchSnapshot();
});
