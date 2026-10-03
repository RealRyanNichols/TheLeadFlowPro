'use strict';

// Local fork: preflight uses explicit stacks, before any upstream recursive
// walker. Limits cannot be raised by caller options. Parent/prev links in a
// parsed tree are normal; only parent-chain cycles and child-path cycles fail.
const MAX_DEPTH = 128;
const MAX_VISITS = 16384;
const MAX_TEXT_LENGTH = 10000;
const MAX_TOTAL_TEXT = 1048576;
const MAX_OUTPUTS = 10000;

const fail = (code, message) => {
  const error = new RangeError(`braces guard: ${message}`);
  error.code = code;
  throw error;
};

const depth = value => {
  if (value > MAX_DEPTH) fail('ERR_BRACES_DEPTH', `AST depth exceeds ${MAX_DEPTH}`);
};
const visits = value => {
  if (value > MAX_VISITS) fail('ERR_BRACES_VISITS', `traversal exceeds ${MAX_VISITS} visits`);
};

const ast = root => {
  const active = new WeakSet();
  const parentDepths = new WeakMap();
  let visited = 0;
  let textLength = 0;
  const step = () => visits(++visited);
  const nodeObject = node => {
    if (!node || typeof node !== 'object' || Array.isArray(node)) {
      throw new TypeError('braces guard: expected an AST node');
    }
  };

  const checkParents = node => {
    const chain = [];
    const seen = new WeakSet();
    let parent = node;
    while (parent != null && !parentDepths.has(parent)) {
      nodeObject(parent);
      if (seen.has(parent)) fail('ERR_BRACES_CYCLE', 'cyclic AST parent chain');
      seen.add(parent);
      step();
      chain.push(parent);
      depth(chain.length - 1);
      parent = parent.parent;
    }
    let height = parent == null ? -1 : parentDepths.get(parent);
    for (let i = chain.length - 1; i >= 0; i--) {
      depth(++height);
      parentDepths.set(chain[i], height);
    }
  };

  const stack = [{ node: root, depth: 0, index: -1 }];
  while (stack.length) {
    const frame = stack[stack.length - 1];
    const node = frame.node;
    if (frame.index === -1) {
      nodeObject(node);
      if (active.has(node)) fail('ERR_BRACES_CYCLE', 'cyclic AST child path');
      depth(frame.depth);
      step();
      checkParents(node);
      if (node.value !== undefined) {
        if (typeof node.value !== 'string') throw new TypeError('braces guard: AST values must be strings');
        textLength += Buffer.byteLength(node.value, 'utf8');
        if (node.value.length > MAX_TEXT_LENGTH || textLength > MAX_TOTAL_TEXT) {
          fail('ERR_BRACES_TEXT', 'AST text exceeds the bounded text budget');
        }
      }
      if (node.nodes !== undefined && !Array.isArray(node.nodes)) {
        throw new TypeError('braces guard: AST nodes must be an array');
      }
      if (node.nodes) visits(node.nodes.length);
      active.add(node);
      frame.index = 0;
    }
    if (!node.nodes || frame.index >= node.nodes.length) {
      active.delete(node);
      stack.pop();
      continue;
    }
    const child = node.nodes[frame.index++];
    stack.push({ node: child, depth: frame.depth + 1, index: -1 });
  }
};

// Count UTF-8 bytes before retaining generated outputs. The limit
// is shared by Cartesian products, ranges, flattening and pattern-list results.
const outputSize = (count, textLength) => {
  if (count > MAX_OUTPUTS || textLength > MAX_TOTAL_TEXT) {
    fail('ERR_BRACES_OUTPUT', 'retained expansion queue exceeds the bounded output budget');
  }
};

const outputText = length => {
  if (length > MAX_TOTAL_TEXT) fail('ERR_BRACES_OUTPUT', 'compiled output exceeds the 1 MiB text budget');
};

