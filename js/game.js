(function Game(){
	"use strict";

	var viewportDims = {},

		$window = $(window),
		$document = $(document),
		$scene,
		sceneCnv,
		sceneCtx,

		tmpCnv = document.createElement("canvas"),
		tmpCtx = tmpCnv.getContext("2d"),

		orientationLocked = false,
		lockOrientation =
			(window.screen.lockOrientation ?
				window.screen.lockOrientation.bind(window.screen) : null
			) ||
			(window.screen.mozLockOrientation ?
				window.screen.mozLockOrientation.bind(window.screen) : null
			) ||
			(window.screen.msLockOrientation ?
				window.screen.msLockOrientation.bind(window.screen) : null
			) ||
			((window.screen.orientation && window.screen.orientation.lock) ?
				window.screen.orientation.lock.bind(window.screen.orientation) : null
			) ||
			null,

		KEYBOARD_SPACE = 1,

		gameState = {},

		touch_disabled = false,

		DEBUG = true,
		frameCount,
		framerate = "-- fps",
		framerateTimestamp;


	// initialize UI
	Promise.all([
		docready(),
		loadResources(),
		checkOrientation(),
	])
	.then(snapToViewport)
	.then(onResize)
	.then(setupGame);


	// respond to window resizes
	$window.on("resize",onResize);

	$window.on("contextmenu",function onmenu(evt){
		evt.preventDefault();
		evt.stopPropagation();
		evt.stopImmediatePropagation();
	});

	$document.on("selectstart",function onselect(evt){
		evt.preventDefault();
		evt.stopPropagation();
		evt.stopImmediatePropagation();
	});


	// ******************************

	function trackFramerate() {
		if (DEBUG) {
			if (framerateTimestamp == null) {
				framerateTimestamp = Date.now();
				frameCount = 0;
			}
			else {
				frameCount++;

				var now = Date.now();
				if ((now - framerateTimestamp) >= 1000) {
					var rate = frameCount / ((now - framerateTimestamp) / 1000);
					framerate = rate.toFixed(1) + " fps";
					frameCount = 0;
					framerateTimestamp = Date.now();
				}
			}
		}
	}

	// clear canvas
	function clearScene() {
		sceneCtx.fillStyle = "#BAE6F5";
		sceneCtx.fillRect(-20,-20,viewportDims.width+40,viewportDims.height+40);
	}

	function showFramerate() {
		if (DEBUG) {
			sceneCtx.font = "20px sans-serif";
			sceneCtx.fillStyle = "white";
			sceneCtx.fillText(framerate,200,20);
		}
	}

	function docready() {
		return new Promise(function executor(resolve){
			$document.ready(function onready(){
				$scene = $("[rel~=js-scene]");
				sceneCnv = $scene[0];
				sceneCtx = sceneCnv.getContext("2d");

				resolve();
			});
		});
	}

	function loadResources() {
		return Promise.all([
			Face.load(),
		]);
	}

	function checkOrientation() {
		return Promise.resolve(
				lockOrientation ?
					lockOrientation("landscape") :
					Promise.reject()
			)
			.then(
				function onLocked() {
					orientationLocked = true;
				},
				function onNotLocked() {}
			);
	}

	function setupPlayInteraction() {
		$document.on("keydown mousedown touchstart pointerdown",onPress);


		// ******************************

		function onPress(evt) {
			evt.preventDefault();

			if (gameState.playing) {
				var key = detectKey(evt);
				if (
					evt.type != "keydown" ||
					key == KEYBOARD_SPACE
				) {
					gameState.jumping = true;
				}
			}
		}
	}

	function teardownPlayInteraction() {
		$document.unbind("keydown mousedown touchstart pointerdown");
	}

	function disableEvent(evt) {
		evt.preventDefault();
		evt.stopPropagation();
		evt.stopImmediatePropagation();
	}

	function disableTouch() {
		if (!touch_disabled) {
			touch_disabled = true;
			$document.on("touchstart pointerdown",disableEvent);
		}
	}

	function enableTouch() {
		if (touch_disabled) {
			touch_disabled = false;
			$document.unbind("touchstart pointerdown",disableEvent);
		}
	}

	// normalize touch event handling
	function detectTouch(evt) {
		if (evt.originalEvent) {
			evt = evt.originalEvent;
			if (evt.type == "touchstart") {
				if (evt.touches && evt.touches.length > 0) {
					evt.clientX = evt.touches[0].clientX;
					evt.clientY = evt.touches[0].clientY;
					evt.screenX = evt.touches[0].screenX;
					evt.screenY = evt.touches[0].screenY;
				}
			}
		}
		return evt;
	}

	// normalize keyboard event handling
	function detectKey(evt) {
		if (evt.type == "keydown" || evt.type == "keypress") {
			if (
				evt.key == "Spacebar" ||
				evt.key == " " ||
				evt.keyCode == 32 ||
				evt.charCode == 32
			) {
				return KEYBOARD_SPACE;
			}
		}
	}

	function setupGame() {
		return Promise.resolve(initGame())
		.then(startPlayEntering);
	}

	function initGame() {
		gameState.bestJumpScore = gameState.bestJumpScore || 0;

		gameState.playEntering = false;
		gameState.playing = false;
		gameState.playLeaving = false;

		gameState.jumpScore = 0;

		gameState.faceY = viewportDims.height - gameState.faceSize;

		gameState.minAltitude = 10;
		gameState.maxAltitude = 50;
		gameState.altitude = 10;

		gameState.velocity = 0;

		gameState.faceAngle = 0;
		gameState.faceRotatingSpeed = 0.1396 * gameState.speedRatio; // ~8 degrees in radians

		gameState.gravity = -0.4;
		gameState.jump = 1.7;

		gameState.playEnteringTickCount = 0;
		gameState.playEnteringTickThreshold = 60;

		gameState.playLeavingTickCount = 0;
		gameState.playLeavingTickThreshold = 60;

		gameState.sceneShaking = false;
		gameState.shakeTickCount = 0;
		gameState.shakeTickThreshold = 10;
		gameState.shakeOffsetX = 0;
		gameState.shakeOffsetY = 0;
		gameState.shakeDeltaX = Math.min(-8,Math.round(-12 * gameState.speedRatio));
		gameState.shakeDeltaY = Math.min(-5,Math.round(-8 * gameState.speedRatio));
	}

	function startPlayEntering() {
		// disable any touch for right now
		disableTouch();

		clearScene();

		gameState.playEntering = true;
		gameState.faceXStart = (gameState.faceX = -gameState.faceSize);
		// gameState.faceY = altitudeToViewport(gameState.altitude);

		gameState.RAF = requestAnimationFrame(runPlayEntering);
	}

	function startPlaying() {
		enableTouch();

		gameState.playEntering = false;
		gameState.playing = true;

		setupPlayInteraction();

		gameState.RAF = requestAnimationFrame(runPlaying);
	}

	function startPlayLeaving() {
		teardownPlayInteraction();

		// disable any touch for right now
		disableTouch();

		gameState.playEntering = false;
		gameState.playing = false;
		gameState.playLeaving = true;

		gameState.RAF = requestAnimationFrame(runPlayLeaving);
	}

	function runPlayEntering() {
		trackFramerate();

		gameState.RAF = null;

		if (gameState.playEntering) {
			gameState.playEnteringTickCount++;

			if (gameState.playEnteringTickCount <= gameState.playEnteringTickThreshold) {

				gameState.faceAngle -= gameState.faceRotatingSpeed;
				gameState.faceX = gameState.faceXStart + (
					(gameState.faceXThreshold - gameState.faceXStart) *
					(gameState.playEnteringTickCount / gameState.playEnteringTickThreshold)
				);

				drawIntro(1);

				gameState.RAF = requestAnimationFrame(runPlayEntering);
			}
			else {
				startPlaying();
			}
		}
	}

	function runPlaying() {
		trackFramerate();

		gameState.RAF = null;

		if (gameState.playing) {

			// TODO: run game stuff

			// keep playing?
			if (checkFace()) {
				shakeTick();

				// paint the canvas
				drawGameScene();

				// keep going?
				if (gameState.playing) {
					gameState.RAF = requestAnimationFrame(runPlaying);
					return;
				}
			}
			else {
				shakeScene();
			}

			startPlayLeaving();
		}
	}

	function runPlayLeaving() {
		trackFramerate();

		gameState.RAF = null;

		if (gameState.playLeaving) {
			gameState.playLeavingTickCount++;

			if (gameState.playLeavingTickCount <= gameState.playLeavingTickThreshold) {

				// TODO: leave the scene

				gameState.RAF = requestAnimationFrame(runPlayLeaving);
			}
		}
	}

	function drawIntro(drawOpacity) {
		clearScene();

		sceneCtx.globalAlpha = drawOpacity;

		var face = Face.getFace(gameState.faceAngle);
		sceneCtx.drawImage(face.cnv,gameState.faceX,gameState.faceY);

		showFramerate();
	}

	function drawGameScene() {
		clearScene();

		// offset scene drawing for shaking
		if (gameState.sceneShaking) {
			sceneCtx.save();
			sceneCtx.translate(gameState.shakeOffsetX,gameState.shakeOffsetY);
		}

		var face = Face.getFace(gameState.faceAngle);
		sceneCtx.drawImage(face.cnv,gameState.faceX,gameState.faceY);

		// offset scene drawing for shaking
		if (gameState.sceneShaking) {
			sceneCtx.restore();
		}

		showFramerate();
	}

	function shakeScene() {
		gameState.sceneShaking = true;
	}

	function positionFace() {
		gameState.altitude = constrainAltitude(
			// snap to 0.5 increments
			Math.round(2 * (gameState.altitude + gameState.velocity)) / 2
		);
		gameState.faceY = altitudeToViewport(gameState.altitude);
	}

	function checkFace() {
		// TODO

		return true;
	}

	function constrainValueToRange(val,min,max) {
		return Math.max(min,Math.min(max,val));
	}

	function constrainAltitude(altd) {
		return constrainValueToRange(
			altd,
			gameState.minAltitude,
			gameState.maxAltitude
		);
	}

	function altitudeToViewport(altd) {
		// TODO!
		return 0;
	}

	function gravity() {
		gameState.velocity = constrainVelocity(
			gameState.velocity + gameState.gravity
		);
	}

	function snapToViewport() {
		viewportDims.width = window.innerWidth;
		viewportDims.height = window.innerHeight;

		if (!orientationLocked) {
			var minRatio = 0.5;
			var maxRatio = 0.75;
			var ratio = viewportDims.height / viewportDims.width;

			if (ratio > maxRatio) {
				viewportDims.height = Math.floor(viewportDims.width * maxRatio);
			}
			else if (ratio < minRatio) {
				viewportDims.width = Math.floor(viewportDims.height / minRatio);
			}

			$scene.css({
				width: viewportDims.width + "px",
				height: viewportDims.height + "px",
			});
		}

		if (sceneCnv.width !== viewportDims.width || sceneCnv.height !== viewportDims.height) {
			$scene.attr({
				width: viewportDims.width,
				height: viewportDims.height
			});
		}
	}

	function onResize() {
		snapToViewport();

		// recalc some metrics
		gameState.playHeight = viewportDims.height / 3;
		gameState.speedRatio = viewportDims.width / 1200;
		gameState.faceSize = Math.floor(viewportDims.height / 5);
		gameState.faceXThreshold = Math.round(gameState.faceSize / 2);

		// scale game stuff
		Face.scaleTo(gameState.faceSize);

		// resize during animation not supported
		if (gameState.playEntering || gameState.playing || gameState.playLeaving) {
			if (gameState.playing) {
				teardownPlayInteraction();
			}
			gameState.playEntering = false;
			gameState.playing = false;
			gameState.playLeaving = false;

			// cancel queued tick action, if any
			if (gameState.RAF) {
				cancelAnimationFrame(gameState.RAF);
				gameState.RAF = null;
			}

			// TODO: what next?
		}
		// TODO: else, what?
	}

	function shakeTick() {
		if (gameState.sceneShaking) {
			gameState.shakeTickCount++;

			if (gameState.shakeTickCount < gameState.shakeTickThreshold) {
				gameState.shakeOffsetX = Math.floor((gameState.shakeOffsetX + gameState.shakeDeltaX) * 10) / 10;
				gameState.shakeOffsetY = Math.floor((gameState.shakeOffsetY + gameState.shakeDeltaY) * 10) / 10;

				gameState.shakeDeltaX *= -0.9;
				gameState.shakeDeltaY *= -0.9;
			}
			else {
				gameState.sceneShaking = false;
				gameState.shakeTickCount = 0;
				gameState.shakeOffsetX = 0;
				gameState.shakeOffsetY = 0;
				gameState.shakeDeltaX = Math.min(-8,Math.round(-12 * gameState.speedRatio));
				gameState.shakeDeltaY = Math.min(-5,Math.round(-8 * gameState.speedRatio));
			}
		}
	}

})();
