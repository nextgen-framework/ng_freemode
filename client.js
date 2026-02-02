/**
 * NextGen Freemode - Client Side
 * GTA Online style freemode gamemode
 * Uses ng_core bridge + spawn-manager module
 */

let hasSpawned = false;
let spawnLocations = {};

// Wait for framework via bridge (replaces manual polling)
setImmediate(async () => {
  try {
    await Bridge.ready();
  } catch (e) {
    console.error('[Freemode] Framework not ready!');
    return;
  }

  console.log('[Freemode] Client initialized');
  initializeFreemode();
});

/**
 * Initialize freemode client
 */
function initializeFreemode() {
  setupSpawnPoints();
  setupSpawn();
  setupRPC();
  setupDeathHandling();
  console.log('[Freemode] Client ready');
}

/**
 * Setup spawn points
 */
function setupSpawnPoints() {
  spawnLocations = {
    lsia: { x: -1037.0, y: -2737.0, z: 20.0, heading: 240.0, model: 'mp_m_freemode_01' },
    legion: { x: 215.0, y: -810.0, z: 30.0, heading: 340.0, model: 'mp_m_freemode_01' },
    vinewood: { x: 752.0, y: 1275.0, z: 360.0, heading: 0.0, model: 'mp_m_freemode_01' },
    pier: { x: -1686.0, y: -1072.0, z: 13.0, heading: 50.0, model: 'mp_m_freemode_01' },
    paleto: { x: -104.0, y: 6467.0, z: 31.0, heading: 45.0, model: 'mp_m_freemode_01' },
    sandy: { x: 1961.0, y: 3741.0, z: 32.0, heading: 300.0, model: 'mp_m_freemode_01' }
  };

  console.log('[Freemode] Spawn points registered');
}

/**
 * Setup spawn system using ng_core spawn-manager
 */
function setupSpawn() {
  on('ng_core:player-spawned', () => {
    console.log('[Freemode] Received ng_core:player-spawned event');
    hasSpawned = true;
    onPlayerSpawned();
  });

  on('onClientGameTypeStart', () => {
    Framework.fivem.emitNet('freemode:requestSpawn');
  });

  setTimeout(() => {
    if (!hasSpawned) {
      Framework.fivem.emitNet('freemode:requestSpawn');
    }
  }, 2000);
}

/**
 * Called when player spawns
 */
let welcomeShown = false;
async function onPlayerSpawned() {
  await delay(1000);

  if (!welcomeShown) {
    welcomeShown = true;
    const notif = Framework.getModule('notifications');
    if (notif) {
      notif.success('Welcome to NextGen Freemode');
      await delay(2000);
      notif.info('Use /help to see available commands');
    }
  }

  console.log('[Freemode] Player spawned');
}

/**
 * Setup RPC handlers
 */
function setupRPC() {
  const rpc = Framework.getModule('rpc');
  if (!rpc) {
    console.log('[Freemode] RPC module not available');
    return;
  }

  // Spawn vehicle
  rpc.register('freemode:spawnVehicle', async (modelName) => {
    try {
      const playerPed = PlayerPedId();
      const coords = GetEntityCoords(playerPed, false);
      const heading = GetEntityHeading(playerPed);

      const modelHash = GetHashKey(modelName);

      if (!IsModelInCdimage(modelHash) || !IsModelAVehicle(modelHash)) {
        return { success: false, error: 'Invalid vehicle model' };
      }

      RequestModel(modelHash);
      let attempts = 0;
      while (!HasModelLoaded(modelHash) && attempts < 100) {
        await delay(10);
        attempts++;
      }

      if (!HasModelLoaded(modelHash)) {
        return { success: false, error: 'Failed to load vehicle model' };
      }

      const forwardVector = GetEntityForwardVector(playerPed);
      const spawnX = coords[0] + forwardVector[0] * 5.0;
      const spawnY = coords[1] + forwardVector[1] * 5.0;
      const spawnZ = coords[2];

      const vehicle = CreateVehicle(modelHash, spawnX, spawnY, spawnZ, heading, true, false);

      if (!vehicle || vehicle === 0) {
        SetModelAsNoLongerNeeded(modelHash);
        return { success: false, error: 'Failed to create vehicle' };
      }

      SetVehicleOnGroundProperly(vehicle);
      SetEntityAsMissionEntity(vehicle, true, true);
      SetVehRadioStation(vehicle, 'OFF');
      TaskWarpPedIntoVehicle(playerPed, vehicle, -1);
      SetModelAsNoLongerNeeded(modelHash);

      return { success: true };
    } catch (error) {
      console.error('[Freemode] Error spawning vehicle:', error);
      return { success: false, error: error.message };
    }
  });

  // Suicide/Respawn
  rpc.register('freemode:suicide', () => {
    const playerPed = PlayerPedId();
    SetEntityHealth(playerPed, 0);
  });

  // Change spawn location
  rpc.register('freemode:setSpawn', (spawnKey) => {
    const spawn = spawnLocations[spawnKey];
    if (!spawn) {
      return { success: false, error: 'Invalid spawn location' };
    }

    Framework.fivem.emitNet('freemode:teleportToSpawn', spawnKey);
    return { success: true };
  });

  console.log('[Freemode] RPC handlers registered');
}

/**
 * Setup death handling using ng_core spawn-manager
 */
function setupDeathHandling() {
  let isDead = false;
  let respawnTimer = null;

  setInterval(() => {
    const playerPed = PlayerPedId();
    const dead = IsEntityDead(playerPed);

    if (dead && !isDead) {
      isDead = true;
      console.log('[Freemode] Player died, respawning in 5 seconds...');

      respawnTimer = setTimeout(() => {
        Framework.fivem.emitNet('freemode:requestRespawn');
        isDead = false;
      }, 5000);
    } else if (!dead && isDead) {
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
