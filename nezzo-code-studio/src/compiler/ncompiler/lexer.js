/**
 * NEZZOCODE (NC) Lexer
 * Eine deutsche, anfängerfreundliche Programmiersprache
 */

class NCLexer {
  constructor(source) {
    this.source = source;
    this.position = 0;
    this.tokens = [];
    this.errors = [];
    
    // Keywords der NC-Sprache
    this.keywords = new Set([
      'sage', 'print',
      'zahl', 'int', 'float', 'string', 'text', 'wahrheitswert', 'bool',
      'wenn', 'if',
      'sonst', 'else',
      'schleife', 'for', 'loop',
      'von', 'from',
      'bis', 'to',
      'solange', 'while',
      'funktion', 'func', 'function',
      'zurück', 'return',
      'klasse', 'class',
      'neu', 'new',
      'importiere', 'import',
      'exportiere', 'export',
      'wahr', 'true',
      'falsch', 'false',
      'nichts', 'null', 'none',
      'und', 'and',
      'oder', 'or',
      'nicht', 'not',
      'versuche', 'try',
      'fangen', 'catch',
      'werfe', 'throw'
    ]);

    // Token-Typen
    this.tokenTypes = {
      NUMBER: 'NUMBER',
      STRING: 'STRING',
      IDENTIFIER: 'IDENTIFIER',
      KEYWORD: 'KEYWORD',
      OPERATOR: 'OPERATOR',
      ASSIGNMENT: 'ASSIGNMENT',
      LPAREN: 'LPAREN',
      RPAREN: 'RPAREN',
      LBRACE: 'LBRACE',
      RBRACE: 'RBRACE',
      LBRACKET: 'LBRACKET',
      RBRACKET: 'RBRACKET',
      COMMA: 'COMMA',
      COLON: 'COLON',
      SEMICOLON: 'SEMICOLON',
      DOT: 'DOT',
      NEWLINE: 'NEWLINE',
      EOF: 'EOF'
    };
  }

  tokenize() {
    while (this.position < this.source.length) {
      this.skipWhitespace();
      
      if (this.position >= this.source.length) break;

      const char = this.source[this.position];

      // Kommentare
      if (char === '#' || (char === '/' && this.peek() === '/')) {
        this.skipComment();
        continue;
      }

      // Zahlen
      if (this.isDigit(char)) {
        this.tokens.push(this.readNumber());
        continue;
      }

      // Strings
      if (char === '"' || char === "'") {
        this.tokens.push(this.readString(char));
        continue;
      }

      // Identifier oder Keyword
      if (this.isAlpha(char) || char === '_') {
        this.tokens.push(this.readIdentifier());
        continue;
      }

      // Operatoren und Zeichen
      switch (char) {
        case '+':
          this.tokens.push({ type: this.tokenTypes.OPERATOR, value: '+', line: this.getLine() });
          this.position++;
          break;
        case '-':
          this.tokens.push({ type: this.tokenTypes.OPERATOR, value: '-', line: this.getLine() });
          this.position++;
          break;
        case '*':
          this.tokens.push({ type: this.tokenTypes.OPERATOR, value: '*', line: this.getLine() });
          this.position++;
          break;
        case '/':
          this.tokens.push({ type: this.tokenTypes.OPERATOR, value: '/', line: this.getLine() });
          this.position++;
          break;
        case '%':
          this.tokens.push({ type: this.tokenTypes.OPERATOR, value: '%', line: this.getLine() });
          this.position++;
          break;
        case '=':
          if (this.peek() === '=') {
            this.tokens.push({ type: this.tokenTypes.OPERATOR, value: '==', line: this.getLine() });
            this.position += 2;
          } else {
            this.tokens.push({ type: this.tokenTypes.ASSIGNMENT, value: '=', line: this.getLine() });
            this.position++;
          }
          break;
        case '<':
          if (this.peek() === '=') {
            this.tokens.push({ type: this.tokenTypes.OPERATOR, value: '<=', line: this.getLine() });
            this.position += 2;
          } else {
            this.tokens.push({ type: this.tokenTypes.OPERATOR, value: '<', line: this.getLine() });
            this.position++;
          }
          break;
        case '>':
          if (this.peek() === '=') {
            this.tokens.push({ type: this.tokenTypes.OPERATOR, value: '>=', line: this.getLine() });
            this.position += 2;
          } else {
            this.tokens.push({ type: this.tokenTypes.OPERATOR, value: '>', line: this.getLine() });
            this.position++;
          }
          break;
        case '!':
          if (this.peek() === '=') {
            this.tokens.push({ type: this.tokenTypes.OPERATOR, value: '!=', line: this.getLine() });
            this.position += 2;
          } else {
            this.tokens.push({ type: this.tokenTypes.OPERATOR, value: '!', line: this.getLine() });
            this.position++;
          }
          break;
        case '(':
          this.tokens.push({ type: this.tokenTypes.LPAREN, value: '(', line: this.getLine() });
          this.position++;
          break;
        case ')':
          this.tokens.push({ type: this.tokenTypes.RPAREN, value: ')', line: this.getLine() });
          this.position++;
          break;
        case '{':
          this.tokens.push({ type: this.tokenTypes.LBRACE, value: '{', line: this.getLine() });
          this.position++;
          break;
        case '}':
          this.tokens.push({ type: this.tokenTypes.RBRACE, value: '}', line: this.getLine() });
          this.position++;
          break;
        case '[':
          this.tokens.push({ type: this.tokenTypes.LBRACKET, value: '[', line: this.getLine() });
          this.position++;
          break;
        case ']':
          this.tokens.push({ type: this.tokenTypes.RBRACKET, value: ']', line: this.getLine() });
          this.position++;
          break;
        case ',':
          this.tokens.push({ type: this.tokenTypes.COMMA, value: ',', line: this.getLine() });
          this.position++;
          break;
        case ':':
          this.tokens.push({ type: this.tokenTypes.COLON, value: ':', line: this.getLine() });
          this.position++;
          break;
        case ';':
          this.tokens.push({ type: this.tokenTypes.SEMICOLON, value: ';', line: this.getLine() });
          this.position++;
          break;
        case '.':
          this.tokens.push({ type: this.tokenTypes.DOT, value: '.', line: this.getLine() });
          this.position++;
          break;
        case '\n':
          this.tokens.push({ type: this.tokenTypes.NEWLINE, value: '\n', line: this.getLine() });
          this.position++;
          break;
        default:
          this.errors.push({
            type: 'LEXER_ERROR',
            message: `Unerwartetes Zeichen: '${char}'`,
            line: this.getLine(),
            position: this.position
          });
          this.position++;
      }
    }

    this.tokens.push({ type: this.tokenTypes.EOF, value: '', line: this.getLine() });
    return { tokens: this.tokens, errors: this.errors };
  }

