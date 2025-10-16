// Enhanced Content Script with robust error handling and performance optimizations

// Type definitions
type Req = {
  id?: string | number;
  method: string;
  params?: unknown[] | Record<string, unknown>;
};

type PageToCS = {
  target: 'herowallet:inpage->cs';
  payload: Req;
};

type Res = {
  target: 'herowallet:cs->inpage';
  ok: boolean;
  id?: string | number;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
};

type BackgroundMessage = {
  kind: 'PAGE_REQUEST';
  from: 'content-script';
  url: string;
  request: Req;
};

// Enhanced injection manager
class HeroWalletInjector {
  private static readonly INJECTION_MARKER = 'data-hero-wallet';
  private static readonly INJECTION_VALUE = 'injected';
  private static readonly MAX_INJECTION_ATTEMPTS = 5;
  private static readonly INJECTION_RETRY_DELAY = 50;

  private injectionAttempts = 0;
  private injected = false;
  private retryTimeouts: NodeJS.Timeout[] = [];

  constructor() {
    this.init();
  }

  private init(): void {
    console.log(
      'Hero Wallet content script initialized at:',
      document.readyState
    );

    // Start injection process immediately
    this.attemptInjection();

    // Listen for DOM changes in case injection target becomes available
    this.setupDOMObserver();

    // Setup cleanup on page unload
    this.setupCleanup();
  }

  private attemptInjection(): void {
    if (
      this.injected ||
      this.injectionAttempts >= HeroWalletInjector.MAX_INJECTION_ATTEMPTS
    ) {
      return;
    }

    this.injectionAttempts++;

    try {
      // Check if already injected by another instance
      if (this.isAlreadyInjected()) {
        console.log('Hero Wallet: Script already injected by another instance');
        this.injected = true;
        return;
      }

      // Get the inpage script URL and validate it
      const scriptUrl = this.getInpageScriptUrl();
      if (!scriptUrl) {
        console.error('Hero Wallet: Cannot get inpage script URL');
        this.scheduleRetry();
        return;
      }

      // Create and configure script element
      const script = this.createScriptElement(scriptUrl);
      const target = this.findInjectionTarget();

      if (!target) {
        console.warn(
          `Hero Wallet: No injection target found (attempt ${this.injectionAttempts})`
        );
        this.scheduleRetry();
        return;
      }

      // Inject the script
      this.injectScript(script, target);
    } catch (error) {
      console.error('Hero Wallet: Injection attempt failed:', error);
      this.scheduleRetry();
    }
  }

  private isAlreadyInjected(): boolean {
    return !!document.querySelector(
      `script[${HeroWalletInjector.INJECTION_MARKER}="${HeroWalletInjector.INJECTION_VALUE}"]`
    );
  }

  private getInpageScriptUrl(): string | null {
    try {
      if (!chrome.runtime?.getURL) {
        throw new Error('Chrome runtime not available');
      }
      return chrome.runtime.getURL('inpage.js');
    } catch (error) {
      console.error('Hero Wallet: Failed to get script URL:', error);
      return null;
    }
  }

  private createScriptElement(src: string): HTMLScriptElement {
    const script = document.createElement('script');
    script.src = src;
    script.async = false; // Ensure synchronous execution
    script.type = 'text/javascript';
    script.setAttribute(
      HeroWalletInjector.INJECTION_MARKER,
      HeroWalletInjector.INJECTION_VALUE
    );

    // Add load/error handlers
    script.onload = () => {
      console.log('Hero Wallet: Inpage script loaded successfully');
      this.injected = true;
      this.cleanup();
      // Remove script element after successful load
      setTimeout(() => script.remove(), 100);
    };

    script.onerror = (error) => {
      console.error('Hero Wallet: Inpage script failed to load:', error);
      this.scheduleRetry();
    };

    return script;
  }

  private findInjectionTarget(): Element | null {
    // Try injection targets in order of preference
    const targets = [document.head, document.documentElement, document.body];

    return targets.find((target) => target && target.appendChild) || null;
  }

  private injectScript(script: HTMLScriptElement, target: Element): void {
    target.appendChild(script);
    console.log(
      `Hero Wallet: Script injected into ${target.tagName} (attempt ${this.injectionAttempts})`
    );
  }

