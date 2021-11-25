/**
 * @file 公式内置函数
 */

import moment from 'moment';
import {getFilters} from './filter';

export interface FilterMap {
  [propName: string]: (this: FilterContext, input: any, ...args: any[]) => any;
}

export interface FunctionMap {
  [propName: string]: (this: Evaluator, ast: Object, data: any) => any;
}

export interface FilterContext {
  data: Object;
  restFilters: Array<{
    name: string;
    args: Array<any>;
  }>;
}

export interface EvaluatorOptions {
  /**
   * 可以外部传入 ast 节点处理器，定制或者扩充自定义函数
   */
  functions?: FunctionMap;

  /**
   * 可以外部扩充 filter
   */
  filters?: FilterMap;

  defaultFilter?: string;
}

export class Evaluator {
  readonly filters: FilterMap;
  readonly functions: FunctionMap = {};
  data: any;

  constructor(
    readonly options: EvaluatorOptions = {
      defaultFilter: 'html'
    }
  ) {
    this.filters = {
      ...this.filters,
      ...getFilters(),
      ...options?.filters
    };
    this.functions = {
      ...this.functions,
      ...options?.functions
    };
  }

  // 主入口
  evalute(ast: any, data: any = {}) {
    this.data = data;
    if (ast && ast.type) {
      const name = (ast.type as string).replace(/(?:_|\-)(\w)/g, (_, l) =>
        l.toUpperCase()
      );
      const fn = this.functions[name] || (this as any)[name];

      if (!fn) {
        throw new Error(`${ast.type} unkown.`);
      }

      return fn.call(this, ast, data);
    } else {
      return ast;
    }
  }

  document(ast: {type: 'document'; body: Array<any>}, data: any) {
    if (!ast.body.length) {
      return undefined;
    }
    const isString = ast.body.length > 1;
    const content = ast.body.map(item => {
      let result = this.evalute(item, data);

      if (isString && result == null) {
        // 不要出现 undefined, null 之类的文案
        return '';
      }

      return result;
    });
    return content.length === 1 ? content[0] : content.join('');
  }

  filter(
    ast: {
      type: 'filter';
      input: any;
      filters: Array<{name: string; args: Array<any>}>;
    },
    data: any
  ) {
    let input = this.evalute(ast.input, data);
    const filters = ast.filters.concat();
    const context = {
      data,
      restFilters: filters
    };

    while (filters.length) {
      const filter = filters.shift()!;
      const fn = this.filters[filter.name];
      if (!fn) {
        throw new Error(`filter \`${filter.name}\` not exits`);
      }
      input = fn.apply(
        context,
        [input].concat(
          filter.args.map((item: any) => {
            if (item?.type === 'mixed') {
              return item.body
                .map((item: any) =>
                  typeof item === 'string' ? item : this.evalute(item, data)
                )
                .join('');
            } else if (item.type) {
              return this.evalute(item, data);
            }
            return item;
          })
        )
      );
    }
    return input;
  }

  raw(ast: {type: 'raw'; value: string}) {
    return ast.value;
  }

  script(ast: {type: 'script'; body: any}, data: any) {
    const defaultFilter = this.options.defaultFilter;

    if (defaultFilter && ast.body?.type !== 'filter') {
      ast.body = {
        type: 'filter',
        input: ast.body,
        filters: [
          {
            name: defaultFilter.replace(/^\|\s/, ''),
            args: []
          }
        ]
      };
    }

    return this.evalute(ast.body, data);
  }

  expressionList(ast: {type: 'expression-list'; body: Array<any>}, data: any) {
    return ast.body.reduce((prev, current) => this.evalute(current, data));
  }

  template(ast: {type: 'template'; body: Array<any>}, data: any) {
    return ast.body.map(arg => this.evalute(arg, data)).join('');
  }

  templateRaw(ast: {type: 'template_raw'; value: any}) {
    return ast.value;
  }

  // 下标获取
  get(ast: {host: any; key: any}, data: any) {
    const host = this.evalute(ast.host, data);
    const key = this.evalute(ast.key, data);
    return host?.[key];
  }

  // 位操作如 +2 ~3 !
  unary(ast: {op: '+' | '-' | '~' | '!'; value: any}, data: any) {
    let value = this.evalute(ast.value, data);

    switch (ast.op) {
      case '+':
        return +value;
      case '-':
        return -value;
      case '~':
        return ~value;
      case '!':
        return !value;
    }
  }

  formatNumber(value: any, int = false) {
    const typeName = typeof value;
    if (typeName === 'string') {
      return (int ? parseInt(value, 10) : parseFloat(value)) || 0;
    } else if (typeName === 'number' && int) {
      return Math.round(value);
    }

    return value ?? 0;
  }

