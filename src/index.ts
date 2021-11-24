import {Evaluator, EvaluatorOptions} from './evalutor';
import {parse, ParserOptions} from './parser';
import {lexer} from './lexer';
export {parse, lexer, Evaluator};
export * from './util';

export function evaluate(
  astOrString: string,
  data: any,
  options?: ParserOptions & EvaluatorOptions
) {
  if (typeof astOrString === 'string') {
    astOrString = parse(astOrString, options);
  }

  return new Evaluator(options).evalute(astOrString, data);
}
