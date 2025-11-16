/**
 * NextGen Freemode - Server Side
 * GTA Online style freemode gamemode
 */

class FreemodeGamemode {
  constructor(framework) {
    this.framework = framework;
    this.metadata = {
      name: 'NextGen Freemode',
      version: '1.0.0',
      author: 'NextGen Team',
      description: 'GTA Online style freemode gamemode'
    };

    // Player data storage
    this.players = new Map();
  }

  /**
   * Initialize the gamemode
   */
  async init() {
    console.log('');
    console.log('╔════════════════════════════════════════╗');
    console.log('║   NextGen Freemode - GTA Online Style  ║');
    console.log('║              Version 1.0.0             ║');
    console.log('╚════════════════════════════════════════╝');
    console.log('');

    // Setup player events
    this.setupPlayerEvents();

    // Setup commands
    this.setupCommands();

    // Setup spawn locations
    this.setupSpawnLocations();

    console.log('[Freemode] ✅ Gamemode initialized');
  }

  /**
   * Setup player connection/disconnection events
   */
  setupPlayerEvents() {
    // Player connecting
    on('playerConnecting', (name, setKickReason, deferrals) => {
      const source = global.source;
      console.log(`[Freemode] Player connecting: ${name} (${source})`);
    });

    // Player joined
    on('playerJoining', () => {
      const source = global.source;
      const name = GetPlayerName(source);

      // Initialize player data
      this.players.set(source, {
        name: name,
        money: 5000,
        bank: 10000,
        level: 1,
        spawn: 'lsia', // Default spawn
        character: null,
        joinTime: Date.now()
      });

      console.log(`[Freemode] Player joined: ${name} (${source})`);
    });

    // Player dropped
    on('playerDropped', (reason) => {
      const source = global.source;
      const playerData = this.players.get(source);

      if (playerData) {
        console.log(`[Freemode] Player left: ${playerData.name} (${reason})`);
        this.players.delete(source);
      }
    });

    console.log('[Freemode] ✅ Player events registered');
  }

  /**
   * Setup spawn locations
   */
  setupSpawnLocations() {
    this.spawnLocations = {
      lsia: {
        name: 'Los Santos International Airport',
        coords: { x: -1037.0, y: -2737.0, z: 20.0, heading: 240.0 }
      },
      legion: {
        name: 'Legion Square',
        coords: { x: 215.0, y: -810.0, z: 30.0, heading: 340.0 }
      },
      vinewood: {
        name: 'Vinewood Hills',
        coords: { x: 752.0, y: 1275.0, z: 360.0, heading: 0.0 }
      },
      pier: {
        name: 'Del Perro Pier',
        coords: { x: -1686.0, y: -1072.0, z: 13.0, heading: 50.0 }
      },
      paleto: {
        name: 'Paleto Bay',
        coords: { x: -104.0, y: 6467.0, z: 31.0, heading: 45.0 }
      },
      sandy: {
        name: 'Sandy Shores',
        coords: { x: 1961.0, y: 3741.0, z: 32.0, heading: 300.0 }
      }
    };

    console.log('[Freemode] ✅ Spawn locations loaded');
  }

