var map = L.map('map', {
  center: [53.29, -2.36],
  zoom: 10,
});

var iconCar = L.icon({
  iconUrl: 'public/image/car.png',
  popupAnchor: [0, -35],
  iconSize: [40, 46],
  iconAnchor: [20, 45],
});

var mapDevices = [];

var socket = io({ transports: ['websocket'], upgrade: false, path: '/ws/' });

socket.on('SEND_DATA', function (msg) {
  var arrByDevice = mapDevices[msg.imei];
  if (!arrByDevice) {
    mapDevices[msg.imei] = arrByDevice = [];
  } else {
    //  ensure array size
    if (arrByDevice.length >= 5) {
      var killMsg = arrByDevice.pop();
      var killMarker = killMsg['objMarker'];
      killMarker.off('click', onMarkerClick);
      map.removeLayer(killMarker);
    }
  }
  arrByDevice.unshift(msg);
  setMarker(msg);

  //  fade out previous marker
  if (arrByDevice.length > 1) {
    var updateMarker = arrByDevice[1]['objMarker'];
    updateMarker.setOpacity(0.4);

    //	special 'disappearing' fading for last marker in the range
    updateMarker = arrByDevice[arrByDevice.length - 1]['objMarker'];
    updateMarker.setOpacity(0.25);
  }
});

function setMarker(msg, opacity) {
  var marker = L.marker([msg.lat, msg.lng], {
    icon: iconCar,
    opacity: opacity ? opacity : 1.0,
  }).addTo(map);
  msg['objMarker'] = marker; // keep marker object

  var info;
  info = 'Device: ' + msg.imei;

  info += '<br/>';
  info += 'Lat: ' + msg.lat;
  info += '<br/>';
  info += 'Lng: ' + msg.lng;
  info += '<br/>';
  info += 'Altitude: ' + msg.altitude + ' m';

  info += '<br/>';
  info += 'Speed: ' + parseFloat(msg.speed).toFixed(1) + ' km/hr';

  info += '<br/>';
  marker.bindPopup(info);

  marker.on('click', onMarkerClick);
}

function onMarkerClick(e) {
  map.setView([e.latlng.lat, e.latlng.lng], 13);
}

document.addEventListener('DOMContentLoaded', function () {
  do_resize();
  window.addEventListener('resize', do_resize);

  var osm = new L.TileLayer(
    'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    {
      attribution:
        'gisfile.com &copy; <a rel="nofollow" href="http://gisfile.com">GISFile</a>',
    },
  );

  map.addLayer(osm);

  L.control.mousePosition({ emptyString: '' }).addTo(map);

  document.getElementById('range').addEventListener('change', function (event) {
    var value = event.currentTarget.value;
    var now = Date.now();
    var stepSize = now / 1000;
    var from = now - value * stepSize;
    socket.emit('GET_DATA', Math.floor(from));
  });
});

function do_resize() {
  var windowWidth =
    window.innerWidth ||
    document.documentElement.clientWidth ||
    document.body.clientWidth;
  var windowHeight =
    window.innerHeight ||
    document.documentElement.clientHeight ||
    document.body.clientHeight;

  if (windowHeight < 10) windowHeight = 768;

  if (windowWidth < 10) windowWidth = 1024;

  document.getElementById('meditor').style.width = windowWidth + 'px';
  document.getElementById('map').style.height = windowHeight + 'px';
}
