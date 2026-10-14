// Client Runtime — deep module (docs/adr/0007-client-module-registry.md).
//
// A tiny registry: components register named modules with optional dependency
// declarations; on each View Transition lifecycle hook the runtime topologically
// sorts the modules and initialises the ones due for that hook. This replaces the
// former "nine scripts each listening to astro:page-load" arrangement.

import type {
  ClientContext,
  ClientLifecycleHook,
  ClientModuleRegistration,
  ClientRuntime,
} from "./types";

const modules = new Map<string, ClientModuleRegistration>();
const initialized = new Set<string>();

const createContext = (): ClientContext => {
  const doc = document;
  const win = window as ClientContext["window"];

  return {
    document: doc,
    window: win,
    routerEvents: {
      onPageLoad: (fn) => doc.addEventListener("astro:page-load", fn),
      onAfterSwap: (fn) => doc.addEventListener("astro:after-swap", fn),
      onBeforePreparation: (fn) => doc.addEventListener("astro:before-preparation", fn),
    },
    utils: {
      query: (selector) => doc.querySelector(selector),
      queryAll: (selector) => doc.querySelectorAll(selector),
      on: (element, event, listener) => {
        element.addEventListener(event, listener);
        return () => element.removeEventListener(event, listener);
      },
    },
  };
};

const sortedModules = (): ClientModuleRegistration[] => {
  const sorted: ClientModuleRegistration[] = [];
  const visiting = new Set<string>();
  const visited = new Set<string>();

  const visit = (name: string): void => {
    if (visited.has(name) || visiting.has(name)) {
      return;
    }
    visiting.add(name);
    const mod = modules.get(name);
    for (const dep of mod?.dependsOn ?? []) {
      visit(dep);
    }
    visiting.delete(name);
    visited.add(name);
    if (mod) {
      sorted.push(mod);
    }
  };

  for (const name of modules.keys()) {
    visit(name);
  }
  return sorted;
};

const runLifecycle = (hook: ClientLifecycleHook, ctx: ClientContext): void => {
  for (const mod of sortedModules()) {
    const hooks = mod.runOn ?? ["pageLoad", "afterSwap"];
    if (!hooks.includes(hook)) {
      continue;
    }
    if (mod.once && initialized.has(mod.name)) {
      continue;
    }
    if (hook === "pageLoad" && mod.condition && !mod.condition(ctx)) {
      continue;
    }

    try {
      const start = performance.now();
      void mod.init(ctx);
      initialized.add(mod.name);
      if (import.meta.env.DEV) {
        console.debug(`[ClientRuntime] ${mod.name}: ${(performance.now() - start).toFixed(2)}ms`);
      }
    } catch (error) {
      console.error(`[ClientRuntime] module "${mod.name}" failed:`, error);
    }
  }
};

let started = false;

export const clientRuntime: ClientRuntime = {
  registerModule(registration) {
    modules.set(registration.name, registration);
  },

  unregisterModule(name) {
    modules.delete(name);
  },

  getModule(name) {
    return modules.get(name);
  },

  start() {
    if (started) {
      return;
    }
    started = true;
    const ctx = createContext();
    ctx.routerEvents.onPageLoad(() => runLifecycle("pageLoad", ctx));
    ctx.routerEvents.onAfterSwap(() => runLifecycle("afterSwap", ctx));
  },

  stop() {
    started = false;
    initialized.clear();
  },
};
