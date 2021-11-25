import {lexer as createLexer, parse} from '../src';

function getTokens(input: string, options?: any) {
  const lexer = createLexer(input, options);
  const tokens: Array<any> = [];

  while (true) {
    const token = lexer.next();
    if (token) {
      tokens.push(token);

      if (token.type === 'EOF') {
        break;
      }
    } else {
      break;
    }
  }

  return tokens.map(token => `<${token.type}> ${token.value}`);
}

test('lexer:simple', () => {
  expect(
    getTokens('expression result is ${a + b}', {
      evalMode: false
    })
  ).toMatchSnapshot();
});

test('lexer:filter', () => {
  expect(
    getTokens('\\$abc is ${abc | date: YYYY-MM-DD HH\\:mm\\:ss}', {
      evalMode: false
    })
  ).toMatchSnapshot();
});

// test('lexer:test', () => {
//   console.log(getTokens("{a: 1, 'b': 2, `c`: 3, d: {}}", {evalMode: true}));
// });
