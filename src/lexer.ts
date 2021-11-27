export interface LexerOptions {
  /**
   * 直接是运算表达式？还是从模板开始 ${} 里面才算运算表达式
   */
  evalMode?: boolean;

  /**
   * 是否允许 filter 语法，比如：
   *
   * ${abc | html}
   */
  allowFilter?: boolean;
}

export const enum TokenEnum {
  BooleanLiteral = 1,
  RAW,
  Variable,
  OpenScript,
  CloseScript,
  EOF,
  Identifier,
  Literal,
  NumericLiteral,
  Punctuator,
  StringLiteral,
  RegularExpression,
  TemplateRaw,
  TemplateLeftBrace,
  TemplateRightBrace,
  OpenFilter,
  Char
}

export type TokenTypeName =
  | 'Boolean'
  | 'Raw'
  | 'Variable'
  | 'OpenScript'
  | 'CloseScript'
  | 'EOF'
  | 'Identifier'
  | 'Literal'
  | 'Numeric'
  | 'Punctuator'
  | 'String'
  | 'RegularExpression'
  | 'TemplateRaw'
  | 'TemplateLeftBrace'
  | 'TemplateRightBrace'
  | 'OpenFilter'
  | 'Char';

export const TokenName: {
  [propName: string]: TokenTypeName;
} = {};
TokenName[TokenEnum.BooleanLiteral] = 'Boolean';
TokenName[TokenEnum.RAW] = 'Raw';
TokenName[TokenEnum.Variable] = 'Variable';
TokenName[TokenEnum.OpenScript] = 'OpenScript';
TokenName[TokenEnum.CloseScript] = 'CloseScript';
TokenName[TokenEnum.EOF] = 'EOF';
TokenName[TokenEnum.Identifier] = 'Identifier';
TokenName[TokenEnum.Literal] = 'Literal';
TokenName[TokenEnum.NumericLiteral] = 'Numeric';
TokenName[TokenEnum.Punctuator] = 'Punctuator';
TokenName[TokenEnum.StringLiteral] = 'String';
TokenName[TokenEnum.RegularExpression] = 'RegularExpression';
TokenName[TokenEnum.TemplateRaw] = 'TemplateRaw';
TokenName[TokenEnum.TemplateLeftBrace] = 'TemplateLeftBrace';
TokenName[TokenEnum.TemplateRightBrace] = 'TemplateRightBrace';
TokenName[TokenEnum.OpenFilter] = 'OpenFilter';
TokenName[TokenEnum.Char] = 'Char';

export interface Position {
  index: number;
  line: number;
  column: number;
}

export interface Token {
  type: TokenTypeName;
  value: any;
  raw?: string;
  start: Position;
  end: Position;
}

const mainStates = {
  START: 0,
  SCRIPT: 1,
  EXPRESSION: 2,
  BLOCK: 3,
  Template: 4,
  Filter: 5
};

const rawStates = {
  START: 0,
  ESCAPE: 1
};

const numberStates = {
  START: 0,
  MINUS: 1,
  ZERO: 2,
  DIGIT: 3,
  POINT: 4,
  DIGIT_FRACTION: 5,
  EXP: 6,
  EXP_DIGIT_OR_SIGN: 7
};

const stringStates = {
  START: 0,
  START_QUOTE_OR_CHAR: 1,
  ESCAPE: 2
};

const filterStates = {
  START: 0,
  Func: 1,
  SEP: 2,
  ESCAPE: 3
};

const punctuatorList = [
  '===',
  '!==',
  '>>>',
  '==',
  '!=',
  '<>',
  '<=',
  '>=',
  '||',
  '&&',
  '++',
  '--',
  '<<',
  '>>',
  '**',
  '+=',
  '*=',
  '/=',
  '<',
  '>',
  '=',
  '*',
  '/',
  '-',
  '+',
  '^',
  '!',
  '~',
  '%',
  '&',
  '|',
  '(',
  ')',
  '[',
  ']',
  '{',
  '}',
  '?',
  ':',
  ';',
  ',',
  '.',
  '$'
];

