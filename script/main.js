"use strict";

module.exports.main = function main(param) {
	var scene = new g.Scene({
		game: g.game,
		assetIds: ["se", "jump_girl", "item_drink1", "item_drink2", "arrow", "background", "block", "dialog", "girl_face"]
	});

	var introDuration = 10;
	var playDuration = 80;
	var resultDuration = 5;
	var totalTimeLimit = introDuration + playDuration + resultDuration;

	g.game.vars.gameState = { score: 0 };

	scene.onLoad.add(function () {
		var box2d = require("@akashic-extension/akashic-box2d");
		var pl = box2d.Box2DWeb.Dynamics.b2BodyDef;
		var bodyType = box2d.Box2DWeb.Dynamics.b2Body;
		var fixtureDef = box2d.Box2DWeb.Dynamics.b2FixtureDef;
		var polygonShape = box2d.Box2DWeb.Collision.Shapes.b2PolygonShape;
		var vec2 = box2d.Box2DWeb.Common.Math.b2Vec2;

		var world = new box2d.Box2D({
			scene: scene,
			gravity: [0, 18],
			scale: 50,
			sleep: true
		});

		var random = (param && param.random) ? param.random : g.game.random;
		var backgroundImage = scene.asset.getImageById("background");
		var dialogImage = scene.asset.getImageById("dialog");
		var faceImage = scene.asset.getImageById("girl_face");

		var font = new g.DynamicFont({
			game: g.game,
			size: 36,
			fontFamily: "sans-serif"
		});

		var bg = new g.Sprite({
			scene: scene,
			src: backgroundImage,
			x: 0,
			y: 0,
			width: g.game.width,
			height: g.game.height,
			srcX: 0,
			srcY: 80,
			srcWidth: backgroundImage.width,
			srcHeight: 864
		});
		scene.append(bg);

		var worldBottom = g.game.height + 300;
		var maxHeight = 0;
		var elapsed = 0;
		var ended = false;

		var worldLayer = new g.E({ scene: scene, x: 0, y: 0, width: g.game.width, height: g.game.height * 8 });
		scene.append(worldLayer);

		var uiTop = new g.FilledRect({
			scene: scene,
			x: 0,
			y: 0,
			width: g.game.width,
			height: 72,
			cssColor: "rgba(255,255,255,0.8)"
		});
		scene.append(uiTop);

		var heightLabel = new g.Label({ scene: scene, x: 16, y: 16, font: font, fontSize: 28, textColor: "#203040", text: "高度: 0" });
		scene.append(heightLabel);
		var jumpPowerLabel = new g.Label({ scene: scene, x: 300, y: 16, font: font, fontSize: 28, textColor: "#203040", text: "ジャンプ力: 1" });
		scene.append(jumpPowerLabel);
		var airJumpLabel = new g.Label({ scene: scene, x: 620, y: 16, font: font, fontSize: 28, textColor: "#203040", text: "空中ジャンプ: 1/1" });
		scene.append(airJumpLabel);
		var timeLabel = new g.Label({ scene: scene, x: 980, y: 16, font: font, fontSize: 28, textColor: "#203040", text: "TIME: " + playDuration });
		scene.append(timeLabel);
		var guideLabel = new g.Label({ scene: scene, x: 16, y: g.game.height - 44, font: font, fontSize: 24, textColor: "#203040", text: "タップでジャンプ。上へ登り続けよう" });
		scene.append(guideLabel);

		var dialogScale = g.game.width / dialogImage.width;
		var dialogWidth = Math.ceil(dialogImage.width * dialogScale);
		var dialogHeight = Math.ceil(dialogImage.height * dialogScale);
		var dialogX = Math.floor((g.game.width - dialogWidth) / 2);
		var dialogY = Math.floor((g.game.height - dialogHeight) / 2);
		function scaledRect(x, y, w, h) {
			return {
				x: dialogX + Math.floor(x * dialogScale),
				y: dialogY + Math.floor(y * dialogScale),
				w: Math.floor(w * dialogScale),
				h: Math.floor(h * dialogScale)
			};
		}

		var dialogLayer = new g.E({ scene: scene, x: 0, y: 0, width: g.game.width, height: g.game.height });
		var dialogBg = new g.Sprite({
			scene: scene,
			src: dialogImage,
			x: dialogX,
			y: dialogY,
			width: dialogWidth,
			height: dialogHeight,
			srcWidth: dialogImage.width,
			srcHeight: dialogImage.height
		});
		dialogLayer.append(dialogBg);
		var faceRect = scaledRect(30, 50, 360, 360);
		var dialogFace = new g.Sprite({
			scene: scene,
			src: faceImage,
			x: faceRect.x,
			y: faceRect.y,
			width: faceRect.w,
			height: faceRect.h,
			srcWidth: faceImage.width,
			srcHeight: faceImage.height
		});
		dialogLayer.append(dialogFace);
		var textRect = scaledRect(520, 100, 1380, 400);
		textRect.w = Math.min(textRect.w, g.game.width - textRect.x - 32);
		textRect.h = Math.min(textRect.h, g.game.height - textRect.y - 16);
		var dialogLines = [];
		var dialogFontSize = 42;
		var dialogLineGap = 8;
		var dialogLineHeight = dialogFontSize + dialogLineGap;
		var dialogMessages = [
			"よおおおおおおし！！！！！！！上まで飛ぶぞおおおおおお！！！！！！！！",
			"タップでジャンプするからね！！！空中ジャンプも0になるまでできるよ！！！",
			"あと、青のドリンクでジャンプ力が上がって、紫のドリンクで空中ジャンプ回数が増えるよ！！！",
			"それじゃあぁぁぁ、いくぞおおおおおおおおお！！！！！！"
		];
		var currentDialogIndex = -1;
		var maxDialogCharsPerLine = Math.max(1, Math.floor(textRect.w / dialogFontSize));

		function updateDialogText(messageIndex) {
			if (messageIndex === currentDialogIndex) return;
			currentDialogIndex = messageIndex;
			for (var i = 0; i < dialogLines.length; i++) {
				dialogLines[i].destroy();
			}
			dialogLines = [];
			var message = dialogMessages[messageIndex];
			var lineCount = Math.ceil(message.length / maxDialogCharsPerLine);
			for (var li = 0; li < lineCount; li++) {
				var lineText = message.slice(li * maxDialogCharsPerLine, (li + 1) * maxDialogCharsPerLine);
				var line = new g.Label({
					scene: scene,
					x: textRect.x,
					y: textRect.y + li * dialogLineHeight,
					font: font,
					fontSize: dialogFontSize,
					textColor: "#ffffff",
					text: lineText
				});
				dialogLayer.append(line);
				dialogLines.push(line);
			}
		}

		updateDialogText(0);
		scene.append(dialogLayer);

		function createStaticRect(x, y, w, h) {
			var bd = new pl();
			bd.type = bodyType.b2_staticBody;
			bd.position = new vec2((x + w / 2) / 50, (y + h / 2) / 50);
			var fd = new fixtureDef();
			fd.density = 1.0;
			fd.friction = 0.8;
			fd.restitution = 0.1;
			fd.shape = new polygonShape();
			fd.shape.SetAsBox((w / 2) / 50, (h / 2) / 50);
			world.world.CreateBody(bd).CreateFixture(fd);
		}

		function createDynamicCircle(x, y, r) {
			var bd = new pl();
			bd.type = bodyType.b2_dynamicBody;
			bd.position = new vec2(x / 50, y / 50);
			bd.fixedRotation = true;
			var fd = new fixtureDef();
			fd.density = 1.0;
			fd.friction = 0.4;
			fd.restitution = 0.0;
			fd.shape = new box2d.Box2DWeb.Collision.Shapes.b2CircleShape(r / 50);
			var body = world.world.CreateBody(bd);
			body.CreateFixture(fd);
			return body;
		}

		var girlImage = scene.asset.getImageById("jump_girl");
		var itemJumpImage = scene.asset.getImageById("item_drink1");
		var itemAirImage = scene.asset.getImageById("item_drink2");
		var arrowImage = scene.asset.getImageById("arrow");
		var blockImage = scene.asset.getImageById("block");

		var girlScale = 1 / 3;
		var playerWidth = Math.floor(213 * girlScale);
		var playerHeight = Math.floor(291 * girlScale);
		var playerHalfW = Math.floor(playerWidth / 2);
		var playerHalfH = Math.floor(playerHeight / 2);
		var playerBodyRadius = Math.floor(Math.min(playerWidth, playerHeight) * 0.35);
		var playerVisualBottomOffset = playerBodyRadius - playerHalfH - 2;
		var minPlatformGap = Math.ceil(playerHeight * 2.0);
		var minAimUpwardPixels = Math.max(36, Math.floor(playerHeight * 0.4));
		var arrowHeight = Math.floor(playerHeight * 0.5);
		var arrowWidth = Math.floor(arrowHeight * arrowImage.width / arrowImage.height);
		var arrowHalfH = Math.floor(arrowHeight / 2);
		var arrowOffsetY = playerHalfH + arrowHalfH + 8;

		var itemScale = 1 / 20;
		var itemW = Math.max(8, Math.floor(itemJumpImage.width * itemScale));
		var itemH = Math.max(8, Math.floor(itemJumpImage.height * itemScale));
		var itemHalfW = Math.floor(itemW / 2);
		var itemHalfH = Math.floor(itemH / 2);

		var groundY = 620;
		createStaticRect(0, groundY, g.game.width, 40);
		worldLayer.append(new g.FilledRect({ scene: scene, x: 0, y: groundY, width: g.game.width, height: 40, cssColor: "#6b7a8f" }));

		createStaticRect(-20, -6000, 20, worldBottom + 7000);
		createStaticRect(g.game.width, -6000, 20, worldBottom + 7000);

		var platforms = [];
		var platformEntities = [];
		var items = [];
		var itemEntities = [];
		var highestGeneratedY = groundY - 140;
		var lastItemBand = -1;

		function addPlatform(x, y, w, h) {
			createStaticRect(x, y, w, h);
			platforms.push({ x: x, y: y, w: w, h: h });
			var e = new g.E({ scene: scene, x: x, y: y, width: w, height: h });
			var tileX = 0;
			while (tileX < w) {
				var tileW = Math.min(blockImage.width, w - tileX);
				e.append(new g.Sprite({
					scene: scene,
					src: blockImage,
					x: tileX,
					y: 0,
					width: tileW,
					height: h,
					srcX: 0,
					srcY: 0,
					srcWidth: tileW,
					srcHeight: blockImage.height
				}));
				tileX += tileW;
			}
			worldLayer.append(e);
			platformEntities.push(e);
		}

		function tryAddExtraPlatform(y, existingPlatforms) {
			if (random.generate() > 0.72) return;
			var w = 150 + Math.floor(random.generate() * 110);
			var margin = 40;
			var minSeparation = 56;
			var ranges = [{ left: margin, right: g.game.width - margin - w }];
			for (var i = 0; i < existingPlatforms.length; i++) {
				var blockedLeft = existingPlatforms[i].x - (w + minSeparation);
				var blockedRight = existingPlatforms[i].x + existingPlatforms[i].w + minSeparation;
				var nextRanges = [];
				for (var r = 0; r < ranges.length; r++) {
					var range = ranges[r];
					if (blockedRight <= range.left || blockedLeft >= range.right) {
						nextRanges.push(range);
						continue;
					}
					if (blockedLeft > range.left) {
						nextRanges.push({ left: range.left, right: blockedLeft });
					}
					if (blockedRight < range.right) {
						nextRanges.push({ left: blockedRight, right: range.right });
					}
				}
				ranges = nextRanges;
				if (ranges.length === 0) return;
			}

			var candidates = [];
			for (var c = 0; c < ranges.length; c++) {
				if (ranges[c].right >= ranges[c].left) {
					candidates.push(ranges[c]);
				}
			}
			if (candidates.length === 0) return;
			var chosen = candidates[Math.floor(random.generate() * candidates.length)];
			var x = chosen.left;
			if (chosen.right > chosen.left) {
				x += Math.floor(random.generate() * (chosen.right - chosen.left + 1));
			}
			addPlatform(x, y, w, 24);
		}

		function addItem(x, y, type) {
			var image = type === "jump" ? itemJumpImage : itemAirImage;
			var e = new g.Sprite({
				scene: scene,
				src: image,
				x: x - itemHalfW,
				y: y - itemHalfH,
				width: itemW,
				height: itemH,
				srcWidth: image.width,
				srcHeight: image.height
			});
			worldLayer.append(e);
			items.push({ x: x, y: y, type: type, active: true });
			itemEntities.push(e);
		}

		function spawnItemsForBand(bandIndex, bandTopY, bandBottomY) {
			var count = 1 + Math.floor(random.generate() * 3);
			for (var n = 0; n < count; n++) {
				var candidates = [];
				for (var p = 0; p < platforms.length; p++) {
					if (platforms[p].y >= bandTopY - 120 && platforms[p].y <= bandBottomY + 40) {
						candidates.push(platforms[p]);
					}
				}
				if (candidates.length === 0) continue;
				var pf = candidates[Math.floor(random.generate() * candidates.length)];
				var ix = pf.x + itemHalfW + 20 + Math.floor(random.generate() * Math.max(1, pf.w - (itemW + 40)));
				var r = random.generate();
				var type = (r < 0.78) ? "jump" : "air";
				addItem(ix, pf.y - itemHalfH, type);
			}
			lastItemBand = bandIndex;
		}

		function generateUntil(targetY) {
			while (highestGeneratedY > targetY) {
				var heightFromGround = groundY - highestGeneratedY;
				var gapMin = Math.max(minPlatformGap, playerHeight + 40);
				var gapMax = Math.max(gapMin + 40, playerHeight + 150);
				if (heightFromGround > 1200) {
					gapMin += 20;
					gapMax += 30;
				}
				if (heightFromGround > 2400) {
					gapMin += 20;
					gapMax += 30;
				}
				if (heightFromGround > 3600) {
					gapMin += 20;
					gapMax += 30;
				}

				var gap = gapMin + Math.floor(random.generate() * (gapMax - gapMin + 1));
				highestGeneratedY -= gap;
				var w = 180 + Math.floor(random.generate() * 140);
				var x = 40 + Math.floor(random.generate() * (g.game.width - w - 80));
				addPlatform(x, highestGeneratedY, w, 24);
				tryAddExtraPlatform(highestGeneratedY, [{ x: x, w: w }]);

				var bandIndex = Math.floor((groundY - highestGeneratedY) / g.game.height);
				if (bandIndex > lastItemBand) {
					var bandTopY = groundY - (bandIndex + 1) * g.game.height;
					var bandBottomY = groundY - bandIndex * g.game.height;
					spawnItemsForBand(bandIndex, bandTopY, bandBottomY);
				}
			}
		}

		generateUntil(-2200);

		function getPlayerScreenPosition() {
			var pos = playerBody.GetPosition();
			return {
				x: pos.x * 50 + worldLayer.x,
				y: pos.y * 50 + worldLayer.y + playerVisualBottomOffset
			};
		}

		function launchPlayerToward(point) {
			var playerScreenPos = getPlayerScreenPosition();
			var aimX = point.x - playerScreenPos.x;
			var aimY = point.y - playerScreenPos.y;
			if (aimY > -minAimUpwardPixels) {
				aimY = -minAimUpwardPixels;
			}

			var angle = Math.atan2(aimY, aimX);
			aimArrowAngle = angle * 180 / Math.PI + 90;
			var jumpSpeedY = 14.4 + (jumpPowerLevel - 1) * 0.45;
			var jumpSpeedX = 6.2 + (jumpPowerLevel - 1) * 0.2;
			var horizontalRatio = Math.cos(angle);
			var upwardRatio = Math.max(0.82, -Math.sin(angle));
			var vx = horizontalRatio * jumpSpeedX;
			var vy = -upwardRatio * jumpSpeedY;
			var pxNow = playerBody.GetPosition().x * 50;
			if (vx > 0 && pxNow > g.game.width - (playerHalfW + 12)) vx = 0;
			if (vx < 0 && pxNow < (playerHalfW + 12)) vx = 0;
			playerBody.SetAwake(true);
			playerBody.SetActive(true);
			playerBody.SetLinearVelocity(new vec2(vx, vy));
		}

		var playerStartX = g.game.width / 2;
		var playerStartY = groundY - playerBodyRadius;
		var playerBody = createDynamicCircle(playerStartX, playerStartY, playerBodyRadius);
		var aimArrowAngle = 0;
		var player = new g.Sprite({
			scene: scene,
			src: girlImage,
			x: playerStartX,
			y: playerStartY,
			width: playerWidth,
			height: playerHeight,
			anchorX: 0.5,
			anchorY: 0.5,
			srcX: 40,
			srcY: 456,
			srcWidth: 213,
			srcHeight: 291,
			touchable: true
		});
		worldLayer.append(player);
		var aimArrow = new g.Sprite({
			scene: scene,
			src: arrowImage,
			x: playerStartX,
			y: playerStartY + playerVisualBottomOffset - arrowOffsetY,
			width: arrowWidth,
			height: arrowHeight,
			anchorX: 0.5,
			anchorY: 0.5,
			srcWidth: arrowImage.width,
			srcHeight: arrowImage.height
		});
		worldLayer.append(aimArrow);
		playerBody.SetLinearVelocity(new vec2(0, 0));

		var jumpPowerLevel = 1;
		var baseAirJumpMax = 1;
		var airJumpMax = baseAirJumpMax;
		var airJumpStock = airJumpMax;
		var wasGrounded = false;
		var canRecoverAirJump = true;
		var facingLeft = false;

		var resultBg = new g.FilledRect({ scene: scene, x: 180, y: 180, width: g.game.width - 360, height: 260, cssColor: "rgba(0,0,0,0.7)" });
		resultBg.hide(); scene.append(resultBg);
		var resultLabel = new g.Label({ scene: scene, x: 220, y: 230, font: font, fontSize: 40, textColor: "#ffffff", text: "" });
		resultLabel.hide(); scene.append(resultLabel);
		var retryLabel = new g.Label({ scene: scene, x: 220, y: 300, font: font, fontSize: 28, textColor: "#ffffff", text: "画面タップで終了" });
		retryLabel.hide(); scene.append(retryLabel);

		scene.onPointDownCapture.add(function (ev) {
			if (ended) return;
			if (elapsed < introDuration || elapsed >= introDuration + playDuration) return;
			var grounded = wasGrounded;
			if (!grounded && airJumpStock <= 0) {
				return;
			}

			launchPlayerToward(ev.point);

			if (!grounded && airJumpStock > 0) {
				airJumpStock -= 1;
			}
			if (grounded) {
				canRecoverAirJump = false;
			}
		});

		function finishGame() {
			if (ended) return;
			ended = true;
			g.game.vars.gameState.score = Math.max(0, Math.floor(maxHeight));
			resultBg.show();
			resultLabel.text = "到達高度: " + Math.floor(maxHeight);
			resultLabel.invalidate();
			resultLabel.show();
			retryLabel.show();
		}

		scene.onUpdate.add(function () {
			if (ended) return;
			elapsed += 1 / g.game.fps;
			if (elapsed < introDuration) {
				var dialogIndex = Math.min(dialogMessages.length - 1, Math.floor(elapsed / (introDuration / dialogMessages.length)));
				updateDialogText(dialogIndex);
				return;
			}
			dialogLayer.hide();
			if (elapsed >= totalTimeLimit) return finishGame();

			var playElapsed = elapsed - introDuration;
			var remain = Math.max(0, Math.ceil(playDuration - playElapsed));
			timeLabel.text = "TIME: " + remain;
			timeLabel.invalidate();
			if (playElapsed >= playDuration) return finishGame();

			world.step(1 / g.game.fps);
			var pos = playerBody.GetPosition();
			var px = pos.x * 50;
			var py = pos.y * 50;
			player.x = px;
			player.y = py + playerVisualBottomOffset;
			aimArrow.x = px;
			aimArrow.y = player.y - arrowOffsetY;
			aimArrow.angle = aimArrowAngle;
			aimArrow.modified();

			var vxNow = playerBody.GetLinearVelocity().x;
			if (vxNow < -0.05) {
				facingLeft = true;
			} else if (vxNow > 0.05) {
				facingLeft = false;
			}
			player.scaleX = facingLeft ? -1 : 1;

			var vy = playerBody.GetLinearVelocity().y;
			if (wasGrounded) {
				player.srcX = 40; player.srcY = 456; player.srcWidth = 213; player.srcHeight = 291;
			} else if (vy < -4.0) {
				player.srcX = 311; player.srcY = 404; player.srcWidth = 244; player.srcHeight = 343;
			} else if (vy < -1.0) {
				player.srcX = 604; player.srcY = 348; player.srcWidth = 232; player.srcHeight = 399;
			} else if (vy <= 1.0) {
				player.srcX = 857; player.srcY = 200; player.srcWidth = 214; player.srcHeight = 547;
			} else {
				player.srcX = 1144; player.srcY = 370; player.srcWidth = 208; player.srcHeight = 377;
			}
			player.modified();

			var groundedNow = false;
			if (vy > -0.6 && vy < 0.6) {
				var footY = py + playerBodyRadius;
				for (var gi = 0; gi < platforms.length; gi++) {
					var pf = platforms[gi];
					if (px >= pf.x - playerBodyRadius && px <= pf.x + pf.w + playerBodyRadius) {
						if (Math.abs(footY - pf.y) <= 6) {
							groundedNow = true;
							break;
						}
					}
				}
				if (!groundedNow && px >= -playerBodyRadius && px <= g.game.width + playerBodyRadius) {
					if (Math.abs(footY - groundY) <= 6) {
						groundedNow = true;
					}
				}
			}
			if (!wasGrounded && groundedNow && canRecoverAirJump) {
				airJumpStock = airJumpMax;
			}
			if (!groundedNow) {
				canRecoverAirJump = true;
			}
			wasGrounded = groundedNow;

			for (var i = 0; i < items.length; i++) {
				if (!items[i].active) continue;
				var dx = items[i].x - px;
				var dy = items[i].y - py;
				var hitR = Math.max(playerHalfW, playerHalfH) + Math.max(itemHalfW, itemHalfH);
				if (dx * dx + dy * dy < hitR * hitR) {
					items[i].active = false;
					itemEntities[i].hide();
					if (items[i].type === "jump") {
						jumpPowerLevel += 1;
					} else {
						airJumpMax += 1;
						airJumpStock += 1;
					}
				}
			}

			var targetCameraY = g.game.height * 0.6 - py;
			if (targetCameraY < 0) targetCameraY = 0;
			worldLayer.y = targetCameraY;
			worldLayer.modified();

			generateUntil(py - 1400);

			var currentHeight = Math.max(0, Math.floor(groundY - py));
			if (currentHeight > maxHeight) maxHeight = currentHeight;
			heightLabel.text = "高度: " + Math.floor(maxHeight);
			heightLabel.invalidate();
			jumpPowerLabel.text = "ジャンプ力: " + jumpPowerLevel;
			jumpPowerLabel.invalidate();
			airJumpLabel.text = "空中ジャンプ: " + airJumpStock + "/" + airJumpMax;
			airJumpLabel.invalidate();

			if (py > worldBottom + 120) return finishGame();
		});
	});

	g.game.pushScene(scene);
};
