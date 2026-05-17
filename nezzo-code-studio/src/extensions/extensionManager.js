const { EventEmitter } = require('events');
const fs = require('fs');
const path = require('path');

class ExtensionManager extends EventEmitter {
  constructor() {
    super();
    this.extensions = new Map();
    this.marketplaceUrl = 'https://marketplace.nezzo.dev';
    this.extensionPath = path.join(process.env.HOME || process.env.USERPROFILE, '.nezzo', 'extensions');
    
    // Ensure extension directory exists
    if (!fs.existsSync(this.extensionPath)) {
      fs.mkdirSync(this.extensionPath, { recursive: true });
    }
    
    this.loadInstalledExtensions();
  }

  async loadInstalledExtensions() {
    try {
      const files = fs.readdirSync(this.extensionPath);
      
      for (const file of files) {
        const extPath = path.join(this.extensionPath, file);
        const stat = fs.statSync(extPath);
        
        if (stat.isDirectory()) {
          try {
            const manifestPath = path.join(extPath, 'extension.json');
            if (fs.existsSync(manifestPath)) {
              const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
              this.extensions.set(manifest.id, {
                ...manifest,
                path: extPath,
                enabled: true
              });
            }
          } catch (e) {
            console.error(`Failed to load extension ${file}:`, e);
          }
        }
      }
      
      this.emit('extensions-loaded', Array.from(this.extensions.values()));
    } catch (error) {
      console.error('Failed to load extensions:', error);
    }
  }

  async install(extensionId) {
    try {
      // Check if already installed
      if (this.extensions.has(extensionId)) {
        return {
          success: false,
          error: 'Extension already installed',
          extensionId
        };
      }

      // Fetch from marketplace
      const response = await fetch(`${this.marketplaceUrl}/api/extensions/${extensionId}`);
      
      if (!response.ok) {
        return {
          success: false,
          error: 'Extension not found in marketplace'
        };
      }

      const extensionData = await response.json();
      const extDir = path.join(this.extensionPath, extensionId);

      // Create extension directory
      fs.mkdirSync(extDir, { recursive: true });

      // Download and save files
      for (const file of extensionData.files) {
        const filePath = path.join(extDir, file.path);
        const dir = path.dirname(filePath);
        
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        
        fs.writeFileSync(filePath, Buffer.from(file.content, 'base64'));
      }

      // Save manifest
      const manifest = {
        id: extensionData.id,
        name: extensionData.name,
        version: extensionData.version,
        description: extensionData.description,
        author: extensionData.author,
        publisher: extensionData.publisher,
        categories: extensionData.categories,
        activationEvents: extensionData.activationEvents,
        contributes: extensionData.contributes,
        engines: extensionData.engines,
        installedAt: new Date().toISOString()
      };

      fs.writeFileSync(
        path.join(extDir, 'extension.json'),
        JSON.stringify(manifest, null, 2)
      );

      // Load extension
      this.extensions.set(extensionId, {
        ...manifest,
        path: extDir,
        enabled: true
      });

      this.emit('extension-installed', manifest);
      
      return {
        success: true,
        extension: manifest
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async uninstall(extensionId) {
    try {
      const extension = this.extensions.get(extensionId);
      
      if (!extension) {
        return {
          success: false,
          error: 'Extension not found'
        };
      }

      // Remove extension directory
      fs.rmSync(extension.path, { recursive: true, force: true });
      
      // Remove from registry
      this.extensions.delete(extensionId);
      
      this.emit('extension-uninstalled', extensionId);
      
      return {
        success: true,
        extensionId
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async enable(extensionId) {
    const extension = this.extensions.get(extensionId);
    
    if (!extension) {
      return {
        success: false,
        error: 'Extension not found'
      };
    }

    extension.enabled = true;
    this.emit('extension-enabled', extensionId);
    
    return { success: true };
  }

  async disable(extensionId) {
    const extension = this.extensions.get(extensionId);
    
    if (!extension) {
      return {
        success: false,
        error: 'Extension not found'
      };
    }

    extension.enabled = false;
    this.emit('extension-disabled', extensionId);
    
    return { success: true };
  }

  list() {
    return Array.from(this.extensions.values());
  }

  get(extensionId) {
    return this.extensions.get(extensionId);
  }

  async search(query, options = {}) {
    try {
      const response = await fetch(
        `${this.marketplaceUrl}/api/extensions/search?q=${encodeURIComponent(query)}&limit=${options.limit || 20}`
      );
      
      if (!response.ok) {
        return {
          success: false,
          error: 'Search failed'
        };
      }

      const results = await response.json();
      return {
        success: true,
        results
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async update(extensionId) {
    const extension = this.extensions.get(extensionId);
    
    if (!extension) {
      return {
        success: false,
        error: 'Extension not found'
      };
    }

    try {
      // Check for updates
      const response = await fetch(`${this.marketplaceUrl}/api/extensions/${extensionId}`);
      
      if (!response.ok) {
        return {
          success: false,
          error: 'Could not check for updates'
        };
      }

      const latestData = await response.json();
      
      if (latestData.version === extension.version) {
        return {
          success: true,
          updated: false,
          message: 'Already up to date'
        };
      }

      // Uninstall old version
      await this.uninstall(extensionId);
      
      // Install new version
      return await this.install(extensionId);
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async updateAll() {
    const results = [];
    
    for (const [id, extension] of this.extensions) {
      const result = await this.update(id);
      results.push({ extensionId: id, ...result });
    }
    
    return results;
  }

  // Extension activation
  async activate(extensionId) {
    const extension = this.extensions.get(extensionId);
    
    if (!extension) {
      return { success: false, error: 'Extension not found' };
    }

    if (!extension.enabled) {
      return { success: false, error: 'Extension is disabled' };
    }

    try {
      // Load main entry point
      const mainPath = path.join(extension.path, 'main.js');
      
      if (fs.existsSync(mainPath)) {
        const module = require(mainPath);
        
        if (module.activate) {
          await module.activate({
            subscriptions: [],
            extensionPath: extension.path
          });
        }
      }

      this.emit('extension-activated', extensionId);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async deactivate(extensionId) {
    const extension = this.extensions.get(extensionId);
    
    if (!extension) {
      return { success: false, error: 'Extension not found' };
    }

    try {
      const mainPath = path.join(extension.path, 'main.js');
      
      if (fs.existsSync(mainPath)) {
        const module = require(mainPath);
        
        if (module.deactivate) {
          await module.deactivate();
        }
      }

      this.emit('extension-deactivated', extensionId);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Get extensions by category
  getByCategory(category) {
    return Array.from(this.extensions.values()).filter(
      ext => ext.categories && ext.categories.includes(category)
    );
  }

  // Get enabled extensions
  getEnabled() {
    return Array.from(this.extensions.values()).filter(ext => ext.enabled);
  }

  // Extension statistics
  getStats() {
    const extensions = Array.from(this.extensions.values());
    return {
      total: extensions.length,
      enabled: extensions.filter(e => e.enabled).length,
      disabled: extensions.filter(e => !e.enabled).length,
      categories: [...new Set(extensions.flatMap(e => e.categories || []))]
    };
  }
}

module.exports = ExtensionManager;