const escapes = {
  '"': 0, // Quotation mask
  '\\': 1, // Reverse solidus
  '/': 2, // Solidus
  'b': 3, // Backspace
  'f': 4, // Form feed
  'n': 5, // New line
  'r': 6, // Carriage return
  't': 7, // Horizontal tab
  'u': 8 // 4 hexadecimal digits
};

function isDigit1to9(char: string) {
  return char >= '1' && char <= '9';
}

function isDigit(char: string) {
  return char >= '0' && char <= '9';
}

function isHex(char: string) {
  return (
    isDigit(char) ||
    (char >= 'a' && char <= 'f') ||
    (char >= 'A' && char <= 'F')
  );
}

function isExp(char: string) {
  return char === 'e' || char === 'E';
}

function escapeString(text: string, allowedLetter: Array<string> = []) {
  return text.replace(/\\(.)/g, function (_, text) {
    return text === 'b'
      ? '\b'
      : text === 'f'
      ? '\f'
      : text === 'n'
      ? '\n'
      : text === 'r'
      ? '\r'
      : text === 't'
      ? '\t'
      : text === 'v'
      ? '\v'
      : ~allowedLetter.indexOf(text)
      ? text
      : _;
  });
}

function formatNumber(value: string) {
  return Number(value);
}

export function lexer(input: string, options?: LexerOptions) {
  let line = 1;
  let column = 1;
  let index = 0;
  let mainState = mainStates.START;
  const states: Array<any> = [mainState];
  let tokenCache: Array<Token> = [];
  const allowFilter = options?.allowFilter !== false;

  if (options?.evalMode) {
    pushState(mainStates.EXPRESSION);
  }

  function pushState(state: any) {
    states.push((mainState = state));
  }
  function popState() {
    states.pop();
    mainState = states[states.length - 1];
  }

  function position(value?: string) {
    if (value && typeof value === 'string') {
      const lines = value.split(/[\r\n]+/);
      return {
        index: index + value.length,
        line: line + lines.length - 1,
        column: column + lines[lines.length - 1].length
      };
    }

    return {index: index, line, column};
  }

  function eof(): Token | void | null {
    if (index >= input.length) {
      return {
        type: TokenName[TokenEnum.EOF],
        value: undefined,
        start: position(),
        end: position()
      };
    }
  }

  function raw(): Token | void | null {
    if (mainState !== mainStates.START) {
      return null;
    }

    let buffer = '';
    let state = rawStates.START;
    let i = index;

    while (i < input.length) {
      const ch = input[i];

      if (state === rawStates.ESCAPE) {
        if (escapes.hasOwnProperty(ch) || ch === '$') {
          buffer += ch;
          i++;
          state = rawStates.START;
        } else {
          const pos = position(buffer + ch);
          throw new SyntaxError(
            `Unexpected token ${ch} in ${pos.line}:${pos.column}`
          );
        }
      } else {
        if (ch === '\\') {
          buffer += ch;
          i++;
          state = rawStates.ESCAPE;
          continue;
        } else if (ch === '$') {
          const nextCh = input[i + 1];
          if (nextCh === '{') {
            break;
          } else if (nextCh === '$') {
            // $$ 用法兼容
            tokenCache.push({
              type: TokenName[TokenEnum.Variable],
              value: '&',
              raw: '$$',
              start: position(input.substring(index, i)),
              end: position(input.substring(index, i + 2))
            });
            break;
          } else {
            // 支持旧的 $varName 的取值方法
            let j = i + 2;
            while (
              /^[a-zA-Z0-9_.][a-zA-Z0-9_.\[\]]*$/.test(
                input.substring(i + 1, j)
              ) &&
              j <= input.length
            ) {
              j++;
            }

            if (j - i > 2) {
              tokenCache.push({
                type: TokenName[TokenEnum.Variable],
                value: input.substring(i + 1, j),
                raw: input.substring(i, j),
                start: position(input.substring(index, i)),
                end: position(input.substring(index, j))
              });
              break;
            }
          }
        }
        i++;
        buffer += ch;
      }
    }

    if (i > index) {
      return {
        type: TokenName[TokenEnum.RAW],
        value: escapeString(buffer, ['`', '$']),
        raw: buffer,
        start: position(),
        end: position(buffer)
      };
    }
    return tokenCache.length ? tokenCache.shift() : null;
  }

  function openScript() {
    if (mainState === mainStates.Template) {
      return null;
    }

    const ch = input[index];
    if (ch === '$') {
      const nextCh = input[index + 1];
      if (nextCh === '{') {
        pushState(mainStates.SCRIPT);
        const value = input.substring(index, index + 2);
        return {
          type: TokenName[TokenEnum.OpenScript],
          value,
          start: position(),
          end: position(value)
        };
      }
    }
    return null;
  }

  function expression() {
    if (
      mainState !== mainStates.SCRIPT &&
      mainState !== mainStates.EXPRESSION &&
      mainState !== mainStates.BLOCK &&
      mainState !== mainStates.Filter
    ) {
      return null;
    }

    const token =
      literal() ||
      identifier() ||
      numberLiteral() ||
      stringLiteral() ||
      punctuator() ||
      char();

    if (token?.value === '{') {
      pushState(mainStates.BLOCK);
    } else if (token?.value === '}') {
      if (mainState === mainStates.Filter) {
        popState();
      }

      const prevState = mainState;
      popState();

      if (
        prevState === mainStates.SCRIPT ||
        prevState === mainStates.EXPRESSION
      ) {
        return {
          type: TokenName[
            prevState === mainStates.EXPRESSION
              ? TokenEnum.TemplateRightBrace
              : TokenEnum.CloseScript
          ],
          value: token!.value,
          start: position(),
          end: position(token!.value)
        };
      }
    }

    // filter 过滤器部分需要特殊处理
    if (
      mainState === mainStates.SCRIPT &&
      token?.value === '|' &&
      allowFilter
    ) {
      pushState(mainStates.Filter);
      return {
        type: TokenName[TokenEnum.OpenFilter],
        value: '|',
        start: position(),
        end: position('|')
      };
    } else if (mainState === mainStates.Filter && token?.value === '|') {
      return {
        type: TokenName[TokenEnum.OpenFilter],
        value: '|',
        start: position(),
        end: position('|')
      };
    }

    if (!token && input[index] === '`') {
      pushState(mainStates.Template);
      return {
        type: TokenName[TokenEnum.Punctuator],
        value: '`',
        start: position(),
        end: position('`')
      };
    }

    return token;
  }

  function char() {
    if (mainState !== mainStates.Filter) {
      return null;
    }

    let i = index;
    let ch = input[i];
    if (ch === '\\') {
      const nextCh = input[i + 1];

      if (
        nextCh === '$' ||
        ~punctuatorList.indexOf(nextCh) ||
        escapes.hasOwnProperty(nextCh)
      ) {
        i++;
        ch =
          nextCh === 'b'
            ? '\b'
            : nextCh === 'f'
            ? '\f'
            : nextCh === 'n'
            ? '\n'
            : nextCh === 'r'
            ? '\r'
            : nextCh === 't'
            ? '\t'
            : nextCh === 'v'
            ? '\v'
            : nextCh;
      } else {
        const pos = position(input.substring(index, index + 1));
        throw new SyntaxError(
          `Unexpected token ${ch} in ${pos.line}:${pos.column}`
        );
      }
    }
    const token = {
      type: TokenName[TokenEnum.Char],
      value: ch,
      start: position(),
      end: position(input.substring(index, i + 1))
    };
    return token;
  }

  function template(): Token | void | null {
    if (mainState !== mainStates.Template) {
      return null;
    }
    let state = stringStates.START;
    let i = index;
    while (i < input.length) {
      const ch = input[i];

      if (state === stringStates.ESCAPE) {
        if (escapes.hasOwnProperty(ch) || ch === '`' || ch === '$') {
          i++;
          state = stringStates.START_QUOTE_OR_CHAR;
        } else {
          const pos = position(input.substring(index, i + 1));
          throw new SyntaxError(
            `Unexpected token ${ch} in ${pos.line}:${pos.column}`
          );
        }
      } else if (ch === '\\') {
        i++;
        state = stringStates.ESCAPE;
      } else if (ch === '`') {
        popState();
        tokenCache.push({
          type: TokenName[TokenEnum.Punctuator],
          value: '`',
          start: position(input.substring(index, i)),
          end: position(input.substring(index, i + 1))
        });
        break;
      } else if (ch === '$') {
        const nextCh = input[i + 1];
        if (nextCh === '{') {
          pushState(mainStates.EXPRESSION);
          tokenCache.push({
            type: TokenName[TokenEnum.TemplateLeftBrace],
            value: '${',
            start: position(input.substring(index, i)),
            end: position(input.substring(index, i + 2))
          });
          break;
        }
        i++;
      } else {
        i++;
      }
    }
    if (i > index) {
      const value = input.substring(index, i);
      return {
        type: TokenName[TokenEnum.TemplateRaw],
        value: escapeString(value, ['`', '$']),
        raw: value,
        start: position(),
        end: position(value)
      };
    }
    return tokenCache.length ? tokenCache.shift() : null;
  }

  function skipWhiteSpace() {
    while (index < input.length) {
      const ch = input[index];
      if (ch === '\r') {
        // CR (Unix)
        index++;
        line++;
        column = 1;
        if (input.charAt(index) === '\n') {
          // CRLF (Windows)
          index++;
        }
      } else if (ch === '\n') {
        // LF (MacOS)
        index++;
        line++;
        column = 1;
      } else if (ch === '\t' || ch === ' ') {
        index++;
        column++;
      } else {
        break;
      }
    }
  }

  function punctuator() {
    const find = punctuatorList.find(
      punctuator =>
        input.substring(index, index + punctuator.length) === punctuator
    );
    if (find) {
      return {
        type: TokenName[TokenEnum.Punctuator],
        value: find,
        start: position(),
        end: position(find)
      };
    }
    return null;
  }

  function literal() {
    let keyword = input.substring(index, index + 4).toLowerCase();
    let value: any = keyword;
    let isLiteral = false;
    if (keyword === 'true' || keyword === 'null') {
      isLiteral = true;
      value = keyword === 'true' ? true : null;
    } else if (
      (keyword = input.substring(index, index + 5).toLowerCase()) === 'false'
    ) {
      isLiteral = true;
      value = false;
    } else if (
      (keyword = input.substring(index, index + 9).toLowerCase()) ===
      'undefined'
    ) {
      isLiteral = true;
      value = undefined;
    }

    if (isLiteral) {
      return {
        type:
          value === true || value === false
            ? TokenName[TokenEnum.BooleanLiteral]
            : TokenName[TokenEnum.Literal],
        value,
        raw: keyword,
        start: position(),
        end: position(keyword)
      };
    }
    return null;
  }

  function numberLiteral() {
    let i = index;

    let passedValueIndex = i;
    let state = numberStates.START;

    iterator: while (i < input.length) {
      const char = input.charAt(i);

      switch (state) {
        case numberStates.START: {
          if (char === '-') {
            state = numberStates.MINUS;
          } else if (char === '0') {
            passedValueIndex = i + 1;
            state = numberStates.ZERO;
          } else if (isDigit1to9(char)) {
            passedValueIndex = i + 1;
            state = numberStates.DIGIT;
          } else {
            return null;
          }
          break;
        }

        case numberStates.MINUS: {
          if (char === '0') {
            passedValueIndex = i + 1;
            state = numberStates.ZERO;
          } else if (isDigit1to9(char)) {
            passedValueIndex = i + 1;
            state = numberStates.DIGIT;
          } else {
            return null;
          }
          break;
        }

        case numberStates.ZERO: {
          if (char === '.') {
            state = numberStates.POINT;
          } else if (isExp(char)) {
            state = numberStates.EXP;
          } else {
            break iterator;
          }
          break;
        }

        case numberStates.DIGIT: {
          if (isDigit(char)) {
            passedValueIndex = i + 1;
          } else if (char === '.') {
            state = numberStates.POINT;
          } else if (isExp(char)) {
            state = numberStates.EXP;
          } else {
            break iterator;
          }
          break;
        }

        case numberStates.POINT: {
          if (isDigit(char)) {
            passedValueIndex = i + 1;
            state = numberStates.DIGIT_FRACTION;
          } else {
            break iterator;
          }
          break;
        }

        case numberStates.DIGIT_FRACTION: {
          if (isDigit(char)) {
            passedValueIndex = i + 1;
          } else if (isExp(char)) {
            state = numberStates.EXP;
          } else {
            break iterator;
          }
          break;
        }

        case numberStates.EXP: {
          if (char === '+' || char === '-') {
            state = numberStates.EXP_DIGIT_OR_SIGN;
          } else if (isDigit(char)) {
            passedValueIndex = i + 1;
            state = numberStates.EXP_DIGIT_OR_SIGN;
          } else {
            break iterator;
          }
          break;
        }

        case numberStates.EXP_DIGIT_OR_SIGN: {
          if (isDigit(char)) {
            passedValueIndex = i + 1;
          } else {
            break iterator;
          }
          break;
        }
      }

      i++;
    }

    if (passedValueIndex > 0) {
      const value = input.slice(index, passedValueIndex);
      return {
        type: TokenName[TokenEnum.NumericLiteral],
        value: formatNumber(value),
        raw: value,
        start: position(),
        end: position(value)
      };
    }

    return null;
  }

  function stringLiteral() {
    let startQuote = '"';
    let state = stringStates.START;
    let i = index;
    while (i < input.length) {
      const ch = input[i];

      if (state === stringStates.START) {
        if (ch === '"' || ch === "'") {
          startQuote = ch;
          i++;
          state = stringStates.START_QUOTE_OR_CHAR;
        } else {
          break;
        }
      } else if (state === stringStates.ESCAPE) {
        if (escapes.hasOwnProperty(ch) || ch === startQuote) {
          i++;
          state = stringStates.START_QUOTE_OR_CHAR;
        } else {
          const pos = position(input.substring(index, i + 1));
          throw new SyntaxError(
            `Unexpected token ${ch} in ${pos.line}:${pos.column}`
          );
        }
      } else if (ch === '\\') {
        i++;
        state = stringStates.ESCAPE;
      } else if (ch === startQuote) {
        i++;
        break;
      } else {
        i++;
      }
    }
    if (i > index) {
      const value = input.substring(index, i);
      return {
        type: TokenName[TokenEnum.StringLiteral],
        value: escapeString(value.substring(1, value.length - 1), [startQuote]),
        raw: value,
        start: position(),
        end: position(value)
      };
    }
    return null;
  }

  function identifier() {
    let i = index;
    let chunk = '';
    while (i < input.length) {
      const ch = input[i];
      if (
        /^[\u4e00-\u9fa5A-Za-z_$@][\u4e00-\u9fa5A-Za-z0-9_]*$/.test(chunk + ch)
      ) {
        chunk += ch;
        i++;
      } else {
        break;
      }
    }
    if (i > index) {
      const value = input.substring(index, i);
      return {
        type: TokenName[TokenEnum.Identifier],
        value: value,
        start: position(),
        end: position(value)
      };
    }
    return null;
  }

  function getNextToken(): Token | void | null {
    if (tokenCache.length) {
      return tokenCache.shift()!;
    }

    if (
      mainState === mainStates.SCRIPT ||
      mainState === mainStates.EXPRESSION ||
      mainState === mainStates.BLOCK
    ) {
      skipWhiteSpace();
    }

    return eof() || raw() || openScript() || expression() || template();
  }

  return {
    next: function () {
      const token = getNextToken();

      if (token) {
        index = token.end.index;
        line = token.end.line;
        column = token.end.column;
        return token;
      }

      const pos = position();
      throw new SyntaxError(
        `unexpected character "${input[index]}" at ${pos.line}:${pos.column}`
      );
    }
  };
}
