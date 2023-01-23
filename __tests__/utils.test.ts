import { Utils } from '../src/';

const { attributeArrayToReactProps } = Utils;

describe('attributeArrayToReactProps function', () => {
  test('Returns an empty object by default', () => {
    expect(attributeArrayToReactProps()).toEqual({});
  });

  test('Returns an empty object for an empty input', () => {
    expect(attributeArrayToReactProps([])).toEqual({});
  });

  test('Returns an object with one entry', () => {
    expect(attributeArrayToReactProps(['key', 'value'])).toEqual({ key: 'value' });
  });

  test('Returns an object with one entry when only given a key', () => {
    expect(attributeArrayToReactProps(['key'])).toEqual({ key: '' });
  });

  test('Returns an object with one empty entry when given an odd number of inputs', () => {
    expect(attributeArrayToReactProps(['key1', 'value1', 'key2'])).toEqual({ key1: 'value1', key2: '' });
  });

  test('Returns an object of keys from an array of inputs', () => {
    expect(attributeArrayToReactProps(['key1', 'value1', 'key2', 'value2', 'key3', 'value3'])).toEqual({
      key1: 'value1',
      key2: 'value2',
      key3: 'value3',
    });
  });

  test('Returns an object containing string values for non-string-looking inputs', () => {
    expect(attributeArrayToReactProps(['string', 'string', 'number', '1', 'boolean', 'true'])).toEqual({
      string: 'string',
      number: '1',
      boolean: 'true',
    });
  });
});
