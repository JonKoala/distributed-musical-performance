
var receiver;
var player;
var loop;
var loopEventRef;

var interval;

var nullSignal = 0;
var stopSignal = 255;

var barWidth;
var barProgress;

var buttonsLocked;

//
//LOADING

$(document).ready(function() {

  lockButtons(true);

  //checking if we can use the device's microphone
  if(!navigator.getUserMedia && !navigator.webkitGetUserMedia) {
    $('#warning').show();
    return;
  }
  $('#menu').show();

  //initializing music progress bar
  barWidth = $('#bar-clickable').width();
  barProgress = $('#bar-progress');

  loop = nullFunction;

  //start receiver
  receiver = new Receiver(loadResources, function(e) {console.log(e)});
});

function loadResources() {

  //get data from url
  var urlItens = window.location.href.split('?');
  var songIndex = urlItens[1];
  var trackIndex = urlItens[2];

  //load playlist
  $.getJSON('src/playlist.json', function(playlist) {

    //get information about the song we are going to play
    //and which track this device is going to use
    var songInfo = playlist[songIndex];
    var track = songInfo['tracks'][trackIndex];
    interval = songInfo['interval'];

    startPlayer(track);
  });
}

function startPlayer(track) {

  var trackUrl = 'tracks/' + track;

  //using the same context for capturing and emitting audio causes the player's volume to drop
  //so we use a different context for emitting the music
  var audioMarkings = new AudioMarkings();
  player = new Player(audioMarkings.context, trackUrl, function() {

    //used for debugging
    //startEmitter();

    //setting receiver stop message
    receiver.addMessageEvent(stopSignal, onStopSignal);

    //unlock the interface
    $('#menu').animate({opacity:1}, 500, function() {
      $(this).removeClass('locked');
      lockButtons(false);
    });
  });
}

//
//EVENTS

function onChangeMessage(message) {

  //ignoring special messages
  if ([nullSignal, stopSignal].indexOf(message) != -1)
    return;

  //the message is one-based, turn it to zero-based
  message--;

  //discover how late or early we are
  var instant = interval * message;
  var difference = player.getCurrentTime() - instant;
  difference = Math.abs(difference);

  //adjust player timing
  if (difference > 0.5 || instant === 0)
    player.play(instant);
}

function onStopSignal() {
  player.pause();
}

//
//INTERFACE

function onUpdate() {

  //updating visual bar
  var percent = player.getCurrentTime() / player.getLength();
  var x = (percent > 1) ? barWidth : percent * barWidth;
  barProgress.width(x);

  loopEventRef = window.requestAnimationFrame(loop);
}

function onPlayPause(button) {

  if (buttonsLocked)
    return;

  button = $(button);
  if (button.text() === 'PLAY') {
    receiver.onChangeMessage = onChangeMessage;

    //update loop
    loop = onUpdate;
    onUpdate();

    button.text('PAUSE');
  } else {
    receiver.onChangeMessage = null;

    //update loop
    loop = nullFunction;
    cancelAnimationFrame(loopEventRef);

    player.pause();

    button.text('PLAY');
  }
}

//
//UTILS

function nullFunction() { }

function lockButtons(lock) {
  buttonsLocked = lock;
}

//
//DEBUGGING

var emitter;
function startEmitter() {
  emitter = new Emitter(receiver.context);

  receiver.stream.disconnect(receiver.analyser);
  emitter.oscillator.connect(receiver.analyser);
  delete receiver.stream;

  emitter.start();
}

function changeMessage(message) {
  emitter.setMessage(message);
  //setTimeout(function() {emitter.setMessage(0);}, 100);
}
