let scene, camera, renderer, controls;
let playerVelocity = new THREE.Vector3();
let playerOnGround = false;
const playerHeight = 1.8; // meters
const playerSpeed = 8.0;
const playerJumpForce = 8.0;
const gravity = 20.0;

let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let canJump = false; // Should be true if on ground and space is released

const objects = []; // For collision detection
let floor; // Make floor accessible globally for collision check

let prevTime = performance.now();

init();
// animate(); // Call animate only after init is successful

function init() {
    console.log("init() called");
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb); // Sky blue
    scene.fog = new THREE.Fog(0x87ceeb, 0, 150);
    console.log("Scene created");

    // Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.y = playerHeight; // Position camera at player height
    console.log("Camera created");

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true; // Enable shadows
    document.body.appendChild(renderer.domElement);
    console.log("Renderer created and appended to body");

    // Pointer Lock Controls
    console.log("Attempting to initialize PointerLockControls...");
    if (typeof THREE.PointerLockControls === 'undefined') {
        console.error("THREE.PointerLockControls is UNDEFINED. Script likely not loaded or loaded in wrong order.");
        alert("CRITICAL ERROR: PointerLockControls script not loaded. Check console and HTML script tags, and ensure internet connection for CDNs.");
        return; // Stop initialization if controls are missing
    }
    try {
        controls = new THREE.PointerLockControls(camera, document.body);
        console.log("PointerLockControls object initialized:", controls);
    } catch (e) {
        console.error("Error initializing PointerLockControls:", e);
        alert("CRITICAL ERROR: Could not initialize PointerLockControls. Check console.");
        return;
    }


    const blocker = document.getElementById('blocker');
    const instructions = document.getElementById('instructions');

    if (!instructions) {
        console.error("Element with ID 'instructions' not found!");
        alert("CRITICAL ERROR: HTML element 'instructions' not found. Check index.html.");
        return;
    } else {
        console.log("Element #instructions found:", instructions);
    }
    if (!blocker) {
        console.error("Element with ID 'blocker' not found!");
         // This is less critical for startup but good to know
    } else {
        console.log("Element #blocker found:", blocker);
    }

    console.log("Attempting to add click listener to instructions.");
    instructions.addEventListener('click', function () {
        console.log("Instructions clicked!");
        try {
            console.log("Attempting controls.lock(). Controls object:", controls);
            if (controls && typeof controls.lock === 'function') {
                controls.lock();
            } else {
                console.error("Controls object is not valid or lock function is missing", controls);
            }
        } catch (e) {
            console.error("Error during controls.lock():", e);
        }
    });

    if (controls && controls.addEventListener) { // Check if controls is valid before adding listeners
        controls.addEventListener('lock', function () {
            console.log("Controls locked successfully!");
            if (instructions) instructions.style.display = 'none';
            if (blocker) blocker.style.display = 'none';
        });

        controls.addEventListener('unlock', function () {
            console.log("Controls unlocked.");
            if (blocker) blocker.style.display = 'block';
            if (instructions) instructions.style.display = '';
        });
        scene.add(controls.getObject()); // Add the camera group to the scene
        console.log("Camera object from controls added to scene.");
    } else {
        console.error("Controls object is not valid for adding event listeners or getObject.");
        return; // Critical error, cannot proceed
    }


    // Lighting
    const ambientLight = new THREE.AmbientLight(0x606060);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 0).normalize();
    directionalLight.castShadow = true;
    scene.add(directionalLight);
    console.log("Lighting added.");

    // Floor
    const floorGeometry = new THREE.PlaneGeometry(200, 200, 50, 50);
    const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x808080, roughness: 0.8 }); // Grey floor
    floor = new THREE.Mesh(floorGeometry, floorMaterial); // Assign to global `floor`
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
    console.log("Floor added.");
    // objects.push(floor); // No need to push floor to general objects if handled separately for Y collision

    // Simple Walls (Level)
    const wallMaterial = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.9 });

    const wallHeight = 5;
    const wallThickness = 1;
    const roomSize = 20;

    let wall = new THREE.Mesh(new THREE.BoxGeometry(roomSize, wallHeight, wallThickness), wallMaterial);
    wall.position.set(0, wallHeight / 2, -roomSize / 2);
    wall.castShadow = true; wall.receiveShadow = true;
    scene.add(wall); objects.push(wall);

    wall = new THREE.Mesh(new THREE.BoxGeometry(roomSize, wallHeight, wallThickness), wallMaterial);
    wall.position.set(0, wallHeight / 2, roomSize / 2);
    wall.castShadow = true; wall.receiveShadow = true;
    scene.add(wall); objects.push(wall);

    wall = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, wallHeight, roomSize), wallMaterial);
    wall.position.set(-roomSize / 2, wallHeight / 2, 0);
    wall.castShadow = true; wall.receiveShadow = true;
    scene.add(wall); objects.push(wall);

    wall = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, wallHeight, roomSize), wallMaterial);
    wall.position.set(roomSize / 2, wallHeight / 2, 0);
    wall.castShadow = true; wall.receiveShadow = true;
    scene.add(wall); objects.push(wall);

    let obstacle = new THREE.Mesh(new THREE.BoxGeometry(3, 3, 3), new THREE.MeshStandardMaterial({color: 0xcc6600}));
    obstacle.position.set(5, 1.5, 5); // y should be half its height if it sits on the floor
    obstacle.castShadow = true; obstacle.receiveShadow = true;
    scene.add(obstacle); objects.push(obstacle);
    console.log("Walls and obstacles added.");

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    window.addEventListener('resize', onWindowResize);
    console.log("Event listeners for keys and resize added.");

    console.log("Initial setup in init() complete. Starting animation loop.");
    animate(); // Start animation loop HERE, after all setup is done
}