  power(ast: {left: any; right: any}, data: any) {
    const left = this.evalute(ast.left, data);
    const right = this.evalute(ast.right, data);
    return Math.pow(this.formatNumber(left), this.formatNumber(right));
  }

  multiply(ast: {left: any; right: any}, data: any) {
    const left = this.evalute(ast.left, data);
    const right = this.evalute(ast.right, data);
    return this.formatNumber(left) * this.formatNumber(right);
  }

  divide(ast: {left: any; right: any}, data: any) {
    const left = this.evalute(ast.left, data);
    const right = this.evalute(ast.right, data);
    return this.formatNumber(left) / this.formatNumber(right);
  }

  remainder(ast: {left: any; right: any}, data: any) {
    const left = this.evalute(ast.left, data);
    const right = this.evalute(ast.right, data);
    return this.formatNumber(left) % this.formatNumber(right);
  }

  add(ast: {left: any; right: any}, data: any) {
    const left = this.evalute(ast.left, data);
    const right = this.evalute(ast.right, data);
    return this.formatNumber(left) + this.formatNumber(right);
  }

  minus(ast: {left: any; right: any}, data: any) {
    const left = this.evalute(ast.left, data);
    const right = this.evalute(ast.right, data);
    return this.formatNumber(left) - this.formatNumber(right);
  }

  shift(ast: {op: '<<' | '>>' | '>>>'; left: any; right: any}, data: any) {
    const left = this.evalute(ast.left, data);
    const right = this.formatNumber(this.evalute(ast.right, data), true);

    if (ast.op === '<<') {
      return left << right;
    } else if (ast.op == '>>') {
      return left >> right;
    } else {
      return left >>> right;
    }
  }

  lt(ast: {left: any; right: any}, data: any) {
    const left = this.evalute(ast.left, data);
    const right = this.evalute(ast.right, data);

    // todo 如果是日期的对比，这个地方可以优化一下。

    return left < right;
  }

  gt(ast: {left: any; right: any}, data: any) {
    const left = this.evalute(ast.left, data);
    const right = this.evalute(ast.right, data);

    // todo 如果是日期的对比，这个地方可以优化一下。
    return left > right;
  }

  le(ast: {left: any; right: any}, data: any) {
    const left = this.evalute(ast.left, data);
    const right = this.evalute(ast.right, data);

    // todo 如果是日期的对比，这个地方可以优化一下。

    return left <= right;
  }

  ge(ast: {left: any; right: any}, data: any) {
    const left = this.evalute(ast.left, data);
    const right = this.evalute(ast.right, data);

    // todo 如果是日期的对比，这个地方可以优化一下。

    return left >= right;
  }

  eq(ast: {left: any; right: any}, data: any) {
    const left = this.evalute(ast.left, data);
    const right = this.evalute(ast.right, data);

    // todo 如果是日期的对比，这个地方可以优化一下。

    return left == right;
  }

  ne(ast: {left: any; right: any}, data: any) {
    const left = this.evalute(ast.left, data);
    const right = this.evalute(ast.right, data);

    // todo 如果是日期的对比，这个地方可以优化一下。

    return left != right;
  }

  streq(ast: {left: any; right: any}, data: any) {
    const left = this.evalute(ast.left, data);
    const right = this.evalute(ast.right, data);

    // todo 如果是日期的对比，这个地方可以优化一下。

    return left === right;
  }

  strneq(ast: {left: any; right: any}, data: any) {
    const left = this.evalute(ast.left, data);
    const right = this.evalute(ast.right, data);

    // todo 如果是日期的对比，这个地方可以优化一下。

    return left !== right;
  }

  binary(ast: {op: '&' | '^' | '|'; left: any; right: any}, data: any) {
    const left = this.evalute(ast.left, data);
    const right = this.evalute(ast.right, data);

    if (ast.op === '&') {
      return left & right;
    } else if (ast.op === '^') {
      return left ^ right;
    } else {
      return left | right;
    }
  }

  and(ast: {left: any; right: any}, data: any) {
    const left = this.evalute(ast.left, data);
    return left && this.evalute(ast.right, data);
  }

  or(ast: {left: any; right: any}, data: any) {
    const left = this.evalute(ast.left, data);
    return left || this.evalute(ast.right, data);
  }

  number(ast: {value: any; raw: string}, data: any) {
    // todo 以后可以在这支持大数字。
    return ast.value;
  }

  variable(ast: {name: string}, data: any) {
    return ast.name === '&' ? data : data[ast.name];
  }

  identifier(ast: {name: string}, data: any) {
    return ast.name;
  }

  array(ast: {type: 'array'; members: Array<any>}, data: any) {
    return ast.members.map(member => this.evalute(member, data));
  }

  literal(ast: {type: 'literal'; value: any}) {
    return ast.value;
  }

