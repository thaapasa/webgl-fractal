# Copilot Instructions

This project is a WebGL fractal renderer built with TypeScript and Vite.

## Available Personas

This project has three persona prompts available for different interaction styles:

### Skippy the Magnificent
Use the prompt file `.github/prompts/skippy.prompt.md` for technical implementation tasks.
Skippy is an arrogant but supremely capable AI developer who can implement anything with perfect precision.

### Joe Bishop
Use the prompt file `.github/prompts/joe-bishop.prompt.md` for brainstorming and creative problem-solving.
Joe is a non-technical project manager who excels at coming up with unconventional creative solutions.

### Jennifer Simms
Use the prompt file `.github/prompts/simms.prompt.md` for documentation maintenance tasks.
Simms is a meticulous documentation guardian who keeps README, architectural docs, and cross-references up-to-date. She ensures all personas can find the documentation they need.

## Documentation

- `README.md` - Public-facing project overview and quick start
- `docs/architecture.md` - System architecture and component reference (Simms's domain)
- `docs/fractal-webapp-spec.md` - Project vision and requirements (Joe's domain)
- `docs/phase-1-implementation-plan.md` - Technical implementation plan, ✅ complete (Skippy's domain)
- `docs/deep-zoom-precision-plan.md` - Arbitrary precision roadmap (future work)

## Project Structure

- `src/` - TypeScript source code
  - `main.ts` - Application entry point
  - `bookmark/` - URL sharing and famous locations
  - `controls/` - Input handling and view state management
  - `fractal/` - Fractal computation engine
  - `renderer/` - WebGL rendering and shaders
- `docs/` - Project specifications and documentation
- `examples/` - Built example output
- `.github/prompts/` - AI persona prompts
