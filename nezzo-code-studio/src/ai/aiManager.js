const axios = require('axios');
const { EventEmitter } = require('events');

class AIManager extends EventEmitter {
  constructor() {
    super();
    this.apiKeys = new Map();
    this.models = {
      openai: {
        name: 'ChatGPT',
        endpoint: 'https://api.openai.com/v1/chat/completions',
        models: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
        defaultModel: 'gpt-4-turbo'
      },
      anthropic: {
        name: 'Claude',
        endpoint: 'https://api.anthropic.com/v1/messages',
        models: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
        defaultModel: 'claude-3-sonnet-20240229'
      },
      google: {
        name: 'Gemini',
        endpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
        models: ['gemini-pro', 'gemini-pro-vision'],
        defaultModel: 'gemini-pro'
      },
      deepseek: {
        name: 'DeepSeek',
        endpoint: 'https://api.deepseek.com/v1/chat/completions',
        models: ['deepseek-chat', 'deepseek-coder'],
        defaultModel: 'deepseek-coder'
      }
    };
    this.systemPrompt = `Du bist ein professioneller KI-Coding-Assistent in Nezzo Code Studio.
Deine Aufgaben:
- Hilfe beim Programmieren in verschiedenen Sprachen
- Code erklären und verbessern
- Bugs finden und beheben
- Best Practices empfehlen
- Bei der NC-Sprache helfen

Antworte präzise, professionell und auf Deutsch wenn nicht anders gefragt.`;
  }

  setApiKey(provider, apiKey) {
    this.apiKeys.set(provider, apiKey);
  }

  getApiKey(provider) {
    return this.apiKeys.get(provider);
  }

