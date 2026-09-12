# Ocarina of Time Decompilation Fidelity Audit

Reference: public `zeldaret/oot` decompilation. This project uses the decompilation as a behavioral and technical reference only. Relic of Emberwood keeps original models, textures, names, maps, audio, and other creative assets.

## Systems reviewed

### Player movement
- Camera-relative analog stick yaw.
- Curved stick response with a low-magnitude dead zone and a rapid higher-stick ramp.
- Boot-specific run caps and deceleration data.
- Asymmetric acceleration/deceleration rather than generic interpolation.
- Separate free movement and hostile lock-on locomotion.
- Roll behavior tied to strong forward movement, with source code scaling normal movement speed by 1.5 and enforcing a minimum roll speed.

### Targeting / attention
- Hostile, friendly, and parallel Z-target states are distinct.
- The attention context owns reticle/forced-target state rather than simply choosing the nearest enemy every frame.
- Lock-on feeds player facing, action selection, camera mode, target release, and target switching.

### Camera
- Distinct normal, Z-parallel, friendly-target, hostile-target, talk, climb, aim, jump, ledge-hang, free-fall, charge, push/pull, and other camera modes.
- Normal and hostile-target modes use different eye distance, FOV, swing parameters, offsets, and interpolation data.
- Camera background collision prevents the eye from freely clipping through geometry.
- Camera positioning responds to floor/background geometry.

### Collision / traversal
- Background collision separates wall, floor, ceiling, static, and dynamic geometry tests.
- Actors use sphere/cylinder-style checks plus floor raycasts and collision-poly normals.
- Player data tracks wall distance, ledge height, ledge-climb type, and ledge delay.
- Surface material is part of gameplay feedback: dirt, sand, stone, shallow/deep water, tall grass, lava, grass, bridge, wood, ice, carpet, and others.

### Combat
- Melee attacks use animated weapon base/tip positions and swept `ColliderQuad` geometry, not a simple radial distance check.
- Weapon activation is state/frame dependent.
- Enemy body, shield, and weapon colliders can be separate.
- Representative enemies such as Stalfos use multi-state combat AI: approach, strafe/block, slashes, jump-back, jumpslash, stun, recoil, damage reactions, etc.

### Animation
- Player and actors use skeleton/joint tables.
- Animation changes support start/end frames, speed, modes, pose morphing, and tapered interpolation.
- Flexible skeletons and near/far limb display-list variants are supported.
- Footstep, landing, running, jumping, voice, and other SFX events are synchronized to animation frames.

### Character rendering target
- The player has near/far detail variants and equipment-specific hands, weapons, shields, sheath, boots, masks, and item poses.
- Child and adult faces use multiple 64×32 eye textures and 32×32 mouth textures.
- Numerous body/equipment textures are in the 8×8 to 32×64 range, consistent with an N64 low-resolution texture budget.
- The game presentation is 320×240.
- N64 texture filtering supports point and bilinear modes; the game commonly uses filtered low-resolution textures.

### Environment / presentation
- Environment light settings include ambient color, two directional lights, fog color, and fog distance.
- Time/environment systems interpolate light and fog settings.
- Room rendering includes cullable geometry rather than drawing the entire world indiscriminately.
- Interface/action prompts are context sensitive.

## Slot-2 rebuild targets

The N64 comparison mode should therefore use:
1. 320×240 internal rendering, scaled to the browser.
2. Low-poly but substantially more detailed original Emberwood character geometry.
3. Low-resolution filtered original textures and expression/equipment states.
4. Source-shaped analog response, acceleration, deceleration, and roll behavior.
5. Explicit free / parallel / hostile-target camera states with obstacle avoidance.
6. Toggle/hold targeting behavior and reticle state.
7. Floor/slope and world-obstacle collision.
8. Pose interpolation instead of raw sine-wave limb switching.
9. Swept weapon hit geometry tied to animated sword motion.
10. Stateful enemy combat with blocking, windup, attack, recovery, hurt, and death states.

## Boundary

No Nintendo model, texture, music, map, dialogue, or other copyrighted game asset is copied into Relic of Emberwood. Source mechanics and public technical information are used to independently implement comparable behavior with original assets.
