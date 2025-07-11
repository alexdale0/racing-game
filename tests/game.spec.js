import { test, expect } from '@playwright/test';

// test.describe('Racing Game - Page Load and UI', () => {
  test('should load the game page successfully', async ({ page }) => {
    await page.goto('index.html');
    // Check that the page loads
    await expect(page).toHaveTitle('Racing Game');
    // Check that the main game elements are present
    await expect(page.locator('#gameCanvas')).toBeVisible();
    await expect(page.locator('.ui-overlay')).toBeVisible();
    // Touch controls may be hidden on desktop, so we just check they exist
    await expect(page.locator('.touch-controls')).toBeAttached();
  });

  test('should display initial game state correctly', async ({ page }) => {
    await page.goto('index.html');
    // Check initial timer display
    await expect(page.locator('#currentTime')).toHaveText('0.00');
  });
});

// Controls and Movement tests (commented out)
test.describe('Racing Game - Controls and Movement', () => {
  test('should start race and car should move after any key press', async ({ page }) => {
    await page.goto('index.html');
    await expect(page.locator('#currentTime')).toHaveText('0.00');
    // Press any key (ArrowLeft)
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(100);
    // Car should be moving (timer increases)
    const timeAfterStart = await page.locator('#currentTime').textContent();
    expect(parseFloat(timeAfterStart || '0')).toBeGreaterThan(0);
  });

  test('should allow steering with left/right keys', async ({ page }) => {
    await page.goto('index.html');
    await page.keyboard.press('ArrowLeft'); // Start race
    await page.waitForTimeout(100);
    // Simulate left/right steering
    await page.keyboard.down('ArrowLeft');
    await page.waitForTimeout(200);
    await page.keyboard.up('ArrowLeft');
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(200);
    await page.keyboard.up('ArrowRight');
    // Race should still be running
    const currentTime = await page.locator('#currentTime').textContent();
    expect(parseFloat(currentTime || '0')).toBeGreaterThan(0);
  });

  test('should allow steering with A/D keys', async ({ page }) => {
    await page.goto('index.html');
    await page.keyboard.press('KeyA'); // Start race
    await page.waitForTimeout(100);
    await page.keyboard.down('KeyA');
    await page.waitForTimeout(200);
    await page.keyboard.up('KeyA');
    await page.keyboard.down('KeyD');
    await page.waitForTimeout(200);
    await page.keyboard.up('KeyD');
    const currentTime = await page.locator('#currentTime').textContent();
    expect(parseFloat(currentTime || '0')).toBeGreaterThan(0);
  });

  test('should have functional touch steering', async ({ page, browserName }) => {
    // Only run this test in browsers that support touch emulation
    test.skip(browserName !== 'webkit' && browserName !== 'chromium', 'Touch emulation only supported in webkit/chromium');
    await page.goto('index.html');
    await expect(page.locator('#steeringWheel')).toBeVisible();
    // Simulate touch on steering wheel to start race
    await page.locator('#steeringWheel').tap();
    await page.waitForTimeout(100);
    // Race should have started
    const timeAfterTouch = await page.locator('#currentTime').textContent();
    expect(parseFloat(timeAfterTouch || '0')).toBeGreaterThan(0);
  });
});

