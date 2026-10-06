'use strict';

const fill = require('fill-range');
const utils = require('./utils');
const guard = require('./guard');

const compile = (ast, options = {}) => {
  guard.ast(ast);
  const walk = (node, parent = {}) => {
    const invalidBlock = utils.isInvalidBrace(parent);
    const invalidNode = node.invalid === true && options.escapeInvalid === true;
    const invalid = invalidBlock === true || invalidNode === true;
    const prefix = options.escapeInvalid === true ? '\\' : '';
    let output = '';
    let outputBytes = 0;

    if (node.isOpen === true) {
      return prefix + node.value;
    }

    if (node.isClose === true) {
      return prefix + node.value;
    }

    if (node.type === 'open') {
      return invalid ? prefix + node.value : '(';
    }

    if (node.type === 'close') {
      return invalid ? prefix + node.value : ')';
    }

    if (node.type === 'comma') {
      return node.prev.type === 'comma' ? '' : invalid ? node.value : '|';
    }

    if (node.value) {
      return node.value;
    }

    if (node.nodes && node.ranges > 0) {
      const args = utils.reduce(node.nodes);
      const rangeOptions = { ...options, wrap: false, toRegex: true, strictZeros: true };
      guard.range(args, rangeOptions);
      const range = fill(...args, rangeOptions);

      if (range.length !== 0) {
        const result = args.length > 1 && range.length > 1 ? `(${range})` : range;
        guard.outputText(Buffer.byteLength(String(result), 'utf8'));
        return result;
      }
    }

    if (node.nodes) {
      for (const child of node.nodes) {
        const value = walk(child, node);
        outputBytes += Buffer.byteLength(String(value), 'utf8');
        // Check the cumulative parent output before retaining another child.
        guard.outputText(outputBytes);
        output += value;
      }
    }

    return output;
  };

  const result = walk(ast);
  guard.outputText(Buffer.byteLength(String(result), 'utf8'));
  return result;
};

module.exports = compile;
