module.exports = function loader(source) {
    source = source.replace(/console.log/g, 'console.warn')
    return source
}
