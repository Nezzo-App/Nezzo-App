/**
 * NEZZOCODE (NC) Parser
 * Wandelt Tokens in einen AST um
 */

class NCParser {
  constructor(tokens) {
    this.tokens = tokens;
    this.position = 0;
    this.errors = [];
    this.ast = {
      type: 'Program',
      body: [],
      sourceType: 'nc'
    };
  }

  parse() {
    while (!this.isAtEnd()) {
      const statement = this.parseStatement();
      if (statement) {
        this.ast.body.push(statement);
      }
    }
    return { ast: this.ast, errors: this.errors };
  }

  parseStatement() {
    this.skipNewlines();

    if (this.isAtEnd()) return null;

    const token = this.current();

    // Variablendeklaration
    if (token.type === 'KEYWORD' && ['zahl', 'int', 'float', 'string', 'text', 'wahrheitswert', 'bool'].includes(token.value)) {
      return this.parseVariableDeclaration();
    }

    // Wenn-Anweisung
    if (token.type === 'KEYWORD' && ['wenn', 'if'].includes(token.value)) {
      return this.parseIfStatement();
    }

    // Schleife
    if (token.type === 'KEYWORD' && ['schleife', 'for', 'loop'].includes(token.value)) {
      return this.parseForLoop();
    }

    // Solange-Schleife (while)
    if (token.type === 'KEYWORD' && ['solange', 'while'].includes(token.value)) {
      return this.parseWhileLoop();
    }

    // Funktion
    if (token.type === 'KEYWORD' && ['funktion', 'func', 'function'].includes(token.value)) {
      return this.parseFunctionDeclaration();
    }

    // Klasse
    if (token.type === 'KEYWORD' && ['klasse', 'class'].includes(token.value)) {
      return this.parseClassDeclaration();
    }

    // Return
    if (token.type === 'KEYWORD' && ['zurück', 'return'].includes(token.value)) {
      return this.parseReturnStatement();
    }

    // Import
    if (token.type === 'KEYWORD' && ['importiere', 'import'].includes(token.value)) {
      return this.parseImportStatement();
    }

    // Sage/Print Statement
    if (token.type === 'KEYWORD' && ['sage', 'print'].includes(token.value)) {
      return this.parsePrintStatement();
    }

    // Ausdruck oder Zuweisung
    return this.parseExpressionStatement();
  }

  parseVariableDeclaration() {
    const typeToken = this.advance();
    const nameToken = this.consume('IDENTIFIER', 'Variablenname erwartet');
    
    let initializer = null;
    
    if (this.check('ASSIGNMENT')) {
      this.advance(); // Skip '='
      initializer = this.parseExpression();
    }

    return {
      type: 'VariableDeclaration',
      variable: {
        type: 'Variable',
        name: nameToken.value,
        dataType: typeToken.value,
        initializer
      }
    };
  }

  parseIfStatement() {
    this.advance(); // Skip 'wenn'/'if'
    
    this.consume('LPAREN', "'(' erwartet nach 'wenn'");
    const condition = this.parseExpression();
    this.consume('RPAREN', "')' erwartet nach Bedingung");
    
    this.consume('LBRACE', "'{' erwartet nach if-Bedingung");
    const thenBranch = this.parseBlock();
    this.consume('RBRACE', "'}' erwartet nach if-Block");

    let elseBranch = null;
    this.skipNewlines();
    
    if (this.check('KEYWORD') && ['sonst', 'else'].includes(this.current().value)) {
      this.advance(); // Skip 'sonst'/'else'
      this.consume('LBRACE', "'{' erwartet nach 'sonst'");
      elseBranch = this.parseBlock();
      this.consume('RBRACE', "'}' erwartet nach else-Block");
    }

    return {
      type: 'IfStatement',
      condition,
      thenBranch,
      elseBranch
    };
  }

  parseForLoop() {
    this.advance(); // Skip 'schleife'/'for'
    
    const varToken = this.consume('IDENTIFIER', 'Variablenname erwartet');
    this.consume('KEYWORD', "'von'/'from' erwartet");
    
    const start = this.parseExpression();
    
    this.consume('KEYWORD', "'bis'/'to' erwartet");
    const end = this.parseExpression();

    this.consume('LBRACE', "'{' erwartet nach for-Deklaration");
    const body = this.parseBlock();
    this.consume('RBRACE', "'}' erwartet nach for-Block");

    return {
      type: 'ForLoop',
      variable: varToken.value,
      start,
      end,
      body
    };
  }

