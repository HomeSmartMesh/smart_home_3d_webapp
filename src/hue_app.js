
var hue = jsHue();
var user;
var lights;
var light_ids;
var hue_available = false;

function send_custom_event(event_name,data){
	var event = new CustomEvent(event_name, {detail:data});
	window.dispatchEvent(event);
}

function get_lights_state(){
    console.log("hue_app> get_lights_state()")

    user.getLights().then(data => {
        console.log("getLights response");
        lights = data;
        send_custom_event('hue_lights_on_startup',lights);
        hue_available = true;
        light_ids = {};
        for (const [light_id,light] of Object.entries(lights)) {
            light_ids[light.name] = light_id;
        }
    });
}

function create_user(bridge_ip){
    let bridge = hue.bridge(bridge_ip);
    //check connection
    let hue_user_identifier = window.location.hostname + '#3d_webapp';
    bridge.createUser(hue_user_identifier).then(data => {
        console.log(data);
        if(typeof(data[0].success) != "undefined"){
            let username = data[0].success.username;
            console.log('New username:', username);
            localStorage.setItem("username",username);
            user = bridge.user(username);
            get_lights_state();
        }
        else if(typeof(data[0].error) != "undefined"){
            console.error(data[0].error);
        }
    });
}

function init(){
    if (typeof(Storage) == "undefined") {
        console.error("local storage is not supported");
        return;
    }
    hue.discover().then(bridges => {
        if(bridges.length === 0) {
            console.log('No bridges found. :(');
        }
        else if(bridges.length == 1){
            let bridge_ip = bridges[0].internalipaddress;
            if (localStorage.getItem("username") === null) {
                alert("First time usage, creating user, make sure the hue gateway button is pressed to authorise");
                console.log(`using bridge at ip (${bridge_ip})`);
                create_user(bridge_ip);
                //create_server_bound_user(bridge_ip);
            }
            else{
                let username = localStorage.getItem("username");
                console.log(`using username from browser's local storage`);
                let bridge = hue.bridge(bridge_ip);
                user = bridge.user(username);
                get_lights_state();
            }
        }
        else{
            bridges.forEach(b => console.log('Bridge found at IP address %s.', b.internalipaddress));
            console.error(`${bridges.length} bridges found - not supported`);
        }
    }).catch(e => console.log('Error finding bridges', e));
            
    window.addEventListener( 'mesh_click', onMeshClick, false );

}


function onMeshClick(event){
    const name = event.detail.name;
    const hue_name = event.detail.userData.hue;
    if(typeof(hue_name) != "undefined"){
        console.log(`hue_app> Mesh Light click on '${name}' with hue = '${hue_name}'`);
            if(!hue_available){
                console.log(`hue not available`);
                return;
            }
            var l_id = light_ids[hue_name];
            user.getLight(l_id).then(data => {
                if(data.state.reachable == true) {
                    const light_new_state = !data.state.on;
                    user.setLightState(l_id, { on: light_new_state }).then(data => {
                        send_custom_event("hue_light_state",{name:hue_name,on:light_new_state});
                        console.log(`hue_app> set hue light '${hue_name}' to ${light_new_state}`);
                    });
                }
                else{
                    console.warn(`hue_app> hue light '${hue_name}' unreachable`);
                }
            });
    }
}
//----------------------------------------------------------------------------------
export{init,create_user};