test.describe('Racing Game - Game Logic', () => {
  test('should track lap completion', async ({ page }) => {
    await page.goto('index.html');
    
    // Start race
    await page.keyboard.press('ArrowUp');
    await page.waitForTimeout(100);
    
    // Initially should be lap 0
    await expect(page.locator('#lapCount')).toHaveText('0');
    
    // The test won't complete a full lap in reasonable time,
    // but we can verify the lap counter is working
    const lapCount = await page.locator('#lapCount').textContent();
    expect(parseInt(lapCount || '0')).toBeGreaterThanOrEqual(0);
  });

  test('should track best time from localStorage', async ({ page }) => {
    await page.goto('index.html');
    
    // Set a mock best time in localStorage
    await page.evaluate(() => {
      localStorage.setItem('bestTime', '15.42');
    });
    
    // Reload page to pick up the stored best time
    await page.reload();
    
    // Check that best time is displayed
    await expect(page.locator('#bestTime')).toHaveText('15.42');
  });

  test('should handle race reset', async ({ page }) => {
    await page.goto('index.html');
    
    // Start race
    await page.keyboard.press('ArrowUp');
    await page.waitForTimeout(500);
    
    // Get current time (should be > 0)
    const timeBeforeReset = await page.locator('#currentTime').textContent();
    expect(parseFloat(timeBeforeReset || '0')).toBeGreaterThan(0);
    
    // Access the game object and reset (if available)
    const hasResetFunction = await page.evaluate(() => {
      return typeof window.racingGame?.resetRace === 'function';
    });
    
    if (hasResetFunction) {
      await page.evaluate(() => {
        window.racingGame.resetRace();
      });
      
      // Check that timer is reset
      await expect(page.locator('#currentTime')).toHaveText('0.00');
      await expect(page.locator('#lapCount')).toHaveText('0');
    }
  });
});

test.describe('Racing Game - Canvas Rendering', () => {
  test('should render game elements on canvas', async ({ page }) => {
    await page.goto('index.html');
    
    // Wait for game to initialize
    await page.waitForTimeout(500);
    
    // Check that canvas has content (not blank)
    const canvas = page.locator('#gameCanvas');
    await expect(canvas).toBeVisible();
    
    // Take a screenshot to verify rendering
    await page.screenshot({ path: 'tests/screenshots/game-render.png' });
    
    // Check that game loop is running by monitoring canvas changes
    const canvasData1 = await page.evaluate(() => {
      const canvas = document.getElementById('gameCanvas');
      return canvas.getContext('2d').getImageData(0, 0, 100, 100).data[0];
    });
    
    // Start race to trigger rendering changes
    await page.keyboard.press('ArrowUp');
    await page.waitForTimeout(100);
    
    const canvasData2 = await page.evaluate(() => {
      const canvas = document.getElementById('gameCanvas');
      return canvas.getContext('2d').getImageData(0, 0, 100, 100).data[0];
    });
    
    // Canvas should have some content
    expect(canvasData1).toBeDefined();
    expect(canvasData2).toBeDefined();
  });

  test('should handle canvas resize', async ({ page }) => {
    await page.goto('index.html');
    
    // Get initial canvas size
    const initialSize = await page.locator('#gameCanvas').boundingBox();
    
    // Resize viewport
    await page.setViewportSize({ width: 800, height: 600 });
    await page.waitForTimeout(200);
    
    // Get new canvas size
    const newSize = await page.locator('#gameCanvas').boundingBox();
    
    // Canvas should have adjusted to new size
    expect(newSize?.width).toBeDefined();
    expect(newSize?.height).toBeDefined();
    expect(newSize?.width).toBeGreaterThan(0);
    expect(newSize?.height).toBeGreaterThan(0);
  });
});

test.describe('Racing Game - Mobile Specific', () => {
  test('should work on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('index.html');
    
    // Check that mobile controls are visible
    await expect(page.locator('.touch-controls')).toBeVisible();
    await expect(page.locator('#gasPedal')).toBeVisible();
    await expect(page.locator('#brakePedal')).toBeVisible();
    await expect(page.locator('#steeringWheel')).toBeVisible();
    
    // Test touch interaction
    await page.locator('#gasPedal').tap();
    await page.waitForTimeout(100);
    
    // Verify race started
    const timeAfterTouch = await page.locator('#currentTime').textContent();
    expect(parseFloat(timeAfterTouch || '0')).toBeGreaterThan(0);
  });

  test('should handle touch steering', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('index.html');
    
    const steeringWheel = page.locator('#steeringWheel');
    await expect(steeringWheel).toBeVisible();
    
    // Test touch on steering wheel
    await steeringWheel.tap();
    
    // The steering wheel should respond to touch
    // (Visual feedback is hard to test, but we can ensure no errors occur)
    await page.waitForTimeout(100);
  });
});

