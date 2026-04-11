"use strict";

module.exports.main = function main(param) {
	var scene = new g.Scene({
		game: g.game,
		assetIds: ["jump_girl", "item_drink1", "item_drink2", "arrow", "background", "block", "dialog", "girl_face", "bgm", "se_jump", "se_landing", "se_down", "se_item"]
	});

	var introDuration = 15;
	var playDuration = 80;
	var resultDuration = 5;
	var totalTimeLimit = introDuration + playDuration + resultDuration;

	g.game.vars.gameState = { score: 0 };

	scene.onLoad.add(function () {
		var random = (param && param.random) ? param.random : g.game.random;
		var backgroundImage = scene.asset.getImageById("background");
		var dialogImage = scene.asset.getImageById("dialog");
		var faceImage = scene.asset.getImageById("girl_face");
		var girlImage = scene.asset.getImageById("jump_girl");
		var itemJumpImage = scene.asset.getImageById("item_drink1");
		var itemAirImage = scene.asset.getImageById("item_drink2");
		var arrowImage = scene.asset.getImageById("arrow");
		var blockImage = scene.asset.getImageById("block");
		var bgmAsset = scene.asset.getAudioById("bgm");
		var jumpSeAsset = scene.asset.getAudioById("se_jump");
		var landingSeAsset = scene.asset.getAudioById("se_landing");
		var downSeAsset = scene.asset.getAudioById("se_down");
		var itemSeAsset = scene.asset.getAudioById("se_item");

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

		var maxHeight = 0;
		var elapsed = 0;
		var ended = false;
		var groundY = 620;
		var worldBottom = g.game.height + 300;

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

		var currentHeightLabel = new g.Label({ scene: scene, x: 16, y: 16, font: font, fontSize: 28, textColor: "#203040", text: "現在高度: 0" });
		scene.append(currentHeightLabel);
		var maxHeightLabel = new g.Label({ scene: scene, x: 300, y: 16, font: font, fontSize: 28, textColor: "#203040", text: "最高高度: 0" });
		scene.append(maxHeightLabel);
		var jumpPowerLabel = new g.Label({ scene: scene, x: 590, y: 16, font: font, fontSize: 28, textColor: "#203040", text: "ジャンプ力: 1" });
		scene.append(jumpPowerLabel);
		var airJumpLabel = new g.Label({ scene: scene, x: 840, y: 16, font: font, fontSize: 28, textColor: "#203040", text: "空中ジャンプ: 1/1" });
		scene.append(airJumpLabel);
		var timeLabel = new g.Label({ scene: scene, x: 1120, y: 16, font: font, fontSize: 28, textColor: "#203040", text: "TIME: " + playDuration });
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
		var dialogFontSize = 40;
		var dialogLineGap = 8;
		var dialogLineHeight = dialogFontSize + dialogLineGap;
		var dialogMessages = [
			"よおおおおおおし！！！！！！！上まで飛ぶぞおおおおおお！！！！！！！",
			"タップした方向めがけてジャンプするからね！！！",
			"空中ジャンプも0になるまでできるよ！！！回数は着地する時に回復するから安心して！！！",
			"青のドリンクでジャンプ力が増えて、紫のドリンクで空中ジャンプ回数が増えるよ！！！",
			"それじゃあぁぁぁ、いくぞおおおおおおおおお！！！！！！！"
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
		var dialogVisible = true;

		var bgmPlayer = bgmAsset.play();
		if (bgmPlayer) {
			bgmPlayer.changeVolume(0.35);
		}

		worldLayer.append(new g.FilledRect({ scene: scene, x: 0, y: groundY, width: g.game.width, height: 40, cssColor: "#6b7a8f" }));

		var girlScale = 1 / 3;
		var playerWidth = Math.floor(213 * girlScale);
		var playerHeight = Math.floor(291 * girlScale);
		var playerHalfW = Math.floor(playerWidth / 2);
		var playerHalfH = Math.floor(playerHeight / 2);
		var playerBodyRadius = Math.floor(Math.min(playerWidth, playerHeight) * 0.35);
		var platformGripMargin = Math.max(2, Math.floor(playerBodyRadius * 0.1));
		var minWallPlatformGap = Math.ceil(playerWidth * 1.2);
		var playerVisualBottomOffset = playerBodyRadius - playerHalfH - 2;
		var minPlatformGap = Math.ceil(playerHeight * 2.0);
		var minAimUpwardPixels = Math.max(36, Math.floor(playerHeight * 0.4));
		var arrowHeight = Math.floor(playerHeight * 0.5);
		var arrowWidth = Math.floor(arrowHeight * arrowImage.width / arrowImage.height);
		var arrowHalfH = Math.floor(arrowHeight / 2);
		var arrowOffsetY = playerHalfH + arrowHalfH + 8;

		var targetItemHeight = Math.max(8, Math.floor(1536 / 20));
		var itemScale = targetItemHeight / itemJumpImage.height;
		var itemW = Math.max(8, Math.floor(itemJumpImage.width * itemScale));
		var itemH = Math.max(8, Math.floor(itemJumpImage.height * itemScale));
		var itemHalfW = Math.floor(itemW / 2);
		var itemHalfH = Math.floor(itemH / 2);

		var gravity = 1.0;
		var maxFallSpeed = 28;
		var groundFriction = 0.72;
		var airFriction = 0.995;
		var landingFriction = 0.5;
		var wallBounceDamping = 0;
		var landingTolerance = 10;
		var sideOverlapInset = 3;

		var platforms = [];
		var items = [];
		var highestGeneratedY = groundY - 140;
		var lastItemBand = -1;
		var platformSurfaceCache = {};
		var guaranteedAirMilestones = [
			{ height: 1500, placed: false },
			{ height: 4000, placed: false }
		];

		function getPlatformSurface(w, h) {
			var cacheKey = w + "x" + h;
			if (platformSurfaceCache[cacheKey]) return platformSurfaceCache[cacheKey];

			var surface = scene.game.resourceFactory.createSurface(w, h);
			var renderer = surface.renderer();
			var blockSurface = blockImage.asSurface();
			var tileX = 0;

			renderer.begin();
			while (tileX < w) {
				var tileW = Math.min(blockImage.width, w - tileX);
				renderer.drawImage(blockSurface, 0, 0, tileW, blockImage.height, tileX, 0);
				tileX += tileW;
			}
			renderer.end();

			platformSurfaceCache[cacheKey] = surface;
			return surface;
		}

		function addPlatform(x, y, w, h) {
			var entity = new g.Sprite({
				scene: scene,
				src: getPlatformSurface(w, h),
				x: x,
				y: y,
				width: w,
				height: h,
				srcWidth: w,
				srcHeight: h
			});
			worldLayer.append(entity);
			platforms.push({ x: x, y: y, w: w, h: h, entity: entity, visible: true });
		}

		function normalizePlatformX(x, w) {
			if (x < minWallPlatformGap) x = 0;
			if (g.game.width - (x + w) < minWallPlatformGap) x = g.game.width - w;
			if (x < 0) x = 0;
			if (x > g.game.width - w) x = g.game.width - w;
			return x;
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
					if (blockedLeft > range.left) nextRanges.push({ left: range.left, right: blockedLeft });
					if (blockedRight < range.right) nextRanges.push({ left: blockedRight, right: range.right });
				}
				ranges = nextRanges;
				if (ranges.length === 0) return;
			}

			var candidates = [];
			for (var c = 0; c < ranges.length; c++) {
				if (ranges[c].right >= ranges[c].left) candidates.push(ranges[c]);
			}
			if (candidates.length === 0) return;
			var chosen = candidates[Math.floor(random.generate() * candidates.length)];
			var x = chosen.left;
			if (chosen.right > chosen.left) {
				x += Math.floor(random.generate() * (chosen.right - chosen.left + 1));
			}
			x = normalizePlatformX(x, w);
			addPlatform(x, y, w, 24);
		}

		function addItem(x, y, type) {
			var image = type === "jump" ? itemJumpImage : itemAirImage;
			var entity = new g.Sprite({
				scene: scene,
				src: image,
				x: x - itemHalfW,
				y: y - itemHalfH,
				width: itemW,
				height: itemH,
				srcWidth: image.width,
				srcHeight: image.height
			});
			worldLayer.append(entity);
			items.push({ x: x, y: y, type: type, active: true, entity: entity, visible: true });
		}

		function addGuaranteedAirItemOnPlatform(pf) {
			var ix = pf.x + Math.floor(pf.w / 2);
			var minItemX = pf.x + itemHalfW + 12;
			var maxItemX = pf.x + pf.w - itemHalfW - 12;
			if (ix < minItemX) ix = minItemX;
			if (ix > maxItemX) ix = maxItemX;
			addItem(ix, pf.y - itemHalfH, "air");
		}

		function placeGuaranteedAirItems(primaryPlatform) {
			var currentHeight = groundY - primaryPlatform.y;
			for (var i = 0; i < guaranteedAirMilestones.length; i++) {
				if (!guaranteedAirMilestones[i].placed && currentHeight >= guaranteedAirMilestones[i].height) {
					addGuaranteedAirItemOnPlatform(primaryPlatform);
					guaranteedAirMilestones[i].placed = true;
				}
			}
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

		function generateUntil(targetY, maxSteps) {
			var steps = 0;
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
				x = normalizePlatformX(x, w);
				addPlatform(x, highestGeneratedY, w, 24);
				placeGuaranteedAirItems({ x: x, y: highestGeneratedY, w: w });
				tryAddExtraPlatform(highestGeneratedY, [{ x: x, w: w }]);

				var bandIndex = Math.floor((groundY - highestGeneratedY) / g.game.height);
				if (bandIndex > lastItemBand) {
					var bandTopY = groundY - (bandIndex + 1) * g.game.height;
					var bandBottomY = groundY - bandIndex * g.game.height;
					spawnItemsForBand(bandIndex, bandTopY, bandBottomY);
				}

				steps += 1;
				if (maxSteps && steps >= maxSteps) break;
			}
		}

		generateUntil(-700);
		updateWorldVisibility();

		var playerStartX = g.game.width / 2;
		var playerStartY = groundY - playerBodyRadius;
		var baseHeightY = playerStartY;
		var playerState = {
			x: playerStartX,
			y: playerStartY,
			vx: 0,
			vy: 0
		};
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

		var jumpPowerLevel = 1;
		var baseAirJumpMax = 1;
		var airJumpMax = baseAirJumpMax;
		var airJumpStock = airJumpMax;
		var wasGrounded = true;
		var canRecoverAirJump = false;
		var facingLeft = false;
		var airborneMinY = playerStartY;
		var downSePlayed = false;
		var lastTimeText = "TIME: " + playDuration;
		var lastCurrentHeightText = "現在高度: 0";
		var lastMaxHeightText = "最高高度: 0";
		var lastJumpPowerText = "ジャンプ力: 1";
		var lastAirJumpText = "空中ジャンプ: 1/1";
		var lastWorldLayerY = worldLayer.y;
		var visibilityUpdateFrame = 0;
		var visibilityMargin = 240;
		var currentPlayerMotion = "ground";
		var lastAimArrowAngle = aimArrowAngle;

		function setPlayerMotion(motionName) {
			if (motionName === currentPlayerMotion) return;
			currentPlayerMotion = motionName;
			if (motionName === "ground") {
				player.srcX = 40;
				player.srcY = 456;
				player.srcWidth = 213;
				player.srcHeight = 291;
			} else if (motionName === "riseFast") {
				player.srcX = 311;
				player.srcY = 404;
				player.srcWidth = 244;
				player.srcHeight = 343;
			} else if (motionName === "riseSlow") {
				player.srcX = 604;
				player.srcY = 348;
				player.srcWidth = 232;
				player.srcHeight = 399;
			} else if (motionName === "apex") {
				player.srcX = 857;
				player.srcY = 200;
				player.srcWidth = 214;
				player.srcHeight = 547;
			} else {
				player.srcX = 1144;
				player.srcY = 370;
				player.srcWidth = 208;
				player.srcHeight = 377;
			}
			player.modified();
		}

		function resolvePlayerMotion(groundedNow, vy) {
			if (groundedNow) return "ground";
			if (currentPlayerMotion === "riseFast") {
				if (vy < -2.0) return "riseFast";
				if (vy < 0.8) return "riseSlow";
				if (vy <= 2.0) return "apex";
				return "fall";
			}
			if (currentPlayerMotion === "riseSlow") {
				if (vy < -4.5) return "riseFast";
				if (vy < 0.8) return "riseSlow";
				if (vy <= 2.0) return "apex";
				return "fall";
			}
			if (currentPlayerMotion === "apex") {
				if (vy < -3.0) return "riseFast";
				if (vy < -1.5) return "riseSlow";
				if (vy <= 2.4) return "apex";
				return "fall";
			}
			if (vy < -4.5) return "riseFast";
			if (vy < -1.5) return "riseSlow";
			if (vy <= 1.5) return "apex";
			return "fall";
		}

		function getPlayerScreenPosition() {
			return {
				x: playerState.x + worldLayer.x,
				y: playerState.y + worldLayer.y + playerVisualBottomOffset
			};
		}

		function isStandingOnPlatform(px, py, tolerance, pf) {
			var footY = py + playerBodyRadius;
			return px >= pf.x + platformGripMargin
				&& px <= pf.x + pf.w - platformGripMargin
				&& Math.abs(footY - pf.y) <= tolerance;
		}

		function getNearbyPlatforms(py, topMargin, bottomMargin) {
			var nearbyPlatforms = [];
			var minY = py - topMargin;
			var maxY = py + bottomMargin;
			for (var i = 0; i < platforms.length; i++) {
				var pf = platforms[i];
				if (pf.y + pf.h < minY || pf.y > maxY) continue;
				nearbyPlatforms.push(pf);
			}
			return nearbyPlatforms;
		}

		function updateWorldVisibility() {
			var worldViewTop = -worldLayer.y - visibilityMargin;
			var worldViewBottom = -worldLayer.y + g.game.height + visibilityMargin;

			for (var i = 0; i < platforms.length; i++) {
				var pf = platforms[i];
				var shouldShow = pf.y + pf.h >= worldViewTop && pf.y <= worldViewBottom;
				if (shouldShow !== pf.visible) {
					pf.visible = shouldShow;
					if (shouldShow) {
						pf.entity.show();
					} else {
						pf.entity.hide();
					}
				}
			}

			for (var j = 0; j < items.length; j++) {
				var item = items[j];
				var itemShouldShow = item.active
					&& item.y + itemHalfH >= worldViewTop
					&& item.y - itemHalfH <= worldViewBottom;
				if (itemShouldShow !== item.visible) {
					item.visible = itemShouldShow;
					if (itemShouldShow) {
						item.entity.show();
					} else {
						item.entity.hide();
					}
				}
			}
		}

		function hasPlayerGroundSupport(px, py, tolerance, nearbyPlatforms) {
			var footY = py + playerBodyRadius;
			var targets = nearbyPlatforms || platforms;
			for (var i = 0; i < targets.length; i++) {
				var pf = targets[i];
				if (Math.abs(pf.y - footY) > tolerance + 24) continue;
				if (isStandingOnPlatform(px, py, tolerance, pf)) return true;
			}
			return Math.abs(footY - groundY) <= tolerance;
		}

		function launchPlayerToward(point) {
			var playerScreenPos = getPlayerScreenPosition();
			var aimX = point.x - playerScreenPos.x;
			var aimY = point.y - playerScreenPos.y;
			if (aimY > -minAimUpwardPixels) aimY = -minAimUpwardPixels;

			var angle = Math.atan2(aimY, aimX);
			aimArrowAngle = angle * 180 / Math.PI + 90;

			var jumpSpeedY = 24 + (jumpPowerLevel - 1) * 0.75;
			var jumpSpeedX = 10.5 + (jumpPowerLevel - 1) * 0.35;
			var horizontalRatio = Math.cos(angle);
			var upwardRatio = Math.max(0.82, -Math.sin(angle));
			var vx = horizontalRatio * jumpSpeedX;
			var vy = -upwardRatio * jumpSpeedY;

			if (vx > 0 && playerState.x > g.game.width - (playerHalfW + 12)) vx = 0;
			if (vx < 0 && playerState.x < playerHalfW + 12) vx = 0;

			playerState.vx = vx;
			playerState.vy = vy;
		}

		function resolvePlatformCollisions(previousX, previousY, nearbyPlatforms) {
			var newX = playerState.x;
			var newY = playerState.y;
			var vx = playerState.vx;
			var vy = playerState.vy;
			var previousTop = previousY - playerBodyRadius;
			var previousBottom = previousY + playerBodyRadius;
			var groundedNow = false;
			var landedTop = Number.POSITIVE_INFINITY;
			var targets = nearbyPlatforms || platforms;

			for (var i = 0; i < targets.length; i++) {
				var pf = targets[i];

				var newLeft = newX - playerBodyRadius;
				var newRight = newX + playerBodyRadius;
				var newTop = newY - playerBodyRadius;
				var newBottom = newY + playerBodyRadius;
				var overlapX = newRight > pf.x + sideOverlapInset && newLeft < pf.x + pf.w - sideOverlapInset;
				var overlapY = newBottom > pf.y && newTop < pf.y + pf.h;

				if (vy >= 0 && overlapX && previousBottom <= pf.y + landingTolerance && newBottom >= pf.y) {
					if (newX >= pf.x + platformGripMargin && newX <= pf.x + pf.w - platformGripMargin && pf.y < landedTop) {
						landedTop = pf.y;
						groundedNow = true;
					}
				}

				if (vy < 0 && overlapX && previousTop >= pf.y + pf.h - 2 && newTop <= pf.y + pf.h) {
					newY = pf.y + pf.h + playerBodyRadius;
					vy = 0;
				}

				overlapY = (newY + playerBodyRadius > pf.y + 2 && newY - playerBodyRadius < pf.y + pf.h - 2);
				if (!overlapY) continue;

				if (vx > 0 && previousX + playerBodyRadius <= pf.x && newX + playerBodyRadius > pf.x) {
					newX = pf.x - playerBodyRadius;
					vx = wallBounceDamping;
				} else if (vx < 0 && previousX - playerBodyRadius >= pf.x + pf.w && newX - playerBodyRadius < pf.x + pf.w) {
					newX = pf.x + pf.w + playerBodyRadius;
					vx = -wallBounceDamping;
				}
			}

			if (groundedNow) {
				newY = landedTop - playerBodyRadius;
				vy = 0;
				vx *= landingFriction;
			}

			if (!groundedNow && vy >= 0 && previousBottom <= groundY + landingTolerance && newY + playerBodyRadius >= groundY) {
				newY = groundY - playerBodyRadius;
				vy = 0;
				vx *= landingFriction;
				groundedNow = true;
			}

			playerState.x = newX;
			playerState.y = newY;
			playerState.vx = vx;
			playerState.vy = vy;
			return groundedNow;
		}

		function updatePlayerPhysics() {
			var previousX = playerState.x;
			var previousY = playerState.y;
			var nearbyPlatforms = getNearbyPlatforms(previousY, 180, 220);

			playerState.vy += gravity;
			if (playerState.vy > maxFallSpeed) playerState.vy = maxFallSpeed;

			playerState.x += playerState.vx;
			playerState.y += playerState.vy;

			if (playerState.x < playerBodyRadius) {
				playerState.x = playerBodyRadius;
				if (playerState.vx < 0) playerState.vx = 0;
			}
			if (playerState.x > g.game.width - playerBodyRadius) {
				playerState.x = g.game.width - playerBodyRadius;
				if (playerState.vx > 0) playerState.vx = 0;
			}

			var groundedNow = resolvePlatformCollisions(previousX, previousY, nearbyPlatforms);
			if (!groundedNow) {
				groundedNow = hasPlayerGroundSupport(playerState.x, playerState.y, 4, nearbyPlatforms) && playerState.vy >= 0 && playerState.vy <= 2;
			}

			if (groundedNow) {
				playerState.vx *= groundFriction;
				if (Math.abs(playerState.vx) < 0.05) playerState.vx = 0;
			} else {
				playerState.vx *= airFriction;
			}

			return groundedNow;
		}

		var resultBg = new g.FilledRect({ scene: scene, x: 180, y: 180, width: g.game.width - 360, height: 260, cssColor: "rgba(0,0,0,0.7)" });
		resultBg.hide();
		scene.append(resultBg);
		var resultLabel = new g.Label({ scene: scene, x: 220, y: 230, font: font, fontSize: 40, textColor: "#ffffff", text: "" });
		resultLabel.hide();
		scene.append(resultLabel);

		function finishGame() {
			if (ended) return;
			ended = true;
			g.game.vars.gameState.score = Math.max(0, Math.floor(maxHeight));
			resultBg.show();
			resultLabel.text = "到達高度: " + Math.floor(maxHeight);
			resultLabel.invalidate();
			resultLabel.show();
		}

		scene.onPointDownCapture.add(function (ev) {
			if (ended) return;
			if (elapsed < introDuration || elapsed >= introDuration + playDuration) return;

			var grounded = wasGrounded || (hasPlayerGroundSupport(playerState.x, playerState.y, 14, getNearbyPlatforms(playerState.y, 80, 100)) && playerState.vy <= 3.0);
			if (!grounded && airJumpStock <= 0) return;

			launchPlayerToward(ev.point);
			jumpSeAsset.play();

			if (!grounded && airJumpStock > 0) {
				airJumpStock -= 1;
			}
			if (grounded) {
				canRecoverAirJump = false;
				wasGrounded = false;
			}
		});

		scene.onUpdate.add(function () {
			if (ended) return;
			elapsed += 1 / g.game.fps;

			if (elapsed < introDuration) {
				generateUntil(-1400, 2);
				if (visibilityUpdateFrame % 3 === 0) {
					updateWorldVisibility();
				}
				visibilityUpdateFrame += 1;
				var dialogIndex = Math.min(dialogMessages.length - 1, Math.floor(elapsed / (introDuration / dialogMessages.length)));
				updateDialogText(dialogIndex);
				return;
			}

			if (dialogVisible) {
				dialogLayer.hide();
				dialogVisible = false;
			}

			if (elapsed >= totalTimeLimit) {
				finishGame();
				return;
			}

			var playElapsed = elapsed - introDuration;
			var remain = Math.max(0, Math.ceil(playDuration - playElapsed));
			var timeText = "TIME: " + remain;
			if (timeText !== lastTimeText) {
				lastTimeText = timeText;
				timeLabel.text = timeText;
				timeLabel.invalidate();
			}
			if (playElapsed >= playDuration) {
				finishGame();
				return;
			}

			var groundedNow = updatePlayerPhysics();
			var px = playerState.x;
			var py = playerState.y;
			var vy = playerState.vy;

			if (playerState.vx < -0.05) {
				facingLeft = true;
			} else if (playerState.vx > 0.05) {
				facingLeft = false;
			}

			player.x = px;
			player.y = py + playerVisualBottomOffset;
			player.scaleX = facingLeft ? -1 : 1;
			setPlayerMotion(resolvePlayerMotion(groundedNow, vy));
			player.modified();

			aimArrow.x = px;
			aimArrow.y = player.y - arrowOffsetY;
			if (Math.abs(aimArrowAngle - lastAimArrowAngle) > 0.1) {
				lastAimArrowAngle = aimArrowAngle;
				aimArrow.angle = aimArrowAngle;
			}
			aimArrow.modified();

			if (!wasGrounded && groundedNow && canRecoverAirJump) {
				airJumpStock = airJumpMax;
			}
			if (!wasGrounded && groundedNow) {
				landingSeAsset.play();
				airborneMinY = py;
				downSePlayed = false;
			}
			if (!groundedNow) {
				canRecoverAirJump = true;
				if (py < airborneMinY) airborneMinY = py;
				if (!downSePlayed && py - airborneMinY >= 1000) {
					downSeAsset.play();
					downSePlayed = true;
				}
			}
			wasGrounded = groundedNow;

			for (var i = 0; i < items.length; i++) {
				if (!items[i].active) continue;
				if (Math.abs(items[i].y - py) > g.game.height * 0.6) continue;
				var dx = items[i].x - px;
				var dy = items[i].y - py;
				var hitR = Math.max(playerHalfW, playerHalfH) + Math.max(itemHalfW, itemHalfH);
				if (dx * dx + dy * dy < hitR * hitR) {
					items[i].active = false;
					items[i].visible = false;
					items[i].entity.hide();
					itemSeAsset.play();
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
			if (targetCameraY !== lastWorldLayerY) {
				lastWorldLayerY = targetCameraY;
				worldLayer.y = targetCameraY;
				worldLayer.modified();
			}

			generateUntil(py - 1400, 2);
			if (visibilityUpdateFrame % 3 === 0) {
				updateWorldVisibility();
			}
			visibilityUpdateFrame += 1;

			var currentHeight = Math.max(0, Math.floor(baseHeightY - py));
			if (currentHeight > maxHeight) {
				maxHeight = currentHeight;
				g.game.vars.gameState.score = Math.floor(maxHeight);
			}

			var currentHeightText = "現在高度: " + currentHeight;
			if (currentHeightText !== lastCurrentHeightText) {
				lastCurrentHeightText = currentHeightText;
				currentHeightLabel.text = currentHeightText;
				currentHeightLabel.invalidate();
			}
			var maxHeightText = "最高高度: " + Math.floor(maxHeight);
			if (maxHeightText !== lastMaxHeightText) {
				lastMaxHeightText = maxHeightText;
				maxHeightLabel.text = maxHeightText;
				maxHeightLabel.invalidate();
			}
			var jumpPowerText = "ジャンプ力: " + jumpPowerLevel;
			if (jumpPowerText !== lastJumpPowerText) {
				lastJumpPowerText = jumpPowerText;
				jumpPowerLabel.text = jumpPowerText;
				jumpPowerLabel.invalidate();
			}
			var airJumpText = "空中ジャンプ: " + airJumpStock + "/" + airJumpMax;
			if (airJumpText !== lastAirJumpText) {
				lastAirJumpText = airJumpText;
				airJumpLabel.text = airJumpText;
				airJumpLabel.invalidate();
			}

			if (py > worldBottom + 120) {
				finishGame();
			}
		});
	});

	g.game.pushScene(scene);
};
