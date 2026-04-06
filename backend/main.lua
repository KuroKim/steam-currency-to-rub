local millennium = require("millennium")
local logger = require("logger")

local module_id = 0

local function on_load()
    logger:info("Steam Currency to RUB: on_load fired")

    module_id = millennium.add_browser_js(
        "steam_currency_to_rub.js",
        ".*"
    )

    logger:info("Steam Currency to RUB: module_id = " .. tostring(module_id))
    millennium.ready()
end

local function on_unload()
    if module_id and module_id ~= 0 then
        millennium.remove_browser_module(module_id)
        logger:info("Steam Currency to RUB: unloaded")
    else
        logger:info("Steam Currency to RUB: unloaded with empty module_id")
    end
end

return {
    on_load = on_load,
    on_unload = on_unload
}