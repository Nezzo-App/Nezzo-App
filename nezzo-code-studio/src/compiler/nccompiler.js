/**
 * NEZZOCODE (NC) Compiler/Interpreter
 * Hauptmodul für Kompilierung und Ausführung
 */

const NCLexer = require('./ncompiler/lexer');
const NCParser = require('./ncompiler/parser');

class NCCompiler {
  constructor() {
    this.builtInFunctions = new Map();
    this.initializeBuiltIns();
  }

  initializeBuiltIns() {
    // Eingebaute Funktionen
    this.builtInFunctions.set('sage', this.funcSage.bind(this));
    this.builtInFunctions.set('print', this.funcSage.bind(this));
    this.builtInFunctions.set('input', this.funcInput.bind(this));
    this.builtInFunctions.set('zufall', this.funcRandom.bind(this));
    this.builtInFunctions.set('random', this.funcRandom.bind(this));
    this.builtInFunctions.set('absolut', Math.abs.bind(Math));
    this.builtInFunctions.set('abs', Math.abs.bind(Math));
    this.builtInFunctions.set('wurzel', Math.sqrt.bind(Math));
    this.builtInFunctions.set('sqrt', Math.sqrt.bind(Math));
    this.builtInFunctions.set('sin', Math.sin.bind(Math));
    this.builtInFunctions.set('cos', Math.cos.bind(Math));
    this.builtInFunctions.set('tan', Math.tan.bind(Math));
    this.builtInFunctions.set('log', Math.log.bind(Math));
    this.builtInFunctions.set('exp', Math.exp.bind(Math));
    this.builtInFunctions.set('runde', Math.round.bind(Math));
    this.builtInFunctions.set('round', Math.round.bind(Math));
    this.builtInFunctions.set('boden', Math.floor.bind(Math));
    this.builtInFunctions.set('floor', Math.floor.bind(Math));
    this.builtInFunctions.set('decke', Math.ceil.bind(Math));
    this.builtInFunctions.set('ceil', Math.ceil.bind(Math));
    this.builtInFunctions.set('max', Math.max.bind(Math));
    this.builtInFunctions.set('min', Math.min.bind(Math));
    this.builtInFunctions.set('länge', this.funcLength.bind(this));
    this.builtInFunctions.set('length', this.funcLength.bind(this));
  }

  compile(sourceCode) {
    const startTime = Date.now();
    
    // Lexikalische Analyse
    const lexer = new NCLexer(sourceCode);
    const { tokens, errors: lexerErrors } = lexer.tokenize();
    
    if (lexerErrors.length > 0) {
      return {
        success: false,
        errors: lexerErrors,
        stage: 'lexer',
        time: Date.now() - startTime
      };
    }

    // Parsing
    const parser = new NCParser(tokens);
    const { ast, errors: parserErrors } = parser.parse();
    
    if (parserErrors.length > 0) {
      return {
        success: false,
        errors: parserErrors,
        stage: 'parser',
        time: Date.now() - startTime
      };
    }

    // Code-Generierung (JavaScript als Ziel)
    const generatedCode = this.generateJavaScript(ast);

    return {
      success: true,
      ast,
      generatedCode,
      tokens,
      time: Date.now() - startTime,
      stats: {
        tokenCount: tokens.length,
        statementCount: ast.body.length
      }
    };
  }

  generateJavaScript(ast) {
    const statements = ast.body.map(stmt => this.generateStatement(stmt)).join('\n');
    
    const wrapper = `
(function() {
  const __nc = {
    output: [],
    variables: new Map(),
    
    print: function(value) {
      const str = value === null ? 'nichts' : 
                  value === true ? 'wahr' : 
                  value === false ? 'falsch' : 
                  Array.isArray(value) ? '[' + value.join(', ') + ']' :
                  String(value);
      this.output.push(str);
      console.log(str);
    },
    
    input: function(prompt) {
      // In Electron wird dies über IPC behandelt
      return '';
    },
    
    getVar: function(name) {
      return this.variables.get(name);
    },
    
    setVar: function(name, value) {
      this.variables.set(name, value);
    },
    
    hasVar: function(name) {
      return this.variables.has(name);
    }
  };

${statements}

  return __nc.output;
})();
`;
    return wrapper.trim();
  }

