import {Evaluator, EvaluatorOptions} from './evalutor';
import {parse, ParserOptions} from './parser';
import {lexer} from './lexer';
import {registerFilter, filters, getFilters} from './filter';
export {parse, lexer, Evaluator, filters, getFilters, registerFilter};
export * from './util';

export function evaluate(
  astOrString: string,
  data: any,
  options?: ParserOptions & EvaluatorOptions
) {
  if (typeof astOrString === 'string') {
    astOrString = parse(astOrString, options);
  }

  return new Evaluator(data, options).evalute(astOrString);
}

Evaluator.setDefaultFilters(getFilters());
