import { ProxyType, Lifecycle } from './types'

export function run(code: string, options: any): any {
  try {
    if (checkSyntax(code)) {
      let handler = {
        get(obj: any, prop: string): any {
          return Reflect.has(obj, prop) ? obj[prop] : null
        },
        set(obj: any, prop: string, value: any): boolean {
          Reflect.set(obj, prop, value)
          return true
        },
        has(obj: any, prop: string): boolean {
          return obj && Reflect.has(obj, prop)
        }
      }
      let captureHandler = {
        get(obj: any, prop: string): any {
          return Reflect.get(obj, prop)
        },
        set(): boolean {
          return true
        },
        has(): boolean {
          return true
        }
      }

      let allowList = {
        IS_BERIAL_SANDBOX: true,
        __proto__: null,
        console,
        String,
        Number,
        Array,
        Symbol,
        Math,
        Object,
        Promise,
        RegExp,
        JSON,
        Date,
        Function,
        parseInt,
        document,
        navigator,
        location,
        performance,
        MessageChannel,
        SVGElement,
        HTMLIFrameElement,
        HTMLElement,
        history,
        Map,
        Set,
        WeakMap,
        WeakSet,
        Error,
        localStorage,
        decodeURI,
        encodeURI,
        fetch: fetch.bind(window),
        setTimeout: setTimeout.bind(window),
        clearTimeout: clearTimeout.bind(window),
        setInterval: setInterval.bind(window),
        clearInterval: clearInterval.bind(window),
        requestAnimationFrame: requestAnimationFrame.bind(window),
        cancelAnimationFrame: cancelAnimationFrame.bind(window),
        addEventListener: addEventListener.bind(window),
        removeEventListener: removeEventListener.bind(window),
        eval: function (code: string): any {
          return run('return ' + code, null)
        },
        alert: function (): void {
          alert('Sandboxed alert:' + arguments[0])
        },
        ...(options.allowList || {})
      }

      if (!Object.isFrozen(String.prototype)) {
        for (const k in allowList) {
          const fn = allowList[k]
          if (fn.prototype) {
            Object.freeze(fn.prototype)
          }
          if (k !== 'localStorage') {
            Object.freeze(fn)
          }
        }
      }
      let proxy = new Proxy(allowList, handler)
      let capture = new Proxy(
        {
          __proto__: null,
          proxy: proxy,
          globalThis: new Proxy(allowList, handler),
          window: new Proxy(allowList, handler),
          self: new Proxy(allowList, handler)
        },
        captureHandler
      )
      return Function(
        'proxy',
        'capture',
        `with(capture) {     
            with(proxy) {  
              return (function(){                                               
                "use strict";
                ${code};
                return window
              })();
            }
        }`
      )(proxy, capture)
    }
  } catch (e) {
    throw e
  }
}
function checkSyntax(code: string): boolean {
  Function(code)
  if (/\bimport\s*(?:[(]|\/[*]|\/\/|<!--|-->)/.test(code)) {
    throw new Error('Dynamic imports are blocked')
  }
  return true
}