  generateStatement(stmt) {
    switch (stmt.type) {
      case 'VariableDeclaration':
        return this.genVariableDeclaration(stmt);
      case 'IfStatement':
        return this.genIfStatement(stmt);
      case 'ForLoop':
        return this.genForLoop(stmt);
      case 'WhileLoop':
        return this.genWhileLoop(stmt);
      case 'FunctionDeclaration':
        return this.genFunctionDeclaration(stmt);
      case 'ReturnStatement':
        return this.genReturnStatement(stmt);
      case 'PrintStatement':
        return this.genPrintStatement(stmt);
      case 'ImportStatement':
        return this.genImportStatement(stmt);
      case 'ClassDeclaration':
        return this.genClassDeclaration(stmt);
      case 'ExpressionStatement':
        return this.genExpression(stmt.expression) + ';';
      default:
        return '// Unknown statement';
    }
  }

  genVariableDeclaration(stmt) {
    const { name, initializer } = stmt.variable;
    const value = initializer ? this.genExpression(initializer) : 'null';
    return `__nc.setVar('${name}', ${value});`;
  }

  genIfStatement(stmt) {
    const condition = this.genExpression(stmt.condition);
    const thenBranch = stmt.thenBranch.map(s => this.generateStatement(s)).join('\n');
    const elseBranch = stmt.elseBranch 
      ? 'else {\n' + stmt.elseBranch.map(s => this.generateStatement(s)).join('\n') + '\n}' 
      : '';
    
    return `if (${condition}) {\n${thenBranch}\n}${elseBranch}`;
  }

  genForLoop(stmt) {
    const start = this.genExpression(stmt.start);
    const end = this.genExpression(stmt.end);
    const body = stmt.body.map(s => this.generateStatement(s)).join('\n');
    
    return `for (let ${stmt.variable} = ${start}; ${stmt.variable} <= ${end}; ${stmt.variable}++) {\n${body}\n}`;
  }

  genWhileLoop(stmt) {
    const condition = this.genExpression(stmt.condition);
    const body = stmt.body.map(s => this.generateStatement(s)).join('\n');
    
    return `while (${condition}) {\n${body}\n}`;
  }

  genFunctionDeclaration(stmt) {
    const params = stmt.params.join(', ');
    const body = stmt.body.map(s => this.generateStatement(s)).join('\n');
    
    return `__nc.setVar('${stmt.name}', function(${params}) {\n${body}\n});`;
  }

  genReturnStatement(stmt) {
    const value = stmt.value ? this.genExpression(stmt.value) : 'undefined';
    return `return ${value};`;
  }

  genPrintStatement(stmt) {
    const arg = this.genExpression(stmt.argument);
    return `__nc.print(${arg});`;
  }

  genImportStatement(stmt) {
    const source = this.genExpression(stmt.source);
    return `// Import: ${source}`;
  }

  genClassDeclaration(stmt) {
    const members = stmt.members.map(s => this.generateStatement(s)).join('\n');
    return `__nc.setVar('${stmt.name}', (function() {\n${members}\n  return {};})());`;
  }

