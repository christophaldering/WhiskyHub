import OpenAI from "openai";

// gpt-5 family compatibility shim (applied once, at the SDK level).
//
// On the Chat Completions API the gpt-5* models (gpt-5, gpt-5-mini, gpt-5-nano, ...)
// reject two parameters that the older gpt-4o* models accepted:
//   - `max_tokens`   -> must be sent as `max_completion_tokens`
//   - `temperature`  -> only the default (1) is accepted; any other value 400s
//
// Many call-sites across the codebase still pass `max_tokens` and a custom
// `temperature` (0.3 / 0.75 / 0.8 ...). Instead of editing ~46 scattered call
// sites, we normalize the request body here for gpt-5* models only. Every client
// instance shares this prototype, so this covers all existing and future calls.
const proto: any = (OpenAI as any).Chat?.Completions?.prototype;
if (proto && typeof proto.create === "function" && !proto.__gpt5CompatPatched) {
  const original = proto.create;
  proto.create = function (body: any, options?: any) {
    if (
      body &&
      typeof body === "object" &&
      typeof body.model === "string" &&
      body.model.startsWith("gpt-5")
    ) {
      const next: any = { ...body };
      if ("max_tokens" in next) {
        if (next.max_completion_tokens == null) {
          next.max_completion_tokens = next.max_tokens;
        }
        delete next.max_tokens;
      }
      if ("temperature" in next && next.temperature !== 1) {
        delete next.temperature;
      }
      return original.call(this, next, options);
    }
    return original.call(this, body, options);
  };
  proto.__gpt5CompatPatched = true;
}
