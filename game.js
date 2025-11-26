class RacingGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.minimapCanvas = document.getElementById('minimapCanvas');
        this.minimapCtx = this.minimapCanvas ? this.minimapCanvas.getContext('2d') : null;
        
        this.setupCanvas();
        
        // Game state
        this.gameRunning = false;
        this.lastTime = 0;
        
        // Particle systems
        this.particles = [];
        this.skidMarks = [];
        this.speedLines = [];
        
        // Car properties - enhanced handling
        this.car = {
            x: 0,
            y: 0,
            width: 40,
            height: 20,
            angle: 0,
            speed: 0,
            maxSpeed: 7,           // Reduced from 12 for better control
            acceleration: 0.08,     // Slower acceleration
            friction: 0.98,
            turnSpeed: 0.065,       // Increased for tighter turns
            drift: 0,
            driftFactor: 0.94,      // Less drift
            color: '#ff2222',
            secondaryColor: '#cc0000',
            wheelAngle: 0
        };
        
        // Enhanced track properties
        this.track = {
            width: 80,
            checkpoints: [],
            currentCheckpoint: 0
        };
        
        // Timing
        this.startTime = 0;
        this.currentTime = 0;
        this.bestTime = this.loadBestTime();
        this.lapCount = 0;
        this.raceStarted = false;
        this.raceCompleted = false;
        
        // Controls
        this.keys = {};
        this.touchControls = {
            steering: 0
        };
        
        // Scenery
        this.trees = [];
        this.grandstands = [];
        
        // Initialize
        this.setupControls();
        this.setupTrack();
        this.generateScenery();
        this.showStartPrompt();
        this.gameLoop();
        this.updateUI();
    }
    
    loadBestTime() {
        try {
            const stored = localStorage.getItem('bestTime');
            return stored ? parseFloat(stored) : null;
        } catch (e) {
            return null;
        }
    }
    
    saveBestTime(time) {
        try {
            localStorage.setItem('bestTime', time.toString());
        } catch (e) {
            console.warn('Could not save best time');
        }
    }
    
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
            flex-direction: column;
            align-items: center;
            justify-content: center;
            pointer-events: auto;
            z-index: 20;
            background: radial-gradient(ellipse at center, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.7) 100%);
        `;
        
        const title = document.createElement('div');
        title.style.cssText = `
            font-family: 'Racing Sans One', 'Orbitron', sans-serif;
            font-size: 4rem;
            color: #ff4444;
            text-shadow: 0 0 30px rgba(255,68,68,0.8), 0 4px 0 #990000;
            margin-bottom: 20px;
            letter-spacing: 4px;
        `;
        title.innerHTML = 'SPEED RACER';
        
        const msg = document.createElement('div');
        msg.style.cssText = `
            background: linear-gradient(145deg, rgba(20,20,30,0.95), rgba(10,10,15,0.95));
            color: #fff;
            font-size: 1.4rem;
            padding: 20px 40px;
            border-radius: 12px;
            border: 2px solid #00ff88;
            box-shadow: 0 0 30px rgba(0,255,136,0.3), 0 8px 32px rgba(0,0,0,0.4);
            font-family: 'Orbitron', sans-serif;
            text-align: center;
            animation: pulse-glow 2s infinite;
        `;
        msg.innerHTML = 'Press any key or tap to start!';
        
        const instructions = document.createElement('div');
        instructions.style.cssText = `
            margin-top: 30px;
            color: #888;
            font-size: 0.9rem;
            text-align: center;
            font-family: 'Orbitron', sans-serif;
        `;
        instructions.innerHTML = 'Steer with Arrow Keys or A/D<br>Stay on track to finish the lap!';
        
        overlay.appendChild(title);
        overlay.appendChild(msg);
        overlay.appendChild(instructions);
        canvas.parentElement.insertBefore(overlay, canvas.nextSibling);

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
    
    setupCanvas() {
        const resizeCanvas = () => {
            const container = this.canvas.parentElement;
            this.canvas.width = container.clientWidth;
            this.canvas.height = container.clientHeight;
            
            if (this.minimapCanvas) {
                this.minimapCanvas.width = 150;
                this.minimapCanvas.height = 100;
            }
        };
        
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
    }
    
    setupTrack() {
        // F1-style circuit with dramatic chicane for variety
        // Track flows clockwise with a sharp left-right chicane on the back straight
        this.trackPoints = [
            // Start/finish straight (bottom, going right)
            {x: 200, y: 550},
            {x: 350, y: 550},
            {x: 500, y: 550},
            {x: 650, y: 550},
            
            // Turn 1 - sweeping right (bottom-right corner)
            {x: 780, y: 530},
            {x: 880, y: 480},
            {x: 940, y: 400},
            
            // Right side straight (going up)
            {x: 960, y: 320},
            {x: 960, y: 240},
            
            // Turn 2 - top-right corner
            {x: 940, y: 160},
            {x: 880, y: 100},
            {x: 800, y: 70},
            
            // Approach to chicane
            {x: 720, y: 55},
            
            // DRAMATIC CHICANE - hard left then hard right
            {x: 650, y: 30},     // Sharp left (way up)
            {x: 580, y: -20},    // Apex left
            {x: 520, y: 20},     // Transition
            {x: 460, y: 100},    // Sharp right (way down)
            {x: 400, y: 140},    // Apex right
            {x: 340, y: 120},    // Exit chicane
            
            // Continue to left side
            {x: 280, y: 160},
            {x: 220, y: 220},
            
            // Left side curve
            {x: 160, y: 300},
            {x: 130, y: 380},
            
            // Turn 4 - bottom-left corner
            {x: 130, y: 460},
            {x: 160, y: 520}
        ];
        
        this.outerTrack = this.generateTrackBoundary(this.trackPoints, this.track.width);
        this.innerTrack = this.generateTrackBoundary(this.trackPoints, -this.track.width).reverse();
        this.outerCurbs = this.generateTrackBoundary(this.trackPoints, this.track.width - 10);
        this.innerCurbs = this.generateTrackBoundary(this.trackPoints, -this.track.width + 10).reverse();
        
        // Place finish line on the main straight (between points 1 and 2)
        const startPoint = this.trackPoints[1];  // Use second point on main straight
        const nextPoint = this.trackPoints[2];
        const dx = nextPoint.x - startPoint.x;
        const dy = nextPoint.y - startPoint.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const perpX = -dy / length;
        const perpY = dx / length;
        const lineLength = this.track.width;
        
        this.finishLine = {
            x1: startPoint.x + perpX * lineLength,
            y1: startPoint.y + perpY * lineLength,
            x2: startPoint.x - perpX * lineLength,
            y2: startPoint.y - perpY * lineLength
        };
        
        // Car starts AFTER the finish line, facing along the track direction
        // This means the car must complete a full lap to cross the finish line
        this.car.angle = Math.atan2(dy, dx);  // Face in direction of track
        this.car.x = startPoint.x + 80;  // Position car AFTER finish line
        this.car.y = startPoint.y;
        this.hasLeftStart = false;  // Track if car has left starting area
    }
    
    generateTrackBoundary(points, offset) {
        const boundary = [];
        for (let i = 0; i < points.length; i++) {
            const current = points[i];
            const next = points[(i + 1) % points.length];
            const prev = points[(i - 1 + points.length) % points.length];
            
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
    
    generateScenery() {
        this.trees = [];
        for (let i = 0; i < 80; i++) {
            const angle = (i / 80) * Math.PI * 2;
            const radius = 180 + Math.random() * 200;
            const centerX = 500;
            const centerY = 350;
            this.trees.push({
                x: centerX + Math.cos(angle) * radius + (Math.random() - 0.5) * 100,
                y: centerY + Math.sin(angle) * radius + (Math.random() - 0.5) * 100,
                size: 15 + Math.random() * 20,
                shade: Math.random() * 0.3
            });
        }
        
        this.grandstands = [
            {x: 100, y: 300, width: 80, height: 150, color: '#4444aa'},
            {x: 700, y: 50, width: 150, height: 40, color: '#aa4444'},
            {x: 900, y: 450, width: 60, height: 120, color: '#44aa44'}
        ];
    }
    
    setupControls() {
        document.addEventListener('keydown', (e) => {
            const key = e.key.toLowerCase();
            if (!this.raceStarted) {
                this.startRace();
                this.hideStartPrompt();
            }
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

        this.setupTouchControls();
    }
    
    setupTouchControls() {
        const canvas = this.canvas;
        let steerTouchId = null;
        
        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (e.touches.length > 0) {
                const touch = e.touches[0];
                const rect = canvas.getBoundingClientRect();
                const x = touch.clientX - rect.left;
                steerTouchId = touch.identifier;
                
                const center = rect.width / 2;
                const offset = (x - center) / center;
                this.touchControls.steering = Math.max(-1, Math.min(1, offset * 1.5));
                
                if (!this.raceStarted) {
                    this.startRace();
                    this.hideStartPrompt();
                }
            }
        });
        
        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            for (let i = 0; i < e.touches.length; i++) {
                if (e.touches[i].identifier === steerTouchId) {
                    const touch = e.touches[i];
                    const rect = canvas.getBoundingClientRect();
                    const x = touch.clientX - rect.left;
                    const center = rect.width / 2;
                    const offset = (x - center) / center;
                    this.touchControls.steering = Math.max(-1, Math.min(1, offset * 1.5));
                    break;
                }
            }
        });
        
        canvas.addEventListener('touchend', (e) => {
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
        
        canvas.addEventListener('touchcancel', () => {
            this.touchControls.steering = 0;
            steerTouchId = null;
        });
    }
    
    startRace() {
        if (!this.raceStarted && !this.raceCompleted) {
            this.raceStarted = true;
            this.startTime = Date.now();
            this.lapCount = 0;
            this.track.currentCheckpoint = 0;
            document.body.classList.add('racing-active');
        }
    }
    
    resetRace() {
        // Use same starting position as setupTrack (point 1 on main straight)
        const startPoint = this.trackPoints[1];
        const nextPoint = this.trackPoints[2];
        const dx = nextPoint.x - startPoint.x;
        const dy = nextPoint.y - startPoint.y;
        
        this.car.angle = Math.atan2(dy, dx);  // Face along track direction
        this.car.x = startPoint.x + 80;  // AFTER finish line
        this.car.y = startPoint.y;
        this.hasLeftStart = false;  // Reset start tracking
        this.car.speed = 0;
        this.car.drift = 0;
        
        this.raceStarted = false;
        this.raceCompleted = false;
        this.lapCount = 0;
        this.currentTime = 0;
        this.startTime = 0;
        
        this.particles = [];
        this.skidMarks = [];
        this.speedLines = [];
        
        document.body.classList.remove('racing-active');
        this.showStartPrompt();
        this.updateUI();
    }
    
    updatePhysics(deltaTime) {
        if (this.raceCompleted) return;
        
        const leftPressed = this.keys['left'];
        const rightPressed = this.keys['right'];
        const touchSteering = this.touchControls.steering;
        
        if (this.raceStarted && !this.raceCompleted) {
            this.car.speed = Math.min(this.car.speed + this.car.acceleration, this.car.maxSpeed);
        } else {
            this.car.speed *= this.car.friction;
        }
        
        const speedRatio = this.car.speed / this.car.maxSpeed;
        // Better turning at all speeds - more responsive
        const turnMultiplier = 0.6 + speedRatio * 0.4;
        let turning = 0;
        
        if (leftPressed) turning -= 1;
        if (rightPressed) turning += 1;
        if (Math.abs(touchSteering) > 0.1) turning += touchSteering;
        
        // Allow turning at lower speed threshold
        if (Math.abs(this.car.speed) > 0.2) {
            const steerAmount = turning * this.car.turnSpeed * turnMultiplier;
            this.car.angle += steerAmount;
            
            // Drift only at high speeds
            if (Math.abs(turning) > 0.5 && speedRatio > 0.7) {
                this.car.drift += turning * 0.015;
                this.car.drift *= this.car.driftFactor;
                
                if (Math.abs(this.car.drift) > 0.1) {
                    this.createTireSmoke();
                    this.createSkidMark();
                }
            } else {
                this.car.drift *= 0.9;
            }
        }
        
        this.car.wheelAngle = turning * 0.4;
        
        const moveAngle = this.car.angle + this.car.drift;
        this.car.x += Math.cos(moveAngle) * this.car.speed;
        this.car.y += Math.sin(moveAngle) * this.car.speed;
        
        if (speedRatio > 0.7 && Math.random() < 0.3) {
            this.createSpeedLine();
        }
        
        this.updateParticles();
        this.checkTrackCollision();
        this.checkCheckpoints();
        
        if (this.raceStarted && !this.raceCompleted) {
            this.currentTime = (Date.now() - this.startTime) / 1000;
            this.updateUI();
        }
    }
    
    createTireSmoke() {
        const rear = -this.car.width / 2;
        for (let i = 0; i < 2; i++) {
            const side = (i === 0 ? -1 : 1) * this.car.height / 2;
            const smokeX = this.car.x + Math.cos(this.car.angle) * rear - Math.sin(this.car.angle) * side;
            const smokeY = this.car.y + Math.sin(this.car.angle) * rear + Math.cos(this.car.angle) * side;
            
            this.particles.push({
                x: smokeX,
                y: smokeY,
                vx: (Math.random() - 0.5) * 2,
                vy: (Math.random() - 0.5) * 2,
                size: 8 + Math.random() * 8,
                alpha: 0.6,
                decay: 0.02,
                color: '#888888'
            });
        }
    }
    
    createSkidMark() {
        const rear = -this.car.width / 2;
        for (let i = 0; i < 2; i++) {
            const side = (i === 0 ? -1 : 1) * this.car.height / 3;
            const markX = this.car.x + Math.cos(this.car.angle) * rear - Math.sin(this.car.angle) * side;
            const markY = this.car.y + Math.sin(this.car.angle) * rear + Math.cos(this.car.angle) * side;
            
            this.skidMarks.push({
                x: markX,
                y: markY,
                alpha: 0.4
            });
        }
        
        if (this.skidMarks.length > 500) {
            this.skidMarks = this.skidMarks.slice(-400);
        }
    }
    
    createSpeedLine() {
        const angle = this.car.angle + Math.PI;
        const distance = 50 + Math.random() * 30;
        this.speedLines.push({
            x: this.car.x + Math.cos(angle) * distance + (Math.random() - 0.5) * 40,
            y: this.car.y + Math.sin(angle) * distance + (Math.random() - 0.5) * 40,
            length: 20 + Math.random() * 30,
            angle: this.car.angle,
            alpha: 0.8,
            decay: 0.05
        });
    }
    
    updateParticles() {
        this.particles = this.particles.filter(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.size *= 1.02;
            p.alpha -= p.decay;
            return p.alpha > 0;
        });
        
        this.skidMarks.forEach(m => {
            m.alpha *= 0.999;
        });
        this.skidMarks = this.skidMarks.filter(m => m.alpha > 0.05);
        
        this.speedLines = this.speedLines.filter(l => {
            l.alpha -= l.decay;
            return l.alpha > 0;
        });
    }
    
    checkTrackCollision() {
        const carX = this.car.x;
        const carY = this.car.y;
        
        // Check distance to each track segment (closed loop)
        let minDist = Infinity;
        const numPoints = this.trackPoints.length;
        
        for (let i = 0; i < numPoints; i++) {
            const p1 = this.trackPoints[i];
            const p2 = this.trackPoints[(i + 1) % numPoints];
            
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const lengthSq = dx * dx + dy * dy;
            
            if (lengthSq === 0) continue;
            
            // Find closest point on segment
            let t = ((carX - p1.x) * dx + (carY - p1.y) * dy) / lengthSq;
            t = Math.max(0, Math.min(1, t));
            
            const projX = p1.x + t * dx;
            const projY = p1.y + t * dy;
            const dist = Math.hypot(carX - projX, carY - projY);
            
            if (dist < minDist) {
                minDist = dist;
            }
        }
        
        // Use slightly smaller collision radius than visual track width
        const collisionRadius = this.track.width - 5;
        const onTrack = minDist <= collisionRadius;
        
        if (!onTrack && this.raceStarted && !this.raceCompleted) {
            this.raceCompleted = true;
            this.createCrashEffect();
            this.showCrashMessage();
        }
    }
    
    createCrashEffect() {
        for (let i = 0; i < 30; i++) {
            const angle = (i / 30) * Math.PI * 2;
            const speed = 3 + Math.random() * 5;
            this.particles.push({
                x: this.car.x,
                y: this.car.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 5 + Math.random() * 10,
                alpha: 1,
                decay: 0.03,
                color: Math.random() > 0.5 ? '#ff4444' : '#ffaa00'
            });
        }
    }
    
    checkCheckpoints() {
        if (this.raceCompleted) return;
        
        const carX = this.car.x;
        const carY = this.car.y;
        const prevCarX = carX - Math.cos(this.car.angle) * this.car.speed;
        const prevCarY = carY - Math.sin(this.car.angle) * this.car.speed;
        
        // Check if car has left the starting area (must be far enough away)
        const startPoint = this.trackPoints[1];
        const distFromStart = Math.sqrt((carX - startPoint.x) ** 2 + (carY - startPoint.y) ** 2);
        if (distFromStart > 300) {
            this.hasLeftStart = true;
        }
        
        // Only check finish line if car has driven around the track
        if (this.raceStarted && this.hasLeftStart && this.car.speed > 1 && 
            this.lineIntersection(prevCarX, prevCarY, carX, carY,
                                 this.finishLine.x1, this.finishLine.y1,
                                 this.finishLine.x2, this.finishLine.y2)) {
            this.lapCount++;
            
            if (this.lapCount >= 1) {
                this.raceCompleted = true;
                const lapTime = this.currentTime;
                
                if (!this.bestTime || lapTime < this.bestTime) {
                    this.bestTime = lapTime;
                    this.saveBestTime(this.bestTime);
                }
                
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
        document.body.classList.remove('racing-active');
        
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: radial-gradient(ellipse at center, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.9) 100%);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
            font-family: 'Orbitron', -apple-system, sans-serif;
        `;
        
        const messageBox = document.createElement('div');
        const isNewBest = this.bestTime === lapTime;
        
        messageBox.style.cssText = `
            background: linear-gradient(145deg, rgba(30,30,40,0.98), rgba(15,15,20,0.98));
            color: white;
            padding: 50px 60px;
            border-radius: 20px;
            text-align: center;
            border: 3px solid ${isNewBest ? '#ffd700' : '#00ff88'};
            max-width: 450px;
            margin: 20px;
            box-shadow: 0 0 50px ${isNewBest ? 'rgba(255,215,0,0.4)' : 'rgba(0,255,136,0.4)'};
        `;
        
        messageBox.innerHTML = `
            <h2 style="margin: 0 0 25px 0; color: #00ff88; font-size: 42px; text-shadow: 0 0 20px rgba(0,255,136,0.5);">
                Race Complete!
            </h2>
            <div style="font-size: 28px; margin: 25px 0; color: #fff;">
                Time: <span style="color: #00ff88; font-weight: bold; font-size: 36px;">${lapTime.toFixed(2)}s</span>
            </div>
            ${isNewBest ? `
                <div style="color: #ffd700; font-size: 22px; margin: 15px 0; animation: pulse-glow 1s infinite;">
                    NEW BEST TIME!
                </div>
            ` : `
                <div style="color: #888; font-size: 16px;">
                    Best: ${this.bestTime ? this.bestTime.toFixed(2) + 's' : '--:--'}
                </div>
            `}
            <div style="margin: 40px 0 10px;">
                <button id="playAgainBtn" style="
                    background: linear-gradient(145deg, #00ff88, #00cc66);
                    color: #000;
                    border: none;
                    padding: 16px 40px;
                    font-size: 18px;
                    font-weight: bold;
                    border-radius: 10px;
                    cursor: pointer;
                    margin: 0 10px;
                    font-family: 'Orbitron', sans-serif;
                    text-transform: uppercase;
                    letter-spacing: 2px;
                    box-shadow: 0 4px 20px rgba(0,255,136,0.4);
                    transition: all 0.2s;
                ">Race Again</button>
            </div>
        `;
        
        overlay.appendChild(messageBox);
        document.body.appendChild(overlay);
        
        document.getElementById('playAgainBtn').addEventListener('click', () => {
            document.body.removeChild(overlay);
            this.resetRace();
        });
        
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                document.body.removeChild(overlay);
                this.resetRace();
            }
        });
    }
    
    showCrashMessage() {
        document.body.classList.remove('racing-active');
        
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: radial-gradient(ellipse at center, rgba(50,0,0,0.7) 0%, rgba(0,0,0,0.9) 100%);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
            font-family: 'Orbitron', -apple-system, sans-serif;
        `;
        
        const messageBox = document.createElement('div');
        messageBox.style.cssText = `
            background: linear-gradient(145deg, rgba(40,20,20,0.98), rgba(20,10,10,0.98));
            color: white;
            padding: 50px 60px;
            border-radius: 20px;
            text-align: center;
            border: 3px solid #ff4444;
            max-width: 450px;
            margin: 20px;
            box-shadow: 0 0 50px rgba(255,68,68,0.4);
        `;
        
        messageBox.innerHTML = `
            <h2 style="margin: 0 0 25px 0; color: #ff4444; font-size: 42px; text-shadow: 0 0 20px rgba(255,68,68,0.5);">
                CRASH!
            </h2>
            <div style="font-size: 18px; margin: 20px 0; color: #ccc;">
                You went off track!
            </div>
            <div style="font-size: 16px; color: #888;">
                Time: ${this.currentTime.toFixed(2)}s
            </div>
            <div style="margin: 40px 0 10px;">
                <button id="tryAgainBtn" style="
                    background: linear-gradient(145deg, #ff4444, #cc2222);
                    color: #fff;
                    border: none;
                    padding: 16px 40px;
                    font-size: 18px;
                    font-weight: bold;
                    border-radius: 10px;
                    cursor: pointer;
                    font-family: 'Orbitron', sans-serif;
                    text-transform: uppercase;
                    letter-spacing: 2px;
                    box-shadow: 0 4px 20px rgba(255,68,68,0.4);
                    transition: all 0.2s;
                ">Try Again</button>
            </div>
        `;
        
        overlay.appendChild(messageBox);
        document.body.appendChild(overlay);
        
        document.getElementById('tryAgainBtn').addEventListener('click', () => {
            document.body.removeChild(overlay);
            this.resetRace();
        });
        
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                document.body.removeChild(overlay);
                this.resetRace();
            }
        });
    }
    
    render() {
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, '#1a3d1a');
        gradient.addColorStop(0.5, '#0d2d0d');
        gradient.addColorStop(1, '#0a1f0a');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.save();
        
        // Zoom out to see more of the track (0.7 = 70% zoom, shows more area)
        const zoom = 0.65;
        const cameraX = this.car.x - (this.canvas.width / 2) / zoom;
        const cameraY = this.car.y - (this.canvas.height / 2) / zoom;
        
        this.ctx.scale(zoom, zoom);
        this.ctx.translate(-cameraX, -cameraY);
        
        this.drawScenery();
        this.drawSkidMarks();
        this.drawTrack();
        this.drawSpeedLines();
        this.drawFinishLine();
        this.drawParticles();
        this.drawCar();
        
        this.ctx.restore();
        
        this.drawMinimap();
    }
    
    drawScenery() {
        this.ctx.fillStyle = '#0d2d0d';
        
        this.grandstands.forEach(stand => {
            const grad = this.ctx.createLinearGradient(stand.x, stand.y, stand.x, stand.y + stand.height);
            grad.addColorStop(0, stand.color);
            grad.addColorStop(1, this.darkenColor(stand.color, 0.5));
            this.ctx.fillStyle = grad;
            this.ctx.fillRect(stand.x, stand.y, stand.width, stand.height);
            
            this.ctx.fillStyle = '#333';
            this.ctx.fillRect(stand.x - 5, stand.y - 10, stand.width + 10, 15);
            
            this.ctx.fillStyle = '#ffcc00';
            for (let i = 0; i < 10; i++) {
                const px = stand.x + 5 + Math.random() * (stand.width - 10);
                const py = stand.y + 10 + Math.random() * (stand.height - 20);
                this.ctx.beginPath();
                this.ctx.arc(px, py, 2, 0, Math.PI * 2);
                this.ctx.fill();
            }
        });
        
        this.trees.forEach(tree => {
            this.ctx.fillStyle = 'rgba(0,0,0,0.3)';
            this.ctx.beginPath();
            this.ctx.ellipse(tree.x + 5, tree.y + tree.size, tree.size * 0.7, tree.size * 0.3, 0, 0, Math.PI * 2);
            this.ctx.fill();
            
            this.ctx.fillStyle = '#4a3728';
            this.ctx.fillRect(tree.x - 3, tree.y, 6, tree.size * 0.4);
            
            const green = Math.floor(100 + (1 - tree.shade) * 80);
            this.ctx.fillStyle = `rgb(20, ${green}, 20)`;
            this.ctx.beginPath();
            this.ctx.arc(tree.x, tree.y - tree.size * 0.2, tree.size * 0.6, 0, Math.PI * 2);
            this.ctx.fill();
            
            this.ctx.fillStyle = `rgb(30, ${green + 20}, 30)`;
            this.ctx.beginPath();
            this.ctx.arc(tree.x - tree.size * 0.3, tree.y, tree.size * 0.5, 0, Math.PI * 2);
            this.ctx.fill();
            
            this.ctx.beginPath();
            this.ctx.arc(tree.x + tree.size * 0.3, tree.y, tree.size * 0.45, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }
    
    darkenColor(color, factor) {
        const hex = color.replace('#', '');
        const r = Math.floor(parseInt(hex.substr(0, 2), 16) * factor);
        const g = Math.floor(parseInt(hex.substr(2, 2), 16) * factor);
        const b = Math.floor(parseInt(hex.substr(4, 2), 16) * factor);
        return `rgb(${r},${g},${b})`;
    }
    
    drawSkidMarks() {
        this.ctx.fillStyle = '#222';
        this.skidMarks.forEach(mark => {
            this.ctx.globalAlpha = mark.alpha;
            this.ctx.beginPath();
            this.ctx.arc(mark.x, mark.y, 3, 0, Math.PI * 2);
            this.ctx.fill();
        });
        this.ctx.globalAlpha = 1;
    }
    
    drawTrack() {
        this.ctx.save();
        this.ctx.beginPath();
        const outerGrass = this.generateTrackBoundary(this.trackPoints, this.track.width + 30);
        outerGrass.forEach((point, index) => {
            if (index === 0) this.ctx.moveTo(point.x, point.y);
            else this.ctx.lineTo(point.x, point.y);
        });
        this.ctx.closePath();
        this.ctx.fillStyle = '#1a4d1a';
        this.ctx.fill();
        this.ctx.restore();
        
        this.ctx.save();
        this.ctx.beginPath();
        this.outerTrack.forEach((point, index) => {
            if (index === 0) this.ctx.moveTo(point.x, point.y);
            else this.ctx.lineTo(point.x, point.y);
        });
        this.ctx.closePath();
        this.ctx.moveTo(this.innerTrack[0].x, this.innerTrack[0].y);
        for (let i = 1; i < this.innerTrack.length; i++) {
            this.ctx.lineTo(this.innerTrack[i].x, this.innerTrack[i].y);
        }
        this.ctx.closePath();
        
        const trackGrad = this.ctx.createLinearGradient(0, 0, 1000, 700);
        trackGrad.addColorStop(0, '#3a3a3a');
        trackGrad.addColorStop(0.5, '#2a2a2a');
        trackGrad.addColorStop(1, '#3a3a3a');
        this.ctx.fillStyle = trackGrad;
        this.ctx.fill('evenodd');
        this.ctx.restore();
        
        this.drawCurbs();
        
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 3;
        this.ctx.setLineDash([20, 20]);
        this.ctx.beginPath();
        this.trackPoints.forEach((point, index) => {
            if (index === 0) this.ctx.moveTo(point.x, point.y);
            else this.ctx.lineTo(point.x, point.y);
        });
        this.ctx.closePath();
        this.ctx.stroke();
        this.ctx.setLineDash([]);
        
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 3;
        
        this.ctx.beginPath();
        this.outerTrack.forEach((point, index) => {
            if (index === 0) this.ctx.moveTo(point.x, point.y);
            else this.ctx.lineTo(point.x, point.y);
        });
        this.ctx.closePath();
        this.ctx.stroke();
        
        this.ctx.beginPath();
        this.innerTrack.forEach((point, index) => {
            if (index === 0) this.ctx.moveTo(point.x, point.y);
            else this.ctx.lineTo(point.x, point.y);
        });
        this.ctx.closePath();
        this.ctx.stroke();
    }
    
    drawCurbs() {
        const curbWidth = 12;
        const stripeLength = 15;
        
        for (let i = 0; i < this.outerTrack.length; i++) {
            const p1 = this.outerTrack[i];
            const p2 = this.outerTrack[(i + 1) % this.outerTrack.length];
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const len = Math.sqrt(dx * dx + dy * dy);
            const stripes = Math.floor(len / stripeLength);
            
            for (let j = 0; j < stripes; j++) {
                const t = j / stripes;
                const x = p1.x + dx * t;
                const y = p1.y + dy * t;
                
                this.ctx.fillStyle = j % 2 === 0 ? '#ff0000' : '#ffffff';
                this.ctx.save();
                this.ctx.translate(x, y);
                this.ctx.rotate(Math.atan2(dy, dx));
                this.ctx.fillRect(0, -curbWidth / 2, stripeLength, curbWidth);
                this.ctx.restore();
            }
        }
    }
    
    drawSpeedLines() {
        this.speedLines.forEach(line => {
            this.ctx.strokeStyle = `rgba(255, 255, 255, ${line.alpha})`;
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(line.x, line.y);
            this.ctx.lineTo(
                line.x - Math.cos(line.angle) * line.length,
                line.y - Math.sin(line.angle) * line.length
            );
            this.ctx.stroke();
        });
    }
    
    drawFinishLine() {
        const dx = this.finishLine.x2 - this.finishLine.x1;
        const dy = this.finishLine.y2 - this.finishLine.y1;
        const len = Math.sqrt(dx * dx + dy * dy);
        const squares = 12;
        const squareSize = len / squares;
        
        for (let i = 0; i < squares; i++) {
            const t = i / squares;
            const x = this.finishLine.x1 + dx * t;
            const y = this.finishLine.y1 + dy * t;
            
            this.ctx.fillStyle = i % 2 === 0 ? '#ffffff' : '#000000';
            this.ctx.save();
            this.ctx.translate(x, y);
            this.ctx.rotate(Math.atan2(dy, dx));
            this.ctx.fillRect(0, -10, squareSize + 1, 10);
            
            this.ctx.fillStyle = i % 2 === 0 ? '#000000' : '#ffffff';
            this.ctx.fillRect(0, 0, squareSize + 1, 10);
            this.ctx.restore();
        }
    }
    
    drawParticles() {
        this.particles.forEach(p => {
            this.ctx.globalAlpha = p.alpha;
            this.ctx.fillStyle = p.color;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fill();
        });
        this.ctx.globalAlpha = 1;
    }
    
    drawCar() {
        this.ctx.save();
        this.ctx.translate(this.car.x, this.car.y);
        this.ctx.rotate(this.car.angle);
        
        const w = this.car.width;
        const h = this.car.height;
        
        this.ctx.fillStyle = 'rgba(0,0,0,0.3)';
        this.ctx.beginPath();
        this.ctx.ellipse(3, 3, w / 2 + 2, h / 2 + 2, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.fillStyle = '#1a1a1a';
        const wheelW = 8;
        const wheelH = 6;
        
        this.ctx.save();
        this.ctx.translate(w / 3, -h / 2 - 1);
        this.ctx.rotate(this.car.wheelAngle);
        this.ctx.fillRect(-wheelW / 2, -wheelH / 2, wheelW, wheelH);
        this.ctx.restore();
        
        this.ctx.save();
        this.ctx.translate(w / 3, h / 2 + 1);
        this.ctx.rotate(this.car.wheelAngle);
        this.ctx.fillRect(-wheelW / 2, -wheelH / 2, wheelW, wheelH);
        this.ctx.restore();
        
        this.ctx.fillRect(-w / 3 - wheelW / 2, -h / 2 - wheelH + 2, wheelW, wheelH);
        this.ctx.fillRect(-w / 3 - wheelW / 2, h / 2 - 2, wheelW, wheelH);
        
        const bodyGrad = this.ctx.createLinearGradient(0, -h / 2, 0, h / 2);
        bodyGrad.addColorStop(0, '#ff4444');
        bodyGrad.addColorStop(0.5, this.car.color);
        bodyGrad.addColorStop(1, '#aa0000');
        this.ctx.fillStyle = bodyGrad;
        
        this.ctx.beginPath();
        this.ctx.moveTo(w / 2, 0);
        this.ctx.quadraticCurveTo(w / 2, -h / 2, w / 4, -h / 2);
        this.ctx.lineTo(-w / 3, -h / 2);
        this.ctx.quadraticCurveTo(-w / 2, -h / 2, -w / 2, 0);
        this.ctx.quadraticCurveTo(-w / 2, h / 2, -w / 3, h / 2);
        this.ctx.lineTo(w / 4, h / 2);
        this.ctx.quadraticCurveTo(w / 2, h / 2, w / 2, 0);
        this.ctx.fill();
        
        this.ctx.fillStyle = '#222';
        this.ctx.beginPath();
        this.ctx.ellipse(0, 0, w / 5, h / 3, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(-w / 2, -2, w, 4);
        
        this.ctx.fillStyle = '#cc0000';
        this.ctx.fillRect(w / 2 - 3, -h / 2 - 3, 6, h + 6);
        
        this.ctx.fillStyle = '#990000';
        this.ctx.fillRect(-w / 2 - 2, -h / 2 - 4, 4, h + 8);
        
        this.ctx.fillStyle = '#ffff88';
        this.ctx.beginPath();
        this.ctx.arc(w / 2 - 2, -h / 4, 3, 0, Math.PI * 2);
        this.ctx.arc(w / 2 - 2, h / 4, 3, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 10px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('1', -5, 0);
        
        this.ctx.restore();
    }
    
    drawMinimap() {
        if (!this.minimapCtx) return;
        
        const ctx = this.minimapCtx;
        const width = this.minimapCanvas.width;
        const height = this.minimapCanvas.height;
        
        ctx.fillStyle = 'rgba(0,20,0,0.9)';
        ctx.fillRect(0, 0, width, height);
        
        const trackBounds = this.getTrackBounds();
        const scaleX = (width - 20) / (trackBounds.maxX - trackBounds.minX);
        const scaleY = (height - 20) / (trackBounds.maxY - trackBounds.minY);
        const scale = Math.min(scaleX, scaleY);
        
        const offsetX = 10 - trackBounds.minX * scale;
        const offsetY = 10 - trackBounds.minY * scale;
        
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 8;
        ctx.beginPath();
        this.trackPoints.forEach((point, index) => {
            const x = point.x * scale + offsetX;
            const y = point.y * scale + offsetY;
            if (index === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.closePath();
        ctx.stroke();
        
        const carX = this.car.x * scale + offsetX;
        const carY = this.car.y * scale + offsetY;
        
        ctx.fillStyle = '#ff4444';
        ctx.beginPath();
        ctx.arc(carX, carY, 4, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(carX, carY);
        ctx.lineTo(
            carX + Math.cos(this.car.angle) * 8,
            carY + Math.sin(this.car.angle) * 8
        );
        ctx.stroke();
    }
    
    getTrackBounds() {
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;
        
        this.trackPoints.forEach(point => {
            minX = Math.min(minX, point.x);
            minY = Math.min(minY, point.y);
            maxX = Math.max(maxX, point.x);
            maxY = Math.max(maxY, point.y);
        });
        
        return { minX, minY, maxX, maxY };
    }
    
    updateUI() {
        document.getElementById('currentTime').textContent = this.currentTime.toFixed(2);
        document.getElementById('lapCount').textContent = this.lapCount;
        document.getElementById('bestTime').textContent = (this.bestTime && typeof this.bestTime === 'number') ? 
            this.bestTime.toFixed(2) + 's' : '--:--';
        
        const speedElement = document.getElementById('speedValue');
        if (speedElement) {
            const displaySpeed = Math.round((this.car.speed / this.car.maxSpeed) * 320);
            speedElement.textContent = displaySpeed;
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

document.addEventListener('DOMContentLoaded', () => {
    const game = new RacingGame();
    window.racingGame = game;
});