  string(ast: {type: 'string'; value: string}) {
    return ast.value;
  }

  object(ast: {members: Array<{key: string; value: any}>}, data: any) {
    let object: any = {};
    ast.members.forEach(({key, value}) => {
      object[this.evalute(key)] = this.evalute(value, data);
    });
    return object;
  }

  conditional(
    ast: {type: 'conditional'; test: any; consequent: any; alternate: any},
    data: any
  ) {
    return this.evalute(ast.test, data)
      ? this.evalute(ast.consequent, data)
      : this.evalute(ast.alternate, data);
  }

  funcCall(this: any, ast: {identifier: string; args: Array<any>}, data: any) {
    const fnName = `fn${ast.identifier}`;
    const fn =
      this.functions[fnName] || this[fnName] || this.filters[ast.identifier];

    if (!fn) {
      throw new Error(`${ast.identifier}函数没有定义`);
    }

    let args: Array<any> = ast.args;

    // 逻辑函数特殊处理，因为有时候有些运算是可以跳过的。
    if (~['IF', 'AND', 'OR', 'XOR', 'IFS'].indexOf(ast.identifier)) {
      args = args.map(a => () => this.evalute(a, data));
    } else {
      args = args.map(a => this.evalute(a, data));
    }

    return fn.apply(this, args);
  }

  // 逻辑函数

  fnIF(condition: () => any, trueValue: () => any, falseValue: () => any) {
    return condition() ? trueValue() : falseValue();
  }

  fnAND(...condtions: Array<() => any>) {
    return condtions.every(c => c());
  }

  fnOR(...condtions: Array<() => any>) {
    return condtions.some(c => c());
  }

  fnXOR(c1: () => any, c2: () => any) {
    return !!c1() === !!c2();
  }

  fnIFS(...args: Array<() => any>) {
    if (args.length % 2) {
      args.splice(args.length - 1, 0, () => true);
    }

    while (args.length) {
      const c = args.shift()!;
      const v = args.shift()!;

      if (c()) {
        return v();
      }
    }
    return;
  }

  // 数学函数

  fnABS(a: number) {
    return Math.abs(a);
  }

  fnMax(...args: Array<any>) {
    return Math.max.apply(Math, args);
  }

  fnMin(...args: Array<number>) {
    return Math.min.apply(Math, args);
  }

  fnSUM(...args: Array<number>) {
    return args.reduce((sum, a) => sum + this.formatNumber(a) || 0, 0);
  }

  fnINT(n: number) {
    return Math.floor(n);
  }

  fnMOD(a: number, b: number) {
    return a % b;
  }

  fnPI() {
    return Math.PI;
  }

  fnROUND(a: number, b: number) {
    const bResult = Math.round(b);

    if (bResult) {
      const c = Math.pow(10, bResult);
      return Math.round(a * c) / c;
    }

    return Math.round(a);
  }

  fnSQRT(n: number) {
    return Math.sqrt(n);
  }

  fnAVG(...args: Array<any>) {
    return this.fnSUM.apply(this, args) / args.length;
  }

  fnUPPERMONEY() {
    return 'todo';
  }

  fnRAND() {
    return Math.random();
  }

  // 文本函数

  normalizeText(raw: any) {
    if (raw instanceof Date) {
      return moment(raw).format();
    }

    return `${raw}`;
  }

  fnLEFT(text: string, len: number) {
    text = this.normalizeText(text);
    return text.substring(0, len);
  }

  fnRIGHT(text: string, len: number) {
    text = this.normalizeText(text);
    return text.substring(text.length - len, text.length);
  }

  fnLEN(text: string) {
    text = this.normalizeText(text);
    return text?.length;
  }

  fnISEMPTY(text: string) {
    return !text || !String(text).trim();
  }

  fnCONCATENATE(...args: Array<any>) {
    return args.join('');
  }

  fnCHAR(code: number) {
    return String.fromCharCode(code);
  }

  fnLOWER(text: string) {
    text = this.normalizeText(text);
    return text.toLowerCase();
  }

  fnUPPER(text: string) {
    text = this.normalizeText(text);
    return text.toUpperCase();
  }

  fnSPLIT(text: string, sep: string) {
    text = this.normalizeText(text);
    return text.split(sep);
  }

  fnTRIM(text: string) {
    text = this.normalizeText(text);
    return text.trim();
  }

  fnSTARTSWITH(text: string, search: string) {
    if (!search) {
      return false;
    }

    text = this.normalizeText(text);
    return text.indexOf(search) === 0;
  }

  fnCONTAINS(text: string, search: string) {
    if (!search) {
      return false;
    }

    text = this.normalizeText(text);
    return !!~text.indexOf(search);
  }

