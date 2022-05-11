import {
  parse,
  evaluate
} from '../src';
import moment from 'moment';

import 'core-js/actual/array/find';

export function momentFormat(
  input: any,
  inputFormat: string,
  outputFormat: string
) {
  return moment(input, inputFormat).format(outputFormat);
}

export {
  parse,
  evaluate,
  moment
}