  parseWhileLoop() {
    this.advance(); // Skip 'solange'/'while'
    
    this.consume('LPAREN', "'(' erwartet nach 'solange'");
    const condition = this.parseExpression();
    this.consume('RPAREN', "')' erwartet nach Bedingung");
    
    this.consume('LBRACE', "'{' erwartet nach while-Bedingung");
    const body = this.parseBlock();
    this.consume('RBRACE', "'}' erwartet nach while-Block");

    return {
      type: 'WhileLoop',
      condition,
      body
    };
  }

  parseFunctionDeclaration() {
    this.advance(); // Skip 'funktion'
    
    const nameToken = this.consume('IDENTIFIER', 'Funktionsname erwartet');
    
    this.consume('LPAREN', "'(' erwartet nach Funktionsname");
    const params = this.parseParameters();
    this.consume('RPAREN', "')' erwartet nach Parametern");

    this.consume('LBRACE', "'{' erwartet nach Funktionsdefinition");
    const body = this.parseBlock();
    this.consume('RBRACE', "'}' erwartet nach Funktionsblock");

    return {
      type: 'FunctionDeclaration',
      name: nameToken.value,
      params,
      body
    };
  }

  parseParameters() {
    const params = [];
    
    if (this.check('RPAREN')) {
      return params;
    }

    do {
      const param = this.consume('IDENTIFIER', 'Parametername erwartet');
      params.push(param.value);
    } while (this.match('COMMA'));

    return params;
  }

  parseBlock() {
    const statements = [];
    
    while (!this.check('RBRACE') && !this.isAtEnd()) {
      const statement = this.parseStatement();
      if (statement) {
        statements.push(statement);
      }
    }

    return statements;
  }

  parseReturnStatement() {
    this.advance(); // Skip 'zurück'/'return'
    
    let value = null;
    if (!this.check('NEWLINE') && !this.check('RBRACE') && !this.isAtEnd()) {
      value = this.parseExpression();
    }

    return {
      type: 'ReturnStatement',
      value
    };
  }

  parsePrintStatement() {
    this.advance(); // Skip 'sage'/'print'
    
    this.consume('LPAREN', "'(' erwartet nach 'sage'");
    const argument = this.parseExpression();
    this.consume('RPAREN', "')' erwartet nach Argument");

    return {
      type: 'PrintStatement',
      argument
    };
  }

  parseImportStatement() {
    this.advance(); // Skip 'importiere'/'import'
    
    const pathToken = this.parseExpression();

    return {
      type: 'ImportStatement',
      source: pathToken
    };
  }

  parseClassDeclaration() {
    this.advance(); // Skip 'klasse'/'class'
    
    const nameToken = this.consume('IDENTIFIER', 'Klassenname erwartet');
    
    this.consume('LBRACE', "'{' erwartet nach Klassenname");
    const members = this.parseBlock();
    this.consume('RBRACE', "'}' erwartet nach Klassendefinition");

    return {
      type: 'ClassDeclaration',
      name: nameToken.value,
      members
    };
  }

  parseExpressionStatement() {
    const expression = this.parseExpression();
    
    return {
      type: 'ExpressionStatement',
      expression
    };
  }

  parseExpression() {
    return this.parseAssignment();
  }

  parseAssignment() {
    const left = this.parseOr();
    
    if (this.match('ASSIGNMENT')) {
      const value = this.parseAssignment();
      return {
        type: 'Assignment',
        target: left,
        value
      };
    }

    return left;
  }

  parseOr() {
    let left = this.parseAnd();
    
    while (this.match('KEYWORD') && this.previous().value === 'oder') {
      const right = this.parseAnd();
      left = {
        type: 'Logical',
        operator: 'oder',
        left,
        right
      };
    }

    return left;
  }

  parseAnd() {
    let left = this.parseEquality();
    
    while (this.match('KEYWORD') && this.previous().value === 'und') {
      const right = this.parseEquality();
      left = {
        type: 'Logical',
        operator: 'und',
        left,
        right
      };
    }

    return left;
  }

  parseEquality() {
    let left = this.parseComparison();
    
    while (this.match('OPERATOR') && ['==', '!='].includes(this.previous().value)) {
      const operator = this.previous().value;
      const right = this.parseComparison();
      left = {
        type: 'Binary',
        operator,
        left,
        right
      };
    }

    return left;
  }

  parseComparison() {
    let left = this.parseTerm();
    
    while (this.match('OPERATOR') && ['<', '<=', '>', '>='].includes(this.previous().value)) {
      const operator = this.previous().value;
      const right = this.parseTerm();
      left = {
        type: 'Binary',
        operator,
        left,
        right
      };
    }

    return left;
  }

