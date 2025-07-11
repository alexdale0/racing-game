class RacingGame {
    showStartPrompt() {
        if (document.getElementById('startPromptOverlay')) return;
        const canvas = document.getElementById('gameCanvas');
        const overlay = document.createElement('div');
        overlay.id = 'startPromptOverlay';
        overlay.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            pointer-events: auto;
            z-index: 20;
        `;
        const msg = document.createElement('div');
        msg.style.cssText = `
            background: rgba(0,0,0,0.35);
            color: #fff;
            font-size: 2.2rem;
            padding: 24px 48px;
            border-radius: 16px;
            border: 2px solid #4CAF50;
            box-shadow: 0 4px 24px rgba(0,0,0,0.15);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            text-align: center;
            opacity: 0.92;
            animation: fadeInOut 2.5s infinite alternate;
        `;
        msg.innerHTML = 'Press any key, tap, or steer to start';
        overlay.appendChild(msg);
        // Insert overlay as sibling above canvas
        canvas.parentElement.insertBefore(overlay, canvas.nextSibling);
        // Add fade animation
        const style = document.createElement('style');
        style.innerHTML = `@keyframes fadeInOut { from { opacity: 0.5; } to { opacity: 1; } }`;
        document.head.appendChild(style);

        // Dismiss overlay on any pointerdown or touchstart on overlay
        const dismiss = (e) => {
            e.preventDefault();
            this.hideStartPrompt();
            overlay.removeEventListener('pointerdown', dismiss);
            overlay.removeEventListener('touchstart', dismiss);
        };
        overlay.addEventListener('pointerdown', dismiss);
        overlay.addEventListener('touchstart', dismiss);
    }

    hideStartPrompt() {
        const overlay = document.getElementById('startPromptOverlay');
        if (overlay) overlay.remove();
    }
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.setupCanvas();
        
        // Game state
        this.gameRunning = false;
        this.lastTime = 0;
        
        // Car properties
        this.car = {
            x: 0, // Will be set after track is initialized
            y: 0, // Will be set after track is initialized
            width: 30,
            height: 15,
            angle: 0, // Will be set after track is initialized
            speed: 0,
            maxSpeed: 8,
            acceleration: 0.3,
            friction: 0.95,
            turnSpeed: 0.08, // Increased for tighter turning radius
            color: '#ff4444'
        };
        
        // Track properties
        this.track = {
            width: 80,
            checkpoints: [
                {x: 100, y: 300, passed: false}, // Start/finish
                {x: 600, y: 150, passed: false},
                {x: 900, y: 400, passed: false},
                {x: 400, y: 600, passed: false}
            ],
            currentCheckpoint: 0
        };
        
        // Timing
        this.startTime = 0;
        this.currentTime = 0;
        this.bestTime = localStorage.getItem('bestTime') ? 
            parseFloat(localStorage.getItem('bestTime')) : null;
        this.lapCount = 0;
        this.raceStarted = false;
        this.raceCompleted = false; // Track if race is finished
        
        // Controls
        this.keys = {};
        this.touchControls = {
            gas: false,
            brake: false,
            steering: 0 // -1 to 1
        };
        
        // Initialize
        this.setupControls();
        this.setupTrack();
        this.showStartPrompt();
        this.gameLoop();
        this.updateUI();
    }
    
    setupCanvas() {
        const resizeCanvas = () => {
            const container = this.canvas.parentElement;
            this.canvas.width = container.clientWidth;
            this.canvas.height = container.clientHeight - (window.innerWidth <= 768 ? 150 : 0);
        };
        
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
    }
    
    setupTrack() {
        // Create track waypoints for a simple oval
        this.trackPoints = [
            {x: 100, y: 300},
            {x: 200, y: 150},
            {x: 400, y: 100},
            {x: 700, y: 120},
            {x: 900, y: 200},
            {x: 950, y: 350},
            {x: 900, y: 500},
            {x: 700, y: 580},
            {x: 400, y: 600},
            {x: 200, y: 580},
            {x: 100, y: 450}
        ];
        
        // Create outer and inner track boundaries
        this.outerTrack = this.generateTrackBoundary(this.trackPoints, this.track.width);
        this.innerTrack = this.generateTrackBoundary(this.trackPoints, -this.track.width).reverse();
        
        // Set finish line perpendicular to track
        const startPoint = this.trackPoints[0];
        const nextPoint = this.trackPoints[1];
        
        // Calculate direction vector from start to next point
        const dx = nextPoint.x - startPoint.x;
        const dy = nextPoint.y - startPoint.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        
        // Normalize and get perpendicular vector
        const perpX = -dy / length;
        const perpY = dx / length;
        
        // Create finish line perpendicular to track direction
        const lineLength = this.track.width;
        this.finishLine = {
            x1: startPoint.x + perpX * lineLength,
            y1: startPoint.y + perpY * lineLength,
            x2: startPoint.x - perpX * lineLength,
            y2: startPoint.y - perpY * lineLength
        };
        
        // Set car's initial angle to match track direction
        this.car.angle = Math.atan2(dy, dx);

        // Place car at the first track point (centerline)
        this.car.x = this.trackPoints[0].x;
        this.car.y = this.trackPoints[0].y;

        // Debug: Log car position and polygon test results at start
        const insideOuter = this.isPointInPolygon(this.car.x, this.car.y, this.outerTrack);
        const insideInner = this.isPointInPolygon(this.car.x, this.car.y, this.innerTrack);
        console.log('[DEBUG] Car initial position:', { x: this.car.x, y: this.car.y });
        console.log('[DEBUG] isPointInPolygon (outerTrack):', insideOuter);
        console.log('[DEBUG] isPointInPolygon (innerTrack):', insideInner);
        console.log('[DEBUG] outerTrack[0]:', this.outerTrack[0]);
        console.log('[DEBUG] innerTrack[0]:', this.innerTrack[0]);
    }
    
    generateTrackBoundary(points, offset) {
        const boundary = [];
        for (let i = 0; i < points.length; i++) {
            const current = points[i];
            const next = points[(i + 1) % points.length];
            const prev = points[(i - 1 + points.length) % points.length];
            
            // Calculate perpendicular offset
            const dx1 = current.x - prev.x;
            const dy1 = current.y - prev.y;
            const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
            
            const dx2 = next.x - current.x;
            const dy2 = next.y - current.y;
            const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
            
            const perpX = (-dy1 / len1 + -dy2 / len2) * 0.5;
            const perpY = (dx1 / len1 + dx2 / len2) * 0.5;
            const perpLen = Math.sqrt(perpX * perpX + perpY * perpY);
            
            if (perpLen > 0) {
                boundary.push({
                    x: current.x + (perpX / perpLen) * offset,
                    y: current.y + (perpY / perpLen) * offset
                });
            } else {
                boundary.push({x: current.x, y: current.y});
            }
        }
        return boundary;
    }
    
    setupControls() {
        // Keyboard controls: only steering, start on first input
        document.addEventListener('keydown', (e) => {
            const key = e.key.toLowerCase();
            if (!this.raceStarted) {
                this.startRace();
                this.hideStartPrompt();
            }
            // Only track left/right steering keys
            if (key === 'arrowleft' || key === 'a') {
                this.keys['left'] = true;
            } else if (key === 'arrowright' || key === 'd') {
                this.keys['right'] = true;
            }
        });

        document.addEventListener('keyup', (e) => {
            const key = e.key.toLowerCase();
            if (key === 'arrowleft' || key === 'a') {
                this.keys['left'] = false;
            } else if (key === 'arrowright' || key === 'd') {
                this.keys['right'] = false;
            }
        });

        // Touch controls: only steering, start on first input
        this.setupTouchControls();
    }
    
    setupTouchControls() {
        // Tap left/right on canvas to steer for touch devices
        const canvas = this.canvas;
        let steerTouchId = null;
        const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        if (isTouchDevice && canvas) {
            // Reduce sensitivity: set steering to -0.3/0.3 for much slower turning
            canvas.addEventListener('touchstart', (e) => {
                if (e.touches.length > 0) {
                    const touch = e.touches[0];
                    const rect = canvas.getBoundingClientRect();
                    const x = touch.clientX - rect.left;
                    steerTouchId = touch.identifier;
                    if (x < rect.width / 2) {
                        this.touchControls.steering = -0.3;
                    } else {
                        this.touchControls.steering = 0.3;
                    }
                    if (!this.raceStarted) {
                        this.startRace();
                        this.hideStartPrompt();
                    }
                }
            });
            canvas.addEventListener('touchend', (e) => {
                // Only reset if the same touch ends
                if (steerTouchId !== null) {
                    for (let i = 0; i < e.changedTouches.length; i++) {
                        if (e.changedTouches[i].identifier === steerTouchId) {
                            this.touchControls.steering = 0;
                            steerTouchId = null;
                            break;
                        }
                    }
                }
            });
            canvas.addEventListener('touchcancel', (e) => {
                this.touchControls.steering = 0;
                steerTouchId = null;
            });
        }
    }
    
    startRace() {
        if (!this.raceStarted && !this.raceCompleted) {
            this.raceStarted = true;
            this.startTime = Date.now();
            this.lapCount = 0;
            this.track.currentCheckpoint = 0;
            this.track.checkpoints.forEach(checkpoint => checkpoint.passed = false);
        }
    }
    
    resetRace() {
        // Reset car position and state
        // Calculate proper starting angle and position based on track direction
        const startPoint = this.trackPoints[0];
        const nextPoint = this.trackPoints[1];
        const dx = nextPoint.x - startPoint.x;
        const dy = nextPoint.y - startPoint.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        this.car.angle = Math.atan2(dy, dx);
        // Place car at the first track point (centerline)
        this.car.x = this.trackPoints[0].x;
        this.car.y = this.trackPoints[0].y;

        // Debug: Log car position and polygon test results after reset
        const insideOuter = this.isPointInPolygon(this.car.x, this.car.y, this.outerTrack);
        const insideInner = this.isPointInPolygon(this.car.x, this.car.y, this.innerTrack);
        console.log('[DEBUG] Car reset position:', { x: this.car.x, y: this.car.y });
        console.log('[DEBUG] isPointInPolygon (outerTrack):', insideOuter);
        console.log('[DEBUG] isPointInPolygon (innerTrack):', insideInner);
        console.log('[DEBUG] outerTrack[0]:', this.outerTrack[0]);
        console.log('[DEBUG] innerTrack[0]:', this.innerTrack[0]);
        
        this.car.speed = 0;
        
        // Reset race state
        this.raceStarted = false;
        this.raceCompleted = false;
        this.lapCount = 0;
        this.currentTime = 0;
        this.startTime = 0;
        this.showStartPrompt();
        
        // Reset checkpoints
        this.track.currentCheckpoint = 0;
        this.track.checkpoints.forEach(checkpoint => checkpoint.passed = false);
        
        // Update UI
        this.updateUI();
    }
    
    updatePhysics(deltaTime) {
        // Don't update if race is completed
        if (this.raceCompleted) return;
        
        // Only allow steering, car auto-accelerates after race starts
        const leftPressed = this.keys['left'] || this.touchControls.steering < -0.3;
        const rightPressed = this.keys['right'] || this.touchControls.steering > 0.3;

        // Auto-accelerate if race started and not completed
        if (this.raceStarted && !this.raceCompleted) {
            this.car.speed = Math.min(this.car.speed + this.car.acceleration, this.car.maxSpeed);
        } else {
            this.car.speed *= this.car.friction;
        }

        // Apply steering from touch controls
        if (Math.abs(this.touchControls.steering) > 0.1) {
            this.car.angle += this.touchControls.steering * this.car.turnSpeed * Math.abs(this.car.speed) * 0.5;
        }

        // Handle steering (only when moving) - smoother turning
        if (Math.abs(this.car.speed) > 0.1) {
            const turnMultiplier = Math.min(Math.abs(this.car.speed) / this.car.maxSpeed, 1);
            if (leftPressed) {
                this.car.angle -= this.car.turnSpeed * turnMultiplier * 0.8;
            }
            if (rightPressed) {
                this.car.angle += this.car.turnSpeed * turnMultiplier * 0.8;
            }
        }

        // Update position
        this.car.x += Math.cos(this.car.angle) * this.car.speed;
        this.car.y += Math.sin(this.car.angle) * this.car.speed;

        // Check track boundaries
        this.checkTrackCollision();

        // Check checkpoints and lap completion
        this.checkCheckpoints();

        // Update timer
        if (this.raceStarted && !this.raceCompleted) {
            this.currentTime = (Date.now() - this.startTime) / 1000;
            this.updateUI();
        }
    }
    
    checkTrackCollision() {
        const carX = this.car.x;
        const carY = this.car.y;

        // Removed 1 second grace period; collision is now detected immediately after race start

        // Distance-to-centerline collision detection
        let minDist = Infinity;
        for (let i = 0; i < this.trackPoints.length; i++) {
            const p1 = this.trackPoints[i];
            const p2 = this.trackPoints[(i + 1) % this.trackPoints.length];
            // Project car onto segment p1-p2
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const lengthSq = dx * dx + dy * dy;
            let t = 0;
            if (lengthSq > 0) {
                t = ((carX - p1.x) * dx + (carY - p1.y) * dy) / lengthSq;
                t = Math.max(0, Math.min(1, t));
            }
            const projX = p1.x + t * dx;
            const projY = p1.y + t * dy;
            const dist = Math.hypot(carX - projX, carY - projY);
            if (dist < minDist) minDist = dist;
        }
        const trackRadius = this.track.width;
        const onTrack = minDist <= trackRadius;

        if (window.location.search.includes('debug')) {
            console.log('Collision Debug:', {
                carPosition: {x: carX, y: carY},
                minDist,
                trackRadius,
                onTrack,
                raceStarted: this.raceStarted,
                timeSinceStart: this.raceStarted ? Date.now() - this.startTime : 0
            });
        }

        if (!onTrack && this.raceStarted && !this.raceCompleted) {
            // Car hit track limits - end the race
            console.log('TRACK COLLISION! Race ended. Out of bounds.');
            this.raceCompleted = true;
            this.showCrashMessage();
            return;
        }

        // Removed artificial margin boundary check; car is now only limited by track collision logic
    }
    
    isPointInPolygon(x, y, polygon) {
        let inside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            if (((polygon[i].y > y) !== (polygon[j].y > y)) &&
                (x < (polygon[j].x - polygon[i].x) * (y - polygon[i].y) / (polygon[j].y - polygon[i].y) + polygon[i].x)) {
                inside = !inside;
            }
        }
        return inside;
    }
    
    checkCheckpoints() {
        // Don't check if race is already completed
        if (this.raceCompleted) return;
        
        // Check if car crossed finish line using line intersection
        const carX = this.car.x;
        const carY = this.car.y;
        
        // Get previous car position for line intersection check
        const prevCarX = carX - Math.cos(this.car.angle) * this.car.speed;
        const prevCarY = carY - Math.sin(this.car.angle) * this.car.speed;
        
        // Check if car crossed the finish line (line intersection)
        // Only check if car is moving forward and race has started
        if (this.raceStarted && this.car.speed > 1 && 
            this.lineIntersection(prevCarX, prevCarY, carX, carY, 
                                this.finishLine.x1, this.finishLine.y1, 
                                this.finishLine.x2, this.finishLine.y2)) {
            console.log('FINISH LINE CROSSED!');
            console.log('Car position:', carX, carY);
            console.log('Previous position:', prevCarX, prevCarY);
            console.log('Car speed:', this.car.speed);
            console.log('Finish line:', this.finishLine);
            
            this.lapCount++;
            
            // Complete race after first lap
            if (this.lapCount >= 1) {
                console.log('RACE COMPLETED!');
                this.raceCompleted = true;
                const lapTime = this.currentTime;
                
                // Update best time
                if (!this.bestTime || lapTime < this.bestTime) {
                    this.bestTime = lapTime;
                    localStorage.setItem('bestTime', this.bestTime);
                }
                
                // Show completion message in game UI
                this.showCompletionMessage(lapTime);
            }
        }
    }
    
    lineIntersection(x1, y1, x2, y2, x3, y3, x4, y4) {
        const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
        if (Math.abs(denom) < 1e-10) return false;
        
        const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
        const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;
        
        return t >= 0 && t <= 1 && u >= 0 && u <= 1;
    }
    
    showCompletionMessage(lapTime) {
        // Create completion overlay
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;
        
        const messageBox = document.createElement('div');
        messageBox.style.cssText = `
            background: #2a2a2a;
            color: white;
            padding: 40px;
            border-radius: 12px;
            text-align: center;
            border: 2px solid #4CAF50;
            max-width: 400px;
            margin: 20px;
        `;
        
        const isNewBest = this.bestTime === lapTime;
        
        messageBox.innerHTML = `
            <h2 style="margin: 0 0 20px 0; color: #4CAF50; font-size: 32px;">🏁 Race Complete!</h2>
            <div style="font-size: 24px; margin: 20px 0; color: #fff;">
                Time: <span style="color: #4CAF50; font-weight: bold;">${lapTime.toFixed(2)}s</span>
            </div>
            ${isNewBest ? '<div style="color: #FFD700; font-size: 18px; margin: 10px 0;">🎉 New Best Time!</div>' : ''}
            <div style="margin: 30px 0;">
                <button id="playAgainBtn" style="
                    background: #4CAF50;
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    font-size: 16px;
                    border-radius: 6px;
                    cursor: pointer;
                    margin: 0 10px;
                    min-width: 120px;
                ">Play Again</button>
                <button id="closeBtn" style="
                    background: #666;
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    font-size: 16px;
                    border-radius: 6px;
                    cursor: pointer;
                    margin: 0 10px;
                    min-width: 120px;
                ">Close</button>
            </div>
        `;
        
        overlay.appendChild(messageBox);
        document.body.appendChild(overlay);
        
        // Add event listeners
        document.getElementById('playAgainBtn').addEventListener('click', () => {
            document.body.removeChild(overlay);
            this.resetRace();
        });
        
        document.getElementById('closeBtn').addEventListener('click', () => {
            document.body.removeChild(overlay);
        });
        
        // Close on overlay click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                document.body.removeChild(overlay);
            }
        });
    }
    
    showCrashMessage() {
        // Create crash overlay
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;
        
        const messageBox = document.createElement('div');
        messageBox.style.cssText = `
            background: #2a2a2a;
            color: white;
            padding: 40px;
            border-radius: 12px;
            text-align: center;
            border: 2px solid #ff4444;
            max-width: 400px;
            margin: 20px;
        `;
        
        messageBox.innerHTML = `
            <h2 style="margin: 0 0 20px 0; color: #ff4444; font-size: 32px;">💥 Crashed!</h2>
            <div style="font-size: 18px; margin: 20px 0; color: #fff;">
                You hit the track limits!
            </div>
            <div style="font-size: 16px; margin: 10px 0; color: #ccc;">
                Time: ${this.currentTime.toFixed(2)}s
            </div>
            <div style="margin: 30px 0;">
                <button id="tryAgainBtn" style="
                    background: #ff4444;
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    font-size: 16px;
                    border-radius: 6px;
                    cursor: pointer;
                    margin: 0 10px;
                    min-width: 120px;
                ">Try Again</button>
                <button id="closeCrashBtn" style="
                    background: #666;
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    font-size: 16px;
                    border-radius: 6px;
                    cursor: pointer;
                    margin: 0 10px;
                    min-width: 120px;
                ">Close</button>
            </div>
        `;
        
        overlay.appendChild(messageBox);
        document.body.appendChild(overlay);
        
        // Add event listeners
        document.getElementById('tryAgainBtn').addEventListener('click', () => {
            document.body.removeChild(overlay);
            this.resetRace();
        });
        
        document.getElementById('closeCrashBtn').addEventListener('click', () => {
            document.body.removeChild(overlay);
        });
        
        // Close on overlay click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                document.body.removeChild(overlay);
            }
        });
    }
    
    render() {
        // Clear canvas with white background
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Save context for transformations
        this.ctx.save();
        
        // Camera follow car
        const cameraX = this.car.x - this.canvas.width / 2;
        const cameraY = this.car.y - this.canvas.height / 2;
        this.ctx.translate(-cameraX, -cameraY);
        
        // Draw track
        this.drawTrack();
        
        // Draw car
        this.drawCar();
        
        // Draw finish line
        this.drawFinishLine();
        
        // Draw debug info if enabled
        if (window.location.search.includes('debug')) {
            this.drawDebugInfo();
        }
        
        // Restore context
        this.ctx.restore();
    }
    
    drawTrack() {
        // Draw track surface (between outer and inner boundaries) using even-odd fill rule
        this.ctx.save();
        this.ctx.beginPath();
        // Outer boundary (clockwise)
        this.outerTrack.forEach((point, index) => {
            if (index === 0) {
                this.ctx.moveTo(point.x, point.y);
            } else {
                this.ctx.lineTo(point.x, point.y);
            }
        });
        this.ctx.closePath();
        // Inner boundary (counter-clockwise)
        this.ctx.moveTo(this.innerTrack[0].x, this.innerTrack[0].y);
        for (let i = 1; i < this.innerTrack.length; i++) {
            this.ctx.lineTo(this.innerTrack[i].x, this.innerTrack[i].y);
        }
        this.ctx.closePath();
        this.ctx.fillStyle = '#404040'; // Dark gray for track surface
        this.ctx.fill('evenodd');
        this.ctx.restore();
        
        // Draw track boundaries
        this.ctx.lineWidth = 4; // Normal thickness
        
        // Outer boundary (blue - this is the outside edge of the track)
        this.ctx.strokeStyle = '#0066cc';
        this.ctx.beginPath();
        this.outerTrack.forEach((point, index) => {
            if (index === 0) {
                this.ctx.moveTo(point.x, point.y);
            } else {
                this.ctx.lineTo(point.x, point.y);
            }
        });
        this.ctx.closePath();
        this.ctx.stroke();
        
        // Inner boundary (white - this is the inside edge of the track)
        this.ctx.lineWidth = 4;
        this.ctx.strokeStyle = '#0066cc';
        this.ctx.beginPath();
        this.innerTrack.forEach((point, index) => {
            if (index === 0) {
                this.ctx.moveTo(point.x, point.y);
            } else {
                this.ctx.lineTo(point.x, point.y);
            }
        });
        this.ctx.closePath();
        this.ctx.stroke();
        
        // Add center line for better track definition
        this.ctx.strokeStyle = '#ffff00';
        this.ctx.lineWidth = 4;
        this.ctx.setLineDash([15, 10]);
        this.ctx.beginPath();
        this.trackPoints.forEach((point, index) => {
            if (index === 0) {
                this.ctx.moveTo(point.x, point.y);
            } else {
                this.ctx.lineTo(point.x, point.y);
            }
        });
        this.ctx.closePath();
        this.ctx.stroke();
        this.ctx.setLineDash([]); // Reset dash
    }
    
    drawCar() {
        this.ctx.save();
        this.ctx.translate(this.car.x, this.car.y);
        this.ctx.rotate(this.car.angle);
        
        // Car body
        this.ctx.fillStyle = this.car.color;
        this.ctx.fillRect(-this.car.width/2, -this.car.height/2, this.car.width, this.car.height);
        
        // Car details
        this.ctx.fillStyle = '#fff';
        this.ctx.fillRect(this.car.width/2 - 5, -this.car.height/2 + 2, 3, this.car.height - 4);
        
        this.ctx.restore();
    }
    
    drawFinishLine() {
        this.ctx.strokeStyle = '#ffff00';
        this.ctx.lineWidth = 4;
        this.ctx.setLineDash([10, 10]);
        this.ctx.beginPath();
        this.ctx.moveTo(this.finishLine.x1, this.finishLine.y1);
        this.ctx.lineTo(this.finishLine.x2, this.finishLine.y2);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
    }
    
    drawDebugInfo() {
        // Draw debug overlay with car info
        this.ctx.save();
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(this.car.x - 100, this.car.y - 80, 200, 60);
        
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'left';
        
        const debugText = [
            `Speed: ${this.car.speed.toFixed(2)}`,
            `Angle: ${this.car.angle.toFixed(2)}`,
            `Race: ${this.raceStarted ? 'Started' : 'Not Started'}`,
            `Keys: ${Object.keys(this.keys).filter(k => this.keys[k]).join(', ')}`
        ];
        
        debugText.forEach((text, i) => {
            this.ctx.fillText(text, this.car.x - 95, this.car.y - 60 + i * 15);
        });
        
        this.ctx.restore();
    }
    
    updateUI() {
        document.getElementById('currentTime').textContent = this.currentTime.toFixed(2);
        document.getElementById('lapCount').textContent = this.lapCount;
        document.getElementById('bestTime').textContent = (this.bestTime && typeof this.bestTime === 'number') ? 
            this.bestTime.toFixed(2) : '--:--';
        
        // Debug info (can be removed in production)
        if (window.location.search.includes('debug')) {
            console.log('Car State:', {
                x: this.car.x.toFixed(2),
                y: this.car.y.toFixed(2),
                speed: this.car.speed.toFixed(2),
                angle: this.car.angle.toFixed(2),
                raceStarted: this.raceStarted,
                raceCompleted: this.raceCompleted,
                keys: Object.keys(this.keys).filter(k => this.keys[k])
            });
        }
    }
    
    gameLoop(currentTime = 0) {
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        this.updatePhysics(deltaTime);
        this.render();
        
        requestAnimationFrame((time) => this.gameLoop(time));
    }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    // Remove the touch-controls overlay if present
    const touchControls = document.getElementById('touch-controls');
    if (touchControls) touchControls.remove();

    // ...existing code...
    const game = new RacingGame();
    window.racingGame = game; // Expose globally for debugging
    // Add debugging info
    console.log('Game initialized');
    console.log('Car start position:', game.car.x, game.car.y);
    console.log('Finish line:', game.finishLine);
    console.log('Track points:', game.trackPoints);
});
