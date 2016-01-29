var Face = (function Face(){
	"use strict";

	var face = {
			src: "images/face.svg",
			width: 300,
			height: 300,
			scaled: {
				cnv: document.createElement("canvas"),
				ctx: null,
			},
		},
		obj = {
			cnv: document.createElement("canvas"),
			ctx: null,
		},
		publicAPI;


	face.scaled.ctx = face.scaled.cnv.getContext("2d");
	obj.ctx = obj.cnv.getContext("2d");

	publicAPI = {
		scaleTo: scaleTo,
		load: load,
		getFace: getFace,
	};

	return publicAPI;


	// ******************************

	function load() {
		return Utils.loadImgOnEntry(face);
	}

	function scaleTo(faceWidth) {
		if (faceWidth !== face.scaled.width) {
			face.scaled.width = face.scaled.height = faceWidth;

			// update scaled image
			face.scaled.cnv.width = face.scaled.width;
			face.scaled.cnv.height = face.scaled.height;
			face.scaled.ctx.drawImage(
				face.img,
				0,0,face.scaled.width,face.scaled.height
			);
		}
	}

	function getFace(angle) {
		obj.width = obj.height = face.scaled.width;
		obj.cnv.width = obj.cnv.height = obj.width;

		obj.ctx.save();
		Utils.rotateCanvas(obj.ctx,obj.width/2,obj.height/2,angle);
		obj.ctx.drawImage(face.scaled.cnv,0,0);
		obj.ctx.restore();

		return obj;
	}

})();
