'use strict';
/**
 * Seed script: 20 JavaScript questions (10 hard, 10 medium).
 * Run: node backend/src/seeds/skillQuestions.js
 */
const mongoose = require('mongoose');
const SkillQuestion = require('../models/SkillQuestion');

const QUESTIONS = [
  // ── Hard JavaScript ────────────────────────────────────────────────────────
  {
    skill: 'JavaScript', type: 'mcq_single', difficulty: 'hard',
    text: 'What does the following code output?\n\nconst obj = { a: 1 };\nObject.freeze(obj);\nobj.a = 2;\nconsole.log(obj.a);',
    options: [
      { id: 'a', text: '2', isCorrect: false },
      { id: 'b', text: '1', isCorrect: true },
      { id: 'c', text: 'undefined', isCorrect: false },
      { id: 'd', text: 'TypeError is thrown', isCorrect: false },
    ],
    marks: 2,
    explanation: 'Object.freeze prevents property mutation. In non-strict mode the assignment silently fails; the value stays 1.',
  },
  {
    skill: 'JavaScript', type: 'mcq_single', difficulty: 'hard',
    text: 'What is the output?\n\nfunction foo() {\n  return\n  { value: 1 };\n}\nconsole.log(foo());',
    options: [
      { id: 'a', text: '{ value: 1 }', isCorrect: false },
      { id: 'b', text: 'undefined', isCorrect: true },
      { id: 'c', text: 'null', isCorrect: false },
      { id: 'd', text: 'SyntaxError', isCorrect: false },
    ],
    marks: 2,
    explanation: 'ASI (Automatic Semicolon Insertion) inserts a semicolon after return, so the object literal is never reached.',
  },
  {
    skill: 'JavaScript', type: 'mcq_single', difficulty: 'hard',
    text: 'What does Promise.allSettled() return when one promise rejects?',
    options: [
      { id: 'a', text: 'Rejects immediately with that reason', isCorrect: false },
      { id: 'b', text: 'Resolves with all results, each with status "fulfilled" or "rejected"', isCorrect: true },
      { id: 'c', text: 'Resolves only with the fulfilled promises', isCorrect: false },
      { id: 'd', text: 'Returns undefined for rejected promises', isCorrect: false },
    ],
    marks: 2,
    explanation: 'Promise.allSettled waits for all promises to settle (resolve or reject) and returns an array of outcome objects.',
  },
  {
    skill: 'JavaScript', type: 'mcq_single', difficulty: 'hard',
    text: 'What is the output?\n\nconsole.log(typeof null);',
    options: [
      { id: 'a', text: '"null"', isCorrect: false },
      { id: 'b', text: '"undefined"', isCorrect: false },
      { id: 'c', text: '"object"', isCorrect: true },
      { id: 'd', text: '"symbol"', isCorrect: false },
    ],
    marks: 2,
    explanation: 'typeof null === "object" is a well-known historical bug in JavaScript that was never fixed for backward compatibility.',
  },
  {
    skill: 'JavaScript', type: 'mcq_single', difficulty: 'hard',
    text: 'Which of the following correctly describes a WeakMap?',
    options: [
      { id: 'a', text: 'Keys can be any value and entries are iterable', isCorrect: false },
      { id: 'b', text: 'Keys must be objects; entries are not iterable and keys are weakly held', isCorrect: true },
      { id: 'c', text: 'Values are weakly held but keys can be primitives', isCorrect: false },
      { id: 'd', text: 'It is a Map with a size limit', isCorrect: false },
    ],
    marks: 2,
    explanation: 'WeakMap keys must be objects. They are weakly referenced so entries can be GC\'d. WeakMaps are not iterable.',
  },
  {
    skill: 'JavaScript', type: 'mcq_single', difficulty: 'hard',
    text: 'What does the following output?\n\nconst a = [1, 2, 3];\nconst b = a;\nb.push(4);\nconsole.log(a.length);',
    options: [
      { id: 'a', text: '3', isCorrect: false },
      { id: 'b', text: '4', isCorrect: true },
      { id: 'c', text: 'undefined', isCorrect: false },
      { id: 'd', text: 'TypeError', isCorrect: false },
    ],
    marks: 2,
    explanation: 'Arrays are reference types. b = a makes both variables point to the same array in memory.',
  },
  {
    skill: 'JavaScript', type: 'mcq_single', difficulty: 'hard',
    text: 'What is the output?\n\nlet x = 1;\nfunction test() {\n  console.log(x);\n  let x = 2;\n}\ntest();',
    options: [
      { id: 'a', text: '1', isCorrect: false },
      { id: 'b', text: '2', isCorrect: false },
      { id: 'c', text: 'undefined', isCorrect: false },
      { id: 'd', text: 'ReferenceError', isCorrect: true },
    ],
    marks: 2,
    explanation: 'let has a temporal dead zone (TDZ). The local x is hoisted but not initialized, so accessing it before the declaration throws ReferenceError.',
  },
  {
    skill: 'JavaScript', type: 'mcq_single', difficulty: 'hard',
    text: 'What does structuredClone() do differently from JSON.parse(JSON.stringify())?',
    options: [
      { id: 'a', text: 'It is faster but less accurate', isCorrect: false },
      { id: 'b', text: 'It correctly handles Date, Map, Set, RegExp, undefined, and circular references', isCorrect: true },
      { id: 'c', text: 'It only clones plain objects', isCorrect: false },
      { id: 'd', text: 'It mutates the original object', isCorrect: false },
    ],
    marks: 2,
    explanation: 'structuredClone uses the Structured Clone Algorithm which handles many types JSON cannot (Date, Map, Set, circular refs).',
  },
  {
    skill: 'JavaScript', type: 'mcq_single', difficulty: 'hard',
    text: 'What is the output?\n\nconst p = new Promise(resolve => setTimeout(() => resolve(1), 0));\np.then(v => console.log(v));\nconsole.log(2);',
    options: [
      { id: 'a', text: '1 then 2', isCorrect: false },
      { id: 'b', text: '2 then 1', isCorrect: true },
      { id: 'c', text: '1 and 2 simultaneously', isCorrect: false },
      { id: 'd', text: 'Only 2 is logged', isCorrect: false },
    ],
    marks: 2,
    explanation: 'The .then callback is microtask-queued (after setTimeout macrotask). console.log(2) runs first, then "1" is logged.',
  },
  {
    skill: 'JavaScript', type: 'mcq_single', difficulty: 'hard',
    text: 'Which statement about generators is TRUE?',
    options: [
      { id: 'a', text: 'Generators are always synchronous', isCorrect: false },
      { id: 'b', text: 'generator.next() resumes execution up to the next yield and returns { value, done }', isCorrect: true },
      { id: 'c', text: 'You can only iterate a generator once and there is no way to reset it', isCorrect: false },
      { id: 'd', text: 'return inside a generator throws an error', isCorrect: false },
    ],
    marks: 2,
    explanation: 'Calling .next() on a generator resumes it until the next yield. The result is always { value, done }.',
  },

  // ── Medium JavaScript ──────────────────────────────────────────────────────
  {
    skill: 'JavaScript', type: 'mcq_single', difficulty: 'medium',
    text: 'Which array method returns a NEW array without mutating the original?',
    options: [
      { id: 'a', text: 'push()', isCorrect: false },
      { id: 'b', text: 'splice()', isCorrect: false },
      { id: 'c', text: 'map()', isCorrect: true },
      { id: 'd', text: 'sort()', isCorrect: false },
    ],
    marks: 1,
    explanation: 'map() returns a new array. push(), splice(), and sort() all mutate the original array.',
  },
  {
    skill: 'JavaScript', type: 'mcq_single', difficulty: 'medium',
    text: 'What is the difference between == and ===?',
    options: [
      { id: 'a', text: '== checks value only; === checks value and type', isCorrect: true },
      { id: 'b', text: '=== checks value only; == checks value and type', isCorrect: false },
      { id: 'c', text: 'Both do the same comparison', isCorrect: false },
      { id: 'd', text: '== is for objects, === is for primitives', isCorrect: false },
    ],
    marks: 1,
    explanation: '== performs type coercion before comparing; === is a strict equality check that requires both value and type to match.',
  },
  {
    skill: 'JavaScript', type: 'truefalse', difficulty: 'medium',
    text: 'Arrow functions have their own "this" binding.',
    options: [
      { id: 'true',  text: 'True',  isCorrect: false },
      { id: 'false', text: 'False', isCorrect: true },
    ],
    marks: 1,
    explanation: 'Arrow functions do NOT have their own "this". They capture "this" from the surrounding lexical context.',
  },
  {
    skill: 'JavaScript', type: 'mcq_single', difficulty: 'medium',
    text: 'What does Array.prototype.reduce() do?',
    options: [
      { id: 'a', text: 'Filters elements matching a predicate', isCorrect: false },
      { id: 'b', text: 'Reduces the array to a single accumulated value', isCorrect: true },
      { id: 'c', text: 'Returns the first element matching a predicate', isCorrect: false },
      { id: 'd', text: 'Flattens nested arrays by one level', isCorrect: false },
    ],
    marks: 1,
    explanation: 'reduce() applies a reducer callback to each element, accumulating the result into a single output value.',
  },
  {
    skill: 'JavaScript', type: 'mcq_single', difficulty: 'medium',
    text: 'What is a closure in JavaScript?',
    options: [
      { id: 'a', text: 'A function that cannot access outer variables', isCorrect: false },
      { id: 'b', text: 'An immediately invoked function expression', isCorrect: false },
      { id: 'c', text: 'A function that retains access to variables in its outer lexical scope even after that scope has returned', isCorrect: true },
      { id: 'd', text: 'A sealed object that cannot be modified', isCorrect: false },
    ],
    marks: 1,
    explanation: 'A closure is created when a function remembers variables from its enclosing scope even when executed outside of that scope.',
  },
  {
    skill: 'JavaScript', type: 'mcq_single', difficulty: 'medium',
    text: 'Which keyword prevents variable re-declaration in the same scope?',
    options: [
      { id: 'a', text: 'var', isCorrect: false },
      { id: 'b', text: 'let', isCorrect: true },
      { id: 'c', text: 'function', isCorrect: false },
      { id: 'd', text: 'global', isCorrect: false },
    ],
    marks: 1,
    explanation: 'let (and const) prevent re-declaration in the same block scope. var allows re-declaration.',
  },
  {
    skill: 'JavaScript', type: 'truefalse', difficulty: 'medium',
    text: 'The "async" keyword makes a function always return a Promise.',
    options: [
      { id: 'true',  text: 'True',  isCorrect: true },
      { id: 'false', text: 'False', isCorrect: false },
    ],
    marks: 1,
    explanation: 'An async function always returns a Promise. If you return a non-Promise value, it is automatically wrapped in a resolved Promise.',
  },
  {
    skill: 'JavaScript', type: 'mcq_single', difficulty: 'medium',
    text: 'What does the spread operator (...) do when used with an array?',
    options: [
      { id: 'a', text: 'Deep clones the array', isCorrect: false },
      { id: 'b', text: 'Expands the array into individual elements', isCorrect: true },
      { id: 'c', text: 'Flattens nested arrays to any depth', isCorrect: false },
      { id: 'd', text: 'Converts the array to a string', isCorrect: false },
    ],
    marks: 1,
    explanation: 'The spread operator expands an iterable (like an array) into its individual elements in-place.',
  },
  {
    skill: 'JavaScript', type: 'mcq_single', difficulty: 'medium',
    text: 'Which method checks if ALL elements in an array pass a test?',
    options: [
      { id: 'a', text: 'some()', isCorrect: false },
      { id: 'b', text: 'every()', isCorrect: true },
      { id: 'c', text: 'find()', isCorrect: false },
      { id: 'd', text: 'includes()', isCorrect: false },
    ],
    marks: 1,
    explanation: 'every() returns true if all elements satisfy the callback predicate. some() returns true if at least one does.',
  },
  {
    skill: 'JavaScript', type: 'mcq_single', difficulty: 'medium',
    text: 'What does Object.assign(target, source) do?',
    options: [
      { id: 'a', text: 'Creates a deep clone of source', isCorrect: false },
      { id: 'b', text: 'Copies enumerable own properties from source into target and returns target', isCorrect: true },
      { id: 'c', text: 'Creates a new object merging both without modifying either', isCorrect: false },
      { id: 'd', text: 'Freezes the target object', isCorrect: false },
    ],
    marks: 1,
    explanation: 'Object.assign copies own enumerable properties from one or more source objects to target, mutating target in place.',
  },
];

async function seed() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/talentnest';
  await mongoose.connect(uri);

  const existing = await SkillQuestion.countDocuments({ skill: 'JavaScript' });
  if (existing >= 20) {
    console.log(`Seed skipped: ${existing} JavaScript questions already exist.`);
    await mongoose.disconnect();
    return;
  }

  await SkillQuestion.deleteMany({ skill: 'JavaScript', tenantId: null });
  await SkillQuestion.insertMany(QUESTIONS.map(q => ({ ...q, tenantId: null })));
  console.log(`Seeded ${QUESTIONS.length} JavaScript questions.`);
  await mongoose.disconnect();
}

if (require.main === module) {
  seed().catch(e => { console.error(e); process.exit(1); });
}

module.exports = { QUESTIONS };
