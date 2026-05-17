const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');

class FileManager {
  constructor() {
    this.watchers = new Map();
    this.recentFiles = [];
    this.maxRecentFiles = 20;
  }

  async readFile(filePath) {
    try {
      const absolutePath = path.resolve(filePath);
      const content = await fs.promises.readFile(absolutePath, 'utf-8');
      this.addToRecent(filePath);
      return { success: true, content, path: absolutePath };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async writeFile(filePath, content) {
    try {
      const absolutePath = path.resolve(filePath);
      const dir = path.dirname(absolutePath);
      
      // Ensure directory exists
      if (!fs.existsSync(dir)) {
        await fs.promises.mkdir(dir, { recursive: true });
      }
      
      await fs.promises.writeFile(absolutePath, content, 'utf-8');
      this.addToRecent(filePath);
      return { success: true, path: absolutePath };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async deleteFile(filePath) {
    try {
      const absolutePath = path.resolve(filePath);
      await fs.promises.unlink(absolutePath);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async fileExists(filePath) {
    try {
      const absolutePath = path.resolve(filePath);
      const stats = await fs.promises.stat(absolutePath);
      return { exists: true, isFile: stats.isFile(), isDirectory: stats.isDirectory() };
    } catch (error) {
      return { exists: false };
    }
  }

  async createDirectory(dirPath) {
    try {
      const absolutePath = path.resolve(dirPath);
      await fs.promises.mkdir(absolutePath, { recursive: true });
      return { success: true, path: absolutePath };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async listDirectory(dirPath) {
    try {
      const absolutePath = path.resolve(dirPath);
      const entries = await fs.promises.readdir(absolutePath, { withFileTypes: true });
      
      const items = entries.map(entry => ({
        name: entry.name,
        path: path.join(absolutePath, entry.name),
        isDirectory: entry.isDirectory(),
        isFile: entry.isFile(),
        isSymbolicLink: entry.isSymbolicLink()
      }));
      
      // Sort: directories first, then files
      items.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });
      
      return { success: true, items, path: absolutePath };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async searchFiles(rootPath, pattern, options = {}) {
    try {
      const results = [];
      const absoluteRoot = path.resolve(rootPath);
      
      const globPattern = options.caseSensitive ? pattern : pattern.toLowerCase();
      
      const walker = async (dir) => {
        const entries = await fs.promises.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          
          // Skip hidden and node_modules by default
          if (entry.name.startsWith('.') || entry.name === 'node_modules') {
            if (!options.includeHidden) continue;
          }
          
          if (entry.isDirectory()) {
            await walker(fullPath);
          } else if (entry.isFile()) {
            const fileName = options.caseSensitive ? entry.name : entry.name.toLowerCase();
            if (fileName.includes(globPattern) || 
                (options.regex && new RegExp(pattern).test(entry.name))) {
              results.push({
                name: entry.name,
                path: fullPath,
                relativePath: path.relative(absoluteRoot, fullPath)
              });
            }
          }
        }
      };
      
      await walker(absoluteRoot);
      return { success: true, results };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async searchInFiles(rootPath, searchText, options = {}) {
    try {
      const results = [];
      const absoluteRoot = path.resolve(rootPath);
      
      const walker = async (dir) => {
        const entries = await fs.promises.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          
          if (entry.name.startsWith('.') || entry.name === 'node_modules') {
            if (!options.includeHidden) continue;
          }
          
          if (entry.isDirectory()) {
            await walker(fullPath);
          } else if (entry.isFile()) {
            // Check file extension filter
            if (options.extensions && !options.extensions.some(ext => entry.name.endsWith(ext))) {
              continue;
            }
            
            try {
              const content = await fs.promises.readFile(fullPath, 'utf-8');
              const lines = content.split('\n');
              
              for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                const lineContent = options.caseSensitive ? line : line.toLowerCase();
                const searchTerm = options.caseSensitive ? searchText : searchText.toLowerCase();
                
                if (lineContent.includes(searchTerm)) {
                  results.push({
                    file: fullPath,
                    relativePath: path.relative(absoluteRoot, fullPath),
                    line: i + 1,
                    content: line.trim(),
                    matches: this.countMatches(line, searchText, options.caseSensitive)
                  });
                }
              }
            } catch (e) {
              // Skip binary files
            }
          }
        }
      };
      
      await walker(absoluteRoot);
      return { success: true, results };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  countMatches(text, search, caseSensitive) {
    const source = caseSensitive ? text : text.toLowerCase();
    const target = caseSensitive ? search : search.toLowerCase();
    let count = 0;
    let pos = 0;
    
    while ((pos = source.indexOf(target, pos)) !== -1) {
      count++;
      pos += target.length;
    }
    
    return count;
  }

  watchDirectory(dirPath, callback) {
    const absolutePath = path.resolve(dirPath);
    
    const watcher = chokidar.watch(absolutePath, {
      persistent: true,
      ignoreInitial: true,
      ignored: /(^|[\/\\])\../
    });
    
    watcher.on('add', (path) => callback({ type: 'add', path }));
    watcher.on('change', (path) => callback({ type: 'change', path }));
    watcher.on('unlink', (path) => callback({ type: 'unlink', path }));
    watcher.on('addDir', (path) => callback({ type: 'addDir', path }));
    watcher.on('unlinkDir', (path) => callback({ type: 'unlinkDir', path }));
    
    this.watchers.set(dirPath, watcher);
    
    return () => {
      watcher.close();
      this.watchers.delete(dirPath);
    };
  }

  unwatchDirectory(dirPath) {
    const watcher = this.watchers.get(dirPath);
    if (watcher) {
      watcher.close();
      this.watchers.delete(dirPath);
    }
  }

  addToRecent(filePath) {
    const index = this.recentFiles.indexOf(filePath);
    if (index > -1) {
      this.recentFiles.splice(index, 1);
    }
    this.recentFiles.unshift(filePath);
    
    if (this.recentFiles.length > this.maxRecentFiles) {
      this.recentFiles.pop();
    }
  }

  getRecentFiles() {
    return this.recentFiles;
  }

  async copyFile(source, destination) {
    try {
      const absSource = path.resolve(source);
      const absDest = path.resolve(destination);
      
      await fs.promises.copyFile(absSource, absDest);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async moveFile(source, destination) {
    try {
      const absSource = path.resolve(source);
      const absDest = path.resolve(destination);
      
      await fs.promises.rename(absSource, absDest);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getFileInfo(filePath) {
    try {
      const absolutePath = path.resolve(filePath);
      const stats = await fs.promises.stat(absolutePath);
      
      return {
        success: true,
        info: {
          path: absolutePath,
          name: path.basename(absolutePath),
          extension: path.extname(absolutePath),
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime,
          accessed: stats.atime,
          isFile: stats.isFile(),
          isDirectory: stats.isDirectory()
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = FileManager;
