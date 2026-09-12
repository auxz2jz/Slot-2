# Relic of Emberwood — True 3D Hero Demo

This is a standalone proof-of-concept for replacing the current sprite-swapping hero with an actual articulated 3D character.

## What is 3D here
- Real 3D vertices and polygon faces
- Hierarchical joints for shoulders, elbows, hips, knees, head, sword, and shield
- Smooth 360-degree body rotation
- Walk and run limb animation
- Sword attack animation
- Orbitable camera
- Perspective projection and directional shading

## Controls
- Mobile: left joystick to move, RUN to run, ATTACK to swing the sword
- Keyboard: WASD / arrow keys, Shift to run, Space to attack
- Camera: tap CAMERA to switch to orbit mode, then drag the scene
- AUTO TURN rotates the character automatically for inspection

The demo is self-contained and does not require Three.js or an external 3D library. It is intended to show the difference between real articulated 3D geometry and image/sprite swapping before adapting the approach to Slot-1.