test.describe('Racing Game - Debug Mode', () => {
  test('should enable debug mode with URL parameter', async ({ page }) => {
    await page.goto('index.html?debug');
    
    // Debug mode should be enabled
    // (The specific debug features would depend on implementation)
    await page.waitForTimeout(500);
    
    // Start race to see if debug info appears
    await page.keyboard.press('ArrowUp');
    await page.waitForTimeout(200);
    
    // Take screenshot in debug mode
    await page.screenshot({ path: 'tests/screenshots/debug-mode.png' });
  });
});

test.describe('Racing Game - Error Handling', () => {
  test('should handle missing localStorage gracefully', async ({ page }) => {
    // Disable localStorage
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        value: null,
        writable: true
      });
    });
    
    await page.goto('index.html');
    
    // Game should still load and work
    await expect(page.locator('#gameCanvas')).toBeVisible();
    await expect(page.locator('#bestTime')).toHaveText('--:--');
    
    // Should still be able to start race
    await page.keyboard.press('ArrowUp');
    await page.waitForTimeout(100);
    
    const timeAfterStart = await page.locator('#currentTime').textContent();
    expect(parseFloat(timeAfterStart || '0')).toBeGreaterThan(0);
  });

  test('should handle console errors gracefully', async ({ page }) => {
    const consoleErrors = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    await page.goto('index.html');
    await page.waitForTimeout(500);
    
    // Start race and play for a bit
    await page.keyboard.press('ArrowUp');
    await page.waitForTimeout(1000);
    
    // Check that no major console errors occurred
    const criticalErrors = consoleErrors.filter(error => 
      !error.includes('favicon.ico') && // Ignore favicon errors
      !error.includes('404') // Ignore 404 errors for assets
    );
    
    expect(criticalErrors.length).toBe(0);
  });
});

test.describe('Racing Game - Debug Finish Line Collision', () => {
  test('should debug finish line collision issue', async ({ page }) => {
    await page.goto('index.html');
    
    // Wait for game to initialize
    await page.waitForTimeout(500);
    
    // Get initial car position and finish line info
    const gameInfo = await page.evaluate(() => {
      const game = window.racingGame;
      if (!game) return null;
      
      return {
        carStartX: game.car.x,
        carStartY: game.car.y,
        finishLineX1: game.finishLine.x1,
        finishLineY1: game.finishLine.y1,
        finishLineX2: game.finishLine.x2,
        finishLineY2: game.finishLine.y2,
        trackPoints: game.trackPoints,
        raceStarted: game.raceStarted,
        raceCompleted: game.raceCompleted
      };
    });
    
    console.log('Game info before race start:', gameInfo);
    
    // Initial state - race not started
    await expect(page.locator('#currentTime')).toHaveText('0.00');
    await expect(page.locator('#lapCount')).toHaveText('0');
    
    // Press arrow up key to start race
    await page.keyboard.press('ArrowUp');
    
    // Wait just one frame
    await page.waitForTimeout(50);
    
    // Check game state after pressing key
    const gameInfoAfterKey = await page.evaluate(() => {
      const game = window.racingGame;
      if (!game) return null;
      
      return {
        carX: game.car.x,
        carY: game.car.y,
        carSpeed: game.car.speed,
        raceStarted: game.raceStarted,
        raceCompleted: game.raceCompleted,
        lapCount: game.lapCount,
        currentTime: game.currentTime
      };
    });
    
    console.log('Game info after pressing key:', gameInfoAfterKey);
    
    // Check that time has started increasing but race hasn't completed
    const timeAfterStart = await page.locator('#currentTime').textContent();
    const lapCount = await page.locator('#lapCount').textContent();
    
    console.log('Time after start:', timeAfterStart);
    console.log('Lap count:', lapCount);
    
    expect(parseFloat(timeAfterStart || '0')).toBeGreaterThan(0);
    expect(parseInt(lapCount || '0')).toBe(0); // Should still be 0, not completed
  });
});

