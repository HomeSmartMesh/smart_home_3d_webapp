import * as home from "./home_app.js";
import * as hue from "./hue_app.js";
import * as mqtt from './mqtt_app.js';

import config from "./../config.js";


home.init();

if(config.hue.enabled){
    hue.init();
}
if(config.mqtt.enabled){
    mqtt.init();
}
