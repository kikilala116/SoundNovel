Match3Item = function()
{
    var self = this;
    var clicked = null;
    this.name = "Match3Item";

    this.moving = false;        // Is the object moving
    this.partOfMatch3 = true;   // What the hell is this for
    this.type = "";             // Unique id for this item
    this.typeSpecial = "";      // Unique id for the special sprite maybe
    this.deathEffect = "";      // Not sure if this is used
    this.isSpecialFour = false; // Is it a special 4
    this.isSpecialFive = false; // Is this a special five item
    this.highlighted = false;

    this.col = 0;               // Location on the 2d grid
    this.row = 0;

    var board;                  // Reference to board
    var selectorObject;         // Reference to selector
    var swap;                   // Reference to swap function
    var selectedSquare;         // Reference to selected location
    var highlightedSquare;      // Reference to current highlighted location
    var columnsLocked;          // Reference to columns locked flag
    var setSelected;            // Reference to set selected function
    var match3;                 // Reference to the match3 behavior
    var check;                  // Reference to array that checks matches
    var highlightSprite;        // Sprite to use on highlight

    this.onAddToScene = function()
    {
        wade.addGlobalEventListener(this.owner, 'onMouseUp');
        wade.addGlobalEventListener(this.owner, 'onMouseMove');
    };

    this.setReferences = function(references)
    {
        if(!references)
        {
            return;
        }
        board             = references.board;
        selectorObject    = references.selectorObject;
        swap              = references.swap;
        selectedSquare    = references.selectedSquare;
        highlightedSquare = references.highlightedSquare;
        columnsLocked     = references.columnsLocked;
        setSelected       = references.setSelected;
        match3            = references.match3;
        check             = references.check;
        highlightSprite   = references.highlightSprite;
    };

    this.swapLeft = function ()
    {
        if (this.col == 0)
        {
            return true;
        }
        //selectorObject.setVisible(false);
        swap(board[this.col][this.row], board[this.col - 1][this.row], true);
        return true;
    };

    this.highlight = function(enable)
    {
        if(enable && !this.highlighted) // Add the highlight sprite
        {
            var sprite = new Sprite((highlightSprite && highlightSprite != "") || "procedural_square");
            sprite.setName("highlighter");
            sprite.setSize(match3._cellSize.x, match3._cellSize.y);
            if(!highlightSprite || highlightSprite == "")
            {
                sprite.setDrawFunction(wade.drawFunctions.alpha_(0.5, sprite.getDrawFunction()));
            }

            this.owner.addSprite(sprite);
        }
        else if(this.highlighted) // Remove the highlight sprite
        {
            this.owner.removeSprite(this.owner.getSpriteByName("highlighter"));
        }
        // No sprite change needed this time
        this.highlighted = enable;
    };

    this.swapRight = function ()
    {
        if (this.col == match3._numCells.x - 1)
        {
            return true;
        }
        //selectorObject.setVisible(false);
        swap(board[this.col][this.row], board[this.col + 1][this.row], true);
        return true;
    };

    this.swapUp = function ()
    {
        if (this.row == 0)
        {
            return true;
        }
        //selectorObject.setVisible(false);
        swap(board[this.col][this.row], board[this.col][this.row - 1], true);
        return true;
    };

    this.swapDown = function ()
    {
        if (this.row == match3._numCells.y - 1)
        {
            return true;
        }
        //selectorObject.setVisible(false);
        swap(board[this.col][this.row], board[this.col][this.row + 1], true);
        return true;
    };

    this.onMouseDown = function(eventData)
    {
        if(columnsLocked[this.col] || this.moving)
        {
            clicked = null;
            return true;
        }
/*
        // A swap is required
        if((Math.abs(selectedSquare.x - this.col) + Math.abs(selectedSquare.y - this.row)) == 1)
        {
            swap(board[selectedSquare.x][selectedSquare.y], board[this.col][this.row], true);
            selectedSquare.x = this.col;
            selectedSquare.y = this.row;
        }
        else
        {
            // De-highlight both
        }

        setSelected(this.col, this.row);
*/
        clicked = eventData.screenPosition;
        return true;
    };

    this.onMouseUp = function()
    {
        clicked = null;
    };

    this.onMouseMove = function(eventData)
    {
        if(!clicked || columnsLocked[this.col] || this.moving)
        {
            return true;
        }
        var xDif = eventData.screenPosition.x - clicked.x;
        var yDif = eventData.screenPosition.y - clicked.y;
        if(Math.abs(xDif) < match3._cellSize.x/3 &&
           Math.abs(yDif) < match3._cellSize.y/3)
        {
            return;
        }
        selectorObject.setVisible(false);
        clicked = null;
        if(Math.abs(xDif) > Math.abs(yDif))
        {
            if(xDif >= 0)
            {
                this.swapRight();
            }
            else
            {
                this.swapLeft();
            }
        }
        else
        {
            if(yDif >= 0)
            {
                this.swapDown();
            }
            else
            {
                this.swapUp();
            }
        }
    };



    // Move a board square down a set number of cells with an acceleration
    /**
     * Move the square down a set number of cells with an acceleration force
     * @param {number} dropHeight The number of cells to drop by
     * @param {number} acceleration The force of gravity
     */
    this.moveDown = function(dropHeight, acceleration)
    {
        if (this.moving)
        {
            return;
        }
        this.gravity = acceleration;
        this.verticalDisplacement = 0;
        this.targetDisplacement = dropHeight * match3._cellSize.y;
        this.moving = true;
        this.startY = this.owner.getPosition().y;
        this.row += dropHeight;

        this.onUpdate = function()
        {
            this.verticalDisplacement = this.owner.getPosition().y - this.startY;
            if (this.verticalDisplacement < this.targetDisplacement)
            {
                this.owner.setVelocity({x:0, y:this.owner.getVelocity().y + this.gravity*wade.c_timeStep});
            }
            else // Finished moving
            {
                var overshot = this.verticalDisplacement - this.targetDisplacement;
                this.verticalDisplacement = 0;
                this.owner.setPosition(this.owner.getPosition().x, this.owner.getPosition().y - overshot);
                this.owner.setVelocity({x:0, y:0});
                this.owner.stopListeningFor("onUpdate");
                this.moving = false;
                check.pushUnique(this.owner); // Check for new matches
            }
        };
        this.owner.listenFor("onUpdate");
    };

    this.onMoveComplete = function()
    {
        this.moving = false;
    };

};
