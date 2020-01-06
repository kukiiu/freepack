import * as fs from 'fs'
import * as path from 'path'
import * as babelParser from '@babel/parser'
import Module from './Module'

class Compiler {

    options: any

    constructor(options: any) {
        this.options = options
    }

    run() {
        // 创建入口模块
        const entryModule = this.createModule(path.basename(this.options.entry), this.options.entry)
        // 分析模块依赖
        const dependencies = this.analyseDependencies(entryModule)
        // 创建依赖模块
        this.resolver(entryModule, dependencies)
        // 输出
        const source = this.renderTemplate(entryModule)
        this.write(source, this.options.output)
    }

    createModule(id: string, absPath: string) {
        const module = new Module()
        module.id = id
        module.absPath = absPath
        module.baseDir = path.dirname(absPath)
        module.code = fs.readFileSync(absPath).toString()
        module.dependencies = []

        const loader = require(this.options.loader)
        module.code = loader(module.code)

        return module
    }

    analyseDependencies(moduel: Module) {
        const dependencies: any[] = []
        const ast = babelParser.parse(moduel.code, {})
        // @ts-ignore 找出所有赋值运算
        const varDeclarations = ast.program.body.filter(node => node.type === 'VariableDeclaration')
        for (const varDeclaration of varDeclarations) {
            // @ts-ignore 找出赋值运算里有require的定义,添加require的值
            const requireDeclaration = varDeclaration.declarations.find(node => node.init.callee.name === 'require')
            if(requireDeclaration){
                dependencies.push({
                    id: requireDeclaration.init.arguments[0].value,
                })
            }
        }
        return dependencies
    }

    resolver(module: Module, dependencies: any[]) {
        for (const dependent of dependencies) {
            const depModule = this.createModule(dependent.id, path.resolve(module.baseDir, dependent.id) + '.js')
            module.dependencies.push(depModule)
        }
        return
    }

    renderTemplate(module: Module) {
        const buffer = []
        buffer.push(`(function(modules) {
            function require(moduleId) {
                var module = {
                    id: moduleId,
                    exports: {}
                }
                modules[moduleId](module, require)
                return module.exports;
            }
            require("${module.id}");
        })({`)

        buffer.push(`'${module.id}': (function(module, require) { \n ${module.code} \n }),`)
        for (const dependent of module.dependencies) {
            const src = `(function(module, require) { \n ${dependent.code.replace('exports.default', 'module.exports')} \n })`
            buffer.push(`'${dependent.id}':${src},`)
        }

        buffer.push(`})`)
        return buffer.reduce((pre, cur) => pre + cur, '')
    }

    write(source: string, output: string) {
        fs.writeFileSync(output, source)
    }
}

export default Compiler