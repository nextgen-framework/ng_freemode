/**
 * NextGen Freemode - Character Plugin
 * Gates spawn behind character selection/creation
 */

class CharacterPlugin {
    constructor(framework) {
        this.framework = framework;
        this.ng = null;
    }

    async init() {
        this.ng = Use('ng_core');
        this.setupEvents();
        this.setupCommands();
        this.framework.log.info('Character plugin initialized');
    }

    setupEvents() {
        // Client requests character list after connect
        this.framework.fivem.onNet('freemode:requestCharacters', async () => {
            const src = source;
            try {
                const characters = await this.ng.CallModule('character-manager', 'getPlayerCharacters', src);
                this.framework.fivem.emitNet('freemode:characterList', src, characters || []);
            } catch (error) {
                this.framework.log.error(`Failed to get characters for ${src}: ${error.message}`);
                this.framework.fivem.emitNet('freemode:characterList', src, []);
            }
        });

        // Client selected a character
        this.framework.fivem.onNet('freemode:selectCharacter', async (characterId) => {
            const src = source;
            if (typeof characterId !== 'number') return;

            try {
                const result = await this.ng.CallModule('character-manager', 'selectCharacter', src, characterId);
                if (result && result.success) {
                    this.spawnWithCharacter(src, result.character);
                } else {
                    this.ng.SendMessage(src, `[Character] Selection failed: ${result?.reason || 'unknown'}`);
                }
            } catch (error) {
                this.framework.log.error(`Failed to select character for ${src}: ${error.message}`);
            }
        });

        // Save position on disconnect
        this.framework.fivem.on('playerDropped', () => {
            this.savePosition(source);
        });
    }

    setupCommands() {
        RegisterCommand('createchar', async (src, args) => {
            if (src <= 0) return;
            if (args.length < 2) {
                this.ng.SendMessage(src, '[Character] Usage: /createchar <firstname> <lastname> [m/f]');
                return;
            }

            const data = {
                firstname: args[0],
                lastname: args[1],
                gender: (args[2] || 'm').toLowerCase() === 'f' ? 'f' : 'm',
                dob: '1990-01-01'
            };

            try {
                const result = await this.ng.CallModule('character-manager', 'createCharacter', src, data);
                if (result && result.success) {
                    await this.ng.CallModule('character-manager', 'selectCharacter', src, result.characterId);
                    this.ng.SendMessage(src, `[Character] ${data.firstname} ${data.lastname} created`);
                    this.spawnWithCharacter(src, result.character);
                } else {
                    this.ng.SendMessage(src, `[Character] Error: ${result?.reason || 'unknown'}`);
                    if (result?.errors) {
                        this.ng.SendMessage(src, `[Character] ${result.errors.join(', ')}`);
                    }
                }
            } catch (error) {
                this.framework.log.error(`Failed to create character for ${src}: ${error.message}`);
                this.ng.SendMessage(src, '[Character] Internal error');
            }
        }, false);

        RegisterCommand('deletechar', async (src, args) => {
            if (src <= 0) return;
            const charId = parseInt(args[0]);
            if (isNaN(charId)) {
                this.ng.SendMessage(src, '[Character] Usage: /deletechar <id>');
                return;
            }

            try {
                const result = await this.ng.CallModule('character-manager', 'deleteCharacter', src, charId);
                if (result && result.success) {
                    this.ng.SendMessage(src, `[Character] Character #${charId} deleted`);
                } else {
                    this.ng.SendMessage(src, `[Character] Error: ${result?.reason || 'unknown'}`);
                }
            } catch (error) {
                this.ng.SendMessage(src, '[Character] Internal error');
            }
        }, false);

        RegisterCommand('charlist', async (src) => {
            if (src <= 0) return;
            try {
                const characters = await this.ng.CallModule('character-manager', 'getPlayerCharacters', src);
                if (!characters || characters.length === 0) {
                    this.ng.SendMessage(src, '[Character] No characters. Use /createchar <firstname> <lastname>');
                    return;
                }
                characters.forEach(c => {
                    this.ng.SendMessage(src, `[Character] #${c.id} - ${c.fullname} (${c.gender})`);
                });
            } catch (error) {
                this.ng.SendMessage(src, '[Character] Internal error');
            }
        }, false);
    }

    /**
     * Spawn character - load last position, send model info to client
     */
    async spawnWithCharacter(src, character) {
        const model = character.gender === 'f' ? 'mp_f_freemode_01' : 'mp_m_freemode_01';
        const lastPos = await this.loadPosition(src);

        this.framework.fivem.emitNet('freemode:characterReady', src, {
            ...character,
            model,
            lastPosition: lastPos
        });
    }

    /**
     * Save player position to database
     */
    savePosition(src) {
        try {
            const license = this._getLicense(src);
            if (!license) return;

            const ped = GetPlayerPed(src);
            if (!ped || ped === 0) return;

            const coords = GetEntityCoords(ped);
            const heading = GetEntityHeading(ped);

            // Skip invalid positions (ped already despawned returns 0,0,0)
            if (Math.abs(coords[0]) < 1 && Math.abs(coords[1]) < 1) return;

            this.ng.CallModule('database', 'execute',
                'INSERT INTO player_positions (identifier, x, y, z, heading, updated_at) ' +
                'VALUES (?, ?, ?, ?, ?, NOW()) ' +
                'ON DUPLICATE KEY UPDATE x = VALUES(x), y = VALUES(y), z = VALUES(z), heading = VALUES(heading), updated_at = NOW()',
                [license, coords[0], coords[1], coords[2], heading]
            );
        } catch (e) {
            this.framework.log.error(`[Character] Failed to save position: ${e.message}`);
        }
    }

    /**
     * Load last saved position from database
     * @returns {Object|null} { x, y, z, heading }
     */
    async loadPosition(src) {
        try {
            const license = this._getLicense(src);
            if (!license) return null;

            const result = await this.ng.CallModule('database', 'query',
                'SELECT x, y, z, heading FROM player_positions WHERE identifier = ?',
                [license]
            );

            if (!result || result.length === 0) return null;

            return {
                x: result[0].x,
                y: result[0].y,
                z: result[0].z,
                heading: result[0].heading || 0
            };
        } catch (e) {
            this.framework.log.error(`[Character] Failed to load position: ${e.message}`);
            return null;
        }
    }

    /**
     * Get player license identifier (without prefix)
     */
    _getLicense(src) {
        const numIds = GetNumPlayerIdentifiers(src);
        for (let i = 0; i < numIds; i++) {
            const id = GetPlayerIdentifier(src, i);
            if (id && id.startsWith('license:')) return id.slice(8);
        }
        return null;
    }

    async destroy() {
        this.framework.log.info('Character plugin destroyed');
    }
}

module.exports = CharacterPlugin;

Framework.register('character', new CharacterPlugin(Framework), 5);
