/**
 * NextGen Freemode - Client Side
 * GTA Online style freemode gamemode
 */

/**
 * Cross-resource export proxy
 * @param {string} resource - Resource name to proxy
 * @returns {Proxy}
 */
function Use(resource) {
    return new Proxy({}, {
        get(_, prop) {
            return (...args) => exports[resource][prop](...args);
        }
    });
}

const ng_core = Use('ng_core');

let hasSpawned = false;
let spawnLocations = {};
let pendingCharacter = null;

// Wait for kernel ready
setImmediate(async () => {
  try {
    let attempts = 0;
    while (attempts++ < 100) {
      try { if (ng_core.IsReady()) break; } catch (e) {}
      await new Promise(r => setTimeout(r, 100));
    }
    if (attempts > 100) throw new Error('Kernel not ready after 10s');
  } catch (e) {
    console.error('[Freemode] Framework not ready!', e.message || e);
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
  setupCharacterFlow();
  setupSpawnEvents();
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

// ============================================================
// Character Flow - gates spawn behind character selection
// ============================================================

/**
 * Setup character selection flow
 */
function setupCharacterFlow() {
  // Receive character list from server
  onNet('freemode:characterList', (characters) => {
    console.log(`[Freemode] Received ${characters.length} character(s)`);

    if (characters.length === 0) {
      // Spawn player at default location first, then prompt to create
      emitNet('freemode:requestSpawn');
      ng_core.NotifyWarning('No character found');
      ng_core.NotifyInfo('Use /createchar <firstname> <lastname> [m/f]');
    } else if (characters.length === 1) {
      // Auto-select single character
      emitNet('freemode:selectCharacter', characters[0].id);
    } else {
      showCharacterMenu(characters);
    }
  });

  // Server confirms character ready → spawn at last position or request default
  onNet('freemode:characterReady', (character) => {
    console.log(`[Freemode] Character ready: ${character.fullname}`);
    pendingCharacter = character;
    if (character.lastPosition) {
      emitNet('freemode:requestSpawnAt', character.lastPosition);
    } else {
      emitNet('freemode:requestSpawn');
    }
  });

  // Request characters on connect
  on('onClientGameTypeStart', () => {
    emitNet('freemode:requestCharacters');
  });

  setTimeout(() => {
    if (!hasSpawned) {
      emitNet('freemode:requestCharacters');
    }
  }, 2000);
}

/**
 * Show native menu for character selection
 */
function showCharacterMenu(characters) {
  const items = characters.map(c => ({
    label: c.fullname,
    description: `ID: ${c.id} | ${c.data?.gender === 'f' ? 'Female' : 'Male'}`,
    onSelect: () => {
      emitNet('freemode:selectCharacter', c.id);
    }
  }));

  try {
    ng_core.OpenMenu({
      title: 'Select Character',
      items: items
    });
  } catch (e) {
    // Fallback: auto-select first
    console.log('[Freemode] Menu unavailable, auto-selecting first character');
    emitNet('freemode:selectCharacter', characters[0].id);
  }
}

// ============================================================
// Spawn Events
// ============================================================

/**
 * Setup spawn event handlers
 */
function setupSpawnEvents() {
  on('ng_core:player-spawned', () => {
    console.log('[Freemode] Received ng_core:player-spawned event');
    hasSpawned = true;
    onPlayerSpawned();
  });
}

/**
 * Called when player spawns
 */
let welcomeShown = false;
async function onPlayerSpawned() {
  await delay(1000);

  // Restore health and armor from saved state
  if (pendingCharacter) {
    const playerPed = PlayerPedId();
    if (pendingCharacter.lastHealth !== undefined) {
      SetEntityHealth(playerPed, pendingCharacter.lastHealth);
    }
    if (pendingCharacter.lastArmor !== undefined && pendingCharacter.lastArmor > 0) {
      SetPedArmour(playerPed, pendingCharacter.lastArmor);
    }
    pendingCharacter = null;
  }

  if (!welcomeShown) {
    welcomeShown = true;
    ng_core.NotifySuccess('Welcome to NextGen Freemode');
    await delay(2000);
    ng_core.NotifyInfo('Use /help to see available commands');
  }

  console.log('[Freemode] Player spawned');
}

/**
 * Setup RPC handlers (via ng_core exports - cross-resource)
 */
function setupRPC() {
  // Spawn vehicle
  ng_core.RegisterRPC('freemode:spawnVehicle', async (modelName) => {
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
  ng_core.RegisterRPC('freemode:suicide', () => {
    const playerPed = PlayerPedId();
    SetEntityHealth(playerPed, 0);
  });

  // Change spawn location
  ng_core.RegisterRPC('freemode:setSpawn', (spawnKey) => {
    const spawn = spawnLocations[spawnKey];
    if (!spawn) {
      return { success: false, error: 'Invalid spawn location' };
    }

    emitNet('freemode:teleportToSpawn', spawnKey);
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
        emitNet('freemode:requestRespawn');
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