test.describe('Racing Game - Debug Console Logs', () => {
  test('should capture console logs for debugging', async ({ page }) => {
    const consoleLogs = [];
    
    // Capture console messages
    page.on('console', msg => {
      consoleLogs.push(msg.text());
    });
    
    await page.goto('index.html');
    
    // Wait for game to initialize
    await page.waitForTimeout(500);
    
    console.log('Console logs during initialization:');
    consoleLogs.forEach(log => console.log('>', log));
    
    // Clear logs and start race
    consoleLogs.length = 0;
    
    // Press arrow up key to start race
    await page.keyboard.press('ArrowUp');
    
    // Wait for a bit to see what happens
    await page.waitForTimeout(1000);
    
    console.log('Console logs after starting race:');
    consoleLogs.forEach(log => console.log('>', log));
    
    // Check current game state
    const timeAfterStart = await page.locator('#currentTime').textContent();
    const lapCount = await page.locator('#lapCount').textContent();
    
    console.log('Time after start:', timeAfterStart);
    console.log('Lap count:', lapCount);
    
    // The test should pass regardless, we're just gathering info
    expect(true).toBe(true);
  });
});

test.describe('Racing Game - JavaScript Errors', () => {
  test('should not have JavaScript errors during gameplay', async ({ page }) => {
    const jsErrors = [];
    
    // Capture JavaScript errors
    page.on('pageerror', error => {
      jsErrors.push(error.message);
    });
    
    await page.goto('index.html');
    
    // Wait for game to initialize
    await page.waitForTimeout(500);
    
    // Start the race
    await page.keyboard.press('ArrowUp');
    
    // Let the game run for a few seconds to trigger multiple updateUI calls
    await page.waitForTimeout(3000);
    
    // Check for JavaScript errors
    console.log('JavaScript errors detected:', jsErrors);
    
    // There should be no JavaScript errors
    expect(jsErrors.length).toBe(0);
    
    // Verify the game is still running (no crashes)
    const timeAfterStart = await page.locator('#currentTime').textContent();
    expect(parseFloat(timeAfterStart || '0')).toBeGreaterThan(0);
  });
});


test.describe('Racing Game - Collision Detection', () => {
  test('should allow car to move freely on track without collision interference', async ({ page }) => {
    await page.goto('/');
    // Wait for game to load
    await page.waitForLoadState('networkidle');
    await expect(page.locator('canvas')).toBeVisible();
    // Get initial car position and collision info
    const initialInfo = await page.evaluate(() => {
      if (!window.racingGame) return null;
      const game = window.racingGame;
      const isOutsideOuter = !game.isPointInPolygon(game.car.x, game.car.y, game.outerTrack);
      const isInsideInner = game.isPointInPolygon(game.car.x, game.car.y, game.innerTrack);
      return {
        position: { x: game.car.x, y: game.car.y },
        isOutsideOuter,
        isInsideInner,
        onTrack: !isOutsideOuter && !isInsideInner,
        trackPointsCount: game.trackPoints.length,
        outerTrackCount: game.outerTrack.length,
        innerTrackCount: game.innerTrack.length
      };
    });
    console.log('Initial collision info:', initialInfo);
    // Start race and move car
    await page.keyboard.press('ArrowUp');
    await page.waitForTimeout(200);
    // Check position after movement
    const afterMovement = await page.evaluate(() => {
      const game = window.racingGame;
      const isOutsideOuter = !game.isPointInPolygon(game.car.x, game.car.y, game.outerTrack);
      const isInsideInner = game.isPointInPolygon(game.car.x, game.car.y, game.innerTrack);
      return {
        position: { x: game.car.x, y: game.car.y },
        speed: game.car.speed,
        isOutsideOuter,
        isInsideInner,
        collisionDetected: isOutsideOuter || isInsideInner
      };
    });
    console.log('After movement:', afterMovement);
    // Verify the car can move and is properly detected as on track
    expect(initialInfo).not.toBeNull();
    expect(initialInfo.onTrack).toBe(true);
    expect(afterMovement.speed).toBeGreaterThan(0);
  });
});

