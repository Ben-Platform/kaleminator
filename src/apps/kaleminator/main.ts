import { Effect, Fiber } from "effect";
import { MainnetLayer } from "./mainnet.ts";
import { startService } from "./monitor.ts";

const runnable = startService.pipe(
    Effect.provide(MainnetLayer)
); 

const fiber = Effect.runFork(runnable);

// Graceful Shutdown Logic
const shutdown = () => {
    const cleanup = Effect.gen(function* () {
        yield* Effect.log("[Supervisor]: Shutdown signal received. Cleaning up...");
        yield* Fiber.interrupt(fiber);
        yield* Effect.log("[Supervisor]: All workers stopped. Goodbye!");
    });
    
    Effect.runPromise(cleanup).then(() => Deno.exit(0));
};

Deno.addSignalListener("SIGINT", shutdown);

await Fiber.join(fiber);