function onWindowResize() {
    if (camera && renderer) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        console.log("Window resized.");
    }
}

function onKeyDown(event) {
    switch (event.code) {
        case 'KeyW': moveForward = true; break;
        case 'KeyA': moveLeft = true; break;
        case 'KeyS': moveBackward = true; break;
        case 'KeyD': moveRight = true; break;
        case 'Space':
            // console.log("Space pressed. canJump:", canJump, "playerOnGround:", playerOnGround);
            if (canJump && playerOnGround) {
                 playerVelocity.y += playerJumpForce;
                 playerOnGround = false;
                 canJump = false; // Prevent holding space for multiple jumps until key up
            }
            break;
    }
}

function onKeyUp(event) {
    switch (event.code) {
        case 'KeyW': moveForward = false; break;
        case 'KeyA': moveLeft = false; break;
        case 'KeyS': moveBackward = false; break;
        case 'KeyD': moveRight = false; break;
        case 'Space':
            // console.log("Space released. Setting canJump to true.");
            canJump = true; // Allow jumping again if on ground
            break;
    }
}

function checkCollisions() {
    if (!controls || !controls.getObject()) return; // Guard clause

    const playerPos = controls.getObject().position;
    const halfPlayerHeight = playerHeight / 2;

    // Assume not on ground until collision with floor or suitable object proves otherwise
    let onSomething = false;

    // --- Y-axis collision (gravity, jumping, landing on floor/objects) ---
    // Check collision with floor first
    if (playerPos.y - halfPlayerHeight < floor.position.y + 0.1) { // Check feet relative to floor
        if (playerVelocity.y <= 0) { // Only if moving downwards or still
            playerPos.y = floor.position.y + halfPlayerHeight;
            playerVelocity.y = 0;
            onSomething = true;
        }
    }

    // Check collision with tops of other objects
    for (let i = 0; i < objects.length; i++) {
        const obj = objects[i];
        const objectBox = new THREE.Box3().setFromObject(obj);
        // Check if player's feet are roughly within horizontal bounds of object
        // and player is falling onto it or is very close above it
        if (playerPos.x > objectBox.min.x && playerPos.x < objectBox.max.x &&
            playerPos.z > objectBox.min.z && playerPos.z < objectBox.max.z &&
            playerPos.y - halfPlayerHeight < objectBox.max.y + 0.1 && // Feet near top of object
            playerPos.y - halfPlayerHeight > objectBox.max.y - 0.3 && // But not too far through it
            playerVelocity.y <= 0) {

            playerPos.y = objectBox.max.y + halfPlayerHeight;
            playerVelocity.y = 0;
            onSomething = true;
            break; // Found something to stand on
        }
    }
    playerOnGround = onSomething;
    if (playerOnGround) {
        canJump = true; // Can jump if on ground and space was released
    }


    // --- XZ-axis collision (walls, obstacles) ---
    // Simplified: create a bounding cylinder for the player for XZ checks
    const playerRadius = 0.4; // Smaller radius for XZ collision
    const tempPlayerPos = playerPos.clone(); // Original position for this frame before XZ checks

    for (let i = 0; i < objects.length; i++) {
        const obj = objects[i];
        const objectBox = new THREE.Box3().setFromObject(obj);

        // Check for XZ overlap considering player as a point moving into a box
        // This is a very simplified approach. True cylinder-box or AABB-AABB swept collision is more complex.

        // Is player within Y bounds of the object?
        if (playerPos.y - halfPlayerHeight < objectBox.max.y && playerPos.y + halfPlayerHeight > objectBox.min.y) {
            // Check X collision
            if (playerPos.x + playerRadius > objectBox.min.x && playerPos.x - playerRadius < objectBox.max.x &&
                tempPlayerPos.z + playerRadius > objectBox.min.z && tempPlayerPos.z - playerRadius < objectBox.max.z) { // Check Z within bounds

                if (playerVelocity.x > 0 && playerPos.x + playerRadius > objectBox.min.x && tempPlayerPos.x - playerRadius < objectBox.min.x) { // Moving right into left face
                    playerPos.x = objectBox.min.x - playerRadius - 0.01;
                    playerVelocity.x = 0;
                } else if (playerVelocity.x < 0 && playerPos.x - playerRadius < objectBox.max.x && tempPlayerPos.x + playerRadius > objectBox.max.x) { // Moving left into right face
                    playerPos.x = objectBox.max.x + playerRadius + 0.01;
                    playerVelocity.x = 0;
                }
            }
            // Check Z collision (important: use original X for this check to avoid double correction issues)
             if (playerPos.z + playerRadius > objectBox.min.z && playerPos.z - playerRadius < objectBox.max.z &&
                tempPlayerPos.x + playerRadius > objectBox.min.x && tempPlayerPos.x - playerRadius < objectBox.max.x ) { // Check X within bounds

                if (playerVelocity.z > 0 && playerPos.z + playerRadius > objectBox.min.z && tempPlayerPos.z - playerRadius < objectBox.min.z) { // Moving forward into near face
                    playerPos.z = objectBox.min.z - playerRadius - 0.01;
                    playerVelocity.z = 0;
                } else if (playerVelocity.z < 0 && playerPos.z - playerRadius < objectBox.max.z && tempPlayerPos.z + playerRadius > objectBox.max.z) { // Moving backward into far face
                    playerPos.z = objectBox.max.z + playerRadius + 0.01;
                    playerVelocity.z = 0;
                }
            }
        }
    }
}


