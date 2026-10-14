// Single client entry point — the only `<script>` the layout imports.
// Registers every interaction module with the runtime and starts it.
// (docs/adr/0007-client-module-registry.md)

import { clientRuntime } from "@/modules/client-runtime";
import { CodeCopy } from "./modules/code-copy";
import { GravatarFallback } from "./modules/gravatar-fallback";
import { ReadingProgress } from "./modules/reading-progress";
import { ScrollReveal } from "./modules/scroll-reveal";
import { TelegramAuth } from "./modules/telegram-auth";
import { ThemeToggle } from "./modules/theme-toggle";
import { TiltCard } from "./modules/tilt-card";
import { TOC } from "./modules/toc";

clientRuntime.registerModule({ name: "theme-toggle", init: ThemeToggle.init, once: true });
clientRuntime.registerModule({ name: "toc", init: TOC.init, dependsOn: ["theme-toggle"] });
clientRuntime.registerModule({ name: "reading-progress", init: ReadingProgress.init });
clientRuntime.registerModule({ name: "scroll-reveal", init: ScrollReveal.init });
clientRuntime.registerModule({ name: "tilt-card", init: TiltCard.init });
clientRuntime.registerModule({ name: "code-copy", init: CodeCopy.init });
clientRuntime.registerModule({
  name: "telegram-auth",
  init: TelegramAuth.init,
  dependsOn: ["theme-toggle"],
  condition: (ctx) => ctx.document.querySelector("[data-telegram-auth]") !== null,
});
clientRuntime.registerModule({ name: "gravatar-fallback", init: GravatarFallback.init });

clientRuntime.start();
