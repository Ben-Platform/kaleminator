import { assertEquals } from "@std/assert";

Deno.test("Deno .env loading", async () => {
    const secret = Deno.env.get("TEST_SECRET");
    assertEquals(secret, "ITWORKS", `.env not loaded ${secret}`);
});