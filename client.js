/**
 * NextGen Freemode - Client Side
 * GTA Online style freemode gamemode
 */

let framework = null;
let hasSpawned = false;

// Wait for framework
setImmediate(async () => {
  let attempts = 0;
  while (!framework && attempts < 50) {
    framework = exports['ng_core'].GetFramework();
    if (!framework) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
  }

  if (!framework) {
    console.error('[Freemode] Framework not found!');
    return;
  }

  console.log('[Freemode] Client initialized');
  initializeFreemode();
});

/**
 * Initialize freemode client
 */
function initializeFreemode() {
  // Disable default spawn
  exports.spawnmanager.setAutoSpawn(false);

  // Setup spawn
  setupSpawn();

  // Setup RPC handlers
  setupRPC();

  // Setup death handling
  setupDeathHandling();

  console.log('[Freemode] ✅ Client ready');
}

/**
 * Setup spawn system
 */
function setupSpawn() {
  // Spawn player on first join
  on('playerSpawned', () => {
    if (!hasSpawned) {
      hasSpawned = true;
      spawnPlayer();
    }
  });

  // Respawn on death
  on('onClientGameTypeStart', () => {
    if (!hasSpawned) {
      spawnPlayer();
    }
  });
}

/**
 * Spawn the player
 */
async function spawnPlayer() {
  const playerPed = PlayerPedId();

  // Default spawn location (LSIA)
  const spawnCoords = {
    x: -1037.0,
    y: -2737.0,
    z: 20.0,
    heading: 240.0
  };

  // Freeze player
  FreezeEntityPosition(playerPed, true);

  // Fade out
  DoScreenFadeOut(500);
  await delay(500);

  // Set coordinates
  RequestCollisionAtCoord(spawnCoords.x, spawnCoords.y, spawnCoords.z);
  SetEntityCoords(playerPed, spawnCoords.x, spawnCoords.y, spawnCoords.z, false, false, false, false);
  SetEntityHeading(playerPed, spawnCoords.heading);

  // Wait for collision
  await delay(1000);

  // Setup player
  NetworkResurrectLocalPlayer(spawnCoords.x, spawnCoords.y, spawnCoords.z, spawnCoords.heading, true, false);
  ClearPedTasksImmediately(playerPed);
  RemoveAllPedWeapons(playerPed, true);

  // Set default appearance (Michael)
  SetPlayerModel(PlayerId(), GetHashKey('mp_m_freemode_01'));
  SetPedDefaultComponentVariation(PlayerPedId());

  // Give basic health
  SetEntityHealth(playerPed, 200);

  // Unfreeze and fade in
  FreezeEntityPosition(playerPed, false);
  DoScreenFadeIn(1000);

  // Show welcome message
  const notif = framework.getModule('notifications');
  if (notif) {
    notif.success('Welcome to NextGen Freemode');
    await delay(2000);
    notif.info('Use /help to see available commands');
  }

  console.log('[Freemode] Player spawned');
}

/**
 * Setup RPC handlers
 */
function setupRPC() {
  // Spawn vehicle
  framework.rpc.register('freemode:spawnVehicle', async (modelName) => {
    try {
      const playerPed = PlayerPedId();
      const coords = GetEntityCoords(playerPed, false);
      const heading = GetEntityHeading(playerPed);

      // Get model hash
      const modelHash = GetHashKey(modelName);

      // Check if model exists
      if (!IsModelInCdimage(modelHash) || !IsModelAVehicle(modelHash)) {
        return { success: false, error: 'Invalid vehicle model' };
      }

      // Request model
      RequestModel(modelHash);
      let attempts = 0;
      while (!HasModelLoaded(modelHash) && attempts < 100) {
        await delay(10);
        attempts++;
      }

      if (!HasModelLoaded(modelHash)) {
        return { success: false, error: 'Failed to load vehicle model' };
      }

      // Calculate spawn position (in front of player)
      const forwardVector = GetEntityForwardVector(playerPed);
      const spawnX = coords[0] + forwardVector[0] * 5.0;
      const spawnY = coords[1] + forwardVector[1] * 5.0;
      const spawnZ = coords[2];

      // Create vehicle
      const vehicle = CreateVehicle(modelHash, spawnX, spawnY, spawnZ, heading, true, false);

      if (!vehicle || vehicle === 0) {
        SetModelAsNoLongerNeeded(modelHash);
        return { success: false, error: 'Failed to create vehicle' };
      }

      // Setup vehicle
      SetVehicleOnGroundProperly(vehicle);
      SetEntityAsMissionEntity(vehicle, true, true);
      SetVehRadioStation(vehicle, 'OFF');

      // Put player in vehicle
      TaskWarpPedIntoVehicle(playerPed, vehicle, -1);

      // Cleanup model
      SetModelAsNoLongerNeeded(modelHash);

      return { success: true };
    } catch (error) {
      console.error('[Freemode] Error spawning vehicle:', error);
      return { success: false, error: error.message };
    }
  });

  // Suicide/Respawn
  framework.rpc.register('freemode:suicide', () => {
    const playerPed = PlayerPedId();
    SetEntityHealth(playerPed, 0);
  });

  console.log('[Freemode] ✅ RPC handlers registered');
}

/**
 * Setup death handling
 */
function setupDeathHandling() {
  setTick(() => {
    const playerPed = PlayerPedId();

    if (IsEntityDead(playerPed)) {
      // Player died, wait a bit then respawn
      setTimeout(() => {
        if (IsEntityDead(playerPed)) {
          spawnPlayer();
        }
      }, 5000); // 5 second respawn delay
    }
  });
}

/**
 * Helper delay function
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

console.log('[Freemode] Client script loaded');
