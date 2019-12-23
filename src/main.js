import * as home from "./home_app.js";
import * as hue from "./hue_app.js";
import * as mqtt from './mqtt_app.js';

home.init();
hue.init();
mqtt.init();