  peek(offset = 0) {
    return this.source[this.position + offset] || '';
  }

  isDigit(char) {
    return /[0-9]/.test(char);
  }

  isAlpha(char) {
    return /[a-zA-ZäöüÄÖÜß]/.test(char);
  }

  isAlphaNumeric(char) {
    return this.isAlpha(char) || this.isDigit(char);
  }

  skipWhitespace() {
    while (this.position < this.source.length && /\s/.test(this.source[this.position]) && this.source[this.position] !== '\n') {
      this.position++;
    }
  }

  skipComment() {
    while (this.position < this.source.length && this.source[this.position] !== '\n') {
      this.position++;
    }
  }

  readNumber() {
    let value = '';
    const line = this.getLine();
    
    while (this.position < this.source.length && (this.isDigit(this.source[this.position]) || this.source[this.position] === '.')) {
      value += this.source[this.position];
      this.position++;
    }

    return { type: this.tokenTypes.NUMBER, value: parseFloat(value), line };
  }

  readString(quote) {
    let value = '';
    const line = this.getLine();
    this.position++; // Skip opening quote

    while (this.position < this.source.length && this.source[this.position] !== quote) {
      if (this.source[this.position] === '\\') {
        this.position++;
        const escaped = this.source[this.position];
        switch (escaped) {
          case 'n': value += '\n'; break;
          case 't': value += '\t'; break;
          case 'r': value += '\r'; break;
          case '\\': value += '\\'; break;
          case quote: value += quote; break;
          default: value += escaped;
        }
      } else {
        value += this.source[this.position];
      }
      this.position++;
    }

    this.position++; // Skip closing quote
    return { type: this.tokenTypes.STRING, value, line };
  }

  readIdentifier() {
    let value = '';
    const line = this.getLine();

    while (this.position < this.source.length && this.isAlphaNumeric(this.source[this.position])) {
      value += this.source[this.position];
      this.position++;
    }

    const type = this.keywords.has(value) ? this.tokenTypes.KEYWORD : this.tokenTypes.IDENTIFIER;
    return { type, value, line };
  }

  getLine() {
    return this.source.substring(0, this.position).split('\n').length;
  }
}

module.exports = NCLexer;
