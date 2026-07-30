import {runtimeConfig} from './runtimeConfig';

export var gpsData = {};
let id;
let watchCallBack = null;
export let setupGPS = (callback) => {
    watchCallBack = callback;
    console.log('setup gps');
    if (runtimeConfig.locationMode === 'fixture') {
      gpsData = {
        ...runtimeConfig.fixedLocation,
        timeStamp: Date.now(),
        date: Date(Date.now()),
        leave: false
      };
      if (watchCallBack) watchCallBack(true);
      return;
    }
    let options = {
      enableHighAccuracy: true,
      timeout: 60000,
      maximumAge: Infinity
    };
    id = navigator.geolocation.watchPosition(showPosition, watchPositionError, options);
}
export let gpsHelp = getSettingStr();

function showPosition(position) {
    //console.log('yo!');
    gpsData = {
        lat: position.coords.latitude,
        lon: position.coords.longitude,
        timeStamp: Date.now(),
        date: Date(Date.now()),
        leave: false
    }
    if (watchCallBack) watchCallBack(true);
}
    
function watchPositionError(positionError)  {
    switch (positionError.code) {
        // PERMISSION_DENIED
        case 1:
          console.log('Permission denied')
          break
        // POSITION_UNAVAILABLE
        case 2:
          console.log('Permission allowed, location disabled')
          break
        // TIMEOUT
        case 3:
          console.log('Permission allowed, timeout reached')
          break
        default:
          break;
    }
    if (watchCallBack) watchCallBack(false);
}

function getSettingStr() {
  var userAgent = navigator.userAgent || navigator.vendor || window.opera;
    if (/android|windows phone/i.test(userAgent)) {
      return "1. Open the Chrome app.\n\n2. Find and tap Settings.\n\n3. Tap Site settings > Location.\n\n4. Turn Location on.";
    }
    // iOS detection from: http://stackoverflow.com/a/9039885/177710
    if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
      return "1. Open the settings app.\n\n2. Find and tap Safari/Chrome.\n\n3. Tap Location.\n\n4. Select \"While Using the App\".";
    }
    return "Enable Location Permission";
}

export let clearWatchGPS = () => {
  if (id !== undefined && navigator.geolocation) {
    navigator.geolocation.clearWatch(id);
  }
}
