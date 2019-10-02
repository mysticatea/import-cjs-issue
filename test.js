
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
