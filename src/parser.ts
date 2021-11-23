import {lexer as createLexer, Token, TokenEnum, TokenName} from './lexer';

export type NodeType = 'content' | 'raw' | 'conditional';

export interface ParserOptions {
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

const argListStates = {
  START: 0,
  COMMA: 1
};

const tempalteStates = {
  START: 0,
  SCRIPTING: 1
};

const objectStates = {
  START: 0,
  KEY: 1,
  COLON: 2,
  VALUE: 3,
  COMMA: 4
};

export function parse(input: string, options?: ParserOptions) {
  let token: Token;
  const lexer = createLexer(input, options);
  const tokens: Array<Token> = [];
  const tokenChunk: Array<Token> = [];

  function next() {
    token = tokenChunk.length ? tokenChunk.shift()! : lexer.next();

    if (!token) {
      throw new TypeError('next token is undefined');
    }
    tokens.push(token);
  }

  function back() {
    tokenChunk.unshift(tokens.pop()!);
    token = tokens[tokens.length - 1];
  }

  function matchPunctuator(operator: string | Array<string>) {
    return (
      token.type === TokenName[TokenEnum.Punctuator] &&
      (Array.isArray(operator)
        ? ~operator.indexOf(token.value!)
        : token.value === operator)
    );
  }

  function fatal() {
    throw TypeError(
      `Unexpected token ${token!.value} in ${token!.start.line}:${
        token!.start.column
      }`
    );
  }

  function expression() {
    return assignmentExpression();
  }

  function complexExpression() {
    let ast = expression();

    while (token.type === TokenName[TokenEnum.OpenFilter]) {
      next();

      if (token.type !== TokenName[TokenEnum.FilterFn]) {
        fatal();
      }
      const fnName = token.value;
      const args = [];
      next();

      while (token.type === TokenName[TokenEnum.FilterSep]) {
        next();

        if (token.type !== TokenName[TokenEnum.FilterArg]) {
          fatal();
        }
        args.push(token.value);
        next();
      }
      ast = {
        type: 'filter',
        input: ast,
        fnName,
        args
      };
    }

    return ast;
  }

  function conditionalExpression(): any {
    const ast = logicalOrExpression();

    if (!ast) {
      return null;
    }

    if (matchPunctuator('?')) {
      next();
      let consequent = assignmentExpression();
      if (!consequent) {
        fatal();
      }

      if (matchPunctuator(':')) {
        next();
        let alternate = assignmentExpression();
        if (!alternate) {
          fatal();
        }

        return {
          type: 'conditional',
          test: ast,
          consequent: consequent,
          alternate: alternate
        };
      } else {
        fatal();
      }
    }

    return ast;
  }

  function binaryExpressionParser(
    type: string,
    operator: string,
    parseFunction: () => any,
    rightParseFunction = parseFunction,
    leftKey = 'left',
    rightKey = 'right'
  ) {
    let ast = parseFunction();
    if (!ast) {
      return null;
    }

    if (matchPunctuator(operator)) {
      while (matchPunctuator(operator)) {
        next();
        const right = rightParseFunction();

        if (!right) {
          fatal();
        }

        ast = {
          type: type,
          op: operator,
          [leftKey]: ast,
          [rightKey]: right
        };
      }
    }

    return ast;
  }

  function logicalOrExpression() {
    return binaryExpressionParser('or', '||', logicalAndExpression);
  }

  function logicalAndExpression() {
    return binaryExpressionParser('and', '&&', bitwiseOrExpression);
  }

  function bitwiseOrExpression() {
    return binaryExpressionParser('binary', '|', bitwiseXOrExpression);
  }

  function bitwiseXOrExpression() {
    return binaryExpressionParser('binary', '^', bitwiseAndExpression);
  }

  function bitwiseAndExpression() {
    return binaryExpressionParser('binary', '&', equalityExpression);
  }

  function equalityExpression() {
    return binaryExpressionParser('eq', '==', () =>
      binaryExpressionParser('ne', '!=', () =>
        binaryExpressionParser('streq', '===', () =>
          binaryExpressionParser('strneq', '!==', relationalExpression)
        )
      )
    );
  }

  function relationalExpression() {
    return binaryExpressionParser('lt', '<', () =>
      binaryExpressionParser('gt', '>', () =>
        binaryExpressionParser('le', '<=', () =>
          binaryExpressionParser('ge', '>=', shiftExpression)
        )
      )
    );
  }

  function shiftExpression() {
    return binaryExpressionParser('shift', '<<', () =>
      binaryExpressionParser('shift', '>>', () =>
        binaryExpressionParser('shift', '>>>', additiveExpression)
      )
    );
  }

  function additiveExpression() {
    return binaryExpressionParser('add', '+', () =>
      binaryExpressionParser('minus', '-', multiplicativeExpression)
    );
  }

  function multiplicativeExpression() {
    return binaryExpressionParser('multiply', '*', () =>
      binaryExpressionParser('divide', '/', () =>
        binaryExpressionParser('remainder', '%', powerExpression)
      )
    );
  }

  function powerExpression() {
    return binaryExpressionParser('power', '**', unaryExpression);
  }

  function unaryExpression() {
    const unaryOperators = ['+', '-', '~', '!'];
    const stack: Array<any> = [];
    while (matchPunctuator(unaryOperators)) {
      stack.push(token);
      next();
    }
    let ast: any = postfixExpression();
    if (stack.length && !ast) {
      fatal();
    }
    while (stack.length) {
      const op = stack.pop();

      ast = {
        type: 'unary',
        op: op.value,
        value: ast
      };
    }
    return ast;
  }

  function postfixExpression() {
    let ast = leftHandSideExpression();
    if (!ast) {
      return null;
    }

    while (matchPunctuator('[') || matchPunctuator('.')) {
      const isDot = matchPunctuator('.');
      next();
      const right = isDot ? identifier() : varibleKey();
      if (!right) {
        fatal();
      }

      if (!isDot) {
        if (matchPunctuator(']')) {
          next();
        } else {
          fatal();
        }
      }
      ast = {
        type: 'get',
        host: ast,
        key: right
      };
    }

    return ast;
  }

  function leftHandSideExpression() {
    return functionCall() || primaryExpression();
  }

  function varibleKey() {
    if (token.type === TokenName[TokenEnum.Identifier]) {
      const cToken = token;
      next();
      return cToken.value;
    }

    return stringLiteral() || template();
  }

  function stringLiteral() {
    if (token.type === TokenName[TokenEnum.StringLiteral]) {
      const cToken = token;
      next();
      return {
        type: 'string',
        value: cToken.value
      };
    }
    return null;
  }

  function template() {
    if (matchPunctuator('`')) {
      next();
      let state = tempalteStates.START;
      const ast: any = {
        type: 'template',
        body: []
      };
      while (true) {
        if (state === tempalteStates.SCRIPTING) {
          const exp = expression();
          if (!exp) {
            fatal();
          }
          ast.body.push(exp);

          if (token.type !== TokenName[TokenEnum.TemplateRightBrace]) {
            fatal();
          }
          state = tempalteStates.START;
          next();
        } else {
          if (matchPunctuator('`')) {
            next();
            break;
          } else if (token.type === TokenName[TokenEnum.TemplateLeftBrace]) {
            next();
            state = tempalteStates.SCRIPTING;
          } else if (token.type === TokenName[TokenEnum.TemplateRaw]) {
            ast.body.push({
              type: 'template_raw',
              value: token.value
            });
            next();
          }
        }
      }

      return ast;
    }
    return null;
  }

  function identifier() {
    if (token.type === TokenName[TokenEnum.Identifier]) {
      const cToken = token;
      next();
      return {
        type: 'variable',
        name: cToken.value
      };
    }
    return null;
  }

  function primaryExpression() {
    return (
      identifier() ||
      literal() ||
      template() ||
      arrayLiteral() ||
      objectLiteral() ||
      (() => {
        const ast = expressionList();

        if (ast?.body.length === 1) {
          return ast.body[0];
        }

        return ast;
      })()
    );
  }

  function literal() {
    if (
      token.type === TokenName[TokenEnum.Literal] ||
      token.type === TokenName[TokenEnum.NumericLiteral] ||
      token.type === TokenName[TokenEnum.StringLiteral]
    ) {
      const value = token.value;
      next();
      return {
        type: 'literal',
        value: value
      };
    }

    return null;
  }

  function functionCall() {
    if (token.type === TokenName[TokenEnum.Identifier]) {
      const id = token;
      next();
      if (matchPunctuator('(')) {
        const argList = expressionList();
        return {
          type: 'func_call',
          identifier: id.value,
          args: argList?.body
        };
      } else {
        back();
      }
    }
    return null;
  }

  function arrayLiteral() {
    if (matchPunctuator('[')) {
      const argList = expressionList('[', ']');
      return {
        type: 'array',
        members: argList?.body
      };
    }
    return null;
  }

  function expressionList(startOP = '(', endOp = ')') {
    if (matchPunctuator(startOP)) {
      next();
      const args: Array<any> = [];
      let state = argListStates.START;

      while (true) {
        if (state === argListStates.COMMA || !matchPunctuator(endOp)) {
          const arg = expression();
          if (!arg) {
            fatal();
          }
          args.push(arg);
          state = argListStates.START;

          if (matchPunctuator(',')) {
            next();
            state = argListStates.COMMA;
          }
        } else if (matchPunctuator(endOp)) {
          next();
          break;
        }
      }
      return {
        type: 'expression-list',
        body: args
      };
    }
    return null;
  }

  function objectLiteral() {
    if (matchPunctuator('{')) {
      next();
      let ast: any = {
        type: 'object',
        members: []
      };
      let state = objectStates.START;
      let key: any, value: any;
      while (true) {
        if (state === objectStates.KEY) {
          if (!matchPunctuator(':')) {
            fatal();
          }
          next();
          state = objectStates.COLON;
        } else if (state === objectStates.COLON) {
          value = expression();
          if (!key) {
            fatal();
          }
          ast.members.push({
            key,
            value
          });
          state = objectStates.VALUE;
        } else if (state === objectStates.VALUE) {
          if (matchPunctuator(',')) {
            next();
            state = objectStates.COMMA;
          } else if (matchPunctuator('}')) {
            next();
            break;
          }
        } else {
          if (state != objectStates.COMMA && matchPunctuator('}')) {
            next();
            break;
          }

          key = varibleKey();
          if (!key) {
            fatal();
          }
          state = objectStates.KEY;
        }
      }

      return ast;
    }
    return null;
  }

  function assignmentExpression() {
    return conditionalExpression();
  }

  function contents() {
    const node: any = {
      type: 'document',
      body: []
    };
    while (token.type !== TokenName[TokenEnum.EOF]) {
      const ast = raw() || rawScript();

      if (!ast) {
        break;
      }
      node.body.push(ast);
    }
    return node;
  }

  function raw() {
    if (token.type !== TokenName[TokenEnum.RAW]) {
      return null;
    }

    const cToken = token;
    next();
    return {
      type: 'raw',
      value: cToken.value
    };
  }

  function rawScript() {
    if (token.type !== TokenName[TokenEnum.OpenScript]) {
      return null;
    }

    next();
    const exp = complexExpression();
    if (!exp) {
      throw TypeError(
        `Unexpected token ${token.value} in ${token.start.line}:${token.start.column}`
      );
    }
    if (token.type !== TokenName[TokenEnum.CloseScript]) {
      throw TypeError(
        `expect ${TokenName[TokenEnum.CloseScript]} got ${token.type}`
      );
    }
    next();

    return {
      type: 'expression',
      body: exp
    };
  }

  next();
  const ast = options?.evalMode ? expression() : contents();
  if (token!?.type !== TokenName[TokenEnum.EOF]) {
    fatal();
  }

  return ast;
}
