const pty = require('node-pty');
const os = require('os');
const { EventEmitter } = require('events');

class TerminalManager extends EventEmitter {
  constructor() {
    super();
    this.terminals = new Map();
    this.terminalIdCounter = 0;
    this.defaultShell = this.getDefaultShell();
  }

  getDefaultShell() {
    switch (os.platform()) {
      case 'win32':
        return process.env.COMSPEC || 'cmd.exe';
      case 'darwin':
        return '/bin/zsh';
      default:
        return process.env.SHELL || '/bin/bash';
    }
  }

  async createTerminal(options = {}) {
    const {
      shell = this.defaultShell,
      cwd = process.env.HOME || process.env.USERPROFILE,
      env = process.env,
      cols = 80,
      rows = 24,
      name = `Terminal ${++this.terminalIdCounter}`
    } = options;

    try {
      const id = `terminal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const ptyProcess = pty.spawn(shell, [], {
        name: 'xterm-256color',
        cols,
        rows,
        cwd,
        env,
        handleFlowControl: true
      });

      const terminal = {
        id,
        name,
        process: ptyProcess,
        cols,
        rows,
        cwd,
        shell,
        createdAt: new Date(),
        isActive: true,
        buffer: '',
        history: []
      };

      // Handle output
      ptyProcess.onData((data) => {
        terminal.buffer += data;
        terminal.history.push({ type: 'output', data, timestamp: Date.now() });
        
        // Keep history limited
        if (terminal.history.length > 10000) {
          terminal.history = terminal.history.slice(-5000);
        }

        this.emit('data', { id, data });
      });

      // Handle exit
      ptyProcess.onExit(({ exitCode }) => {
        terminal.isActive = false;
        this.emit('exit', { id, exitCode });
      });

      this.terminals.set(id, terminal);
      
      return {
        success: true,
        id,
        name,
        shell,
        cwd
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async writeToTerminal(id, data) {
    const terminal = this.terminals.get(id);
    
    if (!terminal || !terminal.isActive) {
      return { success: false, error: 'Terminal not found or inactive' };
    }

    try {
      terminal.process.write(data);
      terminal.history.push({ type: 'input', data, timestamp: Date.now() });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async resizeTerminal(id, cols, rows) {
    const terminal = this.terminals.get(id);
    
    if (!terminal || !terminal.isActive) {
      return { success: false, error: 'Terminal not found or inactive' };
    }

    try {
      terminal.process.resize(cols, rows);
      terminal.cols = cols;
      terminal.rows = rows;
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async killTerminal(id) {
    const terminal = this.terminals.get(id);
    
    if (!terminal) {
      return { success: false, error: 'Terminal not found' };
    }

    try {
      if (terminal.isActive) {
        terminal.process.kill();
      }
      this.terminals.delete(id);
      this.emit('killed', { id });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  getTerminal(id) {
    const terminal = this.terminals.get(id);
    
    if (!terminal) {
      return null;
    }

    return {
      id: terminal.id,
      name: terminal.name,
      shell: terminal.shell,
      cwd: terminal.cwd,
      cols: terminal.cols,
      rows: terminal.rows,
      isActive: terminal.isActive,
      createdAt: terminal.createdAt
    };
  }

  listTerminals() {
    const terminals = [];
    
    for (const [id, terminal] of this.terminals) {
      terminals.push({
        id: terminal.id,
        name: terminal.name,
        shell: terminal.shell,
        isActive: terminal.isActive,
        createdAt: terminal.createdAt
      });
    }

    return terminals;
  }

  async sendSignal(id, signal) {
    const terminal = this.terminals.get(id);
    
    if (!terminal || !terminal.isActive) {
      return { success: false, error: 'Terminal not found or inactive' };
    }

    try {
      // node-pty doesn't directly support signals, but we can send control characters
      switch (signal) {
        case 'SIGINT':
          terminal.process.write('\x03'); // Ctrl+C
          break;
        case 'SIGTERM':
          terminal.process.write('\x1A'); // Ctrl+Z
          break;
        case 'SIGKILL':
          return await this.killTerminal(id);
        default:
          return { success: false, error: `Unknown signal: ${signal}` };
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async changeDirectory(id, dirPath) {
    const terminal = this.terminals.get(id);
    
    if (!terminal || !terminal.isActive) {
      return { success: false, error: 'Terminal not found or inactive' };
    }

    try {
      const cdCommand = os.platform() === 'win32' ? `cd "${dirPath}"` : `cd "${dirPath}"`;
      terminal.process.write(cdCommand + '\r');
      terminal.cwd = dirPath;
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  getTerminalHistory(id, limit = 100) {
    const terminal = this.terminals.get(id);
    
    if (!terminal) {
      return { success: false, error: 'Terminal not found' };
    }

    const history = terminal.history.slice(-limit);
    return { success: true, history };
  }

  clearTerminal(id) {
    const terminal = this.terminals.get(id);
    
    if (!terminal) {
      return { success: false, error: 'Terminal not found' };
    }

    // Send clear command based on platform
    const clearCommand = os.platform() === 'win32' ? 'cls\r' : 'clear\r';
    terminal.process.write(clearCommand);
    terminal.history = [];
    terminal.buffer = '';
    
    return { success: true };
  }

  cleanup() {
    for (const [id, terminal] of this.terminals) {
      if (terminal.isActive) {
        try {
          terminal.process.kill();
        } catch (e) {
          // Ignore errors during cleanup
        }
      }
    }
    this.terminals.clear();
  }

  // AI Terminal Assistant - Execute commands safely
  async executeCommand(id, command, options = {}) {
    const { 
      timeout = 30000,
      validateOutput = true,
      allowedCommands = []
    } = options;

    // Validate command if restrictions are set
    if (allowedCommands.length > 0) {
      const baseCommand = command.split(' ')[0];
      if (!allowedCommands.some(allowed => baseCommand.startsWith(allowed))) {
        return {
          success: false,
          error: 'Command not allowed',
          blocked: true
        };
      }
    }

    const terminal = this.terminals.get(id);
    if (!terminal || !terminal.isActive) {
      return { success: false, error: 'Terminal not found or inactive' };
    }

    return new Promise((resolve) => {
      let output = '';
      let completed = false;
      let timeoutId = null;

      const onDataHandler = (data) => {
        if (data.id === id) {
          output += data.data;
        }
      };

      const onExitHandler = ({ id: exitId, exitCode }) => {
        if (exitId === id && !completed) {
          completed = true;
          clearTimeout(timeoutId);
          this.removeListener('data', onDataHandler);
          this.removeListener('exit', onExitHandler);
          
          resolve({
            success: exitCode === 0,
            output,
            exitCode
          });
        }
      };

      this.on('data', onDataHandler);
      this.on('exit', onExitHandler);

      // Execute command
      terminal.process.write(command + '\r');

      // Set timeout
      timeoutId = setTimeout(() => {
        if (!completed) {
          completed = true;
          this.removeListener('data', onDataHandler);
          this.removeListener('exit', onExitHandler);
          resolve({
            success: false,
            error: 'Command timed out',
            output,
            timeout: true
          });
        }
      }, timeout);
    });
  }
}

module.exports = TerminalManager;
