const path = require('path')
const Compiler = require('./lib/Compiler').default

const options = {
    entry: path.resolve(__dirname, './example/simple/index.js'),
    output: path.resolve(__dirname, './dist/bundle.js'),
    loader: path.resolve(__dirname, './example/simple/loader.js')
}

console.time('run')
const compiler = new Compiler(options)
compiler.run()
console.timeEnd('run')
