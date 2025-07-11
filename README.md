# Simple Browser Racing Game

A physics-based racing game built with HTML5 Canvas, optimized for both desktop and mobile devices (iOS-friendly).

## Features

- **Physics-based car movement** with realistic acceleration, friction, and steering
- **Lap timing system** with best time tracking (saved locally)
- **Responsive design** that works on desktop and mobile devices
- **Touch controls** for mobile/tablet gameplay
- **iOS-friendly** with proper meta tags and touch handling

## Controls

### Desktop
- **Arrow Keys** or **WASD** to control the car
- **Up/W**: Accelerate
- **Down/S**: Brake/Reverse
- **Left/A**: Steer left
- **Right/D**: Steer right

### Mobile/Touch
- **Touch the steering wheel** and drag to steer
- **Green button**: Accelerate
- **Red button**: Brake/Reverse

## How to Play

1. **Open `index.html`** in your web browser
2. **Start driving** by pressing any key (desktop) or touching a control (mobile)
3. **Complete laps** by driving around the track and crossing the finish line
4. **Beat your best time** - times are automatically saved

## Technical Details

### Physics Implementation
- Realistic car physics with momentum and friction
- Steering only works when the car is moving
- Speed affects turning radius
- Collision detection with track boundaries

### Mobile Optimization
- Touch-friendly controls with visual feedback
- Responsive layout that adapts to screen size
- iOS Safari compatible with proper viewport settings
- Prevents unwanted zooming and scrolling

### Performance
- Efficient canvas rendering with camera following
- Optimized collision detection
- Smooth 60fps gameplay on modern devices

## File Structure

```
racing-game/
├── index.html      # Main HTML file
├── styles.css      # Responsive CSS styles
├── game.js         # Game logic and physics
└── README.md       # This file
```

## Browser Compatibility

- **Chrome** (Desktop & Mobile)
- **Firefox** (Desktop & Mobile)
- **Safari** (Desktop & iOS)
- **Edge** (Desktop & Mobile)

## Future Enhancements

- Multiple tracks
- Car customization
- Multiplayer support
- Sound effects
- Power-ups
- Different game modes

## Development

The game is built with vanilla JavaScript and HTML5 Canvas for maximum compatibility and performance. No external dependencies required.

To modify the game:
1. Edit `game.js` for gameplay mechanics
2. Edit `styles.css` for visual styling
3. Edit `index.html` for UI layout

## License

This project is open source and available under the MIT License.