  async chat(messages, model = 'openai', apiKey = null) {
    const key = apiKey || this.getApiKey(model);
    
    if (!key) {
      return {
        success: false,
        error: 'API key not provided',
        requiresAuth: true
      };
    }

    try {
      const provider = this.models[model];
      if (!provider) {
        return { success: false, error: 'Unknown model provider' };
      }

      let response;

      switch (model) {
        case 'openai':
          response = await this.chatOpenAI(messages, key, provider.defaultModel);
          break;
        case 'anthropic':
          response = await this.chatAnthropic(messages, key, provider.defaultModel);
          break;
        case 'google':
          response = await this.chatGoogle(messages, key, provider.defaultModel);
          break;
        case 'deepseek':
          response = await this.chatDeepSeek(messages, key, provider.defaultModel);
          break;
        default:
          return { success: false, error: 'Unsupported model' };
      }

      return { success: true, ...response };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        response: error.response?.data
      };
    }
  }

  async chatOpenAI(messages, apiKey, model) {
    const fullMessages = [
      { role: 'system', content: this.systemPrompt },
      ...messages
    ];

    const response = await axios.post(
      this.models.openai.endpoint,
      {
        model,
        messages: fullMessages,
        temperature: 0.7,
        max_tokens: 4096,
        stream: false
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      content: response.data.choices[0].message.content,
      usage: response.data.usage,
      model: response.data.model,
      provider: 'openai'
    };
  }

  async chatAnthropic(messages, apiKey, model) {
    const systemMessage = messages.find(m => m.role === 'system')?.content || this.systemPrompt;
    const userMessages = messages.filter(m => m.role !== 'system');

    // Convert to Anthropic format
    const formattedMessages = userMessages.map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content
    }));

    const response = await axios.post(
      this.models.anthropic.endpoint,
      {
        model,
        max_tokens: 4096,
        system: systemMessage,
        messages: formattedMessages
      },
      {
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      content: response.data.content[0].text,
      usage: response.data.usage,
      model: response.data.model,
      provider: 'anthropic'
    };
  }

  async chatGoogle(messages, apiKey, model) {
    const lastMessage = messages[messages.length - 1]?.content || '';
    
    const response = await axios.post(
      `${this.models.google.endpoint}/${model}:generateContent?key=${apiKey}`,
      {
        contents: [{
          parts: [{ text: lastMessage }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 4096
        }
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      content: response.data.candidates[0].content.parts[0].text,
      model,
      provider: 'google'
    };
  }

  async chatDeepSeek(messages, apiKey, model) {
    const fullMessages = [
      { role: 'system', content: this.systemPrompt },
      ...messages
    ];

    const response = await axios.post(
      this.models.deepseek.endpoint,
      {
        model,
        messages: fullMessages,
        temperature: 0.7,
        max_tokens: 4096,
        stream: false
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      content: response.data.choices[0].message.content,
      usage: response.data.usage,
      model: response.data.model,
      provider: 'deepseek'
    };
  }

  async streamChat(messages, model = 'openai', apiKey = null) {
    const key = apiKey || this.getApiKey(model);
    
    if (!key) {
      return {
        success: false,
        error: 'API key not provided',
        requiresAuth: true
      };
    }

    // For streaming, we'll use Server-Sent Events or chunked responses
    // This is a simplified implementation
    return await this.chat(messages, model, key);
  }

  async codeComplete(code, language, position, model = 'deepseek') {
    const prompt = `Vervollständige den folgenden ${language} Code an der markierten Position.
Gib nur den Code zurück, keine Erklärungen.

Code:
\`\`\`${language}
${code}
\`\`\`

Vervollständige den Code ab dieser Position:`;

    const result = await this.chat([
      { role: 'user', content: prompt }
    ], model);

    return result;
  }

  async explainCode(code, language, model = 'openai') {
    const prompt = `Erkläre den folgenden ${language} Code detailliert aber verständlich.
Gehe auf die Logik, Funktionen und eventuelle Besonderheiten ein.

Code:
\`\`\`${language}
${code}
\`\`\``;

    return await this.chat([
      { role: 'user', content: prompt }
    ], model);
  }

  async refactorCode(code, language, instructions, model = 'openai') {
    const prompt = `Refaktorisiere den folgenden ${language} Code gemäß diesen Anweisungen:
${instructions}

Code:
\`\`\`${language}
${code}
\`\`\`

Gib nur den refaktorisierten Code zurück, keine Erklärungen.`;

    return await this.chat([
      { role: 'user', content: prompt }
    ], model);
  }

  async fixBugs(code, language, errors, model = 'openai') {
    const prompt = `Finde und behebe die Fehler im folgenden ${language} Code.

Fehlermeldungen:
${errors}

Code:
\`\`\`${language}
${code}
\`\`\`

Gib den korrigierten Code zurück und erkläre kurz was du geändert hast.`;

    return await this.chat([
      { role: 'user', content: prompt }
    ], model);
  }

  async analyzeProject(files, model = 'openai') {
    const fileSummaries = files.map(f => `- ${f.path} (${f.language})`).join('\n');
    
    const prompt = `Analysiere diese Projektstruktur und gib Empfehlungen zur Architektur und Organisation.

Projektdateien:
${fileSummaries}

Was sind deine Empfehlungen?`;

    return await this.chat([
      { role: 'user', content: prompt }
    ], model);
  }

  async generateDocumentation(code, language, type = 'api', model = 'openai') {
    const prompt = `Erstelle ${type} Dokumentation für den folgenden ${language} Code.

Code:
\`\`\`${language}
${code}
\`\`\``;

    return await this.chat([
      { role: 'user', content: prompt }
    ], model);
  }

  async writeTests(code, language, framework = 'jest', model = 'openai') {
    const prompt = `Schreibe umfassende Tests für den folgenden ${language} Code mit ${framework}.

Code:
\`\`\`${language}
${code}
\`\`\`

Erstelle vollständige Testfälle mit allen wichtigen Szenarien.`;

    return await this.chat([
      { role: 'user', content: prompt }
    ], model);
  }

  async optimizeCode(code, language, focus = 'performance', model = 'openai') {
    const prompt = `Optimiere den folgenden ${language} Code für ${focus}.

Code:
\`\`\`${language}
${code}
\`\`\`

Gib den optimierten Code zurück und erkläre die Verbesserungen.`;

    return await this.chat([
      { role: 'user', content: prompt }
    ], model);
  }

  async translateCode(code, fromLanguage, toLanguage, model = 'openai') {
    const prompt = `Übersetze den folgenden Code von ${fromLanguage} nach ${toLanguage}.
Behalte die Funktionalität bei und verwende idiomatische Patterns der Zielsprache.

Code:
\`\`\`${fromLanguage}
${code}
\`\`\``;

    return await this.chat([
      { role: 'user', content: prompt }
    ], model);
  }

  // Context-aware AI assistance
  async getContextualHelp(context, query, model = 'openai') {
    const { currentFile, openFiles, projectStructure, selectedCode } = context;

    const prompt = `Ich brauche Hilfe mit folgendem Kontext:

Aktuelle Datei: ${currentFile?.path || 'unbekannt'}
Offene Dateien: ${openFiles?.length || 0}
Ausgewählter Code: ${selectedCode ? selectedCode.substring(0, 500) + '...' : 'kein'}

Frage: ${query}

Bitte gib eine hilfreiche Antwort basierend auf diesem Kontext.`;

    return await this.chat([
      { role: 'user', content: prompt }
    ], model);
  }

  // AI Terminal Assistant
  async suggestCommand(intent, context = {}, model = 'openai') {
    const { platform, shell, currentDirectory, previousCommands } = context;

    const prompt = `Der Benutzer möchte: ${intent}

Plattform: ${platform}
Shell: ${shell}
Verzeichnis: ${currentDirectory}
Vorherige Befehle: ${previousCommands?.slice(-5).join('; ') || 'keine'}

Welcher Terminal-Befehl wäre angemessen? Gib nur den Befehl zurück.`;

    return await this.chat([
      { role: 'user', content: prompt }
    ], model);
  }

  async explainCommand(command, model = 'openai') {
    const prompt = `Erkläre was dieser Terminal-Befehl macht, sicherheitstechnische Bedenken und eventuelle Risiken:

Befehl: ${command}`;

    return await this.chat([
      { role: 'user', content: prompt }
    ], model);
  }
}

module.exports = AIManager;
