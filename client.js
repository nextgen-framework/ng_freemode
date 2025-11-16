/**
 * NextGen Freemode - Client Side
 * GTA Online style freemode gamemode
 */

let framework = null;
let hasSpawned = false;
let spawnLocations = {};

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
  // Disable auto spawn
  exports.spawnmanager.setAutoSpawn(false);

  // Setup spawn points
  setupSpawnPoints();

  // Setup spawn
  setupSpawn();

  // Setup RPC handlers
  setupRPC();

  // Setup death handling
  setupDeathHandling();

  console.log('[Freemode] ✅ Client ready');
}

/**
 * Setup spawn points
 */
function setupSpawnPoints() {
  // Define spawn locations
  spawnLocations = {
    lsia: { x: -1037.0, y: -2737.0, z: 20.0, heading: 240.0, model: 'mp_m_freemode_01' },
    legion: { x: 215.0, y: -810.0, z: 30.0, heading: 340.0, model: 'mp_m_freemode_01' },
    vinewood: { x: 752.0, y: 1275.0, z: 360.0, heading: 0.0, model: 'mp_m_freemode_01' },
    pier: { x: -1686.0, y: -1072.0, z: 13.0, heading: 50.0, model: 'mp_m_freemode_01' },
    paleto: { x: -104.0, y: 6467.0, z: 31.0, heading: 45.0, model: 'mp_m_freemode_01' },
    sandy: { x: 1961.0, y: 3741.0, z: 32.0, heading: 300.0, model: 'mp_m_freemode_01' }
  };

  // Add all spawn points to spawnmanager
  Object.values(spawnLocations).forEach(spawn => {
    exports.spawnmanager.addSpawnPoint({
      x: spawn.x,
      y: spawn.y,
      z: spawn.z,
      heading: spawn.heading,
      model: spawn.model,
      skipFade: false
    });
  });

  console.log('[Freemode] ✅ Spawn points registered');
}

/**
 * Setup spawn system
 */
function setupSpawn() {
  // Spawn player on first join
  on('onClientGameTypeStart', () => {
    exports.spawnmanager.spawnPlayer({
      x: spawnLocations.lsia.x,
      y: spawnLocations.lsia.y,
      z: spawnLocations.lsia.z,
      heading: spawnLocations.lsia.heading,
      model: spawnLocations.lsia.model,
      skipFade: false
    }, function() {
      // After spawn callback
      hasSpawned = true;
      onPlayerSpawned();
    });
  });
}

/**
 * Called when player spawns
 */
async function onPlayerSpawned() {
  // Wait a bit for everything to load
  await delay(1000);

  // Show welcome message
  const notif = framework.getModule('notifications');
  if (notif && !hasSpawned) {
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

  // Change spawn location
  framework.rpc.register('freemode:setSpawn', (spawnKey) => {
    const spawn = spawnLocations[spawnKey];
    if (!spawn) {
      return { success: false, error: 'Invalid spawn location' };
    }

    // Respawn player at new location
    exports.spawnmanager.spawnPlayer({
      x: spawn.x,
      y: spawn.y,
      z: spawn.z,
      heading: spawn.heading,
      model: spawn.model,
      skipFade: false
    });

    return { success: true };
  });

  console.log('[Freemode] ✅ RPC handlers registered');
}

/**
 * Setup death handling
 */
function setupDeathHandling() {
  let isDead = false;
  let respawnTimer = null;

  setInterval(() => {
    const playerPed = PlayerPedId();
    const dead = IsEntityDead(playerPed);

    if (dead && !isDead) {
      // Player just died
      isDead = true;
      console.log('[Freemode] Player died, respawning in 5 seconds...');

      // Set respawn timer
      respawnTimer = setTimeout(() => {
        // Respawn player
        exports.spawnmanager.spawnPlayer({
          x: spawnLocations.lsia.x,
          y: spawnLocations.lsia.y,
          z: spawnLocations.lsia.z,
          heading: spawnLocations.lsia.heading,
          model: spawnLocations.lsia.model,
          skipFade: false
        });
        isDead = false;
      }, 5000);
    } else if (!dead && isDead) {
      // Player respawned
      isDead = false;
      if (respawnTimer) {
        clearTimeout(respawnTimer);
        respawnTimer = null;
      }
    }
  }, 100);
}

/**
 * Helper delay function
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

console.log('[Freemode] Client script loaded');
