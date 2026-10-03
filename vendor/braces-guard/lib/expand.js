'use strict';

const fill = require('fill-range');
const stringify = require('./stringify');
const utils = require('./utils');
const guard = require('./guard');

const append = (queue = '', stash = '', enclose = false) => {
  queue = guard.flattenOutput(queue);
  stash = guard.flattenOutput(stash);
  if (!stash.length) return queue;
  if (!queue.length) {
    const result = enclose ? stash.map(ele => `{${ele}}`) : stash;
    return guard.flattenOutput(result);
  }
  // Check product size and total text before allocating any Cartesian results.
  guard.product(queue, stash, enclose);
  const result = [];
  for (const item of queue) {
    for (let ele of stash) {
      if (enclose === true && typeof ele === 'string') ele = `{${ele}}`;
      result.push(item + ele);
    }
  }
  return result;
};

const expand = (ast, options = {}) => {
  guard.ast(ast);
  const rangeLimit = options.rangeLimit === undefined ? 1000 : options.rangeLimit;
  const queueSizes = new WeakMap();
  const valueSizes = new WeakMap();
  const measure = value => {
    if (Array.isArray(value) && valueSizes.has(value)) return valueSizes.get(value);
    const values = guard.flattenOutput(value);
    const size = {
      count: values.length,
      textLength: values.reduce((sum, item) => sum + Buffer.byteLength(String(item), 'utf8'), 0)
    };
    if (Array.isArray(value)) valueSizes.set(value, size);
    return size;
  };
  const queueSize = queue => {
    if (!queueSizes.has(queue)) queueSizes.set(queue, measure(queue));
    return queueSizes.get(queue);
  };
  const push = (queue, value) => {
    const current = queueSize(queue);
    const incoming = measure(value);
    // Comma alternatives accumulate before the final flatten. Check every
    // retained addition, including nested array results, before pushing it.
    guard.outputSize(current.count + incoming.count, current.textLength + incoming.textLength);
    queue.push(value);
    current.count += incoming.count;
    current.textLength += incoming.textLength;
    valueSizes.delete(queue);
  };
  const pop = queue => {
    const current = queueSize(queue);
    const value = queue.pop();
    const removed = measure(value);
    current.count -= removed.count;
    current.textLength -= removed.textLength;
    valueSizes.delete(queue);
    return value;
  };


  const walk = (node, parent = {}) => {
    node.queue = [];

    let p = parent;
    let q = parent.queue;

    while (p.type !== 'brace' && p.type !== 'root' && p.parent) {
      p = p.parent;
      q = p.queue;
    }

    if (node.invalid || node.dollar) {
      push(q, append(pop(q), stringify(node, options)));
      return;
    }

    if (node.type === 'brace' && node.invalid !== true && node.nodes.length === 2) {
      push(q, append(pop(q), ['{}']));
      return;
    }

    if (node.nodes && node.ranges > 0) {
      const args = utils.reduce(node.nodes);

      if (utils.exceedsLimit(...args, options.step, rangeLimit)) {
        throw new RangeError('expanded array length exceeds range limit. Use options.rangeLimit to increase or disable the limit.');
      }

      guard.range(args, options);
      let range = fill(...args, options);
      if (range.length === 0) {
        range = stringify(node, options);
      }

      push(q, append(pop(q), range));
      node.nodes = [];
      return;
    }

    const enclose = utils.encloseBrace(node);
    let queue = node.queue;
    let block = node;

    while (block.type !== 'brace' && block.type !== 'root' && block.parent) {
      block = block.parent;
      queue = block.queue;
    }

    for (let i = 0; i < node.nodes.length; i++) {
      const child = node.nodes[i];

      if (child.type === 'comma' && node.type === 'brace') {
        if (i === 1) push(queue, '');
        push(queue, '');
        continue;
      }

      if (child.type === 'close') {
        push(q, append(pop(q), queue, enclose));
        continue;
      }

      if (child.value && child.type !== 'open') {
        push(queue, append(pop(queue), child.value));
        continue;
      }

      if (child.nodes) {
        walk(child, node);
      }
    }

    return queue;
  };

  return guard.flattenOutput(walk(ast));
};

module.exports = expand;
