# `import(cjs)` issue

With Node.js v12.11.1, On Windows 10,

## test.js

```
node --experimental-modules test.js
```

<details><summary>Source Code</summary>

```js
console.log("version:", process.version)

;(async () => {
    console.log("==== ESM ====")
    await import("x-esm") //→ Found as expected
    await import("./node_modules/x-esm/index.js?q=0") //→ Found and `x-esm` re-ran as expected
    await import("./node_modules/x-esm/index.js?q=1") //→ Found and `x-esm` re-ran as expected

    console.log("==== CJS ====")
    const cjs = await import("x-cjs") //→ Found as expected
    const cjs0 = await import("./node_modules/x-cjs/index.js?q=0") //→ Found but `x-cjs` didn't re-run
    const cjs1 = await import("./node_modules/x-cjs/index.js?q=1") //→ Found but `x-cjs` didn't re-run
    console.log(cjs === cjs0, cjs === cjs1, cjs0 === cjs1) //→ all are false but `x-cjs` didn't run three times
    
    console.log("---- remove 'require.cache' ----")
    delete require.cache[require.resolve("x-cjs")]
    await import("x-cjs") //→ Found but `x-cjs` didn't re-run
    await import("./node_modules/x-cjs/index.js?q=0") //→ Found but `x-cjs` didn't re-run
    await import("./node_modules/x-cjs/index.js?q=1") //→ Found but `x-cjs` didn't re-run
    await import("./node_modules/x-cjs/index.js?q=2") //→ Found and `x-cjs` re-ran as expected
    await import("./node_modules/x-cjs/index.js?q=3") //→ Found but `x-cjs` didn't re-run
})().catch(error => {
    console.error(error)
    process.exitCode = 1
})
```

</details>

<details><summary>Result</summary>

```
(node:14972) ExperimentalWarning: The ESM module loader is experimental.
version: v12.11.1
==== ESM ====
x-esm
x-esm
x-esm
==== CJS ====
x-cjs
false false false
---- remove 'require.cache' ----
x-cjs
```

</details>

### Description

I tried to import packages without import cache. From the document, it looks I should use query strings.

```js
    await import("x-esm") //→ Found as expected
    await import("./node_modules/x-esm/index.js?q=0") //→ Found and `x-esm` re-ran as expected
    await import("./node_modules/x-esm/index.js?q=1") //→ Found and `x-esm` re-ran as expected
```

`x-esm` is an ES module package. It worked as expected.

```js
    const cjs = await import("x-cjs") //→ Found as expected
    const cjs0 = await import("./node_modules/x-cjs/index.js?q=0") //→ Found but `x-cjs` didn't re-run
    const cjs1 = await import("./node_modules/x-cjs/index.js?q=1") //→ Found but `x-cjs` didn't re-run
    console.log(cjs === cjs0, cjs === cjs1, cjs0 === cjs1) //→ all are false but `x-cjs` didn't run three times
```

`x-cjs` is a CJS package. The result was odd. The `console.log()` in `x-cjs` package ran only one time, but the returned values are different for each query string.

I found the entry of `x-cjs` in `require.cache`. However, the cache entry is odd as well. It's different from `require("x-cjs")`, the entry doesn't have `parent` property and the `module.children` of `test.js` is still empty.

Anyway, I tried to remove the cache entry.

```js
    console.log("---- remove 'require.cache' ----")
    delete require.cache[require.resolve("x-cjs")]
    await import("x-cjs") //→ Found but `x-cjs` didn't re-run
    await import("./node_modules/x-cjs/index.js?q=0") //→ Found but `x-cjs` didn't re-run
    await import("./node_modules/x-cjs/index.js?q=1") //→ Found but `x-cjs` didn't re-run
    await import("./node_modules/x-cjs/index.js?q=2") //→ Found and `x-cjs` re-ran as expected
    await import("./node_modules/x-cjs/index.js?q=3") //→ Found but `x-cjs` didn't re-run
```

Cryptic. I guess this behavior is:

- `import(cjs)` has cache apart from `require.cache`.
- The `import(cjs)` cache is created from `require.cache`.
- It runs CJS package only if `require.cache` entry was not found.
- The `import(cjs)` cache is not removed even if `require.cache` entry deleted.

Therefore, I have to do the following steps if I want to import packages without cache.

1. Find the main file of the package because I cannot put query strings to the package name.
   ```js
   const url = "file:" + require.resolve(packageName) + uniqueQueryString;
   ```
1. Import it.
   ```js
   const ret = await import(url);
   ```
1. Delete `require.cache` entry.
   ```js
   delete require.cache[require.resolve(packageName)];
   ```

### Questions

1. Is it intentional behavior that `import(cjs)` creates incomplete `require.cache` entries?
1. If yes, is it intentional behavior that `import(cjs)` with query strings returns different objects for the same CJS package?

I'm guessing that `import(cjs)` should not create any `require.cache` entries, and `import(cjs)` with query strings re-runs CJS packages as same as ES packages.
