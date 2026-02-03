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

        // Setup spawn locations (before handlers that depend on them)
        this.setupSpawnLocations();

        // Setup player events
        this.setupPlayerEvents();

        // Setup spawn handlers
        this.setupSpawnHandlers();

        // Setup commands
        this.setupCommands();

        this.framework.log.info('Gamemode initialized');
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
            this.framework.log.info(`Player connecting: ${name} (${source})`);
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

            this.framework.log.info(`Player joined: ${name} (${source})`);
        });

        // Player dropped
        on('playerDropped', (reason) => {
            const src = global.source;
            const playerData = this.players.get(src);

            if (playerData) {
                this.framework.log.info(`Player left: ${playerData.name} (${reason})`);
                this.players.delete(src);
            }
        });

        this.framework.log.debug('Player events registered');
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

        this.framework.log.debug('Spawn locations loaded');
    }

    /**
     * Setup spawn handlers using local kernel FiveM wrappers
     */
    setupSpawnHandlers() {
        // Handle spawn request from client (default location)
        this.framework.fivem.onNet('freemode:requestSpawn', () => {
            const src = global.source;
            this.spawnPlayer(src);
        });

        // Handle spawn at specific coords (last position)
        this.framework.fivem.onNet('freemode:requestSpawnAt', (coords) => {
            const src = global.source;
            if (coords && typeof coords.x === 'number') {
                this.spawnPlayerAt(src, coords);
            } else {
                this.spawnPlayer(src);
            }
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

        this.framework.log.debug('Spawn handlers registered');
    }

    /**
     * Spawn player at their preferred location
     */
    spawnPlayer(source) {
        const playerData = this.players.get(source);
        const spawnKey = playerData?.spawn || 'lsia';
        const spawn = this.spawnLocations[spawnKey] || this.spawnLocations.lsia;
        this.spawnPlayerAt(source, spawn.coords);
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
     * Send chat message to a player via ng_core
     * @param {number} source - Player source
     * @param {string} message - Message text
     */
    sendMessage(source, message) {
        try {
            ng_core.SendMessage(source, message);
        } catch (e) {
            // Fallback: direct TriggerClientEvent
            TriggerClientEvent('chat:addMessage', source, {
                color: [255, 255, 255],
                multiline: true,
                args: ['System', message]
            });
        }
    }

    /**
     * Broadcast chat message to all players via ng_core
     * @param {string} message - Message text
     */
    broadcastMessage(message) {
        try {
            ng_core.BroadcastMessage(message);
        } catch (e) {
            TriggerClientEvent('chat:addMessage', -1, {
                color: [255, 255, 255],
                multiline: true,
                args: ['System', message]
            });
        }
    }

    /**
     * Register a command using FiveM native (no cross-resource function passing)
     * @param {string} name - Command name
     * @param {Function} handler - Handler (source, args) => void
     * @param {Object} options - { description, permission, aliases, params }
     */
    _registerCommand(name, handler, options = {}) {
        const restricted = !!options.permission;

        RegisterCommand(name, (source, args, rawCommand) => {
            if (options.permission && !IsPlayerAceAllowed(source, options.permission)) {
                this.sendMessage(source, "^1Error: ^7You don't have permission to use this command");
                return;
            }
            try {
                handler(source, args, rawCommand);
            } catch (error) {
                this.sendMessage(source, `^1Error: ^7${error.message}`);
                this.framework.log.error(`Command error (/${name}): ${error.message}`);
            }
        }, restricted);

        // Register aliases
        if (options.aliases) {
            for (const alias of options.aliases) {
                RegisterCommand(alias, (source, args, rawCommand) => {
                    if (options.permission && !IsPlayerAceAllowed(source, options.permission)) {
                        this.sendMessage(source, "^1Error: ^7You don't have permission");
                        return;
                    }
                    try {
                        handler(source, args, rawCommand);
                    } catch (error) {
                        this.sendMessage(source, `^1Error: ^7${error.message}`);
                    }
                }, restricted);
            }
        }

        // Chat suggestions for auto-complete
        const params = (options.params || []).map(p => ({ name: p.name || '', help: p.help || '' }));
        if (options.description) {
            TriggerClientEvent('chat:addSuggestion', -1, `/${name}`, options.description, params);
            if (options.aliases) {
                for (const alias of options.aliases) {
                    TriggerClientEvent('chat:addSuggestion', -1, `/${alias}`, `${options.description} (alias)`, params);
                }
            }
        }
    }

    /**
     * Setup freemode commands using FiveM native RegisterCommand
     * Note: Cannot pass callbacks through FiveM exports (serialization limit),
     * so commands are registered locally with native RegisterCommand.
     */
    setupCommands() {
        const rpc = NgModule('rpc');
        const whitelist = NgModule('whitelist');

        // Command: Show player stats
        this._registerCommand('stats', (source) => {
            const playerData = this.players.get(source);
            if (!playerData) return;

            this.sendMessage(source, '^3=== Player Stats ===');
            this.sendMessage(source, `^5Name: ^7${playerData.name}`);
            this.sendMessage(source, `^5Level: ^7${playerData.level}`);
            this.sendMessage(source, `^5Cash: ^2$${playerData.money}`);
            this.sendMessage(source, `^5Bank: ^2$${playerData.bank}`);
        }, {
            description: 'Show your player statistics'
        });

        // Command: Give money (admin)
        this._registerCommand('givemoney', (source, args) => {
            if (args.length < 2) {
                this.sendMessage(source, '^1Usage: ^7/givemoney <player_id> <amount>');
                return;
            }

            const targetId = parseInt(args[0]);
            const amount = parseInt(args[1]);

            if (isNaN(targetId) || isNaN(amount) || amount <= 0) {
                this.sendMessage(source, '^1Error: ^7Invalid player ID or amount');
                return;
            }

            const targetData = this.players.get(targetId);
            if (!targetData) {
                this.sendMessage(source, '^1Error: ^7Player not found');
                return;
            }

            targetData.money += amount;
            this.sendMessage(source, `^2+ Gave $${amount} to ${targetData.name}`);
            this.sendMessage(targetId, `^2+$${amount} from admin`);
        }, {
            description: 'Give money to a player',
            permission: 'command.givemoney'
        });

        // Command: Set spawn location
        this._registerCommand('setspawn', (source, args) => {
            if (args.length === 0) {
                this.sendMessage(source, '^3Available spawn locations:');
                Object.entries(this.spawnLocations).forEach(([key, loc]) => {
                    this.sendMessage(source, `  ^5${key} ^7- ${loc.name}`);
                });
                return;
            }

            const spawnKey = args[0].toLowerCase();
            if (!this.spawnLocations[spawnKey]) {
                this.sendMessage(source, '^1Error: ^7Invalid spawn location');
                return;
            }

            const playerData = this.players.get(source);
            if (playerData) {
                playerData.spawn = spawnKey;
                this.sendMessage(source, `^2+ Spawn location set to: ^7${this.spawnLocations[spawnKey].name}`);
            }
        }, {
            description: 'Set your spawn location'
        });

        // Command: Spawn vehicle
        this._registerCommand('car', (source, args) => {
            if (args.length === 0) {
                this.sendMessage(source, '^1Usage: ^7/car <vehicle_model>');
                this.sendMessage(source, '^5Examples: ^7/car adder, /car zentorno');
                return;
            }

            const model = args[0];
            rpc.callClient('freemode:spawnVehicle', source, model)
                .then((result) => {
                    if (result.success) {
                        this.sendMessage(source, `^2+ Spawned vehicle: ^7${model}`);
                    } else {
                        this.sendMessage(source, `^1Error: ^7${result.error || 'Failed to spawn vehicle'}`);
                    }
                })
                .catch(() => {
                    this.sendMessage(source, '^1Error: ^7Failed to spawn vehicle');
                });
        }, {
            description: 'Spawn a vehicle',
            aliases: ['vehicle', 'v']
        });

        // Command: Suicide/Respawn
        this._registerCommand('suicide', (source) => {
            rpc.callClient('freemode:suicide', source).catch(() => {});
            this.sendMessage(source, '^1You committed suicide');
        }, {
            description: 'Respawn your character',
            aliases: ['kill', 'respawn']
        });

        // Command: List online players
        this._registerCommand('players', (source) => {
            const players = [];
            for (let i = 0; i < GetNumPlayerIndices(); i++) {
                const playerId = GetPlayerFromIndex(i);
                const name = GetPlayerName(playerId);
                players.push(`^5[${playerId}]^7 ${name}`);
            }

            this.sendMessage(source, `^3=== Online Players (${players.length}) ===`);
            players.forEach(player => this.sendMessage(source, player));
        }, {
            description: 'List online players',
            aliases: ['online', 'list']
        });

        // Command: Announce (admin)
        this._registerCommand('announce', (source, args) => {
            if (args.length === 0) {
                this.sendMessage(source, '^1Usage: ^7/announce <message>');
                return;
            }

            const message = args.join(' ');
            this.broadcastMessage(`^3[ANNOUNCEMENT] ^7${message}`);
            this.framework.log.info(`Player ${source} announced: ${message}`);
        }, {
            description: 'Broadcast message to all players',
            permission: 'command.announce',
            aliases: ['broadcast', 'ann'],
            params: [
                { name: 'message', help: 'Message to broadcast' }
            ]
        });

        // Command: Goto player (admin)
        this._registerCommand('goto', (source, args) => {
            if (args.length === 0) {
                this.sendMessage(source, '^1Usage: ^7/goto <player_id>');
                return;
            }

            const targetId = parseInt(args[0]);
            if (isNaN(targetId) || !GetPlayerPed(targetId)) {
                this.sendMessage(source, '^1Error: ^7Invalid player ID');
                return;
            }

            const targetPed = GetPlayerPed(targetId);
            const [x, y, z] = GetEntityCoords(targetPed);

            const ped = GetPlayerPed(source);
            SetEntityCoords(ped, x, y, z, false, false, false, false);

            this.sendMessage(source, `^2Teleported to ^7${GetPlayerName(targetId)}`);
        }, {
            description: 'Teleport to a player',
            permission: 'command.goto',
            aliases: ['tp'],
            params: [
                { name: 'player_id', help: 'Target player ID' }
            ]
        });

        // Command: Bring player (admin)
        this._registerCommand('bring', (source, args) => {
            if (args.length === 0) {
                this.sendMessage(source, '^1Usage: ^7/bring <player_id>');
                return;
            }

            const targetId = parseInt(args[0]);
            if (isNaN(targetId) || !GetPlayerPed(targetId)) {
                this.sendMessage(source, '^1Error: ^7Invalid player ID');
                return;
            }

            const ped = GetPlayerPed(source);
            const [x, y, z] = GetEntityCoords(ped);

            const targetPed = GetPlayerPed(targetId);
            SetEntityCoords(targetPed, x, y, z, false, false, false, false);

            this.sendMessage(source, `^2Brought ^7${GetPlayerName(targetId)}^2 to you`);
            this.sendMessage(targetId, `^2You were brought to ^7${GetPlayerName(source)}`);
        }, {
            description: 'Bring a player to you',
            permission: 'command.bring',
            params: [
                { name: 'player_id', help: 'Target player ID' }
            ]
        });

        // Command: Heal player
        this._registerCommand('heal', (source, args) => {
            let targetId = source;

            if (args.length > 0) {
                targetId = parseInt(args[0]);
                if (isNaN(targetId) || !GetPlayerPed(targetId)) {
                    this.sendMessage(source, '^1Error: ^7Invalid player ID');
                    return;
                }
            }

            const targetPed = GetPlayerPed(targetId);
            SetEntityHealth(targetPed, 200);

            if (targetId === source) {
                this.sendMessage(source, '^2You healed yourself');
            } else {
                this.sendMessage(source, `^2Healed ^7${GetPlayerName(targetId)}`);
                this.sendMessage(targetId, `^2You were healed by ^7${GetPlayerName(source)}`);
            }
        }, {
            description: 'Heal yourself or a player',
            params: [
                { name: 'player_id', help: 'Target player ID (optional)' }
            ]
        });

        // Command: Give weapon (admin)
        this._registerCommand('weapon', (source, args) => {
            if (args.length === 0) {
                this.sendMessage(source, '^1Usage: ^7/weapon <weapon_name>');
                this.sendMessage(source, '^5Examples: ^7pistol, smg, rifle, shotgun');
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
            this.sendMessage(source, `^2Weapon given: ^7${weaponName}`);
        }, {
            description: 'Give yourself a weapon',
            permission: 'command.weapon',
            aliases: ['gun'],
            params: [
                { name: 'weapon_name', help: 'Weapon name' }
            ]
        });

        // ===== Whitelist Commands =====

        // Command: Whitelist add (admin)
        this._registerCommand('wladd', (source, args) => {
            if (args.length === 0) {
                this.sendMessage(source, '^1Usage: ^7/wladd <identifier>');
                this.sendMessage(source, '^5Example: ^7/wladd license:716a655091a9c8579d4709deb5cfec4da3902774');
                return;
            }

            const identifier = args[0];
            const adminName = GetPlayerName(source);
            whitelist.add(identifier, adminName, 'Added via command')
                .then(result => {
                    if (result.success) {
                        this.sendMessage(source, `^2+ Added to whitelist: ^7${identifier}`);
                        this.framework.log.info(`${adminName} added ${identifier} to whitelist`);
                    } else if (result.reason === 'already_whitelisted') {
                        this.sendMessage(source, `^3Already whitelisted: ^7${identifier}`);
                    } else {
                        this.sendMessage(source, `^1Error: ^7${result.reason}`);
                    }
                })
                .catch(error => {
                    this.sendMessage(source, `^1Error: ^7${error.message}`);
                });
        }, {
            description: 'Add player to whitelist',
            permission: 'command.whitelist',
            params: [
                { name: 'identifier', help: 'Player identifier (e.g., license:xxx)' }
            ]
        });

        // Command: Whitelist remove (admin)
        this._registerCommand('wlremove', (source, args) => {
            if (args.length === 0) {
                this.sendMessage(source, '^1Usage: ^7/wlremove <identifier>');
                return;
            }

            const identifier = args[0];
            const adminName = GetPlayerName(source);
            whitelist.remove(identifier, adminName, 'Removed via command')
                .then(result => {
                    if (result.success) {
                        this.sendMessage(source, `^2+ Removed from whitelist: ^7${identifier}`);
                        this.framework.log.info(`${adminName} removed ${identifier} from whitelist`);
                    } else if (result.reason === 'not_found') {
                        this.sendMessage(source, `^3Not found in whitelist: ^7${identifier}`);
                    } else {
                        this.sendMessage(source, `^1Error: ^7${result.reason}`);
                    }
                })
                .catch(error => {
                    this.sendMessage(source, `^1Error: ^7${error.message}`);
                });
        }, {
            description: 'Remove player from whitelist',
            permission: 'command.whitelist',
            aliases: ['wldel'],
            params: [
                { name: 'identifier', help: 'Player identifier' }
            ]
        });

        // Command: Whitelist list (admin)
        this._registerCommand('wllist', (source) => {
            whitelist.getAll()
                .then(list => {
                    this.sendMessage(source, `^3=== Whitelist (${list.length} entries) ===`);
                    if (list.length === 0) {
                        this.sendMessage(source, '^7No whitelisted players');
                    } else {
                        list.slice(0, 20).forEach((entry, i) => {
                            const date = new Date(entry.added_at).toLocaleDateString();
                            this.sendMessage(source, `^5${i + 1}. ^7${entry.identifier} ^5(by ${entry.added_by}, ${date})`);
                        });
                        if (list.length > 20) {
                            this.sendMessage(source, `^7... and ${list.length - 20} more`);
                        }
                    }
                })
                .catch(error => {
                    this.sendMessage(source, `^1Error: ^7${error.message}`);
                });
        }, {
            description: 'List whitelisted players',
            permission: 'command.whitelist'
        });

        // Command: Whitelist toggle (admin)
        this._registerCommand('wltoggle', (source) => {
            if (whitelist.isEnabled()) {
                whitelist.disable();
                this.sendMessage(source, '^3Whitelist disabled');
                this.broadcastMessage('^3Server whitelist has been disabled');
            } else {
                whitelist.enable();
                this.sendMessage(source, '^2+ Whitelist enabled');
                this.broadcastMessage('^2Server whitelist has been enabled');
            }
        }, {
            description: 'Toggle whitelist on/off',
            permission: 'command.whitelist'
        });

        // Command: Whitelist myself
        this._registerCommand('wlme', (source) => {
            const identifiers = whitelist.getPlayerIdentifiers(source);
            const license = identifiers.license;

            if (!license) {
                this.sendMessage(source, '^1Error: ^7Could not find your license identifier');
                return;
            }

            const identifier = `license:${license}`;
            const playerName = GetPlayerName(source);

            whitelist.add(identifier, playerName, 'Self-added via /wlme')
                .then(result => {
                    if (result.success) {
                        this.sendMessage(source, '^2+ You have been added to whitelist');
                        this.sendMessage(source, `^5Your license: ^7${license}`);
                        this.framework.log.info(`${playerName} self-added to whitelist: ${identifier}`);
                    } else if (result.reason === 'already_whitelisted') {
                        this.sendMessage(source, '^3You are already whitelisted');
                    } else {
                        this.sendMessage(source, `^1Error: ^7${result.reason}`);
                    }
                })
                .catch(error => {
                    this.sendMessage(source, `^1Error: ^7${error.message}`);
                });
        }, {
            description: 'Add yourself to the whitelist',
            permission: 'command.whitelist'
        });

        this.framework.log.debug('Commands registered');
    }

    /**
     * Cleanup on resource stop
     */
    async destroy() {
        this.framework.log.info('Shutting down...');
        this.players.clear();
    }
}

// Register in local kernel
Framework.register('freemode', new FreemodeGamemode(Framework), 10);
