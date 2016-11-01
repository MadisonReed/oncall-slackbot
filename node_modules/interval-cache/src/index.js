'use strict';
// Node
const util = require('util');
// 3rd party
const assert = require('better-assert');
// 1st party
const belt = require('./belt');

////////////////////////////////////////////////////////////

class RegistryItem {
  constructor(key, getPromise, initValue) {
    assert(typeof key === 'string');
    assert(typeof getPromise === 'function'); // must return promise
    assert(initValue !== undefined); // must set an initial value even if just null
    this.key = key;
    this.currValue = initValue;
    this.getPromise = getPromise;
    this.lastRunAt = null;
  }

  loop() {
    throw new Error('Must use subclass');
  }
}

////////////////////////////////////////////////////////////

class OnceRegistryItem extends RegistryItem {
  constructor(key, getPromise, initValue) {
    super(key, getPromise, initValue);
  }

  // Returns this instance
  loop() {
    const succBack = newValue => {
      this.currValue = newValue;
      this.lastRunAt = new Date();
    };
    const errBack = err => {
      console.error(`Error while running promise of key %j`, this.key, err.stack);
      this.lastRunAt = new Date();
    };
    this.getPromise().then(succBack, errBack);
    return this;
  }
}

////////////////////////////////////////////////////////////

class EveryRegistryItem extends RegistryItem {
  // delay is either an integer is milliseconds or a convenience object
  constructor(key, delay, getPromise, initValue) {
    assert(Number.isInteger(delay) || typeof delay === 'object');
    super(key, getPromise, initValue);
    this.ms = belt.toMilliseconds(delay);
  }

  // `ms` is optional milliseconds til next loop
  //
  // Returns this instance
  loop(ms) {
    ms = ms || 0;
    assert(Number.isInteger(ms));

    const succBack = newValue => {
      this.currValue = newValue;
      this.lastRunAt = new Date();
      this.loop(this.tilNextLoop());
    };

    const errBack = err => {
      console.error(`Error while running promise of key %j`, this.key, err.stack);
      this.lastRunAt = new Date();
      this.loop(this.tilNextLoop());
    };

    setTimeout(() => this.getPromise().then(succBack, errBack), ms);
    return this;
  }

  // Milliseconds til next loop should run
  //
  // Returns Int
  tilNextLoop() {
    if (!this.lastRunAt) return 0; // hasn't been run yet
    const elapsed = Date.now() - this.lastRunAt.getTime();
    return this.ms - elapsed;
  }
}

////////////////////////////////////////////////////////////

class IntervalCache {
  constructor(opts) {
    this.registry = new Map();
    // Protect against typos during development
    this.throwIfKeyNotFound = opts && opts.throwIfKeyNotFound === true;
  }

  // Returns any value, but returns undefined only if key not found
  get(key) {
    const item = this.registry.get(key);
    if (!item) {
      if (this.throwIfKeyNotFound) {
        throw new Error(util.format('KeyNotFound %j', key));
      }
      return undefined;
    }
    return item.currValue;
  }

  // Returns this instance
  once(key, getPromise, initValue) {
    if (this.registry.has(key)) throw new Error(`DuplicateKey %j`, key);
    const item = new OnceRegistryItem(key, getPromise, initValue).loop();
    this.registry.set(key, item);
    return this;
  }

  // Returns this instance
  every(key, ms, getPromise, initValue) {
    if (this.registry.has(key)) throw new Error(`DuplicateKey %j`, key);
    const item = new EveryRegistryItem(key, ms, getPromise, initValue).loop();
    this.registry.set(key, item);
    return this;
  }
}

////////////////////////////////////////////////////////////
// API
////////////////////////////////////////////////////////////

module.exports = IntervalCache;
