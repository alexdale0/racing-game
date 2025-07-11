# Racing Game - Playwright Tests

This directory contains end-to-end tests for the Racing Game using Playwright.

## Test Structure

### Test Files

- `game.spec.js` - Main game functionality tests
- `unit-tests.spec.js` - Tests for the unit test page
- `performance.spec.js` - Performance and load tests
- `helpers.js` - Common test utilities

### Test Categories

1. **Page Load and UI Tests**
   - Page loading
   - UI element visibility
   - Canvas rendering
   - Initial state verification

2. **Controls and Movement Tests**
   - Keyboard controls (Arrow keys, WASD)
   - Touch controls (mobile)
   - Game state changes

3. **Game Logic Tests**
   - Race start/stop
   - Lap tracking
   - Timer functionality
   - Local storage integration

4. **Performance Tests**
   - Load time
   - Frame rate
   - Memory usage
   - Responsive behavior

5. **Cross-browser Tests**
   - Chrome/Chromium
   - Firefox
   - Safari/WebKit
   - Mobile browsers

## Running Tests

### Prerequisites

```bash
npm install
```

### Install Playwright Browsers

```bash
npx playwright install
```

### Run All Tests

```bash
npm test
```

### Run Tests with UI

```bash
npm run test:ui
```

### Run Tests in Headed Mode

```bash
npm run test:headed
```

### Debug Tests

```bash
npm run test:debug
```

### Run Specific Test File

```bash
npx playwright test game.spec.js
```

### Run Tests for Specific Browser

```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

## Test Configuration

The tests are configured in `playwright.config.js` with:

- Multiple browser support (Chrome, Firefox, Safari)
- Mobile device testing
- Screenshot capture on failure
- Video recording on failure
- Trace collection for debugging
- Local HTTP server for testing

## Test Reports

After running tests, you can view the HTML report:

```bash
npx playwright show-report
```

## Screenshots

Test screenshots are automatically saved to `tests/screenshots/` when tests fail or when explicitly captured.

## Continuous Integration

The tests are configured to run automatically on:
- Push to main/develop branches
- Pull requests
- GitHub Actions workflow (`.github/workflows/test.yml`)

## Test Helpers

The `helpers.js` file provides common utilities:

- `waitForGameInit()` - Wait for game initialization
- `startRace()` - Start a race and verify it began
- `getGameState()` - Get current game state
- `isCanvasRendering()` - Check if canvas is rendering
- `mobileTouch()` - Simulate mobile touch events
- `setupConsoleErrorTracking()` - Track console errors
- `takeTimestampedScreenshot()` - Capture screenshots with timestamps

## Writing New Tests

When adding new tests:

1. Use the helper functions for common operations
2. Add appropriate `expect()` assertions
3. Include error handling for edge cases
4. Test both desktop and mobile scenarios
5. Add performance considerations for long-running tests

## Debugging Failed Tests

1. Run with `--debug` flag to step through tests
2. Check screenshots in `tests/screenshots/`
3. View HTML report for detailed failure information
4. Use trace viewer for detailed execution analysis

## Mobile Testing

Tests include mobile-specific scenarios:
- Touch controls
- Mobile viewport sizes
- Touch event handling
- Mobile-specific UI elements
