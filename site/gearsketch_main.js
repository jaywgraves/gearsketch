// Generated by CoffeeScript 1.6.3
(function() {
  "use strict";
  var ArcSegment, Board, Chain, FPS, Gear, GearSketch, LineSegment, MIN_GEAR_TEETH, MIN_MOMENTUM, Point, Util,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __slice = [].slice;

  Point = window.gearsketch.Point;

  ArcSegment = window.gearsketch.ArcSegment;

  LineSegment = window.gearsketch.LineSegment;

  Util = window.gearsketch.Util;

  Gear = window.gearsketch.model.Gear;

  Chain = window.gearsketch.model.Chain;

  Board = window.gearsketch.model.Board;

  FPS = 60;

  MIN_GEAR_TEETH = 8;

  MIN_MOMENTUM = 0.2;

  GearSketch = (function() {
    var AXIS_RADIUS, BUTTON_INFO, MODULE, MovementAction, MovementType;

    MODULE = Util.MODULE;

    AXIS_RADIUS = Util.AXIS_RADIUS;

    BUTTON_INFO = [["gearButton", "GearIcon.png"], ["chainButton", "ChainIcon.png"], ["momentumButton", "MomentumIcon.png"], ["playButton", "PlayIcon.png"], ["clearButton", "ClearIcon.png"], ["cloudButton", "CloudIcon.png"], ["helpButton", "HelpIcon.png"]];

    MovementAction = {
      PEN_DOWN: "penDown",
      PEN_UP: "penUp",
      PEN_TAP: "penTap"
    };

    MovementType = {
      STRAIGHT: "straight",
      CIRCLE: "circle",
      LEFT_HALF_CIRCLE: "leftHalfCircle",
      RIGHT_HALF_CIRCLE: "rightHalfCircle"
    };

    GearSketch.prototype.buttons = {};

    GearSketch.prototype.loadedButtons = 0;

    GearSketch.prototype.areButtonsLoaded = false;

    GearSketch.prototype.selectedButton = BUTTON_INFO[0][0];

    GearSketch.prototype.gearImages = {};

    GearSketch.prototype.isPenDown = false;

    GearSketch.prototype.stroke = [];

    GearSketch.prototype.offset = new Point();

    GearSketch.prototype.message = "";

    GearSketch.prototype.messageColor = "black";

    GearSketch.prototype.pointerLocation = new Point();

    GearSketch.prototype.currentDemoMovement = 0;

    GearSketch.prototype.movementCompletion = 0;

    GearSketch.prototype.restTimer = 0;

    function GearSketch() {
      this.update = __bind(this.update, this);
      this.updateAndDrawNoRAF = __bind(this.updateAndDrawNoRAF, this);
      this.updateAndDraw = __bind(this.updateAndDraw, this);
      this.loadButtons();
      this.loadDemoPointer();
      this.loadBoard();
      this.canvas = document.getElementById("gearsketch_canvas");
      this.isDemoPlaying = false;
      this.updateCanvasSize();
      this.addCanvasListeners();
      this.lastUpdateTime = new Date().getTime();
      this.updateAndDrawNoRAF();
    }

    GearSketch.prototype.buttonLoaded = function() {
      this.loadedButtons++;
      if (this.loadedButtons === BUTTON_INFO.length) {
        return this.areButtonsLoaded = true;
      }
    };

    GearSketch.prototype.loadButtons = function() {
      var button, file, name, x, y, _i, _len, _ref, _results,
        _this = this;
      x = y = 20;
      _results = [];
      for (_i = 0, _len = BUTTON_INFO.length; _i < _len; _i++) {
        _ref = BUTTON_INFO[_i], name = _ref[0], file = _ref[1];
        button = new Image();
        button.name = name;
        button.onload = function() {
          return _this.buttonLoaded();
        };
        button.src = "img/" + file;
        button.location = new Point(x, y);
        button.padding = 3;
        this.buttons[name] = button;
        _results.push(x += 80);
      }
      return _results;
    };

    GearSketch.prototype.loadDemoPointer = function() {
      var image,
        _this = this;
      image = new Image();
      image.onload = function() {
        return _this.pointerImage = image;
      };
      return image.src = "img/hand.png";
    };

    GearSketch.prototype.loadBoard = function() {
      var boardJSON, error, hash;
      return this.board = (function() {
        if (parent.location.hash.length > 1) {
          try {
            hash = parent.location.hash.substr(1);
            boardJSON = Util.sendGetRequest("boards/" + hash + ".txt");
            return Board.fromObject(JSON.parse(boardJSON));
          } catch (_error) {
            error = _error;
            this.displayMessage("Error: could not load board", "red", 2000);
            return new Board();
          }
        } else {
          return new Board();
        }
      }).call(this);
    };

    GearSketch.prototype.displayMessage = function(message, color, time) {
      var _this = this;
      if (color == null) {
        color = "black";
      }
      if (time == null) {
        time = 0;
      }
      this.message = message;
      this.messageColor = color;
      if (time > 0) {
        return setTimeout((function() {
          return _this.clearMessage();
        }), time);
      }
    };

    GearSketch.prototype.clearMessage = function() {
      return this.message = "";
    };

    GearSketch.prototype.addCanvasListeners = function() {
      var canvasEventHandler,
        _this = this;
      canvasEventHandler = Hammer(this.canvas, {
        drag_min_distance: 1
      });
      canvasEventHandler.on("touch", (function(e) {
        return _this.forwardPenDownEvent.call(_this, e);
      }));
      canvasEventHandler.on("drag", (function(e) {
        return _this.forwardPenMoveEvent.call(_this, e);
      }));
      return canvasEventHandler.on("release", (function(e) {
        return _this.forwardPenUpEvent.call(_this, e);
      }));
    };

    GearSketch.prototype.forwardPenDownEvent = function(event) {
      event.gesture.preventDefault();
      if (this.isDemoPlaying) {
        return this.stopDemo();
      } else {
        return this.handlePenDown(event.gesture.center.pageX, event.gesture.center.pageY);
      }
    };

    GearSketch.prototype.forwardPenMoveEvent = function(event) {
      event.gesture.preventDefault();
      if (!this.isDemoPlaying) {
        return this.handlePenMove(event.gesture.center.pageX, event.gesture.center.pageY);
      }
    };

    GearSketch.prototype.forwardPenUpEvent = function(event) {
      if (!this.isDemoPlaying) {
        return this.handlePenUp();
      }
    };

    GearSketch.prototype.handlePenDown = function(x, y) {
      var button, point;
      point = new Point(x, y);
      if (this.isPenDown) {
        return this.handlePenUp();
      } else {
        button = this.getButtonAt(x, y);
        if (button) {
          if (button.name === "clearButton") {
            parent.location.hash = "";
            return this.board.clear();
          } else if (button.name === "cloudButton") {
            return this.uploadBoard();
          } else if (button.name === "helpButton") {
            return this.playDemo();
          } else {
            return this.selectedButton = button.name;
          }
        } else if (this.selectedButton === "gearButton") {
          this.selectedGear = this.board.getTopLevelGearAt(point);
          if (this.selectedGear != null) {
            this.offset = point.minus(this.selectedGear.location);
          } else if (this.board.getGearAt(point) == null) {
            this.stroke.push(point);
          }
          return this.isPenDown = true;
        } else if (this.selectedButton === "chainButton") {
          this.stroke.push(point);
          return this.isPenDown = true;
        } else if (this.selectedButton === "momentumButton") {
          this.selectedGear = this.board.getGearAt(point);
          if (this.selectedGear) {
            this.selectedGear.momentum = 0;
            this.selectedGearMomentum = this.calculateMomentumFromCoords(this.selectedGear, x, y);
          }
          return this.isPenDown = true;
        }
      }
    };

    GearSketch.prototype.handlePenMove = function(x, y) {
      var canPlaceGear, goalLocation, point;
      point = new Point(x, y);
      if (this.isPenDown) {
        if (this.selectedButton === "gearButton") {
          if (this.selectedGear) {
            goalLocation = point.minus(this.offset);
            canPlaceGear = this.board.placeGear(this.selectedGear, goalLocation);
            if (canPlaceGear) {
              return this.goalLocationGear = null;
            } else {
              return this.goalLocationGear = new Gear(goalLocation, this.selectedGear.rotation, this.selectedGear.numberOfTeeth, this.selectedGear.id);
            }
          } else if (this.stroke.length > 0) {
            return this.stroke.push(point);
          }
        } else if (this.selectedButton === "chainButton") {
          return this.stroke.push(point);
        } else if (this.selectedButton === "momentumButton") {
          if (this.selectedGear) {
            return this.selectedGearMomentum = this.calculateMomentumFromCoords(this.selectedGear, x, y);
          }
        }
      }
    };

    GearSketch.prototype.handlePenUp = function() {
      if (this.isPenDown) {
        if (this.selectedButton === "gearButton") {
          if (!((this.selectedGear != null) || this.stroke.length === 0)) {
            this.processGearStroke();
          }
        } else if (this.selectedButton === "chainButton") {
          this.processChainStroke();
        } else if (this.selectedButton === "momentumButton") {
          if (this.selectedGear) {
            if (Math.abs(this.selectedGearMomentum) > MIN_MOMENTUM) {
              this.selectedGear.momentum = this.selectedGearMomentum;
            } else {
              this.selectedGear.momentum = 0;
            }
          }
          this.selectedGearMomentum = 0;
        }
        this.selectedGear = null;
        this.goalLocationGear = null;
        return this.isPenDown = false;
      }
    };

    GearSketch.prototype.isButtonAt = function(x, y, button) {
      return x > button.location.x && x < button.location.x + button.width + 2 * button.padding && y > button.location.y && y < button.location.y + button.height + 2 * button.padding;
    };

    GearSketch.prototype.getButtonAt = function(x, y) {
      var button, buttonName, _ref;
      _ref = this.buttons;
      for (buttonName in _ref) {
        if (!__hasProp.call(_ref, buttonName)) continue;
        button = _ref[buttonName];
        if (this.isButtonAt(x, y, button)) {
          return button;
        }
      }
      return null;
    };

    GearSketch.prototype.normalizeStroke = function(stroke) {
      var MIN_POINT_DISTANCE, normalizedStroke, p1, p2, strokeTail, _i, _len;
      MIN_POINT_DISTANCE = 10;
      normalizedStroke = [];
      if (stroke.length > 0) {
        p1 = stroke[0], strokeTail = 2 <= stroke.length ? __slice.call(stroke, 1) : [];
        normalizedStroke.push(p1);
        for (_i = 0, _len = strokeTail.length; _i < _len; _i++) {
          p2 = strokeTail[_i];
          if (p1.distance(p2) > MIN_POINT_DISTANCE) {
            normalizedStroke.push(p2);
            p1 = p2;
          }
        }
      }
      return normalizedStroke;
    };

    GearSketch.prototype.createGearFromStroke = function(stroke) {
      var area, doubleArea, height, i, idealTrueAreaRatio, j, maxX, maxY, minX, minY, numberOfPoints, p, radius, sumX, sumY, t, width, x, y, _i, _j, _len;
      numberOfPoints = stroke.length;
      if (numberOfPoints > 0) {
        sumX = 0;
        sumY = 0;
        minX = Number.MAX_VALUE;
        maxX = Number.MIN_VALUE;
        minY = Number.MAX_VALUE;
        maxY = Number.MIN_VALUE;
        for (_i = 0, _len = stroke.length; _i < _len; _i++) {
          p = stroke[_i];
          sumX += p.x;
          sumY += p.y;
          minX = Math.min(minX, p.x);
          maxX = Math.max(maxX, p.x);
          minY = Math.min(minY, p.y);
          maxY = Math.max(maxY, p.y);
        }
        width = maxX - minX;
        height = maxY - minY;
        t = Math.floor(0.5 * (width + height) / MODULE);
        doubleArea = 0;
        for (i = _j = 0; 0 <= numberOfPoints ? _j < numberOfPoints : _j > numberOfPoints; i = 0 <= numberOfPoints ? ++_j : --_j) {
          j = (i + 1) % numberOfPoints;
          doubleArea += stroke[i].x * stroke[j].y;
          doubleArea -= stroke[i].y * stroke[j].x;
        }
        area = Math.abs(doubleArea) / 2;
        radius = 0.25 * ((maxX - minX) + (maxY - minY));
        idealTrueAreaRatio = (Math.PI * Math.pow(radius, 2)) / area;
        if (idealTrueAreaRatio > 0.80 && idealTrueAreaRatio < 1.20 && t > MIN_GEAR_TEETH) {
          x = sumX / numberOfPoints;
          y = sumY / numberOfPoints;
          return new Gear(new Point(x, y), 0, t);
        }
      }
      return null;
    };

    GearSketch.prototype.removeStrokedGears = function(stroke) {
      var gear, id, _ref, _results;
      _ref = this.board.getTopLevelGears();
      _results = [];
      for (id in _ref) {
        if (!__hasProp.call(_ref, id)) continue;
        gear = _ref[id];
        if (Util.pointPathDistance(gear.location, stroke, false) < gear.innerRadius) {
          _results.push(this.board.removeGear(gear));
        } else {
          _results.push(void 0);
        }
      }
      return _results;
    };

    GearSketch.prototype.processGearStroke = function() {
      var gear, isGearAdded, normalizedStroke;
      normalizedStroke = this.normalizeStroke(this.stroke);
      gear = this.createGearFromStroke(normalizedStroke);
      if (gear != null) {
        isGearAdded = this.board.addGear(gear);
        if (isGearAdded && !(gear.numberOfTeeth in this.gearImages)) {
          this.addGearImage(gear);
        }
      } else {
        this.removeStrokedGears(normalizedStroke);
      }
      return this.stroke = [];
    };

    GearSketch.prototype.gearImageLoaded = function(numberOfTeeth, image) {
      return this.gearImages[numberOfTeeth] = image;
    };

    GearSketch.prototype.addGearImage = function(gear) {
      var ctx, gearCanvas, gearCopy, image, size,
        _this = this;
      gearCanvas = document.createElement("canvas");
      size = 2 * (gear.outerRadius + MODULE);
      gearCanvas.height = size;
      gearCanvas.width = size;
      ctx = gearCanvas.getContext("2d");
      gearCopy = new Gear(new Point(0.5 * size, 0.5 * size), 0, gear.numberOfTeeth, gear.id);
      this.drawGear(ctx, gearCopy);
      image = new Image();
      image.onload = function() {
        return _this.gearImageLoaded(gear.numberOfTeeth, image);
      };
      return image.src = gearCanvas.toDataURL("image/png");
    };

    GearSketch.prototype.removeStrokedChains = function(stroke) {
      var chain, id, _ref, _results;
      _ref = this.board.getChains();
      _results = [];
      for (id in _ref) {
        if (!__hasProp.call(_ref, id)) continue;
        chain = _ref[id];
        if (chain.intersectsPath(stroke)) {
          _results.push(this.board.removeChain(chain));
        } else {
          _results.push(void 0);
        }
      }
      return _results;
    };

    GearSketch.prototype.processChainStroke = function() {
      var chain, gearsInChain, normalizedStroke;
      normalizedStroke = this.normalizeStroke(this.stroke);
      this.stroke = [];
      gearsInChain = Util.findGearsInsidePolygon(normalizedStroke, this.board.getGears());
      if (normalizedStroke.length >= 3 && gearsInChain.length > 0) {
        chain = new Chain(normalizedStroke);
        return this.board.addChain(chain);
      } else if (normalizedStroke.length >= 2) {
        return this.removeStrokedChains(normalizedStroke);
      }
    };

    GearSketch.prototype.calculateMomentumFromCoords = function(gear, x, y) {
      var angle, angleFromTop;
      angle = Math.atan2(y - gear.location.y, x - gear.location.x);
      angleFromTop = angle + 0.5 * Math.PI;
      if (angleFromTop < Math.PI) {
        return angleFromTop;
      } else {
        return angleFromTop - 2 * Math.PI;
      }
    };

    GearSketch.prototype.updateAndDraw = function() {
      var _this = this;
      return setTimeout((function() {
        requestAnimationFrame(_this.updateAndDraw);
        _this.update();
        return _this.draw();
      }), 1000 / FPS);
    };

    GearSketch.prototype.updateAndDrawNoRAF = function() {
      var _this = this;
      this.update();
      this.draw();
      return setTimeout((function() {
        return _this.updateAndDrawNoRAF();
      }), 1000 / FPS);
    };

    GearSketch.prototype.update = function() {
      var delta, updateTime;
      updateTime = new Date().getTime();
      delta = updateTime - this.lastUpdateTime;
      if (this.selectedButton === "playButton") {
        this.board.rotateAllTurningObjects(delta);
      }
      if (this.isDemoPlaying) {
        this.updateDemo(delta);
      }
      return this.lastUpdateTime = updateTime;
    };

    GearSketch.prototype.drawGear = function(ctx, gear, color) {
      var angleStep, gearImage, i, innerPoints, numberOfTeeth, outerPoints, r, rotation, x, y, _i, _j, _k, _ref, _ref1;
      if (color == null) {
        color = "black";
      }
      _ref = gear.location, x = _ref.x, y = _ref.y;
      rotation = gear.rotation;
      numberOfTeeth = gear.numberOfTeeth;
      gearImage = this.gearImages[gear.numberOfTeeth];
      if (color === "black" && (gearImage != null)) {
        gearImage = this.gearImages[gear.numberOfTeeth];
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rotation);
        ctx.drawImage(gearImage, -0.5 * gearImage.width, -0.5 * gearImage.height);
        ctx.restore();
        return;
      }
      angleStep = 2 * Math.PI / numberOfTeeth;
      innerPoints = [];
      outerPoints = [];
      for (i = _i = 0; 0 <= numberOfTeeth ? _i < numberOfTeeth : _i > numberOfTeeth; i = 0 <= numberOfTeeth ? ++_i : --_i) {
        for (r = _j = 0; _j < 4; r = ++_j) {
          if (r === 0 || r === 3) {
            innerPoints.push(Point.polar((i + 0.25 * r) * angleStep, gear.innerRadius));
          } else {
            outerPoints.push(Point.polar((i + 0.25 * r) * angleStep, gear.outerRadius));
          }
        }
      }
      ctx.save();
      ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.translate(x, y);
      ctx.rotate(rotation);
      ctx.beginPath();
      ctx.moveTo(gear.innerRadius, 0);
      for (i = _k = 0, _ref1 = numberOfTeeth * 2; 0 <= _ref1 ? _k < _ref1 : _k > _ref1; i = 0 <= _ref1 ? ++_k : --_k) {
        if (i % 2 === 0) {
          ctx.lineTo(innerPoints[i].x, innerPoints[i].y);
          ctx.lineTo(outerPoints[i].x, outerPoints[i].y);
        } else {
          ctx.lineTo(outerPoints[i].x, outerPoints[i].y);
          ctx.lineTo(innerPoints[i].x, innerPoints[i].y);
        }
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(AXIS_RADIUS, 0);
      ctx.arc(0, 0, AXIS_RADIUS, 0, 2 * Math.PI, true);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(AXIS_RADIUS, 0);
      ctx.lineTo(gear.innerRadius, 0);
      ctx.closePath();
      ctx.stroke();
      return ctx.restore();
    };

    GearSketch.prototype.drawButton = function(ctx, button) {
      var padding, x, y, _ref;
      _ref = button.location, x = _ref.x, y = _ref.y;
      padding = button.padding;
      ctx.save();
      ctx.translate(x, y);
      ctx.beginPath();
      ctx.rect(0, 0, button.width + 2 * padding, button.height + 2 * padding);
      if (button.name === this.selectedButton) {
        ctx.fillStyle = "rgba(50, 150, 255, 0.8)";
      } else {
        ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
      }
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = "black";
      ctx.stroke();
      ctx.drawImage(button, padding, padding);
      return ctx.restore();
    };

    GearSketch.prototype.drawMomentum = function(ctx, gear, momentum, color) {
      var angle, head, headX, headY, length, p1, p2, pitchRadius, sign, top;
      if (color == null) {
        color = "red";
      }
      pitchRadius = gear.pitchRadius;
      top = new Point(gear.location.x, gear.location.y - pitchRadius);
      ctx.save();
      ctx.lineWidth = 5;
      ctx.lineCap = "round";
      ctx.strokeStyle = color;
      ctx.translate(top.x, top.y);
      ctx.beginPath();
      ctx.arc(0, pitchRadius, pitchRadius, -0.5 * Math.PI, momentum - 0.5 * Math.PI, momentum < 0);
      ctx.stroke();
      length = 15;
      angle = 0.2 * Math.PI;
      headX = -Math.cos(momentum + 0.5 * Math.PI) * pitchRadius;
      headY = pitchRadius - Math.sin(momentum + 0.5 * Math.PI) * pitchRadius;
      head = new Point(headX, headY);
      sign = Util.sign(momentum);
      p1 = head.minus(Point.polar(momentum + angle, sign * length));
      ctx.beginPath();
      ctx.moveTo(headX, headY);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
      p2 = head.minus(Point.polar(momentum - angle, sign * length));
      ctx.beginPath();
      ctx.moveTo(headX, headY);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
      return ctx.restore();
    };

    GearSketch.prototype.drawChain = function(ctx, chain) {
      var isCounterClockwise, point, segment, _i, _j, _len, _len1, _ref, _ref1;
      ctx.save();
      ctx.lineWidth = Chain.WIDTH;
      ctx.lineCap = "round";
      ctx.strokeStyle = "rgb(0, 0, 255)";
      ctx.moveTo(chain.segments[0].start.x, chain.segments[0].start.y);
      _ref = chain.segments;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        segment = _ref[_i];
        if (segment instanceof ArcSegment) {
          isCounterClockwise = segment.direction === Util.Direction.COUNTER_CLOCKWISE;
          ctx.beginPath();
          ctx.arc(segment.center.x, segment.center.y, segment.radius, segment.startAngle, segment.endAngle, isCounterClockwise);
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.moveTo(segment.start.x, segment.start.y);
          ctx.lineTo(segment.end.x, segment.end.y);
          ctx.stroke();
        }
      }
      ctx.fillStyle = "white";
      _ref1 = chain.findPointsOnChain(25);
      for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
        point = _ref1[_j];
        ctx.beginPath();
        ctx.arc(point.x, point.y, 3, 0, 2 * Math.PI, true);
        ctx.fill();
      }
      return ctx.restore();
    };

    GearSketch.prototype.drawDemoPointer = function(ctx, location) {
      return ctx.drawImage(this.pointerImage, location.x - 0.5 * this.pointerImage.width, location.y);
    };

    GearSketch.prototype.draw = function() {
      var arrow, arrowsToDraw, buttonName, chain, ctx, gear, i, momentum, shouldDrawChainsAndArrows, sortedGears, _i, _j, _k, _l, _len, _len1, _ref, _ref1, _ref2, _ref3;
      if (this.canvas.getContext != null) {
        this.updateCanvasSize();
        ctx = this.canvas.getContext("2d");
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        sortedGears = this.board.getGearsSortedByGroupAndLevel();
        arrowsToDraw = [];
        for (i = _i = 0, _ref = sortedGears.length; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
          gear = sortedGears[i];
          momentum = gear.momentum;
          if (gear === this.selectedGear && this.goalLocationGear) {
            this.drawGear(ctx, gear, "grey");
            if (momentum) {
              arrowsToDraw.push([gear, momentum, "grey"]);
            }
          } else {
            this.drawGear(ctx, gear);
            if (momentum) {
              arrowsToDraw.push([gear, momentum, "red"]);
            }
          }
          shouldDrawChainsAndArrows = (i === sortedGears.length - 1) || (this.board.getLevelScore(gear) !== this.board.getLevelScore(sortedGears[i + 1]));
          if (shouldDrawChainsAndArrows) {
            _ref1 = this.board.getChainsInGroupOnLevel(gear.group, gear.level);
            for (_j = 0, _len = _ref1.length; _j < _len; _j++) {
              chain = _ref1[_j];
              this.drawChain(ctx, chain);
            }
            for (_k = 0, _len1 = arrowsToDraw.length; _k < _len1; _k++) {
              arrow = arrowsToDraw[_k];
              this.drawMomentum(ctx, arrow[0], arrow[1], arrow[2]);
            }
            arrowsToDraw = [];
          }
        }
        if (this.goalLocationGear) {
          this.drawGear(ctx, this.goalLocationGear, "red");
        }
        if ((this.selectedGear != null) && this.selectedGearMomentum) {
          this.drawMomentum(ctx, this.selectedGear, this.selectedGearMomentum);
        }
        if (this.stroke.length > 0) {
          ctx.save();
          if (this.selectedButton === "gearButton") {
            ctx.strokeStyle = "black";
            ctx.lineWidth = 2;
          } else {
            ctx.strokeStyle = "blue";
            ctx.lineWidth = 4;
          }
          ctx.beginPath();
          ctx.moveTo(this.stroke[0].x, this.stroke[0].y);
          for (i = _l = 1, _ref2 = this.stroke.length; 1 <= _ref2 ? _l < _ref2 : _l > _ref2; i = 1 <= _ref2 ? ++_l : --_l) {
            ctx.lineTo(this.stroke[i].x, this.stroke[i].y);
          }
          ctx.stroke();
          ctx.restore();
        }
        if (this.areButtonsLoaded) {
          _ref3 = this.buttons;
          for (buttonName in _ref3) {
            if (!__hasProp.call(_ref3, buttonName)) continue;
            this.drawButton(ctx, this.buttons[buttonName]);
          }
        }
        if (this.message.length > 0) {
          ctx.save();
          ctx.fillStyle = this.messageColor;
          ctx.font = "bold 20px Arial";
          ctx.fillText(this.message, 20, 120);
          ctx.restore();
        }
        if (this.isDemoPlaying && this.pointerImage) {
          return this.drawDemoPointer(ctx, this.pointerLocation);
        }
      }
    };

    GearSketch.prototype.updateCanvasSize = function() {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
      this.buttons["clearButton"].location.x = Math.max(this.canvas.width - 260, this.buttons["playButton"].location.x + 80);
      this.buttons["cloudButton"].location.x = this.buttons["clearButton"].location.x + 80;
      return this.buttons["helpButton"].location.x = this.buttons["cloudButton"].location.x + 80;
    };

    GearSketch.prototype.loadDemoMovements = function() {
      return this.demoMovements = [
        {
          from: this.getButtonCenter("helpButton"),
          to: this.getButtonCenter("gearButton"),
          atEnd: MovementAction.PEN_TAP,
          type: MovementType.STRAIGHT,
          duration: 2000
        }, {
          to: new Point(300, 200),
          type: MovementType.STRAIGHT,
          duration: 1500
        }, {
          atStart: MovementAction.PEN_DOWN,
          atEnd: MovementAction.PEN_UP,
          type: MovementType.CIRCLE,
          radius: 100,
          duration: 1500
        }, {
          to: new Point(500, 200),
          type: MovementType.STRAIGHT,
          duration: 1000
        }, {
          atStart: MovementAction.PEN_DOWN,
          atEnd: MovementAction.PEN_UP,
          type: MovementType.CIRCLE,
          radius: 40,
          duration: 1000
        }, {
          to: new Point(500, 240),
          type: MovementType.STRAIGHT,
          duration: 500
        }, {
          to: new Point(300, 300),
          atStart: MovementAction.PEN_DOWN,
          atEnd: MovementAction.PEN_UP,
          type: MovementType.STRAIGHT,
          duration: 1500
        }, {
          to: new Point(100, 180),
          type: MovementType.STRAIGHT,
          duration: 1000
        }, {
          atStart: MovementAction.PEN_DOWN,
          atEnd: MovementAction.PEN_UP,
          type: MovementType.CIRCLE,
          radius: 90,
          duration: 1000
        }, {
          to: new Point(100, 260),
          type: MovementType.STRAIGHT,
          duration: 500
        }, {
          to: new Point(180, 260),
          atStart: MovementAction.PEN_DOWN,
          atEnd: MovementAction.PEN_UP,
          type: MovementType.STRAIGHT,
          duration: 1500
        }, {
          to: new Point(550, 220),
          type: MovementType.STRAIGHT,
          duration: 1500
        }, {
          atStart: MovementAction.PEN_DOWN,
          atEnd: MovementAction.PEN_UP,
          type: MovementType.CIRCLE,
          radius: 80,
          duration: 1000
        }, {
          to: this.getButtonCenter("chainButton"),
          atEnd: MovementAction.PEN_TAP,
          type: MovementType.STRAIGHT,
          duration: 1500
        }, {
          to: new Point(280, 150),
          type: MovementType.STRAIGHT,
          duration: 1500
        }, {
          atStart: MovementAction.PEN_DOWN,
          type: MovementType.LEFT_HALF_CIRCLE,
          radius: 140,
          duration: 1500,
          pause: 0
        }, {
          to: new Point(600, 400),
          type: MovementType.STRAIGHT,
          duration: 1000,
          pause: 0
        }, {
          type: MovementType.RIGHT_HALF_CIRCLE,
          radius: 110,
          duration: 1000,
          pause: 0
        }, {
          to: new Point(280, 150),
          atEnd: MovementAction.PEN_UP,
          type: MovementType.STRAIGHT,
          duration: 1000
        }, {
          to: this.getButtonCenter("momentumButton"),
          atEnd: MovementAction.PEN_TAP,
          type: MovementType.STRAIGHT,
          duration: 1500
        }, {
          to: new Point(185, 180),
          type: MovementType.STRAIGHT,
          duration: 1500
        }, {
          to: new Point(150, 190),
          atStart: MovementAction.PEN_DOWN,
          atEnd: MovementAction.PEN_UP,
          type: MovementType.STRAIGHT,
          duration: 1000
        }, {
          to: this.getButtonCenter("playButton"),
          atEnd: MovementAction.PEN_TAP,
          type: MovementType.STRAIGHT,
          duration: 1500
        }, {
          to: this.getButtonCenter("chainButton"),
          atEnd: MovementAction.PEN_TAP,
          type: MovementType.STRAIGHT,
          duration: 3000
        }, {
          to: new Point(425, 250),
          type: MovementType.STRAIGHT,
          duration: 1000
        }, {
          to: new Point(525, 150),
          atStart: MovementAction.PEN_DOWN,
          atEnd: MovementAction.PEN_UP,
          type: MovementType.STRAIGHT,
          duration: 1000
        }, {
          to: this.getButtonCenter("gearButton"),
          atEnd: MovementAction.PEN_TAP,
          type: MovementType.STRAIGHT,
          duration: 1500
        }, {
          to: new Point(20, 250),
          type: MovementType.STRAIGHT,
          duration: 1000
        }, {
          to: new Point(650, 300),
          atStart: MovementAction.PEN_DOWN,
          atEnd: MovementAction.PEN_UP,
          type: MovementType.STRAIGHT,
          duration: 1500
        }, {
          to: new Point(425, 200),
          type: MovementType.STRAIGHT,
          duration: 1000
        }, {
          to: new Point(200, 400),
          atStart: MovementAction.PEN_DOWN,
          atEnd: MovementAction.PEN_UP,
          type: MovementType.STRAIGHT,
          duration: 1500
        }
      ];
    };

    GearSketch.prototype.getButtonCenter = function(buttonName) {
      var button, buttonCorner;
      button = this.buttons[buttonName];
      buttonCorner = new Point(button.location.x, button.location.y);
      return buttonCorner.plus(new Point(0.5 * button.width + button.padding, 0.5 * button.height + button.padding));
    };

    GearSketch.prototype.updateDemo = function(delta) {
      var movement;
      if (this.restTimer > 0) {
        this.restTimer = Math.max(this.restTimer - delta, 0);
        return;
      } else if (this.currentDemoMovement === this.demoMovements.length) {
        this.stopDemo();
        return;
      }
      movement = this.demoMovements[this.currentDemoMovement];
      if (this.movementCompletion === 0) {
        if (movement.from == null) {
          movement.from = this.pointerLocation;
        }
        if (movement.pause == null) {
          movement.pause = 500;
        }
        this.pointerLocation = movement.from.clone();
        if (movement.atStart === MovementAction.PEN_DOWN) {
          this.handlePenDown(this.pointerLocation.x, this.pointerLocation.y);
        }
      }
      if (this.movementCompletion < 1) {
        this.movementCompletion = Math.min(1, this.movementCompletion + delta / movement.duration);
        this.updatePointerLocation(movement, this.movementCompletion);
        this.handlePenMove(this.pointerLocation.x, this.pointerLocation.y);
      }
      if (this.movementCompletion === 1) {
        if (movement.atEnd === MovementAction.PEN_TAP) {
          this.handlePenDown(this.pointerLocation.x, this.pointerLocation.y);
          this.handlePenUp();
        } else if (movement.atEnd === MovementAction.PEN_UP) {
          this.handlePenUp();
        }
        this.restTimer = movement.pause;
        this.movementCompletion = 0;
        return this.currentDemoMovement++;
      }
    };

    GearSketch.prototype.updatePointerLocation = function(movement, movementCompletion) {
      var angle, center, delta;
      if (movement.type === MovementType.STRAIGHT) {
        delta = movement.to.minus(movement.from);
        return this.pointerLocation = movement.from.plus(delta.times(movementCompletion));
      } else if (movement.type === MovementType.CIRCLE) {
        center = new Point(movement.from.x, movement.from.y + movement.radius);
        return this.pointerLocation = center.plus(Point.polar(Math.PI - (movementCompletion - 0.25) * 2 * Math.PI, movement.radius));
      } else if (movement.type === MovementType.LEFT_HALF_CIRCLE) {
        center = new Point(movement.from.x, movement.from.y + movement.radius);
        angle = 1.5 * Math.PI - movementCompletion * Math.PI;
        return this.pointerLocation = center.plus(Point.polar(angle, movement.radius));
      } else if (movement.type === MovementType.RIGHT_HALF_CIRCLE) {
        center = new Point(movement.from.x, movement.from.y - movement.radius);
        angle = 0.5 * Math.PI - movementCompletion * Math.PI;
        return this.pointerLocation = center.plus(Point.polar(angle, movement.radius));
      }
    };

    GearSketch.prototype.playDemo = function() {
      this.loadDemoMovements();
      this.boardBackup = this.board.clone();
      this.board.clear();
      this.currentDemoMovement = 0;
      this.movementCompletion = 0;
      this.isDemoPlaying = true;
      return this.displayMessage("click anywhere to stop the demo");
    };

    GearSketch.prototype.stopDemo = function() {
      this.isDemoPlaying = false;
      this.restTimer = 0;
      this.stroke = [];
      this.selectedGear = null;
      this.selectedIcon = "gearIcon";
      this.board.restoreAfterDemo(this.boardBackup);
      return this.clearMessage();
    };

    GearSketch.prototype.boardUploaded = function(event) {
      parent.location.hash = event.target.responseText.trim();
      return this.displayMessage("Board saved. Share it by copying the text in your address bar.", "black", 4000);
    };

    GearSketch.prototype.uploadBoard = function() {
      var boardJSON,
        _this = this;
      boardJSON = JSON.stringify(this.board);
      return Util.sendPostRequest(boardJSON, "upload_board.php", (function(event) {
        return _this.boardUploaded(event);
      }));
    };

    return GearSketch;

  })();

  window.gearsketch.GearSketch = GearSketch;

}).call(this);

/*
//@ sourceMappingURL=gearsketch_main.map
*/