function animate() {
    requestAnimationFrame(animate);

    const time = performance.now();
    const delta = Math.min(0.05, (time - prevTime) / 1000); // Cap delta, 0.05 is 20FPS minimum physics step
    prevTime = time;

    if (controls && controls.isLocked === true) {
        // Apply friction/damping for XZ movement
        playerVelocity.x -= playerVelocity.x * 10.0 * delta;
        playerVelocity.z -= playerVelocity.z * 10.0 * delta;

        // Apply gravity if not on ground
        if (!playerOnGround) {
            playerVelocity.y -= gravity * delta;
        } else {
            // If on ground and not jumping, ensure Y velocity is clamped (e.g. after landing)
            // playerVelocity.y = Math.max(0, playerVelocity.y); // Actually, checkCollisions should set it to 0
        }

        const cameraDirection = new THREE.Vector3();
        controls.getDirection(cameraDirection);
        const forward = new THREE.Vector3(cameraDirection.x, 0, cameraDirection.z).normalize();
        const right = new THREE.Vector3().crossVectors(controls.getObject().up, forward).normalize();

        let actualSpeed = playerSpeed;

        if (moveForward) playerVelocity.add(forward.clone().multiplyScalar(actualSpeed * delta));
        if (moveBackward) playerVelocity.sub(forward.clone().multiplyScalar(actualSpeed * delta));
        if (moveLeft) playerVelocity.sub(right.clone().multiplyScalar(actualSpeed * delta));
        if (moveRight) playerVelocity.add(right.clone().multiplyScalar(actualSpeed * delta));

        // Store old position to revert if stuck, or for more advanced collision
        // const oldPosition = controls.getObject().position.clone();

        // Apply XZ velocity
        controls.getObject().position.x += playerVelocity.x; // Velocity is already scaled by delta in its calculation
        controls.getObject().position.z += playerVelocity.z;

        // Apply Y velocity
        controls.getObject().position.y += playerVelocity.y * delta; // Y velocity is more like an acceleration (gravity)

        checkCollisions();

    } else {
        // Ensure velocity doesn't build up if not locked
        playerVelocity.set(0,0,0);
    }

    renderer.render(scene, camera);
}