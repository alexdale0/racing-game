import { test, expect } from '@playwright/test';

test.describe('Racing Game - Performance Tests', () => {
  test('should load within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('index.html');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);
    
    // Canvas should be visible
    await expect(page.locator('#gameCanvas')).toBeVisible();
  });

  test('should maintain smooth frame rate', async ({ page }) => {
    await page.goto('index.html');
    await page.waitForTimeout(500);
    
    // Start the game
    await page.keyboard.press('ArrowUp');
    
    // Measure frame rate over a period
    const frameData = await page.evaluate(() => {
      return new Promise((resolve) => {
        let frameCount = 0;
        const startTime = performance.now();
        
        function countFrame() {
          frameCount++;
          if (performance.now() - startTime < 1000) {
            requestAnimationFrame(countFrame);
          } else {
            resolve({
              fps: frameCount,
              duration: performance.now() - startTime
            });
          }
        }
        
        requestAnimationFrame(countFrame);
      });
    });
    
    // Should maintain at least 30 FPS
    expect(frameData.fps).toBeGreaterThan(30);
  });

  test('should handle rapid key presses without lag', async ({ page }) => {
    await page.goto('index.html');
    
    // Start game
    await page.keyboard.press('ArrowUp');
    await page.waitForTimeout(100);
    
    const startTime = Date.now();
    
    // Rapid key presses
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('ArrowLeft');
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('ArrowUp');
    }
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    
    // Should handle rapid input without significant delay
    expect(totalTime).toBeLessThan(2000);
    
    // Game should still be responsive
    const currentTime = await page.locator('#currentTime').textContent();
    expect(parseFloat(currentTime || '0')).toBeGreaterThan(0);
  });

  test('should handle memory usage efficiently', async ({ page }) => {
    await page.goto('index.html');
    
    // Get initial memory usage
    const initialMemory = await page.evaluate(() => {
      return performance.memory ? performance.memory.usedJSHeapSize : 0;
    });
    
    // Start game and let it run
    await page.keyboard.press('ArrowUp');
    await page.waitForTimeout(3000);
    
    // Check memory usage after running
    const finalMemory = await page.evaluate(() => {
      return performance.memory ? performance.memory.usedJSHeapSize : 0;
    });
    
    // Memory shouldn't increase dramatically (allowing for some variance)
    if (initialMemory > 0 && finalMemory > 0) {
      const memoryIncrease = finalMemory - initialMemory;
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // Less than 10MB increase
    }
  });

  test('should handle canvas resize efficiently', async ({ page }) => {
    await page.goto('index.html');
    
    const startTime = Date.now();
    
    // Multiple resize operations
    await page.setViewportSize({ width: 800, height: 600 });
    await page.waitForTimeout(100);
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.waitForTimeout(100);
    await page.setViewportSize({ width: 400, height: 300 });
    await page.waitForTimeout(100);
    
    const endTime = Date.now();
    const resizeTime = endTime - startTime;
    
    // Resizing should be quick
    expect(resizeTime).toBeLessThan(1000);
    
    // Canvas should still be visible and functional
    await expect(page.locator('#gameCanvas')).toBeVisible();
    
    // Should still be able to start game
    await page.keyboard.press('ArrowUp');
    await page.waitForTimeout(100);
    
    const currentTime = await page.locator('#currentTime').textContent();
    expect(parseFloat(currentTime || '0')).toBeGreaterThan(0);
  });
});

