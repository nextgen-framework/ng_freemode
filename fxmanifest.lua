fx_version 'cerulean'
game 'gta5'

name 'NextGen Freemode'
description 'GTA Online style freemode for NextGen Framework'
author 'NextGen Team'
version '1.0.0'

-- This is a gametype (replaces basic-gamemode)
resource_type 'gametype' { name = 'Freemode' }

-- Server scripts
server_scripts {
  'server.js'
}

-- Client scripts
client_scripts {
  'client.js'
}

-- Dependencies
dependency 'ng_core'
