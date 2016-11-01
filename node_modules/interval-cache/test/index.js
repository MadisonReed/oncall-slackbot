'use strict';
// 3rd
const assert = require('chai').assert;
// 1st
const IntervalCache = require('../src/index');
const belt = require('../src/belt');

////////////////////////////////////////////////////////////

// TODO: Should either not test `asserts` or escalate them to Errors.
//
describe('toMilliseconds', () => {
  it('handles integers', () => {
    assert.strictEqual(belt.toMilliseconds(500), 500);
  });
  describe('convenience object', () => {
    it('works', () => {
      assert.strictEqual(belt.toMilliseconds(500), 500);
      assert.strictEqual(belt.toMilliseconds({ millis: 500 }), 500);
      assert.strictEqual(belt.toMilliseconds({ secs: 45 }), 45000);
      assert.strictEqual(belt.toMilliseconds({ mins: 1, secs: 30 }), 90000);
      assert.strictEqual(belt.toMilliseconds({ hours: 1, mins: 15, secs: 30, millis: 750 }), 4530750);
    });
    it('requires at least one key', () => {
      assert.throw(() => belt.toMilliseconds({}), 'AssertionError');
    });
    it('throws own unsupported keys', () => {
      assert.throw(() => belt.toMilliseconds({ foo: 42 }), 'AssertionError');
    });
  });
});

////////////////////////////////////////////////////////////

describe('IntervalCache', () => {
  it('sanity check', () => assert(true));

  describe('#get', () => {
    it('returns value if key is found', () => {
      const cache = new IntervalCache()
        .once('found', () => Promise.resolve(), 'init-value');
      assert.strictEqual(cache.get('found'), 'init-value');
    });
    it('is undefined when key not found', () => {
      const cache = new IntervalCache();
      assert.isUndefined(cache.get('not-found'));
    });
    describe('when throwIfKeyNotFound === true', () => {
      it('throws when key not found', () => {
        const cache = new IntervalCache({ throwIfKeyNotFound: true });
        assert.throw(() => cache.get('not-found'), 'KeyNotFound');
      });
    });
  });

  describe('#once', () => {
    it('sets cache value to resolved promise value', () => {
      const cache = new IntervalCache()
        .once('found', () => Promise.resolve(42), 'init-value');
      // This tick
      assert.strictEqual(cache.get('found'), 'init-value');
      // Next tick
      setTimeout(() => assert.strictEqual(cache.get('found'), 42), 0);
    });
  });

  // TODO: What's a good way to test this?
  //
  describe('#every', () => {
    it('works', done => {
      let n = 42;
      const delay = 50;
      const cache = new IntervalCache().every('k', delay, () => Promise.resolve(++n), n);

      // This tick
      assert.strictEqual(cache.get('k'), 42);

      setTimeout(() => { 
       // Next tick, the init val is replaced
       assert.strictEqual(cache.get('k'), 43);
       setTimeout(() => {
         // Tick after first delay
         assert.strictEqual(cache.get('k'), 44);
         done();
       }, delay + 25);
      }, delay - 25);
    });
  });
});
