# Using IceBot

## Install libraries
    npm install request
    npm install discord.io
    
## Tune to your server
- Add your bot token to `test46.js`
- Edit constants in the bot script to match your own server
- Edit `configurables.txt` to match your own server
- Create `xp.txt` with the contents
    let xp = {}

## Run
    node test46.js

## Command list

### Roles
/assign
/unassign
/assignstaff
/unassignstaff
/recruit
/role

### Channels
/create
/invite

### XP
/rank
/updatexp (debugging only)
/wipexp

### Clans
/clan
/confirmclan

### Misc
/eval
/roleid
