var Utils = (function Utils(){
	"use strict";

	var publicAPI;

	publicAPI = {
		loadImgOnEntry: loadImgOnEntry,
		rotateCanvas: rotateCanvas,
		scaleCanvas: scaleCanvas,
		getRandomInRange: getRandomInRange,
		rectangleCollision: rectangleCollision,
		rectangleOcclusion: rectangleOcclusion,
		pointInArea: pointInArea,
	};

	return publicAPI;


	// ******************************

	function loadImgOnEntry(entry) {
		if (!entry.img) {
			entry.img = new Image();
			entry.img.src = entry.src;
			return new Promise(function executor(resolve){
				entry.img.onload = resolve;
			});
		}
	}

	function rotateCanvas(ctx,originX,originY,angle) {
		ctx.translate(originX,originY);
		ctx.rotate(0-angle);
		ctx.translate(0-originX,0-originY);
	}

	function scaleCanvas(ctx,originX,originY,scaleX,scaleY) {
		ctx.translate(originX,originY);
		ctx.scale(scaleX,scaleY);
		ctx.translate(0-originX,0-originY);
	}

	function getRandomInRange(min,max) {
		var diff = max - min + 1;
		return (Math.ceil(Math.random() * diff * 10) % diff) + min;
	}

	function rectangleCollision(Ax1,Ay1,Ax2,Ay2,Bx1,By1,Bx2,By2) {
		return (Ax1 < Bx2 && Ax2 > Bx1 && Ay1 < By2 && Ay2 > By1);
	}

	function rectangleOcclusion(Ax1,Ay1,Ax2,Ay2,Bx1,By1,Bx2,By2) {
		return (Ax1 >= Bx1 && Ax2 <= Bx2 && Ay1 >= By1 && Ay2 <= By2);
	}

	function pointInArea(x,y,area) {
		return (x >= area.x1 && x <= area.x2 && y >= area.y1 && y <= area.y2);
	}

})();