  private scheduleRetry(): void {
    if (this.injectionAttempts < HeroWalletInjector.MAX_INJECTION_ATTEMPTS) {
      const delay =
        HeroWalletInjector.INJECTION_RETRY_DELAY * this.injectionAttempts;
      const timeout = setTimeout(() => {
        console.log(
          `Hero Wallet: Retrying injection (attempt ${
            this.injectionAttempts + 1
          })`
        );
        this.attemptInjection();
      }, delay);
      this.retryTimeouts.push(timeout);
    } else {
      console.error('Hero Wallet: Max injection attempts reached, giving up');
    }
  }

  private setupDOMObserver(): void {
    // Only setup observer if DOM is not ready
    if (document.readyState === 'loading') {
      const observer = new MutationObserver((mutations) => {
        // Check if head or documentElement became available
        if (!this.injected && (document.head || document.documentElement)) {
          this.attemptInjection();
        }

        // Disconnect observer once we have a target or are injected
        if (this.injected || document.head || document.documentElement) {
          observer.disconnect();
        }
      });

      observer.observe(document, {
        childList: true,
        subtree: true,
      });

      // Also listen for DOMContentLoaded
      document.addEventListener(
        'DOMContentLoaded',
        () => {
          console.log('Hero Wallet: DOM content loaded');
          this.attemptInjection();
        },
        { once: true }
      );
    }
  }

  private setupCleanup(): void {
    // Clean up timeouts on page unload
    window.addEventListener(
      'beforeunload',
      () => {
        this.cleanup();
      },
      { once: true }
    );
  }

  private cleanup(): void {
    // Clear any pending retry timeouts
    this.retryTimeouts.forEach((timeout) => clearTimeout(timeout));
    this.retryTimeouts = [];
  }
}

// Enhanced message handling with better error management
class HeroWalletMessageHandler {
  private static readonly MESSAGE_TIMEOUT = 30000; // 30 seconds
  private pendingRequests = new Map<string | number, NodeJS.Timeout>();
  private port: chrome.runtime.Port | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private static readonly PORT_NAME = 'herowallet:page-bridge';

  constructor() {
    this.setupMessageListeners();
    this.connectToBackground();
  }

  private setupMessageListeners(): void {
    // Listen for messages from inpage script
    window.addEventListener('message', this.handleInpageMessage.bind(this));

    // Listen for messages from background script
    if (chrome.runtime?.onMessage) {
      chrome.runtime.onMessage.addListener(
        this.handleBackgroundMessage.bind(this)
      );
    }
  }

