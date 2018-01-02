// Created by Stephen Surtees (foxcode)

/**
 * A behavior to handle the logic of a typical match 3 game
 * @constructor
 */
Match3 = function()
{
    // Keep current context
    var self = this;
    var initialParams;
    this.name = "Match3";
    this._gameOverFlag = false;
    this._running = false;

    this.customEditor = {title: "Edit Match3", module: "match3Editor"};

    // Match 3 properties
    this._numCells = {x:5, y:5};
    this._cellSize = {x:40, y:40};
    this._margin = 8;
    this._items = [{normal: 'procedural_square', special: 'procedural_square', probability: 30},
                   {normal: 'procedural_circle', special: 'procedural_circle', probability: 30},
                   {normal: 'procedural_star',   special: 'procedural_star',   probability: 40}];
    this._specialFive = "";

    this._effectTemplates =
    {
        _explosion:"",
        _splash:"",
        _sparkle:"",
        _specialFour:"",
        _specialFive:""
    };

    // Points
    this._score = 0; // Current score
    this._matchScore = 100;

    this._textObject = "";
    this._selectorTemplate = "";  // A template object or a sprite to base the selector on
    this._highlightTemplate = ""; // A sprite for the selection highlight

    this._soundEffects =
    {
        _matchSound:"",
        _explosionSound:"",
        _specialFiveSound:""
    };

    this._itemLayer = 2;
    this._bottomLayer = 3;
    this._topLayer = 1;
    this._gravity = 2000;
    this._effectScale = 1.0;
    this._glowSize = 8;

    // Rarity of random sparkles, higher number means rarer
    this._sparkleRarity = 1000;

    // Contains a list of squares that need to be checked

    var check = [];

    var selectedSquare = null;
    var highlightedSquare = null;
    var selectorObject = {};

    var board = []; // Array to store the game board
    var columnsLocked = []; // An array to store which columns are locked

    // Flags
    var deadChilliWalking = false;
    var wholeBoardCheck = false;
    var matchSoundPlaying = false;
    var explosionSoundPlaying = false;

    /**
     * Controls for gamepad cursor movement. Directions - left, right, up, down
     * Each direction has an axis, axisDirection and button
     */
    this.gamepadControls =
    {
        left:{axis:0, axisDirection:-1, button:2},
        right:{axis:0,axisDirection:1, button:3},
        up:{axis:1, axisDirection:-1, button:4},
        down:{axis:1, axisDirection:1, button:5}
    };

    /**
     * Keyboard controls for cursor movement and highlight button
     * Actions - left, right, up, down, highlightButton
     */
    this.keyboardControls =
    {
        left:"left",
        right:"right",
        up:"up",
        down:"down",
        highlightButton:"space"
    };

    /**
     * The index of the controller to use, must match an array index from wade.getGamepadData
     * @type {number}
     */
    this.gamePadIndex = 0;

    /**
     * Delay between input actions in milliseconds
     * @type {number}
     */
    this.controlInputDelay = 180;

    this._controlCurrentDelay = 0;

    /**
     * Index of the gamepad button used to highlight the object at the selector
     * @type {number}
     */
    this.gamepadHighlightButton = 0;


    this._buttonReleased = true; // Used for gamepad highlight
    this._keyboardButtonReleased = true;

    /**
     * Called when parent object is added to scene, used to set match 3 parameters
     * @param {object} [parameters] This contains a "match3" object that in turn contains parameters used to setup the match3 game: <ul>
     * <li><span class="code_tooltip_param_type">{x: number, y: number}</span><span class="code_tooltip_param_name"> _numCells</span>: number of columns and rows to use</li>
     * <li><span class="code_tooltip_param_type">{x: number, y: number}</span><span class="code_tooltip_param_name"> _cellSize</span>: pixel dimension of individual square</li>
     * <li><span class="code_tooltip_param_type">{number}</span><span class="code_tooltip_param_name"> margin</span>: the space between a square image and the cell border as given by cell size</li>
     * <li><span class="code_tooltip_param_type">{Array}</span><span class="code_tooltip_param_name"> items</span>: the array of items to include in the squares in the form {normal:string, special:string, probability:number, background:string(optional)}</li>
     * <li><span class="code_tooltip_param_type">{string}</span><span class="code_tooltip_param_name"> specialFive</span>: the image to use for the special five gem</li>
     * <li><span class="code_tooltip_param_type">{string}</span><span class="code_tooltip_param_name"> matchSound</span>: sound effect to play when a standard match is made</li>
     * <li><span class="code_tooltip_param_type">{string}</span><span class="code_tooltip_param_name"> explosionSound</span>: sound effect to play when a special 4 object is matched</li>
     * <li><span class="code_tooltip_param_type">{string}</span><span class="code_tooltip_param_name"> specialFiveSound</span>: sound effect to play when a special five gem is matched</li>
     * <li><span class="code_tooltip_param_type">{name: string, _numCellsX: number, _numCellsY: number, speed: number, looping: boolean}</span><span class="code_tooltip_param_name"> explosionAnimation</span>: details of effect to play on gems surrounding match 4 gem when it is matched</li>
     * <li><span class="code_tooltip_param_type">{name: string, _numCellsX: number, _numCellsY: number, speed: number, looping: boolean}</span><span class="code_tooltip_param_name"> sparkleAnimation</span>: details of effect to randomly play on gems that are sitting still</li>
     * <li><span class="code_tooltip_param_type">{name: string, _numCellsX: number, _numCellsY: number, speed: number, looping: boolean}</span><span class="code_tooltip_param_name"> splashAnimation</span>: details of effect to play when a normal match is created</li>
     * <li><span class="code_tooltip_param_type">{name: string, _numCellsX: number, _numCellsY: number, speed: number, looping: boolean}</span><span class="code_tooltip_param_name"> specialFourAnimation</span>: animation to play to indicate a match4 gem</li>
     * <li><span class="code_tooltip_param_type">{name: string, _numCellsX: number, _numCellsY: number, speed: number, looping: boolean}</span><span class="code_tooltip_param_name"> specialFiveAnimation</span>: animation to play when a match 5 gem is matched</li>
     * <li><span class="code_tooltip_param_type">{number}</span><span class="code_tooltip_param_name"> itemLayer</span>: layer on which to render the squares</li>
     * <li><span class="code_tooltip_param_type">{number}</span><span class="code_tooltip_param_name"> bottomLayer</span>: layer on which to render background elements</li>
     * <li><span class="code_tooltip_param_type">{number}</span><span class="code_tooltip_param_name"> topLayer</span>: layer on which to render foreground elements</li>
     * <li><span class="code_tooltip_param_type">{number}</span><span class="code_tooltip_param_name"> gravity</span>: speed at which moving squares fall</li>
     * <li><span class="code_tooltip_param_type">{number}</span><span class="code_tooltip_param_name"> effectScale</span>: scale factor applied to the size of effects</li>
     * <li><span class="code_tooltip_param_type">{number}</span><span class="code_tooltip_param_name"> glowSize</span>: pixel size of pulsating glow effect to use on special 4 gems</li>
     */
    this.init = function(parameters)
    {
        wade.enableGamepads(true);
        check = [];
        columnsLocked = [];
        deadChilliWalking = false;
        wholeBoardCheck = false;
        matchSoundPlaying = false;
        explosionSoundPlaying = false;
        selectedSquare    = {x:0, y:0};
        highlightedSquare = {highlighted:null}; // Inner object because can be null but we need reference

        /**
         * Pushes elements to the array only if they are not already present in the array
         * @param element to be pushed
         * @returns {*}
         */
        check.pushUnique = function(element)
        {
            if (check.indexOf(element) == -1)
            {
                return check.push(element);
            }
            return -1;
        };
        this._gameOverFlag = false;
        // Set parameters
        parameters && parameters.match3 && parameters.match3._numCells && (this._numCells = parameters.match3._numCells);
        parameters && parameters.match3 && parameters.match3._cellSize && (this._cellSize = parameters.match3._cellSize);
        parameters && parameters.match3 && parameters.match3._margin && (this._margin = parameters.match3._margin);
        parameters && parameters.match3 && parameters.match3._items && (this._items = parameters.match3._items);
        parameters && parameters.match3 && parameters.match3._specialFive && (this._specialFive = parameters.match3._specialFive);
        parameters && parameters.match3 && parameters.match3._explosionAnimation && (this._explosionAnimation = parameters.match3._explosionAnimation);
        parameters && parameters.match3 && parameters.match3._sparkleAnimation && (this._sparkleAnimation = parameters.match3._sparkleAnimation);
        parameters && parameters.match3 && parameters.match3._splashAnimation && (this._splashAnimation = parameters.match3._splashAnimation);
        parameters && parameters.match3 && parameters.match3._itemLayer && (this._itemLayer = parameters.match3._itemLayer);
        parameters && parameters.match3 && parameters.match3._bottomLayer && (this._bottomLayer = parameters.match3._bottomLayer);
        parameters && parameters.match3 && parameters.match3._topLayer && (this._topLayer = parameters.match3._topLayer);
        parameters && parameters.match3 && parameters.match3._gravity && (this._gravity = parameters.match3._gravity);
        parameters && parameters.match3 && parameters.match3._effectScale && (this._effectScale = parameters.match3._effectScale);
        parameters && parameters.match3 && parameters.match3._glowSize && (this._glowSize = parameters.match3._glowSize);
        parameters && parameters.match3 && parameters.match3._effectTemplates && (this._effectTemplates = parameters.match3._effectTemplates);
        parameters && parameters.match3 && parameters.match3._soundEffects && (this._soundEffects = parameters.match3._soundEffects);
        parameters && parameters.match3 && parameters.match3._sparkleRarity && (this._sparkleRarity = parameters.match3._sparkleRarity);
        parameters && parameters.match3 && parameters.match3._textObject && (this._textObject = parameters.match3._textObject);
        parameters && parameters.match3 && parameters.match3._selectorTemplate && (this._selectorTemplate = parameters.match3._selectorTemplate);
        parameters && parameters.match3 && parameters.match3._highlightTemplate && (this._highlightTemplate = parameters.match3._highlightTemplate);
        parameters && parameters.match3 && parameters.match3._matchScore && (this._matchScore = parameters.match3._matchScore);

        // Remove the preview sprite
        var sprites = this.owner._sprites;
        for(var i=0; i<sprites.length; i++)
        {
            if(sprites[i] instanceof Sprite) // Why would it not be?
            {                                // I'm leaving it here for fear reasons but don't know why it's needed
                this.owner.removeSprite(sprites[i]);
                break;
            }
        }

        var toRemove = wade.getSceneObjects("partOfMatch3", true);
        wade.removeSceneObjects(toRemove); // Remove previous board if it exists

        setTimeout(function()
        {
            // Create the board
            createBoard();
            setSelected(0, 0);
            // Main loop call back
            setTimeout(function()
            {
                self._running = true;
            }, 0);

        }, 0); // So object templates have been added to the scene ready for cloning

    };

    this.onUpdate = function()
    {
        if(!this._running )
        {
            return;
        }
        update();
    };

    this.onAddToScene = function(parameters)
    {
        initialParams = parameters;

        for(var it in this._eventCode)
        {
            if(!this._eventCode.hasOwnProperty(it))
            {
                continue;
            }

            var code = '(function(data){' + this._eventCode[it] + '})';
            try
            {
                this[it] = eval.call(window, code);
            }
            catch(e)
            {
                wade.error(e);
                this[it] = function(){};
            }
        }

        this.init(parameters);
    };

    this.onRemoveFromScene = function() // Removes all objects created by this behavior
    {
        wade.removeSceneObjects(wade.getSceneObjects('partOfMatch3', true));
        this._running = false;
    };


    /**
     * Set's which cell the selector icon should appear over
     * @param {number} x the column of the square to become selected
     * @param {number} y the row of the square to become selected
     */
    var setSelected = function(x, y) // The mystery of the visible but not visible selector
    {
        selectedSquare.x = x;
        selectedSquare.y = y;
        var ownPos = self.owner.getPosition();
        selectorObject.setPosition((-self._numCells.x*self._cellSize.x/2 + x*self._cellSize.x + self._cellSize.x/2) + ownPos.x, (-self._numCells.y*self._cellSize.y/2 + y*self._cellSize.y + self._cellSize.y/2) + ownPos.y);
        //selectorObject.setVisible(true);
    };

    /**
     * Creates a single square
     * @param {string} type The type of square, important as it is used as part of the image path
     * @param {number} col The column to which the square belongs
     * @param {number} row The row to which the square belongs
     * @returns {SceneObject} Returns the square that has been created
     */
    var createSquare = function(type, source, isSpecialFour, col, row)
    {

        var isObject = wade.getSceneObject(source);
        if(isObject) // Create from scene object
        {
            var square = isObject.clone();
            var sprite = square.getSprite();
        }
        else // its a sprite
        {
            sprite = new Sprite(source, self._itemLayer);
            square = new SceneObject(sprite);
        }
        sprite.setSize(self._cellSize.x-self._margin, self._cellSize.y-self._margin);

        var p = self.owner.getPosition();
        var posX = -self._numCells.x * self._cellSize.x / 2 + col * self._cellSize.x + self._cellSize.x / 2 + p.x;
        var posY = -self._numCells.y * self._cellSize.y / 2 + row * self._cellSize.y + self._cellSize.y / 2 + p.y;
        square.setPosition(posX, posY);
        var item = square.addBehavior(Match3Item); // This must happen hear. Earlier and swipe becomes weird, probably due to position
        item.setReferences( // Needs data from the match 3 behavior
        {
            board:board,
            selectorObject:selectorObject,
            swap:swap,
            selectedSquare:selectedSquare,
            columnsLocked:columnsLocked,
            setSelected:setSelected,
            highlightedSquare:highlightedSquare,
            highlightSprite:self._highlightTemplate,
            match3:self,
            check:check
        });
        item.type = type;
        item.isSpecialFour = isSpecialFour;
        item.col = col;
        item.row = row;
        item.deathEffect = {type: 'none'};
        item.specialFourLocked = isSpecialFour;

        return square;
    };

    /**
     * Creates and populates the board, ensuring there are no matches
     */
    var createBoard = function ()
    {
        // Selection
        // _selectorTemplate
        var copy = wade.getSceneObject(self._selectorTemplate);
        if(copy)
        {
            selectorObject = copy.clone();
            selectorObject.setName("selectorClone");
            wade.addSceneObject(selectorObject, true);
            selectorObject.partOfMatch3 = true;
        }
        else
        {
            var selectorSprite = new Sprite(self._selectorTemplate || "procedural_square_border", self._topLayer);
            selectorSprite.setSize(self._cellSize.x + self._margin/2, self._cellSize.y + self._margin/2);
            selectorObject = new SceneObject(selectorSprite);
            selectorObject.partOfMatch3 = true;
            wade.addSceneObject(selectorObject, true);
        }
        selectorObject.setVisible(false); // Make invisible on mouse, make visible on all else

        // Helper function - Used to ensure no matches
        var nullMatch = function (array, item, item2)
        {
            if (item != item2)
                return; // No need unless both previous 2 match
            for (var i = 0; i < array.length; i++)
            {
                array[i].normal = array[i].normal == item ? null : array[i].normal;
            }
        };

        // Create the board array
        board = new Array(self._numCells.x);
        for (var i=0; i<self._numCells.x; i++)
        {
            columnsLocked[i] = false;
            board[i] = new Array(self._numCells.y);
        }
        // Fill the board
        for (i = 0; i < self._numCells.y; i++)
        {
            for (var j = 0; j < self._numCells.x; j++)
            {
                // Ensure no matches
                var original = [];
                for(var a=0; a<self._items.length; a++)
                {
                    original.push(wade.cloneObject(self._items[a])); // This looks dodgy
                }

                j > 1 ? nullMatch(original, board[j - 2][i].getBehavior("Match3Item").type, board[j - 1][i].getBehavior("Match3Item").type) : null;
                i > 1 ? nullMatch(original, board[j][i - 2].getBehavior("Match3Item").type, board[j][i - 1].getBehavior("Match3Item").type) : null;
                var allowed = []; // Array of allowed squares for given position to prevent match
                for (var k = 0; k < original.length; k++)
                {
                    original[k].normal && allowed.push(original[k]);
                }
                //var type = allowed[(Math.floor(Math.random() * allowed.length))];
                var type = chooseType(allowed);

                var back = null;
                if(type.background)
                {
                    back = type.background;
                }
                board[j][i] = createSquare(type.normal, type.normal, false, j, i);
                wade.addSceneObject(board[j][i], true);
                board[j][i].fadeIn(0.3);
            }
        }

    };

    /**
     * Swaps the position of 2 adjacent squares
     * @param {square} square1 the first square
     * @param {square} square2 the square that needs to swap locations with the first square
     * @param {boolean} checkForMatches check for matches once the swap is complete
     */
    var swap = function(square1, square2, checkForMatches)
    {
        var swapData = {square1:square1, square2:square2, match3Behavior:self.owner};
        var eventResult = null;
        if (!(eventResult = self.owner.processEvent('onSwap', swapData)))
        {
            eventResult = wade.app["onSwap"] && wade.app["onSwap"](swapData);
        }
        if(eventResult)
        {
            return false;
        }

        var square1Item = square1.getBehavior("Match3Item");
        var square2Item = square2.getBehavior("Match3Item");
        if (!square1 || !square2 || columnsLocked[square1Item.col] || columnsLocked[square2Item.col])
        {
            return false;
        }

        // Only try to swap if selected squares are adjacent
        if(!adjacent(square1, square2))
        {
            return false;
        }

        if(square1Item.isSpecialFive || square2Item.isSpecialFive)
        {
            for(var i=0; i<columnsLocked.length; i++)
            {
                // Lock all the columns
                columnsLocked[i] = true;
            }
            deadChilliWalking = true;
        }

        // Temporary variables
        var square1LocationCol = square1Item.col;
        var square1LocationRow = square1Item.row;
        var square2LocationCol = square2Item.col;
        var square2LocationRow = square2Item.row;

        // Swap the locations
        var square1Position = square1.getPosition();
        var square2Position = square2.getPosition();
        board[square1Item.col][square1Item.row] = square2;
        board[square2Item.col][square2Item.row] = square1;

        square1Item.col = square2LocationCol;
        square1Item.row = square2LocationRow;
        square2Item.col = square1LocationCol;
        square2Item.row = square1LocationRow;

        // Apply the swap
        square1.moveTo(square2Position.x, square2Position.y, 300);
        square2.moveTo(square1Position.x, square1Position.y, 300);
        square1Item.moving = true;
        square2Item.moving = true;

        // Lock columns
        columnsLocked[square1Item.col] = true;
        columnsLocked[square2Item.col] = true;

        if(!checkForMatches)
        {
            return; // Do not check for matches if flag is false
        }

        // Check for matches as a result of swap
        var numMoveCompleted = 0;
        square1.onMoveComplete = square2.onMoveComplete = function()
        {
            if (++numMoveCompleted == 2)
            {
                square1Item.moving = square2Item.moving = false;
                columnsLocked[square1Item.col] = false;
                columnsLocked[square2Item.col] = false;

                // Now need to do all match checks and swap back if there are none
                var anyMatches = false;

                anyMatches = getMatches(square1) ? true : anyMatches;
                anyMatches = getMatches(square2) ? true : anyMatches;

                wade.app.swap && wade.app.swap(square1Item.isSpecialFive || square2Item.isSpecialFive || anyMatches); // Trigger swap handler

                // Can I handle special case of 5 here or not
                if(square1Item.isSpecialFive || square2Item.isSpecialFive)
                {
                    var square = square1Item.isSpecialFive ? square1 : square2;
                    var type = square1Item.isSpecialFive ? square2Item.type : square1Item.type;

                    if(!wade.app.soundMuted && self._soundEffects._matchSound)
                    {
                        wade.playAudio(self._soundEffects._matchSound);
                    }
                    square.getBehavior("Match3Item").remove = true;
                    for(var i=0; i<self._numCells.x; i++)
                    {
                        for(var j=0; j<self._numCells.y; j++)
                        {
                            var objectToRemove = board[i][j];
                            check.push(objectToRemove);
                            if(objectToRemove && objectToRemove.getBehavior("Match3Item").type == type)
                            {
                                var objItem = objectToRemove.getBehavior("Match3Item");
                                objItem.fivePos = {x:square.getPosition().x, y:square.getPosition().y};
                                objItem.remove = true;
                                var beam = createBeam(objectToRemove);
                            }
                        }
                    }
                    if (beam)
                    {
                        self._running = false;
                        beam.onAnimationEnd = function()
                        {
                            wade.removeSceneObject(this);
                            self._running = true;
                        };
                    }

                }

                // If move is illegal, swap back
                if (!anyMatches)
                {
                    if(!square1Item.isSpecialFive && !square2Item.isSpecialFive)
                    {
                        swap(square1, square2, false);
                    }
                }
                else
                {
                    check.pushUnique(square1);
                    check.pushUnique(square2);
                }

                // After everything, restore on move complete
                square1.onMoveComplete = square2.onMoveComplete = function ()
                {
                    this.getBehavior("Match3Item").moving = false;
                };
            }
        };
    };

    /**
     * A function that determines if 2 squares are adjacent
     * @param {square} square1 first square
     * @param {square} square2 second square to be checked against square1
     * @returns {boolean} returns true if squares are adjacent
     */
    var adjacent = function(square1, square2)
    {
        var square1Item = square1.getBehavior("Match3Item");
        var square2Item = square2.getBehavior("Match3Item");
        var xDisplace = square1Item.col-square2Item.col;
        xDisplace = xDisplace < 0 ? xDisplace*-1 : xDisplace;
        var yDisplace = square1Item.row-square2Item.row;
        yDisplace = yDisplace < 0 ? yDisplace*-1 : yDisplace;
        return (xDisplace + yDisplace) == 1;
    };

    /**
     * Returns a list of matches for the given square
     * @param square
     * @returns {*}
     */
    var getMatches = function(square, flagAsMatched)
    {
        var squareItem = square.getBehavior("Match3Item");
        if(columnsLocked[squareItem.col])
        {
            return false;
        }

        // My masterpiece
        var createMatch = function(axis, squareI, match)
        {
            var square2 = !columnsLocked[squareI.col+axis.x] && board[squareI.col+axis.x] && board[squareI.col+axis.x][squareI.row+axis.y] && board[squareI.col+axis.x][squareI.row+axis.y].getBehavior("Match3Item");
            squareI && square2 && squareI.type == square2.type && !square2.moving && match.push(square2.owner) && createMatch(axis, square2, match);
        };
        var horizontalMatch = [];
        var verticalMatch = [];
        createMatch({x:1, y:0}, squareItem, horizontalMatch);
        createMatch({x:-1, y:0}, squareItem, horizontalMatch);
        createMatch({x:0, y:1}, squareItem, verticalMatch);
        createMatch({x:0, y:-1}, squareItem, verticalMatch);
        horizontalMatch.push(square);
        verticalMatch.push(square);

        // Return matches
        var list = [];
        if(horizontalMatch.length > 2)
        {
            var counter = 0;
            for(var i=0; i<horizontalMatch.length; i++)
            {
                horizontalMatch[i].getBehavior("Match3Item").matched && counter++;
                if(flagAsMatched)
                {
                    horizontalMatch[i].getBehavior("Match3Item").matched = true;
                }
            }
            if(counter < horizontalMatch.length)
            {
                list.push(horizontalMatch);
            }
        }
        if(verticalMatch.length > 2)
        {
            counter = 0;
            for(i=0; i<verticalMatch.length; i++)
            {
                verticalMatch[i].getBehavior("Match3Item").matched && counter++;
                if(flagAsMatched)
                {
                    verticalMatch[i].getBehavior("Match3Item").matched = true;
                }
            }
            if(counter < verticalMatch.length)
            {
                list.push(verticalMatch);
            }
        }
        if(list.length==0)
        {
            return false;
        }
        return list;
    };

    /**
     * Handles a match made by the given square and a match
     * @param square
     * @param list
     * @returns {boolean}
     */
    var handleMatch = function(square ,match)
    {
        var length = match.length;
        if(length < 3)
        {
            return false; // No matches
        }

        // Pass match to function if it exists
        var matchData = {match:match, match3Object:self.owner};
        var eventResult = null;
        if (!(eventResult = self.owner.processEvent('onMatch', matchData)))
        {
            eventResult = wade.app["onMatch"] && wade.app["onMatch"](matchData);
        }
        if(eventResult)
        {
            return true;
        }


        pointsPopup(square.getPosition(),self._matchScore*length);
        self._score += self._matchScore*length;
        var scoreData = {newScore:self._score, oldScore:self._score-self._matchScore*length, pointsAdded:self._matchScore*length, match3Object:self.owner};

        if (!(eventResult = self.owner.processEvent('onScore', scoreData)))
        {
            eventResult = wade.app["onScore"] && wade.app["onScore"](scoreData);
        }
        if(eventResult)
        {
            self._score -= self._matchScore*length;
        }

        // Standard match of 3
        if(length == 3)
        {
            for(j=0; j<3; j++)
            {
                var matchItem = match[j].getBehavior("Match3Item");
                matchItem.deathEffect = {type:'splash'};
                matchItem.remove = true;
            }
            matchSoundPlaying = true;
        }

        // Match of 4
        else if(length == 4)
        {
            matchSoundPlaying = true;
            for(var j=0; j<3; j++) // Do not remove the fourth, instead it will turn into a special gem
            {
                matchItem = match[j].getBehavior("Match3Item");
                matchItem.deathEffect = {type:'splash'};
                matchItem.remove = true;
            }

            var oldSquare = match[3];
            var oldSquareItem = oldSquare.getBehavior("Match3Item");
            var specialType = "";
            for(j=0; j<self._items.length; j++)
            {
                if(oldSquareItem.type == self._items[j].normal)
                {
                    specialType = self._items[j].special;
                    break;
                }
            }
            var newSquare = createSquare(oldSquareItem.type, specialType, true, oldSquareItem.col, oldSquareItem.row);
            wade.removeSceneObject(oldSquare);
            board[oldSquareItem.col][oldSquareItem.row] = newSquare;
            wade.addSceneObject(newSquare, true);
            newSquare.fadeIn(0);

        }
        else // Must be a match of 5 or greater
        {
            matchSoundPlaying = true;
            var numToRemove = self._specialFive ? match.length -1 : match.length;
            for(j=0; j<numToRemove; j++)
            {
                var myMatch = match[j].getBehavior("Match3Item");
                myMatch.deathEffect = {type:'splash'};
                myMatch.remove = true;
            }
            if(self._specialFive)
            {
                match[match.length-1].removeAllSprites();
                var fiveSprite = new Sprite(self._specialFive, self._itemLayer);
                fiveSprite.setSize(self._cellSize.x-self._margin, self._cellSize.y-self._margin);
                match[match.length-1].addSprite(fiveSprite);
                var lastMatch = match[match.length-1].getBehavior("Match3Item");
                lastMatch.isSpecialFive = true;
                lastMatch.type = 'special5';
            }
        }

        // Handle special case, a special 4 item is involved in the swap
        for(j=0; j<match.length; j++)
        {
            myMatch = match[j].getBehavior("Match3Item");
            if(myMatch.isSpecialFour)
            {
                // We have a special 4 involved in the match, it must explode and remove the others with it
                if(myMatch.specialFourLocked)
                {
                    continue;
                }
                explosionSoundPlaying = true;

                // Remove all around
                for(var a=-1; a<2; a++)
                {
                    for(var b=-1; b<2; b++)
                    {
                        if(board[myMatch.col+a] && board[myMatch.col+a][myMatch.row+b] && !columnsLocked[myMatch.col+a] && !board[myMatch.col+a][myMatch.row+b].moving)
                        {
                            // If not in templist, add to array and flag for removal
                            if(match.indexOf(board[myMatch.col+a][myMatch.row+b]) == -1)
                            {
                                match.push(board[myMatch.col+a][myMatch.row+b]);
                                board[myMatch.col+a][myMatch.row+b].getBehavior("Match3Item").remove = true;
                            }
                            // Flag all to explode
                            board[myMatch.col+a][myMatch.row+b].getBehavior("Match3Item").deathEffect = {type:'explode'}; // If already in list still must explode
                        }
                    }
                }
            }
        }
        return true;
    };

    /**
     * Used to add a sparkle to a location
     */
    var createSparkle = function(pos)
    {
        var sparkle = wade.getSceneObject(self._effectTemplates["_sparkle"]) && wade.getSceneObject(self._effectTemplates["_sparkle"]).clone();
        if(!sparkle)
        {
            return;
        }
        var count = 0;
        var numAnimations = 0;
        sparkle.setPosition(pos.x, pos.y);
        sparkle.partOfMatch3 = true;
        wade.addSceneObject(sparkle, true);
        for(var i=0; i<sparkle.getSpriteCount(); i++)
        {
            var sprite = sparkle.getSprite(i);
            var anim = sprite.getAnimation();
            sprite.setSize(self._cellSize.x*self._effectScale-self._margin, self._cellSize.y*self._effectScale-self._margin);
            if(anim)
            {
                numAnimations++;
                anim.play();
                sprite.onAnimationEnd = function()
                {
                    count++;
                    if(count >= numAnimations)
                    {
                        wade.removeSceneObject(sparkle);
                    }
                };
            }
        }
    };

    /**
     * Used to create a splash effect at a given location
     * @param pos
     */
    var createSplash = function(pos)
    {
        var splash = wade.getSceneObject(self._effectTemplates["_splash"]) && wade.getSceneObject(self._effectTemplates["_splash"]).clone();
        if(!splash)
        {
            return;
        }

        var count = 0;
        var numAnimations = 0;
        splash.setPosition(pos.x, pos.y);
        splash.partOfMatch3 = true;
        wade.addSceneObject(splash, true);
        for(var i=0; i<splash.getSpriteCount(); i++)
        {
            var sprite = splash.getSprite(i);
            var anim = sprite.getAnimation();
            sprite.setSize(self._cellSize.x*self._effectScale-self._margin, self._cellSize.y*self._effectScale-self._margin);
            if(anim)
            {
                numAnimations++;
                anim.play();
                sprite.onAnimationEnd = function()
                {
                    count++;
                    if(count >= numAnimations)
                    {
                        wade.removeSceneObject(splash);
                    }
                };
            }
        }
    };

    /**
     * Creates an explosion effect at given location
     * @param pos
     */
    var createExplosion = function(pos)
    {
        var explosion = wade.getSceneObject(self._effectTemplates["_explosion"]) && wade.getSceneObject(self._effectTemplates["_explosion"]).clone();
        if(!explosion)
        {
            return;
        }
        var count = 0;
        var numAnimations = 0;
        explosion.setPosition(pos.x, pos.y);
        wade.addSceneObject(explosion, true);
        for(var i=0; i<explosion.getSpriteCount(); i++)
        {
            var sprite = explosion.getSprite(i);
            var anim = sprite.getAnimation();
            sprite.setSize(self._cellSize.x*self._effectScale-self._margin, self._cellSize.y*self._effectScale-self._margin);
            if(anim)
            {
                numAnimations++;
                anim.play();
                sprite.onAnimationEnd = function()
                {
                    count++;
                    if(count >= numAnimations)
                    {
                        wade.removeSceneObject(explosion);
                    }
                };
            }
        }
    };

    /**
     * Creates a beam effect for provided square, square must have certain properties initialised
     * @param square
     * @returns {SceneObject}
     */
    var createBeam = function(square)
    {
        var pos = square.getPosition();
        createSparkle(square.getPosition());

        // Create the beam
        var beam = wade.getSceneObject(self._effectTemplates["_specialFive"]) && wade.getSceneObject(self._effectTemplates["_specialFive"]).clone();
        if(!beam)
        {
            setTimeout(function()
            {
                deadChilliWalking = false;
            }, 0);
            return null;
        }
        var count = 0;
        var numAnimations = 0;
        beam.setPosition(pos.x, pos.y);
        beam.partOfMatch3 = true;

        // Maths bit to stretch it
        var difference = wade.vec2.sub(square.getBehavior("Match3Item").fivePos, square.getPosition());
        var height = wade.vec2.length(difference) + wade.vec2.length(difference)/5;

        for(var i=0; i<beam.getSpriteCount(); i++)
        {
            var sprite = beam.getSprite(i);
            var anim = sprite.getAnimation();
            sprite.setSize(self._cellSize.x/2, height);

            if(anim)
            {
                beam.onAnimationEnd = function()
                {
                    deadChilliWalking = false;
                    wade.removeSceneObject(this);
                };
                anim.play();
                beam.setRotation(Math.atan2(-difference.x, difference.y));
            }
            else
            {
                setTimeout(function()
                {
                    deadChilliWalking = false;
                    wade.removeSceneObject(this);
                }, 0);
            }
        }
        wade.addSceneObject(beam, true);
        return beam;

    };

    var gameOver = function()
    {
        // Check for game over
        if(self._gameOverFlag)
        {
            self.musicSource && wade.stopAudio(self.musicSource);
            self._gameOverFlag = false;
            self._running = false;

            // Clear all gems with cool explosions
            for(var i=0; i<self._numCells.x; i++)
            {
                for(var j=0; j<self._numCells.y; j++)
                {
                    if(board[i] && board[i][j])
                    {
                        wade.removeSceneObject(board[i][j]);
                        createExplosion(board[i][j].getPosition());
                        board[i][j] = null;
                    }
                }
            }
            // Hide selector object
            wade.removeSceneObject(selectorObject);

            self.init(initialParams);
        }
    };




    var analogThreshold = 0.4; // The minimum value for analog to register as 1 for digital conversion
    var sign = function(val) // Math.sign not widely supported
    {
        if(val > 0)
        {
            return 1;
        }
        if(val < 0)
        {
            return -1;
        }
        return 0;
    };

    /**
     * Checks all squares in check list, finds matches if any, then moves
     * also handles gamepad input
     */
    var update = function()
    {
        var moveSelected = function(it) // A selector move triggers input delay
        {
            selectorObject.setVisible(true);
            self.controlCurrentDelay = self.controlInputDelay;
            // Need to move selector
            var newX = selectedSquare.x;
            var newY = selectedSquare.y;
            if(it == "left" && newX > 0)
            {
                newX--;
            }
            if(it == "right" && newX < self._numCells.x-1)
            {
                newX++;
            }
            if(it == "up" && newY > 0)
            {
                newY--;
            }
            if(it == "down" && newY < self._numCells.y-1)
            {
                newY++;
            }
            if(!columnsLocked[newX])
            {
                setSelected(newX, newY);
            }
        };

        // Handle joystick axis, buttons and keyboard buttons
        var data = wade.getGamepadData();
        var pad = data[self.gamePadIndex];
        if(self.controlCurrentDelay > 0)
        {
            self.controlCurrentDelay -= wade.c_timeStep*1000;
        }
        else
        {
            self.controlCurrentDelay = 0;
            for(var it in self.gamepadControls)
            {
                if(!self.gamepadControls.hasOwnProperty(it))
                {
                    continue;
                }
                var control = self.gamepadControls[it];
                if(self.keyboardControls[it] != -1) // Handle the keyboard buttons
                {
                    if(wade.isKeyDown(self.keyboardControls[it]))
                    {
                        moveSelected(it)
                    }
                }
                if(pad && control.axis != -1) // Handle the gamepad axis
                {
                    var dir = control.axisDirection;
                    var padAxis = pad.axes[control.axis];
                    if((sign(dir) == sign(padAxis)) && Math.abs(padAxis) > analogThreshold)
                    {
                        moveSelected(it);
                    }
                }
                if(pad && pad.buttons && control.button != -1) // Handle the gamepad button
                {
                    if(pad.buttons[control.button] && pad.buttons[control.button].pressed)
                    {
                        moveSelected(it);
                    }
                }
            }
        }

        // Specifically handle highlight buttons, joystick and keyboard
        var handleHighlight = function()
        {
            if(highlightedSquare.highlighted)
            {
                var h = highlightedSquare.highlighted.getBehavior("Match3Item");
                if(h.col == selectedSquare.x && h.row == selectedSquare.y)
                {

                }
                // check if we are next to it, if we are try swap
                else if((Math.abs(selectedSquare.x - h.col) + Math.abs(selectedSquare.y - h.row)) == 1)
                {
                    highlightedSquare.highlighted = null;
                    board[h.col][h.row].getBehavior("Match3Item").highlight(false);
                    swap(board[h.col][h.row], board[selectedSquare.x][selectedSquare.y], true);
                }
                else
                {
                    board[h.col][h.row].getBehavior("Match3Item").highlight(false);
                    highlightedSquare.highlighted = board[selectedSquare.x][selectedSquare.y];
                    h = highlightedSquare.highlighted.getBehavior("Match3Item");
                    board[h.col][h.row].getBehavior("Match3Item").highlight(true);
                }
            }
            else
            {
                highlightedSquare.highlighted = board[selectedSquare.x][selectedSquare.y];
                board[selectedSquare.x][selectedSquare.y].getBehavior("Match3Item").highlight(true);
            }
        };

        if(pad && pad.buttons)
        {
            if(pad.buttons[self.gamepadHighlightButton] &&
                pad.buttons[self.gamepadHighlightButton].pressed && self._buttonReleased)
            {
                self._buttonReleased = false;
                handleHighlight();
            }
            else if(pad.buttons[self.gamepadHighlightButton] &&
                    !pad.buttons[self.gamepadHighlightButton].pressed)
            {
                self._buttonReleased = true;
            }
        }
        if(self.keyboardControls.highlightButton != -1)
        {
            var down  = wade.isKeyDown(self.keyboardControls.highlightButton);
            if(down && self._keyboardButtonReleased)
            {
                self._keyboardButtonReleased = false;
                handleHighlight();
            }
            else if(!down)
            {
                self._keyboardButtonReleased = true;
            }
        }


        // Play sounds
        // Create explosion sound
        if(matchSoundPlaying && !wade.app.soundMuted && self._soundEffects._matchSound)
        {
            wade.playAudio(self._soundEffects._matchSound);
        }
        // Create explosion sound

        if(explosionSoundPlaying && !wade.app.soundMuted && self._soundEffects._explosionSound)
        {
            wade.playAudio(self._soundEffects._explosionSound);
        }
        matchSoundPlaying = false;
        explosionSoundPlaying = false;



        var removalList = [];

        // Unlock any columns that have no moving squares
        for(var i=0; i<self._numCells.x && !deadChilliWalking; i++)
        {
            var lock = false;
            for(j=0; j<self._numCells.y && lock==false; j++)
            {
                lock = (board[i][j] && board[i][j].getBehavior("Match3Item").moving);
            }
            columnsLocked[i] = lock;
        }

        if(check.length <= 0) // No blocks need checking
        {
            if(!wholeBoardCheck)
            {
                // Check whole board
                for(i=0; i<self._numCells.x; i++)
                {
                    for(j=0; j<self._numCells.y; j++)
                    {
                        check.pushUnique(board[i][j]);
                    }
                }
                wholeBoardCheck = true;

                // Check that there are matches remaining
                if(!validMoves())
                {
                    var noMovesData = {match3Object:self.owner};
                    if (!self.owner.processEvent('onNoMoves', noMovesData))
                    {
                        wade.app["onNoMoves"] && wade.app["onNoMoves"](noMovesData);
                    }

                    var sprite = new TextSprite("NO MOVES LEFT!",self._cellSize.x/1.5 + 'px ArtDept1', '#ff5613', 'center', self._topLayer);
                    sprite.setShadow('#ffffff', 2, 2, 2);
                    sprite.drawToImage('noMoves', true);
                    sprite = new Sprite('noMoves', self._topLayer);
                    sprite.setDrawFunction(wade.drawFunctions.resizePeriodically_(sprite.getSize().x, sprite.getSize().y, sprite.getSize().x + 20, sprite.getSize().y + 10, 0.5, sprite.getDrawFunction()));
                    var message = new SceneObject(sprite);
                    message.partOfMatch3 = true;
                    var ownPos = self.owner.getPosition();
                    message.setPosition(ownPos);
                    message.timer = function()
                    {
                        wade.removeSceneObject(this);
                        self._gameOverFlag = true;
                    };
                    wade.addSceneObject(message, true);
                    message.schedule(3000, 'timer');

                    for(i=0; i<self._numCells.x; i++)
                    {
                        for(var j=0; j<self._numCells.y; j++)
                        {
                            board[i][j].noMoveDelay = function()
                            {
                                this.remove = true;
                            };
                            board[i][j].schedule(3000, 'noMoveDelay');
                        }
                    }
                }
            }
        }
        else
        {
            wholeBoardCheck = false;
        }

        var numRemovedFromColumn = [];

        // Remove objects that are moving from check list
        for(i=0; i<check.length; i++) // todo we crash here because check[i] is null on match over
        {
            if(check[i].getBehavior("Match3Item").moving)
            {
                check[i] = null; // Removing moving elements from list
            }
        }

        // Initialise arrays
        for(i=0; i<self._numCells.x; i++)
        {
            numRemovedFromColumn.push(0);
        }

        // Check for matches on all flagged squares, and flag appropriate squares for removal
        var matches = [];
        for(i=0; i<check.length && check[i]; i++)
        {
            var match = {check:null, match:null};
            match.match = getMatches(check[i], true);   // Need to remove duplicate matches here I think - Confirmed need a clever system
                                                        // Confirmed, and difficult because matches may be null, a single array, or an array of arrays
                                                        // also squares can be modified so wont match, have to compare rows and columns.
                                                        // Only remove if all squares are a match

            if(match.match) // Push matches to single array
            {
                match.check = check[i];

                for(j=0; j<match.match.length; j++)
                {
                    matches.push({match:match.match[j], check:check[i]});
                }
            }
        }

        // Handle the matches
        for(i=0; i<matches.length; i++)
        {
            if(matches[i])
            {
                var matchData = {blocks:matches[i], match3Behavior:self.owner};
                var eventReturn = false;
                if (!( eventReturn = self.owner.processEvent('onMatch', matchData)))
                {
                    eventReturn = wade.app["onMatch"] && wade.app["onMatch"](matchData);
                }
                if(eventReturn) // Skip this match
                {
                    continue;
                }
                handleMatch(matches[i].check, matches[i].match);
            }
        }


        // Clear check list
        check.length = 0;

        // Remove all flagged squares and create random sparkle effects
        for(i=0; i<self._numCells.x; i++)
        {
            for(j=0; j<self._numCells.y; j++)
            {
                // Unlock special 4 gems created this time
                if(board[i] && board[i][j])
                {
                    var boardItem = board[i][j].getBehavior("Match3Item");
                    if(boardItem.specialFourLocked)
                    {
                        boardItem.specialFourLocked = false;
                    }

                    if(boardItem.remove)
                    {
                        var pos = {x:board[i][j].getPosition().x, y: board[i][j].getPosition().y};
                        columnsLocked[i] = true; // LOCK THE COLUMN

                        // Use correct death effect
                        if(boardItem.deathEffect.type == 'explode')
                        {
                            createExplosion(pos);
                        }
                        else
                        {
                            createSplash(pos);
                        }
                        wade.removeSceneObject(board[i][j]);
                        board[i][j] = null;
                    }

                    else if(boardItem.moving == false && !boardItem.isSpecialFour && Math.floor(Math.random()*self._sparkleRarity) < 1) // 1
                    {
                        createSparkle(board[i][j].getPosition());
                    }

                }
            }
        }

        removalList.length = 0;

        // Now we need to make squares move, this has to be done in reverse to ensure squares are not overwritten
        moveSquaresDown();

        // Make sure the arrays are wiped out
        numRemovedFromColumn.length = 0;

        gameOver();
    };

    // Moves the squares down and creates new squares as needed
    var moveSquaresDown = function()
    {
        for(var i=0; i<self._numCells.x; i++)
        {
            var numDown = 0;
            for(var j = self._numCells.y-1; j>-1; j--) // Start at bottom and move squares
            {
                if(!board[i][j])
                {
                    numDown++;
                }
                else if(numDown > 0)
                {
                    board[i][j].getBehavior("Match3Item").moveDown(numDown, self._gravity);
                    board[i][j+numDown] = board[i][j];
                }
            }

            // Create new squares
            for(j=0; j<numDown; j++)
            {
                var counter = 0;
                var original = self._items.slice(0); // Need to do something way more sophisticated here
                var type = chooseType(original);
                var back = null;
                if(type.background)
                {
                    back = type.background;
                }
                var square = createSquare(type.normal, type.normal, false, i, -j-1);
                wade.addSceneObject(square, true);
                square.schedule(140*Math.abs(-j-1), 'fadeIn', 0.3); // Fade delay
                board[i][numDown-j-1] = square;
                square.getBehavior("Match3Item").moveDown(numDown, self._gravity);

                counter++;
            }
        }
    };

    var pointsPopup = function(position, score)
    {
        wade.app.onScoreAdded && wade.app.onScoreAdded(score);
        if (!self.owner.processEvent('onScore', score))
        {
            wade.app["onScore"] && wade.app["onScore"]({});
        }

        var obj = wade.getSceneObject(self._textObject);
        var template = false;
        if(obj)
        {
            template = true;
            obj = obj.clone();
            var text = obj.getSprite();
            //text.setLayer(self._topLayer);
            text.setText(score);
        }
        else
        {
            text = new TextSprite(score, self._cellSize.x/2.4 + 'px ArtDept1', '#ff5613', 'center', self._topLayer);
            text.setShadow('#ffffff', 2, 2, 2);
            obj = new SceneObject(text);
            obj.partOfMatch3 = true;
            obj.moveTo(obj.getPosition().x, obj.getPosition().y - 100, 100);

            obj.fadeOut(0.6, function()
            {
                wade.removeSceneObject(obj);
            });
        }
        obj.setPosition(position.x + Math.floor((Math.random()-0.5) * 100), position.y + Math.floor((Math.random()-0.5) * 100));
        obj.partOfMatch3 = true;
        wade.addSceneObject(obj, true);
    };

    /**
     * Returns the number of valid moves
     */
    var validMoves = function()
    {
        for (var i=0; i<self._numCells.x; i++)
        {
            for(var j=0; j<self._numCells.y; j++)
            {
                var item = board[i] && board[i][j] && board[i][j].getBehavior("Match3Item");
                var item2 = board[i+1] && board[i+1][j] && board[i+1][j].getBehavior("Match3Item");
                if(item.moving || item.isSpecialFive)
                {
                    return true;
                }

                if(board[i+1])
                {
                    // Swap horizontally
                    var temp = board[i][j];
                    var one = {x:item.col, y:item.row};
                    var two = {x:item2.col, y:item2.row};
                    board[i][j] = board[i+1][j];
                    board[i+1][j] = temp;
                    item.col = two.x;
                    item.row = two.y;
                    item2.col = one.x;
                    item2.row = one.y;

                    // check for matches
                    var matches = getMatches(board[i][j]) || getMatches(board[i + 1][j]);

                    // Undo
                    temp = board[i][j];
                    board[i][j] = board[i+1][j];
                    board[i+1][j] = temp;
                    item.col = one.x;
                    item.row = one.y;
                    item2.col = two.x;
                    item2.row = two.y;
                    if (matches)
                    {
                        return true;
                    }
                }
                item2 = board[i] && board[i][j+1] && board[i][j+1].getBehavior("Match3Item");
                if(board[i][j+1])
                {
                    // Swap vertically
                    temp = board[i][j];
                    one = {x:item.col, y:item.row};
                    two = {x:item2.col, y:item2.row};
                    board[i][j] = board[i][j+1];
                    board[i][j+1] = temp;
                    item.col = two.x;
                    item.row = two.y;
                    item2.col = one.x;
                    item2.row = one.y;

                    // check for matches
                    matches = getMatches(board[i][j]) || getMatches(board[i][j+1]);

                    // Undo
                    temp = board[i][j];
                    board[i][j] = board[i][j+1];
                    board[i][j+1] = temp;
                    item.col = one.x;
                    item.row = one.y;
                    item2.col = two.x;
                    item2.row = two.y;

                    if(matches)
                    {
                        return true;
                    }
                }
            }
        }
        return false;
    };

    /**
     * Takes a list of allowed items and returns one based on the probability
     * @param types
     */
    var chooseType = function(types)
    {
        types.sort(function(a, b)
        {
            return a.probability - b.probability;
        });
        var total = 0;
        for(var i=0; i<types.length; i++)
        {
            total += types[i].probability;
        }

        var rand = Math.floor(Math.random()*total);
        var sum = 0;
        for(i=0; i<types.length; i++)
        {
            if(rand < types[i].probability + sum)
            {
                return types[i];
            }
            sum += types[i].probability;
        }
        wade.error("not possible to provide none matching type");
        return types[0];
    };

    this.inSync = function()
    {
        for (var i=0; i<self._numCells.x; i++)
        {
            for(var j=0; j<self._numCells.y; j++)
            {

                var b = board[i][j].getBehavior("Match3Item");
                if(b.col != i || b.row !=j)
                {
                    console.log("out of sync");
                    return;
                }
            }
        }
        console.log("in sync");
    };

    /**
     * Removes the match3 item at the location provided
     * @param x X cell co-ordinate of item to be removed
     * @param y Y cell co-ordinate of item to be removed
     */
    this.removeItem = function(x, y)
    {
        var item = board[x][y];
        if(!item || columnsLocked[x])
        {
            return;
        }
        wade.removeSceneObject(item);
        board[x][y] = null;
        moveSquaresDown();
        if (!self.owner.processEvent('onItemRemoved', {removed:true, item:item, match3Object:self.owner, position:{x:x, y:y}}))
        {
            wade.app["onItemRemoved"] && wade.app["onItemRemoved"]({removed:true});
        }
    };

    /**
     * Changes the type of the item at the specified location to the provided type.
     * If the type does not exist, no change will happen.
     * @param x X cell co-ordinate of item to change the type of
     * @param y Y cell co-ordinate of item to change the type of
     * @param type The type to change the item to
     * @returns {boolean} Returns true if the type change succeeded, otherwise returns false
     */
    this.changeItemType = function(x, y, type)
    {
        var typeExists = false;
        for(var i=0; i<this._items.length; i++)
        {
            if(this._items[i].normal == type)
            {
                typeExists = true;
                break;
            }
        }
        if(!typeExists)
        {
            wade.error("Type does not exist! Cannot change type of match3 item");
            return false;
        }
        wade.removeSceneObject(board[x][y]);
        var newSquare = createSquare(type, type, false, x, y);
        board[x][y] = newSquare;
        wade.addSceneObject(newSquare, true);

        check.push(newSquare);
        update();
    };

    /**
     * Swaps the position of two items
     * @param x1 X Co-ordinate of first item
     * @param y1 Y Co-ordinate of first item
     * @param x2 X Co-ordinate of second item
     * @param y2 Y Co-ordinate of second item
     */
    this.swapItems = function(x1, y1, x2, y2)
    {
        var item1 = board[x1][y1];
        var item2 = board[x2][y2];
        swap(item1, item2, true);
    };
};

//@ sourceURL=match.js
