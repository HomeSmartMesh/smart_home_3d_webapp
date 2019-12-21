# hue lights integration

<img src="./media/demo1.gif" width="600">

We see in this demo a home 3d model augmented with interactive mesh items. Some meshes represent light bulbs and generate events when the user clicks on them. Those events are handled by a hue light client that interacts with the real hue gateway. The hue client publishes as events the actual state of the switched light, and that state is updated by the mesh bulb color and the associated 3d light.

As a demonstration for the reaction time of the real light switching on and off, we can see in the gif animation the power consumption log of the light switched. This log comes from a [shelly 2.5 device](https://shelly.cloud/shelly-25-wifi-smart-relay-roller-shutter-home-automation/) with power monitoring capabilites. This measure device is itself powering up the hue light. Note that the slow power up and down ramp are due to the hue effect of slow variation when switching on and off.

# How to

## Create your own home model

The created home model should have custom properties. It is also possible to use the existing home model file and edit it as it is a json format : `./3d_models/home.gltf`. It is possible to rename the `hue: ` field with your own hue lights names as known by the hue gateway.
 
Example below :

    "extras" : {
        "mouseEvent" : "true",
        "type" : "light",
        "hue" : "Bathroom main"

## First time usage

1. press the Hue Gateway authorisation button
2. Load or reload the web app page
3. An alert will apear on the screen to wait in case the authorisation button is not pressed yet

<img src="./media/alert_first_time.png" width="400">

4. The user creation will proceed and the username will be stored as local storage

<img src="./media/local_storage.png" width="600">

5. The webapp can be now used in sync with the hue Gateway interactions. In case a Gateway sync is not needed, it is possible to click "Ok" on the later and proceed with a non synced app.


# Dependencies

* [three.js](https://threejs.org/)
* [jsHue.js](https://github.com/blargoner/jshue)
* [web_three_interface](https://github.com/HomeSmartMesh/web_three_interface)

## Features
* glTF model with custom properties including interactive meshes and hue light names
* Hue query on startup to set correct light states, on/off and reachability
* Consistent state on startup and on actions with the real light bulbs (but no polling in between)

## web_three_interface
The [web_three_interface](https://github.com/HomeSmartMesh/web_three_interface) is not a direct dependency but is used as a boiler plate for 3d interactive meshes. It is still a useful repo that helps understand the workflow step by step with increasingly complex demo, and also debug in case one step is failing.

