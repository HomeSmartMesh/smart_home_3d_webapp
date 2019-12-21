# hue lights integration

<img src="./media/demo1.gif" width="600">

We see in this demo a home 3d model augmented with interactive mesh items. Some meshes represent light bulbs and generate events when the user clicks on them. Those events are handled by a hue light client that interacts with the real hue gateway. The hue client publishes as events the actual state of the switched light, and that state is updated by the mesh bulb color and the associated 3d light.

As a demonstration for the reaction time of the real light switching on and off, we can see in the gif animation the power consumption log of the light switched. This log comes from a [shelly 2.5 device](https://shelly.cloud/shelly-25-wifi-smart-relay-roller-shutter-home-automation/) with power monitoring capabilites. This measure device is itself powering up the hue light. Note that the slow power up and down ramp are due to the hue effect of slow variation when switching on and off.

# How to

1. Caution, this step is not user firendly: There is no automated way yet to retrive the user authorisation. It is first required to create a `./user.json` file with the user authorisation. Modify `main.js` to replace hue init with the create_user function :

    `//hue.init();`

    `hue.create_user();`

After pressing the hue gateway button and loading the page, the use will be logged in the console. It is required to write it in the file `./user.json`

    {
        "username":"x-xXxXxXxXXXxxxxxxxxxX"
    }

1. create your own home 3d model, with custom properties or edit the json file `./3d_models/home.gltf` to rename the hue field with theyour own hue lights names as known by the hue gateway.
 
Example below :

    "extras" : {
        "mouseEvent" : "true",
        "type" : "light",
        "hue" : "Bathroom main"


# Dependencies

* three.js
* [jsHue.js](https://github.com/blargoner/jshue)
* [web_three_interface](https://github.com/HomeSmartMesh/web_three_interface)

## Features
* glTF model with custom properties including interactive meshes and hue light names
* Hue query on startup to set correct light states, on/off and reachability
* Consistent state on startup and on actions with the real light bulbs (but no polling in between)

## web_three_interface
The [web_three_interface](https://github.com/HomeSmartMesh/web_three_interface) is not a direct dependency but is used as a boiler plate for 3d interactive meshes. It is still a useful repo that helps understand the workflow step by step with increasingly complex demo, and also debug in case one step is failing.

