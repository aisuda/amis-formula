import {
  parse,
  evaluate
} from '../src';
import moment from 'moment';

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