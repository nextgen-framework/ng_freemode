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
