/**
 * NextGen Freemode - Server Module
 * GTA Online style freemode gamemode
 *
 * Uses local kernel for FiveM events.
 * Uses Use('ng_core') for cross-resource module access.
 */

const ng_core = Use('ng_core');

/**
 * Proxy to ng_core module methods via CallModule
 * @param {string} name - Module name in ng_core
 * @returns {Proxy}
 */
function NgModule(name) {
    return new Proxy({}, {
        get(_, method) {
            return (...args) => ng_core.CallModule(name, method, ...args);
        }
    });
}

class FreemodeGamemode {
    constructor(framework) {
        this.framework = framework;

        // Player data storage
        this.players = new Map();
    }

    /**
     * Initialize the gamemode
     */
    async init() {
        console.log('');
        console.log('\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557');
        console.log('\u2551   NextGen Freemode - GTA Online Style  \u2551');
        console.log('\u2551              Version 1.0.0             \u2551');
        console.log('\u255a\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255d');
        console.log('');

        // Setup player events
        this.setupPlayerEvents();

        // Setup spawn handlers
        this.setupSpawnHandlers();

        // Setup commands
        this.setupCommands();

        // Setup spawn locations
        this.setupSpawnLocations();

        console.log('[Freemode] Gamemode initialized');
    }

    /**
     * Get player data by source
     * @param {number} source - Player source
     * @returns {Object|null}
     */
    getPlayerData(source) {
        return this.players.get(source) || null;
    }

    /**
     * Get available spawn locations
     * @returns {Object}
     */
    getSpawnLocations() {
        return this.spawnLocations;
    }

    /**
     * Setup player connection/disconnection events
     */
    setupPlayerEvents() {
        // Player connecting
        on('playerConnecting', (name, setKickReason, deferrals) => {
            console.log(`[Freemode] Player connecting: ${name} (${source})`);
        });

        // Player joined
        on('playerJoining', () => {
            const name = GetPlayerName(source);

            // Initialize player data
            this.players.set(source, {
                name: name,
                money: 5000,
                bank: 10000,
                level: 1,
                spawn: 'lsia',
                character: null,
                joinTime: Date.now()
            });

            console.log(`[Freemode] Player joined: ${name} (${source})`);
        });

        // Player dropped
        on('playerDropped', (reason) => {
            const src = global.source;
            const playerData = this.players.get(src);

            if (playerData) {
                console.log(`[Freemode] Player left: ${playerData.name} (${reason})`);
                this.players.delete(src);
            }
        });

        console.log('[Freemode] Player events registered');
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

        console.log('[Freemode] Spawn locations loaded');
    }

    /**
     * Setup spawn handlers using local kernel FiveM wrappers
     */
    setupSpawnHandlers() {
        // Handle spawn request from client
        this.framework.fivem.onNet('freemode:requestSpawn', () => {
            const src = global.source;
            this.spawnPlayer(src);
        });

        // Handle respawn request after death
        this.framework.fivem.onNet('freemode:requestRespawn', () => {
            const src = global.source;
            this.spawnPlayer(src);
        });

        // Handle teleport to spawn location
        this.framework.fivem.onNet('freemode:teleportToSpawn', (spawnKey) => {
            const src = global.source;
            const spawn = this.spawnLocations[spawnKey];
            if (spawn) {
                this.spawnPlayerAt(src, spawn.coords);
            }
        });

        console.log('[Freemode] Spawn handlers registered');
    }

    /**
     * Spawn player at their preferred location
     */
    spawnPlayer(source) {
        const playerData = this.players.get(source);
        const spawnKey = playerData?.spawn || 'lsia';
        const spawn = this.spawnLocations[spawnKey] || this.spawnLocations.lsia;

        this.spawnPlayerAt(source, spawn.coords);
        console.log(`[Freemode] Spawning player ${source} at ${spawnKey}`);
    }

    /**
     * Spawn player at specific coordinates
     */
    spawnPlayerAt(source, coords) {
        try {
            ng_core.CallModule('spawn-manager', 'spawnPlayerAt', source, coords);
        } catch (e) {
            // Fallback: emit directly to client
            this.framework.fivem.emitNet('ng_core:spawn-at', source, coords, {
                fadeIn: true,
                fadeDuration: 1500
            });
        }
    }

