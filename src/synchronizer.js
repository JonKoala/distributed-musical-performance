var barWidth;
var barProgress;

var emitter;
var nullSignal = 0;
var stopSignal = 255;

var songInfo;
var interval;
var player;
var loop;
var loopEventRef;
var atualPart;

var nullSignalEventRef;

var buttonsLocked;
var barLocked;

//
//LOADING

$(document).ready(function() {

  lockInterface(true);

  //initializing music progress bar
  barWidth = $('#bar-clickable').width();
  barProgress = $('#bar-progress');
  $('#bar-clickable').bind('click', onBarClick);

  //initializing synchronization variables
  loop = nullFunction;
  atualPart = -1;

  //start emitter
  emitter = new Emitter();
  emitter.start();

  //load playlist
  $.getJSON('src/playlist.json', function(playlist) {

    //for now, we only have the chrono trigger song, so...
    var songIndex = 'chronoTrigger';
    songInfo = playlist[songIndex];

    interval = songInfo['interval'];

    createQRCodes(songInfo, songIndex);
    player = new Player(emitter.context, 'tracks/' + songInfo['tracks'][0], onPlayerReady, true);
  });
});

function onPlayerReady() {

  //unlock the interface
  $('#menu').animate({opacity:1}, 500, function() {
    $(this).removeClass('locked');
    lockButtons(false);

    //show title
    $('#title').text('Playing: ' + songInfo['title']);
    $('#title').slideDown(3000);
  });
}

function createQRCodes(songInfo, songIndex) {

  var tracks = songInfo['tracks'];

  //create relative url
  var url = window.location.href;
  url = url.replace('synchronizer', 'client');

  var code;
  var div;
  var instrumentsDiv = $('#instruments');
  for (index in tracks) {

    code = url + '?' + songIndex + '?' + index;

    //embed div with qrcode
    div = $('<div>', {class: 'qrcode'});
    new QRCode(div[0], code);

    instrumentsDiv.append(div);
  }
}

//
//EMITTER

function emitSignal(signal) {
  emitter.setMessage(signal);
}

//
//EVENTS

function onUpdate(data, element) {

  var percent = player.getCurrentTime() / player.getLength();

  //stoping the player if its ended
  if (percent > 1) {
    onStop();
    barProgress.width(barWidth);
    return;
  }

  //updating visual bar
  var x = percent * barWidth;
  barProgress.width(x);

  //updating where we are at the music
  var observedPart = (player.getCurrentTime() / interval) >> 0;
  updateState(observedPart);

  loopEventRef = setTimeout(loop, 0);
}

function updateState(observedPart) {

  //only emit a signal when we change the state
  if (observedPart !== atualPart)
    emitSignal(observedPart + 1); //synchronization signals are one-based

  atualPart = observedPart;
}

//INTERFACE

function onBarClick(ev) {

  if (barLocked)
    return;

  //get clicked parameters
  var $div = $(ev.target);
  var $display = $div.find('#bar-display');
  var offset = $div.offset();
  var x = ev.clientX - offset.left;
  x = (x > barWidth) ? barWidth : x;

  //check the instant equivalent to the user's click
  var percent = x/barWidth;
  var instant = percent * player.getLength();

  //we don't actually place the player in the exact instant where the user clicked
  //instead, we place it on the nearest instant that would generate a signal change
  var nearestPart = Math.round(instant / interval);
  var instantToPlay = (nearestPart * interval) + 0.05;
  updateState(nearestPart);
  player.play(instantToPlay);
}

function onPlayPause(ref) {

  if (buttonsLocked)
    return;

  //play/pause logic
  ref = $(ref);
  if (ref.text() === 'PLAY') {

    player.play();

    //start event loop
    loop = onUpdate;
    onUpdate();

    lockBar(false);
    ref.text('PAUSE');
  } else {

    //stop event loop
    loop = nullFunction;
    clearTimeout(loopEventRef);

    player.pause();

    emitSignal(stopSignal);

    lockBar(true);
    ref.text('PLAY');
  }
}

function onStop() {

  if (buttonsLocked)
    return;

  //stop event loop
  loop = nullFunction;
  clearTimeout(loopEventRef);

  emitSignal(stopSignal);

  //stop player
  player.stop();
  atualPart = -1;

  //visual effects
  lockBar(true);
  barProgress.width(0);
  $('#playPause').text('PLAY');
}

function onShowInstruments(ref) {

  if (buttonsLocked)
    return;

  ref = $(ref);
  if (ref.text() === 'SHOW INSTRUMENTS') {
    $('#instruments').slideDown(500);
    ref.text('HIDE INSTRUMENTS');
  } else {
    $('#instruments').slideUp(500);
    ref.text('SHOW INSTRUMENTS');
  }
}

//
//UTILS

function nullFunction() { }

function lockInterface(lock) {
  lockButtons(lock);
  lockBar(lock);
}

function lockButtons(lock) {
  buttonsLocked = lock;
}

function lockBar(lock) {
  barLocked = lock;
}