  private connectToBackground(): void {
    try {
      if (!chrome.runtime?.connect) {
        console.warn('Hero Wallet: chrome.runtime.connect unavailable');
        return;
      }

      if (this.port) {
        this.port.disconnect();
      }

      console.log('Hero Wallet: Establishing port connection to background');
      this.port = chrome.runtime.connect({
        name: HeroWalletMessageHandler.PORT_NAME,
      });

      this.port.onMessage.addListener((message: Res) => {
        this.handleBackgroundResponse(message);
      });

      this.port.onDisconnect.addListener(() => {
        console.warn('Hero Wallet: Background port disconnected');
        this.port = null;

        const pendingIds = Array.from(this.pendingRequests.keys());
        pendingIds.forEach((requestId) => {
          this.clearRequestTimeout(requestId);
          this.sendErrorResponse(
            requestId,
            -32603,
            'Background connection lost'
          );
        });

        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
        }

        this.reconnectTimer = setTimeout(() => {
          this.connectToBackground();
        }, 1000);
      });
    } catch (error) {
      console.error(
        'Hero Wallet: Failed to connect to background port:',
        error
      );
    }
  }

  private handleInpageMessage(event: MessageEvent<PageToCS>): void {
    // Security: only accept messages from same window
    if (event.source !== window) return;

    const message = event.data;
    if (!this.isValidInpageMessage(message)) return;

    const requestId = message.payload.id;
    const method = message.payload.method;

    console.log(`📨 Content script received: ${method} (ID: ${requestId})`);

    // Check extension context validity
    if (!this.isExtensionContextValid()) {
      console.warn('Hero Wallet: Extension context invalidated');
      this.sendErrorResponse(
        requestId,
        -32603,
        'Extension context invalidated'
      );
      return;
    }

    try {
      // Set up timeout for this request
      if (requestId) {
        this.setupRequestTimeout(requestId);
      }

      // Send message to background script
      const backgroundMessage: BackgroundMessage = {
        kind: 'PAGE_REQUEST',
        from: 'content-script',
        url: location.href,
        request: message.payload,
      };

      this.dispatchToBackground(backgroundMessage, method, requestId);
    } catch (error) {
      console.error('Hero Wallet: Failed to process inpage message:', error);
      this.sendErrorResponse(requestId, -32603, 'Internal error');
    }
  }

  private handleBackgroundMessage(message: Res): void {
    if (this.isValidBackgroundMessage(message)) {
      this.handleBackgroundResponse(message);
    }
  }

  private handleBackgroundResponse(message: Res): void {
    const requestId = message?.id;
    if (requestId !== undefined) {
      this.clearRequestTimeout(requestId);
    }

    if (!message) {
      return;
    }

    if (!message.ok && message.error?.message) {
      console.warn('Hero Wallet: Background error response:', message.error);
    }

    this.forwardToInpage(message);
  }

  private isValidInpageMessage(message: unknown): message is PageToCS {
    return (
      typeof message === 'object' &&
      message !== null &&
      'target' in message &&
      message.target === 'herowallet:inpage->cs' &&
      'payload' in message &&
      typeof message.payload === 'object'
    );
  }

  private isValidBackgroundMessage(message: unknown): message is Res {
    return (
      typeof message === 'object' &&
      message !== null &&
      'target' in message &&
      message.target === 'herowallet:cs->inpage'
    );
  }

  private isExtensionContextValid(): boolean {
    try {
      return !!(chrome.runtime && chrome.runtime.id);
    } catch {
      return false;
    }
  }

  private setupRequestTimeout(requestId: string | number): void {
    const timeout = setTimeout(() => {
      console.warn(`Hero Wallet: Request ${requestId} timed out`);
      this.sendErrorResponse(requestId, -32603, 'Request timeout');
      this.pendingRequests.delete(requestId);
    }, HeroWalletMessageHandler.MESSAGE_TIMEOUT);

    this.pendingRequests.set(requestId, timeout);
  }

  private clearRequestTimeout(requestId: string | number): void {
    const timeout = this.pendingRequests.get(requestId);
    if (timeout) {
      clearTimeout(timeout);
      this.pendingRequests.delete(requestId);
    }
  }

  private sendErrorResponse(
    requestId: string | number | undefined,
    code: number,
    message: string
  ): void {
    const errorResponse: Res = {
      target: 'herowallet:cs->inpage',
      ok: false,
      id: requestId,
      error: { code, message },
    };
    this.forwardToInpage(errorResponse);
  }

  private forwardToInpage(message: Res): void {
    try {
      window.postMessage(message, '*');
    } catch (error) {
      console.error('Hero Wallet: Failed to forward message to inpage:', error);
    }
  }

  private dispatchToBackground(
    backgroundMessage: BackgroundMessage,
    method: string,
    requestId?: string | number
  ): void {
    console.log(`🚀 Sending to background: ${method} (ID: ${requestId})`);

    if (this.port) {
      try {
        this.port.postMessage(backgroundMessage);
        return;
      } catch (error) {
        console.error('Hero Wallet: Failed to send via port:', error);
        if (requestId !== undefined) {
          this.clearRequestTimeout(requestId);
        }
        this.sendErrorResponse(
          requestId,
          -32603,
          'Failed to communicate with background'
        );
        return;
      }
    }

    chrome.runtime.sendMessage(backgroundMessage, (response: Res) => {
      if (requestId !== undefined) {
        this.clearRequestTimeout(requestId);
      }

      if (chrome.runtime.lastError) {
        console.warn(
          'Hero Wallet: Chrome runtime error:',
          chrome.runtime.lastError.message
        );
        this.sendErrorResponse(
          requestId,
          -32603,
          chrome.runtime.lastError.message || 'Extension context invalidated'
        );
        return;
      }

      if (!response) {
        console.warn(
          `⚠️  No response received for: ${method} (ID: ${requestId})`
        );
        this.sendErrorResponse(
          requestId,
          -32603,
          'No response from background script'
        );
        return;
      }

      console.log(
        `📥 Background response: ${method} (ID: ${requestId})`,
        response?.ok ? '✅' : '❌'
      );
      this.handleBackgroundResponse(response);
    });
  }
}

// Initialize components
try {
  new HeroWalletInjector();
  new HeroWalletMessageHandler();
} catch (error) {
  console.error('Hero Wallet: Failed to initialize content script:', error);
}