  fnREPLACE(text: string, search: string, replace: string) {
    text = this.normalizeText(text);
    let result = text;

    while (true) {
      const idx = result.indexOf(search);

      if (!~idx) {
        break;
      }

      result =
        result.substring(0, idx) +
        replace +
        result.substring(idx + search.length);
    }

    return result;
  }

  fnSEARCH(text: string, search: string, start?: number) {
    text = this.normalizeText(text);
    start = start || 0;
    let str = text;

    if (start) {
      str = str.substring(start);
    }

    const idx = str.indexOf(search);
    if (~idx) {
      return idx + search;
    }

    return -1;
  }

  fnMID(text: string, from: number, len: number) {
    text = this.normalizeText(text);
    return text.substring(from, from + len);
  }

  // 日期函数
  fnDATE(
    year: number,
    month: number,
    day: number,
    hour: number,
    minute: number,
    second: number
  ) {
    if (month === undefined) {
      return new Date(year);
    }

    return new Date(year, month, day, hour, minute, second);
  }

  fnTIMESTAMP(date: Date, format?: 'x' | 'X') {
    return parseInt(moment(date).format(format === 'x' ? 'x' : 'X'), 10);
  }

  fnTODAY() {
    return new Date();
  }

  fnNOW() {
    return new Date();
  }

  fnSTARTOF(date: Date, unit?: any) {
    return moment(date)
      .startOf(unit || 'day')
      .toDate();
  }

  fnENDOF(date: Date, unit?: any) {
    return moment(date)
      .endOf(unit || 'day')
      .toDate();
  }

  normalizeDate(raw: any): Date {
    if (typeof raw === 'string') {
      const formats = ['', 'YYYY-MM-DD HH:mm:ss'];

      while (formats.length) {
        const format = formats.shift()!;
        const date = moment(raw, format);

        if (date.isValid()) {
          return date.toDate();
        }
      }
    } else if (typeof raw === 'number') {
      return new Date(raw);
    }

    return raw;
  }

  fnYEAR(date: Date) {
    date = this.normalizeDate(date);
    return date.getFullYear();
  }

  fnMONTH(date: Date) {
    date = this.normalizeDate(date);
    return date.getMonth() + 1;
  }

  fnDAY(date: Date) {
    date = this.normalizeDate(date);
    return date.getDate();
  }

  fnHOUR(date: Date) {
    date = this.normalizeDate(date);
    return date.getHours();
  }

  fnHMINUTE(date: Date) {
    date = this.normalizeDate(date);
    return date.getMinutes();
  }

  fnSECOND(date: Date) {
    date = this.normalizeDate(date);
    return date.getSeconds();
  }

  fnYEARS(endDate: Date, startDate: Date) {
    endDate = this.normalizeDate(endDate);
    startDate = this.normalizeDate(startDate);
    return moment(endDate).diff(moment(startDate), 'year');
  }

  fnMINUTES(endDate: Date, startDate: Date) {
    endDate = this.normalizeDate(endDate);
    startDate = this.normalizeDate(startDate);
    return moment(endDate).diff(moment(startDate), 'minutes');
  }

  fnDAYS(endDate: Date, startDate: Date) {
    endDate = this.normalizeDate(endDate);
    startDate = this.normalizeDate(startDate);
    return moment(endDate).diff(moment(startDate), 'days');
  }

  fnHOURS(endDate: Date, startDate: Date) {
    endDate = this.normalizeDate(endDate);
    startDate = this.normalizeDate(startDate);
    return moment(endDate).diff(moment(startDate), 'hour');
  }

  fnDATEMODIFY(date: Date, num: number, format: any) {
    date = this.normalizeDate(date);
    return moment(date).add(num, format).toDate();
  }

  fnSTRTODATE(value: any, format: string = '') {
    return moment(value, format).toDate();
  }

  fnISBEFORE(a: Date, b: Date, unit: any = 'day') {
    a = this.normalizeDate(a);
    b = this.normalizeDate(b);
    return moment(a).isBefore(moment(b), unit);
  }

  fnISAFTER(a: Date, b: Date, unit: any = 'day') {
    a = this.normalizeDate(a);
    b = this.normalizeDate(b);
    return moment(a).isAfter(moment(b), unit);
  }

  fnISSAMEORBEFORE(a: Date, b: Date, unit: any = 'day') {
    a = this.normalizeDate(a);
    b = this.normalizeDate(b);
    return moment(a).isSameOrBefore(moment(b), unit);
  }

  fnISSAMEORAFTER(a: Date, b: Date, unit: any = 'day') {
    a = this.normalizeDate(a);
    b = this.normalizeDate(b);
    return moment(a).isSameOrAfter(moment(b), unit);
  }

  fnCOUNT(value: any) {
    return Array.isArray(value) ? value.length : value ? 1 : 0;
  }
}
