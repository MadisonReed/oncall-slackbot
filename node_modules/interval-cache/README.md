
# interval-cache

A simple Node library for caching stuff in memory at intervals in the background.
It's just a wrapper around `setTimeout`.

Works with Express, Koa, and anything else.

## General Idea

In a fledging web project, I quickly get to a point where I have some 
lightweight caching needs. This library aims to be the lightweight solution,
a simple way to eliminate the most trivial database queries.

This library addresses the basic needs where: 

- You want to cache various data (k/v) once or in some refresh loop
- Storing the cache in process memory is good enough
- Requests never wait for cache updates (which happen in the background)
- This data doesn't need to be evicted from the cache because it's long-term
- You have some database queries that only have to run every once in a while,
but you don't want to bring in a more sophisticated cache solution just for them.

The perfect example use-case is the "Forum Stats" box that forums often
have on their homepage.

    const IntervalCache = require('interval-cache');

    const cache = new IntervalCache()
      .every('stats', 1000 * 30, () => database.getStats(), {});

    cache.get('stats');

## Quickstart

Instantiate an IntervalCache instance in your own module and register the
run-once and run-at-an-interval tasks.

``` javascript
// my-cache.js

const IntervalCache = require('interval-cache');

module.exports = new IntervalCache({ throwIfKeyNotFound: true })
  // Query the forum staff on server boot since it almost never changes
  .once('staff', () => database.getStaffMembers(), [])
  // Refresh the forum's list of the latest 10 posts every 10 seconds
  .every('latest-posts', 1000 * 10, () => database.getLatestPosts(), 0)
  // Refresh the forum's user-count every 1.5 minutes (alternate delay syntax)
  .every('user-count', { mins: 1, secs: 30 }, () => database.getUserCount(), 0)
```

Require your instance module wherever you need to access the cache values.

``` javascript
// routes.js

const app = require('express')();
const myCache = require('./my-cache');

app.get('/staff', (req, res) => {
  const users = myCache.get('staff');
  res.render('staff.html', { users });
});

app.get('/stats', (req, res) => {
  const userCount = myCache.get('user-count');
  const latestPosts = myCache.get('latest-posts');
  res.render('stats.html', { userCount, latestPosts });
});

app.listen(3000, () => console.log('Listening on 3000...'));
```

## API

When instantiating an IntervalCache object, you can pass in an optional 
options object.

Defaults:

    const cache = new IntervalCache({
      // If true, cache.get(key) will throw an error if the key does not
      // exist in the cache. Prevents typos, recommended for development,
      // i.e. process.env.NODE_ENV === 'production'
      throwIfKeyNotFound: false
    });

An IntervalCache instance has these methods:

#### `.get(key::Str)`

Get the current cached value for the given key.

- Returns anything.
- Returns `undefined` if key does not exist. 
- Throws an error if (key does not exist and `opts.throwIfKeyNotFound === true`).

#### `.once(key::Str, getPromise::Fn, initValue)`

Register a task that updates the cache value and then never runs again.

- Returns the instance.
- `getPromise` must be a function that returns a Promise.
- `initValue` will be the cached value until the Promise is fulfilled.
It can be any value except `undefined`.
- Note: Currently does not retry upon Promise rejection.

#### `.every(key::Str, delay:Int, getPromise::Fn, initValue)`

Register a task that updates the cache value at the given millisecond interval.

- Returns the instance.
- `delay` is how often to update the cache. It can either be an integer
(milliseconds) or it can be a convenience object that has 1 or more
of the keys `millis | secs | mins | hours`:

    Example:

        .every(k, 500, ...)                                           === 500 ms
        .every(k, { millis: 500 }, ...)                               === 500 ms
        .every(k, { secs: 45 }, ...)                                  === 45000 ms
        .every(k, { mins: 1, secs: 30 }, ...)                         === 90000 ms
        .every(k, { hours: 1, mins: 15, secs: 30, millis: 750 }, ...) === 4530750 ms

- `getPromise` must be a function that returns a Promise.
- `initValue` will be the cached value until the Promise is fulfilled.
It can be any value except `undefined`.
- Note: Upon Promise rejection, it does not update the cached value but
the interval will continue to run.

## License

MIT
