import moment from 'moment';
import transform from 'lodash/transform';
import groupBy from 'lodash/groupBy';
import uniqBy from 'lodash/uniqBy';
import uniq from 'lodash/uniq';
import {
  createObject,
  escapeHtml,
  filterDate,
  formatDuration,
  isObject,
  keyToPath,
  pickValues,
  prettyBytes,
  resolveVariable,
  setVariable,
  string2regExp,
  stripNumber,
  tokenize
} from './util';

function makeSorter(
  key: string,
  method?: 'alpha' | 'numerical',
  order?: 'desc' | 'asc'
) {
  return function (a: any, b: any) {
    if (!a || !b) {
      return 0;
    }

    const va = resolveVariable(key, a);
    const vb = resolveVariable(key, b);
    let result = 0;

    if (method === 'numerical') {
      result = (parseFloat(va) || 0) - (parseFloat(vb) || 0);
    } else {
      result = String(va).localeCompare(String(vb));
    }

    return result * (order === 'desc' ? -1 : 1);
  };
}

export const filters: {
  [propName: string]: (input: any, ...args: any[]) => any;
} = {
  map: (input: Array<unknown>, fn: string, ...arg: any) =>
    Array.isArray(input) && filters[fn]
      ? input.map(item => filters[fn].call(this, item, ...arg))
      : input,
  html: (input: string) => escapeHtml(input),
  json: (input, tabSize: number | string = 2) =>
    tabSize
      ? JSON.stringify(input, null, parseInt(tabSize as string, 10))
      : JSON.stringify(input),
  toJson: input => {
    let ret;
    try {
      ret = JSON.parse(input);
    } catch (e) {
      ret = null;
    }
    return ret;
  },
  toInt: input => (typeof input === 'string' ? parseInt(input, 10) : input),
  toFloat: input => (typeof input === 'string' ? parseFloat(input) : input),
  raw: input => input,
  now: () => new Date(),
  toDate: (input: any, inputFormat = '') => {
    const data = moment(input, inputFormat);
    data.add();
    return data.isValid() ? data.toDate() : undefined;
  },
  fromNow: (input: any, inputFormat = '') =>
    moment(input, inputFormat).fromNow(),
  dateModify: (
    input: any,
    modifier: 'add' | 'subtract' | 'endOf' | 'startOf' = 'add',
    amount = 0,
    unit = 'days'
  ) => {
    if (!(input instanceof Date)) {
      input = new Date();
    }

    if (modifier === 'endOf' || modifier === 'startOf') {
      return moment(input)
        [modifier === 'endOf' ? 'endOf' : 'startOf'](amount || 'day')
        .toDate();
    }

    return moment(input)
      [modifier === 'add' ? 'add' : 'subtract'](parseInt(amount, 10) || 0, unit)
      .toDate();
  },
  date: (input, format = 'LLL', inputFormat = 'X') =>
    moment(input, inputFormat).format(format),
  number: input => {
    let parts = String(input).split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  },
  trim: input => (typeof input === 'string' ? input.trim() : input),
  percent: (input, decimals = 0) => {
    input = parseFloat(input) || 0;
    decimals = parseInt(decimals, 10) || 0;

    let whole = input * 100;
    let multiplier = Math.pow(10, decimals);

    return (
      (Math.round(whole * multiplier) / multiplier).toFixed(decimals) + '%'
    );
  },
  duration: input => (input ? formatDuration(input) : input),
  bytes: input => (input ? prettyBytes(parseFloat(input)) : input),
  round: (input, decimals = 2) => {
    if (isNaN(input)) {
      return 0;
    }

    decimals = parseInt(decimals, 10) ?? 2;

    let multiplier = Math.pow(10, decimals);
    return (Math.round(input * multiplier) / multiplier).toFixed(decimals);
  },
  truncate: (input, length, end) => {
    if (typeof input !== 'string') {
      return input;
    }

    end = end || '...';

    if (length == null) {
      return input;
    }

    length = parseInt(length, 10) || 200;

    return input.substring(0, length) + (input.length > length ? end : '');
  },
  url_encode: input => encodeURIComponent(input),
  url_decode: input => decodeURIComponent(input),
  default: (input, defaultValue, strict = false) =>
    (strict ? input : input ? input : undefined) ??
    (() => {
      try {
        if (defaultValue === 'undefined') {
          return undefined;
        }

        return JSON.parse(defaultValue);
      } catch (e) {
        return defaultValue;
      }
    })(),
  join: (input, glue) => (input && input.join ? input.join(glue) : input),
  split: (input, delimiter = ',') =>
    typeof input === 'string' ? input.split(delimiter) : input,
  sortBy: (
    input: any,
    key: string,
    method: 'alpha' | 'numerical' = 'alpha',
    order?: 'asc' | 'desc'
  ) =>
    Array.isArray(input) ? input.sort(makeSorter(key, method, order)) : input,
  objectToArray: (
    input: any,
    label: string = 'label',
    value: string = 'value'
  ) =>
    transform(
      input,
      (result: any, v, k) => {
        (result || (result = [])).push({
          [label]: v,
          [value]: k
        });
      },
      []
    ),
  unique: (input: any, key?: string) =>
    Array.isArray(input) ? (key ? uniqBy(input, key) : uniq(input)) : input,
  topAndOther: (
    input: any,
    len: number = 10,
    labelField: string = 'name',
    restLabel = '其他'
  ) => {
    if (Array.isArray(input) && len) {
      const grouped = groupBy(input, (item: any) => {
        const index = input.indexOf(item) + 1;
        return index >= len ? len : index;
      });

      return Object.keys(grouped).map((key, index) => {
        const group = grouped[key];
        const obj = group.reduce((obj, item) => {
          Object.keys(item).forEach(key => {
            if (!obj.hasOwnProperty(key) || key === 'labelField') {
              obj[key] = item[key];
            } else if (
              typeof item[key] === 'number' &&
              typeof obj[key] === 'number'
            ) {
              obj[key] += item[key];
            } else if (
              typeof item[key] === 'string' &&
              /^(?:\-|\.)\d/.test(item[key]) &&
              typeof obj[key] === 'number'
            ) {
              obj[key] += parseFloat(item[key]) || 0;
            } else if (
              typeof item[key] === 'string' &&
              typeof obj[key] === 'string'
            ) {
              obj[key] += `, ${item[key]}`;
            } else {
              obj[key] = item[key];
            }
          });

          return obj;
        }, {});

        if (index === len - 1) {
          obj[labelField] = restLabel || '其他';
        }
        return obj;
      });
    }
    return input;
  },
  first: input => input && input[0],
  nth: (input, nth = 0) => input && input[nth],
  last: input => input && (input.length ? input[input.length - 1] : null),
  minus(input, step = 1) {
    return stripNumber(
      (Number(input) || 0) - Number(getStrOrVariable(step, this.data))
    );
  },
  plus(input, step = 1) {
    return stripNumber(
      (Number(input) || 0) + Number(getStrOrVariable(step, this))
    );
  },
  times(input, step = 1) {
    return stripNumber(
      (Number(input) || 0) * Number(getStrOrVariable(step, this))
    );
  },
  division(input, step = 1) {
    return stripNumber(
      (Number(input) || 0) / Number(getStrOrVariable(step, this))
    );
  },
  count: (input: any) =>
    Array.isArray(input) || typeof input === 'string' ? input.length : 0,
  sum: (input, field) => {
    if (!Array.isArray(input)) {
      return input;
    }
    const restult = input.reduce(
      (sum, item) =>
        sum + (parseFloat(field ? pickValues(field, item) : item) || 0),
      0
    );
    return stripNumber(restult);
  },
  abs: (input: any) => (typeof input === 'number' ? Math.abs(input) : input),
  pick: (input, path = '&') =>
    Array.isArray(input) && !/^\d+$/.test(path)
      ? input.map((item, index) =>
          pickValues(path, createObject({index}, item))
        )
      : pickValues(path, input),
  pick_if_exist: (input, path = '&') =>
    Array.isArray(input)
      ? input.map(item => resolveVariable(path, item) || item)
      : resolveVariable(path, input) || input,
  str2date: function (input, inputFormat = 'X', outputFormat = 'X') {
    return input
      ? filterDate(input, this, inputFormat).format(outputFormat)
      : '';
  },
  asArray: input => (Array.isArray(input) ? input : input ? [input] : input),
  concat(input, ...args: any[]) {
    return Array.isArray(input)
      ? input.concat(...args.map(arg => getStrOrVariable(arg, this)))
      : input;
  },
  filter: function (input, keys, expOrDirective, arg1) {
    if (!Array.isArray(input) || !keys || !expOrDirective) {
      return input;
    }

    let directive = expOrDirective;
    let fn: (value: any, key: string, item: any) => boolean = () => true;

    if (directive === 'isTrue') {
      fn = value => !!value;
    } else if (directive === 'isFalse') {
      fn = value => !value;
    } else if (directive === 'isExists') {
      fn = value => typeof value !== 'undefined';
    } else if (directive === 'equals' || directive === 'equal') {
      arg1 = arg1 ? getStrOrVariable(arg1, this) : '';
      fn = value => arg1 == value;
    } else if (directive === 'isIn') {
      let list: any = arg1 ? getStrOrVariable(arg1, this) : [];

      list = str2array(list);
      list = Array.isArray(list) ? list : list ? [list] : [];
      fn = value => (list.length ? !!~list.indexOf(value) : true);
    } else if (directive === 'notIn') {
      let list: Array<any> = arg1 ? getStrOrVariable(arg1, this) : [];
      list = str2array(list);
      list = Array.isArray(list) ? list : list ? [list] : [];
      fn = value => !~list.indexOf(value);
    } else {
      if (directive !== 'match') {
        directive = 'match';
        arg1 = expOrDirective;
      }
      arg1 = arg1 ? getStrOrVariable(arg1, this) : '';

      // 比对的值是空时直接返回。
      if (!arg1) {
        return input;
      }

      let reg = string2regExp(`${arg1}`, false);
      fn = value => reg.test(String(value));
    }

    // 判断keys是否为*
    const isAsterisk = /\s*\*\s*/.test(keys);
    keys = keys.split(/\s*,\s*/);
    return input.filter((item: any) =>
      // 当keys为*时从item中获取key
      (isAsterisk ? Object.keys(item) : keys).some((key: string) =>
        fn(resolveVariable(key, item), key, item)
      )
    );
  },
  base64Encode(str) {
    return btoa(
      encodeURIComponent(str).replace(
        /%([0-9A-F]{2})/g,
        function toSolidBytes(match, p1) {
          return String.fromCharCode(('0x' + p1) as any);
        }
      )
    );
  },

  base64Decode(str) {
    return decodeURIComponent(
      atob(str)
        .split('')
        .map(function (c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join('')
    );
  },

  lowerCase: input =>
    input && typeof input === 'string' ? input.toLowerCase() : input,
  upperCase: input =>
    input && typeof input === 'string' ? input.toUpperCase() : input,

  isTrue(input, trueValue, falseValue) {
    return getConditionValue(input, !!input, trueValue, falseValue, this);
  },
  isFalse(input, trueValue, falseValue) {
    return getConditionValue(input, !input, trueValue, falseValue, this);
  },
  isMatch(input, matchArg, trueValue, falseValue) {
    matchArg = getStrOrVariable(matchArg, this as any);
    return getConditionValue(
      input,
      matchArg && string2regExp(`${matchArg}`, false).test(String(input)),
      trueValue,
      falseValue,
      this
    );
  },
  notMatch(input, matchArg, trueValue, falseValue) {
    matchArg = getStrOrVariable(matchArg, this as any);
    return getConditionValue(
      input,
      matchArg && !string2regExp(`${matchArg}`, false).test(String(input)),
      trueValue,
      falseValue,
      this
    );
  },
  isEquals(input, equalsValue, trueValue, falseValue) {
    equalsValue = /^\d+$/.test(equalsValue)
      ? parseInt(equalsValue, 10)
      : getStrOrVariable(equalsValue, this as any);
    return getConditionValue(
      input,
      input === equalsValue,
      trueValue,
      falseValue,
      this
    );
  },
  notEquals(input, equalsValue, trueValue, falseValue) {
    equalsValue = /^\d+$/.test(equalsValue)
      ? parseInt(equalsValue, 10)
      : getStrOrVariable(equalsValue, this as any);
    return getConditionValue(
      input,
      input !== equalsValue,
      trueValue,
      falseValue,
      this
    );
  }
};

/**
 * 如果当前传入字符为：'xxx'或者"xxx"，则返回字符xxx
 * 否则去数据域中，获取变量xxx
 *
 * @param value 传入字符
 * @param data 数据域
 */
function getStrOrVariable(value: any, data: any) {
  return typeof value === 'string' && /,/.test(value)
    ? value.split(/\s*,\s*/).filter(item => item)
    : typeof value === 'string'
    ? resolveVariable(value, data)
    : value;
}

function str2array(list: any) {
  if (list && typeof list === 'string') {
    if (/^\[.*\]$/.test(list)) {
      return list
        .substring(1, list.length - 1)
        .split(/\s*,\s*/)
        .filter(item => item);
    } else {
      return list.split(/\s*,\s*/).filter(item => item);
    }
  }
  return list;
}

function getConditionValue(
  input: string,
  isTrue: boolean,
  trueValue: string,
  falseValue: string,
  data: any
) {
  return isTrue || (!isTrue && falseValue)
    ? getStrOrVariable(isTrue ? trueValue : falseValue, data)
    : input;
}

export function registerFilter(
  name: string,
  fn: (input: any, ...args: any[]) => any
): void {
  filters[name] = fn;
}

export function getFilters() {
  return filters;
}