  genExpression(expr) {
    if (!expr) return 'null';
    
    switch (expr.type) {
      case 'Literal':
        if (expr.dataType === 'string') {
          return JSON.stringify(expr.value);
        }
        return expr.value === null ? 'null' : 
               expr.value === true ? 'true' : 
               expr.value === false ? 'false' : 
               expr.value;
      
      case 'Identifier':
        return `__nc.getVar('${expr.name}')`;
      
      case 'Binary':
        const left = this.genExpression(expr.left);
        const right = this.genExpression(expr.right);
        return `(${left} ${expr.operator} ${right})`;
      
      case 'Unary':
        const operand = this.genExpression(expr.operand);
        if (expr.operator === 'not') {
          return `(!${operand})`;
        }
        return `(${expr.operator}${operand})`;
      
      case 'Logical':
        const l = this.genExpression(expr.left);
        const r = this.genExpression(expr.right);
        const op = expr.operator === 'und' ? '&&' : '||';
        return `(${l} ${op} ${r})`;
      
      case 'Assignment':
        const target = this.genExpression(expr.target);
        const val = this.genExpression(expr.value);
        return `${target} = ${val}`;
      
      case 'Call':
        const callee = this.genExpression(expr.callee);
        const args = expr.arguments.map(a => this.genExpression(a)).join(', ');
        return `${callee}(${args})`;
      
      case 'Array':
        const elements = expr.elements.map(e => this.genExpression(e)).join(', ');
        return `[${elements}]`;
      
      case 'GetProperty':
        const obj = this.genExpression(expr.object);
        return `${obj}.${expr.property}`;
      
      case 'IndexAccess':
        const o = this.genExpression(expr.object);
        const idx = this.genExpression(expr.index);
        return `${o}[${idx}]`;
      
      default:
        return 'null';
    }
  }

  // Built-in Funktion Implementierungen
  funcSage(...args) {
    return args.map(arg => {
      if (arg === null) return 'nichts';
      if (arg === true) return 'wahr';
      if (arg === false) return 'falsch';
      if (Array.isArray(arg)) return '[' + arg.join(', ') + ']';
      return String(arg);
    }).join(' ');
  }

  funcInput(prompt = '') {
    // Wird über IPC in Electron behandelt
    return '';
  }

  funcRandom(min = 0, max = 1) {
    return Math.random() * (max - min) + min;
  }

  funcLength(value) {
    if (typeof value === 'string' || Array.isArray(value)) {
      return value.length;
    }
    return 0;
  }

  async run(sourceCode, context = {}) {
    const compilationResult = this.compile(sourceCode);
    
    if (!compilationResult.success) {
      return compilationResult;
    }

    try {
      // Erstelle Sandbox-Umgebung
      const sandbox = {
        console,
        Math,
        Array,
        Object,
        String,
        Number,
        Boolean,
        Date,
        RegExp,
        Error,
        setTimeout,
        setInterval,
        clearTimeout,
        clearInterval,
        Buffer,
        ...context
      };

      // Führe generierten Code aus
      const vm = require('vm');
      const script = new vm.Script(compilationResult.generatedCode);
      const contextObj = vm.createContext(sandbox);
      
      const result = script.runInContext(contextObj);
      
      return {
        success: true,
        output: result,
        time: compilationResult.time
      };
    } catch (error) {
      return {
        success: false,
        errors: [{
          type: 'RUNTIME_ERROR',
          message: error.message,
          line: error.lineNumber
        }],
        stage: 'runtime',
        time: compilationResult.time
      };
    }
  }

  lint(sourceCode) {
    const compilationResult = this.compile(sourceCode);
    const warnings = [];
    const suggestions = [];

    // Zusätzliche Linting-Regeln
    const lines = sourceCode.split('\n');
    
    lines.forEach((line, index) => {
      // Warnung bei sehr langen Zeilen
      if (line.length > 120) {
        warnings.push({
          type: 'WARNING',
          message: 'Zeile ist länger als 120 Zeichen',
          line: index + 1,
          column: 121
        });
      }

      // Vorschlag für deutsche Keywords
      if (line.includes('if') && !line.includes('wenn')) {
        suggestions.push({
          type: 'SUGGESTION',
          message: 'Verwende "wenn" statt "if" für konsistenten NC-Code',
          line: index + 1
        });
      }

      if (line.includes('for') && !line.includes('schleife')) {
        suggestions.push({
          type: 'SUGGESTION',
          message: 'Verwende "schleife" statt "for" für konsistenten NC-Code',
          line: index + 1
        });
      }

      if (line.includes('print') && !line.includes('sage')) {
        suggestions.push({
          type: 'SUGGESTION',
          message: 'Verwende "sage" statt "print" für konsistenten NC-Code',
          line: index + 1
        });
      }
    });

    return {
      success: true,
      errors: compilationResult.success ? [] : compilationResult.errors,
      warnings,
      suggestions,
      time: compilationResult.time
    };
  }
}

module.exports = new NCCompiler();