  parseTerm() {
    let left = this.parseFactor();
    
    while (this.match('OPERATOR') && ['+', '-'].includes(this.previous().value)) {
      const operator = this.previous().value;
      const right = this.parseFactor();
      left = {
        type: 'Binary',
        operator,
        left,
        right
      };
    }

    return left;
  }

  parseFactor() {
    let left = this.parseUnary();
    
    while (this.match('OPERATOR') && ['*', '/', '%'].includes(this.previous().value)) {
      const operator = this.previous().value;
      const right = this.parseUnary();
      left = {
        type: 'Binary',
        operator,
        left,
        right
      };
    }

    return left;
  }

  parseUnary() {
    if (this.match('OPERATOR') && this.previous().value === '-') {
      const right = this.parseUnary();
      return {
        type: 'Unary',
        operator: '-',
        operand: right
      };
    }

    if (this.match('KEYWORD') && this.previous().value === 'nicht') {
      const right = this.parseUnary();
      return {
        type: 'Unary',
        operator: 'not',
        operand: right
      };
    }

    return this.parseCall();
  }

  parseCall() {
    let expr = this.parsePrimary();

    while (true) {
      if (this.match('LPAREN')) {
        const args = this.parseArguments();
        this.consume('RPAREN', "')' erwartet nach Argumenten");
        expr = {
          type: 'Call',
          callee: expr,
          arguments: args
        };
      } else if (this.match('DOT')) {
        const name = this.consume('IDENTIFIER', "Eigenschaftsname erwartet nach '.'");
        expr = {
          type: 'GetProperty',
          object: expr,
          property: name.value
        };
      } else if (this.match('LBRACKET')) {
        const index = this.parseExpression();
        this.consume('RBRACKET', "']' erwartet nach Index");
        expr = {
          type: 'IndexAccess',
          object: expr,
          index
        };
      } else {
        break;
      }
    }

    return expr;
  }

  parseArguments() {
    const args = [];
    
    if (!this.check('RPAREN')) {
      do {
        args.push(this.parseExpression());
      } while (this.match('COMMA'));
    }

    return args;
  }

  parsePrimary() {
    const token = this.current();

    if (this.match('NUMBER')) {
      return {
        type: 'Literal',
        value: token.value,
        dataType: 'number'
      };
    }

    if (this.match('STRING')) {
      return {
        type: 'Literal',
        value: token.value,
        dataType: 'string'
      };
    }

    if (this.match('KEYWORD') && ['wahr', 'true'].includes(token.value)) {
      this.advance();
      return {
        type: 'Literal',
        value: true,
        dataType: 'boolean'
      };
    }

    if (this.match('KEYWORD') && ['falsch', 'false'].includes(token.value)) {
      this.advance();
      return {
        type: 'Literal',
        value: false,
        dataType: 'boolean'
      };
    }

    if (this.match('KEYWORD') && ['nichts', 'null', 'none'].includes(token.value)) {
      this.advance();
      return {
        type: 'Literal',
        value: null,
        dataType: 'null'
      };
    }

    if (this.match('IDENTIFIER')) {
      return {
        type: 'Identifier',
        name: token.value
      };
    }

    if (this.match('LPAREN')) {
      const expr = this.parseExpression();
      this.consume('RPAREN', "')' erwartet nach Ausdruck");
      return expr;
    }

    if (this.match('LBRACKET')) {
      const elements = this.parseArrayElements();
      return {
        type: 'Array',
        elements
      };
    }

    this.error(token, 'Unerwartetes Token im Ausdruck');
    return null;
  }

  parseArrayElements() {
    const elements = [];
    
    if (!this.check('RBRACKET')) {
      do {
        elements.push(this.parseExpression());
      } while (this.match('COMMA'));
    }

    this.consume('RBRACKET', "']' erwartet nach Array-Elementen");
    return elements;
  }

  // Helper methods
  match(...types) {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  check(type) {
    if (this.isAtEnd()) return false;
    return this.current().type === type;
  }

  consume(type, message) {
    if (this.check(type)) {
      return this.advance();
    }
    this.error(this.current(), message);
    return null;
  }

  advance() {
    if (!this.isAtEnd()) {
      this.lastToken = this.current();
      return this.tokens[this.position++];
    }
    return null;
  }

  current() {
    return this.tokens[this.position];
  }

  previous() {
    return this.lastToken;
  }

  isAtEnd() {
    return this.current()?.type === 'EOF';
  }

  skipNewlines() {
    while (this.check('NEWLINE')) {
      this.advance();
    }
  }

  error(token, message) {
    this.errors.push({
      type: 'PARSER_ERROR',
      message,
      line: token.line,
      token: token.value
    });
  }
}

module.exports = NCParser;
