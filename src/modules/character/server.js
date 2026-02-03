/**
 * NextGen Freemode - Character Plugin
 * Gates spawn behind character selection/creation
 */

class CharacterPlugin {
    constructor(framework) {
        this.framework = framework;
        this.ng = null;
        this.activeCharacters = new Map(); // source => characterId
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
            const src = global.source;
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
            const src = global.source;
            if (typeof characterId !== 'number') return;

            try {
                const result = await this.ng.CallModule('character-manager', 'selectCharacter', src, characterId);
                if (result && result.success) {
                    this.activeCharacters.set(src, result.character.id);
                    this.spawnWithCharacter(src, result.character);
                } else {
                    this.ng.SendMessage(src, `[Character] Selection failed: ${result?.reason || 'unknown'}`);
                }
            } catch (error) {
                this.framework.log.error(`Failed to select character for ${src}: ${error.message}`);
            }
        });

        // Save player state on disconnect
        this.framework.fivem.on('playerDropped', () => {
            const src = global.source;
            this.savePlayerState(src);
            this.activeCharacters.delete(src);
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
                    this.activeCharacters.set(src, result.characterId);
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
                    this.ng.SendMessage(src, `[Character] #${c.id} - ${c.fullname} (${c.data.gender})`);
                });
            } catch (error) {
                this.ng.SendMessage(src, '[Character] Internal error');
            }
        }, false);
    }

    /**
     * Spawn character - read state from metadata, send to client
     */
    spawnWithCharacter(src, character) {
        const data = character.data || {};
        const meta = character.metadata || {};
        const model = data.gender === 'f' ? 'mp_f_freemode_01' : 'mp_m_freemode_01';

        this.framework.fivem.emitNet('freemode:characterReady', src, {
            ...character,
            model,
            lastPosition: meta.position || null,
            lastHealth: meta.health ?? 200,
            lastArmor: meta.armor ?? 0
        });
    }

    /**
     * Save player state (position, health, armor) into character metadata
     */
    savePlayerState(src) {
        try {
            const charId = this.activeCharacters.get(src);
            if (!charId) return;

            const ped = GetPlayerPed(src);
            if (!ped || ped === 0) return;

            const coords = GetEntityCoords(ped);
            const heading = GetEntityHeading(ped);

            // Skip invalid positions (ped already despawned returns 0,0,0)
            if (Math.abs(coords[0]) < 1 && Math.abs(coords[1]) < 1) return;

            const health = GetEntityHealth(ped);
            const armor = GetPedArmour(ped);

            // Fire-and-forget merge into character metadata
            this.ng.CallModule('character-manager', 'mergeCharacterMetadata', charId, {
                position: { x: coords[0], y: coords[1], z: coords[2], heading },
                health,
                armor
            });
        } catch (e) {
            this.framework.log.error(`[Character] Failed to save player state: ${e.message}`);
        }
    }

    async destroy() {
        this.framework.log.info('Character plugin destroyed');
    }
}

module.exports = CharacterPlugin;

Framework.register('character', new CharacterPlugin(Framework), 5);