    /**
     * Setup freemode commands via ng_core exports
     */
    setupCommands() {
        const rpc = NgModule('rpc');
        const whitelist = NgModule('whitelist');

        // Command: Show player stats
        ng_core.RegisterCommand('stats', (source) => {
            const playerData = this.players.get(source);
            if (!playerData) return;

            ng_core.SendMessage(source, '^3=== Player Stats ===');
            ng_core.SendMessage(source, `^5Name: ^7${playerData.name}`);
            ng_core.SendMessage(source, `^5Level: ^7${playerData.level}`);
            ng_core.SendMessage(source, `^5Cash: ^2$${playerData.money}`);
            ng_core.SendMessage(source, `^5Bank: ^2$${playerData.bank}`);
        }, {
            plugin: 'ng_freemode',
            description: 'Show your player statistics'
        });

        // Command: Give money (admin)
        ng_core.RegisterCommand('givemoney', (source, args) => {
            if (args.length < 2) {
                ng_core.SendMessage(source, '^1Usage: ^7/givemoney <player_id> <amount>');
                return;
            }

            const targetId = parseInt(args[0]);
            const amount = parseInt(args[1]);

            if (isNaN(targetId) || isNaN(amount) || amount <= 0) {
                ng_core.SendMessage(source, '^1Error: ^7Invalid player ID or amount');
                return;
            }

            const targetData = this.players.get(targetId);
            if (!targetData) {
                ng_core.SendMessage(source, '^1Error: ^7Player not found');
                return;
            }

            targetData.money += amount;
            ng_core.SendMessage(source, `^2+ Gave $${amount} to ${targetData.name}`);
            ng_core.SendMessage(targetId, `^2+$${amount} from admin`);
        }, {
            plugin: 'ng_freemode',
            description: 'Give money to a player',
            permission: 'command.givemoney'
        });

        // Command: Set spawn location
        ng_core.RegisterCommand('setspawn', (source, args) => {
            if (args.length === 0) {
                ng_core.SendMessage(source, '^3Available spawn locations:');
                Object.entries(this.spawnLocations).forEach(([key, loc]) => {
                    ng_core.SendMessage(source, `  ^5${key} ^7- ${loc.name}`);
                });
                return;
            }

            const spawnKey = args[0].toLowerCase();
            if (!this.spawnLocations[spawnKey]) {
                ng_core.SendMessage(source, '^1Error: ^7Invalid spawn location');
                return;
            }

            const playerData = this.players.get(source);
            if (playerData) {
                playerData.spawn = spawnKey;
                ng_core.SendMessage(source, `^2+ Spawn location set to: ^7${this.spawnLocations[spawnKey].name}`);
            }
        }, {
            plugin: 'ng_freemode',
            description: 'Set your spawn location',
            usage: '/setspawn [location]'
        });

        // Command: Spawn vehicle
        ng_core.RegisterCommand('car', (source, args) => {
            if (args.length === 0) {
                ng_core.SendMessage(source, '^1Usage: ^7/car <vehicle_model>');
                ng_core.SendMessage(source, '^5Examples: ^7/car adder, /car zentorno');
                return;
            }

            const model = args[0];
            rpc.callClient('freemode:spawnVehicle', source, model)
                .then((result) => {
                    if (result.success) {
                        ng_core.SendMessage(source, `^2+ Spawned vehicle: ^7${model}`);
                    } else {
                        ng_core.SendMessage(source, `^1Error: ^7${result.error || 'Failed to spawn vehicle'}`);
                    }
                })
                .catch(() => {
                    ng_core.SendMessage(source, '^1Error: ^7Failed to spawn vehicle');
                });
        }, {
            plugin: 'ng_freemode',
            description: 'Spawn a vehicle',
            aliases: ['vehicle', 'v']
        });

        // Command: Suicide/Respawn
        ng_core.RegisterCommand('suicide', (source) => {
            rpc.callClient('freemode:suicide', source).catch(() => {});
            ng_core.SendMessage(source, '^1You committed suicide');
        }, {
            plugin: 'ng_freemode',
            description: 'Respawn your character',
            aliases: ['kill', 'respawn']
        });

        // Command: List online players
        ng_core.RegisterCommand('players', (source) => {
            const players = [];
            for (let i = 0; i < GetNumPlayerIndices(); i++) {
                const playerId = GetPlayerFromIndex(i);
                const name = GetPlayerName(playerId);
                players.push(`^5[${playerId}]^7 ${name}`);
            }

            ng_core.SendMessage(source, `^3=== Online Players (${players.length}) ===`);
            players.forEach(player => ng_core.SendMessage(source, player));
        }, {
            plugin: 'ng_freemode',
            description: 'List online players',
            aliases: ['online', 'list']
        });

        // Command: Announce (admin)
        ng_core.RegisterCommand('announce', (source, args) => {
            if (args.length === 0) {
                ng_core.SendMessage(source, '^1Usage: ^7/announce <message>');
                return;
            }

            const message = args.join(' ');
            ng_core.BroadcastMessage(`^3[ANNOUNCEMENT] ^7${message}`);
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
        ng_core.RegisterCommand('goto', (source, args) => {
            if (args.length === 0) {
                ng_core.SendMessage(source, '^1Usage: ^7/goto <player_id>');
                return;
            }

            const targetId = parseInt(args[0]);
            if (isNaN(targetId) || !GetPlayerPed(targetId)) {
                ng_core.SendMessage(source, '^1Error: ^7Invalid player ID');
                return;
            }

            const targetPed = GetPlayerPed(targetId);
            const [x, y, z] = GetEntityCoords(targetPed);

            const ped = GetPlayerPed(source);
            SetEntityCoords(ped, x, y, z, false, false, false, false);

            ng_core.SendMessage(source, `^2Teleported to ^7${GetPlayerName(targetId)}`);
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
        ng_core.RegisterCommand('bring', (source, args) => {
            if (args.length === 0) {
                ng_core.SendMessage(source, '^1Usage: ^7/bring <player_id>');
                return;
            }

            const targetId = parseInt(args[0]);
            if (isNaN(targetId) || !GetPlayerPed(targetId)) {
                ng_core.SendMessage(source, '^1Error: ^7Invalid player ID');
                return;
            }

            const ped = GetPlayerPed(source);
            const [x, y, z] = GetEntityCoords(ped);

            const targetPed = GetPlayerPed(targetId);
            SetEntityCoords(targetPed, x, y, z, false, false, false, false);

            ng_core.SendMessage(source, `^2Brought ^7${GetPlayerName(targetId)}^2 to you`);
            ng_core.SendMessage(targetId, `^2You were brought to ^7${GetPlayerName(source)}`);
        }, {
            plugin: 'ng_freemode',
            description: 'Bring a player to you',
            permission: 'command.bring',
            params: [
                { name: 'player_id', help: 'Target player ID' }
            ]
        });

        // Command: Heal player
        ng_core.RegisterCommand('heal', (source, args) => {
            let targetId = source;

            if (args.length > 0) {
                targetId = parseInt(args[0]);
                if (isNaN(targetId) || !GetPlayerPed(targetId)) {
                    ng_core.SendMessage(source, '^1Error: ^7Invalid player ID');
                    return;
                }
            }

            const targetPed = GetPlayerPed(targetId);
            SetEntityHealth(targetPed, 200);

            if (targetId === source) {
                ng_core.SendMessage(source, '^2You healed yourself');
            } else {
                ng_core.SendMessage(source, `^2Healed ^7${GetPlayerName(targetId)}`);
                ng_core.SendMessage(targetId, `^2You were healed by ^7${GetPlayerName(source)}`);
            }
        }, {
            plugin: 'ng_freemode',
            description: 'Heal yourself or a player',
            params: [
                { name: 'player_id', help: 'Target player ID (optional)' }
            ]
        });

        // Command: Give weapon (admin)
        ng_core.RegisterCommand('weapon', (source, args) => {
            if (args.length === 0) {
                ng_core.SendMessage(source, '^1Usage: ^7/weapon <weapon_name>');
                ng_core.SendMessage(source, '^5Examples: ^7pistol, smg, rifle, shotgun');
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
            ng_core.SendMessage(source, `^2Weapon given: ^7${weaponName}`);
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
        ng_core.RegisterCommand('wladd', (source, args) => {
            if (args.length === 0) {
                ng_core.SendMessage(source, '^1Usage: ^7/wladd <identifier>');
                ng_core.SendMessage(source, '^5Example: ^7/wladd license:716a655091a9c8579d4709deb5cfec4da3902774');
                return;
            }

            const identifier = args[0];
            const adminName = GetPlayerName(source);
            whitelist.add(identifier, adminName, 'Added via command')
                .then(result => {
                    if (result.success) {
                        ng_core.SendMessage(source, `^2+ Added to whitelist: ^7${identifier}`);
                        console.log(`[Freemode] ${adminName} added ${identifier} to whitelist`);
                    } else if (result.reason === 'already_whitelisted') {
                        ng_core.SendMessage(source, `^3Already whitelisted: ^7${identifier}`);
                    } else {
                        ng_core.SendMessage(source, `^1Error: ^7${result.reason}`);
                    }
                })
                .catch(error => {
                    ng_core.SendMessage(source, `^1Error: ^7${error.message}`);
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
        ng_core.RegisterCommand('wlremove', (source, args) => {
            if (args.length === 0) {
                ng_core.SendMessage(source, '^1Usage: ^7/wlremove <identifier>');
                return;
            }

            const identifier = args[0];
            const adminName = GetPlayerName(source);
            whitelist.remove(identifier, adminName, 'Removed via command')
                .then(result => {
                    if (result.success) {
                        ng_core.SendMessage(source, `^2+ Removed from whitelist: ^7${identifier}`);
                        console.log(`[Freemode] ${adminName} removed ${identifier} from whitelist`);
                    } else if (result.reason === 'not_found') {
                        ng_core.SendMessage(source, `^3Not found in whitelist: ^7${identifier}`);
                    } else {
                        ng_core.SendMessage(source, `^1Error: ^7${result.reason}`);
                    }
                })
                .catch(error => {
                    ng_core.SendMessage(source, `^1Error: ^7${error.message}`);
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
        ng_core.RegisterCommand('wllist', (source) => {
            whitelist.getAll()
                .then(list => {
                    ng_core.SendMessage(source, `^3=== Whitelist (${list.length} entries) ===`);
                    if (list.length === 0) {
                        ng_core.SendMessage(source, '^7No whitelisted players');
                    } else {
                        list.slice(0, 20).forEach((entry, i) => {
                            const date = new Date(entry.added_at).toLocaleDateString();
                            ng_core.SendMessage(source, `^5${i + 1}. ^7${entry.identifier} ^5(by ${entry.added_by}, ${date})`);
                        });
                        if (list.length > 20) {
                            ng_core.SendMessage(source, `^7... and ${list.length - 20} more`);
                        }
                    }
                })
                .catch(error => {
                    ng_core.SendMessage(source, `^1Error: ^7${error.message}`);
                });
        }, {
            plugin: 'ng_freemode',
            description: 'List whitelisted players',
            permission: 'command.whitelist'
        });

        // Command: Whitelist toggle (admin)
        ng_core.RegisterCommand('wltoggle', (source) => {
            if (whitelist.isEnabled()) {
                whitelist.disable();
                ng_core.SendMessage(source, '^3Whitelist disabled');
                ng_core.BroadcastMessage('^3Server whitelist has been disabled');
            } else {
                whitelist.enable();
                ng_core.SendMessage(source, '^2+ Whitelist enabled');
                ng_core.BroadcastMessage('^2Server whitelist has been enabled');
            }
        }, {
            plugin: 'ng_freemode',
            description: 'Toggle whitelist on/off',
            permission: 'command.whitelist'
        });

        // Command: Whitelist myself
        ng_core.RegisterCommand('wlme', (source) => {
            const identifiers = whitelist.getPlayerIdentifiers(source);
            const license = identifiers.license;

            if (!license) {
                ng_core.SendMessage(source, '^1Error: ^7Could not find your license identifier');
                return;
            }

            const identifier = `license:${license}`;
            const playerName = GetPlayerName(source);

            whitelist.add(identifier, playerName, 'Self-added via /wlme')
                .then(result => {
                    if (result.success) {
                        ng_core.SendMessage(source, '^2+ You have been added to whitelist');
                        ng_core.SendMessage(source, `^5Your license: ^7${license}`);
                        console.log(`[Freemode] ${playerName} self-added to whitelist: ${identifier}`);
                    } else if (result.reason === 'already_whitelisted') {
                        ng_core.SendMessage(source, '^3You are already whitelisted');
                    } else {
                        ng_core.SendMessage(source, `^1Error: ^7${result.reason}`);
                    }
                })
                .catch(error => {
                    ng_core.SendMessage(source, `^1Error: ^7${error.message}`);
                });
        }, {
            plugin: 'ng_freemode',
            description: 'Add yourself to the whitelist',
            permission: 'command.whitelist'
        });

        console.log('[Freemode] Commands registered');
    }

    /**
     * Cleanup on resource stop
     */
    async destroy() {
        console.log('[Freemode] Shutting down...');
        this.players.clear();
    }
}

// Register in local kernel
Framework.register('freemode', new FreemodeGamemode(Framework), 10);