const outputBudget = () => {
  let count = 0;
  let textLength = 0;
  return value => {
    if (++count > MAX_OUTPUTS) fail('ERR_BRACES_OUTPUT', `expansion exceeds ${MAX_OUTPUTS} outputs`);
    textLength += Buffer.byteLength(String(value), 'utf8');
    if (textLength > MAX_TOTAL_TEXT) fail('ERR_BRACES_OUTPUT', 'expansion exceeds the 1 MiB text budget');
  };
};

const flattenOutput = values => {
  const result = [];
  const budget = outputBudget();
  const active = new WeakSet();
  const stack = [{ values: Array.isArray(values) ? values : [values], index: 0 }];
  let visited = 0;
  active.add(stack[0].values);
  while (stack.length) {
    const frame = stack[stack.length - 1];
    if (frame.index === frame.values.length) {
      active.delete(frame.values);
      stack.pop();
      continue;
    }
    visits(++visited);
    const value = frame.values[frame.index++];
    if (Array.isArray(value)) {
      if (active.has(value)) fail('ERR_BRACES_CYCLE', 'cyclic generated output');
      depth(stack.length);
      visits(value.length);
      active.add(value);
      stack.push({ values: value, index: 0 });
    } else if (value !== undefined) {
      budget(value);
      result.push(value);
    }
  }
  return result;
};

const product = (queue, stash, enclose) => {
  const count = queue.length * stash.length;
  const sum = values => values.reduce((total, value) => total + Buffer.byteLength(String(value), 'utf8'), 0);
  const textLength = sum(queue) * stash.length + sum(stash) * queue.length + (enclose ? 2 * count : 0);
  if (count > MAX_OUTPUTS || textLength > MAX_TOTAL_TEXT) {
    fail('ERR_BRACES_OUTPUT', 'Cartesian expansion exceeds the bounded output budget');
  }
};

const range = (args, options) => {
  const [start, end] = args;
  const number = value => typeof value === 'string' && Number.isInteger(Number(value));
  const numeric = number(start) && number(end);
  const letter = value => typeof value === 'string' && (number(value) || value.length === 1);
  if (!numeric && !(letter(start) && letter(end))) return;
  const first = numeric ? Number(start) : start.charCodeAt(0);
  const last = numeric ? Number(end) : end.charCodeAt(0);
  if (numeric && (!Number.isSafeInteger(first) || !Number.isSafeInteger(last))) {
    fail('ERR_BRACES_OUTPUT', 'range endpoints must be safe integers');
  }
  // Mirror fill-range's falsy fallback, object-step handling and zero-to-one
  // normalization. NaN/false/null and string "0" otherwise bypass a preflight.
  let requestedStep = args[2] || options.step || 1;
  let effectiveOptions = options;
  if (requestedStep && typeof requestedStep === 'object' && !Array.isArray(requestedStep)) {
    // fill-range recursively uses an object-valued step as replacement options.
    // In compile this can discard the forced toRegex and allocate an array.
    effectiveOptions = requestedStep;
    requestedStep = 1;
  }
  const value = Number(requestedStep);
  // Invalid steps retain upstream validation and produce no large range.
  if (!Number.isInteger(value)) return;
  const step = Math.max(Math.abs(value), 1);
  const width = numeric ? Math.max(String(start).length, String(end).length, String(requestedStep).length) : 3;
  // The ordinary unstepped regex form is compact; stepped regexes enumerate.
  if (effectiveOptions.toRegex === true && step === 1) {
    if (width > MAX_TEXT_LENGTH) fail('ERR_BRACES_OUTPUT', 'range padding exceeds the bounded text budget');
    return;
  }
  const count = Math.floor(Math.abs(last - first) / step) + 1;
  if (count > MAX_OUTPUTS || count * width > MAX_TOTAL_TEXT) {
    fail('ERR_BRACES_OUTPUT', 'range expansion exceeds the bounded output budget');
  }
};

module.exports = { ast, depth, visits, outputBudget, outputSize, outputText, flattenOutput, product, range, MAX_DEPTH, MAX_VISITS };