  /**
   * Setup freemode commands
   */
  setupCommands() {
    const chatCommands = this.framework.getModule('chat-commands');
    if (!chatCommands) {
      console.log('[Freemode] ⚠️ Chat commands module not loaded');
      return;
    }

    // Command: Show player stats
    chatCommands.register('stats', (source) => {
      const playerData = this.players.get(source);
      if (!playerData) return;

      chatCommands.sendMessage(source, '^3=== Player Stats ===');
      chatCommands.sendMessage(source, `^5Name: ^7${playerData.name}`);
      chatCommands.sendMessage(source, `^5Level: ^7${playerData.level}`);
      chatCommands.sendMessage(source, `^5Cash: ^2$${playerData.money}`);
      chatCommands.sendMessage(source, `^5Bank: ^2$${playerData.bank}`);
    }, {
      plugin: 'ng_freemode',
      description: 'Show your player statistics'
    });

    // Command: Give money (admin)
    chatCommands.register('givemoney', (source, args) => {
      if (args.length < 2) {
        chatCommands.sendMessage(source, '^1Usage: ^7/givemoney <player_id> <amount>');
        return;
      }

      const targetId = parseInt(args[0]);
      const amount = parseInt(args[1]);

      if (isNaN(targetId) || isNaN(amount) || amount <= 0) {
        chatCommands.sendMessage(source, '^1Error: ^7Invalid player ID or amount');
        return;
      }

      const targetData = this.players.get(targetId);
      if (!targetData) {
        chatCommands.sendMessage(source, '^1Error: ^7Player not found');
        return;
      }

      targetData.money += amount;
      chatCommands.sendMessage(source, `^2✓ Gave $${amount} to ${targetData.name}`);
      chatCommands.sendMessage(targetId, `^2+$${amount} from admin`);
    }, {
      plugin: 'ng_freemode',
      description: 'Give money to a player',
      permission: 'command.givemoney'
    });

    // Command: Set spawn location
    chatCommands.register('setspawn', (source, args) => {
      if (args.length === 0) {
        chatCommands.sendMessage(source, '^3Available spawn locations:');
        Object.entries(this.spawnLocations).forEach(([key, loc]) => {
          chatCommands.sendMessage(source, `  ^5${key} ^7- ${loc.name}`);
        });
        return;
      }

      const spawnKey = args[0].toLowerCase();
      if (!this.spawnLocations[spawnKey]) {
        chatCommands.sendMessage(source, '^1Error: ^7Invalid spawn location');
        return;
      }

      const playerData = this.players.get(source);
      if (playerData) {
        playerData.spawn = spawnKey;
        chatCommands.sendMessage(source, `^2✓ Spawn location set to: ^7${this.spawnLocations[spawnKey].name}`);
      }
    }, {
      plugin: 'ng_freemode',
      description: 'Set your spawn location',
      usage: '/setspawn [location]'
    });

    // Command: Spawn vehicle
    chatCommands.register('car', (source, args) => {
      if (args.length === 0) {
        chatCommands.sendMessage(source, '^1Usage: ^7/car <vehicle_model>');
        chatCommands.sendMessage(source, '^5Examples: ^7/car adder, /car zentorno');
        return;
      }

      const model = args[0];

      // Trigger client to spawn vehicle
      this.framework.rpc.callClient('freemode:spawnVehicle', source, model)
        .then((result) => {
          if (result.success) {
            chatCommands.sendMessage(source, `^2✓ Spawned vehicle: ^7${model}`);
          } else {
            chatCommands.sendMessage(source, `^1Error: ^7${result.error || 'Failed to spawn vehicle'}`);
          }
        })
        .catch(() => {
          chatCommands.sendMessage(source, '^1Error: ^7Failed to spawn vehicle');
        });
    }, {
      plugin: 'ng_freemode',
      description: 'Spawn a vehicle',
      aliases: ['vehicle', 'v']
    });

    // Command: Suicide/Respawn
    chatCommands.register('suicide', (source) => {
      this.framework.rpc.callClient('freemode:suicide', source)
        .catch(() => {});
      chatCommands.sendMessage(source, '^1You committed suicide');
    }, {
      plugin: 'ng_freemode',
      description: 'Respawn your character',
      aliases: ['kill', 'respawn']
    });

    // Command: List online players
    chatCommands.register('players', (source) => {
      const players = [];
      for (let i = 0; i < GetNumPlayerIndices(); i++) {
        const playerId = GetPlayerFromIndex(i);
        const name = GetPlayerName(playerId);
        players.push(`^5[${playerId}]^7 ${name}`);
      }

      chatCommands.sendMessage(source, `^3=== Online Players (${players.length}) ===`);
      players.forEach(player => chatCommands.sendMessage(source, player));
    }, {
      plugin: 'ng_freemode',
      description: 'List online players',
      aliases: ['online', 'list']
    });

    // Command: Announce (admin)
    chatCommands.register('announce', (source, args) => {
      if (args.length === 0) {
        chatCommands.sendMessage(source, '^1Usage: ^7/announce <message>');
        return;
      }

      const message = args.join(' ');
      chatCommands.broadcast(`^3[ANNOUNCEMENT] ^7${message}`);
      console.log(`[Freemode] Player ${source} announced: ${message}`);
    }, {
      plugin: 'ng_freemode',
      description: 'Broadcast message to all players',
      permission: 'command.announce',
      aliases: ['broadcast', 'ann'],
      params: [
        { name: 'message', help: 'Message to broadcast' }
      ]
    });

    // Command: Goto player (admin)
    chatCommands.register('goto', (source, args) => {
      if (args.length === 0) {
        chatCommands.sendMessage(source, '^1Usage: ^7/goto <player_id>');
        return;
      }

      const targetId = parseInt(args[0]);
      if (isNaN(targetId) || !GetPlayerPed(targetId)) {
        chatCommands.sendMessage(source, '^1Error: ^7Invalid player ID');
        return;
      }

      const targetPed = GetPlayerPed(targetId);
      const [x, y, z] = GetEntityCoords(targetPed);

      const ped = GetPlayerPed(source);
      SetEntityCoords(ped, x, y, z, false, false, false, false);

      chatCommands.sendMessage(source, `^2Teleported to ^7${GetPlayerName(targetId)}`);
    }, {
      plugin: 'ng_freemode',
      description: 'Teleport to a player',
      permission: 'command.goto',
      aliases: ['tp'],
      params: [
        { name: 'player_id', help: 'Target player ID' }
      ]
    });

    // Command: Bring player (admin)
    chatCommands.register('bring', (source, args) => {
      if (args.length === 0) {
        chatCommands.sendMessage(source, '^1Usage: ^7/bring <player_id>');
        return;
      }

      const targetId = parseInt(args[0]);
      if (isNaN(targetId) || !GetPlayerPed(targetId)) {
        chatCommands.sendMessage(source, '^1Error: ^7Invalid player ID');
        return;
      }

      const ped = GetPlayerPed(source);
      const [x, y, z] = GetEntityCoords(ped);

      const targetPed = GetPlayerPed(targetId);
      SetEntityCoords(targetPed, x, y, z, false, false, false, false);

      chatCommands.sendMessage(source, `^2Brought ^7${GetPlayerName(targetId)}^2 to you`);
      chatCommands.sendMessage(targetId, `^2You were brought to ^7${GetPlayerName(source)}`);
    }, {
      plugin: 'ng_freemode',
      description: 'Bring a player to you',
      permission: 'command.bring',
      params: [
        { name: 'player_id', help: 'Target player ID' }
      ]
    });

    // Command: Heal player
    chatCommands.register('heal', (source, args) => {
      let targetId = source;

      if (args.length > 0) {
        targetId = parseInt(args[0]);
        if (isNaN(targetId) || !GetPlayerPed(targetId)) {
          chatCommands.sendMessage(source, '^1Error: ^7Invalid player ID');
          return;
        }
      }

      const targetPed = GetPlayerPed(targetId);
      SetEntityHealth(targetPed, 200);

      if (targetId === source) {
        chatCommands.sendMessage(source, '^2You healed yourself');
      } else {
        chatCommands.sendMessage(source, `^2Healed ^7${GetPlayerName(targetId)}`);
        chatCommands.sendMessage(targetId, `^2You were healed by ^7${GetPlayerName(source)}`);
      }
    }, {
      plugin: 'ng_freemode',
      description: 'Heal yourself or a player',
      params: [
        { name: 'player_id', help: 'Target player ID (optional)' }
      ]
    });

    // Command: Give weapon (admin)
    chatCommands.register('weapon', (source, args) => {
      if (args.length === 0) {
        chatCommands.sendMessage(source, '^1Usage: ^7/weapon <weapon_name>');
        chatCommands.sendMessage(source, '^5Examples: ^7pistol, smg, rifle, shotgun');
        return;
      }

      const weaponName = args[0].toLowerCase();
      const weapons = {
        'pistol': 'WEAPON_PISTOL',
        'smg': 'WEAPON_SMG',
        'rifle': 'WEAPON_ASSAULTRIFLE',
        'shotgun': 'WEAPON_PUMPSHOTGUN',
        'sniper': 'WEAPON_SNIPERRIFLE',
        'rpg': 'WEAPON_RPG'
      };

      const weaponHash = weapons[weaponName] || weaponName.toUpperCase();
      const ped = GetPlayerPed(source);

      GiveWeaponToPed(ped, GetHashKey(weaponHash), 250, false, true);
      chatCommands.sendMessage(source, `^2Weapon given: ^7${weaponName}`);
    }, {
      plugin: 'ng_freemode',
      description: 'Give yourself a weapon',
      permission: 'command.weapon',
      aliases: ['gun'],
      params: [
        { name: 'weapon_name', help: 'Weapon name' }
      ]
    });

    // ===== Whitelist Commands =====

    // Command: Whitelist add (admin)
    chatCommands.register('wladd', (source, args) => {
      if (args.length === 0) {
        chatCommands.sendMessage(source, '^1Usage: ^7/wladd <identifier>');
        chatCommands.sendMessage(source, '^5Example: ^7/wladd license:716a655091a9c8579d4709deb5cfec4da3902774');
        return;
      }

      const identifier = args[0];
      const whitelist = this.framework.getModule('whitelist');

      if (!whitelist) {
        chatCommands.sendMessage(source, '^1Error: ^7Whitelist module not loaded');
        return;
      }

      const adminName = GetPlayerName(source);
      whitelist.add(identifier, adminName, 'Added via command')
        .then(result => {
          if (result.success) {
            chatCommands.sendMessage(source, `^2✓ Added to whitelist: ^7${identifier}`);
            console.log(`[Freemode] ${adminName} added ${identifier} to whitelist`);
          } else if (result.reason === 'already_whitelisted') {
            chatCommands.sendMessage(source, `^3⚠ Already whitelisted: ^7${identifier}`);
          } else {
            chatCommands.sendMessage(source, `^1Error: ^7${result.reason}`);
          }
        })
        .catch(error => {
          chatCommands.sendMessage(source, `^1Error: ^7${error.message}`);
        });
    }, {
      plugin: 'ng_freemode',
      description: 'Add player to whitelist',
      permission: 'command.whitelist',
      params: [
        { name: 'identifier', help: 'Player identifier (e.g., license:xxx)' }
      ]
    });

    // Command: Whitelist remove (admin)
    chatCommands.register('wlremove', (source, args) => {
      if (args.length === 0) {
        chatCommands.sendMessage(source, '^1Usage: ^7/wlremove <identifier>');
        return;
      }

      const identifier = args[0];
      const whitelist = this.framework.getModule('whitelist');

      if (!whitelist) {
        chatCommands.sendMessage(source, '^1Error: ^7Whitelist module not loaded');
        return;
      }

      const adminName = GetPlayerName(source);
      whitelist.remove(identifier, adminName, 'Removed via command')
        .then(result => {
          if (result.success) {
            chatCommands.sendMessage(source, `^2✓ Removed from whitelist: ^7${identifier}`);
            console.log(`[Freemode] ${adminName} removed ${identifier} from whitelist`);
          } else if (result.reason === 'not_found') {
            chatCommands.sendMessage(source, `^3⚠ Not found in whitelist: ^7${identifier}`);
          } else {
            chatCommands.sendMessage(source, `^1Error: ^7${result.reason}`);
          }
        })
        .catch(error => {
          chatCommands.sendMessage(source, `^1Error: ^7${error.message}`);
        });
    }, {
      plugin: 'ng_freemode',
      description: 'Remove player from whitelist',
      permission: 'command.whitelist',
      aliases: ['wldel'],
      params: [
        { name: 'identifier', help: 'Player identifier' }
      ]
    });

    // Command: Whitelist list (admin)
    chatCommands.register('wllist', (source) => {
      const whitelist = this.framework.getModule('whitelist');

      if (!whitelist) {
        chatCommands.sendMessage(source, '^1Error: ^7Whitelist module not loaded');
        return;
      }

      whitelist.getAll()
        .then(list => {
          chatCommands.sendMessage(source, `^3=== Whitelist (${list.length} entries) ===`);
          if (list.length === 0) {
            chatCommands.sendMessage(source, '^7No whitelisted players');
          } else {
            list.slice(0, 20).forEach((entry, i) => {
              const date = new Date(entry.added_at).toLocaleDateString();
              chatCommands.sendMessage(source, `^5${i + 1}. ^7${entry.identifier} ^5(by ${entry.added_by}, ${date})`);
            });
            if (list.length > 20) {
              chatCommands.sendMessage(source, `^7... and ${list.length - 20} more`);
            }
          }
        })
        .catch(error => {
          chatCommands.sendMessage(source, `^1Error: ^7${error.message}`);
        });
    }, {
      plugin: 'ng_freemode',
      description: 'List whitelisted players',
      permission: 'command.whitelist'
    });

    // Command: Whitelist toggle (admin)
    chatCommands.register('wltoggle', (source) => {
      const whitelist = this.framework.getModule('whitelist');

      if (!whitelist) {
        chatCommands.sendMessage(source, '^1Error: ^7Whitelist module not loaded');
        return;
      }

      if (whitelist.isEnabled()) {
        whitelist.disable();
        chatCommands.sendMessage(source, '^3⚠ Whitelist disabled');
        chatCommands.broadcast('^3Server whitelist has been disabled');
      } else {
        whitelist.enable();
        chatCommands.sendMessage(source, '^2✓ Whitelist enabled');
        chatCommands.broadcast('^2Server whitelist has been enabled');
      }
    }, {
      plugin: 'ng_freemode',
      description: 'Toggle whitelist on/off',
      permission: 'command.whitelist'
    });

    // Command: Whitelist myself
    chatCommands.register('wlme', (source) => {
      const whitelist = this.framework.getModule('whitelist');

      if (!whitelist) {
        chatCommands.sendMessage(source, '^1Error: ^7Whitelist module not loaded');
        return;
      }

      // Get player's license identifier
      const identifiers = whitelist.getPlayerIdentifiers(source);
      const license = identifiers.license;

      if (!license) {
        chatCommands.sendMessage(source, '^1Error: ^7Could not find your license identifier');
        return;
      }

      const identifier = `license:${license}`;
      const playerName = GetPlayerName(source);

      whitelist.add(identifier, playerName, 'Self-added via /wlme')
        .then(result => {
          if (result.success) {
            chatCommands.sendMessage(source, `^2✓ You have been added to whitelist`);
            chatCommands.sendMessage(source, `^5Your license: ^7${license}`);
            console.log(`[Freemode] ${playerName} self-added to whitelist: ${identifier}`);
          } else if (result.reason === 'already_whitelisted') {
            chatCommands.sendMessage(source, `^3⚠ You are already whitelisted`);
          } else {
            chatCommands.sendMessage(source, `^1Error: ^7${result.reason}`);
          }
        })
        .catch(error => {
          chatCommands.sendMessage(source, `^1Error: ^7${error.message}`);
        });
    }, {
      plugin: 'ng_freemode',
      description: 'Add yourself to the whitelist',
      permission: 'command.whitelist'
    });

    console.log('[Freemode] ✅ Commands registered');
  }

  /**
   * Cleanup on resource stop
   */
  async destroy() {
    console.log('[Freemode] Shutting down...');
    this.players.clear();
  }
}

module.exports = FreemodeGamemode;
