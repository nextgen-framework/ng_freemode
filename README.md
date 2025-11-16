# NextGen Freemode

GTA Online style freemode gamemode for NextGen Framework.

## 🎮 Features

- **Spawn System** - Automatic spawn with multiple locations
- **Death Handling** - Auto-respawn after 5 seconds
- **Vehicle Spawning** - Spawn any vehicle with `/car <model>`
- **Player Stats** - Track money, level, and statistics
- **Spawn Locations** - Multiple spawn points across the map
- **Admin Commands** - Money management and player control

## 🚀 Installation

1. **Ensure ng_core is installed and started**:
   ```bash
   ensure ng_core
   ensure ng_freemode
   ```

2. **Configure permissions** in `server.cfg`:
   ```bash
   # Freemode admin commands
   add_ace group.admin command.givemoney allow
   ```

## 📝 Commands

### Player Commands

| Command | Description | Usage | Aliases |
|---------|-------------|-------|---------|
| `/stats` | Show your statistics | `/stats` | - |
| `/setspawn` | Set spawn location | `/setspawn <location>` | - |
| `/car` | Spawn a vehicle | `/car <model>` | `/vehicle`, `/v` |
| `/suicide` | Respawn character | `/suicide` | `/kill`, `/respawn` |

### Admin Commands

| Command | Description | Usage | Permission |
|---------|-------------|-------|------------|
| `/givemoney` | Give money to player | `/givemoney <id> <amount>` | `command.givemoney` |

## 🗺️ Spawn Locations

- **lsia** - Los Santos International Airport
- **legion** - Legion Square
- **vinewood** - Vinewood Hills
- **pier** - Del Perro Pier
- **paleto** - Paleto Bay
- **sandy** - Sandy Shores

## 🎯 Gamemode Features

### Spawn System
- Automatic spawn on join
- Customizable spawn locations
- Smooth fade in/out transitions
- Collision loading

### Death Handling
- 5-second respawn delay
- Automatic health reset
- Weapon cleanup on respawn

### Vehicle System
- Spawn any valid GTA V vehicle
- Automatic placement in front of player
- Model validation
- Error handling

## 🔧 Configuration

### Default Player Stats
- **Cash**: $5,000
- **Bank**: $10,000
- **Level**: 1

### Default Spawn
- **Location**: Los Santos International Airport
- **Coordinates**: -1037.0, -2737.0, 20.0

## 📚 Developer Information

### Server Events
```javascript
// Player data structure
{
  name: string,
  money: number,
  bank: number,
  level: number,
  spawn: string,
  character: object,
  joinTime: number
}
```

### Client RPC Handlers
```javascript
// Spawn vehicle
framework.rpc.callClient('freemode:spawnVehicle', source, modelName)

// Suicide/Respawn
framework.rpc.callClient('freemode:suicide', source)
```

## 🎨 Planned Features

- [ ] Character creator menu
- [ ] Clothing shops
- [ ] Job system
- [ ] Property system
- [ ] Gang system
- [ ] Economy balancing
- [ ] Vehicle ownership
- [ ] Player housing
- [ ] Inventory system
- [ ] Weapon shops

## 📄 License

Part of the NextGen Framework

## 🔗 Links

- **Framework**: [ng_core](../ng_core/)
- **Demo**: [ng_demo](../ng_demo/)

---

**Version**: 1.0.0
**Gamemode**: NextGen Freemode
**Author**: NextGen Team
