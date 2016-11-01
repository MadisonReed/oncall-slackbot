'use strict';
// 3rd
const assert = require('better-assert');

//
// Utility belt functions
//

// Convenience function that supports a more readable syntax when
// specifying timeout delay. If delay is an object, it must include at least
// one key of `millis | secs | mins | hours`:
//
// toMilliseconds(500)                                            === 500
// toMilliseconds({ millis: 500 })                                === 500
// toMilliseconds({ secs: 45 })                                   === 45000
// toMilliseconds({ mins: 1, secs: 30 });                         === 90000
// toMilliseconds({ hours: 1, mins: 15, secs: 30, millis: 750 }); === 4530750
//
// Exported only for testing.
//
// Returns Int
exports.toMilliseconds = (() => {
  const whitelist = ['millis', 'secs', 'mins', 'hours'];  // prevents typos
  return function toMilliseconds(delay) {
    if (Number.isInteger(delay)) return delay;
    assert(Object.keys(delay).length > 0);
    assert(Object.keys(delay).every(k => whitelist.indexOf(k) > -1));
    return (delay.millis || 0) +
      (delay.secs || 0) * 1000 +
      (delay.mins || 0) * 1000 * 60 +
      (delay.hours || 0) * 1000 * 60 * 60;
  };
})();
